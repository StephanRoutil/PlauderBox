import { computed, ref, type Ref } from 'vue'
import { verarbeiteWarteschlange as verarbeiteFachWarteschlange } from '@logik/begehungsAblauf'
import {
  uebernehmeAuswertung,
  zaehleAusstehendeAudioaufnahmen,
  type LokaleBegehung,
} from '@/services/begehungsSpeicher'
import type { Transkriptionsantwort } from '@/services/auswertungsDienst'
import type { AppAnsicht } from './verwendeAppZustand'

export type Auswertungszustand = { art: 'bereit' } | { art: 'laeuft'; eintragId: string }

export interface AuswertungsWarteschlangeAbhaengigkeiten {
  begehung: Ref<LokaleBegehung | null>
  ansicht: Ref<AppAnsicht>
  online: Ref<boolean>
  speichern: (begehung: LokaleBegehung) => Promise<void>
  auswerten: (eintrag: LokaleBegehung['eintraege'][number], freigabeToken: string) => Promise<Transkriptionsantwort>
  istVerbunden: () => boolean
}

export function verwendeAuswertungsWarteschlange(abhaengigkeiten: AuswertungsWarteschlangeAbhaengigkeiten) {
  const zustand = ref<Auswertungszustand>({ art: 'bereit' })
  const anzahlAusstehend = computed(() =>
    abhaengigkeiten.begehung.value ? zaehleAusstehendeAudioaufnahmen(abhaengigkeiten.begehung.value) : 0,
  )

  async function werteEintragAus(id: string, ergebnisAnzeigen: boolean): Promise<void> {
    const begehung = abhaengigkeiten.begehung.value
    if (!begehung || !abhaengigkeiten.online.value) return
    const eintrag = begehung.eintraege.find((wert) => wert.id === id)
    if (!eintrag?.audio || zustand.value.art === 'laeuft') return
    zustand.value = { art: 'laeuft', eintragId: id }
    const vorherigerStatus = eintrag.status
    let auswertungGestartet = false
    try {
      eintrag.status = 'wird_ausgewertet'
      eintrag.fehler = ''
      await abhaengigkeiten.speichern(begehung)
      auswertungGestartet = true
      const ergebnis = await abhaengigkeiten.auswerten(eintrag, begehung.freigabeToken ?? '')
      uebernehmeAuswertung(eintrag, ergebnis)
      await abhaengigkeiten.speichern(begehung)
      if (ergebnisAnzeigen) abhaengigkeiten.ansicht.value = 'auswertung'
    } catch (fehler: unknown) {
      if (!auswertungGestartet) {
        eintrag.status = vorherigerStatus
        eintrag.fehler = fehler instanceof Error ? fehler.message : 'Die lokale Sicherung ist fehlgeschlagen.'
        if (ergebnisAnzeigen) abhaengigkeiten.ansicht.value = 'auswertung'
        return
      }
      eintrag.status = abhaengigkeiten.istVerbunden() ? 'fehler' : 'wartet_auf_auswertung'
      eintrag.fehler = fehler instanceof Error ? fehler.message : 'Die Auswertung ist fehlgeschlagen.'
      try {
        await abhaengigkeiten.speichern(begehung)
      } catch {
        eintrag.fehler = `${eintrag.fehler} Der Fehlerstatus konnte nicht im internen App-Speicher gesichert werden.`
      }
      if (ergebnisAnzeigen) abhaengigkeiten.ansicht.value = abhaengigkeiten.istVerbunden() ? 'auswertung' : 'offline'
    } finally {
      zustand.value = { art: 'bereit' }
    }
  }

  async function verarbeiteWarteschlange(): Promise<void> {
    const begehung = abhaengigkeiten.begehung.value
    if (!begehung || !abhaengigkeiten.online.value || zustand.value.art === 'laeuft') return
    await verarbeiteFachWarteschlange(
      begehung,
      () => abhaengigkeiten.online.value,
      async (eintrag) => {
        await werteEintragAus(eintrag.id, false)
        return eintrag.status === 'ausgewertet'
      },
    )
  }

  return { anzahlAusstehend, auswertungszustand: zustand, verarbeiteWarteschlange, werteEintragAus }
}
