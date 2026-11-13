<script setup lang="ts">
import type { HappyHourProtokollKontext } from '@/services/happyHourProtokollKontext'
import PlauderBoxMarke from './PlauderBoxMarke.vue'

withDefaults(defineProps<{
  kontext: HappyHourProtokollKontext
  startLaeuft: boolean
  startBlockiert?: boolean
  startMeldung: string
}>(), { startBlockiert: false })

const emit = defineEmits<{
  zurueck: []
  starten: []
  speicherLeeren: []
}>()

function formatiereDatum(wert: string): string {
  const aspNetTreffer = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(wert)
  const datum = aspNetTreffer ? new Date(Number(aspNetTreffer[1])) : new Date(wert)
  return Number.isNaN(datum.getTime()) ? wert : new Intl.DateTimeFormat('de-CH', { dateStyle: 'long' }).format(datum)
}
</script>

<template>
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
