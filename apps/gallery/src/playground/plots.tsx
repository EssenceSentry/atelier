import { vegaConfig } from "@atelier/theme/vega"
import { Check, Copy, Download, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import embed, { type VisualizationSpec } from "vega-embed"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download, groups, samples } from "./data"
import { families, type Recipe, recipeSpec, recipes } from "./plot-recipes"

function Plot({
  recipe,
  measure,
  region,
  small = false,
}: {
  recipe: Recipe
  measure: "score" | "volume"
  region: string
  small?: boolean
}) {
  const tokens = useVizTokens()
  const element = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [visible, setVisible] = useState(!small)
  const [error, setError] = useState("")
  useEffect(() => {
    const host = element.current
    if (!host) return
    const resize = new ResizeObserver(([box]) => setWidth(Math.floor(box.contentRect.width)))
    const intersection = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          intersection.disconnect()
        }
      },
      { rootMargin: "300px" }
    )
    resize.observe(host)
    intersection.observe(host)
    return () => {
      resize.disconnect()
      intersection.disconnect()
    }
  }, [])
  useEffect(() => {
    if (!tokens || !element.current || !visible || width < 80) return
    let disposed = false
    let finalize: (() => void) | undefined
    const host = element.current
    host.dataset.ready = "false"
    const spec = recipeSpec(recipe.id, measure, region)
    if (small && recipe.engine === "vega") delete spec.legends
    const isFacet = recipe.id === "violin"
    const comparison = ["bar", "dot", "lollipop", "interval", "errorbar", "strip"].includes(
      recipe.id
    )
    const height = canvasOnly
      ? innerHeight - 90
      : small
        ? 140
        : comparison
          ? region
            ? 116
            : 216
          : width < 480
            ? 250
            : 320
    const config = vegaConfig(tokens, small)
    void embed(
      host,
      {
        ...spec,
        width: isFacet ? Math.max(35, (width - 80) / (region ? 1 : 3)) : width - 16,
        height,
        ...(isFacet
          ? {
              spec: {
                ...(spec.spec as object),
                width: Math.max(35, (width - 80) / (region ? 1 : 3)),
                height,
              },
            }
          : { autosize: { type: "fit", contains: "padding" } }),
        config,
      } as VisualizationSpec,
      { mode: recipe.engine === "vega" ? "vega" : "vega-lite", renderer: "svg", actions: false }
    )
      .then((result) => {
        if (disposed) result.finalize()
        else {
          finalize = result.finalize
          host.dataset.ready = "true"
          setError("")
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) setError(String(cause))
      })
    return () => {
      disposed = true
      finalize?.()
    }
  }, [tokens, recipe, measure, region, small, visible, width])
  return (
    <div className={`catalog-plot ${small ? "small" : ""}`} ref={element} data-recipe={recipe.id}>
      {!visible && <span className="demo-meta">Preview loads as you scroll</span>}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default function Plots() {
  const tokens = useVizTokens()
  const [initial] = useState(() =>
    canvasState({ recipe: "bar", measure: "score" as "score" | "volume", region: "" })
  )
  const [selected, setSelected] = useState(initial.recipe)
  const [measure, setMeasure] = useState(initial.measure)
  const [region, setRegion] = useState(initial.region)
  const [family, setFamily] = useState("All")
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(12)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const detail = useRef<HTMLElement>(null)
  const recipe = recipes.find((item) => item.id === selected) ?? recipes[0]
  const filtered = useMemo(
    () =>
      recipes.filter(
        (item) =>
          (family === "All" || item.family === family) &&
          `${item.title} ${item.note} ${item.family}`.toLowerCase().includes(search.toLowerCase())
      ),
    [family, search]
  )
  const raw = recipeSpec(recipe.id, measure, region)
  const spec = {
    $schema:
      recipe.engine === "vega"
        ? "https://vega.github.io/schema/vega/v6.json"
        : "https://vega.github.io/schema/vega-lite/v6.json",
    ...raw,
    ...(raw.facet
      ? { spec: { ...(raw.spec as object), width: 180, height: 340 } }
      : { width: 720, height: 360, autosize: { type: "fit", contains: "padding" } }),
    ...(tokens ? { config: { ...vegaConfig(tokens), background: tokens.surface } } : {}),
  }
  if (canvasOnly)
    return (
      <div className="demo-stack">
        <Plot recipe={recipe} measure={measure} region={region} />
      </div>
    )
  return (
    <div className="demo-stack plot-catalog">
      <section className="demo-panel" ref={detail}>
        <div className="demo-panel-head">
          <div>
            <span className="eyebrow">
              {recipe.family} / {recipe.engine === "vega" ? "Vega" : "Vega-Lite"}
            </span>
            <h2>{recipe.title}</h2>
            <p>{recipe.note}</p>
          </div>
          <div className="demo-toolbar">
            <CanvasTab view="plots" state={{ recipe: selected, measure, region }} />
            <button
              type="button"
              className="demo-button"
              onClick={() => setSourceOpen((value) => !value)}
            >
              {sourceOpen ? "Hide spec" : "View spec"}
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => download(`${recipe.id}.json`, JSON.stringify(spec, null, 2))}
            >
              <Download size={12} /> Spec
            </button>
          </div>
        </div>
        <div className="demo-panel-body catalog-parameters">
          <label className="demo-field">
            <span>Measurement</span>
            <select
              aria-label="Gallery measurement"
              value={measure}
              onChange={(event) => setMeasure(event.target.value as typeof measure)}
            >
              <option value="score">Score</option>
              <option value="volume">Volume</option>
            </select>
          </label>
          <label className="demo-field">
            <span>Records</span>
            <select
              aria-label="Gallery region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="">All regions</option>
              {groups.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
          </label>
          <p className="demo-meta">
            {region ? samples.filter((row) => row.group === region).length : samples.length}{" "}
            synthetic observations
          </p>
        </div>
        <Plot recipe={recipe} measure={measure} region={region} />
        {sourceOpen && (
          <div className="catalog-source">
            <div className="demo-toolbar">
              <span className="demo-meta">Complete specification, including illustrative data</span>
              <button
                type="button"
                className="demo-button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(JSON.stringify(spec, null, 2))
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false))
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy spec"}
              </button>
            </div>
            <pre className="code-preview">{JSON.stringify(spec, null, 2)}</pre>
          </div>
        )}
      </section>
      <div className="catalog-heading">
        <div>
          <h2>Plot gallery</h2>
          <p>
            {filtered.length} / {recipes.length} live recipes · choose one to inspect and export
          </p>
        </div>
        <label className="catalog-search">
          <Search size={15} />
          <input
            type="search"
            className="demo-input"
            aria-label="Search plot recipes"
            value={search}
            placeholder="Find a visualization…"
            onChange={(event) => {
              setSearch(event.target.value)
              setLimit(12)
            }}
          />
        </label>
      </div>
      <fieldset className="catalog-families" aria-label="Plot families">
        {["All", ...families].map((item) => (
          <button
            type="button"
            className="filter-pill"
            aria-pressed={family === item}
            key={item}
            onClick={() => {
              setFamily(item)
              setLimit(12)
            }}
          >
            {item}
          </button>
        ))}
      </fieldset>
      <div className="catalog-series-key group-key">
        {groups.map((group, i) => (
          <span key={group}>
            <i style={{ background: `var(--series-${i + 1})` }} />
            {group}
          </span>
        ))}
        <span className="demo-meta">
          Preview colors follow the displayed field; some charts use one series.
        </span>
      </div>
      {filtered.length ? (
        <div className="catalog-grid">
          {filtered.slice(0, limit).map((item) => (
            <button
              type="button"
              className="catalog-card"
              aria-label={`Inspect ${item.title}`}
              aria-pressed={selected === item.id}
              key={item.id}
              onClick={() => {
                setSelected(item.id)
                setCopied(false)
                detail.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
            >
              <div className="catalog-card-heading">
                <strong>{item.title}</strong>
                <span className="demo-meta">{item.family}</span>
              </div>
              <Plot recipe={item} measure={measure} region={region} small />
              <p>{item.note}</p>
            </button>
          ))}
        </div>
      ) : (
        <section className="demo-panel demo-panel-body">
          <p>No recipes match this search.</p>
          <button
            type="button"
            className="demo-button"
            onClick={() => {
              setSearch("")
              setFamily("All")
            }}
          >
            Show all recipes
          </button>
        </section>
      )}
      {limit < filtered.length && (
        <button
          type="button"
          className="demo-button catalog-more"
          onClick={() => setLimit(filtered.length)}
        >
          Show all {filtered.length} recipes
        </button>
      )}
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Beyond statistical charts</h2>
            <p>Specialized renderers have their own working studies.</p>
          </div>
        </div>
        <div className="catalog-links">
          {[
            ["program", "Probabilistic diagrams"],
            ["spatial", "Spatial canvas"],
            ["science", "3D surfaces"],
            ["sanddance", "Animated unit views"],
            ["recommend", "Recommended charts"],
            ["geometry", "Interactive geometry"],
          ].map(([view, label]) => (
            <a
              key={view}
              href={`?view=${view}&d=${document.documentElement.dataset.direction}&m=${document.documentElement.dataset.theme ?? "system"}`}
            >
              {label} ↗
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
