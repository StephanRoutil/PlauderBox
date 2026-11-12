import {
  normalisiereEintragProjektAnsprechpartner,
  type BegehungEintrag,
  type LokaleAudioaufnahme,
  type LokaleBegehung,
  type LokalesBild,
} from '@logik/begehungsAblauf'
import { istFreigabeToken } from '@logik/clientPruefungen'

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

export class BegehungSpeicherfehler extends Error {
  constructor(public readonly art: 'unlesbare_daten') {
    super(art)
  }
}

export interface RohdatensicherungErgebnis {
  dateien: number
  art: 'geteilt' | 'heruntergeladen'
}

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null
}

function istText(wert: unknown): wert is string {
  return typeof wert === 'string'
}
function istZahl(wert: unknown): wert is number {
  return typeof wert === 'number' && Number.isFinite(wert)
}
function istOptionaleZahl(wert: unknown): boolean {
  return wert === null || istZahl(wert)
}
function istOptionalerText(wert: unknown): boolean {
  return wert === null || wert === undefined || istText(wert)
}

function istProtokollKontext(wert: unknown): boolean {
  if (
    !istObjekt(wert) ||
    !istZahl(wert.protokollId) ||
    !istZahl(wert.protokollNummer) ||
    !istText(wert.thema) ||
    !istText(wert.typ) ||
    !istText(wert.status) ||
    !istText(wert.datum) ||
    !istOptionalerText(wert.ort) ||
    !istObjekt(wert.projekt) ||
    !istZahl(wert.projekt.id) ||
    !istZahl(wert.projekt.nummer) ||
    !istText(wert.projekt.bezeichnung) ||
    !istObjekt(wert.mitarbeiter) ||
    !istZahl(wert.mitarbeiter.id) ||
    !istText(wert.mitarbeiter.name) ||
    !Array.isArray(wert.traktanden) ||
    !wert.traktanden.every(istText) ||
    !Array.isArray(wert.verteiler) ||
    !Array.isArray(wert.protokollpunkte) ||
    (wert.protokollpunktArten !== undefined &&
      (!Array.isArray(wert.protokollpunktArten) ||
        !wert.protokollpunktArten.every((art) => istObjekt(art) && istZahl(art.id) && istText(art.bezeichnung))))
  )
    return false
  if (
    wert.objekt !== null &&
    (!istObjekt(wert.objekt) ||
      !istZahl(wert.objekt.id) ||
      !istText(wert.objekt.bezeichnung) ||
      !istOptionalerText(wert.objekt.adresse) ||
      !istOptionalerText(wert.objekt.gemeinde))
  )
    return false
  return (
    wert.verteiler.every(
      (person) =>
        istObjekt(person) &&
        istZahl(person.id) &&
        istZahl(person.projektAnsprechpartnerId) &&
        istText(person.person) &&
        istOptionalerText(person.firma) &&
        istOptionalerText(person.funktion) &&
        typeof person.istTeilnehmer === 'boolean' &&
        typeof person.istCc === 'boolean' &&
        typeof person.istProtokollschreiber === 'boolean',
    ) &&
    wert.protokollpunkte.every(
      (punkt) =>
        istObjekt(punkt) &&
        istZahl(punkt.id) &&
        istText(punkt.guid) &&
        (punkt.protokollpunktArtId === undefined || istZahl(punkt.protokollpunktArtId)) &&
        (punkt.projektAnsprechpartnerId === undefined || istOptionaleZahl(punkt.projektAnsprechpartnerId)) &&
        istText(punkt.gruppe) &&
        istZahl(punkt.reihenfolge) &&
        istText(punkt.thema) &&
        istText(punkt.inhalt) &&
        istOptionalerText(punkt.rechtsverweis),
    )
  )
}

function istGespeicherterEintrag(wert: unknown): wert is GespeicherterEintrag {
  return (
    istObjekt(wert) &&
    istText(wert.id) &&
    istText(wert.erstelltAm) &&
    istText(wert.aktualisiertAm) &&
    ['entwurf', 'wartet_auf_auswertung', 'wird_ausgewertet', 'ausgewertet', 'fehler'].includes(String(wert.status)) &&
    istText(wert.traktandum) &&
    istOptionaleZahl(wert.vorbereiteterProtokollpunktId) &&
    istOptionaleZahl(wert.protokollpunktArtId) &&
    istOptionaleZahl(wert.projektAnsprechpartnerId) &&
    istText(wert.gruppe) &&
    istText(wert.thema) &&
    istText(wert.inhalt) &&
    istText(wert.rechtsverweis) &&
    istText(wert.transkript) &&
    istText(wert.fehler) &&
    (wert.audioSchluessel === null || istText(wert.audioSchluessel)) &&
    Array.isArray(wert.bildSchluessel) &&
    wert.bildSchluessel.every(istText) &&
    (wert.legacyImportId === undefined || istText(wert.legacyImportId))
  )
}

function istGespeicherteBegehung(wert: unknown): wert is GespeicherteBegehung {
  return (
    istObjekt(wert) &&
    wert.schemaVersion === schemaVersion &&
    istText(wert.id) &&
    istText(wert.gestartetAm) &&
    istText(wert.aktualisiertAm) &&
    ['aktiv', 'kontrolle', 'lokal_abgeschlossen', 'an_happyhour_uebertragen'].includes(String(wert.status)) &&
    istProtokollKontext(wert.protokoll) &&
    (wert.freigabeToken === undefined || istText(wert.freigabeToken)) &&
    istOptionalerText(wert.uebertragenAm) &&
    istOptionalerText(wert.bilderUebertragenAm) &&
    (wert.aktuellerEintragId === null || istText(wert.aktuellerEintragId)) &&
    Array.isArray(wert.eintraege) &&
    wert.eintraege.every(istGespeicherterEintrag)
  )
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
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Der Begehungsspeicher konnte nicht geöffnet werden.')),
    )
  })
}

function migriereVersionEins(transaktion: IDBTransaction): void {
  const anfrage = transaktion.objectStore(speichername).get(aktiverSchluessel)
  anfrage.addEventListener('success', () => {
    if (anfrage.result === undefined) return
    try {
      const paket = erstelleSpeicherpaket(
        anfrage.result as LokaleBegehung,
        (anfrage.result as LokaleBegehung).aktualisiertAm,
      )
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
