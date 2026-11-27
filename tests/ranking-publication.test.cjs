const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const test = require('node:test');

const source = readFileSync(join(__dirname, '..', 'score-sync.js'), 'utf8');

test('a remembered name never posts until the player explicitly publishes', async () => {
  function element() {
    return {
      children: [], style: {},
      setAttribute() {},
      setCustomValidity(message) { this.validationMessage = message; },
      reportValidity() {},
      appendChild(child) { this.children.push(child); },
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; }
    };
  }

  const body = element();
  const writes = [];
  const localStorage = new Map([['df_lb_name', 'PreviousPlayer']]);
  const auth = {
    currentUser: { uid: 'fixture', isAnonymous: false, displayName: 'Account Name' },
    onAuthStateChanged(callback) {
      queueMicrotask(() => callback(this.currentUser));
      return () => {};
    }
  };
  const firebase = { auth: () => auth, firestore: { FieldValue: { serverTimestamp: () => 1 } } };
  const window = { firebase, _db: { collection: () => ({ doc: () => ({ set: async score => { writes.push(score); } }) }) } };
  const context = {
    window, firebase, location: { hostname: 'www.thedailyfive.net', search: '' }, URLSearchParams, setTimeout, clearTimeout,
    document: { body, createElement: element, getElementById: () => null },
    localStorage: { getItem: key => localStorage.get(key), setItem: (key, value) => localStorage.set(key, value) }
  };
  Object.defineProperty(context, 'DFScoreCollection', { get: () => window.DFScoreCollection });
  runInNewContext(source, context);

  window.DFSaveScore('scores', 695, { tries: 3, won: true }, 'result', true);
  await new Promise(setImmediate);
  assert.equal(writes.length, 0);

  const form = body.children[0].children[0];
  const [, input, button] = form.children;
  assert.equal(input.value, 'PreviousPlayer');
  assert.equal(button.textContent, 'Publish score');
  input.value = 'player@example.org';
  form.onsubmit({ preventDefault() {} });
  assert.match(input.validationMessage, /without an email address/);
  assert.equal(writes.length, 0);

  input.value = 'PuzzleFan';
  form.onsubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].name, 'PuzzleFan');
});
