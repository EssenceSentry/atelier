// Contrast of every text token on every surface, per direction and mode,
// computed from the token values rather than estimated from screenshots.
//   node packages/theme/scripts/contrast.mjs            # table of failures
//   node packages/theme/scripts/contrast.mjs --all      # every pair
// Exits 1 when a text token falls below 4.5:1 on a surface. `faint` is meant
// for decoration and large text only, so it is held to 3:1.
//
// The lead panel and the app bar are surfaces too. Their fills may be
// gradients, so text is measured on every colour stop, and where a direction
// gives them their own mode (a dark lead on a light page) the text tokens are
// read from that mode's side.
import { readFileSync } from "node:fs"
import { join } from "node:path"

const directions = ["instrument", "editorial", "console"]
const texts = {
  foreground: 4.5,
  "ink-2": 4.5,
  "muted-foreground": 4.5,
  "primary-ink": 4.5,
  // Chart ticks and annotations, 11px.
  "viz-text": 4.5,
  // The low end of score ramps is data, so it must stay visible.
  "viz-ramp-low": 3,
  faint: 3,
}
const surfaces = [
  "card",
  "page",
  "sunken",
  "muted",
  "primary-soft",
  "raised",
  "popover",
  "secondary",
]
// Surfaces with a fill and a mode of their own.
const ownMode = ["lead", "masthead"]
const showAll = process.argv.includes("--all")

function luminance(hex) {
  const channel = (i) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function tokens(direction) {
  const css = readFileSync(
    join(import.meta.dirname, "../src/directions", `${direction}.css`),
    "utf8"
  )
  const values = {}
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const pair = value.match(/^light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)$/i)
    if (pair) values[name] = { light: pair[1], dark: pair[2] }
    else if (/^#[0-9a-f]{6}$/i.test(value.trim()))
      values[name] = { light: value.trim(), dark: value.trim() }
  }
  // Aliases such as `--viz-text: var(--muted-foreground)` take their target's pair.
  for (const [, name, target] of css.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\);/g))
    if (values[target]) values[name] = values[target]
  return { values, css }
}

/** The colour stops of a surface's fill and the mode it forces, if any. */
function ownSurface(css, values, name) {
  const fill = css.match(new RegExp(`--${name}-fill:\\s*([^;]+);`))?.[1] ?? ""
  const mode = css.match(new RegExp(`--${name}-mode:\\s*([\\w-]+);`))?.[1]
  const alias = fill.match(/^var\(--([\w-]+)\)$/)
  const stops = alias
    ? [values[alias[1]]].filter(Boolean)
    : [...fill.matchAll(/light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)|(#[0-9a-f]{6})/gi)].map(
        ([, light, dark, flat]) => ({ light: light ?? flat, dark: dark ?? flat })
      )
  return { stops, forced: mode === "light" || mode === "dark" ? mode : null }
}

let failures = 0
function report(direction, mode, text, surface, value, minimum) {
  const failed = value < minimum
  failures += failed ? 1 : 0
  if (!failed && !showAll) return
  const mark = failed ? "FAIL" : "ok  "
  console.log(
    `${mark} ${direction.padEnd(10)} ${mode.padEnd(5)} ${text.padEnd(16)} on ${surface.padEnd(15)} ${value.toFixed(2)}:1 (needs ${minimum}:1)`
  )
}

for (const direction of directions) {
  const { values, css } = tokens(direction)
  for (const mode of ["light", "dark"]) {
    for (const [text, minimum] of Object.entries(texts)) {
      if (!values[text]) continue
      for (const surface of surfaces) {
        if (!values[surface]) continue
        report(
          direction,
          mode,
          text,
          surface,
          ratio(values[text][mode], values[surface][mode]),
          minimum
        )
      }
      for (const name of ownMode) {
        const { stops, forced } = ownSurface(css, values, name)
        const side = forced ?? mode
        stops.forEach((stop, index) => {
          report(
            direction,
            mode,
            text,
            `${name} stop ${index + 1}`,
            ratio(values[text][side], stop[side]),
            minimum
          )
        })
      }
    }
  }
}
console.log(
  failures
    ? `${failures} text/surface pairs below their minimum`
    : "every text token clears its minimum"
)
process.exit(failures ? 1 : 0)
