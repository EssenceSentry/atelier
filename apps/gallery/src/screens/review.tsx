import { CloudCheck, ExternalLink, Flag, Keyboard, Languages, Search, SkipForward } from "lucide-react"
import { useState } from "react"

import { AppBar } from "@/blocks/app-bar"
import { Eyebrow, Meter, Thumb } from "@/blocks/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { queue, videos } from "@/lib/sample"
import { cn } from "@/lib/utils"

const options = [
  { key: "Y", value: "yes", label: "Yes, travel", hint: "Most uploads document trips or places" },
  { key: "N", value: "no", label: "No", hint: "Travel appears only occasionally" },
  { key: "U", value: "unsure", label: "Unsure", hint: "Needs a second reviewer" },
] as const

const quotes = [
  { lang: "no", text: ["Tre dager i ", "Lofoten", " med tog, ferje og leiebil."], en: ["Three days in ", "Lofoten", " by train, ferry and rental car."] },
  { lang: "en", text: ["Full ", "itinerary", " and costs are in the description."], en: ["Full ", "itinerary", " and costs are in the description."] },
  { lang: "no", text: ["Neste stopp: ", "Bodø", ", så nattoget sørover."], en: ["Next stop: ", "Bodø", ", then the night train south."] },
]

function Highlight({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-[3px] bg-primary-soft px-0.5 text-primary-ink">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
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

export function ReviewScreen() {
  const [choice, setChoice] = useState<string>("yes")
  const [english, setEnglish] = useState(true)

  return (
    <div className="flex h-svh flex-col">
      <AppBar
        product="Review desk"
        crumbs={["Travel topic", "Channel review"]}
        center={
          <div className="flex w-72 items-center gap-3 text-xs text-muted-foreground">
            <span className="num whitespace-nowrap">
              <span className="font-medium text-foreground">64</span> of 250
            </span>
            <Meter value={64} max={250} />
          </div>
        }
        right={
          <>
            <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
              <CloudCheck className="size-4 text-good" /> Saved 2 s ago
            </span>
            <Button size="icon-sm" variant="ghost" aria-label="Keyboard shortcuts">
              <Keyboard />
            </Button>
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
            <Tabs defaultValue="pending">
              <TabsList variant="line" className="w-full justify-start gap-3">
                <TabsTrigger value="pending" className="flex-none">
                  Pending <span className="num text-muted-foreground">186</span>
                </TabsTrigger>
                <TabsTrigger value="done" className="flex-none">
                  Done <span className="num text-muted-foreground">64</span>
                </TabsTrigger>
                <TabsTrigger value="flagged" className="flex-none">
                  Flagged <span className="num text-muted-foreground">3</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ul className="min-h-0 flex-1 overflow-auto p-1.5">
            {queue.map((q, i) => (
              <li
                key={q.handle}
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2",
                  i === 0 ? "bg-primary-soft" : "hover:bg-muted"
                )}
              >
                {i === 0 && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-primary" />}
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-ink-2 ring-1 ring-border">
                  {initials(q.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-[13px] font-medium", i === 0 && "text-primary-ink")}>{q.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {q.handle} · {q.subs}
                  </div>
                </div>
                {q.state === "flagged" && <Flag className="size-3.5 text-warning" aria-label="Flagged" />}
                <span className="label-mono num w-9 text-right text-xs text-ink-2">{q.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>Sorted by model score</span>
            <span className="flex items-center gap-1">
              <Kbd>J</Kbd>
              <Kbd>K</Kbd> move
            </span>
          </div>
        </aside>

        {/* Evidence */}
        <main className="min-h-0 overflow-auto">
          <div className="mx-auto max-w-[920px] space-y-6 p-5 md:p-7">
            <div className="flex flex-wrap items-start gap-4">
              <Thumb seed="wandernorth-avatar" w={160} h={160} className="size-16 shrink-0 rounded-full ring-1 ring-border" />
              <div className="min-w-0 flex-1 space-y-1">
                <Eyebrow>Channel 65 of 250</Eyebrow>
                <h1 className="text-[28px] leading-tight">Wander North</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                  <span>@wandernorth</span>
                  <span className="num">1.2M subscribers</span>
                  <span className="num">412 videos</span>
                  <span>Norway · Norwegian, English</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink /> Open channel
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 border-b">
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
              <label className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Languages className="size-4" /> English
                <Switch checked={english} onCheckedChange={setEnglish} size="sm" />
              </label>
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
                    <span className="label-mono num absolute right-1.5 bottom-1.5 rounded bg-black/72 px-1.5 py-0.5 text-[10.5px] text-white">
                      {v.length}
                    </span>
                    {v.evidence && (
                      <span className="absolute top-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Evidence
                      </span>
                    )}
                  </div>
                  <figcaption className="space-y-0.5">
                    <div className="line-clamp-2 text-[13px] leading-snug font-medium">{v.title}</div>
                    <div className="num text-xs text-muted-foreground">{v.views} views</div>
                  </figcaption>
                </figure>
              ))}
            </div>

            <section className="panel space-y-3 p-5">
              <div className="flex items-center justify-between">
                <Eyebrow>Text evidence</Eyebrow>
                <span className="text-xs text-muted-foreground">from titles and descriptions</span>
              </div>
              <ul className="space-y-2.5">
                {quotes.map((q, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="label-mono mt-0.5 h-5 shrink-0 rounded bg-muted px-1.5 text-[10.5px] leading-5 text-muted-foreground uppercase">
                      {q.lang}
                    </span>
                    <span>
                      <Highlight parts={english ? q.en : q.text} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>

        {/* Decision */}
        <aside className="hidden min-h-0 flex-col border-l bg-card xl:flex">
          <div className="min-h-0 flex-1 space-y-6 overflow-auto p-6">
            <div className="space-y-2">
              <Eyebrow>Your decision</Eyebrow>
              <h2 className="text-[22px] leading-snug">Is this channel primarily travel content?</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Judge the channel as a whole. One travel video on a cooking channel is still a no.
              </p>
            </div>

            <div className="space-y-2" role="radiogroup">
              {options.map((o) => {
                const on = choice === o.value
                return (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoice(o.value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors",
                      on ? "border-primary bg-primary-soft ring-1 ring-primary" : "hover:border-border-strong hover:bg-muted/50"
                    )}
                  >
                    <Kbd className={cn("h-6 min-w-6 text-[12px]", on && "bg-primary text-primary-foreground")}>{o.key}</Kbd>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold", on && "text-primary-ink")}>{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="well space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Eyebrow>Model estimate</Eyebrow>
                <span className="text-xs text-muted-foreground">calibrated</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="figure text-[34px]">0.94</span>
                <span className="pb-1 text-xs text-muted-foreground">rank 12 of 250 · agrees with 9 of 10 neighbours</span>
              </div>
              <Meter value={0.94} max={1} />
            </div>

            <div className="space-y-2">
              <Eyebrow>Note</Eyebrow>
              <Textarea placeholder="Optional. Visible to the second reviewer." className="min-h-20 bg-card text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t p-4">
            <Button variant="ghost" size="lg">
              <SkipForward /> Skip
            </Button>
            <Button size="lg" className="ml-auto flex-1">
              Save and next <Kbd className="ml-1 bg-primary-foreground/20 text-primary-foreground">⏎</Kbd>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
