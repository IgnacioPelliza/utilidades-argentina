/* Hace que las calculadoras anden sin internet y se puedan instalar como app.
   Páginas e índices: primero la red (para tener lo último) y si no hay conexión, lo guardado.
   El resto (estilos, scripts, imágenes): lo guardado primero. */
const VERSION = 'v2';
const BASE = '/utilidades-argentina/';
const ARCHIVOS = ['', 'index.html', 'alquiler.html', 'aumentos.html', 'inflacion.html', 'cuotas.html', 'aguinaldo.html', 'vacaciones.html',
  'sueldo-neto.html', 'indemnizacion.html', 'estilo.css?v=3', 'argentina.js', 'alquiler.js', 'datos.js', 'aumentos-tabla.js', 'datos/indices.json',
  'icono-192.png', 'icono-512.png', 'manifest.webmanifest', 'privacidad.html'].map((a) => BASE + a);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(BASE)) return; // APIs y contador: directo
  const primeroRed = e.request.mode === 'navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.html');
  if (primeroRed) {
    e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match(BASE + 'alquiler.html'))));
  } else {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return resp; })));
  }
});
