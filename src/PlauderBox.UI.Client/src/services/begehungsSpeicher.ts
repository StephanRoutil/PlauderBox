import { normalisiereEintragProjektAnsprechpartner, type BegehungEintrag, type LokaleAudioaufnahme, type LokaleBegehung, type LokalesBild } from '@logik/begehungsAblauf'
import { istFreigabeToken } from '@logik/clientPruefungen'

export type { BegehungEintrag, EintragStatus, BegehungStatus, HappyHourProtokollKontext, LokaleAudioaufnahme, LokaleBegehung, LokalesBild } from '@logik/begehungsAblauf'
export { bereiteWiederanlaufVor, eindeutigeVerteileroptionen, ermittleStandardProjektAnsprechpartnerId, erstelleBegehung, erstelleEintrag, erstelleEintragFuerProtokoll, gruppiereEintraege, istEintragUnvollstaendig, naechsterAusstehenderEintrag, normalisiereEintragProjektAnsprechpartner, normalisiereProjektAnsprechpartnerId, uebernehmeAuswertung, zaehleAusstehendeAudioaufnahmen } from '@logik/begehungsAblauf'

const datenbankname = 'PlauderBoxBegehungsspeicher'
const speichername = 'begehungen'
const audiospeichername = 'audio'
const bildspeichername = 'bilder'
const aktiverSchluessel = 'aktive-begehung'
const legacyMarkerPraefix = 'legacy-import:'
const schemaVersion = 2 as const

interface GespeicherterEintrag extends Omit<BegehungEintrag, 'audio' | 'bilder'> {
  audioSchluessel: string | null
  bildSchluessel: string[]
}

interface GespeicherteBegehung extends Omit<LokaleBegehung, 'eintraege'> {
  schemaVersion: typeof schemaVersion
  eintraege: GespeicherterEintrag[]
}

interface Speicherpaket {
  begehung: GespeicherteBegehung
  audio: Array<{ schluessel: string; wert: LokaleAudioaufnahme }>
  bilder: Array<{ schluessel: string; wert: LokalesBild }>
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
      if (eintrag.audio && audioSchluessel) audio.push({ schluessel: audioSchluessel, wert: { ...eintrag.audio, audio: eintrag.audio.audio } })
      const bildSchluessel = eintrag.bilder.map((bild) => `${eintrag.id}:bild:${bild.id}`)
      eintrag.bilder.forEach((bild, index) => bilder.push({ schluessel: bildSchluessel[index]!, wert: { ...bild, bild: bild.bild } }))
      const { audio: _audio, bilder: _bilder, ...ohneMedien } = eintrag
      void _audio
      void _bilder
      return { ...ohneMedien, audioSchluessel, bildSchluessel }
    }),
  }
  return { begehung: gespeicherteBegehung, audio, bilder }
}

function oeffneDatenbank(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname, schemaVersion)
    anfrage.addEventListener('upgradeneeded', (ereignis) => {
      const datenbank = anfrage.result
      const transaktion = anfrage.transaction!
      if (!datenbank.objectStoreNames.contains(speichername)) datenbank.createObjectStore(speichername)
      if (!datenbank.objectStoreNames.contains(audiospeichername)) datenbank.createObjectStore(audiospeichername)
      if (!datenbank.objectStoreNames.contains(bildspeichername)) datenbank.createObjectStore(bildspeichername)
      if ((ereignis as IDBVersionChangeEvent).oldVersion === 1) migriereVersionEins(transaktion)
    })
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Der Begehungsspeicher konnte nicht geöffnet werden.')))
  })
}

function migriereVersionEins(transaktion: IDBTransaction): void {
  const anfrage = transaktion.objectStore(speichername).get(aktiverSchluessel)
  anfrage.addEventListener('success', () => {
    if (anfrage.result === undefined) return
    try {
      const paket = erstelleSpeicherpaket(anfrage.result as LokaleBegehung, (anfrage.result as LokaleBegehung).aktualisiertAm)
      for (const audio of paket.audio) transaktion.objectStore(audiospeichername).put(audio.wert, audio.schluessel)
      for (const bild of paket.bilder) transaktion.objectStore(bildspeichername).put(bild.wert, bild.schluessel)
      transaktion.objectStore(speichername).put(paket.begehung, aktiverSchluessel)
    } catch {
      transaktion.abort()
    }
  })
}

function warteAufTransaktion(transaktion: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaktion.addEventListener('complete', () => resolve())
    transaktion.addEventListener('abort', () => reject(transaktion.error ?? new Error('Die Speichertransaktion wurde abgebrochen.')))
    transaktion.addEventListener('error', () => reject(transaktion.error ?? new Error('Die Speichertransaktion ist fehlgeschlagen.')))
  })
}

export async function speichereBegehung(begehung: LokaleBegehung, datenbankOeffnen: () => Promise<IDBDatabase> = oeffneDatenbank, legacyImportId?: string): Promise<void> {
  const paket = erstelleSpeicherpaket(begehung, new Date().toISOString())
  const datenbank = await datenbankOeffnen()
  try {
    const transaktion = datenbank.transaction([speichername, audiospeichername, bildspeichername], 'readwrite')
    transaktion.objectStore(audiospeichername).clear()
    transaktion.objectStore(bildspeichername).clear()
    for (const audio of paket.audio) transaktion.objectStore(audiospeichername).put(audio.wert, audio.schluessel)
    for (const bild of paket.bilder) transaktion.objectStore(bildspeichername).put(bild.wert, bild.schluessel)
    transaktion.objectStore(speichername).put(paket.begehung, aktiverSchluessel)
    if (legacyImportId) transaktion.objectStore(speichername).put({ uebernommenAm: new Date().toISOString() }, `${legacyMarkerPraefix}${legacyImportId}`)
    await warteAufTransaktion(transaktion)
    begehung.aktualisiertAm = paket.begehung.aktualisiertAm
  } finally { datenbank.close() }
}

export async function istLegacyImportUebernommen(legacyImportId: string): Promise<boolean> {
  const datenbank = await oeffneDatenbank()
  try {
    return await new Promise((resolve, reject) => {
      const anfrage = datenbank.transaction(speichername, 'readonly').objectStore(speichername).get(`${legacyMarkerPraefix}${legacyImportId}`)
      anfrage.addEventListener('success', () => resolve(Boolean(anfrage.result)))
      anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Der Migrationsstatus konnte nicht gelesen werden.')))
    })
  } finally { datenbank.close() }
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
    eintraege: vorhanden ? begehung.eintraege.map((wert) => wert.id === normalisierterEintrag.id ? normalisierterEintrag : wert) : [...begehung.eintraege, normalisierterEintrag],
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
  const kandidat: LokaleBegehung = { ...begehung, status: 'an_happyhour_uebertragen', uebertragenAm, bilderUebertragenAm: uebertragenAm }
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
    const gespeichert = await new Promise<GespeicherteBegehung | null>((resolve, reject) => {
      const anfrage = datenbank.transaction(speichername, 'readonly').objectStore(speichername).get(aktiverSchluessel)
      anfrage.addEventListener('success', () => resolve((anfrage.result as GespeicherteBegehung | undefined) ?? null))
      anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Die Begehung konnte nicht gelesen werden.')))
    })
    if (!gespeichert) return null
    const transaktion = datenbank.transaction([audiospeichername, bildspeichername], 'readonly')
    const eintraege = await Promise.all(gespeichert.eintraege.map(async (eintrag): Promise<BegehungEintrag> => {
      const audioVersprechen = eintrag.audioSchluessel
        ? leseWert<LokaleAudioaufnahme>(transaktion.objectStore(audiospeichername), eintrag.audioSchluessel)
        : Promise.resolve(null)
      const bildVersprechen = eintrag.bildSchluessel.map((schluessel) =>
        leseWert<LokalesBild>(transaktion.objectStore(bildspeichername), schluessel))
      const [audio, bilder] = await Promise.all([audioVersprechen, Promise.all(bildVersprechen)])
      const { audioSchluessel: _audioSchluessel, bildSchluessel: _bildSchluessel, ...ohneVerweise } = eintrag
      void _audioSchluessel
      void _bildSchluessel
      return { ...ohneVerweise, audio, bilder: bilder.filter((bild): bild is LokalesBild => bild !== null) }
    }))
    const { schemaVersion: _schemaVersion, ...ohneSchemaVersion } = gespeichert
    void _schemaVersion
    return { ...ohneSchemaVersion, eintraege }
  } finally { datenbank.close() }
}

function leseWert<T>(speicher: IDBObjectStore, schluessel: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const anfrage = speicher.get(schluessel)
    anfrage.addEventListener('success', () => resolve((anfrage.result as T | undefined) ?? null))
    anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Gespeicherte Mediendaten konnten nicht gelesen werden.')))
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
  } finally { datenbank.close() }
}
