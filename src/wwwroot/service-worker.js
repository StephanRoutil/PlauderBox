const CACHE_NAME = 'plauderbox-app-CKQcRqOOjsassetsindexDhEixRMPcss'
const BUILD_ASSETS = ["/assets/index-CKQcRqOO.js","/assets/index-DhEixRMP.css"]
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', ...BUILD_ASSETS]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', response.clone()))
      return response
    }).catch(() => caches.match('/index.html')))
    return
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
    return response
  })))
})
