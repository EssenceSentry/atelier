const book = Atelier.notebook({
  title: "Small neural network",
  description:
    "Real browser training on 240 synthetic XOR rows, with separate validation data. No server is required.",
})
const cell = book.cell({ id: "training", title: "Dense classifier", controls: true })
const diagnostics = book.cell({
  id: "diagnostics",
  title: "Validation confusion matrix",
  description:
    "Computed from the current network at threshold 0.5; rows are actual classes, columns are predicted classes.",
})
const predictions = book.cell({
  id: "predictions",
  title: "Validation predictions",
  description: "Held-out synthetic rows; probabilities come from the current weights.",
})
const columns = [
  { key: "id", title: "Row" },
  { key: "x", title: "x", format: (value) => value.toFixed(2) },
  { key: "y", title: "y", format: (value) => value.toFixed(2) },
  { key: "actual", title: "Actual class" },
  { key: "probability", title: "P(class 1)", format: (value) => value.toFixed(3) },
  { key: "prediction", title: "Predicted class" },
]
let predictionTable
let matrix
const view = Atelier.mount("neural", cell.view, {
  config: {
    dataset: "xor",
    depth: 2,
    width: 4,
    activation: "tanh",
    learningRate: 0.03,
    noise: 0.08,
    seed: 7,
  },
  controls: cell.controls,
  onSnapshot(snapshot) {
    const rows = []
    const values = [
      [0, 0],
      [0, 0],
    ]
    snapshot.points.forEach((point, index) => {
      if (point.split === "validation") {
        const probability = snapshot.probabilities[index]
        const prediction = probability >= 0.5 ? 1 : 0
        values[point.label][prediction]++
        rows.push({
          id: index + 1,
          x: point.x,
          y: point.y,
          actual: point.label,
          probability,
          prediction,
        })
      }
    })
    if (predictionTable) void predictionTable.update({ data: rows, columns, pageSize: 12 })
    else
      predictionTable = Atelier.mount("table", predictions.view, {
        data: rows,
        columns,
        pageSize: 12,
      })
    const options = {
      renderer: "confusionMatrix",
      data: { values, tickLabels: ["Negative", "Positive"] },
    }
    if (matrix) void matrix.update(options)
    else matrix = Atelier.mount("tfvis", diagnostics.view, options)
  },
})
await view.ready
Atelier.button(
  "Export weights",
  () => Atelier.download("network.json", JSON.stringify(view.api.runtime.export(), null, 2)),
  cell.controls
)
