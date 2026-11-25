import * as SandDance from "@msrvida/sanddance"

const A = globalThis.Atelier
const { vega } = A.modules.vega
// SandDance's own Vega view uses generated functions, so its browser profile
// declares the eval capability. Declarative Vega recipes use the interpreter.
SandDance.use(vega)
A.register(
  "sanddance",
  async (host, initial, ctx) => {
    const area = ctx.element("div", "at-canvas")
    area.style.setProperty("--at-canvas-height", `${initial.height ?? 500}px`)
    host.append(area)
    const legend = ctx.element("div", "at-toolbar")
    host.append(legend)
    let current = initial
    const viewer = new SandDance.Viewer(area, {
      onSelectionChanged: (search, index, rows) => current.onSelection?.(rows ?? [], search, index),
      ...initial.viewer,
    })
    const render = async (options) => {
      current = options
      const t = ctx.tokens()
      legend.replaceChildren()
      const field = options.insight?.columns?.color
      const values = [
        ...new Set(options.data.map((row) => row[field]).filter((value) => value !== undefined)),
      ].sort()
      if (field && values.length && typeof values[0] !== "number") {
        if (values.length > t.series.length)
          throw new Error(
            "SandDance supports six categorical colour slots. Group or filter additional categories."
          )
        values.forEach((value, index) => {
          const label = ctx.element("span", "at-note", value)
          const swatch = ctx.element("span")
          swatch.style.cssText = `display:inline-block;width:10px;height:10px;margin-right:6px;background:${t.series[index]}`
          label.prepend(swatch)
          legend.append(label)
        })
      } else if (field && values.length)
        legend.append(
          ctx.element(
            "span",
            "at-note",
            `${field}: ${Math.min(...values)} — ${Math.max(...values)}`
          )
        )
      viewer.options.fontFamily = t.font
      viewer.options.colors = {
        backgroundColor: t.surface,
        defaultCube: t.series[0],
        activeCube: t.primary,
        hoveredCube: t.ink,
        selectedCube: t.primary,
        axisLine: t.axis,
        axisText: t.text,
        gridLine: t.grid,
      }
      vega.scheme("atelier-artifact", t.series)
      const insight = {
        chart: "scatterplot",
        view: "3d",
        scheme: "atelier-artifact",
        hideLegend: false,
        ...options.insight,
        size: { width: area.clientWidth, height: area.clientHeight },
      }
      const result = await viewer.render(
        {
          insight,
          setup: { transitionDurations: { position: 0, stagger: 0, view: 0 }, ...options.setup },
        },
        options.data
      )
      if (result.specResult.errors?.length) throw new Error(result.specResult.errors.join(" · "))
    }
    await render(initial)
    return {
      update: render,
      resize: () => render(current),
      destroy: () => viewer.finalize(),
      api: {
        viewer,
        snapshot: () => ({
          ...current,
          setup: { ...current.setup, camera: viewer.getCamera(true) },
        }),
      },
    }
  },
  { SandDance }
)
