<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { BrowserQrCodeScanner, type QrCodeScanner } from '@/services/qrCodeScanner'
import { verwendeQrCodeStartAblauf } from '@/services/qrCodeStartAblauf'
import PlauderBoxMarke from './PlauderBoxMarke.vue'

const eigenschaften = withDefaults(
  defineProps<{
    scanner?: QrCodeScanner
    externeMeldung?: string
    erneuerung?: boolean
    speicherblockiert?: boolean
  }>(),
  {
    scanner: () => new BrowserQrCodeScanner(),
    externeMeldung: '',
    erneuerung: false,
    speicherblockiert: false,
  },
)

const emit = defineEmits<{
  erkannt: [inhalt: string]
  zurueck: []
  datenSichern: []
  datenVerwerfen: []
  speicherLeeren: []
}>()
const manuellerCode = ref('')

const { setzeVideo, status, sichtbareMeldung, starteScanner, stoppeScanner } = verwendeQrCodeStartAblauf(
  eigenschaften.scanner,
  () => eigenschaften.externeMeldung,
  (inhalt) => emit('erkannt', inhalt),
)

onBeforeUnmount(() => eigenschaften.scanner.stoppen())

function geheZurueck(): void {
  stoppeScanner()
  emit('zurueck')
}

function uebernehmeManuellenCode(): void {
  const inhalt = manuellerCode.value.trim()
  if (inhalt) emit('erkannt', inhalt)
}
</script>

<template>
  <main class="begehung-shell">
    <PlauderBoxMarke />

    <section class="scan-card" aria-labelledby="scan-titel">
      <p class="eyebrow">{{ eigenschaften.erneuerung ? 'Bestehende Begehung behalten' : 'Begehung öffnen' }}</p>
      <h1 id="scan-titel">{{ eigenschaften.erneuerung ? 'Freigabe erneuern' : 'Code scannen' }}</h1>
      <p class="scan-card__intro">
        {{
          eigenschaften.erneuerung
            ? 'Scanne eine neue Freigabe für dasselbe HappyHour-Protokoll. Alle lokalen Einträge und Bilder bleiben erhalten.'
            : 'Scanne den QR-Code des vorbereiteten HappyHour-Protokolls.'
        }}
      </p>

      <div class="scan-preview" :class="{ 'scan-preview--active': status === 'scannt' }">
        <video :ref="setzeVideo" muted playsinline aria-label="Kamerabild zum Scannen des QR-Codes"></video>
        <div class="scan-frame" aria-hidden="true"><span></span></div>
        <div v-if="status !== 'scannt'" class="scan-placeholder" aria-hidden="true">
          <span class="scan-placeholder__icon"></span>
          <small>Kamera ist noch nicht aktiv</small>
        </div>
      </div>

      <p
        v-if="sichtbareMeldung"
        class="scan-status"
        :class="{ 'scan-status--error': status === 'fehler' || !!eigenschaften.externeMeldung }"
        :role="status === 'fehler' || eigenschaften.externeMeldung ? 'alert' : 'status'"
      >
        {{ sichtbareMeldung }}
      </p>

      <button
        v-if="status !== 'scannt'"
        class="mobile-primary"
        type="button"
        :disabled="eigenschaften.speicherblockiert"
        @click="starteScanner"
      >
        Kamera öffnen
      </button>
      <button v-else class="mobile-secondary" type="button" @click="stoppeScanner">Scannen abbrechen</button>
      <form class="manual-code" @submit.prevent="uebernehmeManuellenCode">
        <label for="manueller-code">Freigabecode oder vollständigen Link manuell einfügen</label>
        <input
          id="manueller-code"
          v-model="manuellerCode"
          autocomplete="off"
          inputmode="text"
          :disabled="eigenschaften.speicherblockiert"
        />
        <button
          class="mobile-secondary"
          type="submit"
          :disabled="eigenschaften.speicherblockiert || !manuellerCode.trim()"
        >
          Code übernehmen
        </button>
      </form>
      <section v-if="eigenschaften.speicherblockiert" class="warning-box" aria-label="Lokale Datenrettung">
        <p>
          Eine lokal gespeicherte Begehung ist unlesbar. Vor einem Neustart müssen die Rohdaten gesichert oder bewusst
          verworfen werden.
        </p>
        <button class="mobile-secondary" type="button" @click="emit('datenSichern')">
          Rohdaten und Medien sichern
        </button>
        <button class="danger-button" type="button" @click="emit('datenVerwerfen')">
          Unlesbare Daten endgültig verwerfen
        </button>
      </section>
      <button v-if="eigenschaften.erneuerung" class="mobile-secondary" type="button" @click="geheZurueck">
        Zurück zum Abschluss
      </button>
      <button v-else class="danger-button" type="button" @click="emit('speicherLeeren')">
        Internen App-Speicher leeren
      </button>

      <p class="scan-hint">
        Der Code berechtigt nur zur freigegebenen Begehung und kann zeitlich begrenzt oder widerrufen sein.
      </p>
    </section>
  </main>
</template>
