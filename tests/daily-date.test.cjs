const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const test = require('node:test');

const read = file => readFileSync(join(__dirname, '..', file), 'utf8');
const dateSource = read('daily-date.js');

function pageAt(iso) {
  let now = +new Date(iso);
  let reloads = 0;
  let timer;
  const events = new Map();
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
  }
  const window = {
    location: { reload() { reloads++; } },
    addEventListener(type, callback) { events.set(type, callback); }
  };
  const document = {
    hidden: false,
    addEventListener(type, callback) { events.set(type, callback); }
  };
  runInNewContext(dateSource, {
    Date: Clock, window, document,
    clearTimeout() {},
    setTimeout(callback, delay) { timer = { callback, delay }; }
  });
  return {
    dates: window.DFDailyDate, events, document,
    advance(iso) { now = +new Date(iso); },
    get timer() { return timer; },
    get reloads() { return reloads; }
  };
}

test('civil puzzle days advance at midnight across daylight-saving changes', () => {
  process.env.TZ = 'America/New_York';
  const { dates } = pageAt('2026-07-02T23:59:59');
  assert.equal(dates.index(dates.pageDate), 547);
  assert.equal(dates.index(new Date('2026-07-03T00:00:01')), 548);
  assert.equal(dates.index(new Date('2026-07-03T01:00:01')), 548);
  assert.equal(dates.index(new Date('2026-03-09T00:00:00')) - dates.index(new Date('2026-03-08T00:00:00')), 1);
  assert.equal(dates.index(new Date('2026-11-02T00:00:00')) - dates.index(new Date('2026-11-01T00:00:00')), 1);
});

test('foreground pages refresh at midnight and suspended pages refresh when restored', () => {
  process.env.TZ = 'Asia/Kolkata';
  const foreground = pageAt('2026-11-27T23:59:59');
  foreground.dates.reloadAtMidnight();
  assert.equal(foreground.timer.delay, 1000);
  foreground.advance('2026-11-28T00:00:00');
  foreground.timer.callback();
  foreground.events.get('focus')();
  assert.equal(foreground.reloads, 1);

  const suspended = pageAt('2026-11-27T23:59:59');
  suspended.dates.reloadAtMidnight();
  suspended.document.hidden = true;
  suspended.advance('2026-11-28T08:00:00');
  suspended.events.get('visibilitychange')();
  assert.equal(suspended.reloads, 0);
  suspended.document.hidden = false;
  suspended.events.get('visibilitychange')();
  suspended.events.get('pageshow')();
  assert.equal(suspended.reloads, 1);
});

test('homepage category and Trivia use the same question on either side of midnight', () => {
  const questions = {};
  runInNewContext(read('trivia-questions.js'), { window: questions });
  const home = read('index.html').split('// The homepage and game use the same question rotation.')[1].split('// How to Play tabs')[0];
  const trivia = read('trivia.html').split('// ── DATE + INDEX')[1].split('\n').slice(1).join('\n').split('// ── HEADER')[0];
  for (const date of ['2026-11-27T23:59:59', '2026-11-28T00:00:00']) {
    const category = {};
    const DFDailyDate = pageAt(date).dates;
    let onIntersection;
    let questionScript;
    const context = {
      DFDailyDate,
      ...questions,
      window: { IntersectionObserver: true },
      IntersectionObserver: class {
        constructor(callback) { onIntersection = callback; }
        observe(element) { assert.equal(element, category); }
        disconnect() {}
      },
      document: {
        getElementById: () => category,
        createElement: () => ({}),
        head: { appendChild: script => { questionScript = script; } }
      }
    };
    runInNewContext(home + trivia, context);
    assert.equal(questionScript, undefined);
    onIntersection([{ isIntersecting: false }]);
    assert.equal(questionScript, undefined);
    onIntersection([{ isIntersecting: true }]);
    assert.equal(questionScript.src, '/trivia-questions.js');
    questionScript.onload();
    assert.equal(category.textContent, context._q.c);
    assert.equal(context._storageKey, 'dt_played_' + DFDailyDate.key(DFDailyDate.pageDate));
  }
});
