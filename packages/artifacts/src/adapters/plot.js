import * as Plot from "@observablehq/plot"

const A = globalThis.Atelier
A.register(
  "plot",
  (host, options, ctx) => {
    let current = options
    const render = (next) => {
      current = next
      const t = ctx.tokens()
      const config =
        typeof next.options === "function" ? next.options(Plot, t, host.clientWidth) : next.options
      host.replaceChildren(
        Plot.plot({
          width: host.clientWidth,
          color: { range: t.series, legend: true },
          ...config,
          style:
            typeof config?.style === "string"
              ? config.style
              : {
                  background: t.surface,
                  color: t.text,
                  fontFamily: t.labelFont,
                  fontSize: "12px",
                  ...config?.style,
                },
        })
      )
    }
    render(options)
    return { update: render, resize: () => render(current) }
  },
  { Plot }
)
