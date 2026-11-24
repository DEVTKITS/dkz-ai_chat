Die Kopfleiste mit Wortmarke, Ansicht-Tabs, Statusangaben und Theme-Wahl.

**Klassen:** `tm-top`, `tm-brand` (`<b>` für den Akzent-Teil), `tm-tabs` + `tm-tab` (aktiv: `aria-selected="true"`), `tm-meta` mit `tm-dot` und `tm-mode`, `tm-themes` + `tm-theme`.

**Der Verbraucher liefert:** Wortmarke, 2–5 Tabs, Statusangaben. Jede `tm-theme`-Schaltfläche trägt `data-theme="<id>"` und zeigt damit ihr eigenes Theme als Farbfeld (zweigeteilt: Grund / Akzent).

**Regeln**
- `role="tablist"` auf `tm-tabs`, `role="tab"` und `aria-selected` auf jedem Tab; Pfeiltasten wechseln.
- Die Wortmarke setzt DKZ in `accent`, den Rest in `text`.
- `tm-mode` nennt die Datenlage: `DEMO-DATEN` oder `LIVE · <Zeitpunkt>`. Beispielwerte nie ohne diese Marke zeigen.
- Theme-Schaltflächen brauchen `aria-label` und `aria-pressed`, das Farbfeld allein sagt es nicht.
