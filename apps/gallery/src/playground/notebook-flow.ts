import { type RefObject, useEffect, useRef, useState } from "react"

export type NotebookSection = { id: string; title: string; element: HTMLElement }

// Workbench scaffolding for reviewing the reading flow, not a public component API.
export function useNotebookFlow(page: string, root: RefObject<HTMLDivElement | null>) {
  const [sections, setSections] = useState<NotebookSection[]>([])
  const [current, setCurrent] = useState("")
  const positions = useRef(new Map<string, number>())
  const pending = useRef<{ page: string; hash: string; y: number } | null>({
    page,
    hash: location.hash.slice(1),
    y: 0,
  })
  const active = useRef(page)
  const pinned = useRef<{ id: string; until: number } | null>(null)
  active.current = page

  useEffect(() => {
    const container = root.current
    if (!container) return
    const content = container.querySelector<HTMLElement>(`[data-notebook-page="${page}"]`)
    if (!content) return
    let frame = 0
    let cells: NotebookSection[] = []
    const measure = () => {
      const toolbar = document.querySelector<HTMLElement>(".notebook-toolbar")
      const line = (toolbar?.getBoundingClientRect().bottom ?? 130) + 24
      const passed = cells.filter((cell) => cell.element.getBoundingClientRect().top <= line)
      setCurrent((passed.at(-1) ?? cells[0])?.id ?? "")
    }
    const collect = () => {
      frame = 0
      const used = new Map<string, number>()
      cells = Array.from(
        content.querySelectorAll<HTMLElement>(".demo-panel, [data-notebook-group]")
      )
        .filter(
          (element) =>
            element.getClientRects().length &&
            !element.parentElement?.closest(".demo-panel, [data-notebook-group]")
        )
        .flatMap((element) => {
          const heading = element.querySelector<HTMLElement>(
            ".demo-panel-head h2, :scope > h2, :scope > summary"
          )
          if (!heading) return []
          const rawTitle =
            (heading.tagName === "SUMMARY"
              ? Array.from(heading.childNodes)
                  .filter((node) => node.nodeType === Node.TEXT_NODE)
                  .map((node) => node.textContent)
                  .join(" ")
              : heading.textContent
            )
              ?.trim()
              .replace(/\s+/g, " ") ?? ""
          const title = element.dataset.notebookGroup ?? rawTitle
          if (!title) return []
          const slug =
            title
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 70) || "section"
          const count = (used.get(slug) ?? 0) + 1
          used.set(slug, count)
          if (!element.dataset.notebookCell) {
            element.id ||= `cell-${page}-${slug}${count > 1 ? `-${count}` : ""}`
            element.dataset.notebookCell = "true"
            if (heading.tagName !== "SUMMARY") heading.tabIndex = -1
          }
          return [{ id: element.id, title, element }]
        })
      setSections((previous) =>
        previous.length === cells.length &&
        previous.every((cell, i) => cell.id === cells[i].id && cell.title === cells[i].title)
          ? previous
          : cells
      )
      const target = pending.current
      if (target?.page === page && cells.length) {
        const anchor = cells.find((cell) => cell.id === target.hash)
        if (anchor || !target.hash.startsWith(`cell-${page}-`)) {
          pending.current = null
          requestAnimationFrame(() => {
            if (active.current !== page) return
            if (anchor) {
              if (anchor.id.startsWith("cell-notebook-"))
                pinned.current = { id: anchor.id, until: performance.now() + 8000 }
              anchor.element.scrollIntoView({ block: "start", behavior: "instant" })
            } else window.scrollTo(0, target.y)
            measure()
          })
        }
      }
      if (pinned.current && performance.now() < pinned.current.until) {
        cells
          .find((cell) => cell.id === pinned.current?.id)
          ?.element.scrollIntoView({ block: "start", behavior: "instant" })
      }
      measure()
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(collect)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(content, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden", "open"],
    })
    const size = new ResizeObserver(schedule)
    size.observe(content)
    const onScroll = () => {
      positions.current.set(page, scrollY)
      measure()
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", schedule)
    const release = () => {
      pinned.current = null
    }
    const releaseKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key))
        release()
    }
    window.addEventListener("wheel", release, { passive: true })
    window.addEventListener("touchstart", release, { passive: true })
    window.addEventListener("keydown", releaseKey)
    collect()
    return () => {
      observer.disconnect()
      size.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", schedule)
      window.removeEventListener("wheel", release)
      window.removeEventListener("touchstart", release)
      window.removeEventListener("keydown", releaseKey)
    }
  }, [page, root])

  return {
    sections,
    current,
    prepare(next: string, hash = "") {
      pinned.current = null
      positions.current.set(page, scrollY)
      pending.current = { page: next, hash, y: hash ? 0 : (positions.current.get(next) ?? 0) }
    },
    jump(id: string, record = true) {
      pinned.current = null
      if (!id) {
        window.scrollTo({ top: 0, behavior: "instant" })
        return
      }
      const section = sections.find((item) => item.id === id)
      if (!section) {
        document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" })
        return
      }
      const url = new URL(location.href)
      url.hash = id
      if (record) history.pushState(null, "", url)
      window.dispatchEvent(new CustomEvent("atelier:notebook-section", { detail: id }))
      const longJump = id.startsWith("cell-notebook-")
      pinned.current = longJump ? { id, until: performance.now() + 8000 } : null
      section.element.scrollIntoView({
        block: "start",
        behavior:
          !record || longJump || matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
      })
      section.element.querySelector<HTMLElement>("h2, summary")?.focus({ preventScroll: true })
      setCurrent(id)
    },
  }
}
