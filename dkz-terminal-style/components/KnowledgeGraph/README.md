Der Wissensgraph: der aktuelle Kontext in der Mitte, die angebundenen Dienste ringsum, Treffer einer Suche hervorgehoben.

**Klassen:** `tm-graph` (SVG, `viewBox` in echten Pixeln), `tm-gedge` (Linie), `tm-gnode` (`g` mit `rect` und `text`), `is-hit` für Treffer.

**Layout:** Kontext-Knoten mittig, die übrigen gleichmäßig auf einer Ellipse. Ohne Angabe von Kanten verbindet jeder Dienst mit dem Kontext, es werden keine Beziehungen erfunden.

**Der Verbraucher liefert:** Knoten (`id`, `label`), optional den Kontext-Knoten und Kanten. Interaktive Knoten brauchen `tabindex="0"`, `role="button"` und ein `aria-label`.

**Regeln**
- Die `viewBox` folgt der Fläche, damit die Schrift 10 px bleibt; bei Größenänderung neu zeichnen.
- Als Hintergrund eines Terminals: `aria-hidden="true"`, 28 % Deckkraft, keine Zeiger-Ereignisse.
- Treffer färben Rahmen und Text mit `accent`, nie nur den Rahmen.
