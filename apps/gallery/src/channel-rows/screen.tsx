import { AppBar } from "@/blocks/app-bar"
import { type ChannelEvidence, ChannelRow } from "@/blocks/channel-row"
// Public-domain NASA and SpaceX photographs from https://scikit-image.org/docs/stable/api/skimage.data.html
import astronaut from "./astronaut.jpg"
import field from "./deep-field.jpg"
import launch from "./launch.jpg"

const examples: ChannelEvidence[] = [
  {
    id: "orbital-notes",
    name: "Orbital Notes",
    badges: [
      { label: "Science · Yes", tone: "accent" },
      { label: "Reviewed", tone: "positive" },
    ],
    metadata: ["Long-form", "Rank 12", "Model score 0.927"],
    rationale: "The examples cover spaceflight, telescope observations and launch operations.",
    description: "Field notes on space science and the people who do it.",
    details: [{ label: "Reviewer votes", value: "Two of three reviewers cited the launch image." }],
    videos: [
      {
        id: "launch",
        title: "A night launch at Cape Canaveral",
        thumbnail: launch,
        citations: { count: 2, total: 3 },
      },
      {
        id: "collins",
        title: "Eileen Collins: Space Pioneer",
        thumbnail: astronaut,
        href: "https://www.youtube.com/watch?v=SMlCj6og5JA",
      },
      { id: "field", title: "What a deep-field exposure reveals", thumbnail: field },
      { id: "orbit", title: "How engineers choose a launch window" },
      {
        id: "optics",
        title: "Reading a telescope exposure",
        originalTitle: "Interpretar una exposición",
      },
      { id: "archive", title: "A tour of the mission archive" },
    ],
  },
  {
    id: "night-log",
    name: "The Night Log",
    badges: [{ label: "Science · Unlabeled" }],
    metadata: ["Format unknown"],
    evidenceNote: "Only titles were supplied for review.",
    videos: [
      { id: "guide", title: "Tracking the night sky" },
      { id: "notes", title: "Planning an observation" },
    ],
  },
  { id: "archive", name: "Archive feed", metadata: ["Awaiting review"], videos: [] },
]

export function ChannelRowsScreen() {
  return (
    <div className="min-h-svh">
      <AppBar product="Channel review" crumbs={["Evidence rows"]} />
      <main className="mx-auto max-w-[1360px] space-y-5 px-4 py-6 md:px-6">
        <header className="space-y-2">
          <h1 className="text-[28px] leading-tight">Channel evidence</h1>
          <p className="text-sm text-muted-foreground">
            Illustrative channels and review decisions. Sample photographs courtesy of NASA and
            SpaceX.
          </p>
        </header>
        {examples.map((channel) => (
          <ChannelRow key={channel.id} channel={channel} />
        ))}
      </main>
    </div>
  )
}
