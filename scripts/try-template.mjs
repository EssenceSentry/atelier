// Generate a project from this template and run every gate it ships with.
//   node scripts/try-template.mjs --kind review --theme editorial [--no-artifact] [--keep DIR]
// The project is generated with Copier's setup tasks, committed through its
// own hooks (a failing gate fails the commit), and then put through the push
// gates: build, screenshots and, when enabled, the artifact check.
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"

const root = resolve(import.meta.dirname, "..")
const { values } = parseArgs({
  options: {
    kind: { type: "string", default: "monitor" },
    theme: { type: "string", default: "instrument" },
    "no-artifact": { type: "boolean", default: false },
    visibility: { type: "string", default: "private" },
    keep: { type: "string" },
  },
})

// The generated project installs and runs on its own, without npm settings
// inherited from a parent `npm run`.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_/i.test(key)))

function run(command, args, cwd) {
  console.log(`$ ${command} ${args.join(" ")}`)
  execFileSync(command, args, { cwd, env, stdio: "inherit" })
}

const scratch = values.keep ? null : mkdtempSync(join(tmpdir(), "atelier-"))
const project = values.keep ? resolve(values.keep) : join(scratch, "project")
const label = `${values.kind}/${values.theme}${values["no-artifact"] ? "/no-artifact" : ""}`

try {
  run(
    "uvx",
    [
      "copier@9.19.1",
      "copy",
      "--trust",
      "--defaults",
      "--vcs-ref=HEAD",
      "--data=project_name=Run Watch",
      "--data=description=Live status of nightly embedding runs",
      `--data=kind=${values.kind}`,
      `--data=theme=${values.theme}`,
      `--data=artifact=${!values["no-artifact"]}`,
      `--data=visibility=${values.visibility}`,
      root,
      project,
    ],
    root
  )
  const files = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: project,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
  run("git", ["add", "--", ...files], project)
  run(
    "git",
    [
      "-c",
      "user.name=atelier",
      "-c",
      "user.email=atelier@example.invalid",
      "commit",
      "-qm",
      "Start from atelier",
    ],
    project
  )
  run("npx", ["lefthook", "run", "pre-push", "--all-files", "--no-tty"], project)
  const shots = readdirSync(join(project, "checks")).filter((name) => name.endsWith(".png"))
  if (shots.length < 4) throw new Error(`expected at least 4 screenshots, found ${shots.length}`)
  console.log(`${label}: every gate passed (${shots.length} screenshots)`)
} finally {
  if (scratch && existsSync(scratch)) rmSync(scratch, { recursive: true, force: true })
}
