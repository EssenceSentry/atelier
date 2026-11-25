import * as core from "@deck.gl/core"
import * as layers from "@deck.gl/layers"

const A = globalThis.Atelier
A.register(
  "deck",
  (host, initial, ctx) => {
    const area = ctx.element("div", "at-canvas")
    host.append(area)
    const deck = new core.Deck({
      parent: area,
      controller: true,
      views: new core.OrthographicView(),
      initialViewState: { target: [0, 0, 0], zoom: 0 },
      ...initial.deck,
      layers: [],
    })
    const render = (options) =>
      deck.setProps({
        ...options.deck,
        layers:
          typeof options.layers === "function"
            ? options.layers(layers, ctx.tokens())
            : options.layers,
      })
    render(initial)
    return {
      update: render,
      resize: () => deck.setProps({ width: "100%", height: "100%" }),
      destroy: () => deck.finalize(),
      api: { deck },
    }
  },
  { ...core, ...layers }
)
