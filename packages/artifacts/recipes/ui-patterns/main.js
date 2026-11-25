const book = Atelier.notebook({
  title: "Reusable UI patterns",
  description: "Shared UI blocks and supplied illustrative records. No custom CSS is needed.",
})
const intro = book.cell({ id: "overview", title: "A consistent starting point" })
const overview = Atelier.stack(intro.view)
Atelier.notice(overview, {
  title: "Illustrative workspace",
  text: "Controls, actions, tabs and tables use the same shared styles in every direction.",
})
const stats = Atelier.metrics(overview, [
  { label: "Records", value: 4, note: "Supplied examples" },
  { label: "Views", value: 2, note: "Lazy tabs retain state" },
  { label: "Themes", value: 3, note: "Shared tokens" },
])
const cell = book.cell({ id: "workspace", title: "Explore the supplied records", controls: true })
let query = ""
let selected = "None"
const rows = [
  { id: "r1", name: "Morning survey", group: "A", status: "Ready" },
  { id: "r2", name: "Field notes", group: "B", status: "Pending" },
  { id: "r3", name: "Archive scan", group: "A", status: "Ready" },
  { id: "r4", name: "Follow-up review", group: "B", status: "Pending" },
]
let table
let summary
const columns = [
  { key: "name", title: "Record" },
  { key: "group", title: "Group" },
  {
    key: "status",
    title: "Status",
    type: "badge",
    tone: (value) => (value === "Ready" ? "success" : "warning"),
  },
  {
    key: "open",
    title: "Inspect",
    type: "button",
    action: async (row) => {
      selected = row.name
      await refresh()
      await views.select("summary")
    },
  },
]
const visible = () => rows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()))
const text = () => ({
  source: `**Selected record:** ${selected}\n\nThis tab remains mounted. The table's sorting and filter state survive data updates and tab changes.`,
})
async function refresh() {
  if (table) await table.update({ data: visible(), columns, pageSize: 3 })
  if (summary) await summary.update(text())
  stats.update([
    { label: "Records shown", value: visible().length, note: `of ${rows.length} supplied records` },
    { label: "Selected", value: selected },
    { label: "Themes", value: 3, note: "Shared tokens" },
  ])
}
const search = Atelier.field(cell.controls, {
  label: "Record search",
  type: "search",
  value: query,
  onChange: (value) => {
    query = value
    void refresh()
  },
})
Atelier.field(cell.controls, {
  label: "Local draft note",
  type: "textarea",
  value: "",
  description: "This draft stays when switching tabs.",
})
Atelier.button(
  "Clear search",
  () => {
    query = ""
    search.value = ""
    return refresh()
  },
  cell.controls,
  { variant: "ghost" }
)
const views = Atelier.tabs(cell.view, {
  label: "Record views",
  items: [
    {
      id: "records",
      label: "Records",
      render: (panel) => {
        table = Atelier.mount("table", panel, { data: visible(), columns, pageSize: 3 })
        return table
      },
    },
    {
      id: "summary",
      label: "Selected record",
      render: (panel) => {
        summary = Atelier.mount("markdown", panel, text())
        return summary
      },
    },
  ],
})
const actions = Atelier.toolbar(intro.header, { label: "Workspace actions" })
Atelier.button(
  "Export records",
  () => Atelier.download("records.json", JSON.stringify(rows, null, 2)),
  actions,
  { variant: "primary" }
)
Atelier.button(
  "Save local draft",
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 250))
  },
  actions,
  { busyLabel: "Saving…" }
)
await views.ready
