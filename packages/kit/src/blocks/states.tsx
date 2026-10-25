import { CircleAlert, CircleDashed, Inbox } from "lucide-react"
import type { ReactNode } from "react"

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
    <div className={cn("flex gap-3 rounded-lg bg-critical/[0.06] p-4", className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" />
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        {children && <p className="text-[13px] leading-relaxed text-ink-2">{children}</p>}
        {action && <div className="flex gap-2 pt-2">{action}</div>}
      </div>
    </div>
  )
}

/** Stands in for content while it loads; give it the shape of what it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-md bg-foreground/10 motion-safe:animate-pulse", className)}
    />
  )
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
        "label-mono inline-flex items-center gap-2 text-[11px] text-muted-foreground [&_svg]:size-3.5",
        className
      )}
    >
      {status === "live" && <span className="live-dot" />}
      {status === "offline" && <CircleAlert className="text-critical" />}
      {(status === "example" || status === "connecting") && <CircleDashed />}
      {liveLabel[status]}
    </span>
  )
}
