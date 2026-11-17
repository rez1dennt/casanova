import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as views from '../scripts/views.mjs';
import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));

test('в контактах и форме только Telegram и звонок', () => {
  const html = views.contacts(config) + views.contact(config) + views.footer(config);
  assert.doesNotMatch(html, /WhatsApp|wa\.me|undefined/);
  assert.match(html, /href="tel:\+79919239912"/);
  assert.match(html, /telegram-icon/);
});
test('политика содержит реквизиты реального оператора и раздел cookie', () => {
  assert.equal(typeof views.privacyPage, 'function');
  const html = views.privacyPage(config);
  for (const value of ['9718303022', '1267700347364', 'Каса Нова', 'cookie']) assert.ok(html.includes(value));
});
test('согласие формы ведёт на отдельную политику', () => {
  assert.match(views.contact(config), /href="\/privacy\/#consent"/);
});
test('фотографии команды и базы различаются', () => {
  assert.match(views.about(), /team-about\.webp/);
  assert.match(views.teamBand(), /base-workshop\.webp/);
});
