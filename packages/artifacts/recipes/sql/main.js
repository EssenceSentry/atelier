const book = Atelier.notebook({
  title: "Local SQL notebook",
  description:
    "DuckDB runs in a browser worker. Synthetic rows are bundled here; no database server is connected.",
})
const cell = book.cell({ id: "query", title: "Aggregate observations" })
const data = Array.from({ length: 90 }, (_, i) => ({
  region: ["A", "B", "C"][i % 3],
  score: ((i * 17) % 100) / 100,
}))
const query = Atelier.mount("sql", cell.view, {
  tables: { observations: data },
  source:
    "SELECT region, count(*) AS records, round(avg(score),3) AS mean_score\nFROM observations\nGROUP BY region\nORDER BY mean_score DESC;",
})
await query.ready
