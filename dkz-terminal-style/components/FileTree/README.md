Der Dateibaum: Verzeichnisse und Dateien als Tastatur-bedienbare Zeilen, mit Auswahl und Worktree-Liste.

**Klassen:** `tm-tree` (Container), `tm-leaf` (`button`; Einrückung über `style="--d:<Tiefe>"`), `tm-glyph` (`▾ ▸ ▫ ⑂`, aria-hidden), `tm-name`, `tm-sub` (Zwischenüberschrift).

**Der Verbraucher liefert:** Einträge mit Name, Typ und Tiefe. Die ausgewählte Zeile trägt `aria-current="true"` (Kante in `accent`), Verzeichnisse `aria-expanded`.

**Regeln**
- Glyphen statt Emoji: `▸` zu, `▾` offen, `▫` Datei, `⑂` Worktree.
- Jede Zeile ist ein `button`, nie ein `div` mit Klick-Handler.
- Lange Namen werden mit Auslassung gekürzt, nie umgebrochen.
- Auf Touch-Geräten wächst die Zeilenhöhe automatisch (`pointer:coarse`).
