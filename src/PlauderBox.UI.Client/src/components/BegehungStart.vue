<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { HappyHourProtokollKontext } from '@/services/happyHourProtokollKontext'
import PlauderBoxMarke from './PlauderBoxMarke.vue'

const eigenschaften = withDefaults(defineProps<{
  kontext: HappyHourProtokollKontext
  startLaeuft: boolean
  startBlockiert?: boolean
  startMeldung: string
  startProbleme?: readonly string[]
}>(), { startBlockiert: false, startProbleme: () => [] })

const emit = defineEmits<{
  zurueck: []
  starten: []
  speicherLeeren: []
}>()

const dialogSichtbar = ref(eigenschaften.startBlockiert)
const dialogTitel = ref<HTMLElement | null>(null)

async function zeigeStartdialog(): Promise<void> {
  dialogSichtbar.value = true
  await nextTick()
  dialogTitel.value?.focus()
}

onMounted(() => {
  if (eigenschaften.startBlockiert) void zeigeStartdialog()
})

watch(
  () => eigenschaften.startBlockiert,
  (blockiert) => {
    if (blockiert) void zeigeStartdialog()
    else dialogSichtbar.value = false
  },
)

function formatiereDatum(wert: string): string {
  const aspNetTreffer = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(wert)
  const datum = aspNetTreffer ? new Date(Number(aspNetTreffer[1])) : new Date(wert)
  return Number.isNaN(datum.getTime()) ? wert : new Intl.DateTimeFormat('de-CH', { dateStyle: 'long' }).format(datum)
}
</script>

<template>
  <div
    v-if="startBlockiert && dialogSichtbar"
    class="startvoraussetzungen-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="startvoraussetzungen-titel"
    aria-describedby="startvoraussetzungen-beschreibung"
  >
    <section class="startvoraussetzungen-dialog__inhalt">
      <p class="eyebrow">Start nicht möglich</p>
      <h2 id="startvoraussetzungen-titel" ref="dialogTitel" tabindex="-1">Angaben in HappyHour ergänzen</h2>
      <p id="startvoraussetzungen-beschreibung">
        Für diese Begehung fehlen folgende Voraussetzungen:
      </p>
      <ul class="startvoraussetzungen-dialog__liste">
        <li v-for="problem in startProbleme" :key="problem">{{ problem }}</li>
      </ul>
      <p>
        Danach in HappyHour die aktive PlauderBox-Freigabe aktualisieren und den QR-Code erneut scannen. Ein Widerruf ist nicht erforderlich.
      </p>
      <button class="mobile-primary" type="button" @click="emit('zurueck')">Anderen QR-Code scannen</button>
      <button class="mobile-secondary" type="button" @click="dialogSichtbar = false">Hinweis schliessen</button>
    </section>
  </div>
  <main class="begehung-shell">
    <header class="mobile-start-header">
      <button class="back-button" type="button" aria-label="Zurück zum QR-Code-Scanner" @click="emit('zurueck')">
        ‹
      </button>
      <PlauderBoxMarke />
    </header>

    <section class="context-card" aria-labelledby="context-titel">
      <p class="eyebrow">Code erfolgreich gelesen</p>
      <h1 id="context-titel">{{ kontext.thema }}</h1>
      <p class="context-card__lead">Die vorbereiteten Daten sind aus HappyHour angekommen.</p>

      <dl class="context-facts">
        <div>
          <dt>Projekt</dt>
          <dd>{{ kontext.projekt.nummer }} · {{ kontext.projekt.bezeichnung }}</dd>
        </div>
        <div v-if="kontext.objekt">
          <dt>Objekt</dt>
          <dd>
            {{ kontext.objekt.bezeichnung }}<span v-if="kontext.objekt.adresse"> · {{ kontext.objekt.adresse }}</span
            ><span v-if="kontext.objekt.gemeinde">, {{ kontext.objekt.gemeinde }}</span>
          </dd>
        </div>
        <div>
          <dt>Protokoll</dt>
          <dd>P{{ String(kontext.protokollNummer).padStart(3, '0') }} · {{ kontext.typ }}</dd>
        </div>
        <div>
          <dt>Datum</dt>
          <dd>{{ formatiereDatum(kontext.datum) }}</dd>
        </div>
        <div>
          <dt>Ort</dt>
          <dd>{{ kontext.ort || 'Nicht angegeben' }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{{ kontext.status }}</dd>
        </div>
        <div>
          <dt>Verantwortlich</dt>
          <dd>{{ kontext.mitarbeiter.name }}</dd>
        </div>
      </dl>

      <section class="context-section" aria-labelledby="verteiler-titel">
        <div class="context-section__head">
          <h2 id="verteiler-titel">Verteiler</h2>
          <span>{{ kontext.verteiler.length }}</span>
        </div>
        <ul v-if="kontext.verteiler.length" class="person-list">
          <li v-for="person in kontext.verteiler" :key="person.id">
            <div>
              <strong>{{ person.person }}</strong>
              <span>{{ person.funktion || person.firma || 'Ohne Funktion' }}</span>
            </div>
            <small>{{
              person.istProtokollschreiber ? 'Protokollschreiber' : person.istTeilnehmer ? 'Teilnehmer' : 'Verteiler'
            }}</small>
          </li>
        </ul>
        <p v-else class="empty-state">Kein Verteiler vorhanden.</p>
      </section>

      <section class="context-section" aria-labelledby="inhalt-titel">
        <div class="context-section__head">
          <h2 id="inhalt-titel">Vorbereitete Inhalte</h2>
          <span>{{ kontext.traktanden.length + kontext.protokollpunkte.length }}</span>
        </div>
        <div class="prepared-content">
          <div>
            <h3>Traktanden</h3>
            <ul v-if="kontext.traktanden.length" class="compact-list">
              <li v-for="traktandum in kontext.traktanden" :key="traktandum">{{ traktandum }}</li>
            </ul>
            <p v-else class="empty-state">Keine Traktanden vorbereitet.</p>
          </div>
          <div>
            <h3>Protokollpunkte</h3>
            <ol v-if="kontext.protokollpunkte.length" class="point-list">
              <li v-for="punkt in kontext.protokollpunkte" :key="punkt.id">
                <strong>{{ punkt.gruppe }} · {{ punkt.thema }}</strong>
                <p>{{ punkt.inhalt }}</p>
                <small v-if="punkt.rechtsverweis">{{ punkt.rechtsverweis }}</small>
              </li>
            </ol>
            <p v-else class="empty-state">Keine Protokollpunkte vorbereitet.</p>
          </div>
        </div>
      </section>

      <p v-if="startMeldung" class="status-banner is-error" role="alert">{{ startMeldung }}</p>
      <button class="mobile-primary" type="button" :disabled="startLaeuft || startBlockiert" @click="emit('starten')">
        {{ startLaeuft ? 'Begehung wird gestartet …' : startBlockiert ? 'Start nicht möglich' : 'Begehung starten' }}
      </button>
      <button v-if="startBlockiert" class="mobile-secondary" type="button" @click="emit('zurueck')">
        Anderen QR-Code scannen
      </button>
      <p class="scan-hint">Die Begehung und alle neuen Einträge werden im internen App-Speicher gesichert.</p>
      <button class="danger-button" type="button" :disabled="startLaeuft" @click="emit('speicherLeeren')">
        Internen App-Speicher leeren
      </button>
    </section>
  </main>
</template>
