import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserAudioRekorder } from './audioRekorder'

class MedienRekorderAttrappe {
  static letzte: MedienRekorderAttrappe | null = null
  static isTypeSupported(typ: string): boolean { return typ === 'audio/webm' }

  readonly mimeType: string
  state: RecordingState = 'inactive'
  private readonly ereignisse = new Map<string, Array<(ereignis: BlobEvent) => void>>()

  constructor(_stream: MediaStream, optionen?: MediaRecorderOptions) {
    this.mimeType = optionen?.mimeType ?? 'audio/webm'
    MedienRekorderAttrappe.letzte = this
  }

  addEventListener(art: string, listener: EventListenerOrEventListenerObject): void {
    const funktion = typeof listener === 'function' ? listener : (ereignis: Event) => listener.handleEvent(ereignis)
    const liste = this.ereignisse.get(art) ?? []
    liste.push(funktion as (ereignis: BlobEvent) => void)
    this.ereignisse.set(art, liste)
  }

  start(): void { this.state = 'recording' }

  stop(): void {
    this.state = 'inactive'
    for (const listener of this.ereignisse.get('stop') ?? []) listener({} as BlobEvent)
  }

  liefere(blob: Blob): void {
    for (const listener of this.ereignisse.get('dataavailable') ?? []) listener({ data: blob } as BlobEvent)
  }
}

function richteBrowserEin(abruf: () => Promise<MediaStream>) {
  const mediaDevices = { getUserMedia: vi.fn(abruf) }
  vi.stubGlobal('navigator', { mediaDevices })
  vi.stubGlobal('window', { MediaRecorder: MedienRekorderAttrappe })
  vi.stubGlobal('MediaRecorder', MedienRekorderAttrappe)
  return mediaDevices
}

afterEach(() => {
  MedienRekorderAttrappe.letzte = null
  vi.unstubAllGlobals()
})

describe('Browser-Audiorekorder', () => {
  it('startet die Mikrofonaufnahme', async () => {
    const spurStoppen = vi.fn()
    const mediaDevices = richteBrowserEin(async () => ({ getTracks: () => [{ stop: spurStoppen }] }) as unknown as MediaStream)
    const rekorder = new BrowserAudioRekorder()

    await rekorder.starten()

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(MedienRekorderAttrappe.letzte?.state).toBe('recording')
    rekorder.abbrechen()
    expect(spurStoppen).toHaveBeenCalledTimes(1)
  })

  it('stoppt und liefert die aufgenommene Audiodatei', async () => {
    richteBrowserEin(async () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream)
    const rekorder = new BrowserAudioRekorder()
    await rekorder.starten()
    MedienRekorderAttrappe.letzte?.liefere(new Blob(['synthetisches-audio']))

    const ergebnis = await rekorder.stoppen()

    expect(await ergebnis.audio.text()).toBe('synthetisches-audio')
    expect(ergebnis.medientyp).toBe('audio/webm')
    expect(ergebnis.dauerSekunden).toBeGreaterThanOrEqual(1)
  })

  it('weist eine leere Aufnahme als eigenen Fehler aus', async () => {
    richteBrowserEin(async () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream)
    const rekorder = new BrowserAudioRekorder()
    await rekorder.starten()

    await expect(rekorder.stoppen()).rejects.toThrow('leere_aufnahme')
  })

  it('weist verweigerten Mikrofonzugriff eindeutig aus', async () => {
    richteBrowserEin(async () => { throw new DOMException('verweigert', 'NotAllowedError') })
    const rekorder = new BrowserAudioRekorder()

    await expect(rekorder.starten()).rejects.toThrow('nicht_erlaubt')
  })
})
