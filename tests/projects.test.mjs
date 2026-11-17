import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projects, projectCard, logo } from '../scripts/views.mjs';

test('в портфолио только два предоставленных проекта', () => {
  assert.equal(projects.length, 2);
  assert.equal(projects[0].title, 'Раздевалка спортивной команды');
  assert.equal(projects[1].title, 'Монтаж инженерных систем в частной резиденции');
});
test('карточка проекта — ссылка на страницу проектов, без модального окна', () => {
  const html = projectCard(projects[0]);
  assert.match(html, /<a[^>]+href="\/projects\/#locker-room"/);
  assert.doesNotMatch(html, /data-project=|<button/);
});
test('логотип сохраняет оригинальную композицию без набранной отдельно подписи', () => {
  const html = logo();
  assert.match(html, /logo-hd\.png/);
  assert.doesNotMatch(html, /<span>Casa Nova<\/span>/);
});
