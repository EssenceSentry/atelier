# Prebuilt notebook artifacts

This experimental distribution combines the selected native libraries with
atelier's three themes, a small notebook runtime, adapters and working recipes.
Authoring an artifact uses plain JavaScript and precompiled assets. It creates no
repository, runs no compiler and installs no dependencies in the artifact folder.

```bash
node ~/Repos/atelier/packages/artifacts/scripts/new.mjs linked-analysis /tmp/my-analysis
# Edit /tmp/my-analysis/artifact.json and main.js.
node ~/Repos/atelier/packages/artifacts/scripts/pack.mjs /tmp/my-analysis/artifact.json /tmp/my-analysis/output.html
node ~/Repos/atelier/packages/artifacts/scripts/check.mjs /tmp/my-analysis/output.html --matrix
```

To package the entire review gallery without compilation:

```bash
node packages/artifacts/scripts/pack-recipes.mjs /tmp/artifact-recipes
node packages/artifacts/scripts/serve.mjs /tmp/artifact-recipes 5191
```

The authoring skill is [atelier-artifacts](../../skills/atelier-artifacts/SKILL.md).
[catalog.json](catalog.json) records each family's native interface, dependencies
and delivery capabilities. [recipes/index.json](recipes/index.json) lists 20 complete
examples, including a gallery of 26 plot specifications. Read the relevant recipe
instead of learning all underlying libraries at once.

The notebook is full-width cards from top to bottom, with sidebar anchor links or
top navigation. Markdown spans the whole card. A controlled visualization uses
`cell({controls:true})`: controls on the left, visualization on the right, one
element in the notebook flow. On narrow screens they stack within that cell.

Linked controls, a main view and its auxiliary views form one desktop unit with
`Atelier.workspace(cell,{main:"Plot",side:"Details",bottom:"Records"})`. It returns
mount hosts and keeps them in one viewport on sufficiently wide/tall desktop
windows; records/details scroll locally and compact windows stack. The
`linked-workspace`, `complex-review`, `architecture-explorer` and dropdown-first
`recommend` recipes show this workflow. Independent outputs remain normal cells.

## Contract

`Atelier.notebook({title,description,root?,navigation?})` returns `cell`, `go`, `main`
and `destroy`. `cell({id,title,description?,controls?})` returns `section`, `header`,
`view` and optional `controls`. Section ids must be unique simple identifiers.

`Atelier.mount(name,host,options)` returns `ready`, `update(fullOptions)`, `resize`,
`destroy`, `api`. The adapter owns its empty host, theme changes, native renderer
and cleanup. `Atelier.settled()` waits for tracked rendering; it rejects if a widget
failed. Each widget exposes `data-at-state=loading|ready|error`. Native modules are
available through `Atelier.modules`. React is precompiled and shared; authoring
never requires JSX. Advanced cells/nodes can use `Atelier.React.createElement`.

Theme palettes are resolved from the existing token source, rather than duplicated
literal colours. Categorical ranges have six fixed slots. Native scene/mark options
can override defaults deliberately. Geometry's custom objects need their provided
`update` callback to recolour on theme changes without resetting a construction.

Updates replace options; tables preserve sorting, search and pagination while
replacing their data. Lazy tabs retain mounted views, drafts, camera and training
state. `stack`, `toolbar`, `metrics`, `notice`, `tabs`, `button` and `field` own the
ordinary UI. Mounting into a stack creates a safe child slot. The complete
`complex-review`, `architecture-explorer` and `visual-methods` recipes demonstrate
state wiring across many families, alongside the minimal `ui-patterns` recipe.
Page-local edits are not durable storage. A backend, document/kernel execution,
marimo's Python reactivity and an automatic PyTorch importer are outside this layer.
This is a curated set of integrations, not a claim of exhaustive marimo parity.

Canvas links clone the packaged runtime and current serializable configuration into
an independent snapshot tab. No live synchronization. Function/DOM callbacks cannot
cross the boundary; use a dedicated canvas recipe for such cases.

## Delivery

| Profile | Capabilities | Output |
|---|---|---|
| portable | No remote requests, workers, dynamic evaluation or server | One HTML file, bundled fonts and selected packs |
| browser | Workers, WASM, WebGL; eval only for declared families | HTML; SQL also has sibling worker/WASM assets and needs HTTP; JSON Crack uses a data worker |
| external | Explicit HTTPS connect/frame origins | Browser application with opt-in external viewer loading |

The packer validates capabilities, dependency order, source syntax and release
SHA-256 hashes. It never silently compiles or fetches a dependency. Offline means
the selected recipe and its local data can render without remote requests; custom
remote datasets, chat services and viewers have different requirements. Hosts can
apply stricter CSP rules than these files. WebGL/worker availability is a target
capability, not something a stylesheet can supply.

DuckDB receives rows through Arrow and has extension autoload disabled. Its packaged
WASM is about 39 MiB; shipping it is a deliberate browser-profile choice. To serve:

```bash
node ~/Repos/atelier/packages/artifacts/scripts/serve.mjs /tmp/my-analysis 5191
```

The first release retains the prototype's dependencies, including legacy
CompassQL/tfjs-vis. The workspace audit reports 47 advisories (including two critical);
that workspace-wide count is not an attribution to every selected artifact. This
local experimental release is not a production security review. Dependency upgrades,
license review and target-host certification remain release work. The compiled
release includes a conservative installed-dependency license inventory, official
icon notices and source provenance; packing carries the notices to the output.

## Maintaining the prebuilt release

Only maintainers need the workspace dependencies and build command:

```bash
npm run build --workspace @atelier/artifacts
```

Output: `packages/artifacts/dist/0.1.0/`. Each family has a separate IIFE JS/CSS pack;
React lives once in core. This directory is generated/ignored. Install or copy the
whole directory as the prebuilt release; pass `--release /absolute/release` to use
another location. Preserve `manifest.json` and notices. Recipes and packer remain
normal versioned source; a fresh source checkout needs the maintainer-built release
before its first artifact can be packed.

`node scripts/build.mjs --only core,vega` is an incremental maintainer build; use a
full build for a distributable release. Incremental manifests are local development
state, not a publication mechanism. No package registry or CDN has been published.

Packing automatically rejects literal colours and palette classes in author JS/custom CSS. Use the shared defaults or tokens. Scope deliberate content/brand colours with `check-colours: off — reason` / `check-colours: on` comments. This is a design-system guard, not a security parser.

When adding a family, add its native adapter, catalog entry, recipe, family skill
reference, capability declaration and verification. Keep the native configuration
available. Do not invent a universal chart grammar. Treat callback/DOM options as
non-serializable and include lifecycle/disposal checks for stateful renderers.

## Verification and model acceptance

`npm run test --workspace @atelier/artifacts` checks packaging guards and escaping.
`node scripts/check.mjs OUTPUT.html --matrix` launches a browser, checks all three
themes in both modes at desktop/mobile sizes, and writes results under
`output/playwright/artifacts`. Add `--screenshots` for plots or custom diagrams
that need visual inspection. Standard UI relies on shared defaults and automated
checks. The checker detects render errors, broken section targets, overflow and
unexpected network requests. `node scripts/check-interactions.mjs` exercises
filtering, native geometry, canvas tabs, SQL, exports, chat, neural training,
weight reload/disposal, trained-state resizing and touch target sizes.
`node scripts/check-composition.mjs` tests shared UI state, lazy tabs, stable table
updates, code syntax, media controls, readable diagram layout, camera preservation,
canvas snapshots, empty recovery and populated responsive states. Domain
accuracy and behavior need task-specific assertions; novel figures may also need
visual review.

`node scripts/check-workspaces.mjs` checks the bounded linked layouts, native
canvas height changes, retained state and dropdown/recommendation synchronization
across the three themes and desktop/mobile sizes. Standard artifact checks also
detect panels escaping their workspace. The workbench prototype has a matching
`apps/gallery/scripts/check-recommend-workspace.mjs` check for dropdown-first use.

[benchmark/README.md](benchmark/README.md) prepares three Luna-at-medium tasks and
a scoring rubric. Three independent Luna agents at medium effort completed the
[first recorded trial](benchmark/runs/2026-11-08-luna-medium/REPORT.md). Its frozen
results and later maintainer fixes are separate; this sample does not establish
general reliability.

The [complex UI iteration](benchmark/runs/2026-11-08-complex-ui/REPORT.md) uses three
fresh Luna-medium authors and scores visual composition and interactions. It led
to shared UI fixes and the three complete workspace recipes. First attempts,
feedback revisions and maintainer repacks remain separate.

The [fresh variant trial](benchmark/runs/2026-11-08-fresh-complex-ui/REPORT.md)
ran three new Luna-medium agents without parent feedback on an unchanged kit.
Their final sources pass all 32 workflow checks; one agent repaired an icon lookup
and one corrected its illustrative-data label. Maintainer calibration then caught
a shared table-select arrow collision. The CSS fix and automatic control-geometry
check were validated separately on unchanged-source repacks. Optional decorative
icons now omit missing assets safely, and monochrome Flow icons follow themes.

This UI iteration verified 48 fresh-load cases for four new/curated recipes,
32 independent complex-workflow checks, eight shared composition check groups,
15 existing recipe interaction flows plus neural metrics, 41 packaging/recipe checks,
lint/type checks and colour checks. The neural test trained 20 epochs, reloaded
weights with zero prediction difference and returned to zero tensors after disposal.
SQL teardown and cancellation were also exercised. A fresh temporary consumer
folder produced working HTML with no `.git`, `node_modules` or compilation.
External applications were verified as opt-in links/viewer controls; their remote
model downloads and iframe compatibility were not certified.
