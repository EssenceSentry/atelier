import { LayoutGrid } from "lucide-react"
import { useEffect, useLayoutEffect, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./gallery-toolbar.css"
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

function PreviewBar({ state, set }: { state: BoardState; set: (s: Partial<BoardState>) => void }) {
  const picker = <T extends string>(
    name: string,
    options: readonly T[],
    value: T,
    change: (v: T) => void
  ) => (
    <label>
      <span>{name}</span>
      <select aria-label={name} value={value} onChange={(e) => change(e.target.value as T)}>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <nav className="gallery-toolbar" aria-label="Gallery preview">
      {__HAS_CATALOG__ && (
        <a href="./gallery.html">
          <LayoutGrid size={16} aria-hidden="true" />
          <span>Gallery</span>
        </a>
      )}
      {picker("Screen", SCREENS, state.screen, (screen) => set({ screen }))}
      {BOARD && picker("Theme", DIRECTIONS, state.direction, (direction) => set({ direction }))}
      {picker("Mode", MODES, state.mode, (mode) => set({ mode }))}
    </nav>
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
        {chrome && (
          <PreviewBar state={state} set={(s) => setState((prev) => ({ ...prev, ...s }))} />
        )}
        <div className={chrome ? "gallery-preview" : undefined}>
          <Screen />
        </div>
      </TooltipProvider>
    </BoardContext.Provider>
  )
}
