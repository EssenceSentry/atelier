import assert from "node:assert/strict"
import { createReadStream } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { pack } from "./pack.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dir = path.resolve(process.argv[2] ?? "/private/tmp/atelier-artifact-smoke")
await mkdir(dir, { recursive: true })
const recipes = JSON.parse(await readFile(path.join(root, "recipes/index.json"), "utf8"))
for (const recipe of recipes)
  await pack(path.join(root, "recipes", recipe.path), path.join(dir, `${recipe.id}.html`))
const server = http.createServer((req, res) => {
  const file = path.resolve(dir, `.${new URL(req.url, "http://localhost").pathname}`)
  if (!file.startsWith(`${dir}/`)) {
    res.writeHead(403).end()
    return
  }
  res.writeHead(200, {
    "Content-Type": file.endsWith(".wasm")
      ? "application/wasm"
      : file.endsWith(".js")
        ? "text/javascript"
        : "text/html",
  })
  const stream = createReadStream(file)
  stream.on("error", () => res.end())
  stream.pipe(res)
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] })
const results = []
const findings = []
const output = path.resolve(root, "../../output/playwright/artifact-interactions")
await mkdir(output, { recursive: true })
async function check(name, action, { file = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  try {
    await page.goto(file ? `file://${dir}/${name}.html` : `${base}/${name}.html`)
    await page.waitForFunction(() => document.documentElement.dataset.artifactReady === "true", {
      timeout: 45000,
    })
    await action(page, context)
    await page.evaluate(() => Atelier.settled())
    assert.deepEqual(errors, [])
    results.push({ name, file })
  } catch (error) {
    findings.push({ name, file, error: error.message, browserErrors: errors })
    await page.screenshot({ path: path.join(output, `${name}-failure.png`) }).catch(() => {})
  }
  await context.close()
}
try {
  await check(
    "linked-analysis",
    async (page) => {
      await page.locator("#overview .at-controls select").selectOption("B")
      await page.waitForFunction(
        () => document.querySelector("#records .at-toolbar p").textContent === "20 / 20 records"
      )
      const groups = await page.locator("#records tbody tr td:nth-child(2)").allTextContents()
      assert.ok(groups.length && groups.every((value) => value === "B"))
      const positions = await page.locator("#overview .at-cell-body").evaluate((node) => ({
        control: node.querySelector("aside").getBoundingClientRect().right,
        view: node.querySelector(".at-view").getBoundingClientRect().left,
      }))
      assert.ok(positions.control < positions.view)
      await page.locator(".at-nav a[href='#records']").click()
      assert.equal(new URL(page.url()).hash, "#records")
      await page.goBack()
      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByRole("button", { name: "Sections", exact: true }).click()
      await page.locator(".at-nav a[href='#overview']").click()
      const mobile = await page.locator("#overview .at-cell-body").evaluate((node) => ({
        bottom: node.querySelector("aside").getBoundingClientRect().bottom,
        top: node.querySelector(".at-view").getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))
      assert.ok(mobile.bottom <= mobile.top)
      assert.equal(mobile.overflow, false)
    },
    { file: true }
  )
  await check("architecture", async (page) => {
    await page.locator(".react-flow__node").first().waitFor()
    assert.equal(await page.locator(".react-flow__node").count(), 3)
    for (const id of ["architecture", "sequence"]) {
      const popupPromise = page.waitForEvent("popup")
      await page
        .locator(`#${id}`)
        .getByRole("button", { name: "Open canvas in new tab", exact: true })
        .click()
      const popup = await popupPromise
      await popup.waitForFunction(() => document.documentElement.dataset.artifactReady === "true", {
        timeout: 30000,
      })
      await popup
        .locator(id === "architecture" ? ".react-flow__node" : "svg")
        .first()
        .waitFor()
      assert.equal(await popup.locator(".at-nav").count(), 0)
      await popup.close()
    }
    await page.setViewportSize({ width: 390, height: 1000 })
    await page.reload()
    await page.waitForFunction(() => document.documentElement.dataset.artifactReady === "true")
    assert.ok(
      await page.evaluate(
        () =>
          Atelier.inspect()
            .find((item) => item.name === "flow")
            .handle.api.flow.getViewport().zoom >= 0.9
      )
    )
    const touch = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    })
    const phone = await touch.newPage()
    await phone.goto(`${base}/architecture.html`)
    await phone.waitForFunction(() => document.documentElement.dataset.artifactReady === "true")
    const targets = await phone.locator(".react-flow__controls-button").evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      }))
    )
    assert.ok(targets.length && targets.every((box) => box.width >= 44 && box.height >= 44))
    await touch.close()
  })
  await check("document", async (page) => {
    assert.ok(await page.locator(".katex").count())
    assert.ok((await page.locator(".myst-document").innerText()).includes("Conjugacy"))
    const widths = await page.locator("#summary").evaluate((cell) => ({
      prose: cell.querySelector(".at-prose").clientWidth,
      available: cell.querySelector(".at-view").clientWidth,
    }))
    assert.equal(widths.prose, widths.available)
    assert.ok(await page.locator(".cm-editor .at-code-keyword").count())
  })
  await check("geometry", async (page) => {
    await page.getByRole("slider", { name: "Construction scale" }).fill("1.5")
    await page.waitForFunction(
      () =>
        Math.abs(
          Atelier.inspect()
            .find((item) => item.name === "geometry")
            .handle.api.board.objectsList.find((item) => item.name === "A")
            .X() + 3
        ) < 0.001
    )
  })
  await check("scientific", async (page) => {
    const first = await page.evaluate(
      () => Atelier.inspect().find((item) => item.name === "plotly").handle.api.host.data[0].z[0][0]
    )
    await page.getByRole("slider", { name: "Frequency", exact: true }).fill("2")
    await page.evaluate(() => Atelier.settled())
    const next = await page.evaluate(
      () => Atelier.inspect().find((item) => item.name === "plotly").handle.api.host.data[0].z[0][0]
    )
    assert.notEqual(first, next)
  })
  await check("spatial", async (page) => {
    await page.getByRole("slider", { name: "Point radius" }).fill("2")
    await page.evaluate(() => Atelier.settled())
    assert.equal(
      await page.evaluate(() =>
        Atelier.inspect()
          .find((item) => item.name === "deck")
          .handle.api.deck.props.layers[0].props.getRadius({ radius: 3 })
      ),
      6
    )
  })
  await check("sanddance", async (page) => {
    await page.getByLabel("Layout", { exact: true }).selectOption("grid")
    await page.evaluate(() => Atelier.settled())
    assert.equal(
      await page.evaluate(
        () =>
          Atelier.inspect()
            .find((item) => item.name === "sanddance")
            .handle.api.snapshot().insight.chart
      ),
      "grid"
    )
  })
  await check("recommend", async (page) => {
    const first = await page.evaluate(() =>
      JSON.stringify(
        Atelier.inspect().find((item) => item.name === "recommend").handle.api.selected
      )
    )
    await page.getByRole("button", { name: /option 2/ }).click()
    const next = await page.evaluate(() =>
      JSON.stringify(
        Atelier.inspect().find((item) => item.name === "recommend").handle.api.selected
      )
    )
    assert.notEqual(first, next)
  })
  await check("rich-data", async (page) => {
    await page.locator("#review tbody select").first().selectOption("Accepted")
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Export decisions", exact: true }).click()
    const download = await downloadPromise
    assert.equal(JSON.parse(await readFile(await download.path(), "utf8"))[0].status, "Accepted")
    await page
      .locator("#review tbody")
      .getByRole("button", { name: "Inspect", exact: true })
      .first()
      .click()
    assert.equal(new URL(page.url()).hash, "#json")
    await page.locator(".jsoncrack-space").waitFor()
  })
  await check("sql", async (page) => {
    const content = page.locator(".cm-content")
    await content.click()
    await page.keyboard.press("ControlOrMeta+A")
    await page.keyboard.insertText("SELECT COUNT(*) AS total FROM observations;")
    await page.getByRole("button", { name: "Run SQL", exact: true }).click()
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".at-table tbody td").length === 1 &&
        document.querySelector(".at-table tbody td").textContent === "90"
    )
    assert.ok(await page.locator(".at-code-keyword").count())
    const cancelled = await page.evaluate(async () => {
      await Atelier.inspect()
        .find((item) => item.name === "sql")
        .handle.destroy()
      const host = Atelier.element("div")
      document.body.append(host)
      const pending = Atelier.mount("sql", host, {
        tables: { rows: [{ id: 1 }] },
        source: "SELECT * FROM rows",
      })
      await new Promise((resolve) => setTimeout(resolve, 15))
      await pending.destroy()
      const result = await pending.ready.then(
        () => "ready",
        (error) => error.name
      )
      host.remove()
      return result
    })
    assert.equal(cancelled, "AbortError")
  })
  await check("inputs-media", async (page) => {
    await page.getByRole("textbox", { name: "Reviewer" }).fill("Ada")
    await page.getByRole("slider", { name: "Comparison position", exact: true }).fill("65")
    await page.waitForFunction(() =>
      document.querySelector(".at-compare img:last-child").style.clipPath.includes("65%")
    )
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Apply settings", exact: true }).click()
    assert.equal(
      JSON.parse(await readFile(await (await downloadPromise).path(), "utf8")).reviewer,
      "Ada"
    )
    await page.getByRole("button", { name: "Next slide", exact: true }).click()
    await page.getByText("2 / 3", { exact: true }).waitFor()
  })
  await check("chat", async (page) => {
    await page.getByRole("textbox", { name: "Chat message", exact: true }).fill("Hello notebook")
    await page.getByRole("button", { name: "Send", exact: true }).click()
    await page.waitForFunction(() =>
      document.body.innerText.includes("Supply a real adapter when a service is available.")
    )
  })
  await check("neural", async (page) => {
    const initial = await page.evaluate(() =>
      Atelier.inspect()
        .find((item) => item.name === "neural")
        .handle.api.runtime.export()
    )
    await page.getByRole("button", { name: "Train 20 epochs", exact: true }).click()
    await page.waitForFunction(
      () =>
        Atelier.inspect().find((item) => item.name === "neural").handle.api.snapshot.epoch === 20
    )
    const trained = await page.evaluate(() =>
      Atelier.inspect()
        .find((item) => item.name === "neural")
        .handle.api.runtime.export()
    )
    assert.notDeepEqual(trained.layers[0].weights, initial.layers[0].weights)
    assert.equal(trained.history.length, 20)
    // Shared UI must stay contained after state changes, not only on cold load.
    for (const width of [390, 1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(250)
      await page.evaluate(() => Atelier.settled())
      const bounds = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }))
      assert.ok(
        bounds.page <= bounds.viewport + 1,
        `Trained neural view overflows after resize to ${width}px: ${bounds.page}px`
      )
      assert.equal(
        await page.evaluate(
          () => Atelier.inspect().find((item) => item.name === "neural").handle.api.snapshot.epoch
        ),
        20
      )
    }
    const disposal = await page.evaluate(async () => {
      const { tf, createNN, validateBundle } = Atelier.modules.neural
      const model = Atelier.inspect().find((item) => item.name === "neural").handle.api
      const bundle = validateBundle(model.runtime.export())
      const clone = createNN(bundle.config, bundle)
      const probabilities = clone.snapshot().probabilities
      const error = Math.max(
        ...model.snapshot.probabilities.map((p, i) => Math.abs(p - probabilities[i]))
      )
      clone.dispose()
      await Atelier.destroy()
      return { error, tensors: tf.memory().numTensors }
    })
    assert.equal(disposal.error, 0)
    assert.equal(disposal.tensors, 0)
    results.push({
      name: "neural-metrics",
      epochs: trained.epoch,
      lastLoss: trained.history.at(-1).val_loss,
      ...disposal,
    })
  })
  await check("external-viewers", async (page) => {
    assert.equal(await page.locator("iframe").count(), 0)
    assert.equal(
      await page.getByRole("button", { name: "Load external viewer", exact: true }).count(),
      4
    )
  })
  await check(
    "plot-gallery",
    async (page) => {
      assert.equal(await page.locator(".at-cell").count(), 26)
      assert.equal(await page.locator(".at-widget svg").count(), 26)
    },
    { file: true }
  )
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
await writeFile(path.join(output, "results.json"), JSON.stringify({ results, findings }, null, 2))
console.log(JSON.stringify({ checked: results.length, findings, output }, null, 2))
if (findings.length) process.exitCode = 1
