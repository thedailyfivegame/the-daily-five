if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
    // The site can still be played if service worker registration is unavailable.
  });
}
