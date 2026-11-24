Die Statusleiste: ein Dienst je Pille mit Kürzel und Zustands-Glyph, rechts die Werkzeugkette und die Version.

**Klassen:** `tm-status`, `tm-pill` (`button`, Zustandsfarbe auf dem Glyph via `tm-s-*`), `tm-push` (rechtsbündig), `tm-ver`.

**Der Verbraucher liefert:** pro Dienst Kürzel, Name und Zustand. Jede Pille trägt ein `aria-label` mit Namen und Zustand (`GitNexus: READY`).

**Regeln**
- Der Glyph zeigt den Zustand (`●` bereit, `◐` aktualisiert, `○` aus), das `aria-label` nennt ihn.
- Ein Klick öffnet die Dienste-Ansicht, er schaltet nichts um.
- Die Version ist `— ausstehend —`, solange keine echte vorliegt. Versionen werden nie erfunden.
