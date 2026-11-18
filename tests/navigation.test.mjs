import { test } from 'node:test';
import assert from 'node:assert/strict';
import { header } from '../scripts/views.mjs';

test('кнопка мобильного меню содержит три полоски', () => {
  const html = header('/', { phone: '+79919239912', phoneDisplay: '8 (991) 923-99-12', telegram: 'https://t.me/+79919239912' });
  const button = html.match(/<button class="menu-toggle"[^>]*>([\s\S]*?)<\/button>/)?.[1];
  assert.ok(button);
  assert.equal((button.match(/<span><\/span>/g) || []).length, 3);
});
