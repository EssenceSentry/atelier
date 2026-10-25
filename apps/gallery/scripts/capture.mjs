// Screenshot every direction × mode × screen and fail on broken charts or
// console errors. Usage: node scripts/capture.mjs [baseUrl] [outDir]
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://localhost:5188"
const out = process.argv[3] ?? "captures"
const directions = ["instrument", "editorial", "console"]
const modes = ["light", "dark"]
const screens = ["monitor", "review", "lab", "report"]
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844, only: ["monitor", "report"] },
]

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })
  page.on("console", (m) => m.type() === "error" && problems.push(`${page.url()} console: ${m.text()}`))
  page.on("pageerror", (e) => problems.push(`${page.url()} pageerror: ${e.message}`))
  for (const d of directions)
    for (const m of modes)
      for (const s of screens) {
        if (vp.only && !vp.only.includes(s)) continue
        await page.goto(`${base}/?d=${d}&m=${m}&s=${s}&chrome=0`, { waitUntil: "networkidle" })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(250)
        const states = await page.$$eval("figure.plot-figure", (els) => els.map((e) => e.dataset.state))
        for (const st of states) if (st !== "ok") problems.push(`${d}/${m}/${s}/${vp.name}: chart ${st}`)
        await page.screenshot({ path: `${out}/${s}-${d}-${m}-${vp.name}.png`, fullPage: vp.name === "phone" || s === "report" })
      }
  await page.close()
}
await browser.close()
console.log(problems.length ? problems.join("\n") : "all captures clean")
process.exit(problems.length ? 1 : 0)
