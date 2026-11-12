<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AktiveBegehung from '@/components/AktiveBegehung.vue'
import BegehungAbschluss from '@/components/BegehungAbschluss.vue'
import BegehungKontrolle from '@/components/BegehungKontrolle.vue'
import BegehungStart from '@/components/BegehungStart.vue'
import EintragAuswertung from '@/components/EintragAuswertung.vue'
import EintragErfassen from '@/components/EintragErfassen.vue'
import OfflineHinweis from '@/components/OfflineHinweis.vue'
import QrCodeStart from '@/components/QrCodeStart.vue'
import { HappyHourProtokollKontextFehler, ladeHappyHourProtokollKontext, leseHappyHourBegehungsfreigabe, type HappyHourProtokollKontext } from '@/services/happyHourProtokollKontext'
import { bereiteWiederanlaufVor, committeEintrag, committeFreigabeErneuerung, committeHappyHourUebergabe, erstelleBegehung, erstelleEintragFuerProtokoll, ladeBegehung, loescheBegehung, normalisiereEintragProjektAnsprechpartner, speichereBegehung, uebernehmeAuswertung, zaehleAusstehendeAudioaufnahmen, type BegehungEintrag, type LokaleBegehung } from '@/services/begehungsSpeicher'
import { verarbeiteWarteschlange as verarbeiteFachWarteschlange } from '@logik/begehungsAblauf'
import { sendeAudioZurAuswertung } from '@/services/auswertungsDienst'
import { ladeLegacyEintrag } from '@/services/legacyWiederherstellung'
import { HappyHourUebergabefehler, uebergebeProtokollpunkte } from '@/services/happyHourProtokollpunktUebergabe'

type AppAnsicht = 'scanner' | 'freigabe_erneuern' | 'laden' | 'start' | 'aktiv' | 'erfassen' | 'offline' | 'auswertung' | 'kontrolle' | 'abschluss'

const ansicht = ref<AppAnsicht>('scanner')
const scannerMeldung = ref('')
const protokollKontext = ref<HappyHourProtokollKontext | null>(null)
const begehung = ref<LokaleBegehung | null>(null)
const online = ref(navigator.onLine)
const auswertungLaeuft = ref(false)
const legacyEintrag = ref<BegehungEintrag | null>(null)
const aktiveFreigabeToken = ref('')
const uebergabeLaeuft = ref(false)
const uebergabeMeldung = ref('')
const startLaeuft = ref(false)
const startMeldung = ref('')

const aktuellerEintrag = computed(() => begehung.value?.eintraege.find((eintrag) => eintrag.id === begehung.value?.aktuellerEintragId) ?? null)
const anzahlAusstehend = computed(() => begehung.value ? zaehleAusstehendeAudioaufnahmen(begehung.value) : 0)

async function verarbeiteQrCode(inhalt: string): Promise<void> {
  scannerMeldung.value = ''
  const freigabe = leseHappyHourBegehungsfreigabe(inhalt)
  if (!freigabe) { scannerMeldung.value = 'Dieser QR-Code gehört nicht zu einer freigegebenen HappyHour-Begehung.'; return }
  ansicht.value = 'laden'
  try {
    protokollKontext.value = await ladeHappyHourProtokollKontext(freigabe)
    aktiveFreigabeToken.value = freigabe.token
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

function beginneFreigabeErneuerung(): void {
  scannerMeldung.value = ''
  ansicht.value = 'freigabe_erneuern'
}

async function verarbeiteErneuerteFreigabe(inhalt: string): Promise<void> {
  if (!begehung.value) return
  scannerMeldung.value = ''
  const freigabe = leseHappyHourBegehungsfreigabe(inhalt)
  if (!freigabe) { scannerMeldung.value = 'Dieser QR-Code gehört nicht zu einer freigegebenen HappyHour-Begehung.'; return }
  ansicht.value = 'laden'
  try {
    const neuerKontext = await ladeHappyHourProtokollKontext(freigabe)
    if (neuerKontext.protokollId !== begehung.value.protokoll.protokollId) {
      ansicht.value = 'freigabe_erneuern'
      scannerMeldung.value = 'Die neue Freigabe gehört zu einem anderen Protokoll. Die lokale Begehung wurde nicht verändert.'
      return
    }
    begehung.value = await committeFreigabeErneuerung(begehung.value, freigabe.token, neuerKontext.protokollId)
    uebergabeMeldung.value = 'Freigabe erneuert. Alle lokalen Einträge und Bilder sind erhalten und können jetzt erneut an HappyHour übergeben werden.'
    ansicht.value = 'abschluss'
  } catch (fehler: unknown) {
    ansicht.value = 'freigabe_erneuern'
    const art = fehler instanceof HappyHourProtokollKontextFehler ? fehler.art : 'speicher'
    scannerMeldung.value = {
      freigabe_ungueltig: 'Diese Rundgangsfreigabe ist ungültig, abgelaufen oder wurde widerrufen.',
      ungueltige_antwort: 'HappyHour hat keine gültigen Protokolldaten geliefert.',
      netzwerk: 'HappyHour ist momentan nicht erreichbar. Bitte Verbindung prüfen und erneut scannen.',
      speicher: 'Die neue Freigabe konnte nicht im internen App-Speicher gesichert werden. Die bisherige Freigabe bleibt erhalten.',
    }[art]
  }
}

async function starteBegehung(): Promise<void> {
  if (!protokollKontext.value || startLaeuft.value) return
  startLaeuft.value = true
  startMeldung.value = ''
  try {
    const neueBegehung = erstelleBegehung(protokollKontext.value, undefined, aktiveFreigabeToken.value)
    let legacyImportId: string | undefined
    if (legacyEintrag.value && window.confirm('Es wurden ältere lokal gespeicherte Daten gefunden. Als neuen Eintrag in diese Begehung übernehmen?')) {
      normalisiereEintragProjektAnsprechpartner(legacyEintrag.value, neueBegehung.protokoll)
      neueBegehung.eintraege.push(legacyEintrag.value)
      neueBegehung.aktuellerEintragId = legacyEintrag.value.id
      legacyImportId = legacyEintrag.value.legacyImportId
    }
    await speichereBegehung(neueBegehung, undefined, legacyImportId)
    begehung.value = neueBegehung
    if (legacyImportId) legacyEintrag.value = null
    navigator.storage?.persist?.().catch(() => false)
    ansicht.value = 'aktiv'
  } catch {
    startMeldung.value = 'Die Begehung konnte nicht im internen App-Speicher gestartet werden. Bitte erneut versuchen.'
  } finally {
    startLaeuft.value = false
  }
}

async function neuerEintrag(): Promise<void> {
  if (!begehung.value) return
  const eintrag = erstelleEintragFuerProtokoll(begehung.value.protokoll)
  begehung.value.eintraege.push(eintrag)
  begehung.value.aktuellerEintragId = eintrag.id
  begehung.value.status = 'aktiv'
  await speichereBegehung(begehung.value)
  ansicht.value = 'erfassen'
}

function oeffneEintrag(id: string): void {
  if (!begehung.value) return
  begehung.value.aktuellerEintragId = id
  ansicht.value = 'erfassen'
}

async function speichereEintrag(eintrag: BegehungEintrag, ziel: 'aktiv' | 'neu' | 'kontrolle' = 'aktiv'): Promise<void> {
  if (!begehung.value) return
  begehung.value = await committeEintrag(begehung.value, eintrag)
  if (ziel === 'neu') await neuerEintrag()
  else if (ziel === 'kontrolle') await geheZurKontrolle()
  else ansicht.value = 'aktiv'
}

async function speichereErfassung(eintrag: BegehungEintrag): Promise<void> {
  await speichereEintrag(eintrag)
  if (!eintrag.audio) { ansicht.value = 'aktiv'; return }
  if (!online.value) { ansicht.value = 'offline'; return }
  await werteEintragAus(eintrag.id, true)
}

async function speichereZwischenstand(eintrag: BegehungEintrag): Promise<void> {
  if (!begehung.value) return
  begehung.value = await committeEintrag(begehung.value, eintrag)
}

async function loescheEintrag(id: string): Promise<void> {
  if (!begehung.value || !window.confirm('Diesen Eintrag mit Aufnahme und Bildern wirklich löschen?')) return
  begehung.value.eintraege = begehung.value.eintraege.filter((eintrag) => eintrag.id !== id)
  begehung.value.aktuellerEintragId = begehung.value.eintraege.at(-1)?.id ?? null
  await speichereBegehung(begehung.value)
}

async function werteEintragAus(id: string, ergebnisAnzeigen: boolean): Promise<void> {
  if (!begehung.value || !online.value) return
  const eintrag = begehung.value.eintraege.find((wert) => wert.id === id)
  if (!eintrag?.audio || auswertungLaeuft.value) return
  auswertungLaeuft.value = true
  eintrag.status = 'wird_ausgewertet'
  eintrag.fehler = ''
  await speichereBegehung(begehung.value)
  try {
    const ergebnis = await sendeAudioZurAuswertung(eintrag, begehung.value.freigabeToken ?? '')
    uebernehmeAuswertung(eintrag, { text: ergebnis.text, gruppe: ergebnis.gruppe, thema: ergebnis.thema, inhalt: ergebnis.inhalt, rechtsverweis: ergebnis.rechtsverweis })
    await speichereBegehung(begehung.value)
    if (ergebnisAnzeigen) ansicht.value = 'auswertung'
  } catch (fehler: unknown) {
    eintrag.status = navigator.onLine ? 'fehler' : 'wartet_auf_auswertung'
    eintrag.fehler = fehler instanceof Error ? fehler.message : 'Die Auswertung ist fehlgeschlagen.'
    await speichereBegehung(begehung.value)
    if (ergebnisAnzeigen) ansicht.value = navigator.onLine ? 'auswertung' : 'offline'
  } finally { auswertungLaeuft.value = false }
}

async function verarbeiteWarteschlange(): Promise<void> {
  if (!begehung.value || !online.value || auswertungLaeuft.value) return
  await verarbeiteFachWarteschlange(begehung.value, () => online.value, async (eintrag) => {
    await werteEintragAus(eintrag.id, false)
    return eintrag.status === 'ausgewertet'
  })
}

async function geheZurKontrolle(): Promise<void> {
  if (!begehung.value) return
  begehung.value.status = 'kontrolle'
  await speichereBegehung(begehung.value)
  ansicht.value = 'kontrolle'
}

async function schliesseBegehungAb(): Promise<void> {
  if (!begehung.value || !window.confirm('Begehung nach der Kontrolle lokal abschliessen?')) return
  begehung.value.status = 'lokal_abgeschlossen'
  await speichereBegehung(begehung.value)
  ansicht.value = 'abschluss'
}

async function uebergibAnHappyHour(): Promise<void> {
  if (!begehung.value || uebergabeLaeuft.value) return
  uebergabeLaeuft.value = true
  uebergabeMeldung.value = ''
  try {
    await uebergebeProtokollpunkte(begehung.value)
    begehung.value = await committeHappyHourUebergabe(begehung.value)
    uebergabeMeldung.value = 'Alle kontrollierten Protokollpunkte und Bilder sind in HappyHour angekommen. Die lokale Begehung bleibt bis zum bewussten Verwerfen erhalten.'
  } catch (fehler: unknown) {
    const art = fehler instanceof HappyHourUebergabefehler ? fehler.art : 'netzwerk'
    uebergabeMeldung.value = {
      offline: 'Aktuell keine Verbindung. Die lokalen Daten bleiben erhalten.',
      freigabe_ungueltig: 'Die Rundgangsfreigabe ist abgelaufen oder wurde widerrufen. Die lokalen Daten bleiben erhalten.',
      konflikt: 'HappyHour wurde zwischenzeitlich geändert oder ein vorbereiteter Punkt ist doppelt zugeordnet. Bitte in HappyHour kontrollieren.',
      ungueltig: 'Mindestens ein Eintrag ist für die Übergabe unvollständig. Bitte zur Kontrolle zurückkehren.',
      bild_ungueltig: 'Mindestens ein Bild ist leer, zu gross oder hat ein nicht unterstütztes Format. Unterstützt sind JPEG, PNG, GIF und TIFF. Die lokalen Daten bleiben erhalten.',
      bildkontingent: 'Das Bildkontingent dieser Rundgangsfreigabe ist ausgeschöpft. Die lokalen Daten bleiben erhalten; bitte in HappyHour eine neue Freigabe erstellen.',
      ungueltige_antwort: 'HappyHour hat die Übergabe nicht eindeutig bestätigt. Die lokalen Daten bleiben erhalten.',
      netzwerk: 'HappyHour ist momentan nicht erreichbar. Die lokalen Daten bleiben erhalten und können erneut übergeben werden.',
    }[art]
  } finally { uebergabeLaeuft.value = false }
}

async function verwirfBegehungUndScanneNeu(): Promise<void> {
  if (!window.confirm('Die lokale Begehung mit allen Bildern und Aufnahmen endgültig verwerfen und einen neuen Code scannen?')) return
  await loescheBegehung()
  begehung.value = null
  protokollKontext.value = null
  aktiveFreigabeToken.value = ''
  uebergabeMeldung.value = ''
  ansicht.value = 'scanner'
  scannerMeldung.value = ''
}

async function verbindungAktualisiert(): Promise<void> {
  online.value = navigator.onLine
  if (online.value) {
    await verarbeiteWarteschlange()
    if (ansicht.value === 'offline') ansicht.value = 'aktiv'
  }
}

onMounted(async () => {
  window.addEventListener('online', verbindungAktualisiert)
  window.addEventListener('offline', verbindungAktualisiert)
  try {
    legacyEintrag.value = await ladeLegacyEintrag()
    begehung.value = await ladeBegehung()
    if (begehung.value) {
      bereiteWiederanlaufVor(begehung.value)
      ansicht.value = begehung.value.status === 'kontrolle' ? 'kontrolle' : ['lokal_abgeschlossen', 'an_happyhour_uebertragen'].includes(begehung.value.status) ? 'abschluss' : 'aktiv'
      await speichereBegehung(begehung.value)
      if (online.value) void verarbeiteWarteschlange()
    } else if (legacyEintrag.value) scannerMeldung.value = 'Ältere lokale Daten wurden gefunden. Scanne eine Begehung, um sie sicher zu übernehmen.'
  } catch { scannerMeldung.value = 'Der interne App-Speicher ist nicht verfügbar.' }
})
onBeforeUnmount(() => { window.removeEventListener('online', verbindungAktualisiert); window.removeEventListener('offline', verbindungAktualisiert) })
</script>

<template>
  <QrCodeStart v-if="ansicht === 'scanner'" :externe-meldung="scannerMeldung" @erkannt="verarbeiteQrCode" />
  <QrCodeStart v-else-if="ansicht === 'freigabe_erneuern'" erneuerung :externe-meldung="scannerMeldung" @erkannt="verarbeiteErneuerteFreigabe" @zurueck="ansicht = 'abschluss'" />
  <main v-else-if="ansicht === 'laden'" class="begehung-shell"><section class="loading-card" aria-live="polite"><span class="spinner"></span><h1>Begehung wird geladen</h1><p>Die freigegebenen Daten werden aus HappyHour gelesen.</p></section></main>
  <BegehungStart v-else-if="ansicht === 'start' && protokollKontext" :kontext="protokollKontext" :start-laeuft="startLaeuft" :start-meldung="startMeldung" @zurueck="ansicht = 'scanner'" @starten="starteBegehung" />
  <AktiveBegehung v-else-if="ansicht === 'aktiv' && begehung" :begehung="begehung" :online="online" @neu="neuerEintrag" @bearbeiten="oeffneEintrag" @loeschen="loescheEintrag" @kontrolle="geheZurKontrolle" />
  <EintragErfassen v-else-if="ansicht === 'erfassen' && aktuellerEintrag && begehung" :eintrag="aktuellerEintrag" :protokoll="begehung.protokoll" :online="online" :speichern="speichereZwischenstand" @gespeichert="speichereErfassung" @abbrechen="ansicht = 'aktiv'" />
  <OfflineHinweis v-else-if="ansicht === 'offline'" :anzahl-ausstehend="anzahlAusstehend" @neu="neuerEintrag" @kontrolle="geheZurKontrolle" />
  <EintragAuswertung v-else-if="ansicht === 'auswertung' && aktuellerEintrag" :eintrag="aktuellerEintrag" :online="online" @speichern="speichereEintrag" @neu="(eintrag) => speichereEintrag(eintrag, 'neu')" @kontrolle="(eintrag) => speichereEintrag(eintrag, 'kontrolle')" @wiederholen="werteEintragAus(aktuellerEintrag.id, true)" @zurueck="ansicht = 'aktiv'" />
  <BegehungKontrolle v-else-if="ansicht === 'kontrolle' && begehung" :begehung="begehung" @zurueck="ansicht = 'aktiv'" @bearbeiten="oeffneEintrag" @abschliessen="schliesseBegehungAb" />
  <BegehungAbschluss v-else-if="ansicht === 'abschluss' && begehung" :begehung="begehung" :online="online" :uebergabe-laeuft="uebergabeLaeuft" :meldung="uebergabeMeldung" @zurueck="geheZurKontrolle" @uebergeben="uebergibAnHappyHour" @freigabe-erneuern="beginneFreigabeErneuerung" @neu-starten="verwirfBegehungUndScanneNeu" />
</template>
