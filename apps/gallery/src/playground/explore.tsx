import { vegaConfig } from "@atelier/theme/vega"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDown, ArrowUp, Download, RotateCcw, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { View } from "vega"
import embed, { type EmbedOptions, type VisualizationSpec } from "vega-embed"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { download, groups, type Sample, samples } from "./data"

export default function Explore() {
  const tokens = useVizTokens()
  const plot = useRef<HTMLDivElement>(null)
  const histogram = useRef<HTMLDivElement>(null)
  const tableHost = useRef<HTMLDivElement>(null)
  const chart = useRef<View | null>(null)
  const brushRef = useRef<{ x: number[]; y: number[] } | null>(null)
  const [visibleGroups, setVisibleGroups] = useState(groups)
  const [selected, setSelected] = useState<string[] | null>(null)
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }])
  const [error, setError] = useState("")
  const visible = useMemo(
    () => samples.filter((row) => visibleGroups.includes(row.group)),
    [visibleGroups]
  )
  const current = useMemo(
    () => (selected ? visible.filter((row) => selected.includes(row.id)) : visible),
    [selected, visible]
  )
  const columns = useMemo<ColumnDef<Sample>[]>(
    () => [
      { accessorKey: "id", header: "Record" },
      {
        accessorKey: "group",
        header: "Region",
        cell: ({ getValue }) => (
          <>
            <span
              className="cell-marker"
              style={{ background: `var(--series-${groups.indexOf(getValue<string>()) + 1})` }}
            />
            {getValue<string>()}
          </>
        ),
      },
      {
        accessorKey: "score",
        header: "Score",
        cell: ({ getValue }) => getValue<number>().toFixed(3),
      },
      {
        accessorKey: "volume",
        header: "Volume",
        cell: ({ getValue }) => getValue<number>().toLocaleString(),
      },
      {
        accessorKey: "reviewed",
        header: "Review",
        cell: ({ getValue }) => (getValue<boolean>() ? "Reviewed" : "Pending"),
      },
    ],
    []
  )
  const table = useReactTable({
    data: current,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  })
  const tableRows = table.getRowModel().rows
  const virtual = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableHost.current,
    estimateSize: () => 39,
    overscan: 8,
  })

  useEffect(() => {
    if (!tokens || !plot.current) return
    let disposed = false
    let view: View | undefined
    const host = plot.current
    const options: EmbedOptions = {
      actions: false as const,
      renderer: "svg" as const,
      config: vegaConfig(tokens),
    }
    const spec: VisualizationSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v6.json",
      width: "container",
      height: 273,
      padding: { left: 6, right: 15, top: 8, bottom: 4 },
      data: { values: visible },
      params: [
        {
          name: "region",
          value: brushRef.current ?? undefined,
          select: {
            type: "interval",
            encodings: ["x", "y"],
            mark: {
              fill: tokens.primary,
              fillOpacity: 0.09,
              stroke: tokens.primary,
              strokeWidth: 1,
            },
          },
        },
      ],
      mark: { type: "point", filled: true, size: 41, tooltip: true },
      encoding: {
        x: {
          field: "x",
          type: "quantitative",
          title: "Component 1",
          scale: { domain: [-2.5, 5.5] },
        },
        y: {
          field: "y",
          type: "quantitative",
          title: "Component 2",
          scale: { domain: [-2.5, 5.5] },
        },
        color: {
          field: "group",
          type: "nominal",
          scale: { domain: groups, range: tokens.series.slice(0, 3) },
          legend: null,
        },
        opacity: { condition: { param: "region", value: 0.85 }, value: 0.18 },
        tooltip: [
          { field: "id", title: "Record" },
          { field: "group", title: "Region" },
          { field: "score", format: ".3f", title: "Score" },
        ],
      },
    }
    embed(host, spec, options)
      .then((result) => {
        if (disposed) {
          result.finalize()
          return
        }
        view = result.view
        chart.current = view
        view.addSignalListener("region", (_name, value) => {
          const brush = value as { x?: number[]; y?: number[] }
          const x = brush.x
          const y = brush.y
          brushRef.current = x && y ? { x, y } : null
          setSelected(
            x && y
              ? visible
                  .filter((row) => row.x >= x[0] && row.x <= x[1] && row.y >= y[0] && row.y <= y[1])
                  .map((row) => row.id)
              : null
          )
        })
        host.dataset.ready = "true"
      })
      .catch((cause: unknown) => !disposed && setError(String(cause)))
    const observer = new ResizeObserver(() => {
      if (view) void view.resize().runAsync()
    })
    observer.observe(host)
    return () => {
      disposed = true
      observer.disconnect()
      view?.finalize()
      chart.current = null
    }
  }, [tokens, visible])

  useEffect(() => {
    if (!tokens || !histogram.current) return
    let disposed = false
    let finalize: (() => void) | undefined
    embed(
      histogram.current,
      {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        width: "container",
        height: 273,
        data: { values: current },
        mark: { type: "bar", cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2, tooltip: true },
        encoding: {
          x: {
            field: "score",
            type: "quantitative",
            bin: { step: 0.05 },
            title: "Score",
            scale: { domain: [0, 1] },
          },
          y: { aggregate: "count", title: "Records", type: "quantitative" },
          color: {
            field: "group",
            scale: { domain: groups, range: tokens.series.slice(0, 3) },
            legend: null,
          },
        },
        config: vegaConfig(tokens),
      },
      { actions: false, renderer: "svg" }
    )
      .then((result) => {
        if (disposed) result.finalize()
        else {
          finalize = result.finalize
          histogram.current?.setAttribute("data-ready", "true")
        }
      })
      .catch((cause: unknown) => !disposed && setError(String(cause)))
    return () => {
      disposed = true
      finalize?.()
    }
  }, [current, tokens])

  const reset = () => {
    brushRef.current = null
    setSelected(null)
    setVisibleGroups([...groups])
    setSearch("")
  }
  const mean = current.reduce((sum, row) => sum + row.score, 0) / (current.length || 1)
  return (
    <div className="demo-stack">
      <div className="demo-kpis">
        <div className="demo-kpi">
          <span>Records in view</span>
          <strong>
            {current.length}
            <small className="inline-total"> / {samples.length}</small>
          </strong>
          <small>{selected ? "Within the selected region" : "Across the visible regions"}</small>
        </div>
        <div className="demo-kpi">
          <span>Mean score</span>
          <strong>{current.length ? mean.toFixed(3) : "—"}</strong>
          <small>Derived from the current records</small>
        </div>
        <div className="demo-kpi">
          <span>Reviewed</span>
          <strong>{current.filter((row) => row.reviewed).length}</strong>
          <small>
            {current.length
              ? Math.round((100 * current.filter((row) => row.reviewed).length) / current.length)
              : 0}
            % of records in view
          </small>
        </div>
      </div>
      <div className="demo-toolbar" style={{ justifyContent: "space-between" }}>
        <div className="explore-filters">
          <span className="demo-meta">Regions</span>
          {groups.map((group) => (
            <button
              type="button"
              key={group}
              className="filter-pill"
              aria-pressed={visibleGroups.includes(group)}
              onClick={() => {
                brushRef.current = null
                setSelected(null)
                setVisibleGroups((now) =>
                  now.includes(group) ? now.filter((item) => item !== group) : [...now, group]
                )
              }}
            >
              {group}
            </button>
          ))}
        </div>
        <button className="demo-button" type="button" onClick={reset}>
          <RotateCcw size={12} /> Reset view
        </button>
      </div>
      {error && (
        <p role="alert" className="status-message error">
          {error}
        </p>
      )}
      <div className="demo-equal-col explore-plots">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Sample space</h2>
              <p>240 synthetic observations · two coordinates</p>
            </div>
            <div className="group-key">
              {groups.map((group, i) => (
                <span key={group}>
                  <i style={{ background: `var(--series-${i + 1})` }} />
                  {group}
                </span>
              ))}
            </div>
          </div>
          <div className="explore-chart">
            <div ref={plot} className="demo-chart-host" data-testid="scatter" />
          </div>
          <div className="demo-panel-note">
            Drag over the points to select a region. Double-click to clear it.
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Score distribution</h2>
              <p>{current.length} records · bin width 0.05</p>
            </div>
            <div className="group-key">
              {groups.map(
                (group, i) =>
                  visibleGroups.includes(group) && (
                    <span key={group}>
                      <i style={{ background: `var(--series-${i + 1})` }} />
                      {group}
                    </span>
                  )
              )}
            </div>
          </div>
          <div className="explore-chart">
            <div ref={histogram} className="demo-chart-host" />
          </div>
          <div className="demo-panel-note">
            The table and distribution use the same current records.
          </div>
        </section>
      </div>
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Records</h2>
            <p>
              {tableRows.length} shown / {current.length} in view
            </p>
          </div>
          <div className="demo-toolbar">
            <label className="demo-toolbar">
              <Search size={13} />
              <input
                className="record-search"
                aria-label="Search records"
                placeholder="Search records…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="demo-button"
              onClick={() =>
                download(
                  "selected-records.csv",
                  [
                    "id,group,score,volume,reviewed",
                    ...tableRows.map(
                      ({ original: r }) => `${r.id},${r.group},${r.score},${r.volume},${r.reviewed}`
                    ),
                  ].join("\n"),
                  "text/csv"
                )
              }
            >
              <Download size={12} /> Export {tableRows.length}
            </button>
          </div>
        </div>
        <div className="table-virtual" ref={tableHost}>
          <table className="demo-table">
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      className={["score", "volume"].includes(header.id) ? "numeric" : ""}
                    >
                      <button
                        type="button"
                        className="table-sort"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "desc" ? (
                          <ArrowDown size={11} />
                        ) : header.column.getIsSorted() ? (
                          <ArrowUp size={11} />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {virtual.getVirtualItems()[0]?.start ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ height: virtual.getVirtualItems()[0].start, padding: 0 }}
                  />
                </tr>
              ) : null}
              {virtual.getVirtualItems().map((item) => {
                const row = tableRows[item.index]
                return (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={["score", "volume"].includes(cell.column.id) ? "numeric" : ""}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {tableRows.length > 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      height: Math.max(
                        0,
                        virtual.getTotalSize() - (virtual.getVirtualItems().at(-1)?.end ?? 0)
                      ),
                      padding: 0,
                    }}
                  />
                </tr>
              )}
              {!tableRows.length && (
                <tr>
                  <td colSpan={columns.length}>
                    No records match. Clear the search or select another region.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
