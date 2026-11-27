// Let the browser activate updates after all pages using the old worker close.
self.addEventListener('activate', event => {
  // This cache only held HTTP responses. Player data lives outside Cache Storage.
  event.waitUntil(caches.delete('df-v13-guest-wallet'));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Leave scripts, puzzle data and other resources on the normal network path.
  if (request.method !== 'GET' || request.mode !== 'navigate' ||
      new URL(request.url).origin !== self.location.origin ||
      new URL(request.url).pathname.startsWith('/api/')) return;

  event.respondWith(fetch(request).catch(() => new Response(
    'You’re offline. Reconnect and reload to play The Daily Five.',
    {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    }
  )));
});
