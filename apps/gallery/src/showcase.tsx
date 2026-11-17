const examples = [
  {
    title: "Lab template",
    image: "lab-starter.webp",
    alt: "The lab starter with its parameter controls and linked plots",
    detail: "Change the sample inputs and watch the linked figures update.",
    href: "?s=lab&d=instrument&m=light",
    action: "Open the starter",
  },
  {
    title: "Probability Lab",
    image: "probability-lab.webp",
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
        Both screens use Atelier’s Instrument theme. The first is the lab you generate. The second
        is a working application built from it.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {examples.map((example) => (
          <article key={example.title} className="rounded-xl border bg-card p-4">
            <img
              className="w-full rounded-lg border"
              src={`${import.meta.env.BASE_URL}examples/${example.image}`}
              alt={example.alt}
            />
            <h2 className="mt-5 text-xl font-semibold">{example.title}</h2>
            <p className="my-3 max-w-prose text-ink-2">{example.detail}</p>
            <a className="font-medium text-primary underline" href={example.href}>
              {example.action}
            </a>
          </article>
        ))}
      </div>
    </main>
  )
}
