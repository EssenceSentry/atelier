import Panzoom from "@panzoom/panzoom"
import mermaid from "mermaid"

const A = globalThis.Atelier
let serial = Promise.resolve()
A.register(
  "mermaid",
  async (host, options, ctx) => {
    const tools = ctx.element("div", "at-toolbar")
    const viewport = ctx.element("div", "at-canvas")
    viewport.tabIndex = 0
    viewport.setAttribute(
      "aria-label",
      options.label ?? "Diagram canvas. Focus to zoom with the wheel; drag to pan."
    )
    const drawing = ctx.element("div")
    viewport.append(drawing)
    host.append(viewport)
    ;(options.controls ?? host).prepend(tools)
    let pan
    let current = options
    let bounds = { width: viewport.clientWidth, height: viewport.clientHeight }
    const state = () => pan && { ...pan.getPan(), scale: pan.getScale() }
    const fit = () => {
      const box = drawing.querySelector("svg")?.viewBox.baseVal
      if (!box || !pan) return
      const scale = Math.min(
        (viewport.clientWidth - 32) / box.width,
        (viewport.clientHeight - 32) / box.height,
        1
      )
      pan.zoom(scale, { animate: false, force: true })
      pan.pan(
        (viewport.clientWidth / scale - box.width) / 2,
        (viewport.clientHeight / scale - box.height) / 2,
        { animate: false, force: true }
      )
    }
    ctx.button("Zoom in", () => pan?.zoomIn(), tools)
    ctx.button("Zoom out", () => pan?.zoomOut(), tools)
    ctx.button("Fit diagram", fit, tools)
    const render = (next) => {
      const saved = next.viewport ?? (current.source === next.source ? state() : null)
      current = next
      const task = serial
        .catch(() => {})
        .then(async () => {
          const t = ctx.tokens()
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            suppressErrorRendering: true,
            theme: "base",
            fontFamily: t.font,
            themeVariables: {
              background: t.surface,
              primaryColor: t.surface,
              primaryTextColor: t.ink,
              primaryBorderColor: t.primary,
              lineColor: t.text,
              secondaryColor: t.surface,
              tertiaryColor: t.surface,
              edgeLabelBackground: t.surface,
              actorBkg: t.surface,
              actorBorder: t.border,
              actorTextColor: t.ink,
              signalColor: t.ink,
              signalTextColor: t.ink,
            },
            flowchart: { htmlLabels: false },
          })
          const result = await mermaid.render(`at-mermaid-${crypto.randomUUID()}`, next.source)
          if (ctx.signal.aborted) return
          pan?.destroy()
          // Mermaid emits sanitized SVG under strict security; source HTML is never inserted.
          drawing.innerHTML = result.svg
          const svg = drawing.querySelector("svg")
          svg.style.removeProperty("max-width")
          drawing.style.width = `${svg.viewBox.baseVal.width}px`
          drawing.style.height = `${svg.viewBox.baseVal.height}px`
          const box = svg.viewBox.baseVal
          const scale =
            saved?.scale ??
            Math.min(
              1,
              Math.max(
                0.9,
                Math.min(
                  (viewport.clientWidth - 32) / box.width,
                  (viewport.clientHeight - 32) / box.height
                )
              )
            )
          pan = Panzoom(drawing, {
            minScale: 0.05,
            maxScale: 8,
            canvas: true,
            origin: "0 0",
            startScale: scale,
            startX: saved?.x ?? 16 / scale,
            startY: saved?.y ?? 16 / scale,
          })
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
          bounds = { width: viewport.clientWidth, height: viewport.clientHeight }
        })
      serial = task
      return task
    }
    ctx.on(
      viewport,
      "wheel",
      (event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          document.activeElement === viewport ||
          host.classList.contains("at-canvas-only")
        )
          pan?.zoomWithWheel(event)
      },
      { passive: false }
    )
    await render(options)
    return {
      update: render,
      resize: () => {
        const next = { width: viewport.clientWidth, height: viewport.clientHeight }
        if (!pan || !next.width || !next.height) return
        const saved = state()
        pan.pan(
          saved.x + (next.width - bounds.width) / (2 * saved.scale),
          saved.y + (next.height - bounds.height) / (2 * saved.scale),
          { animate: false, force: true }
        )
        bounds = next
      },
      destroy: () => {
        pan?.destroy()
        tools.remove()
      },
      api: {
        get panzoom() {
          return pan
        },
        snapshot: () => {
          const { controls: _controls, ...visual } = current
          return { ...visual, viewport: state() }
        },
      },
    }
  },
  { mermaid, Panzoom }
)
