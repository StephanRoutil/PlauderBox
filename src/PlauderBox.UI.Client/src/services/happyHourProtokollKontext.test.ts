import { describe, expect, it, vi } from 'vitest'
import { ladeHappyHourProtokollKontext, leseHappyHourBegehungsfreigabe } from './happyHourProtokollKontext'

const token = 'AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789'
const freigabe = { token }
const kontext = {
  protokollId: 378,
  protokollNummer: 3,
  thema: 'PlauderBox-Test Protokoll',
  typ: 'Protokoll',
  status: 'Entwurf',
  datum: '/Date(1794265200000+0100)/',
  ort: 'Arlesheim',
  projekt: { id: 18, nummer: 450, bezeichnung: 'Testprojekt' },
  objekt: null,
  mitarbeiter: { id: 1, name: 'Testperson' },
  traktanden: [],
  verteiler: [{
    id: 1,
    projektAnsprechpartnerId: 1,
    person: 'Testperson',
    firma: 'Testfirma',
    funktion: 'Testfunktion',
    istTeilnehmer: true,
    istCc: false,
    istProtokollschreiber: true,
  }],
  protokollpunkte: [],
  protokollpunktArten: [{ id: 1, bezeichnung: 'Feststellung' }],
}

describe('HappyHour-Begehungsfreigabe', () => {
  it('extrahiert nur einen streng begrenzten URL-sicheren Token', () => {
    expect(leseHappyHourBegehungsfreigabe(`plauderbox://begehung?freigabe=${token}`)).toEqual(freigabe)
    expect(leseHappyHourBegehungsfreigabe(`plauderbox://begehung?freigabe=${token}&admin=1`)).toBeNull()
    expect(leseHappyHourBegehungsfreigabe('plauderbox://begehung?freigabe=zu-kurz')).toBeNull()
    expect(leseHappyHourBegehungsfreigabe(`plauderbox://begehung?protokoll=378`)).toBeNull()
    expect(leseHappyHourBegehungsfreigabe(`https://happyhour.example/api.svc/PlauderBox/Freigabe/${token}`)).toBeNull()
    expect(leseHappyHourBegehungsfreigabe('javascript:alert(1)')).toBeNull()
  })

  it('lädt ausschliesslich über die eigene PlauderBox-Servergrenze', async () => {
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(kontext), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    await expect(ladeHappyHourProtokollKontext(freigabe, fetchFunktion)).resolves.toEqual(kontext)
    expect(fetchFunktion).toHaveBeenCalledWith(`/api/happyhour/freigaben/${token}`, expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('weist eine unvollständige Kontextantwort ab', async () => {
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...kontext, projekt: null })))
    await expect(ladeHappyHourProtokollKontext(freigabe, fetchFunktion)).rejects.toMatchObject({ art: 'ungueltige_antwort' })
  })

  it.each([401, 403, 404, 410])('behandelt Status %s als ungültige oder abgelaufene Freigabe', async (status) => {
    const fetchFunktion = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }))
    await expect(ladeHappyHourProtokollKontext(freigabe, fetchFunktion)).rejects.toMatchObject({ art: 'freigabe_ungueltig' })
  })
})
