import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Undo2,
  X,
} from "lucide-react"
import { Fragment, useCallback, useMemo, useState } from "react"
import { download, groups, type Sample, samples } from "./data"
import { evidenceFrame } from "./evidence-images"

type Decision = "Pending" | "Accepted" | "Needs review"
type RecordRow = Sample & { decision: Decision; notes: string }
const original: RecordRow[] = samples
  .slice(0, 60)
  .map((row) => ({ ...row, decision: row.reviewed ? "Accepted" : "Pending", notes: "" }))
let draft = original

export default function RichTableStudy() {
  const [data, setData] = useState(draft)
  const [previous, setPrevious] = useState<RecordRow[] | null>(null)
  const [search, setSearch] = useState("")
  const [decision, setDecision] = useState("All")
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }])
  const [selection, setSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [frames, setFrames] = useState<Record<string, number>>({})
  const [message, setMessage] = useState("")
  const changeRows = useCallback(
    (next: RecordRow[], message: string) => {
      setPrevious(data)
      setData(next)
      draft = next
      setMessage(message)
    },
    [data]
  )
  const edit = useCallback(
    (id: string, patch: Partial<RecordRow>) =>
      changeRows(
        data.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        `Updated ${id}.`
      ),
    [data, changeRows]
  )
  const columns = useMemo<ColumnDef<RecordRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select this page"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.id}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "id",
        header: "Record",
        cell: ({ row }) => (
          <button
            type="button"
            className="record-expand"
            aria-expanded={expanded === row.id}
            aria-label={`Inspect ${row.id}`}
            onClick={() => setExpanded((current) => (current === row.id ? null : row.id))}
          >
            <ChevronRight size={13} />
            <strong>{row.id}</strong>
          </button>
        ),
      },
      {
        id: "image",
        header: "Evidence frames",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="table-image-cell">
            <button
              type="button"
              aria-label={`Inspect frames for ${row.id}`}
              onClick={() => setExpanded(row.id)}
            >
              <img
                src={evidenceFrame(row.id, frames[row.id] ?? 0).src}
                alt={`Sample photograph for ${row.id}, frame ${(frames[row.id] ?? 0) + 1}: ${evidenceFrame(row.id, frames[row.id] ?? 0).title}`}
              />
            </button>
            <button
              type="button"
              className="frame-cycle"
              aria-label={`Next frame for ${row.id}`}
              onClick={() =>
                setFrames((current) => ({ ...current, [row.id]: ((current[row.id] ?? 0) + 1) % 3 }))
              }
            >
              <ChevronRight size={14} />
              <span>{(frames[row.id] ?? 0) + 1}/3</span>
            </button>
          </div>
        ),
      },
      {
        accessorKey: "group",
        header: "Region",
        cell: ({ getValue }) => (
          <span className="rich-region">
            <i style={{ background: `var(--series-${groups.indexOf(getValue<string>()) + 1})` }} />
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "score",
        header: "Score",
        cell: ({ getValue }) => (
          <div className="score-cell">
            <span>{getValue<number>().toFixed(3)}</span>
            <i>
              <b style={{ width: `${getValue<number>() * 100}%` }} />
            </i>
          </div>
        ),
      },
      {
        accessorKey: "volume",
        header: "Volume",
        cell: ({ row, getValue }) => (
          <input
            className="cell-number"
            type="number"
            min={0}
            max={1000000}
            step={1}
            aria-label={`Volume for ${row.id}`}
            key={`${row.id}-${getValue<number>()}`}
            defaultValue={getValue<number>()}
            onBlur={(event) => {
              const value = event.target.valueAsNumber
              if (
                Number.isFinite(value) &&
                value >= 0 &&
                value <= 1000000 &&
                Number.isInteger(value)
              ) {
                if (value !== row.original.volume) edit(row.id, { volume: value })
              } else {
                event.target.value = String(row.original.volume)
                setMessage(
                  "Volume must be a whole number from 0 to 1,000,000. The previous value was kept."
                )
              }
            }}
          />
        ),
      },
      {
        accessorKey: "decision",
        header: "Decision",
        cell: ({ row, getValue }) => (
          <select
            className={`decision-select decision-${getValue<string>().toLowerCase().replaceAll(" ", "-")}`}
            aria-label={`Decision for ${row.id}`}
            value={getValue<string>()}
            onChange={(event) => edit(row.id, { decision: event.target.value as Decision })}
          >
            {["Pending", "Accepted", "Needs review"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="table-row-actions">
            <button
              type="button"
              className="demo-button"
              aria-label={`Accept ${row.id}`}
              disabled={row.original.decision === "Accepted"}
              onClick={() => edit(row.id, { decision: "Accepted" })}
            >
              <Check size={13} /> Accept
            </button>
            <button
              type="button"
              className="demo-button"
              aria-label={`Flag ${row.id}`}
              onClick={() => edit(row.id, { decision: "Needs review" })}
            >
              Flag
            </button>
          </div>
        ),
      },
    ],
    [expanded, frames, edit]
  )
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    state: {
      globalFilter: search,
      sorting,
      rowSelection: selection,
      columnFilters: decision === "All" ? [] : [{ id: "decision", value: decision }],
    },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: 10 } },
  })
  const selected = Object.keys(selection).filter((id) => selection[id])
  const shown = table.getFilteredRowModel().rows
  return (
    <div className="demo-stack rich-table-study">
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Evidence review queue</h2>
            <p>Illustrative records with sample photographs and editable review decisions.</p>
          </div>
          <button
            type="button"
            className="demo-button"
            onClick={() =>
              download(
                "review-records.json",
                JSON.stringify(
                  selected.length
                    ? data.filter((row) => selected.includes(row.id))
                    : shown.map((row) => row.original),
                  null,
                  2
                )
              )
            }
          >
            <Download size={12} /> Export{" "}
            {selected.length ? `${selected.length} selected` : `${shown.length} shown`}
          </button>
        </div>
        <div className="rich-table-filters">
          <label className="catalog-search">
            <Search size={15} />
            <input
              type="search"
              className="demo-input"
              aria-label="Search rich table"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                table.setPageIndex(0)
              }}
              placeholder="Search records or regions…"
            />
          </label>
          <label className="demo-field">
            <span>Decision</span>
            <select
              aria-label="Filter decisions"
              value={decision}
              onChange={(event) => {
                setDecision(event.target.value)
                table.setPageIndex(0)
              }}
            >
              {["All", "Pending", "Accepted", "Needs review"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <span className="demo-meta">
            {shown.length} / {data.length} records
          </span>
        </div>
        {!!selected.length && (
          <div className="rich-bulk">
            <strong>{selected.length} selected</strong>
            <button
              type="button"
              className="demo-button"
              onClick={() =>
                changeRows(
                  data.map((row) =>
                    selected.includes(row.id) ? { ...row, decision: "Accepted" } : row
                  ),
                  `Accepted ${selected.length} selected records.`
                )
              }
            >
              <Check size={13} /> Accept selected
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => {
                changeRows(
                  data.map((row) =>
                    selected.includes(row.id) ? { ...row, decision: "Needs review" } : row
                  ),
                  `Flagged ${selected.length} selected records.`
                )
              }}
            >
              Flag selected
            </button>
            <button type="button" className="demo-button" onClick={() => setSelection({})}>
              <X size={13} /> Clear selection
            </button>
          </div>
        )}
        <section
          className="rich-table-scroll"
          aria-label="Evidence table; scroll horizontally for all columns"
        >
          <table className="rich-table">
            <thead>
              {table.getHeaderGroups().map((header) => (
                <tr key={header.id}>
                  {header.headers.map((cell) => (
                    <th key={cell.id} scope="col">
                      {cell.column.getCanSort() ? (
                        <button type="button" onClick={cell.column.getToggleSortingHandler()}>
                          {flexRender(cell.column.columnDef.header, cell.getContext())}
                          {cell.column.getIsSorted() === "asc" ? (
                            <ArrowUp size={12} />
                          ) : cell.column.getIsSorted() === "desc" ? (
                            <ArrowDown size={12} />
                          ) : (
                            <ChevronDown size={11} />
                          )}
                        </button>
                      ) : (
                        flexRender(cell.column.columnDef.header, cell.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <tr data-selected={row.getIsSelected()}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expanded === row.id && (
                    <tr className="rich-expanded">
                      <td colSpan={columns.length}>
                        <div className="rich-row-detail">
                          <div>
                            <div className="rich-frame-strip">
                              {[0, 1, 2].map((frame) => (
                                <button
                                  type="button"
                                  key={frame}
                                  aria-label={`Show ${row.id} frame ${frame + 1}`}
                                  aria-pressed={(frames[row.id] ?? 0) === frame}
                                  onClick={() =>
                                    setFrames((current) => ({ ...current, [row.id]: frame }))
                                  }
                                >
                                  <img
                                    src={evidenceFrame(row.id, frame).src}
                                    alt={evidenceFrame(row.id, frame).note}
                                  />
                                  <span>
                                    {evidenceFrame(row.id, frame).title} ·{" "}
                                    {evidenceFrame(row.id, frame).credit}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <p className="demo-meta">Illustrative photo set · {row.original.day}</p>
                          </div>
                          <div className="input-form">
                            <h3>Review {row.id}</h3>
                            <label className="demo-field">
                              <span>Notes</span>
                              <textarea
                                className="demo-input"
                                aria-label={`Notes for ${row.id}`}
                                value={row.original.notes}
                                onChange={(event) => {
                                  const next = data.map((item) =>
                                    item.id === row.id
                                      ? { ...item, notes: event.target.value }
                                      : item
                                  )
                                  setData(next)
                                  draft = next
                                }}
                                placeholder="Record the evidence behind this decision…"
                              />
                            </label>
                            <button
                              type="button"
                              className="demo-button"
                              onClick={() => setExpanded(null)}
                            >
                              Close details
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="rich-empty">
                      <strong>No records match these filters.</strong>
                      <button
                        type="button"
                        className="demo-button"
                        onClick={() => {
                          setSearch("")
                          setDecision("All")
                        }}
                      >
                        Show all records
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <div className="table-pagination">
          <span className="demo-meta">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}{" "}
            · {shown.length} records
          </span>
          <div className="demo-toolbar">
            <button
              type="button"
              className="demo-button"
              aria-label="Previous table page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="demo-button"
              aria-label="Next table page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <div className="table-feedback" role="status">
        <span>
          {message || "Edits stay in this browser session. Export the records to keep them."}
        </span>
        {previous && (
          <button
            type="button"
            className="demo-button"
            onClick={() => {
              setData(previous)
              draft = previous
              setPrevious(null)
              setMessage("Restored the previous table values.")
            }}
          >
            <Undo2 size={13} /> Undo last change
          </button>
        )}
      </div>
    </div>
  )
}
