import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://127.0.0.1:5189"
const out = path.resolve("output/playwright/recommend-workspace")
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] })
const results = []
try {
  for (const d of ["instrument", "editorial", "console"])
    for (const m of ["light", "dark"])
      for (const [width, height] of [
        [1440, 900],
        [1280, 768],
        [390, 844],
      ]) {
        const p = await browser.newPage({ viewport: { width, height } })
        const errors = []
        p.on("pageerror", (e) => errors.push(e.message))
        await p.goto(
          `${base}/playground.html?view=recommend&d=${d}&m=${m}#cell-recommend-chart-recommendations`
        )
        const study = p.locator(".recommend-study:visible")
        await study.waitFor({ timeout: 45000 })
        await study.locator(".recommend-focus [data-ready=true]").waitFor({ timeout: 45000 })
        if (width > 1100)
          await p
            .locator('.notebook-sidebar-outline a[href="#cell-recommend-chart-recommendations"]')
            .click()
        assert.equal(await study.locator("details").getAttribute("open"), null)
        await study
          .getByRole("combobox", { name: "x encoding", exact: true })
          .selectOption("volume")
        await study.getByRole("combobox", { name: "y encoding", exact: true }).selectOption("score")
        await p.waitForTimeout(250)
        assert.equal(
          await study.getByRole("combobox", { name: "x encoding", exact: true }).inputValue(),
          "volume"
        )
        assert.equal(
          await study.getByRole("combobox", { name: "y encoding", exact: true }).inputValue(),
          "score"
        )
        assert.ok(
          (await study.locator(".recommend-focus h2").innerText()).includes("Score × Volume")
        )
        const choice = study.getByRole("button", { name: /Use related view 1:/ })
        assert.equal(await choice.count(), 1)
        await choice.click()
        await p.waitForTimeout(250)
        assert.equal(
          await study.getByRole("button", { name: "Back", exact: true }).isDisabled(),
          false
        )
        await study.getByRole("button", { name: "Back", exact: true }).click()
        await p.waitForTimeout(200)
        if (width > 1100) {
          await p
            .locator('.notebook-sidebar-outline a[href="#cell-recommend-chart-recommendations"]')
            .click()
          const boxes = await study.evaluate((n) =>
            [...n.querySelectorAll(".recommend-shelves,.recommend-focus,.related-section")].map(
              (x) => ({
                top: x.getBoundingClientRect().top,
                bottom: x.getBoundingClientRect().bottom,
              })
            )
          )
          assert.ok(
            boxes.every((b) => b.top >= 0 && b.bottom <= height),
            "Controls, main chart and related views must share the screen"
          )
        }
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        assert.deepEqual(errors, [])
        results.push({ d, m, width, height, pass: true })
        if (d === "instrument" && m === "light")
          await p.screenshot({ path: path.join(out, `${width}.png`) })
        await p.close()
      }
} finally {
  await browser.close()
  await writeFile(path.join(out, "results.json"), JSON.stringify({ results }, null, 2))
}
console.log(JSON.stringify({ checked: results.length, out }, null, 2))
