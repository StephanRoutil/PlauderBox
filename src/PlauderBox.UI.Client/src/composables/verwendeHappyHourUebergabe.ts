import { computed, ref, type Ref } from 'vue'
import {
  committeFreigabeErneuerung,
  committeHappyHourUebergabe,
  type HappyHourProtokollKontext,
  type LokaleBegehung,
} from '@/services/begehungsSpeicher'
import {
  HappyHourProtokollKontextFehler,
  leseHappyHourBegehungsfreigabe,
  type HappyHourBegehungsfreigabe,
} from '@/services/happyHourProtokollKontext'
import { HappyHourUebergabefehler } from '@/services/happyHourProtokollpunktUebergabe'
import type { AppAnsicht } from './verwendeBegehung'

export type HappyHourUebergabezustand = { art: 'bereit' } | { art: 'laeuft'; vorgang: 'freigabe' | 'uebergabe' }

export interface HappyHourUebergabeAbhaengigkeiten {
  begehung: Ref<LokaleBegehung | null>
  ansicht: Ref<AppAnsicht>
  scannerMeldung: Ref<string>
  kontextLaden: (freigabe: HappyHourBegehungsfreigabe) => Promise<HappyHourProtokollKontext>
  speichern: (begehung: LokaleBegehung) => Promise<void>
  uebergeben: (begehung: LokaleBegehung) => Promise<unknown>
}

export function verwendeHappyHourUebergabe(abhaengigkeiten: HappyHourUebergabeAbhaengigkeiten) {
  const zustand = ref<HappyHourUebergabezustand>({ art: 'bereit' })
  const meldung = ref('')
  const uebergabeLaeuft = computed(() => zustand.value.art === 'laeuft')

  function beginneFreigabeErneuerung(): void {
    abhaengigkeiten.scannerMeldung.value = ''
    abhaengigkeiten.ansicht.value = 'freigabe_erneuern'
  }

  async function verarbeiteErneuerteFreigabe(inhalt: string): Promise<void> {
    const begehung = abhaengigkeiten.begehung.value
    if (!begehung || zustand.value.art === 'laeuft') return
    abhaengigkeiten.scannerMeldung.value = ''
    const freigabe = leseHappyHourBegehungsfreigabe(inhalt)
    if (!freigabe) {
      abhaengigkeiten.scannerMeldung.value = 'Dieser QR-Code gehört nicht zu einer freigegebenen HappyHour-Begehung.'
      return
    }
    zustand.value = { art: 'laeuft', vorgang: 'freigabe' }
    abhaengigkeiten.ansicht.value = 'laden'
    try {
      const neuerKontext = await abhaengigkeiten.kontextLaden(freigabe)
      if (neuerKontext.protokollId !== begehung.protokoll.protokollId) {
        abhaengigkeiten.ansicht.value = 'freigabe_erneuern'
        abhaengigkeiten.scannerMeldung.value =
          'Die neue Freigabe gehört zu einem anderen Protokoll. Die lokale Begehung wurde nicht verändert.'
        return
      }
      abhaengigkeiten.begehung.value = await committeFreigabeErneuerung(
        begehung,
        freigabe.token,
        neuerKontext.protokollId,
        abhaengigkeiten.speichern,
      )
      meldung.value =
        'Freigabe erneuert. Alle lokalen Einträge und Bilder sind erhalten und können jetzt erneut an HappyHour übergeben werden.'
      abhaengigkeiten.ansicht.value = 'abschluss'
    } catch (fehler: unknown) {
      abhaengigkeiten.ansicht.value = 'freigabe_erneuern'
      const art = fehler instanceof HappyHourProtokollKontextFehler ? fehler.art : 'speicher'
      abhaengigkeiten.scannerMeldung.value = {
        freigabe_ungueltig: 'Diese Rundgangsfreigabe ist ungültig, abgelaufen oder wurde widerrufen.',
        ungueltige_antwort: 'HappyHour hat keine gültigen Protokolldaten geliefert.',
        netzwerk: 'HappyHour ist momentan nicht erreichbar. Bitte Verbindung prüfen und erneut scannen.',
        speicher:
          'Die neue Freigabe konnte nicht im internen App-Speicher gesichert werden. Die bisherige Freigabe bleibt erhalten.',
      }[art]
    } finally {
      zustand.value = { art: 'bereit' }
    }
  }

  async function uebergibAnHappyHour(): Promise<void> {
    const begehung = abhaengigkeiten.begehung.value
    if (!begehung || zustand.value.art === 'laeuft') return
    zustand.value = { art: 'laeuft', vorgang: 'uebergabe' }
    meldung.value = ''
    try {
      await abhaengigkeiten.uebergeben(begehung)
      abhaengigkeiten.begehung.value = await committeHappyHourUebergabe(begehung, undefined, abhaengigkeiten.speichern)
      meldung.value =
        'Alle kontrollierten Protokollpunkte und Bilder sind in HappyHour angekommen. Die lokale Begehung bleibt bis zum bewussten Verwerfen erhalten.'
    } catch (fehler: unknown) {
      const art = fehler instanceof HappyHourUebergabefehler ? fehler.art : 'netzwerk'
      meldung.value = {
        offline: 'Aktuell keine Verbindung. Die lokalen Daten bleiben erhalten.',
        freigabe_ungueltig:
          'Die Rundgangsfreigabe ist abgelaufen oder wurde widerrufen. Die lokalen Daten bleiben erhalten.',
        konflikt:
          'HappyHour wurde zwischenzeitlich geändert oder ein vorbereiteter Punkt ist doppelt zugeordnet. Bitte in HappyHour kontrollieren.',
        ungueltig: 'Mindestens ein Eintrag ist für die Übergabe unvollständig. Bitte zur Kontrolle zurückkehren.',
        bild_ungueltig:
          'Mindestens ein Bild ist leer, zu gross oder hat ein nicht unterstütztes Format. Unterstützt sind JPEG, PNG, GIF und TIFF. Die lokalen Daten bleiben erhalten.',
        bildkontingent:
          'Das Bildkontingent dieser Rundgangsfreigabe ist ausgeschöpft. Die lokalen Daten bleiben erhalten; bitte in HappyHour eine neue Freigabe erstellen.',
        ungueltige_antwort: 'HappyHour hat die Übergabe nicht eindeutig bestätigt. Die lokalen Daten bleiben erhalten.',
        netzwerk:
          'HappyHour ist momentan nicht erreichbar. Die lokalen Daten bleiben erhalten und können erneut übergeben werden.',
      }[art]
    } finally {
      zustand.value = { art: 'bereit' }
    }
  }

  return {
    beginneFreigabeErneuerung,
    uebergabeLaeuft,
    uebergabeMeldung: meldung,
    uebergabezustand: zustand,
    uebergibAnHappyHour,
    verarbeiteErneuerteFreigabe,
  }
}
