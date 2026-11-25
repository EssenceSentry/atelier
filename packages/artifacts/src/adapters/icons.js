import catalog from "../icon-catalog.json"

const A = globalThis.Atelier
const themedIcons = new Map()
function svg(id) {
  const item = catalog.find((icon) => icon.id === id)
  if (!item) throw new Error(`Unknown bundled icon: ${id}. Inspect Atelier.modules.icons.catalog.`)
  if (item.svg) return item.svg
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${item.icon.width ?? 24} ${item.icon.height ?? 24}">${item.icon.body}</svg>`
}
function url(id, { optional = false } = {}) {
  if (optional && !catalog.some((icon) => icon.id === id)) return undefined
  const source = svg(id)
  const value = `data:image/svg+xml,${encodeURIComponent(source.replaceAll("currentColor", A.tokens().ink))}`
  if (source.includes("currentColor")) themedIcons.set(value, id)
  return value
}
function refreshURL(value) {
  return themedIcons.has(value) ? url(themedIcons.get(value)) : value
}
A.register(
  "icons",
  (host, options, ctx) => {
    const render = (next) => {
      host.replaceChildren()
      const image = ctx.element("img")
      image.src = url(next.id)
      image.alt = next.label ?? next.id
      image.style.width = `${next.size ?? 48}px`
      image.style.height = `${next.size ?? 48}px`
      host.append(image)
    }
    render(options)
    return { update: render }
  },
  { catalog, svg, url, refreshURL }
)
