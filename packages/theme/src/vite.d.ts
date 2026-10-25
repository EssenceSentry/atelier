import type { Plugin } from "vite"

export type Theme = "instrument" | "editorial" | "console" | "all"
export declare const THEMES: readonly Theme[]
export declare const DIRECTION_IMPORT: "@atelier/theme/direction.css"
export declare function atelierTheme(options?: { configFile?: string }): Plugin
