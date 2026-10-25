import {
  CloudCheck,
  ExternalLink,
  Flag,
  Languages,
  ListChecks,
  ListOrdered,
  ScanSearch,
  Search,
  SearchX,
  SkipForward,
  Undo2,
  X,
} from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useId, useReducer, useRef, useState } from "react"

import { AppBar } from "@/blocks/app-bar"
import { ShortcutsHelp } from "@/blocks/keyboard"
import { Eyebrow, Meter, Thumb } from "@/blocks/primitives"
import { EmptyState } from "@/blocks/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useKeys } from "@/lib/keys"
import { itemDetail, queue } from "@/lib/sample"
import { cn } from "@/lib/utils"

const options = [
  { key: "Y", value: "yes", label: "Yes, travel", hint: "Most uploads document trips or places" },
  { key: "N", value: "no", label: "No", hint: "Travel appears only occasionally" },
  { key: "U", value: "unsure", label: "Unsure", hint: "Flags it for a second reviewer" },
] as const

const QUESTION = "Is this channel primarily travel content?"
const GUIDANCE =
  "Judge the channel as a whole. One travel video on a cooking channel is still a no."

type Choice = (typeof options)[number]["value"]
type Channel = (typeof queue)[number]
type Tab = "pending" | "saved" | "flagged"

// The topic has 250 channels and loads them in slices; the sample queue is one.
const TOTAL = 250
const SAVED_BEFORE = 64

const ranked: Channel[] = [...queue].sort((a, b) => b.score - a.score)
const languageNames = new Intl.DisplayNames(["en"], { type: "language" })
const languageName = (code: string) => languageNames.of(code) ?? code
const labelOf = (choice: Choice) => options.find((o) => o.value === choice)?.label ?? choice

/** The three channels nearest in score, standing in for embedding neighbours. */
const neighbours = (channel: Channel) =>
  ranked
    .filter((c) => c !== channel)
    .sort((a, b) => Math.abs(a.score - channel.score) - Math.abs(b.score - channel.score))
    .slice(0, 3)

type State = {
  tab: Tab
  selected: string
  choice: Choice | null
  decisions: Record<string, Choice>
  /** Saved decisions in this slice, newest last, with what each one replaced. */
  history: { handle: string; previous?: Choice }[]
  /** Channels saved before this slice, in earlier sessions or slices. */
  savedBefore: number
  /** Search text that narrows the queue by name or handle. */
  query: string
}

type Action =
  | { type: "choose"; value: Choice }
  | { type: "select"; handle: string }
  | { type: "move"; by: 1 | -1 }
  | { type: "save" }
  | { type: "skip" }
  | { type: "undo" }
  | { type: "tab"; tab: Tab }
  | { type: "next-slice" }
  | { type: "search"; query: string }

const initialState: State = {
  tab: "pending",
  selected: ranked[0].handle,
  choice: null,
  decisions: {},
  history: [],
  savedBefore: SAVED_BEFORE,
  query: "",
}

function visible({
  tab,
  decisions,
  query = "",
}: Pick<State, "tab" | "decisions"> & { query?: string }) {
  const needle = query.trim().toLowerCase()
  const matches = (c: Channel) =>
    !needle || c.name.toLowerCase().includes(needle) || c.handle.includes(needle)
  if (tab === "flagged")
    return ranked.filter(
      (c) => matches(c) && (c.state === "flagged" || decisions[c.handle] === "unsure")
    )
  return ranked.filter((c) => matches(c) && (tab === "saved") === c.handle in decisions)
}

/** The next unsaved channel after `handle`, wrapping round the slice. */
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
      // Saving the answer already saved moves on, or to the next slice at the end.
      if (state.decisions[state.selected] === state.choice)
        return nextPending(state.selected, state.decisions)
          ? reducer(state, { type: "skip" })
          : reducer(state, { type: "next-slice" })
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
    case "search":
      return { ...state, query: action.query }
    case "next-slice":
      // The example reloads the same channels; a real app fetches the next slice.
      return {
        ...initialState,
        savedBefore: state.savedBefore + Object.keys(state.decisions).length,
      }
  }
}

/** The review keys, bound through the kit's `useKeys`. */
function useReviewKeys(dispatch: (action: Action) => void) {
  useKeys([
    ...options.map((o) => ({
      key: o.key,
      run: () => dispatch({ type: "choose", value: o.value }),
    })),
    { key: "j", repeat: true, run: () => dispatch({ type: "move", by: 1 }) },
    { key: "k", repeat: true, run: () => dispatch({ type: "move", by: -1 }) },
    {
      key: "Enter",
      run: (event) => {
        // A radio keeps focus after a mouse pick; drop it so its focus ring
        // is not mistaken for an answer on the next channel.
        if (event.target instanceof HTMLInputElement) event.target.blur()
        dispatch({ type: "save" })
      },
    },
    { key: "s", run: () => dispatch({ type: "skip" }) },
    { key: "z", run: () => dispatch({ type: "undo" }) },
    { key: "z", mod: true, run: () => dispatch({ type: "undo" }) },
  ])
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
          // The negative margin cancels the padding so punctuation stays attached.
          <mark
            key={key}
            className="-mx-0.5 rounded-[3px] bg-primary-soft box-decoration-clone px-0.5 text-foreground"
          >
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
  ["Y N U", "choose"],
  ["J K", "next or previous channel"],
  ["⏎", "save and go to the next"],
  ["S", "skip"],
  ["Z or ⌘Z", "undo the last save"],
] as [string, string][]

function DecisionActions({
  state,
  dispatch,
  className,
}: {
  state: State
  dispatch: (action: Action) => void
  className?: string
}) {
  const saved = state.decisions[state.selected]
  const finished = sliceDone(state) && saved === state.choice
  const label = !saved
    ? "Save and next"
    : saved !== state.choice
      ? "Update and next"
      : finished
        ? "Load next slice"
        : "Next"
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
        <SkipForward /> Skip <Kbd className="ml-0.5 pointer-coarse:hidden">S</Kbd>
      </Button>
      <Button
        size="lg"
        className="ml-auto flex-1"
        disabled={!state.choice}
        onClick={() => dispatch({ type: "save" })}
      >
        {label}{" "}
        <Kbd className="ml-1 bg-primary-foreground/20 text-primary-foreground pointer-coarse:hidden">
          ⏎
        </Kbd>
      </Button>
    </div>
  )
}

/** A decision, marked with a flag only when it sends the channel to Flagged. */
function DecisionBadge({ choice, prefix = "" }: { choice: Choice; prefix?: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap text-ink-2">
      {choice === "unsure" && <Flag className="size-3.5 text-warning" />}
      {prefix}
      {labelOf(choice)}
    </span>
  )
}

function SavedAs({ choice }: { choice?: Choice }) {
  if (!choice) return null
  return <DecisionBadge choice={choice} prefix="Saved: " />
}

const sliceDone = (state: State) => ranked.every((c) => c.handle in state.decisions)
const leftInTopic = (state: State) =>
  TOTAL - state.savedBefore - Object.keys(state.decisions).length

function ModelEstimate({ channel }: { channel: Channel }) {
  const rank = ranked.indexOf(channel) + 1
  return (
    <div className="well space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Model estimate</Eyebrow>
        <span className="text-xs text-muted-foreground">calibrated</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="figure text-[22px]">{channel.score.toFixed(2)}</span>
        <span className="num pb-1 text-xs text-muted-foreground">
          rank {rank} of {ranked.length} in this slice
        </span>
      </div>
      <Meter value={channel.score} max={1} />
    </div>
  )
}

function Queue({
  state,
  dispatch,
  onPick,
}: {
  state: State
  dispatch: (action: Action) => void
  onPick?: () => void
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const list = visible(state)
  const saved = Object.keys(state.decisions).length
  const counts: Record<Tab, number> = {
    pending: ranked.length - saved,
    saved,
    flagged: visible({ tab: "flagged", decisions: state.decisions }).length,
  }
  const left = leftInTopic(state)

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the selection changes
  useEffect(() => {
    listRef.current?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "nearest" })
  }, [state.selected])

  return (
    <>
      <div className="space-y-3 border-b p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search channels"
            className="bg-card pl-8"
            value={state.query}
            onChange={(event) => dispatch({ type: "search", query: event.target.value })}
          />
        </div>
        <Tabs value={state.tab} onValueChange={(tab: Tab) => dispatch({ type: "tab", tab })}>
          <TabsList variant="line" className="w-full gap-0">
            {(
              [
                ["pending", "To review"],
                ["saved", "Saved"],
                ["flagged", "Flagged"],
              ] as const
            ).map(([tab, name]) => (
              <TabsTrigger key={tab} value={tab} className="text-[13px]">
                {name} <span className="num text-muted-foreground">{counts[tab]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {list.length ? (
        <ul ref={listRef} className="min-h-0 flex-1 overflow-auto p-1.5">
          {list.map((c) => {
            const on = c.handle === state.selected
            const decision = state.decisions[c.handle]
            return (
              <li key={c.handle}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => {
                    dispatch({ type: "select", handle: c.handle })
                    onPick?.()
                  }}
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
                      {decision ? `Saved: ${labelOf(decision)}` : `${c.handle}, ${c.subs}`}
                    </span>
                  </span>
                  {(c.state === "flagged" || decision === "unsure") && (
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
      ) : state.query.trim() ? (
        <EmptyState
          icon={<SearchX />}
          title={`No channels match “${state.query.trim()}”`}
          className="flex-1"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: "search", query: "" })}
            >
              Clear search
            </Button>
          }
        >
          Search looks at names and handles.
        </EmptyState>
      ) : state.tab === "pending" ? (
        <EmptyState
          icon={<ListChecks />}
          title={`Slice done: ${saved} saved`}
          className="flex-1"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "undo" })}>
                <Undo2 /> Undo last save
              </Button>
              <Button size="sm" onClick={() => dispatch({ type: "next-slice" })}>
                Load next slice
              </Button>
            </div>
          }
        >
          {left} channels left in this topic.
        </EmptyState>
      ) : (
        <EmptyState
          icon={state.tab === "saved" ? <ListChecks /> : <Flag />}
          title={state.tab === "saved" ? "Nothing saved in this slice" : "No flagged channels"}
          className="flex-1"
        >
          {state.tab === "saved"
            ? "Channels you save appear here."
            : "Unsure answers and channels flagged earlier appear here."}
        </EmptyState>
      )}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <span>Sorted by model score</span>
        <span className="flex items-center gap-1 pointer-coarse:hidden">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd> move
        </span>
      </div>
    </>
  )
}

export function ReviewScreen({
  product = "Review desk",
  icon,
}: {
  product?: string
  icon?: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [english, setEnglish] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [queueOpen, setQueueOpen] = useState(false)
  const translateId = useId()
  const evidenceRef = useRef<HTMLElement>(null)
  useReviewKeys(dispatch)

  const channel = ranked.find((c) => c.handle === state.selected) ?? ranked[0]
  const detail = itemDetail(channel.handle, channel.score)
  const savedTotal = state.savedBefore + Object.keys(state.decisions).length
  const savedThisSession = savedTotal - SAVED_BEFORE
  const note = notes[channel.handle] ?? ""
  const setNote = (value: string) => setNotes((all) => ({ ...all, [channel.handle]: value }))

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the selection changes
  useEffect(() => {
    evidenceRef.current?.scrollTo({ top: 0 })
  }, [state.selected])

  return (
    <div className="flex h-svh flex-col">
      <AppBar
        product={product}
        icon={icon}
        crumbs={["Travel topic", "Channel review"]}
        center={
          <div className="flex w-full items-center gap-3 text-xs text-muted-foreground lg:w-72">
            <span className="num whitespace-nowrap">
              <span className="font-medium text-foreground">{savedTotal}</span> of {TOTAL} saved in
              topic
            </span>
            <Meter value={savedTotal} max={TOTAL} />
          </div>
        }
        right={
          <>
            {savedThisSession > 0 && (
              <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                <CloudCheck className="size-4" /> {savedThisSession} saved this session
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="md:hidden"
              onClick={() => setQueueOpen(true)}
            >
              <ListOrdered /> Queue
            </Button>
            <ShortcutsHelp items={shortcuts} />
          </>
        }
      />

      {/* Phones get the queue as a full-screen sheet instead of a side column. */}
      {queueOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background md:hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <span className="text-[15px] font-semibold">Queue</span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Close queue"
              onClick={() => setQueueOpen(false)}
            >
              <X />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <Queue state={state} dispatch={dispatch} onPick={() => setQueueOpen(false)} />
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr_380px]">
        <aside className="hidden min-h-0 flex-col border-r bg-sunken/50 md:flex">
          <Queue state={state} dispatch={dispatch} />
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
                    <span className="num">{detail.uploads.toLocaleString()} videos</span>
                    <span className="num">since {detail.since}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <ExternalLink /> Open channel
                </Button>
              </div>

              <Tabs defaultValue="videos" className="gap-6">
                <div className="border-b">
                  <TabsList variant="line" className="gap-4">
                    <TabsTrigger value="videos" className="flex-none">
                      Recent videos{" "}
                      <span className="num text-muted-foreground">{detail.videos.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="about" className="flex-none">
                      About
                    </TabsTrigger>
                    <TabsTrigger value="similar" className="flex-none">
                      Similar decisions
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="videos">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
                    {detail.videos.map((v) => (
                      <figure key={v.seed} className="m-0 space-y-2">
                        <div className="relative">
                          <Thumb seed={v.seed} className="aspect-video rounded-lg" />
                          <span className="label-mono num absolute right-1.5 bottom-1.5 rounded bg-black/72 px-1.5 py-0.5 text-[11px] text-white">
                            {v.length}
                          </span>
                          {v.evidence && (
                            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-xs backdrop-blur-sm">
                              <ScanSearch className="size-3" /> Evidence
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
                </TabsContent>

                <TabsContent value="about">
                  <div className="max-w-[640px]">
                    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[13px]">
                      {[
                        ["Handle", channel.handle],
                        ["Subscribers", channel.subs],
                        ["Uploads", detail.uploads.toLocaleString()],
                        ["On YouTube since", String(detail.since)],
                        ["Model score", channel.score.toFixed(2)],
                      ].map(([term, value]) => (
                        <div key={term} className="contents">
                          <dt className="text-muted-foreground">{term}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </TabsContent>

                <TabsContent value="similar">
                  <ul className="max-w-[640px] divide-y text-[13px]">
                    {neighbours(channel).map((n) => (
                      <li key={n.handle} className="flex items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{n.name}</span>
                          <span className="num block text-muted-foreground">
                            model {n.score.toFixed(2)}
                          </span>
                        </span>
                        {state.decisions[n.handle] ? (
                          <DecisionBadge choice={state.decisions[n.handle]} />
                        ) : (
                          <span className="text-muted-foreground">Not saved yet</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>

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
                  {detail.quotes.map((q) => (
                    <li key={q.en.join("")} className="flex gap-3 text-[14px] leading-relaxed">
                      <span>
                        <Highlight parts={english ? q.en : q.text} />
                        {q.lang !== "en" && (
                          <span className="ml-2 text-xs whitespace-nowrap text-muted-foreground">
                            {english ? `from ${languageName(q.lang)}` : languageName(q.lang)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* The side panel's guidance, estimate and note, until it fits */}
              <section className="panel space-y-5 p-5 xl:hidden">
                <p className="text-[13px] leading-relaxed text-muted-foreground">{GUIDANCE}</p>
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
            <div className="mx-auto max-w-[920px] space-y-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                {/* Phones get the short form so the bar keeps to one line of context. */}
                <span className="font-medium">
                  <span className="sm:hidden">Travel content?</span>
                  <span className="max-sm:hidden">{QUESTION}</span>
                </span>
                <SavedAs choice={state.decisions[state.selected]} />
                {sliceDone(state) && (
                  <span className="text-muted-foreground">
                    Slice done, {leftInTopic(state)} left in this topic
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
                        <Kbd
                          className={cn(
                            "pointer-coarse:hidden",
                            on && "bg-primary text-primary-foreground"
                          )}
                        >
                          {o.key}
                        </Kbd>
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
        </div>

        {/* Decision */}
        <aside className="hidden min-h-0 flex-col border-l bg-card xl:flex">
          <div className="min-h-0 flex-1 space-y-6 overflow-auto p-6">
            <div className="space-y-2">
              <Eyebrow>Your decision</Eyebrow>
              <h2 className="text-[22px] leading-snug">{QUESTION}</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{GUIDANCE}</p>
            </div>

            <fieldset className="min-w-0 space-y-2">
              <legend className="sr-only">Decision</legend>
              <SavedAs choice={state.decisions[state.selected]} />
              {options.map((o) => {
                const on = state.choice === o.value
                return (
                  <label
                    key={o.value}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring/50",
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
                      <span className="block text-[13px] text-muted-foreground">{o.hint}</span>
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
          <div className="space-y-3 border-t p-4">
            {sliceDone(state) && (
              <p className="text-[13px] text-muted-foreground">
                Slice done, {leftInTopic(state)} left in this topic
              </p>
            )}
            <DecisionActions state={state} dispatch={dispatch} />
          </div>
        </aside>
      </div>
    </div>
  )
}
