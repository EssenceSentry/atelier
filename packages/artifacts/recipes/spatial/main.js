const book = Atelier.notebook({
  title: "Spatial layers",
  description: "Synthetic coordinates, in local units.",
})
const cell = book.cell({ id: "points", title: "Local point cloud", controls: true })
const data = Array.from({ length: 2000 }, (_, i) => ({
  position: [Math.sin(i * 3.1) * 100, Math.cos(i * 2.3) * 100],
  radius: 2 + (i % 4),
}))
let radius = 1
const draw = () => ({
  layers: (layers, t) => [
    new layers.ScatterplotLayer({
      id: "points",
      data,
      getPosition: (d) => d.position,
      getRadius: (d) => d.radius * radius,
      getFillColor: [...t.series[0].match(/\d+/g).slice(0, 3).map(Number), 180],
      pickable: true,
    }),
  ],
  deck: {
    initialViewState: { target: [0, 0, 0], zoom: 1 },
    getTooltip: ({ object }) => (object ? `Position ${object.position.join(", ")}` : null),
  },
})
const chart = Atelier.mount("deck", cell.view, draw())
Atelier.field(cell.controls, {
  label: "Point radius",
  type: "range",
  min: 0.3,
  max: 3,
  step: 0.1,
  value: radius,
  onChange: (value) => {
    radius = value
    void chart.update(draw())
  },
})
await chart.ready
