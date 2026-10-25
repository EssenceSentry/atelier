// Reject commit messages that credit an AI assistant as a co-author.
//   node scripts/check-no-ai-coauthors.mjs .git/COMMIT_EDITMSG
//   node scripts/check-no-ai-coauthors.mjs --range origin/main..HEAD
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const aiCredit =
  /^\s*co-authored-by:.*\b(claude|anthropic|copilot|openai|chatgpt|codex|gemini)\b|generated with \[?claude/i

function messages(args) {
  if (args[0] === "--range" && args[1]) {
    const log = execFileSync("git", ["log", "--format=%H%x00%B%x01", args[1]], { encoding: "utf8" })
    return log
      .split("\x01")
      .filter((record) => record.includes("\x00"))
      .map((record) => {
        const [commit, body] = record.replace(/^\n+/, "").split("\x00")
        return [commit.slice(0, 12), body]
      })
  }
  if (args[0]) return [[args[0], readFileSync(args[0], "utf8")]]
  throw new Error("give a commit message file or --range <revisions>")
}

const found = messages(process.argv.slice(2)).flatMap(([source, body]) =>
  body
    .split("\n")
    .filter((line) => aiCredit.test(line))
    .map((line) => `${source}: ${line.trim()}`)
)
if (found.length) {
  console.error(found.join("\n"))
  console.error("Remove AI co-author credits from these messages.")
  process.exit(1)
}
