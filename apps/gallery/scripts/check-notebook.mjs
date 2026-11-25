import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://127.0.0.1:5190"
const out = resolve("output/playwright/notebook")
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
})
const findings = [],
  captures = []
const views = [
  "explore",
  "plots",
  "sanddance",
  "recommend",
  "program",
  "neural",
  "geometry",
  "science",
  "spatial",
  "query",
  "inputs",
  "grid",
  "rich-table",
  "json",
  "writing",
  "myst",
  "media",
  "carousel",
  "chat",
  "icons",
]
async function ready(page, view) {
  await page
    .locator(`[data-notebook-page="${view}"]:not([hidden]) .demo-panel`)
    .first()
    .waitFor({ timeout: 60000 })
  await page.getByRole("combobox", { name: "Jump to notebook section" }).waitFor()
  await page.waitForFunction(
    () => !document.querySelector('[aria-label="Jump to notebook section"]').disabled
  )
  await page.waitForTimeout(350)
}
async function check(name, action) {
  try {
    await action()
    console.log(`PASS ${name}`)
  } catch (error) {
    findings.push(`${name}: ${error.stack}`)
    console.log(`FAIL ${name}: ${error.message}`)
  }
}
await check("page state, history and section links", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  try {
    await page.goto(`${base}/playground.html?view=query&nav=sidebar`)
    await ready(page, "query")
    await page.locator(".connection-status.ready").waitFor({ timeout: 60000 })
    await page.locator(".sql-editor .cm-content").click()
    await page.keyboard.press("Meta+a")
    await page.keyboard.insertText("SELECT 42 AS retained;")
    await page.getByRole("button", { name: "Run query", exact: true }).click()
    await page.getByRole("cell", { name: "42", exact: true }).waitFor()
    const section = page.getByRole("combobox", { name: "Jump to notebook section" })
    const target = await section
      .locator("option")
      .filter({ hasText: "Query results" })
      .getAttribute("value")
    await section.selectOption(target)
    await page.waitForTimeout(650)
    const toolbarBottom = await page
      .locator(".notebook-toolbar")
      .evaluate((el) => el.getBoundingClientRect().bottom)
    const headingTop = await page
      .locator(`#${target}`)
      .evaluate((el) => el.getBoundingClientRect().top)
    assert.ok(headingTop >= toolbarBottom - 1, "Section heading must clear sticky navigation")
    const linked = page.url()
    const queryY = await page.evaluate(() => scrollY)
    await page.getByRole("button", { name: "Forms & inputs", exact: true }).click()
    await ready(page, "inputs")
    await page
      .getByRole("textbox", { name: "Configuration name", exact: true })
      .fill("Kept across notebook pages")
    await page.getByRole("button", { name: "Use top navigation", exact: true }).click()
    await page.getByRole("combobox", { name: "Notebook page", exact: true }).selectOption("query")
    await ready(page, "query")
    assert.ok(
      (await page.locator('[data-notebook-page="query"] .cm-content').innerText()).includes(
        "SELECT 42 AS retained;"
      )
    )
    await page.getByRole("cell", { name: "42", exact: true }).waitFor()
    assert.ok(
      Math.abs((await page.evaluate(() => scrollY)) - queryY) < 80,
      "Returning to a page restores its scroll position"
    )
    await page.goBack()
    await ready(page, "inputs")
    assert.equal(
      await page.getByRole("textbox", { name: "Configuration name", exact: true }).inputValue(),
      "Kept across notebook pages"
    )
    await page.goForward()
    await ready(page, "query")
    await page.getByRole("cell", { name: "42", exact: true }).waitFor()
    const deep = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    await deep.goto(linked)
    await ready(deep, "query")
    await deep.waitForTimeout(400)
    assert.ok(
      await deep.locator(`#${target}`).evaluate((el) => el.getBoundingClientRect().top >= 145)
    )
    await deep.close()
    assert.deepEqual(errors, [])
    await page.screenshot({ path: resolve(out, "state-restored.png"), fullPage: true })
  } finally {
    await page.close()
  }
})
await check("phone page drawer and navigation preference", async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  try {
    await page.goto(`${base}/playground.html?view=explore&nav=sidebar`)
    await ready(page, "explore")
    await page.getByRole("button", { name: "Toggle page navigation", exact: true }).click()
    await page.getByRole("button", { name: "Data & SQL", exact: true }).click()
    await ready(page, "query")
    assert.equal(await page.locator(".workbench-nav").getAttribute("aria-hidden"), "true")
    await page.getByRole("button", { name: "Toggle page navigation", exact: true }).click()
    await page.keyboard.press("Escape")
    assert.equal(
      await page
        .getByRole("button", { name: "Toggle page navigation" })
        .getAttribute("aria-expanded"),
      "false"
    )
    await page.getByRole("button", { name: "Use top navigation" }).click()
    await page.getByRole("combobox", { name: "Notebook page" }).selectOption("icons")
    await ready(page, "icons")
    await page.goto(`${base}/playground.html?view=inputs`)
    await ready(page, "inputs")
    assert.equal(await page.locator(".notebook-workbench").getAttribute("data-navigation"), "top")
    await page.screenshot({ path: resolve(out, "phone-top-menu.png"), fullPage: false })
  } finally {
    await page.close()
  }
})

for (const width of [1440, 390]) {
  for (const view of views) {
    await check(`${view} full-width ${width}`, async () => {
      const page = await browser.newPage({
        viewport: { width, height: width < 700 ? 844 : 1000 },
        hasTouch: width < 700,
        isMobile: width < 700,
      })
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      try {
        const nav = width === 390 ? "top" : "sidebar"
        await page.goto(`${base}/playground.html?view=${view}&nav=${nav}&d=instrument&m=light`)
        await ready(page, view)
        await page.evaluate(() => document.fonts.ready)
        const dimensions = await page.locator(`[data-notebook-page="${view}"]`).evaluate((root) => {
          const width = root.getBoundingClientRect().width
          const groups =
            ".geometry-workspace, .sanddance-workspace, .recommend-workspace, .json-workspace, .myst-workspace, .science-layout, .writing-right, .demo-stack:has(> .program-controls), .demo-stack:has(> .spatial-workspace), #nn-panel-playground, .demo-two-col:has(> .input-preview)"
          return {
            width,
            cards: Array.from(root.querySelectorAll(`.demo-panel, ${groups}`))
              .filter(
                (el) =>
                  el.getClientRects().length &&
                  !el.parentElement.closest(".demo-panel") &&
                  (el.matches(groups) || !el.closest(groups))
              )
              .map((el) => ({
                title: el.querySelector("h2")?.textContent,
                width: el.getBoundingClientRect().width,
              })),
          }
        })
        assert.ok(dimensions.cards.length > 0)
        for (const card of dimensions.cards)
          assert.ok(
            card.width >= dimensions.width - 4,
            `${card.title}: ${card.width}px card should fill ${dimensions.width}px page`
          )
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          "No document overflow"
        )
        assert.deepEqual(errors, [])
        const name = `${view}-${width}.png`
        await page.screenshot({ path: resolve(out, name), fullPage: true })
        captures.push(name)
      } finally {
        await page.close()
      }
    })
  }
}
await browser.close()
await writeFile(
  resolve(out, "results.json"),
  JSON.stringify({ views, findings, captures }, null, 2)
)
console.log(findings.length ? findings.join("\n") : "All notebook workflow checks passed.")
process.exitCode = findings.length ? 1 : 0
