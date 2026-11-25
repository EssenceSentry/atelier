const book = Atelier.notebook({
  title: "Linked desktop workspaces",
  description:
    "Illustrative data. Each workspace keeps controls, a main canvas and linked supporting views together.",
})
const data = Array.from({ length: 18 }, (_, i) => ({
  id: `r${i + 1}`,
  group: ["A", "B", "C"][i % 3],
  score: ((i * 17) % 90) / 100,
  volume: 20 + i * 7,
  decision: "Pending",
}))
const cell = book.cell({ id: "explore", title: "Explore and review", controls: true })
const views = Atelier.workspace(cell, {
  main: "Score and volume",
  side: "Selected record",
  bottom: "Record decisions",
})
let group = "All",
  query = "",
  selectedId = data[0].id
const visible = () =>
  data.filter((row) => (group === "All" || row.group === group) && row.id.includes(query))
let chart, table, detail
const detailOptions = () => {
  const row = data.find((item) => item.id === selectedId)
  return {
    source: `### ${row.id}\n\n**Group:** ${row.group}\n\n**Decision:** ${row.decision}\n\nScore: ${row.score} · Volume: ${row.volume}\n\nThe selected record stays beside the chart and review table.`,
  }
}
async function choose(id) {
  selectedId = id
  await chart.update(chartOptions())
  await detail.update(detailOptions())
  views.focus("side")
}
const chartOptions = () => ({
  spec: {
    data: { values: visible().map((row) => ({ ...row, selected: row.id === selectedId })) },
    mark: { type: "point", filled: true, size: 95 },
    encoding: {
      x: { field: "score", type: "quantitative", title: "Score" },
      y: { field: "volume", type: "quantitative", title: "Volume" },
      color: { field: "group", type: "nominal", scale: { domain: ["A", "B", "C"] } },
      opacity: { condition: { test: "datum.selected", value: 1 }, value: 0.4 },
      tooltip: [{ field: "id" }, { field: "decision" }],
    },
  },
  onView: (view) =>
    view.addEventListener("click", (_event, item) => {
      if (item?.datum?.id) void choose(item.datum.id)
    }),
})
const columns = [
  { key: "id", title: "Record" },
  { key: "group", title: "Group", type: "badge" },
  { key: "score", title: "Score" },
  { key: "decision", title: "Decision", type: "select", options: ["Pending", "Accept", "Reject"] },
  { key: "inspect", title: "Inspect", type: "button", action: (row) => choose(row.id) },
]
const tableOptions = () => ({
  data: visible(),
  columns,
  pageSize: 4,
  search: false,
  onChange: (rows) => {
    for (const row of rows) data.find((item) => item.id === row.id).decision = row.decision
    void refresh()
  },
})
async function refresh() {
  await chart.update(chartOptions())
  await table.update(tableOptions())
  await detail.update(detailOptions())
}
chart = Atelier.mount("vega", views.main, chartOptions())
detail = Atelier.mount("markdown", views.side, detailOptions())
table = Atelier.mount("table", views.bottom, tableOptions())
const filter = Atelier.field(views.controls, {
  label: "Group",
  value: group,
  options: ["All", "A", "B", "C"],
  onChange: async (value) => {
    group = value
    await refresh()
  },
})
const search = Atelier.field(views.controls, {
  label: "Record search",
  type: "search",
  value: query,
  onChange: async (value) => {
    query = value
    await refresh()
  },
})
Atelier.button(
  "Reset filters",
  async () => {
    group = "All"
    query = ""
    filter.value = "All"
    search.value = ""
    await refresh()
  },
  views.controls,
  { variant: "ghost" }
)
Atelier.button(
  "Export decisions",
  () => Atelier.download("decisions.json", JSON.stringify(data, null, 2)),
  views.controls,
  { variant: "primary" }
)
Atelier.field(views.controls, {
  label: "Local review note",
  type: "textarea",
  value: "",
  description: "Retained while navigating the notebook.",
})
await chart.ready
Atelier.canvasLink(chart, chartOptions(), { parent: views.controls })
const architecture = book.cell({
  id: "architecture",
  title: "Investigate a workflow",
  controls: true,
})
const graphViews = Atelier.workspace(architecture, {
  main: "Workflow canvas",
  side: "Service details",
  bottom: "Service inventory",
})
const services = [
  { id: "ingest", name: "Ingestion", description: "Validate incoming records.", status: "Ready" },
  {
    id: "archive",
    name: "Archive",
    description: "Keep immutable source evidence.",
    status: "Ready",
  },
  { id: "model", name: "Classifier", description: "Apply a versioned model.", status: "Warning" },
  {
    id: "review",
    name: "Review",
    description: "Record a decision and its evidence.",
    status: "Ready",
  },
]
let selectedService = "ingest",
  flow,
  inspector
const serviceText = () => {
  const service = services.find((row) => row.id === selectedService)
  return {
    source: `### ${service.name}\n\n**${service.status}**\n\n${service.description}\n\nSelect the graph, inventory or menu to update these linked details.`,
  }
}
async function selectService(id) {
  selectedService = id
  serviceSelect.value = id
  flow.api.flow.setNodes((nodes) => nodes.map((node) => ({ ...node, selected: node.id === id })))
  await flow.api.focus(id)
  await inspector.update(serviceText())
  graphViews.focus("side")
}
const graph = {
  nodes: services.map((service) => ({
    id: service.id,
    selected: service.id === selectedService,
    data: {
      label: service.name,
      description: service.description,
      status: service.status,
      tone: service.status === "Warning" ? "warning" : "success",
    },
  })),
  edges: [
    { id: "a", source: "ingest", target: "archive" },
    { id: "b", source: "archive", target: "model" },
    { id: "c", source: "model", target: "review" },
  ],
  onNodeClick: (_event, node) => void selectService(node.id),
}
flow = Atelier.mount("flow", graphViews.main, graph)
inspector = Atelier.mount("markdown", graphViews.side, serviceText())
Atelier.mount("table", graphViews.bottom, {
  data: services,
  search: false,
  pageSize: 4,
  columns: [
    { key: "name", title: "Service" },
    { key: "status", title: "State", type: "badge" },
    { key: "inspect", title: "Inspect", type: "button", action: (row) => selectService(row.id) },
  ],
})
const serviceSelect = Atelier.field(graphViews.controls, {
  label: "Selected service",
  value: selectedService,
  options: services.map((row) => ({ value: row.id, label: row.name })),
  onChange: selectService,
})
Atelier.button("Fit overview", () => flow.api.flow.fitView(), graphViews.controls)
Atelier.button("Focus selected", () => flow.api.focus(selectedService), graphViews.controls)
await flow.ready
Atelier.canvasLink(flow, graph, { parent: graphViews.controls })
