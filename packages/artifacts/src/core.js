import { observeTheme, readVizTokens } from "@atelier/theme/viz"
import * as React from "react"
import * as JSX from "react/jsx-runtime"
import * as ReactDOM from "react-dom"
import * as ReactClient from "react-dom/client"
import "./style.css"

const factories = new Map()
const handles = new Set()
const pending = new Set()
const failures = new Set()
const track = (promise) => {
  pending.add(promise)
  promise.finally(() => pending.delete(promise)).catch(() => {})
  return promise
}
export const modules = {}
export { JSX, React, ReactClient, ReactDOM }
export const version = "0.1.0"
export const tokens = readVizTokens
export function register(name, factory, native = {}) {
  if (factories.has(name)) throw new Error(`Adapter already registered: ${name}`)
  factories.set(name, factory)
  modules[name] = native
}
export function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = String(text)
  return node
}
export function button(
  label,
  action,
  parent,
  { variant = "secondary", busyLabel, title, disabled = false } = {}
) {
  const node = element("button", "at-button", label)
  node.type = "button"
  node.dataset.variant = variant
  node.disabled = disabled
  if (title) node.title = title
  let busy = false
  node.addEventListener("click", async () => {
    if (busy || node.disabled) return
    busy = true
    node.setAttribute("aria-busy", "true")
    node.setAttribute("aria-disabled", "true")
    const previous = node.textContent
    if (busyLabel) node.textContent = busyLabel
    if (node.nextElementSibling?.classList.contains("at-error")) node.nextElementSibling.remove()
    try {
      await action(node)
    } catch (error) {
      const message = element("p", "at-error", error.message ?? String(error))
      message.setAttribute("role", "alert")
      node.after(message)
    } finally {
      busy = false
      node.removeAttribute("aria-busy")
      node.removeAttribute("aria-disabled")
      if (busyLabel) node.textContent = previous
    }
  })
  parent?.append(node)
  return node
}
export function field(
  parent,
  { label, type = "select", value, options = [], onChange, description, format, ...attrs }
) {
  const wrapper = element("label", "at-field")
  const caption = element("span", "at-field-caption", label)
  wrapper.append(caption)
  const input = element(type === "select" ? "select" : type === "textarea" ? "textarea" : "input")
  input.setAttribute("aria-label", label)
  if (type !== "select" && type !== "textarea") input.type = type
  if (type === "select")
    for (const option of options) {
      const item = typeof option === "object" ? option : { value: option, label: option }
      const node = element("option", "", item.label)
      node.value = item.value
      input.append(node)
    }
  for (const [key, val] of Object.entries(attrs)) input.setAttribute(key, val)
  if (type === "checkbox") input.checked = Boolean(value)
  else input.value = value ?? ""
  const output = type === "range" ? element("output", "at-field-value") : null
  const showValue = (next) => {
    if (output) output.textContent = format ? format(next) : String(next ?? "")
  }
  if (output) {
    caption.append(output)
    showValue(value)
  }
  input.addEventListener(
    ["range", "text", "search", "textarea", "number"].includes(type) ? "input" : "change",
    () => {
      const next =
        type === "checkbox"
          ? input.checked
          : type === "file"
            ? input.files
            : ["number", "range"].includes(type)
              ? input.valueAsNumber
              : input.value
      showValue(next)
      wrapper.querySelector(".at-error")?.remove()
      Promise.resolve()
        .then(() => onChange?.(next, input))
        .catch((error) => {
          wrapper.querySelector(".at-error")?.remove()
          wrapper.append(element("span", "at-error", error.message ?? String(error)))
        })
    }
  )
  if (type === "select") {
    const shell = element("span", "at-select-shell")
    shell.append(input)
    wrapper.append(shell)
  } else wrapper.append(input)
  if (description) wrapper.append(element("small", "at-note", description))
  parent.append(wrapper)
  return input
}

/** Small UI blocks own their styling so artifact authors only supply content. */
export function stack(parent, { compact = false } = {}) {
  const root = element("div", "at-stack")
  if (compact) root.dataset.spacing = "compact"
  parent.append(root)
  return root
}
export function toolbar(parent, { label = "Actions" } = {}) {
  const root = element("div", "at-toolbar")
  root.setAttribute("role", "group")
  root.setAttribute("aria-label", label)
  parent.append(root)
  return root
}
export function metrics(parent, items) {
  const root = element("dl", "at-metrics")
  parent.append(root)
  const update = (next) => {
    root.replaceChildren()
    for (const item of next) {
      const card = element("div", "at-metric")
      card.append(element("dt", "", item.label), element("dd", "at-metric-value", item.value))
      if (item.note) card.append(element("dd", "at-note", item.note))
      root.append(card)
    }
  }
  update(items)
  return { root, update, destroy: () => root.remove() }
}
export function notice(parent, { title, text = "", tone = "info" }) {
  const root = element("aside", "at-notice")
  root.dataset.tone = tone
  root.setAttribute("role", tone === "error" ? "alert" : "status")
  root.append(element("strong", "", title))
  if (text) root.append(element("p", "", text))
  parent.append(root)
  return root
}
/** Linked views form one bounded desktop workspace within the notebook. */
export function workspace(cell, { main = "Main view", side, bottom } = {}) {
  if (!cell?.section || !cell.view || cell.view.children.length)
    throw new Error("Create a workspace in a new notebook cell before mounting its views")
  const root = element("div", "at-workspace")
  cell.section.classList.add("at-workspace-cell")
  root.dataset.side = String(Boolean(side))
  root.dataset.bottom = String(Boolean(bottom))
  const views = {}
  const headers = {}
  for (const [name, title] of Object.entries({ main, side, bottom })) {
    if (!title) continue
    const panel = element("section", "at-workspace-panel")
    panel.dataset.place = name
    panel.setAttribute("aria-label", title)
    const header = element("header", "at-workspace-panel-head")
    header.append(element("h3", "", title))
    const view = element("div", "at-workspace-panel-view")
    panel.append(header, view)
    root.append(panel)
    views[name] = view
    headers[name] = header
  }
  cell.view.append(root)
  return {
    root,
    ...views,
    headers,
    controls: cell.controls,
    focus(name) {
      const panel = views[name]?.parentElement
      if (!panel) throw new Error(`Unknown workspace panel: ${name}`)
      if (innerWidth < 1100 || innerHeight < 700)
        panel.scrollIntoView({ block: "start", behavior: "instant" })
    },
    async destroy() {
      await Promise.all(
        [...handles]
          .filter((handle) => root.contains(handle.host))
          .map((handle) => handle.destroy())
      )
      root.remove()
      cell.section.classList.remove("at-workspace-cell")
    },
  }
}
/** Lazy panels retain their widgets and local state when switching tabs. */
export function tabs(parent, { label = "Views", items, value = items?.[0]?.id, onChange } = {}) {
  if (!items?.length || new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("Tabs need items with unique ids")
  const root = element("div", "at-tabs")
  const list = element("div", "at-tab-list")
  list.setAttribute("role", "tablist")
  list.setAttribute("aria-label", label)
  root.append(list)
  const entries = new Map()
  let current
  for (const item of items) {
    const id = `at-tab-${crypto.randomUUID()}`
    const tab = element("button", "at-tab", item.label)
    tab.type = "button"
    tab.id = id
    tab.setAttribute("role", "tab")
    const panel = element("div", "at-tab-panel")
    panel.id = `${id}-panel`
    panel.hidden = true
    panel.inert = true
    panel.setAttribute("role", "tabpanel")
    panel.setAttribute("aria-labelledby", id)
    tab.setAttribute("aria-controls", panel.id)
    entries.set(item.id, { item, tab, panel, mounted: false, owned: [] })
    tab.addEventListener("click", () => {
      void select(item.id).catch(() => {})
    })
    tab.addEventListener("keydown", (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"]
      if (!keys.includes(event.key)) return
      event.preventDefault()
      const index = items.findIndex((entry) => entry.id === item.id)
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowLeft" ? -1 : 1) + items.length) % items.length
      entries.get(items[next].id).tab.focus()
      void select(items[next].id).catch(() => {})
    })
    list.append(tab)
    root.append(panel)
  }
  parent.append(root)
  async function select(id) {
    const entry = entries.get(id)
    if (!entry) throw new Error(`Unknown tab: ${id}`)
    current = id
    for (const [key, view] of entries) {
      const active = key === id
      view.tab.setAttribute("aria-selected", String(active))
      view.tab.tabIndex = active ? 0 : -1
      view.panel.hidden = !active
      view.panel.inert = !active
    }
    if (!entry.mounted) {
      entry.mounted = true
      entry.panel.dataset.state = "loading"
      try {
        const result = await entry.item.render?.(entry.panel)
        entry.owned = [result].flat().filter(Boolean)
        await Promise.all(entry.owned.map((owner) => owner.ready))
        entry.panel.dataset.state = "ready"
      } catch (error) {
        entry.panel.dataset.state = "error"
        entry.panel.append(element("p", "at-error", error.message ?? String(error)))
        throw error
      }
    } else {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await Promise.all(
        [...handles]
          .filter((handle) => entry.panel.contains(handle.host))
          .map((handle) => handle.resize())
      )
    }
    onChange?.(id)
  }
  const ready = select(value)
  ready.catch(() => {})
  return {
    root,
    ready,
    select,
    get value() {
      return current
    },
    panel: (id) => entries.get(id)?.panel,
    async destroy() {
      await Promise.all(
        [...entries.values()].flatMap((entry) => entry.owned).map((owner) => owner.destroy?.())
      )
      root.remove()
    },
  }
}
export function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = element("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function theme(direction = "instrument", mode = "light") {
  if (!["instrument", "editorial", "console"].includes(direction))
    throw new Error(`Unknown direction: ${direction}`)
  if (!["light", "dark", "system"].includes(mode)) throw new Error(`Unknown mode: ${mode}`)
  document.documentElement.dataset.direction = direction
  if (mode === "system") delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = mode
}

/** An adapter owns this element until destroy(). Updates are complete option objects. */
export function mount(name, target, initialOptions = {}) {
  const container = typeof target === "string" ? document.querySelector(target) : target
  if (!(container instanceof HTMLElement)) throw new Error(`Missing mount target for ${name}`)
  if (!factories.has(name))
    throw new Error(`Pack "${name}" is missing. Add it to artifact.json families and repack.`)
  // A layout can contain many widgets; each owns its own child slot.
  const slot = container.classList.contains("at-stack")
  const host = slot ? element("div") : container
  if (slot) container.append(host)
  if (host.dataset.atMounted) throw new Error("Each adapter needs its own empty host element")
  host.dataset.atMounted = name
  host.dataset.atState = "loading"
  host.classList.add("at-widget")
  const controller = new AbortController()
  const cleanups = []
  let options = initialOptions
  let adapter
  let disposed = false
  const showError = (error) => {
    if (disposed) return
    failures.add(handle)
    host.dataset.atState = "error"
    const message = element("p", "at-error", `${name}: ${error.message ?? error}`)
    message.setAttribute("role", "alert")
    host.querySelector(":scope > .at-error")?.remove()
    host.prepend(message)
    console.error(error)
  }
  const ctx = {
    tokens,
    fit: Boolean(host.closest(".at-workspace") || host.classList.contains("at-canvas-only")),
    size: () => {
      const style = getComputedStyle(host)
      const value = (key) => Number.parseFloat(style[key]) || 0
      return {
        width: host.clientWidth - value("paddingLeft") - value("paddingRight"),
        height: host.clientHeight - value("paddingTop") - value("paddingBottom"),
      }
    },
    signal: controller.signal,
    element,
    button,
    field,
    onCleanup: (callback) => (disposed ? callback() : cleanups.push(callback)),
    on: (node, event, callback, opts) => {
      node.addEventListener(event, callback, opts)
      cleanups.push(() => node.removeEventListener(event, callback, opts))
    },
  }
  const initialize = Promise.resolve().then(async () => {
    const created = await factories.get(name)(host, options, ctx)
    if (disposed) {
      await created?.destroy?.()
      return
    }
    adapter = created
    if (ctx.fit) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      if (disposed) return
      await adapter?.resize?.()
    }
    host.dataset.atState = "ready"
  })
  const aborted = new Promise((_resolve, reject) =>
    controller.signal.addEventListener(
      "abort",
      () => reject(new DOMException("Widget was destroyed", "AbortError")),
      { once: true }
    )
  )
  let queue = Promise.race([initialize, aborted])
  const run = (action) => {
    queue = queue
      .catch(() => {})
      .then(async () => {
        if (disposed) return
        if (!adapter)
          throw new Error(
            "Widget initialization failed. Destroy this handle before mounting it again."
          )
        host.querySelector(":scope > .at-error")?.remove()
        await action()
        failures.delete(handle)
        host.dataset.atState = "ready"
      })
    track(queue).catch(showError)
    return queue
  }
  const handle = {
    host,
    ready: track(queue),
    get api() {
      return adapter?.api
    },
    update(next) {
      options = next
      return run(() => adapter?.update?.(next))
    },
    resize() {
      return run(() => adapter?.resize?.())
    },
    async destroy() {
      if (disposed) return
      disposed = true
      controller.abort()
      observer.disconnect()
      offTheme()
      for (const cleanup of cleanups.reverse()) cleanup()
      await queue.catch(() => {})
      await adapter?.destroy?.()
      handles.delete(handle)
      failures.delete(handle)
      host.replaceChildren()
      delete host.dataset.atMounted
      delete host.dataset.atState
      if (slot) host.remove()
    },
  }
  handle.ready.catch(showError)
  const offTheme = observeTheme(() =>
    run(() => (adapter?.theme ? adapter.theme(options) : adapter?.update?.(options)))
  )
  let width = host.clientWidth
  let height = host.clientHeight
  const observer = new ResizeObserver(() => {
    const next = host.clientWidth
    const nextHeight = host.clientHeight
    if (next > 0 && (next !== width || (ctx.fit && nextHeight > 0 && nextHeight !== height))) {
      width = next
      height = nextHeight
      void handle.resize()
    }
  })
  observer.observe(host)
  handles.add(handle)
  return handle
}
export async function settled() {
  do {
    await Promise.allSettled([...pending])
    // ResizeObserver and native renderers schedule work on the next frame.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  } while (pending.size)
  if (failures.size) throw new Error(`${failures.size} widget(s) failed. See the inline errors.`)
}
export async function destroy() {
  await Promise.all([...handles].map((handle) => handle.destroy()))
}
export function inspect() {
  return [...handles].map((handle) => ({
    name: handle.host.dataset.atMounted,
    state: handle.host.dataset.atState,
    handle,
  }))
}

export function notebook({
  title,
  description = "",
  root = document.body,
  navigation = "sidebar",
}) {
  const shell = element("div", "at-notebook")
  shell.dataset.navigation = navigation
  const top = element("header", "at-top")
  const menu = button(
    "Sections",
    () => {
      nav.classList.toggle("is-open")
      menu.setAttribute("aria-expanded", String(nav.classList.contains("is-open")))
    },
    top
  )
  menu.setAttribute("aria-expanded", "false")
  menu.classList.add("at-menu")
  top.append(element("h1", "", title))
  const nav = element("nav", "at-nav")
  nav.setAttribute("aria-label", "Notebook sections")
  const main = element("main", "at-main")
  if (description) main.append(element("p", "at-intro", description))
  shell.append(top, nav, main)
  root.append(shell)
  const links = new Map()
  const sections = []
  const go = (id, record = true) => {
    const section = sections.find((node) => node.id === id)
    if (!section) return
    if (record) history.pushState(null, "", `#${encodeURIComponent(id)}`)
    section.scrollIntoView({ block: "start", behavior: "instant" })
    section.querySelector("h2")?.focus({ preventScroll: true })
    if (innerWidth < 800) {
      nav.classList.remove("is-open")
      menu.setAttribute("aria-expanded", "false")
    }
    mark(id)
  }
  const mark = (id) => {
    for (const [key, link] of links) {
      if (key === id) link.setAttribute("aria-current", "location")
      else link.removeAttribute("aria-current")
    }
  }
  const onScroll = () => {
    const offset =
      top.getBoundingClientRect().bottom +
      (navigation === "top" && innerWidth > 800 ? nav.offsetHeight : 0) +
      36
    const visible =
      sections.filter((node) => node.getBoundingClientRect().top <= offset).at(-1) ?? sections[0]
    if (visible) mark(visible.id)
  }
  const onHistory = () => go(decodeURIComponent(location.hash.slice(1)), false)
  window.addEventListener("scroll", onScroll, { passive: true })
  window.addEventListener("popstate", onHistory)
  const resize = new ResizeObserver(() => {
    shell.style.setProperty("--at-top", `${top.offsetHeight}px`)
    shell.style.setProperty(
      "--at-nav",
      `${navigation === "top" && innerWidth > 800 ? nav.offsetHeight : 0}px`
    )
  })
  resize.observe(top)
  resize.observe(nav)
  return {
    root: shell,
    main,
    go,
    cell({ id, title: heading, description: note = "", controls = false }) {
      if (!/^[a-zA-Z][\w-]*$/.test(id) || links.has(id))
        throw new Error(`Use a unique simple cell id: ${id}`)
      const section = element("section", "at-cell")
      section.id = id
      const head = element("header", "at-cell-head")
      const h2 = element("h2", "", heading)
      h2.tabIndex = -1
      head.append(h2)
      if (note) head.append(element("p", "", note))
      const body = element("div", controls ? "at-cell-body at-with-controls" : "at-cell-body")
      const panel = controls ? element("aside", "at-controls") : null
      if (panel) {
        panel.setAttribute("aria-label", `${heading} controls`)
        body.append(panel)
      }
      const view = element("div", "at-view")
      body.append(view)
      section.append(head, body)
      main.append(section)
      const link = element("a", "", heading)
      link.href = `#${id}`
      link.addEventListener("click", (event) => {
        event.preventDefault()
        go(id)
      })
      nav.append(link)
      links.set(id, link)
      sections.push(section)
      if (location.hash === `#${id}`) setTimeout(() => go(id, false), 0)
      return { section, view, controls: panel, header: head }
    },
    destroy() {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("popstate", onHistory)
      resize.disconnect()
      shell.remove()
    },
  }
}

/** Independent canvas snapshot. Configuration must be JSON serializable; callbacks stay local. */
export function canvasLink(
  handle,
  options,
  { label = "Open canvas in new tab", parent = handle.host.parentElement } = {}
) {
  let url
  const control = button(
    label,
    () => {
      if (typeof handle.api?.snapshot === "function") options = handle.api.snapshot()
      const copy = JSON.parse(
        JSON.stringify(options, (_key, value) => {
          if (typeof value === "function" || value instanceof Node)
            throw new Error(
              "This canvas uses callbacks or DOM elements. Use a dedicated canvas recipe for it."
            )
          return value
        })
      )
      const script = `window.addEventListener('DOMContentLoaded',()=>{const s=JSON.parse(document.getElementById('at-canvas-data').textContent);const h=document.getElementById('at-canvas');window.ATELIER_RUN=Atelier.mount(s.name,h,s.options).ready.then(()=>{document.documentElement.dataset.artifactReady='true'})})`
      const doc = document.implementation.createHTMLDocument(document.title)
      const charset = doc.createElement("meta")
      charset.setAttribute("charset", "utf-8")
      doc.head.prepend(charset)
      doc.documentElement.dataset.direction = document.documentElement.dataset.direction
      doc.documentElement.dataset.theme = document.documentElement.dataset.theme ?? "light"
      const meta = doc.createElement("meta")
      meta.name = "viewport"
      meta.content = "width=device-width, initial-scale=1"
      doc.head.append(meta)
      for (const source of document.querySelectorAll("[data-atelier-asset]"))
        doc.head.append(source.cloneNode(true))
      const body = doc.createElement("div")
      body.id = "at-canvas"
      body.className = "at-canvas-only"
      doc.body.append(body)
      const data = doc.createElement("script")
      data.id = "at-canvas-data"
      data.type = "application/json"
      data.textContent = JSON.stringify({
        name: handle.host.dataset.atMounted,
        options: copy,
      }).replace(/</g, "\\u003c")
      doc.body.append(data)
      const boot = doc.createElement("script")
      boot.textContent = script
      doc.body.append(boot)
      if (url) URL.revokeObjectURL(url)
      url = URL.createObjectURL(
        new Blob([`<!doctype html>${doc.documentElement.outerHTML}`], {
          type: "text/html;charset=utf-8",
        })
      )
      const opened = window.open(url, "_blank")
      if (!opened)
        throw new Error("The browser blocked the canvas tab. Allow popups for this artifact.")
      opened.opener = null
    },
    parent
  )
  return {
    element: control,
    destroy() {
      control.remove()
      if (url) URL.revokeObjectURL(url)
    },
  }
}
