#!/usr/bin/env node
/* DkZ Terminal Style — Vorschau-Test (Playwright, Headless-Chromium).
 *   dkz-terminal-style/build.sh && node dkz-terminal-style/test/previews.js [--shots <ordner>]
 * Rendert jede components/<Name>/preview.html so, wie der Design-System-Viewer sie lädt: tokens.css und
 * bundle.css vorab, <html data-theme> gesetzt. Prüft je Baustein x Theme x Breite: keine Konsolenfehler,
 * kein horizontales Scrollen, sichtbarer Inhalt, deckender Grund. Exit 1 bei jedem Fehlschlag. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
for (const f of ['dist/tokens.css', 'dist/bundle.css']) if (!fs.existsSync(path.join(ROOT, f))) { console.error(f + ' fehlt: erst build.sh ausführen'); process.exit(2); }
const tokens = read('dist/tokens.css'), bundle = read('dist/bundle.css');
const THEMES = JSON.parse(read('tokens.json')).color.themes.map(t => t.id);
const comps = fs.readdirSync(path.join(ROOT, 'components')).filter(n => fs.existsSync(path.join(ROOT, 'components', n, 'preview.html')) && n !== 'Cover').sort();

// Zeile 1 (Marker) abtrennen und Kommentare entfernen ohne Regex-HTML-Filter (CodeQL: bad-html-filtering)
const afterMarker = s => s.slice(s.indexOf('\n') + 1);
const stripComments = s => { let out = '', i = 0; for (;;) { const a = s.indexOf('<!--', i); if (a < 0) return out + s.slice(i); const b = s.indexOf('-->', a + 4); out += s.slice(i, a); if (b < 0) return out; i = b + 3; } };
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) pass++; else { fail++; console.log('  ✖ ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : '')); } };

(async () => {
  const browser = await chromium.launch(), ctx = await browser.newContext({ deviceScaleFactor: 1 });
  await ctx.route(/fonts\./, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage(), errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  for (const name of comps) {
    const raw = read(`components/${name}/preview.html`), m = /^<!-- @dsCard group="([^"]+)" height=(\d+)/.exec(raw);
    ok(`${name}: Marker in Zeile 1`, !!m);
    const readme = read(`components/${name}/README.md`);
    ok(`${name}: README beginnt mit einem Satz (Summary)`, /^[A-ZÄÖÜ][^\n]{12,}\.\s/.test(readme), readme.slice(0, 40));
    const body = afterMarker(raw);
    for (const theme of THEMES) for (const w of [360, 900]) {
      errs.length = 0;
      await page.setViewportSize({ width: w, height: m ? +m[2] : 300 });
      await page.setContent(`<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${tokens}\n${bundle}\nbody{margin:0}</style></head><body>${body}</body></html>`);
      const r = await page.evaluate(() => {
        const st = document.querySelector('.tm-stage'), bg = st && getComputedStyle(st).backgroundColor;
        return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, n: document.body.querySelectorAll('*').length, bg,
                 text: document.body.innerText.trim().length };
      });
      const tag = `${name}/${theme}/${w}`;
      ok(`${tag}: kein horizontales Scrollen`, r.over <= 0, r.over);
      ok(`${tag}: sichtbarer Inhalt`, r.n > 3 && r.text > 0, r);
      ok(`${tag}: deckender Grund`, r.bg && r.bg !== 'rgba(0, 0, 0, 0)' && r.bg !== 'transparent', r.bg);
      ok(`${tag}: keine Konsolenfehler`, errs.length === 0, errs.slice());
      if (shotDir && w === 900 && (theme === 'master' || theme === 'contrast')) await page.screenshot({ path: path.join(shotDir, `${name}-${theme}.png`) });
    }
  }

  // Cover: eigene Regeln (cover.md) — Marker ohne group, Ordner nur preview.html, 960 px Breite, Name <= 960 - 2 x Einzug
  {
    const dir = path.join(ROOT, 'components', 'Cover'), raw = read('components/Cover/preview.html');
    ok('Cover: Ordner enthält nur preview.html', JSON.stringify(fs.readdirSync(dir)) === '["preview.html"]', fs.readdirSync(dir));
    ok('Cover: Marker in Zeile 1', /^<!-- @dsCard height=(2[4-9]\d|3[0-5]\d|360) -->\n/.test(raw));
    ok('Cover: keine Breiten-Queries', !/@media|@container|\b\d+(\.\d+)?(vw|cqw)\b/.test(raw));
    ok('Cover: keine Farbwerte außerhalb von Tokens', !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(stripComments(raw)));
    ok('Cover: Herleitung als Kommentar', /Derivation[\s\S]*Blocks:[\s\S]*Arrangement:[\s\S]*Pattern:[\s\S]*Steps and radii:/.test(raw));
    const body = afterMarker(raw);
    for (const theme of THEMES) {
      errs.length = 0;
      await page.setViewportSize({ width: 960, height: 300 });
      await page.setContent(`<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${tokens}\n${bundle}\nbody{margin:0}</style></head><body>${body}</body></html>`);
      const r = await page.evaluate(() => {
        const n = document.querySelector('.name').getBoundingClientRect(), t = document.querySelector('.tag').getBoundingClientRect(), cv = document.querySelector('.cv').getBoundingClientRect(), s = document.querySelector('svg').getBoundingClientRect();
        return { nameR: n.right, nameT: n.top, nameB: n.bottom, tagB: t.bottom, tagW: t.width, h: cv.height, svgB: s.bottom, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      ok(`Cover/${theme}: Name passt in 960 - 2 x 32`, r.nameR <= 960 - 32, r);
      ok(`Cover/${theme}: Name unter dem Band`, r.nameT >= r.svgB, r);
      ok(`Cover/${theme}: Text liegt in der Höhe`, r.tagB <= r.h, r);
      ok(`Cover/${theme}: Tagline <= 440 px`, r.tagW <= 440, r);
      ok(`Cover/${theme}: kein Overflow`, r.over <= 0, r);
      ok(`Cover/${theme}: keine Konsolenfehler`, errs.length === 0, errs.slice());
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `Cover-${theme}.png`), clip: { x: 0, y: 0, width: 960, height: 300 } });
    }
  }
  await browser.close();
  console.log(`${comps.length} Bausteine x ${THEMES.length} Themes x 2 Breiten: ${pass} bestanden · ${fail} fehlgeschlagen`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
