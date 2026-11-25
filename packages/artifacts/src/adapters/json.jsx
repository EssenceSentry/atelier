import { JSONCrack, parseGraph } from "jsoncrack-react"
import "jsoncrack-react/style.css"

const A = globalThis.Atelier
A.register(
  "json",
  (host, options, ctx) => {
    const area = ctx.element("div", "at-canvas")
    const tools = ctx.element("div", "at-toolbar")
    host.append(tools, area)
    const root = A.ReactClient.createRoot(area)
    const ref = A.React.createRef()
    let current = options
    let bounds = { width: area.clientWidth, height: area.clientHeight }
    ctx.button("Zoom in", () => ref.current?.zoomIn(), tools)
    ctx.button("Zoom out", () => ref.current?.zoomOut(), tools)
    ctx.button("Fit JSON", () => ref.current?.centerView(), tools)
    const render = (next) => {
      current = next
      const source = JSON.stringify(next.data)
      if (source === undefined) throw new Error("json needs {data: a JSON value}")
      const t = ctx.tokens()
      const dark = getComputedStyle(document.documentElement).colorScheme === "dark"
      A.ReactDOM.flushSync(() =>
        root.render(
          <JSONCrack
            ref={ref}
            json={source}
            theme={dark ? "dark" : "light"}
            showControls={false}
            maxRenderableNodes={500}
            layoutDirection="RIGHT"
            onNodeClick={next.onNodeClick}
            {...next.props}
            style={{
              "--bg-color": t.surface,
              "--line-color-1": t.border,
              "--line-color-2": t.grid,
              "--edge-stroke": t.axis,
              "--node-fill": t.surface,
              "--node-stroke": t.border,
              "--interactive-normal": t.ink,
              "--background-node": t.surface,
              "--node-text": t.ink,
              "--node-key": t.primary,
              "--node-value": t.text,
              "--node-integer": t.warning,
              "--node-null": t.text,
              "--node-bool-true": t.good,
              "--node-bool-false": t.critical,
              "--node-child-count": t.text,
              "--node-divider": t.border,
              ...next.props?.style,
            }}
          />
        )
      )
    }
    render(options)
    return {
      update: render,
      resize: () => {
        const next = { width: area.clientWidth, height: area.clientHeight }
        if (!next.width || !next.height) return
        if (next.width !== bounds.width || next.height !== bounds.height) {
          bounds = next
          return ref.current?.centerView()
        }
      },
      destroy: () => root.unmount(),
      api: { ref, snapshot: () => current },
    }
  },
  { JSONCrack, parseGraph }
)
