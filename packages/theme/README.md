# @atelier/theme

Three visual directions as design tokens. Components read tokens only, so a
project changes direction without touching component code.

| Direction | Character | Fonts | Accent |
|---|---|---|---|
| `instrument` (default) | Cool white, hairline frames, dense | Instrument Sans, JetBrains Mono | Cobalt |
| `editorial` | Warm paper, serif headlines, printed rules | Newsreader, Hanken Grotesk | Ink blue |
| `console` | Graphite, plain panels, monospace labels | Chivo, Chivo Mono | Violet |

Each direction has light and dark tokens. Status hues (good, warning,
serious, critical) are the same across directions, with darker light-mode
steps where a hue would be hard to read on a light surface.

## Use

`vite.config.ts`:

```ts
import { atelierTheme } from "@atelier/theme/vite"

export default defineConfig({ plugins: [react(), tailwindcss(), atelierTheme()] })
```

`src/main.tsx`, before the app's own CSS:

```ts
import "@atelier/theme/direction.css"
```

`src/index.css`, after Tailwind:

```css
@import "@atelier/theme/tailwind.css";
```

## Choosing a direction

Set `theme` in the project's `app.config.json`:

```json
{ "theme": "editorial" }
```

`THEME=<name>` overrides it for one run. Without either, the direction is
`instrument`. `all` bundles every direction so `data-direction` on `<html>` can
switch at runtime; the gallery uses it. A build bundles only the chosen
direction's fonts and tokens, and an unknown name fails the build.

Light or dark follows the viewer's system setting. `data-theme="light"` or
`data-theme="dark"` on `<html>` overrides it either way. Each colour token is a
single `light-dark()` pair, so a direction defines every colour once.

## Surfaces and elevation

Each direction's neutrals share one hue and step evenly. Surfaces stack in a
fixed order, `page`, `sunken`, `card`, `raised`, `muted`, `popover`, and in
dark each is lighter than the one before it. Outlines strengthen from `border`
to `border-strong` to `input`.

Depth is a token too, so a direction decides how much of it there is:

| Token | Utility or class | Use |
|---|---|---|
| `--panel-ring`, `--panel-shadow` | `.panel`, `shadow-panel` | A section's surface |
| `--well-shadow` | `.well` | A recessed area inside a panel |
| `--elevation-control` | `shadow-control` | Inputs, selects, quiet buttons |
| `--elevation-action` | `shadow-action` | The filled primary button |
| `--elevation-overlay` | `shadow-overlay` | Menus, popovers and tooltips; includes a hairline |
| `--lead-fill`, `--lead-mode`, `--lead-rule` | `.atelier-lead` | The one panel a screen leads with |
| `--masthead-fill`, `--masthead-shadow` | `.atelier-masthead` | The app bar |
| `--page-texture` | `body` | An optional image behind the page; no direction sets one, and it never repeats |

Each direction declares a panel's depth once. Instrument draws panels with a
hairline and only a contact shadow. Console floats them on a soft shadow with
no outline in light, and edges them with light in dark, where a shadow cannot
show. Editorial keeps panels flat under printed rules and gives only overlays
a shadow. Instrument's lead panel is dark in both modes; Console's and
Editorial's follow the page.

A direction also sets how words and icons are drawn: `--status-font` and
`--status-size` for status words (`.label-status`), which are the sans except
in Console, where mono labels are the voice; `--icon-stroke` for the weight of
every lucide icon; and `--figure-tracking` for large figures, kept loose
enough that a decimal point never touches its neighbours.

`shadow-overlay` also returns a floating panel to the page's mode
(`--page-scheme`, set beside `color-scheme` in `modes.css`), so a menu opened
from a dark app bar on a light page is a light menu.

Gradients are tokens too, so a direction decides whether it has any.
`--accent-gradient` runs the accent into `--accent-2` for fills that show a
quantity or mark the active item; `--action-fill` lights the top of the
primary button; `--masthead-glow` lights the app bar's lower edge; and
`--lead-fill` may carry the accent's light across a corner of the lead panel.
Instrument stays inside its cobalt, Console runs violet into fuchsia, and
Editorial sets all of them to `none`.

Motion is in the shared layer and each kind happens once: `.atelier-enter`
raises a container's children into place in order on load;
`figure.plot-figure[data-enter]` draws a chart's lines, areas and bars the
first time it appears; `.sparkline`, `.sparkline-dot` and `.meter-fill` do the
same for the small marks. Transitions share one exponential ease-out. Under
`prefers-reduced-motion` everything is shown at rest, which is how every
check script opens the page.

Two tints mixed from the text colour show state on any surface in either
mode: `bg-hover` for what the pointer or keyboard is on, and `bg-track` behind
a meter, progress bar or slider.

`.skeleton` is the loading placeholder. A band of light crosses each one at
the same speed and they all start together, so a screenful moves as one; it
holds still under reduced motion.

## Artifacts

`ATELIER_TARGET=artifact` builds a page for a claude.ai artifact instead of an
app: one `index.html` holding only page content (the artifact host supplies the
document), with fonts from Google Fonts and all CSS and JavaScript inlined.

## Contrast

`node scripts/contrast.mjs` computes every text token against every surface,
per direction and mode, and lists pairs below 4.5:1 (3:1 for `faint`, which
is for decoration and large figures only). The lead panel and the app bar
count as surfaces: text is measured on each colour stop of their fills, in
the mode the direction gives them. atelier apps are personal tools,
so this is a legibility reference for reviews, not a compliance gate.

## Charts

`@atelier/theme/viz` resolves chart colours from the active tokens:
`readVizTokens()` returns them and `observeTheme(callback)` reports direction or
mode changes. Categorical slots passed the dataviz validator (adjacent pairs on
every slot, all pairs on the first three, both modes). Instrument has six slots,
Console five and Editorial four; past the last slot, fold series into "Other"
or facet instead of cycling.
