/** Chart colours resolved from the active direction's tokens. */
export type VizTokens = {
  surface: string
  text: string
  ink: string
  grid: string
  axis: string
  primary: string
  popover: string
  border: string
  /** Validated categorical slots, in fixed order. Never cycle past the end. */
  series: string[]
  divNeg: string
  divMid: string
  divPos: string
  good: string
  warning: string
  critical: string
  font: string
  labelFont: string
}

/**
 * Reads tokens as literal values. SVG presentation attributes do not accept
 * var(), so chart libraries need resolved colours, read again on every theme
 * change.
 */
export function readVizTokens(root: HTMLElement = document.documentElement): VizTokens {
  const css = getComputedStyle(root)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    surface: v("--card"),
    text: v("--viz-text"),
    ink: v("--foreground"),
    grid: v("--viz-grid"),
    axis: v("--viz-axis"),
    primary: v("--primary"),
    popover: v("--popover"),
    border: v("--border"),
    series: [1, 2, 3, 4, 5, 6].map((i) => v(`--series-${i}`)).filter(Boolean),
    divNeg: v("--div-neg"),
    divMid: v("--div-mid"),
    divPos: v("--div-pos"),
    good: v("--status-good"),
    warning: v("--status-warning"),
    critical: v("--status-critical"),
    font: v("--ff-sans"),
    labelFont: v("--label-font"),
  }
}

/** Calls back when the direction or light/dark mode changes on <html>. */
export function observeTheme(callback: () => void, root: HTMLElement = document.documentElement) {
  const observer = new MutationObserver(callback)
  observer.observe(root, { attributes: true, attributeFilter: ["data-direction", "class"] })
  return () => observer.disconnect()
}
