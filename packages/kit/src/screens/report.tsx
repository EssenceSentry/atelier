import type { VizTokens } from "@atelier/theme/viz"
import * as Plot from "@observablehq/plot"
import { Download } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback } from "react"
import { AppBar } from "@/blocks/app-bar"
import { Legend } from "@/blocks/legend"
import { labelWidth, PlotFigure, tipStyle, whenWide } from "@/blocks/plot-figure"
import { Delta, Eyebrow, Meta, SectionHeader } from "@/blocks/primitives"
import { CopyButton } from "@/blocks/states"
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

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v)}`)
const percent = (v: number) => `${Math.abs(Math.round(v * 100))}%`
const totals = weeks.map((week) => ({
  week,
  value: spend.filter((d) => d.week === week).reduce((s, d) => s + d.value, 0),
}))

// Every figure in the text comes from the weekly spend, so the prose, the
// tiles and the chart cannot disagree.
const RESIZED = "Sep 7"
const cut = weeks.indexOf(RESIZED)
const before = weeks.slice(0, cut)
const after = weeks.slice(cut)
const weekly = (span: string[], warehouse?: string) =>
  spend
    .filter((d) => span.includes(d.week) && (!warehouse || d.warehouse === warehouse))
    .reduce((s, d) => s + d.value, 0) / span.length
const spendBefore = weekly(before)
const spendAfter = weekly(after)
const change = spendAfter / spendBefore - 1
const ingestChange = weekly(after, "Ingest") / weekly(before, "Ingest") - 1
const shareBefore = (weekly(before, "Ad hoc") / spendBefore) * 100
const shareAfter = (weekly(after, "Ad hoc") / spendAfter) * 100

// On-demand price per credit, and the share of the audit's credits that
// partitioning by load date removes.
const PRICE_PER_CREDIT = 3
const PARTITION_SAVING = 0.8
const audit = topQueries.find((q) => q.name === "adhoc_thumbnail_audit")
const auditSaving = (audit?.credits ?? 0) * PRICE_PER_CREDIT * PARTITION_SAVING

// Below this width every other week is labelled, and only the latest total.
const NARROW = 480

const spendChart = (t: VizTokens, width: number) => {
  const margin = { left: labelWidth(t, ["$12K"]) + 14, right: 16 }
  const inner = width - margin.left - margin.right
  const padding = Math.max(0.25, 1 - 30 / (inner / weeks.length))
  // Plot's band step with equal inner and outer padding.
  const step = inner / (weeks.length + padding)
  const narrow = width < NARROW
  const latest = weeks[weeks.length - 1]
  const lastBefore = before[before.length - 1]
  const labelled = new Set(narrow ? [lastBefore, latest] : [lastBefore, RESIZED, latest])
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
      // The rule stays at every width; its label needs room beside it.
      ...whenWide(width, [
        Plot.text([RESIZED], {
          x: (d: string) => d,
          frameAnchor: "top",
          dx: -step / 2 + 6,
          dy: -18,
          textAnchor: "start",
          text: () => "Ingest L → M",
          fill: t.text,
          fontFamily: t.font,
          fontSize: 11,
        }),
      ]),
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
            <CopyButton />
            {/* The browser's print dialog saves the page as a PDF. */}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download /> Save as PDF
            </Button>
          </>
        }
      />

      <article className="mx-auto max-w-[1080px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
        <header className="max-w-[760px] space-y-5">
          <Eyebrow>
            <Meta items={["Cost review", "Snowflake"]} />
          </Eyebrow>
          <h1 className="text-[32px] leading-[1.08] text-balance md:text-[48px]">
            Compute spend fell {percent(change)} after the ingestion warehouse was resized
          </h1>
          <p className="measure text-lg leading-relaxed text-pretty text-ink-2 md:text-xl">
            Weekly spend averaged {money(spendAfter)} after the resize, against {money(spendBefore)}{" "}
            before. Most of the drop came from one change, and ad hoc work is now the
            fastest‑growing line.
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
              label: "Weekly spend since 7 September",
              value: money(spendAfter),
              delta: <Delta value={change} goodWhenUp={false} period="vs before" />,
            },
            {
              label: "Ingest warehouse, weekly",
              value: money(weekly(after, "Ingest")),
              delta: <Delta value={ingestChange} goodWhenUp={false} period="vs before" />,
            },
            {
              label: "Ad hoc share of spend",
              value: `${shareAfter.toFixed(1)}%`,
              delta: (
                <Delta
                  value={shareAfter - shareBefore}
                  unit="pp"
                  goodWhenUp={false}
                  period="vs before"
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

        <div className="measure mt-10 space-y-5 text-[17px] leading-[1.7] text-ink-2">
          <p>
            The ingestion warehouse ran at size L for every load until 7 September, although its
            queue never exceeded two concurrent statements. Moving it to M cut its weekly cost by{" "}
            {percent(ingestChange)} with no change in load latency at the 95th percentile (Figure
            1).
          </p>
          <p>
            Transform and dashboard spend stayed flat. Ad hoc spend kept rising, led by thumbnail
            audits that scan the full image table instead of the daily partition; Figure 2 lists the
            queries behind it.
          </p>
        </div>

        <figure className="panel mt-12 space-y-4 p-5 md:p-7">
          <SectionHeader
            level="h2"
            eyebrow="Figure 1"
            title="Weekly spend by warehouse"
            meta={
              <Legend
                items={warehouses.map((w, i) => ({
                  label: w,
                  colour: `var(--series-${i + 1})`,
                  mark: "square" as const,
                }))}
              />
            }
          />
          <PlotFigure build={build} height={300} />
          <figcaption className="text-[13px] text-muted-foreground">
            Ingest moved from size L to M on 7 September. Weeks start on Monday; values are
            on-demand list prices.
          </figcaption>
        </figure>

        <section className="panel mt-12 space-y-4 p-5 md:p-7">
          <SectionHeader level="h2" eyebrow="Figure 2" title="Most expensive recurring queries" />
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Query</TableHead>
                <TableHead className="hidden sm:table-cell">Warehouse</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Runs</TableHead>
                <TableHead className="sm:w-[30%]">
                  {/* As wide as the numbers below, so the label sits over their edge. */}
                  <span className="inline-block w-12 text-right">Credits</span>
                </TableHead>
                <TableHead className="text-right">vs before</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topQueries.map((q) => (
                <TableRow key={q.name}>
                  <TableCell className="font-mono text-[12px] max-sm:text-[11px]">
                    {q.name}
                    {/* Phones fold the warehouse and runs columns into this line. */}
                    <span className="mt-1 flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground sm:hidden">
                      <span
                        className="size-2 rounded-[2px]"
                        style={{
                          background: `var(--series-${warehouses.indexOf(q.warehouse as (typeof warehouses)[number]) + 1})`,
                        }}
                      />
                      {q.warehouse}, {q.runs.toLocaleString()} runs
                    </span>
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
                      flatWithin={0.1}
                      className="text-[13px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <aside className="measure mt-12 border-t-2 border-primary pt-5">
          <Eyebrow>Recommendation</Eyebrow>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[17px] leading-[1.7]">
            <li>
              Partition thumbnail audits by load date; expected saving $
              {(auditSaving / 1000).toFixed(1)}K per month.
            </li>
            <li>Move the transform warehouse to auto-suspend after 60 s instead of 600 s.</li>
            <li>Keep ingest at size M and alert if queueing exceeds 30 s for a full hour.</li>
          </ol>
        </aside>
      </article>
    </div>
  )
}
