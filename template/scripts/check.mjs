// Serve the build and look at it in light and dark, at desktop, laptop and
// phone widths. Fails on a console error or any problem in layout-checks.mjs:
// a broken chart, content spilling out of a panel, sideways scrolling, or
// chart labels that overlap or run past their panel. Screenshots land in
// checks/ for a person or an agent to look at. Run `npm run build` first.
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { preview } from "vite"
import { layoutProblems } from "./layout-checks.mjs"

const out = "checks"
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  // Between the lg and xl breakpoints, where side panels fold into the page.
  { name: "laptop", width: 1180, height: 820 },
  // Phones are emulated with touch, so coarse-pointer styles are what gets checked.
  { name: "phone", width: 390, height: 844, touch: true },
]

await mkdir(out, { recursive: true })
const server = await preview({ preview: { port: 4317, strictPort: false }, logLevel: "warn" })
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error("vite preview did not report a local address")

const browser = await chromium.launch()
const problems = []
for (const colorScheme of ["light", "dark"]) {
  for (const viewport of viewports) {
    const label = `${colorScheme}/${viewport.name}`
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme,
      deviceScaleFactor: 2,
      hasTouch: Boolean(viewport.touch),
      isMobile: Boolean(viewport.touch),
    })
    page.on(
      "console",
      (m) => m.type() === "error" && problems.push(`${label} console: ${m.text()}`)
    )
    page.on("pageerror", (e) => problems.push(`${label} page error: ${e.message}`))
    await page.goto(url, { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(250)
    for (const problem of await layoutProblems(page)) problems.push(`${label}: ${problem}`)
    await page.screenshot({ path: `${out}/${colorScheme}-${viewport.name}.png`, fullPage: true })
    await page.close()
  }
}
await browser.close()
await server.close()

console.log(problems.length ? problems.join("\n") : `checks clean; screenshots in ${out}/`)
process.exit(problems.length ? 1 : 0)
