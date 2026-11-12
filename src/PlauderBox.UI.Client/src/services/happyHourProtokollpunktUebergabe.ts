import { normalisiereProjektAnsprechpartnerId, type LokaleBegehung } from './begehungsSpeicher'
import { istErfassungsId, istFreigabeToken, istUnterstuetzterBildtyp, maximaleBildgroesse } from '@logik/clientPruefungen'

export type HappyHourUebergabefehlerArt = 'offline' | 'freigabe_ungueltig' | 'konflikt' | 'ungueltig' | 'bild_ungueltig' | 'bildkontingent' | 'netzwerk' | 'ungueltige_antwort'

export class HappyHourUebergabefehler extends Error {
  constructor(public readonly art: HappyHourUebergabefehlerArt) { super(art) }
}

export interface HappyHourUebergabeErgebnis { erfassungsId: string; protokollpunktId: number; erstellt: boolean }
export interface HappyHourBildUebergabeErgebnis { bildId: string; protokollpunktId: number; dokumentId: number; erstellt: boolean }

export async function uebergebeProtokollpunkte(
  begehung: LokaleBegehung,
  fetchFunktion: typeof fetch = fetch,
): Promise<HappyHourUebergabeErgebnis[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new HappyHourUebergabefehler('offline')
  if (!['lokal_abgeschlossen', 'an_happyhour_uebertragen'].includes(begehung.status) || begehung.bilderUebertragenAm)
    throw new HappyHourUebergabefehler('ungueltig')
  if (!begehung.freigabeToken || !istFreigabeToken(begehung.freigabeToken))
    throw new HappyHourUebergabefehler('freigabe_ungueltig')
  if (!begehung.eintraege.length) throw new HappyHourUebergabefehler('ungueltig')

  const vorbereiteteIds = begehung.eintraege
    .map((eintrag) => eintrag.vorbereiteterProtokollpunktId)
    .filter((id): id is number => id !== null)
  if (new Set(vorbereiteteIds).size !== vorbereiteteIds.length)
    throw new HappyHourUebergabefehler('konflikt')

  const eintraege = begehung.eintraege.map((eintrag) => {
    const projektAnsprechpartnerId = normalisiereProjektAnsprechpartnerId(begehung.protokoll, eintrag.projektAnsprechpartnerId)
    if (!istErfassungsId(eintrag.id)
      || !eintrag.protokollpunktArtId || !projektAnsprechpartnerId || !eintrag.gruppe.trim() || !eintrag.thema.trim() || !eintrag.inhalt.trim())
      throw new HappyHourUebergabefehler('ungueltig')
    return {
      erfassungsId: eintrag.id,
      vorbereiteterProtokollpunktId: eintrag.vorbereiteterProtokollpunktId,
      protokollpunktArtId: eintrag.protokollpunktArtId,
      projektAnsprechpartnerId,
      gruppe: eintrag.gruppe.trim(),
      thema: eintrag.thema.trim(),
      inhalt: eintrag.inhalt.trim(),
      rechtsverweis: eintrag.rechtsverweis.trim() || null,
    }
  })

  let antwort: Response
  try {
    antwort = await fetchFunktion('/api/happyhour/protokollpunkte/uebergeben', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ freigabeToken: begehung.freigabeToken, begehungStatus: 'lokal_abgeschlossen', eintraege }),
    })
  } catch { throw new HappyHourUebergabefehler('netzwerk') }

  if ([401, 403, 404, 410].includes(antwort.status)) throw new HappyHourUebergabefehler('freigabe_ungueltig')
  if (antwort.status === 409) throw new HappyHourUebergabefehler('konflikt')
  if (antwort.status === 400) throw new HappyHourUebergabefehler('ungueltig')
  if (!antwort.ok) throw new HappyHourUebergabefehler('netzwerk')

  const daten: unknown = await antwort.json().catch(() => null)
  if (!istErgebnisliste(daten, eintraege.map((eintrag) => eintrag.erfassungsId)))
    throw new HappyHourUebergabefehler('ungueltige_antwort')
  await uebergebeBilder(begehung, daten.ergebnisse, fetchFunktion)
  return daten.ergebnisse
}

async function uebergebeBilder(
  begehung: LokaleBegehung,
  punkte: HappyHourUebergabeErgebnis[],
  fetchFunktion: typeof fetch,
): Promise<void> {
  const freigabeToken = begehung.freigabeToken
  if (!freigabeToken) throw new HappyHourUebergabefehler('freigabe_ungueltig')
  const punktNachErfassungsId = new Map(punkte.map((punkt) => [punkt.erfassungsId, punkt]))
  for (const eintrag of begehung.eintraege) {
    const punkt = punktNachErfassungsId.get(eintrag.id)
    if (!punkt) throw new HappyHourUebergabefehler('ungueltige_antwort')
    for (const bild of eintrag.bilder) {
      if (!istErfassungsId(bild.id)
        || bild.groesse <= 0 || bild.groesse > maximaleBildgroesse
        || !istUnterstuetzterBildtyp(bild.medientyp))
        throw new HappyHourUebergabefehler('bild_ungueltig')
      const formular = new FormData()
      formular.append('freigabeToken', freigabeToken)
      formular.append('aufnahmezeitpunkt', bild.erstelltAm)
      formular.append('bild', bild.bild, bild.dateiname)
      let antwort: Response
      try {
        antwort = await fetchFunktion(`/api/happyhour/protokollpunkte/${punkt.protokollpunktId}/bilder/${encodeURIComponent(bild.id)}`, {
          method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'X-PlauderBox-Freigabe': freigabeToken }, body: formular,
        })
      } catch { throw new HappyHourUebergabefehler('netzwerk') }
      if ([401, 403, 404, 410].includes(antwort.status)) throw new HappyHourUebergabefehler('freigabe_ungueltig')
      if (antwort.status === 409) throw new HappyHourUebergabefehler('konflikt')
      if (antwort.status === 400 || antwort.status === 413) throw new HappyHourUebergabefehler('bild_ungueltig')
      if (antwort.status === 429) throw new HappyHourUebergabefehler('bildkontingent')
      if (!antwort.ok) throw new HappyHourUebergabefehler('netzwerk')
      const ergebnis: unknown = await antwort.json().catch(() => null)
      if (!istBildergebnis(ergebnis, bild.id, punkt.protokollpunktId))
        throw new HappyHourUebergabefehler('ungueltige_antwort')
    }
  }
}

function istBildergebnis(wert: unknown, bildId: string, protokollpunktId: number): wert is HappyHourBildUebergabeErgebnis {
  return typeof wert === 'object' && wert !== null
    && 'bildId' in wert && wert.bildId === bildId
    && 'protokollpunktId' in wert && wert.protokollpunktId === protokollpunktId
    && 'dokumentId' in wert && typeof wert.dokumentId === 'number' && wert.dokumentId > 0
    && 'erstellt' in wert && typeof wert.erstellt === 'boolean'
}

function istErgebnisliste(
  wert: unknown,
  erwarteteIds: string[],
): wert is { ergebnisse: HappyHourUebergabeErgebnis[] } {
  if (typeof wert !== 'object' || wert === null || !('ergebnisse' in wert) || !Array.isArray(wert.ergebnisse)
    || wert.ergebnisse.length !== erwarteteIds.length) return false
  const ids = new Set(erwarteteIds)
  const ergebnisIds = wert.ergebnisse.map((ergebnis) => typeof ergebnis === 'object' && ergebnis !== null
    && 'erfassungsId' in ergebnis && typeof ergebnis.erfassungsId === 'string' ? ergebnis.erfassungsId : '')
  if (new Set(ergebnisIds).size !== erwarteteIds.length) return false
  return wert.ergebnisse.every((ergebnis) => typeof ergebnis === 'object' && ergebnis !== null
    && 'erfassungsId' in ergebnis && typeof ergebnis.erfassungsId === 'string' && ids.has(ergebnis.erfassungsId)
    && 'protokollpunktId' in ergebnis && typeof ergebnis.protokollpunktId === 'number' && ergebnis.protokollpunktId > 0
    && 'erstellt' in ergebnis && typeof ergebnis.erstellt === 'boolean')
}
