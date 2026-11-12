import type { BegehungEintrag, LokaleAudioaufnahme } from '@logik/begehungsAblauf'

export type EintragSpeichern = (eintrag: BegehungEintrag) => Promise<void>

export function kopiereEintrag(eintrag: BegehungEintrag): BegehungEintrag {
  return { ...eintrag, bilder: [...eintrag.bilder] }
}

export function setzeAudioaufnahme(eintrag: BegehungEintrag, audio: LokaleAudioaufnahme): void {
  eintrag.audio = audio
  eintrag.status = 'wartet_auf_auswertung'
  eintrag.aktualisiertAm = new Date().toISOString()
}

export async function speichereEntwurf(eintrag: BegehungEintrag, speichern: EintragSpeichern): Promise<void> {
  eintrag.aktualisiertAm = new Date().toISOString()
  await speichern(kopiereEintrag(eintrag))
}

export async function verwerfeAudioaufnahme(eintrag: BegehungEintrag, speichern: EintragSpeichern): Promise<void> {
  const vorher = {
    audio: eintrag.audio,
    status: eintrag.status,
    aktualisiertAm: eintrag.aktualisiertAm,
  }
  eintrag.audio = null
  eintrag.status = 'entwurf'
  try {
    await speichereEntwurf(eintrag, speichern)
  } catch (fehler: unknown) {
    eintrag.audio = vorher.audio
    eintrag.status = vorher.status
    eintrag.aktualisiertAm = vorher.aktualisiertAm
    throw fehler
  }
}
