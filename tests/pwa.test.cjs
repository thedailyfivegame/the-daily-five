const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file));

test('homepage and Word share the existing standalone install and valid icons', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.start_url, '/play.html');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const png = read(icon.src);
    assert.equal(icon.sizes, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  }
  for (const page of ['index.html', 'play.html']) {
    assert.match(read(page).toString(), /rel="manifest" href="\/manifest\.json"/);
    assert.match(read(page).toString(), /<script defer src="\/pwa\.js">/);
  }
  const home = read('index.html').toString();
  assert.match(home, /<details class="install-guide">\s*<summary>Install The Daily Five/);
  assert.match(home, /separate guest profile.*coins, streak and progress may stay in Safari/);
});

function worker(fetch) {
  const events = {};
  const deleted = [];
  vm.runInNewContext(read('sw.js').toString(), {
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (type, handler) => { events[type] = handler; }
    },
    URL,
    Response,
    fetch,
    caches: { delete: async name => deleted.push(name) }
  });
  return { events, deleted };
}

test('worker uses the default waiting lifecycle and cleans up only its old response cache', async () => {
  const { events, deleted } = worker();
  assert.equal(events.install, undefined);
  assert.equal(events.message, undefined);
  let completion;
  events.activate({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(deleted, ['df-v13-guest-wallet']);
});

test('worker leaves assets, APIs and cross-origin requests alone, and preserves navigation URLs', async () => {
  let seen;
  const { events } = worker(async request => {
    seen = request;
    return new Response('fresh page');
  });
  function dispatch(url, mode, method = 'GET') {
    let result;
    events.fetch({ request: { url, mode, method }, respondWith: promise => { result = promise; } });
    return result;
  }
  assert.equal(dispatch('https://example.test/words.js', 'no-cors'), undefined);
  assert.equal(dispatch('https://example.test/api/puzzle', 'navigate'), undefined);
  assert.equal(dispatch('https://analytics.test/collect', 'no-cors'), undefined);
  assert.equal(dispatch('https://example.test/play.html', 'navigate', 'POST'), undefined);
  const url = 'https://example.test/?utm_source=pilot';
  assert.equal(await (await dispatch(url, 'navigate')).text(), 'fresh page');
  assert.equal(seen.url, url);
});

test('failed navigation shows a reconnect message without serving a stale daily game', async () => {
  const { events } = worker(async () => { throw new Error('offline'); });
  let result;
  events.fetch({
    request: { url: 'https://example.test/play.html', mode: 'navigate', method: 'GET' },
    respondWith: promise => { result = promise; }
  });
  const response = await result;
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(await response.text(), /Reconnect and reload/);
});
