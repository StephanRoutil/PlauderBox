import { describe, expect, it, vi } from 'vitest'
import { pruefeBildauswahl, sichereBegehungsbilder, sammleBegehungsbilder } from './bildSicherung'
import type { LokaleBegehung, LokalesBild } from './begehungsSpeicher'

function bild(id: string, dateiname: string, inhalt: string): LokalesBild {
  const blob = new Blob([inhalt], { type: 'image/jpeg' })
  return { id, dateiname, medientyp: 'image/jpeg', groesse: blob.size, erstelltAm: '2026-11-11T08:00:00Z', bild: blob }
}

function begehung(): LokaleBegehung {
  return {
    id: 'begehung-1', gestartetAm: '2026-11-11T08:00:00Z', aktualisiertAm: '2026-11-11T08:00:00Z', status: 'lokal_abgeschlossen', freigabeToken: 'redigiert', aktuellerEintragId: 'eintrag-1',
    protokoll: {
      protokollId: 378, protokollNummer: 3, thema: 'Test', typ: 'Protokoll', status: 'Entwurf', datum: '2026-11-11', ort: null,
      projekt: { id: 450, nummer: 450, bezeichnung: 'Testprojekt' }, objekt: null, mitarbeiter: { id: 1, name: 'Testperson' }, traktanden: [], verteiler: [], protokollpunkte: [],
    },
    eintraege: [
      { id: 'eintrag-1', erstelltAm: '2026-11-11T08:00:00Z', aktualisiertAm: '2026-11-11T08:00:00Z', status: 'ausgewertet', traktandum: '', vorbereiteterProtokollpunktId: null, protokollpunktArtId: 1, projektAnsprechpartnerId: 77, gruppe: 'Löschgeräte / UG', thema: 'Zugang', inhalt: 'Verstellt', rechtsverweis: '', transkript: '', fehler: '', audio: null, bilder: [bild('bild-1', 'kamera.jpg', 'eins'), bild('bild-2', 'galerie.jpeg', 'zwei')] },
      { id: 'eintrag-2', erstelltAm: '2026-11-11T08:05:00Z', aktualisiertAm: '2026-11-11T08:05:00Z', status: 'ausgewertet', traktandum: '', vorbereiteterProtokollpunktId: null, protokollpunktArtId: 1, projektAnsprechpartnerId: 77, gruppe: '', thema: 'Ohne Gruppe', inhalt: 'Hinweis', rechtsverweis: '', transkript: '', fehler: '', audio: null, bilder: [bild('bild-3', 'aufnahme.jpg', 'drei')] },
    ],
  }
}

describe('einmalige Sicherung aller Begehungsbilder', () => {
  it('lehnt Nichtbilder und über 15 MB grosse Bilder sichtbar ab', () => {
    const keinBild = new File(['text'], 'notiz.txt', { type: 'text/plain' })
    const zuGross = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'gross.jpg', { type: 'image/jpeg' })
    const ergebnis = pruefeBildauswahl([keinBild, zuGross], () => 'nicht-verwendet', () => '2026-11-11T08:00:00Z')

    expect(ergebnis.bilder).toHaveLength(0)
    expect(ergebnis.fehler).toEqual(['notiz.txt ist keine Bilddatei.', 'gross.jpg ist grösser als 15 MB.'])
  })

  it('lehnt HEIC und WebP vor der lokalen Übernahme mit einem verständlichen Hinweis ab', () => {
    const ergebnis = pruefeBildauswahl([
      new File(['heic'], 'galerie.heic', { type: 'image/heic' }),
      new File(['webp'], 'galerie.webp', { type: 'image/webp' }),
    ])
    expect(ergebnis.bilder).toHaveLength(0)
    expect(ergebnis.fehler).toEqual([
      'galerie.heic hat ein nicht unterstütztes Bildformat. Bitte JPEG, PNG, GIF oder TIFF wählen.',
      'galerie.webp hat ein nicht unterstütztes Bildformat. Bitte JPEG, PNG, GIF oder TIFF wählen.',
    ])
  })

  it('übernimmt bei gemischter Auswahl gültige Bilder und behält die Ablehnung daneben', () => {
    const gueltig = new File(['bild'], 'gueltig.jpg', { type: 'image/jpeg', lastModified: Date.parse('2026-11-10T07:30:15.123Z') })
    const ungueltig = new File(['text'], 'notiz.txt', { type: 'text/plain' })
    const ergebnis = pruefeBildauswahl([gueltig, ungueltig], () => 'bild-id', () => '2026-11-11T08:00:00Z')

    expect(ergebnis.bilder).toHaveLength(1)
    expect(ergebnis.bilder[0]).toMatchObject({ id: 'bild-id', dateiname: 'gueltig.jpg', erstelltAm: '2026-11-10T07:30:15.123Z' })
    expect(ergebnis.fehler).toEqual(['notiz.txt ist keine Bilddatei.'])
  })

  it('erstellt einzelne, geordnete Bilddateien ohne ZIP und ohne Veränderung des Originals', async () => {
    const dateien = sammleBegehungsbilder(begehung())
    expect(dateien.map((datei) => datei.name)).toEqual([
      '450_P003_01_Loschgerate-UG_01.jpg',
      '450_P003_01_Loschgerate-UG_02.jpeg',
      '450_P003_02_Ohne-Gruppe_01.jpg',
    ])
    expect(dateien.every((datei) => datei.type === 'image/jpeg')).toBe(true)
    expect(await Promise.all(dateien.map((datei) => datei.text()))).toEqual(['eins', 'zwei', 'drei'])
  })

  it('übergibt alle einzelnen Bilder mit genau einem Share-Aufruf', async () => {
    const geteilteDaten: ShareData[] = []
    const share = vi.fn(async (daten?: ShareData) => { if (daten) geteilteDaten.push(daten) })
    const downloader = vi.fn()
    const ergebnis = await sichereBegehungsbilder(begehung(), { canShare: () => true, share }, downloader)

    expect(ergebnis).toEqual({ art: 'geteilt', anzahl: 3 })
    expect(share).toHaveBeenCalledTimes(1)
    expect(geteilteDaten[0]?.files).toHaveLength(3)
    expect(downloader).not.toHaveBeenCalled()
  })

  it('startet bei fehlender Share-Unterstützung alle Einzel-Downloads aus einer Aktion', async () => {
    const downloader = vi.fn()
    const ergebnis = await sichereBegehungsbilder(begehung(), { canShare: () => false }, downloader)

    expect(ergebnis).toEqual({ art: 'heruntergeladen', anzahl: 3 })
    expect(downloader).toHaveBeenCalledTimes(3)
    expect(downloader.mock.calls.map(([datei]) => datei.name).every((name) => !name.toLocaleLowerCase('de-CH').endsWith('.zip'))).toBe(true)
  })

  it('übergibt auch 82 Bilder mit genau einem Share-Aufruf', async () => {
    const grosserRundgang = begehung()
    grosserRundgang.eintraege[0]!.bilder = Array.from({ length: 82 }, (_, index) => bild(`bild-${index + 1}`, `kamera-${index + 1}.jpg`, `bild-${index + 1}`))
    grosserRundgang.eintraege[1]!.bilder = []
    const canShare = vi.fn(() => true)
    const share = vi.fn(async (_daten?: ShareData) => undefined)

    const ergebnis = await sichereBegehungsbilder(grosserRundgang, { canShare, share }, vi.fn())

    expect(ergebnis).toEqual({ art: 'geteilt', anzahl: 82 })
    expect(canShare).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledTimes(1)
  })

  it('verwendet bei einer fehlerhaften Share-Fähigkeitsprüfung den Einzeldatei-Fallback', async () => {
    const downloader = vi.fn()
    const ergebnis = await sichereBegehungsbilder(begehung(), { canShare: () => { throw new Error('nicht unterstützt') } }, downloader)
    expect(ergebnis).toEqual({ art: 'heruntergeladen', anzahl: 3 })
    expect(downloader).toHaveBeenCalledTimes(3)
  })
})
