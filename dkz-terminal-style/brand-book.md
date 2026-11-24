Ein Style-System für Terminal-Oberflächen im DEVKiTZ-Umfeld: Ghostty als Fenster, Zellij als Raster, Herdr für Agenten, dazu Dateibaum, Wissensansicht und Befehlspalette. Dieselben Token färben die Web-Oberfläche, die Zellij- und Ghostty-Themes, die Herdr-Konfiguration und die Shell-Ausgabe.

## Verwendung

- Lade `tokens.css` und `components/bundle.css`; setze `data-theme` auf `<html>`. Schreibe keine Hex-Werte in Komponentenregeln, nur `var(--…)`.
- Setze Fließtext und Terminalausgabe in `text` auf `bg`, `panel-top`, `bg-card`, `bg-input`, `bg-sunken` und `bg-overlay`. Sekundärtext ist `text-dim`, Labels und Metazeilen sind `text-muted`, Erledigtes und Platzhalter sind `text-faint`. Hervorgehobenes steht in `text-strong`.
- `accent` ist die Marken- und Signalfarbe: Prompt-Zeichen, Marke, Fokusring. Es füllt höchstens 10 % einer Ansicht. Text auf vollflächigem `accent` ist `on-accent`.
- Zustände heißen `ok` (läuft, online), `warn` (wartet), `info` (Hinweis), `err` (Fehler, offline) und `agent` (Agent, Subterminal, Wissen). Gib jeden Zustand zusätzlich als Wort oder Glyphe aus (`● RUNNING`, `◐ WAITING`, `○ OFFLINE`, `✖ ERROR`), nie nur als Farbe.
- `lila` ist reine Kategorie-Farbe für Agenten und Wissen, nie ein Akzent und nie eine Fläche.
- Der Fokus ist immer der 2-px-Ring in `focus` mit 2 px Abstand; er liegt mit mindestens 3:1 auf `bg` und `bg-card`. Entferne `outline` nie ohne Ersatz.
- Panels haben `panel-top`/`panel-bottom` als Verlauf, `border` als Rahmen und `border-soft` als Trenner unter dem Titel. Eingabefelder rahmt `border-strong`.
- Abstände kommen aus `space-xs` … `space-2xl` (4 bis 32 px), Rundungen aus `radius`, `radius-sm`, `radius-pill`. Auf 320 px Breite bleibt ein Seitenrand von 16 px (`space-lg`).
- Unbekannte Werte erscheinen als `— ausstehend —`. Erfinde keine Zahlen, Versionen oder Zustände; ein Beispielwert in einem Entwurf ist als solcher gekennzeichnet.
- Baue Oberflächen mit DOM-APIs oder `textContent`. Nutze kein `innerHTML` mit fremden Daten; wo Markup-Strings unvermeidbar sind, läuft jeder Wert durch `esc()`.
- Hänge nichts Externes an außer Google Fonts, und gib jeder Schrift einen Fallback-Stack (`font-main`, `font-mono`, `font-display`).

## Inhaltliche Grundsätze

- **Ton:** knapp, technisch, im Terminal-Duktus. Befehle und Pfade stehen in `mono`, Sätze in der Du-Form. Beispiele aus dem Prototyp: „Zum Prompt springen“, „Befehl“, „fzf-Palette: Dateien, Verlauf, Navi, NOUZ, Agenten, Symbole …“.
- **Schreibweise:** Bereichsnamen in Versalien (`HERD`, `FILES`, `KNOWLEDGE`, `SERVICES`), Zustände in Versalien mit Glyphe, alles andere normal. Sonderzeichen wie `❯` markieren den Prompt.
- **Keine Emoji.** Symbole sind Glyphen: `▸` `▾` Ordner zu/offen, `▫` Datei, `⑂` Worktree, `●` `◐` `○` `✖` Zustand, `❯` Prompt.
- **Wahrheit vor Schönheit:** ein Zähler ohne Quelle bleibt `— ausstehend —`. Anbindungen, die nicht laufen (GitNexus, Graphify, NOUZ), zeigen „nicht verbunden“, keine Zahl.

## Visuelle Grundlagen

- **Farbe:** dunkler Grund (`bg`, `bg-deep`), ein roter Akzent, vier Statusfarben, `lila` für Agenten. Das Master-Theme gibt den Look der ursprünglichen Demo wieder; die Seite liegt auf einem Verlauf aus `bg-glow`, `bg-mid` und `bg-deep` mit einem 24-px-Raster in `grid-line`.
- **Schrift:** `font-mono` (JetBrains Mono) für Terminal, Dateien, Zahlen und Labels; `font-main` (Inter) für Marke und Fließtext; `font-display` (Archivo) für das Control-Room-Theme. Stile: `term`, `label`, `ui`, `body`, `brand`.
- **Flächen:** Panels mit 13-px-Rundung (`radius`), eine kleine Kerbe oben, `shadow-pane`; die Befehlspalette liegt auf `scrim` mit `shadow-pop`. Topbar und Statusleiste sind `glass` mit 8-px-Weichzeichner.
- **Bewegung:** keine. Das System hat weder Übergänge noch Animationen; die Regel `prefers-reduced-motion` schaltet beides ab, falls ein Projekt welche ergänzt.
- **Raster:** drei Spalten ab 1050 px, zwei von 640 bis 1049 px, eine darunter; die vier Top-Tabs schalten dort die Ansicht um.
- **Zustände:** Hover und Fokus nutzen `bg-hover`; der aktive Tab hat `tab-on-bg`, `tab-on-bd`, `tab-on-fg`.

## Ikonografie

Es gibt kein Icon-Set und keine Bilder. Alles Symbolische ist Text-Glyphe in `mono` oder eine kleine Inline-SVG-Form (Graphknoten, Verbindungen) in Token-Farben. Eine Glyphe trägt nie allein eine Information; ihr Zustand steht zusätzlich als Wort.

## Themes

| `data-theme` | Name | Charakter |
| --- | --- | --- |
| `master` | Master Neonrot | Look der Demo: dunkel, Rot `accent`, 13-px-Rundungen. Standard. |
| `light` | Hell | Grund `bg` #f6f6f7, Text #0e0e10. `accent` ist auf #c8103a abgedunkelt, damit er auf hellem Grund Kontrast hält. |
| `contrast` | Kontrast (Neo-Matrix) | Nur Schwarz und Matrix-Grün (#00ff88); Rundungen 0, Mono als Hauptschrift, Auswahl als invertierte Zeile. Entspricht dem Look von OPEN AI TERMINAL. |
| `control` | Control Room | Fasen-Ecken per `clip-path`, Archivo in Versalien, Scanlines über Panels. |
| `content` | Content | Syne und Space Mono, Pillen-Formen, 18-px-Rundung. `accent` ist auf #ff3366 aufgehellt. |

Der Generator `build.py` prüft jedes Paar aus den Textgründen der Usage-Notizen je Theme: 305 Paare, alle bestanden (Text ≥ 4,5:1; Fokus und Symbole ≥ 3:1; halbtransparente Gründe werden über ihren Untergrund gerechnet).

## Bewusste Abweichungen

- `border-strong` stammt aus der Demo und liegt unter 3:1 auf `bg`. Der Fokus wird deshalb zusätzlich durch den `accent`-Ring gezeigt; der Wert bleibt exakt.
- Die Beispielzahlen in den Component-Previews (Symbole, Knoten, Shells) sind Muster aus der Demo, keine Messwerte.
- Die 18-KB-Regel für Vanilla-UIs hält der Prototyp nicht ein: 64,6 KB ungepackt, 18,2 KB gzip, davon ca. 33 KB JavaScript. Das Gerüst `Templates/terminal-starter.html` ist mit ca. 30 KB deutlich kleiner, enthält aber bereits alle Themes.
- Die Rundung von 13 px weicht von der DkZ-Linie „0–4 px mit Fase“ ab. Diese Linie liegt im Theme `control`.

## Dateien

- `tokens.json` ist die einzige Quelle für Farben, Abstände, Radien, Schatten und Schriften. Das Repo erzeugt daraus `tokens.css`, `dkz-tokens.sh` (24-Bit-Shellfarben), `dkz-themes.kdl` (Zellij), die Ghostty-Themes `dkz-<theme>` und die Herdr-Konfiguration `dkz-<theme>.toml`.
- `components/bundle.css` enthält alle Bausteine (`tm-*`); jede Komponente hat Guidelines und eine Vorschau.
- `Templates/terminal-starter.html` ist ein lauffähiges Gerüst mit Theme-Umschalter, Dateibaum, Terminalausgabe, Prompt und Statusleiste.
