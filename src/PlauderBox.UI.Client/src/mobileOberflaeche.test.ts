import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function lese(pfad: string): string {
  return readFileSync(new URL(pfad, import.meta.url), 'utf8')
}

describe('mobile Komponenten- und Navigationsverträge', () => {
  it('verdrahtet alle acht freigegebenen Ansichten ohne Abschluss-Sackgasse', () => {
    const app = lese('./App.vue')
    for (const komponente of [
      'QrCodeStart',
      'BegehungStart',
      'AktiveBegehung',
      'EintragErfassen',
      'OfflineHinweis',
      'EintragAuswertung',
      'BegehungKontrolle',
      'BegehungAbschluss',
    ]) {
      expect(app).toContain(komponente)
    }
    expect(app).toContain('@neu-starten="verwirfBegehungUndScanneNeu"')
    expect(app).toContain('@freigabe-erneuern="beginneFreigabeErneuerung"')
    const uebergabe = lese('./composables/verwendeHappyHourUebergabe.ts')
    expect(uebergabe).toContain('neuerKontext.protokollId !== begehung.protokoll.protokollId')
    const abschluss = lese('./components/BegehungAbschluss.vue')
    expect(abschluss).toContain('Lokale Begehung verwerfen und neuen Code scannen')
    expect(abschluss).toContain('Punkte und Bilder an HappyHour übergeben')
    expect(abschluss).toContain('Bilder an HappyHour nachliefern')
    expect(abschluss).toContain('Freigabe erneuern')
  })

  it('zeigt Zuordnung, externe KI-Übertragung und commitabhängigen Speicherstatus', () => {
    const erfassung = lese('./components/EintragErfassen.vue')
    expect(erfassung).toContain('Vorbereiteter Protokollpunkt')
    expect(erfassung).toContain('Traktandum')
    expect(erfassung).toContain('an OpenAI')
    expect(erfassung).toContain("speicherstatus === 'gespeichert'")
    expect(erfassung).toContain('await speichereEntwurf')
    expect(erfassung).toContain('QuotaExceededError')
    expect(erfassung).toContain('Lokale Sicherung erneut versuchen')
  })

  it('trennt Kamera und Galerie und sichert alle Bilder mit einer Aktion ohne ZIP', () => {
    const erfassung = lese('./components/EintragErfassen.vue')
    const abschluss = lese('./components/BegehungAbschluss.vue')
    const sicherung = lese('./services/bildSicherung.ts')
    expect(erfassung).toContain('Foto aufnehmen')
    expect(erfassung).toContain('capture="environment"')
    expect(erfassung).toContain('Aus Galerie wählen')
    expect(erfassung).toContain('accept="image/*" multiple')
    expect(erfassung).toContain('if (!auswahl.bilder.length)')
    expect(erfassung).toContain("if (gespeichert && auswahl.fehler.length) meldung.value = auswahl.fehler.join(' ')")
    expect(abschluss).toContain('Alle ${bildAnzahl} Bilder sichern')
    expect(abschluss).toContain('Es wird kein ZIP erstellt.')
    expect(sicherung).toContain('teiler.canShare?.({ files: dateien })')
    expect(sicherung).toContain('for (const datei of dateien) downloader(datei)')
    expect(sicherung.toLocaleLowerCase('de-CH')).not.toContain("'.zip'")
  })

  it('öffnet auch ausgewertete Punkte in der vollständigen Mutation', () => {
    const app = lese('./composables/verwendeBegehung.ts')
    const erfassung = lese('./components/EintragErfassen.vue')
    expect(app).toContain("ansicht.value = 'erfassen'")
    for (const inhalt of [
      'Vorbereiteter Protokollpunkt',
      'Traktandum',
      'Art des Protokollpunkts',
      'Foto aufnehmen',
      'Aus Galerie wählen',
      'Aufnahme verwerfen',
      'Gruppe',
      'Thema',
      'Inhalt (Um was geht es?)',
      'Rechtsverweis',
    ]) {
      expect(erfassung).toContain(inhalt)
    }
    expect(erfassung).toMatch(/<span>\s*Wer\s*<\/span\s*>/)
  })

  it('erzeugt neue Punkte protokollbezogen und zeigt deduplizierte Wer-Optionen', () => {
    const app = lese('./composables/verwendeBegehung.ts')
    const erfassung = lese('./components/EintragErfassen.vue')
    expect(app).toContain('erstelleEintragFuerProtokoll(begehung.value.protokoll)')
    expect(app).toContain('normalisiereEintragProjektAnsprechpartner(legacyEintrag.value, neueBegehung.protokoll)')
    expect(erfassung).toContain('eindeutigeVerteileroptionen(props.protokoll)')
    expect(erfassung).toContain('v-for="person in verteileroptionen"')
  })

  it('führt eine Offline-Mutation ohne Audio nicht in eine behauptete Aufnahme-Warteschlange', () => {
    const app = lese('./composables/verwendeBegehung.ts')
    const offline = lese('./components/OfflineHinweis.vue')
    expect(app).toMatch(/if \(!eintrag\.audio\) \{\s+ansicht\.value = 'aktiv'\s+return\s+\}/)
    expect(offline).toContain('Es wartet keine Audioaufnahme auf eine Auswertung.')
    expect(offline).toContain("anzahlAusstehend === 1 ? 'Eintrag wurde' : 'Einträge wurden'")
  })

  it('zeigt beim Begehungsstart einen laufenden Zustand und einen lokalen Speicherfehler', () => {
    const app = lese('./composables/verwendeBegehung.ts')
    const start = lese('./components/BegehungStart.vue')
    expect(app).toMatch(
      /startzustand\.value = \{\s+art: 'fehler',\s+meldung: 'Die Begehung konnte nicht im internen App-Speicher gestartet werden\. Bitte erneut versuchen\.',\s+\}/,
    )
    expect(start).toContain("startLaeuft ? 'Begehung wird gestartet …' : 'Begehung starten'")
    expect(start).toContain('role="alert"')
  })

  it('definiert mindestens 44 Pixel hohe Touchziele', () => {
    const styles = lese('./styles.css')
    expect(styles).toMatch(/\.entry-accordion summary,\s+button,\s+\.image-action \{\s+min-height: 44px;\s+\}/)
    expect(styles).toMatch(/\.capture-images button[^}]+width: 44px;\s+height: 44px;/)
  })
})
