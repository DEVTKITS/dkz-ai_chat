#!/usr/bin/env python3
"""DkZ Terminal Style — Generator.

tokens.json (Format des Design-System-Typs)  ──►  dist/tokens.css
                                             ──►  dist/dkz-tokens.sh      Shell (24-Bit, Theme master)
                                             ──►  dist/dkz-themes.kdl     Zellij, alle Themes
                                             ──►  dist/ghostty/dkz-<theme> Ghostty, je Theme
                                             ──►  dist/bundle.css          = terminal.css (für das Artifact)
und trägt tokens.css + terminal.css zwischen Markern in die HTML-Dateien ein:
    /* @dkz:tokens:begin */ … /* @dkz:tokens:end */
    /* @dkz:terminal:begin */ … /* @dkz:terminal:end */

  build.py            validieren, Kontrast prüfen, bauen, einfügen
  build.py --check    nur prüfen (kein Schreiben); Exit 1 bei Fehler oder Abweichung
Nur Python-Standardbibliothek."""
import json, re, sys, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DIST = HERE / "dist"
TARGETS = [REPO / "nouz-term" / "index.html", HERE / "starter.html"]
G, R, Y, D, N = "\033[38;5;46m", "\033[38;5;196m", "\033[38;5;214m", "\033[38;5;28m", "\033[0m"
errors, warnings = [], []

def err(m): errors.append(m)
def warn(m): warnings.append(m)

# ── Farben ─────────────────────────────────────────────────────────────
HEX = re.compile(r"^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
FUNC = re.compile(r"^(rgba?|hsla?)\(\s*[-0-9.%\s,/]+\)$")
ALIAS = re.compile(r"^\{([A-Za-z0-9][A-Za-z0-9_.-]*)\}$")
NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")

def parse_color(s):
    """-> (r,g,b,a) mit r,g,b 0..255, a 0..1; None bei Alias/ungültig."""
    s = s.strip()
    m = HEX.match(s)
    if m:
        h = m.group(1)
        if len(h) in (3, 4): h = "".join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    m = re.match(r"^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$", s)
    if m:
        r, g, b = (float(m.group(i)) for i in (1, 2, 3))
        return r, g, b, float(m.group(4)) if m.group(4) is not None else 1.0
    return None

def over(fg, bg):
    r, g, b, a = fg
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3)) + (1.0,)

def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def hex_of(c):
    return "#%02x%02x%02x" % tuple(round(max(0, min(255, v))) for v in c[:3])

# ── Laden + Validieren (Regeln aus format.md des Design-System-Typs) ────
def load():
    tokens = json.loads((HERE / "tokens.json").read_text(encoding="utf-8"))
    themes = [t["id"] for t in tokens["color"]["themes"]]
    if not 1 <= len(themes) <= 8: err("themes: 1 bis 8 erlaubt")
    seen, cols = set(), {}
    for t in tokens["color"]["tokens"]:
        n = t["name"]
        if not NAME.match(n): err(f"Name ungültig: {n}")
        if n in seen: err(f"Name doppelt: {n}")
        seen.add(n)
        if not t.get("usage"): err(f"{n}: Usage-Notiz fehlt")
        v = t["value"]
        per = v if isinstance(v, dict) else {themes[0]: v}
        if themes[0] not in per: err(f"{n}: Wert für Primär-Theme {themes[0]} fehlt")
        for th, val in per.items():
            if th not in themes: err(f"{n}: unbekanntes Theme {th}")
            ok = ALIAS.match(val) or HEX.match(val) or FUNC.match(val)
            if not ok or re.search(r"var\(|color-mix|transparent|currentColor", val): err(f"{n}/{th}: Farbwert ungültig: {val}")
        cols[n] = per
    for t in tokens["color"]["tokens"]:
        for val in (t["value"].values() if isinstance(t["value"], dict) else [t["value"]]):
            m = ALIAS.match(val)
            if m and m.group(1) not in cols: err(f"{t['name']}: Alias auf fehlenden Token {m.group(1)}")
    for fam in ("spacing", "radius", "shadow"):
        for t in tokens.get(fam, {}).get("tokens", []):
            if not NAME.match(t["name"]) or t["name"] in seen: err(f"{fam}: Name ungültig/doppelt: {t['name']}")
            seen.add(t["name"])
    if len(cols) > 600: err("mehr als 600 Farben")
    return tokens, themes, cols

def resolve(cols, themes, name, theme, depth=0):
    """Wert eines Tokens in einem Theme; Aliase aufgelöst; fehlendes Theme erbt das erste."""
    per = cols[name]
    val = per.get(theme, per[themes[0]])
    m = ALIAS.match(val)
    if m:
        if depth > 16: err(f"Alias-Kette zu tief: {name}")
        return resolve(cols, themes, m.group(1), theme, depth + 1)
    return val

# ── Kontrast ───────────────────────────────────────────────────────────
UNDER = {"panel-top": "bg", "panel-bottom": "bg", "chip-agent-bg": "panel-top", "bg-hover": "panel-top",
         "chip-accent-bg": "bg", "glass": "bg", "tab-on-bg": "bg"}

def flat(cols, themes, name, theme, ground=None):
    c = parse_color(resolve(cols, themes, name, theme))
    if c is None: err(f"{name}/{theme}: nicht lesbar"); return (0, 0, 0, 1.0)
    if c[3] < 1:
        under = ground if ground else flat(cols, themes, UNDER.get(name, "bg"), theme)
        c = over(c, under)
    return c

def check_contrast(cols, themes):
    spec = json.loads((HERE / "contrast.json").read_text(encoding="utf-8"))
    allow = {tuple(a["pair"]) + (a["theme"],): a["why"] for a in spec.get("allow", [])}
    fails, allowed, checked = [], [], 0
    for th in themes:
        for fg, bg, need in spec["pairs"]:
            ground = flat(cols, themes, bg, th)
            c = flat(cols, themes, fg, th, ground)
            r = ratio(c, ground); checked += 1
            if r + 1e-9 < need:
                key = (fg, bg, th)
                (allowed if key in allow else fails).append((th, fg, bg, r, need, allow.get(key)))
    return checked, fails, allowed

# ── Ausgaben ───────────────────────────────────────────────────────────
def css_block(cols, themes, theme, first):
    lines = []
    for name, per in cols.items():
        if isinstance(per.get(theme), str) and (first or theme in per):
            lines.append(f"--{name}:{per[theme]}")
    return lines

def build_tokens_css(tokens, themes, cols):
    first = themes[0]
    out = ["/* DkZ Terminal Style — generated from tokens.json */"]
    base = css_block(cols, themes, first, True)
    base += [f"--{n}:{ALIAS.sub(lambda m: 'var(--' + m.group(1) + ')', per[first])}" for n, per in cols.items() if ALIAS.match(per[first]) and f"--{n}:{per[first]}" not in base]
    base = [re.sub(r"\{([^}]+)\}", r"var(--\1)", b) for b in base]
    sh = [f"--{t['name']}:{t['value'][first]}" for t in tokens["shadow"]["tokens"]]
    out.append(f':root,[data-theme="{first}"]{{' + ";".join(base + sh) + "}")
    for th in themes[1:]:
        rows = [f"--{n}:{per[th]}" for n, per in cols.items() if th in per]
        rows += [f"--{t['name']}:{t['value'][th]}" for t in tokens["shadow"]["tokens"] if th in t["value"]]
        out.append(f'[data-theme="{th}"]{{' + ";".join(rows) + "}")
    fam = tokens["type"]["families"]
    root = [f"--{t['name']}:{t['value']}" for f in ("spacing", "radius") for t in tokens[f]["tokens"]]
    root += [f"--font-{k}:{v}" for k, v in fam.items()]
    out.append(":root{" + ";".join(root) + "}")
    return "\n".join(out) + "\n"

ANSI = [("black", "bg-sunken"), ("red", "accent"), ("green", "green"), ("yellow", "amber"), ("blue", "lila"),
        ("magenta", "chip-accent-fg"), ("cyan", "cyan"), ("white", "text-dim"),
        ("bright-black", "text-faint"), ("bright-red", "accent-hover"), ("bright-green", "green"),
        ("bright-yellow", "amber"), ("bright-blue", "chip-agent-fg"), ("bright-magenta", "chip-accent-fg"),
        ("bright-cyan", "cyan"), ("bright-white", "text-strong")]

def opaque(cols, themes, name, theme):
    return hex_of(flat(cols, themes, name, theme))

def build_shell(cols, themes):
    t = themes[0]
    out = ["#!/usr/bin/env bash", f"# DkZ Terminal Style — Terminalfarben (Theme {t}), generated from tokens.json.",
           "# Einbinden:  . dkz-terminal-style/dist/dkz-tokens.sh", "DKZ_RESET=$'\\033[0m'"]
    for name in cols:
        h = opaque(cols, themes, name, t)
        r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
        var = "DKZ_" + re.sub(r"[^A-Z0-9]", "_", name.upper())
        out.append(f"{var}=$'\\033[38;2;{r};{g};{b}m'; {var}_HEX='{h}'")
    return "\n".join(out) + "\n"

def build_kdl(cols, themes):
    out = ["// DkZ Terminal Style — Zellij-Themes, generated from tokens.json.",
           "// Einbinden: Datei nach ~/.config/zellij/themes/ und in der config.kdl:  theme \"dkz-master\"", "themes {"]
    m = {"fg": "text", "bg": "bg", "black": "bg-sunken", "red": "accent", "green": "green", "yellow": "amber",
         "blue": "lila", "magenta": "chip-accent-fg", "orange": "accent-hover", "cyan": "cyan", "white": "text-dim"}
    for th in themes:
        out.append(f"    dkz-{th} {{")
        for k, tok in m.items():
            out.append(f'        {k} "{opaque(cols, themes, tok, th)}"')
        out.append("    }")
    out.append("}")
    return "\n".join(out) + "\n"

def build_ghostty(cols, themes, theme):
    o = lambda n: opaque(cols, themes, n, theme)
    out = [f"# DkZ Terminal Style — Ghostty-Theme {theme}, generated from tokens.json.",
           "# Ablage: ~/.config/ghostty/themes/dkz-" + theme + "   ·   in der config:  theme = dkz-" + theme,
           f"background = {o('bg')}", f"foreground = {o('text')}", f"cursor-color = {o('accent')}",
           f"cursor-text = {o('on-accent')}", f"selection-background = {o('bg-hover')}",
           f"selection-foreground = {o('text-strong')}"]
    out += [f"palette = {i}={o(tok)}" for i, (_, tok) in enumerate(ANSI)]
    return "\n".join(out) + "\n"

# ── In HTML einfügen ───────────────────────────────────────────────────
def inject(text, key, body):
    pat = re.compile(r"(/\* @dkz:%s:begin \*/)(.*?)(/\* @dkz:%s:end \*/)" % (key, key), re.S)
    if not pat.search(text): return None
    return pat.sub(lambda m: m.group(1) + "\n" + body.rstrip("\n") + "\n" + m.group(3), text, count=1)

def main():
    check = "--check" in sys.argv
    tokens, themes, cols = load()
    checked, fails, allowed = check_contrast(cols, themes)
    tcss = build_tokens_css(tokens, themes, cols)
    term = (HERE / "terminal.css")
    termcss = term.read_text(encoding="utf-8") if term.exists() else None
    if termcss is None: warn("terminal.css fehlt")
    # Drift prüfen bzw. einfügen
    drift = []
    for tgt in TARGETS:
        if not tgt.exists(): warn(f"{tgt.relative_to(REPO)} existiert noch nicht"); continue
        txt = tgt.read_text(encoding="utf-8"); new = txt
        for key, body in (("tokens", tcss), ("terminal", termcss)):
            if body is None: continue
            r = inject(new, key, body)
            if r is None: warn(f"{tgt.relative_to(REPO)}: Marker '{key}' fehlt"); continue
            new = r
        if new != txt:
            if check: drift.append(str(tgt.relative_to(REPO)))
            else: tgt.write_text(new, encoding="utf-8")
    if not check and not errors:
        DIST.mkdir(exist_ok=True); (DIST / "ghostty").mkdir(exist_ok=True)
        (DIST / "tokens.css").write_text(tcss, encoding="utf-8")
        (DIST / "dkz-tokens.sh").write_text(build_shell(cols, themes), encoding="utf-8")
        (DIST / "dkz-themes.kdl").write_text(build_kdl(cols, themes), encoding="utf-8")
        for th in themes: (DIST / "ghostty" / f"dkz-{th}").write_text(build_ghostty(cols, themes, th), encoding="utf-8")
        if termcss is not None: shutil.copyfile(term, DIST / "bundle.css")
    # Bericht
    print(f"{G}[DKZ-STYLE]{N} {len(cols)} Farb-Tokens x {len(themes)} Themes, {len(tokens['spacing']['tokens'])} Abstände, "
          f"{len(tokens['radius']['tokens'])} Radien, {len(tokens['shadow']['tokens'])} Schatten")
    print(f"{G}[DKZ-STYLE]{N} Kontrast: {checked} Paare geprüft, {len(fails)} durchgefallen, {len(allowed)} dokumentiert zugelassen")
    for th, fg, bg, r, need, why in allowed: print(f"  {Y}~{N} {th:<8} {fg} auf {bg}: {r:.2f}:1 (nötig {need}) — {why}")
    for th, fg, bg, r, need, _ in fails: err(f"Kontrast {th}: {fg} auf {bg} = {r:.2f}:1, nötig {need}")
    for d in drift: err(f"Abweichung: {d} enthält veraltete Tokens/Bausteine — build.py ohne --check ausführen")
    for w in warnings: print(f"  {Y}!{N} {w}")
    for e in errors: print(f"  {R}✖ {e}{N}")
    if errors: sys.exit(1)
    print(f"{G}[DKZ-STYLE]{N} {'Check bestanden.' if check else 'gebaut → dist/ und HTML-Marker aktualisiert.'}")

if __name__ == "__main__":
    main()
