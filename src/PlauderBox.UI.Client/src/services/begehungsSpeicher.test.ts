import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import {
  bereiteWiederanlaufVor,
  BegehungSpeicherfehler,
  committeEintrag,
  committeFreigabeErneuerung,
  committeHappyHourUebergabe,
  eindeutigeVerteileroptionen,
  erstelleBegehung,
  erstelleEintrag,
  erstelleEintragFuerProtokoll,
  gruppiereEintraege,
  istEintragUnvollstaendig,
  ladeBegehung,
  loescheBegehung,
  naechsterAusstehenderEintrag,
  normalisiereEintragProjektAnsprechpartner,
  normalisiereProjektAnsprechpartnerId,
  speichereBegehung,
  uebernehmeAuswertung,
  zaehleAusstehendeAudioaufnahmen,
} from './begehungsSpeicher'
import type { HappyHourProtokollKontext } from './happyHourProtokollKontext'

const protokoll: HappyHourProtokollKontext = {
  protokollId: 378,
  protokollNummer: 1,
  thema: 'Brandschutzrundgang',
  typ: 'Protokoll',
  status: 'Entwurf',
  datum: '2026-11-10',
  ort: null,
  projekt: { id: 1, nummer: 799, bezeichnung: 'Testprojekt' },
  objekt: null,
  mitarbeiter: { id: 1, name: 'Testperson' },
  traktanden: [],
  verteiler: [{ id: 7, projektAnsprechpartnerId: 77, person: 'Protokollschreiberin', firma: 'Testfirma', funktion: 'Protokollführung', istTeilnehmer: true, istCc: false, istProtokollschreiber: true }],
  protokollpunkte: [],
  protokollpunktArten: [{ id: 1, bezeichnung: 'Feststellung' }],
}

async function speichereVersionEins(wert: unknown): Promise<void> {
  const datenbank = await new Promise<IDBDatabase>((resolve, reject) => {
    const anfrage = indexedDB.open('PlauderBoxBegehungsspeicher', 1)
    anfrage.addEventListener('upgradeneeded', () => anfrage.result.createObjectStore('begehungen'))
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error))
  })
  const transaktion = datenbank.transaction('begehungen', 'readwrite')
  transaktion.objectStore('begehungen').put(wert, 'aktive-begehung')
  await new Promise<void>((resolve, reject) => {
    transaktion.addEventListener('complete', () => resolve())
    transaktion.addEventListener('error', () => reject(transaktion.error))
  })
  datenbank.close()
}

async function speichereVersionZwei(wert: unknown): Promise<void> {
  const datenbank = await new Promise<IDBDatabase>((resolve, reject) => {
    const anfrage = indexedDB.open('PlauderBoxBegehungsspeicher', 2)
    anfrage.addEventListener('upgradeneeded', () => {
      anfrage.result.createObjectStore('begehungen')
      anfrage.result.createObjectStore('audio')
      anfrage.result.createObjectStore('bilder')
    })
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error))
  })
  const transaktion = datenbank.transaction('begehungen', 'readwrite')
  transaktion.objectStore('begehungen').put(wert, 'aktive-begehung')
  await new Promise<void>((resolve, reject) => {
    transaktion.addEventListener('complete', () => resolve())
    transaktion.addEventListener('error', () => reject(transaktion.error))
  })
  datenbank.close()
}

async function leseDatenbankstand(version: number): Promise<{ version: number; wert: unknown; stores: string[] }> {
  const datenbank = await new Promise<IDBDatabase>((resolve, reject) => {
    const anfrage = indexedDB.open('PlauderBoxBegehungsspeicher', version)
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error))
  })
  const anfrage = datenbank.transaction('begehungen', 'readonly').objectStore('begehungen').get('aktive-begehung')
  const wert = await new Promise<unknown>((resolve, reject) => {
    anfrage.addEventListener('success', () => resolve(anfrage.result))
    anfrage.addEventListener('error', () => reject(anfrage.error))
  })
  const ergebnis = { version: datenbank.version, wert, stores: Array.from(datenbank.objectStoreNames) }
  datenbank.close()
  return ergebnis
}

describe('Begehungsspeicher und Fachzustände', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '00000000-0000-4000-8000-000000000001') })
  })

  it('speichert die gesamte aktive Begehung mit Audio und Bildern und löscht sie bewusst', async () => {
    const begehung = erstelleBegehung(protokoll)
    const eintrag = erstelleEintrag()
    eintrag.status = 'wartet_auf_auswertung'
    eintrag.audio = { dateiname: 'aufnahme.webm', medientyp: 'audio/webm', groesse: 5, dauerSekunden: 3, audio: new Blob(['audio']) }
    eintrag.bilder.push({ id: 'bild-1', dateiname: 'bild.jpg', medientyp: 'image/jpeg', groesse: 4, erstelltAm: eintrag.erstelltAm, bild: new Blob(['bild']) })
    begehung.eintraege.push(eintrag)

    await speichereBegehung(begehung)
    const geladen = await ladeBegehung()

    expect(geladen?.eintraege[0]?.status).toBe('wartet_auf_auswertung')
    expect(await geladen?.eintraege[0]?.audio?.audio.text()).toBe('audio')
    expect(await geladen?.eintraege[0]?.bilder[0]?.bild.text()).toBe('bild')
    await loescheBegehung()
    await expect(ladeBegehung()).resolves.toBeNull()
  })

  it('migriert Version 1 atomar in getrennte Audio- und Bildspeicher ohne Datenverlust', async () => {
    const alt = erstelleBegehung(protokoll)
    const eintrag = erstelleEintrag()
    eintrag.audio = { dateiname: 'alt.webm', medientyp: 'audio/webm', groesse: 5, dauerSekunden: 2, audio: new Blob(['alt-audio']) }
    eintrag.bilder.push({ id: 'alt-bild', dateiname: 'alt.jpg', medientyp: 'image/jpeg', groesse: 4, erstelltAm: eintrag.erstelltAm, bild: new Blob(['alt-bild']) })
    alt.eintraege.push(eintrag)
    await speichereVersionEins(alt)

    const geladen = await ladeBegehung()
    const datenbankstand = await leseDatenbankstand(2)

    expect(await geladen?.eintraege[0]?.audio?.audio.text()).toBe('alt-audio')
    expect(await geladen?.eintraege[0]?.bilder[0]?.bild.text()).toBe('alt-bild')
    expect(datenbankstand.stores.sort()).toEqual(['audio', 'begehungen', 'bilder'])
    expect(datenbankstand.wert).toMatchObject({ schemaVersion: 2, eintraege: [{ audioSchluessel: expect.any(String), bildSchluessel: [expect.any(String)] }] })
    expect((datenbankstand.wert as { eintraege: Array<Record<string, unknown>> }).eintraege[0]).not.toHaveProperty('audio')
    expect((datenbankstand.wert as { eintraege: Array<Record<string, unknown>> }).eintraege[0]).not.toHaveProperty('bilder')
  })

  it('lässt Version-1-Daten bei abgebrochener Migration unverändert', async () => {
    const unlesbar = { id: 'altbestand', aktualisiertAm: '2026-11-10T00:00:00Z', eintraege: null }
    await speichereVersionEins(unlesbar)

    await expect(ladeBegehung()).rejects.toBeTruthy()
    const datenbankstand = await leseDatenbankstand(1)

    expect(datenbankstand.version).toBe(1)
    expect(datenbankstand.stores).toEqual(['begehungen'])
    expect(datenbankstand.wert).toEqual(unlesbar)
  })

  it('meldet einen unvollständigen Version-2-Datensatz und löscht ihn nicht', async () => {
    const unvollstaendig = { schemaVersion: 2, id: 'unvollstaendig', eintraege: [] }
    await speichereVersionZwei(unvollstaendig)

    await expect(ladeBegehung()).rejects.toEqual(new BegehungSpeicherfehler('unlesbare_daten'))
    expect((await leseDatenbankstand(2)).wert).toEqual(unvollstaendig)
  })

  it('meldet einen Datensatz ohne Schemaversion und löscht ihn nicht', async () => {
    const ohneVersion = { id: 'ohne-version', eintraege: [] }
    await speichereVersionZwei(ohneVersion)

    await expect(ladeBegehung()).rejects.toEqual(new BegehungSpeicherfehler('unlesbare_daten'))
    expect((await leseDatenbankstand(2)).wert).toEqual(ohneVersion)
  })

  it('entfernt Vue-Proxys an der IndexedDB-Grenze und startet die mobile Begehung dauerhaft', async () => {
    const reaktiveBegehung = reactive(erstelleBegehung(protokoll))
    const eintrag = reactive(erstelleEintrag())
    eintrag.bilder.push({ id: 'bild-proxy', dateiname: 'proxy.jpg', medientyp: 'image/jpeg', groesse: 4, erstelltAm: eintrag.erstelltAm, bild: new Blob(['bild']) })
    reaktiveBegehung.eintraege.push(eintrag)

    await expect(speichereBegehung(reaktiveBegehung)).resolves.toBeUndefined()
    const geladen = await ladeBegehung()

    expect(geladen?.protokoll.projekt.bezeichnung).toBe('Testprojekt')
    expect(geladen?.eintraege[0]?.bilder[0]?.id).toBe('bild-proxy')
    expect(await geladen?.eintraege[0]?.bilder[0]?.bild.text()).toBe('bild')
  })

  it('gruppiert alphabetisch und führt leere Gruppen sichtbar zusammen', () => {
    const ohne = erstelleEintrag()
    const brandschutz = erstelleEintrag()
    brandschutz.gruppe = 'Brandschutz'
    const elektro = erstelleEintrag()
    elektro.gruppe = 'Elektro'

    expect(gruppiereEintraege([elektro, ohne, brandschutz]).map((gruppe) => gruppe.gruppe))
      .toEqual(['Brandschutz', 'Elektro', 'Noch ohne Gruppe'])
  })

  it('erkennt unvollständige und ausstehende Einträge', () => {
    const begehung = erstelleBegehung(protokoll)
    const eintrag = erstelleEintrag()
    eintrag.status = 'wartet_auf_auswertung'
    begehung.eintraege.push(eintrag)

    expect(istEintragUnvollstaendig(eintrag)).toBe(true)
    expect(naechsterAusstehenderEintrag(begehung)?.id).toBe(eintrag.id)
  })

  it('übernimmt Auswertung nur in leere Felder und löscht Audio erst nach Erfolg', () => {
    const eintrag = erstelleEintrag()
    eintrag.gruppe = 'Manuell'
    eintrag.status = 'wird_ausgewertet'
    eintrag.audio = { dateiname: 'aufnahme.webm', medientyp: 'audio/webm', groesse: 5, dauerSekunden: 3, audio: new Blob(['audio']) }

    uebernehmeAuswertung(eintrag, {
      text: 'Transkript',
      gruppe: 'KI-Gruppe',
      thema: 'Türe blockiert',
      inhalt: 'Der Fluchtweg ist blockiert.',
      rechtsverweis: 'VKF 12-15',
    })

    expect(eintrag.gruppe).toBe('Manuell')
    expect(eintrag.thema).toBe('Türe blockiert')
    expect(eintrag.status).toBe('ausgewertet')
    expect(eintrag.audio).toBeNull()
  })

  it('übernimmt vorbereitete HappyHour-Punkte als kontrollierbare Einträge', () => {
    const begehung = erstelleBegehung({
      ...protokoll,
      protokollpunkte: [{ id: 10, guid: 'punkt-10', protokollpunktArtId: 1, projektAnsprechpartnerId: null, gruppe: 'Brandschutz', reihenfolge: 1, thema: 'Türe', inhalt: 'Türe kontrollieren', rechtsverweis: null }],
    })

    expect(begehung.eintraege).toHaveLength(1)
    expect(begehung.eintraege[0]).toMatchObject({ id: 'punkt-10', status: 'ausgewertet', protokollpunktArtId: 1, projektAnsprechpartnerId: 77, gruppe: 'Brandschutz', thema: 'Türe' })
  })

  it('belegt neue Einträge mit der als Protokollschreiber markierten Person vor', () => {
    const kontext = {
      ...protokoll,
      verteiler: [
        { ...protokoll.verteiler[0]!, id: 8, projektAnsprechpartnerId: 12, person: 'Teilnehmer', istProtokollschreiber: false },
        protokoll.verteiler[0]!,
      ],
    }
    const eintrag = erstelleEintragFuerProtokoll(kontext)
    expect(eintrag.projektAnsprechpartnerId).toBe(77)
  })

  it('setzt ohne genau einen Protokollschreiber keinen Standard und behält gültige Kandidaten', () => {
    const ohneSchreiber = { ...protokoll, verteiler: [{ ...protokoll.verteiler[0]!, projektAnsprechpartnerId: 12, istProtokollschreiber: false }] }
    expect(erstelleEintragFuerProtokoll(ohneSchreiber).projektAnsprechpartnerId).toBeNull()
    expect(normalisiereProjektAnsprechpartnerId(ohneSchreiber, 12)).toBe(12)

    const zweiSchreiber = { ...protokoll, verteiler: [protokoll.verteiler[0]!, { ...protokoll.verteiler[0]!, id: 8, projektAnsprechpartnerId: 88 }] }
    expect(erstelleEintragFuerProtokoll(zweiSchreiber).projektAnsprechpartnerId).toBeNull()
  })

  it('normalisiert eine fremde Zuständigkeit vorbereiteter Punkte auf den eindeutigen Protokollschreiber', () => {
    const begehung = erstelleBegehung({
      ...protokoll,
      protokollpunkte: [{ id: 10, guid: 'punkt-10', protokollpunktArtId: 1, projektAnsprechpartnerId: 999, gruppe: 'Brandschutz', reihenfolge: 1, thema: 'Türe', inhalt: 'Kontrolle', rechtsverweis: null }],
    })
    expect(begehung.eintraege[0]?.projektAnsprechpartnerId).toBe(77)
  })

  it('normalisiert alte Einträge beim Wiederanlauf gegen den aktuellen Verteiler', () => {
    const begehung = erstelleBegehung(protokoll)
    const alt = erstelleEintrag()
    alt.projektAnsprechpartnerId = 999
    begehung.eintraege.push(alt)
    expect(bereiteWiederanlaufVor(begehung)).toBe(true)
    expect(alt.projektAnsprechpartnerId).toBe(77)

    const kontextOhneSchreiber = { ...protokoll, verteiler: [] }
    alt.projektAnsprechpartnerId = 999
    expect(normalisiereEintragProjektAnsprechpartner(alt, kontextOhneSchreiber)).toBe(true)
    expect(alt.projektAnsprechpartnerId).toBeNull()
  })

  it('dedupliziert Verteileroptionen anhand der Projektansprechpartner-ID', () => {
    const mitDuplikat = { ...protokoll, verteiler: [protokoll.verteiler[0]!, { ...protokoll.verteiler[0]!, id: 9, person: 'Doppelte Zeile' }] }
    expect(eindeutigeVerteileroptionen(mitDuplikat).map((person) => person.projektAnsprechpartnerId)).toEqual([77])
  })

  it('behält die protokollbezogene Standardzuständigkeit im IndexedDB-Roundtrip', async () => {
    const begehung = erstelleBegehung(protokoll)
    begehung.eintraege.push(erstelleEintragFuerProtokoll(protokoll))
    await speichereBegehung(begehung)
    const geladen = await ladeBegehung()
    expect(geladen?.eintraege[0]?.projektAnsprechpartnerId).toBe(77)
  })

  it('setzt eine beim Neustart unterbrochene Auswertung sicher in die Warteschlange zurück', () => {
    const begehung = erstelleBegehung(protokoll)
    const eintrag = erstelleEintrag()
    eintrag.status = 'wird_ausgewertet'
    begehung.eintraege.push(eintrag)

    expect(bereiteWiederanlaufVor(begehung)).toBe(true)
    expect(eintrag.status).toBe('wartet_auf_auswertung')
    expect(naechsterAusstehenderEintrag(begehung)?.id).toBe(eintrag.id)
  })

  it('meldet Quota-Fehler weiter und behauptet keinen erfolgreichen Commit', async () => {
    const begehung = erstelleBegehung(protokoll)
    const vorher = begehung.aktualisiertAm
    const quotaFehler = new DOMException('Speicher voll', 'QuotaExceededError')

    await expect(speichereBegehung(begehung, async () => { throw quotaFehler })).rejects.toBe(quotaFehler)
    expect(begehung.aktualisiertAm).toBe(vorher)
  })

  it('tauscht den kanonischen Eintrag bei Commitfehler nicht vorzeitig aus', async () => {
    const begehung = erstelleBegehung(protokoll)
    const kanonisch = erstelleEintrag(() => '00000000-0000-4000-8000-000000000010')
    begehung.eintraege.push(kanonisch)
    const blob = new Blob(['retry-audio'], { type: 'audio/webm' })
    const entwurf = { ...kanonisch, status: 'wartet_auf_auswertung' as const, audio: { dateiname: 'retry.webm', medientyp: 'audio/webm', groesse: blob.size, dauerSekunden: 2, audio: blob } }

    await expect(committeEintrag(begehung, entwurf, async () => { throw new Error('Commit fehlgeschlagen') })).rejects.toThrow('Commit fehlgeschlagen')
    expect(begehung.eintraege[0]).toBe(kanonisch)
    expect(begehung.eintraege[0]?.audio).toBeNull()

    const committed = await committeEintrag(begehung, entwurf, async () => undefined)
    expect(committed.eintraege[0]?.audio?.audio).toBe(blob)
    expect(committed.eintraege[0]?.id).toBe(kanonisch.id)
  })

  it('markiert die HappyHour-Übergabe erst nach erfolgreichem lokalem Commit', async () => {
    const begehung = erstelleBegehung(protokoll)
    begehung.status = 'lokal_abgeschlossen'
    await expect(committeHappyHourUebergabe(begehung, '2026-11-10T22:00:00Z', async () => { throw new Error('Commit fehlgeschlagen') }))
      .rejects.toThrow('Commit fehlgeschlagen')
    expect(begehung.status).toBe('lokal_abgeschlossen')
    expect(begehung.uebertragenAm).toBeUndefined()

    const committed = await committeHappyHourUebergabe(begehung, '2026-11-10T22:00:00Z', async () => undefined)
    expect(committed.status).toBe('an_happyhour_uebertragen')
    expect(committed.uebertragenAm).toBe('2026-11-10T22:00:00Z')
    expect(committed.bilderUebertragenAm).toBe('2026-11-10T22:00:00Z')
  })

  it('erneuert nur die Freigabe und bewahrt Einträge, Bilder und Status atomar', async () => {
    const begehung = erstelleBegehung(protokoll, undefined, 'a'.repeat(43))
    begehung.status = 'lokal_abgeschlossen'
    const eintrag = erstelleEintrag()
    const bild = new Blob(['bild'], { type: 'image/jpeg' })
    eintrag.bilder.push({ id: 'bild-1', dateiname: 'bild.jpg', medientyp: 'image/jpeg', groesse: bild.size, erstelltAm: eintrag.erstelltAm, bild })
    begehung.eintraege.push(eintrag)

    await expect(committeFreigabeErneuerung(begehung, 'b'.repeat(43), 378, async () => { throw new Error('Commit fehlgeschlagen') })).rejects.toThrow('Commit fehlgeschlagen')
    expect(begehung.freigabeToken).toBe('a'.repeat(43))
    expect(begehung.eintraege[0]?.bilder[0]?.bild).toBe(bild)

    await expect(committeFreigabeErneuerung(begehung, 'c'.repeat(43), 379, async () => undefined)).rejects.toThrow('falsches_protokoll')
    expect(begehung.freigabeToken).toBe('a'.repeat(43))

    const committed = await committeFreigabeErneuerung(begehung, 'b'.repeat(43), 378, async () => undefined)
    expect(committed.freigabeToken).toBe('b'.repeat(43))
    expect(committed.status).toBe('lokal_abgeschlossen')
    expect(committed.eintraege).toBe(begehung.eintraege)
    expect(committed.eintraege[0]?.bilder[0]?.bild).toBe(bild)
  })

  it('zählt nur tatsächlich ausstehende Audioaufnahmen und keine reine Offline-Mutation', () => {
    const begehung = erstelleBegehung(protokoll)
    const mutation = erstelleEintrag(() => '00000000-0000-4000-8000-000000000030')
    mutation.status = 'ausgewertet'
    mutation.inhalt = 'Offline korrigierter Text ohne Audio'
    begehung.eintraege.push(mutation)
    expect(zaehleAusstehendeAudioaufnahmen(begehung)).toBe(0)

    const audio = erstelleEintrag(() => '00000000-0000-4000-8000-000000000031')
    audio.status = 'wartet_auf_auswertung'
    audio.audio = { dateiname: 'offline.webm', medientyp: 'audio/webm', groesse: 5, dauerSekunden: 2, audio: new Blob(['audio']) }
    begehung.eintraege.push(audio)
    expect(zaehleAusstehendeAudioaufnahmen(begehung)).toBe(1)
  })
})
