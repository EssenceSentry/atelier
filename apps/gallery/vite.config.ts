import { resolve } from "node:path"
import { atelierTheme } from "@atelier/theme/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), atelierTheme()],
  resolve: {
    alias: {
      // Screens, blocks and components live in the shared kit.
      "@": resolve(import.meta.dirname, "../../packages/kit/src"),
    },
  },
})
