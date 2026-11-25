import { Download, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"

type Plotly = typeof import("plotly.js")
// Plotly accepts surface color bounds that its PlotData declaration omits.
const amplitudeScale = { cmin: -1, cmax: 1 }
export default function Science() {
  const tokens = useVizTokens()
  const host = useRef<HTMLDivElement>(null)
  const slice = useRef<HTMLDivElement>(null)
  const engine = useRef<Plotly | null>(null)
  const [initial] = useState(() =>
    canvasState({ frequency: 1.2, position: 0, camera: { eye: { x: 1.5, y: 1.5, z: 1.05 } } })
  )
  const [frequency, setFrequency] = useState(initial.frequency)
  const [position, setPosition] = useState(initial.position)
  const [camera, setCamera] = useState(initial.camera)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!tokens || !host.current || !slice.current) return
    let disposed = false
    const surfaceHost = host.current
    const sliceHost = slice.current
    const coordinates = Array.from({ length: 45 }, (_, i) => -4 + (i * 8) / 44)
    const f = (x: number, y: number) =>
      Math.cos(frequency * Math.hypot(x, y)) * Math.exp(-(x * x + y * y) / 18)
    void import("plotly.js-dist-min")
      .then(async (module) => {
        if (disposed) return
        const plotly = module.default as unknown as Plotly
        engine.current = plotly
        const axis = {
          gridcolor: tokens.grid,
          zerolinecolor: tokens.axis,
          color: tokens.text,
          showbackground: false,
          tickfont: { size: 12 },
          title: { font: { size: 11 } },
        }
        await plotly.react(
          surfaceHost,
          [
            {
              type: "surface",
              x: coordinates,
              y: coordinates,
              z: coordinates.map((y) => coordinates.map((x) => f(x, y))),
              colorscale: [
                [0, tokens.divNeg],
                [0.5, tokens.divMid],
                [1, tokens.divPos],
              ],
              ...amplitudeScale,
              showscale: true,
              colorbar: {
                thickness: 9,
                len: 0.62,
                outlinewidth: 0,
                tickvals: [-1, 0, 1],
                tickfont: { color: tokens.text, size: 11 },
                x: 0.95,
              },

              hovertemplate: "x %{x:.2f}<br>y %{y:.2f}<br>z %{z:.3f}<extra></extra>",
            },
            {
              type: "scatter3d",
              x: coordinates,
              y: coordinates.map(() => position),
              z: coordinates.map((x) => f(x, position) + 0.025),
              mode: "lines",
              line: { color: tokens.ink, width: 6 },
              showlegend: false,
              hoverinfo: "skip",
            },
          ],
          {
            autosize: true,
            height: canvasOnly ? window.innerHeight : 425,
            margin: { l: 5, r: 5, t: 8, b: 32 },
            paper_bgcolor: tokens.surface,
            plot_bgcolor: tokens.surface,
            font: { family: tokens.font, color: tokens.text },
            uirevision: "preserve-camera",
            scene: {
              xaxis: { ...axis, title: { text: "x" } },
              yaxis: { ...axis, title: { text: "y" } },
              zaxis: { ...axis, title: { text: "f(x, y)" } },
              camera: initial.camera,
              bgcolor: tokens.surface,
            },
          },
          { responsive: true, displayModeBar: false, scrollZoom: canvasOnly }
        )
        if (disposed) return
        await plotly.react(
          sliceHost,
          [
            {
              type: "scatter",
              x: coordinates,
              y: coordinates.map((x) => f(x, position)),
              mode: "lines",
              line: { color: tokens.ink, width: 2 },
              fill: "none",
              hovertemplate: "x %{x:.2f}<br>f(x, y) %{y:.3f}<extra></extra>",
            },
          ],
          {
            height: 230,
            margin: { l: 40, r: 18, t: 12, b: 42 },
            paper_bgcolor: tokens.surface,
            plot_bgcolor: tokens.surface,
            font: { family: tokens.labelFont, color: tokens.text, size: 12 },
            xaxis: {
              gridcolor: tokens.grid,
              zerolinecolor: tokens.axis,
              title: { text: "x", font: { size: 11 } },
            },
            yaxis: {
              gridcolor: tokens.grid,
              zerolinecolor: tokens.axis,
              range: [-1, 1],
              title: { text: "f(x, y)", font: { size: 11 } },
            },
            showlegend: false,
          },
          { responsive: true, displayModeBar: false }
        )
        if (!disposed) {
          setReady(true)
          const graph = surfaceHost as unknown as import("plotly.js").PlotlyHTMLElement
          graph.removeAllListeners("plotly_relayout")
          graph.on("plotly_relayout", (event) => {
            const next = (event as unknown as Record<string, unknown>)["scene.camera"]
            if (next) setCamera(next as typeof initial.camera)
          })
        }
      })
      .catch((cause: unknown) => !disposed && setError(String(cause)))
    return () => {
      disposed = true
    }
  }, [tokens, frequency, position, initial.camera])
  useEffect(() => {
    const surfaceHost = host.current
    const sliceHost = slice.current
    return () => {
      if (surfaceHost) engine.current?.purge(surfaceHost)
      if (sliceHost) engine.current?.purge(sliceHost)
    }
  }, [])
  return (
    <div className="demo-two-col science-layout">
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Damped radial wave</h2>
            <p>f(x, y) = cos(ω√(x² + y²)) · exp(−(x² + y²) / 18)</p>
          </div>
          <div className="demo-toolbar">
            <CanvasTab view="science" state={{ frequency, position, camera }} />
            <button
              type="button"
              className="demo-button"
              onClick={() => {
                if (host.current)
                  // Plotly accepts dotted update paths; its type package only lists Layout keys.
                  void engine.current?.relayout(host.current, {
                    "scene.camera": { eye: { x: 1.5, y: 1.5, z: 1.05 } },
                  } as Partial<import("plotly.js").Layout>)
              }}
            >
              <RotateCcw size={12} /> Camera
            </button>
            <button
              type="button"
              className="demo-button"
              disabled={!ready}
              onClick={() => {
                if (host.current)
                  void engine.current?.downloadImage(host.current, {
                    format: "png",
                    filename: "radial-wave",
                    width: 1200,
                    height: 900,
                  })
              }}
            >
              <Download size={12} /> PNG
            </button>
          </div>
        </div>
        <div ref={host} data-testid="surface" data-ready={ready} className="science-surface" />
        {error && (
          <p role="alert" className="demo-panel-note">
            {error}
          </p>
        )}
        <div className="demo-panel-note">
          The highlighted line is the slice shown at right. Rotate the surface to inspect its shape.
        </div>
      </section>
      <div className="demo-stack science-controls">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Surface parameters</h2>
            <span className="demo-meta">Analytic function</span>
          </div>
          <div className="demo-panel-body input-form">
            <label className="demo-field">
              <span className="range-label">
                Frequency, ω <output>{frequency.toFixed(1)}</output>
              </span>
              <input
                type="range"
                aria-label="Wave frequency"
                min={0.4}
                max={3}
                step={0.1}
                value={frequency}
                onChange={(event) => setFrequency(+event.target.value)}
              />
            </label>
            <label className="demo-field">
              <span className="range-label">
                Slice position, y <output>{position.toFixed(1)}</output>
              </span>
              <input
                type="range"
                aria-label="Slice position"
                min={-4}
                max={4}
                step={0.1}
                value={position}
                onChange={(event) => setPosition(+event.target.value)}
              />
            </label>
            <div className="science-formula">
              45 × 45
              <br />
              <span>evaluated surface coordinates</span>
            </div>
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Slice at y = {position.toFixed(1)}</h2>
            <span className="demo-meta">Same function</span>
          </div>
          <div ref={slice} className="science-slice" />
        </section>
      </div>
    </div>
  )
}
