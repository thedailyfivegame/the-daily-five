const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const home = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('Word rules explain guest coins and public ranking entry independently', () => {
  const wordRules = home.match(/id="panel-five">([\s\S]*?)<h4>Tile Colours<\/h4>/)?.[1];
  assert.ok(wordRules, 'Word rules are present');
  assert.match(wordRules, /earn coins for hints, even as a guest\./);
  assert.match(wordRules, /post your score on the <strong>leaderboard<\/strong>, choose a public display name\./);
});

test('Sign-in prompt explains score tracking without gating coin rewards', () => {
  const signIn = home.match(/class="modal-sub">([^<]+)<\/div>/)?.[1];
  assert.match(signIn, /track your scores across devices/);
  assert.doesNotMatch(signIn, /coins/i);
});
