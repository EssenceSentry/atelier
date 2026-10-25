import { StatusIcon } from "@/blocks/primitives"
import { keepIds, keepUnits } from "@/lib/format"
import { cn } from "@/lib/utils"

export type LogLine = { t: string; level: "info" | "warn" | "error"; msg: string }

/**
 * The latest log lines, newest first. On phones each time sits above its
 * message, values keep their units, IDs stay whole, long paths break rather
 * than overflow, and warnings and errors carry an icon as well as a colour.
 */
export function LogTail({ lines, className }: { lines: LogLine[]; className?: string }) {
  return (
    <div
      className={cn(
        "well space-y-2 p-3 font-mono text-[12px] leading-snug sm:text-[13px]",
        className
      )}
    >
      {lines.map((l) => (
        <div
          key={`${l.t} ${l.msg}`}
          className="grid grid-cols-[14px_1fr] gap-x-2 sm:grid-cols-[64px_14px_1fr]"
        >
          <span className="num col-start-2 text-[11px] text-muted-foreground sm:col-start-1 sm:text-[13px]">
            {l.t}
          </span>
          {l.level === "info" ? (
            <span aria-hidden className="mt-[6px] size-1.5 rounded-full bg-border-strong" />
          ) : (
            <StatusIcon
              status={l.level === "error" ? "failed" : "warning"}
              className="mt-0.5 [&_svg]:size-3.5"
            />
          )}
          <span
            className={cn("break-words", l.level === "info" ? "text-ink-2" : "text-foreground")}
          >
            {keepIds(keepUnits(l.msg))}
          </span>
        </div>
      ))}
    </div>
  )
}
