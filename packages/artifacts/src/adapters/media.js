import Panzoom from "@panzoom/panzoom"

const A = globalThis.Atelier
A.register(
  "media",
  (host, options, ctx) => {
    let current = options
    let cleanup = () => {}
    const render = (next) => {
      current = next
      cleanup()
      host.replaceChildren()
      const controls = next.controls ? ctx.element("div", "at-stack") : host
      if (next.controls) next.controls.append(controls)
      const removeControls = () => {
        if (next.controls) controls.remove()
      }
      if (next.type === "audio" || next.type === "video") {
        const player = ctx.element(next.type)
        player.controls = true
        player.src = next.src
        player.preload = "metadata"
        player.style.width = "100%"
        if (next.track) {
          const track = ctx.element("track")
          Object.assign(track, next.track)
          player.append(track)
        }
        host.append(player)
        cleanup = () => {
          removeControls()
          player.pause()
          player.removeAttribute("src")
          player.load()
        }
      } else if (next.type === "compare") {
        const viewport = ctx.element("div", "at-compare")
        const before = ctx.element("img")
        before.src = next.before
        before.alt = next.beforeAlt ?? "Before"
        const after = ctx.element("img")
        after.src = next.after
        after.alt = next.afterAlt ?? "After"
        viewport.append(before, after)
        host.append(viewport)
        const apply = (value) => {
          current = { ...current, position: value }
          after.style.clipPath = `inset(0 0 0 ${value}%)`
          next.onChange?.(value)
        }
        ctx.field(controls, {
          label: next.label ?? "Image comparison position",
          type: "range",
          min: 0,
          max: 100,
          value: next.position ?? 50,
          onChange: apply,
        })
        apply(next.position ?? 50)
        cleanup = removeControls
      } else {
        const area = ctx.element("div", "at-canvas")
        const image = ctx.element("img")
        image.src = next.src
        image.alt = next.alt ?? "Image"
        image.style.cssText = "width:100%;height:100%;object-fit:contain"
        area.append(image)
        host.append(area)
        const pan = Panzoom(image, { maxScale: 10, minScale: 0.5, canvas: true })
        const wheel = (event) => {
          if (event.ctrlKey || event.metaKey) pan.zoomWithWheel(event)
        }
        area.addEventListener("wheel", wheel, { passive: false })
        const tools = ctx.element("div", "at-toolbar")
        ctx.button("Zoom in", () => pan.zoomIn(), tools)
        ctx.button("Zoom out", () => pan.zoomOut(), tools)
        ctx.button("Reset image", () => pan.reset(), tools)
        controls.append(tools)
        cleanup = () => {
          removeControls()
          area.removeEventListener("wheel", wheel)
          pan.destroy()
        }
      }
    }
    render(options)
    return {
      update: render,
      theme() {},
      destroy: () => cleanup(),
      api: {
        snapshot: () => {
          const { controls: _controls, onChange: _onChange, ...visual } = current
          return visual
        },
      },
    }
  },
  { Panzoom }
)
