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

/**
 * Page-wide keyboard shortcuts that stay out of the way: they never fire
 * while the person is typing, Enter leaves focused buttons and links to do
 * their own thing, and plain keys ignore ⌘, Ctrl and Alt chords.
 */
export function useKeys(bindings: KeyBinding[]) {
  const current = useRef(bindings)
  current.current = bindings

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (typing(target)) return
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
