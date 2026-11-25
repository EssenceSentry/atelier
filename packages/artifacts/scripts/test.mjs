import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { pack } from "./pack.mjs"
import { assertSourceStyles, sourceProblems } from "./source-checks.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temp = await mkdtemp(path.join(os.tmpdir(), "atelier-pack-test-"))
let checks = 0
try {
  const release = path.join(temp, "release")
  await mkdir(release)
  const core = "window.Atelier = {settled:async()=>{}};"
  const hash = (source) => createHash("sha256").update(source).digest("hex")
  await writeFile(path.join(release, "core.js"), core)
  await writeFile(path.join(release, "tiny.js"), "window.testPackLoaded=true;")
  await writeFile(path.join(release, "THIRD-PARTY-NOTICES.md"), "Test fixture, no dependencies")
  const manifest = {
    version: "test",
    families: {
      tiny: { profile: "portable", adapters: ["small"] },
      dependent: { profile: "portable", requires: ["tiny"] },
      worker: { profile: "browser", capabilities: ["worker"] },
    },
    files: {
      "core.js": { sha256: hash(core) },
      "tiny.js": { sha256: hash("window.testPackLoaded=true;") },
      "dependent.js": { sha256: hash("window.dependent=true;") },
      "worker.js": { sha256: hash("window.worker=true;") },
    },
  }
  await writeFile(path.join(release, "manifest.json"), JSON.stringify(manifest))
  await writeFile(path.join(release, "dependent.js"), "window.dependent=true;")
  await writeFile(path.join(release, "worker.js"), "window.worker=true;")
  const config = path.join(temp, "artifact.json")
  const output = path.join(temp, "out/result.html")
  const setup = async (
    changes = {},
    source = "const text = '</script><script>window.injected=true</script>';\nawait Promise.resolve(text);"
  ) => {
    await writeFile(
      config,
      JSON.stringify({
        title: '<title> & "quoted"',
        families: ["dependent"],
        source: "main.js",
        ...changes,
      })
    )
    await writeFile(path.join(temp, "main.js"), source)
  }
  await setup()
  const result = await pack(config, output, { release })
  assert.deepEqual(result.families, ["tiny", "dependent"])
  checks++
  const html = await readFile(output, "utf8")
  assert.ok(html.includes("&lt;title> &amp; &quot;quoted&quot;"))
  checks++
  assert.ok(!html.includes("</script><script>window.injected"))
  checks++
  assert.ok(html.includes("<\\/script>"))
  checks++
  assert.ok(
    html.indexOf('data-atelier-asset="tiny"') < html.indexOf('data-atelier-asset="dependent"')
  )
  checks++
  assert.deepEqual((await readdir(path.dirname(output))).sort(), [
    "THIRD-PARTY-NOTICES.md",
    "result.html",
    "result.html.json",
  ])
  checks++
  await setup({ families: ["worker"] })
  await assert.rejects(() => pack(config, output, { release }), /requires the browser profile/)
  checks++
  await setup({ families: ["missing"] })
  await assert.rejects(() => pack(config, output, { release }), /Unknown family/)
  checks++
  await setup({ families: ["small"] }, 'Atelier.mount("small", document.body, {});')
  assert.deepEqual((await pack(config, output, { release })).families, ["tiny"])
  checks++
  await setup(
    { families: ["worker"], profile: "browser" },
    'Atelier.mount("small", document.body, {});'
  )
  await assert.rejects(
    () => pack(config, output, { release }),
    /Widget "small" needs family "tiny"/
  )
  checks++
  await setup({}, 'const docs = `Atelier.mount("not-a-widget", host)`; // Not executable code')
  await pack(config, output, { release })
  checks++
  await setup({ frameOrigins: ["https://example.com"] })
  await assert.rejects(() => pack(config, output, { release }), /Remote origins require/)
  checks++
  await setup({}, "import React from 'react';")
  await assert.rejects(() => pack(config, output, { release }), /plain JavaScript/)
  checks++
  assert.equal(
    sourceProblems(
      'const spec = {scale:{range:["#8178d8","#32a69a"]},axis:{gridColor:"#77777733"}}'
    ).length,
    3
  )
  checks++
  assert.doesNotThrow(() =>
    assertSourceStyles(
      "const t = Atelier.tokens(); const options = {color:t.series[0]};",
      "main.js"
    )
  )
  checks++
  assert.doesNotThrow(() =>
    assertSourceStyles(
      "// check-colours: off — Original brand artwork is content\nconst svg = '<svg fill=\"#fff\"/>';\n// check-colours: on",
      "main.js"
    )
  )
  checks++
  assert.throws(
    () => assertSourceStyles('// check-colours: off\nconst x="#fff";', "main.js"),
    /exemption needs a reason/
  )
  checks++
  await setup({}, 'const spec = {mark:{color:"#8178d8"}};')
  await assert.rejects(() => pack(config, output, { release }), /main.js:1: literal colour/)
  checks++
  await setup({}, 'const trace = {colorscale:"Viridis"};')
  await assert.rejects(() => pack(config, output, { release }), /literal chart palette/)
  checks++
  await setup({ css: "custom.css" })
  await writeFile(path.join(temp, "custom.css"), ".at-button {background: #fff}")
  await assert.rejects(() => pack(config, output, { release }), /custom.css:1: literal colour/)
  checks++
  await setup()
  await writeFile(path.join(release, "core.js"), "tampered")
  await assert.rejects(() => pack(config, output, { release }), /integrity check failed/)
  checks++
  await assert.rejects(
    () => pack(config, output, { release: path.join(temp, "missing") }),
    /Packing never runs a compiler/
  )
  checks++
  const recipes = JSON.parse(await readFile(path.join(root, "recipes/index.json"), "utf8"))
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
  for (const recipe of recipes) {
    const config = JSON.parse(await readFile(path.join(root, "recipes", recipe.path), "utf8"))
    const source = await readFile(path.join(root, "recipes", recipe.id, config.source), "utf8")
    new AsyncFunction(source)
    assert.equal(config.profile, recipe.profile)
    assert.deepEqual(config.families, recipe.families)
    checks++
  }
  console.log(`${checks} packaging and recipe checks passed; no compiler or repository setup used.`)
} finally {
  await rm(temp, { recursive: true, force: true })
}
