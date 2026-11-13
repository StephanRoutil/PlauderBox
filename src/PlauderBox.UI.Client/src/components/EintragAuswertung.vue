<script setup lang="ts">
import { ref, watch } from 'vue'
import MobileKopf from './MobileKopf.vue'
import type { BegehungEintrag } from '@/services/begehungsSpeicher'

const props = defineProps<{ eintrag: BegehungEintrag; online: boolean }>()
const emit = defineEmits<{
  speichern: [eintrag: BegehungEintrag]
  neu: [eintrag: BegehungEintrag]
  kontrolle: [eintrag: BegehungEintrag]
  wiederholen: []
  zurueck: []
}>()
const entwurf = ref({ ...props.eintrag, bilder: [...props.eintrag.bilder] })
watch(
  () => props.eintrag,
  (wert) => {
    entwurf.value = { ...wert, bilder: [...wert.bilder] }
  },
  { deep: true },
)
function wert(): BegehungEintrag {
  return { ...entwurf.value, bilder: [...entwurf.value.bilder], aktualisiertAm: new Date().toISOString() }
}
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf
      titel="Auswertung"
      navigation
      zurueck
      @zurueck="emit('zurueck')"
      @start="emit('speichern', wert())"
      @beenden="emit('kontrolle', wert())"
    />
    <section class="context-card">
      <p class="eyebrow">Übermittelter Text</p>
      <h1>Eintrag kontrollieren</h1>
      <blockquote v-if="entwurf.transkript" class="transcript">{{ entwurf.transkript }}</blockquote>
      <p v-if="entwurf.status === 'fehler'" class="scan-status scan-status--error">{{ entwurf.fehler }}</p>
      <p
        v-else-if="entwurf.status === 'wartet_auf_auswertung' || entwurf.status === 'wird_ausgewertet'"
        class="saved-banner"
      >
        {{ entwurf.status === 'wird_ausgewertet' ? 'Auswertung läuft …' : 'Noch nicht ausgewertet · lokal gesichert' }}
      </p>
      <button
        v-if="['fehler', 'wartet_auf_auswertung'].includes(entwurf.status) && entwurf.audio"
        class="mobile-secondary"
        type="button"
        :disabled="!online"
        @click="emit('wiederholen')"
      >
        {{ online ? 'Auswertung erneut versuchen' : 'Warte auf Verbindung' }}
      </button>
      <form class="review-form" @submit.prevent="emit('speichern', wert())">
        <label><span>Gruppe</span><input v-model.trim="entwurf.gruppe" maxlength="250" /></label>
        <label><span>Thema</span><input v-model.trim="entwurf.thema" maxlength="250" /></label>
        <label><span>Inhalt (Um was geht es?)</span><textarea v-model="entwurf.inhalt" rows="6"></textarea></label>
        <label
          ><span>Rechtsverweis <small>optional</small></span
          ><input v-model.trim="entwurf.rechtsverweis" maxlength="250"
        /></label>
        <button class="mobile-primary" type="submit">Punkt übernehmen</button>
        <div class="button-row">
          <button class="mobile-secondary" type="button" @click="emit('neu', wert())">Neuer Eintrag</button
          ><button class="mobile-secondary" type="button" @click="emit('kontrolle', wert())">Zur Kontrolle</button>
        </div>
      </form>
    </section>
  </main>
</template>
