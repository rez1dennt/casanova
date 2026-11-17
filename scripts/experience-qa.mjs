import assert from 'node:assert/strict';

export async function experienceQA(page, base = 'http://localhost:4189') {
  const results = [];
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.__introQA = [];
    let pending = false;
    new MutationObserver(() => {
      const active = document.documentElement?.classList.contains('intro-pending') || false;
      if (active && !pending) window.__introQA.push({ start: performance.now(), end: null });
      if (!active && pending) window.__introQA.at(-1).end = performance.now();
      pending = active;
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  const introTime = async () => {
    await page.waitForFunction(() => window.__introQA?.at(-1)?.end != null);
    return page.evaluate(() => { const run = window.__introQA.at(-1); return Math.round(run.end - run.start); });
  };
  await page.goto(base + '/privacy/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  let started = Date.now();
  await page.goto(base + '/');
  const introDuration = await introTime();
  assert.equal(introDuration < 1400, true, 'Первый визит показывает короткий прелоудер');
  await page.locator('[data-cookie-accept]').click();
  await page.waitForTimeout(300);
  await page.reload();
  const repeatDuration = await introTime();
  assert.equal(repeatDuration < 1400, true, 'Повторный визит тоже показывает короткий прелоудер');
  assert.equal(await page.locator('.cookie-banner').evaluate(el => el.hidden), true, 'Уведомление помнит выбор');
  await page.locator('footer [data-cookie-open]').click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.cookie-banner').isVisible(), true, 'Cookie открывается из подвала');
  const scroll = await page.evaluate(() => scrollY);
  await page.locator('[data-cookie-accept]').click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.activeElement.matches('footer [data-cookie-open]')), true, 'Фокус возвращается');
  assert.equal(await page.evaluate(() => scrollY), scroll, 'Cookie не сдвигает страницу');
  results.push({ interaction: 'intro first/repeat, cookie save/reopen/focus', introDuration, repeatDuration, status: 'pass' });

  const navigation = [];
  for (const [selector, route] of [
    ['.desktop-nav a[href="/about/"]', '/about/'],
    ['.desktop-nav a[href="/projects/"]', '/projects/'],
    ['.desktop-nav a[href="/services/"]', '/services/'],
    ['.desktop-nav a[href="/contacts/"]', '/contacts/'],
    ['footer a[href="/privacy/"]', '/privacy/'],
    ['.site-header .logo', '/']
  ]) {
    await page.locator(selector).click();
    await page.waitForURL(base + route);
    await page.waitForFunction(() => document.documentElement.classList.contains('intro-ready'));
    const duration = route === '/' ? await introTime() : 0;
    if (route === '/') assert.equal(duration < 1400, true, 'На главной быстрый прелоудер');
    else assert.equal(await page.evaluate(() => window.__introQA.length), 0, `${route}: прелоудер не появлялся`);
    if (route === '/about/') {
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => window.__introQA.length), 0, 'Восстановленная внутренняя страница тоже без прелоудера');
    }
    navigation.push({ route, duration });
  }
  await page.goBack();
  await page.waitForFunction(() => document.documentElement.classList.contains('intro-ready'));
  assert.equal(await page.evaluate(() => window.__introQA.length), 0, 'Назад на внутреннюю страницу без прелоудера');
  assert.equal(new URL(page.url()).pathname, '/privacy/', 'Назад возвращает на предыдущую страницу');
  await page.goForward();
  await introTime();
  assert.equal(new URL(page.url()).pathname, '/', 'Вперёд возвращает на главную');
  const beforeReplay = await page.evaluate(() => ({ count: window.__introQA.length, scroll: scrollY, left: document.querySelector('.header-inner').getBoundingClientRect().left }));
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await page.waitForFunction(count => window.__introQA.length > count && window.__introQA.at(-1).end != null, beforeReplay.count);
  const restored = await page.evaluate(() => ({ scroll: scrollY, left: document.querySelector('.header-inner').getBoundingClientRect().left }));
  assert.equal(restored.scroll, beforeReplay.scroll, 'Восстановление из кеша не сдвигает прокрутку');
  assert.equal(restored.left, beforeReplay.left, 'Прелоудер не сдвигает хедер');
  const countBeforeAnchor = await page.evaluate(() => window.__introQA.length);
  await page.locator('.hero-cta').click();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__introQA.length), countBeforeAnchor, 'Якорь внутри страницы не запускает прелоудер');
  results.push({ interaction: 'home only, internal pages without intro, back/forward, restored pages, same-page anchor', navigation, status: 'pass' });

  await page.evaluate(() => localStorage.setItem('cn-cookie-choice:v1', '{broken'));
  await page.reload();
  await page.locator('.cookie-banner').waitFor({ state: 'visible' });
  await page.locator('[data-cookie-accept]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => localStorage.setItem('cn-cookie-choice:v1', JSON.stringify({version:1,mode:'essential',expiresAt:1})));
  await page.reload();
  await page.locator('.cookie-banner').waitFor({ state: 'visible' });
  await page.locator('[data-cookie-close]').click();
  await page.waitForTimeout(300);
  results.push({ interaction: 'invalid and expired cookie storage', status: 'pass' });

  await page.setViewportSize({ width: 320, height: 650 });
  await page.locator('footer [data-cookie-open]').click();
  await page.waitForTimeout(300);
  const cookie = await page.locator('.cookie-banner').evaluate(el => ({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,height:el.getBoundingClientRect().height}));
  assert.equal(cookie.left >= 0 && cookie.right <= 320, true, 'Cookie вмещается на 320px');
  assert.equal(cookie.height < 650 * .45, true, 'Cookie не занимает половину экрана');
  await page.locator('[data-cookie-accept]').click();
  await page.waitForTimeout(300);
  results.push({ width:320, interaction:'cookie compact layout', cookieHeight:cookie.height, status:'pass' });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(base + '/');
  await page.waitForFunction(() => document.documentElement.classList.contains('intro-ready'));
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro-pending')), false, 'Reduced motion пропускает прелоудер');
  await page.addInitScript(() => {
    if (location.search.includes('qa-block-storage')) {
      for (const name of ['localStorage','sessionStorage']) Object.defineProperty(window, name, { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    }
  });
  await page.goto(base + '/?qa-block-storage=1');
  await page.locator('.cookie-banner').waitFor({ state: 'visible' });
  await page.locator('[data-cookie-accept]').click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.cookie-banner').evaluate(el => el.hidden), true, 'Запрет хранилища не ломает закрытие cookie');
  assert.equal(await page.locator('.header-call').isVisible(), true, 'Звонок остаётся доступен');
  results.push({ interaction:'reduced motion and blocked storage', status:'pass' });

  await page.goto(base + '/privacy/');
  await page.evaluate(() => sessionStorage.clear());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/assets/js/app.js', route => route.abort());
  started = Date.now();
  await page.goto(base + '/');
  await page.waitForFunction(() => !document.documentElement.classList.contains('intro-pending'), { timeout: 3200 });
  assert.equal(await page.locator('.site-main').evaluate(el => getComputedStyle(el).visibility), 'visible', 'При сбое основного JS контент доступен');
  const failSafeDuration = Date.now() - started;
  assert.equal(failSafeDuration < 1800, true, 'Независимый таймаут быстро снимает прелоудер');
  await page.unroute('**/assets/js/app.js');
  results.push({ interaction:'preloader failsafe with blocked app module', failSafeDuration, status:'pass' });

  await page.goto(base + '/');
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro-pending')), false, 'Escape пропускает прелоудер');
  results.push({interaction:'preloader Escape skip',status:'pass'});
  return results;
}
