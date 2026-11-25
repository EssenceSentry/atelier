import Panzoom, { type PanzoomObject } from "@panzoom/panzoom"
import { Download, Maximize2, Minus, Play, Plus } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import Markdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download } from "./data"
import "katex/dist/katex.min.css"

const article = `## Updating a belief

A probabilistic model carries uncertainty through a calculation. For an illustrative coin, let $p$ be its unknown probability of heads.

$$p \\sim \\operatorname{Beta}(\\alpha, \\beta)$$

After observing $h$ heads and $t$ tails, the conjugate update is:

$$p \\mid y \\sim \\operatorname{Beta}(\\alpha + h,\\; \\beta + t)$$

With a **Beta(2, 2)** prior and **14 heads in 20 tosses**, the posterior is **Beta(16, 8)**. Its mean is $16 / 24 \\approx 0.667$.

> The observations here are synthetic. The update is analytic and does not require a sampling service.

### From model to explanation

1. Start with a distribution and its parameters.
2. Show the evidence that enters the likelihood.
3. Connect the updated distribution to a prediction.

| Quantity | Prior | Posterior |
| :--- | ---: | ---: |
| Alpha | 2 | 16 |
| Beta | 2 | 8 |
| Mean | 0.500 | 0.667 |

The same values can drive a chart, a variable card and a narrative explanation.
`
const flow = `flowchart LR
  accTitle: A probabilistic update
  accDescr: Prior belief and observed tosses enter the update, which produces a posterior and a predictive outcome.
  P["Prior belief"] --> U["Conjugate update"]
  D["Observed tosses"] --> U
  U --> B["Posterior belief"]
  B --> Y["Predictive outcome"]`
const sequence = `sequenceDiagram
  accTitle: An interactive analysis
  accDescr: A reader changes a parameter and receives updated analysis and a rendered view.
  participant R as Reader
  participant C as Controls
  participant A as Analysis
  participant V as View
  R->>C: Change parameter
  C->>A: Updated value
  A->>V: Derived results
  V-->>R: Updated explanation`

export default function Writing() {
  const tokens = useVizTokens()
  const [source, setSource] = useState(() => canvasState({ source: flow }).source)
  const [applied, setApplied] = useState(source)
  const [error, setError] = useState("")
  const [rendered, setRendered] = useState("")
  const host = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const pan = useRef<PanzoomObject | null>(null)
  const [zoom, setZoom] = useState(1)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "")
  const [editing, setEditing] = useState(false)
  const [prose, setProse] = useState(article)
  useEffect(() => {
    const element = host.current
    const area = viewport.current
    const svg = element?.querySelector("svg")
    if (!rendered || !element || !area || !svg) return
    const box = svg.viewBox.baseVal
    element.style.width = `${box.width}px`
    element.style.height = `${box.height}px`
    const fit = () => {
      const scale = Math.min(
        (area.clientWidth - 32) / box.width,
        (area.clientHeight - 40) / box.height,
        1
      )
      instance.setOptions({ startScale: scale })
      instance.reset()
    }
    const instance = Panzoom(element, { minScale: 0.08, maxScale: 8, canvas: true })
    pan.current = instance
    const changed = (event: Event) =>
      setZoom((event as CustomEvent<{ scale: number }>).detail.scale)
    const wheel = (event: WheelEvent) => {
      if (canvasOnly || event.ctrlKey || event.metaKey || document.activeElement === area)
        instance.zoomWithWheel(event)
    }
    element.addEventListener("panzoomchange", changed)
    area.addEventListener("wheel", wheel, { passive: false })
    const observer = new ResizeObserver(fit)
    observer.observe(area)
    fit()
    return () => {
      observer.disconnect()
      element.removeEventListener("panzoomchange", changed)
      area.removeEventListener("wheel", wheel)
      instance.destroy()
      pan.current = null
    }
  }, [rendered])
  useEffect(() => {
    if (!tokens || !host.current) return
    let disposed = false
    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: "base",
          fontFamily: tokens.font,
          themeVariables: {
            background: tokens.surface,
            primaryColor: tokens.surface,
            primaryTextColor: tokens.ink,
            primaryBorderColor: tokens.primary,
            lineColor: tokens.text,
            secondaryColor: tokens.surface,
            tertiaryColor: tokens.surface,
            textColor: tokens.ink,
            nodeTextColor: tokens.ink,
            edgeLabelBackground: tokens.surface,
            actorBkg: tokens.surface,
            actorBorder: tokens.border,
            actorTextColor: tokens.ink,
            signalColor: tokens.ink,
            signalTextColor: tokens.ink,
            labelTextColor: tokens.ink,
          },
          flowchart: { htmlLabels: false, curve: "linear", padding: 18 },
          sequence: { useMaxWidth: true },
        })
        const result = await mermaid.render(`diagram${uid}`, applied)
        if (disposed || !host.current) return
        host.current.innerHTML = result.svg
        host.current.querySelector("svg")?.style.removeProperty("max-width")
        result.bindFunctions?.(host.current)
        setRendered(result.svg)
        setError("")
        host.current.dataset.ready = "true"
      })
      .catch((cause: unknown) => {
        if (!disposed) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      disposed = true
    }
  }, [tokens, applied, uid])
  return (
    <div className="demo-two-col writing-layout">
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>A short notebook explanation</h2>
            <p>Markdown + math + a data table</p>
          </div>
          <button
            type="button"
            className="demo-button"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Read explanation" : "Edit Markdown"}
          </button>
        </div>
        {editing ? (
          <div className="demo-panel-body">
            <textarea
              className="demo-input markdown-source"
              aria-label="Markdown source"
              value={prose}
              onChange={(event) => setProse(event.target.value)}
            />
          </div>
        ) : (
          <article className="demo-prose">
            <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {prose}
            </Markdown>
          </article>
        )}
      </section>
      <div className="demo-stack writing-right">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Diagram preview</h2>
              <p>Rendered from the Mermaid source</p>
            </div>
            <div className="demo-toolbar">
              <CanvasTab view="writing" state={{ source: applied }} />
              <button
                type="button"
                className="demo-button"
                disabled={!rendered}
                onClick={() => download("analysis-diagram.svg", rendered, "image/svg+xml")}
              >
                <Download size={12} /> SVG
              </button>
            </div>
          </div>
          <div
            className="mermaid-viewport"
            ref={viewport}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: This canvas handles keyboard pan and zoom.
            tabIndex={0}
            role="application"
            aria-label="Diagram canvas. Drag to pan; plus and minus to zoom; zero to fit."
            onDoubleClick={(event) => {
              if (!(event.target as Element).closest(".canvas-zoom-tools")) pan.current?.reset()
            }}
            onKeyDown={(event) => {
              const instance = pan.current
              if (!instance) return
              if (
                ["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key
                )
              )
                event.preventDefault()
              if (event.key === "+" || event.key === "=") instance.zoomIn()
              if (event.key === "-") instance.zoomOut()
              if (event.key === "0") instance.reset()
              if (event.key.startsWith("Arrow")) {
                const point = instance.getPan()
                const delta = 45 / instance.getScale()
                instance.pan(
                  point.x +
                    (event.key === "ArrowLeft" ? delta : event.key === "ArrowRight" ? -delta : 0),
                  point.y +
                    (event.key === "ArrowUp" ? delta : event.key === "ArrowDown" ? -delta : 0)
                )
              }
            }}
          >
            <div className="mermaid-host" ref={host} />
            <div className="canvas-zoom-tools panzoom-exclude">
              <button
                type="button"
                className="demo-button"
                aria-label="Zoom diagram in"
                onClick={() => pan.current?.zoomIn()}
              >
                <Plus size={15} />
              </button>
              <output aria-label="Diagram zoom">{Math.round(zoom * 100)}%</output>
              <button
                type="button"
                className="demo-button"
                aria-label="Zoom diagram out"
                onClick={() => pan.current?.zoomOut()}
              >
                <Minus size={15} />
              </button>
              <button
                type="button"
                className="demo-button"
                aria-label="Fit diagram"
                onClick={() => pan.current?.reset()}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
          <p className="demo-panel-note">
            Drag to pan · pinch or focus and scroll to zoom · double-click to fit
          </p>
          {error && (
            <p role="alert" className="status-message error diagram-error">
              {error}
            </p>
          )}
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Mermaid source</h2>
            <div className="demo-toolbar">
              <select
                aria-label="Diagram example"
                className="diagram-example"
                onChange={(event) => {
                  const value = event.target.value === "flow" ? flow : sequence
                  setSource(value)
                  setApplied(value)
                }}
              >
                <option value="flow">Flowchart</option>
                <option value="sequence">Sequence</option>
              </select>
              <button
                type="button"
                className="demo-button primary"
                onClick={() => setApplied(source)}
              >
                <Play size={12} /> Render
              </button>
            </div>
          </div>
          <textarea
            aria-label="Mermaid source"
            className="mermaid-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
          />
        </section>
        <details className="demo-panel structured-details">
          <summary>Inspect the underlying model values</summary>
          <div className="demo-panel-body">
            <pre className="code-preview">
              {JSON.stringify(
                {
                  family: "Beta–Binomial",
                  prior: { alpha: 2, beta: 2 },
                  observations: { heads: 14, tails: 6 },
                  posterior: { alpha: 16, beta: 8 },
                  source: "Illustrative synthetic observations",
                },
                null,
                2
              )}
            </pre>
          </div>
        </details>
      </div>
    </div>
  )
}
