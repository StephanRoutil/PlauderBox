import { ref, type Ref } from 'vue'
import type { LokaleBegehung } from '@/services/begehungsSpeicher'

export type AppAnsicht =
  | 'scanner'
  | 'freigabe_erneuern'
  | 'laden'
  | 'start'
  | 'aktiv'
  | 'erfassen'
  | 'offline'
  | 'auswertung'
  | 'kontrolle'
  | 'abschluss'

export interface AppZustand {
  ansicht: Ref<AppAnsicht>
  begehung: Ref<LokaleBegehung | null>
  online: Ref<boolean>
}

export function verwendeAppZustand(verbindungsstatus: () => boolean): AppZustand {
  return {
    ansicht: ref<AppAnsicht>('scanner'),
    begehung: ref<LokaleBegehung | null>(null),
    online: ref(verbindungsstatus()),
  }
}
