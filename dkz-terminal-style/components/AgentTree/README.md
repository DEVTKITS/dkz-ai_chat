Der Herd: Agenten als Baum, jeder mit Zustand in Wort und Glyph und optionaler Ungelesen-Marke.

**Klassen:** `tm-herd`, `tm-agent` (`button`, aktiv: `aria-current="true"`, Kante in `agent`), `tm-state` mit `tm-s-ok|warn|faint|err`, `tm-new` (`◆`, neue Ausgabe).

**Zustände:** `RUNNING`, `WORKING`, `INDEXING` (`●`, `ok`), `WAITING` (`◐`, `warn`), `DONE` (`○`, `faint`), `ERROR` (`✖`, `err`).

**Der Verbraucher liefert:** Agenten mit Name, Eltern-Bezug und Zustand. Die Linien (`├─ └─ │`) entstehen aus dem Baum, nicht von Hand.

**Regeln**
- Zustand immer als **Wort plus Glyph**, die Farbe allein genügt nicht.
- `lila` (Token `agent`) ist die Kategorie-Farbe für Agenten und niemals ein Akzent.
- Eine Ungelesen-Marke verschwindet, sobald der Agent fokussiert wird.
