import { readVizTokens, type VizTokens } from "@atelier/theme/viz"
import { createContext, useContext, useEffect, useState } from "react"

export const DIRECTIONS = ["instrument", "editorial", "console"] as const
export const MODES = ["light", "dark"] as const
export const SCREENS = ["monitor", "review", "lab", "report"] as const

export type Direction = (typeof DIRECTIONS)[number]
export type Mode = (typeof MODES)[number]
export type Screen = (typeof SCREENS)[number]

export type BoardState = { direction: Direction; mode: Mode; screen: Screen }

export const BoardContext = createContext<BoardState>({
  direction: "instrument",
  mode: "light",
  screen: "monitor",
})

export const useBoard = () => useContext(BoardContext)

export type { VizTokens } from "@atelier/theme/viz"

/** Chart colours for the active direction, re-read whenever the board switches. */
export function useVizTokens(): VizTokens | null {
  const { direction, mode } = useBoard()
  const [tokens, setTokens] = useState<VizTokens | null>(null)
  useEffect(() => setTokens(readVizTokens()), [direction, mode])
  return tokens
}
