import { computed, ref } from 'vue'
import type { QrCodeScanner } from './qrCodeScanner'

export function verwendeQrCodeStartAblauf(
  scanner: QrCodeScanner,
  externeMeldung: () => string,
  erkannt: (inhalt: string) => void,
) {
  const video = ref<HTMLVideoElement | null>(null)
  const status = ref<'bereit' | 'scannt' | 'fehler'>('bereit')
  const lokaleMeldung = ref('')
  const sichtbareMeldung = computed(() => lokaleMeldung.value || externeMeldung())

  function setzeVideo(element: unknown): void {
    video.value = element as HTMLVideoElement | null
  }

  async function starteScanner(): Promise<void> {
    if (!video.value) return
    status.value = 'scannt'
    lokaleMeldung.value = 'Kamera aktiv · QR-Code innerhalb des Rahmens halten.'
    try {
      await scanner.starten(video.value, (inhalt) => {
        status.value = 'bereit'
        lokaleMeldung.value = ''
        erkannt(inhalt)
      })
    } catch (fehler: unknown) {
      status.value = 'fehler'
      const art = fehler instanceof Error ? fehler.message : 'kamera_fehler'
      lokaleMeldung.value =
        {
          nicht_unterstuetzt: 'Dieser Browser unterstützt das Scannen mit der Kamera nicht.',
          nicht_erlaubt: 'Der Kamerazugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.',
          keine_kamera: 'Es wurde keine Kamera gefunden.',
          kamera_fehler: 'Die Kamera konnte nicht gestartet werden.',
        }[art] ?? 'Die Kamera konnte nicht gestartet werden.'
    }
  }

  function stoppeScanner(): void {
    scanner.stoppen()
    status.value = 'bereit'
    lokaleMeldung.value = ''
  }

  return { video, setzeVideo, status, sichtbareMeldung, starteScanner, stoppeScanner }
}
