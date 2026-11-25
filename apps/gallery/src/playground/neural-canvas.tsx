/** biome-ignore-all lint/suspicious/noArrayIndexKey: Tensor coordinates, neuron slots and token positions are stable identities within each fixed grid. */
import {
  Background,
  Controls,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react"
import ELK from "elkjs/lib/elk.bundled.js"
import { useEffect, useMemo, useRef, useState } from "react"
import type { NNConfig, NNSnapshot } from "./neural-model"
import "@xyflow/react/dist/style.css"

type LayerData = {
  label: string
  shape: string
  kind: string
  detail: string
  units: number
  fields?: number[]
  activation?: string
  selectedUnit?: number
  pick?: (unit: number) => void
}
type LayerNode = Node<LayerData, "neuralLayer">

function Field({
  values,
  index,
  units,
  activation,
}: {
  values: number[]
  index: number
  units: number
  activation?: string
}) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="nn-neuron-field">
      {Array.from({ length: 784 }, (_, i) => {
        const value = values[i * units + index]
        const signed = activation === "sigmoid" ? value * 2 - 1 : Math.tanh(value)
        return (
          <rect
            key={`${i % 28}-${Math.floor(i / 28)}`}
            x={i % 28}
            y={27 - Math.floor(i / 28)}
            width={1.05}
            height={1.05}
            fill={signed >= 0 ? "var(--div-pos)" : "var(--div-neg)"}
            opacity={0.12 + Math.min(1, Math.abs(signed)) * 0.88}
          />
        )
      })}
    </svg>
  )
}
function LayerCard({ data, selected }: NodeProps<LayerNode>) {
  return (
    <div className={`nn-layer-card ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <span className="nn-layer-kind">{data.kind}</span>
      <strong>{data.label}</strong>
      <span className="nn-layer-shape">{data.shape}</span>
      {data.fields && (
        <div className="nn-neuron-fields">
          {Array.from({ length: data.units }, (_, unit) => (
            <button
              className="nodrag nowheel"
              type="button"
              key={`neuron-${unit}`}
              aria-label={`${data.label} neuron ${unit + 1}`}
              aria-pressed={data.selectedUnit === unit}
              onClick={(event) => {
                event.stopPropagation()
                data.pick?.(unit)
              }}
            >
              <Field
                values={data.fields ?? []}
                units={data.units}
                index={unit}
                activation={data.activation}
              />
              <span>{unit + 1}</span>
            </button>
          ))}
        </div>
      )}
      <p>{data.detail}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
const nodeTypes = { neuralLayer: LayerCard }
const elk = new ELK()
export function NeuralCanvas({
  snapshot,
  config,
  selected,
  onSelect,
}: {
  snapshot: NNSnapshot
  config: NNConfig
  selected: [number, number]
  onSelect: (layer: number, unit: number) => void
}) {
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([])
  const [focus, setFocus] = useState("all")
  const host = useRef<HTMLDivElement>(null)
  const flow = useRef<ReactFlowInstance<LayerNode> | null>(null)
  const count = snapshot.layers.length
  useEffect(() => {
    let active = true
    void elk
      .layout({
        id: "network",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.spacing.nodeNode": "45",
          "elk.layered.spacing.nodeNodeBetweenLayers": "70",
        },
        children: Array.from({ length: count + 1 }, (_, i) => ({
          id: String(i),
          width: 210,
          height: i === 0 ? 150 : 260,
        })),
        edges: Array.from({ length: count }, (_, i) => ({
          id: `edge-${i}`,
          sources: [String(i)],
          targets: [String(i + 1)],
        })),
      })
      .then((graph) => {
        if (active) {
          setPositions(graph.children?.map((node) => ({ x: node.x ?? 0, y: node.y ?? 0 })) ?? [])
          setTimeout(() => {
            if (!active) return
            const narrow = (host.current?.clientWidth ?? 1000) < 540
            setFocus(narrow ? "layer-0" : "all")
            void flow.current?.fitView({
              padding: narrow ? 0.3 : 0.12,
              ...(narrow ? { nodes: [{ id: "layer-0" }], maxZoom: 1 } : {}),
            })
          }, 80)
        }
      })
    return () => {
      active = false
    }
  }, [count])
  const nodes: LayerNode[] = useMemo(
    () => [
      {
        id: "input",
        type: "neuralLayer",
        position: positions[0] ?? { x: 0, y: 0 },
        data: {
          label: "Input features",
          kind: "Numeric input",
          shape: "[batch, 2]",
          units: 2,
          detail: "x₁ and x₂ · range −1 to 1",
        },
      },
      ...snapshot.layers.map((layer, i) => ({
        id: `layer-${i}`,
        type: "neuralLayer" as const,
        position: positions[i + 1] ?? { x: 280 * (i + 1), y: 0 },
        selected: selected[0] === i,
        data: {
          label: i === config.depth ? "Probability" : `Hidden ${i + 1}`,
          kind: i === config.depth ? "Binary output" : `Dense · ${config.activation}`,
          shape: `[batch, ${layer.output}]`,
          units: layer.output,
          detail: `${layer.input * layer.output + layer.output} parameters · ${layer.input} → ${layer.output}`,
          fields: snapshot.field[i],
          activation: i === config.depth ? "sigmoid" : config.activation,
          selectedUnit: selected[0] === i ? selected[1] : undefined,
          pick: (unit: number) => onSelect(i, unit),
        },
      })),
    ],
    [snapshot, config, positions, selected, onSelect]
  )
  const edges = snapshot.layers.map((layer, i) => ({
    id: `weights-${i}`,
    source: i === 0 ? "input" : `layer-${i - 1}`,
    target: `layer-${i}`,
    label: `${layer.input} × ${layer.output}`,
    style: { stroke: "var(--viz-axis)", strokeWidth: 1.5 },
    labelStyle: { fill: "var(--viz-text)", fontSize: 11 },
    labelBgStyle: { fill: "var(--card)" },
  }))
  return (
    <div className="nn-network-canvas" data-ready={positions.length > 0} ref={host}>
      <label className="nn-canvas-focus">
        <span>View</span>
        <select
          aria-label="Network canvas focus"
          value={focus}
          onChange={(event) => {
            const value = event.target.value
            setFocus(value)
            if (value !== "all") onSelect(Number(value.slice(6)), 0)
            void flow.current?.fitView({
              padding: value === "all" ? 0.12 : 0.3,
              duration: 200,
              ...(value === "all" ? {} : { nodes: [{ id: value }], maxZoom: 1 }),
            })
          }}
        >
          <option value="all">Overview</option>
          {snapshot.layers.map((layer, i) => (
            <option key={layer.name} value={`layer-${i}`}>
              {i === config.depth ? "Probability" : `Hidden ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
      <ReactFlow<LayerNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        onInit={(instance) => {
          flow.current = instance
        }}
        onNodeClick={(_, node) => {
          if (node.id.startsWith("layer-")) onSelect(Number(node.id.slice(6)), 0)
        }}
      >
        <Background color="var(--viz-grid)" gap={22} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="nn-canvas-caption">
        Each tile is one neuron's response over the input plane.
      </div>
    </div>
  )
}

const architectures = {
  classifier: {
    title: "Encoder + classifier",
    blocks: [
      ["Input A", "Numeric features", "[batch, 12]", "12 supplied features"],
      ["Encoder A", "Dense → ReLU → Dense", "[batch, 4]", "12 → 8 → 4 · 140 parameters"],
      ["Input B", "Numeric features", "[batch, 8]", "8 supplied features"],
      ["Encoder B", "Dense → ReLU → Dense", "[batch, 3]", "8 → 6 → 3 · 75 parameters"],
      ["Concatenate", "Join feature codes", "[batch, 7]", "4 + 3 coordinates"],
      ["Classifier head", "Dense → ReLU → Dense", "[batch, 1]", "7 → 6 → 1 · 55 parameters"],
      ["Probability", "Sigmoid", "[batch, 1]", "Binary probability"],
    ],
    links: [
      [0, 1],
      [2, 3],
      [1, 4],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  cnn: {
    title: "Small convolutional network",
    blocks: [
      ["Image", "Grayscale input", "[batch, 28, 28, 1]", "Illustrative architecture"],
      [
        "Convolution",
        "3 × 3 · 8 filters · ReLU",
        "[batch, 26, 26, 8]",
        "80 parameters · valid padding",
      ],
      ["Max pooling", "2 × 2 · stride 2", "[batch, 13, 13, 8]", "No learned parameters"],
      ["Flatten", "Reshape", "[batch, 1352]", "Preserves every activation"],
      ["Class probabilities", "Dense · softmax", "[batch, 10]", "13,530 parameters"],
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  transformer: {
    title: "Transformer block",
    blocks: [
      [
        "Token vectors",
        "Embeddings + positions",
        "[batch, tokens, d]",
        "Illustrative architecture",
      ],
      [
        "Self-attention",
        "Q · Kᵀ / √d → softmax → V",
        "[batch, tokens, d]",
        "Multiple heads combine context",
      ],
      ["Add + normalize", "Residual path", "[batch, tokens, d]", "Input + attention output"],
      [
        "Feed-forward",
        "Dense → GELU → Dense",
        "[batch, tokens, d]",
        "Independent transform at each token",
      ],
      ["Add + normalize", "Residual path", "[batch, tokens, d]", "Block output"],
    ],
    links: [
      [0, 1],
      [1, 2],
      [0, 2],
      [2, 3],
      [3, 4],
      [2, 4],
    ],
  },
}
export function ArchitectureStudy() {
  const [preset, setPreset] = useState<keyof typeof architectures>("classifier")
  const [nodes, setNodes] = useState<LayerNode[]>([])
  const [selected, setSelected] = useState(0)
  const [error, setError] = useState("")
  const architectureHost = useRef<HTMLDivElement>(null)
  const architectureFlow = useRef<ReactFlowInstance<LayerNode> | null>(null)
  const spec = architectures[preset]
  useEffect(() => {
    let active = true
    setSelected(0)
    void elk
      .layout({
        id: "architecture",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.layered.spacing.nodeNodeBetweenLayers": "75",
          "elk.spacing.nodeNode": "65",
        },
        children: spec.blocks.map((_, i) => ({ id: String(i), width: 210, height: 155 })),
        edges: spec.links.map(([a, b], i) => ({
          id: `link-${i}`,
          sources: [String(a)],
          targets: [String(b)],
        })),
      })
      .then((graph) => {
        if (active)
          setNodes(
            spec.blocks.map(([label, kind, shape, detail], i) => ({
              id: String(i),
              type: "neuralLayer",
              position: { x: graph.children?.[i].x ?? 0, y: graph.children?.[i].y ?? 0 },
              data: { label, kind, shape, detail, units: 0 },
            }))
          )
      })
      .catch((cause) => {
        if (active) setError(String(cause))
      })
    return () => {
      active = false
    }
  }, [spec])
  useEffect(() => {
    if (!nodes.length) return
    const timer = setTimeout(() => {
      const narrow = (architectureHost.current?.clientWidth ?? 1000) < 540
      void architectureFlow.current?.fitView({
        padding: narrow ? 0.3 : 0.12,
        ...(narrow ? { nodes: [{ id: "0" }], maxZoom: 1 } : {}),
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [nodes])
  return (
    <section className="demo-panel">
      <div className="demo-panel-head">
        <div>
          <h2>Architecture atlas</h2>
          <p>Illustrative model layouts · select a block to inspect its contract</p>
        </div>
        <label className="demo-field">
          <span>Architecture</span>
          <select
            aria-label="Architecture preset"
            value={preset}
            onChange={(event) => {
              setSelected(0)
              setPreset(event.target.value as keyof typeof architectures)
            }}
          >
            {Object.entries(architectures).map(([id, item]) => (
              <option key={id} value={id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="demo-error">
          {error}
        </p>
      )}
      <div className="nn-architecture-canvas" ref={architectureHost}>
        <label className="nn-canvas-focus">
          <span>Inspect</span>
          <select
            aria-label="Architecture block focus"
            value={selected}
            onChange={(event) => {
              const value = Number(event.target.value)
              setSelected(value)
              void architectureFlow.current?.fitView({
                nodes: [{ id: String(value) }],
                padding: 0.3,
                maxZoom: 1,
                duration: 200,
              })
            }}
          >
            {spec.blocks.map(([label], i) => (
              <option key={`${preset}-${label}-${i}`} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ReactFlow<LayerNode>
          key={preset}
          nodes={nodes.map((node, i) => ({ ...node, selected: i === selected }))}
          edges={spec.links.map(([a, b], i) => ({
            id: `link-${i}`,
            source: String(a),
            target: String(b),
            style: { stroke: "var(--viz-axis)" },
            type: b - a > 1 ? "smoothstep" : "default",
          }))}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          onInit={(instance) => {
            architectureFlow.current = instance
          }}
          onNodeClick={(_, node) => setSelected(Number(node.id))}
        >
          <Background color="var(--viz-grid)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="nn-block-detail">
        <span className="demo-meta">Selected block</span>
        <strong>{spec.blocks[selected][0]}</strong>
        <span>{spec.blocks[selected][2]}</span>
        <p>
          {spec.blocks[selected][3]}. These diagrams describe structure; the live playground trains
          its own dense network.
        </p>
      </div>
    </section>
  )
}
