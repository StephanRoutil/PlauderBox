import type { LokaleBegehung, LokalesBild } from './begehungsSpeicher'
import { istUnterstuetzterBildtyp, maximaleBildgroesse } from '@logik/clientPruefungen'

export type BildSicherungsart = 'geteilt' | 'heruntergeladen' | 'keine_bilder'
export interface BildSicherungsErgebnis { art: BildSicherungsart; anzahl: number }
export interface BildTeiler {
  canShare?: (daten?: ShareData) => boolean
  share?: (daten?: ShareData) => Promise<void>
}

type BildDownloader = (datei: File) => void

export interface BildAuswahlErgebnis { bilder: LokalesBild[]; fehler: string[] }

export function pruefeBildauswahl(
  dateien: File[],
  neueId: () => string = () => crypto.randomUUID(),
  jetzt: () => string = () => new Date().toISOString(),
): BildAuswahlErgebnis {
  const bilder: LokalesBild[] = []
  const fehler: string[] = []
  for (const datei of dateien) {
    if (!datei.type.startsWith('image/')) {
      fehler.push(`${datei.name} ist keine Bilddatei.`)
      continue
    }
    if (!istUnterstuetzterBildtyp(datei.type)) {
      fehler.push(`${datei.name} hat ein nicht unterstütztes Bildformat. Bitte JPEG, PNG, GIF oder TIFF wählen.`)
      continue
    }
    if (datei.size > maximaleBildgroesse) {
      fehler.push(`${datei.name} ist grösser als 15 MB.`)
      continue
    }
    const dateizeitpunkt = datei.lastModified > 0 ? new Date(datei.lastModified).toISOString() : jetzt()
    bilder.push({ id: neueId(), dateiname: datei.name, medientyp: datei.type, groesse: datei.size, erstelltAm: dateizeitpunkt, bild: datei })
  }
  return { bilder, fehler }
}

export function sammleBegehungsbilder(begehung: LokaleBegehung): File[] {
  const projekt = bereinigeDateiname(String(begehung.protokoll.projekt.nummer)) || 'Projekt'
  const typ = begehung.protokoll.typ.trim().toLocaleLowerCase('de-CH').startsWith('journal') ? 'J' : 'P'
  const protokoll = `${typ}${String(begehung.protokoll.protokollNummer).padStart(3, '0')}`

  return begehung.eintraege.flatMap((eintrag, eintragIndex) => {
    const gruppe = bereinigeDateiname(eintrag.gruppe) || 'Ohne-Gruppe'
    return eintrag.bilder.map((bild, bildIndex) => new File(
      [bild.bild],
      `${projekt}_${protokoll}_${String(eintragIndex + 1).padStart(2, '0')}_${gruppe}_${String(bildIndex + 1).padStart(2, '0')}.${ermittleEndung(bild)}`,
      { type: bild.medientyp || bild.bild.type || 'image/jpeg', lastModified: ermittleZeitpunkt(bild.erstelltAm) },
    ))
  })
}

export async function sichereBegehungsbilder(
  begehung: LokaleBegehung,
  teiler: BildTeiler = navigator,
  downloader: BildDownloader = ladeBildHerunter,
): Promise<BildSicherungsErgebnis> {
  const dateien = sammleBegehungsbilder(begehung)
  if (!dateien.length) return { art: 'keine_bilder', anzahl: 0 }

  const teilenDaten: ShareData = {
    files: dateien,
    title: `PlauderBox ${begehung.protokoll.projekt.nummer} ${begehung.protokoll.typ} ${begehung.protokoll.protokollNummer}`,
    text: `${dateien.length} Bilder aus der PlauderBox-Begehung`,
  }
  let kannGemeinsamTeilen = false
  try {
    kannGemeinsamTeilen = Boolean(teiler.share && teiler.canShare?.({ files: dateien }))
  } catch {
    kannGemeinsamTeilen = false
  }
  if (kannGemeinsamTeilen && teiler.share) {
    await teiler.share(teilenDaten)
    return { art: 'geteilt', anzahl: dateien.length }
  }

  for (const datei of dateien) downloader(datei)
  return { art: 'heruntergeladen', anzahl: dateien.length }
}

function ladeBildHerunter(datei: File): void {
  const url = URL.createObjectURL(datei)
  const link = document.createElement('a')
  link.href = url
  link.download = datei.name
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function ermittleEndung(bild: LokalesBild): string {
  const dateiEndung = bild.dateiname.match(/\.([A-Za-z0-9]{2,5})$/)?.[1]?.toLocaleLowerCase('de-CH')
  if (dateiEndung && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'].includes(dateiEndung)) return dateiEndung
  if (bild.medientyp.includes('png')) return 'png'
  if (bild.medientyp.includes('webp')) return 'webp'
  if (bild.medientyp.includes('heic')) return 'heic'
  if (bild.medientyp.includes('heif')) return 'heif'
  return 'jpg'
}

function ermittleZeitpunkt(wert: string): number {
  const zeitpunkt = Date.parse(wert)
  return Number.isFinite(zeitpunkt) ? zeitpunkt : Date.now()
}

function bereinigeDateiname(wert: string): string {
  return wert.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
}
