// Fails on text sizes off the type scale, such as text-[12.8px] beside 12 and
// 13: steps that small read as mistakes, not hierarchy.
//   node scripts/check-type-scale.mjs src
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

// Small steps for interface text, then display sizes for figures and titles.
const SCALE = [11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 28, 32, 40, 48, 56, 72]

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (/\.(tsx?|css)$/.test(path)) yield path
  }
}

const problems = []
for (const root of process.argv.slice(2)) {
  for (const path of files(root)) {
    readFileSync(path, "utf8")
      .split("\n")
      .forEach((line, index) => {
        for (const [, value, unit] of line.matchAll(/text-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
          const px = unit === "rem" ? Number(value) * 16 : Number(value)
          if (!SCALE.includes(px))
            problems.push(`${relative(process.cwd(), path)}:${index + 1}: text-[${value}${unit}]`)
        }
      })
  }
}

if (problems.length) {
  console.log(problems.join("\n"))
  console.log(`Use a size on the scale: ${SCALE.join(", ")} px.`)
  process.exit(1)
}
