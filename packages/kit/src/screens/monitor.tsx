import type { VizTokens } from "@atelier/theme/viz"
import * as Plot from "@observablehq/plot"
import {
  Box,
  Database,
  ExternalLink,
  FileText,
  LayoutDashboard,
  NotebookPen,
  Pause,
  ScrollText,
} from "lucide-react"
import { useCallback } from "react"
import { AppBar } from "@/blocks/app-bar"
import { PlotFigure, tipStyle } from "@/blocks/plot-figure"
import {
  Delta,
  Meter,
  SectionHeader,
  StatTile,
  type Status,
  StatusBadge,
  StatusIcon,
} from "@/blocks/primitives"
import { Button } from "@/components/ui/button"
import { cells, logLines, spark, throughput } from "@/lib/sample"
import { cn } from "@/lib/utils"

const TOTAL_CELLS = 25

function CellStrip() {
  return (
    <div className="space-y-2">
      <div className="flex gap-[3px]">
        {Array.from({ length: TOTAL_CELLS }, (_, i) => {
          const n = i + 1
          const state = n < 24 ? "done" : n === 24 ? "running" : "queued"
          return (
            <div key={n} className="relative h-7 flex-1">
              {n === 21 && (
                <span className="absolute -top-2.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-critical" />
              )}
              <div
                className={cn(
                  "h-full rounded-[3px]",
                  state === "done" && "glow bg-primary",
                  state === "running" && "animate-pulse bg-primary/45",
                  state === "queued" && "bg-muted shadow-[inset_0_0_0_1px_var(--border)]"
                )}
              />
            </div>
          )
        })}
      </div>
      <div className="label-mono flex justify-between text-[11px] text-muted-foreground">
        <span>cell 1</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-critical" /> cell 21 failed once, retried
        </span>
        <span>cell 25</span>
      </div>
    </div>
  )
}

const throughputChart = (t: VizTokens) => {
  const current = throughput.filter((d) => d.series === "This run")
  const last = current[current.length - 1]
  return {
    marginLeft: 36,
    marginRight: 64,
    marginTop: 12,
    x: { label: null, tickFormat: (m: number) => `${m}m`, ticks: 6, tickSize: 0 },
    y: { label: null, ticks: 4, tickSize: 0, domain: [0, 480] },
    color: { domain: ["This run", "Median of last 5 runs"], range: [t.series[0], t.axis] },
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 4 }),
      Plot.ruleY([0], { stroke: t.axis }),
      Plot.areaY(current, {
        x: "minute",
        y: "value",
        fill: t.series[0],
        fillOpacity: 0.1,
        curve: "monotone-x",
      }),
      Plot.lineY(throughput, {
        x: "minute",
        y: "value",
        stroke: "series",
        strokeWidth: 2,
        curve: "monotone-x",
      }),
      Plot.text([{ x: 43.5, y: 262 }], {
        x: "x",
        y: "y",
        text: () => "GPU thermal dip",
        fill: t.text,
        fontSize: 10.5,
        dy: 14,
      }),
      Plot.dot([last], {
        x: "minute",
        y: "value",
        r: 4,
        fill: t.series[0],
        stroke: t.surface,
        strokeWidth: 2,
      }),
      Plot.text([last], {
        x: "minute",
        y: "value",
        text: (d: { value: number }) => `${Math.round(d.value)} rows/s`,
        dx: 10,
        textAnchor: "start",
        fill: t.ink,
        fontWeight: 600,
      }),
      Plot.ruleX(throughput, Plot.pointerX({ x: "minute", stroke: t.axis })),
      Plot.tip(
        current,
        Plot.pointerX({
          x: "minute",
          y: "value",
          title: (d: { minute: number; value: number }) =>
            `minute ${d.minute}\n${Math.round(d.value)} rows/s`,
          ...tipStyle(t),
        })
      ),
    ],
  } satisfies Plot.PlotOptions
}

const resources: {
  icon: typeof Box
  kind: string
  name: string
  detail: string
  status: Status
  meta: string
}[] = [
  {
    icon: Box,
    kind: "SageMaker processing",
    name: "embed-travel-1785868797",
    detail: "1 × ml.g5.xlarge · us-east-1",
    status: "running",
    meta: "20m 26s",
  },
  {
    icon: Box,
    kind: "SageMaker processing",
    name: "embed-travel-1785866245",
    detail: "AlgorithmError · exit code 1",
    status: "failed",
    meta: "7m 38s",
  },
  {
    icon: Database,
    kind: "S3 prefix",
    name: "lab-embeddings/travel/v4",
    detail: "412 objects · 3.1 GiB",
    status: "running",
    meta: "+38/min",
  },
  {
    icon: LayoutDashboard,
    kind: "Linked dashboard",
    name: "Ranked audit",
    detail: "localhost:8790",
    status: "succeeded",
    meta: "healthy",
  },
]

function fmtDuration(s: number) {
  if (!s) return "—"
  const m = Math.floor(s / 60)
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`
}

export function MonitorScreen() {
  const build = useCallback(throughputChart, [])
  const maxSeconds = Math.max(...cells.map((c) => c.seconds))
  return (
    <div className="min-h-svh">
      <AppBar
        product="Runline"
        crumbs={["travel-embeddings", "run 0412"]}
        right={
          <>
            <span className="label-mono mr-2 hidden items-center gap-2 text-[11px] text-muted-foreground md:flex">
              <span className="live-dot" /> live · updated 3 s ago
            </span>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <NotebookPen /> Open notebook
            </Button>
            <Button size="sm">
              <Pause /> Pause
            </Button>
          </>
        }
      />

      <main className="mx-auto grid max-w-[1360px] grid-cols-12 gap-4 p-4 md:gap-5 md:p-6">
        <section className="panel col-span-12 grid overflow-hidden lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-7 p-5 md:p-7">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="running" label="Running · retry 2" />
                <span className="label-mono text-[11px] text-muted-foreground">
                  nb/02_embeddings.ipynb · started 14:02
                </span>
              </div>
              <h1 className="text-[28px] leading-[1.05] md:text-[38px]">
                Travel channel embeddings
              </h1>
            </div>
            <div className="flex flex-wrap items-end gap-x-12 gap-y-5">
              <div>
                <div className="figure text-[56px] md:text-[72px]">
                  24<span className="text-faint">/25</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">cells settled</div>
              </div>
              <div>
                <div className="figure text-[32px] md:text-[40px]">≈ 6 min</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  remaining · <span className="num">4–9 min</span> · ends ~14:52
                </div>
              </div>
            </div>
            <CellStrip />
          </div>
          <div className="grid grid-cols-2 border-t bg-sunken/60 lg:border-t-0 lg:border-l">
            <StatTile
              className="border-r border-b p-5"
              label="Throughput"
              value="412"
              unit="rows/s"
              trend={spark(3, 16, 400, 30)}
              delta={<Delta value={0.08} period="vs last hour" />}
            />
            <StatTile
              className="border-b p-5"
              label="GPU utilisation"
              value="87"
              unit="%"
              trend={spark(5, 16, 85, 12)}
              delta={<Delta value={-0.04} period="vs last hour" />}
            />
            <StatTile
              className="border-r p-5"
              label="Memory"
              value="21.4"
              unit="/ 30 GiB"
              footer={<Meter value={21.4} max={30} />}
            />
            <StatTile
              className="p-5"
              label="Spend so far"
              value="$3.82"
              footer={
                <span className="text-xs text-muted-foreground">projected $4.40 at finish</span>
              }
            />
          </div>
        </section>

        <section className="panel col-span-12 space-y-4 p-5 lg:col-span-8">
          <SectionHeader
            eyebrow="Throughput"
            index="01"
            title="Rows per second, last hour"
            meta={
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 rounded bg-series-1" /> This run
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 rounded bg-border-strong" /> Median of last 5 runs
                </span>
              </div>
            }
          />
          <PlotFigure build={build} height={248} />
        </section>

        <section className="col-span-12 flex flex-col gap-4 md:gap-5 lg:col-span-4">
          <div className="panel overflow-hidden">
            <div className="flex gap-3 border-b bg-critical/[0.06] p-4">
              <StatusIcon status="failed" className="mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  A failed job still holds a 30 GiB volume
                </div>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Cell 22 recovered with smaller shards. Job{" "}
                  <span className="label-mono text-xs">…866245</span> exited with AlgorithmError and
                  was not cleaned up.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button size="xs" variant="destructive">
                    Release volume
                  </Button>
                  <Button size="xs" variant="ghost">
                    <ScrollText /> Logs
                  </Button>
                </div>
              </div>
            </div>
            <div className="divide-y">
              {resources.map((r) => (
                <div key={r.name} className="flex items-center gap-3 px-4 py-3">
                  <div className="well grid size-8 shrink-0 place-items-center">
                    <r.icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="eyebrow !text-[9.5px]">{r.kind}</div>
                    <div className="truncate text-[13px] font-medium">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.detail}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge
                      status={r.status}
                      label={r.status === "succeeded" ? "Healthy" : undefined}
                    />
                    <span className="label-mono num text-[11px] text-muted-foreground">
                      {r.meta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel col-span-12 p-5 lg:col-span-7">
          <SectionHeader
            eyebrow="Execution"
            index="02"
            title="Recent cells"
            meta={<span className="label-mono">8 of 25</span>}
            className="mb-3"
          />
          <div className="divide-y">
            {cells.map((c) => (
              <div
                key={c.index}
                className="grid grid-cols-[24px_20px_1fr_64px] items-center gap-3 py-2.5 text-[13px] sm:grid-cols-[28px_20px_1fr_120px_64px]"
              >
                <span className="label-mono num text-[11px] text-faint">{c.index}</span>
                <StatusIcon
                  status={
                    c.state === "done"
                      ? "succeeded"
                      : c.state === "failed"
                        ? "failed"
                        : c.state === "running"
                          ? "running"
                          : "queued"
                  }
                />
                <span className={cn("truncate", c.state === "queued" && "text-muted-foreground")}>
                  {c.name}
                </span>
                <div className="hidden h-1.5 rounded-full bg-muted sm:block">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.state === "failed" ? "bg-critical/70" : "bg-primary/70"
                    )}
                    style={{ width: `${(c.seconds / maxSeconds) * 100}%` }}
                  />
                </div>
                <span className="label-mono num text-right text-xs text-muted-foreground">
                  {fmtDuration(c.seconds)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel col-span-12 flex flex-col p-5 lg:col-span-5">
          <SectionHeader
            eyebrow="Activity"
            index="03"
            title="Log tail"
            actions={
              <Button size="icon-xs" variant="ghost" aria-label="Open full log">
                <ExternalLink />
              </Button>
            }
            className="mb-3"
          />
          <div className="well flex-1 space-y-2 p-3 font-mono text-[11.5px] leading-relaxed">
            {logLines.map((l) => (
              <div key={`${l.t} ${l.msg}`} className="grid grid-cols-[56px_14px_1fr] gap-2">
                <span className="num text-faint">{l.t}</span>
                <span
                  className={cn(
                    "mt-[6px] size-1.5 rounded-full",
                    l.level === "error"
                      ? "bg-critical"
                      : l.level === "warn"
                        ? "bg-warning"
                        : "bg-border-strong"
                  )}
                />
                <span className={cn(l.level === "info" ? "text-ink-2" : "text-foreground")}>
                  {l.msg}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" /> durable journal · 1,284 events
          </div>
        </section>
      </main>
    </div>
  )
}
