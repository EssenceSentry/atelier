import { defaultDirectives } from "myst-directives"
import { proofDirective } from "myst-ext-proof"
import { tabDirectives } from "myst-ext-tabs"
import { mystParse } from "myst-parser"
import { defaultRoles } from "myst-roles"

export type MystNode = {
  type: string
  children?: MystNode[]
  value?: string
  depth?: number
  label?: string
  identifier?: string
  url?: string
  lang?: string
  name?: string
  kind?: string
  args?: string
  title?: string
  checked?: boolean
  ordered?: boolean
  start?: number
  options?: Record<string, unknown>
}
export type ParsedDocument = {
  tree: MystNode | null
  labels: [string, string][]
  unsupported: string[]
  error: string
}
const plain = (node: MystNode): string => node.value ?? node.children?.map(plain).join("") ?? ""
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
self.onmessage = (event: MessageEvent<string>) => {
  try {
    const tree = mystParse(event.data, {
      directives: [...defaultDirectives, proofDirective, ...tabDirectives],
      roles: defaultRoles,
      extensions: {
        math: true,
        colonFences: true,
        tables: true,
        deflist: true,
        tasklist: true,
        citations: true,
      },
    }) as unknown as MystNode
    const labels = new Map<string, string>()
    const unsupported = new Set<string>()
    let equation = 0,
      theorem = 0
    const visit = (node: MystNode) => {
      const id = node.identifier ?? node.label
      if (id && ["mystTarget", "math", "proof"].includes(node.type))
        labels.set(
          id,
          node.type === "math"
            ? `(${++equation})`
            : node.type === "proof"
              ? `${(node.kind ?? "Theorem").replace(/^./, (char) => char.toUpperCase())} ${++theorem}`
              : id
        )
      if (node.type === "mystDirective" && !node.children?.length)
        unsupported.add(node.name ?? "unknown")
      if (node.type === "heading") labels.set(slug(plain(node)), plain(node))
      node.children?.forEach(visit)
    }
    visit(tree)
    tree.children?.forEach((node, index) => {
      const next = tree.children?.[index + 1]
      if (node.type === "mystTarget" && node.label && next?.type === "heading")
        labels.set(node.label, plain(next))
    })
    self.postMessage({
      tree,
      labels: [...labels],
      unsupported: [...unsupported],
      error: "",
    } satisfies ParsedDocument)
  } catch (cause) {
    self.postMessage({
      tree: null,
      labels: [],
      unsupported: [],
      error: String(cause),
    } satisfies ParsedDocument)
  }
}
