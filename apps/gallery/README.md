# @atelier/gallery

Open `/gallery.html` for a visual index of the six screens and the component
studies. Each screen preview opens in the theme shown. The preview bar lets
you change the screen, theme and mode. The four starter screens (monitor,
review, lab, report) and shared blocks live in `packages/kit`. States and
Channel evidence demonstrate the feedback and review blocks in isolation. The
examples page (`?s=examples`) pairs the starters with Aside and Probability Lab.

```bash
npm run dev:board   # every direction; ?d=, ?m= and ?s= pick direction, mode, screen
npm run dev         # the direction set in app.config.json, instrument by default
```

## Checks

With `dev:board` running on port 5188:

```bash
npm run capture
```

It screenshots every direction, mode and screen at 1440, 1180 and 390px
into `captures/`, full page, with a second `-end` shot for screens that
scroll inside a panel. It fails on a chart that did not render, a console
error, content spilling out of a panel, or a page that scrolls sideways.

`node scripts/check-theme.mjs <url> <png>` confirms that a single-theme build
renders its own direction with no direction switcher.

The review starter uses generated landscapes. The Channel evidence examples
use bundled public-domain NASA and SpaceX photos. Gallery previews are
screenshots of these local screens.

Refresh the index images from the running board with
`node apps/gallery/scripts/capture-previews.mjs http://localhost:5188` at the
repository root. Each study preview is taken from its live component.

## Integration playground

`npm run playground` from the repository root opens `/playground.html` on port
5189. It is a separate entry point for reviewing direct integrations before
extracting a component library. Its code lives in `src/playground`, outside the
shared kit and the Copier template. The regular gallery and its artifact build
keep their original entry point.

Twenty component families combine Vega-Lite, TanStack Table/Virtual, React Flow with ELK,
React Hook Form and Zod, DayPicker, DuckDB-WASM with CodeMirror, Glide Data Grid,
Markdown/KaTeX/Mermaid, image comparison and region review, deck.gl, Plotly,
Microsoft SandDance, CompassQL chart recommendations, JSXGraph, Embla Carousel,
assistant-ui, MyST scientific documents, JSON Crack, TensorFlow.js/tfjs-vis, and
locally bundled technical/AWS icons.
Examples use labelled synthetic data, analytic functions, generated media and locally bundled photographs. The Image stories study credits each photograph.
The Bayesian canvas uses an analytic Beta–Binomial update and deterministic
quantile playback, rather than an inference backend.

The default **Long notebook** (`?view=notebook`) places all twenty families in
one very long page. Sidebar links and the sticky section selector jump to stable
anchors. Heavy renderers mount when reached or explicitly selected, then stay
mounted while you scroll. Long jumps are immediate, skip intervening renderers,
and remain aligned while the selected output loads; wheel/touch/scroll keys
release that alignment. Each family still has an individual page.

The shared notebook shell stacks output cards at full width, offers sidebar or
top-menu page navigation, tracks the current section, supports URL section links
and browser Back/Forward, and retains visited pages and scroll positions within
the session. Navigation preference persists locally when storage is available.
This is session state, not durable notebook storage. Media and neural training
pause when their owning page is hidden. Canvas-only tabs retain their own view.
The shell and study inventory remain internal playground code, not a public API.

Use the top-right controls to compare Instrument, Editorial and Console in
light, dark or system mode. The URL preserves the selected view and theme.

The SandDance study (`?view=sanddance`) uses the actual core Viewer, with animated
scatterplot, stacks, grid and treemap layouts, dimension assignments, selection
and record export. The recommendations study (`?view=recommend`) uses the actual
CompassQL engine with encoding shelves and three query neighborhoods: re-encode,
add a field, and summarize. Choosing a suggestion makes it the specified view and
queries its neighbors. This recreates the Voyager workflow without embedding its
legacy React UI. Effectiveness rankings describe encodings, not data significance.

Mermaid diagrams support drag/pinch/button/keyboard zoom, pan and fit. Diagram,
program, spatial, scientific, SandDance and specified chart views have an **Open
canvas** link. It opens a viewport-filling tab with a snapshot in the URL fragment,
including edited source or current parameters; the program also preserves card
positions and viewport. A tab is an independent snapshot, not a live mirror.

The newer studies add:

- **Plot gallery** (`?view=plots`): 26 live recipes across comparison,
  distribution, relationships, time, composition, ranges and networks. Search,
  filter by family, change measurement/region, inspect a recipe, copy its spec,
  download its data-inclusive JSON or open a canvas-only tab. Recipes are concrete
  local examples in `plot-recipes.ts`, not a shared chart API.
- **Geometry and functions** (`?view=geometry`): JSXGraph triangle/circumcircle/
  medians, a quadratic with a draggable tangent point, and an analytic damped
  rotation over a vector field. Drag points or edit parameters; pan, zoom, reset,
  and open the current construction in a canvas-only tab.
- **Image stories** (`?view=carousel`): Embla image carousel, thumbnail filmstrip,
  keyboard arrows, mixed-content cards and a modal Panzoom image viewer with SVG
  download. A separate tab opens the selected image on a full-window canvas.
- **Rich tables** (`?view=rich-table`): TanStack Table with 60 synthetic records,
  generated image sequences, editable numeric cells, decision selects, inline
  score bars, row actions, selection/bulk actions, sorting, filters, pagination,
  expanded image/notes details, export and one-step undo. Drafts survive navigation
  within the workbench; they are not a durable database.
- **Chat** (`?view=chat`): actual assistant-ui LocalRuntime and primitives for
  streamed text, cancellation, message editing, regeneration and branches.
  The adapter is explicitly a local scripted demo, calculates summaries from the
  shared sample dataset, and makes no model/network request. Markdown rendering
  and transcript export work; a real assistant still needs a backend adapter.
- **Scientific documents** (`?view=myst`): actual MyST parser, default directives/
  roles, proof/tab extensions, KaTeX and highlight.js. Includes source editing,
  numbered equations, local cross-references and example citation metadata,
  callouts, proofs, disclosure details, tabs, task/definition lists, tables,
  copied code, Markdown export and AST inspection. Parsing runs in a dedicated
  worker with an eight-second timeout and a 500,000-character limit. Raw HTML
  stays visible as source; Python is not executed. This is a scoped MyST renderer,
  not a full Sphinx build: autodoc, project-wide references, additional directives
  and external bibliography resolution still need adapters/metadata. Unsupported
  directives retain their source and are reported in place.
- **JSON explorer** (`?view=json`): the actual `jsoncrack-react` component with
  atelier token overrides, a syntax-highlighted JSON source editor, three starter
  documents, formatting, explicit render/validation, local file import, JSON
  export, layout direction, grid toggle, branch collapse/expand, node/value/path
  inspection, path copying and a canvas-only tab. Invalid source keeps the last
  valid graph. Previews are capped at 500 graph nodes and input at 1 MB; empty and
  oversized graphs have explicit states. Draft source and collapse state survive
  navigation within the workbench.

- **Neural networks** (`?view=neural`): TensorFlow.js 4.22 with a fully local,
  deterministic dense binary-classifier playground (XOR/circles/spirals), live
  train/pause/step/reset controls, configurable width/depth/activation/rate/noise,
  a strict 192/48 train/validation split, decision surfaces, per-neuron response
  fields, actual incoming weights/contributions, and a zoomable React Flow/ELK
  canvas with readable layer focus and canvas-only tabs. Diagnostics use actual
  tfjs-vis renderers for gradient norms, activation and weight distributions,
  learning curves, a confusion matrix and model summary, plus PR/calibration
  views computed from the same validation predictions. Gradients describe the
  current full-training-batch mean loss, not Adam's accumulated optimizer state.
  An architecture atlas shows illustrative encoder/head, CNN and transformer
  layouts. Editable convolution and masked-attention examples compute with
  TensorFlow.js; their fixed filters/seeded vectors are explicitly illustrative.
  The original TensorFlow Playground, CNN Explainer, Transformer Explainer,
  Netron and 3D LLM visualization are opt-in external viewers, with independent
  full-tab links. They retain their own UI and may download assets/model weights.
  Study JSON restores this constrained dense network's weights and history;
  resuming training starts a new Adam optimizer. This is not yet a PyTorch or
  auto-classifier model importer. Synthetic study drafts survive workbench
  navigation; no dataset is uploaded by the local playground.

- **Technical icons** (`?view=icons`): 73 curated icons from Tabler, Carbon,
  Devicon, SVG Logos and the official July 31, 2026 AWS architecture package
  (20 services). Iconify's offline component receives bundled icon objects, so
  no icon API or runtime CDN is needed. Includes collection/search filters,
  size preview, selected-icon inspection, copy SVG/ID, standalone SVG download,
  source/terms links, two responsive AWS architecture examples, pan/zoom and
  canvas-only tabs. Brand artwork keeps its original colors; technical symbols
  follow atelier tokens. Full JSON sets are development dependencies; only the
  curated data enters this page's chunk. Provenance/checksums and license notices
  live in `src/playground/icon-sources.json` and `ICON-NOTICES.md`.

The SQL editor now explicitly installs a CodeMirror highlighter for keywords,
strings/quoted identifiers, literals, comments and operators. Its colors come
from atelier text tokens. Switching direction or light/dark mode preserves the
document, selection and undo history rather than reconstructing the editor.

```bash
npm run check:playground --workspace @atelier/gallery
npm run capture:playground --workspace @atelier/gallery
node apps/gallery/scripts/check-notebook.mjs http://127.0.0.1:5190
node apps/gallery/scripts/check-long-notebook.mjs http://127.0.0.1:5190
```

The first command checks real interactions and exports. The second also
captures all twenty experiments in all six theme/mode combinations at desktop and
phone widths, checks browser errors and horizontal overflow, and writes results
under the ignored `output/playwright/workbench/` directory.

This prototype uses a React-19-compatible prerelease of Glide Data Grid and a
development-tagged DuckDB-WASM package; these choices still need review before
library adoption. The production build emits separate family chunks, fonts and
a DuckDB worker/WASM asset. This entry has not been packaged for the restricted
single-HTML artifact host or exposed as a build-free public API.

CompassQL 0.21.2 is a legacy research engine. Its package brings old Vega and
Node CLI dependencies with high/critical npm advisories (including request and
form-data); these need replacement or isolation before library adoption. The
prototype imports its compiled engine, strips legacy output configuration, and
renders suggestions with the current Vega-Lite/Vega stack. It accepts only the
local illustrative dataset and the constrained shelf/query controls.

MyST's current package tree also has advisories, including old markdown-it and
linkify-it versions and a csv-parse dependency. Worker isolation keeps long parses
off the UI thread; it does not remove those dependency advisories. Review/update
this dependency tree before extracting the production library. The new gallery
entry remains a review prototype, with engine families loaded on demand; the
single-HTML artifact restriction below still applies only to the original gallery.

## As an artifact

```bash
npm run build:artifact
node scripts/check-artifact.mjs
```

The build writes `dist/artifact/index.html`, ready to publish as a claude.ai
artifact. The check loads it in a page shaped like the artifact host's, with a
similar content security policy, and fails if light or dark does not follow the
system setting and `data-theme`, if a chart does not render in any direction or
screen, or if the page scrolls sideways at phone width.

The tfjs-vis integration is pinned to 1.5.1. Its legacy dependency tree adds npm
advisories; adoption in a reusable library requires dependency review. An internal
Vega-Embed adapter routes its generated chart specifications through the current
Vega/Vega-Lite renderer and applies atelier tokens, SVG rendering, and explicit
view cleanup. Other workbench Vega callers pass through unchanged. The underlying
tfjs-vis dependency advisories remain; the adapter does not patch those packages.
