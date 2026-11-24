import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import "./channel-row.css"

export type ChannelVideo = {
  id: string
  title: string
  originalTitle?: string
  href?: string
  thumbnail?: string
  score?: number | null
  citations?: { count: number; total: number }
}

export type ChannelEvidence = {
  id: string
  name: string
  href?: string
  badges?: { label: string; tone?: "accent" | "neutral" | "warning" | "positive" | "negative" }[]
  metadata?: string[]
  rationale?: string
  description?: string
  originalDescription?: string
  details?: { label: string; value: string }[]
  evidenceNote?: string
  videos: ChannelVideo[]
}

function VideoCard({ video }: { video: ChannelVideo }) {
  const [failed, setFailed] = useState<string>()
  const body = (
    <>
      {video.thumbnail && failed !== video.thumbnail ? (
        <img
          src={video.thumbnail}
          loading="lazy"
          decoding="async"
          alt=""
          width={160}
          height={90}
          onError={() => setFailed(video.thumbnail)}
        />
      ) : (
        <span className="channel-row-placeholder">No thumbnail</span>
      )}
      <span
        className="channel-row-video-title"
        dir="auto"
        title={video.originalTitle || video.title}
      >
        {video.title}
      </span>
    </>
  )
  return (
    <li>
      {video.href ? (
        <a href={video.href} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : (
        body
      )}
      {(video.score != null || video.citations) && (
        <small>
          {video.score != null && <span>Score {video.score.toFixed(3)}</span>}
          {video.citations && (
            <span>
              Cited {video.citations.count}/{video.citations.total}
            </span>
          )}
        </small>
      )}
    </li>
  )
}

function VideoStrip({ videos, name }: { videos: ChannelVideo[]; name: string }) {
  const strip = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const count = videos.length
  useEffect(() => {
    const el = strip.current
    if (!el || !count) return
    const measure = () => {
      const start = el.scrollLeft <= 1
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", measure)
    }
  }, [count])
  if (!count) return <p className="channel-row-empty">No videos supplied.</p>
  const move = (direction: number) => {
    const el = strip.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8 })
  }
  return (
    <div className="channel-row-strip">
      <ul ref={strip} aria-label={`Videos for ${name}`} dir="ltr">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </ul>
      {(!edges.start || !edges.end) && (
        <div className="channel-row-arrows">
          <button
            type="button"
            aria-label="Earlier videos"
            aria-disabled={edges.start}
            onClick={() => !edges.start && move(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Later videos"
            aria-disabled={edges.end}
            onClick={() => !edges.end && move(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

/** One channel and its supplied evidence. Callers own classification and scoring. */
export function ChannelRow({ channel }: { channel: ChannelEvidence }) {
  const {
    name,
    href,
    badges,
    metadata,
    rationale,
    description,
    originalDescription,
    details,
    evidenceNote,
    videos,
  } = channel
  return (
    <article key={channel.id} data-channel={channel.id} aria-label={name} className="channel-row">
      <div className="channel-row-layout">
        <div className="channel-row-summary">
          {badges && badges.length > 0 && (
            <div className="channel-row-badges">
              {badges.map((badge) => (
                <span key={badge.label} data-tone={badge.tone ?? "neutral"}>
                  {badge.label}
                </span>
              ))}
            </div>
          )}
          <h3 dir="auto">
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {name} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              name
            )}
          </h3>
          {metadata && metadata.length > 0 && (
            <p className="channel-row-meta">
              {metadata.map((item, index) => (
                <span key={item}>
                  {index > 0 && <span aria-hidden="true"> · </span>}
                  {item}
                </span>
              ))}
            </p>
          )}
          {rationale && <p dir="auto">{rationale}</p>}
          {(description || originalDescription || Boolean(details?.length)) && (
            <details>
              <summary>Description and details</summary>
              {description && <p dir="auto">{description}</p>}
              {originalDescription && (
                <p dir="auto">
                  <strong>Original description</strong>
                  <br />
                  {originalDescription}
                </p>
              )}
              {details && details.length > 0 && (
                <dl>
                  {details.map(({ label, value }) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd dir="auto">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </details>
          )}
        </div>
        <div className="channel-row-evidence">
          {evidenceNote && <p className="channel-row-note">{evidenceNote}</p>}
          <VideoStrip videos={videos} name={name} />
        </div>
      </div>
    </article>
  )
}
