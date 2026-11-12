export type QrCodeScannerFehler = 'nicht_unterstuetzt' | 'nicht_erlaubt' | 'keine_kamera' | 'kamera_fehler'

export interface QrCodeScanner {
  starten(video: HTMLVideoElement, erkannt: (inhalt: string) => void): Promise<void>
  stoppen(): void
}

interface ErkannterBarcode {
  rawValue: string
}

interface BarcodeErkenner {
  detect(quelle: ImageBitmapSource): Promise<ErkannterBarcode[]>
}

interface BarcodeErkennerKonstruktor {
  new (optionen: { formats: string[] }): BarcodeErkenner
}

type FensterMitBarcodeErkenner = Window &
  typeof globalThis & {
    BarcodeDetector?: BarcodeErkennerKonstruktor
  }

export class BrowserQrCodeScanner implements QrCodeScanner {
  private stream: MediaStream | null = null
  private animationFrame = 0
  private beendet = false

  constructor(private readonly rueckfall: QrCodeScanner = new ZxingQrCodeScanner()) {}

  async starten(video: HTMLVideoElement, erkannt: (inhalt: string) => void): Promise<void> {
    this.stoppen()
    this.beendet = false
    const konstruktor = (window as FensterMitBarcodeErkenner).BarcodeDetector
    if (!konstruktor) return this.rueckfall.starten(video, erkannt)
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('nicht_unterstuetzt')

    const erkenner = new konstruktor({ formats: ['qr_code'] })
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      video.srcObject = this.stream
      await video.play()
    } catch (fehler: unknown) {
      this.stoppen()
      if (fehler instanceof DOMException && fehler.name === 'NotAllowedError') throw new Error('nicht_erlaubt')
      if (fehler instanceof DOMException && fehler.name === 'NotFoundError') throw new Error('keine_kamera')
      throw new Error('kamera_fehler')
    }

    const pruefen = async (): Promise<void> => {
      if (this.beendet) return
      try {
        const codes = await erkenner.detect(video)
        const inhalt = codes.find((code) => code.rawValue.trim().length > 0)?.rawValue
        if (inhalt) {
          this.stoppen()
          erkannt(inhalt)
          return
        }
      } catch {
        // Einzelne leere Frames sind erwartbar; der Scanner versucht den nächsten Frame.
      }
      this.animationFrame = window.requestAnimationFrame(() => void pruefen())
    }
    this.animationFrame = window.requestAnimationFrame(() => void pruefen())
  }

  stoppen(): void {
    this.beendet = true
    window.cancelAnimationFrame(this.animationFrame)
    this.stream?.getTracks().forEach((spur) => spur.stop())
    this.stream = null
    this.rueckfall.stoppen()
  }
}
import type { IScannerControls } from '@zxing/browser'

export class ZxingQrCodeScanner implements QrCodeScanner {
  private steuerung: IScannerControls | null = null

  async starten(video: HTMLVideoElement, erkannt: (inhalt: string) => void): Promise<void> {
    this.stoppen()
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('nicht_unterstuetzt')
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const leser = new BrowserQRCodeReader()
      this.steuerung = await leser.decodeFromVideoDevice(undefined, video, (ergebnis, _fehler, steuerung) => {
        const inhalt = ergebnis?.getText().trim()
        if (!inhalt) return
        steuerung.stop()
        this.steuerung = null
        erkannt(inhalt)
      })
    } catch (fehler: unknown) {
      this.stoppen()
      if (fehler instanceof DOMException && fehler.name === 'NotAllowedError') throw new Error('nicht_erlaubt')
      if (fehler instanceof DOMException && fehler.name === 'NotFoundError') throw new Error('keine_kamera')
      throw new Error('kamera_fehler')
    }
  }

  stoppen(): void {
    this.steuerung?.stop()
    this.steuerung = null
  }
}
