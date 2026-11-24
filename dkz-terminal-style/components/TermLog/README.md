Der Terminal-Bereich: Breadcrumb und Herd-Marke im Kopf, darunter der Ausgabestrom, in dem jede Zeile aus farbigen Abschnitten besteht.

**Klassen:** `tm-term-head`, `tm-crumb`, `tm-badge`, `tm-term-body`, `tm-log` (`role="log"`, `aria-live="polite"`), Farbklassen `tm-c-ok|warn|info|agent|err|muted|strong`.

**Farben:** `ok` bestanden, `warn` Achtung, `info` Kontext und Pfade, `agent` Agent und Subterminal, `err` Fehler, `muted` Labels in eckigen Klammern (`[atuin]`).

**Der Verbraucher liefert:** Zeilen als Liste von Abschnitten (Klasse + Text). Text geht ausschließlich über `textContent` hinein, nie über `innerHTML`.

**Regeln**
- Jeder Strom gehört einem Agenten; beim Wechsel wird der Inhalt ersetzt, nicht angehängt.
- Simuliertes ist als `[demo]` oder `[hinweis] Simulation` zu kennzeichnen.
- Eine Zeile umbricht (`pre-wrap`), Pfade ebenso (`overflow-wrap:anywhere`).
