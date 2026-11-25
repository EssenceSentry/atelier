const book = Atelier.notebook({
  title: "Architecture notebook",
  description: "Illustrative system. Replace the topology with the actual deployment.",
})
const text = book.cell({ id: "context", title: "Data path" })
Atelier.mount("markdown", text.view, {
  source:
    "This **full-width** notebook shows an illustrative ingestion and inference path. Every diagram is independently zoomable.",
})
const cell = book.cell({ id: "architecture", title: "AWS deployment", controls: true })
const icons = Atelier.modules.icons
const aws = ["aws:aws-lambda", "aws:amazon-simple-storage-service", "aws:amazon-sagemaker-ai"].map(
  (id) => icons.catalog.find((item) => item.id === id)
)
const graph = {
  nodes: [
    {
      id: "ingest",
      data: {
        label: "Ingestion",
        description: "Validate incoming records",
        icon: icons.url(aws[0].id),
      },
    },
    {
      id: "store",
      data: {
        label: "Object storage",
        description: "Immutable inputs",
        icon: icons.url(aws[1].id),
      },
    },
    {
      id: "model",
      data: {
        label: "Classifier",
        description: "Run versioned inference",
        icon: icons.url(aws[2].id),
      },
    },
  ],
  edges: [
    { id: "a", source: "ingest", target: "store" },
    { id: "b", source: "store", target: "model" },
  ],
}
const flow = Atelier.mount("flow", cell.view, graph)
await flow.ready
Atelier.button("Fit architecture", () => flow.api.flow?.fitView(), cell.controls)
Atelier.canvasLink(flow, graph, { parent: cell.controls })
const sequence = book.cell({ id: "sequence", title: "Inference request" })
const config = {
  source:
    "sequenceDiagram\n  participant R as Reader\n  participant S as Service\n  R->>S: Submit record\n  S-->>R: Prediction and model version",
}
const diagram = Atelier.mount("mermaid", sequence.view, config)
await diagram.ready
Atelier.canvasLink(diagram, config, { parent: sequence.header })
