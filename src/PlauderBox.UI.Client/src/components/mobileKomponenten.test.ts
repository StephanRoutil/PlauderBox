// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BegehungAbschluss from './BegehungAbschluss.vue'
import BegehungStart from './BegehungStart.vue'
import EintragErfassen from './EintragErfassen.vue'
import OfflineHinweis from './OfflineHinweis.vue'
import type { AudioRekorder } from '@/services/audioRekorder'
import type { BegehungEintrag, HappyHourProtokollKontext, LokaleBegehung } from '@/services/begehungsSpeicher'

const protokoll: HappyHourProtokollKontext = {
  protokollId: 378,
  protokollNummer: 1,
  thema: 'Synthetische Begehung',
  typ: 'Protokoll',
  status: 'Entwurf',
  datum: '2026-11-12',
  ort: null,
  projekt: { id: 1, nummer: 203, bezeichnung: 'Testprojekt' },
  objekt: null,
  mitarbeiter: { id: 1, name: 'Testperson' },
  traktanden: ['Allgemein'],
  verteiler: [
    {
      id: 1,
      projektAnsprechpartnerId: 10,
      person: 'Erika Muster',
      firma: null,
      funktion: 'Bauleitung',
      istTeilnehmer: true,
      istCc: false,
      istProtokollschreiber: true,
    },
    {
      id: 2,
      projektAnsprechpartnerId: 10,
      person: 'Erika Muster doppelt',
      firma: null,
      funktion: null,
      istTeilnehmer: false,
      istCc: true,
      istProtokollschreiber: false,
    },
  ],
  protokollpunkte: [],
  protokollpunktArten: [{ id: 5, bezeichnung: 'Feststellung' }],
}

function erstelleEintrag(): BegehungEintrag {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    erstelltAm: '2026-11-12T08:00:00Z',
    aktualisiertAm: '2026-11-12T08:00:00Z',
    status: 'ausgewertet',
    traktandum: '',
    vorbereiteterProtokollpunktId: null,
    protokollpunktArtId: null,
    projektAnsprechpartnerId: 10,
    gruppe: '',
    thema: '',
    inhalt: '',
    rechtsverweis: '',
    transkript: '',
    fehler: '',
    audio: null,
    bilder: [],
  }
}

function erstelleBegehung(): LokaleBegehung {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    gestartetAm: '2026-11-12T08:00:00Z',
    aktualisiertAm: '2026-11-12T08:00:00Z',
    status: 'lokal_abgeschlossen',
    protokoll,
    aktuellerEintragId: null,
    eintraege: [erstelleEintrag()],
  }
}

const audioRekorder: AudioRekorder = {
  starten: vi.fn(async () => undefined),
  stoppen: vi.fn(async () => ({
    audio: new Blob(['audio'], { type: 'audio/webm' }),
    medientyp: 'audio/webm',
    dauerSekunden: 1,
  })),
  abbrechen: vi.fn(),
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  })
})

describe('mobile Komponenten', () => {
  it('zeigt den laufenden Startzustand und sperrt die Startaktion', () => {
    const wrapper = mount(BegehungStart, { props: { kontext: protokoll, startLaeuft: true, startMeldung: '' } })
    const taste = wrapper.get('button.mobile-primary')
    expect(taste.attributes('disabled')).toBeDefined()
    expect(taste.text()).toBe('Begehung wird gestartet …')
  })

  it('zeigt Startfehler zugänglich und löst den Start aus', async () => {
    const wrapper = mount(BegehungStart, {
      props: { kontext: protokoll, startLaeuft: false, startMeldung: 'Lokale Sicherung fehlgeschlagen.' },
    })
    expect(wrapper.get('[role="alert"]').text()).toBe('Lokale Sicherung fehlgeschlagen.')
    await wrapper.get('button.mobile-primary').trigger('click')
    expect(wrapper.emitted('starten')).toHaveLength(1)
  })

  it('zeigt offline den Singular und beide Navigationsaktionen', async () => {
    const wrapper = mount(OfflineHinweis, { props: { anzahlAusstehend: 1 } })
    expect(wrapper.text()).toContain('1 Eintrag wurde')
    const tasten = wrapper.findAll('button')
    await tasten[0]!.trigger('click')
    await tasten[1]!.trigger('click')
    expect(wrapper.emitted('neu')).toHaveLength(1)
    expect(wrapper.emitted('kontrolle')).toHaveLength(1)
  })

  it('behauptet ohne Audio keine wartende Auswertung', () => {
    const wrapper = mount(OfflineHinweis, { props: { anzahlAusstehend: 0 } })
    expect(wrapper.text()).toContain('Es wartet keine Audioaufnahme auf eine Auswertung.')
  })

  it('sperrt die HappyHour-Übergabe offline und zeigt den Hinweis', () => {
    const wrapper = mount(BegehungAbschluss, {
      props: { begehung: erstelleBegehung(), online: false, uebergabeLaeuft: false, meldung: '' },
    })
    expect(wrapper.get('button.mobile-primary').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Aktuell keine Verbindung.')
  })

  it('löst Übergabe und Freigabeerneuerung online aus', async () => {
    const wrapper = mount(BegehungAbschluss, {
      props: { begehung: erstelleBegehung(), online: true, uebergabeLaeuft: false, meldung: '' },
    })
    await wrapper.get('button.mobile-primary').trigger('click')
    const erneuern = wrapper.findAll('button').find((taste) => taste.text() === 'Freigabe erneuern')
    await erneuern!.trigger('click')
    expect(wrapper.emitted('uebergeben')).toHaveLength(1)
    expect(wrapper.emitted('freigabeErneuern')).toHaveLength(1)
  })

  it('zeigt fehlende Protokollpunktart als zugänglichen Fehler', async () => {
    const wrapper = mount(EintragErfassen, {
      props: { eintrag: erstelleEintrag(), protokoll, online: true, speichern: vi.fn(), audioRekorder },
    })
    await wrapper.get('button.mobile-primary').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toBe('Bitte die Art des Protokollpunkts wählen.')
  })

  it('zeigt deduplizierte Zuständigkeiten und getrennte Bildquellen', () => {
    const wrapper = mount(EintragErfassen, {
      props: { eintrag: erstelleEintrag(), protokoll, online: true, speichern: vi.fn(), audioRekorder },
    })
    expect(wrapper.text()).toContain('Foto aufnehmen')
    expect(wrapper.text()).toContain('Aus Galerie wählen')
    expect(wrapper.findAll('select')[2]!.findAll('option')).toHaveLength(2)
  })

  it('zeigt einen Speicherfehler und bietet die Wiederholung an', async () => {
    const wrapper = mount(EintragErfassen, {
      props: {
        eintrag: erstelleEintrag(),
        protokoll,
        online: true,
        speichern: vi.fn(async () => Promise.reject(new Error('synthetisch'))),
        audioRekorder,
      },
    })
    await wrapper.findAll('select')[0]!.setValue('Allgemein')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('lokale Sicherung ist fehlgeschlagen')
    expect(wrapper.text()).toContain('Lokale Sicherung erneut versuchen')
  })
})
