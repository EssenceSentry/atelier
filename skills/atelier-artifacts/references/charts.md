# Chart families

All configuration is plain JavaScript. Only selected packs enter the HTML;
dependencies such as Vega for SandDance are added automatically.

| Family / mount name | Options | Native exports |
|---|---|---|
| `vega` | `{spec, embed?, signals?, onView?}` | `modules.vega.{vega,vegaLite,embed}` |
| `plot` | `{options: (Plot,tokens,width) => PlotOptions}` | `modules.plot.Plot` |
| `plotly` | `{data, layout?, config?, height?, onClick?}` | `modules.plotly.Plotly` |
| `deck` | `{layers: (layers,tokens)=>Layer[], deck?}` | `modules.deck` includes views/layers |
| `sanddance` | `{data, insight, setup?, viewer?, onSelection?}` | `modules.sanddance.SandDance` |
| `recommend` | `{data, fields?, query?, limit?, selectFirst?, onSelect?}` | `modules.recommend.cql` |

Prefer Vega-Lite for statistical charts and linked selections. Pass Vega directly
for custom marks, layouts and signals. The adapter uses the expression interpreter
to run under the portable CSP. Do not disable `ast` in a portable artifact.
`signals` maps signal names to `(name,value)` callbacks; `api.view` is the real
Vega view. Use `data.values`, not a remote URL in portable artifacts.

The `plot-gallery` recipe contains 26 complete specs: bar, dot, lollipop, grouped,
stacked, waterfall, histogram, density, box, violin, strip, ECDF, scatter, bubble,
heatmap, regression, line, area, step, band, pie, treemap, waffle, range,
quartile interval and radial network. These are recipes on synthetic rows with
specific field names; copy the desired native spec and adapt it to actual data.
Quartiles are observed spread, not uncertainty intervals.

Use Observable Plot when its marks or transforms make the task clearer. Its options
callback receives the real Plot module and resolved tokens. Use Plotly for surfaces,
3D traces and scientific interaction; configure scene axes explicitly when replacing
the whole `layout.scene`. Do not invent an uncertainty band without evidence.

SandDance gets native `insight.columns` (`uid,x,y,z,color,size,sort`), `chart`
(`scatterplot,stacks,grid,treemap`) and `view` (`2d,3d`). Make dimension shelves with
`Atelier.field` in `cell.controls`, then update the complete options. Each block is
a row. It is not an aggregate chart. Camera snapshots use its actual viewer API.

CompassQL accepts its native query shape. To recommend nearby encodings of a chosen
plot, turn selected channels/mark into enum queries and reuse fixed fields:

```js
const query = {spec: {mark: "?", encodings: [
  {channel: {enum: ["x", "y"]}, field: "score", type: "quantitative"},
  {channel: {enum: ["x", "y"]}, field: "volume", type: "quantitative"}
]}, orderBy: "effectiveness"};
await recommendations.update({data: rows, query});
```

Use the `recommend` recipe for dropdown-first field assignment with a separate
main plot, ranked alternatives and records in one desktop workspace. Its
`selectFirst:false` keeps loading a preview from replacing the explicit axis
assignment; clicking a suggestion promotes that spec and synchronizes the menus.
`api.selected` is unset until a choice is promoted in this mode. No matching recommendations
show a recoverable message. Native `query` remains available for other neighborhoods.

Recommendations rank encodings, not scientific relevance. The original CompassQL
engine is legacy and requires the browser profile. Do not generate a custom
recommendation algorithm and label it CompassQL.
