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
const comps = fs.readdirSync(path.join(ROOT, 'components')).filter(n => fs.existsSync(path.join(ROOT, 'components', n, 'preview.html'))).sort();

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
    const body = raw.replace(/^<!--.*?-->\n?/, '');
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
  await browser.close();
  console.log(`${comps.length} Bausteine x ${THEMES.length} Themes x 2 Breiten: ${pass} bestanden · ${fail} fehlgeschlagen`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
