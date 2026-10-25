import { useEffect, useRef } from "react"

export type KeyBinding = {
  /** `event.key`, matched without case: "j", "Enter", "?". */
  key: string
  /** Require ⌘ on a Mac or Ctrl elsewhere. */
  mod?: boolean
  /** Keep firing while the key is held. Off by default, so one press is one action. */
  repeat?: boolean
  run: (event: KeyboardEvent) => void
}

const typing = (target: HTMLElement) =>
  Boolean(
    target.closest(
      "textarea, select, [contenteditable='true'], input:not([type='radio']):not([type='checkbox'])"
    )
  )

// Whether focus last moved by keyboard. Enter belongs to a focused button
// only then: after a mouse click on a tab or switch, Enter still runs the
// page's own binding instead of re-pressing the control.
let keyboardFocus = false
let tracking = false
function trackFocusSource() {
  if (tracking) return
  tracking = true
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Tab") keyboardFocus = true
    },
    true
  )
  window.addEventListener(
    "pointerdown",
    () => {
      keyboardFocus = false
    },
    true
  )
}

/**
 * Page-wide keyboard shortcuts that stay out of the way: they never fire
 * while the person is typing (Escape leaves the field), Enter leaves a
 * button reached by keyboard to do its own thing, and plain keys ignore ⌘,
 * Ctrl and Alt chords.
 */
export function useKeys(bindings: KeyBinding[]) {
  const current = useRef(bindings)
  current.current = bindings

  useEffect(() => {
    trackFocusSource()
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (typing(target)) {
        if (event.key === "Escape") target.blur()
        return
      }
      const mod = event.metaKey || event.ctrlKey
      const binding = current.current.find(
        (b) =>
          b.key.toLowerCase() === event.key.toLowerCase() &&
          Boolean(b.mod) === mod &&
          !event.altKey &&
          (b.repeat || !event.repeat)
      )
      if (!binding) return
      if (
        event.key === "Enter" &&
        keyboardFocus &&
        target.closest("button, a, [role='tab'], [role='switch'], summary")
      )
        return
      event.preventDefault()
      binding.run(event)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}
