import { computed, ref } from 'vue'
import {
  bereiteWiederanlaufVor,
  BegehungSpeicherfehler,
  committeEintrag,
  ermittleStandardProtokollpunktArtId,
  erstelleBegehung,
  erstelleEintragFuerProtokoll,
  normalisiereEintragProjektAnsprechpartner,
  pruefeBegehungsstart,
  type BegehungEintrag,
  type HappyHourProtokollKontext,
  type LokaleBegehung,
} from '@/services/begehungsSpeicher'
import {
  HappyHourProtokollKontextFehler,
  leseHappyHourBegehungsfreigabe,
  type HappyHourBegehungsfreigabe,
} from '@/services/happyHourProtokollKontext'
import { verwendeAppZustand, type AppZustand } from './verwendeAppZustand'

export type { AppAnsicht } from './verwendeAppZustand'
export type Begehungsstartzustand =
  | { art: 'bereit' }
  | { art: 'laeuft' }
  | { art: 'blockiert'; meldung: string; probleme: readonly string[] }
  | { art: 'fehler'; meldung: string }

export interface BegehungsAbhaengigkeiten {
  kontextLaden: (freigabe: HappyHourBegehungsfreigabe) => Promise<HappyHourProtokollKontext>
  begehungLaden: () => Promise<LokaleBegehung | null>
  legacyEintragLaden: () => Promise<BegehungEintrag | null>
  speichern: (
    begehung: LokaleBegehung,
    datenbankOeffnen?: () => Promise<IDBDatabase>,
    legacyImportId?: string,
  ) => Promise<void>
  loeschen: () => Promise<void>
  bestaetigen: (meldung: string) => boolean
  verbindungsstatus: () => boolean
  speicherBeibehalten: () => void
  auswerten: (id: string, ergebnisAnzeigen: boolean) => Promise<void>
  warteschlangeVerarbeiten: () => Promise<void>
  nachVerwerfen: () => void
  unlesbareDatenSichern: () => Promise<{ dateien: number }>
  unlesbareDatenVerwerfen: () => Promise<void>
  speicherVollstaendigLeeren: () => Promise<void>
}

export function verwendeBegehung(
  abhaengigkeiten: BegehungsAbhaengigkeiten,
  appZustand: AppZustand = verwendeAppZustand(abhaengigkeiten.verbindungsstatus),
) {
  const { ansicht, begehung, online } = appZustand
  const scannerMeldung = ref('')
  const protokollKontext = ref<HappyHourProtokollKontext | null>(null)
  const legacyEintrag = ref<BegehungEintrag | null>(null)
  const aktiveFreigabeToken = ref('')
  const startzustand = ref<Begehungsstartzustand>({ art: 'bereit' })
  const speicherblockiert = ref(false)
  const aktuellerEintrag = computed(
    () => begehung.value?.eintraege.find((eintrag) => eintrag.id === begehung.value?.aktuellerEintragId) ?? null,
  )
  const startLaeuft = computed(() => startzustand.value.art === 'laeuft')
  const startBlockiert = computed(() => startzustand.value.art === 'blockiert')
  const startProbleme = computed(() => (startzustand.value.art === 'blockiert' ? startzustand.value.probleme : []))
  const startMeldung = computed(() =>
    startzustand.value.art === 'blockiert' || startzustand.value.art === 'fehler'
      ? startzustand.value.meldung
      : '',
  )

  async function verarbeiteQrCode(inhalt: string): Promise<void> {
    if (speicherblockiert.value) {
      scannerMeldung.value =
        'Vor einer neuen Begehung müssen die unlesbaren lokalen Daten gesichert oder verworfen werden.'
      return
    }
    scannerMeldung.value = ''
    const freigabe = leseHappyHourBegehungsfreigabe(inhalt)
    if (!freigabe) {
      scannerMeldung.value = 'Dieser QR-Code gehört nicht zu einer freigegebenen HappyHour-Begehung.'
      return
    }
    ansicht.value = 'laden'
    try {
      protokollKontext.value = await abhaengigkeiten.kontextLaden(freigabe)
      aktiveFreigabeToken.value = freigabe.token
      const startpruefung = pruefeBegehungsstart(protokollKontext.value)
      startzustand.value = startpruefung.gueltig
        ? { art: 'bereit' }
        : { art: 'blockiert', meldung: startpruefung.meldung, probleme: startpruefung.probleme }
      ansicht.value = 'start'
    } catch (fehler: unknown) {
      ansicht.value = 'scanner'
      const art = fehler instanceof HappyHourProtokollKontextFehler ? fehler.art : 'netzwerk'
      scannerMeldung.value = {
        freigabe_ungueltig: 'Diese Rundgangsfreigabe ist ungültig, abgelaufen oder wurde widerrufen.',
        ungueltige_antwort: 'HappyHour hat keine gültigen Protokolldaten geliefert.',
        netzwerk: 'HappyHour ist momentan nicht erreichbar. Bitte Verbindung prüfen und erneut scannen.',
      }[art]
    }
  }

  async function starteBegehung(): Promise<void> {
    if (speicherblockiert.value || !protokollKontext.value || startzustand.value.art === 'laeuft') return
    const startpruefung = pruefeBegehungsstart(protokollKontext.value)
    if (!startpruefung.gueltig) {
      startzustand.value = {
        art: 'blockiert',
        meldung: startpruefung.meldung,
        probleme: startpruefung.probleme,
      }
      return
    }
    startzustand.value = { art: 'laeuft' }
    try {
      const neueBegehung = erstelleBegehung(protokollKontext.value, undefined, aktiveFreigabeToken.value)
      let legacyImportId: string | undefined
      if (
        legacyEintrag.value &&
        abhaengigkeiten.bestaetigen(
          'Es wurden ältere lokal gespeicherte Daten gefunden. Als neuen Eintrag in diese Begehung übernehmen?',
        )
      ) {
        normalisiereEintragProjektAnsprechpartner(legacyEintrag.value, neueBegehung.protokoll)
        neueBegehung.eintraege.push(legacyEintrag.value)
        neueBegehung.aktuellerEintragId = legacyEintrag.value.id
        legacyImportId = legacyEintrag.value.legacyImportId
      }
      await abhaengigkeiten.speichern(neueBegehung, undefined, legacyImportId)
      begehung.value = neueBegehung
      if (legacyImportId) legacyEintrag.value = null
      abhaengigkeiten.speicherBeibehalten()
      ansicht.value = 'aktiv'
      startzustand.value = { art: 'bereit' }
    } catch {
      startzustand.value = {
        art: 'fehler',
        meldung: 'Die Begehung konnte nicht im internen App-Speicher gestartet werden. Bitte erneut versuchen.',
      }
    }
  }

  async function neuerEintrag(): Promise<void> {
    if (!begehung.value) return
    const eintrag = erstelleEintragFuerProtokoll(
      begehung.value.protokoll,
      undefined,
      ermittleStandardProtokollpunktArtId(begehung.value),
    )
    begehung.value.eintraege.push(eintrag)
    begehung.value.aktuellerEintragId = eintrag.id
    begehung.value.status = 'aktiv'
    begehung.value.uebertragenAm = undefined
    begehung.value.bilderUebertragenAm = undefined
    await abhaengigkeiten.speichern(begehung.value)
    ansicht.value = 'erfassen'
  }

  function oeffneEintrag(id: string): void {
    if (!begehung.value) return
    begehung.value.aktuellerEintragId = id
    ansicht.value = 'erfassen'
  }

  async function speichereEintrag(
    eintrag: BegehungEintrag,
    ziel: 'aktiv' | 'neu' | 'kontrolle' = 'aktiv',
  ): Promise<void> {
    if (!begehung.value) return
    begehung.value = await committeEintrag(begehung.value, eintrag, abhaengigkeiten.speichern)
    if (ziel === 'neu') await neuerEintrag()
    else if (ziel === 'kontrolle') await geheZurKontrolle()
    else ansicht.value = 'aktiv'
  }

  async function speichereErfassung(eintrag: BegehungEintrag): Promise<void> {
    await speichereEintrag(eintrag)
    if (!eintrag.audio) {
      ansicht.value = 'aktiv'
      return
    }
    if (!online.value) {
      ansicht.value = 'offline'
      return
    }
    await abhaengigkeiten.auswerten(eintrag.id, true)
  }

  async function speichereZwischenstand(eintrag: BegehungEintrag): Promise<void> {
    if (begehung.value) begehung.value = await committeEintrag(begehung.value, eintrag, abhaengigkeiten.speichern)
  }

  async function loescheEintrag(id: string): Promise<void> {
    if (!begehung.value || !abhaengigkeiten.bestaetigen('Diesen Eintrag mit Aufnahme und Bildern wirklich löschen?'))
      return
    begehung.value.eintraege = begehung.value.eintraege.filter((eintrag) => eintrag.id !== id)
    begehung.value.aktuellerEintragId = begehung.value.eintraege.at(-1)?.id ?? null
    begehung.value.uebertragenAm = undefined
    begehung.value.bilderUebertragenAm = undefined
    await abhaengigkeiten.speichern(begehung.value)
  }

  async function geheZurKontrolle(): Promise<void> {
    if (!begehung.value) return
    begehung.value.status = 'kontrolle'
    await abhaengigkeiten.speichern(begehung.value)
    ansicht.value = 'kontrolle'
  }

  async function schliesseBegehungAb(): Promise<void> {
    if (!begehung.value || !abhaengigkeiten.bestaetigen('Begehung nach der Kontrolle lokal abschliessen?')) return
    begehung.value.status = 'lokal_abgeschlossen'
    await abhaengigkeiten.speichern(begehung.value)
    ansicht.value = 'abschluss'
  }

  async function verwirfBegehungUndScanneNeu(): Promise<void> {
    if (
      !abhaengigkeiten.bestaetigen(
        'Die lokale Begehung mit allen Bildern und Aufnahmen endgültig verwerfen und einen neuen Code scannen?',
      )
    )
      return
    await abhaengigkeiten.loeschen()
    begehung.value = null
    protokollKontext.value = null
    aktiveFreigabeToken.value = ''
    abhaengigkeiten.nachVerwerfen()
    ansicht.value = 'scanner'
    scannerMeldung.value = ''
  }

  async function verbindungAktualisiert(): Promise<void> {
    online.value = abhaengigkeiten.verbindungsstatus()
    if (online.value) {
      await abhaengigkeiten.warteschlangeVerarbeiten()
      if (ansicht.value === 'offline') ansicht.value = 'aktiv'
    }
  }

  async function initialisiere(): Promise<void> {
    try {
      legacyEintrag.value = await abhaengigkeiten.legacyEintragLaden()
      begehung.value = await abhaengigkeiten.begehungLaden()
      if (begehung.value) {
        bereiteWiederanlaufVor(begehung.value)
        ansicht.value =
          begehung.value.status === 'kontrolle'
            ? 'kontrolle'
            : ['lokal_abgeschlossen', 'an_happyhour_uebertragen'].includes(begehung.value.status)
              ? 'abschluss'
              : 'aktiv'
        await abhaengigkeiten.speichern(begehung.value)
        if (online.value) void abhaengigkeiten.warteschlangeVerarbeiten()
      } else if (legacyEintrag.value) {
        scannerMeldung.value = 'Ältere lokale Daten wurden gefunden. Scanne eine Begehung, um sie sicher zu übernehmen.'
      }
    } catch (fehler: unknown) {
      speicherblockiert.value = fehler instanceof BegehungSpeicherfehler
      scannerMeldung.value =
        fehler instanceof BegehungSpeicherfehler
          ? 'Die lokal gespeicherte Begehung ist unlesbar. Die Daten wurden nicht gelöscht.'
          : 'Der interne App-Speicher ist nicht verfügbar.'
    }
  }

  async function sichereBlockierteDaten(): Promise<void> {
    const ergebnis = await abhaengigkeiten.unlesbareDatenSichern()
    scannerMeldung.value = `${ergebnis.dateien} Rohdaten- und Mediendateien wurden zur externen Sicherung übergeben.`
  }

  async function verwerfeBlockierteDaten(): Promise<void> {
    if (
      !abhaengigkeiten.bestaetigen(
        'Unlesbare lokale Daten endgültig verwerfen? Dieser Schritt kann nicht rückgängig gemacht werden.',
      )
    )
      return
    await abhaengigkeiten.unlesbareDatenVerwerfen()
    speicherblockiert.value = false
    scannerMeldung.value =
      'Die unlesbaren lokalen Daten wurden bewusst verworfen. Eine neue Begehung kann gestartet werden.'
  }

  async function leereInternenSpeicher(): Promise<void> {
    if (
      !abhaengigkeiten.bestaetigen(
        'Den internen App-Speicher mit allen lokalen Begehungen, Bildern und Aufnahmen endgültig leeren?',
      )
    )
      return
    try {
      await abhaengigkeiten.speicherVollstaendigLeeren()
      begehung.value = null
      legacyEintrag.value = null
      protokollKontext.value = null
      aktiveFreigabeToken.value = ''
      speicherblockiert.value = false
      startzustand.value = { art: 'bereit' }
      ansicht.value = 'scanner'
      scannerMeldung.value = 'Der interne App-Speicher wurde vollständig geleert.'
      abhaengigkeiten.nachVerwerfen()
    } catch {
      scannerMeldung.value =
        'Der interne App-Speicher konnte nicht vollständig geleert werden. Bitte andere PlauderBox-Fenster schliessen und erneut versuchen.'
    }
  }

  return {
    aktiveFreigabeToken,
    aktuellerEintrag,
    ansicht,
    begehung,
    geheZurKontrolle,
    initialisiere,
    loescheEintrag,
    leereInternenSpeicher,
    neuerEintrag,
    oeffneEintrag,
    online,
    protokollKontext,
    scannerMeldung,
    sichereBlockierteDaten,
    schliesseBegehungAb,
    speichereEintrag,
    speichereErfassung,
    speichereZwischenstand,
    starteBegehung,
    startLaeuft,
    startBlockiert,
    startProbleme,
    startMeldung,
    speicherblockiert,
    verbindungAktualisiert,
    verarbeiteQrCode,
    verwerfeBlockierteDaten,
    verwirfBegehungUndScanneNeu,
  }
}
