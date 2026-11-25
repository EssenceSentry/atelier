import * as tf from "@tensorflow/tfjs"
import * as tfvis from "@tensorflow/tfjs-vis"
import * as dense from "../neural-model"
import { finalizePlots } from "./tfvis-embed"

const A = globalThis.Atelier
A.register(
  "neural",
  async (host, options, ctx) => {
    await tf.setBackend(options.backend ?? "cpu")
    await tf.ready()
    let config = { ...dense.nnDefaults, ...options.config }
    let runtime = dense.createNN(
      config,
      options.bundle ? dense.validateBundle(options.bundle) : undefined
    )
    const summary = ctx.element("p", "at-note")
    const area = ctx.element("div")
    const architecture = ctx.element("div")
    const history = ctx.element("div")
    host.append(summary, architecture, area, history)
    let snapshot
    let stopped = false
    let training
    let chart
    const refresh = async () => {
      snapshot = runtime.snapshot()
      const metrics = dense.evaluate(snapshot, options.threshold ?? 0.5)
      summary.textContent = `Epoch ${snapshot.epoch} · ${snapshot.params} parameters · validation accuracy ${(100 * metrics.accuracy).toFixed(1)}% · synthetic ${config.dataset} data`
      architecture.textContent = `Layers: ${[2, ...snapshot.layers.map((layer) => layer.output)].join(" → ")} · ${config.activation} hidden activation · sigmoid output`
      const spec = {
        data: {
          values: snapshot.points.map((point, index) => ({
            ...point,
            probability: snapshot.probabilities[index],
          })),
        },
        width: "container",
        height: 300,
        mark: { type: "point", filled: true, size: 80 },
        encoding: {
          x: { field: "x", type: "quantitative" },
          y: { field: "y", type: "quantitative" },
          color: { field: "probability", type: "quantitative", scale: { domain: [0, 1] } },
          shape: { field: "split", type: "nominal" },
          tooltip: [
            { field: "label" },
            { field: "probability", format: ".3f" },
            { field: "split" },
          ],
        },
      }
      if (chart) await chart.update({ spec })
      else {
        chart = A.mount("vega", area, { spec })
        await chart.ready
      }
      if (snapshot.history.length)
        await tfvis.show.history(history, snapshot.history, ["loss", "val_loss"], {
          width: Math.max(250, history.clientWidth - 20),
          height: 260,
          xLabel: "Epoch index (starts at 0)",
        })
      options.onSnapshot?.(snapshot)
      return snapshot
    }
    const step = async (epochs = 5) => {
      if (training) return training
      stopped = false
      training = (async () => {
        for (let index = 0; index < epochs && !stopped && !ctx.signal.aborted; index++)
          await runtime.step()
        if (!ctx.signal.aborted) return refresh()
      })()
      try {
        return await training
      } finally {
        training = null
      }
    }
    const controls = options.controls ?? ctx.element("div", "at-toolbar")
    if (!options.controls) host.prepend(controls)
    const ownButtons = [
      ctx.button("Train 20 epochs", () => step(20), controls),
      ctx.button("Step one epoch", () => step(1), controls),
      ctx.button(
        "Stop training",
        () => {
          stopped = true
        },
        controls
      ),
    ]
    await refresh()
    const update = async (next) => {
      stopped = true
      await training
      const nextConfig = { ...dense.nnDefaults, ...next.config }
      if (JSON.stringify(nextConfig) !== JSON.stringify(config) || next.bundle !== options.bundle) {
        runtime.dispose()
        config = nextConfig
        runtime = dense.createNN(
          config,
          next.bundle ? dense.validateBundle(next.bundle) : undefined
        )
        finalizePlots(history)
        history.replaceChildren()
      }
      options = next
      await refresh()
    }
    return {
      update,
      theme: refresh,
      resize: refresh,
      destroy: async () => {
        stopped = true
        await training
        await chart?.destroy()
        finalizePlots(host)
        runtime.dispose()
        for (const button of ownButtons) button.remove()
      },
      api: {
        get runtime() {
          return runtime
        },
        step,
        refresh,
        get snapshot() {
          return snapshot
        },
      },
    }
  },
  { tf, tfvis, ...dense }
)
A.register("tfvis", async (host, options) => {
  let current = options
  const render = async (next) => {
    current = next
    const fn = tfvis.render[next.renderer]
    if (!fn) throw new Error(`Unknown tfjs-vis renderer: ${next.renderer}`)
    await fn(host, next.data, { width: host.clientWidth - 20, height: 300, ...next.options })
  }
  await render(options)
  return { update: render, resize: () => render(current), destroy: () => finalizePlots(host) }
})
