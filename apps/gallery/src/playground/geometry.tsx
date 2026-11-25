import JXG from "jsxgraph"
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasState } from "./canvas-tab"

type Pair = [number, number]
const starting: Pair[] = [
  [-2.8, -1.5],
  [2.5, -1.2],
  [0.5, 2.6],
]
const defaults = {
  scene: "geometry",
  a: 0.5,
  b: -0.4,
  c: -1,
  at: 1.4,
  damping: 0.3,
  points: starting,
}
export default function GeometryStudy() {
  const tokens = useVizTokens()
  const [initial] = useState(() => canvasState(defaults))
  const [scene, setScene] = useState(initial.scene)
  const [points, setPoints] = useState(initial.points)
  const [params, setParams] = useState({
    a: initial.a,
    b: initial.b,
    c: initial.c,
    at: initial.at,
    damping: initial.damping,
  })
  const [guides, setGuides] = useState(true)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const board = useRef<JXG.Board | null>(null)
  const vertices = useRef<JXG.Point[]>([])
  const glider = useRef<JXG.Point | null>(null)
  const values = useRef(params)
  values.current = params
  const coords = useRef(points)
  coords.current = points
  const uid = `geometry-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: The reset version deliberately reconstructs the scene; live values are applied separately.
  useEffect(() => {
    if (!tokens || !host.current) return
    setReady(false)
    let instance: JXG.Board | null = null
    try {
      instance = JXG.JSXGraph.initBoard(uid, {
        boundingbox: [-5.5, 4.5, 5.5, -4.5],
        keepaspectratio: true,
        axis: scene !== "geometry",
        grid: scene !== "geometry",
        renderer: "svg",
        showCopyright: false,
        showNavigation: false,
        showScreenshot: false,
        pan: { enabled: true, needTwoFingers: true, needShift: true },
        zoom: { wheel: true, needShift: true },
        defaultAxes: {
          x: {
            strokeColor: tokens.axis,
            ticks: {
              strokeColor: tokens.axis,
              label: { strokeColor: tokens.text, fontSize: 12 },
              drawLabels: true,
            },
          },
          y: {
            strokeColor: tokens.axis,
            ticks: {
              strokeColor: tokens.axis,
              label: { strokeColor: tokens.text, fontSize: 12 },
              drawLabels: true,
            },
          },
        },
      })
      board.current = instance
      const brd = instance
      const pointStyle: JXG.PointAttributes = {
        size: 5,
        strokeColor: tokens.surface,
        fillColor: tokens.series[0],
        highlightFillColor: tokens.primary,
        highlightStrokeColor: tokens.ink,
        label: { strokeColor: tokens.ink, fontSize: 15, offset: [9, 9] },
        fixed: false,
      }
      vertices.current = []
      glider.current = null
      if (scene === "geometry") {
        const nodes = coords.current.map((point, i) =>
          brd.create("point", point, { ...pointStyle, name: ["A", "B", "C"][i] })
        )
        vertices.current = nodes
        brd.create("polygon", nodes, {
          fillColor: tokens.series[0],
          fillOpacity: 0.08,
          borders: { strokeColor: tokens.series[0], strokeWidth: 2 },
          vertices: { visible: false },
          hasInnerPoints: false,
        })
        brd.create("circumcircle", nodes, {
          strokeColor: tokens.series[1],
          strokeWidth: 1.5,
          dash: 2,
          fillOpacity: 0,
          center: { visible: false },
          visible: guides,
        })
        nodes.forEach((point, i) => {
          const midpoint = brd.create("midpoint", [nodes[(i + 1) % 3], nodes[(i + 2) % 3]], {
            visible: false,
            name: "",
          })
          brd.create("segment", [point, midpoint], {
            strokeColor: tokens.axis,
            dash: 2,
            strokeWidth: 1,
            visible: guides,
          })
          point.on("up", () =>
            setPoints(nodes.map((node) => [+node.X().toFixed(3), +node.Y().toFixed(3)] as Pair))
          )
        })
      } else if (scene === "function") {
        const f = (x: number) => values.current.a * x * x + values.current.b * x + values.current.c
        const curve = brd.create("functiongraph", [f, -6, 6], {
          strokeColor: tokens.series[0],
          strokeWidth: 2.5,
        })
        const point = brd.create("glider", [values.current.at, f(values.current.at), curve], {
          ...pointStyle,
          name: "P",
        })
        glider.current = point
        brd.create("tangent", [point], { strokeColor: tokens.series[1], strokeWidth: 1.5, dash: 2 })
        brd.create("segment", [[() => point.X(), 0], point], {
          strokeColor: tokens.axis,
          dash: 2,
          strokeWidth: 1,
        })
        point.on("up", () => setParams((current) => ({ ...current, at: +point.X().toFixed(2) })))
      } else {
        const damping = () => values.current.damping
        const arrows: { start: Pair; end: () => Pair }[] = []
        for (let x = -4; x <= 4; x++)
          for (let y = -3; y <= 3; y++)
            arrows.push({
              start: [x, y],
              end: () => {
                const dx = y - damping() * x,
                  dy = -x - damping() * y
                const norm = Math.max(1, Math.hypot(dx, dy))
                return [x + (dx * 0.55) / norm, y + (dy * 0.55) / norm]
              },
            })
        for (const arrow of arrows)
          brd.create("arrow", [arrow.start, arrow.end], {
            strokeColor: tokens.series[0],
            strokeWidth: 1.3,
            lastArrow: { type: 2, size: 4 },
            fixed: true,
          })
        const point = brd.create("point", [2.7, 0.6], { ...pointStyle, name: "Initial" })
        vertices.current = [point]
        brd.create(
          "curve",
          [
            (time: number) =>
              Math.exp(-damping() * time) *
              (point.X() * Math.cos(time) + point.Y() * Math.sin(time)),
            (time: number) =>
              Math.exp(-damping() * time) *
              (-point.X() * Math.sin(time) + point.Y() * Math.cos(time)),
            0,
            15,
          ],
          { strokeColor: tokens.series[1], strokeWidth: 2 }
        )
      }
      const observer = new ResizeObserver(() => {
        if (host.current && host.current.clientWidth > 0)
          brd.resizeContainer(host.current.clientWidth, host.current.clientHeight, true)
      })
      observer.observe(host.current)
      setReady(true)
      setError("")
      return () => {
        observer.disconnect()
        JXG.JSXGraph.freeBoard(brd)
        board.current = null
      }
    } catch (cause) {
      if (instance) JXG.JSXGraph.freeBoard(instance)
      setError(String(cause))
    }
  }, [tokens, scene, version, guides, uid])
  useEffect(() => {
    if (scene === "geometry")
      vertices.current.forEach((point, i) => {
        point.moveTo(points[i], 0)
      })
    if (scene === "function" && glider.current) {
      const f = params.a * params.at * params.at + params.b * params.at + params.c
      glider.current.moveTo([params.at, f], 0)
    }
    board.current?.fullUpdate()
  }, [params, points, scene])
  const area =
    Math.abs(
      (points[1][0] - points[0][0]) * (points[2][1] - points[0][1]) -
        (points[2][0] - points[0][0]) * (points[1][1] - points[0][1])
    ) / 2
  const perimeter = points.reduce(
    (sum, point, i) =>
      sum + Math.hypot(point[0] - points[(i + 1) % 3][0], point[1] - points[(i + 1) % 3][1]),
    0
  )
  const snapshot = { scene, points, ...params }
  return (
    <div className="demo-stack geometry-study">
      <div className="demo-toolbar geometry-modes">
        {[
          ["geometry", "Geometry"],
          ["function", "Functions & tangents"],
          ["field", "Vector field"],
        ].map(([value, name]) => (
          <button
            type="button"
            className={`demo-button ${scene === value ? "primary" : ""}`}
            aria-pressed={scene === value}
            key={value}
            onClick={() => setScene(value)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="geometry-workspace">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>
                {scene === "geometry"
                  ? "A triangle and its constraints"
                  : scene === "function"
                    ? "A curve and its local slope"
                    : "A damped rotation"}
              </h2>
              <p>Drag the points · Shift-drag to pan · pinch or Shift-scroll to zoom</p>
            </div>
            <div className="demo-toolbar">
              <CanvasTab view="geometry" state={snapshot} />
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  setPoints(starting)
                  setParams({ a: 0.5, b: -0.4, c: -1, at: 1.4, damping: 0.3 })
                  setVersion((value) => value + 1)
                }}
              >
                <RotateCcw size={12} /> Reset construction
              </button>
            </div>
          </div>
          <div
            className="geometry-canvas"
            id={uid}
            ref={host}
            data-ready={ready}
            data-testid="geometry-canvas"
          />
          <div className="geometry-zoom">
            <button
              type="button"
              className="demo-button"
              aria-label="Zoom geometry in"
              onClick={() => board.current?.zoomIn()}
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              className="demo-button"
              aria-label="Zoom geometry out"
              onClick={() => board.current?.zoomOut()}
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => board.current?.setBoundingBox([-5.5, 4.5, 5.5, -4.5], true)}
            >
              <Maximize2 size={13} /> Fit construction
            </button>
          </div>
          {error && (
            <p role="alert" className="demo-panel-note">
              {error}
            </p>
          )}
        </section>
        <aside className="demo-stack geometry-controls">
          <section className="demo-panel">
            <div className="demo-panel-head">
              <h2>{scene === "geometry" ? "Move a vertex" : "Change the parameters"}</h2>
            </div>
            <div className="demo-panel-body input-form">
              {scene === "geometry" ? (
                <>
                  {points.map((point, index) => (
                    <fieldset className="vertex-inputs" key={["A", "B", "C"][index]}>
                      <legend>Vertex {["A", "B", "C"][index]}</legend>
                      {point.map((value, axis) => (
                        <label className="demo-field" key={["x", "y"][axis]}>
                          <span>{["x", "y"][axis]}</span>
                          <input
                            className="demo-input"
                            type="number"
                            step={0.1}
                            min={-5}
                            max={5}
                            value={value}
                            aria-label={`Vertex ${["A", "B", "C"][index]} ${["x", "y"][axis]}`}
                            onChange={(event) => {
                              const value = event.target.valueAsNumber
                              if (Number.isFinite(value))
                                setPoints((current) =>
                                  current.map((item, i) =>
                                    i === index
                                      ? (item.map((coordinate, k) =>
                                          k === axis ? value : coordinate
                                        ) as Pair)
                                      : item
                                  )
                                )
                            }}
                          />
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <label className="demo-checkbox">
                    <input
                      type="checkbox"
                      checked={guides}
                      onChange={(event) => setGuides(event.target.checked)}
                    />{" "}
                    Circumcircle and medians
                  </label>
                </>
              ) : (
                (scene === "function"
                  ? [
                      ["a", -1.5, 1.5, 0.1],
                      ["b", -2, 2, 0.1],
                      ["c", -3, 3, 0.1],
                      ["at", -3, 3, 0.1],
                    ]
                  : [["damping", 0, 0.8, 0.05]]
                ).map(([key, min, max, step]) => (
                  <label className="demo-field" key={String(key)}>
                    <span className="range-label">
                      {key === "at"
                        ? "Point x"
                        : key === "damping"
                          ? "Damping"
                          : `Coefficient ${key}`}
                      <output>{params[key as keyof typeof params].toFixed(2)}</output>
                    </span>
                    <input
                      type="range"
                      aria-label={key === "at" ? "Tangent point x" : `Geometry ${key}`}
                      min={min}
                      max={max}
                      step={step}
                      value={params[key as keyof typeof params]}
                      onChange={(event) =>
                        setParams((current) => ({ ...current, [key]: +event.target.value }))
                      }
                    />
                  </label>
                ))
              )}
            </div>
          </section>
          <section className="demo-panel">
            <div className="demo-panel-head">
              <h2>Live measurements</h2>
            </div>
            <div className="demo-panel-body geometry-measures" aria-live="polite">
              {scene === "geometry" ? (
                <>
                  <span>
                    Area<strong>{area.toFixed(3)} units²</strong>
                  </span>
                  <span>
                    Perimeter<strong>{perimeter.toFixed(3)} units</strong>
                  </span>
                  <p>
                    Orange: circumcircle. Dashed lines: medians. Collinear points have no unique
                    circumcircle.
                  </p>
                </>
              ) : scene === "function" ? (
                <>
                  <code>
                    f(x) = {params.a.toFixed(1)}x² + {params.b.toFixed(1)}x + {params.c.toFixed(1)}
                  </code>
                  <span>
                    f({params.at.toFixed(2)})
                    <strong>
                      {(params.a * params.at ** 2 + params.b * params.at + params.c).toFixed(3)}
                    </strong>
                  </span>
                  <span>
                    Tangent slope<strong>{(2 * params.a * params.at + params.b).toFixed(3)}</strong>
                  </span>
                </>
              ) : (
                <>
                  <code>
                    x′ = y − {params.damping.toFixed(2)}x<br />
                    y′ = −x − {params.damping.toFixed(2)}y
                  </code>
                  <p>
                    Drag the initial point. The orange curve is the analytic trajectory from that
                    position.
                  </p>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
