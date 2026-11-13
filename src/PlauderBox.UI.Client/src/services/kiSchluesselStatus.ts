import { istObjekt, istText } from '@logik/typWaechter'

export type KiSchluesselStatusZustand =
  | Readonly<{ art: 'laeuft' }>
  | Readonly<{ art: 'bereit' }>
  | Readonly<{ art: 'warnung'; meldung: string }>
  | Readonly<{ art: 'gesperrt'; meldung: string }>
  | Readonly<{ art: 'nicht_pruefbar'; meldung: string }>

export async function ladeKiSchluesselStatus(
  fetchFunktion: typeof fetch = fetch,
): Promise<KiSchluesselStatusZustand> {
  let antwort: Response
  try {
    antwort = await fetchFunktion('/api/v1/ki-schluesselstatus', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
  } catch {
    return { art: 'nicht_pruefbar', meldung: 'Der KI-Schlüsselstatus konnte nicht geprüft werden.' }
  }
  if (!antwort.ok)
    return { art: 'nicht_pruefbar', meldung: 'Der KI-Schlüsselstatus konnte nicht geprüft werden.' }

  const inhalt: unknown = await antwort.json().catch(() => null)
  if (
    !istObjekt(inhalt) ||
    typeof inhalt.kiBereit !== 'boolean' ||
    typeof inhalt.kiAbgelaufen !== 'boolean' ||
    !(inhalt.kiGueltigBis === null || istText(inhalt.kiGueltigBis)) ||
    !(inhalt.kiMeldung === null || istText(inhalt.kiMeldung))
  )
    return { art: 'nicht_pruefbar', meldung: 'Der KI-Schlüsselstatus konnte nicht gelesen werden.' }

  if (inhalt.kiAbgelaufen)
    return {
      art: 'gesperrt',
      meldung: inhalt.kiMeldung ?? 'Der PlauderBox-KI-Schlüssel ist abgelaufen.',
    }
  if (inhalt.kiMeldung) return { art: 'warnung', meldung: inhalt.kiMeldung }
  if (!inhalt.kiBereit)
    return { art: 'gesperrt', meldung: 'Die KI-Anbindung ist nicht einsatzbereit.' }
  return { art: 'bereit' }
}
