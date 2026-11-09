/* Service worker El Cierzo: red primero, sin cachear datos de reservas */
const CACHE = 'elcierzo-v1';
const SHELL = ['/static/icons/icon-192.png', '/static/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  /* Nunca cachear horas, reservas ni admin */
  if (/^\/(obtener_estado_horas|reservar|cancelar|admin|api)/.test(url.pathname)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && url.pathname.startsWith('/static/')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/') : undefined)))
  );
});
