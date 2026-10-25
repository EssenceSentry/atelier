import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const THEMES = ["instrument", "editorial", "console", "all"]
export const DIRECTION_IMPORT = "@atelier/theme/direction.css"

const here = dirname(fileURLToPath(import.meta.url))

function readConfiguredTheme(root, configFile) {
  try {
    return JSON.parse(readFileSync(resolve(root, configFile), "utf8")).theme
  } catch (error) {
    if (error.code === "ENOENT") return undefined
    throw error
  }
}

/**
 * Picks the project's direction. The `theme` field in app.config.json sets it,
 * THEME=<name> overrides it for one run, and instrument is the default. "all"
 * bundles every direction for the gallery.
 *
 * The plugin points `@atelier/theme/direction.css` at the chosen direction,
 * stamps it on <html> so the first paint has its tokens, and defines __THEME__.
 */
export function atelierTheme({ configFile = "app.config.json" } = {}) {
  let file
  let theme
  return {
    name: "atelier-theme",
    // Resolve the direction import before Vite looks for it in package exports.
    enforce: "pre",
    config(userConfig) {
      const root = resolve(userConfig.root ?? process.cwd())
      theme = process.env.THEME ?? readConfiguredTheme(root, configFile) ?? "instrument"
      if (!THEMES.includes(theme)) throw new Error(`Unknown theme "${theme}". Use one of: ${THEMES.join(", ")}.`)
      file = resolve(here, "directions", `${theme}.css`)
      return { define: { __THEME__: JSON.stringify(theme) } }
    },
    resolveId(id) {
      if (id === DIRECTION_IMPORT) return file
    },
    transformIndexHtml(html) {
      const direction = theme === "all" ? "instrument" : theme
      return html.replace("<html", `<html data-direction="${direction}"`)
    },
  }
}
