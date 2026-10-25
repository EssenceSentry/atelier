import type { VizTokens } from "@atelier/theme/viz"
import * as Plot from "@observablehq/plot"
import { ChevronDown, Crosshair, Download, Upload } from "lucide-react"
import { type ReactNode, useCallback } from "react"
import { AppBar } from "@/blocks/app-bar"
import { PlotFigure, tipStyle } from "@/blocks/plot-figure"
import { Eyebrow, SectionHeader, Thumb } from "@/blocks/primitives"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { contributions, neighbors, points, prCurves } from "@/lib/sample"

const BRUSH = { x1: 0.55, x2: 2.45, y1: -0.15, y2: 1.75 }
const inBrush = (p: { x: number; y: number }) =>
  p.x >= BRUSH.x1 && p.x <= BRUSH.x2 && p.y >= BRUSH.y1 && p.y <= BRUSH.y2
const selection = points.filter(inBrush)
const selected = points
  .filter((p) => p.label === "Travel" && inBrush(p))
  .sort((a, b) => b.score - a.score)[40]
const LABELS = ["Travel", "Not travel"]

const scatter = (t: VizTokens) => ({
  marginLeft: 28,
  marginBottom: 24,
  x: { label: null, ticks: 6, tickSize: 0 },
  y: { label: null, ticks: 5, tickSize: 0 },
  color: { domain: LABELS, range: [t.series[0], t.series[1]] },
  marks: [
    Plot.gridX({ stroke: t.grid, strokeOpacity: 1, ticks: 6 }),
    Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 5 }),
    Plot.rect([BRUSH], {
      x1: "x1",
      x2: "x2",
      y1: "y1",
      y2: "y2",
      fill: t.primary,
      fillOpacity: 0.05,
      stroke: t.primary,
      strokeOpacity: 0.6,
    }),
    Plot.dot(points, {
      x: "x",
      y: "y",
      r: 2.2,
      fill: "label",
      fillOpacity: (d: { x: number; y: number }) => (inBrush(d) ? 0.85 : 0.3),
    }),
    Plot.dot([selected], {
      x: "x",
      y: "y",
      r: 7,
      fill: t.series[0],
      stroke: t.surface,
      strokeWidth: 2.5,
    }),
    Plot.dot([selected], { x: "x", y: "y", r: 11, stroke: t.ink, strokeWidth: 1.25 }),
    Plot.text([BRUSH], {
      x: "x2",
      y: "y2",
      text: () => `${selection.length} selected`,
      textAnchor: "end",
      dy: -9,
      fill: t.ink,
      fontWeight: 600,
    }),
    Plot.tip(
      points,
      Plot.pointer({
        x: "x",
        y: "y",
        title: (d: { label: string; score: number; id: number }) =>
          `item ${d.id}\n${d.label}\nscore ${d.score.toFixed(3)}`,
        ...tipStyle(t),
      })
    ),
  ],
})

const prChart = (t: VizTokens) => {
  const lastPoint = (method: string) => {
    const curve = prCurves.filter((d) => d.method === method)
    return curve[curve.length - 1]
  }
  const ends = ["Weighted", "Max", "RRF"].map(lastPoint)
  return {
    marginLeft: 32,
    marginRight: 62,
    marginBottom: 26,
    x: { label: null, domain: [0, 1], ticks: 5, tickSize: 0 },
    y: { label: null, domain: [0.3, 1], ticks: 4, tickSize: 0 },
    color: { domain: ["Weighted", "Max", "RRF"], range: t.series.slice(0, 3) },
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
        text: () => "capacity 600",
        dx: 4,
        textAnchor: "start",
        fill: t.text,
        fontSize: 10,
      }),
    ],
  }
}

const histogram = (t: VizTokens) => ({
  marginLeft: 28,
  marginBottom: 24,
  x: { label: null, domain: [0, 1], ticks: 5, tickSize: 0 },
  y: { label: null, ticks: 3, tickSize: 0 },
  marks: [
    Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 3 }),
    Plot.rectY(selection, {
      ...Plot.binX({ y: "count" }, { x: "score", thresholds: 20 }),
      fill: t.primary,
      insetLeft: 1,
      insetRight: 1,
      ry2: 3,
    }),
    Plot.ruleY([0], { stroke: t.axis }),
  ],
})

const contributionChart = (t: VizTokens) => ({
  marginLeft: 150,
  marginRight: 40,
  x: { label: null, axis: null, domain: [-0.32, 0.48] },
  y: { label: null, domain: contributions.map((c) => c.feature), tickSize: 0 },
  marks: [
    Plot.ruleX([0], { stroke: t.axis }),
    Plot.barX(contributions, {
      x: "value",
      y: "feature",
      fill: (d: { value: number }) => (d.value > 0 ? t.divNeg : t.divPos),
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

function Field({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        {value && <span className="label-mono num text-xs text-muted-foreground">{value}</span>}
      </div>
      {children}
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
  const buildScatter = useCallback(scatter, [])
  const buildPr = useCallback(prChart, [])
  const buildHist = useCallback(histogram, [])
  const buildContrib = useCallback(contributionChart, [])
  const travelShare = selection.filter((p) => p.label === "Travel").length / selection.length

  return (
    <div className="flex h-svh flex-col">
      <AppBar
        product={product}
        icon={icon}
        center={
          <Tabs defaultValue="space">
            <TabsList>
              <TabsTrigger value="space">Space</TabsTrigger>
              <TabsTrigger value="rank">Rankings</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="uncertainty">Uncertainty</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        right={
          <>
            <span className="label-mono mr-1 hidden rounded-full border px-2.5 py-1 text-[11px] text-ink-2 md:inline">
              travel-channels · 2,400 · 768-d
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Import dataset">
              <Upload />
            </Button>
            <Button variant="outline" size="sm">
              <Download /> Export
            </Button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[264px_1fr] 2xl:grid-cols-[264px_1fr_340px] xl:grid-cols-[264px_1fr_320px]">
        <aside className="hidden min-h-0 space-y-7 overflow-auto border-r bg-sunken/50 p-5 lg:block">
          <Eyebrow index="01">Controls</Eyebrow>
          <Field label="Projection">
            <ToggleGroup
              defaultValue={["umap"]}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
            >
              <ToggleGroupItem value="pca" className="flex-1">
                PCA
              </ToggleGroupItem>
              <ToggleGroupItem value="umap" className="flex-1">
                UMAP
              </ToggleGroupItem>
              <ToggleGroupItem value="polar" className="flex-1">
                Polarity
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field label="Colour by">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between bg-card font-normal"
            >
              Reviewed label <ChevronDown className="text-muted-foreground" />
            </Button>
          </Field>
          <Field label="Temperature" value="0.70">
            <Slider defaultValue={[0.7]} min={0.1} max={2} step={0.05} />
          </Field>
          <Field label="Neighbours" value="k = 12">
            <Slider defaultValue={[12]} min={1} max={50} step={1} />
          </Field>
          <div className="flex items-center justify-between text-[13px] font-medium">
            <span id="boundary-label">Decision boundary</span>
            <Switch aria-labelledby="boundary-label" defaultChecked />
          </div>
          <div className="well space-y-2 p-3.5">
            <Eyebrow>Probe</Eyebrow>
            <div className="font-mono text-[13px]">p = σ((w·x + b) / T)</div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Linear probe fitted in the browser on 1,920 reviewed items. Hold-out AUC{" "}
              <span className="num text-foreground">0.913</span>.
            </p>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col gap-4 overflow-auto p-4 md:p-5">
          <section className="panel flex min-h-0 flex-1 flex-col gap-3 p-5">
            <SectionHeader
              eyebrow="Space"
              index="02"
              title="Channel embeddings, UMAP"
              meta={
                <div className="flex items-center gap-4">
                  {LABELS.map((l, i) => (
                    <span key={l} className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: `var(--series-${i + 1})` }}
                      />
                      {l}
                    </span>
                  ))}
                  <span className="hidden items-center gap-1.5 md:flex">
                    <Crosshair className="size-3.5" /> shift-drag to select
                  </span>
                </div>
              }
            />
            <PlotFigure build={buildScatter} height={430} />
          </section>
          <div className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
            <section className="panel space-y-2 p-5">
              <SectionHeader eyebrow="Rankings" index="03" title="Precision against recall" />
              <PlotFigure build={buildPr} height={176} />
            </section>
            <section className="panel space-y-2 p-5">
              <SectionHeader
                eyebrow="Selection"
                index="04"
                title="Score distribution"
                meta={
                  <span className="num">
                    {selection.length} items · {(travelShare * 100).toFixed(0)}% travel
                  </span>
                }
              />
              <PlotFigure build={buildHist} height={176} />
            </section>
          </div>
        </main>

        <aside className="hidden min-h-0 space-y-6 overflow-auto border-l bg-card p-5 xl:block">
          <div className="space-y-3">
            <Eyebrow index="05">Inspector</Eyebrow>
            <Thumb seed="fjord" className="aspect-video rounded-lg" />
            <div>
              <h2 className="text-xl leading-tight">Wander North</h2>
              <div className="label-mono mt-1 text-[11px] text-muted-foreground">
                item {selected.id} · UCx9…f3Qa
              </div>
            </div>
            <div className="flex items-end gap-6">
              <div>
                <div className="figure text-[34px]">{selected.score.toFixed(3)}</div>
                <div className="mt-1 text-xs text-muted-foreground">probe score at T = 0.70</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 pb-1 text-sm font-medium">
                  <span className="size-2 rounded-full bg-series-1" /> Travel
                </div>
                <div className="text-xs text-muted-foreground">reviewed label</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <SectionHeader eyebrow="Why" title="Feature contributions" />
            <PlotFigure build={buildContrib} height={196} />
          </div>
          <div className="space-y-2">
            <SectionHeader eyebrow="Neighbours" title="Closest by cosine" />
            <ul className="divide-y text-[13px]">
              {neighbors.map((n) => (
                <li key={n.name} className="flex items-center gap-2.5 py-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: `var(--series-${n.label === "Travel" ? 1 : 2})` }}
                  />
                  <span className="flex-1 truncate">{n.name}</span>
                  <span className="label-mono num text-xs text-muted-foreground">
                    {n.sim.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
