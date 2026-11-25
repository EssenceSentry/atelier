// Run against the live board to refresh the gallery's static image previews.
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const base = new URL(process.argv[2] || "http://localhost:5188")
const only = new Set(process.argv.slice(3))
const out = new URL("../src/previews/", import.meta.url)
const regions = {
  carousel: ".embla-viewport",
  chat: ".chat-thread",
  explore: ".explore-chart",
  geometry: ".geometry-canvas[data-ready=true]",
  grid: ".data-grid-host",
  icons: ".icon-catalog",
  inputs: ".input-form",
  json: ".jsoncrack-canvas",
  media: ".image-compare-host",
  myst: ".myst-document",
  neural: ".nn-network-canvas[data-ready=true]",
  plots: '.catalog-plot.small[data-recipe="bar"]',
  program: ".program-canvas[data-ready=true]",
  query: ".sql-editor .cm-content",
  recommend: ".recommend-chart[data-ready=true]",
  "rich-table": ".rich-table",
  sanddance: ".sanddance-canvas[data-ready=true]",
  science: ".science-surface[data-ready=true]",
  spatial: ".spatial-canvas",
  writing: ".mermaid-host svg",
}
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
})
try {
  await mkdir(out, { recursive: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  })
  await page.goto(new URL("gallery.html", base).href)
  await page.locator(".catalog-families li").first().waitFor()
  const urls = await page
    .locator(".catalog-screen, .catalog-families li a")
    .evaluateAll((links) => links.map((a) => a.href))
  for (const href of urls) {
    const url = new URL(href)
    const family = url.searchParams.get("view")
    const id = family || url.searchParams.get("s")
    if (only.size && !only.has(id)) continue
    if (!family) url.searchParams.set("chrome", "0")
    await page.goto(url.href, { waitUntil: "domcontentloaded" })
    if (!family) {
      await page.getByRole("heading").first().waitFor()
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll(".plot-figure")).every(
          (figure) => !figure.clientWidth || figure.querySelector("svg")
        )
      )
    }
    const content = family ? page.locator(regions[family]).first() : page.locator("body")
    await content.waitFor({ timeout: 20000 })
    await page.evaluate(() => document.fonts.ready)
    if (family) await content.scrollIntoViewIfNeeded()
    if (family === "plots") {
      await page.locator(`${regions.plots}[data-ready=true]`).waitFor()
    }
    const shot = family
      ? await content.screenshot({
          animations: "disabled",
          style: ".workbench-topbar,.notebook-toolbar{visibility:hidden!important}",
        })
      : await page.screenshot({
          // Screens arrive with an entrance; the preview shows them at rest.
          animations: "disabled",
          clip: { x: 0, y: 0, width: 1440, height: 810 },
        })
    // Downsample inside Chromium so regenerating the index needs only Playwright.
    const data = await page.evaluate(
      async ({ source, width, height, alignStart, contain, background }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${source}`
        await image.decode()
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (contain) {
          const scale = Math.min(width / image.width, height / image.height)
          const w = image.width * scale
          const h = image.height * scale
          ctx.fillStyle = background
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h)
          return canvas.toDataURL("image/webp", 0.86).split(",")[1]
        }
        const cropWidth = Math.min(image.width, (image.height * width) / height)
        const cropHeight = (cropWidth * height) / width
        ctx.drawImage(
          image,
          alignStart ? 0 : (image.width - cropWidth) / 2,
          0,
          cropWidth,
          cropHeight,
          0,
          0,
          width,
          height
        )
        return canvas.toDataURL("image/webp", 0.86).split(",")[1]
      },
      {
        source: shot.toString("base64"),
        width: family ? 320 : 800,
        height: family ? 200 : 450,
        alignStart: family === "query",
        contain: family === "plots",
        background:
          family === "plots"
            ? await content.evaluate(
                (el) => getComputedStyle(el.closest(".catalog-card")).backgroundColor
              )
            : "white",
      }
    )
    await writeFile(fileURLToPath(new URL(`${id}.webp`, out)), Buffer.from(data, "base64"))
    console.log(id)
  }
} finally {
  await browser.close()
}
