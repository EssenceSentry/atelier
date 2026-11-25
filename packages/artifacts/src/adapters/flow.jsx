import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import ELK from "elkjs/lib/elk.bundled.js"
import { useEffect } from "react"
import "@xyflow/react/dist/style.css"

const A = globalThis.Atelier
const elk = new ELK()
function Card({ data }) {
  return (
    <div className="at-node">
      <Handle type="target" position={Position.Left} />
      {data.icon && <img src={data.icon} alt="" />}
      <strong>{data.label}</strong>
      <span>{data.description}</span>
      {data.status && (
        <span className="at-badge" data-tone={data.tone ?? "info"}>
          {data.status}
        </span>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
function Diagram({ options, onReady }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(options.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(options.edges)
  useEffect(() => {
    setNodes(options.nodes)
    setEdges(options.edges)
  }, [options, setNodes, setEdges])
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={{ card: Card, ...options.nodeTypes }}
      fitView={options.fitView}
      minZoom={0.08}
      maxZoom={4}
      onNodeClick={options.onNodeClick}
      onConnect={options.onConnect}
      {...options.flow}
      onInit={onReady}
    >
      <Background color="var(--border)" />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
A.register(
  "flow",
  async (host, initial, ctx) => {
    const area = ctx.element("div", "at-canvas")
    host.append(area)
    const root = A.ReactClient.createRoot(area)
    let instance
    let current
    let bounds = { width: area.clientWidth, height: area.clientHeight }
    const dimensions = new Map()
    let initialized
    const ready = new Promise((resolve) => {
      initialized = resolve
    })
    const focus = (id) => {
      const node = instance?.getNode(id)
      if (node)
        return instance.setCenter(
          node.position.x + (node.measured?.width ?? dimensions.get(id)?.width ?? 230) / 2,
          node.position.y + (node.measured?.height ?? dimensions.get(id)?.height ?? 120) / 2,
          { zoom: 1 }
        )
    }
    const frame = () => {
      const nodes = instance?.getNodes().filter((node) => !node.hidden) ?? []
      if (!nodes.length) return
      const box = instance.getNodesBounds(nodes)
      const scale = Math.min(
        (area.clientWidth - 60) / Math.max(1, box.width),
        (area.clientHeight - 60) / Math.max(1, box.height),
        1
      )
      if (area.clientWidth < 600 || scale < 0.9)
        return focus(current.focusId ?? nodes.find((node) => node.selected)?.id ?? nodes[0].id)
      return instance.fitView({ maxZoom: 1, padding: 0.12 })
    }
    const resize = () => {
      const next = { width: area.clientWidth, height: area.clientHeight }
      if (!instance || !next.width || !next.height) return
      if (next.width !== bounds.width || next.height !== bounds.height) {
        const v = instance.getViewport()
        void instance.setCenter(
          (bounds.width / 2 - v.x) / v.zoom,
          (bounds.height / 2 - v.y) / v.zoom,
          { zoom: v.zoom }
        )
        bounds = next
      }
    }
    const measure = (node) => {
      const width = node.style?.width ?? node.width ?? 230
      if (node.type !== "card" || initial.nodeTypes?.card)
        return { width: Number(width) || 230, height: node.height ?? 120 }
      const probe = ctx.element("div", "at-node")
      Object.assign(probe.style, {
        position: "absolute",
        left: "-99999px",
        visibility: "hidden",
        width: typeof width === "number" ? `${width}px` : width,
      })
      if (node.data.icon) {
        const img = ctx.element("img")
        img.src = node.data.icon
        probe.append(img)
      }
      probe.append(
        ctx.element("strong", "", node.data.label),
        ctx.element("span", "", node.data.description ?? "")
      )
      if (node.data.status) probe.append(ctx.element("span", "at-badge", node.data.status))
      area.append(probe)
      const rect = probe.getBoundingClientRect()
      probe.remove()
      return { width: rect.width, height: node.height ?? rect.height }
    }
    const render = async (options) => {
      await document.fonts.ready
      const selected = new Set(
        instance
          ?.getNodes()
          .filter((node) => node.selected)
          .map((node) => node.id) ?? []
      )
      let nodes = options.nodes.map((node) => ({
        type: "card",
        position: { x: 0, y: 0 },
        selected: selected.has(node.id),
        ...node,
        style: { width: node.width ?? 230, ...node.style },
      }))
      for (const node of nodes) dimensions.set(node.id, measure(node))
      if (options.layout !== false) {
        const graph = await elk.layout({
          id: "root",
          layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",
            "elk.spacing.nodeNode": "60",
            ...options.layout,
          },
          children: nodes.map((node) => ({
            id: node.id,
            width: dimensions.get(node.id).width,
            height: dimensions.get(node.id).height,
          })),
          edges: options.edges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
          })),
        })
        nodes = nodes.map((node) => ({
          ...node,
          position: {
            x: graph.children.find((child) => child.id === node.id).x,
            y: graph.children.find((child) => child.id === node.id).y,
          },
        }))
      }
      if (ctx.signal.aborted) return
      current = { fitView: false, ...options, nodes }
      root.render(
        <Diagram
          options={current}
          onReady={(value) => {
            instance = value
            options.flow?.onInit?.(value)
            requestAnimationFrame(() => {
              if (current.viewport) void instance.setViewport(current.viewport)
              else if (!current.flow?.defaultViewport) void frame()
              initialized()
            })
          }}
        />
      )
    }
    await render(initial)
    await ready
    return {
      update: render,
      theme() {
        const icons = A.modules.icons
        if (icons?.refreshURL)
          instance?.setNodes((nodes) =>
            nodes.map((node) =>
              node.data.icon
                ? {
                    ...node,
                    data: { ...node.data, icon: icons.refreshURL(node.data.icon) },
                  }
                : node
            )
          )
      },
      resize,
      destroy: () => root.unmount(),
      api: {
        focus,
        get flow() {
          return instance
        },
        snapshot: () => {
          const visual = Object.fromEntries(
            Object.entries(current).filter(
              ([key]) => !["onNodeClick", "onConnect", "flow"].includes(key)
            )
          )
          const flow = current.flow
          return {
            ...visual,
            nodes: instance?.getNodes() ?? current.nodes,
            edges: instance?.getEdges() ?? current.edges,
            flow: flow
              ? Object.fromEntries(
                  Object.entries(flow).filter(([, value]) => typeof value !== "function")
                )
              : undefined,
            viewport: instance?.getViewport(),
            layout: false,
          }
        },
      },
    }
  },
  { ReactFlow, ELK }
)
