import { cp, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const recipes = JSON.parse(await readFile(path.join(root, "recipes/index.json"), "utf8"))
const [name, output] = process.argv.slice(2)
if (!name || name === "--list") {
  console.log(
    recipes
      .map(
        (recipe) =>
          `${recipe.id.padEnd(20)} ${recipe.profile.padEnd(9)} ${recipe.families.join(", ")}`
      )
      .join("\n")
  )
} else {
  if (!recipes.some((recipe) => recipe.id === name) || !output)
    throw new Error("Usage: node new.mjs RECIPE /absolute/output-folder (or --list)")
  // A recipe is two editable text files. No git init, install, transpiler or build.
  await mkdir(output, { recursive: false })
  await cp(path.join(root, "recipes", name), output, {
    recursive: true,
    force: false,
    errorOnExist: true,
  })
  console.log(`Recipe copied to ${path.resolve(output)}`)
}
