const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const player = source('play.html');
const scramble = source('scramble.html');
const trivia = source('trivia.html');

function fixture(entries = []) {
  const data = new Map(entries);
  const S = {get: key => data.get(key) ?? null, set: (key, value) => data.set(key, value)};
  const element = {classList: {add() {}, remove() {}, contains() { return true; }}, style: {}};
  const scope = vm.createContext({
    S, localStorage: {get length() { return data.size; }, key: index => [...data.keys()][index],
      getItem: S.get, setItem: S.set},
    document: {getElementById: () => element, querySelectorAll: () => []},
    window: {dispatchEvent() {}}, CustomEvent: function () {},
    gameStatus: 'playing', ROWS: 6, COLS: 5, ANSWER: 'ABCDE',
    toast() {}, setTimeout() {}, clearInterval() {}
  });
  const run = code => vm.runInContext(code, scope);
  run(source('guest-coins.js'));
  run(player.slice(player.indexOf('var walletRevision'), player.indexOf('function renderCoinDisplay')));
  scope.renderCoinDisplay = () => {};
  return {S, scope, run};
}

test('legacy balances and credits survive a spend and a later game credit', () => {
  const {S, run} = fixture([['tdf_coins_v1', '7'], ['df_coins', '9']]);
  assert.equal(run('getCoins()'), 16);
  run('setCoins(getCoins()-5)');
  assert.equal(run('getCoins()'), 11);
  S.set('ds_result_2026-11-21', JSON.stringify({won:true, walletCredit:6}));
  assert.equal(run('getCoins()'), 17);
  S.set('ds_result_2026-11-20', JSON.stringify({won:true, time:3000}));
  assert.equal(run('getCoins()'), 17);
});

test('actual hint handlers charge 3, 5 and 8, and cancelled checks cost zero', () => {
  const {scope, run} = fixture([['tdf_coins_v1', '30']]);
  run(player.slice(player.indexOf('function chooseHint'), player.indexOf('function saveHints')));
  Object.assign(scope, {closeHintModal() {}, showRevealHint() {}, saveHints() {}, showCoinPop() {},
    addExtraRow() { scope.ROWS++; }});
  run("useHint('check'); cancelLetterCheck(); doLetterCheck('A')");
  assert.equal(run('getCoins()'), 30);
  run("useHint('check'); doLetterCheck('A'); doLetterCheck('B')");
  assert.equal(run('getCoins()'), 27);
  run("useHint('reveal')");
  assert.equal(run('getCoins()'), 22);
  run("useHint('extra'); useHint('extra')");
  assert.equal(run('getCoins()'), 14);
});

test('Scramble credits exactly six, once across repeat submits and reload', () => {
  const {S, scope, run} = fixture();
  run(scramble.slice(scramble.indexOf('function submitAnswer'), scramble.indexOf('function showResult')));
  Object.assign(scope, {gameOver:false, answer:[0,1,2,3,4], scrambledLetters:'ABCDE', WORD:'ABCDE',
    todayKey:() => '2026-11-21', startTime:Date.now(), timerInterval:null, showResult() {}, submitScore() {}});
  assert.equal(run('getCoins()'), 10);
  run('submitAnswer(); submitAnswer()');
  assert.equal(run('getCoins()'), 16);
  const reloaded = fixture([['ds_result_2026-11-21', S.get('ds_result_2026-11-21')]]);
  assert.equal(reloaded.run('getCoins()'), 16);
  scope.gameOver = false;
  run('submitAnswer()');
  assert.equal(run('getCoins()'), 16);
});

test('Trivia adds three to the same wallet and ignores repeated answers', () => {
  const {scope, run} = fixture();
  run(trivia.slice(trivia.indexOf('function _answer'), trivia.indexOf('function _showResult')));
  Object.assign(scope, {_q:{a:0}, _storageKey:'dt_played_2026-11-21',
    _optWrap:{querySelectorAll:() => []}, _showResult() {}, _startCountdown() {}});
  run('_answer(0); _answer(0)');
  assert.equal(run('getCoins()'), 13);
});
