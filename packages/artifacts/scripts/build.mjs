import { createHash } from "node:crypto"
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CSS_TARGET } from "@atelier/theme/vite"
import react from "@vitejs/plugin-react"
import { build } from "vite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"))
const out = path.join(root, "dist", catalog.version)
await mkdir(out, { recursive: true })
const globals = {
  react: "Atelier.React",
  "react-dom": "Atelier.ReactDOM",
  "react-dom/client": "Atelier.ReactClient",
  "react/jsx-runtime": "Atelier.JSX",
  "react/jsx-dev-runtime": "Atelier.JSX",
  vega: "Atelier.modules.vega.vega",
  "vega-lite": "Atelier.modules.vega.vegaLite",
  "vega-embed": "Atelier.modules.vega.embed",
}
const selected = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : ["core", ...Object.keys(catalog.families)]
for (const name of selected) {
  const core = name === "core"
  const family = catalog.families[name]
  if (!core && !family) throw new Error(`Unknown family: ${name}`)
  const entry = path.join(root, "src", core ? "core.js" : `adapters/${family.entry}`)
  const temp = path.join(root, "dist", `.build-${name}`)
  await build({
    configFile: false,
    root,
    publicDir: false,
    plugins: [react()],
    define: { "process.env.NODE_ENV": '"production"' },
    resolve: {
      alias: [
        // markdown-it is overridden to 14 for its security fixes, and 14 ships
        // its internals as .mjs. markdown-it-dollarmath, pulled in by MyST,
        // still imports escapeHtml from the 13-era .js path.
        {
          find: "markdown-it/lib/common/utils.js",
          replacement: "markdown-it/lib/common/utils.mjs",
        },
        ...(name === "neural"
          ? [{ find: /^vega-embed$/, replacement: path.join(root, "src/adapters/tfvis-embed.js") }]
          : []),
      ],
    },
    build: {
      outDir: temp,
      emptyOutDir: true,
      minify: true,
      // Keep the theme's light-dark() tokens: an older CSS target rewrites them
      // to the page's mode, and a notebook's dark top bar loses its light text.
      cssTarget: CSS_TARGET,
      sourcemap: false,
      chunkSizeWarningLimit: 20000,
      lib: {
        entry,
        formats: ["iife"],
        name: core ? "Atelier" : `Atelier_${name}`,
        fileName: () => `${name}.js`,
        cssFileName: name,
      },
      rollupOptions: {
        external: core
          ? []
          : Object.keys(globals)
              .filter(
                (key) => name !== "vega" || !["vega", "vega-lite", "vega-embed"].includes(key)
              )
              .filter((key) => !(name === "neural" && key === "vega-embed")),
        output: {
          globals,
          inlineDynamicImports: true,
          // Some upstream CJS bundles leave require("react") intact when React is
          // external. Keep that bridge scoped to the pack and use the same React.
          ...(!core
            ? {
                banner: `(function(){const require=(id)=>{const modules={${Object.entries(globals)
                  .map(
                    ([key, value]) =>
                      `${JSON.stringify(key)}:${value.replace("Atelier.modules.vega.", "Atelier.modules.vega?.")}`
                  )
                  .join(
                    ","
                  )}};if(!modules[id])throw new Error('Unsupported browser require or missing pack: '+id);return modules[id]};`,
                footer: "})();",
              }
            : {}),
        },
      },
    },
  })
  for (const file of await readdir(temp))
    await cp(path.join(temp, file), path.join(out, file), { recursive: true })
  await rm(temp, { recursive: true })
  console.log(`Built ${name}`)
}
await mkdir(path.join(out, "assets"), { recursive: true })
const dependencyRoot = path.resolve(root, "../../node_modules")
for (const [file, source] of Object.entries({
  "duckdb.worker.js": "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js",
  "duckdb.wasm": "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm",
})) {
  await cp(path.join(dependencyRoot, source), path.join(out, "assets", file))
}
await cp(path.join(root, "ICON-NOTICES.md"), path.join(out, "ICON-NOTICES.md"))
await cp(path.join(root, "src/icon-catalog.json"), path.join(out, "icon-catalog.json"))
await cp(path.join(root, "icon-sources.json"), path.join(out, "icon-sources.json"))
// Include the installed dependency licenses, including transitive bundles. The
// release is local/experimental; this inventory does not replace license review.
const lock = JSON.parse(await readFile(path.resolve(root, "../../package-lock.json"), "utf8"))
const notices = []
for (const [location, info] of Object.entries(lock.packages)) {
  if (!location.includes("node_modules/") || !info.version) continue
  const dir = path.resolve(root, "../..", location)
  const licenses = await readdir(dir).catch(() => [])
  const texts = []
  for (const file of licenses.filter((file) =>
    /^(licen[cs]e|copying|notice)([.\-_]|$)/i.test(file)
  )) {
    const text = await readFile(path.join(dir, file), "utf8").catch(() => "")
    if (text) texts.push(`### ${file}\n\n${text}`)
  }
  notices.push(
    `## ${location.replace(/^.*node_modules\//, "")} ${info.version}\n\nDeclared license: ${info.license ?? "not declared"}\n\n${texts.join("\n\n")}`
  )
}
await writeFile(
  path.join(out, "THIRD-PARTY-NOTICES.md"),
  `# Installed dependency license inventory\n\nThis conservative inventory includes dependencies of the workspace, some of which are not shipped in every selected artifact.\n\n${notices.join("\n\n")}\n`
)
const files = {}
async function inventory(dir, prefix = "") {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = `${prefix}${item.name}`
    if (item.isDirectory()) await inventory(path.join(dir, item.name), `${name}/`)
    else if (name !== "manifest.json") {
      const bytes = await readFile(path.join(dir, item.name))
      files[name] = {
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      }
    }
  }
}
await inventory(out)
for (const name of Object.keys(files).filter((file) => file.endsWith(".css"))) {
  if ((await readFile(path.join(out, name), "utf8")).includes("--lightningcss-"))
    throw new Error(`${name}: light-dark() was rewritten for older browsers; check build.cssTarget`)
}
await writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(
    {
      ...catalog,
      experimental: true,
      builtAt: new Date().toISOString(),
      files,
      assets: { duckdbWorker: "assets/duckdb.worker.js", duckdbWasm: "assets/duckdb.wasm" },
    },
    null,
    2
  )
)
console.log(`Release ready: ${out}`)
