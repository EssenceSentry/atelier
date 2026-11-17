import reviewStation from "../../../docs/media/review-station.webp"
import aside from "./examples/aside.webp"
import labStarter from "./examples/lab-starter.webp"
import probabilityLab from "./examples/probability-lab.webp"

const examples = [
  {
    title: "Review station template",
    image: reviewStation,
    alt: "The review queue with the selected item and its evidence pane",
    detail: "Select a queue item, inspect the evidence and record a decision.",
    href: "?s=review&d=instrument&m=light",
    action: "Open the review station",
  },
  {
    title: "Aside for macOS",
    image: aside,
    alt: "A fictional listening study open in Aside’s transcript editor",
    detail:
      "Aside started from Atelier’s monitor template. Its transcript editor pairs each passage with the original audio so a reviewer can check what was said.",
    href: "https://github.com/EssenceSentry/aside-macos",
    action: "Explore Aside",
  },
  {
    title: "Lab template",
    image: labStarter,
    alt: "The lab starter with its parameter controls and linked plots",
    detail: "Change the sample inputs and watch the linked figures update.",
    href: "?s=lab&d=instrument&m=light",
    action: "Open the starter",
  },
  {
    title: "Probability Lab",
    image: probabilityLab,
    alt: "A Bayesian coin model with its draw inspector open",
    detail:
      "The finished app replaces the sample charts with a graph of a Bayesian model. Pick a variable to trace one draw.",
    href: "https://essencesentry.github.io/probability-lab-teaching/",
    action: "Try the finished app",
  },
]

export function Showcase() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-12 pb-32">
      <h1 className="text-3xl font-semibold">From starter to shipped app</h1>
      <p className="my-4 max-w-prose text-ink-2">
        Compare the review station with Aside’s transcript editor, then follow the lab template into
        Probability Lab. All four screens use the Instrument theme.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {examples.map((example) => (
          <article key={example.title} className="rounded-xl border bg-card p-4">
            <img className="w-full rounded-lg border" src={example.image} alt={example.alt} />
            <h2 className="mt-5 text-xl font-semibold">{example.title}</h2>
            <p className="my-3 max-w-prose text-ink-2">{example.detail}</p>
            <a
              className="inline-flex min-h-11 items-center font-medium text-primary underline"
              href={example.href}
            >
              {example.action}
            </a>
          </article>
        ))}
      </div>
    </main>
  )
}
