// Run against the gallery or the packed channel-rows recipe.
import assert from "node:assert/strict"
import { chromium } from "playwright"

const url = process.argv[2] ?? "http://localhost:5188/?s=channels&chrome=0"
const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  })
  await page.goto(url)
  const row = page.getByRole("article", { name: "Orbital Notes" })
  await row.waitFor()
  assert.equal(await row.locator("img").count(), 3)
  assert.equal(await row.getByText("Cited 2/3").count(), 1)
  assert.equal(await row.getByText("Science · Yes").count(), 1)
  assert.equal(await row.getByText("Reviewed", { exact: true }).count(), 1)
  assert.equal(
    await page
      .getByRole("article", { name: "Archive feed" })
      .getByText("No videos supplied.")
      .count(),
    1
  )
  const titlesOnly = page.getByRole("article", { name: "The Night Log" })
  assert.equal(await titlesOnly.locator("img").count(), 0)
  assert.equal(await titlesOnly.getByText("Only titles were supplied for review.").count(), 1)
  assert.equal(
    await row
      .getByRole("link", { name: "Meet shuttle pilot Eileen Collins" })
      .getAttribute("target"),
    "_blank"
  )
  await page.setViewportSize({ width: 390, height: 844 })
  const toggle = row.locator("summary")
  await toggle.focus()
  await page.keyboard.press("Enter")
  assert.ok(await row.getByText("Reviewer votes").isVisible())
  await page.keyboard.press("Enter")
  assert.equal(await row.getByText("Reviewer votes").isVisible(), false)
  const strip = row.getByRole("list", { name: "Videos for Orbital Notes" })
  const later = row.getByRole("button", { name: "Later videos" })
  await later.click()
  assert.ok(await strip.evaluate((el) => el.scrollLeft > 0))
  await row.getByRole("button", { name: "Earlier videos" }).click()
  await page.waitForFunction(
    () => document.querySelector('[data-channel="orbital-notes"] ul').scrollLeft <= 1
  )
  const missing = await row.getByText("No thumbnail", { exact: true }).count()
  await row
    .locator("img")
    .first()
    .evaluate((image) => {
      image.src = "data:image/png;base64,broken"
    })
  await row.getByText("No thumbnail", { exact: true }).nth(missing).waitFor()
  assert.equal(await row.getByText("No thumbnail", { exact: true }).count(), missing + 1)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  console.log(
    "Channel identity, independent verdicts, details, title-only evidence, thumbnail fallback and scrolling passed"
  )
} finally {
  await browser.close()
}
