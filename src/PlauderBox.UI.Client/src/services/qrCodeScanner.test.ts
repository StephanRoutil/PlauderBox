import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserQrCodeScanner, type QrCodeScanner } from './qrCodeScanner'

describe('QR-Code-Scanner-Rückfall', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('delegiert ohne BarcodeDetector an den JavaScript-Scanner', async () => {
    const starten = vi.fn(async (_video: HTMLVideoElement, erkannt: (inhalt: string) => void) => {
      erkannt('synthetischer-code')
    })
    const stoppen = vi.fn()
    const rueckfall: QrCodeScanner = { starten, stoppen }
    vi.stubGlobal('window', {
      requestAnimationFrame: vi.fn(),
      cancelAnimationFrame: vi.fn(),
    })
    const erkannt = vi.fn()
    const scanner = new BrowserQrCodeScanner(rueckfall)

    await scanner.starten({} as HTMLVideoElement, erkannt)
    scanner.stoppen()

    expect(starten).toHaveBeenCalledOnce()
    expect(erkannt).toHaveBeenCalledWith('synthetischer-code')
    expect(stoppen).toHaveBeenCalledTimes(2)
  })
})
