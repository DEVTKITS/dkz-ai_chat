Die Dienste-Tabelle: alle Werkzeuge der Kette mit Zustand, Detail und Kürzel.

**Klassen:** `tm-table` in einem `tm-scroll`-Container, `th` mit `scope="col"`, Zustandsfarbe über `tm-s-*`, Hervorhebung einer Zeile mit `is-flash`.

**Der Verbraucher liefert:** Zeilen mit Name, Zustand, Detail, Kürzel.

**Regeln**
- Die Tabelle liegt immer in einem Container mit `overflow:auto`, damit sie auf dem Handy seitlich scrollt statt die Seite zu verbreitern.
- Die Zustandsspalte zeigt Glyph und Wort.
- Fehlende Werte stehen als `— ausstehend —` in `text-faint`.
