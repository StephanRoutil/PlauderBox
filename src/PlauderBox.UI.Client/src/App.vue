<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AktiveBegehung from '@/components/AktiveBegehung.vue'
import BegehungAbschluss from '@/components/BegehungAbschluss.vue'
import BegehungKontrolle from '@/components/BegehungKontrolle.vue'
import BegehungStart from '@/components/BegehungStart.vue'
import EintragAuswertung from '@/components/EintragAuswertung.vue'
import EintragErfassen from '@/components/EintragErfassen.vue'
import OfflineHinweis from '@/components/OfflineHinweis.vue'
import QrCodeStart from '@/components/QrCodeStart.vue'
import VorgangsFortschritt from '@/components/VorgangsFortschritt.vue'
import KiSchluesselHinweis from '@/components/KiSchluesselHinweis.vue'
import { verwendeBegehung } from '@/composables/verwendeBegehung'
import { verwendeAuswertungsWarteschlange } from '@/composables/verwendeAuswertungsWarteschlange'
import { verwendeHappyHourUebergabe } from '@/composables/verwendeHappyHourUebergabe'
import { verwendeAppZustand } from '@/composables/verwendeAppZustand'
import { ladeHappyHourProtokollKontext } from '@/services/happyHourProtokollKontext'
import {
  ladeBegehung,
  loescheBegehung,
  sichereUnlesbareDaten,
  speichereBegehung,
  verwerfeUnlesbareDaten,
} from '@/services/begehungsSpeicher'
import { sendeAudioZurAuswertung } from '@/services/auswertungsDienst'
import { ladeLegacyEintrag, verwerfeLegacyDaten } from '@/services/legacyWiederherstellung'
import { uebergebeProtokollpunkte } from '@/services/happyHourProtokollpunktUebergabe'
import {
  ladeKiSchluesselStatus,
  type KiSchluesselStatusZustand,
} from '@/services/kiSchluesselStatus'

const appZustand = verwendeAppZustand(() => navigator.onLine)
const kiSchluesselStatus = ref<KiSchluesselStatusZustand>({ art: 'laeuft' })
let freigabeErneuern = (_rueckkehr: typeof appZustand.ansicht.value): void => undefined

const auswertungsAblauf = verwendeAuswertungsWarteschlange({
  begehung: appZustand.begehung,
  ansicht: appZustand.ansicht,
  online: appZustand.online,
  speichern: speichereBegehung,
  auswerten: sendeAudioZurAuswertung,
  istVerbunden: () => navigator.onLine,
  freigabeErneuern: (rueckkehr) => freigabeErneuern(rueckkehr),
})

const begehungsAblauf = verwendeBegehung(
  {
    kontextLaden: ladeHappyHourProtokollKontext,
    begehungLaden: ladeBegehung,
    legacyEintragLaden: ladeLegacyEintrag,
    speichern: speichereBegehung,
    loeschen: loescheBegehung,
    bestaetigen: (meldung) => window.confirm(meldung),
    verbindungsstatus: () => navigator.onLine,
    speicherBeibehalten: () => {
      void navigator.storage?.persist?.().catch(() => false)
    },
    auswerten: async (id, ergebnisAnzeigen) => {
      await auswertungsAblauf.werteEintragAus(id, ergebnisAnzeigen)
    },
    warteschlangeVerarbeiten: async () => {
      await auswertungsAblauf.verarbeiteWarteschlange()
    },
    nachVerwerfen: () => {
      happyHourAblauf.uebergabeMeldung.value = ''
    },
    unlesbareDatenSichern: sichereUnlesbareDaten,
    unlesbareDatenVerwerfen: verwerfeUnlesbareDaten,
    speicherVollstaendigLeeren: async () => {
      await verwerfeUnlesbareDaten()
      await verwerfeLegacyDaten()
    },
  },
  appZustand,
)

const happyHourAblauf = verwendeHappyHourUebergabe({
  begehung: begehungsAblauf.begehung,
  ansicht: begehungsAblauf.ansicht,
  scannerMeldung: begehungsAblauf.scannerMeldung,
  kontextLaden: ladeHappyHourProtokollKontext,
  speichern: speichereBegehung,
  uebergeben: uebergebeProtokollpunkte,
})
freigabeErneuern = happyHourAblauf.beginneFreigabeErneuerung

const {
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
  startMeldung,
  speicherblockiert,
  verbindungAktualisiert,
  verarbeiteQrCode,
  verwerfeBlockierteDaten,
  verwirfBegehungUndScanneNeu,
} = begehungsAblauf
const { anzahlAusstehend, auswertungszustand, verarbeiteWarteschlange, werteEintragAus } = auswertungsAblauf
const {
  beginneFreigabeErneuerung,
  uebergabeLaeuft,
  uebergabeMeldung,
  uebergabezustand,
  uebergibAnHappyHour,
  verlasseFreigabeErneuerung,
  verarbeiteErneuerteFreigabe,
} = happyHourAblauf

onMounted(async () => {
  window.addEventListener('online', verbindungAktualisiert)
  window.addEventListener('offline', verbindungAktualisiert)
  const statusPruefung = ladeKiSchluesselStatus().then((status) => {
    kiSchluesselStatus.value = status
  })
  await Promise.all([initialisiere(), statusPruefung])
})
onBeforeUnmount(() => {
  window.removeEventListener('online', verbindungAktualisiert)
  window.removeEventListener('offline', verbindungAktualisiert)
})
</script>

<template>
  <KiSchluesselHinweis :zustand="kiSchluesselStatus" />
  <VorgangsFortschritt v-if="auswertungszustand.art === 'laeuft'" />
  <VorgangsFortschritt
    v-else-if="uebergabezustand.art === 'laeuft' && uebergabezustand.vorgang === 'uebergabe'"
    titel="Übergabe an HappyHour läuft"
    hinweis="Protokollpunkte und Bilder werden übertragen. Bitte die App geöffnet lassen."
  />
  <QrCodeStart
    v-if="ansicht === 'scanner'"
    :externe-meldung="scannerMeldung"
    :speicherblockiert="speicherblockiert"
    @erkannt="verarbeiteQrCode"
    @daten-sichern="sichereBlockierteDaten"
    @daten-verwerfen="verwerfeBlockierteDaten"
    @speicher-leeren="leereInternenSpeicher"
  />
  <QrCodeStart
    v-else-if="ansicht === 'freigabe_erneuern'"
    erneuerung
    :externe-meldung="scannerMeldung"
    @erkannt="verarbeiteErneuerteFreigabe"
    @zurueck="verlasseFreigabeErneuerung"
  />
  <main v-else-if="ansicht === 'laden'" class="begehung-shell">
    <section class="loading-card" aria-live="polite">
      <span class="spinner"></span>
      <h1>Begehung wird geladen</h1>
      <p>Die freigegebenen Daten werden aus HappyHour gelesen.</p>
    </section>
  </main>
  <BegehungStart
    v-else-if="ansicht === 'start' && protokollKontext"
    :kontext="protokollKontext"
    :start-laeuft="startLaeuft"
    :start-meldung="startMeldung"
    @zurueck="ansicht = 'scanner'"
    @starten="starteBegehung"
    @speicher-leeren="leereInternenSpeicher"
  />
  <AktiveBegehung
    v-else-if="ansicht === 'aktiv' && begehung"
    :begehung="begehung"
    :online="online"
    @neu="neuerEintrag"
    @bearbeiten="oeffneEintrag"
    @loeschen="loescheEintrag"
    @kontrolle="geheZurKontrolle"
    @speicher-leeren="leereInternenSpeicher"
  />
  <EintragErfassen
    v-else-if="ansicht === 'erfassen' && aktuellerEintrag && begehung"
    :eintrag="aktuellerEintrag"
    :protokoll="begehung.protokoll"
    :online="online"
    :speichern="speichereZwischenstand"
    :auswertung-laeuft="auswertungszustand.art === 'laeuft'"
    @gespeichert="speichereErfassung"
    @abbrechen="ansicht = 'aktiv'"
    @kontrolle="(eintrag) => speichereEintrag(eintrag, 'kontrolle')"
  />
  <OfflineHinweis
    v-else-if="ansicht === 'offline'"
    :anzahl-ausstehend="anzahlAusstehend"
    :online="online"
    :auswertung-laeuft="auswertungszustand.art === 'laeuft'"
    @neu="neuerEintrag"
    @start="ansicht = 'aktiv'"
    @kontrolle="geheZurKontrolle"
    @auswerten="verarbeiteWarteschlange"
  />
  <EintragAuswertung
    v-else-if="ansicht === 'auswertung' && aktuellerEintrag"
    :eintrag="aktuellerEintrag"
    :online="online"
    @speichern="speichereEintrag"
    @neu="(eintrag) => speichereEintrag(eintrag, 'neu')"
    @kontrolle="(eintrag) => speichereEintrag(eintrag, 'kontrolle')"
    @wiederholen="werteEintragAus(aktuellerEintrag.id, true)"
    @zurueck="ansicht = 'aktiv'"
  />
  <BegehungKontrolle
    v-else-if="ansicht === 'kontrolle' && begehung"
    :begehung="begehung"
    :online="online"
    :anzahl-ausstehend="anzahlAusstehend"
    :auswertung-laeuft="auswertungszustand.art === 'laeuft'"
    @zurueck="ansicht = 'aktiv'"
    @bearbeiten="oeffneEintrag"
    @abschliessen="schliesseBegehungAb"
    @auswerten="verarbeiteWarteschlange"
  />
  <BegehungAbschluss
    v-else-if="ansicht === 'abschluss' && begehung"
    :begehung="begehung"
    :online="online"
    :uebergabe-laeuft="uebergabeLaeuft"
    :meldung="uebergabeMeldung"
    :anzahl-ausstehend="anzahlAusstehend"
    :auswertung-laeuft="auswertungszustand.art === 'laeuft'"
    @zurueck="geheZurKontrolle"
    @start="ansicht = 'aktiv'"
    @uebergeben="uebergibAnHappyHour"
    @freigabe-erneuern="beginneFreigabeErneuerung"
    @neu-starten="verwirfBegehungUndScanneNeu"
    @auswerten="verarbeiteWarteschlange"
  />
</template>
