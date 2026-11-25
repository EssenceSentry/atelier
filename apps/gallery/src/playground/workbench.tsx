import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Braces,
  ChevronDown,
  Layers,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Sun,
} from "lucide-react"
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DIRECTIONS, type Direction, MODES, type Mode } from "../theme/board"
import { canvasOnly } from "./canvas-tab"
import { useNotebookFlow } from "./notebook-flow"
import { studies } from "./study-pages"
import "./notebook.css"

const first = new URLSearchParams(location.search)
const initialDirection = DIRECTIONS.includes(first.get("d") as Direction)
  ? (first.get("d") as Direction)
  : "instrument"
const initialMode = MODES.includes(first.get("m") as Mode) ? (first.get("m") as Mode) : "light"

const pageOrder = [
  "notebook",
  "explore",
  "plots",
  "sanddance",
  "recommend",
  "program",
  "neural",
  "geometry",
  "science",
  "spatial",
  "query",
  "inputs",
  "grid",
  "rich-table",
  "json",
  "writing",
  "myst",
  "media",
  "carousel",
  "chat",
  "icons",
]
const pages = [...studies].sort((a, b) => pageOrder.indexOf(a.id) - pageOrder.indexOf(b.id))
type Navigation = "sidebar" | "top"
function initialNavigation(): Navigation {
  const requested = first.get("nav")
  if (requested === "top" || requested === "sidebar") return requested
  try {
    return localStorage.getItem("atelier-notebook-navigation") === "top" ? "top" : "sidebar"
  } catch {
    return "sidebar"
  }
}

export function Workbench() {
  const [direction, setDirection] = useState<Direction>(initialDirection)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [active, setActive] = useState(() =>
    pages.some((item) => item.id === first.get("view")) ? (first.get("view") as string) : "notebook"
  )
  const [visited, setVisited] = useState([active])
  const [navigation, setNavigation] = useState<Navigation>(initialNavigation)
  const [navOpen, setNavOpen] = useState(false)
  const [phone, setPhone] = useState(() => matchMedia("(max-width: 760px)").matches)
  const pageRoot = useRef<HTMLDivElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const flow = useNotebookFlow(active, pageRoot)
  const experiment = pages.find((item) => item.id === active) ?? pages[0]
  const pageIndex = pages.indexOf(experiment)
  const previous = pages[pageIndex - 1],
    next = pages[pageIndex + 1]
  const route = useRef<(id: string, record?: boolean) => void>(() => {})
  useEffect(() => {
    if (navigation !== "sidebar" || !flow.current) return
    const link = shell.current?.querySelector<HTMLElement>(
      ` .notebook-sidebar-outline a[href="#${flow.current}"]`
    )
    const list = link?.closest("nav")
    if (!link || !list) return
    const item = link.getBoundingClientRect(),
      area = list.getBoundingClientRect()
    if (item.top < area.top) list.scrollTop -= area.top - item.top + 10
    else if (item.bottom > area.bottom) list.scrollTop += item.bottom - area.bottom + 10
  }, [flow.current, navigation])
  useEffect(() => {
    const root = shell.current
    const bar = root?.querySelector<HTMLElement>(".workbench-topbar")
    const tools = root?.querySelector<HTMLElement>(".notebook-toolbar")
    if (!root || !bar || !tools) return
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--notebook-bar", `${Math.ceil(bar.getBoundingClientRect().height)}px`)
      root.style.setProperty(
        "--notebook-tools",
        `${Math.ceil(tools.getBoundingClientRect().height)}px`
      )
    })
    observer.observe(bar)
    observer.observe(tools)
    return () => observer.disconnect()
  }, [])

  const navigate = (id: string, record = true) => {
    if (!pages.some((item) => item.id === id)) return
    setNavOpen(false)
    if (id === active) {
      if (!record) flow.jump(location.hash.slice(1), false)
      return
    }
    flow.prepare(id, record ? "" : location.hash.slice(1))
    pageRoot.current
      ?.querySelectorAll<HTMLMediaElement>(
        `[data-notebook-page="${active}"] audio, [data-notebook-page="${active}"] video`
      )
      .forEach((media) => {
        media.pause()
      })
    window.dispatchEvent(new CustomEvent("atelier:notebook-page", { detail: id }))
    if (record) {
      const url = new URL(location.href)
      url.searchParams.set("view", id)
      url.hash = ""
      history.pushState(null, "", url)
    }
    setVisited((items) => (items.includes(id) ? items : [...items, id]))
    setActive(id)
  }
  route.current = navigate
  useLayoutEffect(() => {
    document.documentElement.dataset.direction = direction
    if (mode === "system") delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = mode
  }, [direction, mode])
  useEffect(() => {
    const query = new URLSearchParams({ d: direction, m: mode, view: experiment.id })
    if (canvasOnly) query.set("canvas", "1")
    else query.set("nav", navigation)
    history.replaceState(null, "", `?${query}${location.hash}`)
    document.title = `${experiment.name} · atelier notebook`
    if (!canvasOnly)
      try {
        localStorage.setItem("atelier-notebook-navigation", navigation)
      } catch {
        /* Storage may be disabled in the artifact host. */
      }
  }, [direction, mode, experiment, navigation])
  useEffect(() => {
    const media = matchMedia("(max-width:760px)")
    const change = () => {
      setPhone(media.matches)
      setNavOpen(false)
    }
    const pop = () => {
      const query = new URLSearchParams(location.search)
      const d = query.get("d") as Direction,
        m = query.get("m") as Mode
      if (DIRECTIONS.includes(d)) setDirection(d)
      if (MODES.includes(m)) setMode(m)
      if (query.get("nav") === "top" || query.get("nav") === "sidebar")
        setNavigation(query.get("nav") as Navigation)
      route.current(query.get("view") ?? "notebook", false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false)
    }
    const restoration = history.scrollRestoration
    history.scrollRestoration = "manual"
    media.addEventListener("change", change)
    window.addEventListener("popstate", pop)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      media.removeEventListener("change", change)
      window.removeEventListener("popstate", pop)
      window.removeEventListener("keydown", closeOnEscape)
      history.scrollRestoration = restoration
    }
  }, [])

  const View = experiment.View
  if (canvasOnly)
    return (
      <div className="workbench canvas-only">
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <p role="alert" className="demo-error">
              {String(error)}
            </p>
          )}
        >
          <Suspense fallback={<div className="demo-loading">Loading canvas…</div>}>
            <View />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  return (
    <TooltipProvider>
      <div className="workbench notebook-workbench" data-navigation={navigation} ref={shell}>
        {navOpen && (
          <button
            className="notebook-nav-backdrop"
            type="button"
            aria-label="Close page navigation"
            onClick={() => setNavOpen(false)}
          />
        )}
        <aside
          className={`workbench-nav ${navOpen ? "is-open" : ""}`}
          inert={navigation === "top" || (phone && !navOpen)}
          aria-hidden={navigation === "top" || (phone && !navOpen)}
        >
          <a className="workbench-brand" href="./gallery.html">
            <span className="workbench-mark">
              <Layers size={19} />
            </span>
            <span>
              atelier<span className="brand-caption">Component notebook</span>
            </span>
            <ArrowUpRight size={14} />
          </a>
          <div className="nav-heading">
            <span>Pages</span>
            <span>{pages.length}</span>
          </div>
          <nav aria-label="Notebook pages">
            {pages.map((item) => (
              <div key={item.id}>
                <button
                  type="button"
                  className="notebook-page-button"
                  aria-current={active === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={17} />
                  <span>{item.name}</span>
                </button>
                {active === item.id && flow.sections.length > 0 && (
                  <div className="notebook-sidebar-outline">
                    {flow.sections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        aria-current={flow.current === section.id ? "location" : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          setNavOpen(false)
                          flow.jump(section.id)
                        }}
                      >
                        {section.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>
        <div className="workbench-body" inert={navOpen && phone}>
          <header className="workbench-topbar">
            <div className="workbench-breadcrumb">
              <button
                type="button"
                className="nav-toggle"
                aria-label="Toggle page navigation"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((value) => !value)}
              >
                <PanelLeftClose size={18} />
              </button>
              <a className="notebook-gallery-link" href="./gallery.html">
                Gallery
              </a>
              <span className="breadcrumb-sep">/</span>
              <strong>{experiment.name}</strong>
            </div>
            <div className="theme-controls">
              <label className="direction-picker">
                <span className="sr-only">Visual direction</span>
                <select
                  aria-label="Visual direction"
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as Direction)}
                >
                  {DIRECTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value[0].toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
              <fieldset className="mode-picker" aria-label="Color mode">
                {MODES.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${value} mode`}
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                  >
                    {value === "light" ? (
                      <Sun size={15} />
                    ) : value === "dark" ? (
                      <Moon size={15} />
                    ) : (
                      <span className="system-mode" />
                    )}
                  </button>
                ))}
              </fieldset>
            </div>
          </header>
          <div className="notebook-toolbar">
            {navigation === "top" && (
              <label className="notebook-page-picker">
                <span>Page</span>
                <select
                  aria-label="Notebook page"
                  value={active}
                  onChange={(event) => navigate(event.target.value)}
                >
                  {pages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="notebook-section-picker">
              <span>On this page</span>
              <select
                aria-label="Jump to notebook section"
                value={flow.current}
                disabled={!flow.sections.length}
                onChange={(event) => flow.jump(event.target.value)}
              >
                {!flow.sections.length && <option value="">Loading sections…</option>}
                {flow.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
            <span className="notebook-section-count">
              {flow.sections.length
                ? `${Math.max(1, flow.sections.findIndex((section) => section.id === flow.current) + 1)} / ${flow.sections.length} sections`
                : ""}
            </span>
            <div className="notebook-navigation-picker">
              <button
                type="button"
                aria-label="Use sidebar navigation"
                aria-pressed={navigation === "sidebar"}
                onClick={() => {
                  setNavigation("sidebar")
                  setNavOpen(false)
                }}
              >
                <PanelLeft size={15} />
                <span>Sidebar</span>
              </button>
              <button
                type="button"
                aria-label="Use top navigation"
                aria-pressed={navigation === "top"}
                onClick={() => {
                  setNavigation("top")
                  setNavOpen(false)
                }}
              >
                <Menu size={15} />
                <span>Top menu</span>
              </button>
            </div>
          </div>
          <main className="workbench-main">
            <div className="experiment-heading">
              <div>
                <h1>{experiment.name}</h1>
                <p>{experiment.description}</p>
              </div>
            </div>
            <div className="library-strip">
              <span className="library-label">
                <Braces size={14} />
                Built with
              </span>
              {experiment.libraries.map((name) => (
                <span key={name} className="library-pill">
                  {name}
                </span>
              ))}
              <span className="sample-label">Illustrative data</span>
            </div>
            <div ref={pageRoot} className="notebook-pages">
              {visited.map((id) => {
                const entry = pages.find((item) => item.id === id)
                if (!entry) return null
                const Page = entry.View
                return (
                  <div
                    key={id}
                    className="notebook-page"
                    data-notebook-page={id}
                    hidden={id !== active}
                    inert={id !== active}
                  >
                    <ErrorBoundary
                      fallbackRender={({ error, resetErrorBoundary }) => (
                        <div role="alert" className="demo-error">
                          <h2>This page could not load</h2>
                          <p>{error instanceof Error ? error.message : String(error)}</p>
                          <button
                            type="button"
                            className="demo-button"
                            onClick={resetErrorBoundary}
                          >
                            Try again
                          </button>
                        </div>
                      )}
                    >
                      <Suspense
                        fallback={
                          <div className="demo-loading">
                            <div className="loading-bar" />
                            <p>Loading {entry.name.toLowerCase()}…</p>
                          </div>
                        }
                      >
                        <Page />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )
              })}
            </div>
            <nav className="notebook-page-ending" aria-label="Adjacent notebook pages">
              {previous && (
                <button type="button" onClick={() => navigate(previous.id)}>
                  <ArrowLeft size={16} />
                  <span>
                    <small>Previous page</small>
                    <strong>{previous.name}</strong>
                  </span>
                </button>
              )}
              {next && (
                <button type="button" onClick={() => navigate(next.id)}>
                  <span>
                    <small>Next page</small>
                    <strong>{next.name}</strong>
                  </span>
                  <ArrowRight size={16} />
                </button>
              )}
            </nav>
            <footer className="workbench-footer">
              <span>
                <span className="footer-dot" />
                {direction} / {mode}
              </span>
              <span>Component notebook · {pages.length} pages</span>
            </footer>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
