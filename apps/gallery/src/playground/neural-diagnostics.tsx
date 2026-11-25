/** biome-ignore-all lint/suspicious/noArrayIndexKey: Tensor coordinates, neuron slots and token positions are stable identities within each fixed grid. */
import * as tfvis from "@tensorflow/tfjs-vis"
import { useEffect, useMemo, useRef, useState } from "react"
import { useVizTokens } from "@/blocks/use-viz-tokens"
import { finalizeNeuralPlots } from "./neural-embed"
import type { NNRuntime, NNSnapshot } from "./neural-model"
import { evaluate } from "./neural-model"

export function NeuralDiagnostics({
  snapshot,
  runtime,
  threshold,
}: {
  snapshot: NNSnapshot
  runtime: NNRuntime
  threshold: number
}) {
  const tokens = useVizTokens()
  const loss = useRef<HTMLDivElement>(null),
    confusion = useRef<HTMLDivElement>(null),
    histogram = useRef<HTMLDivElement>(null),
    summary = useRef<HTMLDivElement>(null),
    gradients = useRef<HTMLDivElement>(null),
    activations = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(400),
    [error, setError] = useState("")
  const metrics = useMemo(() => evaluate(snapshot, threshold), [snapshot, threshold])
  useEffect(() => {
    const hosts = [
      loss.current,
      confusion.current,
      histogram.current,
      summary.current,
      gradients.current,
      activations.current,
    ]
    return () => {
      for (const host of hosts) if (host) finalizeNeuralPlots(host)
    }
  }, [])
  useEffect(() => {
    if (!loss.current) return
    const observer = new ResizeObserver(([entry]) =>
      setSize(Math.max(200, Math.floor(entry.contentRect.width) - 24))
    )
    observer.observe(loss.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!tokens || !loss.current || !confusion.current || !histogram.current || !summary.current)
      return
    let active = true
    const options = { width: size, height: 240, fontSize: 11 }
    // Use tfjs-vis renderers in our own panels; no floating Visor or global styles.
    const render = async () => {
      try {
        if (!snapshot.history.length && loss.current) {
          finalizeNeuralPlots(loss.current)
          loss.current.replaceChildren()
        }
        await Promise.all([
          snapshot.history.length
            ? tfvis.render.linechart(
                loss.current as HTMLDivElement,
                {
                  values: [
                    snapshot.history.map((row) => ({ x: row.epoch, y: row.loss })),
                    snapshot.history.map((row) => ({ x: row.epoch, y: row.val_loss })),
                  ],
                  series: ["Train", "Validation"],
                },
                {
                  ...options,
                  xLabel: "Epoch",
                  yLabel: "Binary cross-entropy",
                  seriesColors: tokens.series.slice(0, 2),
                }
              )
            : Promise.resolve(),
          tfvis.render.confusionMatrix(
            confusion.current as HTMLDivElement,
            {
              values: [
                [metrics.tn, metrics.fp],
                [metrics.fn, metrics.tp],
              ],
              tickLabels: ["Negative", "Positive"],
            },
            {
              ...options,
              colorMap: [tokens.rampLow, tokens.series[0]],
              xLabel: "Predicted",
              yLabel: "Observed",
            }
          ),
          tfvis.render.histogram(
            histogram.current as HTMLDivElement,
            snapshot.layers.flatMap((layer) => layer.weights.flat()),
            { ...options, color: tokens.series[0], xLabel: "Weight", maxBins: 20, stats: false }
          ),
          tfvis.show.modelSummary(summary.current as HTMLDivElement, runtime.model),
          tfvis.render.barchart(
            gradients.current as HTMLDivElement,
            snapshot.gradients.map((gradient, index) => ({
              index: index + 1,
              value: gradient.norm,
            })),
            { ...options, color: tokens.series[0], yLabel: "L2 norm", xLabel: "Trainable tensor" }
          ),
          tfvis.render.histogram(
            activations.current as HTMLDivElement,
            snapshot.activations.slice(0, -1).flat(),
            {
              ...options,
              color: tokens.series[0],
              xLabel: "Hidden activation",
              maxBins: 20,
              stats: false,
            }
          ),
        ])
        if (active) setError("")
      } catch (cause) {
        if (active) setError(String(cause))
      }
    }
    void render()
    return () => {
      active = false
    }
  }, [tokens, size, snapshot, metrics, runtime])
  const pr = useMemo(() => {
    const sorted = [...metrics.points].sort((a, b) => b.probability - a.probability)
    const positives = sorted.filter((point) => point.label).length
    let tp = 0,
      fp = 0
    const rows = [{ recall: 0, precision: 1 }]
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].label) tp++
      else fp++
      if (i === sorted.length - 1 || sorted[i].probability !== sorted[i + 1].probability)
        rows.push({ recall: positives ? tp / positives : 0, precision: tp / (tp + fp) })
    }
    return rows
  }, [metrics])
  const calibration = useMemo(
    () =>
      Array.from({ length: 6 }, (_, bin) => {
        const rows = metrics.points.filter(
          (p) => Math.min(5, Math.floor(p.probability * 6)) === bin
        )
        return {
          count: rows.length,
          probability: rows.reduce((s, p) => s + p.probability, 0) / rows.length,
          frequency: rows.reduce((s, p) => s + p.label, 0) / rows.length,
        }
      }).filter((bin) => bin.count > 0),
    [metrics]
  )
  return (
    <div className="demo-stack nn-diagnostics">
      <div className="nn-info">
        <strong>One model, one validation split.</strong>
        <p>
          All panels use the current network. The 48 validation rows are illustrative, and repeated
          inspection guides this experiment.
        </p>
      </div>
      {error && (
        <p role="alert" className="demo-error">
          Diagnostics could not render: {error}
        </p>
      )}
      <div className="nn-diagnostic-grid">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Gradient norms</h2>
              <p>Current mean training loss · full 192-row batch · dropout off</p>
            </div>
            <span className="demo-meta">tfjs-vis</span>
          </div>
          <div ref={gradients} className="nn-tfvis" data-testid="nn-gradients" />
          <ol className="nn-gradient-key">
            {snapshot.gradients.map((gradient) => (
              <li key={gradient.name}>{gradient.name}</li>
            ))}
          </ol>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Hidden activations</h2>
              <p>All 240 observations · all hidden neurons</p>
            </div>
            <span className="demo-meta">tfjs-vis</span>
          </div>
          <div ref={activations} className="nn-tfvis" data-testid="nn-activations" />
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Learning curves</h2>
              <p>192 training rows · 48 validation rows</p>
            </div>
            <span className="demo-meta">tfjs-vis</span>
          </div>
          {!snapshot.history.length && (
            <p className="nn-chart-empty">Train for a few epochs to record learning curves.</p>
          )}
          <div ref={loss} className="nn-tfvis" data-testid="nn-loss" />
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Confusion matrix</h2>
              <p>Validation · threshold {threshold.toFixed(2)}</p>
            </div>
            <span className="demo-meta">tfjs-vis</span>
          </div>
          <div ref={confusion} className="nn-tfvis" data-testid="nn-confusion" />
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Weight distribution</h2>
              <p>
                {snapshot.layers.reduce((n, layer) => n + layer.weights.flat().length, 0)} learned
                connection weights · biases excluded
              </p>
            </div>
            <span className="demo-meta">tfjs-vis</span>
          </div>
          <div ref={histogram} className="nn-tfvis" data-testid="nn-histogram" />
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Model summary</h2>
              <p>{snapshot.params} trainable parameters</p>
            </div>
            <span className="demo-meta">tfjs-vis</span>
          </div>
          <div ref={summary} className="nn-tfvis nn-model-summary" />
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Precision–recall</h2>
              <p>Validation · all observed score thresholds</p>
            </div>
          </div>
          <MetricPlot
            label="Precision–recall curve"
            xLabel="Recall"
            yLabel="Precision"
            points={pr.map((p) => [p.recall, p.precision])}
            operating={
              metrics.recall !== null && metrics.precision !== null
                ? [metrics.recall, metrics.precision]
                : undefined
            }
          />
          <div className="demo-legend nn-legend">
            <span>
              <i style={{ background: "var(--series-1)" }} />
              Validation curve
            </span>
            <span>
              <i style={{ background: "var(--series-2)" }} />
              Current threshold
            </span>
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Calibration</h2>
              <p>
                Validation · six equal-width bins · circle area shows count · dashed: predicted =
                observed
              </p>
            </div>
          </div>
          <MetricPlot
            label="Calibration plot"
            xLabel="Mean predicted probability"
            yLabel="Observed positive fraction"
            points={calibration.map((p) => [p.probability, p.frequency])}
            counts={calibration.map((p) => p.count)}
            diagonal
          />
        </section>
      </div>
    </div>
  )
}

function MetricPlot({
  label,
  xLabel,
  yLabel,
  points,
  operating,
  counts,
  diagonal,
}: {
  label: string
  xLabel: string
  yLabel: string
  points: number[][]
  operating?: number[]
  counts?: number[]
  diagonal?: boolean
}) {
  return (
    <svg className="nn-metric-plot" viewBox="0 0 400 290" role="img" aria-label={label}>
      {[0, 0.5, 1].map((tick) => (
        <g key={tick}>
          <line
            x1={55}
            x2={370}
            y1={235 - tick * 200}
            y2={235 - tick * 200}
            stroke="var(--viz-grid)"
          />
          <text x={43} y={239 - tick * 200} textAnchor="end">
            {tick}
          </text>
          <text x={55 + tick * 315} y={254} textAnchor="middle">
            {tick}
          </text>
        </g>
      ))}
      {diagonal && (
        <path d="M55,235 L370,35" stroke="var(--viz-axis)" strokeDasharray="5 5" fill="none" />
      )}
      {!counts && (
        <polyline
          points={points.map(([x, y]) => `${55 + x * 315},${235 - y * 200}`).join(" ")}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
        />
      )}
      {counts &&
        points.map(([x, y], i) => (
          <circle
            key={`${x}-${y}`}
            cx={55 + x * 315}
            cy={235 - y * 200}
            r={Math.sqrt(counts[i]) * 2 + 2}
            fill="var(--series-1)"
            fillOpacity={0.6}
          >
            <title>
              {counts[i]} rows · mean {x.toFixed(3)} · observed {y.toFixed(3)}
            </title>
          </circle>
        ))}
      {operating && (
        <circle
          cx={55 + operating[0] * 315}
          cy={235 - operating[1] * 200}
          r={5}
          fill="var(--series-2)"
          stroke="var(--card)"
          strokeWidth={2}
        >
          <title>Current decision threshold</title>
        </circle>
      )}
      <text x={210} y={279} textAnchor="middle">
        {xLabel}
      </text>
      <text transform="translate(15,138) rotate(-90)" textAnchor="middle">
        {yLabel}
      </text>
    </svg>
  )
}
