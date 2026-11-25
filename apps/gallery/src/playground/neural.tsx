/** biome-ignore-all lint/a11y/useSemanticElements: SVG observation marks need button roles; the surrounding HTML uses native controls. */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: Tensor coordinates, neuron slots and token positions are stable identities within each fixed grid. */
import * as tf from "@tensorflow/tfjs"
import {
  Activity,
  ArrowUpRight,
  Download,
  FileUp,
  Network,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { download } from "./data"
import { ArchitectureStudy, NeuralCanvas } from "./neural-canvas"
import { NeuralDiagnostics } from "./neural-diagnostics"
import { AttentionStudy, ConvolutionStudy, ModelViewers } from "./neural-families"
import {
  createNN,
  evaluate,
  type NNBundle,
  type NNConfig,
  type NNRuntime,
  type NNSnapshot,
  nnDefaults,
  validateBundle,
} from "./neural-model"
import "./neural.css"

const tabs = [
  ["playground", "Learning playground"],
  ["diagnostics", "Diagnostics"],
  ["architecture", "Architectures"],
  ["cnn", "Convolutions"],
  ["transformer", "Attention"],
  ["viewers", "Model viewers"],
] as const
type Tab = (typeof tabs)[number][0]
type Session = { runtime: NNRuntime; dead: boolean; fitting: boolean; stop: boolean }
let saved: { bundle: NNBundle; tab: Tab; threshold: number } | null = null

export default function NeuralStudy() {
  const [initial] = useState(() => {
    const fromTab = canvasOnly ? canvasState({ bundle: null as NNBundle | null }) : null
    return {
      bundle: fromTab?.bundle ? validateBundle(fromTab.bundle) : (saved?.bundle ?? null),
      tab: saved?.tab ?? "playground",
      threshold: saved?.threshold ?? 0.5,
    }
  })
  const [config, setConfig] = useState<NNConfig>(initial.bundle?.config ?? nnDefaults)
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [snapshot, setSnapshot] = useState<NNSnapshot | null>(null)
  const [runtime, setRuntime] = useState<NNRuntime | null>(null)
  const [selected, setSelected] = useState<[number, number]>([0, 0])
  const [sample, setSample] = useState(0)
  const [threshold, setThreshold] = useState(initial.threshold)
  const [running, setRunning] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(
      "Illustrative synthetic data · computation stays in this browser."
    )
  const incoming = useRef(initial.bundle)
  const session = useRef<Session | null>(null)
  const studyRoot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const pauseHiddenPage = (event: Event) => {
      const owner =
        studyRoot.current?.closest<HTMLElement>("[data-notebook-page]")?.dataset.notebookPage ??
        "neural"
      if ((event as CustomEvent<string>).detail !== owner && session.current)
        session.current.stop = true
    }
    window.addEventListener("atelier:notebook-page", pauseHiddenPage)
    return () => window.removeEventListener("atelier:notebook-page", pauseHiddenPage)
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: The revision explicitly resets the model and optimizer.
  useEffect(() => {
    let cancelled = false
    let current: Session | null = null
    setSnapshot(null)
    setRuntime(null)
    setError("")
    setRunning(false)
    setBusy(false)
    void (async () => {
      try {
        // These networks are tiny; CPU is deterministic and avoids a GPU requirement.
        await tf.setBackend("cpu")
        await tf.ready()
        if (cancelled) return
        const next = createNN(config, incoming.current ?? undefined)
        incoming.current = null
        current = { runtime: next, dead: false, fitting: false, stop: false }
        session.current = current
        setSelected([0, 0])
        setRuntime(next)
        setSnapshot(next.snapshot())
      } catch (cause) {
        if (!cancelled) setError(String(cause))
      }
    })()
    return () => {
      cancelled = true
      if (current) {
        current.dead = true
        current.stop = true
        if (!current.fitting) current.runtime.dispose()
      }
    }
  }, [config, revision])
  useEffect(() => {
    if (snapshot && !canvasOnly)
      saved = {
        bundle: {
          format: "atelier-neural-study-v1",
          config,
          epoch: snapshot.epoch,
          history: snapshot.history,
          layers: snapshot.layers,
        },
        tab,
        threshold,
      }
  }, [snapshot, config, tab, threshold])
  const train = async (continuous: boolean) => {
    const current = session.current
    if (!current || current.dead || current.fitting || !snapshot || snapshot.epoch >= 1000) return
    current.fitting = true
    current.stop = false
    setBusy(true)
    setRunning(continuous)
    setError("")
    let steps = 0
    try {
      do {
        await current.runtime.step()
        steps++
        if (current.dead) break
        if (steps % 5 === 0 || current.stop) setSnapshot(current.runtime.snapshot())
        await tf.nextFrame()
      } while (
        !current.dead &&
        !current.stop &&
        (continuous || steps < 5) &&
        snapshot.epoch + steps < 1000
      )
    } catch (cause) {
      if (!current.dead) setError(String(cause))
    } finally {
      current.fitting = false
      if (current.dead) current.runtime.dispose()
      else {
        setSnapshot(current.runtime.snapshot())
        setBusy(false)
        setRunning(false)
      }
    }
  }
  const choose = useCallback((layer: number, unit: number) => setSelected([layer, unit]), [])
  const updateConfig = (change: Partial<NNConfig>) => {
    incoming.current = null
    setConfig((current) => ({ ...current, ...change }))
    setNotice("Configuration changed. The network and optimizer have been reset.")
  }
  const importStudy = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 2000000) throw new Error("Choose a study smaller than 2 MB.")
      const bundle = validateBundle(JSON.parse(await file.text()))
      incoming.current = bundle
      setConfig(bundle.config)
      setRevision((n) => n + 1)
      setNotice(
        `Loaded ${file.name}. Weights and history restored; continued training starts a fresh Adam optimizer.`
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const metrics = useMemo(
    () => (snapshot ? evaluate(snapshot, threshold) : null),
    [snapshot, threshold]
  )
  const bundle: NNBundle | null = snapshot
    ? {
        format: "atelier-neural-study-v1",
        config,
        epoch: snapshot.epoch,
        history: snapshot.history,
        layers: snapshot.layers,
      }
    : null
  if (!snapshot || !runtime || !metrics)
    return (
      <div className="demo-stack neural-study">
        {error ? (
          <div role="alert" className="demo-error">
            {error}
            <button className="demo-button" type="button" onClick={() => setRevision((n) => n + 1)}>
              Retry initialization
            </button>
          </div>
        ) : (
          <div className="nn-initializing">
            <Network size={24} />
            <strong>Preparing the local network…</strong>
            <p>Loading TensorFlow.js and initializing the example weights.</p>
          </div>
        )}
      </div>
    )
  if (canvasOnly)
    return (
      <div className="demo-stack neural-study nn-canvas-only">
        <NeuralCanvas snapshot={snapshot} config={config} selected={selected} onSelect={choose} />
      </div>
    )
  return (
    <div
      className="demo-stack neural-study"
      ref={studyRoot}
      data-testid="neural-study"
      data-epoch={snapshot.epoch}
    >
      <div className="nn-page-toolbar">
        <div className="nn-local-status">
          <Activity size={15} />
          <strong>Local runtime</strong>
          <span>CPU · no training server</span>
        </div>
        <div className="demo-toolbar">
          <label className={`demo-button nn-file ${busy ? "disabled" : ""}`}>
            <FileUp size={13} />
            Import study
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Import neural study"
              disabled={busy}
              onChange={(event) => {
                void importStudy(event.target.files?.[0])
                event.target.value = ""
              }}
            />
          </label>
          <button
            type="button"
            className="demo-button"
            disabled={busy}
            onClick={() => download("neural-study.json", JSON.stringify(bundle, null, 2))}
          >
            <Download size={13} />
            Export study
          </button>
        </div>
      </div>
      <div className="nn-tabs" role="tablist" aria-label="Neural network studies">
        {tabs.map(([id, name]) => (
          <button
            type="button"
            role="tab"
            key={id}
            id={`nn-tab-${id}`}
            aria-controls={`nn-panel-${id}`}
            aria-selected={tab === id}
            onClick={() => {
              if (id !== "playground" && id !== "diagnostics" && session.current)
                session.current.stop = true
              setTab(id)
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {(tab === "playground" || tab === "diagnostics") && (
        <>
          <fieldset className="nn-metrics">
            <legend className="sr-only">Current neural network metrics</legend>
            <div>
              <span>Epoch</span>
              <strong data-testid="nn-epoch">
                {snapshot.epoch}
                <small> / 1,000</small>
              </strong>
            </div>
            <div>
              <span>Parameters</span>
              <strong>{snapshot.params}</strong>
            </div>
            <div>
              <span>Validation accuracy</span>
              <strong>
                {(metrics.accuracy * 100).toFixed(1)}
                <small>%</small>
              </strong>
            </div>
            <div>
              <span>Validation loss</span>
              <strong>{snapshot.history.at(-1)?.val_loss.toFixed(4) ?? "—"}</strong>
            </div>
            <div>
              <span>Decision threshold</span>
              <label>
                <span className="sr-only">Decision threshold</span>
                <input
                  aria-label="Decision threshold"
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
                <output>{threshold.toFixed(2)}</output>
              </label>
            </div>
          </fieldset>
          <div className="nn-training-toolbar">
            <div className="demo-toolbar">
              <button
                type="button"
                className="demo-button primary"
                disabled={(busy && !running) || snapshot.epoch >= 1000}
                onClick={() => {
                  if (running) {
                    if (session.current) session.current.stop = true
                  } else void train(true)
                }}
              >
                {running ? (
                  <>
                    <Pause size={13} />
                    Pause training
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    Train network
                  </>
                )}
              </button>
              <button
                type="button"
                className="demo-button"
                disabled={busy || snapshot.epoch >= 1000}
                onClick={() => {
                  void train(false)
                }}
              >
                <SkipForward size={13} />
                {busy && !running ? "Training…" : "Step 5 epochs"}
              </button>
              <button
                type="button"
                className="demo-button"
                disabled={busy}
                onClick={() => {
                  incoming.current = null
                  setRevision((n) => n + 1)
                  setNotice("Network reset to the same seed. Weights and optimizer are fresh.")
                }}
              >
                <RotateCcw size={13} />
                Reset network
              </button>
            </div>
            <span role="status" className="demo-meta">
              {snapshot.epoch >= 1000
                ? "1,000-epoch study limit reached. Reset to train again."
                : busy
                  ? "Training locally · diagnostics update every 5 epochs"
                  : notice}
            </span>
          </div>
        </>
      )}
      {error && (
        <p className="demo-error" role="alert">
          {error}
        </p>
      )}
      <div role="tabpanel" id={`nn-panel-${tab}`} aria-labelledby={`nn-tab-${tab}`}>
        {tab === "playground" && (
          <div className="demo-stack">
            <section className="demo-panel nn-config">
              <div className="demo-panel-head">
                <div>
                  <h2>A small classifier, in motion</h2>
                  <p>240 synthetic rows · 192 train / 48 validation · Adam · batch size 24</p>
                </div>
                <a
                  href="https://playground.tensorflow.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nn-source-link"
                >
                  Inspired by TensorFlow Playground
                  <ArrowUpRight size={12} />
                </a>
              </div>
              <fieldset disabled={busy} className="nn-config-fields">
                <legend className="sr-only">
                  Network configuration; changing a value resets training
                </legend>
                <label className="demo-field">
                  <span>Dataset</span>
                  <select
                    aria-label="Neural dataset"
                    value={config.dataset}
                    onChange={(e) =>
                      updateConfig({ dataset: e.target.value as NNConfig["dataset"] })
                    }
                  >
                    {["xor", "circles", "spiral"].map((id) => (
                      <option key={id} value={id}>
                        {id === "xor" ? "XOR" : id[0].toUpperCase() + id.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="demo-field">
                  <span>Hidden layers</span>
                  <select
                    aria-label="Hidden layers"
                    value={config.depth}
                    onChange={(e) => updateConfig({ depth: Number(e.target.value) })}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="demo-field">
                  <span>Neurons / layer</span>
                  <select
                    aria-label="Neurons per layer"
                    value={config.width}
                    onChange={(e) => updateConfig({ width: Number(e.target.value) })}
                  >
                    {[2, 3, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="demo-field">
                  <span>Activation</span>
                  <select
                    aria-label="Neural activation"
                    value={config.activation}
                    onChange={(e) =>
                      updateConfig({ activation: e.target.value as NNConfig["activation"] })
                    }
                  >
                    {["tanh", "relu", "sigmoid"].map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="demo-field">
                  <span>Learning rate</span>
                  <select
                    aria-label="Neural learning rate"
                    value={config.learningRate}
                    onChange={(e) => updateConfig({ learningRate: Number(e.target.value) })}
                  >
                    {[0.001, 0.01, 0.03, 0.1].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="demo-field">
                  <span>Input noise · {config.noise.toFixed(2)}</span>
                  <input
                    aria-label="Neural input noise"
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.02}
                    value={config.noise}
                    onChange={(e) => updateConfig({ noise: Number(e.target.value) })}
                  />
                </label>
              </fieldset>
              <div className="demo-panel-note">
                Configuration changes reset the network. The validation rows stay separate from
                gradient updates.
              </div>
            </section>
            <section className="demo-panel">
              <div className="demo-panel-head">
                <div>
                  <h2>Network & neuron responses</h2>
                  <p>
                    {[2, ...snapshot.layers.map((layer) => layer.output)].join(" → ")} · hidden{" "}
                    {config.activation} · sigmoid output
                  </p>
                </div>
                {bundle && <CanvasTab view="neural" state={{ bundle }} />}
              </div>
              <NeuralCanvas
                snapshot={snapshot}
                config={config}
                selected={selected}
                onSelect={choose}
              />
              <div className="demo-legend nn-legend">
                <span>
                  <i style={{ background: "var(--div-neg)" }} />
                  Negative response
                </span>
                <span>
                  <i style={{ background: "var(--div-pos)" }} />
                  Positive response
                </span>
                <span>Output tiles: below / above 0.5 probability</span>
              </div>
            </section>
            <div className="nn-playground-bottom">
              <DecisionField
                snapshot={snapshot}
                threshold={threshold}
                selected={sample}
                onSelect={setSample}
              />
              <NeuronInspector
                snapshot={snapshot}
                config={config}
                selected={selected}
                sample={sample}
              />
            </div>
          </div>
        )}
        {tab === "diagnostics" && (
          <NeuralDiagnostics snapshot={snapshot} runtime={runtime} threshold={threshold} />
        )}
        {tab === "architecture" && <ArchitectureStudy />}
        {tab === "cnn" && <ConvolutionStudy />}
        {tab === "transformer" && <AttentionStudy />}
        {tab === "viewers" && <ModelViewers />}
      </div>
      <p className="nn-study-note">
        This is a browser experiment with synthetic data. Study JSON restores this supported dense
        architecture, weights, and history; importing auto-classifier/PyTorch models will need a
        separate adapter.
      </p>
    </div>
  )
}

function DecisionField({
  snapshot,
  threshold,
  selected,
  onSelect,
}: {
  snapshot: NNSnapshot
  threshold: number
  selected: number
  onSelect: (index: number) => void
}) {
  const probabilities = snapshot.field.at(-1) ?? []
  return (
    <section className="demo-panel">
      <div className="demo-panel-head">
        <div>
          <h2>Decision surface</h2>
          <p>Full two-feature input plane · click an observation</p>
        </div>
      </div>
      <svg
        className="nn-decision-field"
        viewBox="0 0 400 340"
        role="img"
        aria-label="Classifier decision surface"
      >
        {probabilities.map((p, i) => (
          <rect
            key={`field-${i}`}
            x={48 + (i % 28) * 10.5}
            y={21 + (27 - Math.floor(i / 28)) * 10.5}
            width={10.6}
            height={10.6}
            fill={p >= threshold ? "var(--series-2)" : "var(--series-1)"}
            opacity={0.13 + Math.abs(p - 0.5) * 0.65}
          />
        ))}
        {snapshot.points.map((point, i) => (
          <circle
            key={`observation-${i}`}
            cx={48 + ((point.x + 1) / 2) * 294}
            cy={21 + ((1 - point.y) / 2) * 294}
            r={i === selected ? 5 : point.split === "validation" ? 3.2 : 2.3}
            fill={point.split === "validation" ? "var(--card)" : `var(--series-${point.label + 1})`}
            stroke={i === selected ? "var(--foreground)" : `var(--series-${point.label + 1})`}
            strokeWidth={i === selected ? 2 : 1.3}
            role="button"
            tabIndex={i === selected ? 0 : -1}
            aria-label={`Inspect observation ${i + 1}`}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect(i)
              }
            }}
            onClick={() => onSelect(i)}
          >
            <title>
              Row {i + 1} · {point.split} · observed {point.label} · probability{" "}
              {snapshot.probabilities[i].toFixed(3)}
            </title>
          </circle>
        ))}
        <text x={195} y={336} textAnchor="middle">
          x₁ · −1 to 1
        </text>
        <text transform="translate(17,165) rotate(-90)" textAnchor="middle">
          x₂ · −1 to 1
        </text>
      </svg>
      <div className="demo-legend nn-legend">
        <span>
          <i style={{ background: "var(--series-1)" }} />
          Negative class
        </span>
        <span>
          <i style={{ background: "var(--series-2)" }} />
          Positive class
        </span>
        <span>Hollow = validation</span>
      </div>
    </section>
  )
}

function NeuronInspector({
  snapshot,
  config,
  selected,
  sample,
}: {
  snapshot: NNSnapshot
  config: NNConfig
  selected: [number, number]
  sample: number
}) {
  const layerIndex = Math.min(selected[0], snapshot.layers.length - 1),
    layer = snapshot.layers[layerIndex],
    unit = Math.min(selected[1], layer.output - 1)
  const inputs =
    layerIndex === 0
      ? [snapshot.points[sample].x, snapshot.points[sample].y]
      : Array.from(
          { length: layer.input },
          (_, i) => snapshot.activations[layerIndex - 1][sample * layer.input + i]
        )
  const value = snapshot.activations[layerIndex][sample * layer.output + unit]
  const sum = inputs.reduce(
    (total, input, i) => total + input * layer.weights[i][unit],
    layer.biases[unit]
  )
  return (
    <section className="demo-panel nn-neuron-inspector">
      <div className="demo-panel-head">
        <div>
          <h2>Inside one neuron</h2>
          <p>
            {layerIndex === config.depth ? "Output" : `Hidden ${layerIndex + 1}`} · neuron{" "}
            {unit + 1} · row {sample + 1}
          </p>
        </div>
      </div>
      <div className="nn-neuron-equation">
        <code>{layerIndex === config.depth ? "sigmoid" : config.activation}(Σ xᵢwᵢ + b)</code>
        <strong>{value.toFixed(4)}</strong>
        <span>
          Pre-activation {sum.toFixed(4)} · bias {layer.biases[unit].toFixed(4)}
        </span>
      </div>
      <div className="nn-weights-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Input</th>
              <th scope="col">Value</th>
              <th scope="col">Weight</th>
              <th scope="col">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {inputs.map((input, i) => (
              <tr key={`input-${i}`}>
                <th scope="row">{i + 1}</th>
                <td>{input.toFixed(3)}</td>
                <td>{layer.weights[i][unit].toFixed(3)}</td>
                <td>{(input * layer.weights[i][unit]).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
