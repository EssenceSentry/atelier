import type { ReactNode } from "react"

import { SectionHeader } from "@/blocks/primitives"
import { cn } from "@/lib/utils"

/**
 * Chart panels side by side. Each panel spans the row's three tracks (header,
 * note, plot) through a subgrid, so plots line up even when one header holds
 * more than another. Set the column widths with `className`.
 */
export function ChartRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-4 md:auto-cols-fr md:grid-flow-col md:grid-rows-[auto_auto_auto]",
        className
      )}
    >
      {children}
    </div>
  )
}

/** One chart in a ChartRow: a title, an optional legend and note, then the plot. */
export function ChartPanel({
  title,
  meta,
  note,
  children,
  className,
}: {
  title: ReactNode
  meta?: ReactNode
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "panel space-y-2 p-5 md:row-span-3 md:grid md:grid-rows-subgrid md:gap-y-2 md:space-y-0",
        className
      )}
    >
      <SectionHeader title={title} meta={meta} />
      <div className="text-xs text-muted-foreground">{note}</div>
      {children}
    </section>
  )
}
