Die Befehlspalette (Ctrl+P): ein Suchfeld und eine Trefferliste über alle Quellen, Treffer-Buchstaben hervorgehoben.

**Klassen:** `tm-pal` (Overlay, offen: `is-open`), `tm-pal-card`, `tm-pal-in` (`role="combobox"`), `tm-pal-list` (`role="listbox"`), `tm-res` (`role="option"`, gewählt: `aria-selected="true"`), `tm-type`, `tm-src`, `mark` für Treffer.

**Der Verbraucher liefert:** Einträge mit Typ (`FILE`, `AGENT`, `SYMBOL`, `HISTORY`, `COMMAND`, `WIKI`, `VIEW`, `THEME`), Text, Quelle und Aktion.

**Regeln**
- Beim Öffnen die Seite hinter dem Overlay mit `inert` sperren (Fokusfalle) und beim Schließen den Fokus zurückgeben.
- ↑/↓ wählen, Enter führt aus, Esc schließt; `aria-activedescendant` zeigt die Wahl.
- Textübereinstimmungen stehen vor Typ- oder Quellen-Übereinstimmungen.
- Die Hervorhebung nutzt `accent` auf `bg-hover` mit 4,5:1 in jedem Theme.
