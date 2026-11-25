import { createReadStream } from "node:fs"
import { mkdir, stat, writeFile } from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { controlFindings, workspaceFindings } from "./ui-checks.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const inputs = args.filter((arg) => !arg.startsWith("--"))
if (!inputs.length)
  throw new Error(
    "Usage: node check.mjs /path/output.html [more.html] [--matrix] [--screenshots] [--out=/path]"
  )
const out = path.resolve(
  args.find((arg) => arg.startsWith("--out="))?.slice(6) ??
    path.resolve(root, "../../output/playwright/artifacts")
)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] })
const findings = []
const results = []
for (const input of inputs) {
  const file = path.resolve(input)
  const dir = path.dirname(file)
  const server = http.createServer(async (req, res) => {
    const local = path.resolve(
      dir,
      `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`
    )
    if (!local.startsWith(`${dir}/`)) {
      res.writeHead(403).end()
      return
    }
    try {
      if (!(await stat(local)).isFile()) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, {
        "Content-Type": local.endsWith(".wasm")
          ? "application/wasm"
          : local.endsWith(".js")
            ? "text/javascript"
            : "text/html",
      })
      createReadStream(local).pipe(res)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const url = `http://127.0.0.1:${server.address().port}/${path.basename(file)}`
  const matrix = args.includes("--matrix")
    ? ["instrument", "editorial", "console"].flatMap((direction) =>
        ["light", "dark"].flatMap((mode) =>
          [1440, 390].map((width) => ({ direction, mode, width }))
        )
      )
    : [{ direction: "instrument", mode: "light", width: 1440 }]
  for (const variant of matrix) {
    const label = `${path.basename(file, ".html")}-${variant.direction}-${variant.mode}-${variant.width}`
    const context = await browser.newContext({
      viewport: { width: variant.width, height: 1000 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    const errors = []
    const requests = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("favicon"))
        errors.push(message.text())
    })
    context.on("request", (request) => {
      if (
        /^https?:/.test(request.url()) &&
        !request.url().startsWith(`http://127.0.0.1:${server.address().port}/`)
      )
        requests.push(request.url())
    })
    try {
      await page.goto(url)
      await page.waitForFunction(() => document.documentElement.dataset.artifactReady, null, {
        timeout: 45000,
      })
      await page.evaluate(async ({ direction, mode }) => {
        Atelier.theme(direction, mode)
        await Atelier.settled()
      }, variant)
      await page.locator(".at-cell").last().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.evaluate(() => document.fonts.ready)
      const controls = await page.evaluate(controlFindings)
      const workspaces = await page.evaluate(workspaceFindings)
      const state = await page.evaluate(() => ({
        ready: document.documentElement.dataset.artifactReady,
        widgets: [...document.querySelectorAll("[data-at-mounted]")].map((node) => ({
          family: node.dataset.atMounted,
          state: node.dataset.atState,
        })),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        errors: [...document.querySelectorAll(".at-error")].map((node) => node.textContent),
        links: [...document.querySelectorAll(".at-nav a")].every((node) =>
          document.querySelector(node.getAttribute("href"))
        ),
        cellCount: document.querySelectorAll(".at-cell").length,
      }))
      if (
        state.ready !== "true" ||
        state.widgets.some((item) => item.state !== "ready") ||
        state.overflow ||
        state.errors.length ||
        controls.length ||
        workspaces.length ||
        !state.links ||
        errors.length ||
        requests.length
      )
        findings.push({
          label,
          ...state,
          controls,
          workspaces,
          browserErrors: errors,
          remoteRequests: requests,
        })
      if (args.includes("--screenshots")) {
        await page.evaluate(() => scrollTo(0, 0))
        await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: false })
      }
      results.push({ label, ...state, controls, workspaces, remoteRequests: requests.length })
    } catch (error) {
      findings.push({ label, error: error.message, browserErrors: errors })
    }
    await context.close()
  }
  await new Promise((resolve) => server.close(resolve))
}
await browser.close()
await writeFile(path.join(out, "results.json"), JSON.stringify({ results, findings }, null, 2))
console.log(JSON.stringify({ checked: results.length, findings, output: out }, null, 2))
if (findings.length) process.exitCode = 1
