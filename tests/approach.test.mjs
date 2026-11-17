import { test } from 'node:test';
import assert from 'node:assert/strict';
import { about, teamBand } from '../scripts/views.mjs';

test('пустые отзывы и декоративное письмо заменены рабочим разделом', () => {
  const html = about();
  assert.doesNotMatch(html + teamBand(), /Отзывы заказчиков|Благодарственные|#reviews|letter-paper/);
  assert.match(html, /id="approach"/);
  assert.match(teamBand(), /href="\/about\/#approach"/);
});

test('четыре этапа доступны как связанные вкладки с уникальными фотографиями', () => {
  const html = about();
  const tabs = [...html.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g)];
  assert.equal(tabs.length, 4);
  for (const [, id] of tabs) assert.ok(html.includes(`id="${id}" role="tabpanel"`));
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
  const images = [...html.matchAll(/class="approach-photo" src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(images).size, 4);
});
