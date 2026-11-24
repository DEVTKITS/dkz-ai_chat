#!/usr/bin/env node
/* NOUZ-Term — Test des Datenexports (Ende zu Ende).
 *   node nouz-term/test/export.js
 * Legt ein Inbox-Fixture an (auch mit feindlichen Namen und Nachrichten) und zwei Mini-Server als „Dienste",
 * führt odysseus/scripts/nouz-export.sh aus, lädt die Oberfläche mit ?live und prüft, dass
 *   – echte Werte erscheinen (Dateien, Commit, Agenten, Dienste),
 *   – von den Beispielwerten der Demo nichts übrig bleibt,
 *   – nicht Messbares als „— ausstehend —" erscheint,
 *   – Feindliches nur als Text ankommt.  Exit 1 bei jedem Fehlschlag. */
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SH = path.join(REPO, 'odysseus/scripts/nouz-export.sh');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✔ ' + n); } else { fail++; console.log('  ✖ ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const serve = code => new Promise(res => { const s = http.createServer((q, r) => { r.statusCode = code; r.end('ok'); }); s.listen(0, '127.0.0.1', () => res(s)); });
// Asynchron, nicht spawnSync: Die Mini-Server leben in diesem Prozess und müssen antworten, während der Export läuft.
const sh = (args, env) => new Promise(res => execFile('bash', [SH, ...args], { env, encoding: 'utf8' },
  (err, stdout, stderr) => res({ status: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr })));

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nouz-')), a2a = path.join(tmp, 'a2a');
  fs.mkdirSync(a2a);
  fs.writeFileSync(path.join(a2a, 'coder.jsonl'), [
    '{"ts":"2026-11-24T10:00:00+00:00","from":"operator","msg":"Review lane-a"}',
    '{"ts":"2026-11-24T10:05:00+00:00","from":"coder","msg":"<img src=x onerror=window.__pwn=1> fertig"}', 'kaputte zeile'].join('\n'));
  fs.writeFileSync(path.join(a2a, 'leer.jsonl'), '');
  fs.writeFileSync(path.join(a2a, '<img src=x onerror=window.__pwn=1>.jsonl'), '{"ts":"x","from":"y","msg":"hi"}\n');

  const healthy = await serve(200), sick = await serve(503);   // Gitea gesund, Immich krank, der Rest nicht erreichbar
  const env = { ...process.env, GITEA_PORT: String(healthy.address().port), IMMICH_PORT: String(sick.address().port),
                OPENCLOUD_PORT: '1', LIBRECHAT_PORT: '1', ATUIN_PORT: '1' };

  console.log('Export');
  const out = path.join(tmp, 'data.local.js');
  const r = await sh(['export', '--out', out, '--a2a-dir', a2a, '--repo', REPO], env);
  ok('Exit 0 und Datei geschrieben', r.status === 0 && fs.existsSync(out), r.stderr || r.stdout);
  const js = fs.readFileSync(out, 'utf8');
  ok('Datei ist 0600', (fs.statSync(out).mode & 0o777) === 0o600, (fs.statSync(out).mode & 0o777).toString(8));
  ok('rein ASCII (kein Zeilentrenner-Risiko)', !/[^\x00-\x7f]/.test(js));
  ok('keine Zugangsdaten-Muster in der Ausgabe', !/ADMIN_PASS|JWT_SECRET|PRIVATE KEY/.test(js));
  ok('unbekannte Option scheitert mit Exit != 0', (await sh(['export', '--gibtsnicht'], env)).status !== 0);
  ok('unbekannter Unterbefehl scheitert mit Exit 2', (await sh(['nope'], env)).status === 2);
  const stdout = JSON.parse((await sh(['export', '--stdout', '--no-probe', '--a2a-dir', a2a, '--repo', REPO], env)).stdout);
  ok('--no-probe markiert Dienste als unbekannt', stdout.services.every(s => s.state === 'unknown'), stdout.services);
  ok('Skills werden als SKILL.md gezählt, nicht als Ordner', stdout.knowledge.find(k => k.id === 'skills').detail === null || /\d+ Skills/.test(stdout.knowledge.find(k => k.id === 'skills').detail));

  // Oberfläche neben die Daten legen, wie im Repo (nouz-term/index.html + data.local.js).
  fs.copyFileSync(path.join(REPO, 'nouz-term/index.html'), path.join(tmp, 'index.html'));
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/fonts\./, rt => rt.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage(), errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(tmp, 'index.html') + '?live');
  await page.waitForSelector('.tm-agent');
  const body = () => page.locator('body').innerText();
  const text = await body();

  // Proxy-Falle: auch mit gesetzter HTTP_PROXY muss ein lokaler Dienst als erreichbar gelten.
  const viaProxy = await sh(['export', '--stdout', '--a2a-dir', a2a, '--repo', REPO], { ...env, HTTP_PROXY: 'http://127.0.0.1:9', http_proxy: 'http://127.0.0.1:9' });
  ok('lokale Dienste werden trotz gesetzter HTTP_PROXY erreicht', JSON.parse(viaProxy.stdout).services.find(s => s.id === 'gitea').state === 'ready');

  console.log('Oberfläche mit echten Daten');
  ok('Marke zeigt LIVE mit Zeitpunkt', /LIVE · \d{4}-\d\d-\d\d \d\d:\d\d:\d\d UTC/.test(await page.locator('.tm-mode').innerText()));
  ok('Version stammt aus git', /Version: \S+/.test(text) && !text.includes('Version: — ausstehend —'));
  ok('3 Agenten aus den 3 Inboxen', (await page.locator('.tm-agent').count()) === 3, await page.locator('.tm-agent').count());
  ok('Agent mit Post: WAITING; leere Inbox: ausstehend', (await page.locator('.tm-agent[data-k=coder]').innerText()).includes('WAITING') && (await page.locator('.tm-agent[data-k=leer]').innerText()).includes('— ausstehend —'));
  ok('Beispielwerte der Demo kommen nirgends vor', !/8,421|2,847|1,836|427 pages|14 shells|renderer::projection|cargo test|dkz-dashboard/.test(text));
  ok('Werkzeugkette ehrlich: nicht gefunden', (await page.locator('#meta').innerText()).includes('GHOSTTY: nicht gefunden'));
  ok('Boot-Log nennt den Export', (await page.locator('#log').innerText()).includes('[export]'));
  await page.click('.tm-agent[data-k=coder]');
  const coderLog = await page.locator('#log').innerText();
  ok('Inbox-Nachrichten stehen im Agenten-Log', coderLog.includes('Review lane-a') && coderLog.includes('coder:'));
  ok('feindliche Nachricht als Text, nicht als Element', coderLog.includes('<img src=x') && (await page.locator('#log img').count()) === 0);
  ok('feindlicher Dateiname wurde zu harmloser ID', (await page.locator('#herd img').count()) === 0 && (await page.locator('.tm-agent').allInnerTexts()).some(t => t.includes('-img-src-x-onerror')));

  await page.click('#tab-services');
  const svc = await page.locator('#svc tbody').innerText();
  ok('Dienst mit HTTP 200 ist READY', /Gitea\s+● READY\s+HTTP 200/.test(svc), svc);
  ok('Dienst mit HTTP 503 ist ERROR', /Immich\s+✖ ERROR\s+HTTP 503/.test(svc), svc);
  ok('nicht erreichbarer Dienst ist OFFLINE', /OpenCloud\s+○ OFFLINE/.test(svc), svc);
  ok('nicht verbundene Wissensdienste: — ausstehend —', /GitNexus\s+○ — ausstehend —\s+— ausstehend —/.test(svc), svc);
  ok('llms.txt mit echter Zeilenzahl', /llms\.txt\s+● READY\s+\d+ Zeilen/.test(svc), svc);

  await page.click('#tab-files');
  const pv = await page.locator('#preview').innerText();
  ok('Dateibaum aus git, README.md gewählt', pv.includes('README.md') && (await page.locator('#tree').innerText()).includes('odysseus'));
  ok('letzter Commit der Datei ist ein echter Hash', /Letzter Commit\s+[0-9a-f]{7} /.test(pv), pv);
  await page.click('#tab-knowledge');
  ok('Graph nur mit verbundenen Diensten (Repo + 2)', (await page.locator('#graph .tm-gnode').count()) === 3, await page.locator('#graph .tm-gnode').count());
  await page.keyboard.press('Control+p'); await page.fill('#pal-in', 'odysseus st');
  ok('Palette kennt echte Befehle (odysseus status)', (await page.locator('.tm-res').first().innerText()).includes('odysseus status'));
  await page.keyboard.press('Escape');

  ok('0 eingeschleuste Elemente, __pwn nie gesetzt', (await page.evaluate(() => document.querySelectorAll('img').length + (window.__pwn ? 1 : 0))) === 0);
  ok('keine Konsolenfehler', errs.length === 0, errs);

  await browser.close(); healthy.close(); sick.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${pass} bestanden · ${fail} fehlgeschlagen`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
