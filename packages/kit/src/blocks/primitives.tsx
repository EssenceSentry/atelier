import { CircleAlert, CircleCheck, CircleDashed, CirclePause, TriangleAlert } from "lucide-react"
import { Fragment, type ReactNode, useId } from "react"

import { cn } from "@/lib/utils"

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>
}

/**
 * Inline metadata with spaced separators; some faces set "·" too tight. In
 * narrow rows use `wrap`, which moves whole items to the next line instead of
 * truncating the last one: never cut a Meta list mid-item.
 */
export function Meta({
  items,
  wrap = false,
  className,
}: {
  items: string[]
  wrap?: boolean
  className?: string
}) {
  if (wrap)
    // Each separator hangs in the gap before its item; the one starting a new
    // line falls in the clipped margin, so no line begins with "·".
    return (
      <span className={cn("block overflow-hidden", className)}>
        <span className="-ml-[1em] flex flex-wrap">
          {items.map((item) => (
            <span
              key={item}
              className="relative ml-[1em] whitespace-nowrap before:absolute before:left-[-0.5em] before:-translate-x-1/2 before:text-faint before:content-['·']"
            >
              {item}
            </span>
          ))}
        </span>
      </span>
    )
  return (
    <span className={className}>
      {items.map((item, position) => (
        <span key={item}>
          {position > 0 && (
            <span aria-hidden className="px-[0.4em] text-faint">
              ·
            </span>
          )}
          {item}
        </span>
      ))}
    </span>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  meta,
  actions,
  level = "h3",
  className,
}: {
  eyebrow?: string
  title: ReactNode
  /** h2 for a page-level section such as a report figure, h3 inside a panel. */
  level?: "h2" | "h3"
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline-last justify-between gap-x-4 gap-y-2",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {level === "h2" ? (
          <h2 className="text-xl leading-tight md:text-[22px]">{title}</h2>
        ) : (
          <h3 className="atelier-section-title">{title}</h3>
        )}
      </div>
      {/* Buttons alone have no text baseline; centring them keeps the title level. */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 text-xs text-muted-foreground",
          !meta && "-my-1 self-center"
        )}
      >
        {meta}
        {actions}
      </div>
    </div>
  )
}

// "done" is routine completion; "succeeded" is a success worth noticing, the
// only one shown in green.
export type Status = "running" | "done" | "succeeded" | "failed" | "warning" | "queued" | "paused"

const statusMeta: Record<Status, { label: string; icon: ReactNode; tone: string }> = {
  running: {
    label: "Running",
    icon: <span className="live-dot !size-1.5" />,
    tone: "bg-primary-soft text-primary-ink ring-primary/25",
  },
  done: {
    label: "Done",
    icon: <CircleCheck className="text-muted-foreground" />,
    tone: "bg-muted text-ink-2 ring-border-strong/70",
  },
  succeeded: {
    label: "Succeeded",
    icon: <CircleCheck className="text-good" />,
    tone: "bg-muted text-ink-2 ring-border-strong/70",
  },
  failed: {
    label: "Failed",
    icon: <CircleAlert className="text-critical" />,
    tone: "bg-critical/10 text-foreground ring-critical/25",
  },
  warning: {
    label: "Attention",
    icon: <TriangleAlert className="text-warning" />,
    tone: "bg-warning/12 text-foreground ring-warning/35",
  },
  queued: {
    label: "Queued",
    icon: <CircleDashed className="text-faint" />,
    tone: "bg-muted text-muted-foreground ring-border-strong/70",
  },
  paused: {
    label: "Paused",
    icon: <CirclePause className="text-muted-foreground" />,
    tone: "bg-muted text-ink-2 ring-border-strong/70",
  },
}

/**
 * Status always carries an icon and a word, never colour alone. With `href`
 * the badge is a link, as tall as a touch target on phones.
 */
export function StatusBadge({
  status,
  label,
  href,
  className,
}: {
  status: Status
  label?: string
  href?: string
  className?: string
}) {
  const meta = statusMeta[status]
  const badge = (
    <span
      className={cn(
        "label-status inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5",
        meta.tone,
        className
      )}
    >
      {meta.icon}
      {label ?? meta.label}
    </span>
  )
  if (!href) return badge
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
    >
      {badge}
    </a>
  )
}

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex [&_svg]:size-4", className)}>{statusMeta[status].icon}</span>
  )
}

/**
 * A small trend line ending in a dot. `fluid` stretches it to its container's
 * width; the dot is then drawn outside the SVG so it stays round.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  fluid = false,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  fluid?: boolean
  className?: string
}) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Fluid lines run edge to edge so they line up with meters and rules below.
  const x = (i: number) =>
    fluid ? (i / (values.length - 1)) * width : 2 + (i / (values.length - 1)) * (width - 6)
  const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 8)
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")
  const last = values.length - 1
  const fade = `spark-${useId().replace(/\W/g, "")}`
  const lines = (
    <>
      <defs>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--primary)", stopOpacity: 0.24 }} />
          <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
        </linearGradient>
        {/* The line strengthens toward the latest value. In user space, so a
            flat line, which has no height, still gets its gradient. */}
        <linearGradient
          id={`${fade}-line`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2={width}
          y2="0"
        >
          <stop offset="0" style={{ stopColor: "var(--primary)", stopOpacity: 0.35 }} />
          <stop offset="0.7" style={{ stopColor: "var(--primary)", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d={`${d}L${x(last)},${height}L${x(0)},${height}Z`} fill={`url(#${fade})`} />
      <path
        d={d}
        fill="none"
        stroke={`url(#${fade}-line)`}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </>
  )
  if (fluid)
    return (
      <div className={cn("relative w-full", className)} style={{ height }} aria-hidden>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="sparkline absolute inset-0 size-full overflow-visible"
          aria-hidden
        >
          {lines}
        </svg>
        <span
          className="sparkline-dot absolute size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
          style={{
            right: `${((width - x(last)) / width) * 100}%`,
            top: `${(y(values[last]) / height) * 100}%`,
          }}
        />
      </div>
    )
  return (
    <svg
      width={width}
      height={height}
      className={cn("sparkline overflow-visible", className)}
      aria-hidden
    >
      {lines}
      <circle
        className="sparkline-dot"
        cx={x(last)}
        cy={y(values[last])}
        r={4}
        fill="var(--primary)"
        stroke="var(--card)"
        strokeWidth={2}
      />
    </svg>
  )
}

/**
 * A change against a named period. The number stays in ink and only the arrow
 * takes the good or bad colour. Use "pp" for changes in a share, so 8.3% to
 * 11.4% reads as 3.1 pp rather than a relative 37%. Changes smaller than
 * `flatWithin` (5% by default) keep a neutral arrow, so routine drift does not
 * borrow the colours of real failures and successes.
 */
export function Delta({
  value,
  goodWhenUp = true,
  period,
  unit = "%",
  flatWithin = 0.05,
  className,
}: {
  value: number
  goodWhenUp?: boolean
  period?: string
  unit?: "%" | "pp"
  flatWithin?: number
  className?: string
}) {
  const good = value >= 0 === goodWhenUp
  const tone =
    Math.abs(value) < flatWithin ? "text-muted-foreground" : good ? "text-good" : "text-critical"
  const amount =
    unit === "%" ? `${Math.abs(value * 100).toFixed(0)}%` : `${Math.abs(value).toFixed(1)} pp`
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <span className="num inline-flex items-center gap-1 font-medium text-foreground">
        {/* A drawn triangle, not the ▲ ▼ characters: it sits on the figures'
            optical centre in every face. */}
        <svg viewBox="0 0 8 7" aria-hidden className={cn("h-[7px] w-2 shrink-0", tone)}>
          <path
            d={value >= 0 ? "M4 0.5 7.5 6.5H0.5Z" : "M4 6.5 0.5 0.5H7.5Z"}
            fill="currentColor"
          />
        </svg>
        {amount}
      </span>
      {period && <span>{period}</span>}
    </span>
  )
}

/**
 * Big figures side by side, each with a caption under it. The figures share
 * one baseline whatever their sizes; phones stack the pairs.
 */
export function FigureRow({
  items,
  className,
}: {
  items: { id: string; value: ReactNode; caption: ReactNode; size?: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid items-baseline gap-x-12 max-sm:grid-cols-1 sm:auto-cols-max sm:grid-flow-col sm:grid-rows-[auto_auto] sm:justify-start sm:gap-y-2 max-sm:[&>*:nth-child(even)]:mb-4",
        className
      )}
    >
      {items.map((item) => (
        <Fragment key={item.id}>
          <div className={cn("figure", item.size ?? "text-[40px]")}>{item.value}</div>
          <div className="text-sm text-muted-foreground">{item.caption}</div>
        </Fragment>
      ))}
    </div>
  )
}

export function StatTile({
  label,
  value,
  unit,
  delta,
  trend,
  footer,
  className,
}: {
  label: string
  value: string
  unit?: string
  delta?: ReactNode
  trend?: number[]
  footer?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex h-full min-w-0 flex-col gap-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="figure text-[28px] text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {trend && <Sparkline values={trend} fluid height={36} />}
      {(delta || footer) && (
        // Pinned to the bottom so tiles in a row share their top and bottom edges.
        <div className="mt-auto space-y-2">
          {delta}
          {footer}
        </div>
      )}
    </div>
  )
}

export function Meter({
  value,
  max,
  tone = "primary",
}: {
  value: number
  max: number
  tone?: "primary" | "warning"
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        tone === "primary" ? "bg-track" : "bg-warning/20"
      )}
    >
      <div
        className={cn(
          "meter-fill h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
          tone === "primary" ? "bg-primary bg-(image:--accent-gradient)" : "bg-warning"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// check-colours: off. Landscape illustrations have their own palette; they
// are picture content, not interface colour.
const SCENES = [
  {
    sky: ["#f6c9a8", "#f3e3d3"],
    sun: "#fff4e0",
    ridges: ["#c79a9e", "#8f6f86", "#4d3f5c"],
    water: "#e9cdb9",
  },
  {
    sky: ["#9cc3e6", "#e4eef6"],
    sun: "#ffffff",
    ridges: ["#9fb3c8", "#6b8299", "#36485c"],
    water: "#b9cfe2",
  },
  {
    sky: ["#3b2f5e", "#c56b6b"],
    sun: "#ffd29a",
    ridges: ["#6a4c6e", "#3f2d4c", "#1f1730"],
    water: "#8a5a6d",
  },
  {
    sky: ["#0f1630", "#3d3a78"],
    sun: "#e8e6ff",
    ridges: ["#3a3f6b", "#262a4d", "#14162b"],
    water: "#2b2f5a",
  },
  {
    sky: ["#f1d7a6", "#f7ecd6"],
    sun: "#fffaf0",
    ridges: ["#d9a86c", "#b47b4a", "#7a4e30"],
    water: "#e8c995",
  },
  {
    sky: ["#b8c6d6", "#e9ecef"],
    sun: "#ffffff",
    ridges: ["#a7b0bb", "#77818f", "#454d59"],
    water: "#c9d1da",
  },
]

function hash(text: string) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Generated landscape standing in for real thumbnails, so the board works
 * offline and never ships someone else's images.
 */
export function Thumb({
  seed,
  className,
}: {
  seed: string
  className?: string
  w?: number
  h?: number
}) {
  const h = hash(seed)
  const r = (n: number) => ((Math.imul(h, n * 2654435761) >>> 0) % 1000) / 1000
  const palette = SCENES[h % SCENES.length]
  const water = r(3) > 0.45
  const horizon = water ? 58 : 90
  const ridge = (i: number) => {
    const base = 30 + i * 13 + r(10 + i) * 8
    const amp = 14 - i * 3
    const pts = Array.from({ length: 17 }, (_, k) => {
      const x = k * 10
      const y =
        base -
        amp * Math.abs(Math.sin(k * (0.45 + r(20 + i) * 0.5) + r(30 + i) * 6)) -
        r(40 + k + i * 17) * 4
      return `${x},${Math.min(y, horizon).toFixed(1)}`
    })
    return `0,${horizon} ${pts.join(" ")} 160,${horizon}`
  }
  const id = `s${h.toString(36)}`
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <svg
        viewBox="0 0 160 90"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={palette.sky[0]} />
            <stop offset="1" stopColor={palette.sky[1]} />
          </linearGradient>
          <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={palette.water} />
            <stop offset="1" stopColor={palette.ridges[2]} />
          </linearGradient>
        </defs>
        <rect width="160" height="90" fill={`url(#${id}-sky)`} />
        <circle
          cx={30 + r(5) * 100}
          cy={14 + r(6) * 18}
          r={6 + r(7) * 6}
          fill={palette.sun}
          opacity={0.85}
        />
        {[0, 1, 2].map((i) => (
          <polygon key={i} points={ridge(i)} fill={palette.ridges[i]} />
        ))}
        {water && (
          <>
            <rect y={horizon} width="160" height={90 - horizon} fill={`url(#${id}-water)`} />
            {[0, 1, 2, 3].map((k) => (
              <rect
                key={k}
                x={20 + r(50 + k) * 100}
                y={horizon + 4 + k * 6}
                width={14 + r(60 + k) * 24}
                height="0.8"
                fill="#fff"
                opacity="0.35"
              />
            ))}
          </>
        )}
      </svg>
    </div>
  )
}

// check-colours: on

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("size-5", className)} aria-hidden>
      <rect x="1" y="1" width="8" height="8" rx="2" fill="var(--primary)" />
      <rect x="11" y="1" width="8" height="8" rx="4" fill="var(--primary)" opacity="0.45" />
      <rect x="1" y="11" width="8" height="8" rx="4" fill="var(--primary)" opacity="0.45" />
      <rect x="11" y="11" width="8" height="8" rx="2" fill="var(--foreground)" opacity="0.85" />
    </svg>
  )
}
