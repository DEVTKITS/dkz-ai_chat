#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  DkZ NOUZ-TERM // LAUNCHER                                         ║
# ╚══════════════════════════════════════════════════════════════════╝
#  nouz-term.sh install [opts]   Dateien ablegen (install.sh; --dry-run möglich)
#  nouz-term.sh up               Zellij mit dem Layout nouz-term starten
#  nouz-term.sh palette [opts]   Palette im Terminal (fzf)
#  nouz-term.sh export [opts]    echte Daten nach nouz-term/data.local.js schreiben
#  nouz-term.sh herd [cmd]       list | watch | knowledge | tui
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../.." && pwd))"
cmd="${1:-help}"; [ $# -gt 0 ] && shift
case "$cmd" in
    install) exec "$HERE/install.sh" "$@";;
    up)      command -v zellij >/dev/null 2>&1 || { echo "[nouz] zellij fehlt → $REPO/multiplexer/install.sh" >&2; exit 127; }
             [ -f "${ZELLIJ_CONFIG_DIR:-$HOME/.config/zellij}/layouts/nouz-term.kdl" ] || { echo "[nouz] Layout nicht installiert — erst: $0 install" >&2; exit 1; }
             exec zellij --layout nouz-term "$@";;
    palette) exec "$HERE/palette.sh" "$@";;
    export)  exec python3 -I "$REPO/odysseus/scripts/nouz-export.py" --repo "$REPO" "$@";;
    herd)    exec "$HERE/herd.sh" "$@";;
    help|-h|--help) sed -n '5,9p' "$0";;
    *)       echo "unbekannt: $cmd — $0 help" >&2; exit 2;;
esac
