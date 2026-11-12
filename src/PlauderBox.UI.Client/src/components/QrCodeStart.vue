<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { BrowserQrCodeScanner, type QrCodeScanner } from '@/services/qrCodeScanner'
import { verwendeQrCodeStartAblauf } from '@/services/qrCodeStartAblauf'

const eigenschaften = withDefaults(
  defineProps<{
    scanner?: QrCodeScanner
    externeMeldung?: string
    erneuerung?: boolean
  }>(),
  {
    scanner: () => new BrowserQrCodeScanner(),
    externeMeldung: '',
    erneuerung: false,
  },
)

const emit = defineEmits<{
  erkannt: [inhalt: string]
  zurueck: []
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
    <header class="mobile-brand">
      <span class="mobile-brand__mark" aria-hidden="true">P</span>
      <strong>PlauderBox</strong>
    </header>

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

      <button v-if="status !== 'scannt'" class="mobile-primary" type="button" @click="starteScanner">
        Kamera öffnen
      </button>
      <button v-else class="mobile-secondary" type="button" @click="stoppeScanner">Scannen abbrechen</button>
      <form class="manual-code" @submit.prevent="uebernehmeManuellenCode">
        <label for="manueller-code">Freigabecode oder vollständigen Link manuell einfügen</label>
        <input id="manueller-code" v-model="manuellerCode" autocomplete="off" inputmode="text" />
        <button class="mobile-secondary" type="submit" :disabled="!manuellerCode.trim()">Code übernehmen</button>
      </form>
      <button v-if="eigenschaften.erneuerung" class="mobile-secondary" type="button" @click="geheZurueck">
        Zurück zum Abschluss
      </button>

      <p class="scan-hint">
        Der Code berechtigt nur zur freigegebenen Begehung und kann zeitlich begrenzt oder widerrufen sein.
      </p>
    </section>
  </main>
</template>
