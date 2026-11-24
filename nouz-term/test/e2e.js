#!/usr/bin/env node
/* NOUZ-Term — E2E-Test (Playwright, Headless-Chromium).
 *   node nouz-term/test/e2e.js [--shots <ordner>]
 * Bedient die Demo wie ein Mensch, versucht Einschleusungen und prüft Layout in 5 Themes x 4 Breiten.
 * Google Fonts werden abgefangen, damit Netzwerkrauschen keine App-Fehler verdeckt (Schriften sind hier
 * also NICHT mitgeprüft, es greifen die Fallback-Stacks). Exit 1 bei jedem Fehlschlag. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✖ ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : '')); } };

async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 1440, height: opts.h || 900 }, deviceScaleFactor: 1, ...opts.ctx });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage(), errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(FILE + (opts.query || ''));
  await page.waitForSelector('.tm-tab');
  return { ctx, page, errs };
}
const run = async (page, text) => { await page.fill('#cmd', text); await page.press('#cmd', 'Enter'); };
const logText = page => page.locator('#log').innerText();
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

(async () => {
  const browser = await chromium.launch();

  console.log('A · Ausgangszustand (1440 px)');
  {
    const { ctx, page, errs } = await open(browser);
    ok('Titel', (await page.title()).startsWith('DkZ NOUZ-Term'));
    ok('4 Tabs, HERD gewählt', (await page.locator('.tm-tab').count()) === 4 && (await page.locator('#tab-herd').getAttribute('aria-selected')) === 'true');
    ok('5 Agenten im Herd-Baum', (await page.locator('.tm-agent').count()) === 5);
    ok('Kopfmarke „HERD · 4 ACTIVE"', (await page.locator('#badge').innerText()) === 'HERD · 4 ACTIVE', await page.locator('#badge').innerText());
    ok('Tab-Zähler ●4', (await page.locator('#count').innerText()) === '●4');
    ok('Boot-Log enthält cargo test', (await logText(page)).includes('cargo test renderer'));
    ok('DEMO-DATEN-Marke sichtbar', (await page.locator('.tm-mode').innerText()) === 'DEMO-DATEN');
    ok('Graph-Hintergrund hat 5 Knoten', (await page.locator('#graph-bg .tm-gnode').count()) === 5);
    ok('kein horizontales Scrollen', (await overflow(page)) <= 0, await overflow(page));
    ok('Version ist „— ausstehend —"', (await page.locator('.tm-ver').innerText()).includes('— ausstehend —'));
    ok('kein Emoji im Dateibaum', !/[\u{1F300}-\u{1FAFF}]/u.test(await page.locator('#tree').innerText()));
    ok('Prompt hat Fokus (Desktop)', await page.evaluate(() => document.activeElement.id === 'cmd'));
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('B · Tabs schalten echte Ansichten');
  {
    const { ctx, page, errs } = await open(browser);
    await page.click('#tab-files');
    ok('FILES: Vorschau sichtbar, Seitenleiste weg', (await page.locator('#p-preview').isVisible()) && !(await page.locator('#p-side').isVisible()));
    ok('FILES: Pfad zeigt renderer.rs', (await page.locator('#preview').innerText()).includes('DEVKiTZ/github-hub/renderer.rs'));
    ok('FILES: fehlende Werte als „— ausstehend —"', (await page.locator('#preview .tm-miss').count()) >= 2);
    await page.click('#tab-knowledge');
    ok('KNOWLEDGE: Graph mit 5 klickbaren Knoten', (await page.locator('#graph .tm-gnode[role=button]').count()) === 5);
    ok('KNOWLEDGE: Herd-Abschnitt ausgeblendet', !(await page.locator('.tm-sec-herd').isVisible()));
    await page.click('#tab-services');
    ok('SERVICES: 9 Zeilen (3 Stack + 6 Wissen)', (await page.locator('#svc tbody tr').count()) === 9, await page.locator('#svc tbody tr').count());
    ok('SERVICES: Zustand mit Wort + Glyph', (await page.locator('#svc tbody tr').first().innerText()).includes('● ON'));
    await page.focus('#tab-services'); await page.keyboard.press('ArrowLeft');
    ok('Pfeiltaste wechselt Tab', (await page.locator('#tab-knowledge').getAttribute('aria-selected')) === 'true');
    await page.keyboard.press('Alt+1');
    ok('Alt+1 → HERD', (await page.locator('#tab-herd').getAttribute('aria-selected')) === 'true');
    await page.click('.tm-pill >> nth=1');
    ok('Statuspille öffnet SERVICES', (await page.locator('#tab-services').getAttribute('aria-selected')) === 'true');
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('C · Prompt-Befehle');
  {
    const { ctx, page, errs } = await open(browser);
    await run(page, 'help');       ok('help', (await logText(page)).includes('Befehle: help'));
    await run(page, 'theme contrast');
    ok('theme contrast setzt data-theme', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'contrast');
    ok('Theme wird gemerkt', (await page.evaluate(() => localStorage.getItem('dkz-theme'))) === 'contrast');
    await run(page, 'theme gibtsnicht'); ok('unbekanntes Theme → Fehlerzeile', (await logText(page)).includes('unbekannt: gibtsnicht'));
    await run(page, 'theme master');
    await run(page, 'constructor');    ok('„constructor" ist kein Befehl (Prototype-Falle)', (await logText(page)).includes('command stored'));
    await run(page, '__proto__');      ok('„__proto__" ist kein Befehl', errs.length === 0, errs);
    await run(page, '@qa Flaky-Test prüfen');
    ok('@qa: Zustand RUNNING', (await page.locator('.tm-agent[data-k=qa]').innerText()).includes('RUNNING'));
    ok('@qa: Ungelesen-Marke, weil nicht fokussiert', (await page.locator('.tm-agent[data-k=qa] .tm-new').count()) === 1);
    ok('@qa: Simulation ist als solche gekennzeichnet', (await logText(page)).includes('Simulation. Echt senden: odysseus chat a2a'));
    await page.waitForFunction(() => document.querySelector('.tm-agent[data-k=qa]').innerText.includes('DONE'), null, { timeout: 4000 });
    ok('@qa: später DONE', true);
    await page.click('.tm-agent[data-k=qa]');
    ok('Klick auf Agent fokussiert (Breadcrumb)', (await page.locator('#crumb').innerText()).trim().endsWith('qa'));
    ok('Agent hat eigenen Log-Strom', (await logText(page)).includes('task angenommen: Flaky-Test prüfen') && !(await logText(page)).includes('cargo test renderer'));
    ok('Ungelesen-Marke weg', (await page.locator('.tm-agent[data-k=qa] .tm-new').count()) === 0);
    await run(page, '@rust-renderer');
    ok('„@agent" ohne Task fokussiert', (await page.locator('#crumb').innerText()).trim().endsWith('rust-renderer'));
    await run(page, '@gibtsnicht x'); ok('@unbekannt → Fehler mit Liste', (await logText(page)).includes('unbekannter Agent @gibtsnicht'));
    await run(page, '#nouz');
    ok('#nouz findet Treffer', /\[nouz\]\s+\d+ Treffer/.test(await logText(page)));
    ok('#nouz markiert Graphknoten', (await page.locator('#graph-bg .tm-gnode.is-hit').count()) >= 1);
    await run(page, '/cargo');
    ok('/cargo wählt Datei + wechselt zu FILES', (await page.locator('#tab-files').getAttribute('aria-selected')) === 'true' && (await page.locator('#preview').innerText()).includes('Cargo.toml'));
    await page.click('#tab-herd');
    await run(page, '?cargo');  ok('?cargo → 2 Vorlagen, kein Auto-Einfügen', (await logText(page)).includes('2 Vorlagen') && (await page.inputValue('#cmd')) === '');
    await run(page, '?workspace'); ok('?workspace → 1 Vorlage wird eingefügt', (await page.inputValue('#cmd')) === 'cargo test --workspace');
    await page.fill('#cmd', '');
    await page.fill('#cmd', 'kno'); await page.press('#cmd', 'Tab');
    ok('Tab ergänzt Befehl', (await page.inputValue('#cmd')) === 'knowledge', await page.inputValue('#cmd'));
    await page.fill('#cmd', '@rust-r'); await page.press('#cmd', 'Tab');
    ok('Tab ergänzt Agent', (await page.inputValue('#cmd')) === '@rust-renderer ', await page.inputValue('#cmd'));
    await page.fill('#cmd', ''); await page.press('#cmd', 'ArrowUp');
    ok('↑ holt letzten Befehl', (await page.inputValue('#cmd')) === '?workspace', await page.inputValue('#cmd'));
    await page.fill('#cmd', ''); await run(page, 'clear');
    ok('clear leert den Log', (await logText(page)).trim().length === 0 || (await logText(page)).trim() === '$ clear', (await logText(page)).slice(0, 60));
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('D · Befehlspalette');
  {
    const { ctx, page, errs } = await open(browser);
    await page.keyboard.press('Control+p');
    ok('Ctrl+P öffnet die Palette', await page.locator('#pal').evaluate(e => e.classList.contains('is-open')));
    ok('App ist inert (Fokusfalle)', await page.locator('.tm-app').evaluate(e => e.inert));
    ok('Fokus liegt im Suchfeld', await page.evaluate(() => document.activeElement.id === 'pal-in'));
    ok('leere Suche zeigt Treffer', (await page.locator('.tm-res').count()) >= 10);
    await page.fill('#pal-in', 'rend');
    const first = await page.locator('.tm-res').first().innerText();
    ok('Fuzzy-Filter: erster Treffer enthält „rend"', /rend/i.test(first), first);
    ok('Treffer-Hervorhebung via <mark>', (await page.locator('.tm-res mark').count()) >= 1);
    await page.fill('#pal-in', 'zzzzqq'); ok('keine Treffer → Hinweis', (await page.locator('.tm-empty').innerText()).includes('Keine Treffer'));
    await page.fill('#pal-in', '@rust');
    ok('kürzerer Treffer wird höher gereiht (@rust-core vor @rust-renderer)', (await page.locator('.tm-res').first().innerText()).includes('@rust-core'));
    await page.fill('#pal-in', '@qa');
    await page.keyboard.press('Enter');
    ok('Enter führt aus (Agent fokussiert), Palette zu', !(await page.locator('#pal').evaluate(e => e.classList.contains('is-open'))) && (await page.locator('#crumb').innerText()).trim().endsWith('qa'));
    await page.keyboard.press('Control+p'); await page.fill('#pal-in', 'SERVICES');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp');
    ok('↑/↓ ändern aria-selected', (await page.locator('.tm-res[aria-selected=true]').count()) === 1);
    await page.keyboard.press('Enter');
    ok('VIEW-Eintrag wechselt Ansicht', (await page.locator('#tab-services').getAttribute('aria-selected')) === 'true');
    await page.keyboard.press('Control+p'); await page.keyboard.press('Escape');
    ok('Esc schließt, Fokus kehrt zurück', !(await page.locator('#pal').evaluate(e => e.classList.contains('is-open'))) && !(await page.locator('.tm-app').evaluate(e => e.inert)));
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('E · Einschleusung über den Prompt');
  {
    const { ctx, page, errs } = await open(browser);
    const evil = '<img src=x onerror="window.__pwn=1">';
    for (const c of ['@' + evil + ' hi', '@qa ' + evil, '#' + evil, '/' + evil, '?' + evil, 'theme ' + evil, evil, '"><svg onload=window.__pwn=1>']) await run(page, c);
    await page.keyboard.press('Control+p'); await page.fill('#pal-in', evil); await page.keyboard.press('Escape');
    const injected = await page.evaluate(() => document.querySelectorAll('#log img,#log svg,#log script,#log b,#pal-list img,#herd img').length);
    ok('0 eingeschleuste Elemente', injected === 0, injected);
    ok('window.__pwn nie gesetzt', (await page.evaluate(() => window.__pwn)) === undefined);
    ok('Nutzlast erscheint als sichtbarer Text', (await logText(page)).includes('<img src=x'));
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('F · Feindliche Daten (NOUZ_DATA)');
  {
    const init = () => { window.NOUZ_DATA = {
      meta: { mode: 'live', generated: '<u>jetzt</u>', branch: '<b>b</b>', file: '<script>window.__pwn=1</script>', extra: '<i>x</i>' },
      stack: [{ id: 's', name: '<img src=x onerror=window.__pwn=1>', detail: '</span><b>', state: 'on' }],
      agents: [{ id: 'x', name: '<img src=x onerror=window.__pwn=1>', state: 'running' }, { id: 'y', name: 'y', parent: 'x', state: '<svg onload=window.__pwn=1>' }],
      files: [{ name: '<script>window.__pwn=1</script>', type: 'file', depth: 0 }, { name: '"><svg onload=window.__pwn=1>', type: 'dir', depth: 0 }],
      worktrees: ['<img src=x onerror=window.__pwn=1>'],
      knowledge: [{ id: 'k"]', code: 'K', name: '"><svg onload=window.__pwn=1>', detail: '<b>fett</b>', state: 'ready' }],
      graph: { nodes: [{ id: 'k', label: '<i>x</i>' }, { id: 'c', label: '</text><script>window.__pwn=1</script>' }], center: 'c' },
      index: [{ type: '<b>T</b>', text: '<img src=x onerror=window.__pwn=1>', source: '<u>s</u>', action: 'cmd:<img src=x onerror=window.__pwn=1>' }],
      boot: [[['', '<img src=x onerror=window.__pwn=1>']], 'kein Array', null]
    }; };
    const { ctx, page, errs } = await open(browser, { init });
    for (const v of ['files', 'knowledge', 'services', 'herd']) await page.click('#tab-' + v);
    await page.keyboard.press('Control+p'); await page.keyboard.press('Escape');
    // Die App nutzt selbst <b> (Wortmarke, Labels) und <i> (Status-Punkt). Eingeschleust wäre alles,
    // was aus den feindlichen Strings stammt: <img>, <u>, Handler-Attribute, ein <b> mit Text „fett", <i> mit „x".
    const bad = await page.evaluate(() => ({
      img: document.querySelectorAll('img').length, u: document.querySelectorAll('u').length,
      handler: document.querySelectorAll('[onerror],[onload]').length,
      boldFett: [...document.querySelectorAll('b')].filter(e => e.textContent === 'fett').length,
      italicX: [...document.querySelectorAll('i')].filter(e => e.textContent === 'x').length }));
    const scripts = await page.evaluate(() => document.querySelectorAll('body script').length);
    ok('keine eingeschleusten img/u/Handler/b/i', Object.values(bad).every(n => n === 0), bad);
    ok('nur die 2 eigenen <script> im Body', scripts === 2, scripts);
    ok('window.__pwn nie gesetzt', (await page.evaluate(() => window.__pwn)) === undefined);
    ok('Seite lebt trotz kaputter Daten', (await page.locator('.tm-tab').count()) === 4);
    ok('LIVE-Marke zeigt Text, kein Markup', (await page.locator('.tm-mode').innerText()).includes('<u>jetzt</u>'));
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('G · localStorage wirft (Privatmodus)');
  {
    const init = () => { const boom = () => { throw new DOMException('blockiert', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get: boom }); };
    const { ctx, page, errs } = await open(browser, { init });
    await run(page, 'theme light');
    ok('Theme wechselt trotzdem', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  console.log('H · ?live ohne data.local.js');
  {
    const { ctx, page, errs } = await open(browser, { query: '?live' });
    await page.waitForFunction(() => document.querySelectorAll('.tm-agent').length > 0);
    ok('fällt auf Demo-Daten zurück', (await page.locator('.tm-mode').innerText()) === 'DEMO-DATEN');
    ok('erklärt, was fehlt', (await logText(page)).includes('data.local.js fehlt'));
    ok('einzige Konsolenmeldung ist der fehlende Ressourcen-Ladefehler', errs.every(e => /Failed to load resource|ERR_FILE_NOT_FOUND/.test(e)), errs);
    await ctx.close();
  }

  console.log('I · Layout: 5 Themes x 4 Ansichten x 4 Breiten');
  {
    const themes = ['master', 'light', 'contrast', 'control', 'content'], widths = [320, 390, 820, 1440], views = ['herd', 'files', 'knowledge', 'services'];
    const { ctx, page, errs } = await open(browser, { w: 1440, h: 900 });
    const bad = [];
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: w < 640 ? 800 : 900 });
      for (const t of themes) {
        await page.evaluate(t2 => document.documentElement.setAttribute('data-theme', t2), t);
        for (const v of views) {
          await page.click('#tab-' + v);
          const o = await overflow(page);
          if (o > 0) bad.push(`${t}/${w}/${v}: +${o}px`);
        }
        await page.click('#tab-herd');
        if (shotDir && (v => true)()) await page.screenshot({ path: path.join(shotDir, `${t}-${w}.png`), fullPage: w < 640 });
      }
    }
    ok('kein horizontales Scrollen in 80 Kombinationen', bad.length === 0, bad.slice(0, 6));
    await page.setViewportSize({ width: 1440, height: 900 }); await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'master'));
    const h = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, win: innerHeight }));
    ok('Desktop: Seite füllt genau das Fenster (kein Seiten-Scroll)', h.doc <= h.win + 1, h);
    await page.setViewportSize({ width: 320, height: 640 });
    const inputBox = await page.locator('#cmd').boundingBox();
    ok('320 px: Prompt-Feld mind. 200 px breit', inputBox && inputBox.width >= 200, inputBox);
    ok('keine Konsolenfehler', errs.length === 0, errs);
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${pass} bestanden · ${fail} fehlgeschlagen`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
