import { ImgComparisonSlider } from "@img-comparison-slider/react"
import { Check, Download, RotateCcw, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { download } from "./data"
import launchPhoto from "./photos/launch.jpg"

type Region = { x: number; y: number; width: number; height: number }
// Experiment-local memory retains a draft when switching workbench views.
let draft: {
  region: Region | null
  decision: string | null
  notes: string
  image: string | null
  fileName: string
} | null = null
function makeAudio() {
  const rate = 22050,
    count = rate * 3
  const buffer = new ArrayBuffer(44 + count * 2),
    data = new DataView(buffer)
  const write = (offset: number, value: string) =>
    [...value].forEach((char, index) => {
      data.setUint8(offset + index, char.charCodeAt(0))
    })
  write(0, "RIFF")
  data.setUint32(4, 36 + count * 2, true)
  write(8, "WAVE")
  write(12, "fmt ")
  data.setUint32(16, 16, true)
  data.setUint16(20, 1, true)
  data.setUint16(22, 1, true)
  data.setUint32(24, rate, true)
  data.setUint32(28, rate * 2, true)
  data.setUint16(32, 2, true)
  data.setUint16(34, 16, true)
  write(36, "data")
  data.setUint32(40, count * 2, true)
  for (let i = 0; i < count; i++) {
    const time = i / rate
    const envelope = Math.min(1, time * 5) * Math.min(1, (3 - time) * 5)
    const value =
      [220, 277.18, 329.63].reduce(
        (sum, frequency) => sum + Math.sin(time * frequency * 2 * Math.PI),
        0
      ) / 3
    data.setInt16(44 + i * 2, value * envelope * 9500, true)
  }
  return new Blob([buffer], { type: "audio/wav" })
}

export default function Media() {
  // The 640 × 427 sample is centered and fitted inside the 800 × 450 annotation frame.
  const [region, setRegion] = useState<Region | null>(() =>
    draft ? draft.region : { x: 380, y: 126, width: 40, height: 306 }
  )
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [decision, setDecision] = useState<string | null>(() => draft?.decision ?? null)
  const [notes, setNotes] = useState(() => draft?.notes ?? "")
  const [audio, setAudio] = useState("")
  const [image, setImage] = useState<string | null>(() => draft?.image ?? null)
  const [fileName, setFileName] = useState(() => draft?.fileName ?? "")
  const [message, setMessage] = useState("")
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    draft = { region, decision, notes, image, fileName }
  }, [region, decision, notes, image, fileName])
  useEffect(() => {
    const url = URL.createObjectURL(makeAudio())
    setAudio(url)
    return () => URL.revokeObjectURL(url)
  }, [])
  const coordinate = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(800, ((event.clientX - rect.left) / rect.width) * 800)),
      y: Math.max(0, Math.min(450, ((event.clientY - rect.top) / rect.height) * 450)),
    }
  }
  const readFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file to review.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Choose an image smaller than 10 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(String(reader.result))
      setFileName(file.name)
      setRegion(null)
      setDecision(null)
      setMessage("Image opened locally.")
    }
    reader.readAsDataURL(file)
  }
  const source = image ?? launchPhoto
  return (
    <div className="demo-stack">
      <div className="demo-equal-col">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Frame comparison</h2>
              <p>DSCOVR launch site · SpaceX</p>
            </div>
            <span className="demo-meta">Drag the divider</span>
          </div>
          <div className="image-compare-host">
            <ImgComparisonSlider>
              <figure slot="first">
                <img src={launchPhoto} alt="Falcon 9 on the launch pad at Cape Canaveral" />
                <figcaption>Original</figcaption>
              </figure>
              <figure slot="second">
                <img src={launchPhoto} alt="The same photograph with the launch vehicle marked" />
                <span className="launch-region" aria-hidden="true" />
                <figcaption>Overlay</figcaption>
              </figure>
            </ImgComparisonSlider>
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Audio evidence</h2>
              <p>Three-second synthesized chord</p>
            </div>
            <span className="demo-meta">WAV · mono</span>
          </div>
          <div className="audio-demo">
            <div className="audio-wave" aria-hidden="true">
              {Array.from({ length: 70 }, (_, i) => ({
                id: `wave-${i}`,
                height: 10 + Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.13)) * 70,
              })).map((wave) => (
                <span
                  key={wave.id}
                  style={{
                    height: `${wave.height}%`,
                  }}
                />
              ))}
            </div>
            <audio controls src={audio || undefined} aria-label="Synthesized audio sample">
              <track kind="captions" />
            </audio>
            <p className="status-message">
              A generated A-major chord, fading in and out over three seconds. No recording or
              external media is loaded.
            </p>
            <a className="demo-button" href={audio || undefined} download="synthesized-chord.wav">
              <Download size={12} /> Download sample
            </a>
          </div>
        </section>
      </div>
      <div className="demo-two-col">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Region annotation</h2>
              <p>{fileName || "Generated illustrative frame"} · drag to draw a box</p>
            </div>
            <label className="demo-button media-file-label">
              Open an image
              <input
                aria-label="Open a local image"
                type="file"
                accept="image/*"
                onChange={(event) => void readFile(event.target.files?.[0])}
              />
            </label>
          </div>
          <div className="annotation-frame">
            <img
              src={source || undefined}
              alt={
                fileName ? `Local review image: ${fileName}` : "SpaceX launch site for annotation"
              }
            />
            <svg
              ref={svg}
              viewBox="0 0 800 450"
              role="img"
              aria-label="Region annotation canvas. Drag to mark a region."
              onPointerDown={(event) => {
                const point = coordinate(event)
                setStart(point)
                setRegion({ ...point, width: 0, height: 0 })
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (!start) return
                const point = coordinate(event)
                setRegion({
                  x: Math.min(point.x, start.x),
                  y: Math.min(point.y, start.y),
                  width: Math.abs(point.x - start.x),
                  height: Math.abs(point.y - start.y),
                })
              }}
              onPointerUp={() => setStart(null)}
              onPointerCancel={() => setStart(null)}
            >
              {region && (
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  fill="var(--primary-soft)"
                  fillOpacity={0.35}
                  stroke="var(--primary)"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                />
              )}
            </svg>
          </div>
          <div className="demo-panel-note demo-toolbar" style={{ justifyContent: "space-between" }}>
            <span>
              {region
                ? `x ${Math.round(region.x)}, y ${Math.round(region.y)} · ${Math.round(region.width)} × ${Math.round(region.height)} in an 800 × 450 frame`
                : "No region selected"}
            </span>
            <button type="button" className="demo-button" onClick={() => setRegion(null)}>
              <RotateCcw size={12} /> Clear region
            </button>
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Review decision</h2>
            <span className="demo-meta">Local session</span>
          </div>
          <div className="demo-panel-body input-form">
            <div className="review-choices">
              <button
                type="button"
                className={`demo-button ${decision === "accept" ? "primary" : ""}`}
                aria-pressed={decision === "accept"}
                onClick={() => setDecision("accept")}
              >
                <Check size={14} /> Accept
              </button>
              <button
                type="button"
                className={`demo-button ${decision === "reject" ? "primary" : ""}`}
                aria-pressed={decision === "reject"}
                onClick={() => setDecision("reject")}
              >
                <X size={14} /> Reject
              </button>
            </div>
            <label className="demo-field">
              <span>Review notes</span>
              <textarea
                className="demo-input"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What should the next reviewer know?"
              />
            </label>
            <button
              type="button"
              className="demo-button primary"
              disabled={!decision}
              onClick={() => {
                download(
                  "frame-review.json",
                  JSON.stringify(
                    {
                      source: fileName || "generated-frame",
                      coordinateSpace: { width: 800, height: 450 },
                      decision,
                      region,
                      notes,
                    },
                    null,
                    2
                  )
                )
                setMessage("Review downloaded as JSON.")
              }}
            >
              <Download size={12} />
              {decision ? "Export review" : "Choose a decision to export"}
            </button>
            <p role="status" className="status-message">
              {message ||
                (decision
                  ? `Current decision: ${decision}. Export to keep this review.`
                  : "Mark a region, choose a decision and export the result.")}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
