import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import ELK from "elkjs/lib/elk.bundled.js"
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import embed from "vega-embed"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import "@xyflow/react/dist/style.css"

function beta(a: number, b: number) {
  const weights = Array.from({ length: 101 }, (_, i) => {
    const x = i / 100
    return { x, density: x ** (a - 1) * (1 - x) ** (b - 1) }
  })
  const total = weights.reduce((sum, row) => sum + row.density, 0)
  return weights.map((row) => ({ x: row.x, density: (row.density / total) * 100 }))
}
function quantile(curve: { x: number; density: number }[], p: number) {
  let mass = 0
  for (const point of curve) {
    mass += point.density / 100
    if (mass >= p) return point.x
  }
  return 1
}

type SiteData = {
  symbol: string
  label: string
  formula: string
  kind: "fixed" | "random" | "observed" | "derived" | "predictive"
  curve?: { x: number; density: number }[]
  value: string
  detail: string
  mark?: number
  folded?: boolean
  toggle?: () => void
}
type Site = Node<SiteData, "site">

function SiteNode({ data, selected }: NodeProps<Site>) {
  const tokens = useVizTokens()
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!tokens || !host.current || !data.curve) return
    let disposed = false
    let finalize: (() => void) | undefined
    const color = data.kind === "observed" ? tokens.warning : tokens.series[0]
    embed(
      host.current,
      {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        width: 220,
        height: 70,
        padding: { top: 3, left: 0, right: 0, bottom: 0 },
        layer: [
          {
            data: { values: data.curve },
            mark: { type: "area", color, opacity: 0.14, line: { color, strokeWidth: 1.5 } },
            encoding: {
              x: {
                field: "x",
                type: "quantitative",
                scale: { domain: [0, 1] },
                axis: { values: [0, 0.5, 1], title: null, format: ".1f" },
              },
              y: { field: "density", type: "quantitative", axis: null },
            },
          },
          ...(data.mark !== undefined
            ? [
                {
                  data: { values: [{ x: data.mark }] },
                  mark: { type: "rule" as const, color: tokens.ink, strokeWidth: 1.2 },
                  encoding: { x: { field: "x", type: "quantitative" as const } },
                },
              ]
            : []),
        ],
        config: {
          background: "transparent",
          view: { stroke: null },
          font: tokens.labelFont,
          axis: {
            labelColor: tokens.text,
            domain: false,
            grid: false,
            tickSize: 0,
            labelFontSize: 11,
            labelPadding: 5,
          },
        },
      },
      { actions: false, renderer: "svg" }
    )
      .then((result) => {
        if (disposed) result.finalize()
        else finalize = result.finalize
      })
      .catch(() => undefined)
    return () => {
      disposed = true
      finalize?.()
    }
  }, [tokens, data.curve, data.mark, data.kind])
  return (
    <div className={`program-node ${selected ? "selected" : ""}`} data-kind={data.kind}>
      <Handle type="target" position={Position.Left} />
      <div className="program-node-top">
        <span className="node-kind">{data.kind}</span>
        {data.toggle && (
          <button
            className="nodrag"
            type="button"
            aria-label={`${data.folded ? "Expand" : "Collapse"} inputs to ${data.symbol}`}
            onClick={data.toggle}
          >
            {data.folded ? "+" : "−"}
          </button>
        )}
      </div>
      <div className="program-symbol">
        {data.symbol}
        <span>{data.label}</span>
      </div>
      <div className="program-formula">{data.formula}</div>
      {data.curve ? (
        <div ref={host} className="program-node-plot nodrag nowheel" />
      ) : (
        <div className="program-fixed-value">{data.value}</div>
      )}
      {data.curve && <div className="program-node-value">{data.value}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { site: SiteNode }

const initialProgram = canvasState({
  heads: 14,
  connected: true,
  step: 23,
  folded: false,
  inspected: "posterior",
  viewport: null as { x: number; y: number; zoom: number } | null,
  positions: {} as Record<string, { x: number; y: number }>,
})
const layoutEngine = new ELK()
const connections = [
  ["constants", "prior"],
  ["prior", "posterior"],
  ["observations", "posterior"],
  ["posterior", "draw"],
  ["draw", "replicate"],
]

export default function Program() {
  const [heads, setHeads] = useState(initialProgram.heads)
  const [connected, setConnected] = useState(initialProgram.connected)
  const [step, setStep] = useState(initialProgram.step)
  const [playing, setPlaying] = useState(false)
  const [folded, setFolded] = useState(initialProgram.folded)
  const [inspected, setInspected] = useState(initialProgram.inspected)
  const [viewport, setViewport] = useState(initialProgram.viewport)
  const [layoutReady, setLayoutReady] = useState(false)
  const [layoutError, setLayoutError] = useState("")
  const [nodes, setNodes, onNodesChange] = useNodesState<Site>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const flow = useRef<ReactFlowInstance<Site> | null>(null)
  const prior = useMemo(() => beta(2, 2), [])
  const a = 2 + (connected ? heads : 0)
  const b = 2 + (connected ? 20 - heads : 0)
  const posterior = useMemo(() => beta(a, b), [a, b])
  const p = quantile(posterior, (step + 0.5) / 64)
  const outcome = (step * 0.61803398875) % 1 < p ? 1 : 0
  const toggle = useCallback(() => setFolded((value) => !value), [])
  const siteData = useMemo<Record<string, SiteData>>(
    () => ({
      constants: {
        symbol: "α, β",
        label: "Prior shape",
        formula: "α = 2, β = 2",
        kind: "fixed",
        value: "2, 2",
        detail:
          "Fixed shape parameters define a symmetric Beta prior over the probability of heads.",
      },
      prior: {
        symbol: "p",
        label: "Prior belief",
        formula: "p ~ Beta(α, β)",
        kind: "random",
        curve: prior,
        value: "mean 0.500",
        detail: "The prior expresses uncertainty before observing any coin tosses.",
      },
      observations: {
        symbol: "y",
        label: "Observed tosses",
        formula: "y ~ Binomial(20, p)",
        kind: "observed",
        value: connected ? `${heads} / 20` : "Disconnected",
        detail:
          "Twenty illustrative tosses. The slider changes the number of observed heads; these are synthetic observations.",
      },
      posterior: {
        symbol: "p | y",
        label: connected ? "Posterior belief" : "Prior belief",
        formula: `Beta(${a}, ${b})`,
        kind: "random",
        curve: posterior,
        value: `mean ${(a / (a + b)).toFixed(3)}`,
        mark: p,
        folded,
        toggle,
        detail:
          "The conjugate update adds the head count to α and the tail count to β. This browser calculation uses the analytic Beta posterior.",
      },
      draw: {
        symbol: "p[s]",
        label: "Selected quantile",
        formula: `s = ${step + 1} / 64`,
        kind: "derived",
        curve: posterior,
        mark: p,
        value: `p[s] = ${p.toFixed(3)}`,
        detail:
          "The trace visits 64 evenly spaced posterior quantiles. These are deterministic visualization samples, not MCMC output.",
      },
      replicate: {
        symbol: "y_rep[s]",
        label: "Predictive outcome",
        formula: "Bernoulli(p[s])",
        kind: "predictive",
        value: outcome ? "Heads" : "Tails",
        detail: `A reproducible illustrative uniform sequence produces a predictive coin result at p[s] = ${p.toFixed(3)}.`,
      },
    }),
    [prior, connected, heads, a, b, posterior, p, step, folded, toggle, outcome]
  )

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setStep((value) => (value + 1) % 64), 170)
    return () => clearInterval(timer)
  }, [playing])

  useEffect(() => {
    const ids = folded
      ? ["posterior", "draw", "replicate"]
      : ["constants", "prior", "observations", "posterior", "draw", "replicate"]
    const links = connections.filter(
      ([source, target]) => ids.includes(source) && ids.includes(target)
    )
    let disposed = false
    setLayoutReady(false)
    layoutEngine
      .layout({
        id: "program",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.edgeRouting": "ORTHOGONAL",
          "elk.spacing.nodeNode": "44",
          "elk.layered.spacing.nodeNodeBetweenLayers": "85",
          "elk.randomSeed": "1",
        },
        children: ids.map((id) => ({
          id,
          width: 252,
          height: ["prior", "posterior", "draw"].includes(id) ? 224 : 155,
        })),
        edges: links.map(([source, target]) => ({
          id: `${source}-${target}`,
          sources: [source],
          targets: [target],
        })),
      })
      .then((result) => {
        if (disposed) return
        setNodes((old) =>
          (result.children ?? []).map((node) => ({
            id: node.id,
            type: "site",
            selected: node.id === "posterior",
            position: initialProgram.positions[node.id] ?? { x: node.x ?? 0, y: node.y ?? 0 },
            data: old.find((item) => item.id === node.id)?.data ?? {
              symbol: node.id,
              label: "",
              formula: "",
              kind: "fixed",
              value: "",
              detail: "",
            },
          }))
        )
        setEdges(
          links.map(([source, target]) => ({
            id: `${source}-${target}`,
            source,
            target,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            className: source === "observations" ? "observation-edge" : "",
            style: {
              stroke: source === "observations" ? "var(--status-warning)" : "var(--viz-axis)",
              strokeWidth: 1.5,
              strokeDasharray: source === "observations" ? "5 4" : undefined,
            },
          }))
        )
        setLayoutReady(true)
        setTimeout(() => {
          if (disposed) return
          if (canvasOnly && initialProgram.viewport) {
            void flow.current?.setViewport(initialProgram.viewport)
            return
          }
          const posteriorNode = result.children?.find((node) => node.id === "posterior")
          if (posteriorNode) {
            void flow.current?.setCenter(
              (posteriorNode.x ?? 0) + 126,
              (posteriorNode.y ?? 0) + 112,
              { zoom: 1, duration: 250 }
            )
          } else void flow.current?.fitView({ padding: 0.15, duration: 250 })
        }, 150)
      })
      .catch((cause: unknown) => !disposed && setLayoutError(String(cause)))
    return () => {
      disposed = true
    }
  }, [folded, setNodes, setEdges])
  useEffect(() => {
    if (!layoutReady) return
    setNodes((current) => current.map((node) => ({ ...node, data: siteData[node.id] })))
  }, [siteData, setNodes, layoutReady])
  const inspectedData = siteData[inspected]

  return (
    <div className="demo-stack">
      <div className="program-controls">
        <div>
          <span className="eyebrow">Beta–Binomial model</span>
          <div className="program-control-title">A coin, twenty tosses, one update.</div>
        </div>
        <label className="demo-field program-heads">
          <span>
            Observed heads <output>{heads} / 20</output>
          </span>
          <input
            aria-label="Observed heads"
            type="range"
            min={0}
            max={20}
            value={heads}
            onChange={(event) => setHeads(+event.target.value)}
          />
        </label>
        <button
          type="button"
          className={`demo-button ${connected ? "" : "primary"}`}
          onClick={() => setConnected((value) => !value)}
        >
          {connected ? "Disconnect observations" : "Connect observations"}
        </button>
      </div>
      <div className="program-workspace">
        <section className="demo-panel program-canvas-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Dependency canvas</h2>
              <p>Drag a card · pinch to zoom · select a variable</p>
            </div>
            <div className="demo-toolbar">
              <CanvasTab
                view="program"
                state={{
                  heads,
                  connected,
                  step,
                  folded,
                  inspected,
                  viewport,
                  positions: Object.fromEntries(nodes.map((node) => [node.id, node.position])),
                }}
              />
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  const node = flow.current?.getNode(inspected)
                  if (node)
                    void flow.current?.setCenter(
                      node.position.x + 126,
                      node.position.y + (node.measured?.height ?? 224) / 2,
                      { zoom: 1, duration: 250 }
                    )
                }}
              >
                Focus variable
              </button>
              <button
                type="button"
                className="demo-button"
                onClick={() => void flow.current?.fitView({ padding: 0.15, duration: 250 })}
              >
                <Maximize2 size={12} /> Fit all
              </button>
            </div>
          </div>
          <div className="program-canvas" data-ready={layoutReady} data-testid="program-canvas">
            <ReactFlow<Site>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_event, node) => setInspected(node.id)}
              onMoveEnd={(_event, current) => setViewport(current)}
              onInit={(instance) => {
                flow.current = instance
              }}
              fitView
              minZoom={0.08}
              maxZoom={1.8}
              proOptions={{ hideAttribution: false }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="var(--border-strong)"
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="trace-player">
            <button
              type="button"
              className="demo-button"
              aria-label={playing ? "Pause trace" : "Play trace"}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              className="demo-button"
              aria-label="Previous trace step"
              onClick={() => {
                setPlaying(false)
                setStep((value) => Math.max(0, value - 1))
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <input
              aria-label="Trace step"
              type="range"
              min={0}
              max={63}
              value={step}
              onChange={(event) => {
                setPlaying(false)
                setStep(+event.target.value)
              }}
            />
            <button
              type="button"
              className="demo-button"
              aria-label="Next trace step"
              onClick={() => {
                setPlaying(false)
                setStep((value) => Math.min(63, value + 1))
              }}
            >
              <ChevronRight size={14} />
            </button>
            <span className="demo-meta">{step + 1} / 64</span>
            <button
              type="button"
              className="demo-button"
              aria-label="Reset trace"
              onClick={() => {
                setPlaying(false)
                setStep(0)
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </section>
        <aside className="demo-panel program-inspector">
          <div className="demo-panel-head">
            <h2>Variable inspector</h2>
            <span className="demo-meta">{inspectedData.kind}</span>
          </div>
          <div className="demo-panel-body">
            <div className="inspector-symbol">{inspectedData.symbol}</div>
            <h3>{inspectedData.label}</h3>
            <code>{inspectedData.formula}</code>
            <p>{inspectedData.detail}</p>
            <dl>
              <div>
                <dt>Current value</dt>
                <dd>{inspectedData.value}</dd>
              </div>
              {inspectedData.curve && (
                <>
                  <div>
                    <dt>Central 90% interval</dt>
                    <dd>
                      {quantile(inspectedData.curve, 0.05).toFixed(2)} –{" "}
                      {quantile(inspectedData.curve, 0.95).toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt>Trace position</dt>
                    <dd>{step + 1} of 64</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="group-key">
              <span>
                <i style={{ background: "var(--series-1)" }} />
                Belief
              </span>
              <span>
                <i style={{ background: "var(--status-warning)" }} />
                Observation
              </span>
            </div>
          </div>
        </aside>
      </div>
      {layoutError && (
        <p role="alert" className="status-message error">
          {layoutError}
        </p>
      )}
      <p className="demo-meta">
        Analytic conjugate update · deterministic quantile playback · no inference service
      </p>
    </div>
  )
}
