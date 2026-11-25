import {
  type ComponentType,
  type LazyExoticComponent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react"
import { ErrorBoundary } from "react-error-boundary"
import { studies } from "./study-pages"

const order = [
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
const families = [...studies]
  .filter((item) => item.id !== "notebook")
  .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

export default function LongNotebook() {
  return (
    <div className="demo-stack notebook-collection" data-testid="long-notebook">
      <p className="notebook-collection-intro">
        Twenty component families, one continuous page. Each study is interactive. Your changes stay
        in place while you read or jump between sections.
      </p>
      {families.map((entry, index) => (
        <section
          key={entry.id}
          id={`cell-notebook-${entry.id}`}
          data-notebook-cell="true"
          data-family={entry.id}
          className="demo-panel notebook-collection-cell"
        >
          <div className="demo-panel-head notebook-family-heading">
            <div>
              <span className="notebook-family-number">
                {String(index + 1).padStart(2, "0")} / {families.length}
              </span>
              <h2 tabIndex={-1}>{entry.name}</h2>
              <p>{entry.description}</p>
            </div>
          </div>
          <LazyStudy id={entry.id} name={entry.name} View={entry.View} />
        </section>
      ))}
    </div>
  )
}

function LazyStudy({
  id,
  name,
  View,
}: {
  id: string
  name: string
  View: LazyExoticComponent<ComponentType>
}) {
  const host = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const element = host.current
    if (!element) return
    const toolbar = document.querySelector(".notebook-toolbar")
    const top = Math.ceil(toolbar?.getBoundingClientRect().bottom ?? 160) + 10
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin: `-${top}px 0px 180px 0px` }
    )
    observer.observe(element)
    const select = (event: Event) => {
      if ((event as CustomEvent<string>).detail === `cell-notebook-${id}`) {
        setMounted(true)
        observer.disconnect()
      }
    }
    window.addEventListener("atelier:notebook-section", select)
    return () => {
      observer.disconnect()
      window.removeEventListener("atelier:notebook-section", select)
    }
  }, [id])
  return (
    <div ref={host} className="notebook-family-content" data-study-mounted={mounted}>
      {mounted ? (
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert" className="demo-error">
              <p>
                {name} could not load: {error instanceof Error ? error.message : String(error)}
              </p>
              <button type="button" className="demo-button" onClick={resetErrorBoundary}>
                Retry this study
              </button>
            </div>
          )}
        >
          <Suspense
            fallback={
              <div className="notebook-study-placeholder" role="status">
                <span className="loading-bar" />
                <p>Loading {name.toLowerCase()}…</p>
              </div>
            }
          >
            <View />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <div className="notebook-study-placeholder">
          <div className="notebook-placeholder-figure" aria-hidden="true" />
          <p>This study loads when you reach it.</p>
          <button type="button" className="demo-button" onClick={() => setMounted(true)}>
            Load {name.toLowerCase()}
          </button>
        </div>
      )}
    </div>
  )
}
