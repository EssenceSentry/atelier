// Lay captures out as directions (columns) × screens (rows), one sheet per mode.
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { chromium } from "playwright"

const dir = resolve(process.argv[2] ?? "captures")
const directions = ["instrument", "editorial", "console"]
const screens = ["monitor", "review", "lab", "report"]
const browser = await chromium.launch()
for (const mode of ["light", "dark"]) {
  const cells = screens
    .map((s) =>
      directions.map((d) => `<img src="file://${dir}/${s}-${d}-${mode}-desktop.png">`).join("")
    )
    .join("")
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:40px;background:${mode === "light" ? "#e9e9ec" : "#111114"};font:600 15px system-ui;color:${mode === "light" ? "#222" : "#ddd"}}
    .grid{display:grid;grid-template-columns:repeat(3,720px);gap:20px}
    .grid h2{margin:0 0 4px;font-size:22px;text-transform:capitalize}
    img{width:720px;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:10px;box-shadow:0 2px 12px rgb(0 0 0/.18)}
  </style><div class="grid">${directions.map((d) => `<h2>${d}</h2>`).join("")}${cells}</div>`
  const file = `${dir}/overview-${mode}.html`
  await writeFile(file, html)
  const page = await browser.newPage({ viewport: { width: 2280, height: 800 } })
  await page.goto(`file://${file}`)
  await page.screenshot({ path: `${dir}/overview-${mode}.png`, fullPage: true })
  await page.close()
}
await browser.close()
