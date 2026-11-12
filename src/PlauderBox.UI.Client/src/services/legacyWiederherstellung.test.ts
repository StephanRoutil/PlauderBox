import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { ladeLegacyEintrag } from './legacyWiederherstellung'
import { erstelleBegehung, ladeBegehung, normalisiereEintragProjektAnsprechpartner, speichereBegehung, uebernehmeAuswertung } from './begehungsSpeicher'
import { verarbeiteWarteschlange } from '@logik/begehungsAblauf'
import { ladeInterneAufnahme, speichereEinzelneAufnahme, speichereLokalesBild, speichereLokalenProtokollpunkt, type InterneAufnahme, type LokalerProtokollpunkt } from './internerAufnahmespeicher'
import type { HappyHourProtokollKontext } from './happyHourProtokollKontext'

const protokoll: HappyHourProtokollKontext = {
  protokollId: 378, protokollNummer: 1, thema: 'Test', typ: 'Protokoll', status: 'Entwurf', datum: '2026-11-10', ort: null,
  projekt: { id: 1, nummer: 799, bezeichnung: 'Test' }, objekt: null, mitarbeiter: { id: 1, name: 'Test' }, traktanden: [],
  verteiler: [{ id: 7, projektAnsprechpartnerId: 77, person: 'Protokollschreiberin', firma: null, funktion: null, istTeilnehmer: true, istCc: false, istProtokollschreiber: true }], protokollpunkte: [],
}

describe('Legacy-Wiederherstellung', () => {
  beforeEach(() => Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() }))

  it('liest ältere Aufnahme, Bilder und Felder als sicheren neuen Eintrag ohne Legacy-Löschung', async () => {
    const audio = new Blob(['audio'], { type: 'audio/webm' })
    const aufnahme: InterneAufnahme = { id: 'alt', erstelltAm: '2026-11-10T00:00:00Z', dateiname: 'alt.webm', medientyp: 'audio/webm', groesse: audio.size, dauerSekunden: 3, status: 'noch_nicht_uebertragen', audio }
    const punkt: LokalerProtokollpunkt = { intProtokollpunktID: 0, intProtokollFKID: 0, intProtokollpunktArtFKID: 0, datProtokollpunkt: '2026-11-10', blnNachverfolgen: false, intProjektAnsprechpartnerFKID: 999, datFrist: null, blnErledigt: true, strRechtsverweis: 'VKF', strGruppe: 'Brandschutz', intReihenfolge: 0, strProtokollpunkt: 'Türe', txtProtokollpunkt: 'Blockiert', GUID: 'alt', aktualisiertAm: '2026-11-10T00:00:00Z' }
    await speichereEinzelneAufnahme(aufnahme)
    await speichereLokalenProtokollpunkt(punkt)
    await speichereLokalesBild({ id: 'bild-alt', dateiname: 'alt.jpg', medientyp: 'image/jpeg', groesse: 4, erstelltAm: '2026-11-10T00:00:00Z', bild: new Blob(['bild']) })

    const wiederhergestellt = await ladeLegacyEintrag()

    expect(wiederhergestellt).toMatchObject({ status: 'wartet_auf_auswertung', projektAnsprechpartnerId: 999, gruppe: 'Brandschutz', thema: 'Türe', inhalt: 'Blockiert' })
    expect(normalisiereEintragProjektAnsprechpartner(wiederhergestellt!, protokoll)).toBe(true)
    expect(wiederhergestellt?.projektAnsprechpartnerId).toBe(77)
    expect(wiederhergestellt?.bilder[0]?.id).toBe('bild-alt')
    expect(await wiederhergestellt?.audio?.audio.text()).toBe('audio')
  })

  it('markiert die Übernahme atomar und bietet denselben Altbestand beim zweiten Appstart nicht erneut an', async () => {
    const audio = new Blob(['audio'], { type: 'audio/webm' })
    await speichereEinzelneAufnahme({ id: 'stabil-alt', erstelltAm: '2026-11-10T00:00:00Z', dateiname: 'alt.webm', medientyp: 'audio/webm', groesse: audio.size, dauerSekunden: 3, status: 'noch_nicht_uebertragen', audio })

    const ersterStart = await ladeLegacyEintrag()
    expect(ersterStart?.legacyImportId).toMatch(/^legacy-v1-/)
    const begehung = erstelleBegehung(protokoll, () => '00000000-0000-4000-8000-000000000020')
    begehung.eintraege.push(ersterStart!)
    await speichereBegehung(begehung, undefined, ersterStart!.legacyImportId)

    const zweiterStart = await ladeLegacyEintrag()
    const erneutGeladen = await ladeBegehung()
    expect(zweiterStart).toBeNull()
    expect(erneutGeladen?.eintraege.filter((eintrag) => eintrag.status === 'wartet_auf_auswertung')).toHaveLength(1)
    expect(await ladeInterneAufnahme()).not.toBeNull()

    let externeAuftraege = 0
    await verarbeiteWarteschlange(erneutGeladen!, () => true, async (eintrag) => {
      externeAuftraege += 1
      uebernehmeAuswertung(eintrag, { text: 'erfolgreich verarbeitet', gruppe: 'Test', thema: 'Test', inhalt: 'Test' })
      return true
    })
    await speichereBegehung(erneutGeladen!)
    const dritterStart = await ladeBegehung()
    await verarbeiteWarteschlange(dritterStart!, () => true, async () => { externeAuftraege += 1; return true })
    expect(externeAuftraege).toBe(1)
  })
})
