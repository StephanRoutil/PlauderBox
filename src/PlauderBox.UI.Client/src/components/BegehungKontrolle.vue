<script setup lang="ts">
import { computed } from 'vue'
import MobileKopf from './MobileKopf.vue'
import { gruppiereEintraege, istEintragUnvollstaendig, type LokaleBegehung } from '@/services/begehungsSpeicher'
const props = withDefaults(defineProps<{
  begehung: LokaleBegehung
  online?: boolean
  anzahlAusstehend?: number
  auswertungLaeuft?: boolean
}>(), { online: false, anzahlAusstehend: 0, auswertungLaeuft: false })
defineEmits<{ zurueck: []; bearbeiten: [id: string]; abschliessen: []; auswerten: [] }>()
const gruppen = computed(() => gruppiereEintraege(props.begehung.eintraege))
const bilder = computed(() => props.begehung.eintraege.reduce((summe, eintrag) => summe + eintrag.bilder.length, 0))
const offen = computed(
  () =>
    props.begehung.eintraege.filter((eintrag) => eintrag.status !== 'ausgewertet' || istEintragUnvollstaendig(eintrag))
      .length,
)
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf titel="Kontrolle" zurueck @zurueck="$emit('zurueck')" />
    <section class="context-card">
      <p class="eyebrow">Vor dem Abschluss</p>
      <h1>Begehung kontrollieren</h1>
      <div class="control-stats">
        <div>
          <strong>{{ begehung.eintraege.length }}</strong><span>Einträge</span>
        </div>
        <div>
          <strong>{{ bilder }}</strong><span>Bilder</span>
        </div>
        <div :class="{ warning: offen }">
          <strong>{{ offen }}</strong><span>offen</span>
        </div>
      </div>
      <p v-if="offen" class="warning-box">
        Noch {{ offen }} Einträge sind nicht ausgewertet oder unvollständig. Du kannst sie öffnen und korrigieren.
      </p>
      <button
        v-if="anzahlAusstehend > 0"
        class="mobile-primary"
        type="button"
        :disabled="!online || auswertungLaeuft"
        @click="$emit('auswerten')"
      >
        {{ auswertungLaeuft ? 'Auswertung läuft …' : online ? 'Alle ausstehenden Einträge auswerten' : 'Warte auf Verbindung' }}
      </button>
      <section class="entry-accordion">
        <details v-for="gruppe in gruppen" :key="gruppe.gruppe" open>
          <summary>
            {{ gruppe.gruppe }} <span>{{ gruppe.eintraege.length }}</span>
          </summary>
          <button
            v-for="eintrag in gruppe.eintraege"
            :key="eintrag.id"
            type="button"
            class="entry-list-item"
            @click="$emit('bearbeiten', eintrag.id)"
          >
            <strong>{{ eintrag.thema || 'Noch ohne Thema' }}</strong><small>{{
              eintrag.inhalt || eintrag.status.replaceAll('_', ' ')
            }}</small>
          </button>
        </details>
      </section>
      <button
        class="mobile-primary"
        type="button"
        :disabled="!begehung.eintraege.length || Boolean(offen)"
        @click="$emit('abschliessen')"
      >
        Begehung abschliessen
      </button>
      <p v-if="offen" class="scan-hint">
        Der Abschluss wird erst aktiv, wenn alle Einträge ausgewertet und vollständig sind.
      </p>
    </section>
  </main>
</template>
