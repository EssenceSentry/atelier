import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import {
  JSONCrack,
  type JSONCrackProps,
  type JSONCrackRef,
  type LayoutDirection,
  type NodeData,
  parseGraph,
} from "jsoncrack-react"
import {
  Braces,
  Check,
  Copy,
  Download,
  FileUp,
  Focus,
  Maximize2,
  Minus,
  Play,
  Plus,
} from "lucide-react"
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download, samples } from "./data"
import "jsoncrack-react/style.css"
import "./json.css"

const examples = {
  model: {
    title: "Coin model",
    document: {
      model: "Beta–Binomial",
      source: "Illustrative synthetic observations",
      prior: { family: "Beta", alpha: 2, beta: 2 },
      observations: { heads: 14, tails: 6 },
      posterior: { family: "Beta", alpha: 16, beta: 8, mean: 16 / 24 },
      prediction: { family: "Bernoulli", probability: 16 / 24 },
      notes: ["Analytic update", "No inference service required"],
      connected: true,
      error: null,
    },
  },
  records: {
    title: "Nested records",
    document: {
      dataset: {
        title: "Illustrative observations",
        total: samples.length,
        preview: samples.slice(0, 6),
      },
      review: { decisions: ["Pending", "Accepted", "Needs review"], local: true, assignee: null },
    },
  },
  taxonomy: {
    title: "Nested taxonomy",
    document: {
      catalog: "Visualization studies",
      families: [
        { name: "Comparison", charts: ["Bar", "Dot", "Lollipop"] },
        { name: "Distribution", charts: ["Histogram", "Box plot", "Violin"] },
        { name: "Interaction", charts: ["Brush", "Pan & zoom", "Selection"] },
      ],
      settings: { theme: "atelier", modes: ["light", "dark"], export: true },
    },
  },
}
const defaultSource = JSON.stringify(examples.model.document, null, 2)
const defaults = {
  exampleName: "model",
  source: defaultSource,
  applied: defaultSource,
  direction: "RIGHT" as LayoutDirection,
  grid: false,
  collapsed: [] as string[],
}
let draft: typeof defaults | null = null
const highlight = HighlightStyle.define([
  { tag: tags.propertyName, class: "code-property" },
  { tag: tags.string, class: "code-string" },
  { tag: [tags.number, tags.bool, tags.null], class: "code-literal" },
  { tag: tags.punctuation, class: "code-operator" },
])
const nodePath = (path: (string | number)[]) =>
  "$" +
  path
    .map((part) =>
      typeof part === "number"
        ? `[${part}]`
        : /^[a-zA-Z_$][\w$]*$/.test(part)
          ? `.${part}`
          : `[${JSON.stringify(part)}]`
    )
    .join("")
function atPath(value: unknown, path: (string | number)[]) {
  let current = value
  for (const part of path) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string | number, unknown>)[part]
  }
  return current
}

export default function JsonStudy() {
  const tokens = useVizTokens()
  const [initial] = useState(() => (canvasOnly ? canvasState(defaults) : (draft ?? defaults)))
  const [exampleName, setExampleName] = useState(initial.exampleName)
  const [source, setSource] = useState(initial.source)
  const [applied, setApplied] = useState(initial.applied)
  const [direction, setDirection] = useState<LayoutDirection>(initial.direction)
  const [grid, setGrid] = useState(initial.grid)
  const [collapsed, setCollapsed] = useState(initial.collapsed)
  const [selected, setSelected] = useState<NodeData | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState("")
  const graph = useRef<JSONCrackRef>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const viewport = useRef<Parameters<NonNullable<JSONCrackProps["onViewportCreate"]>>[0] | null>(
    null
  )
  const framed = useRef(false)
  const editorHost = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorView | null>(null)
  const text = useRef(source)
  const applyRef = useRef<() => void>(() => {})
  const data = useMemo(() => JSON.parse(applied) as unknown, [applied])
  const parsed = useMemo(() => parseGraph(applied), [applied])
  const selectedPath = selected?.path ?? []
  const value = atPath(data, selectedPath)
  const pathLabel = nodePath(selectedPath)
  const focusRoot = useCallback(() => {
    const root = canvasHost.current?.querySelector("g[id$='node-1']")
    if (!root || !viewport.current) {
      graph.current?.focusFirstNode()
      return
    }
    const area = viewport.current.translateClientRectToVirtualSpace(root.getBoundingClientRect())
    const width = canvasHost.current?.clientWidth ?? area.width
    // Keep text at its intended size. On narrow screens start at the root's
    // left edge; the user can pan to values and follow branches from there.
    viewport.current.camera.recenter(
      area.left + Math.min(area.width, width - 36) / 2,
      area.top + area.height / 2,
      1
    )
  }, [])
  useEffect(() => {
    const host = canvasHost.current
    if (!tokens || !host || framed.current || host.clientWidth > 540) return
    let settle: ReturnType<typeof setTimeout> | undefined
    let visible = false
    const frame = () => {
      const space = host.querySelector(".jsoncrack-space")
      if (
        !visible ||
        !space ||
        (space as HTMLElement).style.opacity !== "1" ||
        !host.querySelector("g[id$='node-1']")
      )
        return
      framed.current = true
      observer.disconnect()
      intersection.disconnect()
      // Let the package finish its initial fit and SVG measurements first.
      settle = setTimeout(focusRoot, 200)
    }
    const observer = new MutationObserver(frame)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      frame()
    })
    observer.observe(host, { subtree: true, attributes: true, childList: true })
    intersection.observe(host)
    frame()
    return () => {
      observer.disconnect()
      intersection.disconnect()
      clearTimeout(settle)
    }
  }, [tokens, focusRoot])
  useEffect(() => {
    if (!canvasOnly) draft = { exampleName, source, applied, direction, grid, collapsed }
  }, [exampleName, source, applied, direction, grid, collapsed])
  const apply = useCallback(() => {
    try {
      if (text.current.length > 1000000)
        throw new Error("Choose a JSON document smaller than 1 MB.")
      JSON.parse(text.current)
      parseGraph(text.current)
      setApplied(text.current)
      setSelected(null)
      setCollapsed([])
      setError("")
      setMessage("Graph updated from the editor.")
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : String(cause)} The graph still shows the last valid document.`
      )
    }
  }, [])
  applyRef.current = apply
  useEffect(() => {
    if (!editorHost.current) return
    const view = new EditorView({
      parent: editorHost.current,
      state: EditorState.create({
        doc: text.current,
        extensions: [
          json(),
          syntaxHighlighting(highlight),
          history(),
          lineNumbers(),
          highlightActiveLine(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": "JSON source", spellcheck: "false" }),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            {
              key: "Mod-Enter",
              run: () => {
                applyRef.current()
                return true
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              text.current = update.state.doc.toString()
              setSource(text.current)
              setExampleName("")
            }
          }),
          EditorView.theme({
            "&": { color: "var(--foreground)", backgroundColor: "var(--card)", fontSize: "12px" },
            ".cm-content": {
              fontFamily: "var(--ff-mono)",
              padding: "17px 0",
              caretColor: "var(--primary)",
              minHeight: "430px",
            },
            ".cm-line": { lineHeight: "1.85", padding: "0 16px" },
            ".cm-gutters": {
              backgroundColor: "var(--card)",
              color: "var(--muted-foreground)",
              border: "none",
              fontFamily: "var(--ff-mono)",
              fontSize: "11px",
              paddingLeft: "6px",
            },
            ".cm-activeLine": { backgroundColor: "var(--primary-soft)" },
            ".cm-cursor": { borderLeftColor: "var(--primary)" },
            "&.cm-focused": { outline: "none" },
            ".cm-scroller": { overflow: "auto" },
          }),
        ],
      }),
    })
    editor.current = view
    return () => {
      view.destroy()
      editor.current = null
    }
  }, [])
  const replaceSource = (value: string, render = false) => {
    text.current = value
    setSource(value)
    editor.current?.dispatch({
      changes: { from: 0, to: editor.current.state.doc.length, insert: value },
    })
    if (render) applyRef.current()
  }
  const format = () => {
    try {
      replaceSource(JSON.stringify(JSON.parse(text.current), null, 2))
      setError("")
      setMessage("Source formatted. Render to update the graph.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const importFile = async (file?: File) => {
    if (!file) return
    if (file.size > 1000000) {
      setError("Choose a JSON document smaller than 1 MB.")
      return
    }
    try {
      const value = await file.text()
      JSON.parse(value)
      replaceSource(value, true)
      setFileName(file.name)
      setExampleName("")
    } catch (cause) {
      setError(
        `Could not open ${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`
      )
    }
  }
  const variables = {
    "--bg-color": "var(--card)",
    "--line-color-1": "var(--border)",
    "--line-color-2": "var(--viz-grid)",
    "--edge-stroke": "var(--viz-axis)",
    "--node-fill": "var(--card)",
    "--node-stroke": "var(--border-strong)",
    "--interactive-normal": "var(--ink-2)",
    "--background-node": "var(--card)",
    "--node-text": "var(--foreground)",
    "--node-key": "var(--primary-ink)",
    "--node-value": "var(--ink-2)",
    "--node-integer": "var(--status-critical-ink)",
    "--node-null": "var(--muted-foreground)",
    "--node-bool-true": "var(--status-good)",
    "--node-bool-false": "var(--status-critical-ink)",
    "--node-child-count": "var(--muted-foreground)",
    "--node-divider": "var(--border)",
    "--text-positive": "var(--primary-ink)",
    "--background-modifier-accent": "var(--primary-soft)",
    "--spinner-track": "var(--border)",
    "--spinner-head": "var(--primary)",
    "--overlay-bg": "var(--card)",
  } as CSSProperties
  const canvas = (
    <div className="json-canvas" data-testid="json-canvas" ref={canvasHost}>
      {parsed.nodes.length === 0 ? (
        <div className="json-limit">
          <Braces size={25} />
          <strong>No branches to draw.</strong>
          <p>
            The root is {applied.trim() || "empty"}. Its complete value is available in the
            inspector below.
          </p>
        </div>
      ) : (
        tokens && (
          <JSONCrack
            ref={graph}
            onViewportCreate={(value) => {
              viewport.current = value
            }}
            json={applied}
            theme={
              (matchMedia("(prefers-color-scheme: dark)").matches &&
                !document.documentElement.dataset.theme) ||
              document.documentElement.dataset.theme === "dark"
                ? "dark"
                : "light"
            }
            layoutDirection={direction}
            showControls={false}
            showGrid={grid}
            centerOnLayout
            maxRenderableNodes={500}
            style={variables}
            collapsedPaths={collapsed}
            onToggleCollapse={(path) => {
              const key = JSON.stringify(path)
              setCollapsed((current) =>
                current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
              )
            }}
            onNodeClick={(node) => {
              setSelected(node)
              setCopied(false)
            }}
            onParseError={(cause) => setError(cause.message)}
            renderNodeLimitExceeded={(count, limit) => (
              <div className="json-limit">
                <Braces size={25} />
                <strong>
                  {count} nodes exceed this preview's {limit}-node limit.
                </strong>
                <p>
                  Choose a smaller section of the JSON source and render again. The complete applied
                  document is still available to export.
                </p>
              </div>
            )}
          />
        )
      )}
      <div className="canvas-zoom-tools">
        <button
          type="button"
          className="demo-button"
          aria-label="Zoom JSON in"
          onClick={() => graph.current?.zoomIn()}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          className="demo-button"
          aria-label="Zoom JSON out"
          onClick={() => graph.current?.zoomOut()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="demo-button"
          aria-label="Fit JSON graph"
          onClick={() => graph.current?.centerView()}
        >
          <Maximize2 size={15} />
        </button>
        <button
          type="button"
          className="demo-button"
          aria-label="Focus JSON root"
          onClick={focusRoot}
        >
          <Focus size={15} />
        </button>
      </div>
    </div>
  )
  if (canvasOnly) return <div className="demo-stack json-canvas-only">{canvas}</div>
  return (
    <div className="demo-stack json-study">
      <div className="json-toolbar">
        <label className="demo-field">
          <span>Example document</span>
          <select
            aria-label="JSON example"
            value={exampleName}
            onChange={(event) => {
              replaceSource(
                JSON.stringify(
                  examples[event.target.value as keyof typeof examples].document,
                  null,
                  2
                ),
                true
              )
              setFileName("")
              setExampleName(event.target.value)
            }}
          >
            <option value="" disabled>
              Custom document
            </option>
            {Object.entries(examples).map(([key, item]) => (
              <option key={key} value={key}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="demo-button json-file">
          <FileUp size={13} /> Open JSON
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Open JSON file"
            onChange={(event) => {
              void importFile(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </label>
        <span className="demo-meta">{fileName || "Illustrative local document"}</span>
        <span className="demo-meta json-parse-status" role="status">
          {source === applied ? "Graph up to date" : "Source changed · render to update"}
        </span>
      </div>
      <div className="json-workspace">
        <section className="demo-panel json-source-panel">
          <div className="demo-panel-head">
            <div>
              <h2>JSON source</h2>
              <p>⌘ / Ctrl + Enter to render</p>
            </div>
            <div className="demo-toolbar">
              <button type="button" className="demo-button" onClick={format}>
                Format
              </button>
              <button type="button" className="demo-button primary" onClick={apply}>
                <Play size={12} /> Render JSON
              </button>
            </div>
          </div>
          <div className="json-source" ref={editorHost} />
          <div className="demo-panel-note">
            The graph updates when you render a valid document. Editing stays local to this browser.
          </div>
        </section>
        <section className="demo-panel json-graph-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Explore the structure</h2>
              <p>
                {parsed.nodes.length} nodes · {parsed.edges.length} links · {collapsed.length}{" "}
                collapsed branches
              </p>
            </div>
            <div className="demo-toolbar">
              <CanvasTab
                view="json"
                state={{ source: applied, applied, direction, grid, collapsed }}
              />
              <button
                type="button"
                className="demo-button"
                onClick={() => download("explored-document.json", applied)}
              >
                <Download size={12} /> JSON
              </button>
            </div>
          </div>
          <div className="json-graph-options">
            <label>
              <span>Direction</span>
              <select
                aria-label="JSON layout direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value as LayoutDirection)}
              >
                {[
                  ["RIGHT", "Left to right"],
                  ["DOWN", "Top to bottom"],
                  ["LEFT", "Right to left"],
                  ["UP", "Bottom to top"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="demo-checkbox">
              <input
                type="checkbox"
                checked={grid}
                onChange={(event) => setGrid(event.target.checked)}
              />{" "}
              Grid
            </label>
            <button
              type="button"
              className="demo-button"
              onClick={() =>
                setCollapsed(
                  Object.entries(data !== null && typeof data === "object" ? data : {})
                    .filter(([, value]) => value !== null && typeof value === "object")
                    .map(([key]) => JSON.stringify([Array.isArray(data) ? Number(key) : key]))
                )
              }
            >
              Collapse branches
            </button>
            <button
              type="button"
              className="demo-button"
              disabled={!collapsed.length}
              onClick={() => setCollapsed([])}
            >
              Expand all
            </button>
          </div>
          {canvas}
        </section>
      </div>
      {error && (
        <p role="alert" className="demo-panel json-error">
          {error}
        </p>
      )}
      <section className="demo-panel json-inspector">
        <div className="demo-panel-head">
          <div>
            <h2>{selected ? "Selected node" : "Document root"}</h2>
            <p>Click a graph node to inspect its path and complete value.</p>
          </div>
          <button
            type="button"
            className="demo-button"
            onClick={() => {
              void navigator.clipboard
                .writeText(pathLabel)
                .then(() => setCopied(true))
                .catch(() =>
                  setMessage("Could not copy the path. Select it below to copy manually.")
                )
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy path"}
          </button>
        </div>
        <div className="json-inspector-body">
          <code className="json-path">{pathLabel}</code>
          <pre className="code-preview">
            {JSON.stringify(value, null, 2) ?? "No value at this path."}
          </pre>
        </div>
      </section>
      <p className="demo-meta" role="status">
        {message ||
          "JSON Crack renders the real graph; all values in the starter examples are illustrative."}
      </p>
    </div>
  )
}
