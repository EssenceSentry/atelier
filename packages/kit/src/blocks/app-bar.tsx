import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

import { BrandMark } from "@/blocks/primitives"
import { cn } from "@/lib/utils"

export function AppBar({
  product,
  icon,
  crumbs = [],
  center,
  right,
  className,
  innerClassName,
}: {
  product: string
  /** The app's own mark; atelier's default mark when omitted. */
  icon?: ReactNode
  crumbs?: string[]
  center?: ReactNode
  right?: ReactNode
  className?: string
  /** Width for the bar's contents, such as `mx-auto max-w-[1360px]`, so they line up with the page. */
  innerClassName?: string
}) {
  return (
    <header
      className={cn(
        "sticky top-[env(safe-area-inset-top,0px)] z-20 border-b bg-background/85 backdrop-blur-md",
        className
      )}
    >
      <div className={cn("flex h-14 items-center gap-4 px-4 md:px-6", innerClassName)}>
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ?? <BrandMark />}
          <span className="font-heading text-[15px] font-semibold tracking-tight">{product}</span>
          {crumbs.map((c, i) => (
            <span
              key={c}
              className="hidden min-w-0 items-center gap-2.5 text-sm text-muted-foreground sm:flex"
            >
              <ChevronRight className="size-3.5 text-faint" />
              <span className={cn("truncate", i === crumbs.length - 1 && "text-foreground")}>
                {c}
              </span>
            </span>
          ))}
        </div>
        <div className="hidden flex-1 justify-center lg:flex">{center}</div>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
      {center && (
        // Narrower windows keep the centre slot on a second row rather than losing it.
        <div className="flex overflow-x-auto px-4 pb-2.5 md:px-6 lg:hidden">{center}</div>
      )}
    </header>
  )
}
