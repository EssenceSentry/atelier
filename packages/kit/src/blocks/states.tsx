import {
  Check,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Inbox,
  Link2,
  LoaderCircle,
  Undo2,
  X,
} from "lucide-react"
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { LiveStatus } from "@/lib/live"
import { cn } from "@/lib/utils"

/** Nothing to show: say why, and offer the next step when there is one. */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className
      )}
    >
      <div className="well grid size-10 place-items-center text-muted-foreground [&_svg]:size-5">
        {icon ?? <Inbox />}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        {children && (
          <p className="mx-auto max-w-[44ch] text-[13px] leading-relaxed text-pretty text-muted-foreground">
            {children}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

/** Something failed: say what happened and how to put it right. */
export function ErrorState({
  title,
  children,
  action,
  className,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg bg-critical/[0.06] p-4 ring-1 ring-critical/15 ring-inset",
        className
      )}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" />
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        {children && (
          <p className="text-[13px] leading-relaxed text-pretty text-ink-2">{children}</p>
        )}
        {action && <div className="flex gap-2 pt-2">{action}</div>}
      </div>
    </div>
  )
}

/** Stands in for content while it loads; give it the shape of what it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />
}

const liveLabel: Record<LiveStatus, string> = {
  example: "Example data",
  connecting: "Connecting…",
  live: "Live",
  offline: "Offline, reconnecting",
}

/** Where the figures come from, so example figures never pass for live ones. */
export function LiveIndicator({ status, className }: { status: LiveStatus; className?: string }) {
  return (
    <span
      className={cn(
        "label-status inline-flex items-center gap-2 text-muted-foreground [&_svg]:size-3.5",
        className
      )}
    >
      {status === "example" && <FlaskConical />}
      {status === "connecting" && <LoaderCircle className="motion-safe:animate-spin" />}
      {status === "live" && <span className="live-dot" />}
      {status === "offline" && <CircleAlert className="text-critical" />}
      {liveLabel[status]}
    </span>
  )
}

/**
 * Confirms an action that removed or changed something and offers to take it
 * back for `seconds` before it becomes final. Render it where the removed
 * thing was, so the confirmation appears where the person is looking.
 */
export function UndoNotice({
  children,
  onUndo,
  onExpire,
  seconds = 10,
  className,
}: {
  children: ReactNode
  onUndo: () => void
  /** Called once the undo window closes; make the action final here. */
  onExpire?: () => void
  seconds?: number
  className?: string
}) {
  const [left, setLeft] = useState(seconds)
  const expire = useRef(onExpire)
  expire.current = onExpire
  // The countdown holds while the pointer or focus is on the notice, so
  // reading it or reaching for Undo never loses the chance.
  const held = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => setLeft((n) => (held.current ? n : Math.max(0, n - 1))), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (left === 0) expire.current?.()
  }, [left])

  return (
    <div
      role="status"
      onPointerEnter={() => {
        held.current = true
      }}
      onPointerLeave={() => {
        held.current = false
      }}
      onFocus={() => {
        held.current = true
      }}
      onBlur={() => {
        held.current = false
      }}
      className={cn(
        // The minimum height keeps the layout still when the Undo button leaves.
        "flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted px-4 py-3 text-[13px] ring-1 ring-border ring-inset",
        className
      )}
    >
      <CircleCheck className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">{children}</span>
      {left > 0 && (
        <Button size="sm" variant="outline" onClick={onUndo}>
          <Undo2 /> Undo{" "}
          <span className="num inline-block w-[4ch] text-right text-muted-foreground">
            {left} s
          </span>
        </Button>
      )}
    </div>
  )
}

/**
 * Copies text, the page address by default, and says whether it worked. When
 * the page may not use the clipboard, as in some sandboxes, it shows the text
 * selected so ⌘C copies it.
 */
export function CopyButton({
  value,
  label = "Copy link",
  className,
}: {
  value?: string
  label?: string
  className?: string
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  const text = value ?? (typeof location === "undefined" ? "" : location.href)

  useEffect(() => {
    if (state !== "copied") return
    const timer = setTimeout(() => setState("idle"), 2000)
    return () => clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  return (
    <span className="relative inline-flex">
      <Button variant="ghost" size="sm" className={className} onClick={copy}>
        {state === "copied" ? <Check /> : <Link2 />}
        {state === "copied" ? "Copied" : label}
      </Button>
      {state === "failed" && (
        <div className="fixed inset-x-4 top-16 z-30 space-y-2 rounded-lg bg-popover p-3 text-popover-foreground shadow-overlay sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-72">
          <div className="flex items-center justify-between gap-2 text-[13px] font-medium">
            <span className="flex items-center gap-1.5">
              <CircleAlert className="size-4 text-warning" /> Copying is blocked here
            </span>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Close"
              onClick={() => setState("idle")}
            >
              <X />
            </Button>
          </div>
          <input
            readOnly
            value={text}
            aria-label="Link to copy"
            // biome-ignore lint/a11y/noAutofocus: the field exists only to be copied from
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            className="h-8 w-full rounded-md border bg-background px-2 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">Press ⌘C or Ctrl+C to copy it.</p>
        </div>
      )}
    </span>
  )
}

/**
 * A button for an action that takes a moment, such as Retry, Export or
 * Download. It disables itself and shows `pendingLabel` with a spinner until
 * `onAction` settles, so a click always gets an answer.
 */
export function ActionButton({
  onAction,
  pendingLabel,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  onAction: () => Promise<unknown>
  pendingLabel: string
}) {
  const [pending, setPending] = useState(false)
  return (
    <Button
      {...props}
      disabled={disabled}
      aria-busy={pending}
      onClick={async () => {
        if (pending) return
        setPending(true)
        try {
          await onAction()
        } finally {
          setPending(false)
        }
      }}
    >
      {/* Both labels share one cell, so the button keeps its width while busy. */}
      <span className="grid *:col-start-1 *:row-start-1 *:inline-flex *:items-center *:justify-center *:gap-1.5">
        <span className={cn(pending && "invisible")}>{children}</span>
        <span className={cn(!pending && "invisible")} aria-hidden={!pending}>
          <LoaderCircle className="motion-safe:animate-spin" /> {pendingLabel}
        </span>
      </span>
    </Button>
  )
}

/**
 * An action the app has not built yet. A click says "Not built yet" instead of
 * doing nothing; swap it for the real action when it exists. The
 * check-inert-buttons script fails on a plain Button with no action.
 */
export function NotBuiltButton({
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick">) {
  const [said, setSaid] = useState(false)
  useEffect(() => {
    if (!said) return
    const timer = setTimeout(() => setSaid(false), 2500)
    return () => clearTimeout(timer)
  }, [said])
  // The tooltip's positioner keeps the note on screen whichever edge the
  // button sits at.
  return (
    <Tooltip open={said} onOpenChange={(open) => !open && setSaid(false)}>
      <TooltipTrigger render={<Button {...props} onClick={() => setSaid(true)} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" role="status">
        Not built yet
      </TooltipContent>
    </Tooltip>
  )
}
