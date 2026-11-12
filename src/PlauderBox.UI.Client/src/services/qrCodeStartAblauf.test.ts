import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { QrCodeScanner } from './qrCodeScanner'
import { verwendeQrCodeStartAblauf } from './qrCodeStartAblauf'

describe('QR-Code-Startablauf', () => {
  it('zeigt nach erkanntem ungültigem QR die externe Fehlermeldung statt des alten Kamerastatus', async () => {
    const scanner: QrCodeScanner = {
      async starten(_video, erkannt) { erkannt('ungueltiger-code') },
      stoppen() {},
    }
    const externeMeldung = ref('')
    const ablauf = verwendeQrCodeStartAblauf(scanner, () => externeMeldung.value, () => {
      externeMeldung.value = 'Dieser QR-Code ist ungültig.'
    })
    ablauf.video.value = {} as HTMLVideoElement

    await ablauf.starteScanner()
    await nextTick()

    expect(ablauf.status.value).toBe('bereit')
    expect(ablauf.sichtbareMeldung.value).toBe('Dieser QR-Code ist ungültig.')
    expect(ablauf.sichtbareMeldung.value).not.toContain('Kamera aktiv')
  })
})
