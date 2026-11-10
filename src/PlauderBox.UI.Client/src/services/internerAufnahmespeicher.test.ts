import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ladeInterneAufnahme,
  ladeLokaleBilder,
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

  it('speichert mehrere Bilder und löscht nur das gewählte Bild', async () => {
    const erstesBild: LokalesProtokollpunktbild = {
      id: 'bild-1',
      dateiname: 'mangel.jpg',
      medientyp: 'image/jpeg',
      groesse: 4,
      erstelltAm: '2026-11-09T20:00:00.000Z',
      bild: new Blob(['bild'], { type: 'image/jpeg' }),
    }
    const zweitesBild: LokalesProtokollpunktbild = {
      id: 'bild-2',
      dateiname: 'detail.jpg',
      medientyp: 'image/jpeg',
      groesse: 6,
      erstelltAm: '2026-11-09T20:01:00.000Z',
      bild: new Blob(['detail'], { type: 'image/jpeg' }),
    }

    await speichereLokalesBild(erstesBild)
    await speichereLokalesBild(zweitesBild)
    const geladen = await ladeLokaleBilder()

    expect(geladen.map((bild) => bild.id)).toEqual(['bild-1', 'bild-2'])
    expect(await geladen[0]?.bild.text()).toBe('bild')
    expect(await geladen[1]?.bild.text()).toBe('detail')

    await loescheLokalesBild('bild-1')
    const verbleibend = await ladeLokaleBilder()
    expect(verbleibend).toHaveLength(1)
    expect(verbleibend[0]?.id).toBe('bild-2')
  })

  it('behält Bilder beim Verwerfen der Audioaufnahme', async () => {
    const bild: LokalesProtokollpunktbild = {
      id: 'bild-1',
      dateiname: 'mangel.jpg',
      medientyp: 'image/jpeg',
      groesse: 4,
      erstelltAm: '2026-11-10T08:00:00.000Z',
      bild: new Blob(['bild'], { type: 'image/jpeg' }),
    }
    await speichereLokalesBild(bild)
    await speichereEinzelneAufnahme(erstelleAufnahme('aufnahme-1', 'audio'))

    await loescheInterneAufnahme('aufnahme-1')

    await expect(ladeInterneAufnahme()).resolves.toBeNull()
    const bilder = await ladeLokaleBilder()
    expect(bilder.map((eintrag) => eintrag.id)).toEqual(['bild-1'])
  })

  it('füllt erkannte Gruppe, Thema, Inhalt und Rechtsverweis in leere Felder', () => {
    const protokollpunkt = erstelleProtokollpunkt()

    const geaendert = uebernehmeStrukturvorschlaege(protokollpunkt, {
      gruppe: 'Brandschutz',
      thema: 'Fehlender Feuerlöscher',
      inhalt: 'Der vorgesehene Feuerlöscher fehlt.',
      rechtsverweis: 'VKF 12-15',
    })

    expect(geaendert).toBe(true)
    expect(protokollpunkt.strGruppe).toBe('Brandschutz')
    expect(protokollpunkt.strProtokollpunkt).toBe('Fehlender Feuerlöscher')
    expect(protokollpunkt.txtProtokollpunkt).toBe('Der vorgesehene Feuerlöscher fehlt.')
    expect(protokollpunkt.strRechtsverweis).toBe('VKF 12-15')
  })

  it('überschreibt keine bereits kontrollierten Felder', () => {
    const protokollpunkt = erstelleProtokollpunkt()
    protokollpunkt.strGruppe = 'Manuelle Gruppe'
    protokollpunkt.strProtokollpunkt = 'Manuelles Thema'
    protokollpunkt.txtProtokollpunkt = 'Manueller Inhalt'
    protokollpunkt.strRechtsverweis = 'Manueller Rechtsverweis'

    const geaendert = uebernehmeStrukturvorschlaege(protokollpunkt, {
      gruppe: 'KI-Gruppe',
      thema: 'KI-Thema',
      inhalt: 'KI-Inhalt',
      rechtsverweis: 'KI-Rechtsverweis',
    })

    expect(geaendert).toBe(false)
    expect(protokollpunkt.strGruppe).toBe('Manuelle Gruppe')
    expect(protokollpunkt.strProtokollpunkt).toBe('Manuelles Thema')
    expect(protokollpunkt.txtProtokollpunkt).toBe('Manueller Inhalt')
    expect(protokollpunkt.strRechtsverweis).toBe('Manueller Rechtsverweis')
  })
})
