#!/usr/bin/env node
/* DkZ Terminal Style — Test für starter.html (Playwright, Headless-Chromium).
 *   dkz-terminal-style/build.sh && node dkz-terminal-style/test/starter.js [--shots <ordner>]
 * Prüft: 5 Themes x 3 Breiten ohne Konsolenfehler/Overflow, Befehle, Prototype-Falle, Einschleusung,
 * localStorage das wirft. Google Fonts sind blockiert (Fallback-Schriften). Exit 1 bei jedem Fehlschlag. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'starter.html');
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✖ ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const THEMES = ['master', 'light', 'contrast', 'control', 'content'];

(async () => {
  const browser = await chromium.launch(), ctx = await browser.newContext();
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage(), errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(FILE);
  for (const w of [320, 820, 1440]) for (const t of THEMES) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.click(`.tm-theme[data-theme="${t}"]`);
    const r = await page.evaluate(() => ({ th: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`${t}@${w}: Theme gesetzt`, r.th === t, r);
    ok(`${t}@${w}: kein horizontales Scrollen`, r.sw <= r.cw, r);
    if (shotDir && w !== 820) await page.screenshot({ path: path.join(shotDir, `starter-${t}-${w}.png`) });
  }
  const say = async c => { await page.fill('#cmd', c); await page.press('#cmd', 'Enter'); };
  await page.setViewportSize({ width: 1440, height: 800 });
  await say('help'); ok('help erscheint', /theme <name>/.test(await page.textContent('#log')));
  await say('theme contrast'); ok('theme-Befehl', await page.evaluate(() => document.documentElement.dataset.theme) === 'contrast');
  await say('theme nope'); ok('unbekanntes Theme meldet Fehler', /Unbekanntes Theme/.test(await page.textContent('#log')));
  for (const evil of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    await say(evil); ok(`Prototype-Falle ${evil}`, (await page.textContent('#log')).includes('Unbekannter Befehl: ' + evil));
  }
  await say('echo <img src=x onerror=window.__x=1><script>window.__x=1</script>');
  ok('Einschleusung: keine fremden Elemente', await page.evaluate(() => document.querySelectorAll('#log img, #log script').length) === 0);
  ok('Einschleusung: Nutzlast als Text', (await page.textContent('#log')).includes('<img src=x'));
  ok('Einschleusung: onerror nicht ausgeführt', await page.evaluate(() => window.__x) === undefined);
  await say('clear'); ok('clear leert das Log', await page.evaluate(() => document.querySelector('#log').children.length) === 0);
  ok('Versionsfeld: ausstehend statt erfundener Zahl', /ausstehend/.test(await page.textContent('#status')));
  ok('Konsole: keine Fehler', errs.length === 0, errs);

  // localStorage wirft (Privatmodus): Seite muss trotzdem laufen
  const p2 = await ctx.newPage(), e2 = [];
  p2.on('pageerror', e => e2.push(e.message)); p2.on('console', m => { if (m.type() === 'error') e2.push(m.text()); });
  await p2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p2.goto(FILE); await p2.click('.tm-theme[data-theme="light"]');
  ok('localStorage gesperrt: Theme wechselt trotzdem', await p2.evaluate(() => document.documentElement.dataset.theme) === 'light');
  ok('localStorage gesperrt: keine Fehler', e2.length === 0, e2);
  await browser.close();
  console.log(`${pass} bestanden, ${fail} fehlgeschlagen`); process.exit(fail ? 1 : 0);
})();
