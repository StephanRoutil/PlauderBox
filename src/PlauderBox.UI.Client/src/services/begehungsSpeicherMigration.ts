import type { LokaleBegehung } from '@logik/begehungsAblauf'
import { schemaVersion, type Speicherpaket } from './begehungsSpeicherValidierung'

export const datenbankname = 'PlauderBoxBegehungsspeicher'
export const speichername = 'begehungen'
export const audiospeichername = 'audio'
export const bildspeichername = 'bilder'
export const aktiverSchluessel = 'aktive-begehung'
export const legacyMarkerPraefix = 'legacy-import:'

export function oeffneBegehungsDatenbank(
  erstelleSpeicherpaket: (begehung: LokaleBegehung, aktualisiertAm: string) => Speicherpaket,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname, schemaVersion)
    anfrage.addEventListener('upgradeneeded', (ereignis) => {
      const datenbank = anfrage.result
      const transaktion = anfrage.transaction!
      if (!datenbank.objectStoreNames.contains(speichername)) datenbank.createObjectStore(speichername)
      if (!datenbank.objectStoreNames.contains(audiospeichername)) datenbank.createObjectStore(audiospeichername)
      if (!datenbank.objectStoreNames.contains(bildspeichername)) datenbank.createObjectStore(bildspeichername)
      if ((ereignis as IDBVersionChangeEvent).oldVersion === 1) migriereVersionEins(transaktion, erstelleSpeicherpaket)
    })
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Der Begehungsspeicher konnte nicht geöffnet werden.')),
    )
  })
}

function migriereVersionEins(
  transaktion: IDBTransaction,
  erstelleSpeicherpaket: (begehung: LokaleBegehung, aktualisiertAm: string) => Speicherpaket,
): void {
  const anfrage = transaktion.objectStore(speichername).get(aktiverSchluessel)
  anfrage.addEventListener('success', () => {
    if (anfrage.result === undefined) return
    try {
      const alteBegehung = anfrage.result as LokaleBegehung
      const paket = erstelleSpeicherpaket(alteBegehung, alteBegehung.aktualisiertAm)
      for (const audio of paket.audio) transaktion.objectStore(audiospeichername).put(audio.wert, audio.schluessel)
      for (const bild of paket.bilder) transaktion.objectStore(bildspeichername).put(bild.wert, bild.schluessel)
      transaktion.objectStore(speichername).put(paket.begehung, aktiverSchluessel)
    } catch {
      transaktion.abort()
    }
  })
}
