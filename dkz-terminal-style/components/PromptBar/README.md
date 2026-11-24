Die Eingabezeile: darüber eine Kontextzeile, die beim Ergänzen mit Tab zu den Kandidaten wird.

**Klassen:** `tm-input`, `tm-suggest` (Label `<b>` + Text), `tm-prompt` (Rahmen, Fokus-Ring), `tm-p` (`❯`, aria-hidden), `tm-cmd` (`input`).

**Präfixe:** `@agent <task>` routet, `#suche` fragt Wissen, `/datei` wählt, `?navi` sucht Vorlagen. Ohne Präfix: Shell oder Befehl.

**Der Verbraucher liefert:** den Kontext (`datei · Herd/agent · …`) und die Kandidatenliste für Tab.

**Regeln**
- Das Eingabefeld hat ein verstecktes Label (`tm-sr`), der Platzhalter ersetzt es nicht.
- Beim Fokus zeigt `focus` einen Ring von 2 px, mindestens 3:1 auf `bg` und `bg-card`.
- ↑/↓ blättern den Verlauf, Tab ergänzt, Esc leert.
