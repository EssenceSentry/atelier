# Complex UI authoring iteration — 2026-11-08

Three fresh `gpt-6-luna` agents at medium effort authored complex notebooks after
the user approved exactly that count/model/effort. The same three received
task-specific feedback; no extra authors or reviewers were launched. The parent
repaired the shared layer. Domain computation was not the acceptance target.

The final examples pass the UI acceptance checks. **First-pass acceptance failed**:
two initial pack attempts were rejected and the remaining first artifact stopped
at a widget-name error. These results establish working examples after iteration,
not reliable first-pass generation for arbitrary UIs.

| Task | Composition | First result | Accepted result |
|---|---|---|---|
| Evidence review | 7 cells, 8 packs; linked chart/table, image/select/action cells, lazy detail tabs, JSON, comparison, carousel, code, chat | Packed, then stopped at `code` widget name | Complete workflow, decisions/draft retained, export includes hidden rows |
| AWS investigation | 7 cells, 9 packs; 12 nodes, synchronized inspector/inventory, JSON, highlighted examples, Mermaid, notes, snapshots | Browser-profile rejection, then syntax and missing-pack repairs | Readable measured cards, stable callbacks/positions, current-view canvas snapshots |
| Visual methods | 15 cells, 10 packs; linked plots, gallery, surface tabs, geometry, neural training, diagnostics/predictions, MyST, code, carousel | `tfvis` pack-name rejection; subsequent figure/state feedback | Correct histogram type, theme ramp, retained 3D camera/draft/training, responsive populated state |

Counts refer to the accepted author sources; native adapters such as `tfvis` can
share a pack. All records/images are supplied illustrative fixtures. No live
cloud, model service or external viewer was connected. No author created a
repository, installed dependencies, compiled a release or wrote custom UI CSS.
Full tool transcripts/token usage were unavailable; agent reports and every saved
pack attempt are retained. Initial browser launch failures were sandbox failures,
not passing checks; subsequent browser runs used the normal approved Node path.

## Shared repairs

- Added stack, toolbar, metric, notice, action-variant, textarea/range-value and lazy-tab primitives. Stack mounts create owned child slots so React cannot replace neighboring content. Tabs retain mounted state and use keyboard/ARIA navigation.
- Table updates retain sorting/search/pagination, clamp shorter results, use stable row ids and support badges/async actions. Core buttons retain action-controlled disabled state, including carousel end stops.
- Flow measures actual card content before ELK layout, opens large graphs at readable scale and retains the camera. Snapshots include native positions/selection/view and omit UI callbacks.
- Mermaid has a correct top-left transform origin, readable initial scale, overview Fit, left control rail and persistent camera/snapshots.
- Image controls accept a left rail and clean up on updates. Select arrows remain inside controls when help text is present.
- Added read-only common-language code highlighting, editor syntax reconfiguration, natural widget-to-pack resolution and literal-mount preflight. Named chart palettes now require a deliberate content exception just like literal colors.
- Vega snapshots use the current spec, empty direct datasets get a shared recoverable state, and containment persists during redraw. Settling waits for resize frames. The final resize defect was a transient old-width Vega SVG, independently isolated in `resize-probe.mjs.txt`.

The accepted sources became the `complex-review`, `architecture-explorer` and
`visual-methods` recipes. Curation formatted the source, removed an unused binding
and an unused callback return, and kept the final theme-palette correction.
`ui-patterns` teaches the smaller composition vocabulary. The skill now routes
complex tasks to these complete patterns and explains their state wiring.

## Evidence and verification

- 32/32 independent task workflow checks: sorting/decision/page retention, shared filters/empty recovery, lazy details/JSON/media, chat, full export, node selection after other selections, retained positions, both diagram snapshots, gallery snapshot, surface camera/draft, geometry control, training and populated resize, themes, navigation and network/errors.
- 48/48 fresh-load cases for four new/curated recipes: three themes × two modes × two viewport sizes. No findings.
- Eight shared composition contract groups, including stack sibling retention, keyboard tabs, code syntax, media rail, select-arrow geometry, measured card overlap, Mermaid fit and camera, empty recovery and responsive state.
- Existing 15 recipe interaction flows plus neural metrics pass. Neural weights reload with identical predictions and teardown returns zero tensors.
- 41 packaging/recipe checks, repository lint/type checks, kit color check and skill validation pass.
- Maintainer visual calibration covers representative tables/controls and the custom figures in light/dark themes. Ordinary artifact authors used shared UI and automated checks; this calibration is library maintenance.

The first evaluator had bookkeeping mistakes: it looked for `inspect().host`
instead of `inspect().handle.host`, compared prose with a padded parent, and did
not await asynchronous navigation. Its results are retained under
`independent-final`; corrected results are separate. The corrected run exposed
one real transient resize defect (31/32). The repaired run passed 32/32.

`baseline.json` records the initial kit hashes; `kit-changes.json` records the
maintainer iteration. `attempt-*` directories preserve source/config text and pack
outcomes. Author final sources, reports and separately labeled maintainer repacks
remain distinct. See `independent-accepted/results.json` for the exact delivered
build check and `curated-matrix.json` for recipe checks. Runnable HTML, screenshots,
original HTML attempts and licenses are preserved in the local `luna-complex-ui`
artifact folder linked from the chat's final reply.

Known limit: the bundled AWS icon catalog lacks KMS; that node is explicitly
iconless rather than using another service's logo. Browser-host restrictions and
external service availability are outside this trial. Further fresh blind agent
rounds require new count/model/effort approval under the user's AGENTS instructions.
