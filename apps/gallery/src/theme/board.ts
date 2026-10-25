import { observeTheme, readVizTokens, type VizTokens } from "@atelier/theme/viz"
import { createContext, useContext, useEffect, useState } from "react"

export const DIRECTIONS = ["instrument", "editorial", "console"] as const
// "system" leaves data-theme unset so the page follows the viewer's setting.
export const MODES = ["system", "light", "dark"] as const
export const SCREENS = ["monitor", "review", "lab", "report"] as const

export type Direction = (typeof DIRECTIONS)[number]
export type Mode = (typeof MODES)[number]
export type Screen = (typeof SCREENS)[number]

export type BoardState = { direction: Direction; mode: Mode; screen: Screen }

export const BoardContext = createContext<BoardState>({
  direction: "instrument",
  mode: "system",
  screen: "monitor",
})

export const useBoard = () => useContext(BoardContext)

export type { VizTokens } from "@atelier/theme/viz"

/** Chart colours for the active direction and mode, re-read on any change. */
export function useVizTokens(): VizTokens | null {
  const [tokens, setTokens] = useState<VizTokens | null>(null)
  useEffect(() => {
    const read = () => setTokens(readVizTokens())
    read()
    return observeTheme(read)
  }, [])
  return tokens
}
