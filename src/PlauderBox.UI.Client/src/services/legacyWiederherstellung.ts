import {
  erstelleEintrag,
  type BegehungEintrag,
  type LokaleAudioaufnahme,
  type LokalesBild,
} from '@logik/begehungsAblauf'
import { istLegacyImportUebernommen } from './begehungsSpeicher'

interface LegacyAufnahme {
  id?: string
  erstelltAm?: string
  dateiname: string
  medientyp: string
  groesse: number
  dauerSekunden: number
  audio: Blob
}
interface LegacyBild {
  id?: string
  dateiname: string
  medientyp: string
  groesse: number
  erstelltAm: string
  bild: Blob
}
interface LegacyPunkt {
  intProjektAnsprechpartnerFKID?: number | null
  strGruppe?: string
  strProtokollpunkt?: string
  txtProtokollpunkt?: string
  strRechtsverweis?: string
  aktualisiertAm?: string
}

const datenbankname = 'PlauderBoxInternerSpeicher'

export function verwerfeLegacyDaten(): Promise<void> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.deleteDatabase(datenbankname)
    anfrage.addEventListener('success', () => resolve())
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Der alte interne App-Speicher konnte nicht geleert werden.')),
    )
    anfrage.addEventListener('blocked', () =>
      reject(new Error('Der alte interne App-Speicher wird noch von einem anderen Fenster verwendet.')),
    )
  })
}

function bildeLegacyImportId(
  punkt: LegacyPunkt | undefined,
  aufnahme: LegacyAufnahme | undefined,
  bilder: LegacyBild[],
): string {
  const grundlage = JSON.stringify({
    punkt: punkt
      ? [
          punkt.aktualisiertAm,
          punkt.intProjektAnsprechpartnerFKID,
          punkt.strGruppe,
          punkt.strProtokollpunkt,
          punkt.txtProtokollpunkt,
          punkt.strRechtsverweis,
        ]
      : null,
    aufnahme: aufnahme
      ? [
          aufnahme.id,
          aufnahme.erstelltAm,
          aufnahme.dateiname,
          aufnahme.medientyp,
          aufnahme.groesse,
          aufnahme.dauerSekunden,
        ]
      : null,
    bilder: bilder.map((bild) => [bild.id, bild.erstelltAm, bild.dateiname, bild.medientyp, bild.groesse]).sort(),
  })
  let hash = 2166136261
  for (let index = 0; index < grundlage.length; index += 1) {
    hash ^= grundlage.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `legacy-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function anfrageAlsPromise<T>(anfrage: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Legacy-Daten konnten nicht gelesen werden.')),
    )
  })
}

export async function ladeLegacyEintrag(): Promise<BegehungEintrag | null> {
  const datenbank = await new Promise<IDBDatabase>((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname)
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () =>
      reject(anfrage.error ?? new Error('Legacy-Speicher konnte nicht geöffnet werden.')),
    )
  })
  try {
    const hatPunkt = datenbank.objectStoreNames.contains('protokollpunkt')
    const hatAudio = datenbank.objectStoreNames.contains('aufnahmen')
    const hatBilder = datenbank.objectStoreNames.contains('protokollpunktbild')
    if (!hatPunkt && !hatAudio && !hatBilder) return null

    let punkt: LegacyPunkt | undefined
    let aufnahme: LegacyAufnahme | undefined
    let bilder: LegacyBild[] = []
    if (hatPunkt) {
      punkt = (await anfrageAlsPromise(
        datenbank
          .transaction('protokollpunkt', 'readonly')
          .objectStore('protokollpunkt')
          .get('aktueller-protokollpunkt'),
      )) as LegacyPunkt | undefined
    }
    if (hatAudio) {
      const aufnahmen = (await anfrageAlsPromise(
        datenbank.transaction('aufnahmen', 'readonly').objectStore('aufnahmen').getAll(),
      )) as LegacyAufnahme[]
      aufnahme = aufnahmen[0]
    }
    if (hatBilder) {
      bilder = (await anfrageAlsPromise(
        datenbank.transaction('protokollpunktbild', 'readonly').objectStore('protokollpunktbild').getAll(),
      )) as LegacyBild[]
    }
    const legacyImportId = bildeLegacyImportId(punkt, aufnahme, bilder)
    if (await istLegacyImportUebernommen(legacyImportId)) return null
    const eintrag = erstelleEintrag()
    eintrag.legacyImportId = legacyImportId
    if (punkt) {
      eintrag.projektAnsprechpartnerId = punkt.intProjektAnsprechpartnerFKID ?? null
      eintrag.gruppe = punkt.strGruppe ?? ''
      eintrag.thema = punkt.strProtokollpunkt ?? ''
      eintrag.inhalt = punkt.txtProtokollpunkt ?? ''
      eintrag.rechtsverweis = punkt.strRechtsverweis ?? ''
      eintrag.aktualisiertAm = punkt.aktualisiertAm ?? eintrag.aktualisiertAm
    }
    if (aufnahme) {
      const audio: LokaleAudioaufnahme = {
        dateiname: aufnahme.dateiname,
        medientyp: aufnahme.medientyp,
        groesse: aufnahme.groesse,
        dauerSekunden: aufnahme.dauerSekunden,
        audio: aufnahme.audio,
      }
      eintrag.audio = audio
      eintrag.status = 'wartet_auf_auswertung'
    }
    eintrag.bilder = bilder.map((bild): LokalesBild => ({
      id: bild.id ?? crypto.randomUUID(),
      dateiname: bild.dateiname,
      medientyp: bild.medientyp,
      groesse: bild.groesse,
      erstelltAm: bild.erstelltAm,
      bild: bild.bild,
    }))
    return eintrag.audio || eintrag.bilder.length || eintrag.gruppe || eintrag.thema || eintrag.inhalt ? eintrag : null
  } finally {
    datenbank.close()
  }
}
