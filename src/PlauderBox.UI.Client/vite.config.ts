import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

const paket = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string }

function serviceWorkerAppShell(): Plugin {
  return {
    name: 'plauderbox-service-worker-app-shell',
    closeBundle() {
      const ausgabe = fileURLToPath(new URL('../wwwroot/', import.meta.url))
      const index = readFileSync(`${ausgabe}/index.html`, 'utf8')
      const assets = [...index.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((treffer) => treffer[1])
      if (!assets.length || !assets.some((pfad) => pfad?.endsWith('.js')) || !assets.some((pfad) => pfad?.endsWith('.css'))) {
        throw new Error('Der Produktions-App-Shell enthält nicht die erwarteten gehashten JS-/CSS-Dateien.')
      }
      const serviceWorkerPfad = `${ausgabe}/service-worker.js`
      const serviceWorker = readFileSync(serviceWorkerPfad, 'utf8')
        .replace('const BUILD_ASSETS = []', `const BUILD_ASSETS = ${JSON.stringify(assets)}`)
        .replace('plauderbox-app-build', `plauderbox-app-${assets.join('-').replace(/[^A-Za-z0-9]/g, '').slice(-32)}`)
      writeFileSync(serviceWorkerPfad, serviceWorker, 'utf8')
    },
  }
}

export default defineConfig({
  plugins: [vue(), serviceWorkerAppShell()],
  define: {
    __PLAUDERBOX_VERSION__: JSON.stringify(paket.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@logik': fileURLToPath(new URL('../PlauderBox.Logik/Client', import.meta.url)),
    },
  },
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5187',
    },
  },
})
