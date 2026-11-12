import { normalisiereEintragProjektAnsprechpartner, type LokaleBegehung } from '@logik/begehungsAblauf'
import { istFreigabeToken } from '@logik/clientPruefungen'

export type { BegehungEintrag, EintragStatus, BegehungStatus, HappyHourProtokollKontext, LokaleAudioaufnahme, LokaleBegehung, LokalesBild } from '@logik/begehungsAblauf'
export { bereiteWiederanlaufVor, eindeutigeVerteileroptionen, ermittleStandardProjektAnsprechpartnerId, erstelleBegehung, erstelleEintrag, erstelleEintragFuerProtokoll, gruppiereEintraege, istEintragUnvollstaendig, naechsterAusstehenderEintrag, normalisiereEintragProjektAnsprechpartner, normalisiereProjektAnsprechpartnerId, uebernehmeAuswertung, zaehleAusstehendeAudioaufnahmen } from '@logik/begehungsAblauf'

const datenbankname = 'PlauderBoxBegehungsspeicher'
const speichername = 'begehungen'
const aktiverSchluessel = 'aktive-begehung'
const legacyMarkerPraefix = 'legacy-import:'

function erstelleSpeicherbareBegehung(begehung: LokaleBegehung, aktualisiertAm: string): LokaleBegehung {
  return {
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
    eintraege: begehung.eintraege.map((eintrag) => ({
      ...eintrag,
      audio: eintrag.audio ? { ...eintrag.audio, audio: eintrag.audio.audio } : null,
      bilder: eintrag.bilder.map((bild) => ({ ...bild, bild: bild.bild })),
    })),
  }
}

function oeffneDatenbank(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname, 1)
    anfrage.addEventListener('upgradeneeded', () => {
      if (!anfrage.result.objectStoreNames.contains(speichername)) anfrage.result.createObjectStore(speichername)
    })
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Der Begehungsspeicher konnte nicht geöffnet werden.')))
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
  const zuSpeichern = erstelleSpeicherbareBegehung(begehung, new Date().toISOString())
  const datenbank = await datenbankOeffnen()
  try {
    const transaktion = datenbank.transaction(speichername, 'readwrite')
    transaktion.objectStore(speichername).put(zuSpeichern, aktiverSchluessel)
    if (legacyImportId) transaktion.objectStore(speichername).put({ uebernommenAm: new Date().toISOString() }, `${legacyMarkerPraefix}${legacyImportId}`)
    await warteAufTransaktion(transaktion)
    begehung.aktualisiertAm = zuSpeichern.aktualisiertAm
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
    return await new Promise((resolve, reject) => {
      const anfrage = datenbank.transaction(speichername, 'readonly').objectStore(speichername).get(aktiverSchluessel)
      anfrage.addEventListener('success', () => resolve((anfrage.result as LokaleBegehung | undefined) ?? null))
      anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Die Begehung konnte nicht gelesen werden.')))
    })
  } finally { datenbank.close() }
}

export async function loescheBegehung(): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction(speichername, 'readwrite')
    transaktion.objectStore(speichername).delete(aktiverSchluessel)
    await warteAufTransaktion(transaktion)
  } finally { datenbank.close() }
}
