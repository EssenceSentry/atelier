# Compose complex notebooks

Use a **workspace** when controls, a main visualization and its linked supporting
views must stay visible together. Use ordinary notebook cells for independent
outputs, long prose and media galleries. The notebook scrolls between these units.

```js
const cell = book.cell({id:"review",title:"Review records",controls:true});
const views = Atelier.workspace(cell,{
  main:"Evidence chart", side:"Selected record", bottom:"Record decisions"
});
Atelier.mount("vega",views.main,{spec});
Atelier.mount("markdown",views.side,{source:details});
Atelier.mount("table",views.bottom,{data:rows,columns,pageSize:4,search:false});
Atelier.field(views.controls,{label:"Group",options:["All","A","B"],onChange:refresh});
```

`main` is always present (default title: Main view); `side` and `bottom` are optional panel titles. The helper
returns those host elements plus `controls`, `headers`, `root`, `focus(name)` and
`destroy()`. Mount one widget or a tab group in each host. Put linked filter and
selection state in one source of truth. `focus("side")` reveals selected details
on small screens and keeps the desktop workspace in place. Header actions can use
`views.headers.main`; canvas snapshots still use `Atelier.canvasLink`.

Desktop windows at least 1100px wide and 700px high get a bounded workspace.
The main view, side inspector, bottom records and control rail fit the viewport;
long records/details scroll inside their own pane. Shorter/narrower windows stack
the parts. Unit Vega plots, Plotly, Flow, Mermaid, JSON and JSXGraph respond to
panel size, including height-only resizing. Complex faceted figures retain their
native layout and may scroll within the pane; `fit:false` preserves explicit Vega
dimensions. Custom plots still warrant mark/label checks.

Use `search:false` on a workspace table when its search already lives in the left
rail. Pagination and headers stay visible while rows scroll. Use tabs for
alternative details, retaining their state; do not put simultaneously important
main/auxiliary views in separate tabs. Keep controls specific to a detail tab in a
group hidden by the tab's `onChange` callback. See `complex-review` and
`architecture-explorer` for complete linked patterns.

`recommend` demonstrates dropdown-first assignment to X, Y, color, size and mark,
with the active plot, ranked alternatives and source records visible together.
The native CompassQL query remains available; ranking does not establish a
statistical claim about the data.

Use `ui-patterns` alongside the family recipe. Keep one controlled widget and its
related views in one cell. Give separate tasks their own cells; sidebar anchors
are automatic. Avoid custom CSS and manual pixel widths for ordinary UI.

```js
const cell = book.cell({id:"review",title:"Review records",controls:true});
const layout = Atelier.stack(cell.view); // shared vertical gap
Atelier.notice(layout,{title:"Illustrative data",text:"Supplied fixture records."});
const summary = Atelier.metrics(layout,[{label:"Records",value:rows.length,note:"Local"}]);
const views = Atelier.tabs(layout,{
  label:"Record views",
  items:[
    {id:"table",label:"Records",render:panel=>Atelier.mount("table",panel,{data:rows,columns})},
    {id:"details",label:"Details",render:panel=>Atelier.mount("markdown",panel,{source:detail})}
  ]
});
await views.ready;
```

Tabs mount only on first selection. Return a handle (or array of handles) from
`render` so readiness and cleanup are managed. Panels remain mounted: table state,
drafts, camera positions and training state survive switching. `await views.select(id)`
opens a panel; `views.panel(id)`, `views.value`, `views.destroy()` are available.
To refresh an unmounted detail view, update your selected record variable; its
render callback must read the latest value. Update mounted handles using complete
options. Never remount a whole workspace for one selection.
Keep callbacks in a single options factory so an update does not drop them.
For Flow selection/highlights, `handle.api.flow.setNodes(updater)` retains dragged
positions and avoids relayout. Table Inspect can call `book.go("details")` to
reveal a distant detail cell; selecting diagram nodes need not move the notebook.

`Atelier.stack(parent,{compact:true})` groups related blocks with a smaller gap.
Pass a stack directly to `Atelier.mount`: it creates an owned child slot, keeping
neighboring notices, metrics and widgets intact. Destroy removes that slot.
`Atelier.toolbar(parent,{label:"Record actions"})` wraps actions responsively.
`Atelier.button(label,action,parent,{variant:"primary"|"secondary"|"ghost"|"danger",
busyLabel:"Saving…",disabled:false,title:"…"})` awaits async work and shows errors.
Choose one primary action per task; inspection and view controls are secondary.
Action callbacks receive their button; set `.disabled` when the action is unavailable.

`Atelier.field(parent,{label,type,value,onChange,description,...nativeAttributes})`
supports select, textarea, search, text, checkbox, number and range. Range fields
display their value; `format:value=>...` formats it. It returns the native control,
so reset it by assigning `.value` or `.checked` alongside application state.
Use a visible label for each control and a note for a saved/local/unsaved state.

`Atelier.metrics(parent,items)` returns `{root,update(items),destroy()}` with
`{label,value,note?}` items. `Atelier.notice(parent,{title,text,tone})` uses info,
success, warning or error. Prefer notices for durable state, not repeated alerts.

Derive `visibleRows` once for a shared filter and update all intended linked views.
Store decisions/drafts in the complete dataset using stable ids. Preserve them
when filtering, sorting or switching tabs. Make an empty result useful and
recoverable: Vega shows a shared empty message for an empty direct `data.values`;
tables retain their toolbar. Put reset in the control rail. Use supplied local
images/assets and label scripted chat; never invent a service connection.

Check populated and empty states, selected details, async busy actions, tab round
trips, exports and desktop→phone→desktop resizing with the automated checker and
task-specific browser interactions. Library-owned UI needs no per-artifact visual
inspection. New chart labels and diagram topology still warrant overlap checks.
