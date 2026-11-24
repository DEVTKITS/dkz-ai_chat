#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  DkZ NOUZ-TERM // PALETTE — die Terminal-Entsprechung von Ctrl+P   ║
# ╚══════════════════════════════════════════════════════════════════╝
#  palette.sh            fzf-Palette über alle Quellen; gibt die Auswahl aus (zum Einfügen in die Zeile)
#  palette.sh --list     die Einträge ohne fzf ausgeben (TYP⇥TEXT⇥QUELLE⇥AKTION)
#  palette.sh --run      Auswahl direkt ausführen, wo das sicher ist (nur Zellij-Tabwechsel)
#
#  Quellen (jede nur, wenn vorhanden): Dateien (git ls-files) · Verlauf (Atuin, sonst die letzten 300 Zeilen
#  der eigenen History-Datei) · Befehle (Kopf von odysseus/bin/odysseus) · Agenten (A2A-Inboxen) · Tabs (in Zellij).
#  Der Verlauf wird nur lokal angezeigt und nirgends hin geschrieben oder exportiert.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${NOUZ_REPO:-$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null || pwd)}"
T=$'\t'
tab() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4"; }   # Tabs und Zeilenumbrüche im Text sind hier nicht vorgesehen

entries() {
    local f
    # Dateien
    git -C "$REPO" ls-files 2>/dev/null | head -400 | while IFS= read -r f; do tab FILE "$f" Superfile "file:$f"; done
    # Verlauf
    if command -v atuin >/dev/null 2>&1; then
        atuin history list --cmd-only --limit 300 2>/dev/null | tr -d '\t' | while IFS= read -r f; do [ -n "$f" ] && tab HISTORY "$f" Atuin "cmd:$f"; done
    else
        local h="${HISTFILE:-}"; [ -r "$h" ] || h="$HOME/.zsh_history"; [ -r "$h" ] || h="$HOME/.bash_history"
        [ -r "$h" ] && tail -n 300 "$h" 2>/dev/null | sed -E 's/^: [0-9]+:[0-9]+;//' | tr -d '\t' | awk 'NF && !seen[$0]++' | while IFS= read -r f; do tab HISTORY "$f" history "cmd:$f"; done
    fi
    # Befehle aus dem Kopf des Launchers
    sed -n '1,40p' "$REPO/odysseus/bin/odysseus" 2>/dev/null | sed -nE 's/^#[[:space:]]{2,}(odysseus [^ ]+( [^ ]+)?)[[:space:]]{2,}[^ ].*/\1/p' | tr '|' '\n' | sed -E 's/\.\.\.$//; s/[[:space:]]+$//; s/^odysseus //; s/^/odysseus /' | awk '!seen[$0]++' | while IFS= read -r f; do tab COMMAND "$f" odysseus "cmd:$f"; done
    # Agenten aus den A2A-Inboxen
    for f in "$REPO"/odysseus/data/a2a/*.jsonl; do [ -e "$f" ] || continue; f="$(basename "$f" .jsonl)"; tab AGENT "@${f//[^A-Za-z0-9_.-]/-}" Herdr "agent:@${f//[^A-Za-z0-9_.-]/-}"; done
    # Tabs (nur innerhalb von Zellij sinnvoll)
    if [ -n "${ZELLIJ:-}" ]; then for f in HERD FILES KNOWLEDGE SERVICES; do tab VIEW "$f" Zellij "view:$f"; done; fi
}

pick() {
    local colors=()
    [ -f "$REPO/dkz-terminal-style/dist/dkz-tokens.sh" ] && . "$REPO/dkz-terminal-style/dist/dkz-tokens.sh" &&
        colors=(--color "bg:${DKZ_BG_HEX},fg:${DKZ_TEXT_HEX},hl:${DKZ_ACCENT_HEX},bg+:${DKZ_BG_HOVER_HEX},fg+:${DKZ_TEXT_STRONG_HEX},hl+:${DKZ_ACCENT_HEX},prompt:${DKZ_ACCENT_HEX},pointer:${DKZ_ACCENT_HEX},info:${DKZ_TEXT_MUTED_HEX},border:${DKZ_BORDER_HEX}")
    fzf --delimiter="$T" --with-nth=1,2,3 --prompt='❯ ' --height=60% --reverse --border --no-sort "${colors[@]}"
}

case "${1:-}" in
    --list) entries;;
    -h|--help) sed -n '5,11p' "$0";;
    ""|--run)
        command -v fzf >/dev/null 2>&1 || { echo "[nouz] fzf fehlt — Einträge ohne Auswahl: $0 --list" >&2; exit 127; }
        sel="$(entries | pick)" || exit 1
        act="$(printf '%s' "$sel" | cut -f4)"
        case "$act" in
            view:*) if [ "${1:-}" = "--run" ] && [ -n "${ZELLIJ:-}" ]; then zellij action go-to-tab-name "${act#view:}"; else printf '%s\n' "${act#view:}"; fi;;
            file:*|cmd:*|agent:*) printf '%s\n' "${act#*:}";;
        esac;;
    *) echo "usage: palette.sh [--list|--run]" >&2; exit 2;;
esac
