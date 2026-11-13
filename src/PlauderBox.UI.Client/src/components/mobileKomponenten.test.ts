// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BegehungAbschluss from './BegehungAbschluss.vue'
import BegehungKontrolle from './BegehungKontrolle.vue'
import BegehungStart from './BegehungStart.vue'
import EintragErfassen from './EintragErfassen.vue'
import MobileKopf from './MobileKopf.vue'
import OfflineHinweis from './OfflineHinweis.vue'
import PlauderBoxMarke from './PlauderBoxMarke.vue'
import QrCodeStart from './QrCodeStart.vue'
import VorgangsFortschritt from './VorgangsFortschritt.vue'
import KiSchluesselHinweis from './KiSchluesselHinweis.vue'
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
  it('verwendet im Header das PWA-Icon und zeigt die gebaute Patch-Version', () => {
    const wrapper = mount(PlauderBoxMarke)

    expect(wrapper.get('img').attributes('src')).toBe('/icon.svg')
    expect(wrapper.text()).toContain('PlauderBox')
    expect(wrapper.text()).toContain('v1.1.3')
  })

  it('zeigt die Begehungsnavigation als drei beschriftete Headerbuttons', async () => {
    const wrapper = mount(MobileKopf, { props: { navigation: true, zurueck: true } })
    const tasten = wrapper.findAll('button')

    expect(tasten.map((taste) => taste.text())).toEqual(['‹ Back', 'Start', 'Beenden'])
    await tasten[0]!.trigger('click')
    await tasten[1]!.trigger('click')
    await tasten[2]!.trigger('click')

    expect(wrapper.emitted('zurueck')).toHaveLength(1)
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(wrapper.emitted('beenden')).toHaveLength(1)
  })

  it('kennzeichnet aktive Headerziele und verhindert deren erneute Auslösung', async () => {
    const wrapper = mount(MobileKopf, {
      props: { navigation: true, zurueck: false, startAktiv: true, beendenAktiv: true },
    })
    const tasten = wrapper.findAll('button')

    expect(tasten.every((taste) => taste.attributes('disabled') !== undefined)).toBe(true)
    await Promise.all(tasten.map((taste) => taste.trigger('click')))
    expect(wrapper.emitted('zurueck')).toBeUndefined()
    expect(wrapper.emitted('start')).toBeUndefined()
    expect(wrapper.emitted('beenden')).toBeUndefined()
  })

  it('zeigt während der KI-Anfrage eine sichtbare unbestimmte Fortschrittsanzeige', () => {
    const wrapper = mount(VorgangsFortschritt)

    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('assertive')
    expect(wrapper.text()).toContain('KI-Auswertung läuft')
    expect(wrapper.text()).toContain('Audio wird übertragen und ausgewertet')
    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.find('.vorgangs-fortschritt__balken').exists()).toBe(true)
  })

  it('zeigt denselben Fortschritt mit dem Statustext der HappyHour-Übergabe', () => {
    const wrapper = mount(VorgangsFortschritt, {
      props: {
        titel: 'Übergabe an HappyHour läuft',
        hinweis: 'Protokollpunkte und Bilder werden übertragen. Bitte die App geöffnet lassen.',
      },
    })

    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Übergabe an HappyHour läuft')
    expect(wrapper.text()).toContain('Protokollpunkte und Bilder werden übertragen')
    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.find('.vorgangs-fortschritt__balken').exists()).toBe(true)
  })

  it('zeigt die KI-Ablaufwarnung und den laufenden Status zugänglich an', () => {
    const laufend = mount(KiSchluesselHinweis, { props: { zustand: { art: 'laeuft' } } })
    expect(laufend.get('[role="status"]').text()).toContain('KI-Status wird geprüft')
    expect(laufend.find('.spinner').exists()).toBe(true)

    const warnung = mount(KiSchluesselHinweis, {
      props: {
        zustand: {
          art: 'warnung',
          meldung: 'Der PlauderBox-KI-Schlüssel läuft am 11.11.2027 ab. Bitte rechtzeitig erneuern.',
        },
      },
    })
    expect(warnung.get('[role="alert"]').text()).toContain('11.11.2027')
  })

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

  it('öffnet bei fehlenden Startvoraussetzungen einen Dialog und führt zum erneuten QR-Scan zurück', async () => {
    const unvollstaendig = { ...protokoll, verteiler: [], protokollpunktArten: [] }
    const wrapper = mount(BegehungStart, {
      attachTo: document.body,
      props: {
        kontext: unvollstaendig,
        startLaeuft: false,
        startBlockiert: true,
        startMeldung: 'Die Begehung kann noch nicht gestartet werden.',
        startProbleme: [
          'Verteiler fehlt: In HappyHour muss mindestens eine gültige Person im Verteiler erfasst sein.',
          'Art des Protokollpunkts fehlt: In HappyHour muss mindestens eine Protokollpunktart vorhanden sein.',
        ],
      },
    })
    await flushPromises()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.text()).toContain('Verteiler fehlt')
    expect(dialog.text()).toContain('Art des Protokollpunkts fehlt')
    expect(dialog.text()).toContain('Ein Widerruf ist nicht erforderlich')
    expect(document.activeElement).toBe(dialog.get('#startvoraussetzungen-titel').element)
    const startansicht = wrapper.get('main')
    expect(startansicht.attributes('inert')).toBeDefined()
    expect(startansicht.attributes('aria-hidden')).toBe('true')

    const dialogTasten = dialog.findAll('button')
    await dialog.get('#startvoraussetzungen-titel').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(dialogTasten[dialogTasten.length - 1]!.element)
    await dialogTasten[dialogTasten.length - 1]!.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(dialogTasten[0]!.element)

    const gesperrterStart = wrapper.findAll('button').find((taste) => taste.text() === 'Start nicht möglich')
    expect(gesperrterStart?.attributes('disabled')).toBeDefined()

    await dialogTasten.find((taste) => taste.text() === 'Hinweis schliessen')!.trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(startansicht.attributes('inert')).toBeUndefined()
    expect(startansicht.attributes('aria-hidden')).toBeUndefined()

    const erneutScannen = wrapper.findAll('button').find((taste) => taste.text() === 'Anderen QR-Code scannen')
    await erneutScannen!.trigger('click')
    expect(wrapper.emitted('zurueck')).toHaveLength(1)
    wrapper.unmount()
  })

  it('zeigt offline den Singular und beide Navigationsaktionen', async () => {
    const wrapper = mount(OfflineHinweis, { props: { anzahlAusstehend: 1 } })
    expect(wrapper.text()).toContain('1 Eintrag wurde')
    const tasten = wrapper.findAll('button')
    await tasten.find((taste) => taste.text() === 'Neuer Eintrag')!.trigger('click')
    await tasten.find((taste) => taste.text() === 'Gehe zu Kontrolle')!.trigger('click')
    expect(wrapper.emitted('neu')).toHaveLength(1)
    expect(wrapper.emitted('kontrolle')).toHaveLength(1)
  })

  it('behauptet ohne Audio keine wartende Auswertung', () => {
    const wrapper = mount(OfflineHinweis, { props: { anzahlAusstehend: 0 } })
    expect(wrapper.text()).toContain('Es wartet keine Audioaufnahme auf eine Auswertung.')
  })

  it('wertet ausstehende Offline-Aufnahmen mit einer Aktion aus, sobald die Verbindung zurück ist', async () => {
    const wrapper = mount(OfflineHinweis, {
      props: { anzahlAusstehend: 2, online: true, auswertungLaeuft: false },
    })
    const taste = wrapper.findAll('button').find((knopf) => knopf.text().includes('Alle ausstehenden'))
    await taste!.trigger('click')
    expect(wrapper.emitted('auswerten')).toHaveLength(1)
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

  it('startet aus der Kontrolle alle ausstehenden Auswertungen ohne Ansichtswechsel', async () => {
    const rundgang = erstelleBegehung()
    rundgang.eintraege[0]!.status = 'wartet_auf_auswertung'
    rundgang.eintraege[0]!.audio = {
      dateiname: 'synthetisch.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x'], { type: 'audio/webm' }),
    }
    const wrapper = mount(BegehungKontrolle, {
      props: { begehung: rundgang, online: true, anzahlAusstehend: 1, auswertungLaeuft: false },
    })

    const taste = wrapper.findAll('button').find((knopf) => knopf.text().includes('Alle ausstehenden'))
    await taste!.trigger('click')

    expect(wrapper.emitted('auswerten')).toHaveLength(1)
  })

  it('kennzeichnet den offenen Eintrag und öffnet genau diesen zur Korrektur', async () => {
    const rundgang = erstelleBegehung()
    const fertig = rundgang.eintraege[0]!
    fertig.protokollpunktArtId = 5
    fertig.gruppe = 'Arbeitssicherheit'
    fertig.thema = 'Geländer'
    fertig.inhalt = 'Geländer ist in Ordnung.'
    const fehlerhaft = erstelleEintrag()
    fehlerhaft.id = '10000000-0000-4000-8000-000000000002'
    fehlerhaft.status = 'fehler'
    fehlerhaft.gruppe = 'Organisation'
    fehlerhaft.thema = 'Offline-Termin'
    fehlerhaft.fehler = 'Die Auswertung ist fehlgeschlagen.'
    rundgang.eintraege.push(fehlerhaft)
    const wrapper = mount(BegehungKontrolle, { props: { begehung: rundgang, online: true } })

    const offenerEintrag = wrapper.get('[data-offen="true"]')
    expect(offenerEintrag.text()).toContain('Auswertung fehlgeschlagen')
    expect(offenerEintrag.text()).toContain('Angaben unvollständig')
    expect(offenerEintrag.text()).toContain('Öffnen und korrigieren')

    await offenerEintrag.trigger('click')
    expect(wrapper.emitted('bearbeiten')).toEqual([[fehlerhaft.id]])
  })

  it('zeigt die fehlende Protokollpunktart sofort im Dialog und führt zum Auswahlfeld', async () => {
    const wrapper = mount(EintragErfassen, {
      attachTo: document.body,
      props: { eintrag: erstelleEintrag(), protokoll, online: true, speichern: vi.fn(), audioRekorder },
    })
    await wrapper.get('button.mobile-primary').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Bitte die Art des Protokollpunkts wählen.')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Pflichtfeld fehlt')
    expect(dialog.text()).toContain('Art des Protokollpunkts wählen')
    expect(dialog.text()).toContain('wird danach für neue Einträge als Standard übernommen')
    expect(document.activeElement).toBe(dialog.get('#protokollpunktart-dialog-titel').element)
    expect(wrapper.get('main').attributes('inert')).toBeDefined()

    await dialog.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('main').attributes('inert')).toBeUndefined()
    expect(document.activeElement).toBe(wrapper.findAll('select')[0]!.element)
    wrapper.unmount()
  })

  it('zeigt deduplizierte Zuständigkeiten und getrennte Bildquellen', () => {
    const wrapper = mount(EintragErfassen, {
      props: { eintrag: erstelleEintrag(), protokoll, online: true, speichern: vi.fn(), audioRekorder },
    })
    expect(wrapper.text()).toContain('Foto aufnehmen')
    expect(wrapper.text()).toContain('Aus Galerie wählen')
    expect(wrapper.text()).not.toContain('Traktandum')
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect(wrapper.findAll('select')[1]!.findAll('option')).toHaveLength(2)
  })

  it('übernimmt einen vollständig manuell erfassten Eintrag ohne Audio', async () => {
    const eintrag = erstelleEintrag()
    eintrag.protokollpunktArtId = 5
    eintrag.gruppe = 'Organisation'
    eintrag.thema = 'Manueller Punkt'
    eintrag.inhalt = 'Ohne Diktat erfasst'
    const wrapper = mount(EintragErfassen, {
      props: { eintrag, protokoll, online: true, speichern: vi.fn(async () => undefined), audioRekorder },
    })

    const taste = wrapper.findAll('button').find((knopf) => knopf.text() === 'Manuellen Eintrag übernehmen')
    await taste!.trigger('click')

    expect(wrapper.emitted('gespeichert')).toHaveLength(1)
    expect(wrapper.emitted<BegehungEintrag[]>('gespeichert')?.[0]?.[0]?.status).toBe('ausgewertet')
  })

  it('zeigt die laufende KI-Auswertung und sperrt den Diktatknopf direkt unter dem Aufnahmebereich', () => {
    const eintrag = erstelleEintrag()
    eintrag.audio = {
      dateiname: 'synthetisch.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x'], { type: 'audio/webm' }),
    }
    const wrapper = mount(EintragErfassen, {
      props: {
        eintrag,
        protokoll,
        online: true,
        auswertungLaeuft: true,
        speichern: vi.fn(async () => undefined),
        audioRekorder,
      },
    })

    const auswerten = wrapper.findAll('button').find((knopf) => knopf.text().includes('KI-Auswertung läuft'))
    expect(auswerten?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Die KI wertet das Diktat aus')
  })

  it('verwendet für das Löschen eines Bildes den übergebenen Bestätigungsdialog', async () => {
    const eintrag = erstelleEintrag()
    eintrag.bilder.push({
      id: 'bild-1',
      dateiname: 'synthetisch.jpg',
      medientyp: 'image/jpeg',
      groesse: 1,
      erstelltAm: eintrag.erstelltAm,
      bild: new Blob(['x'], { type: 'image/jpeg' }),
    })
    const bestaetigen = vi.fn(() => false)
    const speichern = vi.fn(async () => undefined)
    const wrapper = mount(EintragErfassen, {
      props: { eintrag, protokoll, online: true, speichern, audioRekorder, bestaetigen },
    })

    await wrapper.get('button[aria-label="Bild löschen"]').trigger('click')

    expect(bestaetigen).toHaveBeenCalledWith('Dieses Bild wirklich aus dem internen App-Speicher entfernen?')
    expect(speichern).not.toHaveBeenCalled()
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

  it('übergibt einen manuell eingefügten Freigabelink an dieselbe QR-Verarbeitung', async () => {
    const scanner: import('@/services/qrCodeScanner').QrCodeScanner = {
      starten: vi.fn(async () => undefined),
      stoppen: vi.fn(),
    }
    const wrapper = mount(QrCodeStart, { props: { scanner } })
    await wrapper.get('#manueller-code').setValue('  plauderbox://begehung?freigabe=synthetisch  ')
    await wrapper.get('form.manual-code').trigger('submit')

    expect(wrapper.emitted('erkannt')).toEqual([['plauderbox://begehung?freigabe=synthetisch']])
  })

  it('bietet das manuelle Leeren des internen Speichers bereits am QR-Einstieg an', async () => {
    const scanner: import('@/services/qrCodeScanner').QrCodeScanner = {
      starten: vi.fn(async () => undefined),
      stoppen: vi.fn(),
    }
    const wrapper = mount(QrCodeStart, { props: { scanner } })
    const taste = wrapper.findAll('button').find((knopf) => knopf.text() === 'Internen App-Speicher leeren')
    await taste!.trigger('click')
    expect(wrapper.emitted('speicherLeeren')).toHaveLength(1)
  })

  it('blockiert den Start bei unlesbaren Daten und bietet Sicherung sowie bewusstes Verwerfen an', async () => {
    const scanner: import('@/services/qrCodeScanner').QrCodeScanner = {
      starten: vi.fn(async () => undefined),
      stoppen: vi.fn(),
    }
    const wrapper = mount(QrCodeStart, { props: { scanner, speicherblockiert: true } })

    expect(wrapper.get('#manueller-code').attributes('disabled')).toBeDefined()
    const schaltflaechen = wrapper.findAll('button')
    await schaltflaechen.find((knopf) => knopf.text().includes('Rohdaten und Medien sichern'))!.trigger('click')
    await schaltflaechen.find((knopf) => knopf.text().includes('endgültig verwerfen'))!.trigger('click')

    expect(wrapper.emitted('datenSichern')).toHaveLength(1)
    expect(wrapper.emitted('datenVerwerfen')).toHaveLength(1)
  })
})
