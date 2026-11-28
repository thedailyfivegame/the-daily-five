const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

test('production analytics loads only after opt-in and stops after withdrawal', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'experience.js'), 'utf8');
  const code = source.split('  var analyticsSite')[1].split('  function track(name')[0];
  const scripts = [];
  const cookies = [];
  const storage = new Map();
  const window = { addEventListener() {} };
  let button;
  function createElement(tag) {
    const element = {
      append() {}, appendChild() {},
      style: {},
      setAttribute(key, value) { this[key] = value; },
      addEventListener(event, callback) { this[event] = callback; }
    };
    if (tag === 'button') button = element;
    return element;
  }
  const document = {
    createElement,
    querySelector: () => null,
    body: { appendChild() {} },
    head: { appendChild: script => scripts.push(script.src) },
    set cookie(value) { cookies.push(value); }
  };
  const context = vm.createContext({
    practice: false,
    location: { hostname: 'www.thedailyfive.net' },
    window, document,
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    read: key => storage.get(key),
    visit() {},
    trackStandaloneEntry() {}
  });
  vm.runInContext('var analyticsSite' + code + 'mountAnalyticsChoice();', context);
  assert.equal(button['aria-pressed'], 'false');
  assert.equal(window.gtag, undefined);
  assert.deepEqual(scripts, []);
  button.click();
  assert.equal(button['aria-pressed'], 'true');
  assert.match(scripts[0], /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-/);
  const configuration = Array.from(window.dataLayer[1]);
  assert.equal(configuration[0], 'config');
  assert.equal(configuration[2].allow_google_signals, false);
  assert.equal(configuration[2].allow_ad_personalization_signals, false);
  button.click();
  assert.equal(button['aria-pressed'], 'false');
  assert.equal(window.gtag, undefined);
  assert.equal(window['ga-disable-G-RX9TN7SJVP'], true);
  assert.ok(cookies.some(cookie => cookie.startsWith('_ga=; Max-Age=0')));
  button.click();
  assert.equal(scripts.length, 1);
});
