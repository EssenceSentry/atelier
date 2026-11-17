// Screenshot every direction × mode × screen and fail on console errors or
// any problem in the template's layout checks (broken charts, spilling
// panels, sideways scrolling, overlapping chart labels), the same checks
// every generated project runs. Usage: node scripts/capture.mjs [baseUrl] [outDir]
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { layoutProblems } from "../../../template/scripts/layout-checks.mjs"

const base = process.argv[2] ?? "http://localhost:5188"
const out = process.argv[3] ?? "captures"
const directions = ["instrument", "editorial", "console"]
const modes = ["light", "dark"]
const screens = ["monitor", "review", "lab", "report", "states", "examples"]
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  // Between the lg and xl breakpoints, where side panels fold into the page.
  { name: "laptop", width: 1180, height: 820 },
  // Phones are emulated with touch, so coarse-pointer styles are what gets checked.
  { name: "phone", width: 390, height: 844, touch: true },
]

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const vp of viewports) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    hasTouch: Boolean(vp.touch),
    isMobile: Boolean(vp.touch),
  })
  page.on(
    "console",
    (m) => m.type() === "error" && problems.push(`${page.url()} console: ${m.text()}`)
  )
  page.on("pageerror", (e) => problems.push(`${page.url()} pageerror: ${e.message}`))
  for (const d of directions)
    for (const m of modes)
      for (const s of screens) {
        if (vp.only && !vp.only.includes(s)) continue
        await page.goto(`${base}/?d=${d}&m=${m}&s=${s}&chrome=0`, { waitUntil: "networkidle" })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(250)
        for (const problem of await layoutProblems(page))
          problems.push(`${d}/${m}/${s}/${vp.name}: ${problem}`)
        await page.screenshot({ path: `${out}/${s}-${d}-${m}-${vp.name}.png`, fullPage: true })
        // Screens that scroll inside a panel instead of the page get a second
        // shot scrolled to the end, so what sits below the fold is seen too.
        const scrolled = await page.evaluate(() => {
          const inner = [...document.querySelectorAll("main, aside")].filter(
            (e) => e.getClientRects().length > 0 && e.scrollHeight > e.clientHeight + 2
          )
          for (const e of inner) e.scrollTop = e.scrollHeight
          return inner.length > 0
        })
        if (scrolled) {
          await page.waitForTimeout(150)
          await page.screenshot({ path: `${out}/${s}-${d}-${m}-${vp.name}-end.png` })
        }
      }
  await page.close()
}
await browser.close()
console.log(problems.length ? problems.join("\n") : "all captures clean")
process.exit(problems.length ? 1 : 0)
