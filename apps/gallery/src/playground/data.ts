// Deterministic illustrative data, shared only by this experiment.
export type Sample = {
  id: string
  group: string
  x: number
  y: number
  score: number
  volume: number
  day: string
  reviewed: boolean
}

let seed = 2741
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}

export const groups = ["North", "Central", "South"]
export const samples: Sample[] = Array.from({ length: 240 }, (_, i) => {
  const g = i % 3
  const x = (random() + random() + random() - 1.5) * 1.7 + g * 1.35
  const y = x * 0.4 + (random() + random() - 1) * 2.4 + (g === 1 ? 1.3 : 0)
  return {
    id: `S-${String(i + 1).padStart(3, "0")}`,
    group: groups[g],
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    score: +Math.min(0.99, Math.max(0.01, (x + y + 3) / 11)).toFixed(3),
    volume: Math.round(100 + random() * 900),
    day: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}`,
    reviewed: random() > 0.45,
  }
})

export function download(name: string, value: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
