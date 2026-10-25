import {
  CloudCheck,
  ExternalLink,
  Flag,
  Keyboard,
  Languages,
  ListChecks,
  Search,
  SkipForward,
  Undo2,
} from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useId, useReducer, useRef, useState } from "react"

import { AppBar } from "@/blocks/app-bar"
import { Eyebrow, Meter, Thumb } from "@/blocks/primitives"
import { EmptyState } from "@/blocks/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { queue, videos } from "@/lib/sample"
import { cn } from "@/lib/utils"

const options = [
  { key: "Y", value: "yes", label: "Yes, travel", hint: "Most uploads document trips or places" },
  { key: "N", value: "no", label: "No", hint: "Travel appears only occasionally" },
  { key: "U", value: "unsure", label: "Unsure", hint: "Needs a second reviewer" },
] as const

const QUESTION = "Is this channel primarily travel content?"

const quotes = [
  {
    lang: "no",
    text: ["Tre dager i ", "Lofoten", " med tog, ferje og leiebil."],
    en: ["Three days in ", "Lofoten", " by train, ferry and rental car."],
  },
  {
    lang: "en",
    text: ["Full ", "itinerary", " and costs are in the description."],
    en: ["Full ", "itinerary", " and costs are in the description."],
  },
  {
    lang: "no",
    text: ["Neste stopp: ", "Bodø", ", så nattoget sørover."],
    en: ["Next stop: ", "Bodø", ", then the night train south."],
  },
]

type Choice = (typeof options)[number]["value"]
type Channel = (typeof queue)[number]
type Tab = "pending" | "done" | "flagged"

// Progress before this session; the sample queue is the next slice of it.
const TOTAL = 250
const DONE_BEFORE = 64

const ranked: Channel[] = [...queue].sort((a, b) => b.score - a.score)

type State = {
  tab: Tab
  selected: string
  choice: Choice | null
  decisions: Record<string, Choice>
  /** Saved decisions, newest last, with what each one replaced. */
  history: { handle: string; previous?: Choice }[]
}

type Action =
  | { type: "choose"; value: Choice }
  | { type: "select"; handle: string }
  | { type: "move"; by: 1 | -1 }
  | { type: "save" }
  | { type: "skip" }
  | { type: "undo" }
  | { type: "tab"; tab: Tab }

function visible({ tab, decisions }: Pick<State, "tab" | "decisions">) {
  if (tab === "flagged") return ranked.filter((c) => c.state === "flagged")
  return ranked.filter((c) => (tab === "done") === c.handle in decisions)
}

/** The next undecided channel after `handle`, wrapping round the queue. */
function nextPending(handle: string, decisions: Record<string, Choice>) {
  const at = ranked.findIndex((c) => c.handle === handle)
  for (let step = 1; step <= ranked.length; step++) {
    const candidate = ranked[(at + step) % ranked.length]
    if (!(candidate.handle in decisions)) return candidate
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "choose":
      return { ...state, choice: action.value }
    case "select":
      return {
        ...state,
        selected: action.handle,
        choice: state.decisions[action.handle] ?? null,
      }
    case "move": {
      const list = visible(state)
      const at = list.findIndex((c) => c.handle === state.selected)
      const next = list[Math.min(list.length - 1, Math.max(0, at + action.by))]
      return next ? reducer(state, { type: "select", handle: next.handle }) : state
    }
    case "skip": {
      const next = nextPending(state.selected, state.decisions)
      return next ? reducer(state, { type: "select", handle: next.handle }) : state
    }
    case "save": {
      if (!state.choice) return state
      const decisions = { ...state.decisions, [state.selected]: state.choice }
      const history = [
        ...state.history,
        { handle: state.selected, previous: state.decisions[state.selected] },
      ]
      const next = nextPending(state.selected, decisions)
      return next
        ? { ...state, decisions, history, selected: next.handle, choice: null }
        : { ...state, decisions, history }
    }
    case "undo": {
      const last = state.history.at(-1)
      if (!last) return state
      const { [last.handle]: undone, ...rest } = state.decisions
      const decisions = last.previous ? { ...rest, [last.handle]: last.previous } : rest
      // Back on the channel with the undone answer still picked, ready to change.
      return {
        ...state,
        decisions,
        history: state.history.slice(0, -1),
        selected: last.handle,
        choice: undone ?? null,
      }
    }
    case "tab": {
      const next = { ...state, tab: action.tab }
      const list = visible(next)
      if (!list[0] || list.some((c) => c.handle === state.selected)) return next
      return reducer(next, { type: "select", handle: list[0].handle })
    }
  }
}

/** Keys work anywhere except while typing; Enter leaves focused buttons alone. */
function useShortcuts(dispatch: (action: Action) => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (target.closest("textarea, select, [contenteditable='true'], input:not([type='radio'])"))
        return
      const key = event.key.toLowerCase()
      const option = options.find((o) => o.key.toLowerCase() === key)
      let action: Action | undefined
      if (option) action = { type: "choose", value: option.value }
      else if (key === "j" || key === "k") action = { type: "move", by: key === "j" ? 1 : -1 }
      else if (event.repeat) return
      else if (key === "z") action = { type: "undo" }
      else if (key === "enter" && !target.closest("button, a, [role='tab'], [role='switch']"))
        action = { type: "save" }
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dispatch])
}

function Highlight({ parts }: { parts: string[] }) {
  // Odd positions hold the highlighted terms; character offsets make stable keys.
  let offset = 0
  return (
    <>
      {parts.map((part, position) => {
        const key = offset
        offset += part.length
        return position % 2 ? (
          <mark key={key} className="rounded-[3px] bg-primary-soft px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={key}>{part}</span>
        )
      })}
    </>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
}

const shortcuts = [
  ["Y N U", "decide"],
  ["J K", "next or previous channel"],
  ["⏎", "save and go to the next"],
  ["Z", "undo the last save"],
]

function DecisionActions({
  state,
  dispatch,
  className,
}: {
  state: State
  dispatch: (action: Action) => void
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Undo the last save (Z)"
        disabled={!state.history.length}
        onClick={() => dispatch({ type: "undo" })}
      >
        <Undo2 />
      </Button>
      <Button variant="ghost" size="lg" onClick={() => dispatch({ type: "skip" })}>
        <SkipForward /> Skip
      </Button>
      <Button
        size="lg"
        className="ml-auto flex-1"
        disabled={!state.choice}
        onClick={() => dispatch({ type: "save" })}
      >
        Save and next <Kbd className="ml-1 bg-primary-foreground/20 text-primary-foreground">⏎</Kbd>
      </Button>
    </div>
  )
}

function ModelEstimate({ channel }: { channel: Channel }) {
  const rank = ranked.indexOf(channel) + 1
  return (
    <div className="well space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Model estimate</Eyebrow>
        <span className="text-xs text-muted-foreground">calibrated</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="figure text-[34px]">{channel.score.toFixed(2)}</span>
        <span className="num pb-1 text-xs text-muted-foreground">
          rank {rank} of {ranked.length} in this queue
        </span>
      </div>
      <Meter value={channel.score} max={1} />
    </div>
  )
}

export function ReviewScreen({
  product = "Review desk",
  icon,
}: {
  product?: string
  icon?: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, {
    tab: "pending",
    selected: ranked[0].handle,
    choice: null,
    decisions: {},
    history: [],
  })
  const [english, setEnglish] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const translateId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const evidenceRef = useRef<HTMLElement>(null)
  useShortcuts(dispatch)

  const channel = ranked.find((c) => c.handle === state.selected) ?? ranked[0]
  const decided = Object.keys(state.decisions).length
  const list = visible(state)
  const note = notes[channel.handle] ?? ""
  const setNote = (value: string) => setNotes((all) => ({ ...all, [channel.handle]: value }))

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the selection changes
  useEffect(() => {
    listRef.current?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "nearest" })
    evidenceRef.current?.scrollTo({ top: 0 })
  }, [state.selected])

  const counts: Record<Tab, number> = {
    pending: TOTAL - DONE_BEFORE - decided,
    done: DONE_BEFORE + decided,
    flagged: ranked.filter((c) => c.state === "flagged").length,
  }

  return (
    <div className="flex h-svh flex-col">
      <AppBar
        product={product}
        icon={icon}
        crumbs={["Travel topic", "Channel review"]}
        center={
          <div className="flex w-72 items-center gap-3 text-xs text-muted-foreground">
            <span className="num whitespace-nowrap">
              <span className="font-medium text-foreground">{counts.done}</span> of {TOTAL}
            </span>
            <Meter value={counts.done} max={TOTAL} />
          </div>
        }
        right={
          <>
            <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
              <CloudCheck className="size-4" />
              {decided ? `${decided} saved this session` : "Nothing saved yet"}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={<Button size="icon-sm" variant="ghost" aria-label="Keyboard shortcuts" />}
              >
                <Keyboard />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {shortcuts.map(([keys, does]) => (
                  <span key={keys} className="contents">
                    <span className="font-medium">{keys}</span>
                    <span>{does}</span>
                  </span>
                ))}
              </TooltipContent>
            </Tooltip>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr_380px]">
        {/* Queue */}
        <aside className="hidden min-h-0 flex-col border-r bg-sunken/50 md:flex">
          <div className="space-y-3 border-b p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search channels" className="bg-card pl-8" />
            </div>
            <Tabs value={state.tab} onValueChange={(tab: Tab) => dispatch({ type: "tab", tab })}>
              <TabsList variant="line" className="w-full justify-start gap-3">
                {(["pending", "done", "flagged"] as const).map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="flex-none capitalize">
                    {tab} <span className="num text-muted-foreground">{counts[tab]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {list.length ? (
            <ul ref={listRef} className="min-h-0 flex-1 overflow-auto p-1.5">
              {list.map((c) => {
                const on = c.handle === state.selected
                const decision = options.find((o) => o.value === state.decisions[c.handle])
                return (
                  <li key={c.handle}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => dispatch({ type: "select", handle: c.handle })}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "bg-primary-soft" : "hover:bg-muted"
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-ink-2 ring-1 ring-border">
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-[13px] font-medium",
                            on && "text-primary-ink"
                          )}
                        >
                          {c.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {decision ? `Decided: ${decision.label}` : `${c.handle}, ${c.subs}`}
                        </span>
                      </span>
                      {c.state === "flagged" && (
                        <Flag className="size-3.5 shrink-0 text-warning" aria-label="Flagged" />
                      )}
                      <span className="label-mono num w-9 text-right text-xs text-ink-2">
                        {c.score.toFixed(2)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<ListChecks />}
              title={state.tab === "pending" ? "Queue cleared" : "No decisions yet"}
              className="flex-1"
            >
              {state.tab === "pending"
                ? "Every channel in this slice has a decision. Press Z to undo the last one."
                : "Decisions saved in this session appear here."}
            </EmptyState>
          )}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>Sorted by model score</span>
            <span className="flex items-center gap-1">
              <Kbd>J</Kbd>
              <Kbd>K</Kbd> move
            </span>
          </div>
        </aside>

        {/* Evidence, with the decision bar below it until the side panel fits */}
        <div className="flex min-h-0 flex-col">
          <main ref={evidenceRef} className="min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-[920px] space-y-6 p-5 md:p-7">
              <div className="flex flex-wrap items-start gap-4">
                <Thumb
                  seed={`${channel.handle}-avatar`}
                  className="size-16 shrink-0 rounded-full ring-1 ring-border"
                />
                <div className="min-w-0 flex-1 basis-60 space-y-1">
                  <h1 className="text-[28px] leading-tight">{channel.name}</h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <span>{channel.handle}</span>
                    <span className="num">{channel.subs} subscribers</span>
                    <span className="num">412 videos</span>
                    <span>Norway</span>
                    <span>Norwegian, English</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <ExternalLink /> Open channel
                </Button>
              </div>

              <div className="border-b">
                <Tabs defaultValue="videos">
                  <TabsList variant="line" className="gap-4">
                    <TabsTrigger value="videos" className="flex-none">
                      Recent videos <span className="num text-muted-foreground">8</span>
                    </TabsTrigger>
                    <TabsTrigger value="about" className="flex-none">
                      About
                    </TabsTrigger>
                    <TabsTrigger value="similar" className="flex-none">
                      Similar decisions
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
                {videos.map((v) => (
                  <figure key={v.seed} className="m-0 space-y-2">
                    <div className="relative">
                      <Thumb
                        seed={v.seed}
                        className={cn(
                          "aspect-video rounded-lg",
                          v.evidence && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                      />
                      <span className="label-mono num absolute right-1.5 bottom-1.5 rounded bg-black/72 px-1.5 py-0.5 text-[11px] text-white">
                        {v.length}
                      </span>
                      {v.evidence && (
                        <span className="absolute top-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          Evidence
                        </span>
                      )}
                    </div>
                    <figcaption className="space-y-0.5">
                      <div className="line-clamp-2 text-[13px] leading-snug font-medium text-pretty">
                        {v.title}
                      </div>
                      <div className="num text-xs text-muted-foreground">{v.views} views</div>
                    </figcaption>
                  </figure>
                ))}
              </div>

              <section className="panel space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Eyebrow>Text evidence</Eyebrow>
                    <span className="text-xs text-muted-foreground">
                      from titles and descriptions
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Languages className="size-4" aria-hidden />
                    <span id={translateId}>Translate quotes</span>
                    <Switch
                      aria-labelledby={translateId}
                      checked={english}
                      onCheckedChange={setEnglish}
                      size="sm"
                    />
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {quotes.map((q) => (
                    <li key={q.en.join("")} className="flex gap-3 text-[14px] leading-relaxed">
                      <span className="label-mono mt-0.5 h-5 shrink-0 rounded bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground uppercase">
                        {q.lang}
                      </span>
                      <span>
                        <Highlight parts={english ? q.en : q.text} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* The side panel's guidance, estimate and note, until it fits */}
              <section className="panel space-y-5 p-5 xl:hidden">
                <div className="space-y-2">
                  <h2 className="text-[19px] leading-snug">{QUESTION}</h2>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Judge the channel as a whole. One travel video on a cooking channel is still a
                    no.
                  </p>
                </div>
                <ModelEstimate channel={channel} />
                <Textarea
                  aria-label="Note"
                  placeholder="Note, optional. Visible to the second reviewer."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-20 bg-card text-sm"
                />
              </section>
            </div>
          </main>

          <div className="border-t bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:px-7 xl:hidden">
            <div className="mx-auto flex max-w-[920px] flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex gap-2 max-sm:w-full">
                {options.map((o) => {
                  const on = state.choice === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => dispatch({ type: "choose", value: o.value })}
                      className={cn(
                        "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11",
                        on
                          ? "border-primary bg-primary-soft text-primary-ink ring-1 ring-primary"
                          : "hover:border-border-strong hover:bg-muted/50"
                      )}
                    >
                      <Kbd className={cn(on && "bg-primary text-primary-foreground")}>{o.key}</Kbd>
                      {o.label}
                    </button>
                  )
                })}
              </div>
              <DecisionActions
                state={state}
                dispatch={dispatch}
                className="ml-auto max-sm:w-full"
              />
            </div>
          </div>
        </div>

        {/* Decision */}
        <aside className="hidden min-h-0 flex-col border-l bg-card xl:flex">
          <div className="min-h-0 flex-1 space-y-6 overflow-auto p-6">
            <div className="space-y-2">
              <Eyebrow>Your decision</Eyebrow>
              <h2 className="text-[22px] leading-snug">{QUESTION}</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Judge the channel as a whole. One travel video on a cooking channel is still a no.
              </p>
            </div>

            <fieldset className="min-w-0 space-y-2">
              <legend className="sr-only">Decision</legend>
              {options.map((o) => {
                const on = state.choice === o.value
                return (
                  <label
                    key={o.value}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      on
                        ? "border-primary bg-primary-soft ring-1 ring-primary"
                        : "hover:border-border-strong hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={o.value}
                      checked={on}
                      onChange={() => dispatch({ type: "choose", value: o.value })}
                      className="sr-only"
                    />
                    <Kbd
                      className={cn(
                        "h-6 min-w-6 text-[12px]",
                        on && "bg-primary text-primary-foreground"
                      )}
                    >
                      {o.key}
                    </Kbd>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold", on && "text-primary-ink")}>
                        {o.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>

            <ModelEstimate channel={channel} />

            <div className="space-y-2">
              <Eyebrow>Note</Eyebrow>
              <Textarea
                aria-label="Note"
                placeholder="Optional. Visible to the second reviewer."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-20 bg-card text-sm"
              />
            </div>
          </div>
          <DecisionActions state={state} dispatch={dispatch} className="border-t p-4" />
        </aside>
      </div>
    </div>
  )
}
