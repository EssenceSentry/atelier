import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { pack } from "./pack.mjs"
import { controlFindings, workspaceFindings } from "./ui-checks.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dir = path.resolve(process.argv[2] ?? "/private/tmp/atelier-workspace-check")
await mkdir(dir, { recursive: true })
for (const id of ["linked-workspace", "recommend", "complex-review", "architecture-explorer"])
  await pack(path.join(root, `recipes/${id}/artifact.json`), path.join(dir, `${id}.html`))
await writeFile(
  path.join(dir, "artifact.json"),
  JSON.stringify({
    title: "Native panel fit",
    release: "0.1.0",
    theme: "instrument",
    profile: "browser",
    families: ["plotly", "geometry", "json"],
    source: "main.js",
  })
)
await writeFile(
  path.join(dir, "main.js"),
  `const book=Atelier.notebook({title:"Native fit fixture"});const cell=book.cell({id:"native",title:"Native canvases",controls:true});const views=Atelier.workspace(cell,{main:"Surface",side:"JSON graph",bottom:"Geometry"});
const plot=Atelier.mount("plotly",views.main,{data:[{type:"surface",x:[0,1],y:[0,1],z:[[0,1],[1,0]]}]});
const geometry=Atelier.mount("geometry",views.bottom,{setup(board,t){board.create("point",[1,1],{name:"A",fillColor:t.series[0],strokeColor:t.ink})}});
Atelier.mount("json",views.side,{data:{id:"test",children:[{name:"A"},{name:"B"}]}});window.nativeFixture={plot,geometry};`
)
await pack(path.join(dir, "artifact.json"), path.join(dir, "native.html"))
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] })
const results = []
try {
  for (const id of [
    "linked-workspace",
    "recommend",
    "complex-review",
    "architecture-explorer",
    "native",
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    })
    const errors = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(`file://${dir}/${id}.html`)
    await page.waitForFunction(
      () => document.documentElement.dataset.artifactReady === "true",
      null,
      { timeout: 45000 }
    )
    await page.evaluate(() => Atelier.settled())
    if (id === "linked-workspace") {
      await page
        .locator("#explore")
        .getByRole("combobox", { name: "Group", exact: true })
        .selectOption("B")
      await page.evaluate(() => Atelier.settled())
      assert.equal(
        await page.evaluate(
          () => Atelier.inspect().find((x) => x.name === "table").handle.api.rows.length
        ),
        6
      )
      await page
        .locator("#explore tbody")
        .getByRole("button", { name: "Inspect", exact: true })
        .first()
        .click()
      await page.evaluate(() => Atelier.settled())
      assert.ok((await page.locator('#explore [data-place="side"]').innerText()).includes("r2"))
      await page
        .getByRole("textbox", { name: "Local review note", exact: true })
        .fill("Retain this draft")
      await page
        .getByRole("combobox", { name: "Selected service", exact: true })
        .selectOption("model")
      await page.evaluate(() => Atelier.settled())
      assert.ok(
        (await page.locator('#architecture [data-place="side"]').innerText()).includes("Classifier")
      )
      results.push({
        id,
        interaction: "linked filters, selection and service inspector",
        pass: true,
      })
    }
    if (id === "recommend") {
      await page.getByRole("combobox", { name: "X axis", exact: true }).selectOption("volume")
      await page.getByRole("combobox", { name: "Y axis", exact: true }).selectOption("score")
      await page.evaluate(() => Atelier.settled())
      const spec = await page.evaluate(
        () =>
          Atelier.inspect()
            .find((x) => x.name === "vega" && x.handle.host.closest('[data-place="main"]'))
            .handle.api.snapshot().spec
      )
      assert.equal(spec.encoding.x.field, "volume")
      assert.equal(spec.encoding.y.field, "score")
      assert.ok(await page.getByRole("button", { name: /option/ }).count())
      assert.equal(await page.locator('button[aria-pressed="true"]').count(), 0)
      const alternative = page.getByRole("button", { name: /option 2/ })
      assert.equal(await alternative.count(), 1)
      await alternative.click()
      assert.equal(await page.locator('button[aria-pressed="true"]').count(), 1)
      await page.evaluate(() => Atelier.settled())
      const promoted = await page.evaluate(
        () =>
          Atelier.inspect()
            .find((item) => item.name === "vega" && item.handle.host.closest('[data-place="main"]'))
            .handle.api.snapshot().spec
      )
      assert.equal(
        await page.getByRole("combobox", { name: "X axis", exact: true }).inputValue(),
        promoted.encoding.x.field
      )
      assert.equal(
        await page.getByRole("combobox", { name: "Y axis", exact: true }).inputValue(),
        promoted.encoding.y.field
      )
      await page.evaluate(async () => {
        const option = document.querySelector(
          '[data-at-mounted="recommend"] button[aria-label*="option 1"]'
        )
        option.click()
        for (const [label, value] of [
          ["X axis", "score"],
          ["Y axis", "volume"],
        ]) {
          const input = document.querySelector(`select[aria-label="${label}"]`)
          input.value = value
          input.dispatchEvent(new Event("change", { bubbles: true }))
        }
        await Atelier.settled()
      })
      const latest = await page.evaluate(
        () =>
          Atelier.inspect()
            .find((item) => item.name === "vega" && item.handle.host.closest('[data-place="main"]'))
            .handle.api.snapshot().spec
      )
      assert.equal(latest.encoding.x.field, "score")
      assert.equal(latest.encoding.y.field, "volume")
      const event = page.waitForEvent("popup")
      await page.getByRole("button", { name: "Open canvas in new tab", exact: true }).click()
      const popup = await event
      await popup.waitForFunction(() => document.documentElement.dataset.artifactReady === "true")
      const canvas = await popup.locator('[data-at-mounted="vega"]').evaluate((host) => ({
        height: host.querySelector("svg").getBoundingClientRect().height,
        available: innerHeight,
      }))
      assert.ok(canvas.height >= 0.9 * canvas.available)
      assert.equal(await popup.locator(".at-nav").count(), 0)
      await popup.close()
      results.push({
        id,
        interaction: "dropdowns assign real channels and current recommendation is selected",
        pass: true,
      })
    }
    if (id === "complex-review") {
      await page
        .locator("#review tbody")
        .getByRole("button", { name: "Inspect", exact: true })
        .first()
        .click()
      await page.getByRole("tab", { name: "Image comparison", exact: true }).click()
      await page.evaluate(() => Atelier.settled())
      assert.equal(
        await page.locator('#review .at-controls input[type="range"]:visible').count(),
        1
      )
      await page.locator('#review .at-controls input[type="range"]').fill("70")
      await page
        .getByRole("textbox", { name: "Local draft note", exact: true })
        .fill("Keep comparison position")
      await page.evaluate(() => Atelier.settled())
      assert.equal(
        await page.locator('#review .at-controls input[type="range"]').inputValue(),
        "70"
      )
      await page.getByRole("tab", { name: "JSON", exact: true }).click()
      await page.evaluate(() => Atelier.settled())
      assert.equal(
        await page.locator('#review .at-controls input[type="range"]:visible').count(),
        0
      )
      await page.getByRole("tab", { name: "Summary", exact: true }).click()
      results.push({ id, interaction: "linked detail tabs and tab-specific controls", pass: true })
    }
    if (id === "architecture-explorer") {
      await page
        .getByRole("combobox", { name: "Selected service", exact: true })
        .selectOption("n12")
      await page.getByRole("tab", { name: "Properties", exact: true }).click()
      await page.evaluate(() => Atelier.settled())
      assert.equal(
        await page.evaluate(
          () =>
            Atelier.inspect()
              .find((item) => item.name === "json" && item.handle.host.closest("#workflow"))
              .handle.api.snapshot().data.id
        ),
        "n12"
      )
      await page.getByRole("tab", { name: "Summary", exact: true }).click()
      results.push({ id, interaction: "service selection and linked properties", pass: true })
    }
    if (id === "native") {
      await page.evaluate(() =>
        Atelier.modules.plotly.Plotly.relayout(nativeFixture.plot.api.host, {
          "scene.camera": { eye: { x: 2, y: 1, z: 0.8 } },
        })
      )
      await page.setViewportSize({ width: 1440, height: 768 })
      await page.evaluate(() => Atelier.settled())
      const height = await page.evaluate(() => ({
        actual: nativeFixture.plot.api.host.layout.height,
        available: nativeFixture.plot.host.clientHeight,
      }))
      assert.ok(Math.abs(height.actual - height.available) < 2)
      assert.deepEqual(
        await page.evaluate(() => nativeFixture.plot.api.host.layout.scene.camera.eye),
        { x: 2, y: 1, z: 0.8 }
      )
      const box = await page.evaluate(() => {
        const area = nativeFixture.geometry.host.querySelector(".at-canvas")
        const svg = area.querySelector("svg")
        return { area: area.clientHeight, svg: svg.getBoundingClientRect().height }
      })
      assert.ok(Math.abs(box.area - box.svg) < 2)
      results.push({
        id,
        interaction: "height-only resize fits Plotly/JSXGraph and retains camera",
        pass: true,
      })
    }
    for (const direction of ["instrument", "editorial", "console"])
      for (const mode of ["light", "dark"]) {
        await page.evaluate(([d, m]) => Atelier.theme(d, m), [direction, mode])
        for (const [width, height] of [
          [1440, 900],
          [1280, 768],
          [390, 844],
        ]) {
          await page.setViewportSize({ width, height })
          await page.evaluate(() => Atelier.settled())
          await page.evaluate(() => document.fonts.ready)
          assert.deepEqual(await page.evaluate(controlFindings), [])
          assert.deepEqual(await page.evaluate(workspaceFindings), [])
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          )
          if (width >= 1100) {
            for (const link of await page.locator(".at-nav a").all()) {
              await link.click()
              await page.evaluate(() => Atelier.settled())
              const hash = new URL(page.url()).hash
              const cell = page.locator(hash)
              if (await cell.evaluate((n) => n.classList.contains("at-workspace-cell"))) {
                const visible = await cell.evaluate((n) =>
                  [...n.querySelectorAll(".at-workspace-panel")].every((p) => {
                    const r = p.getBoundingClientRect()
                    return r.top >= 0 && r.bottom <= innerHeight
                  })
                )
                assert.ok(
                  visible,
                  `${id}/${direction}/${mode}/${width} linked panels must all be on screen`
                )
              }
            }
          }
          results.push({ id, direction, mode, width, height, pass: true })
        }
      }
    if (id === "linked-workspace")
      assert.equal(
        await page.getByRole("textbox", { name: "Local review note", exact: true }).inputValue(),
        "Retain this draft"
      )
    assert.deepEqual(errors, [])
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.evaluate(() => Atelier.theme("editorial", "light"))
    await page.locator(".at-nav a").first().click()
    await page.evaluate(() => Atelier.settled())
    await page.screenshot({ path: path.join(dir, `${id}.png`) })
    await page.close()
  }
} finally {
  await browser.close()
  await writeFile(path.join(dir, "results.json"), JSON.stringify({ results }, null, 2))
}
console.log(JSON.stringify({ checked: results.length, dir }, null, 2))
