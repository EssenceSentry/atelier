import { Keyboard } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useKeys } from "@/lib/keys"

/**
 * A keyboard button that lists the screen's shortcuts, opened by click or by
 * "?". Hidden on touch screens, where keys mean nothing.
 */
export function ShortcutsHelp({ items }: { items: [keys: string, does: string][] }) {
  const [open, setOpen] = useState(false)
  useKeys([
    { key: "?", run: () => setOpen((now) => !now) },
    { key: "Escape", run: () => setOpen(false) },
  ])
  return (
    <span className="relative pointer-coarse:hidden">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Keyboard shortcuts (?)"
        aria-expanded={open}
        onClick={() => setOpen((now) => !now)}
      >
        <Keyboard />
      </Button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 grid w-64 grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-popover p-3 text-[13px] text-popover-foreground shadow-md">
          {[...items, ["?", "show these keys"] as [string, string]].map(([keys, does]) => (
            <span key={keys} className="contents">
              <span className="flex flex-wrap items-center gap-1">
                {keys.split(" ").map((key) =>
                  key === "or" ? (
                    <span key={key} className="text-muted-foreground">
                      or
                    </span>
                  ) : (
                    <Kbd key={key}>{key}</Kbd>
                  )
                )}
              </span>
              <span className="text-muted-foreground">{does}</span>
            </span>
          ))}
        </div>
      )}
    </span>
  )
}
