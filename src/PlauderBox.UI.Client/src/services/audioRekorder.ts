export type AudioRekorderFehler = 'nicht_unterstuetzt' | 'nicht_erlaubt' | 'aufnahme_fehler' | 'leere_aufnahme'

export interface AudioRekorderErgebnis {
  audio: Blob
  medientyp: string
  dauerSekunden: number
}

export interface AudioRekorder {
  starten(): Promise<void>
  stoppen(): Promise<AudioRekorderErgebnis>
  abbrechen(): void
}

export class BrowserAudioRekorder implements AudioRekorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private teile: Blob[] = []
  private gestartetAm = 0

  async starten(): Promise<void> {
    this.abbrechen()
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('nicht_unterstuetzt')
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const typ = this.ermittleMedientyp()
      this.recorder = typ ? new MediaRecorder(this.stream, { mimeType: typ }) : new MediaRecorder(this.stream)
      this.teile = []
      this.recorder.addEventListener('dataavailable', (ereignis) => {
        if (ereignis.data.size) this.teile.push(ereignis.data)
      })
      this.recorder.start(500)
      this.gestartetAm = Date.now()
    } catch (fehler: unknown) {
      this.abbrechen()
      if (fehler instanceof DOMException && fehler.name === 'NotAllowedError') throw new Error('nicht_erlaubt')
      throw new Error('aufnahme_fehler')
    }
  }

  async stoppen(): Promise<AudioRekorderErgebnis> {
    const recorder = this.recorder
    if (!recorder || recorder.state === 'inactive') throw new Error('aufnahme_fehler')
    const dauerSekunden = Math.max(1, Math.floor((Date.now() - this.gestartetAm) / 1000))
    return await new Promise((resolve, reject) => {
      recorder.addEventListener(
        'stop',
        () => {
          const medientyp = recorder.mimeType || 'audio/webm'
          const audio = new Blob(this.teile, { type: medientyp })
          this.teile = []
          this.beendeStream()
          this.recorder = null
          if (!audio.size) {
            reject(new Error('leere_aufnahme'))
            return
          }
          resolve({ audio, medientyp, dauerSekunden })
        },
        { once: true },
      )
      recorder.stop()
    })
  }

  abbrechen(): void {
    if (this.recorder?.state !== 'inactive') this.recorder?.stop()
    this.recorder = null
    this.teile = []
    this.beendeStream()
  }

  private ermittleMedientyp(): string {
    return (
      ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((typ) =>
        MediaRecorder.isTypeSupported(typ),
      ) ?? ''
    )
  }

  private beendeStream(): void {
    this.stream?.getTracks().forEach((spur) => spur.stop())
    this.stream = null
  }
}
