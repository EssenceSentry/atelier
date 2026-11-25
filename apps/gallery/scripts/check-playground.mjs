import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://127.0.0.1:5189"
const full = process.argv.includes("--matrix")
const outputArg = process.argv.find((arg) => arg.startsWith("--out="))?.slice(6)
const out = outputArg
  ? resolve(outputArg)
  : resolve(import.meta.dirname, "../../../output/playwright/workbench")
const views = [
  "explore",
  "program",
  "inputs",
  "query",
  "grid",
  "writing",
  "media",
  "spatial",
  "science",
  "sanddance",
  "recommend",
  "plots",
  "geometry",
  "carousel",
  "rich-table",
  "chat",
  "myst",
  "json",
  "neural",
  "icons",
]
const selectedViews = views.filter(
  (view) =>
    !process.argv.some((arg) => arg.startsWith("--view=")) ||
    process.argv.includes(`--view=${view}`)
)
const launchOptions = {
  args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
}
let browser = await chromium.launch(launchOptions)
const findings = []
await mkdir(out, { recursive: true })

async function open(view, direction = "instrument", mode = "light", width = 1440) {
  const page = await browser.newPage({
    viewport: { width, height: width < 700 ? 844 : 1000 },
    deviceScaleFactor: 1,
    hasTouch: width < 700,
    isMobile: width < 700,
  })
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto(`${base}/playground.html?view=${view}&d=${direction}&m=${mode}`, {
    waitUntil: "domcontentloaded",
  })
  await page.locator(".demo-loading").waitFor({ state: "detached", timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  await page
    .locator(
      ".notebook-page:not([hidden]) > .demo-stack, .notebook-page:not([hidden]) > .demo-two-col"
    )
    .first()
    .waitFor({ timeout: 30000 })
  if (view === "explore") await page.locator('[data-testid="scatter"][data-ready="true"]').waitFor()
  if (view === "program") await page.locator('.program-canvas[data-ready="true"]').waitFor()
  if (view === "query") await page.locator(".connection-status.ready").waitFor({ timeout: 60000 })
  if (view === "neural")
    await page.locator('.nn-network-canvas[data-ready="true"]').waitFor({ timeout: 60000 })
  if (view === "grid") await page.locator(".data-grid-host canvas").first().waitFor()
  if (view === "writing") await page.locator(".mermaid-host svg").waitFor({ timeout: 30000 })
  if (view === "science")
    await page.locator('.science-surface[data-ready="true"]').waitFor({ timeout: 60000 })
  if (view === "spatial") await page.locator(".spatial-canvas canvas").waitFor({ timeout: 30000 })
  if (view === "sanddance")
    await page.locator('.sanddance-canvas[data-ready="true"]').waitFor({ timeout: 60000 })
  if (view === "recommend") {
    await page
      .locator('.recommend-focus .recommend-chart[data-ready="true"]')
      .waitFor({ timeout: 30000 })
    await page.locator('.recommend-cards .recommend-chart[data-ready="true"]').first().waitFor()
  }
  if (view === "plots")
    await page
      .locator('.plot-catalog > section:first-child .catalog-plot[data-ready="true"]')
      .waitFor()
  if (view === "geometry") await page.locator('.geometry-canvas[data-ready="true"]').waitFor()
  if (view === "carousel") await page.locator(".evidence-slide img").first().waitFor()
  if (view === "chat")
    await page.getByRole("textbox", { name: "Chat message", exact: true }).waitFor()
  if (view === "myst") await page.locator(".myst-document .katex").first().waitFor()
  if (view === "icons") await page.locator(".icon-catalog .icon-card").first().waitFor()
  if (view === "json")
    await page.waitForFunction(
      () => {
        const space = document.querySelector(".jsoncrack-space")
        return (
          space &&
          getComputedStyle(space).opacity === "1" &&
          document.querySelector(".jsoncrack-canvas foreignObject")
        )
      },
      { timeout: 30000 }
    )
  if (view === "json" && width < 540) {
    await page.locator(".json-canvas").scrollIntoViewIfNeeded()
    await page.waitForTimeout(350)
    const root = await page.locator("g[id$='node-1']").boundingBox()
    assert.ok(root && root.width > 250, "Phone should begin at a readable root scale")
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  await page.waitForTimeout(350)
  return { page, errors }
}

async function saveDownload(page, action, file) {
  const waiting = page.waitForEvent("download")
  await action()
  const download = await waiting
  await download.saveAs(resolve(out, file))
  return readFile(resolve(out, file), "utf8")
}

async function interact(page, view) {
  if (view === "explore") {
    const count = () =>
      page
        .locator(".demo-kpi strong")
        .first()
        .innerText()
        .then((value) => parseInt(value, 10))
    assert.equal(await count(), 240)
    const plot = await page.locator('[data-testid="scatter"] svg').boundingBox()
    assert.ok(plot)
    await page.mouse.move(plot.x + plot.width * 0.32, plot.y + plot.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(plot.x + plot.width * 0.67, plot.y + plot.height * 0.7, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const brushed = await count()
    assert.ok(brushed > 0 && brushed < 240, `Brush should select a subset, got ${brushed}`)
    for (const direction of ["editorial", "console", "instrument"]) {
      await page.getByRole("combobox", { name: "Visual direction" }).selectOption(direction)
      await page.waitForTimeout(300)
      assert.equal(
        await count(),
        brushed,
        "Changing direction should preserve the selected records"
      )
      const brush = await page
        .locator('[data-testid="scatter"] .region_brush_bg > path')
        .boundingBox()
      assert.ok(
        brush && brush.width > 0 && brush.height > 0,
        "The visible brush should survive a theme change"
      )
    }
    await page.getByRole("button", { name: "Reset view" }).click()
    for (const name of ["North", "Central", "South"])
      await page.getByRole("button", { name, exact: true }).click()
    assert.equal(await count(), 0)
    await page.getByRole("button", { name: "Reset view" }).click()
    await page.getByRole("textbox", { name: "Search records" }).fill("S-001")
    const csv = await saveDownload(
      page,
      () => page.getByRole("button", { name: "Export 1", exact: true }).click(),
      "selected.csv"
    )
    assert.equal(csv.trim().split("\n").length, 2)
    assert.ok(csv.includes("S-001"))
    await page.getByRole("textbox", { name: "Search records" }).fill("")
  }
  if (view === "program") {
    assert.equal(await page.locator(".react-flow__node").count(), 6)
    await page.getByRole("slider", { name: "Observed heads" }).focus()
    await page.keyboard.press("End")
    await page.waitForTimeout(300)
    assert.ok((await page.locator(".program-inspector").innerText()).includes("Beta(22, 2)"))
    await page.getByRole("button", { name: "Disconnect observations" }).click()
    assert.ok((await page.locator(".program-inspector").innerText()).includes("Beta(2, 2)"))
    await page.getByRole("button", { name: "Connect observations" }).click()
    await page.getByRole("button", { name: "Collapse inputs to p | y", exact: true }).click()
    await page.waitForTimeout(600)
    assert.equal(await page.locator(".react-flow__node").count(), 3)
    await page.getByRole("button", { name: "Expand inputs to p | y", exact: true }).click()
    await page.waitForTimeout(600)
    assert.equal(await page.locator(".react-flow__node").count(), 6)
    await page.getByRole("button", { name: "Next trace step", exact: true }).click()
    assert.equal(await page.getByRole("slider", { name: "Trace step" }).inputValue(), "24")
    await page.getByRole("button", { name: "Play trace", exact: true }).click()
    await page.waitForTimeout(450)
    await page.getByRole("button", { name: "Pause trace", exact: true }).click()
    assert.ok(+(await page.getByRole("slider", { name: "Trace step" }).inputValue()) > 24)
  }
  if (view === "inputs") {
    await page.getByRole("textbox", { name: "Configuration name" }).fill("")
    await page.getByRole("button", { name: "Save configuration", exact: true }).click()
    await page.getByRole("alert").filter({ hasText: "at least three" }).waitFor()
    await page.getByRole("textbox", { name: "Configuration name" }).fill("Saved experiment")
    await page.getByRole("button", { name: "Save configuration", exact: true }).click()
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("atelier-workbench-configuration"))
    )
    assert.equal(saved.name, "Saved experiment")
    const json = await saveDownload(
      page,
      () => page.getByRole("button", { name: "JSON", exact: true }).click(),
      "configuration.json"
    )
    assert.equal(JSON.parse(json).name, saved.name)
  }
  if (view === "query") {
    assert.ok((await page.locator(".sql-editor .code-keyword").count()) > 5)
    const firstColor = await page
      .locator(".sql-editor .code-keyword")
      .first()
      .evaluate((node) => getComputedStyle(node).color)
    const baseColor = await page
      .locator(".sql-editor .cm-content")
      .evaluate((node) => getComputedStyle(node).color)
    assert.notEqual(firstColor, baseColor, "SQL keywords should have a distinct theme color")
    assert.equal(await page.locator(".demo-table tbody tr").count(), 3)
    const edit = async (value) => {
      await page.locator(".cm-content").click()
      await page.keyboard.press("Meta+a")
      await page.keyboard.insertText(value)
    }
    await edit(
      "-- Highlight a real query\nSELECT 'example' AS label, 42 AS amount, COUNT(*) AS records FROM samples WHERE score >= 0.7"
    )
    assert.ok((await page.locator(".sql-editor .code-comment").count()) > 0)
    assert.ok((await page.locator(".sql-editor .code-string").count()) > 0)
    assert.ok((await page.locator(".sql-editor .code-literal").count()) > 0)
    for (const direction of ["editorial", "console", "instrument"]) {
      await page.getByRole("combobox", { name: "Visual direction" }).selectOption(direction)
      assert.ok((await page.locator(".sql-editor .cm-content").innerText()).includes("example"))
      assert.ok((await page.locator(".sql-editor .code-keyword").count()) > 0)
    }
    await page.getByRole("button", { name: "dark mode", exact: true }).click()
    await page.getByRole("button", { name: "light mode", exact: true }).click()
    await page.locator(".sql-editor .cm-content").click()
    await page.keyboard.press("Meta+z")
    assert.ok(
      !(await page.locator(".sql-editor .cm-content").innerText()).includes("example"),
      "Undo history should survive theme changes"
    )
    await edit("SELECT COUNT(*) AS records FROM samples WHERE score >= 0.7")
    await page.getByRole("button", { name: "Run query", exact: true }).click()
    await page.waitForTimeout(350)
    const json = await saveDownload(
      page,
      () => page.getByRole("button", { name: "Export result", exact: true }).click(),
      "query.json"
    )
    const result = JSON.parse(json)
    assert.ok(+result.rows[0].records > 0 && +result.rows[0].records < 240)
    await edit("SELECT missing_column FROM samples")
    await page.getByRole("button", { name: "Run query", exact: true }).click()
    await page.getByRole("alert").waitFor()
    assert.ok((await page.getByRole("alert").innerText()).includes("last successful result"))
    await page.getByRole("button", { name: "Example", exact: true }).click()
    await page.getByRole("button", { name: "Run query", exact: true }).click()
    await page.waitForTimeout(300)
  }
  if (view === "grid") {
    const host = await page.locator(".data-grid-host").boundingBox()
    assert.ok(host)
    await page.mouse.dblclick(host.x + 200, host.y + 55)
    const input = page.locator("#portal textarea, #portal input").first()
    await input.waitFor({ timeout: 5000 })
    await input.fill("Edited region")
    await page.keyboard.press("Enter")
    await page.getByRole("status").filter({ hasText: "Updated" }).waitFor()
    await page.getByRole("button", { name: /Writing & diagrams/ }).click()
    await page.locator(".mermaid-host svg").waitFor()
    await page.getByRole("button", { name: /Editable grid/ }).click()
    await page.locator(".data-grid-host canvas").first().waitFor()
    const json = await saveDownload(
      page,
      () => page.getByRole("button", { name: "Export 60", exact: true }).click(),
      "grid.json"
    )
    assert.ok(JSON.parse(json).some((row) => row.group === "Edited region"))
    await page.getByRole("button", { name: "Restore", exact: true }).click()
  }
  if (view === "writing") {
    assert.ok((await page.locator(".katex").count()) >= 3)
    await page.getByRole("combobox", { name: "Diagram example" }).selectOption("sequence")
    await page.waitForTimeout(500)
    assert.ok((await page.locator(".mermaid-host").innerText()).includes("Reader"))
    const svg = await saveDownload(
      page,
      () => page.getByRole("button", { name: "SVG", exact: true }).click(),
      "diagram.svg"
    )
    assert.ok(svg.includes("<svg"))
  }
  if (view === "media") {
    await page.getByRole("button", { name: "Accept", exact: true }).click()
    await page.getByRole("textbox", { name: "Review notes" }).fill("Checked the selected region.")
    const canvas = await page.getByRole("img", { name: /Region annotation canvas/ }).boundingBox()
    assert.ok(canvas)
    await page.mouse.move(canvas.x + 30, canvas.y + 35)
    await page.mouse.down()
    await page.mouse.move(canvas.x + 120, canvas.y + 110, { steps: 6 })
    await page.mouse.up()
    const review = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Export review", exact: true }).click(),
        "review.json"
      )
    )
    assert.equal(review.decision, "accept")
    assert.ok(review.region.width > 0)
    assert.equal(review.notes, "Checked the selected region.")
    await page.getByRole("button", { name: /Writing & diagrams/ }).click()
    await page.locator(".mermaid-host svg").waitFor()
    await page.getByRole("button", { name: /Media & review/ }).click()
    await page.getByRole("textbox", { name: "Review notes" }).waitFor()
    assert.equal(
      await page.getByRole("textbox", { name: "Review notes" }).inputValue(),
      "Checked the selected region."
    )
    assert.equal(
      await page.getByRole("button", { name: "Accept", exact: true }).getAttribute("aria-pressed"),
      "true"
    )
    await page.waitForFunction(() => document.querySelector("audio")?.duration === 3)
    await page.locator("audio").evaluate((audio) => audio.play())
    await page.waitForFunction(() => document.querySelector("audio")?.currentTime > 0)
    assert.ok(await page.locator("audio").evaluate((audio) => audio.currentTime > 0))
    await page.locator("audio").evaluate((audio) => audio.pause())
  }
  if (view === "spatial") {
    await page.getByRole("button", { name: "Center on observation", exact: true }).click()
    await page.getByRole("checkbox", { name: "Size by volume" }).uncheck()
    await page.getByRole("button", { name: "North", exact: true }).click()
    assert.ok(
      (await page.locator(".demo-panel-head p").first().innerText()).includes("160 observations")
    )
  }
  if (view === "science") {
    await page.getByRole("slider", { name: "Wave frequency" }).focus()
    await page.keyboard.press("End")
    await page.waitForTimeout(400)
    assert.ok((await page.locator(".science-controls").innerText()).includes("3.0"))
    await page.getByRole("button", { name: "Camera", exact: true }).click()
  }
  if (view === "sanddance") {
    for (const name of ["Stacks", "Grid", "Treemap", "Scatterplot"]) {
      await page.getByRole("button", { name, exact: true }).click()
      await page.waitForTimeout(150)
      await page.locator('.sanddance-canvas[data-ready="true"]').waitFor({ timeout: 30000 })
    }
    await page.getByRole("combobox", { name: "SandDance x", exact: true }).selectOption("volume")
    await page.getByRole("combobox", { name: "SandDance view", exact: true }).selectOption("2d")
    await page
      .getByRole("combobox", { name: "SandDance select region", exact: true })
      .selectOption("North")
    await page.getByRole("status").filter({ hasText: "80 selected" }).waitFor({ timeout: 20000 })
    const json = await saveDownload(
      page,
      () => page.getByRole("button", { name: "Export selected records" }).click(),
      "sanddance-selection.json"
    )
    const rows = JSON.parse(json)
    assert.equal(rows.length, 80)
    assert.ok(rows.every((row) => row.group === "North"))
    await page
      .getByRole("combobox", { name: "SandDance filter", exact: true })
      .selectOption("South")
    await page.waitForTimeout(150)
    await page.locator('.sanddance-canvas[data-ready="true"]').waitFor({ timeout: 30000 })
    assert.ok(
      (await page.locator(".sanddance-workspace .demo-panel-head p").innerText()).includes(
        "80 / 240"
      )
    )
  }
  if (view === "recommend") {
    await page.getByRole("combobox", { name: "x encoding", exact: true }).selectOption("x")
    await page.getByRole("combobox", { name: "size encoding", exact: true }).selectOption("score")
    await page.getByRole("button", { name: "Add a field", exact: true }).click()
    await page.locator(".recommend-card").first().waitFor()
    const initial = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Spec", exact: true }).click(),
        "specified-chart.json"
      )
    )
    assert.equal(initial.encoding.x.field, "x")
    await page.getByRole("button", { name: /^Use related view 1:/ }).click()
    const promoted = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Spec", exact: true }).click(),
        "promoted-chart.json"
      )
    )
    assert.notDeepEqual(promoted.encoding, initial.encoding)
    await page.getByRole("button", { name: "Back", exact: true }).click()
    assert.equal(
      await page.getByRole("combobox", { name: "size encoding", exact: true }).inputValue(),
      "score"
    )
    await page.getByRole("button", { name: "Summarize", exact: true }).click()
    await page.getByRole("button", { name: /^Use related view 1:/ }).click()
    const summary = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Spec", exact: true }).click(),
        "summary-chart.json"
      )
    )
    assert.ok(Object.values(summary.encoding).some((field) => field.aggregate))
    await page.getByRole("button", { name: "Reset", exact: true }).click()
  }
  if (view === "plots") {
    await page.getByRole("combobox", { name: "Gallery measurement" }).selectOption("volume")
    await page.getByRole("combobox", { name: "Gallery region" }).selectOption("North")
    await page.getByRole("button", { name: "Distribution", exact: true }).click()
    await page.getByRole("button", { name: "Inspect Box plot", exact: true }).click()
    await page.getByRole("heading", { name: "Box plot", exact: true }).waitFor()
    const spec = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Spec", exact: true }).click(),
        "gallery-box.json"
      )
    )
    assert.equal(spec.data.values.length, 80)
    assert.equal(spec.encoding.y.field, "volume")
    await page.getByRole("button", { name: "All", exact: true }).click()
    await page.getByRole("button", { name: "Show all 26 recipes" }).click()
    const recipeButtons = page.locator(".catalog-card")
    assert.equal(await recipeButtons.count(), 26)
    for (let index = 0; index < 26; index++) {
      const button = recipeButtons.nth(index)
      const label = await button.getAttribute("aria-label")
      await button.click()
      await page
        .locator('.plot-catalog > section:first-child .catalog-plot[data-ready="true"]')
        .waitFor()
      await page.waitForTimeout(50)
      assert.equal(
        await page.locator('.plot-catalog [role="alert"]').count(),
        0,
        `${label} should render`
      )
    }
    await page.getByRole("searchbox", { name: "Search plot recipes" }).fill("no such plot")
    await page.getByRole("button", { name: "Show all recipes", exact: true }).click()
    await page.getByRole("button", { name: "Inspect Bar chart", exact: true }).click()
  }
  if (view === "geometry") {
    const measurements = await page.locator(".geometry-measures").innerText()
    await page.getByRole("spinbutton", { name: "Vertex C y" }).fill("3.2")
    assert.notEqual(await page.locator(".geometry-measures").innerText(), measurements)
    const point = await page.locator(".geometry-canvas ellipse").first().boundingBox()
    assert.ok(point)
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2)
    await page.mouse.down()
    await page.mouse.move(point.x + 40, point.y - 20, { steps: 8 })
    await page.mouse.up()
    await page.getByRole("button", { name: "Zoom geometry in" }).click()
    await page.getByRole("button", { name: "Fit construction", exact: true }).click()
    await page.getByRole("button", { name: "Functions & tangents", exact: true }).click()
    await page.getByRole("slider", { name: "Geometry a", exact: true }).focus()
    await page.keyboard.press("End")
    assert.ok((await page.locator(".geometry-measures").innerText()).includes("1.5x"))
    await page.getByRole("slider", { name: "Tangent point x" }).focus()
    await page.keyboard.press("End")
    await page.getByRole("button", { name: "Vector field", exact: true }).click()
    await page.getByRole("slider", { name: "Geometry damping" }).focus()
    await page.keyboard.press("End")
    assert.ok((await page.locator(".geometry-measures").innerText()).includes("0.80"))
    await page.getByRole("button", { name: "Functions & tangents", exact: true }).click()
  }
  if (view === "carousel") {
    await page.getByRole("button", { name: "Next frame", exact: true }).click()
    await page.getByRole("status").filter({ hasText: "Frame 2 of 6" }).waitFor()
    await page.getByRole("button", { name: "Go to frame 4", exact: true }).click()
    await page.getByRole("status").filter({ hasText: "Frame 4 of 6" }).waitFor()
    await page.getByRole("button", { name: "Inspect image", exact: true }).click()
    await page.getByRole("dialog").waitFor()
    await page.getByRole("button", { name: "Zoom image in", exact: true }).click()
    await page.waitForFunction(
      () => parseInt(document.querySelector(".evidence-dialog output")?.textContent, 10) > 100
    )
    await page.getByRole("button", { name: "Next image", exact: true }).click()
    await page.locator(".evidence-dialog header").getByText("Coins from Pompeii").waitFor()
    await page.keyboard.press("Escape")
    assert.equal(await page.getByRole("dialog").isVisible(), false)
    await page.getByRole("button", { name: "Next cards", exact: true }).click()
  }
  if (view === "rich-table") {
    await page.getByRole("searchbox", { name: "Search rich table" }).fill("S-001")
    await page.getByRole("combobox", { name: "Decision for S-001" }).selectOption("Needs review")
    await page.getByRole("button", { name: "Next frame for S-001", exact: true }).click()
    assert.ok(
      (
        await page.getByRole("img", { name: /Sample photograph for S-001/ }).getAttribute("alt")
      ).includes("frame 2")
    )
    await page.getByRole("button", { name: "Inspect S-001", exact: true }).click()
    await page.getByRole("textbox", { name: "Notes for S-001" }).fill("Inspected all three frames.")
    await page.getByRole("spinbutton", { name: "Volume for S-001" }).fill("321")
    await page.getByRole("textbox", { name: "Notes for S-001" }).focus()
    await page.getByRole("checkbox", { name: "Select S-001", exact: true }).check()
    await page.getByRole("button", { name: "Accept selected", exact: true }).click()
    const rows = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Export 1 selected", exact: true }).click(),
        "rich-records.json"
      )
    )
    assert.equal(rows[0].decision, "Accepted")
    assert.equal(rows[0].volume, 321)
    assert.equal(rows[0].notes, "Inspected all three frames.")
    await page.getByRole("button", { name: "Undo last change", exact: true }).click()
    assert.equal(
      await page.getByRole("combobox", { name: "Decision for S-001" }).inputValue(),
      "Needs review"
    )
    await page.getByRole("button", { name: "Clear selection", exact: true }).click()
    await page.getByRole("searchbox", { name: "Search rich table" }).fill("")
    await page.getByRole("button", { name: "Next table page", exact: true }).click()
    assert.ok((await page.locator(".table-pagination").innerText()).includes("Page 2"))
  }
  if (view === "chat") {
    await page
      .locator(".chat-empty")
      .getByRole("button", { name: "Summarize the records by region", exact: true })
      .click()
    await page.getByRole("button", { name: "Stop response", exact: true }).waitFor()
    await page
      .getByRole("button", { name: "Stop response", exact: true })
      .waitFor({ state: "detached" })
    assert.ok(
      (await page.locator(".chat-message.assistant").innerText()).includes("240 synthetic records")
    )
    assert.equal(await page.locator(".chat-markdown tbody tr").count(), 3)
    await page
      .getByRole("textbox", { name: "Chat message", exact: true })
      .fill("Explain the Bayesian update")
    await page.getByRole("button", { name: "Send message", exact: true }).click()
    await page.getByRole("button", { name: "Stop response", exact: true }).waitFor()
    await page.getByRole("button", { name: "Stop response", exact: true }).click()
    await page.getByRole("button", { name: "Send message", exact: true }).waitFor()
    await page.getByRole("button", { name: "Regenerate", exact: true }).last().click()
    await page
      .getByRole("button", { name: "Stop response", exact: true })
      .waitFor({ state: "detached" })
    assert.ok(
      (await page.locator(".chat-message.assistant").last().innerText()).includes("Beta(16, 8)")
    )
    await page.getByRole("button", { name: "Edit message", exact: true }).last().click()
    await page
      .getByRole("textbox", { name: "Edit chat message", exact: true })
      .fill("Which chart should I use?")
    await page.getByRole("button", { name: "Save & rerun", exact: true }).click()
    await page
      .getByRole("button", { name: "Stop response", exact: true })
      .waitFor({ state: "detached" })
    const transcript = await saveDownload(
      page,
      () => page.getByRole("button", { name: "Transcript", exact: true }).click(),
      "chat.md"
    )
    assert.ok(transcript.includes("Compare groups"))
  }
  if (view === "myst") {
    assert.equal(await page.locator(".myst-unresolved").count(), 0)
    assert.equal(await page.locator(".myst-equation > a").innerText(), "(1)")
    await page.getByRole("tab", { name: "Python", exact: true }).click()
    assert.ok(
      (await page.getByRole("tabpanel", { name: "Python" }).innerText()).includes("alpha, beta")
    )
    assert.ok((await page.locator(".myst-code .hljs-number").count()) > 0)
    await page.getByRole("button", { name: "Copy code", exact: true }).click()
    await page.getByRole("button", { name: "Copied", exact: true }).waitFor()
    await page.locator(".myst-details summary").click()
    assert.ok((await page.locator(".myst-details").getAttribute("open")) !== null)
    await page.getByRole("button", { name: "Inspect AST", exact: true }).click()
    assert.ok((await page.locator(".myst-ast").innerText()).includes("mystDirective"))
    const source = await saveDownload(
      page,
      () => page.getByRole("button", { name: "MyST", exact: true }).click(),
      "explanation.md"
    )
    assert.ok(source.includes("prf:theorem"))
    await page
      .getByRole("textbox", { name: "MyST source" })
      .fill("# Revised explanation\n\n:::{note} A local note\nUpdated **content**.\n:::")
    await page.getByRole("button", { name: "Render document", exact: true }).click()
    await page.getByRole("heading", { name: "Revised explanation", exact: true }).waitFor()
    assert.ok(
      (await page.locator(".myst-document .myst-admonition").innerText()).includes(
        "Updated content"
      )
    )
    await page.getByRole("button", { name: "Reset", exact: true }).click()
  }
  if (view === "icons") {
    assert.equal(await page.locator(".icon-card").count(), 20)
    await page.getByRole("textbox", { name: "Search icons", exact: true }).fill("SageMaker")
    assert.equal(await page.locator(".icon-card").count(), 1)
    await page.locator(".icon-card").click()
    assert.ok((await page.locator(".icon-inspector h2").innerText()).includes("SageMaker"))
    const svg = await saveDownload(
      page,
      () => page.getByRole("button", { name: "SVG", exact: true }).click(),
      "aws-sagemaker.svg"
    )
    assert.ok(svg.includes("<svg"))
    assert.ok(!svg.includes("<script"))
    await page.getByRole("button", { name: "Copy ID", exact: true }).click()
    await page.getByRole("button", { name: "ID copied", exact: true }).waitFor()
    await page
      .getByRole("textbox", { name: "Search icons", exact: true })
      .fill("unmatched-service-xyz")
    await page.getByText("No icons match this search.", { exact: true }).waitFor()
    await page.getByRole("button", { name: "Show all icons", exact: true }).click()
    assert.equal(await page.locator(".icon-card").count(), 73)
    await page
      .getByRole("combobox", { name: "Icon collection", exact: true })
      .selectOption("carbon")
    await page.getByRole("textbox", { name: "Search icons", exact: true }).fill("classification")
    await page.locator(".icon-card").click()
    assert.ok((await page.locator(".icon-inspector code").innerText()).startsWith("carbon:"))
    await page.getByRole("button", { name: "Copy SVG", exact: true }).click()
    await page.getByRole("button", { name: "SVG copied", exact: true }).waitFor()
    await page
      .getByRole("combobox", { name: "Cloud architecture example", exact: true })
      .selectOption("inference")
    assert.ok((await page.getByTestId("icon-cloud-canvas").innerText()).includes("API Gateway"))
    await page.getByRole("button", { name: "Zoom architecture icons in", exact: true }).click()
    await page.getByRole("button", { name: "Fit architecture icons", exact: true }).click()
  }
  if (view === "neural") {
    const epoch = () => page.getByTestId("neural-study").getAttribute("data-epoch")
    const waitEpoch = (value) =>
      page.waitForFunction(
        (n) => Number(document.querySelector('[data-testid="neural-study"]').dataset.epoch) >= n,
        value
      )
    assert.equal(await epoch(), "0")
    await page.getByRole("button", { name: "Step 5 epochs", exact: true }).click()
    await waitEpoch(5)
    await page
      .getByRole("button", { name: "Train network", exact: true })
      .waitFor({ state: "visible" })
    const exported = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Export study", exact: true }).click(),
        "neural-study.json"
      )
    )
    assert.equal(exported.epoch, 5)
    assert.equal(exported.layers.length, 3)
    assert.equal(exported.history.length, 5)
    assert.ok(
      exported.history.every((row) => Number.isFinite(row.loss) && Number.isFinite(row.val_loss))
    )
    await page.getByRole("button", { name: "Train network", exact: true }).click()
    await waitEpoch(10)
    await page.getByRole("button", { name: "Pause training", exact: true }).click()
    await page.getByRole("button", { name: "Train network", exact: true }).waitFor()
    await page.getByRole("button", { name: "Reset network", exact: true }).click()
    await page.waitForFunction(
      () => document.querySelector('[data-testid="neural-study"]')?.dataset.epoch === "0"
    )
    await page.getByLabel("Import neural study", { exact: true }).setInputFiles({
      name: "restored-study.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    })
    await page.getByRole("status").filter({ hasText: "Weights and history restored" }).waitFor()
    await waitEpoch(5)
    const again = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "Export study", exact: true }).click(),
        "neural-restored.json"
      )
    )
    assert.deepEqual(again.layers, exported.layers)
    await page.getByRole("tab", { name: "Diagnostics", exact: true }).click()
    await page.locator('[data-testid="nn-confusion"] svg').waitFor()
    await page.locator('[data-testid="nn-loss"] svg').waitFor()
    const epochTicks = await page
      .locator('[data-testid="nn-loss"] svg .role-axis-label text')
      .allTextContents()
    assert.ok(
      epochTicks.some((tick) => Number(tick) === 5),
      "Learning curve should end at completed epoch 5"
    )
    await page.locator('[data-testid="nn-gradients"] svg').waitFor()
    assert.equal(await page.locator(".nn-tfvis canvas").count(), 0)
    await page.screenshot({ path: resolve(out, "neural-diagnostics.png"), fullPage: true })
    await page.getByLabel("Decision threshold", { exact: true }).fill("0.8")
    assert.ok((await page.locator(".nn-diagnostics").innerText()).includes("threshold 0.80"))
    await page.getByRole("tab", { name: "Architectures", exact: true }).click()
    await page
      .locator(".nn-architecture-canvas .nn-layer-card > strong")
      .filter({ hasText: "Encoder A" })
      .waitFor()
    await page
      .getByRole("combobox", { name: "Architecture preset", exact: true })
      .selectOption("transformer")
    await page
      .locator(".nn-architecture-canvas .nn-layer-card > strong")
      .filter({ hasText: "Token vectors" })
      .waitFor()
    await page.screenshot({ path: resolve(out, "neural-architectures.png"), fullPage: true })
    await page.getByRole("tab", { name: "Convolutions", exact: true }).click()
    const before = await page.locator(".nn-convolution-calculation").innerText()
    await page
      .getByRole("combobox", { name: "Convolution kernel", exact: true })
      .selectOption("blur")
    assert.notEqual(await page.locator(".nn-convolution-calculation").innerText(), before)
    await page.getByRole("button", { name: "Image pixel 1, 1", exact: true }).click()
    assert.equal(
      await page
        .getByRole("button", { name: "Image pixel 1, 1", exact: true })
        .getAttribute("aria-pressed"),
      "true"
    )
    await page.screenshot({ path: resolve(out, "neural-convolution.png"), fullPage: true })
    await page.getByRole("tab", { name: "Attention", exact: true }).click()
    assert.ok((await page.getByTestId("attention-total").innerText()).includes("1.000000"))
    await page.getByRole("combobox", { name: "Attention head", exact: true }).selectOption("2")
    await page.getByRole("textbox", { name: "Attention text", exact: true }).fill("")
    await page.getByText("Enter a few words to compute attention.", { exact: true }).waitFor()
    await page
      .getByRole("textbox", { name: "Attention text", exact: true })
      .fill("small models learn")
    assert.equal(await page.locator(".nn-attention-scroll tbody tr").count(), 3)
    await page.screenshot({ path: resolve(out, "neural-attention.png"), fullPage: true })
    await page.getByRole("tab", { name: "Model viewers", exact: true }).click()
    assert.ok(
      (
        await page.getByRole("link", { name: "Open application", exact: true }).getAttribute("href")
      ).includes("netron.app")
    )
    await page
      .getByRole("combobox", { name: "Neural application", exact: true })
      .selectOption("spatial")
    assert.ok(
      (
        await page.getByRole("link", { name: "Open application", exact: true }).getAttribute("href")
      ).includes("bbycroft.net")
    )
    assert.equal(
      await page.locator("iframe").count(),
      0,
      "External apps should stay unloaded until requested"
    )
    await page.getByRole("tab", { name: "Learning playground", exact: true }).click()
    await page.getByRole("combobox", { name: "Hidden layers", exact: true }).selectOption("1")
    await page.waitForFunction(
      () => document.querySelector('[data-testid="neural-study"]')?.dataset.epoch === "0"
    )
    await page.getByRole("button", { name: "Hidden 1 neuron 2", exact: true }).click()
    assert.ok((await page.locator(".nn-neuron-inspector").innerText()).includes("neuron 2"))
    await page.getByLabel("Import neural study", { exact: true }).setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"format":"other"}'),
    })
    await page.getByRole("alert").filter({ hasText: "not a supported neural study" }).waitFor()
    await page.getByRole("button", { name: "Reset network", exact: true }).click()
    await page.getByRole("alert").waitFor({ state: "detached" })
  }
  if (view === "json") {
    const header = page.locator(".json-graph-panel .demo-panel-head p")
    assert.ok((await header.innerText()).includes("7 nodes"))
    await page.getByRole("button", { name: "Collapse branches", exact: true }).click()
    assert.ok((await header.innerText()).includes("5 collapsed"))
    await page.getByRole("button", { name: "Expand all", exact: true }).click()
    await page.getByRole("button", { name: "Zoom JSON in", exact: true }).click()
    await page.getByRole("button", { name: "Fit JSON graph", exact: true }).click()
    await page.getByRole("combobox", { name: "JSON layout direction" }).selectOption("DOWN")
    await page.getByRole("combobox", { name: "JSON layout direction" }).selectOption("RIGHT")
    await page.getByRole("combobox", { name: "JSON example" }).selectOption("records")
    await page.waitForFunction(() => {
      const space = document.querySelector(".jsoncrack-space")
      return space && getComputedStyle(space).opacity === "1"
    })
    await page.getByRole("combobox", { name: "JSON example" }).selectOption("model")
    await page.waitForTimeout(500)
    const node = page.locator('.json-canvas [data-key="alpha: 2"]').first()
    // The fixed notebook tools can cover a node near the top of the viewport.
    await node.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" })
    )
    const box = await node.boundingBox()
    assert.ok(box)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    assert.equal(await page.locator(".json-path").innerText(), "$.prior")
    assert.ok((await page.locator(".json-inspector pre").innerText()).includes('"alpha": 2'))
    await page.getByRole("button", { name: "Copy path", exact: true }).click()
    await page.getByRole("button", { name: "Copied", exact: true }).waitFor()
    const setSource = async (source) => {
      await page.locator(".json-source .cm-content").click()
      await page.keyboard.press("Meta+a")
      await page.keyboard.insertText(source)
    }
    await setSource("{ broken JSON")
    await page.getByRole("button", { name: "Render JSON", exact: true }).click()
    await page.getByRole("alert").filter({ hasText: "last valid document" }).waitFor()
    assert.ok((await header.innerText()).includes("7 nodes"))
    const document = {
      project: "A new document",
      rows: [
        { id: "one", score: 0.5 },
        { id: "two", score: 0.8 },
      ],
      enabled: true,
      note: null,
    }
    await setSource(JSON.stringify(document))
    await page.getByRole("button", { name: "Format", exact: true }).click()
    await page.getByRole("button", { name: "Render JSON", exact: true }).click()
    const output = JSON.parse(
      await saveDownload(
        page,
        () => page.getByRole("button", { name: "JSON", exact: true }).click(),
        "json-document.json"
      )
    )
    assert.deepEqual(output, document)
    assert.ok((await page.locator(".json-source .code-property").count()) > 0)
    await page.getByLabel("Open JSON file", { exact: true }).setInputFiles({
      name: "imported.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"imported":{"value":23},"tags":["local","example"]}'),
    })
    await page.getByRole("status").filter({ hasText: "Graph up to date" }).waitFor()
    await page.locator(".json-inspector pre").filter({ hasText: '"value": 23' }).waitFor()
    for (const direction of ["editorial", "console", "instrument"]) {
      await page.getByRole("combobox", { name: "Visual direction" }).selectOption(direction)
      assert.ok((await page.locator(".json-source .cm-content").innerText()).includes("imported"))
    }
    await page.getByRole("button", { name: "Collapse branches", exact: true }).click()
  }
  if (
    [
      "writing",
      "program",
      "spatial",
      "science",
      "sanddance",
      "recommend",
      "plots",
      "geometry",
      "carousel",
      "json",
      "neural",
      "icons",
    ].includes(view)
  ) {
    if (view === "writing") {
      const before = parseInt(
        await page.getByLabel("Diagram zoom", { exact: true }).innerText(),
        10
      )
      await page.getByRole("button", { name: "Zoom diagram in", exact: true }).click()
      await page.waitForTimeout(150)
      assert.ok(
        parseInt(await page.getByLabel("Diagram zoom", { exact: true }).innerText(), 10) > before
      )
      await page.locator(".mermaid-viewport").focus()
      await page.keyboard.press("+")
      await page.keyboard.press("ArrowRight")
      await page.getByRole("button", { name: "Fit diagram", exact: true }).click()
    }
    const [canvas] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: /Open canvas/ }).click(),
    ])
    const popupErrors = []
    canvas.on("pageerror", (error) => popupErrors.push(error.message))
    const selector = {
      writing: ".mermaid-host svg",
      program: '.program-canvas[data-ready="true"]',
      spatial: ".spatial-canvas canvas",
      science: '.science-surface[data-ready="true"]',
      sanddance: '.sanddance-canvas[data-ready="true"]',
      recommend: '.recommend-chart[data-ready="true"]',
      plots: '.catalog-plot[data-ready="true"]',
      geometry: '.geometry-canvas[data-ready="true"]',
      carousel: ".image-viewer img",
      json: ".jsoncrack-canvas foreignObject",
      neural: '.nn-network-canvas[data-ready="true"]',
      icons: ".icon-cloud-canvas svg",
    }[view]
    await canvas.locator(selector).first().waitFor({ timeout: 60000 })
    await canvas.waitForTimeout(500)
    assert.equal(await canvas.locator(".workbench-nav").count(), 0)
    const region = await canvas
      .locator(
        {
          writing: ".mermaid-viewport",
          program: ".program-canvas",
          spatial: ".spatial-canvas",
          science: ".science-surface",
          sanddance: ".sanddance-canvas",
          recommend: ".recommend-chart",
          plots: ".catalog-plot",
          geometry: ".geometry-canvas",
          carousel: ".image-viewer",
          json: ".json-canvas",
          neural: ".nn-network-canvas",
          icons: ".icon-cloud-canvas",
        }[view]
      )
      .boundingBox()
    assert.ok(
      region.width >= 1430 && region.height >= 990,
      `Canvas should fill the new tab: ${JSON.stringify(region)}`
    )
    if (view === "writing")
      assert.ok((await canvas.locator(".mermaid-host").innerText()).includes("Reader"))
    if (view === "program")
      assert.ok(
        (await canvas.locator(".react-flow__node").allTextContents()).join(" ").includes("22, 2")
      )
    assert.equal(popupErrors.length, 0, popupErrors.join("\n"))
    await canvas.screenshot({ path: resolve(out, `${view}-canvas-tab.png`), fullPage: true })
    await canvas.close()
  }
}

for (const view of selectedViews) {
  let page
  try {
    const session = await open(view)
    page = session.page
    await interact(page, view)
    assert.equal(session.errors.length, 0, session.errors.join("\n"))
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: resolve(out, `${view}-interaction.png`), fullPage: true })
    console.log(`PASS interactions: ${view}`)
  } catch (error) {
    findings.push(`${view}: ${error.message}`)
    if (page) await page.screenshot({ path: resolve(out, `${view}-failure.png`), fullPage: true })
    console.log(`FAIL interactions: ${view}: ${error.message}`)
  } finally {
    await page?.close()
  }
}

if (full)
  for (const width of [1440, 390])
    for (const direction of ["instrument", "editorial", "console"])
      for (const mode of ["light", "dark"])
        for (const view of selectedViews) {
          if (view === selectedViews[0]) {
            await browser.close()
            browser = await chromium.launch(launchOptions)
          }
          let page
          const label = `${view}-${direction}-${mode}-${width}`
          try {
            const session = await open(view, direction, mode, width)
            page = session.page
            const dimensions = await page.evaluate(() => ({
              client: document.documentElement.clientWidth,
              scroll: document.documentElement.scrollWidth,
            }))
            assert.ok(
              dimensions.scroll <= dimensions.client,
              `Page overflows horizontally: ${JSON.stringify(dimensions)}`
            )
            assert.equal(session.errors.length, 0, session.errors.join("\n"))
            await page.screenshot({ path: resolve(out, `${label}.png`), fullPage: true })
            console.log(`PASS visual: ${label}`)
          } catch (error) {
            findings.push(`${label}: ${error.message}`)
            console.log(`FAIL visual: ${label}: ${error.message}`)
          } finally {
            await page?.close()
          }
        }
await browser.close()
const reportName = selectedViews.length === views.length ? "results.json" : "targeted-results.json"
await writeFile(
  resolve(out, reportName),
  JSON.stringify({ full, views: selectedViews, findings }, null, 2)
)
console.log(findings.length ? findings.join("\n") : "All playground checks passed.")
process.exitCode = findings.length ? 1 : 0
