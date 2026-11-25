const A = globalThis.Atelier
A.register("viewer", (host, options, ctx) => {
  const url = new URL(options.url)
  if (url.protocol !== "https:") throw new Error("External viewers require an HTTPS URL")
  host.append(
    ctx.element(
      "p",
      "at-note",
      options.description ??
        "External application. This viewer may download models and data from its own service."
    )
  )
  const link = ctx.element("a", "at-button", "Open original application")
  link.href = url.href
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  host.append(link)
  ctx.button(
    "Load external viewer",
    (button) => {
      const frame = ctx.element("iframe", "at-canvas")
      frame.title = options.title ?? "External visualization"
      frame.src = url.href
      frame.referrerPolicy = "no-referrer"
      frame.allowFullscreen = true
      host.append(frame)
      button.remove()
    },
    host
  )
  return { theme() {} }
})
