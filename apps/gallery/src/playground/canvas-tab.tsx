import { ArrowUpRight } from "lucide-react"

// Playground navigation only. Each experiment still owns its renderer and state.
export const canvasOnly = new URLSearchParams(location.search).get("canvas") === "1"

export function canvasState<T extends object>(fallback: T): T {
  try {
    const state = JSON.parse(new URLSearchParams(location.hash.slice(1)).get("state") ?? "{}")
    return { ...fallback, ...state }
  } catch {
    return fallback
  }
}

export function CanvasTab({ view, state }: { view: string; state: object }) {
  const url = new URL(location.href)
  url.searchParams.set("view", view)
  url.searchParams.set("canvas", "1")
  url.hash = new URLSearchParams({ state: JSON.stringify(state) }).toString()
  return (
    <a
      className="demo-button canvas-tab-link"
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ArrowUpRight size={13} /> Open canvas<span className="sr-only"> in a new tab</span>
    </a>
  )
}
