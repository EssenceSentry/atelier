import { vegaConfig } from "@atelier/theme/vega"
// tfjs-vis 1.5.1 generates Vega-Lite specs but does not expose embed configuration.
// Keep its renderers, and theme only the charts inside our diagnostic panels.

import { readVizTokens } from "@atelier/theme/viz"
import type { EmbedOptions, Result, VisualizationSpec } from "vega-embed"
import embed from "../../../../node_modules/vega-embed/build/embed.js"

const plots = new Map<HTMLElement, { host: HTMLElement; result: Result }>()
const requests = new WeakMap<HTMLElement, object>()
export function finalizeNeuralPlots(host: HTMLElement) {
  for (const [element, plot] of plots) {
    if (plot.host === host) {
      plot.result.finalize()
      plots.delete(element)
    }
  }
}
export default async function themedEmbed(
  element: HTMLElement | string,
  spec: VisualizationSpec,
  options?: EmbedOptions
) {
  const target =
    typeof element === "string" ? document.querySelector<HTMLElement>(element) : element
  const host = target?.closest<HTMLElement>(".nn-tfvis")
  if (!target || !host) return embed(element, spec, options)
  const request = {}
  requests.set(target, request)
  plots.get(target)?.result.finalize()
  plots.delete(target)
  const t = readVizTokens()
  // tfjs-vis 1.5.1's linechart ignores supplied x values and uses array indices.
  // Our recorded epochs start at 1, so restore that meaning before rendering.
  const indexed = spec as VisualizationSpec & { data?: { values?: { x: number }[] } }
  const chart =
    host.dataset.testid === "nn-loss" && Array.isArray(indexed.data?.values)
      ? ({
          ...spec,
          data: {
            ...indexed.data,
            values: indexed.data.values.map((row) => ({ ...row, x: row.x + 1 })),
          },
        } as VisualizationSpec)
      : spec
  const result = await embed(element, chart, {
    ...options,
    renderer: "svg",
    config: vegaConfig(t),
  })
  if (!host.isConnected || requests.get(target) !== request) result.finalize()
  else plots.set(target, { host, result })
  return result
}
export type * from "../../../../node_modules/vega-embed/build/embed.js"
