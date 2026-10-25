// Fails on a <Button> that does nothing when clicked: no onClick, no link or
// trigger render, and not a form submit. A button the app has not wired yet
// should be a NotBuiltButton, which says so when clicked.
//   node scripts/check-inert-buttons.mjs src
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"

const roots = process.argv.slice(2)
const acts = new Set(["onClick", "render", "type", "nativeButton", "asChild", "href", "form"])

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (path.endsWith(".tsx")) yield path
  }
}

const problems = []
for (const root of roots) {
  for (const path of files(root)) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true
    )
    const visit = (node) => {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : undefined
      // A Button passed as another component's `render` gets its behaviour
      // from that component, such as a tooltip or menu trigger.
      const rendered =
        node.parent !== undefined &&
        ts.isJsxExpression(node.parent) &&
        node.parent.parent !== undefined &&
        ts.isJsxAttribute(node.parent.parent) &&
        node.parent.parent.name.getText(source) === "render"
      if (opening && opening.tagName.getText(source) === "Button" && !rendered) {
        const names = opening.attributes.properties.map((p) =>
          ts.isJsxAttribute(p) ? p.name.getText(source) : "..."
        )
        if (!names.some((name) => acts.has(name) || name === "..."))
          problems.push(
            `${relative(process.cwd(), path)}:${source.getLineAndCharacterOfPosition(opening.getStart()).line + 1}: <Button> with no action`
          )
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
}

if (problems.length) {
  console.log(problems.join("\n"))
  console.log("Wire the button, or use NotBuiltButton from src/blocks/states.tsx until it is.")
  process.exit(1)
}
