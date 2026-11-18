/* Shared player journey. Never changes answers, scores, coins or account data. */
(function () {
  'use strict';
  var path = location.pathname;
  var game = /play(?:\.html)?$/.test(path) ? 'word' : /scramble\.html$/.test(path) ? 'scramble' : /trivia\.html$/.test(path) ? 'trivia' : 'home';
  var practice = new URLSearchParams(location.search).get('practice') === '1';
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function json(key) { try { return JSON.parse(read(key)); } catch (_) { return null; } }
  function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function day(d) { return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(2025, 0, 1)) / 86400000); }
  function track(name, extra) {
    if (practice || !/^(www\.)?thedailyfive\.net$/.test(location.hostname)) return;
    if (typeof window.gtag === 'function') window.gtag('event', name, Object.assign({ game_name: game }, extra || {}));
  }
  window.DFShare = function (text, button) {
    var label = button.textContent;
    function notice(message) { button.textContent = message; setTimeout(function () { button.textContent = label; }, 2200); }
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { notice('Copied — ready to share!'); }, fallback);
      return fallback();
    }
    function fallback() {
      var field = document.createElement('textarea'); field.value = text; field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.appendChild(field); field.select();
      var copied = false; try { copied = document.execCommand('copy'); } catch (_) {}
      field.remove(); button.focus(); notice(copied ? 'Copied — ready to share!' : 'Sharing unavailable in this browser');
    }
    if (navigator.share) return navigator.share({ text: text }).catch(function (error) { if (error.name !== 'AbortError') return copy(); });
    return copy();
  };
  var today = key(new Date());
  function wordState() { var s = json('df_game'); return s && s.day === day(new Date()) && Array.isArray(s.guesses) && typeof s.status === 'string' ? s : null; }
  function completed(name) {
    if (name === 'word') { var s = wordState(); return !!(s && (s.status === 'won' || s.status === 'lost')); }
    return !!read((name === 'scramble' ? 'ds_played_' : 'dt_played_') + today);
  }
  var games = [
    { id: 'word', label: 'The Daily Five', url: '/play.html', detail: 'Five letters. Six guesses.' },
    { id: 'scramble', label: 'The Daily Scramble', url: '/scramble.html', detail: 'A quick five-letter challenge.' },
    { id: 'trivia', label: 'The Daily Trivia', url: '/trivia.html', detail: 'One question. One chance.' }
  ];
  function updateHome() {
    today = key(new Date());
    if (game !== 'home') return;
    games.forEach(function (g) {
      var status = document.getElementById(g.id === 'word' ? 'wordStatusText' : g.id === 'scramble' ? 'scrambleStatusText' : 'triviaStatusText');
      var link = document.querySelector('a.play-btn[href="' + g.url.slice(1) + '"]');
      if (!status || !link) return;
      var done = completed(g.id), active = g.id === 'word' && wordState() && wordState().guesses.length > 0 && !done;
      status.textContent = done ? 'Completed today ✓' : active ? 'Your puzzle is waiting' : 'Ready to play';
      status.classList.toggle('played', done);
      link.textContent = done ? 'View today’s result →' : active ? 'Continue puzzle →' : 'Play now →';
      link.setAttribute('aria-label', (done ? 'View result for ' : active ? 'Continue ' : 'Play ') + g.label);
    });
    var s = wordState();
    if (games.some(function (g) { return completed(g.id); })) {
      var count = 0, date = new Date();
      for (var i = 0; i < 365; i++) {
        var k = key(date), isToday = i === 0;
        if ((isToday && games.some(function (g) { return completed(g.id); })) || read('df_played_' + k) || read('ds_played_' + k) || read('dt_played_' + k)) count++;
        else break;
        date.setDate(date.getDate() - 1);
      }
      var counter = document.getElementById('streakCount'); if (counter) counter.textContent = count;
      var sub = document.getElementById('streakSub'); if (sub) sub.textContent = 'You’ve played today — keep the ritual going tomorrow.';
      var flame = document.getElementById('streakFlame'); if (flame) flame.textContent = '🔥';
    }
  }
  function countdown() {
    document.querySelectorAll('[data-df-countdown]').forEach(function (el) {
      var now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      var seconds = Math.max(0, Math.floor((next - now) / 1000));
      el.textContent = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(function (n) { return String(n).padStart(2, '0'); }).join(':');
    });
  }
  function renderNext() {
    today = key(new Date());
    if (game === 'home' || practice || !completed(game)) return;
    var host = document.getElementById(game === 'word' ? 'statsSub' : game === 'scramble' ? 'result' : 'resultPanel');
    if (!host) return;
    var box = document.getElementById('df-next');
    if (!box) {
      box = document.createElement('section'); box.id = 'df-next'; box.className = 'df-journey'; box.setAttribute('aria-label', 'Your next daily challenge');
      if (game === 'word') {
        var actions = document.getElementById('endActions'); actions.insertAdjacentElement('afterend', box);
      } else host.insertAdjacentElement('afterend', box);
    }
    var remaining = games.filter(function (g) { return g.id !== game && !completed(g.id); });
    box.innerHTML = '<p class="df-eyebrow">YOUR DAILY PAUSE</p><h2>' + (remaining.length ? 'One more little challenge?' : 'Your daily trio is complete.') + '</h2>' +
      '<p>' + (remaining.length ? 'Keep the good part of your break going. No sign-up needed.' : 'Share a spoiler-free result with a friend, then come back tomorrow.') + '</p>' +
      '<div class="df-next-links">' + remaining.map(function (g) { return '<a class="df-next-link" href="' + g.url + '"><strong>' + g.label + ' →</strong><span>' + g.detail + '</span></a>'; }).join('') + '</div>' +
      '<p class="df-reset">Fresh puzzles in <strong data-df-countdown></strong><br><small>Resets at midnight in your device’s time zone.</small></p>' +
      '<div class="df-support"><strong>Enjoy your daily pause?</strong><p>These games are made independently by Sunny. An optional coffee helps support their upkeep and development.</p><a href="https://ko-fi.com/thedailyfive" target="_blank" rel="noopener">Support The Daily Five ↗</a><small>The games stay free. No support required to play.</small></div>';
    countdown();
  }
  // Daily puzzle events are unique per game, device and local date.
  // Browsers without storage still deduplicate for this page lifetime.
  var sent = {};
  function once(name, extra) {
    var id = 'df_event_v2_' + key(new Date()) + '_' + game + '_' + name;
    if (sent[id] || read(id)) return;
    sent[id] = true;
    try { localStorage.setItem(id, '1'); } catch (_) {}
    track(name, Object.assign({ event_version: 2, puzzle_date: key(new Date()), game_mode: 'daily' }, extra || {}));
  }
  function visit() {
    if (practice) return;
    var date = key(new Date()), last = read('df_last_visit_date');
    if (last && last !== date) {
      var marker = 'df_return_v2_' + date;
      if (!read(marker) && !sent[marker]) {
        sent[marker] = true;
        track('returning_player', { event_version: 2, previous_visit_date: last });
        try { localStorage.setItem(marker, '1'); } catch (_) {}
      }
    }
    try { localStorage.setItem('df_last_visit_date', date); } catch (_) {}
  }
  function start() {
    if (game === 'home' || completed(game) || practice) return;
    once('game_start');
  }
  window.addEventListener('df:start', start);
  visit();
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf('ko-fi.com/thedailyfive') !== -1) track('support_click', { placement: link.closest('.df-journey') ? 'post_game' : 'page' });
      if (/^(\/?)(play|scramble|trivia)\.html/.test(href)) track('game_select', { destination_game: /scramble/.test(href) ? 'scramble' : /trivia/.test(href) ? 'trivia' : 'word', placement: link.closest('#df-next') ? 'post_game' : 'page' });
    }
  }, true);
  window.addEventListener('df:complete', function (e) { if (!practice) { once('game_complete', { outcome: e.detail && e.detail.won ? 'won' : 'lost' }); renderNext(); } });
  window.addEventListener('df:share', function (e) { track('share_intent', { method: e.detail && e.detail.method || 'unknown' }); });
  window.addEventListener('pageshow', function () { visit(); updateHome(); renderNext(); });
  window.addEventListener('storage', function () { updateHome(); renderNext(); });
  updateHome(); renderNext(); countdown(); setInterval(countdown, 1000);
})();
