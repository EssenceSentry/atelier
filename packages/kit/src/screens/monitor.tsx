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
  Play,
  ScrollText,
} from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useState } from "react"
import { AppBar } from "@/blocks/app-bar"
import { LogTail } from "@/blocks/log-tail"
import { PlotFigure, tipStyle, whenWide } from "@/blocks/plot-figure"
import {
  Delta,
  FigureRow,
  Meta,
  Meter,
  SectionHeader,
  StatTile,
  type Status,
  StatusBadge,
  StatusIcon,
} from "@/blocks/primitives"
import { LiveIndicator, UndoNotice } from "@/blocks/states"
import { Button } from "@/components/ui/button"
import type { LiveStatus } from "@/lib/live"
import { cells, gpuUtilisation, logLines, memoryGiB, spendDollars, throughput } from "@/lib/sample"
import { cn } from "@/lib/utils"

const TOTAL_CELLS = 25
const FAILED_CELL = 21
const RUNNING_CELL = 24

type CellState = "done" | "failed" | "running" | "queued"

/** One source for the strip, the headline count and the cell list. */
const cellState = (n: number): CellState =>
  n === FAILED_CELL
    ? "failed"
    : n < RUNNING_CELL
      ? "done"
      : n === RUNNING_CELL
        ? "running"
        : "queued"
const strip = Array.from({ length: TOTAL_CELLS }, (_, i) => ({ n: i + 1, state: cellState(i + 1) }))
const settled = strip.filter((c) => c.state === "done" || c.state === "failed").length

const thisRun = throughput.filter((d) => d.series === "This run")
const median = throughput.filter((d) => d.series === "Median of last 5 runs")
const now = thisRun[thisRun.length - 1]
const medianNow = median[median.length - 1]

function fmtDuration(s: number) {
  if (!s) return "—"
  const m = Math.floor(s / 60)
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`
}

const cellSeconds = (index: number) => cells.find((c) => c.index === index)?.seconds ?? 0
const last = (values: number[]) => values[values.length - 1]
const mean = (values: number[]) => values.reduce((s, x) => s + x, 0) / values.length

// The run started at 14:02 and it is now 15:00; about 6 minutes remain.
const ELAPSED_MIN = 58
const REMAINING_MIN = 6
const spend = last(spendDollars)
const projected = (spend / ELAPSED_MIN) * (ELAPSED_MIN + REMAINING_MIN)
const SHARDS = { written: 27, total: 36, mib: 3.1 }

function CellStrip({ paused }: { paused: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-[3px]">
        {strip.map(({ n, state }) => (
          <div key={n} className="relative h-7 flex-1">
            {state === "failed" && (
              <span className="absolute -top-2.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-critical" />
            )}
            <div
              className={cn(
                "h-full rounded-[3px]",
                // Only the cell that is moving takes the accent.
                state === "done" && "bg-ink-2/55",
                state === "failed" && "bg-critical/70",
                state === "running" &&
                  (paused ? "bg-primary/50" : "bg-primary motion-safe:animate-pulse"),
                state === "queued" && "bg-muted shadow-[inset_0_0_0_1px_var(--border-strong)]"
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="label-mono whitespace-nowrap">cell 1</span>
        {/* On phones the note takes its own row below the end labels. */}
        <span className="order-last flex w-full items-center gap-1.5 text-xs sm:order-none sm:w-auto">
          <span className="size-1.5 shrink-0 rounded-full bg-critical" /> Cell {FAILED_CELL} failed
          and cell {FAILED_CELL + 1} retried it
        </span>
        <span className="label-mono whitespace-nowrap">cell {TOTAL_CELLS}</span>
      </div>
    </div>
  )
}

const throughputChart = (t: VizTokens, width: number) =>
  ({
    marginLeft: 36,
    marginRight: 88,
    marginTop: 12,
    x: { label: null, tickFormat: (m: number) => `${m}m`, ticks: 6, tickSize: 0 },
    y: { label: null, ticks: 4, tickSize: 0, domain: [0, 480] },
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 4 }),
      Plot.ruleY([0], { stroke: t.axis }),
      Plot.areaY(thisRun, {
        x: "minute",
        y: "value",
        fill: t.series[0],
        fillOpacity: 0.1,
        curve: "monotone-x",
      }),
      // The comparison line is drawn in the axis text colour, which stays
      // readable in dark mode where the axis colour all but disappears.
      Plot.lineY(median, {
        x: "minute",
        y: "value",
        stroke: t.text,
        strokeOpacity: 0.75,
        strokeWidth: 2,
        curve: "monotone-x",
      }),
      Plot.lineY(thisRun, {
        x: "minute",
        y: "value",
        stroke: t.series[0],
        strokeWidth: 2,
        curve: "monotone-x",
      }),
      ...whenWide(width, [
        Plot.text([{ x: 43.5, y: 262 }], {
          x: "x",
          y: "y",
          text: () => "GPU thermal dip",
          fill: t.text,
          fontFamily: t.font,
          fontSize: 11,
          dy: 14,
        }),
        // Beside the rising edge, so the line does not cross the words.
        Plot.text([{ x: 34, y: 0 }], {
          x: "x",
          y: "y",
          text: () => "job relaunched",
          fill: t.text,
          fontFamily: t.font,
          fontSize: 11,
          textAnchor: "start",
          dx: 8,
          dy: -10,
        }),
      ]),
      Plot.dot([now], {
        x: "minute",
        y: "value",
        r: 4,
        fill: t.series[0],
        stroke: t.surface,
        strokeWidth: 2,
      }),
      Plot.text([now], {
        x: "minute",
        y: "value",
        text: (d: { value: number }) => `${Math.round(d.value)} rows/s`,
        dx: 10,
        textAnchor: "start",
        fill: t.ink,
        fontWeight: 600,
      }),
      Plot.ruleX(thisRun, Plot.pointerX({ x: "minute", stroke: t.axis })),
      Plot.tip(
        thisRun,
        Plot.pointerX({
          x: "minute",
          y: "value",
          title: (d: { minute: number; value: number }) =>
            `minute ${d.minute}\n${Math.round(d.value)} rows/s`,
          ...tipStyle(t),
        })
      ),
    ],
  }) satisfies Plot.PlotOptions

const resources = (released: boolean, paused: boolean) =>
  [
    {
      icon: Box,
      kind: "SageMaker processing",
      name: "embed-travel-1785866683",
      detail: [`cell ${FAILED_CELL + 1}`, "1 × ml.g5.xlarge", "us-east-1"],
      status: "done",
      meta: fmtDuration(cellSeconds(FAILED_CELL + 1)),
    },
    {
      icon: Box,
      kind: "SageMaker processing",
      name: "embed-travel-1785866245",
      detail: [
        `cell ${FAILED_CELL}`,
        "AlgorithmError",
        released ? "volume released" : "exit code 1",
      ],
      status: "failed",
      meta: fmtDuration(cellSeconds(FAILED_CELL)),
    },
    {
      icon: Database,
      kind: "S3 prefix",
      name: "lab-embeddings/travel/v4",
      detail: [
        `cell ${RUNNING_CELL}`,
        `${SHARDS.written} objects`,
        `${Math.round(SHARDS.written * SHARDS.mib)} MiB`,
      ],
      status: paused ? "paused" : "running",
      meta: `${SHARDS.written} / ${SHARDS.total} shards`,
    },
    {
      icon: LayoutDashboard,
      kind: "Linked dashboard",
      name: "Ranked audit",
      detail: ["localhost:8790"],
      status: "succeeded",
      meta: "41 ms",
    },
  ] satisfies {
    icon: typeof Box
    kind: string
    name: string
    detail: string[]
    status: Status
    meta: string
  }[]

const cellStatus: Record<(typeof cells)[number]["state"], Status> = {
  done: "done",
  failed: "failed",
  running: "running",
  queued: "queued",
}

export function MonitorScreen({
  product = "Runline",
  icon,
  status = "example",
}: {
  product?: string
  icon?: ReactNode
  /** From `useLiveState`; the default marks the figures as examples. */
  status?: LiveStatus
}) {
  const build = useCallback(throughputChart, [])
  const [paused, setPaused] = useState(false)
  const [released, setReleased] = useState(false)
  // Once the undo window closes the release is final and the notice goes.
  const [releaseFinal, setReleaseFinal] = useState(false)
  const maxSeconds = Math.max(...cells.map((c) => c.seconds))
  return (
    <div className="min-h-svh">
      <AppBar
        product={product}
        icon={icon}
        crumbs={["travel-embeddings", "run 0412"]}
        innerClassName="mx-auto max-w-[1360px]"
        right={
          <>
            <LiveIndicator status={status} className="mr-2 hidden md:inline-flex" />
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <NotebookPen /> Open notebook
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
              {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"}
            </Button>
          </>
        }
      />

      {/* Phones put what needs attention straight after the summary. */}
      <main className="mx-auto grid max-w-[1360px] grid-cols-12 gap-4 p-4 md:gap-5 md:p-6 max-lg:[&>*:not(:first-child,#needs-attention)]:order-2">
        <section className="panel col-span-12 flex flex-col gap-7 p-5 lg:col-span-7">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <StatusBadge status={paused ? "paused" : "running"} />
              {!released && (
                <a
                  href="#needs-attention"
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <StatusBadge status="warning" label="1 needs attention" />
                </a>
              )}
              <Meta
                items={["nb/02_embeddings.ipynb", "started 14:02"]}
                className="label-mono text-[11px] text-muted-foreground"
              />
              <LiveIndicator status={status} className="md:hidden" />
            </div>
            <h1 className="text-[28px] leading-[1.05] md:text-[38px]">Travel channel embeddings</h1>
          </div>
          <FigureRow
            items={[
              {
                id: "settled",
                value: (
                  <>
                    {settled}
                    <span className="text-muted-foreground">/{TOTAL_CELLS}</span>
                  </>
                ),
                caption: "cells settled",
                size: "text-[56px] md:text-[72px]",
              },
              {
                id: "remaining",
                value: paused ? "Paused" : `≈ ${REMAINING_MIN} min`,
                caption: (
                  <Meta
                    items={
                      paused
                        ? [`${REMAINING_MIN} min left when resumed`]
                        : ["remaining", "4–9 min", "ends ~15:06"]
                    }
                    className="num"
                  />
                ),
                size: "text-[32px] md:text-[40px]",
              },
            ]}
          />
          {/* Pinned to the bottom, level with the tiles' meters beside it. */}
          <div className="mt-auto">
            <CellStrip paused={paused} />
          </div>
        </section>

        <section className="panel col-span-12 grid grid-cols-2 overflow-hidden lg:col-span-5">
          <StatTile
            className="border-r border-b p-5"
            label="Throughput"
            value={String(Math.round(now.value))}
            unit="rows/s"
            trend={thisRun.slice(-16).map((d) => d.value)}
            delta={
              <Delta value={now.value / medianNow.value - 1} flatWithin={0.1} period="vs median" />
            }
          />
          <StatTile
            className="border-b p-5"
            label="GPU utilisation"
            value={`${last(gpuUtilisation)}%`}
            trend={gpuUtilisation}
            delta={
              <Delta
                value={last(gpuUtilisation) / mean(gpuUtilisation) - 1}
                flatWithin={0.1}
                period="vs last hour"
              />
            }
          />
          <StatTile
            className="border-r p-5"
            label="Memory"
            value={String(last(memoryGiB))}
            unit="/ 30 GiB"
            trend={memoryGiB}
            footer={<Meter value={last(memoryGiB)} max={30} />}
          />
          <StatTile
            className="p-5"
            label="Spend so far"
            value={`$${spend.toFixed(2)}`}
            trend={spendDollars}
            footer={
              <span className="text-xs text-muted-foreground">
                projected ${projected.toFixed(2)} at finish
              </span>
            }
          />
        </section>

        <section className="panel col-span-12 flex flex-col gap-4 p-5 lg:col-span-7">
          <SectionHeader
            title="Rows per second, last hour"
            meta={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 rounded bg-series-1" /> This run
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-3.5 rounded opacity-75"
                    style={{ background: "var(--viz-text)" }}
                  />{" "}
                  Median of last 5 runs
                </span>
              </div>
            }
          />
          <PlotFigure build={build} height={248} fill />
        </section>

        <section id="needs-attention" className="panel col-span-12 overflow-hidden lg:col-span-5">
          {releaseFinal ? null : released ? (
            <div className="border-b p-4">
              <UndoNotice
                onUndo={() => setReleased(false)}
                onExpire={() => {
                  // Call the release API here, once the undo window has closed.
                  setReleaseFinal(true)
                }}
              >
                Released the 30 GiB volume held by job{" "}
                <span className="label-mono text-xs whitespace-nowrap">…866245</span>.
              </UndoNotice>
            </div>
          ) : (
            <div className="flex gap-3 border-b bg-critical/[0.06] p-4">
              <StatusIcon status="failed" className="mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  A failed job still holds a 30 GiB volume
                </div>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Cell {FAILED_CELL + 1} retried the embedding with smaller shards and succeeded.
                  Job <span className="label-mono text-xs whitespace-nowrap">…866245</span> exited
                  with AlgorithmError and was not cleaned up.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="destructive" onClick={() => setReleased(true)}>
                    Release volume
                  </Button>
                  <Button size="sm" variant="ghost">
                    <ScrollText /> Logs
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="divide-y">
            {resources(released, paused).map((r) => (
              <div key={r.name} className="flex items-center gap-3 px-4 py-3">
                <div className="well grid size-8 shrink-0 place-items-center">
                  <r.icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="eyebrow">{r.kind}</div>
                  <div className="truncate text-[13px] font-medium">{r.name}</div>
                  <Meta items={r.detail} className="block truncate text-xs text-muted-foreground" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge
                    status={r.status}
                    label={r.status === "succeeded" ? "Healthy" : undefined}
                  />
                  <span className="label-mono num text-[11px] text-muted-foreground">{r.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel col-span-12 p-5 lg:col-span-7">
          <SectionHeader
            title="Recent cells"
            meta={<span className="label-mono">8 of {TOTAL_CELLS}</span>}
            className="mb-3"
          />
          <div className="divide-y">
            {cells.map((c) => (
              <div
                key={c.index}
                className="grid grid-cols-[24px_20px_1fr_64px] items-center gap-3 py-2.5 text-[13px] sm:grid-cols-[28px_20px_1fr_120px_64px]"
              >
                <span className="label-mono num text-[11px] text-muted-foreground">{c.index}</span>
                <StatusIcon status={cellStatus[c.state]} />
                <span className={cn("truncate", c.state === "queued" && "text-muted-foreground")}>
                  {c.name}
                </span>
                <div className="hidden h-1.5 rounded-full bg-muted sm:block">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.state === "failed" && "bg-critical/70",
                      c.state === "running" && "bg-primary",
                      c.state === "done" && "bg-faint"
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
            title="Log tail"
            actions={
              <Button size="icon-xs" variant="ghost" aria-label="Open full log">
                <ExternalLink />
              </Button>
            }
            className="mb-3"
          />
          <LogTail lines={logLines} className="flex-1" />
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            <Meta items={["durable journal", "1,284 events"]} />
          </div>
        </section>
      </main>
    </div>
  )
}
