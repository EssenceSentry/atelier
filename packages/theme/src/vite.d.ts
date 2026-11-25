import type { Plugin } from "vite"

export type Theme = "instrument" | "editorial" | "console" | "all"
export type Target = "app" | "artifact"
export declare const THEMES: readonly Theme[]
export declare const TARGETS: readonly Target[]
export declare const DIRECTION_IMPORT: "@atelier/theme/direction.css"
/** Browsers with light-dark(); the plugin minifies CSS for these. */
export declare const CSS_TARGET: readonly string[]
export declare function atelierTheme(options?: { configFile?: string }): Plugin
