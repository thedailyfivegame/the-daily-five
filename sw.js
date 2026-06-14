// Service Worker — The Daily Five
// v6 — cache all pages including archive and about
const CACHE = 'df-v6';

const PRECACHE = [
  '/',
  '/index.html',
  '/play.html',
  '/manifest.json',
  '/words.js',
  '/favicon.svg',
  '/og-image.png',
  '/splash.png',
  '/archive.html',
  '/about.html',
];

// ── Install: pre-cache everything ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ──────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for pages, cache-first for assets ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip cross-origin requests (fonts, ads, analytics)
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);

      // For HTML pages use stale-while-revalidate so updates ship quickly
      const isHTML = e.request.headers.get('accept')?.includes('text/html');
      if (isHTML) {
        const networkFetch = fetch(e.request)
          .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => null);
        return cached || await networkFetch;
      }

      // For all other assets: cache-first, update in background
      if (cached) {
        fetch(e.request)
          .then(res => { if (res.ok) cache.put(e.request, res.clone()); })
          .catch(() => {});
        return cached;
      }

      // Not in cache — fetch, cache, and return
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    })
  );
});
