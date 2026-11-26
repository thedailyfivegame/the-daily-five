const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const scramble = readFileSync(join(__dirname, '..', 'scramble.html'), 'utf8');
const gameArea = scramble.match(/<div id="gameArea">([\\s\\S]*?)<!-- Result -->/)?.[1];
const clearAnswer = scramble.split('function clearAnswer(){')[1]?.split('function updateTimer(){')[0];
const submitAnswer = scramble.match(/function submitAnswer\\(\\)\\{([\\s\\S]*?)(?=\\nfunction [A-Za-z_$])/ )?.[1];

test('Scramble rules are visible before a player selects a tile', () => {
  assert.ok(gameArea, 'Game area is present');
  const rulesIndex = gameArea.indexOf('id="gameRules"');
  assert.ok(rulesIndex >= 0, 'Pre-play rules are present');
  assert.ok(rulesIndex < gameArea.indexOf('id="answerRow"'), 'Rules appear before the playable controls');
  assert.match(gameArea, /Your timer starts on your first tile\\./);
  assert.match(gameArea, /Clear removes selected letters only; the clock keeps running\\./);
  assert.match(gameArea, /one submitted answer per day, and an incorrect answer uses it too\\./);
});

test('Clear only resets selected letters and does not reset or stop the timer', () => {
  assert.ok(clearAnswer, 'Clear handler is present');
  assert.match(clearAnswer, /answer=\\[\\];/);
  assert.match(clearAnswer, /placed=\\[\\];/);
  assert.doesNotMatch(clearAnswer, /startTime\\s*=|clearInterval\\s*\\(|timerInterval\\s*=/);
});

test('Incomplete answers cannot be submitted and one submitted answer consumes the daily attempt', () => {
  assert.ok(submitAnswer, 'Submit handler is present');
  assert.match(submitAnswer, /answer\\.length!==5/);
  assert.match(submitAnswer, /ds_played_/);
  assert.match(submitAnswer, /ds_result_/);
  assert.match(submitAnswer, /S\\.set\\('ds_played_'\\+key,'1'\\)/);
});
