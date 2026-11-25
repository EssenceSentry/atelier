const book = Atelier.notebook({
  title: "Unit-level exploration",
  description: "Each block represents one synthetic record.",
})
const cell = book.cell({ id: "units", title: "Arrange individual records", controls: true })
const data = Array.from({ length: 240 }, (_, i) => ({
  id: `r-${i}`,
  x: Math.sin(i) * 50,
  y: Math.cos(i * 1.7) * 50,
  z: i % 30,
  group: ["A", "B", "C"][i % 3],
}))
let chart = "scatterplot",
  x = "x",
  y = "y",
  z = "z",
  color = "group"
const draw = () => ({
  data,
  insight: { chart, view: "3d", columns: { uid: "id", x, y, z, color } },
})
const view = Atelier.mount("sanddance", cell.view, draw())
Atelier.field(cell.controls, {
  label: "Layout",
  value: chart,
  options: ["scatterplot", "stacks", "grid", "treemap"],
  onChange: (value) => {
    chart = value
    void view.update(draw())
  },
})
for (const channel of ["x", "y", "z", "color"])
  Atelier.field(cell.controls, {
    label: `${channel} dimension`,
    value: channel === "color" ? color : channel,
    options: channel === "color" ? ["group", "x", "y", "z"] : ["x", "y", "z"],
    onChange: (value) => {
      if (channel === "x") x = value
      if (channel === "y") y = value
      if (channel === "z") z = value
      if (channel === "color") color = value
      void view.update(draw())
    },
  })
await view.ready
Atelier.canvasLink(view, draw(), { parent: cell.controls })
