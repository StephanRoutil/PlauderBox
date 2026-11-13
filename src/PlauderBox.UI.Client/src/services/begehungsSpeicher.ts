import {
  normalisiereEintragProjektAnsprechpartner,
  type BegehungEintrag,
  type LokaleAudioaufnahme,
  type LokaleBegehung,
  type LokalesBild,
} from '@logik/begehungsAblauf'
import { istFreigabeToken } from '@logik/clientPruefungen'
import {
  aktiverSchluessel,
  audiospeichername,
  bildspeichername,
  datenbankname,
  legacyMarkerPraefix,
  oeffneBegehungsDatenbank,
  speichername,
} from './begehungsSpeicherMigration'
import {
  istGespeicherteBegehung,
  schemaVersion,
  type GespeicherteBegehung,
  type Speicherpaket,
} from './begehungsSpeicherValidierung'

export type {
  BegehungEintrag,
  EintragStatus,
  BegehungStatus,
  HappyHourProtokollKontext,
  LokaleAudioaufnahme,
  LokaleBegehung,
  LokalesBild,
} from '@logik/begehungsAblauf'
export {
  bereiteWiederanlaufVor,
  eindeutigeVerteileroptionen,
  ermittleStandardProtokollpunktArtId,
  ermittleStandardProjektAnsprechpartnerId,
  erstelleBegehung,
  erstelleEintrag,
  erstelleEintragFuerProtokoll,
  gruppiereEintraege,
  istEintragUnvollstaendig,
  naechsterAusstehenderEintrag,
  normalisiereEintragProjektAnsprechpartner,
  normalisiereProjektAnsprechpartnerId,
  uebernehmeAuswertung,
  zaehleAusstehendeAudioaufnahmen,
} from '@logik/begehungsAblauf'

export class BegehungSpeicherfehler extends Error {
  constructor(public readonly art: 'unlesbare_daten') {
    super(art)
  }
}

export interface RohdatensicherungErgebnis {
  dateien: number
  art: 'geteilt' | 'heruntergeladen'
}

function erstelleSpeicherpaket(begehung: LokaleBegehung, aktualisiertAm: string): Speicherpaket {
  const audio: Speicherpaket['audio'] = []
  const bilder: Speicherpaket['bilder'] = []
  const gespeicherteBegehung: GespeicherteBegehung = {
    schemaVersion,
    id: begehung.id,
    gestartetAm: begehung.gestartetAm,
    aktualisiertAm,
    status: begehung.status,
    protokoll: {
      ...begehung.protokoll,
      projekt: { ...begehung.protokoll.projekt },
      objekt: begehung.protokoll.objekt ? { ...begehung.protokoll.objekt } : null,
      mitarbeiter: { ...begehung.protokoll.mitarbeiter },
      traktanden: [...begehung.protokoll.traktanden],
      verteiler: begehung.protokoll.verteiler.map((person) => ({ ...person })),
      protokollpunkte: begehung.protokoll.protokollpunkte.map((punkt) => ({ ...punkt })),
      protokollpunktArten: begehung.protokoll.protokollpunktArten?.map((art) => ({ ...art })),
    },
    freigabeToken: begehung.freigabeToken,
    uebertragenAm: begehung.uebertragenAm,
    bilderUebertragenAm: begehung.bilderUebertragenAm,
    aktuellerEintragId: begehung.aktuellerEintragId,
    eintraege: begehung.eintraege.map((eintrag) => {
      const audioSchluessel = eintrag.audio ? `${eintrag.id}:audio` : null
      if (eintrag.audio && audioSchluessel)
        audio.push({ schluessel: audioSchluessel, wert: { ...eintrag.audio, audio: eintrag.audio.audio } })
      const bildSchluessel = eintrag.bilder.map((bild) => `${eintrag.id}:bild:${bild.id}`)
      eintrag.bilder.forEach((bild, index) =>
        bilder.push({ schluessel: bildSchluessel[index]!, wert: { ...bild, bild: bild.bild } }),
      )
      const { audio: _audio, bilder: _bilder, ...ohneMedien } = eintrag
      void _audio
      void _bilder
      return { ...ohneMedien, audioSchluessel, bildSchluessel }
    }),
  }
  return { begehung: gespeicherteBegehung, audio, bilder }
}

function oeffneDatenbank(): Promise<IDBDatabase> {
  return oeffneBegehungsDatenbank(erstelleSpeicherpaket)
}

function warteAufTransaktion(transaktion: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaktion.addEventListener('complete', () => resolve())
    transaktion.addEventListener('abort', () =>
      reject(transaktion.error ?? new Error('Die Speichertransaktion wurde abgebrochen.')),
    )
    transaktion.addEventListener('error', () =>
      reject(transaktion.error ?? new Error('Die Speichertransaktion ist fehlgeschlagen.')),
    )
  })
}

function leseAlleMedien<T>(datenbank: IDBDatabase, speicher: string): Promise<Map<string, T>> {
  return new Promise((resolve, reject) => {
    const anfrage = datenbank.transaction(speicher, 'readonly').objectStore(speicher).openCursor()
    const werte = new Map<string, T>()
    anfrage.addEventListener('success', () => {
      const cursor = anfrage.result
      if (!cursor) {
        resolve(werte)
        return
      }
      werte.set(String(cursor.key), cursor.value as T)
      cursor.continue()
    })
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Gespeicherte Mediendaten konnten nicht verglichen werden.')),
    )
  })
}

function istAudioUnveraendert(vorhanden: LokaleAudioaufnahme, erwartet: LokaleAudioaufnahme): boolean {
  return (
    vorhanden.dateiname === erwartet.dateiname &&
    vorhanden.medientyp === erwartet.medientyp &&
    vorhanden.groesse === erwartet.groesse &&
    vorhanden.dauerSekunden === erwartet.dauerSekunden &&
    vorhanden.audio.size === erwartet.audio.size &&
    vorhanden.audio.type === erwartet.audio.type
  )
}

function istBildUnveraendert(vorhanden: LokalesBild, erwartet: LokalesBild): boolean {
  return (
    vorhanden.id === erwartet.id &&
    vorhanden.dateiname === erwartet.dateiname &&
    vorhanden.medientyp === erwartet.medientyp &&
    vorhanden.groesse === erwartet.groesse &&
    vorhanden.erstelltAm === erwartet.erstelltAm &&
    vorhanden.bild.size === erwartet.bild.size &&
    vorhanden.bild.type === erwartet.bild.type
  )
}

export async function speichereBegehung(
  begehung: LokaleBegehung,
  datenbankOeffnen: () => Promise<IDBDatabase> = oeffneDatenbank,
  legacyImportId?: string,
): Promise<void> {
  const paket = erstelleSpeicherpaket(begehung, new Date().toISOString())
  const datenbank = await datenbankOeffnen()
  try {
    const [vorhandeneAudio, vorhandeneBilder] = await Promise.all([
      leseAlleMedien<LokaleAudioaufnahme>(datenbank, audiospeichername),
      leseAlleMedien<LokalesBild>(datenbank, bildspeichername),
    ])
    const erwarteteAudio = new Map(paket.audio.map((audio) => [audio.schluessel, audio.wert]))
    const erwarteteBilder = new Map(paket.bilder.map((bild) => [bild.schluessel, bild.wert]))
    const transaktion = datenbank.transaction([speichername, audiospeichername, bildspeichername], 'readwrite')
    const audiospeicher = transaktion.objectStore(audiospeichername)
    const bildspeicher = transaktion.objectStore(bildspeichername)
    for (const schluessel of vorhandeneAudio.keys()) {
      if (!erwarteteAudio.has(schluessel)) audiospeicher.delete(schluessel)
    }
    for (const [schluessel, wert] of erwarteteAudio) {
      const vorhanden = vorhandeneAudio.get(schluessel)
      if (!vorhanden || !istAudioUnveraendert(vorhanden, wert)) audiospeicher.put(wert, schluessel)
    }
    for (const schluessel of vorhandeneBilder.keys()) {
      if (!erwarteteBilder.has(schluessel)) bildspeicher.delete(schluessel)
    }
    for (const [schluessel, wert] of erwarteteBilder) {
      const vorhanden = vorhandeneBilder.get(schluessel)
      if (!vorhanden || !istBildUnveraendert(vorhanden, wert)) bildspeicher.put(wert, schluessel)
    }
    transaktion.objectStore(speichername).put(paket.begehung, aktiverSchluessel)
    if (legacyImportId)
      transaktion
        .objectStore(speichername)
        .put({ uebernommenAm: new Date().toISOString() }, `${legacyMarkerPraefix}${legacyImportId}`)
    await warteAufTransaktion(transaktion)
    begehung.aktualisiertAm = paket.begehung.aktualisiertAm
  } finally {
    datenbank.close()
  }
}

export async function istLegacyImportUebernommen(legacyImportId: string): Promise<boolean> {
  const datenbank = await oeffneDatenbank()
  try {
    return await new Promise((resolve, reject) => {
      const anfrage = datenbank
        .transaction(speichername, 'readonly')
        .objectStore(speichername)
        .get(`${legacyMarkerPraefix}${legacyImportId}`)
      anfrage.addEventListener('success', () => resolve(Boolean(anfrage.result)))
      anfrage.addEventListener('error', () =>
        reject(anfrage.error ?? new Error('Der Migrationsstatus konnte nicht gelesen werden.')),
      )
    })
  } finally {
    datenbank.close()
  }
}

export async function committeEintrag(
  begehung: LokaleBegehung,
  eintrag: import('@logik/begehungsAblauf').BegehungEintrag,
  speichern: (kandidat: LokaleBegehung) => Promise<void> = speichereBegehung,
): Promise<LokaleBegehung> {
  const normalisierterEintrag = { ...eintrag, bilder: [...eintrag.bilder] }
  normalisiereEintragProjektAnsprechpartner(normalisierterEintrag, begehung.protokoll)
  const vorhanden = begehung.eintraege.some((wert) => wert.id === normalisierterEintrag.id)
  const kandidat: LokaleBegehung = {
    ...begehung,
    eintraege: vorhanden
      ? begehung.eintraege.map((wert) => (wert.id === normalisierterEintrag.id ? normalisierterEintrag : wert))
      : [...begehung.eintraege, normalisierterEintrag],
    aktuellerEintragId: normalisierterEintrag.id,
  }
  await speichern(kandidat)
  return kandidat
}

export async function committeHappyHourUebergabe(
  begehung: LokaleBegehung,
  uebertragenAm: string = new Date().toISOString(),
  speichern: (kandidat: LokaleBegehung) => Promise<void> = speichereBegehung,
): Promise<LokaleBegehung> {
  const kandidat: LokaleBegehung = {
    ...begehung,
    status: 'an_happyhour_uebertragen',
    uebertragenAm,
    bilderUebertragenAm: uebertragenAm,
  }
  await speichern(kandidat)
  return kandidat
}

export async function committeFreigabeErneuerung(
  begehung: LokaleBegehung,
  freigabeToken: string,
  protokollId: number,
  speichern: (kandidat: LokaleBegehung) => Promise<void> = speichereBegehung,
): Promise<LokaleBegehung> {
  if (!istFreigabeToken(freigabeToken)) throw new Error('ungueltige_freigabe')
  if (protokollId !== begehung.protokoll.protokollId) throw new Error('falsches_protokoll')
  const kandidat: LokaleBegehung = { ...begehung, freigabeToken }
  await speichern(kandidat)
  return kandidat
}

export async function ladeBegehung(): Promise<LokaleBegehung | null> {
  const datenbank = await oeffneDatenbank()
  try {
    const gespeichert = await new Promise<unknown>((resolve, reject) => {
      const anfrage = datenbank.transaction(speichername, 'readonly').objectStore(speichername).get(aktiverSchluessel)
      anfrage.addEventListener('success', () => resolve(anfrage.result ?? null))
      anfrage.addEventListener('error', () =>
        reject(anfrage.error ?? new Error('Die Begehung konnte nicht gelesen werden.')),
      )
    })
    if (!gespeichert) return null
    if (!istGespeicherteBegehung(gespeichert)) throw new BegehungSpeicherfehler('unlesbare_daten')
    const transaktion = datenbank.transaction([audiospeichername, bildspeichername], 'readonly')
    const eintraege = await Promise.all(
      gespeichert.eintraege.map(async (eintrag): Promise<BegehungEintrag> => {
        const audioVersprechen = eintrag.audioSchluessel
          ? leseWert<LokaleAudioaufnahme>(transaktion.objectStore(audiospeichername), eintrag.audioSchluessel)
          : Promise.resolve(null)
        const bildVersprechen = eintrag.bildSchluessel.map((schluessel) =>
          leseWert<LokalesBild>(transaktion.objectStore(bildspeichername), schluessel),
        )
        const [audio, bilder] = await Promise.all([audioVersprechen, Promise.all(bildVersprechen)])
        if ((eintrag.audioSchluessel && !audio) || bilder.some((bild) => bild === null))
          throw new BegehungSpeicherfehler('unlesbare_daten')
        const { audioSchluessel: _audioSchluessel, bildSchluessel: _bildSchluessel, ...ohneVerweise } = eintrag
        void _audioSchluessel
        void _bildSchluessel
        return { ...ohneVerweise, audio, bilder: bilder as LokalesBild[] }
      }),
    )
    const { schemaVersion: _schemaVersion, ...ohneSchemaVersion } = gespeichert
    void _schemaVersion
    return { ...ohneSchemaVersion, eintraege }
  } finally {
    datenbank.close()
  }
}

function leseWert<T>(speicher: IDBObjectStore, schluessel: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const anfrage = speicher.get(schluessel)
    anfrage.addEventListener('success', () => resolve((anfrage.result as T | undefined) ?? null))
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Gespeicherte Mediendaten konnten nicht gelesen werden.')),
    )
  })
}

export async function loescheBegehung(): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction([speichername, audiospeichername, bildspeichername], 'readwrite')
    transaktion.objectStore(speichername).delete(aktiverSchluessel)
    transaktion.objectStore(audiospeichername).clear()
    transaktion.objectStore(bildspeichername).clear()
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}

export async function sichereUnlesbareDaten(
  teiler: Pick<Navigator, 'share' | 'canShare'> = navigator,
  downloader: (datei: File) => void = starteDateidownload,
): Promise<RohdatensicherungErgebnis> {
  const datenbank = await new Promise<IDBDatabase>((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname)
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Rohdaten konnten nicht geöffnet werden.')),
    )
  })
  try {
    const rohstand: Record<string, Array<{ schluessel: IDBValidKey; wert: unknown }>> = {}
    for (const speicher of Array.from(datenbank.objectStoreNames)) {
      rohstand[speicher] = await leseAlleRohwerte(datenbank, speicher)
    }
    const medien: File[] = []
    const json = JSON.stringify(
      {
        datenbank: datenbankname,
        version: datenbank.version,
        gesichertAm: new Date().toISOString(),
        speicher: rohstand,
      },
      (_schluessel, wert: unknown) => {
        if (!(wert instanceof Blob)) return wert
        const dateiname = `plauderbox-medium-${String(medien.length + 1).padStart(3, '0')}.bin`
        medien.push(new File([wert], dateiname, { type: wert.type || 'application/octet-stream' }))
        return { datei: dateiname, typ: wert.type, groesse: wert.size }
      },
      2,
    )
    const dateien = [
      new File([json], `plauderbox-rohdaten-${new Date().toISOString().replaceAll(':', '-')}.json`, {
        type: 'application/json',
      }),
      ...medien,
    ]
    if (teiler.share && teiler.canShare?.({ files: dateien })) {
      await teiler.share({ files: dateien, title: 'PlauderBox-Rohdatensicherung' })
      return { dateien: dateien.length, art: 'geteilt' }
    }
    dateien.forEach(downloader)
    return { dateien: dateien.length, art: 'heruntergeladen' }
  } finally {
    datenbank.close()
  }
}

export function verwerfeUnlesbareDaten(): Promise<void> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.deleteDatabase(datenbankname)
    anfrage.addEventListener('success', () => resolve())
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Rohdaten konnten nicht verworfen werden.')),
    )
    anfrage.addEventListener('blocked', () =>
      reject(new Error('Rohdaten werden noch von einem anderen Fenster verwendet.')),
    )
  })
}

function leseAlleRohwerte(
  datenbank: IDBDatabase,
  speichernameWert: string,
): Promise<Array<{ schluessel: IDBValidKey; wert: unknown }>> {
  return new Promise((resolve, reject) => {
    const werte: Array<{ schluessel: IDBValidKey; wert: unknown }> = []
    const anfrage = datenbank.transaction(speichernameWert, 'readonly').objectStore(speichernameWert).openCursor()
    anfrage.addEventListener('success', () => {
      const cursor = anfrage.result
      if (!cursor) {
        resolve(werte)
        return
      }
      werte.push({ schluessel: cursor.key, wert: cursor.value })
      cursor.continue()
    })
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Rohdaten konnten nicht gelesen werden.')),
    )
  })
}

function starteDateidownload(datei: File): void {
  const url = URL.createObjectURL(datei)
  const link = document.createElement('a')
  link.href = url
  link.download = datei.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
