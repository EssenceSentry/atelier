import { useEffect, useLayoutEffect, useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { LabScreen } from "@/screens/lab"
import { MonitorScreen } from "@/screens/monitor"
import { ReportScreen } from "@/screens/report"
import { ReviewScreen } from "@/screens/review"
import { ChannelRowsScreen } from "./channel-rows/screen"
import { Showcase } from "./showcase"
import { StatesScreen } from "./states"
import {
  BoardContext,
  type BoardState,
  DIRECTIONS,
  type Direction,
  MODES,
  SCREENS,
} from "./theme/board"

const screens = {
  monitor: MonitorScreen,
  review: ReviewScreen,
  lab: LabScreen,
  report: ReportScreen,
  states: StatesScreen,
  channels: ChannelRowsScreen,
  examples: Showcase,
}

// Only a build with every direction can switch between them.
const BOARD = __THEME__ === "all"

function readUrl(): BoardState & { chrome: boolean } {
  const q = new URLSearchParams(location.search)
  const pick = <T extends string>(key: string, options: readonly T[]) =>
    options.includes(q.get(key) as T) ? (q.get(key) as T) : options[0]
  return {
    direction: BOARD ? pick("d", DIRECTIONS) : (__THEME__ as Direction),
    mode: pick("m", MODES),
    screen: pick("s", SCREENS),
    chrome: q.get("chrome") !== "0",
  }
}

/** Board controls float above every screen; ?chrome=0 hides them for screenshots. */
function Dock({ state, set }: { state: BoardState; set: (s: Partial<BoardState>) => void }) {
  const group = <T extends string>(options: readonly T[], value: T, key: keyof BoardState) => (
    <div className="flex rounded-full bg-white/8 p-0.5">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => set({ [key]: o })}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs capitalize transition-colors",
            o === value ? "bg-white text-neutral-900" : "text-neutral-300 hover:text-white"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-[22px] bg-neutral-900/92 p-1.5 font-[system-ui] shadow-2xl ring-1 ring-white/10 backdrop-blur">
      {BOARD && group(DIRECTIONS, state.direction, "direction")}
      {group(SCREENS, state.screen, "screen")}
      {group(MODES, state.mode, "mode")}
    </div>
  )
}

export default function App() {
  const [{ chrome, ...initial }] = useState(readUrl)
  const [state, setState] = useState<BoardState>(initial)

  // Layout effect so the tokens are in place before charts read them.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.direction = state.direction
    if (state.mode === "system") delete root.dataset.theme
    else root.dataset.theme = state.mode
  }, [state.direction, state.mode])

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (BOARD) q.set("d", state.direction)
    q.set("m", state.mode)
    q.set("s", state.screen)
    history.replaceState(null, "", `?${q}`)
  }, [state])

  const Screen = screens[state.screen]
  return (
    <BoardContext.Provider value={state}>
      <TooltipProvider>
        <Screen />
        {chrome && <Dock state={state} set={(s) => setState((prev) => ({ ...prev, ...s }))} />}
      </TooltipProvider>
    </BoardContext.Provider>
  )
}
