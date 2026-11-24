// Exercise the linked lab charts and the actual CSV, in the gallery or a generated app.
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { chromium } from "playwright"

const url = process.argv[2] ?? "http://localhost:5188/?s=lab&chrome=0"
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url)
  const marks = page
    .locator("main figure")
    .first()
    .locator('g[aria-label="dot"]')
    .first()
    .locator("circle")
  await marks.first().waitFor()
  // The sample IDs are their original row indices; Plot draws them in row order.
  const highlighted = () =>
    marks.evaluateAll((dots) =>
      dots.flatMap((dot, id) => (dot.getAttribute("fill-opacity") === "0.9" ? [id] : []))
    )
  const exportRows = async () => {
    const downloaded = page.waitForEvent("download")
    await page.getByRole("button", { name: /Export/ }).click()
    const file = await downloaded
    assert.equal(file.suggestedFilename(), "selection.csv")
    const [header, ...lines] = (await readFile(await file.path(), "utf8")).trim().split("\n")
    assert.equal(header, "id,label,score")
    return lines.map((line) => {
      const [id, label, score] = line.split(",")
      return { id: Number(id), label, score: Number(score) }
    })
  }

  const baseline = await exportRows()
  const ids = baseline.map((row) => row.id)
  assert.ok(ids.length > 0 && ids.length < (await marks.count()))
  assert.deepEqual(await highlighted(), ids)
  for (const name of ["PCA", "Polarity", "UMAP"]) {
    const previousX = await marks.first().getAttribute("cx")
    await page.getByRole("button", { name, exact: true }).click()
    await page.waitForFunction(
      ([mark, x]) => document.querySelector(mark)?.getAttribute("cx") !== x,
      ['main figure g[aria-label="dot"] circle', previousX]
    )
    assert.deepEqual(await highlighted(), ids, `${name} changed the highlighted selection`)
    const enclosed = await marks.evaluateAll((dots) => {
      const outline = dots[0].closest("svg").querySelector('path[aria-label="Selection outline"]')
      return dots.flatMap((dot, id) =>
        outline.isPointInFill(new DOMPoint(dot.cx.baseVal.value, dot.cy.baseVal.value)) ? [id] : []
      )
    })
    assert.deepEqual(enclosed, ids, `${name} outline disagrees with the selected items`)
    assert.deepEqual(await exportRows(), baseline)
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 })
    if (width === 390)
      await page.getByText("Controls", { exact: true }).filter({ visible: true }).click()
    const temperature = page.getByRole("slider", { name: "Temperature", exact: true })
    const neighbours = page.getByRole("slider", { name: "Neighbours", exact: true })
    const colour = page.getByRole("combobox", { name: "Colour by" })
    await colour.click()
    await page.getByRole("option", { name: "Probe score" }).click()
    await temperature.focus()
    await page.keyboard.press("ArrowRight")
    await page
      .getByText(/Baseline .* at T = 0.70/)
      .filter({ visible: true })
      .waitFor()
    const changed = await exportRows()
    assert.deepEqual(
      changed.map((row) => row.id),
      ids
    )
    assert.ok(changed.some((row, i) => row.score !== baseline[i].score))
    assert.deepEqual(await highlighted(), ids)
    await neighbours.focus()
    const previous = Number(await neighbours.inputValue())
    await page.keyboard.press("ArrowLeft")
    assert.equal(
      await page.getByRole("list").filter({ visible: true }).getByRole("listitem").count(),
      previous - 1
    )
    await page.getByRole("button", { name: "Reset temperature" }).click()
    assert.deepEqual(await exportRows(), baseline)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  }
  console.log(
    "Lab selection, projections, scores, CSV and keyboard controls passed on desktop and phone"
  )
} finally {
  await browser.close()
}
