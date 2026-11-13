// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { ladeKiSchluesselStatus } from './kiSchluesselStatus'

describe('KI-Schlüsselstatus', () => {
  it('übernimmt die serverseitige Ablaufwarnung', async () => {
    const fetchFunktion = vi.fn(async () =>
      new Response(
        JSON.stringify({
          kiBereit: true,
          kiAbgelaufen: false,
          kiGueltigBis: '2027-11-11',
          kiMeldung: 'Der PlauderBox-KI-Schlüssel läuft am 11.11.2027 ab. Bitte rechtzeitig erneuern.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(ladeKiSchluesselStatus(fetchFunktion)).resolves.toEqual({
      art: 'warnung',
      meldung: 'Der PlauderBox-KI-Schlüssel läuft am 11.11.2027 ab. Bitte rechtzeitig erneuern.',
    })
  })

  it('zeigt einen abgelaufenen Schlüssel als gesperrt', async () => {
    const fetchFunktion = vi.fn(async () =>
      new Response(
        JSON.stringify({
          kiBereit: false,
          kiAbgelaufen: true,
          kiGueltigBis: '2026-11-11',
          kiMeldung: 'Der PlauderBox-KI-Schlüssel ist am 11.11.2026 abgelaufen. Bitte Administrator kontaktieren.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(ladeKiSchluesselStatus(fetchFunktion)).resolves.toMatchObject({ art: 'gesperrt' })
  })

  it('liefert bei einem Verbindungsfehler einen verständlichen Zustand', async () => {
    const fetchFunktion = vi.fn(async () => Promise.reject(new Error('synthetisch')))

    await expect(ladeKiSchluesselStatus(fetchFunktion)).resolves.toEqual({
      art: 'nicht_pruefbar',
      meldung: 'Der KI-Schlüsselstatus konnte nicht geprüft werden.',
    })
  })
})
