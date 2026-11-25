import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"

const A = globalThis.Atelier
function RowAction({ column, row }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return (
    <>
      <button
        type="button"
        className="at-button"
        data-variant={column.variant ?? "secondary"}
        disabled={column.disabled?.(row.original) ?? false}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        onClick={async () => {
          if (busy) return
          setBusy(true)
          setError("")
          try {
            await column.action(row.original, row.index)
          } catch (cause) {
            setError(cause.message ?? String(cause))
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? (column.busyLabel ?? "Working…") : (column.label ?? column.title)}
      </button>
      {error && (
        <span className="at-error" role="alert">
          {error}
        </span>
      )}
    </>
  )
}
function Table({ options, state }) {
  const [rows, setRows] = useState(options.data)
  const [source, setSource] = useState(options.data)
  const [sorting, setSorting] = useState(options.sorting ?? [])
  const [filter, setFilter] = useState("")
  if (source !== options.data) {
    setSource(options.data)
    setRows(options.data)
  }
  state.rows = rows
  const columns = useMemo(
    () =>
      options.columnDefs ??
      options.columns.map((column) => ({
        accessorKey: column.key,
        enableSorting: column.type !== "button" && column.type !== "image",
        id: column.key,
        header: column.title ?? column.key,
        cell: ({ getValue, row }) => {
          const value = getValue()
          if (column.type === "image")
            return (
              <img
                src={value}
                alt={column.altKey ? row.original[column.altKey] : (column.title ?? "Record image")}
              />
            )
          if (column.type === "select")
            return (
              <span className="at-select-shell">
                <select
                  aria-label={`${column.title} for row ${row.index + 1}`}
                  value={value}
                  onChange={(event) => {
                    const next = rows.map((item, index) =>
                      index === row.index ? { ...item, [column.key]: event.target.value } : item
                    )
                    setRows(next)
                    options.onChange?.(next, row.index, column.key)
                  }}
                >
                  {column.options.map((choice) => (
                    <option key={choice}>{choice}</option>
                  ))}
                </select>
              </span>
            )
          if (column.type === "button") return <RowAction column={column} row={row} />
          if (column.type === "badge")
            return (
              <span
                className="at-badge"
                data-tone={
                  typeof column.tone === "function"
                    ? column.tone(value, row.original)
                    : (column.tone ?? "info")
                }
              >
                {String(value ?? "—")}
              </span>
            )
          return column.format ? column.format(value, row.original) : String(value ?? "—")
        },
      })),
    [options, rows]
  )
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row, index) => String(row[options.rowId ?? "id"] ?? index),
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: options.pageSize ?? 20 } },
    ...options.table,
  })
  state.table = table
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  useEffect(() => {
    if (pageIndex >= Math.max(1, pageCount)) table.setPageIndex(Math.max(0, pageCount - 1))
  }, [pageCount, pageIndex, table])
  return (
    <>
      {options.search !== false && (
        <div className="at-toolbar">
          <label className="at-field">
            <span>Filter records</span>
            <input
              className="at-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <p>
            {table.getFilteredRowModel().rows.length} / {rows.length} records
          </p>
        </div>
      )}
      <div className="at-table-wrap">
        <table className="at-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id}>
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="at-button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}{" "}
                        {header.column.getIsSorted() === "asc"
                          ? "↑"
                          : header.column.getIsSorted() === "desc"
                            ? "↓"
                            : ""}
                      </button>
                    ) : (
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!table.getFilteredRowModel().rows.length && (
          <p>No records match this filter. Clear it to see all records.</p>
        )}
      </div>
      <div className="at-toolbar">
        <button
          type="button"
          className="at-button"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Previous
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
        </span>
        <button
          type="button"
          className="at-button"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          Next
        </button>
      </div>
    </>
  )
}
A.register(
  "table",
  (host, options) => {
    const root = A.ReactClient.createRoot(host)
    const state = {}
    const render = (next) =>
      A.ReactDOM.flushSync(() => root.render(<Table options={next} state={state} />))
    render(options)
    return {
      update: render,
      theme() {},
      destroy: () => root.unmount(),
      api: {
        get table() {
          return state.table
        },
        get rows() {
          return state.rows
        },
      },
    }
  },
  { useReactTable }
)
