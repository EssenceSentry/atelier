const book = Atelier.notebook({
  title: "Neural explainers",
  description:
    "External applications load only after you choose to load them. Their hosts may disable embedding; use the original-app link if needed.",
})
for (const [id, title, url] of [
  ["playground", "TensorFlow Playground", "https://playground.tensorflow.org/"],
  ["cnn", "CNN Explainer", "https://poloclub.github.io/cnn-explainer/"],
  ["transformer", "Transformer Explainer", "https://poloclub.github.io/transformer-explainer/"],
  ["netron", "Netron", "https://netron.app/"],
]) {
  const cell = book.cell({ id, title })
  Atelier.mount("viewer", cell.view, { title, url })
}
