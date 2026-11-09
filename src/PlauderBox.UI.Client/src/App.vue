<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ladeInterneAufnahme,
  loescheInterneAufnahme,
  speichereEinzelneAufnahme,
  type InterneAufnahme,
} from '@/services/internerAufnahmespeicher'

interface ServerStatus {
  kiBereit: boolean
  modell: string
  hinweis?: string | null
}

interface Transkriptionsantwort {
  text?: string
  modell?: string
  detail?: string
}

const visualizer = ref<HTMLCanvasElement | null>(null)
const ausstehendeAufnahme = ref<InterneAufnahme | null>(null)
const aufnahmeLaeuft = ref(false)
const wirdVerarbeitet = ref(false)
const online = ref(navigator.onLine)
const statusText = ref('Bereit')
const verstricheneSekunden = ref(0)
const meldung = ref('')
const transkript = ref('')
const modell = ref('')
const verbindungsstatus = ref('KI-Anbindung wird geprüft …')
const kiBereit = ref(false)

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrame = 0
let timerIntervall = 0
let aufgenommenSeit = 0
let audioTeile: Blob[] = []

const aufnahmeKnopfText = computed(() => aufnahmeLaeuft.value ? 'Aufnahme stoppen' : 'Aufnahme starten')
const zeitText = computed(() => formatiereDauer(verstricheneSekunden.value))
const aufnahmeGesperrt = computed(() => wirdVerarbeitet.value || (!aufnahmeLaeuft.value && ausstehendeAufnahme.value !== null))

function formatiereDauer(sekunden: number): string {
  const minuten = Math.floor(sekunden / 60)
  return `${String(minuten).padStart(2, '0')}:${String(sekunden % 60).padStart(2, '0')}`
}

function formatiereGroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatiereZeitpunkt(isoZeit: string): string {
  return new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(isoZeit))
}

function unterstuetzterMedientyp(): string {
  return [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ].find((typ) => MediaRecorder.isTypeSupported(typ)) ?? ''
}

function dateiendung(medientyp: string): string {
  if (medientyp.includes('mp4')) return 'mp4'
  if (medientyp.includes('ogg')) return 'ogg'
  return 'webm'
}

function zeichneRuhezustand(): void {
  const canvas = visualizer.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.beginPath()
  context.strokeStyle = '#ddd7cf'
  context.lineWidth = 2
  for (let x = 0; x < canvas.width; x += 9) {
    const hoehe = 8 + Math.sin(x * 0.045) * 5
    context.moveTo(x, canvas.height / 2 - hoehe / 2)
    context.lineTo(x, canvas.height / 2 + hoehe / 2)
  }
  context.stroke()
}

function zeichneAudio(): void {
  const canvas = visualizer.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context || !analyser) return
  const daten = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(daten)
  context.clearRect(0, 0, canvas.width, canvas.height)
  const anzahlBalken = 58
  const abstand = 4
  const balkenbreite = (canvas.width - abstand * (anzahlBalken - 1)) / anzahlBalken
  for (let index = 0; index < anzahlBalken; index += 1) {
    const wert = daten[Math.floor(index / anzahlBalken * daten.length)] / 255
    const balkenhoehe = Math.max(5, wert * canvas.height * 0.78)
    const x = index * (balkenbreite + abstand)
    const verlauf = context.createLinearGradient(0, canvas.height / 2 - balkenhoehe / 2, 0, canvas.height / 2 + balkenhoehe / 2)
    verlauf.addColorStop(0, '#e44a32')
    verlauf.addColorStop(1, '#f3a48f')
    context.fillStyle = verlauf
    context.fillRect(x, canvas.height / 2 - balkenhoehe / 2, balkenbreite, balkenhoehe)
  }
  animationFrame = requestAnimationFrame(zeichneAudio)
}

function schliesseMedien(): void {
  window.clearInterval(timerIntervall)
  cancelAnimationFrame(animationFrame)
  mediaStream?.getTracks().forEach((spur) => spur.stop())
  void audioContext?.close()
  mediaStream = null
  audioContext = null
  analyser = null
  zeichneRuhezustand()
}

async function starteAufnahme(): Promise<void> {
  meldung.value = ''
  transkript.value = ''
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    meldung.value = 'Dieser Browser unterstützt die benötigte Mikrofonaufnahme nicht.'
    return
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    const medientyp = unterstuetzterMedientyp()
    mediaRecorder = medientyp
      ? new MediaRecorder(mediaStream, { mimeType: medientyp })
      : new MediaRecorder(mediaStream)
    audioTeile = []
    mediaRecorder.addEventListener('dataavailable', (ereignis) => {
      if (ereignis.data.size > 0) audioTeile.push(ereignis.data)
    })
    mediaRecorder.addEventListener('stop', () => {
      void speichereAufnahme(mediaRecorder?.mimeType || medientyp || 'audio/webm')
    }, { once: true })

    audioContext = new AudioContext()
    const quelle = audioContext.createMediaStreamSource(mediaStream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    quelle.connect(analyser)

    mediaRecorder.start(500)
    aufnahmeLaeuft.value = true
    aufgenommenSeit = Date.now()
    verstricheneSekunden.value = 0
    timerIntervall = window.setInterval(() => {
      verstricheneSekunden.value = Math.floor((Date.now() - aufgenommenSeit) / 1000)
    }, 250)
    statusText.value = 'Aufnahme läuft'
    zeichneAudio()
  } catch (fehler: unknown) {
    schliesseMedien()
    if (fehler instanceof DOMException && fehler.name === 'NotAllowedError') {
      meldung.value = 'Der Mikrofonzugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.'
    } else if (fehler instanceof DOMException && fehler.name === 'NotFoundError') {
      meldung.value = 'Es wurde kein Mikrofon gefunden.'
    } else {
      meldung.value = 'Die Mikrofonaufnahme konnte nicht gestartet werden.'
    }
  }
}

function stoppeAufnahme(): void {
  if (!aufnahmeLaeuft.value || !mediaRecorder) return
  aufnahmeLaeuft.value = false
  statusText.value = 'Aufnahme wird intern gespeichert'
  mediaRecorder.stop()
  schliesseMedien()
}

async function speichereAufnahme(medientyp: string): Promise<void> {
  const audio = new Blob(audioTeile, { type: medientyp })
  audioTeile = []
  if (!audio.size) {
    statusText.value = 'Bereit'
    meldung.value = 'Die Aufnahme war leer. Bitte nochmals versuchen.'
    return
  }

  const id = crypto.randomUUID()
  const aufnahme: InterneAufnahme = {
    id,
    erstelltAm: new Date().toISOString(),
    dateiname: `aufnahme-${id}.${dateiendung(medientyp)}`,
    medientyp,
    groesse: audio.size,
    dauerSekunden: Math.max(1, verstricheneSekunden.value),
    status: 'noch_nicht_uebertragen',
    audio,
  }

  try {
    await speichereEinzelneAufnahme(aufnahme)
    ausstehendeAufnahme.value = aufnahme
    statusText.value = 'Noch nicht übertragen'
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false)
  } catch {
    statusText.value = 'Bereit'
    meldung.value = 'Die Aufnahme konnte nicht im internen App-Speicher gesichert werden.'
  }
}

async function uebertrageAufnahme(): Promise<void> {
  const aufnahme = ausstehendeAufnahme.value
  if (!aufnahme) return
  if (!navigator.onLine) {
    meldung.value = 'Keine Verbindung. Die Aufnahme bleibt sicher im internen App-Speicher.'
    return
  }

  wirdVerarbeitet.value = true
  meldung.value = ''
  try {
    const formular = new FormData()
    formular.append('audio', aufnahme.audio, aufnahme.dateiname)
    const antwort = await fetch('/api/transkribieren', { method: 'POST', body: formular })
    const inhalt = await antwort.json().catch(() => ({})) as Transkriptionsantwort
    if (!antwort.ok) throw new Error(inhalt.detail || 'Die Transkription ist fehlgeschlagen.')

    transkript.value = inhalt.text ?? ''
    modell.value = inhalt.modell ?? ''
    await loescheInterneAufnahme(aufnahme.id)
    ausstehendeAufnahme.value = null
    statusText.value = 'Text erkannt'
    await nextTick()
    document.querySelector('#ergebnis')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (fehler: unknown) {
    statusText.value = 'Noch nicht übertragen'
    meldung.value = fehler instanceof Error ? fehler.message : 'Die Transkription ist fehlgeschlagen.'
  } finally {
    wirdVerarbeitet.value = false
  }
}

async function verwerfeAufnahme(): Promise<void> {
  const aufnahme = ausstehendeAufnahme.value
  if (!aufnahme || !window.confirm('Aufnahme wirklich aus dem internen App-Speicher löschen?')) return
  await loescheInterneAufnahme(aufnahme.id)
  ausstehendeAufnahme.value = null
  statusText.value = 'Bereit'
  verstricheneSekunden.value = 0
}

async function schalteAufnahme(): Promise<void> {
  if (aufnahmeLaeuft.value) stoppeAufnahme()
  else await starteAufnahme()
}

function aktualisiereOnlinezustand(): void {
  online.value = navigator.onLine
}

async function ladeServerstatus(): Promise<void> {
  try {
    const antwort = await fetch('/api/status')
    const inhalt = await antwort.json() as ServerStatus
    kiBereit.value = inhalt.kiBereit
    verbindungsstatus.value = inhalt.kiBereit ? `KI bereit · ${inhalt.modell}` : 'KI noch nicht konfiguriert'
  } catch {
    verbindungsstatus.value = online.value ? 'Serverstatus nicht verfügbar' : 'Offline'
  }
}

onMounted(async () => {
  window.addEventListener('online', aktualisiereOnlinezustand)
  window.addEventListener('offline', aktualisiereOnlinezustand)
  try {
    ausstehendeAufnahme.value = await ladeInterneAufnahme()
    if (ausstehendeAufnahme.value) {
      statusText.value = 'Noch nicht übertragen'
      verstricheneSekunden.value = ausstehendeAufnahme.value.dauerSekunden
    }
  } catch {
    meldung.value = 'Der interne App-Speicher ist in diesem Browser nicht verfügbar.'
  }
  await ladeServerstatus()
  zeichneRuhezustand()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', aktualisiereOnlinezustand)
  window.removeEventListener('offline', aktualisiereOnlinezustand)
  schliesseMedien()
})
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="PlauderBox Startseite">
        <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>PlauderBox</span>
      </a>
      <span class="prototype-badge">Ausbaustufe 1</span>
    </header>

    <section class="recorder" aria-labelledby="titel">
      <p class="eyebrow">Sprache zu Text</p>
      <h1 id="titel">Sag es einfach.</h1>
      <p class="intro">Die Aufnahme bleibt zuerst im internen App-Speicher. Du entscheidest, wann sie übertragen wird.</p>

      <div class="recording-stage" :class="{ 'is-recording': aufnahmeLaeuft }">
        <canvas ref="visualizer" width="520" height="180" aria-hidden="true"></canvas>
        <button
          class="record-button"
          type="button"
          :disabled="aufnahmeGesperrt"
          :aria-label="aufnahmeLaeuft ? 'Aufnahme stoppen' : 'Aufnahme starten'"
          @click="schalteAufnahme"
        >
          <span class="record-button__icon" aria-hidden="true"></span>
          <span>{{ aufnahmeKnopfText }}</span>
        </button>
        <div class="recording-meta" aria-live="polite">
          <span class="status-dot"></span>
          <span>{{ statusText }}</span>
          <time>{{ zeitText }}</time>
        </div>
      </div>

      <section v-if="ausstehendeAufnahme" class="pending" aria-labelledby="pending-title">
        <div class="pending__head">
          <div>
            <p class="eyebrow">Interner App-Speicher</p>
            <h2 id="pending-title">Noch nicht übertragen</h2>
          </div>
          <span class="pending__status">Lokal gesichert</span>
        </div>
        <dl>
          <div><dt>Aufgenommen</dt><dd>{{ formatiereZeitpunkt(ausstehendeAufnahme.erstelltAm) }}</dd></div>
          <div><dt>Dauer</dt><dd>{{ formatiereDauer(ausstehendeAufnahme.dauerSekunden) }}</dd></div>
          <div><dt>Grösse</dt><dd>{{ formatiereGroesse(ausstehendeAufnahme.groesse) }}</dd></div>
        </dl>
        <p>Die Audiodatei liegt nicht in Downloads, Galerie, SD-Karte oder Cloud.</p>
        <div class="pending__actions">
          <button class="primary-action" type="button" :disabled="wirdVerarbeitet || !online" @click="uebertrageAufnahme">
            {{ online ? 'Jetzt übertragen' : 'Warte auf Verbindung' }}
          </button>
          <button class="secondary-action" type="button" :disabled="wirdVerarbeitet" @click="verwerfeAufnahme">Aufnahme löschen</button>
        </div>
      </section>

      <div v-if="wirdVerarbeitet" class="processing" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <div><strong>Gesprochenes wird erkannt</strong><small>Nach bestätigter Übernahme wird die lokale Aufnahme gelöscht.</small></div>
      </div>

      <section v-if="transkript" id="ergebnis" class="result" aria-labelledby="result-title">
        <div class="result__head">
          <p class="eyebrow">Erkannter Text</p>
          <span>{{ modell }}</span>
        </div>
        <h2 id="result-title" class="sr-only">Erkannter Text</h2>
        <p>{{ transkript }}</p>
      </section>

      <div v-if="meldung" class="message" role="alert">{{ meldung }}</div>

      <p class="privacy-note">
        <span aria-hidden="true">◈</span>
        Genau eine Aufnahme wird intern gespeichert. Sie wird erst nach deiner bewussten Aktion übertragen und erst nach erfolgreicher Transkription lokal gelöscht.
      </p>
    </section>

    <footer>
      <span>Ein Knopf. Eine Aufnahme. Sicher vorgemerkt.</span>
      <span :class="kiBereit && online ? 'is-ready' : 'is-error'">{{ online ? verbindungsstatus : 'Offline · Aufnahme bleibt lokal' }}</span>
    </footer>
  </main>
</template>
