import DataEditor, { GridCellKind } from "@glideapps/glide-data-grid"
import { useState } from "react"
import "@glideapps/glide-data-grid/dist/index.css"

const A = globalThis.Atelier
function Grid({ options, t, state }) {
  const [rows, setRows] = useState(options.data)
  state.rows = rows
  return (
    <DataEditor
      width="100%"
      height={options.height ?? 420}
      columns={options.columns.map((c) => ({ width: 150, ...c }))}
      rows={rows.length}
      verticalBorder={false}
      rowHeight={38}
      headerHeight={40}
      getCellContent={([col, row]) => {
        const column = options.columns[col]
        const value = rows[row][column.id]
        if (typeof value === "boolean")
          return {
            kind: GridCellKind.Boolean,
            data: value,
            allowOverlay: false,
            readonly: column.readonly,
          }
        if (typeof value === "number")
          return {
            kind: GridCellKind.Number,
            data: value,
            displayData: String(value),
            allowOverlay: true,
            readonly: column.readonly,
          }
        return {
          kind: GridCellKind.Text,
          data: String(value ?? ""),
          displayData: String(value ?? ""),
          allowOverlay: true,
          readonly: column.readonly,
        }
      }}
      onCellEdited={([col, row], value) => {
        if (options.columns[col].readonly) return
        const next = rows.map((item, index) =>
          index === row ? { ...item, [options.columns[col].id]: value.data } : item
        )
        if (options.validate && !options.validate(next[row], row)) return
        setRows(next)
        options.onChange?.(next, row, options.columns[col].id)
      }}
      theme={{
        accentColor: t.primary,
        accentLight: t.grid,
        accentFg: t.surface,
        bgCell: t.surface,
        bgCellMedium: t.grid,
        bgHeader: t.rampLow,
        bgHeaderHovered: t.grid,
        bgHeaderHasFocus: t.grid,
        textDark: t.ink,
        textMedium: t.text,
        textLight: t.text,
        textHeader: t.ink,
        borderColor: t.border,
        fontFamily: t.font,
        baseFontStyle: "13px",
        headerFontStyle: "600 13px",
      }}
      {...options.props}
    />
  )
}
A.register(
  "grid",
  (host, options, ctx) => {
    const root = A.ReactClient.createRoot(host)
    const state = {}
    let revision = 0
    const render = (next, reset = true) => {
      if (reset) revision++
      A.ReactDOM.flushSync(() =>
        root.render(<Grid key={revision} options={next} t={ctx.tokens()} state={state} />)
      )
    }
    render(options)
    return {
      update: render,
      theme: (next) => render(next, false),
      destroy: () => root.unmount(),
      api: {
        get rows() {
          return state.rows
        },
      },
    }
  },
  { DataEditor, GridCellKind }
)
