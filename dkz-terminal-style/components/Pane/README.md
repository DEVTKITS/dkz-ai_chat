Die Grundkachel eines Terminal-Bildschirms: Rahmen, Kerbe oben, Titelzeile und ein scrollbarer Inhalt.

**Klassen:** `tm-panel` (Kachel), `tm-title` (Titelzeile, `h2`), `tm-tag` (rechtsbündiges Kürzel, Farbe `ok`), `tm-scroll` (Inhalt, scrollt, `flex:1`).

**Der Verbraucher liefert:** Titeltext, optional ein Kürzel (`LIVE`, `SYNC`) und den Inhalt. Ein Pane hat genau einen Zweck.

**Regeln**
- Titel in Klartext schreiben, die Großbuchstaben setzt das CSS.
- Panes liegen im Raster nebeneinander und verschachteln sich nie.
- Das Kürzel zeigt einen Zustand (`LIVE`), keinen Namen.
- Die Kerbe verschwindet in `contrast` und `control` (`--notch:none`), dort trägt der Rahmen allein.
- Leere Panes zeigen `— ausstehend —` in `text-faint`, nie einen leeren Kasten.
