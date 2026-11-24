import type { VizTokens } from "@atelier/theme/viz"
import * as Plot from "@observablehq/plot"
import { ChevronDown, Download, SlidersHorizontal } from "lucide-react"
import { type ReactNode, useCallback, useId, useState } from "react"
import { AppBar } from "@/blocks/app-bar"
import { ChartPanel, ChartRow } from "@/blocks/chart-panel"
import { Legend, LegendMark } from "@/blocks/legend"
import { labelWidth, PlotFigure, tipStyle } from "@/blocks/plot-figure"
import { Eyebrow, Meta, SectionHeader, Thumb } from "@/blocks/primitives"
import { ActionButton } from "@/blocks/states"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { contributions, neighbors, points, prCurves } from "@/lib/sample"

type Point = (typeof points)[number]

/** Everything the controls change; the charts are rebuilt from it. */
type Settings = {
  projection: "pca" | "umap" | "polar"
  colourBy: "label" | "score"
  temperature: number
  k: number
  boundary: boolean
}

const PROJECTIONS = [
  ["pca", "PCA"],
  ["umap", "UMAP"],
  ["polar", "Polarity"],
] as const
const COLOUR_BY = [
  { value: "label", label: "Reviewed label" },
  { value: "score", label: "Probe score" },
]

// The sample's scores are at T = 0.7. Recovering the probe's raw logit lets
// any temperature rescale them, and puts the boundary where the logit is 0.
const SAMPLE_T = 0.7
const logit = (p: Point) => Math.log(p.score / (1 - p.score)) * SAMPLE_T
const scoreAt = (p: Point, temperature: number) => 1 / (1 + Math.exp(-logit(p) / temperature))

/** Where each projection puts a point; UMAP is the sample's own layout. */
const project = (p: { x: number; y: number }, projection: Settings["projection"]) =>
  projection === "pca"
    ? { x: 0.8 * p.x + 0.35 * p.y, y: 0.6 * p.y - 0.3 * p.x }
    : projection === "polar"
      ? { x: 0.9 * p.x + 0.43 * p.y - 0.29, y: 0.43 * p.x - 0.9 * p.y }
      : { x: p.x, y: p.y }

// The selection is made in the UMAP layout and stays the same items when the
// projection changes.
const BRUSH = { x1: 0.55, x2: 2.45, y1: -0.15, y2: 1.75 }
const inBrush = (p: { x: number; y: number }) =>
  p.x >= BRUSH.x1 && p.x <= BRUSH.x2 && p.y >= BRUSH.y1 && p.y <= BRUSH.y2
const selection = points.filter(inBrush)
const selectionIds = new Set(selection.map((p) => p.id))
const selectionCorners = [
  { x: BRUSH.x1, y: BRUSH.y1 },
  { x: BRUSH.x2, y: BRUSH.y1 },
  { x: BRUSH.x2, y: BRUSH.y2 },
  { x: BRUSH.x1, y: BRUSH.y2 },
]
const selected = points
  .filter((p) => p.label === "Travel" && inBrush(p))
  .sort((a, b) => b.score - a.score)[40]

// Travel, the class under study, takes series 1; everything else is neutral so
// the eye goes to it. Other charts use ink and series 3 onwards, so no colour
// means two things.
const LABELS = ["Travel", "Not travel"]
const METHODS = ["Weighted", "Max", "RRF"]
const labelColours = (t: VizTokens) => ({ domain: LABELS, range: [t.series[0], t.text] })
const labelSwatch = (label: string) => (label === "Travel" ? "var(--series-1)" : "var(--viz-text)")
const methodColours = (t: VizTokens) => [t.ink, t.series[2], t.series[3]]

/** Downloads the selection with its scores at the current temperature as CSV. */
function exportSelection(temperature: number) {
  const rows = [
    "id,label,score",
    ...selection.map((p) => `${p.id},${p.label},${scoreAt(p, temperature).toFixed(4)}`),
  ]
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }))
  Object.assign(document.createElement("a"), { href: url, download: "selection.csv" }).click()
  URL.revokeObjectURL(url)
}

const extent = (values: number[]) => [Math.min(...values), Math.max(...values)]

const scatter = (t: VizTokens, s: Settings) => {
  const placed = points.map((p) => ({
    ...p,
    ...project(p, s.projection),
    at: scoreAt(p, s.temperature),
  }))
  const xDomain = extent(placed.map((p) => p.x))
  const yDomain = extent(placed.map((p) => p.y))
  // The probe's boundary, 1.9x + 0.9y = 0.6 in the UMAP layout, carried through
  // the same linear projection as the points.
  const boundary = [-4, 5].map((x) => project({ x, y: (0.6 - 1.9 * x) / 0.9 }, s.projection))
  const pin = placed.find((p) => p.id === selected.id) ?? placed[0]
  return {
    marginLeft: labelWidth(t, ["−3.5"]) + 12,
    marginBottom: 24,
    x: { label: null, ticks: 6, tickSize: 0, domain: xDomain },
    y: { label: null, ticks: 5, tickSize: 0, domain: yDomain },
    color:
      s.colourBy === "label"
        ? labelColours(t)
        : { type: "linear" as const, domain: [0, 1], range: [t.rampLow, t.series[0]] },
    marks: [
      Plot.gridX({ stroke: t.grid, strokeOpacity: 1, ticks: 6 }),
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 5 }),
      Plot.line(
        selectionCorners.map((p) => project(p, s.projection)),
        {
          x: "x",
          y: "y",
          curve: "linear-closed",
          fill: t.ink,
          fillOpacity: 0.04,
          stroke: t.ink,
          strokeOpacity: 0.5,
          ariaLabel: () => "Selection outline",
        }
      ),
      Plot.dot(placed, {
        x: "x",
        y: "y",
        r: 2.2,
        fill: s.colourBy === "label" ? "label" : "at",
        fillOpacity: (d: Point) => (selectionIds.has(d.id) ? 0.9 : 0.5),
      }),
      ...(s.boundary
        ? [
            Plot.line(boundary, {
              x: "x",
              y: "y",
              stroke: t.ink,
              strokeWidth: 1.5,
              strokeDasharray: "5,4",
              clip: true,
            }),
          ]
        : []),
      Plot.dot([pin], {
        x: "x",
        y: "y",
        r: 7,
        fill: t.series[0],
        stroke: t.surface,
        strokeWidth: 2.5,
      }),
      Plot.dot([pin], { x: "x", y: "y", r: 11, stroke: t.ink, strokeWidth: 1.25 }),
      Plot.tip(
        placed,
        Plot.pointer({
          x: "x",
          y: "y",
          title: (d: Point & { at: number }) =>
            `item ${d.id}\n${d.label}\nscore ${d.at.toFixed(3)}`,
          ...tipStyle(t),
        })
      ),
    ],
  }
}

const prChart = (t: VizTokens) => {
  const lastPoint = (method: string) => {
    const curve = prCurves.filter((d) => d.method === method)
    return curve[curve.length - 1]
  }
  const ends = METHODS.map(lastPoint)
  return {
    marginLeft: labelWidth(t, ["0.8"]) + 14,
    marginRight: labelWidth(t, METHODS) + 18,
    marginBottom: 26,
    x: { label: null, domain: [0, 1], ticks: 5, tickSize: 0 },
    y: { label: null, domain: [0.3, 1], ticks: 4, tickSize: 0 },
    color: { domain: METHODS, range: methodColours(t) },
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 4 }),
      Plot.ruleX([0.6], { stroke: t.axis }),
      Plot.lineY(prCurves, {
        x: "recall",
        y: "precision",
        stroke: "method",
        strokeWidth: 2,
        curve: "monotone-x",
      }),
      Plot.dot(ends, {
        x: "recall",
        y: "precision",
        fill: "method",
        r: 4,
        stroke: t.surface,
        strokeWidth: 2,
      }),
      Plot.text(ends, {
        x: "recall",
        y: "precision",
        text: "method",
        dx: 9,
        textAnchor: "start",
        fill: t.ink,
      }),
      Plot.text([{ x: 0.6, y: 1 }], {
        x: "x",
        y: "y",
        text: () => "recall target 0.6",
        dx: 4,
        textAnchor: "start",
        fill: t.text,
        fontFamily: t.font,
        fontSize: 11,
      }),
    ],
  }
}

const histogram = (t: VizTokens, s: Settings) => ({
  marginLeft: labelWidth(t, ["200"]) + 14,
  marginBottom: 24,
  x: { label: null, domain: [0, 1], ticks: 5, tickSize: 0 },
  y: { label: null, ticks: 3, tickSize: 0 },
  color: labelColours(t),
  marks: [
    Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 3 }),
    Plot.rectY(
      selection.map((p) => ({ label: p.label, at: scoreAt(p, s.temperature) })),
      Plot.binX<Plot.RectYOptions>(
        { y: "count" },
        {
          x: "at",
          fill: "label",
          thresholds: 20,
          // A surface-coloured edge keeps the stacked labels apart.
          stroke: t.surface,
          strokeWidth: 1,
          insetLeft: 1,
          insetRight: 1,
        }
      )
    ),
    Plot.ruleY([0], { stroke: t.axis }),
  ],
})

const CONTRIBUTION_ROW = 24

const contributionChart = (t: VizTokens) => ({
  marginLeft:
    labelWidth(
      t,
      contributions.map((c) => c.feature)
    ) + 14,
  marginRight: labelWidth(t, ["+0.41"]) + 12,
  marginTop: 4,
  marginBottom: 4,
  x: { label: null, axis: null, domain: [-0.32, 0.48] },
  y: { label: null, domain: contributions.map((c) => c.feature), tickSize: 0 },
  marks: [
    Plot.ruleX([0], { stroke: t.axis }),
    Plot.barX(contributions, {
      x: "value",
      y: "feature",
      // Pushes towards a label take that label's colour.
      fill: (d: { value: number }) => (d.value > 0 ? t.series[0] : t.text),
      rx2: 3,
      insetTop: 4,
      insetBottom: 4,
    }),
    ...[1, -1].map((sign) =>
      Plot.text(
        contributions.filter((d) => Math.sign(d.value) === sign),
        {
          // Negative values are labelled across the baseline so they never
          // collide with the feature names on the left.
          x: sign > 0 ? "value" : () => 0,
          y: "feature",
          text: (d: { value: number }) => (sign > 0 ? "+" : "−") + Math.abs(d.value).toFixed(2),
          dx: 6,
          textAnchor: "start",
          fill: t.ink,
        }
      )
    ),
  ],
})

function Field({
  id,
  label,
  value,
  children,
}: {
  id: string
  label: string
  value?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span id={id} className="text-[13px] font-medium">
          {label}
        </span>
        {value && <span className="label-mono num text-xs text-muted-foreground">{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Controls({
  settings,
  change,
}: {
  settings: Settings
  change: (next: Partial<Settings>) => void
}) {
  const projectionId = useId()
  const colourId = useId()
  const temperatureId = useId()
  const neighboursId = useId()
  const boundaryId = useId()
  return (
    <div className="space-y-7">
      <Field id={projectionId} label="Projection">
        <ToggleGroup
          aria-labelledby={projectionId}
          value={[settings.projection]}
          onValueChange={(value: string[]) =>
            value[0] && change({ projection: value[0] as Settings["projection"] })
          }
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
        >
          {PROJECTIONS.map(([value, name]) => (
            <ToggleGroupItem key={value} value={value} className="flex-1">
              {name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <Field id={colourId} label="Colour by">
        <Select
          items={COLOUR_BY}
          value={settings.colourBy}
          onValueChange={(value) => value && change({ colourBy: value as Settings["colourBy"] })}
        >
          <SelectTrigger aria-labelledby={colourId} size="sm" className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOUR_BY.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {/* Centered thumbs use the value directly, even when the disclosure mounted at zero width. */}
      <Field id={temperatureId} label="Temperature" value={settings.temperature.toFixed(2)}>
        <Slider
          thumbAlignment="center"
          aria-labelledby={temperatureId}
          value={[settings.temperature]}
          onValueChange={(value) => change({ temperature: (value as number[])[0] })}
          min={0.1}
          max={2}
          step={0.05}
        />
        {settings.temperature !== SAMPLE_T && (
          <Button
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => change({ temperature: SAMPLE_T })}
          >
            Reset temperature
          </Button>
        )}
      </Field>
      <Field id={neighboursId} label="Neighbours" value={`k = ${settings.k}`}>
        <Slider
          thumbAlignment="center"
          aria-labelledby={neighboursId}
          value={[settings.k]}
          onValueChange={(value) => change({ k: (value as number[])[0] })}
          min={1}
          max={neighbors.length}
          step={1}
        />
      </Field>
      <div className="flex items-center justify-between text-[13px] font-medium">
        <span id={boundaryId}>Decision boundary</span>
        <Switch
          aria-labelledby={boundaryId}
          checked={settings.boundary}
          onCheckedChange={(boundary) => change({ boundary })}
        />
      </div>
      <div className="well space-y-2 p-3.5">
        <Eyebrow>Probe</Eyebrow>
        <div className="font-mono text-[13px]">p = σ((w·x + b) / T)</div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Lower temperatures move sample scores toward 0 or 1. Higher temperatures move them toward
          0.5.
        </p>
      </div>
    </div>
  )
}

/** In the side column it stacks; `wide` sets the same parts in two columns. */
function Inspector({ settings, wide = false }: { settings: Settings; wide?: boolean }) {
  const buildContrib = useCallback(contributionChart, [])
  const summary = (
    <div className="space-y-3">
      <Eyebrow>Inspector</Eyebrow>
      <Thumb seed="fjord" className="aspect-video max-w-[320px] rounded-lg" />
      <div>
        <h2 className="text-xl leading-tight">Wander North</h2>
        <Meta
          items={[`item ${selected.id}`, "UCx9…f3Qa"]}
          className="label-mono mt-1 block text-[11px] text-muted-foreground"
        />
      </div>
      <div className="flex items-end gap-6">
        <div>
          <div className="figure text-[32px]">
            {scoreAt(selected, settings.temperature).toFixed(3)}
          </div>
          <div className="num mt-1 text-xs text-muted-foreground">
            Probe score at T = {settings.temperature.toFixed(2)}
          </div>
          {settings.temperature !== SAMPLE_T && (
            <div className="num mt-1 text-xs text-muted-foreground">
              Baseline {selected.score.toFixed(3)} at T = {SAMPLE_T.toFixed(2)}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 pb-1 text-sm font-medium">
            <LegendMark colour="var(--series-1)" /> Travel
          </div>
          <div className="text-xs text-muted-foreground">reviewed label</div>
        </div>
      </div>
    </div>
  )
  const details = (
    <>
      <div className="space-y-2">
        <SectionHeader title="Feature contributions" />
        <PlotFigure build={buildContrib} height={contributions.length * CONTRIBUTION_ROW + 8} />
      </div>
      <div className="space-y-2">
        <SectionHeader
          title="Closest by cosine"
          meta={<span className="label-mono num">k = {settings.k}</span>}
        />
        <ul className="divide-y text-[13px]">
          {neighbors.slice(0, settings.k).map((n) => (
            <li key={n.name} className="flex items-center gap-2.5 py-2">
              <LegendMark colour={labelSwatch(n.label)} />
              <span className="min-w-0 flex-1 truncate">{n.name}</span>
              {/* The label in words too, so it never rests on colour alone. */}
              <span className="text-xs text-muted-foreground">{n.label}</span>
              <span className="label-mono num text-xs text-muted-foreground">
                {n.sim.toFixed(3)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
  return wide ? (
    <div className="grid gap-x-8 gap-y-6 md:grid-cols-[280px_1fr]">
      {summary}
      <div className="space-y-6">{details}</div>
    </div>
  ) : (
    <div className="space-y-6">
      {summary}
      {details}
    </div>
  )
}

export function LabScreen({
  product = "Embedding lab",
  icon,
}: {
  product?: string
  icon?: ReactNode
}) {
  const [settings, setSettings] = useState<Settings>({
    projection: "umap",
    colourBy: "label",
    temperature: SAMPLE_T,
    k: 5,
    boundary: true,
  })
  const change = (next: Partial<Settings>) => setSettings((now) => ({ ...now, ...next }))
  const buildScatter = useCallback((t: VizTokens) => scatter(t, settings), [settings])
  const buildPr = useCallback(prChart, [])
  const buildHist = useCallback((t: VizTokens) => histogram(t, settings), [settings])
  const travelShare = selection.filter((p) => p.label === "Travel").length / selection.length
  const projectionName = PROJECTIONS.find(([value]) => value === settings.projection)?.[1]

  return (
    <div className="flex min-h-svh flex-col lg:h-svh">
      <AppBar
        product={product}
        icon={icon}
        crumbs={["Travel channels · sample"]}
        right={
          <ActionButton
            variant="outline"
            size="sm"
            pendingLabel="Exporting…"
            onAction={async () => exportSelection(settings.temperature)}
          >
            <Download /> Export {selection.length} selected
          </ActionButton>
        }
      />

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[264px_1fr] xl:grid-cols-[264px_1fr_320px] 2xl:grid-cols-[264px_1fr_340px]">
        <aside className="hidden min-h-0 space-y-7 overflow-auto border-r bg-sunken/50 p-5 lg:block">
          <Eyebrow>Controls</Eyebrow>
          <Controls settings={settings} change={change} />
        </aside>

        <main className="flex flex-col gap-4 p-4 md:p-5 lg:min-h-0 lg:overflow-auto">
          {/* Narrower windows fold the controls away rather than losing them. */}
          <details className="panel group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="size-4 text-muted-foreground" /> Controls
              <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t p-5">
              <Controls settings={settings} change={change} />
            </div>
          </details>

          {/* Only wide windows fit the scatter to the screen; narrower ones scroll. */}
          <section className="panel flex flex-col gap-3 p-5 xl:min-h-[28rem] xl:flex-1">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h1 className="text-xl leading-tight md:text-[22px]">Channel embeddings</h1>
                <p className="num mt-1 text-xs text-muted-foreground">
                  {projectionName} · {selection.length} of {points.length.toLocaleString("en-US")}{" "}
                  channels selected
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {settings.colourBy === "label" ? (
                  <Legend items={LABELS.map((l) => ({ label: l, colour: labelSwatch(l) }))} />
                ) : (
                  <span className="flex items-center gap-2">
                    probe score <span className="num">0</span>
                    <span
                      className="h-2 w-20 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, var(--viz-ramp-low), var(--series-1))",
                      }}
                    />
                    <span className="num">1</span>
                  </span>
                )}
              </div>
            </div>
            <PlotFigure build={buildScatter} height={360} fill />
          </section>
          <ChartRow className="md:grid-cols-[1.25fr_1fr]">
            <ChartPanel title="Precision against recall">
              <PlotFigure build={buildPr} height={176} />
            </ChartPanel>
            <ChartPanel
              title="Score distribution"
              meta={
                <Legend
                  items={LABELS.map((l) => ({
                    label: l,
                    colour: labelSwatch(l),
                    mark: "square" as const,
                  }))}
                />
              }
              note={
                <Meta
                  items={[
                    `${selection.length} selected`,
                    `${(travelShare * 100).toFixed(0)}% travel`,
                  ]}
                  className="num"
                />
              }
            >
              <PlotFigure build={buildHist} height={176} />
            </ChartPanel>
          </ChartRow>

          <section className="panel p-5 xl:hidden">
            <Inspector settings={settings} wide />
          </section>
        </main>

        <aside className="hidden min-h-0 overflow-auto border-l bg-card p-5 xl:block">
          <Inspector settings={settings} />
        </aside>
      </div>
    </div>
  )
}
