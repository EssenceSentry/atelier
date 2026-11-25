const book = Atelier.notebook({
  title: "Plot recommendations",
  description:
    "Illustrative observations. Assign fields with the menus; CompassQL ranks visual encodings.",
})
const cell = book.cell({
  id: "recommendations",
  title: "Choose dimensions and explore related plots",
  controls: true,
})
const views = Atelier.workspace(cell, {
  main: "Selected plot",
  side: "Related views",
  bottom: "Underlying records",
})
const data = Array.from({ length: 60 }, (_, i) => ({
  id: `r${i + 1}`,
  score: (i * 17) % 100,
  volume: (i * 31) % 200,
  group: ["A", "B", "C"][i % 3],
}))
const dimensions = [
  { field: "score", label: "Score", type: "quantitative" },
  { field: "volume", label: "Volume", type: "quantitative" },
  { field: "group", label: "Group", type: "nominal" },
]
let assignments = { x: "score", y: "volume", color: "group", size: "" },
  mark = "?",
  choices
const encoding = () =>
  Object.fromEntries(
    Object.entries(assignments)
      .filter(([, field]) => field)
      .map(([channel, field]) => [
        channel,
        { field, type: dimensions.find((item) => item.field === field).type },
      ])
  )
const base = () => ({ mark: mark === "?" ? "point" : mark, encoding: encoding() })
const primary = Atelier.mount("vega", views.main, { spec: { ...base(), data: { values: data } } })
const options = () => ({
  data,
  fields: dimensions,
  query: {
    spec: {
      mark,
      encodings: Object.entries(encoding()).map(([channel, field]) => ({
        channel: channel === "x" || channel === "y" ? { enum: ["x", "y"] } : channel,
        ...field,
      })),
    },
    orderBy: "effectiveness",
  },
  limit: 4,
  selectFirst: false,
  onSelect: (spec) => {
    assignments = Object.fromEntries(
      Object.keys(assignments).map((channel) => [channel, spec.encoding?.[channel]?.field ?? ""])
    )
    for (const [channel, menu] of Object.entries(menus)) menu.value = assignments[channel]
    mark = typeof spec.mark === "string" ? spec.mark : spec.mark.type
    markMenu.value = mark
    void primary.update({ spec: { ...spec, data: { values: data } } })
  },
})
async function refresh() {
  await primary.update({ spec: { ...base(), data: { values: data } } })
  await choices.update(options())
}
choices = Atelier.mount("recommend", views.side, options())
const menus = {}
for (const [channel, label] of [
  ["x", "X axis"],
  ["y", "Y axis"],
  ["color", "Color"],
  ["size", "Size"],
])
  menus[channel] = Atelier.field(views.controls, {
    label,
    value: assignments[channel],
    options: [
      { value: "", label: "None" },
      ...dimensions
        .filter((item) => channel !== "size" || item.type === "quantitative")
        .map((item) => ({ value: item.field, label: item.label })),
    ],
    onChange: async (field) => {
      assignments = { ...assignments, [channel]: field }
      await refresh()
    },
  })
const markMenu = Atelier.field(views.controls, {
  label: "Mark",
  value: mark,
  options: [{ value: "?", label: "Auto" }, "point", "bar", "line", "tick", "area"],
  onChange: async (value) => {
    mark = value
    await refresh()
  },
})
Atelier.button(
  "Reset assignments",
  async () => {
    assignments = { x: "score", y: "volume", color: "group", size: "" }
    mark = "?"
    for (const [channel, menu] of Object.entries(menus)) menu.value = assignments[channel]
    markMenu.value = mark
    await refresh()
  },
  views.controls,
  { variant: "ghost" }
)
Atelier.mount("table", views.bottom, {
  data,
  search: false,
  pageSize: 4,
  columns: [
    { key: "id", title: "Record" },
    { key: "score", title: "Score" },
    { key: "volume", title: "Volume" },
    { key: "group", title: "Group", type: "badge" },
  ],
})
await primary.ready
Atelier.canvasLink(
  primary,
  { spec: { ...base(), data: { values: data } } },
  { parent: views.controls }
)
