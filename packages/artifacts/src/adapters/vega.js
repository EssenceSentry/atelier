import { vegaConfig } from "@atelier/theme/vega"
import * as vega from "vega"
import embed from "vega-embed"
import * as vegaLite from "vega-lite"

const A = globalThis.Atelier
A.register(
  "vega",
  async (host, options, ctx) => {
    let result
    let current = options
    let fitted = false
    const render = async (next) => {
      current = next
      result?.finalize()
      const t = ctx.tokens()
      const config = { ...vegaConfig(t), background: t.surface }
      let spec =
        typeof next.spec === "function"
          ? next.spec(t, host.clientWidth, ctx.size().height)
          : next.spec
      if (!spec) throw new Error("vega needs {spec: a Vega or Vega-Lite specification}")
      fitted =
        (next.fit ?? ctx.fit) &&
        !spec.encoding?.row &&
        !spec.encoding?.column &&
        !["concat", "hconcat", "vconcat", "facet", "repeat"].some((key) => spec[key])
      if (fitted) {
        const size = ctx.size()
        spec = {
          ...spec,
          width: Math.max(100, size.width),
          height: Math.max(100, size.height),
          autosize: { type: "fit", contains: "padding", resize: true },
        }
      }
      if (Array.isArray(spec.data?.values) && !spec.data.values.length) {
        result = null
        host.replaceChildren(
          ctx.element(
            "div",
            "at-empty",
            next.emptyMessage ?? "No records match the current filters."
          )
        )
        return
      }
      result = await embed(host, spec, {
        actions: false,
        renderer: "svg",
        ast: true,
        ...next.embed,
        config: { ...config, ...next.embed?.config },
      })
      if (ctx.signal.aborted) {
        result.finalize()
        return
      }
      for (const [name, callback] of Object.entries(next.signals ?? {}))
        result.view.addSignalListener(name, callback)
      next.onView?.(result.view)
    }
    await render(options)
    return {
      update: render,
      resize: () => {
        if (fitted && result) {
          const size = ctx.size()
          return result.view
            .width(Math.max(100, size.width))
            .height(Math.max(100, size.height))
            .resize()
            .runAsync()
        }
        return typeof current.spec === "function"
          ? render(current)
          : result?.view.resize().runAsync()
      },
      destroy: () => result?.finalize(),
      api: {
        snapshot: () => {
          const { onView: _onView, signals: _signals, ...visual } = current
          return {
            ...visual,
            spec:
              typeof current.spec === "function"
                ? current.spec(ctx.tokens(), host.clientWidth)
                : current.spec,
          }
        },
        get view() {
          return result?.view
        },
      },
    }
  },
  { vega, vegaLite, embed }
)
