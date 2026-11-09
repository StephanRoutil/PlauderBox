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

const datenbankname = 'PlauderBoxInternerSpeicher'
const speichername = 'aufnahmen'
const datenbankversion = 1

function oeffneDatenbank(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(datenbankname, datenbankversion)
    anfrage.addEventListener('upgradeneeded', () => {
      const datenbank = anfrage.result
      if (!datenbank.objectStoreNames.contains(speichername)) {
        datenbank.createObjectStore(speichername, { keyPath: 'id' })
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
    const transaktion = datenbank.transaction(speichername, 'readwrite')
    const speicher = transaktion.objectStore(speichername)
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
      const transaktion = datenbank.transaction(speichername, 'readonly')
      const anfrage = transaktion.objectStore(speichername).getAll()
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
    const transaktion = datenbank.transaction(speichername, 'readwrite')
    transaktion.objectStore(speichername).delete(id)
    await warteAufTransaktion(transaktion)
  } finally {
    datenbank.close()
  }
}
