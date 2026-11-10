import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ladeInterneAufnahme,
  ladeLokalesBild,
  ladeLokalenProtokollpunkt,
  loescheInterneAufnahme,
  loescheLokalesBild,
  speichereEinzelneAufnahme,
  speichereLokalesBild,
  speichereLokalenProtokollpunkt,
  uebernehmeStrukturvorschlaege,
  type InterneAufnahme,
  type LokalerProtokollpunkt,
  type LokalesProtokollpunktbild,
} from './internerAufnahmespeicher'

function erstelleAufnahme(id: string, text: string): InterneAufnahme {
  const audio = new Blob([text], { type: 'audio/webm' })
  return {
    id,
    erstelltAm: '2026-11-09T20:00:00.000Z',
    dateiname: `${id}.webm`,
    medientyp: 'audio/webm',
    groesse: audio.size,
    dauerSekunden: 4,
    status: 'noch_nicht_uebertragen',
    audio,
  }
}

function erstelleProtokollpunkt(): LokalerProtokollpunkt {
  return {
    intProtokollpunktID: 0,
    intProtokollFKID: 799,
    intProtokollpunktArtFKID: 1,
    datProtokollpunkt: '2026-11-10',
    blnNachverfolgen: false,
    intProjektAnsprechpartnerFKID: null,
    datFrist: null,
    blnErledigt: true,
    strRechtsverweis: '',
    strGruppe: '',
    strOrt: '',
    intReihenfolge: 0,
    strProtokollpunkt: '',
    txtProtokollpunkt: '',
    GUID: '00000000-0000-4000-8000-000000000001',
    aktualisiertAm: '2026-11-10T07:00:00.000Z',
  }
}

describe('interner Aufnahmespeicher', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    })
  })

  it('speichert und lädt eine Aufnahme samt Audio-Blob', async () => {
    const erwartet = erstelleAufnahme('aufnahme-1', 'audioinhalt')

    await speichereEinzelneAufnahme(erwartet)
    const geladen = await ladeInterneAufnahme()

    expect(geladen?.id).toBe(erwartet.id)
    expect(geladen?.status).toBe('noch_nicht_uebertragen')
    expect(await geladen?.audio.text()).toBe('audioinhalt')
  })

  it('ersetzt die vorhandene Aufnahme, weil dieses Inkrement genau eine Aufnahme erlaubt', async () => {
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-1', 'alt'))
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-2', 'neu'))

    const geladen = await ladeInterneAufnahme()

    expect(geladen?.id).toBe('aufnahme-2')
    expect(await geladen?.audio.text()).toBe('neu')
  })

  it('löscht nur die bestätigte Aufnahme', async () => {
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-1', 'audio'))

    await loescheInterneAufnahme('aufnahme-1')

    await expect(ladeInterneAufnahme()).resolves.toBeNull()
  })

  it('speichert die tblProtokollpunkt-Felder getrennt von der Audioaufnahme', async () => {
    const protokollpunkt: LokalerProtokollpunkt = {
      intProtokollpunktID: 0,
      intProtokollFKID: 799,
      intProtokollpunktArtFKID: 1,
      datProtokollpunkt: '2026-11-09',
      blnNachverfolgen: true,
      intProjektAnsprechpartnerFKID: 42,
      datFrist: '2026-11-23',
      blnErledigt: false,
      strRechtsverweis: 'VKF 12-15',
      strGruppe: 'Brandschutz',
      strOrt: 'Untergeschoss 2, Technikraum',
      intReihenfolge: 0,
      strProtokollpunkt: 'Gefahrstoffraum',
      txtProtokollpunkt: 'Lokaler Entwurf',
      GUID: '00000000-0000-4000-8000-000000000001',
      aktualisiertAm: '2026-11-09T20:00:00.000Z',
    }

    await speichereLokalenProtokollpunkt(protokollpunkt)
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-1', 'audio'))
    await loescheInterneAufnahme('aufnahme-1')

    await expect(ladeLokalenProtokollpunkt()).resolves.toEqual(protokollpunkt)
  })

  it('speichert und löscht genau ein lokales Protokollpunktbild', async () => {
    const bild: LokalesProtokollpunktbild = {
      dateiname: 'mangel.jpg',
      medientyp: 'image/jpeg',
      groesse: 4,
      erstelltAm: '2026-11-09T20:00:00.000Z',
      bild: new Blob(['bild'], { type: 'image/jpeg' }),
    }

    await speichereLokalesBild(bild)
    const geladen = await ladeLokalesBild()

    expect(geladen?.dateiname).toBe('mangel.jpg')
    expect(await geladen?.bild.text()).toBe('bild')

    await loescheLokalesBild()
    await expect(ladeLokalesBild()).resolves.toBeNull()
  })

  it('füllt erkannte Gruppe, Thema, Ort und Transkript in leere Felder', () => {
    const protokollpunkt = erstelleProtokollpunkt()

    const geaendert = uebernehmeStrukturvorschlaege(protokollpunkt, {
      gruppe: 'Brandschutz',
      thema: 'Fehlender Feuerlöscher',
      ort: 'Untergeschoss 2, Technikraum',
      transkript: 'Im Technikraum fehlt der Feuerlöscher.',
    })

    expect(geaendert).toBe(true)
    expect(protokollpunkt.strGruppe).toBe('Brandschutz')
    expect(protokollpunkt.strProtokollpunkt).toBe('Fehlender Feuerlöscher')
    expect(protokollpunkt.strOrt).toBe('Untergeschoss 2, Technikraum')
    expect(protokollpunkt.txtProtokollpunkt).toBe('Im Technikraum fehlt der Feuerlöscher.')
  })

  it('überschreibt keine bereits kontrollierten Felder', () => {
    const protokollpunkt = erstelleProtokollpunkt()
    protokollpunkt.strGruppe = 'Manuelle Gruppe'
    protokollpunkt.strProtokollpunkt = 'Manuelles Thema'
    protokollpunkt.strOrt = 'Manueller Ort'
    protokollpunkt.txtProtokollpunkt = 'Manueller Inhalt'

    const geaendert = uebernehmeStrukturvorschlaege(protokollpunkt, {
      gruppe: 'KI-Gruppe',
      thema: 'KI-Thema',
      ort: 'KI-Ort',
      transkript: 'KI-Inhalt',
    })

    expect(geaendert).toBe(false)
    expect(protokollpunkt.strGruppe).toBe('Manuelle Gruppe')
    expect(protokollpunkt.strProtokollpunkt).toBe('Manuelles Thema')
    expect(protokollpunkt.strOrt).toBe('Manueller Ort')
    expect(protokollpunkt.txtProtokollpunkt).toBe('Manueller Inhalt')
  })
})
