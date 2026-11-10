<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ladeInterneAufnahme,
  ladeLokalesBild,
  loescheInterneAufnahme,
  loescheLokalesBild,
  speichereEinzelneAufnahme,
  speichereLokalesBild,
  speichereLokalenProtokollpunkt,
  ladeLokalenProtokollpunkt,
  uebernehmeStrukturvorschlaege,
  type InterneAufnahme,
  type LokalerProtokollpunkt,
  type LokalesProtokollpunktbild,
} from '@/services/internerAufnahmespeicher'

interface ServerStatus {
  kiBereit: boolean
  modell: string
  hinweis?: string | null
}

interface Transkriptionsantwort {
  text?: string
  gruppe?: string
  thema?: string
  ort?: string
  modell?: string
  strukturmodell?: string
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
const formularGeladen = ref(false)
const formularSpeicherstatus = ref('Nur lokal · noch nicht an HappyHour übertragen')
const lokalesBild = ref<LokalesProtokollpunktbild | null>(null)
const bildVorschauUrl = ref('')
const protokollpunkt = reactive<LokalerProtokollpunkt>(erstelleLeerenProtokollpunkt())

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrame = 0
let timerIntervall = 0
let aufgenommenSeit = 0
let audioTeile: Blob[] = []
let formularSpeicherTimer = 0

function heutigesDatum(): string {
  const heute = new Date()
  const offset = heute.getTimezoneOffset() * 60_000
  return new Date(heute.getTime() - offset).toISOString().slice(0, 10)
}

function erstelleLeerenProtokollpunkt(): LokalerProtokollpunkt {
  return {
    intProtokollpunktID: 0,
    intProtokollFKID: 0,
    intProtokollpunktArtFKID: 0,
    datProtokollpunkt: heutigesDatum(),
    blnNachverfolgen: false,
    intProjektAnsprechpartnerFKID: null,
    datFrist: null,
    blnErledigt: true,
    strRechtsverweis: '',
    strGruppe: '',
    strOrt: '',
    intReihenfolge: 0,
    strProtokollpunkt: '',
    txtProtokollpunkt: '',
    GUID: crypto.randomUUID(),
    aktualisiertAm: new Date().toISOString(),
  }
}

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

function setzeAnsprechpartnerId(ereignis: Event): void {
  const wert = (ereignis.target as HTMLInputElement).value
  protokollpunkt.intProjektAnsprechpartnerFKID = wert ? Number.parseInt(wert, 10) : null
}

function setzeFrist(ereignis: Event): void {
  protokollpunkt.datFrist = (ereignis.target as HTMLInputElement).value || null
}

function aktualisiereNachverfolgung(): void {
  if (protokollpunkt.blnNachverfolgen) {
    protokollpunkt.blnErledigt = false
    if (!protokollpunkt.datFrist) {
      const frist = new Date()
      frist.setDate(frist.getDate() + 14)
      protokollpunkt.datFrist = frist.toISOString().slice(0, 10)
    }
  } else {
    protokollpunkt.blnErledigt = true
    protokollpunkt.datFrist = null
  }
}

async function speichereFormular(): Promise<void> {
  formularSpeicherstatus.value = 'Wird intern gespeichert …'
  const zuSpeichern: LokalerProtokollpunkt = {
    ...protokollpunkt,
    aktualisiertAm: new Date().toISOString(),
  }
  await speichereLokalenProtokollpunkt(zuSpeichern)
  formularSpeicherstatus.value = 'Lokal gespeichert · nicht an HappyHour übertragen'
}

function planeFormularspeicherung(): void {
  if (!formularGeladen.value) return
  window.clearTimeout(formularSpeicherTimer)
  formularSpeicherstatus.value = 'Lokale Änderung …'
  formularSpeicherTimer = window.setTimeout(() => {
    void speichereFormular().catch(() => {
      formularSpeicherstatus.value = 'Lokale Speicherung fehlgeschlagen'
    })
  }, 250)
}

function setzeBildVorschau(bild: LokalesProtokollpunktbild | null): void {
  if (bildVorschauUrl.value) URL.revokeObjectURL(bildVorschauUrl.value)
  bildVorschauUrl.value = bild ? URL.createObjectURL(bild.bild) : ''
}

async function waehleBild(ereignis: Event): Promise<void> {
  const eingabe = ereignis.target as HTMLInputElement
  const datei = eingabe.files?.[0]
  eingabe.value = ''
  if (!datei) return
  if (!datei.type.startsWith('image/')) {
    meldung.value = 'Es können nur Bilddateien lokal angefügt werden.'
    return
  }
  if (datei.size > 15 * 1024 * 1024) {
    meldung.value = 'Das Bild überschreitet die lokale Grenze von 15 MB.'
    return
  }

  const bild: LokalesProtokollpunktbild = {
    dateiname: datei.name,
    medientyp: datei.type,
    groesse: datei.size,
    erstelltAm: new Date().toISOString(),
    bild: datei,
  }
  await speichereLokalesBild(bild)
  lokalesBild.value = bild
  setzeBildVorschau(bild)
  meldung.value = ''
}

async function verwerfeBild(): Promise<void> {
  if (!lokalesBild.value || !window.confirm('Bild wirklich aus dem internen App-Speicher löschen?')) return
  await loescheLokalesBild()
  lokalesBild.value = null
  setzeBildVorschau(null)
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
    modell.value = [inhalt.modell, inhalt.strukturmodell].filter(Boolean).join(' + ')
    const formularGeaendert = uebernehmeStrukturvorschlaege(protokollpunkt, {
      gruppe: inhalt.gruppe,
      thema: inhalt.thema,
      ort: inhalt.ort,
      transkript: transkript.value,
    })
    if (formularGeaendert) {
      await speichereFormular()
    }
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
    const gespeicherterProtokollpunkt = await ladeLokalenProtokollpunkt()
    if (gespeicherterProtokollpunkt) Object.assign(protokollpunkt, gespeicherterProtokollpunkt)
    else await speichereFormular()
    lokalesBild.value = await ladeLokalesBild()
    setzeBildVorschau(lokalesBild.value)
    ausstehendeAufnahme.value = await ladeInterneAufnahme()
    if (ausstehendeAufnahme.value) {
      statusText.value = 'Noch nicht übertragen'
      verstricheneSekunden.value = ausstehendeAufnahme.value.dauerSekunden
    }
  } catch {
    meldung.value = 'Der interne App-Speicher ist in diesem Browser nicht verfügbar.'
  }
  formularGeladen.value = true
  await ladeServerstatus()
  zeichneRuhezustand()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', aktualisiereOnlinezustand)
  window.removeEventListener('offline', aktualisiereOnlinezustand)
  schliesseMedien()
  window.clearTimeout(formularSpeicherTimer)
  if (bildVorschauUrl.value) URL.revokeObjectURL(bildVorschauUrl.value)
})

watch(protokollpunkt, planeFormularspeicherung, { deep: true })
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="PlauderBox Startseite">
        <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>PlauderBox</span>
      </a>
      <span class="prototype-badge">Lokaler Protokollpunkt</span>
    </header>

    <section class="recorder" aria-labelledby="titel">
      <p class="eyebrow">Sprache zu Text</p>
      <h1 id="titel">Sag es einfach.</h1>
      <p class="intro">Felder, Bild und Aufnahme bleiben im internen App-Speicher. An HappyHour wird nichts übertragen.</p>

      <section class="local-image local-image--capture" aria-labelledby="image-title">
        <div class="local-image__head">
          <div>
            <p class="eyebrow">Erfassung</p>
            <h2 id="image-title">Bild zum neuen Punkt</h2>
            <p>Genau ein Bild, nur im internen App-Speicher.</p>
          </div>
          <label class="image-action">
            {{ lokalesBild ? 'Bild ersetzen' : 'Bild aufnehmen oder wählen' }}
            <input type="file" accept="image/*" capture="environment" @change="waehleBild">
          </label>
        </div>
        <div v-if="lokalesBild" class="local-image__preview">
          <img :src="bildVorschauUrl" alt="Lokal gespeichertes Bild des Protokollpunkts">
          <div>
            <strong>{{ lokalesBild.dateiname }}</strong>
            <span>{{ formatiereGroesse(lokalesBild.groesse) }} · lokal gespeichert</span>
            <button class="text-action" type="button" @click="verwerfeBild">Bild löschen</button>
          </div>
        </div>
      </section>

      <div class="capture-audio-head">
        <p class="eyebrow">Erfassung</p>
        <h2>Situation diktieren</h2>
        <p>Nenne möglichst Gruppe, Thema, Ort und die beobachtete Situation.</p>
      </div>

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
            {{ online ? 'Diktat jetzt auswerten' : 'Warte auf Verbindung' }}
          </button>
          <button class="secondary-action" type="button" :disabled="wirdVerarbeitet" @click="verwerfeAufnahme">Aufnahme löschen</button>
        </div>
      </section>

      <div v-if="wirdVerarbeitet" class="processing" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <div><strong>Gesprochenes wird erkannt und geordnet</strong><small>Gruppe, Thema und Ort werden nur übernommen, wenn sie erkennbar und die Felder noch leer sind.</small></div>
      </div>

      <section v-if="transkript" id="ergebnis" class="result" aria-labelledby="result-title">
        <div class="result__head">
          <p class="eyebrow">Erkannter Text</p>
          <span>{{ modell }}</span>
        </div>
        <h2 id="result-title" class="sr-only">Erkannter Text</h2>
        <p>{{ transkript }}</p>
      </section>

      <section class="protocol-form" aria-labelledby="protocol-title">
        <div class="protocol-form__head">
          <div>
            <p class="eyebrow">Lokal erkannter Entwurf</p>
            <h2 id="protocol-title">Protokollpunkt kontrollieren</h2>
          </div>
          <span class="local-only">Keine HappyHour-Übertragung</span>
        </div>

        <p class="structure-hint">Gruppe, Thema und Ort werden beim Auswerten des Diktats soweit erkennbar in noch leere Felder übernommen.</p>

        <div class="form-grid">
          <label>
            <span>Gruppe <small>strGruppe</small></span>
            <input v-model.trim="protokollpunkt.strGruppe" type="text" maxlength="250" placeholder="z. B. Brandschutz">
          </label>
          <label>
            <span>Ort <small>lokaler Erfassungskontext</small></span>
            <input v-model.trim="protokollpunkt.strOrt" type="text" maxlength="250" placeholder="z. B. Untergeschoss 2, Technikraum">
          </label>
          <label class="form-grid__wide">
            <span>Thema <small>strProtokollpunkt</small></span>
            <input v-model.trim="protokollpunkt.strProtokollpunkt" type="text" maxlength="250" placeholder="Kurzer Titel des Punkts">
          </label>
          <label class="form-grid__wide">
            <span>Inhalt <small>txtProtokollpunkt</small></span>
            <textarea v-model="protokollpunkt.txtProtokollpunkt" rows="6" placeholder="Das Transkript wird hier lokal eingesetzt, solange das Feld leer ist."></textarea>
          </label>
          <label>
            <span>Protokoll-ID <small>intProtokollFKID</small></span>
            <input v-model.number="protokollpunkt.intProtokollFKID" type="number" min="0">
          </label>
          <label>
            <span>Protokollpunktart-ID <small>intProtokollpunktArtFKID</small></span>
            <input v-model.number="protokollpunkt.intProtokollpunktArtFKID" type="number" min="0">
          </label>
          <label>
            <span>Datum <small>datProtokollpunkt</small></span>
            <input v-model="protokollpunkt.datProtokollpunkt" type="date">
          </label>
          <label>
            <span>Verantwortlicher <small>intProjektAnsprechpartnerFKID</small></span>
            <input
              :value="protokollpunkt.intProjektAnsprechpartnerFKID ?? ''"
              type="number"
              min="0"
              placeholder="lokale ID"
              @input="setzeAnsprechpartnerId"
            >
          </label>
          <label class="form-grid__wide">
            <span>Rechtsverweis <small>strRechtsverweis</small></span>
            <input v-model.trim="protokollpunkt.strRechtsverweis" type="text" maxlength="250" placeholder="optional">
          </label>
          <label class="checkbox-field">
            <input v-model="protokollpunkt.blnNachverfolgen" type="checkbox" @change="aktualisiereNachverfolgung">
            <span>Nachverfolgen <small>blnNachverfolgen</small></span>
          </label>
          <label v-if="protokollpunkt.blnNachverfolgen">
            <span>Frist <small>datFrist</small></span>
            <input :value="protokollpunkt.datFrist ?? ''" type="date" @input="setzeFrist">
          </label>
          <label v-if="protokollpunkt.blnNachverfolgen" class="checkbox-field">
            <input v-model="protokollpunkt.blnErledigt" type="checkbox">
            <span>Erledigt <small>blnErledigt</small></span>
          </label>
        </div>

        <details class="technical-fields">
          <summary>Technische lokale Felder</summary>
          <dl>
            <div><dt>intProtokollpunktID</dt><dd>{{ protokollpunkt.intProtokollpunktID }}</dd></div>
            <div><dt>intReihenfolge</dt><dd>{{ protokollpunkt.intReihenfolge }}</dd></div>
            <div><dt>GUID</dt><dd>{{ protokollpunkt.GUID }}</dd></div>
          </dl>
        </details>
        <p class="save-state" aria-live="polite">{{ formularSpeicherstatus }}</p>
      </section>

      <div v-if="meldung" class="message" role="alert">{{ meldung }}</div>

      <p class="privacy-note">
        <span aria-hidden="true">◈</span>
        Genau eine Aufnahme wird intern gespeichert. Sie wird erst nach deiner bewussten Aktion zur Transkription und Strukturierung übertragen und erst nach erfolgreicher Auswertung lokal gelöscht.
      </p>
    </section>

    <footer>
      <span>Ein Knopf. Eine Aufnahme. Sicher vorgemerkt.</span>
      <span :class="kiBereit && online ? 'is-ready' : 'is-error'">{{ online ? verbindungsstatus : 'Offline · Aufnahme bleibt lokal' }}</span>
    </footer>
  </main>
</template>
