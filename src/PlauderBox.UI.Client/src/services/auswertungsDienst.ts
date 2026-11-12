import type { BegehungEintrag } from '@logik/begehungsAblauf'
import { istFreigabeToken } from '@logik/clientPruefungen'

export interface Transkriptionsantwort {
  text: string
  gruppe?: string
  thema?: string
  inhalt?: string
  rechtsverweis?: string
}

export async function sendeAudioZurAuswertung(
  eintrag: BegehungEintrag,
  freigabeToken: string,
  fetchFunktion: typeof fetch = fetch,
): Promise<Transkriptionsantwort> {
  if (!eintrag.audio) throw new Error('Für diesen Eintrag ist keine Audioaufnahme vorhanden.')
  if (!istFreigabeToken(freigabeToken)) throw new Error('Die Rundgangsfreigabe ist ungültig oder abgelaufen.')
  const formular = new FormData()
  formular.append('audio', eintrag.audio.audio, eintrag.audio.dateiname)
  formular.append('erfassungsId', eintrag.id)
  const antwort = await fetchFunktion('/api/transkribieren', {
    method: 'POST',
    headers: { 'X-PlauderBox-Freigabe': freigabeToken },
    body: formular,
  })
  const ergebnis = (await antwort.json().catch(() => null)) as Record<string, unknown> | null
  if (!antwort.ok || !ergebnis || typeof ergebnis.text !== 'string' || !ergebnis.text.trim()) {
    const detail =
      ergebnis && typeof ergebnis.detail === 'string' ? ergebnis.detail : 'Die Auswertung ist momentan nicht verfügbar.'
    throw new Error(detail)
  }
  return {
    text: ergebnis.text,
    gruppe: typeof ergebnis.gruppe === 'string' ? ergebnis.gruppe : undefined,
    thema: typeof ergebnis.thema === 'string' ? ergebnis.thema : undefined,
    inhalt: typeof ergebnis.inhalt === 'string' ? ergebnis.inhalt : undefined,
    rechtsverweis: typeof ergebnis.rechtsverweis === 'string' ? ergebnis.rechtsverweis : undefined,
  }
}
