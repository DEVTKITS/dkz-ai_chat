#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  DkZ NOUZ-TERM // INSTALLER — Ghostty-Theme · Zellij-Layout+Theme  ║
# ╚══════════════════════════════════════════════════════════════════╝
#  install.sh [--dry-run] [--zellij-dir D] [--ghostty-dir D]
#
#  Legt Dateien ab, ändert aber KEINE deiner Haupt-Konfigurationen. Was schon da ist und abweicht, wird
#  vorher als <datei>.bak.<zeit> gesichert. Am Ende stehen die wenigen Zeilen, die du selbst einträgst.
#    ~/.config/ghostty/themes/dkz-<theme>       (alle 5 Themes)
#    ~/.config/zellij/themes/dkz.kdl            (Themes dkz-master … dkz-content)
#    ~/.config/zellij/layouts/nouz-term.kdl     (mit eingesetztem Repo-Pfad)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../.." && pwd))"
G='\033[38;5;46m'; DIM='\033[38;5;28m'; Y='\033[38;5;214m'; R='\033[38;5;196m'; N='\033[0m'
say()  { echo -e "${G}[NOUZ]${N} $*"; }
warn() { echo -e "${Y}[NOUZ]${N} $*"; }
die()  { echo -e "${R}[NOUZ] $*${N}" >&2; exit 1; }

DRY=0; ZDIR="${ZELLIJ_CONFIG_DIR:-$HOME/.config/zellij}"; GDIR="${GHOSTTY_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/ghostty}"
while [ $# -gt 0 ]; do case "$1" in
    --dry-run) DRY=1;; --zellij-dir) ZDIR="${2:?}"; shift;; --ghostty-dir) GDIR="${2:?}"; shift;;
    -h|--help) sed -n '5,13p' "$0"; exit 0;; *) die "unbekannte Option: $1";; esac; shift; done

# Der Repo-Pfad landet in KDL-Strings und in bash -lc '…'; diese Zeichen würden sie aufbrechen.
case "$REPO" in *\"*|*\'*|*\\*|*$'\n'*) die "Repo-Pfad enthält \", ' , \\ oder einen Zeilenumbruch: $REPO";; esac

STAMP="$(date +%Y%m%d-%H%M%S)"
put() {  # put <quelle> <ziel>
    local src="$1" dst="$2"
    if [ -f "$dst" ] && cmp -s "$src" "$dst"; then echo -e "  ${DIM}= unverändert  $dst${N}"; return; fi
    if [ "$DRY" = 1 ]; then echo -e "  ${Y}würde schreiben${N} $dst"; return; fi
    mkdir -p "$(dirname "$dst")"
    [ -f "$dst" ] && { cp "$dst" "$dst.bak.$STAMP"; echo -e "  ${DIM}gesichert    $dst.bak.$STAMP${N}"; }
    cp "$src" "$dst"; echo -e "  ${G}✔${N} $dst"
}

# 1) Farben bauen (aus tokens.json)
if [ ! -f "$REPO/dkz-terminal-style/dist/ghostty/dkz-master" ]; then
    command -v python3 >/dev/null 2>&1 || die "python3 fehlt (nötig, um die Themes aus tokens.json zu bauen)"
    "$REPO/dkz-terminal-style/build.sh" >/dev/null || die "dkz-terminal-style/build.sh ist fehlgeschlagen"
fi
DIST="$REPO/dkz-terminal-style/dist"

say "Ziel: Ghostty $GDIR · Zellij $ZDIR$([ "$DRY" = 1 ] && echo '  (Trockenlauf)')"
for f in "$DIST"/ghostty/dkz-*; do put "$f" "$GDIR/themes/$(basename "$f")"; done
put "$DIST/dkz-themes.kdl" "$ZDIR/themes/dkz.kdl"

tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
content="$(<"$HERE/zellij/nouz-term.kdl")"; printf '%s\n' "${content//@REPO@/$REPO}" > "$tmp"
put "$tmp" "$ZDIR/layouts/nouz-term.kdl"

echo
say "Das trägst du selbst ein (nichts davon passiert automatisch):"
echo -e "  ${DIM}Ghostty  ~/.config/ghostty/config   →  Zeilen aus $HERE/ghostty/config.snippet  (mindestens: theme = dkz-master)"
echo -e "  Zellij   ~/.config/zellij/config.kdl →  theme \"dkz-master\""
echo -e "  Zsh      ~/.zshrc                    →  source $HERE/zsh/nouz.zsh      (Palette: Ctrl+X dann p)"
echo -e "  Start    zellij --layout nouz-term   (oder:  $HERE/nouz-term.sh up)${N}"
command -v zellij >/dev/null 2>&1 || warn "zellij fehlt → ../../multiplexer/install.sh"
command -v fzf    >/dev/null 2>&1 || warn "fzf fehlt — die Palette im Terminal (palette.sh) braucht es; --list geht ohne"
command -v herdr  >/dev/null 2>&1 || warn "herdr fehlt — siehe nouz-term/terminal/herdr/README.md"
