# athenahealth — Homepage CRO prototype (Option 3, Conversational experience)

Static HTML/CSS/JS prototype built from the Figma file **Homepage-CRO-Test-Designs**.

| Page | Figma node | Content |
|---|---|---|
| `v2.html` | 740:11235 | V2 — full homepage (hero, solutions, testimonial, results, prefooter, footer) |
| `v3.html` | 740:9090 | V3 — hero only |
| `v3-panel.html` | 740:9178 | V3 — hero with the "See what athenaOne can do for you" panel |

`index.html` links to all three; every page has a variant switcher bottom-right.

## Run

Any static server works, e.g.

```bash
python3 -m http.server 8765 --directory athena-cro-prototype
```

then open http://localhost:8765/ (the mesh gradient needs `fetch`, so don't open the files via `file://`).

## Gradients

All gradient fills are reproduced from the Figma data, not eyeballed:

* **Mesh gradients** (hero blob "Ellipse 54", stat photo card, footer wordmark) use Figma's own
  "Mesh gradient" shader — `setup()`/`render()` in `mesh-gradient.js` are copied verbatim from the
  design context and run on **WebGPU** (Chrome/Edge, Safari 26+). Browsers without WebGPU get a CPU
  fallback that evaluates the identical Catmull-Rom / linear-light maths on a 2D canvas.
  Layer stack, opacities and blend modes match the Figma fills:
  * hero blob: layer A at 90 % `normal` + layer B `overlay`, masked by the blurred ellipse SVG
  * photo card: image + mesh at `hard-light`
  * footer logo: outline filled `#622FB4 → #9C28B1` + mesh at 50 % `hard-light`
* **Linear gradients** (hero backgrounds, cards, bar chart, buttons' gradient text, testimonial
  circle) use the exact angles / stops / opacities from Figma.
* The footer logo's Figma *progressive* layer blur is emulated with four masked, increasingly
  blurred copies (CSS has no progressive blur).

## Known substitutions

* Font: Google's **Source Sans 3** stands in for Source Sans Pro (same family, open licence).
* Icons: Font Awesome 6 Pro glyphs are replaced with inline SVGs of the same size/colour.
* Figma only has 1440 px frames, so the tablet (< 1200 px) and mobile (< 768 px) layouts in
  `responsive.css` are our own interpretation: full-width fluid desktop, collapsible nav menu,
  single-column hero with the photo as a band, stacked cards/results, wrapped footer.

## Interactions

Nav/link hover states, suggested-question chips fill the ask bar, the ask bar submits, and the
V3 panel pager cycles the cards.
