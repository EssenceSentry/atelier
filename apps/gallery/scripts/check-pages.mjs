import assert from "node:assert/strict"
import { chromium } from "playwright"

const home = new URL(process.argv[2] ?? "http://127.0.0.1:4173/atelier/")
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))

  await page.goto(home.href)
  const galleryTitle = page.getByRole("heading", { name: "Interface gallery" })
  await galleryTitle.waitFor()
  assert.equal(await page.locator("html").getAttribute("data-direction"), "instrument")
  assert.match(
    await galleryTitle.evaluate((el) => getComputedStyle(el).fontFamily),
    /Instrument Sans/
  )
  await page.getByRole("link", { name: /Research report/ }).click()
  assert.equal(await page.getByRole("combobox", { name: "Screen" }).inputValue(), "report")

  await page.getByRole("link", { name: "Gallery", exact: true }).click()
  await page.getByRole("link", { name: "Open notebook" }).click()
  await page.getByTestId("long-notebook").waitFor()
  assert.equal(
    await page.getByRole("combobox", { name: "Visual direction" }).inputValue(),
    "instrument"
  )
  await page
    .getByRole("combobox", { name: "Jump to notebook section" })
    .selectOption("cell-notebook-query")
  await page.locator("#cell-notebook-query .connection-status.ready").waitFor({ timeout: 60000 })

  await page.goto(new URL("?s=examples", home).href)
  assert.equal(await page.getByRole("combobox", { name: "Screen" }).inputValue(), "examples")
  assert.deepEqual(errors, [])
  console.log("Gallery, screen preview, notebook SQL worker and existing example link passed.")
} finally {
  await browser.close()
}
