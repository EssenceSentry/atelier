import { OrthographicView, type OrthographicViewState, type PickingInfo } from "@deck.gl/core"
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers"
import { DeckGL } from "@deck.gl/react"
import { Crosshair, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasState } from "./canvas-tab"
import { groups, type Sample, samples } from "./data"

function colorBytes(color: string): [number, number, number, number] {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d")
  if (!context) return [0, 0, 0, 255]
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const values = context.getImageData(0, 0, 1, 1).data
  return [values[0], values[1], values[2], values[3]]
}
const initialCamera: OrthographicViewState = { target: [110, 85, 0], zoom: 0.45 }
const view = new OrthographicView({ id: "survey", controller: true, flipY: false })
type GridLine = { source: [number, number, number]; target: [number, number, number] }
const gridLines: GridLine[] = Array.from({ length: 19 }, (_, i) => (i - 6) * 50).flatMap((n) => [
  {
    source: [n, -300, -1] as [number, number, number],
    target: [n, 600, -1] as [number, number, number],
  },
  {
    source: [-300, n, -1] as [number, number, number],
    target: [600, n, -1] as [number, number, number],
  },
])

export default function Spatial() {
  const [initial] = useState(() =>
    canvasState({
      selected: samples[51],
      camera: initialCamera,
      size: true,
      hidden: [] as string[],
    })
  )
  const tokens = useVizTokens()
  const [selected, setSelected] = useState<Sample | null>(initial.selected)
  const [camera, setCamera] = useState(initial.camera)
  const [size, setSize] = useState(initial.size)
  const [hidden, setHidden] = useState<string[]>(initial.hidden)
  const [error, setError] = useState("")
  const visible = samples.filter((row) => !hidden.includes(row.group))
  const palette = useMemo(() => tokens?.series.map(colorBytes), [tokens])
  const layers = useMemo(
    () =>
      tokens && palette
        ? [
            new LineLayer<GridLine>({
              id: "survey-grid",
              data: gridLines,
              getSourcePosition: (row) => row.source,
              getTargetPosition: (row) => row.target,
              getColor: colorBytes(tokens.grid),
              getWidth: 1,
              pickable: false,
              coordinateSystem: "cartesian",
            }),
            new ScatterplotLayer<Sample>({
              id: "observations",
              data: samples.filter((row) => !hidden.includes(row.group)),
              getPosition: (row) => [row.x * 70, row.y * 70, 0],
              getFillColor: (row) => palette[groups.indexOf(row.group)],
              getLineColor: colorBytes(tokens.surface),
              getLineWidth: 0.8,
              lineWidthUnits: "pixels",
              getRadius: (row) => (size ? Math.sqrt(row.volume) / 4 : 5),
              radiusUnits: "pixels",
              stroked: true,
              pickable: true,
              autoHighlight: true,
              highlightColor: colorBytes(tokens.primary),
              onClick: (info: PickingInfo<Sample>) => {
                if (info.object) setSelected(info.object)
              },
              updateTriggers: {
                getFillColor: [palette],
                getRadius: [size],
              },
              coordinateSystem: "cartesian",
            }),
            new ScatterplotLayer<Sample>({
              id: "selection-ring",
              data: selected && !hidden.includes(selected.group) ? [selected] : [],
              getPosition: (row) => [row.x * 70, row.y * 70, 0],
              getRadius: (row) => (size ? Math.sqrt(row.volume) / 4 : 5) + 4,
              radiusUnits: "pixels",
              filled: false,
              stroked: true,
              getLineColor: colorBytes(tokens.ink),
              getLineWidth: 1.8,
              lineWidthUnits: "pixels",
              updateTriggers: { getRadius: [size] },
              coordinateSystem: "cartesian",
            }),
          ]
        : [],
    [tokens, palette, selected, size, hidden]
  )
  return (
    <div className="demo-stack">
      <div className="demo-toolbar" style={{ justifyContent: "space-between" }}>
        <div className="explore-filters">
          <span className="demo-meta">Regions</span>
          {groups.map((group) => (
            <button
              type="button"
              className="filter-pill"
              aria-pressed={!hidden.includes(group)}
              key={group}
              onClick={() =>
                setHidden((current) =>
                  current.includes(group)
                    ? current.filter((item) => item !== group)
                    : [...current, group]
                )
              }
            >
              {group}
            </button>
          ))}
        </div>
        <label className="demo-checkbox">
          <input
            type="checkbox"
            checked={size}
            onChange={(event) => setSize(event.target.checked)}
          />{" "}
          Size by volume
        </label>
      </div>
      <div className="spatial-workspace">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Illustrative site survey</h2>
              <p>{visible.length} observations · coordinates in meters</p>
            </div>
            <div className="demo-toolbar">
              <CanvasTab view="spatial" state={{ selected, camera, size, hidden }} />
              <button
                type="button"
                className="demo-button"
                onClick={() => setCamera(initialCamera)}
              >
                <RotateCcw size={12} /> Reset camera
              </button>
            </div>
          </div>
          <div className="spatial-canvas" data-testid="spatial-canvas">
            {tokens && (
              <DeckGL
                views={view}
                viewState={camera}
                onViewStateChange={({ viewState }) => setCamera(viewState as OrthographicViewState)}
                layers={layers}
                onError={(cause) => setError(cause.message)}
                getTooltip={({ object }: PickingInfo<Sample>) =>
                  object
                    ? {
                        text: `${object.id} · ${object.group}\nScore ${object.score.toFixed(3)}\nVolume ${object.volume}`,
                        style: {
                          backgroundColor: tokens.popover,
                          color: tokens.ink,
                          border: `1px solid ${tokens.border}`,
                          fontSize: "12px",
                          fontFamily: tokens.font,
                          padding: "10px",
                        },
                      }
                    : null
                }
              />
            )}
          </div>
          <div className="demo-panel-note">
            <div className="group-key">
              {groups.map((group, i) => (
                <span key={group}>
                  <i style={{ background: `var(--series-${i + 1})` }} />
                  {group}
                </span>
              ))}
              <span>Grid spacing: 50 m</span>
            </div>
          </div>
        </section>
        <aside className="demo-panel spatial-inspector">
          <div className="demo-panel-head">
            <h2>Observation</h2>
            <Crosshair size={15} />
          </div>
          <div className="demo-panel-body">
            {selected ? (
              <>
                <span className="eyebrow">{selected.group}</span>
                <div className="inspector-symbol">{selected.id}</div>
                <dl className="spatial-values">
                  <div>
                    <dt>Score</dt>
                    <dd>{selected.score.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt>Volume</dt>
                    <dd>{selected.volume.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>x coordinate</dt>
                    <dd>{(selected.x * 70).toFixed(1)} m</dd>
                  </div>
                  <div>
                    <dt>y coordinate</dt>
                    <dd>{(selected.y * 70).toFixed(1)} m</dd>
                  </div>
                  <div>
                    <dt>Review</dt>
                    <dd>{selected.reviewed ? "Reviewed" : "Pending"}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="demo-button"
                  onClick={() =>
                    setCamera((now) => ({
                      ...now,
                      target: [selected.x * 70, selected.y * 70, 0],
                      zoom: 1.6,
                    }))
                  }
                >
                  Center on observation
                </button>
              </>
            ) : (
              <p className="status-message">Select an observation to inspect its values.</p>
            )}
          </div>
          <div className="demo-panel-note">
            Synthetic coordinates illustrate spatial interaction. They do not represent a geographic
            survey.
          </div>
        </aside>
      </div>
      {error && (
        <p role="alert" className="status-message error">
          {error}
        </p>
      )}
    </div>
  )
}
