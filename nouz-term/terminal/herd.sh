#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  DkZ NOUZ-TERM // HERD — Agenten- und Wissensansicht im Terminal   ║
# ╚══════════════════════════════════════════════════════════════════╝
#  herd.sh list        einmal ausgeben          herd.sh watch       alle 5 s neu
#  herd.sh knowledge   Wissensdienste (gemessen) herd.sh tui         Herdr selbst starten
#
#  Mit Herdr:  `herdr status` und `herdr agent list` werden UNVERÄNDERT durchgereicht. Die Ausgabeform von
#              `agent list` ist in der Herdr-Doku nicht beschrieben, deshalb wird sie nicht geparst.
#  Immer:      die A2A-Inboxen (odysseus/data/a2a/*.jsonl), gemessen: Name, Anzahl, letzte Nachricht.
#  Ob Herdr INNERHALB von Zellij läuft, beschreibt die Herdr-Doku nicht; `tui` startet es nur, es testet das nicht.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${NOUZ_REPO:-$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../.." && pwd))}"
G=$'\033[38;5;46m'; DIM=$'\033[38;5;28m'; Y=$'\033[38;5;214m'; N=$'\033[0m'
[ -f "$REPO/dkz-terminal-style/dist/dkz-tokens.sh" ] && . "$REPO/dkz-terminal-style/dist/dkz-tokens.sh" &&
    G="$DKZ_GREEN" DIM="$DKZ_TEXT_MUTED" Y="$DKZ_AMBER" N="$DKZ_RESET"

a2a() {
    python3 -I - "$REPO/odysseus/data/a2a" "$G" "$DIM" "$Y" "$N" <<'PY'
import json, sys
from pathlib import Path
d, G, DIM, Y, N = Path(sys.argv[1]), *sys.argv[2:6]
fs = sorted(d.glob("*.jsonl")) if d.is_dir() else []
if not fs:
    print(f"{DIM}A2A-Inboxen: — ausstehend — (keine Dateien unter odysseus/data/a2a){N}"); sys.exit()
print(f"{G}A2A-Inboxen{N} {DIM}({len(fs)}){N}")
for f in fs:
    msgs = []
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            m = json.loads(line)
            if isinstance(m, dict): msgs.append(m)
        except ValueError:
            pass
    safe = "".join(c if c.isalnum() or c in "_.-" else "-" for c in f.stem)[:32]
    last = msgs[-1] if msgs else None
    tail = f"letzte: {str(last.get('ts',''))[:19]} {str(last.get('from','?'))[:20]}" if last else "leer"
    print(f"  {G if msgs else Y}{'●' if msgs else '○'}{N} {safe:<24} {len(msgs):>3} Nachrichten  {DIM}{tail}{N}")
PY
}

herd_list() {
    if command -v herdr >/dev/null 2>&1; then
        echo -e "${G}herdr status${N}";     timeout 5 herdr status 2>&1 | head -20
        echo; echo -e "${G}herdr agent list${N}"; timeout 5 herdr agent list 2>&1 | head -60
    else
        echo -e "${Y}[nouz]${N} herdr nicht gefunden — Ersatz: nur die A2A-Inboxen. Installation: https://herdr.dev"
    fi
    echo; a2a
}

knowledge() {
    python3 -I "$REPO/odysseus/scripts/nouz-export.py" --repo "$REPO" --stdout --no-probe 2>/dev/null |
    python3 -I -c "$KNOW_PY" "$G" "$DIM" "$Y" "$N" ||
        echo -e "${Y}[nouz]${N} Export nicht möglich (python3 oder git fehlt)"
}
KNOW_PY='
import json, sys
G, DIM, Y, N = sys.argv[1:5]
d = json.load(sys.stdin)
print(G + "Knowledge Services" + N + " " + DIM + "(gemessen; nicht verbunden = — ausstehend —)" + N)
for k in d["knowledge"]:
    ok = k["state"] == "ready"
    mark = "●" if ok else "○"
    detail = k["detail"] or "— ausstehend —"
    print("  " + (G if ok else DIM) + mark + N + " " + str(k["name"]).ljust(10) + " " + str(detail))
'

case "${1:-list}" in
    list)      herd_list;;
    watch)     while true; do clear; herd_list; sleep 5; done;;
    knowledge) knowledge;;
    tui)       command -v herdr >/dev/null 2>&1 || { echo "herdr nicht gefunden — https://herdr.dev" >&2; exit 127; }; exec herdr;;
    -h|--help|help) sed -n '5,12p' "$0";;
    *)         echo "usage: herd.sh [list|watch|knowledge|tui]" >&2; exit 2;;
esac
