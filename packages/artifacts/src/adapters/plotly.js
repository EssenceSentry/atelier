import Plotly from "plotly.js-dist-min"

const A = globalThis.Atelier
A.register(
  "plotly",
  async (host, options, ctx) => {
    let current = options
    const render = async (next) => {
      current = next
      const t = ctx.tokens()
      const axis = { color: t.text, gridcolor: t.grid, zerolinecolor: t.axis }
      await Plotly.react(
        host,
        next.data.map((trace) =>
          ["surface", "heatmap", "contour", "mesh3d"].includes(trace.type)
            ? {
                colorscale:
                  trace.cmid === 0
                    ? [
                        [0, t.divNeg],
                        [0.5, t.divMid],
                        [1, t.divPos],
                      ]
                    : [
                        [0, t.rampLow],
                        [0.5, t.series[0]],
                        [1, t.ink],
                      ],
                ...trace,
              }
            : trace
        ),
        {
          autosize: true,
          height: host.classList.contains("at-canvas-only")
            ? innerHeight - 24
            : (next.height ?? (ctx.fit ? Math.max(160, ctx.size().height) : 450)),
          paper_bgcolor: t.surface,
          plot_bgcolor: t.surface,
          colorway: t.series,
          font: { family: t.font, color: t.ink },
          xaxis: axis,
          yaxis: axis,
          scene: { bgcolor: t.surface, xaxis: axis, yaxis: axis, zaxis: axis },
          uirevision: "atelier",
          margin: { t: 28, r: 24, b: 56, l: 64 },
          ...next.layout,
        },
        { responsive: false, displaylogo: false, ...next.config }
      )
      if (ctx.signal.aborted) Plotly.purge(host)
    }
    await render(options)
    if (options.onClick) host.on("plotly_click", options.onClick)
    return {
      update: render,
      resize: () =>
        ctx.fit
          ? Plotly.relayout(host, {
              height: Math.max(160, ctx.size().height),
              width: ctx.size().width,
            })
          : Plotly.Plots.resize(host),
      destroy: () => Plotly.purge(host),
      api: { Plotly, host, snapshot: () => current },
    }
  },
  { Plotly }
)
