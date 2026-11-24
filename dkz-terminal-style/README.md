# DkZ Terminal Style

Style-Template für Terminal-Oberflächen im DEVKiTZ-Umfeld, abgeleitet aus `DkZ_NOUZ_Terminal_Demo1.html` (Ghostty → Zellij → Herdr → Subterminal). **Eine Quelle, viele Ziele:** `tokens.json` färbt die Web-Oberfläche, Zellij, Ghostty, Herdr und die Shell.

Die Regeln für die Verwendung stehen in [`brand-book.md`](brand-book.md). Dieselbe Datei ist das README des Design-System-Artifacts „DkZ Terminal Style“.

## Inhalt

| Datei | Zweck |
|:--|:--|
| `tokens.json` | Quelle der Wahrheit im Format des Design-System-Typs: 48 Farben × 5 Themes, Abstände, Radien, Schatten, Schriften, jeweils mit Usage-Notiz |
| `terminal.css` | alle Bausteine (`tm-*`) und die Theme-Strukturen (Kontrast, Control Room, Content) |
| `components/<Name>/` | 11 Komponenten, je `README.md` + `preview.html`, dazu `Cover/` |
| `starter.html` | lauffähiges Gerüst (Theme-Umschalter, Baum, Log, Prompt, Statusleiste), Tokens und CSS eingebettet |
| `build.py`, `build.sh` | validiert, prüft Kontrast, erzeugt `dist/`, trägt CSS in die HTML-Dateien ein |
| `contrast.json` | die geprüften Farbpaare je Theme |
| `test/` | Playwright-Tests für Vorschauen und Starter |

`dist/` ist erzeugt und nicht im Git: `tokens.css`, `dkz-tokens.sh` (24-Bit-Shellfarben), `dkz-themes.kdl` (Zellij), `ghostty/dkz-<theme>`, `herdr/dkz-<theme>.toml`, `bundle.css`.

## Benutzen

```bash
dkz-terminal-style/build.sh           # prüfen, bauen, in nouz-term/index.html und starter.html einfügen
dkz-terminal-style/build.sh --check   # nur prüfen; Exit 1 bei Fehler oder Abweichung (z. B. in CI)
node dkz-terminal-style/test/previews.js   # Bausteine x 5 Themes x 2 Breiten, Cover
node dkz-terminal-style/test/starter.js    # Gerüst: Themes, Befehle, Einschleusung, gesperrtes localStorage
```

Änderungen an Farben gehören in `tokens.json`, nie in die erzeugten Abschnitte der HTML-Dateien (`/* @dkz:tokens:begin */ … end`). Ein eigenes Projekt beginnt mit einer Kopie von `starter.html`. Erlaubte Werte: Hex, `rgb()`/`rgba()`/`hsl()`, Aliase `{name}`; höchstens 8 Themes, Namen eindeutig.

Terminal-Seite: `nouz-term/terminal/install.sh` legt Ghostty-Themes, das Zellij-Theme und das Layout ab (sichert Vorhandenes, ändert keine Haupt-Konfiguration). Die Herdr-Datei trägst du selbst in `~/.config/herdr/config.toml` ein.

## Kontrast

`build.py` rechnet 305 Paare (61 je Theme): Text ≥ 4,5:1, Fokus und Symbole ≥ 3:1, halbtransparente Gründe über ihrem Untergrund. Bestanden: alle. Bewusste Ausnahme in den Token-Notizen: `border-strong` (aus der Demo, unter 3:1; der Fokus wird zusätzlich durch den Ring gezeigt).

## Zuordnung zum Cloud Design System (`odysseus/design`, `--oat-*`)

Nächstliegende Entsprechung, keine Gleichheit: die Werte sind verschieden (z. B. `#00FF41` dort, `#00ff88` im Theme `contrast` hier). `odysseus/design/` bleibt unverändert.

| `--oat-*` | DkZ Terminal Style |
|:--|:--|
| `bg-base` · `bg-sunken` · `bg-surface` · `bg-raised` | `bg` · `bg-sunken` · `bg-card` · `bg-elevated` |
| `bg-hover` · `bg-selected` | `bg-hover` (im Theme `contrast`: Auswahl als invertierte Zeile in `accent`) |
| `fg-primary` · `fg-accent` | `text` · `accent` |
| `fg-muted` · `fg-faint` | `text-muted` · `text-faint` |
| `state-ok` · `state-warn` · `state-error` · `state-info` | `ok` · `warn` · `err` · `info` |
| `border-subtle` · `border-default` · `border-strong` | `border-soft` · `border` · `border-strong` |

## Grenzen

- **Größe:** Der Prototyp `nouz-term/index.html` hält die 18-KB-Regel nicht ein (64,6 KB, gzip 18,2 KB). `starter.html` hat ca. 30 KB.
- **Nicht geprüft:** Ghostty-Schlüssel und -Themes, die Herdr-Zuordnung (Herdr nicht installiert), das Zsh-Widget, Google-Fonts-Darstellung (in den Tests blockiert, Fallback-Schriften) und die Darstellung des Artifacts im claude.ai-Viewer.
