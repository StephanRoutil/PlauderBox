import type { BegehungEintrag, LokaleAudioaufnahme, LokaleBegehung, LokalesBild } from '@logik/begehungsAblauf'
import { istObjekt, istOptionaleZahl, istOptionalerText, istText, istZahl } from '@logik/typWaechter'

export const schemaVersion = 2 as const

export interface GespeicherterEintrag extends Omit<BegehungEintrag, 'audio' | 'bilder'> {
  audioSchluessel: string | null
  bildSchluessel: string[]
}

export interface GespeicherteBegehung extends Omit<LokaleBegehung, 'eintraege'> {
  schemaVersion: typeof schemaVersion
  eintraege: GespeicherterEintrag[]
}

export interface Speicherpaket {
  begehung: GespeicherteBegehung
  audio: Array<{ schluessel: string; wert: LokaleAudioaufnahme }>
  bilder: Array<{ schluessel: string; wert: LokalesBild }>
}

function istProtokollKontext(wert: unknown): boolean {
  if (
    !istObjekt(wert) ||
    !istZahl(wert.protokollId) ||
    !istZahl(wert.protokollNummer) ||
    !istText(wert.thema) ||
    !istText(wert.typ) ||
    !istText(wert.status) ||
    !istText(wert.datum) ||
    !istOptionalerText(wert.ort) ||
    !istObjekt(wert.projekt) ||
    !istZahl(wert.projekt.id) ||
    !istZahl(wert.projekt.nummer) ||
    !istText(wert.projekt.bezeichnung) ||
    !istObjekt(wert.mitarbeiter) ||
    !istZahl(wert.mitarbeiter.id) ||
    !istText(wert.mitarbeiter.name) ||
    !Array.isArray(wert.traktanden) ||
    !wert.traktanden.every(istText) ||
    !Array.isArray(wert.verteiler) ||
    !Array.isArray(wert.protokollpunkte) ||
    (wert.protokollpunktArten !== undefined &&
      (!Array.isArray(wert.protokollpunktArten) ||
        !wert.protokollpunktArten.every((art) => istObjekt(art) && istZahl(art.id) && istText(art.bezeichnung))))
  )
    return false
  if (
    wert.objekt !== null &&
    (!istObjekt(wert.objekt) ||
      !istZahl(wert.objekt.id) ||
      !istText(wert.objekt.bezeichnung) ||
      !istOptionalerText(wert.objekt.adresse) ||
      !istOptionalerText(wert.objekt.gemeinde))
  )
    return false
  return (
    wert.verteiler.every(
      (person) =>
        istObjekt(person) &&
        istZahl(person.id) &&
        istZahl(person.projektAnsprechpartnerId) &&
        istText(person.person) &&
        istOptionalerText(person.firma) &&
        istOptionalerText(person.funktion) &&
        typeof person.istTeilnehmer === 'boolean' &&
        typeof person.istCc === 'boolean' &&
        typeof person.istProtokollschreiber === 'boolean',
    ) &&
    wert.protokollpunkte.every(
      (punkt) =>
        istObjekt(punkt) &&
        istZahl(punkt.id) &&
        istText(punkt.guid) &&
        (punkt.protokollpunktArtId === undefined || istZahl(punkt.protokollpunktArtId)) &&
        (punkt.projektAnsprechpartnerId === undefined || istOptionaleZahl(punkt.projektAnsprechpartnerId)) &&
        istText(punkt.gruppe) &&
        istZahl(punkt.reihenfolge) &&
        istText(punkt.thema) &&
        istText(punkt.inhalt) &&
        istOptionalerText(punkt.rechtsverweis),
    )
  )
}

function istGespeicherterEintrag(wert: unknown): wert is GespeicherterEintrag {
  return (
    istObjekt(wert) &&
    istText(wert.id) &&
    istText(wert.erstelltAm) &&
    istText(wert.aktualisiertAm) &&
    ['entwurf', 'wartet_auf_auswertung', 'wird_ausgewertet', 'ausgewertet', 'fehler'].includes(String(wert.status)) &&
    istText(wert.traktandum) &&
    istOptionaleZahl(wert.vorbereiteterProtokollpunktId) &&
    istOptionaleZahl(wert.protokollpunktArtId) &&
    istOptionaleZahl(wert.projektAnsprechpartnerId) &&
    istText(wert.gruppe) &&
    istText(wert.thema) &&
    istText(wert.inhalt) &&
    istText(wert.rechtsverweis) &&
    istText(wert.transkript) &&
    istText(wert.fehler) &&
    (wert.audioSchluessel === null || istText(wert.audioSchluessel)) &&
    Array.isArray(wert.bildSchluessel) &&
    wert.bildSchluessel.every(istText) &&
    (wert.legacyImportId === undefined || istText(wert.legacyImportId))
  )
}

export function istGespeicherteBegehung(wert: unknown): wert is GespeicherteBegehung {
  return (
    istObjekt(wert) &&
    wert.schemaVersion === schemaVersion &&
    istText(wert.id) &&
    istText(wert.gestartetAm) &&
    istText(wert.aktualisiertAm) &&
    ['aktiv', 'kontrolle', 'lokal_abgeschlossen', 'an_happyhour_uebertragen'].includes(String(wert.status)) &&
    istProtokollKontext(wert.protokoll) &&
    (wert.freigabeToken === undefined || istText(wert.freigabeToken)) &&
    istOptionalerText(wert.uebertragenAm) &&
    istOptionalerText(wert.bilderUebertragenAm) &&
    (wert.aktuellerEintragId === null || istText(wert.aktuellerEintragId)) &&
    Array.isArray(wert.eintraege) &&
    wert.eintraege.every(istGespeicherterEintrag)
  )
}
