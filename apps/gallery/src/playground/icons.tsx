import { Icon, type IconifyIcon } from "@iconify/react/offline"
import Panzoom from "@panzoom/panzoom"
import { ArrowUpRight, Check, Copy, Download, Maximize2, Minus, Plus, Search } from "lucide-react"
import { type CSSProperties, useEffect, useRef, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download } from "./data"
import data from "./icon-catalog-data.json"
import "./icons.css"

type CatalogIcon = {
  id: string
  name: string
  family: string
  category: string
  tags: string
  icon: IconifyIcon | null
  svg: string
}
const icons = data as CatalogIcon[]
const families = {
  aws: {
    name: "AWS architecture",
    role: "Official service artwork",
    license: "AWS usage terms",
    source: "https://aws.amazon.com/architecture/icons/",
  },
  carbon: {
    name: "Carbon",
    role: "Data science & model concepts",
    license: "Apache-2.0",
    source: "https://carbondesignsystem.com/guidelines/icons/library/",
  },
  tabler: {
    name: "Tabler",
    role: "Technical symbols & topology",
    license: "MIT",
    source: "https://tabler.io/icons",
  },
  devicon: {
    name: "Devicon",
    role: "Languages, frameworks & tools",
    license: "MIT · brand terms apply",
    source: "https://devicon.dev/",
  },
  logos: {
    name: "SVG Logos",
    role: "Cloud & technology brands",
    license: "CC0 · brand terms apply",
    source: "https://github.com/gilbarbara/logos",
  },
}
const familyInfo = (id: string) => families[id as keyof typeof families]
function artwork(item: CatalogIcon) {
  return item.svg ? (
    <img src={`data:image/svg+xml,${encodeURIComponent(item.svg)}`} alt="" />
  ) : (
    <Icon icon={item.icon as IconifyIcon} aria-hidden="true" />
  )
}
function sourceSVG(item: CatalogIcon, color: string) {
  if (item.svg) return item.svg
  const icon = item.icon as IconifyIcon
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${icon.width ?? 24}" height="${icon.height ?? 24}" viewBox="0 0 ${icon.width ?? 24} ${icon.height ?? 24}" style="color:${color}">${icon.body}</svg>`
}
export default function IconStudy() {
  const tokens = useVizTokens()
  const [family, setFamily] = useState("aws"),
    [query, setQuery] = useState(""),
    [size, setSize] = useState(40)
  const [selected, setSelected] = useState(
    icons.find((icon) => icon.id === "aws:amazon-simple-storage-service") ?? icons[0]
  )
  const [copied, setCopied] = useState(""),
    [error, setError] = useState("")
  const inspector = useRef<HTMLElement>(null)
  const [scene, setScene] = useState(() => canvasState({ scene: "training" }).scene)
  const shown = icons.filter(
    (icon) =>
      (family === "all" || icon.family === family) &&
      `${icon.name} ${icon.id} ${icon.tags} ${icon.category}`
        .toLowerCase()
        .includes(query.toLowerCase().trim())
  )
  const source = sourceSVG(selected, tokens?.ink ?? "currentColor")
  const brand = ["aws", "devicon", "logos"].includes(selected.family)
  const copy = async (what: "svg" | "id") => {
    try {
      await navigator.clipboard.writeText(what === "svg" ? source : selected.id)
      setCopied(what)
      setError("")
    } catch {
      setError("Clipboard access was unavailable. Download the SVG instead.")
    }
  }
  if (canvasOnly)
    return (
      <div className="demo-stack icon-study">
        <CloudIconCanvas scene={scene} />
      </div>
    )
  return (
    <div className="demo-stack icon-study">
      <div className="icon-source-summary">
        <div>
          <strong>One icon family for each job.</strong>
          <p>
            Lucide remains our interface set. These collections add data science, topology,
            technology brands, and official AWS service artwork.
          </p>
        </div>
        <span className="demo-meta">
          {icons.length} curated icons · bundled locally · no icon API
        </span>
      </div>
      <div className="icon-library-strip">
        {Object.entries(families).map(([id, item]) => (
          <button
            type="button"
            className="icon-library-card"
            key={id}
            aria-pressed={family === id}
            onClick={() => {
              setFamily(id)
              setQuery("")
            }}
          >
            <strong>
              {item.name}
              <span>{icons.filter((icon) => icon.family === id).length}</span>
            </strong>
            <p>{item.role}</p>
            <span>{item.license}</span>
          </button>
        ))}
      </div>
      <div className="icon-workspace">
        <section className="demo-panel icon-browser">
          <div className="demo-panel-head">
            <div>
              <h2>Find a symbol</h2>
              <p>
                {shown.length} shown / {icons.length} curated
              </p>
            </div>
            <label className="demo-field">
              <span>Collection</span>
              <select
                aria-label="Icon collection"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option value="all">All collections</option>
                {Object.entries(families).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="icon-search-toolbar">
            <label className="icon-search">
              <Search size={15} />
              <span className="sr-only">Search icons</span>
              <input
                className="demo-input"
                aria-label="Search icons"
                placeholder="Try S3, matrix, pipeline…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="demo-field">
              <span>Preview · {size}px</span>
              <input
                aria-label="Icon preview size"
                type="range"
                min={24}
                max={64}
                step={8}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
          </div>
          {shown.length ? (
            <div
              className="icon-catalog"
              style={{ "--icon-preview-size": `${size}px` } as CSSProperties}
            >
              {shown.map((icon) => (
                <button
                  type="button"
                  className="icon-card"
                  key={icon.id}
                  aria-label={`Inspect ${icon.name} from ${familyInfo(icon.family).name}`}
                  aria-pressed={selected.id === icon.id}
                  onClick={() => {
                    setSelected(icon)
                    if (matchMedia("(max-width: 800px)").matches)
                      requestAnimationFrame(() =>
                        inspector.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      )
                    setCopied("")
                    setError("")
                  }}
                >
                  <span
                    className={`icon-artwork ${["aws", "devicon", "logos"].includes(icon.family) ? "brand-artwork" : ""}`}
                  >
                    {artwork(icon)}
                  </span>
                  <strong>{icon.name}</strong>
                  <span>{familyInfo(icon.family).name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="icon-empty">
              <strong>No icons match this search.</strong>
              <p>Search the other collections or clear the current filters.</p>
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  setFamily("all")
                  setQuery("")
                }}
              >
                Show all icons
              </button>
            </div>
          )}
        </section>
        <aside className="demo-panel icon-inspector" ref={inspector}>
          <div className="demo-panel-head">
            <div>
              <h2>{selected.name}</h2>
              <p>{selected.category}</p>
            </div>
          </div>
          <div className={`icon-inspector-preview ${brand ? "brand-artwork" : ""}`}>
            {artwork(selected)}
          </div>
          <div className="icon-inspector-body">
            <code>{selected.id}</code>
            <div className="demo-toolbar">
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  void copy("svg")
                }}
              >
                {copied === "svg" ? <Check size={13} /> : <Copy size={13} />}
                {copied === "svg" ? "SVG copied" : "Copy SVG"}
              </button>
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  void copy("id")
                }}
              >
                {copied === "id" ? <Check size={13} /> : <Copy size={13} />}
                {copied === "id" ? "ID copied" : "Copy ID"}
              </button>
              <button
                type="button"
                className="demo-button"
                onClick={() => download(`${selected.id.replace(":", "-")}.svg`, source)}
              >
                <Download size={13} />
                SVG
              </button>
            </div>
            {error && (
              <p role="alert" className="demo-error">
                {error}
              </p>
            )}
            <p>
              {brand
                ? "Original brand artwork keeps its colors. The light preview surface preserves its intended appearance."
                : "Technical symbols inherit the active atelier foreground color. SVG export resolves that color for a standalone file."}
            </p>
            <a href={familyInfo(selected.family).source} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight size={12} />
              {familyInfo(selected.family).name} · source and terms
            </a>
            <p>
              {selected.family === "aws"
                ? "Official AWS release · July 31, 2026 · unmodified SVG. Service names and trademarks belong to AWS."
                : familyInfo(selected.family).license}
            </p>
          </div>
        </aside>
      </div>
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Put the icons in an architecture</h2>
            <p>Illustrative AWS flow · official artwork, atelier labels and connectors</p>
          </div>
          <div className="demo-toolbar">
            <label className="demo-field">
              <span>Example</span>
              <select
                aria-label="Cloud architecture example"
                value={scene}
                onChange={(e) => setScene(e.target.value)}
              >
                <option value="training">Training pipeline</option>
                <option value="inference">Inference API</option>
              </select>
            </label>
            <CanvasTab view="icons" state={{ scene }} />
          </div>
        </div>
        <CloudIconCanvas scene={scene} />
      </section>
      <p className="icon-catalog-note">
        This is a curated starting set. Full collections are available through the installed
        packages. AWS is sourced directly from the official package; provider artwork retains its
        own usage terms.
      </p>
    </div>
  )
}

function CloudIconCanvas({ scene }: { scene: string }) {
  const host = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null),
    pan = useRef<ReturnType<typeof Panzoom> | null>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const element = host.current
    if (!element || !svg.current) return
    const observe = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 650))
    observe.observe(element)
    const instance = Panzoom(svg.current, { maxScale: 4, minScale: 0.5, step: 0.25 })
    pan.current = instance
    return () => {
      observe.disconnect()
      instance.destroy()
      pan.current = null
    }
  }, [])
  useEffect(() => {
    if (scene) pan.current?.reset()
  }, [scene])
  const ids =
    scene === "training"
      ? ["amazon-simple-storage-service", "aws-batch", "amazon-sagemaker-ai"]
      : ["amazon-api-gateway", "aws-lambda", "amazon-dynamodb"]
  const descriptions =
    scene === "training"
      ? ["Training data", "Feature processing", "Model training"]
      : ["HTTPS requests", "Prediction function", "Prediction records"]
  return (
    <div className="icon-cloud-canvas" ref={host} data-testid="icon-cloud-canvas">
      <svg
        ref={svg}
        viewBox={narrow ? "0 0 320 660" : "0 0 1020 260"}
        role="img"
        aria-label={scene === "training" ? "AWS training pipeline" : "AWS inference API"}
      >
        {ids.slice(0, -1).map((id, i) => (
          <g key={id}>
            <path
              d={
                narrow
                  ? `M160,${195 + i * 210} L160,${235 + i * 210}`
                  : `M${275 + i * 330},125 L${365 + i * 330},125`
              }
              stroke="var(--viz-axis)"
              strokeWidth={1.5}
              fill="none"
            />
            <path
              d={
                narrow
                  ? `M155,${230 + i * 210} L160,${235 + i * 210} L165,${230 + i * 210}`
                  : `M${360 + i * 330},120 L${365 + i * 330},125 L${360 + i * 330},130`
              }
              stroke="var(--viz-axis)"
              strokeWidth={1.5}
              fill="none"
            />
          </g>
        ))}
        {ids.map((id, i) => {
          const icon = icons.find((item) => item.id === `aws:${id}`)
          if (!icon) return null
          const x = narrow ? 40 : 35 + i * 330,
            y = narrow ? 25 + i * 210 : 40
          return (
            <g key={id}>
              <rect
                x={x}
                y={y}
                width={240}
                height={170}
                rx={7}
                fill="var(--card)"
                stroke="var(--border-strong)"
              />
              <image
                x={x + 88}
                y={y + 22}
                width={64}
                height={64}
                href={`data:image/svg+xml,${encodeURIComponent(icon.svg)}`}
              />
              <text
                x={x + 120}
                y={y + 118}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize={15}
              >
                {icon.name}
              </text>
              <text
                x={x + 120}
                y={y + 143}
                textAnchor="middle"
                fill="var(--viz-text)"
                fontSize={12}
              >
                {descriptions[i]}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="canvas-zoom-tools">
        <button
          type="button"
          className="demo-button"
          aria-label="Zoom architecture icons in"
          onClick={() => pan.current?.zoomIn()}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          className="demo-button"
          aria-label="Zoom architecture icons out"
          onClick={() => pan.current?.zoomOut()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="demo-button"
          aria-label="Fit architecture icons"
          onClick={() => pan.current?.reset()}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  )
}
