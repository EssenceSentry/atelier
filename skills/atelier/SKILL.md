---
name: atelier
description: Start and build the user's dashboards, live monitors, review and annotation tools, interactive labs and report pages with atelier, their own starter kit and project generator (~/Repos/atelier). Use whenever asked to build a dashboard, status page, monitor, review or labeling interface, data explorer, lab, report page, a web front end for a Python tool, or a claude.ai artifact page, and when restyling or extending an atelier app. Prefer it over the built-in Dashboard artifact type, except for pages meant for audiences like sales who need live connector data with visible sources.
---

# atelier

atelier generates a finished starting point: one of four screens, the theme,
the blocks and shadcn components it is built from, and every quality gate.
Never build these apps from an empty Vite project or a hand-written page.

## Start

```bash
uvx copier copy --trust https://github.com/EssenceSentry/atelier.git <dir>
```

Answer from the request instead of asking, and say which answers you chose:

| Question | How to choose |
|---|---|
| `kind` | `monitor` for live status of a job or system; `review` for queues of items to judge or label; `lab` for exploring data through linked charts and controls; `report` for an analysis people read |
| `theme` | `instrument` unless the user asks otherwise; `editorial` suits reports and narrative labs, `console` suits monitors |
| `artifact` | yes (default) unless the app can only work against a local service |
| `visibility`, `pages` | private and no Pages unless the user says it is public |

Setup runs `git init`, `npm install` (which installs the hooks) and
`npx playwright install chromium`. Then `npm run dev`.

## Make it this app's own

When the design needs work, choose the organizing question for this screen.
A monitor should reveal which job needs attention. A review queue should keep
the evidence and decision together. A lab should show what changed relative
to a baseline. A report should connect its main claim to a figure or table.
Use `design-interfaces` for a deeper critique, visual direction or motion
decision, and keep the selected Atelier theme as the source of tokens.

Do these before showing the app to anyone:

1. **Data.** Replace the example data in `src/lib/sample.ts` with the real
   data or its loader. Never present example figures as real.
2. **Icon.** Design an icon for this app, not a generic one: a simple
   geometric mark tied to what the app does, legible at 16 px, on the accent
   colour. Put it in `src/app-icon.tsx` (uses `var(--primary)`, so it follows
   the theme) and `public/favicon.svg` (needs a literal colour: `#3665e4`
   instrument, `#2863ab` editorial, `#7552db` console). Both start as an
   initials placeholder.
3. **Copy.** Rename the screen's sections and labels in the users' terms.

## Build

- Reshape the generated screen rather than starting a new one. Reuse
  `src/blocks` (app bar, stat tiles, figure rows, status badges, sparklines,
  meters, chart frame, log tail, keyboard help, states) and
  `src/components/ui`; add components with `npx shadcn add <name>`.
- Keyboard shortcuts go through `useKeys` in `src/lib/keys.ts`, which stays
  quiet while the person types, and `ShortcutsHelp` lists them on click or
  "?". Hide key hints on touch screens with `pointer-coarse:hidden`.
- Chart notes that need room go through `whenWide(width, marks)`, so narrow
  charts drop them instead of printing them over the data; pass what they
  said to PlotFigure's `narrowNote` so phones still get it.
- Set chart margins from `labelWidth(t, labels)`, never by hand: label fonts
  differ between directions and machines.
- A chart with two or more series has a `Legend` in its SectionHeader
  `meta`, shaped like its marks, even when a neighbouring chart uses the
  same colours. Report figures use `SectionHeader level="h2"`.
- Every button does something. One that is not built yet is a
  `NotBuiltButton`, which says "Not built yet"; a commit check fails on a
  bare one. A label names its object when the action covers less than the
  screen shows ("Export 640 selected"). App-bar labels keep a short phone
  form (`Export<span className="max-sm:hidden"> 640 selected</span>`); the
  layout check fails a squeezed mark or a wrapped product name.
- The phone review queue is a native modal. Dismissing it returns to the
  decision screen; resizing to desktop releases it. Keep repeated labeling
  immediate. Notes open on demand and stay with their item for the session.
- A button's label and its effect come from one function, so they cannot
  drift apart (the review station's `nextStep`). A
  disabled action says what it is waiting for ("Choose an answer").
- Running text is set at `measure` (32em, about 65–70 characters), never a
  pixel width; the layout check fails text over 75 characters a line. Text sizes
  stay on the type scale (a commit check enforces it).
- Eyebrows classify (a resource kind, "Figure 1"); they never restate the
  heading under them. Meta lists wrap whole items (`wrap`) rather than
  truncate, and a filtered list shows "shown/total". A filter never hides
  the item being acted on, and "next" steps through what the filter shows.
  An empty filtered list names its scope ("No saved channels match…") and
  links to any scope that has matches.
- Charts side by side go in a `ChartRow` of `ChartPanel`s, so their plots
  line up whatever each header holds. A ChartPanel note states a fact about
  the data (a count, a share, a source), never how to read the chart.
- Colours come from theme tokens only (`bg-card`, `text-ink-2`,
  `bg-primary-soft`, `text-good`, `var(--series-1)`). A commit hook rejects hex
  values and palette classes such as `blue-500`.
- Depth comes from the direction's elevation steps, never a hand-written
  shadow, and a surface declares it once: a hairline or a shadow, not a
  border under a soft shadow. A section sits on `panel`, a recessed area on
  `well`; inputs and quiet buttons take `shadow-control`, a filled primary
  control `shadow-action`, and anything that floats (menus, popovers,
  notices over the page) `shadow-overlay`, which draws its own hairline, so
  it needs no border, and returns the panel to the page's light or dark
  mode when it opens from a dark app bar or lead panel. A direction with printed rules,
  such as editorial, turns the same classes flat. In dark, a surface is
  lighter than the one it sits on: `bg-sunken` below a card, `bg-raised` or
  `bg-muted` on it, `bg-popover` above it.
- Motion is the theme's, and each kind happens once. A screen's main
  container takes `atelier-enter`, and its direct children rise into place
  in order when the page loads. Charts, sparklines and meters draw themselves
  in the first time they appear, and the active tab's marker slides to the
  tab chosen. Nothing replays on a data update, a resize or a keyboard step,
  so do not add entrances to rows, queue items or anything a key moves
  through, and never loop an animation except the one mark that means "live".
  Reduced motion shows everything at rest, and every check runs that way.
- Gradients come from the direction, never a hand-written one:
  `bg-(image:--accent-gradient)` over `bg-primary` for a fill that shows a
  quantity or marks the active item (meters, progress, the tab marker), the
  lead panel's fill, the primary button's lit top and the app bar's lower
  edge. Editorial sets them all flat, as print would. No gradient text, and
  no gradient behind running text.
- State shows on every surface in both modes through two tints mixed from
  the text colour: `hover:bg-hover` (and `focus:bg-hover` in menus) for what
  the pointer or keyboard is on, and `bg-track` behind a meter, progress bar
  or slider, so the bar has a visible end. A solid `bg-muted` hover vanishes
  on dark surfaces. A selected segment or row carries more than a tint: the
  accent text and a hairline or `bg-primary-soft`.
- The area under a line fades out instead of sitting as a flat tint:
  `const fade = fadeFill(t.series[0])`, then `fade.defs` among the marks and
  `fill: fade.fill` on the area mark. In a chart tip's `title`, name the
  point on the first line and put the value on the last; the theme sets the
  value in ink.
- Charts go through `PlotFigure`; take colours from the tokens it passes in.
  Use series slots in order and never cycle past the last; fold the rest into
  "Other" or facet.
- Status pairs colour with an icon and a word (`StatusBadge`). Status words
  take `label-status`, which a direction sets in its sans unless mono labels
  are its voice; `label-mono` and `font-mono` are for data: numbers, IDs,
  paths, code and logs.
- Arrows, chevrons, ticks and triangles are drawn icons (lucide, or a small
  SVG as in `Delta`), never characters such as ‹ › ▲ ▼ ✓: a glyph sits on
  the text baseline and never centres. Icons take the direction's stroke
  weight on their own.
- Tabs that underline (`TabsList variant="line"`) draw their own baseline
  across the row; do not wrap them in a bordered box.
- Legibility over compliance: these are personal tools, so accessibility
  compliance is not a goal, but reading must be effortless. Text at least
  11px (13px for running text), about 4.5:1 contrast for text the user reads
  (`text-faint` is for decoration and large figures), controls comfortable to
  hit on phone layouts, keyboard paths for frequent actions, and status never
  carried by colour alone.
- Every view has its states: loading shows something at once, empty states
  invite the next action, and errors say what happened and how to fix it.
  `src/blocks/states.tsx` has `Skeleton`, `EmptyState`, `ErrorState` and
  `LiveIndicator`; the gallery's states page shows them. An empty result is
  an empty state, not an error.
- Actions answer in place. A destructive action shows `UndoNotice` where the
  removed thing was, copying uses `CopyButton`, which says "Copied", and an
  action that takes a moment (Retry, Export, Download) uses `ActionButton`,
  which shows a spinner and a "…ing" label until it finishes.
- Controls change what they claim to. Lift control state into the screen
  and rebuild charts from it, as the lab does; a control that is not wired
  yet says so.
- For repeated channels with video evidence, use `ChannelRow` from
  `@/blocks/channel-row` with a `ChannelEvidence` record. Supply independent
  verdict badges, rank or score metadata, the rationale and any expandable
  details. Videos use stable IDs, optional links and supplied thumbnail URLs
  or data URIs. Use `evidenceNote` for title-only evidence; an absent score
  or citation stays absent. The portable notebook recipe is `channel-rows`.
- In a lab, keep selection membership by stable item ID as the projection
  changes. Transform the selection outline with the marks. Check that the
  highlighted items and the actual CSV rows agree. Show the original score
  when a parameter changes it and give the user a way to restore it.
- Use the direction’s masthead, section title, panel and table-header tokens.
  Give the main run summary the lead surface. In reports, keep the finding,
  its interpretation and the figures together at both wide and narrow widths.
- Every figure on a screen comes from the same data. Derive totals, deltas
  and headline numbers from the rows the charts draw, so the prose, the
  tiles and the chart cannot disagree.
- Labels say what happens ("Release volume", not "Submit"), an action keeps
  its name through the flow, and capitalization is sentence case throughout.
- Change the direction only through `theme` in `app.config.json`; never edit
  `theme/`.
- Live state: `useLiveState(url, example)` in `src/lib/live.ts` reads the
  server-sent events a lathe service project sends (see the lathe skill). It
  returns `{ state, status }`; the state is null until the first event, so
  show skeletons until then and pass `status` to `LiveIndicator` (the monitor
  screen takes it as a prop) so example figures never pass for live ones. That
  service can also serve the built app with `create_app(static_dir=Path("dist"))`.

## Check

Commit hooks run Biome, TypeScript, the colour check, zizmor and the AI
co-author check. Push hooks build the app and run `npm run check`, which
writes screenshots to `checks/` in light and dark at desktop, laptop and
phone widths, and fails on a broken chart, a console error, content spilling out of a panel,
sideways scrolling, or chart labels that overlap or run past their panel.

Open those screenshots after every visual change and fix what looks wrong;
the check catches breakage, not an ugly layout. Run
`npx lefthook run pre-push --all-files` before saying the work is done.

Before the app is shown or published, offer two independent reviews. The
`ui-critic` agent renders the app in both modes on desktop and phone, zooms
into details and reports everything that looks unprofessional. The
`hig-critic` agent judges purpose, measured legibility, states and
writing against Apple's Human Interface Guidelines. They are meant to
disagree at times; reconcile their findings with the user rather than
applying both blindly. Agree on running them with the user first, as with
any agent.

## Publish as a claude.ai artifact

```bash
npm run build:artifact && npm run check:artifact
```

Publish `dist/artifact/index.html` with the Artifact tool, with a one-word
generic `icon` and a one-sentence description. Republish the same path to
update it. The build already meets the artifact page contract: content only,
fonts from Google Fonts, everything else inlined, light and dark following the
viewer.

## Later

`uvx copier update --trust` pulls atelier improvements into the project. To
change atelier itself, read `AGENTS.md` in ~/Repos/atelier.
