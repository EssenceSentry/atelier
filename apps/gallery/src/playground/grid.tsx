import DataEditor, {
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid"
import { Download, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { download, type Sample, samples } from "./data"
import "@glideapps/glide-data-grid/dist/index.css"

const columns: GridColumn[] = [
  { title: "Record", id: "id", width: 105 },
  { title: "Region", id: "group", width: 135 },
  { title: "Score", id: "score", width: 110 },
  { title: "Volume", id: "volume", width: 115 },
  { title: "Reviewed", id: "reviewed", width: 110 },
  { title: "Observation date", id: "day", width: 170 },
]
// Experiment-local memory; switching views keeps edits until the page reloads.
let draft: { rows: Sample[]; changed: Set<string>; sizes: GridColumn[] } | null = null

export default function Grid() {
  const tokens = useVizTokens()
  const [rows, setRows] = useState(
    () => draft?.rows ?? samples.slice(0, 60).map((row) => ({ ...row }))
  )
  const [sizes, setSizes] = useState(() => draft?.sizes ?? columns)
  const [changed, setChanged] = useState(() => new Set(draft?.changed))
  const [search, setSearch] = useState(false)
  const [notice, setNotice] = useState("")
  useEffect(() => {
    draft = { rows, changed, sizes }
  }, [rows, changed, sizes])
  const theme = useMemo<Partial<Theme>>(() => {
    if (!tokens) return {}
    const probe = document.createElement("span")
    document.body.appendChild(probe)
    const resolveToken = (name: string) => {
      probe.style.color = `var(${name})`
      return getComputedStyle(probe).color
    }
    const soft = resolveToken("--primary-soft")
    const foreground = resolveToken("--primary-foreground")
    const sunken = resolveToken("--sunken")
    probe.remove()
    return {
      accentColor: tokens.primary,
      accentFg: foreground,
      accentLight: soft,
      textDark: tokens.ink,
      textMedium: tokens.text,
      textLight: tokens.text,
      bgCell: tokens.surface,
      bgCellMedium: sunken,
      bgHeader: sunken,
      bgHeaderHasFocus: soft,
      bgHeaderHovered: sunken,
      textHeader: tokens.ink,
      textHeaderSelected: tokens.ink,
      borderColor: tokens.border,
      horizontalBorderColor: tokens.border,
      headerFontStyle: "600 13px",
      baseFontStyle: "13px",
      fontFamily: tokens.font,
      editorFontSize: "13px",
      cellHorizontalPadding: 15,
    }
  }, [tokens])
  const getCell = useCallback(
    ([col, row]: Item): GridCell => {
      const key = columns[col].id as keyof Sample
      const value = rows[row][key]
      if (typeof value === "boolean")
        return { kind: GridCellKind.Boolean, data: value, allowOverlay: false }
      if (typeof value === "number")
        return {
          kind: GridCellKind.Number,
          data: value,
          displayData: key === "score" ? value.toFixed(3) : value.toLocaleString(),
          allowOverlay: true,
        }
      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: value,
        allowOverlay: true,
        readonly: key === "id",
      }
    },
    [rows]
  )
  const edit = useCallback(
    ([col, row]: Item, cell: EditableGridCell) => {
      const key = columns[col].id as keyof Sample
      if (key === "id") return
      const value = cell.data
      if (
        (key === "score" && (typeof value !== "number" || value < 0 || value > 1)) ||
        (key === "volume" && (typeof value !== "number" || value < 0 || !Number.isInteger(value)))
      ) {
        setNotice(
          key === "score"
            ? "Score must be between 0 and 1."
            : "Volume must be a non-negative integer."
        )
        return
      }
      setRows((current) =>
        current.map((record, index) =>
          index === row ? ({ ...record, [key]: value } as Sample) : record
        )
      )
      setChanged((current) => new Set(current).add(rows[row].id))
      setNotice(`Updated ${rows[row].id} · ${columns[col].title.toLowerCase()}`)
    },
    [rows]
  )
  return (
    <div className="demo-stack">
      <div className="demo-kpis">
        <div className="demo-kpi">
          <span>Editable records</span>
          <strong>{rows.length}</strong>
          <small>Six typed columns</small>
        </div>
        <div className="demo-kpi">
          <span>Changed records</span>
          <strong>{changed.size}</strong>
          <small>Edits are held in memory</small>
        </div>
        <div className="demo-kpi">
          <span>Total volume</span>
          <strong>{rows.reduce((total, row) => total + row.volume, 0).toLocaleString()}</strong>
          <small>Recomputed after every edit</small>
        </div>
      </div>
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Observation editor</h2>
            <p>Double-click a cell to edit · record IDs are fixed</p>
          </div>
          <div className="demo-toolbar">
            <button type="button" className="demo-button" onClick={() => setSearch(true)}>
              Find in grid
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => {
                setRows(samples.slice(0, 60).map((row) => ({ ...row })))
                setChanged(new Set())
                setNotice("Restored the original 60 records.")
              }}
            >
              <RotateCcw size={12} /> Restore
            </button>
            <button
              type="button"
              className="demo-button primary"
              onClick={() => download("edited-observations.json", JSON.stringify(rows, null, 2))}
            >
              <Download size={12} /> Export {rows.length}
            </button>
          </div>
        </div>
        <div className="data-grid-host">
          {tokens && (
            <DataEditor
              columns={sizes}
              rows={rows.length}
              getCellContent={getCell}
              onCellEdited={edit}
              onColumnResize={(column, size) =>
                setSizes((current) =>
                  current.map((item) => (item.id === column.id ? { ...item, width: size } : item))
                )
              }
              rowMarkers="both"
              smoothScrollX
              verticalBorder={false}
              rowHeight={38}
              headerHeight={40}
              smoothScrollY
              theme={theme}
              showSearch={search}
              onSearchClose={() => setSearch(false)}
              getCellsForSelection
              width="100%"
              height={430}
            />
          )}
        </div>
        <div className="demo-panel-note" role="status">
          {notice ||
            "Select a range to copy it. Scores accept values from 0 to 1; volumes accept whole numbers."}
        </div>
      </section>
      <details className="demo-panel">
        <summary className="grid-changes-summary">
          Inspect changed records <span className="demo-meta">{changed.size} records</span>
        </summary>
        <div className="demo-panel-body">
          <pre className="code-preview">
            {JSON.stringify(
              rows.filter((row) => changed.has(row.id)),
              null,
              2
            )}
          </pre>
        </div>
      </details>
    </div>
  )
}
