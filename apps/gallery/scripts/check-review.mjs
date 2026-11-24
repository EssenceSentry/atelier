// Exercise the review template's keyboard and responsive interactions in the gallery or a generated app.
import assert from "node:assert/strict"
import { chromium } from "playwright"

const url = process.argv[2] ?? "http://localhost:5188/?s=review&chrome=0"
const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  })
  await page.goto(url)
  const trigger = page.getByRole("button", { name: "Queue", exact: true })
  const sheet = page.getByRole("dialog", { name: "Queue", exact: true })
  const heading = page.getByRole("heading", { level: 1 })
  const first = await heading.innerText()
  await trigger.click()
  await sheet.waitFor({ timeout: 3000 })
  const close = sheet.getByRole("button", { name: "Close queue" })
  const search = sheet.getByRole("textbox", { name: "Search channels" })
  await close.focus()
  await page.keyboard.press("y")
  await page.keyboard.press("Tab")
  assert.equal(await search.evaluate((e) => e === document.activeElement), true)
  await page.keyboard.press("Escape")
  await sheet.waitFor({ state: "hidden" })
  assert.equal(await trigger.evaluate((e) => e === document.activeElement), true)
  assert.equal(await page.getByRole("button", { name: /Choose an answer/ }).isDisabled(), true)
  await trigger.click()
  const second = sheet.getByRole("listitem").nth(1).getByRole("button")
  await second.focus()
  await page.keyboard.press("Enter")
  await sheet.waitFor({ state: "hidden" })
  assert.notEqual(await heading.innerText(), first)
  const secondHeading = await heading.innerText()

  await trigger.click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await sheet.waitFor({ state: "hidden" })
  assert.equal(await page.locator("dialog:modal").count(), 0)
  const note = page.getByRole("textbox", { name: "Reviewer note" })
  assert.equal(await note.isVisible(), false)
  await page.getByText("Add a note", { exact: true }).filter({ visible: true }).click()
  await note.fill("Compare the interview evidence")
  await page.keyboard.press("Tab")
  const rows = page.locator("aside").first().getByRole("listitem")
  await rows.first().getByRole("button").click()
  assert.equal(await note.isVisible(), false)
  await rows.nth(1).getByRole("button").click()
  assert.equal(await heading.innerText(), secondHeading)
  await page.getByText("Reviewer note", { exact: true }).filter({ visible: true }).click()
  assert.equal(await note.inputValue(), "Compare the interview evidence")
  console.log("Review queue, shortcuts, focus, breakpoint change and item notes passed")
} finally {
  await browser.close()
}
