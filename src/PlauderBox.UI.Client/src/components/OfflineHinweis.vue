<script setup lang="ts">
import MobileKopf from './MobileKopf.vue'
withDefaults(defineProps<{ anzahlAusstehend: number; online?: boolean; auswertungLaeuft?: boolean }>(), {
  online: false,
  auswertungLaeuft: false,
})
defineEmits<{ neu: []; start: []; kontrolle: []; auswerten: [] }>()
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf
      navigation
      zurueck
      @zurueck="$emit('start')"
      @start="$emit('start')"
      @beenden="$emit('kontrolle')"
    />
    <section class="context-card offline-card">
      <span class="offline-icon" aria-hidden="true">⌁</span>
      <p class="eyebrow">Lokal gesichert</p>
      <h1>Aktuell keine Verbindung</h1>
      <p v-if="anzahlAusstehend > 0">
        {{ anzahlAusstehend }} {{ anzahlAusstehend === 1 ? 'Eintrag wurde' : 'Einträge wurden' }} mit einer
        Audioaufnahme im internen App-Speicher vorgemerkt. Die Auswertung startet automatisch, sobald die Verbindung
        zurück ist.
      </p>
      <p v-else>Die lokalen Änderungen sind gespeichert. Es wartet keine Audioaufnahme auf eine Auswertung.</p>
      <button
        v-if="anzahlAusstehend > 0"
        class="mobile-primary"
        type="button"
        :disabled="!online || auswertungLaeuft"
        @click="$emit('auswerten')"
      >
        {{ auswertungLaeuft ? 'Auswertung läuft …' : online ? 'Alle ausstehenden Einträge auswerten' : 'Warte auf Verbindung' }}
      </button>
      <button class="mobile-primary" type="button" @click="$emit('neu')">Neuer Eintrag</button>
      <button class="mobile-secondary" type="button" @click="$emit('kontrolle')">Gehe zu Kontrolle</button>
    </section>
  </main>
</template>
