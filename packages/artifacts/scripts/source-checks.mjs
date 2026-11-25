// Author source uses plain JS; the template's TS/TSX/CSS check does not cover it.
// This is a design-system guard, not a security boundary or a JavaScript parser.
const palette =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone"
const rules = [
  [/#[0-9a-fA-F]{3,8}\b/g, "literal colour"],
  [/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g, "literal colour function"],
  [/\b(?:colorscale|scheme)\s*:\s*["'][\w-]+["']/g, "literal chart palette"],
  [new RegExp(`\\b[a-z]+(?:-[a-z]+)*-(?:${palette})-\\d{2,3}\\b`, "g"), "palette class"],
]
export function sourceProblems(source) {
  const problems = []
  let skip = false
  source.split("\n").forEach((line, index) => {
    const off = line.match(/check-colours:\s*off\b(.*)/)
    if (off) {
      if (!off[1].replace(/\*\//g, "").trim())
        problems.push({ line: index + 1, kind: "content-colour exemption needs a reason" })
      skip = true
    }
    if (line.includes("check-colours: on")) skip = false
    if (skip) return
    for (const [pattern, kind] of rules)
      for (const match of line.matchAll(pattern))
        problems.push({ line: index + 1, kind, value: match[0] })
  })
  if (skip)
    problems.push({
      line: source.split("\n").length,
      kind: "restore check-colours: on after content colours",
    })
  return problems
}
export function assertSourceStyles(source, filename) {
  const problems = sourceProblems(source)
  if (problems.length)
    throw new Error(
      `${problems.map((item) => `${filename}:${item.line}: ${item.kind}${item.value ? ` ${item.value}` : ""}`).join("\n")}\nUse the adapter defaults, Atelier.tokens(), or CSS tokens. Scope deliberate image/brand/content colours with check-colours: off <reason> / check-colours: on comments.`
    )
}
