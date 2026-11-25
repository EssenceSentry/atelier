const book = Atelier.notebook({
  title: "Interactive geometry",
  description: "Drag a vertex or adjust the scale. All calculations are local.",
})
const cell = book.cell({ id: "construction", title: "Triangle construction", controls: true })
let scale = 1
let points
const scene = Atelier.mount("geometry", cell.view, {
  board: { axis: false, boundingbox: [-5, 4, 5, -4] },
  setup(board, t) {
    points = [
      [-2, -1],
      [2, -1],
      [0, 2],
    ].map((p, i) =>
      board.create("point", p, {
        name: ["A", "B", "C"][i],
        size: 4,
        fillColor: t.series[0],
        strokeColor: t.ink,
        label: { strokeColor: t.ink },
      })
    )
    board.create("polygon", points, {
      fillColor: t.series[0],
      fillOpacity: 0.12,
      borders: { strokeColor: t.primary },
    })
  },
})
await scene.ready
Atelier.field(cell.controls, {
  label: "Construction scale",
  type: "range",
  min: 0.5,
  max: 1.5,
  step: 0.1,
  value: 1,
  onChange: (value) => {
    scale = value
    ;[
      [-2, -1],
      [2, -1],
      [0, 2],
    ].forEach((p, i) => {
      points[i].moveTo(p.map((x) => x * scale))
    })
  },
})
