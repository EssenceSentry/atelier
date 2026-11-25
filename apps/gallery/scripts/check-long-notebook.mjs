import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://127.0.0.1:5190"
const out = resolve("output/playwright/long-notebook")
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
})
const findings = []
async function jump(page, id) {
  await page
    .getByRole("combobox", { name: "Jump to notebook section" })
    .selectOption(`cell-notebook-${id}`)
  const cell = page.locator(`#cell-notebook-${id}`)
  await cell.locator('.notebook-family-content[data-study-mounted="true"]').waitFor()
  await cell
    .locator(".notebook-family-content > .demo-stack, .notebook-family-content > .demo-two-col")
    .first()
    .waitFor({ timeout: 60000 })
  if (id === "neural")
    await cell.locator('[data-testid="neural-study"]').waitFor({ timeout: 60000 })
  if (id === "writing") await cell.locator(".mermaid-host svg").waitFor({ timeout: 30000 })
  if (id === "query") await cell.locator(".connection-status.ready").waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
  const top = await cell.evaluate((el) => el.getBoundingClientRect().top)
  const bottom = await page
    .locator(".notebook-toolbar")
    .evaluate((el) => el.getBoundingClientRect().bottom)
  assert.ok(
    top >= bottom - 2 && top <= bottom + 25,
    `Jump ${id} should remain aligned: section ${top}, toolbar ${bottom}`
  )
  assert.equal(
    await page.getByRole("combobox", { name: "Jump to notebook section" }).inputValue(),
    `cell-notebook-${id}`
  )
  return cell
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${base}/playground.html?view=notebook&nav=sidebar`)
  await page.getByTestId("long-notebook").waitFor({ timeout: 60000 })
  await page.waitForFunction(
    () => document.querySelectorAll(".notebook-sidebar-outline a").length === 20
  )
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > 15000))
  await page.getByRole("link", { name: "Technical icons", exact: true }).click()
  await page.locator("#cell-notebook-icons .icon-card").first().waitFor()
  await page.waitForTimeout(600)
  assert.ok(
    (await page.locator('[data-study-mounted="true"]').count()) <= 4,
    "Distant jumps should skip intermediate renderers"
  )
  await page.screenshot({ path: resolve(out, "sidebar-last-section.png"), fullPage: false })
  const order = [
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
  for (const id of order) {
    const cell = await jump(page, id)
    if (id === "inputs")
      await cell.getByRole("textbox", { name: "Configuration name" }).fill("Long notebook draft")
    assert.equal(await cell.getByRole("alert").count(), 0)
    console.log(`PASS live section ${id}`)
  }
  const input = await jump(page, "inputs")
  assert.equal(
    await input.getByRole("textbox", { name: "Configuration name" }).inputValue(),
    "Long notebook draft"
  )
  assert.deepEqual(errors, [])
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  console.log(
    `PASS all 20 retained; height ${await page.evaluate(() => document.documentElement.scrollHeight)}px`
  )
  await page.close()

  for (const width of [1440, 390])
    for (const direction of ["instrument", "editorial", "console"])
      for (const mode of ["light", "dark"]) {
        const label = `${direction}-${mode}-${width}`
        const shot = await browser.newPage({
          viewport: { width, height: width < 700 ? 844 : 1000 },
          hasTouch: width < 700,
          isMobile: width < 700,
        })
        const errors = []
        shot.on("pageerror", (error) => errors.push(error.message))
        try {
          await shot.goto(
            `${base}/playground.html?view=notebook&nav=sidebar&d=${direction}&m=${mode}`
          )
          await shot.getByTestId("long-notebook").waitFor()
          await shot.waitForFunction(
            () => document.querySelectorAll(".notebook-sidebar-outline a").length === 20
          )
          await shot.evaluate(() => document.fonts.ready)
          await shot.screenshot({ path: resolve(out, `${label}-top.png`), fullPage: false })
          if (width === 390) {
            await shot.getByRole("button", { name: "Toggle page navigation" }).click()
            await shot.getByRole("link", { name: "Technical icons", exact: true }).click()
          } else await shot.getByRole("link", { name: "Technical icons", exact: true }).click()
          await shot.locator("#cell-notebook-icons .icon-card").first().waitFor()
          await shot.waitForTimeout(650)
          assert.ok(await shot.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          const cellTop = await shot
            .locator("#cell-notebook-icons")
            .evaluate((el) => el.getBoundingClientRect().top)
          const barBottom = await shot
            .locator(".notebook-toolbar")
            .evaluate((el) => el.getBoundingClientRect().bottom)
          assert.ok(cellTop >= barBottom - 2 && cellTop < barBottom + 30)
          await shot.screenshot({
            path: resolve(out, `${label}-last-section.png`),
            fullPage: false,
          })
          assert.deepEqual(errors, [])
          console.log(`PASS ${label}`)
        } catch (error) {
          findings.push(`${label}: ${error.stack}`)
          console.log(`FAIL ${label}: ${error.message}`)
        } finally {
          await shot.close()
        }
      }
} catch (error) {
  findings.push(error.stack)
  console.log(error.stack)
} finally {
  await browser.close()
}
await writeFile(resolve(out, "results.json"), JSON.stringify({ findings }, null, 2))
console.log(findings.length ? "Long notebook has findings." : "All long-notebook checks passed.")
process.exitCode = findings.length ? 1 : 0
