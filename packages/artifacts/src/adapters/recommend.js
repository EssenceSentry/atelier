import cql from "compassql/build/compassql.js"

const A = globalThis.Atelier
A.register(
  "recommend",
  async (host, initial, ctx) => {
    let generation = 0
    const tools = ctx.element("div", "at-toolbar")
    const plot = ctx.element("div", "at-recommend-plot")
    const explanation = ctx.element(
      "p",
      "at-note",
      "CompassQL ranks encodings by effectiveness; this is not a statistical finding about the data."
    )
    host.append(tools, explanation, plot)
    let chart
    let selected
    const render = async (next) => {
      const revision = ++generation
      tools.replaceChildren()
      const schema = cql.schema.build(next.data)
      const query = next.query ?? {
        spec: {
          mark: "?",
          encodings: next.fields
            .slice(0, 2)
            .map((field) => ({ ...field, channel: { enum: ["x", "y"] } })),
        },
        orderBy: "effectiveness",
      }
      const result = cql.recommend(query, schema).result
      const specs = []
      const choices = []
      cql.result.mapLeaves(result, (model) => {
        const spec = model.toSpec()
        if (spec) specs.push(spec)
        return null
      })
      const show = async (spec, notify = true) => {
        if (revision !== generation || ctx.signal.aborted) return
        selected = notify ? spec : undefined
        for (const choice of choices) {
          const active = notify && choice.spec === spec
          choice.node.setAttribute("aria-pressed", String(active))
          choice.node.dataset.variant = active ? "primary" : "secondary"
        }
        // Selection is immediate; a slower preview must not overwrite later input.
        if (notify) next.onSelect?.(spec)
        const config = {
          spec: { ...spec, data: { values: next.data }, width: "container", height: 300 },
        }
        if (chart) await chart.update(config)
        else {
          plot.replaceChildren()
          chart = A.mount("vega", plot, config)
          await chart.ready
        }
      }
      specs.slice(0, next.limit ?? 6).forEach((spec, index) => {
        const label = (field) =>
          next.fields?.find((item) => item.field === field)?.label ?? field ?? "Count"
        const caption = `${label(spec.encoding?.x?.field)} / ${label(spec.encoding?.y?.field)}`
        const node = ctx.button(`${spec.mark} · ${caption}`, () => show(spec), tools)
        node.setAttribute("aria-label", `${spec.mark} · option ${index + 1}: ${caption}`)
        choices.push({ spec, node })
      })
      if (!specs.length) {
        await chart?.destroy()
        chart = null
        selected = undefined
        plot.replaceChildren(
          ctx.element(
            "p",
            "at-empty",
            "No recommendations match these assignments. Try Auto mark or choose other fields."
          )
        )
        return
      }
      await show(specs[0], next.selectFirst !== false)
    }
    await render(initial)
    return {
      update: render,
      theme() {},
      resize: () => chart?.resize(),
      destroy: () => chart?.destroy(),
      api: {
        get selected() {
          return selected
        },
        recommend: cql.recommend,
      },
    }
  },
  { cql }
)
