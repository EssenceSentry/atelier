import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { sql } from "@codemirror/lang-sql"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view"
import * as duckdb from "@duckdb/duckdb-wasm"
import duckdbWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"
import { tags } from "@lezer/highlight"
import { Download, Play, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { download, samples } from "./data"

const initialSql = `SELECT
  "group" AS region,
  COUNT(*) AS records,
  ROUND(AVG(score), 3) AS mean_score,
  SUM(volume) AS total_volume
FROM samples
GROUP BY "group"
ORDER BY mean_score DESC;`
type Result = Record<string, string | number | boolean | null>[]

const sqlHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], class: "code-keyword" },
  { tag: [tags.string, tags.special(tags.string)], class: "code-string" },
  { tag: [tags.number, tags.bool, tags.null], class: "code-literal" },
  {
    tag: [tags.typeName, tags.standard(tags.name), tags.function(tags.variableName)],
    class: "code-function",
  },
  { tag: tags.comment, class: "code-comment" },
  { tag: [tags.operator, tags.punctuation], class: "code-operator" },
])

export default function Query() {
  const editorHost = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorView | null>(null)
  const text = useRef(initialSql)
  const connection = useRef<duckdb.AsyncDuckDBConnection | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [rows, setRows] = useState<Result>([])
  const [columns, setColumns] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [ran, setRan] = useState(false)
  const [lastQuery, setLastQuery] = useState("")
  const keyedRows = useMemo(
    () => rows.slice(0, 200).map((row) => ({ id: crypto.randomUUID(), row })),
    [rows]
  )

  const execute = useCallback(async () => {
    if (!connection.current) return
    setBusy(true)
    setError("")
    const start = performance.now()
    try {
      const source = text.current
      const result = await connection.current.query(source)
      const values = result
        .toArray()
        .map((row) =>
          Object.fromEntries(
            Object.entries(row.toJSON()).map(([key, value]) => [
              key,
              typeof value === "bigint" ? value.toString() : value,
            ])
          )
        ) as Result
      setRows(values)
      setColumns(result.schema.fields.map((field) => field.name))
      setLastQuery(source)
      setRan(true)
      setElapsed(performance.now() - start)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const worker = new Worker(duckdbWorker)
    const database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker)
    let disposed = false
    let conn: duckdb.AsyncDuckDBConnection | undefined
    void (async () => {
      try {
        await database.instantiate(duckdbWasm)
        if (disposed) return
        await database.registerFileText("samples.json", JSON.stringify(samples))
        conn = await database.connect()
        if (disposed) return
        await conn.query("CREATE TABLE samples AS SELECT * FROM read_json_auto('samples.json')")
        if (disposed) return
        connection.current = conn
        setReady(true)
        await execute()
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
    return () => {
      disposed = true
      connection.current = null
      void conn?.close()
      void database.terminate()
      worker.terminate()
    }
  }, [execute])

  useEffect(() => {
    if (!editorHost.current) return
    const view = new EditorView({
      parent: editorHost.current,
      state: EditorState.create({
        doc: text.current,
        extensions: [
          sql(),
          syntaxHighlighting(sqlHighlight),
          history(),
          lineNumbers(),
          highlightActiveLine(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            {
              key: "Mod-Enter",
              run: () => {
                void execute()
                return true
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) text.current = update.state.doc.toString()
          }),
          EditorView.theme({
            "&": { fontSize: "13px", backgroundColor: "var(--card)", color: "var(--foreground)" },
            ".cm-content": {
              fontFamily: "var(--ff-mono)",
              padding: "17px 0",
              minHeight: "265px",
              caretColor: "var(--primary)",
            },
            ".cm-line": { padding: "0 18px", lineHeight: "1.9" },
            ".cm-gutters": {
              backgroundColor: "var(--card)",
              color: "var(--muted-foreground)",
              border: "none",
              paddingLeft: "10px",
              fontFamily: "var(--ff-mono)",
              fontSize: "11px",
            },
            ".cm-activeLine": { backgroundColor: "var(--primary-soft)" },
            ".cm-cursor": { borderLeftColor: "var(--primary)" },
            "&.cm-focused": { outline: "none" },
            ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
              backgroundColor: "color-mix(in srgb, var(--primary) 18%, var(--card)) !important",
            },
          }),
        ],
      }),
    })
    editor.current = view
    return () => {
      view.destroy()
      editor.current = null
    }
  }, [execute])

  const changeQuery = (source: string) => {
    text.current = source
    editor.current?.dispatch({
      changes: { from: 0, to: editor.current.state.doc.length, insert: source },
    })
  }
  return (
    <div className="demo-stack">
      <div className="query-banner">
        <div className="query-db-icon">DB</div>
        <div>
          <strong>samples</strong>
          <p>240 rows · 8 columns · in-memory database</p>
        </div>
        <span className={`connection-status ${ready ? "ready" : ""}`}>
          <span />
          {ready ? "Database ready" : error ? "Database unavailable" : "Starting DuckDB…"}
        </span>
      </div>
      <div className="demo-two-col">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>SQL editor</h2>
              <p>⌘ / Ctrl + Enter to run</p>
            </div>
            <div className="demo-toolbar">
              <button type="button" className="demo-button" onClick={() => changeQuery(initialSql)}>
                <RotateCcw size={12} /> Example
              </button>
              <button
                type="button"
                className="demo-button primary"
                disabled={!ready || busy}
                onClick={() => void execute()}
              >
                <Play size={12} />
                {busy ? "Running…" : !ready ? "Starting database…" : "Run query"}
              </button>
            </div>
          </div>
          <div ref={editorHost} className="sql-editor" />
          <div className="demo-panel-note">
            Queries run locally in DuckDB-WASM. The schema below describes the illustrative dataset.
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Table schema</h2>
            <span className="demo-meta">samples</span>
          </div>
          <div className="schema-list">
            {[
              ["id", "VARCHAR", "Record identifier"],
              ["group", "VARCHAR", "North / Central / South"],
              ["x, y", "DOUBLE", "Synthetic coordinates"],
              ["score", "DOUBLE", "Value from 0 to 1"],
              ["volume", "BIGINT", "Illustrative quantity"],
              ["day", "DATE", "Observation date"],
              ["reviewed", "BOOLEAN", "Review state"],
            ].map(([field, type, description]) => (
              <div key={field}>
                <code>{field}</code>
                <span>{type}</span>
                <small>{description}</small>
              </div>
            ))}
          </div>
          <div className="demo-panel-note">
            <button
              type="button"
              className="query-example"
              onClick={() =>
                changeQuery(
                  'SELECT id, "group", score, volume\nFROM samples\nWHERE score >= 0.7\nORDER BY score DESC\nLIMIT 20;'
                )
              }
            >
              Load a high-score query →
            </button>
          </div>
        </section>
      </div>
      {error && (
        <div className="demo-error" role="alert">
          <h2>The query could not run</h2>
          <p>{error}</p>
          {ran && <p>The table below contains the last successful result.</p>}
        </div>
      )}
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Query results</h2>
            <p>
              {ran
                ? `${rows.length} rows · ${elapsed.toFixed(0)} ms`
                : "Waiting for the first result"}
            </p>
          </div>
          <button
            type="button"
            className="demo-button"
            disabled={!ran}
            onClick={() =>
              download("query-results.json", JSON.stringify({ query: lastQuery, rows }, null, 2))
            }
          >
            <Download size={12} /> Export result
          </button>
        </div>
        <div className="demo-table-wrap">
          <table className="demo-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keyedRows.map(({ id, row }) => (
                <tr key={id}>
                  {columns.map((column) => (
                    <td key={column} className={typeof row[column] === "number" ? "numeric" : ""}>
                      {String(row[column] ?? "null")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="demo-panel-body">
              <p className="status-message">
                {ran
                  ? "The query returned no rows."
                  : "The database is preparing the example query."}
              </p>
            </div>
          )}
        </div>
        {rows.length > 200 && (
          <div className="demo-panel-note">
            Showing 200 of {rows.length} result rows. The export includes all rows.
          </div>
        )}
      </section>
    </div>
  )
}
