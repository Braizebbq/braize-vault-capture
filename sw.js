/* Braize Vault service worker.
 *
 * Deliberately minimal. Its only job is to make the app open instantly and
 * work with no signal — the queue in localStorage is what actually protects a
 * thought, not this file.
 *
 * Network-first for the shell so a redeploy is picked up next launch, with the
 * cache as the fallback when there is no signal. GitHub API calls are never
 * touched: they must fail honestly so the queue can retry them.
 */
const CACHE = 'braize-vault-v7';   // bump to evict the old shell on update
const SHELL = ['.', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;                       // never cache the PUTs
  if (new URL(req.url).origin !== self.location.origin) return;  // leave GitHub alone

  ev.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
