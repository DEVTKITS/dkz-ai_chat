# NOUZ-Term

Terminal-Oberfläche im DkZ-Look (Ghostty → Zellij → Herdr → Subterminal) aus `DkZ_NOUZ_Terminal_Demo1.html`: Herd mit Agenten, Dateibaum, Wissensgraph, Dienste, Befehlspalette. Eine Datei, kein Build, keine Abhängigkeit außer Google Fonts (mit Fallback-Schriften).

| Datei | Zweck |
|:--|:--|
| `index.html` | der fertige Prototyp, Tokens und CSS von `dkz-terminal-style/build.py` eingebettet |
| `DkZ_NOUZ_Terminal_Demo1.html` | die unveränderte Vorlage (Diff-Basis) |
| `terminal/` | Ghostty-, Zellij- und Herdr-Konfiguration, Palette, Installer |
| `test/e2e.js`, `test/export.js` | Playwright-Tests (81 und 30 Prüfungen) |
| `data.local.js` | vom Export erzeugt, nicht im Git |

## Benutzen

`index.html` im Browser öffnen. Ohne weiteres zeigt sie **Beispieldaten** (Badge „DEMO-DATEN“). Echte Werte:

```bash
odysseus nouz export        # misst und schreibt nouz-term/data.local.js
# dann index.html?live öffnen
```

| Eingabe | Wirkung |
|:--|:--|
| `Ctrl+P` | Palette: Fuzzy-Suche über Dateien, Befehle, Agenten, Wissen; ↑ ↓ Enter Esc |
| `Alt+1` … `Alt+4` | HERD · FILES · KNOWLEDGE · SERVICES |
| `@agent <task>` | Agent beauftragen, eigenes Log je Agent |
| `#suche` | Wissensindex durchsuchen, Treffer im Graph markieren |
| `/datei` · `?navi` | Datei wählen · Navi-Einträge |
| `help herd knowledge files services graph status theme <name> clear` | Befehle; `Tab` ergänzt |

Fünf Themes: `master`, `light`, `contrast`, `control`, `content` (Umschalter oben rechts, `theme <name>` im Prompt; Wahl in `localStorage`, nur in try/catch).

## Was ist echt, was Demo

| Teil | Stand |
|:--|:--|
| Oberfläche, Palette, Prompt, Tabs, Graph, Themes | echt und getestet (Playwright, Chromium) |
| Agenten, Dateien, Dienste, Wissenszeilen **ohne** `?live` | **Beispieldaten** aus der Demo, im UI als DEMO gekennzeichnet |
| Agenten aus `odysseus/data/a2a/*.jsonl`, Dateien aus `git ls-files`, Dienste per HTTP-Probe, Skills und Registry | **gemessen** durch `odysseus nouz export` |
| Zähler von GitNexus, Graphify, NOUZ, Atuin, LLM-Wiki | `— ausstehend —`, bis diese Werkzeuge angebunden sind |
| `@agent` | ändert Zustand und Log in der Oberfläche; schickt **keine** Nachricht an einen echten Agenten |
| Herdr-Agentenliste | nicht angebunden: die Ausgabeform von `herdr agent list` ist nicht dokumentiert (→ `terminal/herdr/README.md`) |

Der Export misst nur: kein Shell-Verlauf, keine `.env`, kein Vault, keine Dateiinhalte. Die Ausgabe ist ASCII-JSON mit Rechten 0600; HTTP-Proben laufen ohne Proxy.

## Sicherheit

Kein `innerHTML` mit dynamischem Inhalt, alles über DOM-APIs. Getestet: feindliche Eingaben im Prompt, in der Palette und in `data.local.js` erzeugen keine Elemente und führen nichts aus; Befehle sind gegen Prototype-Treffer (`constructor`) gesichert.

## Größe

18-KB-Regel **nicht eingehalten**: 66.556 Byte ungepackt, 18.786 Byte gzip (davon rund 34 KB JavaScript, 24 KB CSS, 4,6 KB Beispieldaten). Fünf Themes, Palette und Graph stehen dem entgegen; das schlankere Gerüst ist `dkz-terminal-style/starter.html`.

## Tests

```bash
node nouz-term/test/e2e.js      # 81 Prüfungen: Themes x Breiten, Tabs, Palette, Prompt, Einschleusung, localStorage
node nouz-term/test/export.js   # 30 Prüfungen: Export gegen ein Fixture-Repo, Proben, Rechte
```

Das Style-System dahinter: [`../dkz-terminal-style/`](../dkz-terminal-style/README.md).
