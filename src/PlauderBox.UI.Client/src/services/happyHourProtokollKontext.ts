import type { HappyHourProtokollKontext } from '@logik/begehungsAblauf'
import { istFreigabeToken } from '@logik/clientPruefungen'
export type {
  HappyHourMitarbeiterKontext,
  HappyHourObjektKontext,
  HappyHourProjektKontext,
  HappyHourProtokollKontext,
  HappyHourProtokollpunktArtKontext,
  HappyHourProtokollpunktKontext,
  HappyHourVerteilerEintrag,
} from '@logik/begehungsAblauf'

export type HappyHourBegehungsfreigabe = Readonly<{ token: string }>

export type ProtokollKontextLadefehler = 'freigabe_ungueltig' | 'netzwerk' | 'ungueltige_antwort'

export class HappyHourProtokollKontextFehler extends Error {
  constructor(public readonly art: ProtokollKontextLadefehler) {
    super(art)
  }
}

export function leseHappyHourBegehungsfreigabe(inhalt: string): HappyHourBegehungsfreigabe | null {
  let url: URL
  try {
    url = new URL(inhalt)
  } catch {
    return null
  }
  if (
    url.protocol !== 'plauderbox:' ||
    url.hostname !== 'begehung' ||
    url.port ||
    url.username ||
    url.password ||
    (url.pathname && url.pathname !== '/') ||
    url.hash ||
    url.searchParams.size !== 1 ||
    !url.searchParams.has('freigabe')
  )
    return null
  const token = url.searchParams.get('freigabe') ?? ''
  return istFreigabeToken(token) ? { token } : null
}

export async function ladeHappyHourProtokollKontext(
  freigabe: HappyHourBegehungsfreigabe,
  fetchFunktion: typeof fetch = fetch,
): Promise<HappyHourProtokollKontext> {
  let antwort: Response
  try {
    antwort = await fetchFunktion(`/api/happyhour/freigaben/${encodeURIComponent(freigabe.token)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new HappyHourProtokollKontextFehler('netzwerk')
  }

  if ([401, 403, 404, 410].includes(antwort.status)) throw new HappyHourProtokollKontextFehler('freigabe_ungueltig')
  if (!antwort.ok) throw new HappyHourProtokollKontextFehler('netzwerk')
  const kontext: unknown = await antwort.json().catch(() => null)
  if (!istProtokollKontext(kontext)) {
    throw new HappyHourProtokollKontextFehler('ungueltige_antwort')
  }
  return kontext
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

function istProtokollKontext(wert: unknown): wert is HappyHourProtokollKontext {
  if (
    !istObjekt(wert) ||
    !istZahl(wert.protokollId) ||
    !istZahl(wert.protokollNummer) ||
    !istText(wert.thema) ||
    !istText(wert.typ) ||
    !istText(wert.status) ||
    !istText(wert.datum) ||
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
    !Array.isArray(wert.protokollpunktArten)
  )
    return false
  return (
    wert.verteiler.every(
      (eintrag) =>
        istObjekt(eintrag) &&
        istZahl(eintrag.id) &&
        istZahl(eintrag.projektAnsprechpartnerId) &&
        istText(eintrag.person) &&
        typeof eintrag.istTeilnehmer === 'boolean' &&
        typeof eintrag.istCc === 'boolean' &&
        typeof eintrag.istProtokollschreiber === 'boolean',
    ) &&
    wert.protokollpunkte.every(
      (punkt) =>
        istObjekt(punkt) &&
        istZahl(punkt.id) &&
        istZahl(punkt.protokollpunktArtId) &&
        (punkt.projektAnsprechpartnerId === null || istZahl(punkt.projektAnsprechpartnerId)) &&
        istText(punkt.gruppe) &&
        istText(punkt.thema) &&
        istText(punkt.inhalt),
    ) &&
    wert.protokollpunktArten.every((art) => istObjekt(art) && istZahl(art.id) && istText(art.bezeichnung))
  )
}
