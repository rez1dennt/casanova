import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const buildSource = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
const bootstrap = buildSource.match(/const introBoot = '[\s\S]*?<script>([\s\S]*?)<\/script>';/)?.[1];

function boot(pathname, stored = null, reduce = false) {
  const classes = new Set();
  const timers = [];
  const context = {
    document: { documentElement: { classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name))
    } } },
    location: { pathname },
    matchMedia: () => ({ matches: reduce }),
    sessionStorage: { getItem: () => stored },
    performance: { now: () => 0 },
    window: {},
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return 1; }
  };
  assert.ok(bootstrap, 'Inline bootstrap is available');
  runInNewContext(bootstrap, context);
  return { classes, timers };
}

test('на главной прелоудер запускается независимо от прошлых посещений', () => {
  for (const stored of [null, '1']) {
    assert.ok(boot('/', stored).classes.has('intro-pending'), `Home: stored=${stored}`);
  }
});

test('на внутренних страницах прелоудер не запускается', () => {
  for (const route of ['/about/', '/projects/', '/services/', '/contacts/', '/privacy/']) {
    const { classes, timers } = boot(route);
    assert.ok(!classes.has('intro-pending'), route);
    assert.equal(timers.length, 0, route);
  }
});

test('независимый таймаут быстро открывает контент при отказе основного JS', () => {
  const { classes, timers } = boot('/');
  assert.equal(timers.length, 1);
  assert.ok(timers[0].delay <= 1400, 'Fallback is short even if the app fails');
  timers[0].callback();
  assert.ok(!classes.has('intro-pending'));
  assert.ok(classes.has('intro-ready'));
});

test('настройка уменьшения движения пропускает заставку', () => {
  const { classes, timers } = boot('/', null, true);
  assert.ok(!classes.has('intro-pending'));
  assert.equal(timers.length, 0);
});
