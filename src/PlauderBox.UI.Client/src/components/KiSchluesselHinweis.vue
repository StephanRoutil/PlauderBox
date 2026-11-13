<script setup lang="ts">
import type { KiSchluesselStatusZustand } from '@/services/kiSchluesselStatus'

defineProps<{ zustand: KiSchluesselStatusZustand }>()
</script>

<template>
  <aside
    v-if="zustand.art !== 'bereit'"
    class="ki-schluessel-hinweis"
    :class="`ki-schluessel-hinweis--${zustand.art}`"
    :role="zustand.art === 'laeuft' ? 'status' : 'alert'"
    aria-live="polite"
  >
    <span v-if="zustand.art === 'laeuft'" class="spinner" aria-hidden="true"></span>
    <strong v-if="zustand.art === 'laeuft'">KI-Status wird geprüft …</strong>
    <strong v-else-if="zustand.art === 'warnung'">KI-Schlüssel erneuern</strong>
    <strong v-else-if="zustand.art === 'gesperrt'">KI-Auswertung nicht verfügbar</strong>
    <strong v-else>KI-Status nicht verfügbar</strong>
    <span v-if="zustand.art !== 'laeuft'">{{ zustand.meldung }}</span>
  </aside>
</template>
