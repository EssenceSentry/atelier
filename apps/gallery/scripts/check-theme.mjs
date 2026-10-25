// Open each single-theme build and confirm it renders its own direction.
import { chromium } from "playwright"
const [base, out] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
await page.goto(`${base}/?s=monitor`, { waitUntil: "networkidle" })
await page.evaluate(() => document.fonts.ready)
const info = await page.evaluate(() => ({
  direction: document.documentElement.dataset.direction,
  font: getComputedStyle(document.body).fontFamily.split(",")[0],
  accent: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  charts: [...document.querySelectorAll("figure.plot-figure")].map((f) => f.dataset.state).join(","),
  dockButtons: [...document.querySelectorAll("button")].filter((b) => ["instrument", "editorial", "console"].includes(b.textContent)).length,
}))
await page.screenshot({ path: out })
console.log(JSON.stringify({ ...info, errors }))
await browser.close()
