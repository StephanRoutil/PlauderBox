import { describe, expect, it, vi } from 'vitest'
import { sendeAudioZurAuswertung } from './auswertungsDienst'
import { verarbeiteWarteschlange } from '@logik/begehungsAblauf'
import { erstelleBegehung, erstelleEintrag, type LokaleBegehung } from './begehungsSpeicher'
import type { HappyHourProtokollKontext } from './happyHourProtokollKontext'

function begehung(): LokaleBegehung {
  const protokoll = {
    protokollId: 1,
    protokollNummer: 1,
    thema: 'Test',
    typ: 'Protokoll',
    status: 'Entwurf',
    datum: '2026-11-10',
    ort: null,
    projekt: { id: 1, nummer: 1, bezeichnung: 'Test' },
    objekt: null,
    mitarbeiter: { id: 1, name: 'Test' },
    traktanden: [],
    verteiler: [],
    protokollpunkte: [],
  } satisfies HappyHourProtokollKontext
  return erstelleBegehung(protokoll)
}

describe('Auswertungsdienst', () => {
  it('sendet stabile Erfassungs-ID und Audio an die eigene Servergrenze', async () => {
    const eintrag = erstelleEintrag()
    eintrag.audio = {
      dateiname: 'aufnahme.webm',
      medientyp: 'audio/webm',
      groesse: 5,
      dauerSekunden: 2,
      audio: new Blob(['audio']),
    }
    const fetchFunktion = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ text: 'Erkannt', gruppe: 'Brandschutz' }), { status: 200 }))

    const freigabeToken = 'a'.repeat(43)
    await expect(sendeAudioZurAuswertung(eintrag, freigabeToken, fetchFunktion)).resolves.toMatchObject({
      text: 'Erkannt',
      gruppe: 'Brandschutz',
    })
    const aufruf = fetchFunktion.mock.calls[0]
    expect(aufruf?.[0]).toBe('/api/v1/transkribieren')
    const formular = aufruf?.[1]?.body as FormData
    expect(formular.get('erfassungsId')).toBe(eintrag.id)
    expect(formular.get('audio')).toBeInstanceOf(Blob)
    expect((aufruf?.[1]?.headers as Record<string, string>)['X-PlauderBox-Freigabe']).toBe(freigabeToken)
  })

  it('bearbeitet FIFO und stoppt nach dem ersten Fehler', async () => {
    const lokal = begehung()
    const erster = erstelleEintrag()
    erster.status = 'wartet_auf_auswertung'
    const zweiter = erstelleEintrag()
    zweiter.status = 'wartet_auf_auswertung'
    lokal.eintraege.push(erster, zweiter)
    const aufrufe: string[] = []

    await verarbeiteWarteschlange(
      lokal,
      () => true,
      async (eintrag) => {
        aufrufe.push(eintrag.id)
        eintrag.status = 'fehler'
        return false
      },
    )

    expect(aufrufe).toEqual([erster.id])
    expect(zweiter.status).toBe('wartet_auf_auswertung')
  })
})
