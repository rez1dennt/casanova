import assert from 'node:assert/strict';

export async function fullBrowserQA(page, base = 'http://localhost:4189') {
  const results = [], runtimeErrors = [], failedRequests = [];
  const onError = error => runtimeErrors.push(error.message);
  const onRequest = request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  };
  page.on('pageerror', onError);
  page.on('requestfailed', onRequest);

  await page.goto(base + '/privacy/');
  await page.evaluate(() => {
    localStorage.setItem('cn-cookie-choice:v1', JSON.stringify({version:1,mode:'essential',expiresAt:Date.now()+86400000}));
  });

  for (const width of [1920, 1440, 1280, 1024, 853, 768, 760, 360, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/', '/about/', '/projects/', '/services/', '/contacts/', '/privacy/']) {
      await page.goto(base + route);
      await page.waitForFunction(() => !document.documentElement.classList.contains('intro-pending'));
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
      });
      const geometry = await page.evaluate(() => {
        const heading = document.querySelector('h1');
        const range = document.createRange();
        range.selectNodeContents(heading);
        const headingBox = heading.getBoundingClientRect();
        const textBoxes = [...range.getClientRects()];
        const photo = document.querySelector('.hero-visual')?.getBoundingClientRect();
        const pictureFrames = [...document.querySelectorAll('.home-projects .project-picture')].map(e => e.getBoundingClientRect().height);
        const contact = document.querySelector('.contact-section');
        return {
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          h1: document.querySelectorAll('h1').length,
          headerTop: document.querySelector('.site-header').getBoundingClientRect().top,
          broken: [...document.images].filter(i => !i.naturalWidth).length,
          logo: document.querySelector('.site-header .logo img').getAttribute('src'),
          headerOverflow: [...document.querySelectorAll('.header-inner *')].filter(e => {const r=e.getBoundingClientRect();return r.width > 0 && (r.left < -1 || r.right > innerWidth+1)}).length,
          whatsapp: /WhatsApp|wa\.me/.test(document.body.innerHTML),
          dialogs: document.querySelectorAll('.content-dialog,[data-dialog],[data-project]').length,
          textOverflow: Math.max(...textBoxes.map(r => r.right)) > headingBox.right + 1,
          photoOverlap: photo ? textBoxes.some(r => r.width > 0 && r.left < photo.right && r.right > photo.left && r.top < photo.bottom && r.bottom > photo.top) : false,
          photoGap: photo && innerWidth > 760 ? photo.left - headingBox.right : null,
          frameDifference: pictureFrames.length === 2 ? Math.abs(pictureFrames[0] - pictureFrames[1]) : 0,
          contactGap: contact ? contact.getBoundingClientRect().top - contact.previousElementSibling.getBoundingClientRect().bottom : null
        };
      });
      assert.equal(geometry.scrollWidth <= width, true, `${width} ${route}: нет горизонтального переполнения`);
      assert.equal(geometry.h1, 1, `${width} ${route}: один h1`);
      assert.equal(geometry.headerTop, 0, `${width} ${route}: шапка закреплена`);
      assert.equal(geometry.broken, 0, `${width} ${route}: изображения загружены`);
      assert.equal(geometry.logo, '/assets/images/logo-hd.png', 'Качественный логотип');
      assert.equal(geometry.headerOverflow, 0, 'Хедер вмещается');
      assert.equal(geometry.whatsapp, false, 'WhatsApp удалён');
      assert.equal(geometry.dialogs, 0, 'Всплывающих окон контента нет');
      assert.equal(geometry.textOverflow, false, `${width} ${route}: текст заголовка вмещается`);
      assert.equal(geometry.photoOverlap, false, `${width} ${route}: текст не пересекает фото`);
      if (geometry.photoGap !== null) assert.equal(geometry.photoGap >= 24, true, 'Гарантированный зазор текста и фото');
      assert.equal(geometry.frameDifference < 1, true, 'Одинаковая высота карточек проектов');
      if (geometry.contactGap !== null) assert.equal(geometry.contactGap >= 24, true, 'Воздух перед формой');
      results.push({ width, route, status: 'pass', photoGap: geometry.photoGap });
    }
  }

  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(base + '/');
    await page.waitForFunction(() => !document.documentElement.classList.contains('intro-pending'));
    await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
    const before = await page.evaluate(() => ({ y: scrollY, x: document.querySelector('.site-header .menu-toggle').getBoundingClientRect().x }));
    await page.locator('.site-header .menu-toggle').click();
    await page.waitForTimeout(700);
    const openX = await page.locator('.menu-close').evaluate(el => el.getBoundingClientRect().x);
    assert.equal(Math.abs(openX - before.x) < 1, true, 'Кнопка меню не сдвигается');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.querySelector('#mobile-menu').contains(document.activeElement)), true, 'Фокус удерживается в меню');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => scrollY), before.y, 'Позиция прокрутки восстановлена');
    assert.equal(await page.locator('.site-header .menu-toggle').getAttribute('aria-expanded'), 'false', 'Состояние меню закрыто');
    results.push({ width, interaction: 'menu/escape/focus/scroll', status: 'pass' });
  }

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(base + '/');
  await page.locator('.home-projects .project-picture').first().click();
  await page.waitForURL('**/projects/#locker-room');
  assert.equal(await page.locator('#locker-room h2').textContent(), 'Раздевалка спортивной команды', 'Карточка ведёт к реальному проекту');
  assert.equal(await page.locator('.project-story').count(), 2, 'Только два проекта');
  assert.equal(await page.locator('dialog:visible').count(), 0, 'При переходе нет модалки');
  for (const [index, count] of [[0, 7], [1, 34]]) {
    const gallery = page.locator('[data-gallery]').nth(index);
    assert.equal(await gallery.locator('.gallery-thumb').count(), count, 'Все присланные фотографии доступны');
    await gallery.locator('.gallery-next').click();
    assert.equal(await gallery.locator('.gallery-counter').textContent(), `2 / ${count}`, 'Следующее фото');
    await gallery.locator('.gallery-stage').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await gallery.locator('.gallery-counter').textContent(), `3 / ${count}`, 'Клавиатура переключает фото');
    await page.keyboard.press('Home');
    assert.equal(await gallery.locator('.gallery-counter').textContent(), `1 / ${count}`, 'Home возвращает первое фото');
    for (let i = 0; i < count; i++) {
      await gallery.locator('.gallery-thumb').nth(i).click();
      await gallery.locator('.gallery-main').evaluate(image => image.decode());
      assert.equal(await gallery.locator('.gallery-main').evaluate(image => image.naturalWidth > 0), true, 'Файл полной фотографии корректен');
    }
  }
  results.push({ interaction: 'project links/two galleries/41 full photos/keyboard', status: 'pass' });

  await page.goto(base + '/services/');
  await page.locator('a[href="#contact"]').first().click();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#contact').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().height), true, 'Форма не закрыта шапкой');
  await page.locator('.submit-button').click();
  assert.equal(await page.locator('#name-error').textContent() !== '', true, 'Ошибка имени');
  assert.equal(await page.locator('#phone-error').textContent() !== '', true, 'Ошибка телефона');
  await page.locator('#contact-name').fill('Анна');
  await page.locator('#contact-phone').fill('+7 (991)');
  await page.locator('#contact-phone').press('End');
  await page.keyboard.press('Backspace');
  assert.equal(await page.locator('#contact-phone').inputValue(), '+7 (99', 'Удаление после скобки');
  await page.locator('#contact-phone').fill('');
  await page.locator('#contact-phone').pressSequentially('89919239912');
  assert.equal(await page.locator('#contact-phone').inputValue(), '+7 (991) 923-99-12', 'Набор с 8');
  await page.locator('[name=consent]').check();
  await page.locator('.submit-button').click();
  assert.equal(await page.locator('.form-status').textContent().then(text => text.includes('временно недоступна')), true, 'Честное сообщение без почты');
  assert.equal(await page.locator('dialog:visible').count(), 0, 'Форма не открывает модалку');
  results.push({ interaction: 'form/phone/inline fallback', status: 'pass' });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 650 });
  await page.locator('.site-header .menu-toggle').click();
  await page.waitForTimeout(80);
  await page.locator('.menu-close').click();
  await page.waitForTimeout(80);
  assert.equal(await page.locator('#mobile-menu').evaluate(el => el.open), false, 'Reduced motion сохраняет работоспособность');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  page.off('pageerror', onError);
  page.off('requestfailed', onRequest);
  assert.equal(runtimeErrors.length, 0, 'Нет ошибок JavaScript');
  assert.equal(failedRequests.length, 0, 'Нет ошибок ресурсов: ' + JSON.stringify(failedRequests));
  return { results, runtimeErrors, failedRequests };
}
