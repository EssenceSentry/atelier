import * as SandDance from "@msrvida/sanddance"
import { Download, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import * as vega from "vega"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download, groups, samples } from "./data"

SandDance.use(vega as unknown as Parameters<typeof SandDance.use>[0])
const layouts = {
  scatterplot: "Scatterplot",
  stacks: "Stacks",
  grid: "Grid",
  treemap: "Treemap",
} as const
const numeric = ["x", "y", "score", "volume"]
const fields = [...numeric, "group"]
type Settings = {
  chart: keyof typeof layouts
  x: string
  y: string
  z: string
  color: string
  size: string
  view: "2d" | "3d"
  filter: string
}
const defaults: Settings = {
  chart: "scatterplot",
  x: "x",
  y: "y",
  z: "score",
  color: "group",
  size: "",
  view: "3d",
  filter: "",
}

export default function SandDanceStudy() {
  const tokens = useVizTokens()
  const [settings, setSettings] = useState(() => canvasState(defaults))
  const [initialCamera] = useState(
    () => canvasState({ camera: null as SandDance.types.Camera | null }).camera
  )
  const [camera, setCamera] = useState(initialCamera)
  const host = useRef<HTMLDivElement>(null)
  const viewer = useRef<SandDance.Viewer | null>(null)
  const queue = useRef(Promise.resolve())
  const [bounds, setBounds] = useState({ width: 600, height: 530 })
  const [selected, setSelected] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState("")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const change = (key: keyof Settings, value: string) =>
    setSettings((current) => ({ ...current, [key]: value }))
  const visible = useMemo(
    () => (settings.filter ? samples.filter((row) => row.group === settings.filter) : samples),
    [settings.filter]
  )
  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      setBounds({
        width: Math.round(element.clientWidth),
        height: Math.round(element.clientHeight),
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!host.current || !tokens || bounds.width < 1) return
    if (!viewer.current)
      viewer.current = new SandDance.Viewer(host.current, {
        onSelectionChanged: (_search, _index, rows) => {
          const records = (rows ?? []) as typeof samples
          setSelected(records.map((row) => row.id))
          setSelectedRegion(
            records.length === 80 && records.every((row) => row.group === records[0]?.group)
              ? records[0].group
              : ""
          )
        },
        onError: (errors) => setError(errors.join(" · ")),
        // A compact themed tooltip avoids the explorer's default floating panels.
        tooltipOptions: {
          create: ({ dataItem, event }) => {
            const row = dataItem as (typeof samples)[number]
            const element = document.createElement("div")
            element.className = "sanddance-study-tooltip"
            element.textContent = `${row.id} · ${row.group} · score ${row.score.toFixed(3)} · volume ${row.volume}`
            const point = event as MouseEvent
            element.style.left = `${Math.min(point.clientX + 12, window.innerWidth - 300)}px`
            element.style.top = `${Math.max(10, point.clientY - 42)}px`
            document.body.append(element)
            return { destroy: () => element.remove() }
          },
        },
      })
    const instance = viewer.current
    instance.options.colors = {
      backgroundColor: tokens.surface,
      defaultCube: tokens.series[0],
      activeCube: tokens.primary,
      hoveredCube: tokens.ink,
      selectedCube: tokens.primary,
      axisSelectHighlight: tokens.primary,
      axisLine: tokens.axis,
      axisText: tokens.text,
      gridLine: tokens.grid,
    }
    instance.options.fontFamily = tokens.font
    vega.scheme(
      "atelierSandDance",
      settings.color === "group"
        ? [...groups].sort().map((group) => tokens.series[groups.indexOf(group)])
        : [tokens.rampLow, tokens.series[0], tokens.ink]
    )
    const insight: SandDance.specs.Insight = {
      chart: settings.chart,
      size: bounds,
      view: settings.view,
      columns: {
        uid: "id",
        x: settings.x,
        y: settings.y,
        z: settings.view === "3d" && settings.z ? settings.z : undefined,
        color: settings.color || undefined,
        size: settings.size || undefined,
        sort: "id",
      },
      scheme: "atelierSandDance",
      hideLegend: true,
      signalValues:
        settings.chart === "scatterplot"
          ? {
              // SandDance's sized scatter default can produce blocks a quarter of
              // the plot wide. Keep the largest block near 8px across viewport sizes.
              Chart_PointScaleSignal: settings.size
                ? 160 / Math.min(bounds.width, bounds.height)
                : 5,
            }
          : undefined,
    }
    let disposed = false
    setReady(false)
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (disposed || viewer.current !== instance) return
        const result = await instance.render(
          {
            insight,
            setup: {
              transitionDurations: {
                position: reducedMotion ? 0 : 700,
                stagger: reducedMotion ? 0 : 100,
                view: reducedMotion ? 0 : 400,
              },
              ...(canvasOnly && initialCamera ? { camera: initialCamera } : {}),
            },
          },
          visible.map((row) => ({ ...row }))
        )
        if (disposed) return
        if (result.specResult.errors?.length) throw new Error(result.specResult.errors.join(" · "))
        instance.presenter.morphchartsref.core.config.fov =
          bounds.width < 450 ? Math.PI / 3 : Math.PI / 6
        // Viewer.render resolves when the transition starts. Wait for the
        // camera/mark transition before declaring the view ready to inspect.
        if (!reducedMotion) await new Promise((resolve) => setTimeout(resolve, 1000))
        if (disposed) return
        setError("")
        setReady(true)
        setCamera(instance.getCamera(true))
      })
      .catch((cause: unknown) => {
        if (!disposed) setError(String(cause))
      })
    return () => {
      disposed = true
    }
  }, [tokens, settings, bounds, initialCamera, visible])
  useEffect(
    () => () => {
      viewer.current?.finalize()
      viewer.current = null
    },
    []
  )
  const choices = (role: keyof Settings, list: string[], optional = false, disabled = false) => (
    <label className="demo-field" key={role}>
      <span>
        {role === "color" ? "Color" : role === "size" ? "Size" : `${role.toUpperCase()} axis`}
      </span>
      <select
        aria-label={`SandDance ${role}`}
        value={settings[role]}
        disabled={disabled}
        onChange={(event) => change(role, event.target.value)}
      >
        {optional && <option value="">None</option>}
        {list.map((field) => (
          <option key={field} value={field}>
            {field === "group" ? "Region" : field}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <div className="demo-stack sanddance-study">
      <fieldset className="demo-toolbar sanddance-layouts" aria-label="SandDance layouts">
        {Object.entries(layouts).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={`demo-button ${settings.chart === value ? "primary" : ""}`}
            aria-pressed={settings.chart === value}
            onClick={() =>
              setSettings((current) => ({
                ...current,
                chart: value as Settings["chart"],
                size: value === "treemap" && !current.size ? "volume" : current.size,
              }))
            }
          >
            {label}
          </button>
        ))}
        <span className="demo-meta">Each block is one record. Watch it move between layouts.</span>
      </fieldset>
      <div className="sanddance-workspace">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>A dataset in motion</h2>
              <p>
                {visible.length} / {samples.length} illustrative records ·{" "}
                {settings.view.toUpperCase()}
                {!ready && !error ? " · Updating layout…" : ""}
              </p>
            </div>
            <div className="demo-toolbar">
              <CanvasTab view="sanddance" state={{ ...settings, camera }} />
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  setSettings(defaults)
                  setSelected([])
                  setSelectedRegion("")
                  void viewer.current?.deselect()
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>
          <div
            ref={host}
            className="sanddance-canvas"
            data-ready={ready}
            data-testid="sanddance-canvas"
            onPointerUp={() => {
              if (viewer.current?.presenter) setCamera(viewer.current.getCamera())
            }}
            onWheel={() => {
              requestAnimationFrame(() => {
                if (viewer.current?.presenter) setCamera(viewer.current.getCamera())
              })
            }}
          />
          {error && (
            <p role="alert" className="demo-panel-note">
              {error}
            </p>
          )}
          {settings.color === "group" && (
            <div className="demo-panel-note group-key">
              {groups.map((group, i) => (
                <span key={group}>
                  <i style={{ background: `var(--series-${i + 1})` }} />
                  {group}
                </span>
              ))}
            </div>
          )}
          <div className="demo-panel-note">
            Drag to pan · pinch or scroll to zoom · Shift-drag to orbit. Select a block or use the
            region selector.
          </div>
        </section>
        <aside className="demo-stack sanddance-controls">
          <section className="demo-panel">
            <div className="demo-panel-head">
              <h2>Assign dimensions</h2>
              <span className="demo-meta">SandDance</span>
            </div>
            <div className="demo-panel-body sanddance-fields">
              <label className="demo-field">
                <span>View</span>
                <select
                  aria-label="SandDance view"
                  value={settings.view}
                  onChange={(event) => change("view", event.target.value)}
                >
                  <option value="3d">3D perspective</option>
                  <option value="2d">2D plane</option>
                </select>
              </label>
              {choices("x", fields, false, ["grid", "treemap"].includes(settings.chart))}
              {choices("y", fields, false, ["grid", "treemap"].includes(settings.chart))}
              {choices("z", numeric, true, settings.view === "2d" || settings.chart === "stacks")}
              {choices("color", fields, true)}
              {choices(
                "size",
                ["score", "volume"],
                settings.chart !== "treemap",
                ["grid", "stacks"].includes(settings.chart)
              )}
            </div>
          </section>
          <section className="demo-panel">
            <div className="demo-panel-head">
              <h2>Selection & scope</h2>
            </div>
            <div className="demo-panel-body input-form">
              <label className="demo-field">
                <span>Show records</span>
                <select
                  aria-label="SandDance filter"
                  value={settings.filter}
                  onChange={(event) => {
                    change("filter", event.target.value)
                    setSelected([])
                  }}
                >
                  <option value="">All regions</option>
                  {groups.map((group) => (
                    <option key={group}>{group}</option>
                  ))}
                </select>
              </label>
              <label className="demo-field">
                <span>Select a region</span>
                <select
                  aria-label="SandDance select region"
                  value={selectedRegion}
                  onChange={(event) => {
                    setSelectedRegion(event.target.value)
                    if (event.target.value)
                      void viewer.current?.select({
                        name: "group",
                        operator: "==",
                        value: event.target.value,
                      })
                    else void viewer.current?.deselect()
                  }}
                >
                  <option value="">Choose a region…</option>
                  {groups.map((group) => (
                    <option key={group}>{group}</option>
                  ))}
                </select>
              </label>
              <p role="status" className="demo-meta">
                {selected.length} selected / {visible.length} shown
              </p>
              <button
                type="button"
                className="demo-button"
                disabled={!selected.length}
                onClick={() =>
                  download(
                    "sanddance-selection.json",
                    JSON.stringify(
                      samples.filter((row) => selected.includes(row.id)),
                      null,
                      2
                    )
                  )
                }
              >
                <Download size={12} /> Export selected records
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
