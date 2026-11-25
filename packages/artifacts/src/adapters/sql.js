import * as duckdb from "@duckdb/duckdb-wasm"
import { tableFromJSON } from "apache-arrow"
import { editor } from "./code-editor"

const A = globalThis.Atelier
A.register(
  "sql",
  async (host, options, ctx) => {
    if (!globalThis.ATELIER_ASSETS?.duckdbWorker)
      throw new Error(
        "SQL requires the browser profile and its packaged assets. Serve the output directory over HTTP."
      )
    const worker = new Worker(globalThis.ATELIER_ASSETS.duckdbWorker)
    const database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker)
    let connection
    ctx.onCleanup(() => {
      void database.terminate()
      worker.terminate()
    })
    await database.instantiate(globalThis.ATELIER_ASSETS.duckdbWasm)
    connection = await database.connect()
    await connection.query(
      "SET autoinstall_known_extensions=false; SET autoload_known_extensions=false;"
    )
    for (const [name, data] of Object.entries(options.tables ?? {})) {
      if (!/^[a-zA-Z_]\w*$/.test(name)) throw new Error(`Use a simple SQL table name: ${name}`)
      if (!data.length) throw new Error(`Table ${name} has no rows. Supply rows with typed fields.`)
      await connection.insertArrowTable(tableFromJSON(data), { name })
    }
    if (ctx.signal.aborted) return { destroy: () => database.terminate() }
    const source = ctx.element("div")
    const toolbar = ctx.element("div", "at-toolbar")
    const status = ctx.element("p", "at-note")
    status.setAttribute("role", "status")
    const output = ctx.element("div", "at-table-wrap")
    const layout = ctx.element("div", "at-with-controls at-query")
    const controls = ctx.element("div", "at-controls")
    controls.append(source, toolbar, status)
    layout.append(controls, output)
    host.append(layout)
    const view = editor(source, { source: options.source })
    let rows = []
    const run = async () => {
      status.textContent = "Running query…"
      try {
        const result = await connection.query(view.state.doc.toString())
        rows = result.toArray().map((row) => row.toJSON())
        output.replaceChildren()
        const table = ctx.element("table", "at-table")
        const head = ctx.element("thead")
        const tr = ctx.element("tr")
        for (const column of result.schema.fields) tr.append(ctx.element("th", "", column.name))
        head.append(tr)
        table.append(head)
        const body = ctx.element("tbody")
        for (const row of rows.slice(0, options.limit ?? 200)) {
          const line = ctx.element("tr")
          for (const column of result.schema.fields)
            line.append(ctx.element("td", "", row[column.name]))
          body.append(line)
        }
        table.append(body)
        output.append(table)
        status.textContent = `${rows.length} result rows · showing at most ${options.limit ?? 200}`
        options.onResult?.(rows)
        return rows
      } catch (error) {
        status.textContent = `Query failed: ${error.message}`
        throw error
      }
    }
    ctx.button("Run SQL", run, toolbar)
    await run()
    return {
      update: async (next) => {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next.source } })
        await run()
      },
      theme() {},
      destroy: () => view.destroy(),
      api: {
        run,
        database,
        connection,
        get rows() {
          return rows
        },
      },
    }
  },
  { duckdb }
)
