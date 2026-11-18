/* Optional support measurement. Never blocks navigation or gameplay. */
(function () {
  'use strict';
  if (window.DFSupportLoaded) return;
  window.DFSupportLoaded = true;
  var path = location.pathname;
  var game = /\/play(?:\.html)?$/.test(path) ? 'word' : /\/scramble\.html$/.test(path) ? 'scramble' : /\/trivia\.html$/.test(path) ? 'trivia' : path === '/' || path === '/index.html' ? 'home' : 'site';
  var enabled = /^(www\.)?thedailyfive\.net$/.test(location.hostname) && new URLSearchParams(location.search).get('practice') !== '1';
  function placement(el) {
    var explicit = el.closest('[data-support-placement]');
    if (explicit) return explicit.getAttribute('data-support-placement');
    if (el.closest('.df-journey')) return 'post_game';
    if (el.closest('.df-home-support')) return 'home_feature';
    if (el.closest('footer, #siteFooterNav')) return 'footer';
    return path === '/about.html' ? 'about_page' : 'page';
  }
  function track(name, place) {
    if (!enabled || typeof window.gtag !== 'function') return;
    window.gtag('event', name, { placement: place, game_name: game, support_destination: 'ko_fi', support_version: 2 });
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;
    try {
      var url = new URL(link.href);
      if (url.hostname !== 'ko-fi.com' || url.pathname.replace(/\/$/, '') !== '/thedailyfive') return;
      var place = placement(link);
      url.searchParams.set('utm_source', 'thedailyfive'); url.searchParams.set('utm_medium', 'referral');
      url.searchParams.set('utm_campaign', 'optional_support'); url.searchParams.set('utm_content', game + '_' + place);
      link.href = url.href;
      track('support_click', place);
    } catch (_) { /* Keep the original destination usable if measurement fails. */ }
  }, true);
  if (!enabled || !window.IntersectionObserver) return;
  var seen = Object.create(null), observed = new WeakSet();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
      var place = placement(entry.target);
      if (!seen[place]) { seen[place] = true; track('support_offer_view', place); }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  function observeCards() {
    document.querySelectorAll('.df-support, .support-box').forEach(function (card) {
      if (!observed.has(card)) { observed.add(card); observer.observe(card); }
    });
  }
  observeCards();
  var pending = false;
  new MutationObserver(function () {
    if (pending) return; pending = true;
    requestAnimationFrame(function () { pending = false; observeCards(); });
  }).observe(document.body, { childList: true, subtree: true });
})();
