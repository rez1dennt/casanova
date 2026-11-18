export async function approachQA(page, base = 'http://localhost:4189') {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const width of [1440, 1024, 768, 760, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/about/?approach-qa=${width}`);
    await page.waitForFunction(() => !document.documentElement.classList.contains('intro-pending'));
    await page.evaluate(async () => { await document.fonts.ready; });
    const section = page.locator('[data-approach]');
    await section.scrollIntoViewIfNeeded();
    const tabs = section.getByRole('tab');
    check(await tabs.count() === 4, 'Four tabs');
    check(await tabs.locator('.approach-tab-name').evaluateAll(nodes => nodes.every(el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const box = el.getBoundingClientRect();
      return [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1);
    })), `${width}: tab text fits its own column`);
    const stage = section.locator('.approach-stage');
    const original = await stage.boundingBox();
    const originalScroll = await page.evaluate(() => scrollY);
    for (let i = 0; i < 4; i++) {
      await tabs.nth(i).click();
      await page.waitForFunction(index => document.querySelectorAll('.approach-tab')[index].getAttribute('aria-selected') === 'true', i);
      await page.waitForTimeout(720);
      const panel = section.getByRole('tabpanel');
      check(await panel.count() === 1, 'Only the selected panel is accessible');
      const geometry = await panel.evaluate(el => {
        const box = el.getBoundingClientRect();
        const image = el.querySelector('img');
        const caption = el.querySelector('.approach-caption').getBoundingClientRect();
        const top = el.querySelector('.approach-image-top').getBoundingClientRect();
        return { loaded: image.complete && image.naturalWidth > 0, imageHeight: image.getBoundingClientRect().height,
          panelHeight: box.height, captionInside: caption.left >= box.left && caption.right <= box.right && caption.bottom <= box.bottom,
          separate: top.bottom + 12 <= caption.top };
      });
      check(geometry.loaded, `${width}: loaded photo`);
      check(Math.abs(geometry.imageHeight - geometry.panelHeight) < 1, `${width}: image fills frame`);
      check(geometry.captionInside && geometry.separate, `${width}: content fits without overlap`);
      const current = await stage.boundingBox();
      check(Math.abs(original.height - current.height) < 1, `${width}: stable scene height`);
    }
    // Keyboard navigation wraps; Home/End select the endpoints.
    await tabs.nth(3).focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement.id === 'approach-tab-0' && document.activeElement.getAttribute('aria-selected') === 'true');
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.activeElement.id === 'approach-tab-3' && document.activeElement.getAttribute('aria-selected') === 'true');
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.activeElement.id === 'approach-tab-0' && document.activeElement.getAttribute('aria-selected') === 'true');
    // A burst must finish on the last request with no stale panels left behind.
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('.approach-tab');
      [1, 3, 2].forEach(i => buttons[i].click());
    });
    await page.waitForFunction(() => document.querySelector('#approach-tab-2').getAttribute('aria-selected') === 'true');
    await page.waitForTimeout(720);
    check(await section.locator('.approach-panel:not([hidden])').count() === 1, 'Rapid clicks leave one scene');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    if (width >= 768) check(Math.abs(await page.evaluate(() => scrollY) - originalScroll) < 2, `${width}: no scroll jump`);
    if ([1440, 320].includes(width)) await section.screenshot({ path: `C:/Users/bahti/Documents/Casa Nova сайт/docs/approach-${width}.png` });
    results.push({ width, stages: 4, keyboard: true, rapidClicks: true, stableHeight: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/about/?approach-reduced=1`);
  await page.getByRole('tab').nth(3).click();
  await page.waitForFunction(() => document.querySelector('#approach-tab-3').getAttribute('aria-selected') === 'true');
  check(await page.locator('.approach-panel:not([hidden])').count() === 1, 'Reduced motion switches immediately');
  check(await page.locator('.approach-stage').evaluate(el => el.getAnimations({ subtree: true }).length === 0), 'Reduced motion has no scene animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const slowPhoto = async route => { await new Promise(resolve => setTimeout(resolve, 650)); await route.continue(); };
  await page.route('**/assets/images/construction.webp', slowPhoto);
  await page.goto(`${base}/about/?approach-slow-image=1`);
  await page.getByRole('tab').nth(1).click();
  check(await page.getByRole('tab').nth(0).getAttribute('aria-selected') === 'true', 'Current scene stays visible while the next image loads');
  check(await page.locator('.approach-stage').getAttribute('aria-busy') === 'true', 'Pending photo has a loading state');
  await page.waitForFunction(() => document.querySelector('#approach-tab-1').getAttribute('aria-selected') === 'true');
  await page.unroute('**/assets/images/construction.webp', slowPhoto);
  await page.goto(`${base}/?approach-home=1`);
  await page.locator('.approach-teaser').click();
  await page.waitForURL('**/about/#approach');
  check(await page.locator('#approach').count() === 1, 'Homepage teaser has a real destination');
  const homeBand = await teamBandQA(page, base);
  return { viewports: results, reducedMotion: true, slowPhoto: true, homepageLink: true, homeBand };
}

async function teamBandQA(page, base = 'http://localhost:4189') {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  await page.goto(`${base}/?team-band-qa=1`);
  await page.waitForFunction(() => !document.documentElement.classList.contains('intro-pending'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    const image = document.querySelector('.team-image img');
    image.loading = 'eager';
    await image.decode();
  });
  for (const width of [1440, 1024, 768, 760, 600, 414, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('.team-section').evaluate(section => {
      const copy = section.querySelector('.team-copy').getBoundingClientRect();
      const teaser = section.querySelector('.approach-teaser').getBoundingClientRect();
      const photo = section.querySelector('.team-image').getBoundingClientRect();
      const index = section.querySelector('.approach-teaser-index');
      const label = section.querySelector('.approach-teaser > span:nth-child(2)');
      const range = document.createRange();
      range.selectNodeContents(label);
      const labelLines = [...new Set([...range.getClientRects()].filter(rect => rect.width).map(rect => Math.round(rect.y)))].length;
      const numberRange = document.createRange();
      numberRange.selectNodeContents(index);
      const numbersFit = [...numberRange.getClientRects()].every(rect => rect.left >= teaser.left && rect.right <= teaser.right);
      return { fullWidth: Math.abs(teaser.width - copy.width) < 1, belowCopy: teaser.top >= copy.bottom + 12,
        abovePhoto: teaser.bottom + 12 <= photo.top, numberLines: index.querySelector('i').getClientRects().length,
        numbersFit, labelLines, height: teaser.height, teaserWidth: teaser.width,
        imageFilled: Math.abs(section.querySelector('.team-image img').getBoundingClientRect().height - photo.height) < 1,
        overflowing: document.documentElement.scrollWidth > innerWidth };
    });
    check(!geometry.overflowing && geometry.imageFilled, `${width}: no overflow or empty photo frame`);
    check(geometry.numberLines === 1 && geometry.numbersFit, `${width}: 01—04 stays on one line inside the card`);
    if (width <= 760) {
      check(geometry.fullWidth && geometry.belowCopy && geometry.abovePhoto, `${width}: teaser has its own full-width row between copy and photo`);
      check(geometry.labelLines <= 2 && geometry.height <= 100, `${width}: readable compact horizontal teaser`);
    }
    if ([1440, 390, 320].includes(width)) await page.locator('.team-section').screenshot({ path: `C:/Users/bahti/Documents/Casa Nova сайт/docs/team-band-${width}.png` });
    results.push({ width, ...geometry });
  }
  await page.locator('.approach-teaser').click();
  await page.waitForURL('**/about/#approach');
  check(await page.locator('#approach').count() === 1, 'Teaser reaches the process section');
  return { viewports: results, link: true };
}
