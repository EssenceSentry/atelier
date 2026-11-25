import hljs from "highlight.js/lib/core"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import python from "highlight.js/lib/languages/python"
import katex from "katex"
import { createElement, Fragment, type ReactNode, useId, useState } from "react"
import type { MystNode as Node } from "./myst-worker"
import "katex/dist/katex.min.css"

hljs.registerLanguage("python", python)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("json", json)

const plain = (node: Node): string => node.value ?? node.children?.map(plain).join("") ?? ""
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
const safeUrl = (value = "") => (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(value) ? value : "#")
function CodeBlock({ value = "", lang = "" }: { value?: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const [failure, setFailure] = useState(false)
  return (
    <div className="myst-code">
      <div>
        <span>{lang || "Text"}</span>
        <button
          type="button"
          className="at-button"
          onClick={() => {
            void navigator.clipboard
              .writeText(value)
              .then(() => {
                setCopied(true)
                setFailure(false)
              })
              .catch(() => setFailure(true))
          }}
        >
          {copied ? <span>✓</span> : <span>Copy</span>}
          {copied ? "Copied" : failure ? "Copy failed" : "Copy code"}
        </button>
      </div>
      <pre>
        {hljs.getLanguage(lang) ? (
          <code
            // biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js escapes source before adding span markup.
            dangerouslySetInnerHTML={{ __html: hljs.highlight(value, { language: lang }).value }}
          />
        ) : (
          <code>{value}</code>
        )}
      </pre>
    </div>
  )
}
function MathNode({
  value = "",
  block,
  label,
  number,
}: {
  value?: string
  block: boolean
  label?: string
  number?: string
}) {
  const markup = katex.renderToString(value, {
    displayMode: block,
    throwOnError: false,
    trust: false,
    strict: "ignore",
  })
  // KaTeX creates the markup with trust disabled; source HTML is never injected.
  return block ? (
    <div className="myst-equation" id={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Only KaTeX's trusted renderer output is inserted, with trust disabled. */}
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      {number && (
        <a href={`#${label}`} aria-label={`Equation ${number}`}>
          {number}
        </a>
      )}
    </div>
  ) : (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: Only KaTeX's trusted renderer output is inserted, with trust disabled.
    <span dangerouslySetInnerHTML={{ __html: markup }} />
  )
}
function Tabs({ node, render }: { node: Node; render: (node: Node, key: string) => ReactNode }) {
  const [active, setActive] = useState(0)
  const uid = useId()
  const tabs = (node.children ?? [])
    .map((child) => (child.type === "mystDirective" ? child.children?.[0] : child))
    .filter((child): child is Node => !!child)
  return (
    <div className="myst-tabs">
      <div role="tablist" aria-label="Document alternatives">
        {tabs.map((tab, i) => (
          <button
            type="button"
            role="tab"
            key={tab.title ?? i}
            id={`${uid}-tab-${i}`}
            aria-controls={`${uid}-panel-${i}`}
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              let next = active
              if (event.key === "ArrowRight") next = (active + 1) % tabs.length
              else if (event.key === "ArrowLeft") next = (active + tabs.length - 1) % tabs.length
              else if (event.key === "Home") next = 0
              else if (event.key === "End") next = tabs.length - 1
              else return
              event.preventDefault()
              setActive(next)
              event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus()
            }}
          >
            {tab.title ?? `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <section
          key={tab.title ?? i}
          role="tabpanel"
          id={`${uid}-panel-${i}`}
          aria-labelledby={`${uid}-tab-${i}`}
          hidden={active !== i}
        >
          {tab.children?.map((child, k) => render(child, `tab-${i}-${k}`))}
        </section>
      ))}
    </div>
  )
}
export function Document({
  tree,
  labels,
  references = {},
}: {
  tree: Node
  labels: Map<string, string>
  references?: Record<string, { label: string; title: string; note?: string }>
}) {
  const render = (node: Node, key: string): ReactNode => {
    const children = node.children?.map((child, i) => render(child, `${key}-${i}`))
    const label = node.identifier ?? node.label
    const props = { ...(label ? { id: label } : {}) }
    switch (node.type) {
      case "root":
      case "mystRole":
      case "tabItem":
        return <Fragment key={key}>{children}</Fragment>
      case "mystDirective":
        return node.children?.length ? (
          <Fragment key={key}>{children}</Fragment>
        ) : (
          <aside className="myst-unsupported" key={key}>
            <strong>Unsupported directive: {node.name}</strong>
            <pre>{node.value}</pre>
          </aside>
        )
      case "mystTarget":
        return <span className="myst-target" key={key} {...props} />
      case "heading":
        return createElement(
          `h${Math.min(6, Math.max(1, node.depth ?? 2))}`,
          { ...props, key, id: label ?? slug(plain(node)) },
          children
        )
      case "paragraph":
        return (
          <p key={key} {...props}>
            {children}
          </p>
        )
      case "text":
        return node.value
      case "strong":
        return (
          <strong key={key} {...props}>
            {children}
          </strong>
        )
      case "emphasis":
        return (
          <em key={key} {...props}>
            {children}
          </em>
        )
      case "delete":
        return (
          <del key={key} {...props}>
            {children}
          </del>
        )
      case "inlineCode":
        return (
          <code key={key} {...props}>
            {node.value}
          </code>
        )
      case "code":
        return <CodeBlock key={key} value={node.value} lang={node.lang} />
      case "inlineMath":
        return <MathNode key={key} value={node.value} block={false} />
      case "math":
        return (
          <MathNode
            key={key}
            value={node.value}
            label={label}
            block
            number={label ? labels.get(label) : undefined}
          />
        )
      case "blockquote":
        return (
          <blockquote key={key} {...props}>
            {children}
          </blockquote>
        )
      case "list":
        return node.ordered ? (
          <ol key={key} {...props} start={node.start}>
            {children}
          </ol>
        ) : (
          <ul key={key} {...props}>
            {children}
          </ul>
        )
      case "listItem":
        return (
          <li key={key} {...props}>
            {typeof node.checked === "boolean" && (
              <input
                type="checkbox"
                aria-label={plain(node)}
                checked={node.checked}
                readOnly
                disabled
              />
            )}
            {children}
          </li>
        )
      case "link":
        return (
          <a key={key} {...props} href={safeUrl(node.url)}>
            {children}
          </a>
        )
      case "crossReference":
        return label && labels.has(label) ? (
          <a key={key} href={`#${label}`}>
            {children?.length ? children : labels.get(label)}
          </a>
        ) : (
          <span className="myst-unresolved" key={key}>
            Unresolved reference: {label}
          </span>
        )
      case "citeGroup":
        return (
          <span key={key}>
            {node.kind === "parenthetical" ? "(" : ""}
            {children}
            {node.kind === "parenthetical" ? ")" : ""}
          </span>
        )
      case "cite":
        return (
          <a key={key} href={`#cite-${label}`}>
            {references[label ?? ""]?.label ?? `Unresolved citation: ${label}`}
          </a>
        )
      case "admonition":
      case "proof":
        return (
          <aside className={`myst-admonition ${node.kind ?? "note"}`} key={key} {...props}>
            {node.type === "proof" && (
              <span className="eyebrow">{labels.get(label ?? "") ?? node.kind}</span>
            )}
            {children}
          </aside>
        )
      case "admonitionTitle":
        return (
          <strong className="myst-admonition-title" key={key} {...props}>
            {children}
          </strong>
        )
      case "details":
        return (
          <details className="myst-details" key={key} {...props}>
            {children}
          </details>
        )
      case "summary":
        return (
          <summary key={key} {...props}>
            {children}
          </summary>
        )
      case "tabSet":
        return <Tabs key={key} node={node} render={render} />
      case "definitionList":
        return (
          <dl key={key} {...props}>
            {children}
          </dl>
        )
      case "definitionTerm":
        return (
          <dt key={key} {...props}>
            {children}
          </dt>
        )
      case "definitionDescription":
        return (
          <dd key={key} {...props}>
            {children}
          </dd>
        )
      case "table":
        return (
          <div className="myst-table-wrap" key={key}>
            <table>
              <tbody>{children}</tbody>
            </table>
          </div>
        )
      case "tableRow":
        return (
          <tr key={key} {...props}>
            {children}
          </tr>
        )
      case "tableCell":
        return (
          <td key={key} {...props}>
            {children}
          </td>
        )
      case "thematicBreak":
        return <hr key={key} />
      case "break":
        return <br key={key} />
      case "html":
        return <CodeBlock key={key} value={node.value} lang="HTML source" />
      default:
        return node.children?.length ? (
          <Fragment key={key}>{children}</Fragment>
        ) : node.value ? (
          <span key={key}>{node.value}</span>
        ) : null
    }
  }
  return (
    <article className="at-prose myst-document">
      {render(tree, "document")}
      <section className="myst-references">
        <h2>References</h2>
        {Object.entries(references).map(([id, reference]) => (
          <div id={`cite-${id}`} key={id}>
            <strong>
              {reference.label}. {reference.title}.
            </strong>
            <p>{reference.note}</p>
          </div>
        ))}
      </section>
    </article>
  )
}
