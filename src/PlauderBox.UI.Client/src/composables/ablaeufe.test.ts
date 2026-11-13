import { ref, toRaw } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  BegehungSpeicherfehler,
  erstelleBegehung,
  erstelleEintrag,
  type HappyHourProtokollKontext,
  type LokaleBegehung,
} from '@/services/begehungsSpeicher'
import { HappyHourUebergabefehler } from '@/services/happyHourProtokollpunktUebergabe'
import { AuswertungsdienstFehler } from '@/services/auswertungsDienst'
import { verwendeBegehung } from './verwendeBegehung'
import { verwendeAuswertungsWarteschlange } from './verwendeAuswertungsWarteschlange'
import { verwendeHappyHourUebergabe } from './verwendeHappyHourUebergabe'
import { verwendeAppZustand } from './verwendeAppZustand'
import type { AppAnsicht } from './verwendeAppZustand'

const token = 'A'.repeat(32)

describe('Gemeinsamer App-Zustand', () => {
  it('initialisiert Ansicht, Begehung und Verbindungsstatus typisiert an einer Stelle', () => {
    const zustand = verwendeAppZustand(() => false)
    expect(zustand.ansicht.value).toBe('scanner')
    expect(zustand.begehung.value).toBeNull()
    expect(zustand.online.value).toBe(false)
  })
})

function kontext(protokollId = 17): HappyHourProtokollKontext {
  return {
    protokollId,
    protokollNummer: 1,
    thema: 'Synthetischer Rundgang',
    typ: 'Protokoll',
    status: 'Entwurf',
    datum: '2026-11-12',
    ort: null,
    projekt: { id: 1, nummer: 100, bezeichnung: 'Testprojekt' },
    objekt: null,
    mitarbeiter: { id: 1, name: 'Testperson' },
    traktanden: [],
    verteiler: [
      {
        id: 7,
        projektAnsprechpartnerId: 77,
        person: 'Erika Muster',
        firma: null,
        funktion: 'Protokollführung',
        istTeilnehmer: true,
        istCc: false,
        istProtokollschreiber: true,
      },
    ],
    protokollpunkte: [],
    protokollpunktArten: [{ id: 1, bezeichnung: 'Feststellung' }],
  }
}

function begehung(status: LokaleBegehung['status'] = 'aktiv'): LokaleBegehung {
  const wert = erstelleBegehung(kontext(), () => '00000000-0000-4000-8000-000000000001', token)
  wert.status = status
  return wert
}

function begehungsAbhaengigkeiten(ueberschreiben: Record<string, unknown> = {}) {
  return {
    kontextLaden: vi.fn(async () => kontext()),
    begehungLaden: vi.fn(async () => null),
    legacyEintragLaden: vi.fn(async () => null),
    speichern: vi.fn(async () => undefined),
    loeschen: vi.fn(async () => undefined),
    bestaetigen: vi.fn(() => true),
    verbindungsstatus: vi.fn(() => true),
    speicherBeibehalten: vi.fn(),
    auswerten: vi.fn(async () => undefined),
    warteschlangeVerarbeiten: vi.fn(async () => undefined),
    nachVerwerfen: vi.fn(),
    unlesbareDatenSichern: vi.fn(async () => ({ dateien: 1, art: 'heruntergeladen' as const })),
    unlesbareDatenVerwerfen: vi.fn(async () => undefined),
    speicherVollstaendigLeeren: vi.fn(async () => undefined),
    ...ueberschreiben,
  }
}

describe('Begehungsablauf', () => {
  it('startet eine geladene Begehung und speichert sie vor der Anzeige', async () => {
    const abhaengigkeiten = begehungsAbhaengigkeiten()
    const ablauf = verwendeBegehung(abhaengigkeiten)
    await ablauf.verarbeiteQrCode(`plauderbox://begehung?freigabe=${token}`)
    await ablauf.starteBegehung()

    expect(abhaengigkeiten.speichern).toHaveBeenCalledTimes(1)
    expect(ablauf.begehung.value?.protokoll.protokollId).toBe(17)
    expect(ablauf.ansicht.value).toBe('aktiv')
    expect(ablauf.startLaeuft.value).toBe(false)
  })

  it('blockiert den Start ohne gültigen Verteiler vor dem ersten lokalen Commit', async () => {
    const ohneVerteiler = kontext()
    ohneVerteiler.verteiler = []
    const abhaengigkeiten = begehungsAbhaengigkeiten({
      kontextLaden: vi.fn(async () => ohneVerteiler),
    })
    const ablauf = verwendeBegehung(abhaengigkeiten)

    await ablauf.verarbeiteQrCode(`plauderbox://begehung?freigabe=${token}`)
    await ablauf.starteBegehung()

    expect(ablauf.ansicht.value).toBe('start')
    expect(ablauf.startBlockiert.value).toBe(true)
    expect(ablauf.startProbleme.value).toContain(
      'Verteiler fehlt: In HappyHour muss mindestens eine gültige Person im Verteiler erfasst sein.',
    )
    expect(abhaengigkeiten.speichern).not.toHaveBeenCalled()
    expect(ablauf.begehung.value).toBeNull()
  })

  it('blockiert den Start ohne gültige Protokollpunktart und nennt den fehlenden Eintrag', async () => {
    const ohneArt = kontext()
    ohneArt.protokollpunktArten = []
    const abhaengigkeiten = begehungsAbhaengigkeiten({
      kontextLaden: vi.fn(async () => ohneArt),
    })
    const ablauf = verwendeBegehung(abhaengigkeiten)

    await ablauf.verarbeiteQrCode(`plauderbox://begehung?freigabe=${token}`)
    await ablauf.starteBegehung()

    expect(ablauf.startBlockiert.value).toBe(true)
    expect(ablauf.startProbleme.value).toContain(
      'Art des Protokollpunkts fehlt: In HappyHour muss mindestens eine Protokollpunktart vorhanden sein.',
    )
    expect(abhaengigkeiten.speichern).not.toHaveBeenCalled()
  })

  it('bereitet eine unterbrochene Auswertung beim Wiederanlauf erneut vor', async () => {
    const gespeichert = begehung()
    const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000002')
    eintrag.status = 'wird_ausgewertet'
    eintrag.audio = {
      dateiname: 'synthetisch.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x']),
    }
    gespeichert.eintraege.push(eintrag)
    const ablauf = verwendeBegehung(begehungsAbhaengigkeiten({ begehungLaden: vi.fn(async () => gespeichert) }))

    await ablauf.initialisiere()

    expect(eintrag.status).toBe('wartet_auf_auswertung')
    expect(ablauf.ansicht.value).toBe('aktiv')
  })

  it('zeigt unlesbare lokale Daten an, ohne eine Löschung anzufordern', async () => {
    const loeschen = vi.fn(async () => undefined)
    const ablauf = verwendeBegehung(
      begehungsAbhaengigkeiten({
        begehungLaden: vi.fn(async () => {
          throw new BegehungSpeicherfehler('unlesbare_daten')
        }),
        loeschen,
      }),
    )

    await ablauf.initialisiere()

    expect(ablauf.scannerMeldung.value).toBe(
      'Die lokal gespeicherte Begehung ist unlesbar. Die Daten wurden nicht gelöscht.',
    )
    expect(loeschen).not.toHaveBeenCalled()
    expect(ablauf.speicherblockiert.value).toBe(true)
  })

  it('blockiert QR-Verarbeitung und Begehungsstart bis unlesbare Daten bewusst verworfen wurden', async () => {
    const speichern = vi.fn(async () => undefined)
    const abhaengigkeiten = begehungsAbhaengigkeiten({
      begehungLaden: vi.fn(async () => {
        throw new BegehungSpeicherfehler('unlesbare_daten')
      }),
      speichern,
    })
    const ablauf = verwendeBegehung(abhaengigkeiten)

    await ablauf.initialisiere()
    await ablauf.verarbeiteQrCode(`plauderbox://begehung?freigabe=${token}`)
    await ablauf.starteBegehung()

    expect(abhaengigkeiten.kontextLaden).not.toHaveBeenCalled()
    expect(speichern).not.toHaveBeenCalled()
    expect(ablauf.scannerMeldung.value).toContain('gesichert oder verworfen')
  })

  it('leert den vollständigen lokalen Speicher nur nach Bestätigung und kehrt zum Scanner zurück', async () => {
    const gespeichert = begehung()
    const speicherVollstaendigLeeren = vi.fn(async () => undefined)
    const ablauf = verwendeBegehung(
      begehungsAbhaengigkeiten({
        begehungLaden: vi.fn(async () => gespeichert),
        speicherVollstaendigLeeren,
      }),
    )
    await ablauf.initialisiere()

    await ablauf.leereInternenSpeicher()

    expect(speicherVollstaendigLeeren).toHaveBeenCalledTimes(1)
    expect(ablauf.begehung.value).toBeNull()
    expect(ablauf.ansicht.value).toBe('scanner')
    expect(ablauf.scannerMeldung.value).toBe('Der interne App-Speicher wurde vollständig geleert.')
  })
})

describe('Auswertungswarteschlange', () => {
  it('gibt den Ablauf nach einem ersten Speicherfehler frei und stellt den Eintragsstatus wieder her', async () => {
    const gespeichert = begehung()
    const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000004')
    eintrag.status = 'wartet_auf_auswertung'
    eintrag.audio = {
      dateiname: 'synthetisch.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x']),
    }
    gespeichert.eintraege.push(eintrag)
    const auswerten = vi.fn(async () => {
      throw new Error('darf nicht aufgerufen werden')
    })
    const ansicht = ref<AppAnsicht>('aktiv')
    const ablauf = verwendeAuswertungsWarteschlange({
      begehung: ref(gespeichert),
      ansicht,
      online: ref(true),
      speichern: vi.fn(async () => Promise.reject(new Error('Lokale Sicherung fehlgeschlagen'))),
      auswerten,
      istVerbunden: () => true,
      freigabeErneuern: vi.fn(),
    })

    await ablauf.werteEintragAus(eintrag.id, true)

    expect(auswerten).not.toHaveBeenCalled()
    expect(ablauf.auswertungszustand.value.art).toBe('bereit')
    expect(eintrag.status).toBe('wartet_auf_auswertung')
    expect(eintrag.fehler).toBe('Lokale Sicherung fehlgeschlagen')
    expect(ansicht.value).toBe('auswertung')
  })

  it('meldet Auswertungs- und nachfolgenden Speicherfehler sichtbar', async () => {
    const gespeichert = begehung()
    const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000003')
    eintrag.status = 'wartet_auf_auswertung'
    eintrag.audio = {
      dateiname: 'synthetisch.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x']),
    }
    gespeichert.eintraege.push(eintrag)
    const speichern = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('synthetischer Speicherfehler'))
    const ansicht = ref<AppAnsicht>('aktiv')
    const ablauf = verwendeAuswertungsWarteschlange({
      begehung: ref(gespeichert),
      ansicht,
      online: ref(true),
      speichern,
      auswerten: vi.fn(async () => {
        throw new Error('synthetischer Auswertungsfehler')
      }),
      istVerbunden: () => true,
      freigabeErneuern: vi.fn(),
    })

    await ablauf.werteEintragAus(eintrag.id, true)

    expect(eintrag.status).toBe('fehler')
    expect(eintrag.fehler).toContain('synthetischer Auswertungsfehler')
    expect(eintrag.fehler).toContain('nicht im internen App-Speicher gesichert')
    expect(ansicht.value).toBe('auswertung')
    expect(ablauf.auswertungszustand.value.art).toBe('bereit')
  })

  it('führt bei abgelaufener Freigabe zur Erneuerung und behält die Aufnahme', async () => {
    const gespeichert = begehung()
    const eintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000005')
    eintrag.status = 'wartet_auf_auswertung'
    eintrag.audio = {
      dateiname: 'synthetisch.webm',
      medientyp: 'audio/webm',
      groesse: 1,
      dauerSekunden: 1,
      audio: new Blob(['x']),
    }
    gespeichert.eintraege.push(eintrag)
    const ansicht = ref<AppAnsicht>('aktiv')
    const freigabeErneuern = vi.fn()
    const ablauf = verwendeAuswertungsWarteschlange({
      begehung: ref(gespeichert),
      ansicht,
      online: ref(true),
      speichern: vi.fn(async () => undefined),
      auswerten: vi.fn(async () => {
        throw new AuswertungsdienstFehler('freigabe_ungueltig', 'Freigabe abgelaufen')
      }),
      istVerbunden: () => true,
      freigabeErneuern,
    })

    await ablauf.werteEintragAus(eintrag.id, true)

    expect(freigabeErneuern).toHaveBeenCalledWith('auswertung')
    expect(eintrag.status).toBe('fehler')
    expect(eintrag.audio?.audio).toBeInstanceOf(Blob)
  })
})

describe('HappyHour-Übergabe', () => {
  it('kennzeichnet die gesamte laufende HappyHour-Übergabe bis zur Bestätigung', async () => {
    const lokal = begehung('lokal_abgeschlossen')
    let bestaetigeUebergabe: (() => void) | undefined
    const uebergeben = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          bestaetigeUebergabe = resolve
        }),
    )
    const ablauf = verwendeHappyHourUebergabe({
      begehung: ref<LokaleBegehung | null>(lokal),
      ansicht: ref('abschluss'),
      scannerMeldung: ref(''),
      kontextLaden: vi.fn(async () => kontext()),
      speichern: vi.fn(async () => undefined),
      uebergeben,
    })

    const vorgang = ablauf.uebergibAnHappyHour()
    expect(ablauf.uebergabezustand.value).toEqual({ art: 'laeuft', vorgang: 'uebergabe' })
    expect(ablauf.uebergabeLaeuft.value).toBe(true)

    bestaetigeUebergabe!()
    await vorgang

    expect(ablauf.uebergabezustand.value).toEqual({ art: 'bereit' })
    expect(ablauf.uebergabeLaeuft.value).toBe(false)
  })

  it('zeigt einen Übergabefehler und erhält die lokale Begehung', async () => {
    const lokal = begehung('lokal_abgeschlossen')
    const begehungRef = ref<LokaleBegehung | null>(lokal)
    const ablauf = verwendeHappyHourUebergabe({
      begehung: begehungRef,
      ansicht: ref('abschluss'),
      scannerMeldung: ref(''),
      kontextLaden: vi.fn(async () => kontext()),
      speichern: vi.fn(async () => undefined),
      uebergeben: vi.fn(async () => {
        throw new HappyHourUebergabefehler('netzwerk')
      }),
    })

    await ablauf.uebergibAnHappyHour()

    expect(ablauf.uebergabeMeldung.value).toContain('HappyHour ist momentan nicht erreichbar')
    expect(toRaw(begehungRef.value)).toBe(lokal)
    expect(ablauf.uebergabezustand.value.art).toBe('bereit')
  })

  it('erneuert die Freigabe, übernimmt die HappyHour-Art und behält lokale Daten', async () => {
    const lokal = begehung('lokal_abgeschlossen')
    const vorbereiteterEintrag = erstelleEintrag(() => '00000000-0000-4000-8000-000000000088', 77)
    vorbereiteterEintrag.vorbereiteterProtokollpunktId = 88
    vorbereiteterEintrag.protokollpunktArtId = null
    vorbereiteterEintrag.gruppe = 'Lokale Gruppe'
    vorbereiteterEintrag.thema = 'Lokal korrigiertes Thema'
    vorbereiteterEintrag.inhalt = 'Lokaler Inhalt bleibt erhalten.'
    vorbereiteterEintrag.audio = {
      dateiname: 'lokal.webm',
      medientyp: 'audio/webm',
      groesse: 5,
      dauerSekunden: 2,
      audio: new Blob(['audio'], { type: 'audio/webm' }),
    }
    const bild = new Blob(['bild'], { type: 'image/jpeg' })
    vorbereiteterEintrag.bilder.push({
      id: '00000000-0000-4000-8000-000000000089',
      dateiname: 'lokal.jpg',
      medientyp: 'image/jpeg',
      groesse: bild.size,
      erstelltAm: vorbereiteterEintrag.erstelltAm,
      bild,
    })
    lokal.eintraege.push(vorbereiteterEintrag)
    lokal.aktuellerEintragId = vorbereiteterEintrag.id
    const aktualisierterKontext = kontext(17)
    aktualisierterKontext.protokollpunkte = [
      {
        id: 88,
        guid: vorbereiteterEintrag.id,
        protokollpunktArtId: 1,
        projektAnsprechpartnerId: 77,
        gruppe: 'HappyHour-Gruppe',
        reihenfolge: 1,
        thema: 'HappyHour-Thema',
        inhalt: 'HappyHour-Inhalt',
        rechtsverweis: null,
      },
    ]
    const begehungRef = ref<LokaleBegehung | null>(lokal)
    const ansicht = ref<
      | 'abschluss'
      | 'scanner'
      | 'freigabe_erneuern'
      | 'laden'
      | 'start'
      | 'aktiv'
      | 'erfassen'
      | 'offline'
      | 'auswertung'
      | 'kontrolle'
    >('abschluss')
    const speichern = vi.fn(async () => undefined)
    const ablauf = verwendeHappyHourUebergabe({
      begehung: begehungRef,
      ansicht,
      scannerMeldung: ref(''),
      kontextLaden: vi.fn(async () => aktualisierterKontext),
      speichern,
      uebergeben: vi.fn(async () => undefined),
    })

    ablauf.beginneFreigabeErneuerung('erfassen')

    await ablauf.verarbeiteErneuerteFreigabe(`plauderbox://begehung?freigabe=${'B'.repeat(32)}`)

    expect(begehungRef.value?.freigabeToken).toBe('B'.repeat(32))
    const zusammengefuehrt = begehungRef.value?.eintraege.find((eintrag) => eintrag.id === vorbereiteterEintrag.id)
    expect(zusammengefuehrt?.protokollpunktArtId).toBe(1)
    expect(zusammengefuehrt?.gruppe).toBe('Lokale Gruppe')
    expect(zusammengefuehrt?.thema).toBe('Lokal korrigiertes Thema')
    expect(zusammengefuehrt?.inhalt).toBe('Lokaler Inhalt bleibt erhalten.')
    expect(zusammengefuehrt?.audio?.audio).toBe(vorbereiteterEintrag.audio.audio)
    expect(zusammengefuehrt?.bilder[0]?.bild).toBe(bild)
    expect(ansicht.value).toBe('erfassen')
    expect(speichern).toHaveBeenCalledTimes(1)
  })
})
