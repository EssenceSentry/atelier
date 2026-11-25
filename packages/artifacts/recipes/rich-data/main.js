const book = Atelier.notebook({
  title: "Rich data inspection",
  description:
    "Synthetic records. Edits persist in this page session; export saves the current rows.",
})
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="currentColor"/><text x="20" y="50" fill="white">Example</text></svg>'
  )
const rows = Array.from({ length: 12 }, (_, i) => ({
  id: `r-${i + 1}`,
  image,
  status: "Pending",
  score: i / 12,
}))
const cell = book.cell({ id: "review", title: "Review records" })
const notice = Atelier.element("p", "at-note", "Choose a row to inspect its JSON.")
cell.view.append(notice)
const tableHost = Atelier.element("div")
cell.view.append(tableHost)
const jsonCell = book.cell({ id: "json", title: "Selected record" })
const json = Atelier.mount("json", jsonCell.view, { data: rows[0] })
const table = Atelier.mount("table", tableHost, {
  data: rows,
  columns: [
    { key: "image", title: "Preview", type: "image", altKey: "id" },
    { key: "id", title: "Record" },
    {
      key: "status",
      title: "Decision",
      type: "select",
      options: ["Pending", "Accepted", "Rejected"],
    },
    { key: "score", title: "Score" },
    {
      key: "inspect",
      title: "Inspect",
      type: "button",
      action: (row) => {
        notice.textContent = `Selected ${row.id}`
        void json.update({ data: row })
        book.go("json")
      },
    },
  ],
})
Atelier.button(
  "Export decisions",
  () => Atelier.download("decisions.json", JSON.stringify(table.api.rows, null, 2)),
  cell.header
)
const gridCell = book.cell({ id: "grid", title: "Spreadsheet editor" })
Atelier.mount("grid", gridCell.view, {
  data: rows.map(({ image, ...row }) => row),
  columns: [
    { id: "id", title: "Record", readonly: true },
    { id: "status", title: "Decision" },
    { id: "score", title: "Score" },
  ],
})
await Promise.all([table.ready, json.ready])
