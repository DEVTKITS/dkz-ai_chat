# DkZ NOUZ-Term — Zsh-Widget für die Palette. Opt-in: nichts wird automatisch eingetragen.
#   In ~/.zshrc:   source <repo>/nouz-term/terminal/zsh/nouz.zsh
# Standard-Taste: Ctrl+X dann p. Ctrl+P ist in Zsh „Zeile hoch", deshalb wird sie hier NICHT belegt;
# wer sie trotzdem will:  bindkey '^P' nouz-palette
_nouz_dir="${${(%):-%x}:A:h}"
nouz-palette() {
  local pick
  pick="$("$_nouz_dir/../palette.sh")" || { zle redisplay; return }
  LBUFFER+="$pick"
  zle redisplay
}
zle -N nouz-palette
bindkey '^Xp' nouz-palette
