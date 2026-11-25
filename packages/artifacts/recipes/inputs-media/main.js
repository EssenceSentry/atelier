const book = Atelier.notebook({
  title: "Interactive evidence",
  description: "Synthetic SVG images illustrate the controls.",
})
const svg = (text) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="currentColor"/><text x="80" y="240" fill="white" font-size="50">${text}</text></svg>`
  )
const cell = book.cell({ id: "comparison", title: "Sliding image comparison", controls: true })
const media = Atelier.mount("media", cell.view, {
  type: "compare",
  before: svg("Before"),
  after: svg("After"),
  position: 50,
})
const z = Atelier.modules.inputs.z
Atelier.mount("inputs", cell.controls, {
  values: { position: 50, reviewer: "" },
  fields: [
    { key: "reviewer", label: "Reviewer", type: "text" },
    { key: "position", label: "Comparison position", type: "range", min: 0, max: 100 },
  ],
  schema: z.object({ reviewer: z.string().min(1), position: z.number().min(0).max(100) }),
  onChange: (values) =>
    void media.update({
      type: "compare",
      before: svg("Before"),
      after: svg("After"),
      position: values.position,
    }),
  onSubmit: (values) => Atelier.download("review.json", JSON.stringify(values)),
})
const slides = book.cell({ id: "gallery", title: "Evidence carousel" })
Atelier.mount("carousel", slides.view, {
  slides: [
    { src: svg("A"), alt: "Example A", title: "First view" },
    { src: svg("B"), alt: "Example B", title: "Second view" },
    { src: svg("C"), alt: "Example C", title: "Third view" },
  ],
})
