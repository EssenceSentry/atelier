import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { pack } from "./pack.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.resolve(process.argv[2] ?? "/private/tmp/atelier-artifact-smoke")
const recipes = JSON.parse(await readFile(path.join(root, "recipes/index.json"), "utf8"))
await mkdir(output, { recursive: true })
for (const recipe of recipes)
  await pack(path.join(root, "recipes", recipe.path), path.join(output, `${recipe.id}.html`))
const source = `const book=Atelier.notebook({title:"Atelier artifact recipes",description:"Prebuilt native-library integrations, shared themes and plain JavaScript authoring. These examples use synthetic data."});
const intro=book.cell({id:"workflow",title:"One-off authoring"});
Atelier.mount("markdown",intro.view,{source:"Copy a recipe, edit its data and native configuration, then package the prebuilt assets. No repository, installation or compilation is needed in the artifact folder. Each recipe has its own delivery profile. The first three-task Luna benchmark is recorded, including its limitations and maintainer fixes."});
for(const recipe of ${JSON.stringify(recipes)}){const cell=book.cell({id:recipe.id,title:recipe.id.replaceAll('-',' '),description:recipe.families.join(' · ')});const link=Atelier.element('a','at-button','Open working example');link.href=recipe.id+'.html';cell.view.append(link,Atelier.element('p','at-note',recipe.profile+' profile'+(recipe.id==='sql'?' · HTTP + sibling worker/WASM assets required':'')));}`
const config = path.join(output, ".recipe-index.json")
await writeFile(path.join(output, ".recipe-index.js"), source)
await writeFile(
  config,
  JSON.stringify({
    title: "Atelier artifact recipes",
    profile: "portable",
    theme: "instrument",
    mode: "light",
    families: ["markdown"],
    source: ".recipe-index.js",
  })
)
await pack(config, path.join(output, "index.html"))
console.log(
  `Packed ${recipes.length} recipes and a review index in ${output}. No compilation used.`
)
