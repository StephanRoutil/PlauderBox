import { expect, test } from '@playwright/test'

const freigabeToken = 'AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789'
const eintragId = '10000000-0000-4000-8000-000000000001'

test('sichert offline, übersteht den Neustart und übergibt nach Wiederverbindung', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => localStorage.getItem('plauderbox-test-online') !== 'false',
    })
  })
  await page.route('**/api/transkribieren', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text: 'Synthetisches Transkript',
        gruppe: 'Ausgewertete Gruppe',
        thema: 'Ausgewertetes Thema',
        inhalt: 'Ausgewerteter Inhalt',
        rechtsverweis: '',
        modell: 'synthetisch',
        strukturmodell: 'synthetisch',
      }),
    })
  })
  await page.route('**/api/happyhour/protokollpunkte/uebergeben', async (route) => {
    const anforderung = route.request().postDataJSON() as { eintraege: Array<{ erfassungsId: string }> }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ergebnisse: anforderung.eintraege.map((eintrag) => ({
          erfassungsId: eintrag.erfassungsId,
          protokollpunktId: 41,
          erstellt: true,
        })),
      }),
    })
  })
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/')
  await page.evaluate(
    async ({ token, id }) => {
      localStorage.setItem('plauderbox-test-online', 'false')
      const datenbank = await new Promise<IDBDatabase>((resolve, reject) => {
        const anfrage = indexedDB.open('PlauderBoxBegehungsspeicher', 2)
        anfrage.addEventListener('upgradeneeded', () => {
          for (const name of ['begehungen', 'audio', 'bilder']) {
            if (!anfrage.result.objectStoreNames.contains(name)) anfrage.result.createObjectStore(name)
          }
        })
        anfrage.addEventListener('success', () => resolve(anfrage.result))
        anfrage.addEventListener('error', () => reject(anfrage.error))
      })
      const transaktion = datenbank.transaction(['begehungen', 'audio', 'bilder'], 'readwrite')
      transaktion.objectStore('audio').put(
        {
          dateiname: 'aufnahme.webm',
          medientyp: 'audio/webm',
          groesse: 5,
          dauerSekunden: 1,
          audio: new Blob(['audio'], { type: 'audio/webm' }),
        },
        `${id}:audio`,
      )
      transaktion.objectStore('begehungen').put(
        {
          schemaVersion: 2,
          id: '20000000-0000-4000-8000-000000000001',
          gestartetAm: '2026-11-12T08:00:00Z',
          aktualisiertAm: '2026-11-12T08:00:00Z',
          status: 'aktiv',
          protokoll: {
            protokollId: 378,
            protokollNummer: 1,
            thema: 'Browser-Begehung',
            typ: 'Protokoll',
            status: 'Entwurf',
            datum: '2026-11-12',
            ort: null,
            projekt: { id: 1, nummer: 203, bezeichnung: 'Testprojekt' },
            objekt: null,
            mitarbeiter: { id: 1, name: 'Testperson' },
            traktanden: [],
            verteiler: [
              {
                id: 1,
                projektAnsprechpartnerId: 10,
                person: 'Erika Muster',
                firma: null,
                funktion: 'Bauleitung',
                istTeilnehmer: true,
                istCc: false,
                istProtokollschreiber: true,
              },
            ],
            protokollpunkte: [],
            protokollpunktArten: [{ id: 5, bezeichnung: 'Feststellung' }],
          },
          freigabeToken: token,
          aktuellerEintragId: id,
          eintraege: [
            {
              id,
              erstelltAm: '2026-11-12T08:00:00Z',
              aktualisiertAm: '2026-11-12T08:00:00Z',
              status: 'wartet_auf_auswertung',
              traktandum: '',
              vorbereiteterProtokollpunktId: null,
              protokollpunktArtId: 5,
              projektAnsprechpartnerId: 10,
              gruppe: 'Offline-Gruppe',
              thema: 'Offline-Thema',
              inhalt: 'Offline-Inhalt',
              rechtsverweis: '',
              transkript: '',
              fehler: '',
              audioSchluessel: `${id}:audio`,
              bildSchluessel: [],
            },
          ],
        },
        'aktive-begehung',
      )
      await new Promise<void>((resolve, reject) => {
        transaktion.addEventListener('complete', () => resolve())
        transaktion.addEventListener('error', () => reject(transaktion.error))
      })
      datenbank.close()
    },
    { token: freigabeToken, id: eintragId },
  )

  await page.reload()
  await expect(page.getByText('Offline', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Eintrag mutieren' }).click()
  const thema = page.locator('.review-form input').nth(1)
  await thema.fill('Offline geändert')
  await thema.blur()
  await page.getByRole('button', { name: 'Lokal sichern' }).click()
  await expect(page.getByRole('heading', { name: 'Aktuell keine Verbindung' })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Offline geändert', { exact: true }).first()).toBeVisible()
  await page.evaluate(() => {
    localStorage.setItem('plauderbox-test-online', 'true')
    window.dispatchEvent(new Event('online'))
  })
  await expect(page.getByText(/ausgewertet/, { exact: false }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Begehung beenden / zur Kontrolle' }).click()
  await page.getByRole('button', { name: 'Begehung abschliessen' }).click()
  await page.getByRole('button', { name: 'Punkte und Bilder an HappyHour übergeben' }).click()
  await expect(
    page.getByText('Alle kontrollierten Protokollpunkte und Bilder sind in HappyHour angekommen.'),
  ).toBeVisible()
})
