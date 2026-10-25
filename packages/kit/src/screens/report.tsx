import type { VizTokens } from "@atelier/theme/viz"
import * as Plot from "@observablehq/plot"
import { Download, Link2 } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback } from "react"
import { AppBar } from "@/blocks/app-bar"
import { PlotFigure, tipStyle } from "@/blocks/plot-figure"
import { Delta, Eyebrow, Meta } from "@/blocks/primitives"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { spend, topQueries, warehouses, weeks } from "@/lib/sample"
import { cn } from "@/lib/utils"

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`)
const totals = weeks.map((week) => ({
  week,
  value: spend.filter((d) => d.week === week).reduce((s, d) => s + d.value, 0),
}))
const RESIZED = "Sep 8"
// Below this width every other week is labelled, and only the latest total.
const NARROW = 480

const spendChart = (t: VizTokens, width: number) => {
  const margin = { left: 44, right: 16 }
  const inner = width - margin.left - margin.right
  const padding = Math.max(0.25, 1 - 30 / (inner / weeks.length))
  // Plot's band step with equal inner and outer padding.
  const step = inner / (weeks.length + padding)
  const narrow = width < NARROW
  const labelled = new Set(narrow ? ["Sep 29"] : ["Sep 1", RESIZED, "Sep 29"])
  return {
    marginLeft: margin.left,
    marginRight: margin.right,
    marginTop: 28,
    marginBottom: 28,
    x: {
      label: null,
      domain: weeks,
      tickSize: 0,
      padding,
      ticks: narrow ? weeks.filter((_, i) => i % 2 === 0) : weeks,
    },
    y: {
      label: null,
      ticks: 4,
      tickSize: 0,
      tickFormat: (v: number) => (v ? `$${v / 1000}K` : "$0"),
    },
    color: { domain: [...warehouses], range: t.series.slice(0, 4) },
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1, ticks: 4 }),
      Plot.barY(spend, {
        x: "week",
        y: "value",
        fill: "warehouse",
        insetTop: 1,
        insetBottom: 1,
        order: [...warehouses],
        title: (d: { warehouse: string; value: number; week: string }) =>
          `${d.warehouse}, week of ${d.week}\n${money(d.value)}`,
        tip: tipStyle(t),
      }),
      Plot.ruleY([0], { stroke: t.axis }),
      // The resize, drawn between the last week at L and the first at M.
      Plot.ruleX([RESIZED], { dx: -step / 2, stroke: t.axis, strokeDasharray: "3,3" }),
      Plot.text([RESIZED], {
        x: (d: string) => d,
        frameAnchor: "top",
        dx: -step / 2 + 6,
        dy: -18,
        textAnchor: "start",
        text: () => "Ingest L → M",
        fill: t.text,
        fontSize: 11,
      }),
      Plot.text(
        totals.filter((d) => labelled.has(d.week)),
        {
          x: "week",
          y: "value",
          text: (d: { value: number }) => money(d.value),
          dy: -9,
          fill: t.ink,
          fontWeight: 600,
        }
      ),
    ],
  }
}

const shareOfSpend = { august: 8.3, september: 11.4 }

export function ReportScreen({
  product = "Reports",
  icon,
}: {
  product?: string
  icon?: ReactNode
}) {
  const build = useCallback(spendChart, [])
  const maxCredits = Math.max(...topQueries.map((q) => q.credits))
  return (
    <div className="min-h-svh">
      <AppBar
        product={product}
        icon={icon}
        crumbs={["Cost reviews", "September 2026"]}
        right={
          <>
            <Button variant="ghost" size="sm">
              <Link2 /> Copy link
            </Button>
            <Button variant="outline" size="sm">
              <Download /> Download PDF
            </Button>
          </>
        }
      />

      <article className="mx-auto max-w-[1080px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
        <header className="max-w-[760px] space-y-5">
          <Eyebrow>
            <Meta items={["Cost review", "Snowflake"]} />
          </Eyebrow>
          <h1 className="text-[34px] leading-[1.08] text-balance md:text-[48px]">
            Compute spend fell 18% after the ingestion warehouse was resized
          </h1>
          <p className="text-lg leading-relaxed text-pretty text-ink-2 md:text-xl">
            September cost $48.2K against $58.8K in August. Most of the drop came from one change,
            and ad hoc work is now the fastest-growing line.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="text-foreground">Data science</span>
            <span className="text-faint">·</span>
            <span>24 October 2026</span>
            <span className="text-faint">·</span>
            <span>6 min read</span>
          </div>
        </header>

        <section className="mt-10 grid grid-cols-1 border-y sm:grid-cols-3">
          {[
            {
              label: "Total spend, September",
              value: "$48.2K",
              delta: <Delta value={-0.18} goodWhenUp={false} period="vs August" />,
            },
            {
              label: "Credits used",
              value: "15,920",
              delta: <Delta value={-0.16} goodWhenUp={false} period="vs August" />,
            },
            {
              label: "Ad hoc share of spend",
              value: `${shareOfSpend.september}%`,
              delta: (
                <Delta
                  value={shareOfSpend.september - shareOfSpend.august}
                  unit="pp"
                  goodWhenUp={false}
                  period="vs August"
                />
              ),
            },
          ].map((k, i) => (
            <div
              key={k.label}
              className={cn(
                "space-y-3 py-6 sm:px-6",
                i > 0 && "border-t sm:border-t-0 sm:border-l",
                i === 0 && "sm:pl-0"
              )}
            >
              <div className="text-sm text-muted-foreground">{k.label}</div>
              <div className="figure text-[40px]">{k.value}</div>
              {k.delta}
            </div>
          ))}
        </section>

        <div className="mt-10 max-w-[680px] space-y-5 text-[17px] leading-[1.7] text-ink-2">
          <p>
            The ingestion warehouse ran at size L for every load until 5 September, although its
            queue never exceeded two concurrent statements. Moving it to M halved its weekly cost
            with no change in load latency at the 95th percentile.
          </p>
          <p>
            Transform and dashboard spend stayed flat. Ad hoc spend rose each week, driven by
            thumbnail audits that scan the full image table instead of the daily partition.
          </p>
        </div>

        <figure className="panel mt-12 space-y-4 p-5 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5">
              <Eyebrow>Figure 1</Eyebrow>
              <h2 className="text-xl md:text-[22px]">Weekly spend by warehouse</h2>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {warehouses.map((w, i) => (
                <span key={w} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-[3px]"
                    style={{ background: `var(--series-${i + 1})` }}
                  />
                  {w}
                </span>
              ))}
            </div>
          </div>
          <PlotFigure build={build} height={300} />
          <figcaption className="text-xs text-muted-foreground">
            Ingest moved from size L to M on 5 September. Weeks start on Monday; values are
            on-demand list prices.
          </figcaption>
        </figure>

        <section className="panel mt-12 space-y-4 p-5 md:p-7">
          <div className="space-y-1.5">
            <Eyebrow>Figure 2</Eyebrow>
            <h2 className="text-xl md:text-[22px]">Most expensive recurring queries</h2>
          </div>
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Query</TableHead>
                <TableHead className="hidden sm:table-cell">Warehouse</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Runs</TableHead>
                <TableHead className="text-right sm:w-[30%] sm:text-left">Credits</TableHead>
                <TableHead className="text-right">vs August</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topQueries.map((q) => (
                <TableRow key={q.name}>
                  <TableCell className="font-mono text-[12px] whitespace-normal sm:whitespace-nowrap">
                    {/* Zero-width spaces let long names wrap after an underscore on phones. */}
                    {q.name.replaceAll("_", "_\u200b")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-[2px]"
                        style={{
                          background: `var(--series-${warehouses.indexOf(q.warehouse as (typeof warehouses)[number]) + 1})`,
                        }}
                      />
                      {q.warehouse}
                    </span>
                  </TableCell>
                  <TableCell className="num hidden text-right sm:table-cell">
                    {q.runs.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <span className="num w-12 text-right">{q.credits.toLocaleString()}</span>
                      <span className="hidden h-1.5 flex-1 rounded-full bg-muted sm:block">
                        <span
                          className="block h-full rounded-full bg-muted-foreground/45"
                          style={{ width: `${(q.credits / maxCredits) * 100}%` }}
                        />
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Delta
                      value={q.change}
                      goodWhenUp={false}
                      flatWithin={0.05}
                      className="text-[13px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <aside className="mt-12 max-w-[760px] border-t-2 border-primary pt-5">
          <Eyebrow>Recommendation</Eyebrow>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
            <li>Partition thumbnail audits by load date; expected saving $1.9K per month.</li>
            <li>Move the transform warehouse to auto-suspend after 60 s instead of 600 s.</li>
            <li>Keep ingest at size M and alert if queueing exceeds 30 s for a full hour.</li>
          </ol>
        </aside>
      </article>
    </div>
  )
}
