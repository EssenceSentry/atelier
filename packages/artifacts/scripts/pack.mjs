import { createHash } from "node:crypto"
import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"
import { assertSourceStyles } from "./source-checks.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const escapeHTML = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
export const inlineScript = (source) =>
  source.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--")
const readJSON = async (file) => JSON.parse(await readFile(file, "utf8"))

export async function pack(configFile, output, { release } = {}) {
  const config = await readJSON(configFile)
  const base = path.dirname(path.resolve(configFile))
  const source = await readFile(path.resolve(base, config.source ?? "main.js"), "utf8")
  const customCSS = config.css ? await readFile(path.resolve(base, config.css), "utf8") : ""
  assertSourceStyles(source, config.source ?? "main.js")
  if (customCSS) assertSourceStyles(customCSS, config.css)
  const directory = path.resolve(release ?? path.join(root, "dist", config.release ?? "0.1.0"))
  const manifest = await readJSON(path.join(directory, "manifest.json")).catch(() => {
    throw new Error(
      `Prebuilt release is missing: ${directory}. Ask the atelier maintainer to build/install it. Packing never runs a compiler.`
    )
  })
  const profile = config.profile ?? "portable"
  const rank = { portable: 0, browser: 1, external: 2 }
  if (!(profile in rank)) throw new Error(`Unknown profile: ${profile}`)
  if (!Array.isArray(config.families) || !config.families.length)
    throw new Error("artifact.json needs a nonempty families array")
  if (!["instrument", "editorial", "console"].includes(config.theme ?? "instrument"))
    throw new Error("Unknown atelier theme")
  if (!["light", "dark", "system"].includes(config.mode ?? "light"))
    throw new Error("Unknown appearance mode")
  const ordered = []
  const visiting = new Set()
  const owner = (name) =>
    manifest.families[name]
      ? name
      : Object.keys(manifest.families).find((key) =>
          manifest.families[key].adapters?.includes(name)
        )
  function visit(name) {
    name = owner(name) ?? name
    if (ordered.includes(name)) return
    if (visiting.has(name)) throw new Error(`Family dependency cycle: ${name}`)
    const family = manifest.families[name]
    if (!family) throw new Error(`Unknown family: ${name}`)
    if (rank[family.profile] > rank[profile])
      throw new Error(
        `${name} requires the ${family.profile} profile (${family.capabilities?.join(", ") ?? family.use}). Set artifact.json profile explicitly.`
      )
    visiting.add(name)
    for (const dependency of family.requires ?? []) visit(dependency)
    visiting.delete(name)
    ordered.push(name)
  }
  config.families.forEach(visit)
  // Parse only: no transformation, emit, typechecking or compilation. Catch
  // literal widget/pack mismatches before producing a broken standalone page.
  const syntax = ts.createSourceFile(
    "main.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  )
  const missing = new Set()
  const walk = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(syntax) === "Atelier" &&
      node.expression.name.text === "mount" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const name = node.arguments[0].text
      const family = owner(name)
      if (!family) missing.add(`Unknown widget "${name}". See the recipe's mount name.`)
      else if (!ordered.includes(family))
        missing.add(`Widget "${name}" needs family "${family}" in artifact.json.`)
    }
    ts.forEachChild(node, walk)
  }
  walk(syntax)
  if (missing.size) throw new Error([...missing].join("\n"))
  const capabilities = [
    ...new Set(ordered.flatMap((name) => manifest.families[name].capabilities ?? [])),
  ]
  const assets = {}
  const assetNames = new Set(ordered.flatMap((name) => manifest.families[name].assets ?? []))
  const outFile = path.resolve(output)
  await mkdir(path.dirname(outFile), { recursive: true })
  const verify = async (name) => {
    const bytes = await readFile(path.join(directory, name))
    const expected = manifest.files[name]
    if (!expected || createHash("sha256").update(bytes).digest("hex") !== expected.sha256)
      throw new Error(`Release integrity check failed: ${name}`)
    return bytes
  }
  for (const name of assetNames) {
    const relative = manifest.assets[name]
    await verify(relative)
    const subpath = `${path.basename(outFile, ".html")}.assets/${path.basename(relative)}`
    await mkdir(path.join(path.dirname(outFile), path.dirname(subpath)), { recursive: true })
    await cp(path.join(directory, relative), path.join(path.dirname(outFile), subpath))
    assets[name] = subpath
  }
  const head = []
  for (const name of ["core", ...ordered]) {
    if (manifest.files[`${name}.css`])
      head.push(
        `<style data-atelier-asset="${name}">${(await verify(`${name}.css`)).toString().replace(/<\/style/gi, "<\\/style")}</style>`
      )
    head.push(
      `<script data-atelier-asset="${name}">${inlineScript((await verify(`${name}.js`)).toString())}</script>`
    )
  }
  if (assetNames.size)
    head.push(
      `<script data-atelier-asset="assets">window.ATELIER_ASSETS=Object.fromEntries(Object.entries(${JSON.stringify(assets)}).map(([key,value])=>[key,new URL(value,location.href).href]));</script>`
    )
  // This is syntax validation, not compilation. Recipes use plain JS and can
  // contain top-level await because they run inside the async artifact boot.
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
  try {
    new AsyncFunction(source)
  } catch (error) {
    throw new Error(
      `Artifact source must be plain JavaScript, without imports/JSX/TypeScript: ${error.message}`
    )
  }
  const frameOrigins = config.frameOrigins ?? []
  const connectOrigins = config.connectOrigins ?? []
  for (const value of [...frameOrigins, ...connectOrigins]) {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.origin !== value)
      throw new Error(`Use an exact HTTPS origin without a path: ${value}`)
  }
  if (profile !== "external" && (frameOrigins.length || connectOrigins.length))
    throw new Error("Remote origins require the external profile")
  const policy = [
    "default-src 'none'",
    `script-src 'unsafe-inline'${rank[profile] > 0 ? " 'wasm-unsafe-eval'" : ""}${capabilities.includes("eval") ? " 'unsafe-eval'" : ""}`,
    "style-src 'unsafe-inline'",
    "font-src data:",
    "img-src data: blob:",
    "media-src data: blob:",
    `connect-src ${rank[profile] > 0 ? "'self' blob: data:" : "'none'"}${connectOrigins.length ? ` ${connectOrigins.join(" ")}` : ""}`,
    `worker-src ${rank[profile] > 0 ? `'self' blob:${capabilities.includes("data-worker") ? " data:" : ""}` : "'none'"}`,
    `frame-src ${frameOrigins.join(" ") || "'none'"}`,
    "base-uri 'none'",
  ].join("; ")
  const css = config.css ? `<style>${customCSS.replace(/<\/style/gi, "<\\/style")}</style>` : ""
  const boot = `window.ATELIER_RUN=(async()=>{try{\n${source}\nawait Atelier.settled();document.documentElement.dataset.artifactReady='true';}catch(error){const p=Atelier.element('p','at-error',error.message??String(error));p.setAttribute('role','alert');document.body.append(p);console.error(error);document.documentElement.dataset.artifactReady='error';throw error}})();window.ATELIER_RUN.catch(()=>{});`
  const metadata = {
    version: manifest.version,
    title: config.title ?? "Atelier notebook",
    profile,
    families: ordered,
    capabilities,
    sources: config.sources ?? [],
    builtFrom: path.basename(configFile),
    requiresHTTP: assetNames.size > 0,
  }
  const html = `<!doctype html>\n<html lang="${escapeHTML(config.lang ?? "en")}" data-direction="${config.theme ?? "instrument"}"${config.mode === "system" ? "" : ` data-theme="${config.mode ?? "light"}"`}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escapeHTML(policy)}"><title>${escapeHTML(metadata.title)}</title>${head.join("\n")}${css}</head><body><script id="atelier-artifact" type="application/json">${JSON.stringify(metadata).replaceAll("<", "\\u003c")}</script><script>${inlineScript(boot)}</script></body></html>`
  await writeFile(outFile, html)
  await writeFile(`${outFile}.json`, JSON.stringify(metadata, null, 2))
  await cp(
    path.join(directory, "THIRD-PARTY-NOTICES.md"),
    path.join(path.dirname(outFile), "THIRD-PARTY-NOTICES.md")
  )
  if (ordered.includes("icons"))
    await cp(
      path.join(directory, "ICON-NOTICES.md"),
      path.join(path.dirname(outFile), "ICON-NOTICES.md")
    )
  return { output: outFile, bytes: Buffer.byteLength(html), ...metadata }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args.length < 2)
    throw new Error(
      "Usage: node pack.mjs /path/artifact.json /path/output.html [--release /path/prebuilt-release]"
    )
  const release = args.includes("--release") ? args[args.indexOf("--release") + 1] : undefined
  console.log(JSON.stringify(await pack(args[0], args[1], { release }), null, 2))
}
