// Deterministic sample data so every direction renders identical content.

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gaussian(r: () => number) {
  const u = Math.max(r(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}

// Monitor: throughput for this run and the median of earlier runs.
export const throughput = (() => {
  const r = rng(7)
  const rows: { minute: number; series: string; value: number }[] = []
  for (let m = 0; m <= 58; m++) {
    const warm = Math.min(1, m / 6)
    const current =
      warm * (395 + 22 * Math.sin(m / 5) + gaussian(r) * 9) - (m > 41 && m < 46 ? 120 : 0)
    const previous = warm * (352 + 10 * Math.sin(m / 7) + gaussian(r) * 4)
    rows.push({ minute: m, series: "This run", value: Math.max(0, current) })
    rows.push({ minute: m, series: "Median of last 5 runs", value: Math.max(0, previous) })
  }
  return rows
})()

export const spark = (seed: number, n = 16, base = 50, spread = 10) => {
  const r = rng(seed)
  let v = base
  return Array.from(
    { length: n },
    () => (v = Math.max(1, v + gaussian(r) * spread * 0.4 + (base - v) * 0.15))
  )
}

export type CellState = "done" | "running" | "failed" | "queued"
export const cells: { index: number; name: string; state: CellState; seconds: number }[] = [
  { index: 18, name: "Load channel manifest", state: "done", seconds: 12 },
  { index: 19, name: "Resolve thumbnail URLs", state: "done", seconds: 94 },
  { index: 20, name: "Download thumbnails · 18,327", state: "done", seconds: 611 },
  { index: 21, name: "Launch SageMaker embedding job", state: "failed", seconds: 438 },
  { index: 22, name: "Retry with smaller shards", state: "done", seconds: 1226 },
  { index: 23, name: "Validate vector norms", state: "done", seconds: 41 },
  { index: 24, name: "Write embeddings to S3", state: "running", seconds: 287 },
  { index: 25, name: "Publish dataset card", state: "queued", seconds: 0 },
]

// Times agree with the cells above: the run started at 14:02, cell 21 failed at
// 14:34:06, cell 22 retried it until 14:54:32, and it is now 15:00.
export const logLines: { t: string; level: "info" | "warn" | "error"; msg: string }[] = [
  { t: "14:59:52", level: "info", msg: "shard 37/48 written · 1,204 vectors · 3.1 MiB" },
  { t: "14:59:31", level: "info", msg: "s3://lab-embeddings/travel/v4/ +412 objects" },
  { t: "14:44:20", level: "warn", msg: "throughput dipped to 268 rows/s for 4 min (GPU thermal)" },
  { t: "14:34:06", level: "error", msg: "job embed-travel-1785866245 AlgorithmError: exit code 1" },
  {
    t: "14:34:06",
    level: "info",
    msg: "cell 22 retrying the embedding with shard size 512 (attempt 2)",
  },
  { t: "14:31:40", level: "info", msg: "checkpoint saved · kernel state 2.4 GiB" },
]

// Review: queue of channels and the selected channel's evidence.
export const queue = [
  { name: "Wander North", handle: "@wandernorth", subs: "1.2M", score: 0.94, state: "pending" },
  { name: "Slow Rail Diaries", handle: "@slowrail", subs: "312K", score: 0.91, state: "pending" },
  { name: "Kitchen Atlas", handle: "@kitchenatlas", subs: "88K", score: 0.42, state: "pending" },
  { name: "Ridge & Valley", handle: "@ridgevalley", subs: "540K", score: 0.88, state: "flagged" },
  { name: "Budget Backpacker", handle: "@budgetbp", subs: "2.4M", score: 0.97, state: "pending" },
  { name: "City Sketchbook", handle: "@citysketch", subs: "61K", score: 0.57, state: "pending" },
  { name: "Daily Commute FM", handle: "@commutefm", subs: "19K", score: 0.18, state: "pending" },
  {
    name: "Island Hopping 101",
    handle: "@islands101",
    subs: "730K",
    score: 0.95,
    state: "pending",
  },
  { name: "Gear Bench", handle: "@gearbench", subs: "205K", score: 0.63, state: "pending" },
  { name: "Night Markets", handle: "@nightmarkets", subs: "97K", score: 0.79, state: "pending" },
] as const

export const videos = [
  {
    seed: "fjord",
    title: "Three days in the Lofoten fjords",
    views: "412K",
    length: "18:24",
    evidence: true,
  },
  {
    seed: "rail",
    title: "Sleeper train from Oslo to Bodø",
    views: "1.1M",
    length: "32:10",
    evidence: true,
  },
  {
    seed: "cabin",
    title: "Off-grid cabin tour, winter edition",
    views: "220K",
    length: "14:02",
    evidence: false,
  },
  {
    seed: "coast",
    title: "Driving the Atlantic Road at dawn",
    views: "870K",
    length: "11:47",
    evidence: true,
  },
  {
    seed: "market",
    title: "What I eat on a travel day",
    views: "96K",
    length: "09:31",
    evidence: false,
  },
  {
    seed: "summit",
    title: "Hiking Reinebringen, 1,978 steps",
    views: "1.4M",
    length: "21:55",
    evidence: true,
  },
  {
    seed: "harbor",
    title: "Packing list for 10 days in Norway",
    views: "305K",
    length: "13:08",
    evidence: true,
  },
  {
    seed: "aurora",
    title: "Chasing the aurora with a rental car",
    views: "2.2M",
    length: "26:40",
    evidence: true,
  },
]

// Lab: two-class embedding projection with a probe score.
export const points = (() => {
  const r = rng(42)
  const out: { x: number; y: number; label: "Travel" | "Not travel"; score: number; id: number }[] =
    []
  for (let i = 0; i < 2400; i++) {
    const pos = r() < 0.38
    const cx = pos ? 1.3 : -0.6
    const cy = pos ? 0.5 : -0.2
    const x = cx + gaussian(r) * (pos ? 0.85 : 1.05) + (pos ? 0 : gaussian(r) * 0.3)
    const y = cy + gaussian(r) * (pos ? 0.7 : 0.9) + 0.25 * x * (pos ? 0.4 : -0.2)
    const score = 1 / (1 + Math.exp(-(1.9 * x + 0.9 * y - 0.6 + gaussian(r) * 0.6)))
    out.push({ x, y, label: pos ? "Travel" : "Not travel", score, id: i })
  }
  return out
})()

export const prCurves = (() => {
  const methods = [
    { name: "Weighted", k: 2.6, floor: 0.6 },
    { name: "Max", k: 1.7, floor: 0.36 },
    { name: "RRF", k: 2.2, floor: 0.48 },
  ]
  return methods.flatMap(({ name, k, floor }) =>
    Array.from({ length: 41 }, (_, i) => {
      const recall = i / 40
      const precision = 1 - (1 - floor) * recall ** k
      return { method: name, recall, precision }
    })
  )
})()

export const contributions = [
  { feature: "wide landscape shot", value: 0.41 },
  { feature: "title mentions a place", value: 0.33 },
  { feature: "transport in frame", value: 0.21 },
  { feature: "itinerary language", value: 0.14 },
  { feature: "food close-up", value: -0.12 },
  { feature: "talking head indoors", value: -0.19 },
  { feature: "product review terms", value: -0.27 },
]

export const neighbors = [
  { name: "Slow Rail Diaries", sim: 0.912, label: "Travel" },
  { name: "Island Hopping 101", sim: 0.887, label: "Travel" },
  { name: "Ridge & Valley", sim: 0.861, label: "Travel" },
  { name: "Gear Bench", sim: 0.802, label: "Not travel" },
  { name: "Night Markets", sim: 0.794, label: "Travel" },
]

// Report: weekly warehouse spend in dollars.
// Weeks of 2026, each starting on a Monday. Ingest ran at size M from 7 September.
export const weeks = [
  "Aug 3",
  "Aug 10",
  "Aug 17",
  "Aug 24",
  "Aug 31",
  "Sep 7",
  "Sep 14",
  "Sep 21",
  "Sep 28",
]
export const warehouses = ["Ingest", "Transform", "BI dashboards", "Ad hoc"] as const
export const spend = (() => {
  const r = rng(11)
  const base = { Ingest: 5200, Transform: 3100, "BI dashboards": 2300, "Ad hoc": 1100 }
  return weeks.flatMap((week, i) =>
    warehouses.map((warehouse) => {
      const resized = warehouse === "Ingest" && i >= 5 ? 0.52 : 1
      const value =
        base[warehouse] *
        resized *
        (1 + gaussian(r) * 0.06 + (warehouse === "Ad hoc" ? i * 0.03 : 0))
      return { week, warehouse, value: Math.round(value) }
    })
  )
})()

export const topQueries = [
  {
    name: "rebuild_channel_features",
    warehouse: "Transform",
    runs: 30,
    credits: 1284,
    change: -0.08,
  },
  { name: "ingest_youtube_daily", warehouse: "Ingest", runs: 30, credits: 1106, change: -0.47 },
  {
    name: "dash_campaign_pacing",
    warehouse: "BI dashboards",
    runs: 2_880,
    credits: 742,
    change: 0.04,
  },
  { name: "adhoc_thumbnail_audit", warehouse: "Ad hoc", runs: 64, credits: 391, change: 0.61 },
  { name: "refresh_brand_lift", warehouse: "Transform", runs: 4, credits: 306, change: -0.02 },
]
