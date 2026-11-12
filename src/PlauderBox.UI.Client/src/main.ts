import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Die Oberfläche bleibt online nutzbar; der fehlende Offline-Cache wird beim nächsten Start erneut versucht.
    })
  })
}
