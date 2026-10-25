// Screenshot every direction × mode × screen and fail on broken charts,
// console errors, content spilling out of a panel, or a page that scrolls
// sideways. Usage: node scripts/capture.mjs [baseUrl] [outDir]
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://localhost:5188"
const out = process.argv[3] ?? "captures"
const directions = ["instrument", "editorial", "console"]
const modes = ["light", "dark"]
const screens = ["monitor", "review", "lab", "report", "states"]
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  // Between the lg and xl breakpoints, where side panels fold into the page.
  { name: "laptop", width: 1180, height: 820 },
  { name: "phone", width: 390, height: 844 },
]

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const vp of viewports) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
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
        const states = await page.$$eval("figure.plot-figure", (els) =>
          // Charts in panels hidden at this width never get a size; skip them.
          els.filter((e) => e.getClientRects().length > 0).map((e) => e.dataset.state)
        )
        for (const st of states)
          if (st !== "ok") problems.push(`${d}/${m}/${s}/${vp.name}: chart ${st}`)
        const layout = await page.evaluate(() => ({
          sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          spills: [...document.querySelectorAll(".panel")]
            .filter((e) => e.getClientRects().length > 0 && e.scrollHeight > e.clientHeight + 2)
            .map((e) => e.querySelector("h1, h2, h3, summary")?.textContent ?? e.className),
        }))
        if (layout.sideways) problems.push(`${d}/${m}/${s}/${vp.name}: page scrolls sideways`)
        for (const panel of layout.spills)
          problems.push(`${d}/${m}/${s}/${vp.name}: content spills out of panel "${panel}"`)
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
