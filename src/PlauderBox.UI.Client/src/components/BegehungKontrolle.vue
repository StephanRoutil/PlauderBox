<script setup lang="ts">
import { computed } from 'vue'
import MobileKopf from './MobileKopf.vue'
import {
  gruppiereEintraege,
  istEintragUnvollstaendig,
  type BegehungEintrag,
  type LokaleBegehung,
} from '@/services/begehungsSpeicher'
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

function ermittleOffenGrund(eintrag: BegehungEintrag): string {
  const gruende: string[] = []
  if (eintrag.status === 'fehler') gruende.push('Auswertung fehlgeschlagen')
  else if (eintrag.status !== 'ausgewertet') gruende.push('Noch nicht ausgewertet')
  if (istEintragUnvollstaendig(eintrag)) gruende.push('Angaben unvollständig')
  return gruende.join(' · ')
}
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf
      titel="Kontrolle"
      navigation
      zurueck
      beenden-aktiv
      @zurueck="$emit('zurueck')"
      @start="$emit('zurueck')"
    />
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
            :class="{ 'entry-list-item--offen': ermittleOffenGrund(eintrag) }"
            :data-offen="ermittleOffenGrund(eintrag) ? 'true' : undefined"
            @click="$emit('bearbeiten', eintrag.id)"
          >
            <span v-if="ermittleOffenGrund(eintrag)" class="entry-list-item__status">
              <span aria-hidden="true">!</span>{{ ermittleOffenGrund(eintrag) }}
            </span>
            <strong>{{ eintrag.thema || 'Noch ohne Thema' }}</strong><small>{{
              eintrag.inhalt || eintrag.status.replaceAll('_', ' ')
            }}</small>
            <span v-if="ermittleOffenGrund(eintrag)" class="entry-list-item__aktion">
              Öffnen und korrigieren →
            </span>
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
