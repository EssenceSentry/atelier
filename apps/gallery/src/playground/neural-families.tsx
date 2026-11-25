/** biome-ignore-all lint/suspicious/noArrayIndexKey: Tensor coordinates, neuron slots and token positions are stable identities within each fixed grid. */
import * as tf from "@tensorflow/tfjs"
import { ArrowUpRight, ExternalLink, Play, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { random } from "./neural-model"

const projects = {
  playground: {
    name: "TensorFlow Playground",
    url: "https://playground.tensorflow.org/",
    description: "The original educational playground. Its small network trains in your browser.",
    note: "Hosted application · its own network engine and styling",
  },
  cnn: {
    name: "CNN Explainer",
    url: "https://poloclub.github.io/cnn-explainer/",
    description:
      "Explore a trained convolutional network, feature maps, and individual operations.",
    note: "Hosted application · downloads its example model and assets",
  },
  transformer: {
    name: "Transformer Explainer",
    url: "https://poloclub.github.io/transformer-explainer/",
    description: "Inspect token generation and attention in a live GPT-2 model.",
    note: "Hosted application · downloads model weights; may take time",
  },
  netron: {
    name: "Netron",
    url: "https://netron.app/",
    description:
      "Open supported model files and inspect their graph, operators, tensor shapes, and metadata.",
    note: "Hosted model viewer · separate from this study's JSON format",
  },
  spatial: {
    name: "3D LLM visualization",
    url: "https://bbycroft.net/llm",
    description: "A spatial walkthrough of a GPT-style model's tensors and computations.",
    note: "Hosted application · WebGL and its original interface",
  },
}
export function ExternalNeuralViewer({ initial = "cnn" }: { initial?: keyof typeof projects }) {
  const [project, setProject] = useState(initial),
    [loaded, setLoaded] = useState(false)
  const item = projects[project]
  return (
    <section className="demo-panel nn-external">
      <div className="demo-panel-head">
        <div>
          <h2>Explore the original applications</h2>
          <p>Load a full viewer here or give it a tab of its own.</p>
        </div>
        <label className="demo-field">
          <span>Application</span>
          <select
            aria-label="Neural application"
            value={project}
            onChange={(event) => {
              setProject(event.target.value as keyof typeof projects)
              setLoaded(false)
            }}
          >
            {Object.entries(projects).map(([id, p]) => (
              <option key={id} value={id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="nn-external-intro">
        <div>
          <strong>{item.name}</strong>
          <p>{item.description}</p>
          <span className="demo-meta">{item.note}</span>
        </div>
        <div className="demo-toolbar">
          <button
            type="button"
            className="demo-button"
            onClick={() => setLoaded((value) => !value)}
          >
            {loaded ? (
              "Unload viewer"
            ) : (
              <>
                <Play size={13} />
                Load viewer
              </>
            )}
          </button>
          <a className="demo-button" href={item.url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight size={13} />
            Open application
          </a>
        </div>
      </div>
      {loaded && (
        <>
          <div className="nn-embedded-note">
            <ExternalLink size={13} />
            External app · its original theme · use Open application if embedding is unavailable.
          </div>
          <iframe
            className="nn-external-frame"
            title={item.name}
            src={item.url}
            allow="fullscreen; clipboard-write"
            allowFullScreen
          />
        </>
      )}
    </section>
  )
}

const kernels = {
  vertical: { name: "Vertical edges", values: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
  horizontal: { name: "Horizontal edges", values: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
  sharpen: { name: "Sharpen", values: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
  blur: { name: "Box blur", values: Array(9).fill(1 / 9) as number[] },
}
const image = Array.from(
  { length: 64 },
  (_, i) => +(i % 8 >= 2 && i % 8 <= 5 && Math.floor(i / 8) >= 1 && Math.floor(i / 8) <= 6)
)
export function ConvolutionStudy() {
  const [pixels, setPixels] = useState(image),
    [kernel, setKernel] = useState<keyof typeof kernels>("vertical"),
    [relu, setRelu] = useState(true),
    [at, setAt] = useState(14)
  const result = useMemo(
    () =>
      tf.tidy(() => {
        const source = tf.tensor4d(pixels, [1, 8, 8, 1])
        const raw = tf.conv2d(source, tf.tensor4d(kernels[kernel].values, [3, 3, 1, 1]), 1, "valid")
        return {
          raw: Array.from(raw.dataSync()),
          output: Array.from((relu ? tf.relu(raw) : raw).dataSync()),
        }
      }),
    [pixels, kernel, relu]
  )
  const row = Math.floor(at / 6),
    column = at % 6
  const terms = kernels[kernel].values.map((weight, index) => ({
    weight,
    pixel: pixels[(row + Math.floor(index / 3)) * 8 + column + (index % 3)],
  }))
  return (
    <div className="demo-stack">
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Follow a convolution</h2>
            <p>Actual TensorFlow.js computation · fixed demonstration filters</p>
          </div>
          <div className="demo-toolbar">
            <label className="demo-field">
              <span>3 × 3 kernel</span>
              <select
                aria-label="Convolution kernel"
                value={kernel}
                onChange={(e) => setKernel(e.target.value as keyof typeof kernels)}
              >
                {Object.entries(kernels).map(([id, k]) => (
                  <option key={id} value={id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="demo-checkbox">
              <input type="checkbox" checked={relu} onChange={(e) => setRelu(e.target.checked)} />
              ReLU
            </label>
            <button type="button" className="demo-button" onClick={() => setPixels([...image])}>
              <RotateCcw size={13} />
              Reset image
            </button>
          </div>
        </div>
        <div className="nn-convolution-grid">
          <div>
            <h3>Input · 8 × 8</h3>
            <p>Click a pixel to change the image.</p>
            <div className="nn-pixel-grid" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>
              {pixels.map((pixel, i) => (
                <button
                  type="button"
                  key={`pixel-${i}`}
                  aria-label={`Image pixel ${Math.floor(i / 8) + 1}, ${(i % 8) + 1}`}
                  aria-pressed={pixel > 0}
                  className={`${pixel ? "filled" : ""} ${Math.floor(i / 8) >= row && Math.floor(i / 8) < row + 3 && i % 8 >= column && i % 8 < column + 3 ? "patch" : ""}`}
                  onClick={() =>
                    setPixels((current) => current.map((p, index) => (index === i ? 1 - p : p)))
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <h3>Kernel · 3 × 3</h3>
            <p>Stride 1 · valid padding</p>
            <div className="nn-kernel-grid">
              {kernels[kernel].values.map((value, i) => (
                <span key={`kernel-${i}`}>{value === 1 / 9 ? "1/9" : value}</span>
              ))}
            </div>
            <div className="nn-operation">8 − 3 + 1 = 6</div>
          </div>
          <div>
            <h3>Feature map · 6 × 6</h3>
            <p>Select a value to inspect its receptive field.</p>
            <div
              className="nn-pixel-grid nn-feature-grid"
              style={{ gridTemplateColumns: "repeat(6, 1fr)" }}
            >
              {result.output.map((value, i) => (
                <button
                  type="button"
                  key={`feature-${i}`}
                  aria-label={`Feature map row ${Math.floor(i / 6) + 1} column ${(i % 6) + 1}`}
                  aria-pressed={at === i}
                  onClick={() => setAt(i)}
                  style={{
                    background: `color-mix(in srgb, ${value < 0 ? "var(--div-neg)" : "var(--div-pos)"} ${Math.min(85, (Math.abs(value) / Math.max(1, ...result.output.map(Math.abs))) * 75 + 10)}%, var(--card))`,
                  }}
                >
                  {Math.abs(value) < 0.01 ? "0" : value.toFixed(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="nn-convolution-calculation">
          <span className="demo-meta">
            Output [{row + 1}, {column + 1}]
          </span>
          <code>
            {terms
              .map((term) => `${term.pixel}×${term.weight === 1 / 9 ? "⅑" : `(${term.weight})`}`)
              .join(" + ")}{" "}
            = {result.raw[at].toFixed(3)}
          </code>
          <strong>
            {relu ? "ReLU → " : "Output → "}
            {result.output[at].toFixed(3)}
          </strong>
        </div>
      </section>
      <ExternalNeuralViewer initial="cnn" />
    </div>
  )
}

export function AttentionStudy() {
  const [text, setText] = useState("a small model learns from useful examples"),
    [head, setHead] = useState(0),
    [temperature, setTemperature] = useState(1),
    [causal, setCausal] = useState(true),
    [query, setQuery] = useState(4)
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).slice(0, 10), [text])
  const active = Math.min(query, Math.max(0, words.length - 1))
  const matrix = useMemo(() => {
    if (!words.length) return []
    return tf.tidy(() => {
      const embedding = words.map((word, index) => {
        const next = random(
          Array.from(word).reduce((s, char) => s * 31 + char.charCodeAt(0), 7) + index * 17
        )
        return Array.from({ length: 4 }, () => next() * 2 - 1)
      })
      const next = random(23 + head * 37)
      const projection = () =>
        tf.tensor2d(
          Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => (next() - 0.5) * 2))
        )
      const input = tf.tensor2d(embedding),
        q = tf.matMul(input, projection()),
        k = tf.matMul(input, projection())
      let scores = tf.matMul(q, k, false, true).div(2 * temperature)
      if (causal)
        scores = scores.add(
          tf.tensor2d(words.map((_, i) => words.map((_, j) => (j > i ? -1e9 : 0))))
        )
      return tf.softmax(scores).arraySync() as number[][]
    })
  }, [words, head, temperature, causal])
  return (
    <div className="demo-stack">
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Inspect an attention head</h2>
            <p>
              Illustrative seeded vectors · actual QKᵀ and softmax · no pretrained language model
            </p>
          </div>
        </div>
        <div className="nn-attention-controls">
          <label className="demo-field nn-prompt">
            <span>Whitespace tokens · first 10</span>
            <input
              className="demo-input"
              aria-label="Attention text"
              value={text}
              maxLength={240}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label className="demo-field">
            <span>Head</span>
            <select
              aria-label="Attention head"
              value={head}
              onChange={(e) => setHead(Number(e.target.value))}
            >
              {[0, 1, 2].map((h) => (
                <option key={h} value={h}>
                  Head {h + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="demo-field">
            <span>Temperature · {temperature.toFixed(1)}</span>
            <input
              aria-label="Attention temperature"
              type="range"
              min={0.2}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </label>
          <label className="demo-checkbox">
            <input type="checkbox" checked={causal} onChange={(e) => setCausal(e.target.checked)} />
            Causal mask
          </label>
        </div>
        {!words.length ? (
          <p className="nn-chart-empty">Enter a few words to compute attention.</p>
        ) : (
          <div className="nn-attention-workspace">
            <div>
              <h3>Query token</h3>
              <div className="nn-token-list">
                {words.map((word, i) => (
                  <button
                    type="button"
                    key={`token-${i}`}
                    className="demo-button"
                    aria-pressed={active === i}
                    onClick={() => setQuery(i)}
                  >
                    <span>{i + 1}</span>
                    {word}
                  </button>
                ))}
              </div>
              <div className="nn-info">
                <code>softmax(QKᵀ / (√4 × temperature))</code>
                <p>
                  The highlight shows which earlier tokens this query attends to. Token vectors and
                  projections are seeded for this demonstration.
                </p>
              </div>
            </div>
            <div className="nn-attention-map">
              <h3>Attention matrix</h3>
              <p>Rows: queries · columns: keys · each row sums to 1</p>
              <div className="nn-attention-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Query ↓ / Key →</th>
                      {words.map((word, i) => (
                        <th scope="col" key={`key-${i}`}>
                          {i + 1}
                          <span>{word}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, i) => (
                      <tr key={`query-${i}`} className={active === i ? "selected" : ""}>
                        <th scope="row">
                          {i + 1} · {words[i]}
                        </th>
                        {row.map((value, j) => (
                          <td
                            key={`attention-${j}`}
                            style={{
                              background: `color-mix(in srgb, var(--series-1) ${Math.round(value * 85)}%, var(--card))`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setQuery(i)}
                              aria-label={`Attention from ${i + 1} to ${j + 1}: ${value.toFixed(3)}`}
                            >
                              {causal && j > i ? "—" : value.toFixed(2)}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="nn-attention-total" data-testid="attention-total">
                Selected row sum: {(matrix[active]?.reduce((a, b) => a + b, 0) ?? 0).toFixed(6)}
              </p>
            </div>
          </div>
        )}
      </section>
      <ExternalNeuralViewer initial="transformer" />
    </div>
  )
}

export function ModelViewers() {
  return (
    <div className="demo-stack">
      <div className="nn-info">
        <strong>Bring the right model to the right viewer.</strong>
        <p>
          Netron inspects supported model files. The 3D viewer explains a GPT-style architecture.
          These external applications load only when requested; they keep their own interface. Our
          local study exports are for the dense playground.
        </p>
      </div>
      <ExternalNeuralViewer initial="netron" />
    </div>
  )
}
