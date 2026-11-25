// Load the artifact page inside a document shaped like the artifact host's,
// with a similar content security policy, then check light/dark switching,
// every direction and screen, and phone width.
// Usage: node scripts/check-artifact.mjs [page.html] [outDir]
import { mkdir, readFile } from "node:fs/promises"
import { chromium } from "playwright"

const pagePath = process.argv[2] ?? "dist/artifact/index.html"
const out = process.argv[3] ?? "captures/artifact"
const content = await readFile(pagePath, "utf8")
const csp = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  "img-src data: blob:",
].join("; ")
const host = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>${content}</body></html>`

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const problems = []

async function open(viewport, colorScheme) {
  const page = await browser.newPage({ viewport, colorScheme, reducedMotion: "reduce" })
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`))
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`))
  await page.route("https://artifact.test/", (route) =>
    route.fulfill({ contentType: "text/html", body: host })
  )
  await page.goto("https://artifact.test/", { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  return page
}

// The preview bar's pickers are selects named Screen, Theme and Mode; choose a
// value in whichever one offers it.
const choose = (page, value) =>
  page
    .locator(`nav[aria-label="Gallery preview"] select:has(option[value="${value}"])`)
    .selectOption(value)
const background = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

// The viewer's theme: system setting, overridden by data-theme on <html>.
const modes = [
  { scheme: "light", attr: null, want: "light" },
  { scheme: "dark", attr: null, want: "dark" },
  { scheme: "dark", attr: "light", want: "light" },
  { scheme: "light", attr: "dark", want: "dark" },
]
const seen = {}
for (const m of modes) {
  const page = await open({ width: 1440, height: 900 }, m.scheme)
  if (m.attr) await page.evaluate((a) => (document.documentElement.dataset.theme = a), m.attr)
  seen[`${m.scheme}/${m.attr ?? "unset"}`] = { want: m.want, bg: await background(page) }
  await page.close()
}
const lightBg = seen["light/unset"].bg
const darkBg = seen["dark/unset"].bg
if (lightBg === darkBg) problems.push("system dark setting did not change the page")
for (const [key, { want, bg }] of Object.entries(seen))
  if (bg !== (want === "light" ? lightBg : darkBg))
    problems.push(`${key}: expected ${want} background, got ${bg}`)

// Every direction and screen through the page's own controls, in system dark.
const page = await open({ width: 1440, height: 900 }, "dark")
for (const d of ["instrument", "editorial", "console"]) {
  await choose(page, d)
  for (const s of ["monitor", "review", "lab", "report", "states", "examples"]) {
    await choose(page, s)
    await page.waitForTimeout(150)
    if (s === "examples") {
      const loaded = await page.locator("article img").evaluateAll(async (images) => {
        await Promise.all(images.map((image) => image.decode()))
        return images.length === 4 && images.every((image) => image.naturalWidth > 0)
      })
      if (!loaded) problems.push(`${d}: missing showcase screenshots`)
    }
    const states = await page.$$eval("figure.plot-figure", (els) =>
      // Charts in panels hidden at this width never get a size; skip them.
      els.filter((e) => e.getClientRects().length > 0).map((e) => e.dataset.state)
    )
    for (const st of states) if (st !== "ok") problems.push(`${d}/${s}: chart ${st}`)
  }
  await choose(page, "monitor")
  await page.screenshot({ path: `${out}/${d}-system-dark.png` })
}
await page.close()

// Phone width: the body must never scroll sideways.
const phone = await open({ width: 390, height: 844 }, "light")
for (const s of ["monitor", "review", "lab", "report", "states", "examples"]) {
  await choose(phone, s)
  await phone.waitForTimeout(150)
  const { scroll, client } = await phone.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  if (scroll > client) problems.push(`phone ${s}: page scrolls sideways (${scroll} > ${client})`)
}
await choose(phone, "report")
await phone.screenshot({ path: `${out}/report-phone.png`, fullPage: true })
await phone.close()
await browser.close()

console.log(JSON.stringify(seen))
console.log(problems.length ? problems.join("\n") : "artifact checks clean")
process.exit(problems.length ? 1 : 0)
