---
name: atelier-artifacts
description: Create consistent one-off interactive HTML notebooks from atelier's prebuilt release, with no repository, npm install, JSX or compilation. Use for portable web artifacts, charts, diagrams, data explorers, rich tables, Markdown/MyST reports, image comparisons, chat interfaces and browser neural labs. Use the atelier app generator instead when developing a maintained application or backend.
---

# Atelier artifacts

Start from a runnable recipe. Edit its data, text, native library configuration
and callbacks. Package the already compiled assets. Do not create a Vite project,
run a compiler, install packages or rewrite a library adapter to make one artifact.

For channel audits use the `channel-rows` recipe. Mount one
`Atelier.mount("channel-row", host, channel)` per record. Supply independent
verdict badges, video evidence and an optional provenance note. Call
`handle.update(channel)` to refresh or `handle.destroy()` to release the row.

## Make an artifact

The installed source and prebuilt release live in `~/Repos/atelier`.

```bash
node ~/Repos/atelier/packages/artifacts/scripts/new.mjs --list
node ~/Repos/atelier/packages/artifacts/scripts/new.mjs linked-analysis /tmp/my-analysis
```

Edit `/tmp/my-analysis/artifact.json` and `main.js`. A recipe includes synthetic
examples: replace them with actual evidence or keep the illustrative label.
Give `artifact.json` a useful title, `theme` (`instrument`, `editorial`, `console`),
`mode` (`light`, `dark`, `system`), and only the needed `families`.

```bash
node ~/Repos/atelier/packages/artifacts/scripts/pack.mjs /tmp/my-analysis/artifact.json /tmp/my-analysis/output.html
node ~/Repos/atelier/packages/artifacts/scripts/check.mjs /tmp/my-analysis/output.html --matrix
```

Packing reads prebuilt JS/CSS and validates plain JavaScript; it never compiles.
It validates literal mount names against the selected packs. A widget name such
as `tfvis` or `editor` in `families` resolves to its owning `neural` or `code` pack.
If the release is missing or its integrity check fails, report the specific error
and ask the maintainer to restore the release. Do not improvise CDN imports.

## Choose a recipe

| Need | Start here | Read only if needed |
|---|---|---|
| Complex workspace, tabs, summaries, action hierarchy | `ui-patterns` | [Composition](references/composition.md) |
| Linked controls + chart/diagram + inspector + records on one desktop screen | `linked-workspace` | [Composition](references/composition.md) |
| Complete review UI: linked filters, rich table, detail tabs, media, chat | `complex-review` | [Composition](references/composition.md) |
| Complete architecture investigation: selection, inspector, notes, canvas tabs | `architecture-explorer` | [Diagrams](references/diagrams.md) |
| Long visual lab: gallery, surface tabs, geometry, neural diagnostics | `visual-methods` | [Composition](references/composition.md) |
| Linked charts + records | `linked-analysis` | [Charts](references/charts.md) |
| Choose a plot family; 26 examples | `plot-gallery` | [Charts](references/charts.md) |
| SandDance dimensions / related plots | `sanddance` / `recommend` | [Charts](references/charts.md) |
| Architecture, AWS, Bayesian program cards | `architecture` | [Diagrams](references/diagrams.md) |
| Geometry / functions | `geometry` | [Diagrams](references/diagrams.md) |
| Scientific surface / Observable Plot | `scientific` | [Charts](references/charts.md) |
| Large spatial layers | `spatial` | [Charts](references/charts.md) |
| Images, selects, actions, editable grid, JSON | `rich-data` | [Data and interaction](references/data.md) |
| SQL execution + highlighting | `sql` | [Data and interaction](references/data.md) |
| Markdown, math, MyST, highlighted code | `document` | [Documents and media](references/documents.md) |
| Form, sliding image comparison, carousel | `inputs-media` | [Documents and media](references/documents.md) |
| Streaming chat UI | `chat` | [Data and interaction](references/data.md) |
| Browser training + diagnostics | `neural` | [Neural](references/neural.md) |
| Original neural explainers | `external-viewers` | [Neural](references/neural.md) |

## Use this small vocabulary

```js
const book = Atelier.notebook({title: "Analysis", description: "Source and scope"});
const cell = book.cell({id: "scores", title: "Scores", controls: true});
const chart = Atelier.mount("vega", cell.view, {spec});
await chart.ready;
Atelier.field(cell.controls, {
  label: "Group", value: "All", options: ["All", "A", "B"],
  onChange: async value => { await chart.update({spec: makeSpec(value)}); }
});
```

- A notebook is full-width cards from top to bottom. Sidebar links scroll to
  cells. Use `navigation: "top"` only when requested.
- Group linked parts with `Atelier.workspace(cell,{main:"Plot",side:"Details",bottom:"Records"})`.
  Controls, primary output and auxiliary views then fit one desktop viewport. Scroll
  between workspaces. Independent reports/galleries remain ordinary cells. Do not
  split a linked inspector or diagnostic into a distant cell just to make each card full width.
- Keep a widget's controls in `cell.controls`, on the left of `cell.view`.
  They stack within that cell on small screens. Independent outputs get new cells.
- Markdown is full width. Do not add a prose measure/max-width.
- Use `Atelier.stack`, `toolbar`, `metrics`, `notice`, `tabs`, `button`, `field`,
  `download` for UI composition; see [Composition](references/composition.md).
  These own spacing, responsive layout and action hierarchy. Return mount handles
  from tab render callbacks; tabs mount lazily and retain state.
  Mount directly into a stack to create a child slot safely. Start from the
  complete workspace recipes when combining many families; keep their state wiring.
  Use `.at-note`, `.at-toolbar`, `.at-input`, `.at-button` for hand-authored HTML.
- `mount` returns `{ready, update, resize, destroy, api}`. Updates are complete
  option objects. Await async work. Do not mount twice into the same host.
- Keep native Vega specs, Plotly traces, React Flow nodes/edges, JSXGraph setup
  callbacks, etc. See `Atelier.modules` in the family references for escape hatches.
- Colours come from `Atelier.tokens()` (literal canvas/SVG colours) or CSS tokens.
  Keep categorical series in slot order; at most six. Facet or group extra categories.
  Packing checks plain JS and custom CSS for literal colours/palette classes and
  named chart palettes and rejects them before producing HTML. Omit overrides to
  use adapter defaults; a built-in name such as Viridis also overrides the theme.
  Deliberate image/brand/content colours need a scoped
  `// check-colours: off — reason` / `// check-colours: on` exemption.
- State the scope of filters. A shared group filter derives `visibleRows` once and
  updates every intended linked chart/table/summary. Keep decisions in the complete
  dataset so filtering does not discard them. Label chart-only controls accordingly.
- Use `Atelier.canvasLink(handle, serializableOptions, {parent: cell.controls})`
  for a canvas snapshot tab. Function callbacks and DOM elements cannot transfer.
  Geometry/deck callbacks need a separately authored canvas recipe.
- Do not put service credentials in the artifact. Chat needs a supplied adapter.
  A mock adapter must say it is a mock. External viewers are opt-in.

## Delivery profiles

Use the recipe's profile. The packer rejects unsupported combinations.

- `portable`: one self-contained HTML file, local data/assets, no network, workers,
  dynamic evaluation or server. Intended for `file://` and restricted viewers.
- `browser`: real browser features. SQL requires HTTP and the sibling `.assets`
  directory (WASM + worker); MyST and JSON Crack use workers; scientific/spatial plots use
  WebGL; SandDance, CompassQL and Arrow insertion require dynamic evaluation. Hosts may forbid these.
- `external`: browser profile plus explicit HTTPS `frameOrigins` / `connectOrigins`.
  Remote servers may refuse iframe embedding. Never claim these viewers are offline.

For SQL output:

```bash
node ~/Repos/atelier/packages/artifacts/scripts/serve.mjs /tmp/my-analysis 5191
# Open http://127.0.0.1:5191/output.html
```

## Verify before delivery

Normal UI uses the validated notebook, control and table adapters. Its layout,
spacing, colours, containment and responsive behavior belong to the library; no
routine screenshot review is required for standard elements. Avoid custom layout
or stylesheet work where an existing adapter/recipe already fits.

Use `Atelier.field` for dropdowns. Its chevron sits 12px inside the trailing edge.
Hand-authored single-line selects should keep that inset and the separate space
for the label, including in portable pages with long options.

Use the automated checker and exercise the controls that matter to this task.
It detects render errors, overflow, missing section targets and unexpected remote
requests, including native select text/arrow collisions. Use `--out=/tmp/my-checks`
to keep parallel checks separate. Check data wiring, filter/export scope, computed totals, empty states
and state changes such as training followed by resizing; a successful render does
not prove these behaviors. The maintainer suite validates shared UI contracts.

For a new plot/custom diagram or labels/marks that may overlap, add `--screenshots`
and visually review those figures. Routine UI does not need this extra step.
Screenshots, when requested, are under `~/Repos/atelier/output/playwright/artifacts`.
If an external backend cannot be exercised, state that limit. Deliver the HTML,
sibling assets when present, and license notices. Consult
`~/Repos/atelier/packages/artifacts/benchmark/` for the recorded Luna trials;
repaired examples do not establish first-pass reliability on arbitrary new artifacts.
