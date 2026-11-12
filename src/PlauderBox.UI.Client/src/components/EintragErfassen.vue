<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MobileKopf from './MobileKopf.vue'
import { eindeutigeVerteileroptionen, type BegehungEintrag, type HappyHourProtokollKontext, type LokaleAudioaufnahme } from '@/services/begehungsSpeicher'
import { kopiereEintrag, setzeAudioaufnahme, speichereEntwurf, verwerfeAudioaufnahme } from '@/services/eintragErfassungsAblauf'
import { pruefeBildauswahl } from '@/services/bildSicherung'

const props = defineProps<{ eintrag: BegehungEintrag; protokoll: HappyHourProtokollKontext; online: boolean; speichern: (eintrag: BegehungEintrag) => Promise<void> }>()
const emit = defineEmits<{ zwischenspeichern: [eintrag: BegehungEintrag]; gespeichert: [eintrag: BegehungEintrag]; abbrechen: [] }>()

const entwurf = ref<BegehungEintrag>(kopiereEintrag(props.eintrag))
const aufnahmeLaeuft = ref(false)
const dauerSekunden = ref(0)
const meldung = ref('')
const speicherstatus = ref<'bereit' | 'speichert' | 'gespeichert' | 'fehler'>(props.eintrag.audio || props.eintrag.status === 'ausgewertet' ? 'gespeichert' : 'bereit')
const bildUrls = ref<Record<string, string>>({})
let recorder: MediaRecorder | null = null
let stream: MediaStream | null = null
let teile: Blob[] = []
let timer = 0
let gestartetAm = 0

watch(() => props.eintrag.id, () => { entwurf.value = kopiereEintrag(props.eintrag); speicherstatus.value = props.eintrag.audio || props.eintrag.status === 'ausgewertet' ? 'gespeichert' : 'bereit'; aktualisiereBildUrls() })
watch(() => entwurf.value.bilder, aktualisiereBildUrls, { immediate: true, deep: true })
onBeforeUnmount(() => { stoppeStream(); Object.values(bildUrls.value).forEach(URL.revokeObjectURL) })

const zeit = computed(() => `${String(Math.floor(dauerSekunden.value / 60)).padStart(2, '0')}:${String(dauerSekunden.value % 60).padStart(2, '0')}`)
const verteileroptionen = computed(() => eindeutigeVerteileroptionen(props.protokoll))

function aktualisiereBildUrls(): void {
  Object.values(bildUrls.value).forEach(URL.revokeObjectURL)
  bildUrls.value = Object.fromEntries(entwurf.value.bilder.map((bild) => [bild.id, URL.createObjectURL(bild.bild)]))
}

async function uebernehmeBilder(ereignis: Event): Promise<void> {
  const eingabe = ereignis.target as HTMLInputElement
  const auswahl = pruefeBildauswahl(Array.from(eingabe.files ?? []))
  entwurf.value.bilder.push(...auswahl.bilder)
  eingabe.value = ''
  if (!auswahl.bilder.length) {
    meldung.value = auswahl.fehler.join(' ')
    return
  }
  const gespeichert = await zwischenspeichern()
  if (gespeichert && auswahl.fehler.length) meldung.value = auswahl.fehler.join(' ')
}

async function loescheBild(id: string): Promise<void> {
  if (window.confirm('Dieses Bild wirklich aus dem internen App-Speicher entfernen?')) {
    const vorher = [...entwurf.value.bilder]
    entwurf.value.bilder = entwurf.value.bilder.filter((bild) => bild.id !== id)
    if (!await zwischenspeichern()) entwurf.value.bilder = vorher
  }
}

function medientyp(): string {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((typ) => MediaRecorder.isTypeSupported(typ)) ?? ''
}

async function starteAufnahme(): Promise<void> {
  meldung.value = ''
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { meldung.value = 'Dieser Browser unterstützt die Mikrofonaufnahme nicht.'; return }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const typ = medientyp()
    recorder = typ ? new MediaRecorder(stream, { mimeType: typ }) : new MediaRecorder(stream)
    teile = []
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) teile.push(event.data) })
    recorder.addEventListener('stop', () => speichereAufnahme(recorder?.mimeType || typ || 'audio/webm'), { once: true })
    recorder.start(500)
    aufnahmeLaeuft.value = true
    gestartetAm = Date.now()
    dauerSekunden.value = 0
    timer = window.setInterval(() => { dauerSekunden.value = Math.floor((Date.now() - gestartetAm) / 1000) }, 250)
  } catch (fehler: unknown) {
    meldung.value = fehler instanceof DOMException && fehler.name === 'NotAllowedError'
      ? 'Der Mikrofonzugriff wurde nicht erlaubt.' : 'Die Mikrofonaufnahme konnte nicht gestartet werden.'
    stoppeStream()
  }
}

function stoppeAufnahme(): void {
  if (!recorder || !aufnahmeLaeuft.value) return
  aufnahmeLaeuft.value = false
  recorder.stop()
  stoppeStream()
}

function stoppeStream(): void {
  window.clearInterval(timer)
  stream?.getTracks().forEach((spur) => spur.stop())
  stream = null
}

async function speichereAufnahme(typ: string): Promise<void> {
  const audio = new Blob(teile, { type: typ })
  teile = []
  if (!audio.size) { meldung.value = 'Die Aufnahme war leer.'; return }
  const endung = typ.includes('mp4') ? 'mp4' : typ.includes('ogg') ? 'ogg' : 'webm'
  const aufnahme: LokaleAudioaufnahme = {
    dateiname: `aufnahme-${entwurf.value.id}.${endung}`,
    medientyp: typ,
    groesse: audio.size,
    dauerSekunden: Math.max(1, dauerSekunden.value),
    audio,
  }
  setzeAudioaufnahme(entwurf.value, aufnahme)
  await zwischenspeichern()
}

async function verwerfeAufnahme(): Promise<void> {
  if (window.confirm('Diese Aufnahme wirklich verwerfen? Bilder bleiben erhalten.')) {
    const vorherigeDauer = dauerSekunden.value
    speicherstatus.value = 'speichert'
    try {
      await verwerfeAudioaufnahme(entwurf.value, props.speichern)
      dauerSekunden.value = 0
      speicherstatus.value = 'gespeichert'
      meldung.value = ''
    } catch (fehler: unknown) {
      dauerSekunden.value = vorherigeDauer
      zeigeSpeicherfehler(fehler)
    }
  }
}

async function zwischenspeichern(): Promise<boolean> {
  speicherstatus.value = 'speichert'
  try {
    await speichereEntwurf(entwurf.value, props.speichern)
    speicherstatus.value = 'gespeichert'
    meldung.value = ''
    return true
  } catch (fehler: unknown) {
    zeigeSpeicherfehler(fehler)
    return false
  }
}

function zeigeSpeicherfehler(fehler: unknown): void {
  speicherstatus.value = 'fehler'
  meldung.value = fehler instanceof DOMException && fehler.name === 'QuotaExceededError'
    ? 'Der interne App-Speicher ist voll. Bitte keine App-Daten löschen und Speicherplatz freigeben.'
    : 'Die lokale Sicherung ist fehlgeschlagen. Die App bitte geöffnet lassen und erneut versuchen.'
}

function speichern(): void {
  if (!entwurf.value.protokollpunktArtId) {
    meldung.value = 'Bitte die Art des Protokollpunkts wählen.'
    return
  }
  if (!entwurf.value.projektAnsprechpartnerId) {
    meldung.value = 'Bitte die zuständige Person wählen.'
    return
  }
  if (!entwurf.value.audio && !entwurf.value.thema.trim() && !entwurf.value.inhalt.trim()) {
    meldung.value = 'Bitte zuerst eine Aufnahme erstellen oder den vorhandenen Eintrag bearbeiten.'
    return
  }
  entwurf.value.aktualisiertAm = new Date().toISOString()
  emit('gespeichert', kopiereEintrag(entwurf.value))
}
</script>

<template>
  <main class="begehung-shell">
    <MobileKopf titel="Neuer Eintrag" zurueck @zurueck="emit('abbrechen')" />
    <section class="context-card capture-card">
      <section class="capture-block assignment-block">
        <p class="eyebrow">Zuordnung</p><h1>Wo gehört die Feststellung hin?</h1>
        <label><span>Traktandum <small>optional</small></span><select v-model="entwurf.traktandum" @change="zwischenspeichern"><option value="">Kein Traktandum gewählt</option><option v-for="traktandum in protokoll.traktanden" :key="traktandum" :value="traktandum">{{ traktandum }}</option></select></label>
        <label><span>Protokollpunkt</span><input :value="entwurf.vorbereiteterProtokollpunktId === null ? 'Neuer Protokollpunkt' : 'Vorbereiteter Protokollpunkt'" disabled></label>
        <label><span>Art des Protokollpunkts</span><select v-model="entwurf.protokollpunktArtId" :disabled="entwurf.vorbereiteterProtokollpunktId !== null" @change="zwischenspeichern"><option :value="null">Bitte wählen</option><option v-for="art in (protokoll.protokollpunktArten ?? [])" :key="art.id" :value="art.id">{{ art.bezeichnung }}</option></select></label>
        <label><span>Wer</span><select v-model="entwurf.projektAnsprechpartnerId" @change="zwischenspeichern"><option :value="null">Bitte wählen</option><option v-for="person in verteileroptionen" :key="person.projektAnsprechpartnerId" :value="person.projektAnsprechpartnerId">{{ person.person }}{{ person.funktion ? ` · ${person.funktion}` : '' }}</option></select></label>
        <p class="scan-hint">Ein vorbereiteter Punkt behält seine HappyHour-Protokollpunktart. Für einen neuen Punkt wird die Art bewusst gewählt.</p>
      </section>
      <section class="capture-block">
        <div class="context-section__head"><div><p class="eyebrow">Bilder</p><h1>Situation festhalten</h1></div><span>{{ entwurf.bilder.length }}</span></div>
        <div v-if="entwurf.bilder.length" class="capture-images">
          <figure v-for="bild in entwurf.bilder" :key="bild.id"><img :src="bildUrls[bild.id]" :alt="bild.dateiname"><button type="button" aria-label="Bild löschen" @click="loescheBild(bild.id)">×</button></figure>
        </div>
        <div class="image-actions">
          <label class="image-action">Foto aufnehmen<input type="file" accept="image/*" capture="environment" @change="uebernehmeBilder"></label>
          <label class="image-action image-action--secondary">Aus Galerie wählen<input type="file" accept="image/*" multiple @change="uebernehmeBilder"></label>
        </div>
      </section>

      <section class="capture-block audio-guide">
        <div><h2>Diktat</h2><p>Erwähne:</p><ul><li>Gruppe</li><li>Thema</li><li>Inhalt (Um was geht es?)</li><li>allenfalls Rechtsverweis</li></ul></div>
        <div class="audio-action"><button class="round-record" type="button" :class="{ recording: aufnahmeLaeuft }" :disabled="Boolean(entwurf.audio)" @click="aufnahmeLaeuft ? stoppeAufnahme() : starteAufnahme()"><span aria-hidden="true">●</span><small>{{ aufnahmeLaeuft ? 'Stoppen' : 'Aufnehmen' }}</small></button><strong>{{ zeit }}</strong></div>
      </section>

      <section class="capture-block review-form">
        <p class="eyebrow">Kontrollierter Inhalt</p><h2>Eintrag ergänzen oder korrigieren</h2>
        <label><span>Gruppe</span><input v-model.trim="entwurf.gruppe" maxlength="250" @change="zwischenspeichern"></label>
        <label><span>Thema</span><input v-model.trim="entwurf.thema" maxlength="250" @change="zwischenspeichern"></label>
        <label><span>Inhalt (Um was geht es?)</span><textarea v-model="entwurf.inhalt" rows="6" @change="zwischenspeichern"></textarea></label>
        <label><span>Rechtsverweis <small>optional</small></span><input v-model.trim="entwurf.rechtsverweis" maxlength="250" @change="zwischenspeichern"></label>
      </section>

      <div v-if="entwurf.audio && speicherstatus === 'gespeichert'" class="saved-banner">✓ Aufnahme intern gespeichert · {{ Math.ceil(entwurf.audio.groesse / 1024) }} KB</div>
      <div v-else-if="speicherstatus === 'speichert'" class="saved-banner">Aufnahme und Bilder werden intern gespeichert …</div>
      <button class="mobile-primary" type="button" :disabled="aufnahmeLaeuft || speicherstatus !== 'gespeichert'" @click="speichern">{{ entwurf.audio ? (online ? 'Diktat auswerten' : 'Lokal sichern') : 'Änderungen übernehmen' }}</button>
      <button v-if="entwurf.audio" class="mobile-secondary" type="button" @click="verwerfeAufnahme">Aufnahme verwerfen</button>
      <p v-if="meldung" class="scan-status scan-status--error" role="alert">{{ meldung }}</p>
      <button v-if="speicherstatus === 'fehler'" class="mobile-secondary" type="button" @click="zwischenspeichern">Lokale Sicherung erneut versuchen</button>
      <p class="external-transfer-note">{{ online ? 'Beim Auswerten wird die Audioaufnahme über den PlauderBox-Server an OpenAI zur Transkription und Strukturierung übertragen.' : 'Offline findet keine externe Übertragung statt. Audio und Bilder bleiben im internen App-Speicher.' }}</p>
      <p class="scan-hint">Gruppe → Thema → Inhalt → allenfalls Rechtsverweis</p>
    </section>
  </main>
</template>
