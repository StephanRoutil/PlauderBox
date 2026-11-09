import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ladeInterneAufnahme,
  loescheInterneAufnahme,
  speichereEinzelneAufnahme,
  type InterneAufnahme,
} from './internerAufnahmespeicher'

function erstelleAufnahme(id: string, text: string): InterneAufnahme {
  const audio = new Blob([text], { type: 'audio/webm' })
  return {
    id,
    erstelltAm: '2026-11-09T20:00:00.000Z',
    dateiname: `${id}.webm`,
    medientyp: 'audio/webm',
    groesse: audio.size,
    dauerSekunden: 4,
    status: 'noch_nicht_uebertragen',
    audio,
  }
}

describe('interner Aufnahmespeicher', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    })
  })

  it('speichert und lädt eine Aufnahme samt Audio-Blob', async () => {
    const erwartet = erstelleAufnahme('aufnahme-1', 'audioinhalt')

    await speichereEinzelneAufnahme(erwartet)
    const geladen = await ladeInterneAufnahme()

    expect(geladen?.id).toBe(erwartet.id)
    expect(geladen?.status).toBe('noch_nicht_uebertragen')
    expect(await geladen?.audio.text()).toBe('audioinhalt')
  })

  it('ersetzt die vorhandene Aufnahme, weil dieses Inkrement genau eine Aufnahme erlaubt', async () => {
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-1', 'alt'))
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-2', 'neu'))

    const geladen = await ladeInterneAufnahme()

    expect(geladen?.id).toBe('aufnahme-2')
    expect(await geladen?.audio.text()).toBe('neu')
  })

  it('löscht nur die bestätigte Aufnahme', async () => {
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-1', 'audio'))

    await loescheInterneAufnahme('aufnahme-1')

    await expect(ladeInterneAufnahme()).resolves.toBeNull()
  })
})
