import { resolve } from "node:path"
import { atelierTheme } from "@atelier/theme/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  define: { __HAS_CATALOG__: JSON.stringify(process.env.ATELIER_TARGET !== "artifact") },
  plugins: [react(), tailwindcss(), atelierTheme()],
  build: {
    rolldownOptions: {
      input:
        process.env.ATELIER_TARGET === "artifact"
          ? resolve(import.meta.dirname, "index.html")
          : {
              gallery: resolve(import.meta.dirname, "index.html"),
              catalog: resolve(import.meta.dirname, "gallery.html"),
              playground: resolve(import.meta.dirname, "playground.html"),
            },
    },
  },
  resolve: {
    alias: [
      {
        find: /^vega-embed$/,
        replacement: resolve(import.meta.dirname, "src/playground/neural-embed.ts"),
      },
      {
        // markdown-it is overridden to 14 for its security fixes, and 14 ships
        // its internals as .mjs. markdown-it-dollarmath, pulled in by MyST,
        // still imports escapeHtml from the 13-era .js path.
        find: "markdown-it/lib/common/utils.js",
        replacement: "markdown-it/lib/common/utils.mjs",
      },
      {
        // Screens, blocks and components live in the shared kit.
        find: "@",
        replacement: resolve(import.meta.dirname, "../../packages/kit/src"),
      },
    ],
  },
})
