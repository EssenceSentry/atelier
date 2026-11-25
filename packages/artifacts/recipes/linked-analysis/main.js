const rows = Array.from({ length: 60 }, (_, i) => ({
  id: `row-${i + 1}`,
  group: ["A", "B", "C"][i % 3],
  score: ((i * 17) % 100) / 100,
  volume: 30 + ((i * 31) % 200),
}))
const book = Atelier.notebook({
  title: "Linked analysis",
  description: "Synthetic example rows. Replace rows with your evidence.",
})
const cell = book.cell({ id: "overview", title: "Score and volume", controls: true })
const tableCell = book.cell({ id: "records", title: "Selected records" })
const table = Atelier.mount("table", tableCell.view, {
  data: rows,
  columns: [
    { key: "id", title: "Record" },
    { key: "group", title: "Group" },
    { key: "score", title: "Score" },
    { key: "volume", title: "Volume" },
  ],
})
const draw = (group = "All") => {
  const visible = group === "All" ? rows : rows.filter((row) => row.group === group)
  return {
    spec: {
      data: { values: visible },
      width: "container",
      height: 340,
      params: [{ name: "brush", select: "interval" }],
      mark: { type: "point", filled: true },
      encoding: {
        x: { field: "score", type: "quantitative" },
        y: { field: "volume", type: "quantitative" },
        color: { field: "group", type: "nominal" },
        tooltip: [{ field: "id" }, { field: "score" }],
      },
    },
    signals: {
      brush: async (_name, value) => {
        const chosen =
          value.score && value.volume
            ? visible.filter(
                (row) =>
                  row.score >= value.score[0] &&
                  row.score <= value.score[1] &&
                  row.volume >= value.volume[0] &&
                  row.volume <= value.volume[1]
              )
            : visible
        await table.update({
          data: chosen,
          columns: [
            { key: "id", title: "Record" },
            { key: "group", title: "Group" },
            { key: "score", title: "Score" },
            { key: "volume", title: "Volume" },
          ],
        })
      },
    },
  }
}
const chart = Atelier.mount("vega", cell.view, draw())
Atelier.field(cell.controls, {
  label: "Group",
  value: "All",
  options: ["All", "A", "B", "C"],
  onChange: async (value) => {
    await chart.update(draw(value))
    const data = value === "All" ? rows : rows.filter((row) => row.group === value)
    await table.update({
      data,
      columns: [
        { key: "id", title: "Record" },
        { key: "group", title: "Group" },
        { key: "score", title: "Score" },
        { key: "volume", title: "Volume" },
      ],
    })
  },
})
await Promise.all([chart.ready, table.ready])
