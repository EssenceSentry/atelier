import { vegaConfig } from "@atelier/theme/vega"
import cql from "compassql/build/compassql.js"
import type { EncodingQuery } from "compassql/build/src/query/encoding"
import type { Query } from "compassql/build/src/query/query"
import { ArrowLeft, Download, GripVertical, RotateCcw, Sparkles } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import embed, { type VisualizationSpec } from "vega-embed"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download, groups, samples } from "./data"

type Channel = "x" | "y" | "color" | "size" | "shape" | "row" | "column"
type Field = {
  field?: string
  type: "quantitative" | "nominal" | "temporal"
  aggregate?: "mean" | "sum" | "median" | "count"
  bin?: boolean
  timeUnit?: string
}
type Unit = { mark: string; encoding: Partial<Record<Channel, Field>> }
type Suggestion = { spec: Unit; reason: string; score: number }
const dimensions = [
  { field: "score", label: "Score", type: "quantitative" },
  { field: "volume", label: "Volume", type: "quantitative" },
  { field: "x", label: "Position x", type: "quantitative" },
  { field: "y", label: "Position y", type: "quantitative" },
  { field: "group", label: "Region", type: "nominal" },
  { field: "day", label: "Day", type: "temporal" },
  { field: "reviewed", label: "Reviewed", type: "nominal" },
] as const
const channels: Channel[] = ["x", "y", "color", "size", "shape", "row", "column"]
const accepts = (channel: Channel, type: Field["type"]) =>
  channel === "size"
    ? type === "quantitative"
    : ["shape", "row", "column"].includes(channel)
      ? type === "nominal"
      : true
const defaults: Unit = {
  mark: "point",
  encoding: {
    x: { field: "score", type: "quantitative" },
    y: { field: "volume", type: "quantitative" },
    color: { field: "group", type: "nominal" },
  },
}
const schema = cql.schema.build(samples.map((row) => ({ ...row })))
const fieldLabel = (field?: string) =>
  dimensions.find((item) => item.field === field)?.label ?? "Records"
const title = (spec: Unit) =>
  `${fieldLabel(spec.encoding.y?.field)} × ${fieldLabel(spec.encoding.x?.field)}`
const signature = (spec: Unit) =>
  JSON.stringify([spec.mark, channels.map((channel) => [channel, spec.encoding[channel] ?? null])])

function cleanUnit(spec: Unit): Unit {
  return {
    mark: spec.mark,
    encoding: Object.fromEntries(
      channels.flatMap((channel) => {
        const field = spec.encoding[channel]
        return field
          ? [
              [
                channel,
                {
                  field: field.field,
                  type: field.type,
                  ...(field.aggregate ? { aggregate: field.aggregate } : {}),
                  ...(field.bin ? { bin: field.bin } : {}),
                  ...(field.timeUnit ? { timeUnit: field.timeUnit } : {}),
                },
              ],
            ]
          : []
      })
    ),
  }
}

// CompassQL generates and ranks these candidates. Query families define the
// neighborhood; effectiveness ranks encoding choices, not data significance.
function recommend(focus: Unit, family: string): Suggestion[] {
  const queries: { query: Query; reason: string }[] = []
  const used = Object.values(focus.encoding).flatMap((field) => (field.field ? [field.field] : []))
  const base = Object.entries(focus.encoding).map(([channel, field]) => ({
    ...field,
    channel,
  })) as EncodingQuery[]
  if (family === "encode") {
    const encodings = base.map((field) => ({
      ...field,
      channel: {
        enum:
          field.channel === "x" || field.channel === "y"
            ? ["x", "y"]
            : field.channel === "color" && "type" in field && field.type === "nominal"
              ? ["color", "row", "column", "shape"]
              : [field.channel],
      },
    })) as EncodingQuery[]
    queries.push({
      query: { spec: { mark: "?", encodings }, orderBy: "effectiveness" },
      reason: "Alternative encoding of the same fields",
    })
  } else if (family === "add") {
    for (const dimension of dimensions.filter(
      (item) => !used.includes(item.field) && item.type !== "temporal"
    )) {
      const free = (
        dimension.type === "quantitative" ? ["size", "color"] : ["color", "shape", "row", "column"]
      ).filter((channel) => !focus.encoding[channel as Channel])
      if (!free.length) continue
      queries.push({
        query: {
          spec: {
            mark: "?",
            encodings: [
              ...base,
              {
                channel: { enum: free },
                field: dimension.field,
                type: dimension.type,
              } as EncodingQuery,
            ],
          },
          orderBy: "effectiveness",
        },
        reason: `Add ${dimension.label.toLowerCase()} to the view`,
      })
    }
  } else {
    const measure =
      Object.values(focus.encoding).find((field) => field.type === "quantitative" && field.field)
        ?.field ?? "score"
    const group =
      Object.values(focus.encoding).find((field) => field.type === "nominal" && field.field)
        ?.field ?? "group"
    queries.push({
      query: {
        spec: {
          mark: "?",
          encodings: [
            { channel: { enum: ["x", "y"] }, field: group, type: "nominal" },
            {
              channel: { enum: ["x", "y"] },
              field: measure,
              type: "quantitative",
              aggregate: { enum: ["mean", "median", "sum"] },
            },
          ],
        },
        orderBy: "effectiveness",
      },
      reason: `Summarize ${fieldLabel(measure).toLowerCase()} by ${fieldLabel(group).toLowerCase()}`,
    })
  }
  const all: Suggestion[] = []
  for (const { query, reason } of queries) {
    const result = cql.recommend(query, schema).result
    cql.result.mapLeaves(result, (model) => {
      const unit = model.toSpec()
      if (unit)
        all.push({
          spec: cleanUnit({
            mark: unit.mark as string,
            encoding: unit.encoding as Unit["encoding"],
          }),
          reason,
          score: model.getRankingScore("effectiveness")?.score ?? 0,
        })
      return null
    })
  }
  const seen = new Set([signature(focus)])
  return all
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      const key = signature(item.spec)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

function Chart({ spec, small = false }: { spec: Unit; small?: boolean }) {
  const tokens = useVizTokens()
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [availableHeight, setAvailableHeight] = useState(345)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!host.current) return
    const element = host.current
    const observer = new ResizeObserver(() => {
      setWidth(Math.round(element.clientWidth))
      setAvailableHeight(Math.round(element.clientHeight))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!tokens || !host.current || width < 1) return
    let disposed = false
    let finalize: (() => void) | undefined
    const encoding = structuredClone(spec.encoding) as Record<string, Record<string, unknown>>
    const columns = spec.encoding.column?.field
      ? new Set(samples.map((row) => row[spec.encoding.column?.field as keyof typeof row])).size
      : 1
    const rows = spec.encoding.row?.field
      ? new Set(samples.map((row) => row[spec.encoding.row?.field as keyof typeof row])).size
      : 1
    if (encoding.color)
      encoding.color.scale =
        encoding.color.field === "group"
          ? { domain: groups, range: tokens.series.slice(0, 3) }
          : encoding.color.type === "quantitative"
            ? { range: [tokens.rampLow, tokens.series[0], tokens.ink] }
            : { range: tokens.series }
    if (small) {
      for (const channel of ["color", "size", "shape"])
        if (encoding[channel]) encoding[channel].legend = null
      for (const channel of ["x", "y"])
        if (encoding[channel])
          encoding[channel].axis = rows > 1 || columns > 1 ? null : { title: null, tickCount: 3 }
      for (const channel of ["row", "column"])
        if (encoding[channel])
          encoding[channel].header = { title: null, labelFontSize: 8, labelLimit: 35 }
    }
    const height =
      canvasOnly && !small
        ? Math.max(200, innerHeight - 100)
        : small
          ? innerWidth > 1100
            ? Math.max(45, availableHeight - 12)
            : 135
          : innerWidth > 1100
            ? Math.max(100, availableHeight - 24)
            : 345
    const spacing = small ? 4 : 32
    const plotWidth = Math.max(20, (width - 110 - (columns - 1) * spacing) / columns)
    void embed(
      host.current,
      {
        data: { values: samples },
        mark: {
          type: spec.mark,
          tooltip: !small,
          color: tokens.series[0],
          ...(spec.mark === "point" ? { filled: true, size: small ? 20 : 42, opacity: 0.75 } : {}),
        },
        encoding,
        width: columns === 1 && rows === 1 ? width - 24 : plotWidth,
        height: Math.max(small ? 8 : 40, (height - (rows - 1) * spacing) / rows),
        ...(small ? { spacing: 4 } : {}),
        ...(columns === 1 && rows === 1 ? { autosize: { type: "fit", contains: "padding" } } : {}),
        ...(small ? {} : { params: [{ name: "chartZoom", select: "interval", bind: "scales" }] }),
        config: vegaConfig(tokens, small),
      } as VisualizationSpec,
      { actions: false, renderer: "svg" }
    )
      .then((result) => {
        if (disposed) result.finalize()
        else {
          finalize = result.finalize
          setError("")
          host.current?.setAttribute("data-ready", "true")
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) setError(String(cause))
      })
    return () => {
      disposed = true
      finalize?.()
    }
  }, [tokens, spec, small, width, availableHeight])
  return (
    <div className={`recommend-chart ${small ? "small" : ""}`} ref={host}>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default function RecommendStudy() {
  const [focus, setFocus] = useState<Unit>(() => canvasState(defaults))
  const [history, setHistory] = useState<Unit[]>([])
  const [family, setFamily] = useState("encode")
  const suggestions = useMemo(() => recommend(focus, family), [focus, family])
  const promote = (spec: Unit) => {
    setHistory((current) => [...current, focus])
    setFocus(spec)
  }
  const assign = (channel: Channel, field: string) => {
    const encoding = { ...focus.encoding }
    const dimension = dimensions.find((item) => item.field === field)
    if (dimension && !accepts(channel, dimension.type)) return
    if (dimension) encoding[channel] = { field, type: dimension.type }
    else delete encoding[channel]
    promote({ ...focus, encoding })
  }
  if (canvasOnly)
    return (
      <div className="demo-stack recommend-canvas-only">
        <Chart spec={focus} />
      </div>
    )
  return (
    <div className="demo-stack recommend-study" data-notebook-group="Chart recommendations">
      <div className="recommend-workspace">
        <aside className="demo-stack recommend-shelves">
          <section className="demo-panel">
            <div className="demo-panel-head">
              <h2>Assign fields</h2>
            </div>
            <div className="demo-panel-body encoding-shelves">
              <label className="encoding-shelf">
                <span>Mark</span>
                <select
                  aria-label="Chart mark"
                  value={focus.mark}
                  onChange={(event) => promote({ ...focus, mark: event.target.value })}
                >
                  {["point", "bar", "tick", "line", "area", "rect"].map((mark) => (
                    <option key={mark}>{mark}</option>
                  ))}
                </select>
              </label>
              {channels.map((channel) => (
                <fieldset
                  className="encoding-shelf"
                  aria-label={`${channel} shelf`}
                  key={channel}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    assign(channel, event.dataTransfer.getData("text/plain"))
                  }}
                >
                  <label htmlFor={`shelf-${channel}`}>
                    {channel === "x" || channel === "y"
                      ? `${channel.toUpperCase()} axis`
                      : channel[0].toUpperCase() + channel.slice(1)}
                  </label>
                  <select
                    id={`shelf-${channel}`}
                    aria-label={`${channel} encoding`}
                    value={focus.encoding[channel]?.field ?? ""}
                    onChange={(event) => assign(channel, event.target.value)}
                  >
                    <option value="">None</option>
                    {dimensions
                      .filter((dimension) =>
                        channel === "size"
                          ? dimension.type === "quantitative"
                          : ["shape", "row", "column"].includes(channel)
                            ? dimension.type === "nominal"
                            : true
                      )
                      .map((dimension) => (
                        <option key={dimension.field} value={dimension.field}>
                          {dimension.label}
                        </option>
                      ))}
                  </select>
                </fieldset>
              ))}
              {Object.entries(focus.encoding)
                .filter(([, field]) => field.aggregate)
                .map(([channel, field]) => (
                  <p key={channel} className="demo-meta">
                    {channel.toUpperCase()}: {field.aggregate}({fieldLabel(field.field)})
                  </p>
                ))}
            </div>
          </section>
          <details className="demo-panel field-disclosure">
            <summary>Optional field shortcuts</summary>
            <div className="demo-panel-body field-inventory">
              {dimensions.map((dimension) => (
                <button
                  type="button"
                  onClick={() =>
                    assign(
                      channels.find(
                        (channel) => !focus.encoding[channel] && accepts(channel, dimension.type)
                      ) ?? "x",
                      dimension.field
                    )
                  }
                  className="dimension-chip"
                  key={dimension.field}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", dimension.field)}
                >
                  <GripVertical size={12} />
                  <span className="dimension-type">
                    {dimension.type === "quantitative"
                      ? "#"
                      : dimension.type === "temporal"
                        ? "◷"
                        : "Aa"}
                  </span>
                  {dimension.label}
                </button>
              ))}
              <p className="demo-meta">
                Use the menus above to assign fields. These shortcuts also support dragging or
                filling an unused channel.
              </p>
            </div>
          </details>
        </aside>
        <section className="demo-panel recommend-focus">
          <div className="demo-panel-head">
            <div>
              <h2>{title(focus)}</h2>
              <p>Specified view · {focus.mark} · scroll to zoom, drag to pan</p>
            </div>
            <div className="demo-toolbar">
              <button
                type="button"
                className="demo-button"
                disabled={!history.length}
                onClick={() => {
                  const previous = history.at(-1)
                  if (previous) {
                    setFocus(previous)
                    setHistory((current) => current.slice(0, -1))
                  }
                }}
              >
                <ArrowLeft size={12} /> Back
              </button>
              <button
                type="button"
                className="demo-button"
                onClick={() => promote(structuredClone(defaults))}
              >
                <RotateCcw size={12} /> Reset
              </button>
              <CanvasTab view="recommend" state={focus} />
              <button
                type="button"
                className="demo-button"
                onClick={() =>
                  download(
                    "recommended-chart.vl.json",
                    JSON.stringify(
                      {
                        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
                        data: { values: samples },
                        ...focus,
                      },
                      null,
                      2
                    )
                  )
                }
              >
                <Download size={12} /> Spec
              </button>
            </div>
          </div>
          <Chart spec={focus} />
          <div className="demo-panel-note">
            Choose a related view to update the main chart. Recommendations follow the selected
            view.
          </div>
        </section>
      </div>
      <section className="related-section">
        <div className="related-heading">
          <div>
            <span className="eyebrow">
              <Sparkles size={12} /> CompassQL
            </span>
            <h2>Related views</h2>
            <p>Ranked by encoding effectiveness within the selected neighborhood.</p>
          </div>
          <div className="demo-toolbar">
            {[
              ["encode", "Re-encode"],
              ["add", "Add a field"],
              ["summary", "Summarize"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`demo-button ${family === value ? "primary" : ""}`}
                aria-pressed={family === value}
                onClick={() => setFamily(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {suggestions.length ? (
          <div className="recommend-cards">
            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                className="recommend-card"
                key={signature(suggestion.spec)}
                title={suggestion.reason}
                onClick={() => promote(suggestion.spec)}
                aria-label={`Use related view ${index + 1}: ${title(suggestion.spec)}`}
              >
                <div className="recommend-card-head">
                  <span className="demo-meta">
                    {String(index + 1).padStart(2, "0")} · {suggestion.spec.mark}
                  </span>
                  <span>Use view ↗</span>
                </div>
                <Chart spec={suggestion.spec} small />
                <div className="recommend-card-caption">
                  <strong>{title(suggestion.spec)}</strong>
                  <span>{suggestion.reason}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="demo-panel demo-panel-body">
            <p>
              No alternatives fit these assignments. Try another neighborhood or remove a shelf.
            </p>
          </div>
        )}
        <p className="demo-panel-note">
          CompassQL ranks visual encodings. Statistical and causal conclusions require separate
          analysis.
        </p>
      </section>
    </div>
  )
}
