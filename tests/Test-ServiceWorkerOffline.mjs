import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const serviceWorkerPfad = new URL('../src/wwwroot/service-worker.js', import.meta.url)
const serviceWorkerCode = readFileSync(serviceWorkerPfad, 'utf8')
const buildAssetsTreffer = /const BUILD_ASSETS = (\[[^\n]+\])/.exec(serviceWorkerCode)
if (!buildAssetsTreffer) throw new Error('BUILD_ASSETS fehlt im gebauten Service Worker.')
const buildAssets = JSON.parse(buildAssetsTreffer[1])
if (!buildAssets.some((pfad) => pfad.endsWith('.js')) || !buildAssets.some((pfad) => pfad.endsWith('.css'))) {
  throw new Error('Gehashtes Produktions-JS und -CSS fehlen im App-Shell.')
}

const listener = new Map()
const speicher = new Map()
function cache(name) {
  if (!speicher.has(name)) speicher.set(name, new Map())
  const eintraege = speicher.get(name)
  return {
    async addAll(urls) { for (const url of urls) eintraege.set(url, new Response(`offline:${url}`, { status: 200 })) },
    async put(request, response) { eintraege.set(typeof request === 'string' ? request : new URL(request.url).pathname, response) },
    async match(request) { return eintraege.get(typeof request === 'string' ? request : new URL(request.url).pathname) },
  }
}
const caches = {
  async open(name) { return cache(name) },
  async keys() { return [...speicher.keys()] },
  async delete(name) { return speicher.delete(name) },
  async match(request) { for (const eintraege of speicher.values()) { const wert = eintraege.get(typeof request === 'string' ? request : new URL(request.url).pathname); if (wert) return wert } },
}
const self = {
  location: { origin: 'https://plauderbox.test' },
  clients: { async claim() {} },
  async skipWaiting() {},
  addEventListener(name, callback) { listener.set(name, callback) },
}
const kontext = vm.createContext({ self, caches, URL, Response, fetch: async () => { throw new Error('offline') }, console })
vm.runInContext(serviceWorkerCode, kontext, { filename: 'service-worker.js' })

let installation
listener.get('install')({ waitUntil(promise) { installation = promise } })
await installation
for (const asset of buildAssets) if (!await caches.match(asset)) throw new Error(`Produktionsasset nicht vorab gecacht: ${asset}`)

let offlineAntwort
listener.get('fetch')({
  request: { method: 'GET', mode: 'navigate', url: 'https://plauderbox.test/begehung' },
  respondWith(promise) { offlineAntwort = promise },
})
const antwort = await offlineAntwort
if (!antwort || !antwort.ok || !((await antwort.text()).includes('offline:/index.html'))) {
  throw new Error('Offline-Navigation liefert den vorab gecachten App-Shell nicht aus.')
}

console.log(`Offline-App-Shell geprüft: ${buildAssets.length} gehashte Produktionsassets vorab gecacht.`)
