import { describe, expect, it, vi } from 'vitest'
import { erstelleEintrag, type LokaleAudioaufnahme } from '@logik/begehungsAblauf'
import {
  markiereManuellenEintragAlsAusgewertet,
  setzeAudioaufnahme,
  speichereEntwurf,
  verwerfeAudioaufnahme,
} from './eintragErfassungsAblauf'

describe('Audioentwurf und fehlgeschlagener lokaler Commit', () => {
  it('markiert einen Eintrag ohne Audio als ausgewertet und lässt einen Audioeintrag unverändert', () => {
    const manuell = erstelleEintrag()
    manuell.status = 'entwurf'
    manuell.fehler = 'alter Fehler'

    markiereManuellenEintragAlsAusgewertet(manuell)

    expect(manuell.status).toBe('ausgewertet')
    expect(manuell.fehler).toBe('')

    const mitAudio = erstelleEintrag()
    mitAudio.status = 'wartet_auf_auswertung'
    mitAudio.audio = {
      dateiname: 'aufnahme.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x']),
    }
    markiereManuellenEintragAlsAusgewertet(mitAudio)
    expect(mitAudio.status).toBe('wartet_auf_auswertung')
  })

  it('behält nach einem Fehler denselben Blob und dieselbe Erfassungs-ID für den sichtbaren Retry', async () => {
    const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000123')
    const blob = new Blob(['identisches-audio'], { type: 'audio/webm' })
    const audio: LokaleAudioaufnahme = {
      dateiname: 'aufnahme.webm',
      medientyp: 'audio/webm',
      groesse: blob.size,
      dauerSekunden: 4,
      audio: blob,
    }
    const speichern = vi
      .fn<(wert: typeof eintrag) => Promise<void>>()
      .mockRejectedValueOnce(new DOMException('voll', 'QuotaExceededError'))
      .mockResolvedValueOnce()

    setzeAudioaufnahme(eintrag, audio)
    await expect(speichereEntwurf(eintrag, speichern)).rejects.toMatchObject({ name: 'QuotaExceededError' })
    expect(eintrag.audio?.audio).toBe(blob)
    expect(eintrag.id).toBe('00000000-0000-4000-8000-000000000123')

    await speichereEntwurf(eintrag, speichern)
    expect(speichern).toHaveBeenCalledTimes(2)
    expect(speichern.mock.calls[1]?.[0].audio?.audio).toBe(blob)
    expect(speichern.mock.calls[1]?.[0].id).toBe(eintrag.id)
  })

  it('rollt beim fehlgeschlagenen Verwerfen Audio und vorherigen Status vollständig zurück', async () => {
    const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000124')
    const blob = new Blob(['audio'], { type: 'audio/webm' })
    const audio: LokaleAudioaufnahme = {
      dateiname: 'aufnahme.webm',
      medientyp: 'audio/webm',
      groesse: blob.size,
      dauerSekunden: 7,
      audio: blob,
    }
    setzeAudioaufnahme(eintrag, audio)
    eintrag.status = 'fehler'
    const vorher = eintrag.aktualisiertAm

    await expect(
      verwerfeAudioaufnahme(eintrag, async () => {
        throw new Error('Commit fehlgeschlagen')
      }),
    ).rejects.toThrow('Commit fehlgeschlagen')
    expect(eintrag.audio).toBe(audio)
    expect(eintrag.audio?.audio).toBe(blob)
    expect(eintrag.status).toBe('fehler')
    expect(eintrag.aktualisiertAm).toBe(vorher)
  })
})
