import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erstelleBegehung, erstelleEintrag, type HappyHourProtokollKontext } from './begehungsSpeicher'
import { uebergebeProtokollpunkte } from './happyHourProtokollpunktUebergabe'

const token = 'AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789'
const protokoll: HappyHourProtokollKontext = {
  protokollId: 378,
  protokollNummer: 1,
  thema: 'Brandschutzrundgang',
  typ: 'Protokoll',
  status: 'Entwurf',
  datum: '2026-11-10',
  ort: null,
  projekt: { id: 1, nummer: 799, bezeichnung: 'Testprojekt' },
  objekt: null,
  mitarbeiter: { id: 1, name: 'Testperson' },
  traktanden: [],
  verteiler: [
    {
      id: 7,
      projektAnsprechpartnerId: 77,
      person: 'Testperson',
      firma: 'Testfirma',
      funktion: 'Protokollführung',
      istTeilnehmer: true,
      istCc: false,
      istProtokollschreiber: true,
    },
  ],
  protokollpunkte: [],
  protokollpunktArten: [{ id: 1, bezeichnung: 'Feststellung' }],
}

function begehungMitEintrag(mitBild = false) {
  const begehung = erstelleBegehung(protokoll, undefined, token)
  begehung.status = 'lokal_abgeschlossen'
  const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000123')
  eintrag.protokollpunktArtId = 1
  eintrag.projektAnsprechpartnerId = 77
  eintrag.gruppe = ' Brandschutz '
  eintrag.thema = ' Fluchttüre '
  eintrag.inhalt = ' Türe ist blockiert. '
  eintrag.rechtsverweis = ' VKF 12-15 '
  eintrag.transkript = 'Rohtext, der nicht übergeben werden darf.'
  if (mitBild)
    eintrag.bilder.push({
      id: '10000000-0000-4000-8000-000000000001',
      dateiname: 'foto.jpg',
      medientyp: 'image/jpeg',
      groesse: 4,
      erstelltAm: eintrag.erstelltAm,
      bild: new Blob(['bild']),
    })
  begehung.eintraege.push(eintrag)
  return begehung
}

describe('HappyHour-Protokollpunktübergabe', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true })
  })

  it('übergibt nur kontrollierte Punktfelder über die eigene Servergrenze', async () => {
    const begehung = begehungMitEintrag(true)
    const fetchFunktion = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ergebnisse: [{ erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: true }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            bildId: begehung.eintraege[0]!.bilder[0]!.id,
            protokollpunktId: 41,
            dokumentId: 91,
            erstellt: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).resolves.toEqual([
      { erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: true },
    ])
    const aufruf = fetchFunktion.mock.calls[0]!
    expect(aufruf[0]).toBe('/api/happyhour/protokollpunkte/uebergeben')
    const optionen = aufruf[1]!
    const payload = JSON.parse(String(optionen.body))
    expect(payload.eintraege[0]).toEqual({
      erfassungsId: begehung.eintraege[0]!.id,
      vorbereiteterProtokollpunktId: null,
      protokollpunktArtId: 1,
      projektAnsprechpartnerId: 77,
      gruppe: 'Brandschutz',
      thema: 'Fluchttüre',
      inhalt: 'Türe ist blockiert.',
      rechtsverweis: 'VKF 12-15',
    })
    expect(String(optionen.body)).not.toContain('Rohtext')
    expect(String(optionen.body)).not.toContain('foto.jpg')
    expect(fetchFunktion).toHaveBeenCalledTimes(2)
    const bildAufruf = fetchFunktion.mock.calls[1]!
    expect(bildAufruf[0]).toBe('/api/happyhour/protokollpunkte/41/bilder/10000000-0000-4000-8000-000000000001')
    expect(bildAufruf[1]!.body).toBeInstanceOf(FormData)
    expect((bildAufruf[1]!.body as FormData).get('aufnahmezeitpunkt')).toBe(
      begehung.eintraege[0]!.bilder[0]!.erstelltAm,
    )
    expect((bildAufruf[1]!.headers as Record<string, string>)['X-PlauderBox-Freigabe']).toBe(begehung.freigabeToken)
  })

  it('verändert lokale Daten bei einem Konflikt nicht', async () => {
    const begehung = begehungMitEintrag()
    const vorher = structuredClone(begehung)
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 409 }))
    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'konflikt' })
    expect(begehung).toEqual(vorher)
  })

  it('behält alle lokalen Daten bei, wenn die Bildübergabe nach bestätigtem Punkt abbricht', async () => {
    const begehung = begehungMitEintrag(true)
    const vorher = structuredClone(begehung)
    const fetchFunktion = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ergebnisse: [{ erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: false }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response('', { status: 503 }))

    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'netzwerk' })
    expect(begehung).toEqual(vorher)
  })

  it('weist ein lokales Bild über 15 MB vor dessen Netzaufruf ab', async () => {
    const begehung = begehungMitEintrag(true)
    begehung.eintraege[0]!.bilder[0]!.groesse = 15 * 1024 * 1024 + 1
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ergebnisse: [{ erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: true }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'bild_ungueltig' })
    expect(fetchFunktion).toHaveBeenCalledTimes(1)
  })

  it('meldet ein ausgeschöpftes HappyHour-Bildkontingent eindeutig', async () => {
    const begehung = begehungMitEintrag(true)
    const fetchFunktion = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ergebnisse: [{ erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: false }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response('', { status: 429 }))

    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'bildkontingent' })
  })

  it('liefert Bilder einer mit der alten Version bereits punktweise übertragenen Begehung idempotent nach', async () => {
    const begehung = begehungMitEintrag(true)
    begehung.status = 'an_happyhour_uebertragen'
    begehung.uebertragenAm = '2026-11-11T10:00:00Z'
    const fetchFunktion = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ergebnisse: [{ erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 2283, erstellt: false }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            bildId: begehung.eintraege[0]!.bilder[0]!.id,
            protokollpunktId: 2283,
            dokumentId: 91,
            erstellt: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).resolves.toHaveLength(1)
    const punktPayload = JSON.parse(String(fetchFunktion.mock.calls[0]![1]!.body))
    expect(punktPayload.begehungStatus).toBe('lokal_abgeschlossen')
    expect(fetchFunktion.mock.calls[1]![0]).toBe(
      '/api/happyhour/protokollpunkte/2283/bilder/10000000-0000-4000-8000-000000000001',
    )
  })

  it('verhindert eine weitere Übergabe nach bestätigter Punkt- und Bildübergabe', async () => {
    const begehung = begehungMitEintrag(true)
    begehung.status = 'an_happyhour_uebertragen'
    begehung.bilderUebertragenAm = '2026-11-11T10:05:00Z'
    const fetchFunktion = vi.fn<typeof fetch>()
    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'ungueltig' })
    expect(fetchFunktion).not.toHaveBeenCalled()
  })

  it('weist dieselbe vorbereitete Punkt-ID in mehreren lokalen Einträgen vor dem Netzaufruf ab', async () => {
    const begehung = begehungMitEintrag()
    begehung.eintraege[0]!.vorbereiteterProtokollpunktId = 10
    const zweiter = { ...begehung.eintraege[0]!, id: '00000000-0000-4000-8000-000000000124', bilder: [] }
    begehung.eintraege.push(zweiter)
    const fetchFunktion = vi.fn<typeof fetch>()
    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'konflikt' })
    expect(fetchFunktion).not.toHaveBeenCalled()
  })

  it('normalisiert Zuständigkeits-ID 0 vor dem Netzaufruf auf den eindeutigen Protokollschreiber', async () => {
    const begehung = begehungMitEintrag()
    begehung.eintraege[0]!.projektAnsprechpartnerId = 0
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          ergebnisse: [{ erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: true }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    await uebergebeProtokollpunkte(begehung, fetchFunktion)
    const payload = JSON.parse(String(fetchFunktion.mock.calls[0]![1]!.body))
    expect(payload.eintraege[0].projektAnsprechpartnerId).toBe(77)
  })

  it('akzeptiert keine doppelte Bestätigungs-ID anstelle einer vollständigen Antwortmenge', async () => {
    const begehung = begehungMitEintrag()
    const zweiter = { ...begehung.eintraege[0]!, id: '00000000-0000-4000-8000-000000000124', bilder: [] }
    begehung.eintraege.push(zweiter)
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          ergebnisse: [
            { erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: true },
            { erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: false },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).rejects.toMatchObject({ art: 'ungueltige_antwort' })
  })

  it('akzeptiert jede erwartete Bestätigungs-ID genau einmal auch bei anderer Reihenfolge', async () => {
    const begehung = begehungMitEintrag()
    const zweiter = { ...begehung.eintraege[0]!, id: '00000000-0000-4000-8000-000000000124', bilder: [] }
    begehung.eintraege.push(zweiter)
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          ergebnisse: [
            { erfassungsId: zweiter.id, protokollpunktId: 42, erstellt: true },
            { erfassungsId: begehung.eintraege[0]!.id, protokollpunktId: 41, erstellt: true },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    await expect(uebergebeProtokollpunkte(begehung, fetchFunktion)).resolves.toHaveLength(2)
  })
})
