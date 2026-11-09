export type AufnahmeStatus = 'noch_nicht_uebertragen'

export interface InterneAufnahme {
  id: string
  erstelltAm: string
  dateiname: string
  medientyp: string
  groesse: number
  dauerSekunden: number
  status: AufnahmeStatus
  audio: Blob
}

export interface LokalerProtokollpunkt {
  intProtokollpunktID: number
  intProtokollFKID: number
  intProtokollpunktArtFKID: number
  datProtokollpunkt: string
  blnNachverfolgen: boolean
  intProjektAnsprechpartnerFKID: number | null
  datFrist: string | null
  blnErledigt: boolean
  strRechtsverweis: string
  strGruppe: string
  intReihenfolge: number
  strProtokollpunkt: string
  txtProtokollpunkt: string
  GUID: string
  aktualisiertAm: string
}

export interface LokalesProtokollpunktbild {
  dateiname: string
  medientyp: string
  groesse: number
  erstelltAm: string
  bild: Blob
}

const datenbankname = 'PlauderBoxInternerSpeicher'
const aufnahmespeichername = 'aufnahmen'
const protokollpunktspeichername = 'protokollpunkt'
const protokollpunktschluessel = 'aktueller-protokollpunkt'
const bildspeichername = 'protokollpunktbild'
const bildschluessel = 'aktuelles-bild'
const datenbankversion = 3

function oeffneDatenbank(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname, datenbankversion)
    anfrage.addEventListener('upgradeneeded', () => {
      const datenbank = anfrage.result
      if (!datenbank.objectStoreNames.contains(aufnahmespeichername)) {
        datenbank.createObjectStore(aufnahmespeichername, { keyPath: 'id' })
      }
      if (!datenbank.objectStoreNames.contains(protokollpunktspeichername)) {
        datenbank.createObjectStore(protokollpunktspeichername)
      }
      if (!datenbank.objectStoreNames.contains(bildspeichername)) {
        datenbank.createObjectStore(bildspeichername)
      }
    })
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Der interne Speicher konnte nicht geöffnet werden.')))
  })
}

function warteAufTransaktion(transaktion: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaktion.addEventListener('complete', () => resolve())
    transaktion.addEventListener('abort', () => reject(transaktion.error ?? new Error('Die Speichertransaktion wurde abgebrochen.')))
    transaktion.addEventListener('error', () => reject(transaktion.error ?? new Error('Die Speichertransaktion ist fehlgeschlagen.')))
  })
}

export async function speichereEinzelneAufnahme(aufnahme: InterneAufnahme): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction(aufnahmespeichername, 'readwrite')
    const speicher = transaktion.objectStore(aufnahmespeichername)
    speicher.clear()
    speicher.put(aufnahme)
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}

export async function ladeInterneAufnahme(): Promise<InterneAufnahme | null> {
  const datenbank = await oeffneDatenbank()
  try {
    return await new Promise((resolve, reject) => {
      const transaktion = datenbank.transaction(aufnahmespeichername, 'readonly')
      const anfrage = transaktion.objectStore(aufnahmespeichername).getAll()
      anfrage.addEventListener('success', () => resolve((anfrage.result[0] as InterneAufnahme | undefined) ?? null))
      anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Die Aufnahme konnte nicht gelesen werden.')))
    })
  } finally {
    datenbank.close()
  }
}

export async function loescheInterneAufnahme(id: string): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction(aufnahmespeichername, 'readwrite')
    transaktion.objectStore(aufnahmespeichername).delete(id)
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}

export async function speichereLokalenProtokollpunkt(protokollpunkt: LokalerProtokollpunkt): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction(protokollpunktspeichername, 'readwrite')
    transaktion.objectStore(protokollpunktspeichername).put(protokollpunkt, protokollpunktschluessel)
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}

export async function ladeLokalenProtokollpunkt(): Promise<LokalerProtokollpunkt | null> {
  const datenbank = await oeffneDatenbank()
  try {
    return await new Promise((resolve, reject) => {
      const transaktion = datenbank.transaction(protokollpunktspeichername, 'readonly')
      const anfrage = transaktion.objectStore(protokollpunktspeichername).get(protokollpunktschluessel)
      anfrage.addEventListener('success', () => resolve((anfrage.result as LokalerProtokollpunkt | undefined) ?? null))
      anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Der lokale Protokollpunkt konnte nicht gelesen werden.')))
    })
  } finally {
    datenbank.close()
  }
}

export async function speichereLokalesBild(bild: LokalesProtokollpunktbild): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction(bildspeichername, 'readwrite')
    transaktion.objectStore(bildspeichername).put(bild, bildschluessel)
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}

export async function ladeLokalesBild(): Promise<LokalesProtokollpunktbild | null> {
  const datenbank = await oeffneDatenbank()
  try {
    return await new Promise((resolve, reject) => {
      const transaktion = datenbank.transaction(bildspeichername, 'readonly')
      const anfrage = transaktion.objectStore(bildspeichername).get(bildschluessel)
      anfrage.addEventListener('success', () => resolve((anfrage.result as LokalesProtokollpunktbild | undefined) ?? null))
      anfrage.addEventListener('error', () => reject(anfrage.error ?? new Error('Das lokale Bild konnte nicht gelesen werden.')))
    })
  } finally {
    datenbank.close()
  }
}

export async function loescheLokalesBild(): Promise<void> {
  const datenbank = await oeffneDatenbank()
  try {
    const transaktion = datenbank.transaction(bildspeichername, 'readwrite')
    transaktion.objectStore(bildspeichername).delete(bildschluessel)
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}
