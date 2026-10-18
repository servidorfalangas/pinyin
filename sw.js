/* Guarda la app en el móvil para que funcione sin conexión */
const CACHE = 'pinyin-v4';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'js/data.js', 'js/engine.js', 'js/mouth.js', 'js/core.js', 'js/content.js', 'js/ui.js', 'js/practice.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'audio/v1.mp3', 'audio/v2.mp3', 'audio/w.mp3', 'audio/s.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    // fuentes de Google: red primero, caché de respaldo
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) e.respondWith(caches.open(CACHE).then(c => fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => c.match(e.request))));
    return;
  }
  // código: red primero (para recibir actualizaciones); audio: caché primero
  if (/audio\/.*\.mp3$/.test(url.pathname)) e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  else e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
