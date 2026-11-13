<script setup lang="ts">
import { computed, ref } from 'vue'
import MobileKopf from './MobileKopf.vue'
import type { LokaleBegehung } from '@/services/begehungsSpeicher'
import { sichereBegehungsbilder } from '@/services/bildSicherung'
const props = withDefaults(defineProps<{
  begehung: LokaleBegehung
  online: boolean
  uebergabeLaeuft: boolean
  meldung: string
  anzahlAusstehend?: number
  auswertungLaeuft?: boolean
}>(), { anzahlAusstehend: 0, auswertungLaeuft: false })
defineEmits<{ zurueck: []; uebergeben: []; freigabeErneuern: []; neuStarten: []; auswerten: [] }>()

const bildSicherungLaeuft = ref(false)
const bildSicherungsMeldung = ref('')
const bildAnzahl = computed(() => props.begehung.eintraege.reduce((summe, eintrag) => summe + eintrag.bilder.length, 0))

async function alleBilderSichern(): Promise<void> {
  bildSicherungLaeuft.value = true
  bildSicherungsMeldung.value = ''
  try {
    const ergebnis = await sichereBegehungsbilder(props.begehung)
    bildSicherungsMeldung.value = `${ergebnis.anzahl} einzelne Bild-Downloads wurden gestartet. Falls der Browser fragt, bitte mehrere Downloads einmalig erlauben.`
  } catch (fehler: unknown) {
    bildSicherungsMeldung.value =
      fehler instanceof DOMException && fehler.name === 'AbortError'
        ? 'Die Bildsicherung wurde abgebrochen. Alle Bilder bleiben intern gespeichert.'
        : 'Die Bilder konnten nicht extern gesichert werden. Alle Bilder bleiben intern gespeichert.'
  } finally {
    bildSicherungLaeuft.value = false
  }
}
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf titel="Abschluss" zurueck @zurueck="$emit('zurueck')" />
    <section class="context-card completion-card">
      <span class="completion-icon" aria-hidden="true">✓</span>
      <p class="eyebrow">Kontrolle abgeschlossen</p>
      <h1>
        {{
          begehung.bilderUebertragenAm
            ? 'Punkte und Bilder übergeben'
            : begehung.status === 'an_happyhour_uebertragen'
              ? 'Bilder noch nachliefern'
              : 'Begehung bereit zur Übergabe'
        }}
      </h1>
      <p>
        {{ begehung.eintraege.length }} kontrollierte Einträge sind weiterhin sicher im internen App-Speicher vorhanden.
      </p>
      <section v-if="anzahlAusstehend > 0" class="warning-box">
        <p>{{ anzahlAusstehend }} Einträge warten noch auf die KI-Auswertung.</p>
        <button
          class="mobile-secondary"
          type="button"
          :disabled="!online || auswertungLaeuft"
          @click="$emit('auswerten')"
        >
          {{ auswertungLaeuft ? 'Auswertung läuft …' : online ? 'Alle ausstehenden Einträge auswerten' : 'Warte auf Verbindung' }}
        </button>
      </section>
      <section v-if="bildAnzahl" class="image-backup-card">
        <h2>{{ bildAnzahl }} Bilder zusätzlich sichern</h2>
        <p>Alle Bilder werden mit einer Aktion direkt als einzelne Dateien heruntergeladen. Es wird kein ZIP erstellt.</p>
        <button class="mobile-secondary" type="button" :disabled="bildSicherungLaeuft" @click="alleBilderSichern">
          {{ bildSicherungLaeuft ? 'Bilder werden vorbereitet …' : `Alle ${bildAnzahl} Bilder sichern` }}
        </button>
        <p v-if="bildSicherungsMeldung" class="scan-hint" role="status">{{ bildSicherungsMeldung }}</p>
      </section>
      <button
        class="mobile-primary"
        type="button"
        :disabled="!online || uebergabeLaeuft || !!begehung.bilderUebertragenAm"
        @click="$emit('uebergeben')"
      >
        {{
          uebergabeLaeuft
            ? 'Wird übergeben …'
            : begehung.status === 'an_happyhour_uebertragen'
              ? 'Bilder an HappyHour nachliefern'
              : 'Punkte und Bilder an HappyHour übergeben'
        }}
      </button>
      <p v-if="!online" class="warning-box">
        Aktuell keine Verbindung. Die Übergabe ist wieder möglich, sobald das Gerät online ist.
      </p>
      <p v-if="meldung" :class="begehung.bilderUebertragenAm ? 'saved-banner' : 'warning-box'" role="status">
        {{ meldung }}
      </p>
      <button
        v-if="!begehung.bilderUebertragenAm"
        class="mobile-secondary"
        type="button"
        :disabled="!online || uebergabeLaeuft"
        @click="$emit('freigabeErneuern')"
      >
        Freigabe erneuern
      </button>
      <p class="scan-hint">
        In diesem Schritt werden die kontrollierten Protokollpunkte und alle zugeordneten Bilder an HappyHour übergeben.
        Die lokalen Kopien bleiben bis zum bewussten Verwerfen erhalten.
      </p>
      <button class="mobile-secondary" type="button" @click="$emit('neuStarten')">
        Lokale Begehung verwerfen und neuen Code scannen
      </button>
      <ol class="next-steps">
        <li>Übergabe an HappyHour bewusst auslösen</li>
        <li>Protokoll in HappyHour Korrektur lesen</li>
        <li>Protokoll durch einen Mitarbeiter versenden</li>
      </ol>
    </section>
  </main>
</template>
