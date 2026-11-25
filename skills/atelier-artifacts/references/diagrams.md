# Diagrams, geometry and icons

Use `mermaid` for text-authored diagrams, `flow` for draggable cards and selectable
relationships, `geometry` for a mathematical construction. These are distinct models.

- Mermaid: `{source, label?}`. Pan/zoom/fit controls are supplied. Wheel zoom activates
  on focus or with Ctrl/Meta, preserving normal notebook scrolling. Strict security
  disables raw HTML. Use accessible titles/descriptions in the diagram source.
  Pass `controls:cell.controls` for a left rail. Large diagrams open at readable
  scale; Fit shows the entire diagram. Theme changes and resize retain the camera;
  canvas snapshots include current pan/zoom. `api.panzoom` is the native instance.
- Flow: `{nodes, edges, layout?, flow?, nodeTypes?, onNodeClick?, onConnect?}`.
  Nodes default to a built-in card: `{id,data:{label,description?,icon?,status?,tone?}}`.
  ELK measures and places cards automatically. Large graphs initially focus a
  readable node (set `focusId` to choose it); Fit gives the complete overview.
  `handle.api.focus(id)` centers a node at readable scale. Resize and tab changes
  preserve the camera. Pass `layout:false` and explicit positions to
  retain coordinates. Native React Flow options go in `flow`; its instance is
  `handle.api.flow`. `nodeTypes` accepts precompiled/native React components;
  ordinary artifacts can build one with `Atelier.React.createElement` without JSX.
- Geometry: `{board?, setup(board,tokens,JXG), update?}`. `setup` creates real JSXGraph
  objects and can return cleanup. `api.board` exposes the board. For theme changes,
  supply `update(board,tokens)` to recolour custom objects without losing positions.

Use one `cell({controls:true})` for each controlled visualization. Control changes
may update native objects directly (JSXGraph) or call `handle.update(fullOptions)`.
The Bayesian example is an editable computation graph; a static dependency graph
alone does not perform inference. Compute the actual model and drive cards/plots
from those results.

The `icons` family has 73 bundled icons with no Iconify API calls:
Tabler/Carbon technical symbols, Devicon and SVG Logos, and official AWS SVGs.
Look up actual ids, rather than guessing:

```js
const {catalog,url,svg} = Atelier.modules.icons;
const matches = catalog.filter(item => /storage|s3|lambda/i.test(item.name));
const iconSource = url(matches[0].id); // for a Flow node's data.icon
```

Only the curated catalog is bundled; familiar IDs from a full icon package can
still be absent. For decorative Flow icons, use
`url(candidateId,{optional:true})`: missing IDs return `undefined`, leaving the
service label readable. Strict `url(id)` still reports unknown IDs. Monochrome
Flow icons refresh with the theme; brand artwork keeps its supplied colors.

`mount("icons",host,{id,label,size})` displays a standalone icon. Monochrome icons
resolve to the current ink token. Official brand art keeps its supplied colours;
preserve it and use a neutral content mat if needed. Package `ICON-NOTICES.md` with
the output. Architecture labels must identify actual services, not whichever icons
happen to come first in the catalog.

`Atelier.canvasLink` produces an independent snapshot tab, not synchronized state.
It supports serializable configs for Mermaid, Flow and similar canvases. Flow
captures current positions/selection/camera and omits its UI event callbacks.
Custom node components, JSXGraph setup closures and live connections need a separate recipe.
