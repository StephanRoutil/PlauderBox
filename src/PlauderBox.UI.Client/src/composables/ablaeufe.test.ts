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
import { verwendeBegehung } from './verwendeBegehung'
import { verwendeAuswertungsWarteschlange } from './verwendeAuswertungsWarteschlange'
import { verwendeHappyHourUebergabe } from './verwendeHappyHourUebergabe'

const token = 'A'.repeat(32)

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
    verteiler: [],
    protokollpunkte: [],
    protokollpunktArten: [],
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
  })
})

describe('Auswertungswarteschlange', () => {
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
    const ansicht = ref('aktiv')
    const ablauf = verwendeAuswertungsWarteschlange({
      begehung: ref(gespeichert),
      ansicht,
      online: ref(true),
      speichern,
      auswerten: vi.fn(async () => {
        throw new Error('synthetischer Auswertungsfehler')
      }),
      istVerbunden: () => true,
    })

    await ablauf.werteEintragAus(eintrag.id, true)

    expect(eintrag.status).toBe('fehler')
    expect(eintrag.fehler).toContain('synthetischer Auswertungsfehler')
    expect(eintrag.fehler).toContain('nicht im internen App-Speicher gesichert')
    expect(ansicht.value).toBe('auswertung')
    expect(ablauf.auswertungszustand.value.art).toBe('bereit')
  })
})

describe('HappyHour-Übergabe', () => {
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

  it('erneuert nur die Freigabe desselben Protokolls und behält lokale Daten', async () => {
    const lokal = begehung('lokal_abgeschlossen')
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
      kontextLaden: vi.fn(async () => kontext(17)),
      speichern,
      uebergeben: vi.fn(async () => undefined),
    })

    await ablauf.verarbeiteErneuerteFreigabe(`plauderbox://begehung?freigabe=${'B'.repeat(32)}`)

    expect(begehungRef.value?.freigabeToken).toBe('B'.repeat(32))
    expect(toRaw(begehungRef.value?.eintraege)).toBe(lokal.eintraege)
    expect(ansicht.value).toBe('abschluss')
    expect(speichern).toHaveBeenCalledTimes(1)
  })
})
