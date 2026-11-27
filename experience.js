/* Shared player journey. Never changes answers, scores, coins or account data. */
(function () {
  'use strict';
  var path = location.pathname;
  var game = /play(?:\.html)?$/.test(path) ? 'word' : /scramble\.html$/.test(path) ? 'scramble' : /trivia\.html$/.test(path) ? 'trivia' : 'home';
  var practice = new URLSearchParams(location.search).get('practice') === '1';
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function json(key) { try { return JSON.parse(read(key)); } catch (_) { return null; } }
  var key = DFDailyDate.key;
  var day = DFDailyDate.index;
  if (!practice) DFDailyDate.reloadAtMidnight();
  function analyticsEnabled() {
    return !practice && /^(www\.)?thedailyfive\.net$/.test(location.hostname) && typeof window.gtag === 'function';
  }
  function track(name, extra) {
    if (analyticsEnabled()) window.gtag('event', name, Object.assign({ game_name: game }, extra || {}));
  }
  window.DFShare = function (text, button, copyOnly) {
    var label = button.textContent;
    function notice(message) { button.textContent = message; setTimeout(function () { button.textContent = label; }, 2200); }
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { notice('Copied — ready to share!'); track('result_copy'); }, fallback);
      return fallback();
    }
    function fallback() {
      var field = document.createElement('textarea'); field.value = text; field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.appendChild(field); field.select();
      var copied = false; try { copied = document.execCommand('copy'); } catch (_) {}
      field.remove(); button.focus(); if (copied) track('result_copy'); notice(copied ? 'Copied — ready to share!' : 'Sharing unavailable in this browser');
    }
    if (!copyOnly && navigator.share) return navigator.share({ text: text }).then(function () { track('share_handoff', { method: 'native' }); }).catch(function (error) { if (error.name !== 'AbortError') return copy(); });
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
  function shareTools() {
    if (document.getElementById('df-share-tools') || typeof window.DFGetShare !== 'function') return;
    var share = document.getElementById('shareBtn');
    if (!share) return;
    var tools = document.createElement('section'); tools.id = 'df-share-tools'; tools.className = 'df-share-tools'; tools.setAttribute('aria-label', 'Share your spoiler-free result');
    var actions = document.createElement('div'); actions.className = 'df-share-buttons';
    var whatsapp = document.createElement('a'); whatsapp.textContent = 'WhatsApp'; whatsapp.target = '_blank'; whatsapp.rel = 'noopener noreferrer';
    whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(window.DFGetShare());
    whatsapp.addEventListener('click', function () { whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(window.DFGetShare()); track('share_intent', { method: 'whatsapp' }); });
    var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy result';
    copy.addEventListener('click', function () { track('share_intent', { method: 'clipboard' }); window.DFShare(window.DFGetShare(), copy, true); });
    var image = document.createElement('button'); image.type = 'button'; image.textContent = 'Save image for Instagram';
    var notice = document.createElement('p'); notice.className = 'df-share-note'; notice.setAttribute('role', 'status'); notice.textContent = 'No answer spoilers. Save an image, then upload it to Instagram or another app.';
    image.addEventListener('click', function () {
      track('share_intent', { method: 'image' });
      try {
        var canvas = window.DFResultCard(window.DFGetShare());
        canvas.toBlob(function (blob) {
          if (!blob) { notice.textContent = 'Image could not be saved. Use Copy result instead.'; return; }
          var url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'dailyfive-' + game + '-' + key(new Date()) + '.png'; document.body.appendChild(link); link.click(); link.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
          track('result_image_download'); notice.textContent = 'Image download started. Add it to your Instagram post or Story, or share it in another app.';
        }, 'image/png');
      } catch (_) { notice.textContent = 'Image saving is unavailable here. Use Copy result instead.'; }
    });
    actions.append(whatsapp, copy, image); tools.append(actions, notice);
    (game === 'word' ? document.getElementById('endActions') : share).insertAdjacentElement('afterend', tools);
  }
  // Draw only the existing spoiler-free result text, never the game board or answer panel.
  window.DFResultCard = function (text) {
    var canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    var ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#f4efe4'; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#3f7a4f'; ctx.fillRect(0, 0, 1080, 18);
    ctx.fillStyle = '#1c1a16'; ctx.font = 'bold 64px Georgia, serif'; ctx.fillText('The Daily Five', 80, 124);
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#575147'; ctx.fillText('A LITTLE CHALLENGE. A DAILY RITUAL.', 80, 182);
    ctx.fillStyle = '#cdc4ad'; ctx.fillRect(80, 228, 920, 2);
    var lines = String(text).split('\n').filter(function (line) { return line.trim() && !/https?:|www\./.test(line); });
    var y = 310;
    lines.forEach(function (line, index) {
      if (/^[🟩🟨⬜🟦🟧⬛]+$/u.test(line)) {
        Array.from(line).forEach(function (tile, col) { ctx.fillStyle = tile === '🟩' ? '#3f7a4f' : tile === '🟨' ? '#a28228' : '#77746d'; ctx.fillRect(80 + col * 104, y - 60, 88, 88); }); y += 106;
      } else {
        ctx.font = (index === 0 ? 'bold 38px' : '32px') + ' sans-serif'; ctx.fillStyle = '#1c1a16'; ctx.fillText(line.replace(/[✅❌📚]/gu, '').trim(), 80, y, 920); y += 78;
      }
    });
    if (y < 700) {
      ctx.fillStyle = '#ede6d4'; ctx.fillRect(80, 730, 920, 270);
      ctx.fillStyle = '#1c1a16'; ctx.font = 'bold 68px Georgia, serif'; ctx.fillText('Your turn.', 126, 835);
      ctx.fillStyle = '#575147'; ctx.font = '34px sans-serif';
      ctx.fillText(game === 'word' ? 'Five letters. Six guesses.' : game === 'scramble' ? 'Five letters. Beat the clock.' : 'One question. One chance.', 126, 916, 820);
    }
    ctx.fillStyle = '#3f7a4f'; ctx.fillRect(80, 1138, 920, 2); ctx.font = 'bold 34px Georgia, serif'; ctx.fillText('Your next daily pause is waiting.', 80, 1200);
    ctx.fillStyle = '#575147'; ctx.font = '28px sans-serif'; ctx.fillText('Play free · www.thedailyfive.net', 80, 1254);
    return canvas;
  };

  function renderNext() {
    today = key(new Date());
    if (game === 'home' || practice || !completed(game)) return;
    var host = document.getElementById(game === 'word' ? 'statsSub' : game === 'scramble' ? 'result' : 'resultPanel');
    if (!host) return;
    shareTools();
    var box = document.getElementById('df-next');
    if (!box) {
      box = document.createElement('section'); box.id = 'df-next'; box.className = 'df-journey'; box.setAttribute('aria-label', 'Your next daily challenge');
      if (game === 'word') {
        var actions = document.getElementById('endActions'); actions.insertAdjacentElement('afterend', box);
      } else host.insertAdjacentElement('afterend', box);
    }
    var remaining = games.filter(function (g) { return g.id !== game && !completed(g.id); });
    box.innerHTML = '<p class="df-eyebrow">YOUR DAILY PAUSE</p><h2>' + (remaining.length ? 'One more little challenge?' : 'Your daily trio is complete.') + '</h2>' +
      '<p class="df-tomorrow"><strong>See you tomorrow.</strong> A fresh challenge arrives at midnight in your device’s time zone. Keep your daily ritual going.</p>' +
      '<p>' + (remaining.length ? 'Keep the good part of your break going. No sign-up needed.' : 'Share a spoiler-free result with a friend, then come back tomorrow.') + '</p>' +
      '<div class="df-next-links">' + remaining.map(function (g) { return '<a class="df-next-link" href="' + g.url + '"><strong>' + g.label + ' →</strong><span>' + g.detail + '</span></a>'; }).join('') + '</div>' +
      (game === 'word' ? '' : '<p class="df-reset">Fresh puzzles in <strong data-df-countdown></strong><br><small>Resets at midnight in your device’s time zone.</small></p>') +
      '<div class="df-support" data-support-placement="post_game"><strong>Enjoyed your daily pause?</strong><p>I’m Sunny, the maker of The Daily Five. An optional coffee helps me keep the website running and improve the daily puzzles.</p><a class="df-support-cta" href="https://ko-fi.com/thedailyfive" target="_blank" rel="noopener">Buy Sunny a coffee ↗</a><small>Opens Ko-fi · One-time tips available<br>Always optional. All games stay free.</small></div>';
    countdown();
  }
  // Daily puzzle events are unique per game, device and local date.
  // Browsers without storage still deduplicate for this page lifetime.
  var sent = {};
  function once(name, extra) {
    if (!analyticsEnabled()) return;
    var id = 'df_event_v2_' + key(DFDailyDate.pageDate) + '_' + game + '_' + name;
    if (sent[id] || read(id)) return;
    sent[id] = true;
    try { localStorage.setItem(id, '1'); } catch (_) {}
    track(name, Object.assign({ event_version: 2, puzzle_date: key(DFDailyDate.pageDate), game_mode: 'daily' }, extra || {}));
  }
  function civilDate(value) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '');
    if (!m) return null;
    var date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return date.getUTCFullYear() === +m[1] && date.getUTCMonth() === +m[2] - 1 && date.getUTCDate() === +m[3] ? date.getTime() : null;
  }
  function previousPlay() {
    var now = civilDate(key(new Date())), latest = null, last = read('df_last_play_date');
    function consider(value) { var time = civilDate(value); if (time !== null && time < now && (!latest || time > latest.time)) latest = { date: value, time: time }; }
    consider(last);
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), match = /^(?:df|ds|dt)_played_(\d{4}-\d{1,2}-\d{1,2})$/.exec(k) || /^df_event_v2_(\d{4}-\d{1,2}-\d{1,2})_(?:word|scramble|trivia)_game_start$/.exec(k);
        if (match && read(k)) consider(match[1]);
      }
    } catch (_) {}
    return latest;
  }
  function visit() {
    if (!analyticsEnabled()) return;
    var date = key(new Date()), previous = previousPlay(), marker = 'df_return_v3_' + date;
    if (previous && !read(marker) && !sent[marker]) {
      sent[marker] = true;
      track('returning_player', { event_version: 3, previous_play_date: previous.date, days_since_last_play: Math.round((civilDate(date) - previous.time) / 86400000) });
      try { localStorage.setItem(marker, '1'); } catch (_) {}
    }
    try { localStorage.setItem('df_last_visit_date', date); } catch (_) {}
  }
  function notePlay() {
    if (!analyticsEnabled()) return;
    visit();
    try { localStorage.setItem('df_last_play_date', key(DFDailyDate.pageDate)); } catch (_) {}
  }
  function start() {
    if (game === 'home' || completed(game) || practice) return;
    notePlay(); once('game_start');
  }
  window.addEventListener('df:start', start);
  visit();
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (link) {
      var href = link.getAttribute('href') || '';
      if (/^(\/?)(play|scramble|trivia)\.html/.test(href)) track('game_select', { destination_game: /scramble/.test(href) ? 'scramble' : /trivia/.test(href) ? 'trivia' : 'word', placement: link.closest('#df-next') ? 'post_game' : 'page' });
    }
  }, true);
  window.addEventListener('df:complete', function (e) { if (!practice) { notePlay(); once('game_complete', { outcome: e.detail && e.detail.won ? 'won' : 'lost' }); renderNext(); } });
  window.addEventListener('df:share', function (e) { track('share_intent', { method: e.detail && e.detail.method || 'unknown' }); });
  window.addEventListener('pageshow', function () { visit(); updateHome(); renderNext(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { visit(); updateHome(); renderNext(); } });
  window.addEventListener('storage', function () { updateHome(); renderNext(); });
  updateHome(); renderNext(); countdown(); setInterval(countdown, 1000);
})();
