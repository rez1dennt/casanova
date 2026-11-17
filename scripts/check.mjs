import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const routes = ['/', '/about/', '/projects/', '/services/', '/contacts/', '/privacy/'];
const titles = new Set(), descriptions = new Set();
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
for (const route of routes) {
  const html = await readFile('dist' + route + 'index.html', 'utf8');
  check((html.match(/<h1\b/g) || []).length === 1, `${route}: ровно один h1`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/name="description" content="([^"]+)"/)?.[1];
  check(title && !titles.has(title), `${route}: уникальный title`); titles.add(title);
  check(description && !descriptions.has(description), `${route}: уникальный description`); descriptions.add(description);
  check(html.includes('<html lang="ru">'), `${route}: язык документа`);
  check(html.includes('rel="canonical"'), `${route}: canonical`);
  check(html.includes('property="og:image"'), `${route}: Open Graph`);
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { JSON.parse(block[1]); checks++; }
  for (const tag of html.matchAll(/<img\b[^>]*>/g)) check(/\balt="[^"]*"/.test(tag[0]), `${route}: alt изображения`);
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)(#[^"]*)?"/g)) {
    const target = match[1];
    if (/^(https?:|tel:|mailto:|data:)/.test(target)) continue;
    const file = resolve('dist', '.' + target + (target.endsWith('/') ? 'index.html' : ''));
    check((await stat(file)).isFile(), `${route}: ресурс ${target}`);
  }
  for (const match of html.matchAll(/href="#([^"]+)"/g)) check(html.includes(`id="${match[1]}"`), `${route}: якорь ${match[1]}`);
}
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
check((sitemap.match(/<url>/g) || []).length === 6, 'sitemap: шесть маршрутов');
const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const robots = await readFile('dist/robots.txt', 'utf8');
check(robots.includes(config.domain ? 'Allow: /' : 'Disallow: /'), 'robots соответствует состоянию домена');
for (const file of ['app.js','config.js','form-utils.js','experience.js','gallery.js','approach.js']) check((await stat('dist/assets/js/' + file)).size > 0, `${file}: непустой файл`);
console.log(`${checks} проверок пройдено: страницы, метаданные, JSON-LD, ссылки, изображения, sitemap и robots.`);
