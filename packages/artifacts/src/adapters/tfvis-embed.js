import { vegaConfig } from "@atelier/theme/vega"

// tfjs-vis keeps its public render API; the shared Vega pack supplies a modern,
// themed embed implementation rather than shipping its legacy chart runtime.
const plots = new Map()
export function finalizePlots(host) {
  for (const [target, result] of plots) {
    if (!target.isConnected || target === host || host?.contains(target)) {
      result.finalize()
      plots.delete(target)
    }
  }
}
export default async function embed(element, spec, options) {
  // tfjs-vis can replace its draw-area node on a redraw. Release the detached
  // view as well as views whose target is reused, including after resizes.
  finalizePlots()
  const t = globalThis.Atelier.tokens()
  const target = typeof element === "string" ? document.querySelector(element) : element
  plots.get(target)?.finalize()
  const result = await globalThis.Atelier.modules.vega.embed(element, spec, {
    ...options,
    renderer: "svg",
    ast: true,
    config: vegaConfig(t),
  })
  if (target.isConnected) plots.set(target, result)
  else result.finalize()
  return result
}
