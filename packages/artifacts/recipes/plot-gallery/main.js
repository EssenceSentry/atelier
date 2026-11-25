const groups = ["A", "B", "C"]
const samples = Array.from({ length: 120 }, (_, i) => ({
  id: `r-${i}`,
  group: groups[i % 3],
  score: ((i * 17) % 100) / 100,
  volume: 30 + ((i * 31) % 200),
  day: `2026-11-${String(1 + (i % 20)).padStart(2, "0")}`,
  x: Math.sin(i) * 40,
  y: Math.cos(i) * 40,
  reviewed: i % 2 === 0,
}))
const recipes = [
  { id: "bar", title: "Bar chart", family: "Comparison", note: "Compare a mean across regions." },
  {
    id: "dot",
    title: "Dot plot",
    family: "Comparison",
    note: "Compare positions on a shared scale.",
  },
  {
    id: "lollipop",
    title: "Lollipop",
    family: "Comparison",
    note: "Connect each mean to a zero baseline.",
  },
  {
    id: "grouped",
    title: "Grouped bars",
    family: "Comparison",
    note: "Compare reviewed and pending records within each region.",
  },
  {
    id: "stacked",
    title: "Stacked bars",
    family: "Comparison",
    note: "Show the composition of each region's records.",
  },
  {
    id: "waterfall",
    title: "Waterfall",
    family: "Comparison",
    note: "Accumulate each region's contribution to the total.",
  },
  {
    id: "histogram",
    title: "Histogram",
    family: "Distribution",
    note: "Count records in equal-width bins.",
  },
  {
    id: "density",
    title: "Density",
    family: "Distribution",
    note: "Compare smoothed distributions by region.",
  },
  {
    id: "box",
    title: "Box plot",
    family: "Distribution",
    note: "Show medians, quartiles, whiskers and outliers.",
  },
  {
    id: "violin",
    title: "Violin",
    family: "Distribution",
    note: "Mirror each region's estimated density.",
  },
  {
    id: "strip",
    title: "Strip plot",
    family: "Distribution",
    note: "Keep individual observations visible.",
  },
  {
    id: "ecdf",
    title: "Cumulative distribution",
    family: "Distribution",
    note: "Read the fraction of observations below a value.",
  },
  {
    id: "scatter",
    title: "Scatterplot",
    family: "Relationship",
    note: "Inspect position and measurement together.",
  },
  {
    id: "bubble",
    title: "Bubble chart",
    family: "Relationship",
    note: "Add volume as the area of each point.",
  },
  {
    id: "heatmap",
    title: "Binned heatmap",
    family: "Relationship",
    note: "Count observations in two-dimensional bins.",
  },
  {
    id: "regression",
    title: "Regression",
    family: "Relationship",
    note: "Fit a descriptive linear trend to synthetic records.",
  },
  {
    id: "line",
    title: "Line chart",
    family: "Time",
    note: "Follow daily means across the sample dates.",
  },
  {
    id: "area",
    title: "Stacked area",
    family: "Time",
    note: "Follow record counts and their regional composition.",
  },
  {
    id: "step",
    title: "Step chart",
    family: "Time",
    note: "Hold each daily mean until the next date.",
  },
  {
    id: "band",
    title: "Quantile band",
    family: "Time",
    note: "Show daily medians and the observed interquartile range.",
  },
  {
    id: "donut",
    title: "Donut",
    family: "Composition",
    note: "Compare regional shares of total measurement.",
  },
  {
    id: "treemap",
    title: "Treemap",
    family: "Composition",
    note: "Allocate rectangles in proportion to regional totals.",
    engine: "vega",
  },
  {
    id: "waffle",
    title: "Waffle",
    family: "Composition",
    note: "Round regional shares to a hundred equal tiles.",
  },
  {
    id: "interval",
    title: "Range & mean",
    family: "Range",
    note: "Show the observed minimum, maximum and mean.",
  },
  {
    id: "errorbar",
    title: "Quartile interval",
    family: "Range",
    note: "Compare medians and observed quartiles; these are not confidence intervals.",
  },
  {
    id: "network",
    title: "Radial network",
    family: "Network",
    note: "Connect sample records to their region; edges indicate membership.",
    engine: "vega",
  },
]
const q = (field, extra = {}) => ({ field, type: "quantitative", ...extra })
const n = (field, extra = {}) => ({ field, type: "nominal", ...extra })
const t = (field, extra = {}) => ({ field, type: "temporal", ...extra })
const quantile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b)
  const point = (sorted.length - 1) * fraction
  return (
    sorted[Math.floor(point)] + (sorted[Math.ceil(point)] - sorted[Math.floor(point)]) * (point % 1)
  )
}
// Concrete, exportable recipes for this study, not a public chart abstraction.
function recipeSpec(id, measure = "score", region = "") {
  const data = region ? samples.filter((row) => row.group === region) : samples
  const domain = groups.filter((group) => data.some((row) => row.group === group))
  const summary = domain.map((group) => {
    const values = data.filter((row) => row.group === group).map((row) => row[measure])
    const total = values.reduce((sum, value) => sum + value, 0)
    return {
      group,
      total,
      mean: total / values.length,
      low: Math.min(...values),
      high: Math.max(...values),
      q1: quantile(values, 0.25),
      q3: quantile(values, 0.75),
      median: quantile(values, 0.5),
    }
  })
  const color = n("group", { scale: { domain: groups }, title: "Region" })
  const unit = (mark, encoding, other = {}) => ({
    data: { values: data },
    mark: typeof mark === "string" ? { type: mark, tooltip: true } : { tooltip: true, ...mark },
    encoding,
    ...other,
  })
  const byGroup = (mark, encoding = {}) =>
    unit(mark, {
      x: n("group", { title: "Region" }),
      y: q(measure, { aggregate: "mean", title: `Mean ${measure}` }),
      color,
      ...encoding,
    })
  switch (id) {
    case "bar":
    case "dot":
    case "lollipop": {
      const format = measure === "score" ? ".2f" : ",.0f"
      const scaleMax =
        measure === "score" ? 1 : Math.max(1, ...summary.map((row) => row.mean)) * 1.22
      const tooltip = [
        n("group", { title: "Region" }),
        q("mean", { title: `Mean ${measure}`, format }),
      ]
      return {
        data: { values: summary },
        description: `Mean ${measure} by region in descending order.`,
        encoding: {
          y: n("group", {
            title: null,
            sort: { field: "mean", order: "descending" },
            axis: { labelAngle: 0 },
          }),
          x: q("mean", { title: `Mean ${measure}`, scale: { domain: [0, scaleMax], nice: false } }),
        },
        layer: [
          ...(id === "lollipop"
            ? [{ mark: { type: "rule", strokeWidth: 2 }, encoding: { x2: { datum: 0 } } }]
            : []),
          {
            mark:
              id === "bar" ? { type: "bar", size: 18 } : { type: "point", filled: true, size: 78 },
            encoding: { tooltip },
          },
          {
            mark: { type: "text", align: "left", baseline: "middle", dx: 9 },
            encoding: { text: q("mean", { format }) },
          },
        ],
      }
    }
    case "grouped":
      return unit("bar", {
        x: n("group", { title: null, sort: groups, axis: { labelAngle: 0 } }),
        xOffset: n("reviewed"),
        y: q(measure, { aggregate: "mean" }),
        color: n("reviewed", { title: "Reviewed" }),
      })
    case "stacked":
      return unit("bar", {
        x: n("group", { title: null, sort: groups, axis: { labelAngle: 0 } }),
        y: { aggregate: "count", type: "quantitative", title: "Records" },
        color: n("reviewed", { title: "Reviewed" }),
      })
    case "waterfall": {
      let start = 0
      const values = summary.map((row) => {
        const item = { ...row, start, end: start + row.total }
        start += row.total
        return item
      })
      return {
        data: { values },
        mark: { type: "bar", tooltip: true },
        encoding: {
          x: n("group", { sort: domain, title: null, axis: { labelAngle: 0 } }),
          y: q("start", { title: `Cumulative ${measure}` }),
          y2: { field: "end" },
          color,
        },
      }
    }
    case "histogram":
      return unit("bar", {
        x: q(measure, { bin: { maxbins: 18 } }),
        y: { aggregate: "count", type: "quantitative", title: "Records" },
      })
    case "density":
      return {
        data: { values: data },
        transform: [{ density: measure, groupby: ["group"], as: ["value", "density"] }],
        mark: { type: "line", tooltip: true },
        encoding: {
          x: q("value", { title: measure }),
          y: q("density", { title: "Density" }),
          color,
        },
      }
    case "box":
      return unit(
        { type: "boxplot", extent: 1.5 },
        {
          x: n("group", { title: null, sort: groups }),
          y: q(measure),
          color: { ...color, legend: null },
        }
      )
    case "violin":
      return {
        data: { values: data },
        transform: [{ density: measure, groupby: ["group"], as: ["value", "density"] }],
        facet: { column: n("group", { title: "Region" }) },
        spec: {
          mark: { type: "area", orient: "horizontal", tooltip: true },
          encoding: {
            x: q("density", { stack: "center", axis: null }),
            y: q("value", { title: measure }),
            color,
          },
        },
        resolve: { scale: { x: "independent" } },
      }
    case "strip":
      return unit(
        { type: "tick", thickness: 1.5, opacity: 0.6 },
        {
          x: q(measure),
          y: n("group", { title: null, sort: groups }),
          color: { ...color, legend: null },
        }
      )
    case "ecdf":
      return {
        data: { values: data },
        transform: [
          {
            window: [{ op: "cume_dist", as: "fraction" }],
            sort: [{ field: measure }],
            groupby: ["group"],
          },
        ],
        mark: { type: "line", interpolate: "step-after", tooltip: true },
        encoding: {
          x: q(measure),
          y: q("fraction", { title: "Fraction", axis: { format: ".0%" } }),
          color,
        },
      }
    case "scatter":
      return unit(
        { type: "point", filled: true, opacity: 0.7, size: 35 },
        { x: q("x", { title: "Position x" }), y: q(measure), color }
      )
    case "bubble":
      return unit(
        { type: "circle", opacity: 0.5 },
        {
          x: q("x", { title: "Position x" }),
          y: q(measure),
          size: q("volume", { scale: { range: [10, 220] } }),
          color,
        }
      )
    case "heatmap":
      return unit("rect", {
        x: q("x", { bin: { maxbins: 16 } }),
        y: q(measure, { bin: { maxbins: 14 } }),
        color: { aggregate: "count", type: "quantitative", title: "Records" },
      })
    case "regression":
      return {
        data: { values: data },
        encoding: { x: q("x"), y: q(measure) },
        layer: [
          { mark: { type: "point", filled: true, opacity: 0.35, tooltip: true } },
          { transform: [{ regression: measure, on: "x" }], mark: { type: "line", strokeWidth: 2 } },
        ],
      }
    case "line":
      return unit(
        { type: "line", strokeWidth: 2.2 },
        {
          x: t("day", { title: "Day", axis: { format: "%b %d" } }),
          y: q(measure, { aggregate: "mean", title: `Mean ${measure}` }),
          color,
        }
      )
    case "area":
      return unit(
        { type: "area", opacity: 0.75 },
        {
          x: t("day", { title: "Day" }),
          y: { aggregate: "count", type: "quantitative", title: "Records" },
          color,
        }
      )
    case "step":
      return unit(
        { type: "line", interpolate: "step-after" },
        { x: t("day", { title: "Day" }), y: q(measure, { aggregate: "mean" }), color }
      )
    case "band":
      return {
        data: { values: data },
        transform: [
          {
            aggregate: [
              { op: "q1", field: measure, as: "lower" },
              { op: "q3", field: measure, as: "upper" },
              { op: "median", field: measure, as: "center" },
            ],
            groupby: ["day"],
          },
        ],
        encoding: { x: t("day", { title: "Day" }) },
        layer: [
          {
            mark: { type: "area", opacity: 0.2 },
            encoding: { y: q("lower", { title: measure }), y2: { field: "upper" } },
          },
          { mark: { type: "line", tooltip: true }, encoding: { y: q("center") } },
        ],
      }
    case "donut":
      return unit(
        { type: "arc", innerRadius: 55 },
        {
          theta: q(measure, { aggregate: "sum" }),
          color,
          tooltip: [n("group"), q(measure, { aggregate: "sum" })],
        }
      )
    case "waffle": {
      const total = summary.reduce((sum, row) => sum + row.total, 0)
      let count = 0
      const tiles = Array.from({ length: 100 }, (_, index) => {
        let group = summary.at(-1)?.group
        for (const row of summary) {
          count += row.total / total
          if ((index + 0.5) / 100 <= count) {
            group = row.group
            break
          }
        }
        count = 0
        return { x: index % 10, y: 9 - Math.floor(index / 10), group }
      })
      return {
        data: { values: tiles },
        mark: { type: "rect", tooltip: true, cornerRadius: 2 },
        encoding: {
          x: { ...n("x"), axis: null, scale: { paddingInner: 0.12 } },
          y: { ...n("y"), axis: null, scale: { paddingInner: 0.12 } },
          color,
        },
      }
    }
    case "interval":
      return {
        data: { values: summary },
        encoding: {
          y: n("group", { title: null, sort: groups }),
          color: { ...color, legend: null },
        },
        layer: [
          {
            mark: { type: "rule", strokeWidth: 3 },
            encoding: { x: q("low", { title: measure }), x2: { field: "high" } },
          },
          {
            mark: { type: "point", filled: true, size: 95, tooltip: true },
            encoding: { x: q("mean") },
          },
        ],
      }
    case "errorbar":
      return {
        data: { values: summary },
        encoding: {
          y: n("group", { title: null, sort: groups }),
          color: { ...color, legend: null },
        },
        layer: [
          {
            mark: { type: "errorbar", ticks: true },
            encoding: { x: q("q1", { title: measure }), x2: { field: "q3" } },
          },
          {
            mark: { type: "point", filled: true, size: 75, tooltip: true },
            encoding: { x: q("median") },
          },
        ],
      }
    case "treemap":
      return treemap(summary)
    case "network":
      return network(data)
    default:
      return byGroup("bar")
  }
}
function treemap(summary) {
  return {
    $schema: "https://vega.github.io/schema/vega/v6.json",
    data: [
      {
        name: "tree",
        values: [
          { id: "All" },
          ...summary.map((row) => ({ id: row.group, parent: "All", value: row.total })),
        ],
        transform: [
          { type: "stratify", key: "id", parentKey: "parent" },
          {
            type: "treemap",
            field: "value",
            size: [{ signal: "width" }, { signal: "height" }],
            padding: 3,
            round: true,
            as: ["x0", "y0", "x1", "y1", "depth", "children"],
          },
        ],
      },
      {
        name: "leaves",
        source: "tree",
        transform: [{ type: "filter", expr: "datum.depth === 1" }],
      },
    ],
    scales: [{ name: "color", type: "ordinal", domain: groups, range: "category" }],
    legends: [{ fill: "color", orient: "bottom", direction: "horizontal" }],
    marks: [
      {
        type: "rect",
        from: { data: "leaves" },
        encode: {
          enter: {
            x: { field: "x0" },
            y: { field: "y0" },
            x2: { field: "x1" },
            y2: { field: "y1" },
            fill: { scale: "color", field: "id" },
            tooltip: { signal: "{Region: datum.id, Total: datum.value}" },
          },
        },
      },
    ],
  }
}
function network(rows) {
  const localGroups = groups.filter((group) => rows.some((row) => row.group === group))
  const nodes = localGroups.flatMap((group, g) => {
    const angle = (g * Math.PI * 2) / localGroups.length - Math.PI / 2
    const x = Math.cos(angle) * 0.45,
      y = Math.sin(angle) * 0.45
    return [
      { id: group, group, x, y, root: true },
      ...rows
        .filter((row) => row.group === group)
        .slice(0, 9)
        .map((row, i) => ({
          id: row.id,
          group,
          x: x + Math.cos((i * Math.PI * 2) / 9) * 0.27,
          y: y + Math.sin((i * Math.PI * 2) / 9) * 0.27,
          root: false,
        })),
    ]
  })
  const edges = nodes
    .filter((node) => !node.root)
    .map((node) => {
      const parent = nodes.find((item) => item.id === node.group)
      return { x: parent?.x, y: parent?.y, x2: node.x, y2: node.y, group: node.group }
    })
  return {
    $schema: "https://vega.github.io/schema/vega/v6.json",
    data: [
      { name: "nodes", values: nodes },
      { name: "edges", values: edges },
    ],
    scales: [
      { name: "x", type: "linear", domain: [-1, 1], range: "width" },
      { name: "y", type: "linear", domain: [-1, 1], range: "height" },
      { name: "color", type: "ordinal", domain: groups, range: "category" },
    ],
    legends: [{ fill: "color", orient: "bottom", direction: "horizontal" }],
    marks: [
      {
        type: "rule",
        from: { data: "edges" },
        encode: {
          enter: {
            x: { scale: "x", field: "x" },
            y: { scale: "y", field: "y" },
            x2: { scale: "x", field: "x2" },
            y2: { scale: "y", field: "y2" },
            stroke: { scale: "color", field: "group" },
            strokeOpacity: { value: 0.35 },
          },
        },
      },
      {
        type: "symbol",
        from: { data: "nodes" },
        encode: {
          enter: {
            x: { scale: "x", field: "x" },
            y: { scale: "y", field: "y" },
            size: { signal: "datum.root ? 260 : 55" },
            fill: { scale: "color", field: "group" },
            tooltip: { signal: "datum.id" },
          },
        },
      },
    ],
  }
}
const book = Atelier.notebook({
  title: "Plot gallery",
  description:
    "26 concrete Vega/Vega-Lite charts built from one synthetic dataset. Choose a question, then inspect its native specification.",
})
for (const recipe of recipes) {
  const cell = book.cell({ id: recipe.id, title: recipe.title, description: recipe.note })
  Atelier.mount("vega", cell.view, {
    spec: (_tokens, width) => {
      const spec = recipeSpec(recipe.id)
      if (recipe.engine === "vega")
        return {
          ...spec,
          width: Math.max(180, width - 24),
          height: 300,
          autosize: { type: "fit", contains: "padding" },
        }
      if (spec.facet) {
        const columns = width < 600 ? 1 : 3
        const measure = document.createElement("canvas").getContext("2d")
        measure.font = `12px ${_tokens.labelFont}`
        const gutter = Math.ceil(measure.measureText("0.00").width) + 32
        return {
          ...spec,
          facet: spec.facet.column,
          columns,
          spec: {
            ...spec.spec,
            width: Math.max(120, (width - 80) / columns - gutter),
            height: 300,
          },
        }
      }
      return { ...spec, width: "container", height: 300 }
    },
  })
}
