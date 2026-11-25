import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import http from "node:http"
import path from "node:path"

const root = path.resolve(process.argv[2] ?? ".")
const port = Number(process.argv[3] ?? 5191)
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
}
http
  .createServer(async (req, res) => {
    try {
      const request = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
      const file = path.resolve(root, `.${request === "/" ? "/index.html" : request}`)
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
        res.writeHead(403).end()
        return
      }
      if (!(await stat(file)).isFile()) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      })
      createReadStream(file).pipe(res)
    } catch {
      res.writeHead(404).end("Not found")
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}`))
