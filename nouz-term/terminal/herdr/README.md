# Herdr in NOUZ-Term

Herdr ist ein Terminal-Workspace-Manager für Coding-Agents (Rust, Apache-2.0, Linux/macOS).
Quellen: [Herdr-Repository](https://github.com/ogulcancelik/herdr) ·
[Konfigurations-Referenz](https://herdr.dev/docs/config-reference/) ·
[Better-Stack-Guide](https://betterstack.com/community/guides/ai/herdr-ai-agent/).
Auf der Maschine, auf der diese Dateien entstanden sind, ist **Herdr nicht installiert**: nichts hier wurde gegen ein echtes Herdr ausgeführt.

## Was verdrahtet ist

| Teil | Datei | Stand |
|:--|:--|:--|
| Theme | `dkz-terminal-style/dist/herdr/dkz-<theme>.toml` (erzeugt von `build.sh` aus `tokens.json`) | Schlüsselnamen aus der Referenz; **die Zuordnung Token → Schlüssel ist eine Auslegung**, die Doku nennt die Namen, nicht die genaue Wirkung. Ungetestet. |
| Status/Agenten | `herd.sh list` / `watch` | reicht `herdr status` und `herdr agent list` **unverändert** durch (je mit Timeout 5 s) |
| Start | `herd.sh tui` | startet `herdr`, mehr nicht |
| Ohne Herdr | `herd.sh list` | Hinweis + die A2A-Inboxen (`odysseus/data/a2a/*.jsonl`), gemessen |

## So nutzt du das Theme

1. `herdr --default-config` zeigt die Standard-Konfiguration; die Datei liegt unter `~/.config/herdr/config.toml`.
2. Den Inhalt von `dist/herdr/dkz-master.toml` (oder einem anderen Theme) dort einfügen. Ein bestehender Abschnitt `[theme.custom]` wird dabei von dir ersetzt, nicht automatisch.
3. `herdr server reload-config` lädt neu.

`install.sh` fasst die Herdr-Konfiguration bewusst **nicht** an.

## Ausstehend

- **Ausgabeform von `herdr agent list`**: in der Doku nicht beschrieben. Deshalb wird sie nicht geparst, und die Agentenansicht der Web-Oberfläche (`nouz-term/index.html`) bekommt davon keine Daten. Sobald die Form bekannt ist, kann `nouz-export.py` sie lesen.
- **Herdr innerhalb von Zellij**: beide sind Terminal-Multiplexer; ob und wie sie ineinander laufen, steht nicht in der Doku und ist nicht getestet. Das Zellij-Layout startet Herdr deshalb nicht selbst.
- **Socket-API** (newline-JSON über einen Unix-Socket) ist dokumentiert, wird hier aber nicht benutzt.
