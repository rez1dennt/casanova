export async function menuQA(page, base = 'http://localhost:4189') {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const open = async () => {
    await page.locator('.site-header .menu-toggle').click();
    await page.waitForFunction(() => document.querySelector('#mobile-menu').classList.contains('is-open'));
  };
  const close = async (escape = false) => {
    await page.evaluate(escapeKey => {
      window.__menuCloseQA = null;
      const start = () => {
        const started = performance.now();
        document.querySelector('#mobile-menu').addEventListener('close', () => {
          window.__menuCloseQA = { duration: performance.now() - started, bodyUnlocked: document.body.style.position !== 'fixed', scroll: scrollY,
            focusReturned: document.activeElement === document.querySelector('.site-header .menu-toggle') };
        }, { once: true });
      };
      if (escapeKey) document.querySelector('#mobile-menu').addEventListener('cancel', start, { capture: true, once: true });
      else document.querySelector('.menu-close').addEventListener('click', start, { capture: true, once: true });
    }, escape);
    if (escape) await page.keyboard.press('Escape');
    else await page.locator('.menu-close').click();
    await page.waitForFunction(() => window.__menuCloseQA);
    return page.evaluate(() => window.__menuCloseQA);
  };

  for (const width of [760, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${base}/about/?menu-qa=${width}`);
    await page.evaluate(async () => { await document.fonts.ready; scrollTo({ top: 550, behavior: 'instant' }); });
    const before = await page.locator('.site-header .menu-toggle').evaluate(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, scroll: scrollY }));
    await open();
    await page.waitForTimeout(300);
    const closeBox = await page.locator('.menu-close').boundingBox();
    check(Math.abs(before.x - closeBox.x) < 1 && Math.abs(before.y - closeBox.y) < 1, `${width}: control stays in place`);
    const closed = await close();
    check(closed.duration <= 300, `${width}: close releases the page promptly, measured ${closed.duration}ms`);
    check(closed.bodyUnlocked && closed.focusReturned && closed.scroll === before.scroll, `${width}: scroll and focus restored`);
    check(await page.locator('.site-header .menu-toggle > span').count() === 3, 'Three burger lines');
    check(await page.locator('.menu-close > span').count() === 3, 'Same icon structure in the dialog');
    // The user can reopen immediately after the close event.
    await open();
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => document.querySelector('#mobile-menu').contains(document.activeElement)), 'Focus stays inside modal navigation');
    const escaped = await close(true);
    check(escaped.duration <= 300 && escaped.bodyUnlocked && escaped.focusReturned, `${width}: Escape closes promptly`);
    for (let i = 0; i < 2; i++) {
      await open();
      await close();
    }
    // Close before the opening animation frame has run.
    await page.evaluate(() => { document.querySelector('.site-header .menu-toggle').click(); document.querySelector('.menu-close').click(); });
    await page.waitForFunction(() => !document.querySelector('#mobile-menu').open);
    await page.waitForTimeout(60);
    check(await page.evaluate(() => !document.querySelector('#mobile-menu').classList.contains('is-open') && document.body.style.position !== 'fixed'), 'No stale opening frame after rapid close');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no overflow`);
    if (width === 360) {
      await page.locator('.site-header .menu-toggle').screenshot({ path: 'C:/Users/bahti/Documents/Casa Nova сайт/docs/menu-three-lines.png' });
      await open();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'C:/Users/bahti/Documents/Casa Nova сайт/docs/menu-three-lines-open.png' });
      await close();
    }
    results.push({ width, closeDuration: Math.round(closed.duration), escapeDuration: Math.round(escaped.duration), stableControls: true, rapidReopen: true });
  }
  await open();
  await page.locator('#mobile-menu a[href="/projects/"]').click();
  await page.waitForURL('**/projects/');
  check(await page.locator('#mobile-menu').evaluate(el => !el.open), 'A navigation link reaches the page with the menu closed');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/about/?menu-reduced=1`);
  await open();
  const reduced = await close();
  check(reduced.duration < 100 && reduced.bodyUnlocked, 'Reduced motion has no close delay');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return { results, links: true, reducedMotionDuration: Math.round(reduced.duration) };
}
