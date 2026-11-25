const book = Atelier.notebook({
  title: "Scientific figures",
  description: "Analytic functions, not measured observations.",
})
const cell = book.cell({ id: "surface", title: "Damped radial wave", controls: true })
let frequency = 1.2
const x = Array.from({ length: 35 }, (_, i) => -4 + (i * 8) / 34)
const value = (x, y) => Math.cos(frequency * Math.hypot(x, y)) * Math.exp(-(x * x + y * y) / 18)
const draw = () => ({
  data: [
    {
      type: "surface",
      x,
      y: x,
      z: x.map((y) => x.map((point) => value(point, y))),
      cmin: -1,
      cmax: 1,
      cmid: 0,
      colorbar: { thickness: 9, len: 0.65, tickvals: [-1, 0, 1] },
    },
  ],
  layout: {
    scene: {
      xaxis: { title: { text: "x" } },
      yaxis: { title: { text: "y" } },
      zaxis: { title: { text: "f(x,y)" } },
    },
  },
})
const chart = Atelier.mount("plotly", cell.view, draw())
const line = book.cell({ id: "section", title: "Cross section at y = 0" })
const section = {
  options: (Plot, t, width) => ({
    width,
    marks: [
      Plot.lineY(
        x.map((x) => ({ x, y: value(x, 0) })),
        { x: "x", y: "y", stroke: t.series[0] }
      ),
    ],
    x: { label: "x" },
    y: { label: "f(x, 0)", domain: [-1, 1], grid: true },
  }),
}
const slice = Atelier.mount("plot", line.view, section)

Atelier.field(cell.controls, {
  label: "Frequency",
  type: "range",
  min: 0.2,
  max: 3,
  step: 0.1,
  value: frequency,
  onChange: (value) => {
    frequency = value
    void chart.update(draw())
    void slice.update(section)
  },
})
await chart.ready
Atelier.canvasLink(chart, draw(), { parent: cell.controls })
