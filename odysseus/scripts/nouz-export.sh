#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  OPEN AI TERMINAL // NOUZ-EXPORT — echte Daten für NOUZ-Term       ║
# ╚══════════════════════════════════════════════════════════════════╝
#  nouz-export.sh [export]   misst den Ist-Zustand → nouz-term/data.local.js
#  nouz-export.sh url        gibt die Adresse der Oberfläche mit ?live aus
#  Optionen (an export): --repo PFAD · --out DATEI · --a2a-dir PFAD · --no-probe · --stdout
#
#  Nur Messbares wird exportiert, alles andere bleibt „— ausstehend —". Nie exportiert werden
#  Shell-Verlauf, .env, Vault und Dateiinhalte. Öffnen: <nouz-term/index.html>?live
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
command -v python3 >/dev/null 2>&1 || { echo "python3 fehlt" >&2; exit 127; }
case "${1:-export}" in
    export) [ $# -gt 0 ] && shift; exec python3 -I "$DIR/scripts/nouz-export.py" "$@";;
    url)    root="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null || pwd)"
            echo "file://$root/nouz-term/index.html?live";;
    -h|--help|help) sed -n '5,10p' "$0";;
    *)      echo "usage: nouz-export.sh [export|url] [Optionen]" >&2; exit 2;;
esac
