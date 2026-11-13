<script setup lang="ts">
import { computed } from 'vue'
import MobileKopf from './MobileKopf.vue'
import { gruppiereEintraege, type LokaleBegehung } from '@/services/begehungsSpeicher'

const props = defineProps<{ begehung: LokaleBegehung; online: boolean }>()
defineEmits<{ neu: []; bearbeiten: [id: string]; loeschen: [id: string]; kontrolle: []; speicherLeeren: [] }>()

const gruppen = computed(() => gruppiereEintraege(props.begehung.eintraege))
const aktuellerEintrag = computed(
  () =>
    props.begehung.eintraege.find((eintrag) => eintrag.id === props.begehung.aktuellerEintragId) ??
    props.begehung.eintraege.at(-1) ??
    null,
)
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf />
    <section class="context-card">
      <div class="view-title-row">
        <div>
          <p class="eyebrow">Aktive Begehung</p>
          <h1>{{ begehung.protokoll.thema }}</h1>
        </div>
        <span :class="online ? 'status-chip is-online' : 'status-chip'">{{ online ? 'Online' : 'Offline' }}</span>
      </div>

      <section class="current-entry">
        <div class="context-section__head">
          <h2>Aktueller Eintrag</h2>
          <span>{{ begehung.eintraege.length }}</span>
        </div>
        <template v-if="aktuellerEintrag">
          <strong>{{ aktuellerEintrag.thema || 'Noch ohne Thema' }}</strong>
          <p>{{ aktuellerEintrag.inhalt || 'Dieser Eintrag wartet auf Auswertung oder Ergänzung.' }}</p>
          <small
            >{{ aktuellerEintrag.gruppe || 'Noch ohne Gruppe' }} · {{ aktuellerEintrag.bilder.length }} Bilder ·
            {{ aktuellerEintrag.status.replaceAll('_', ' ') }}</small
          >
          <div class="button-row">
            <button class="mobile-secondary" type="button" @click="$emit('bearbeiten', aktuellerEintrag.id)">
              Eintrag mutieren
            </button>
            <button class="danger-button" type="button" @click="$emit('loeschen', aktuellerEintrag.id)">
              Eintrag löschen
            </button>
          </div>
        </template>
        <p v-else class="empty-state">Noch kein Eintrag erfasst.</p>
      </section>

      <button class="mobile-primary" type="button" @click="$emit('neu')">Neuer Eintrag</button>

      <section class="context-section entry-accordion" aria-labelledby="alle-eintraege">
        <div class="context-section__head">
          <h2 id="alle-eintraege">Alle Einträge</h2>
          <span>{{ begehung.eintraege.length }}</span>
        </div>
        <p v-if="!gruppen.length" class="empty-state">Die gruppierte Übersicht erscheint nach dem ersten Eintrag.</p>
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
              eintrag.inhalt || 'Noch nicht ausgewertet'
            }}</small>
          </button>
        </details>
      </section>

      <button class="mobile-secondary" type="button" @click="$emit('kontrolle')">
        Begehung beenden / zur Kontrolle
      </button>
      <button class="danger-button" type="button" @click="$emit('speicherLeeren')">
        Internen App-Speicher leeren
      </button>
    </section>
  </main>
</template>
