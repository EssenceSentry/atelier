import Panzoom, { type PanzoomObject } from "@panzoom/panzoom"
import useEmblaCarousel from "embla-carousel-react"
import { ArrowLeft, ArrowRight, Download, Expand, Maximize2, Minus, Plus, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { CanvasTab, canvasOnly, canvasState } from "./canvas-tab"
import { scenes } from "./evidence-images"

export default function CarouselStudy() {
  const [initial] = useState(() => canvasState({ index: 0 }))
  const [emblaRef, api] = useEmblaCarousel({ loop: false, startIndex: initial.index })
  const [cardsRef, cards] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" })
  const [cardNavigation, setCardNavigation] = useState({ previous: false, next: true })
  const [index, setIndex] = useState(initial.index)
  const [modal, setModal] = useState(false)
  const [zoom, setZoom] = useState(1)
  const dialog = useRef<HTMLDialogElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const pan = useRef<PanzoomObject | null>(null)
  const scene = scenes[index] ?? scenes[0]
  const selected = useCallback(() => {
    if (api) setIndex(api.selectedScrollSnap())
  }, [api])
  useEffect(() => {
    if (!cards) return
    const sync = () =>
      setCardNavigation({ previous: cards.canScrollPrev(), next: cards.canScrollNext() })
    sync()
    cards.on("select", sync).on("reInit", sync)
    return () => {
      cards.off("select", sync).off("reInit", sync)
    }
  }, [cards])
  useEffect(() => {
    if (!api) return
    selected()
    api.on("select", selected)
    return () => {
      api.off("select", selected)
    }
  }, [api, selected])
  useEffect(() => {
    if (!image.current || !viewport.current || !(modal || canvasOnly)) return
    const element = image.current,
      area = viewport.current
    const instance = Panzoom(element, { maxScale: 6, minScale: 0.5, canvas: true })
    pan.current = instance
    const changed = (event: Event) =>
      setZoom((event as CustomEvent<{ scale: number }>).detail.scale)
    element.addEventListener("panzoomchange", changed)
    area.addEventListener("wheel", instance.zoomWithWheel, { passive: false })
    return () => {
      element.removeEventListener("panzoomchange", changed)
      area.removeEventListener("wheel", instance.zoomWithWheel)
      instance.destroy()
      pan.current = null
    }
  }, [modal])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing the selected image deliberately resets its pan and zoom.
  useEffect(() => {
    pan.current?.reset()
  }, [index])
  const next = (delta: number) => {
    const value = Math.max(0, Math.min(scenes.length - 1, index + delta))
    setIndex(value)
    api?.scrollTo(value)
  }
  const zoomView = (
    <div className="image-viewer" ref={viewport}>
      <img ref={image} src={scene.src} alt={scene.note} draggable={false} />
      <div className="canvas-zoom-tools panzoom-exclude">
        <button
          type="button"
          className="demo-button"
          aria-label="Zoom image in"
          onClick={() => pan.current?.zoomIn()}
        >
          <Plus size={15} />
        </button>
        <output>{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          className="demo-button"
          aria-label="Zoom image out"
          onClick={() => pan.current?.zoomOut()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="demo-button"
          aria-label="Fit image"
          onClick={() => pan.current?.reset()}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  )
  if (canvasOnly) return <div className="demo-stack carousel-canvas">{zoomView}</div>
  return (
    <div className="demo-stack carousel-study">
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>Photographic studies</h2>
            <p>Swipe, drag, use the arrows, or choose a thumbnail.</p>
          </div>
          <div className="demo-toolbar">
            <CanvasTab view="carousel" state={{ index }} />
            <button
              type="button"
              className="demo-button"
              onClick={() => {
                setModal(true)
                dialog.current?.showModal()
              }}
            >
              <Expand size={13} /> Inspect image
            </button>
          </div>
        </div>
        <section
          className="evidence-carousel"
          aria-roledescription="carousel"
          aria-label="Photographic evidence frames"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              next(-1)
            }
            if (event.key === "ArrowRight") {
              event.preventDefault()
              next(1)
            }
          }}
        >
          <div className="embla-viewport" ref={emblaRef}>
            <div className="embla-container">
              {scenes.map((item, i) => (
                <figure
                  className="evidence-slide"
                  key={item.id}
                  aria-label={`${i + 1} of ${scenes.length}: ${item.title}`}
                >
                  <img src={item.src} alt={item.note} draggable={false} />
                  <figcaption>
                    <span className="eyebrow">{item.credit}</span>
                    <h3>{item.title}</h3>
                    <p>{item.note}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div className="carousel-navigation">
            <button
              type="button"
              className="demo-button"
              aria-label="Previous frame"
              disabled={index === 0}
              onClick={() => next(-1)}
            >
              <ArrowLeft size={16} />
            </button>
            <span role="status" className="demo-meta">
              Frame {index + 1} of {scenes.length} · {scene.title}
            </span>
            <button
              type="button"
              className="demo-button"
              aria-label="Next frame"
              disabled={index === scenes.length - 1}
              onClick={() => next(1)}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <nav className="evidence-filmstrip" aria-label="Frame thumbnails">
          {scenes.map((item, i) => (
            <button
              type="button"
              key={item.id}
              aria-label={`Go to frame ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => api?.scrollTo(i)}
            >
              <img src={item.src} alt="" />
              <span>
                {String(i + 1).padStart(2, "0")} · {item.title}
              </span>
            </button>
          ))}
        </nav>
      </section>
      <section className="demo-panel">
        <div className="demo-panel-head">
          <div>
            <h2>A carousel of cards</h2>
            <p>The same interaction can carry plots, annotations or other content.</p>
          </div>
          <div className="demo-toolbar">
            <button
              type="button"
              className="demo-button"
              aria-label="Previous cards"
              disabled={!cardNavigation.previous}
              onClick={() => cards?.scrollPrev()}
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              className="demo-button"
              aria-label="Next cards"
              disabled={!cardNavigation.next}
              onClick={() => cards?.scrollNext()}
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="embla-viewport card-carousel" ref={cardsRef}>
          <div className="embla-container">
            {scenes.map((item, i) => (
              <article className="story-card" key={item.id}>
                <img src={item.src} alt="" />
                <div>
                  <span className="eyebrow">Study {i + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                  <button
                    type="button"
                    className="demo-button"
                    onClick={() => {
                      api?.scrollTo(i)
                      setIndex(i)
                      setModal(true)
                      dialog.current?.showModal()
                    }}
                  >
                    Open frame <Expand size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <dialog className="evidence-dialog" ref={dialog} onClose={() => setModal(false)}>
        <header>
          <div>
            <strong>{scene.title}</strong>
            <p>Drag to pan · pinch or scroll to zoom</p>
          </div>
          <div className="demo-toolbar">
            <button
              type="button"
              className="demo-button"
              aria-label="Previous image"
              disabled={index === 0}
              onClick={() => next(-1)}
            >
              <ArrowLeft size={15} />
            </button>
            <button
              type="button"
              className="demo-button"
              aria-label="Next image"
              disabled={index === scenes.length - 1}
              onClick={() => next(1)}
            >
              <ArrowRight size={15} />
            </button>
            <a className="demo-button" href={scene.src} download={`${scene.id}.jpg`}>
              <Download size={13} /> JPEG
            </a>
            <button
              type="button"
              className="demo-button"
              aria-label="Close image viewer"
              onClick={() => dialog.current?.close()}
            >
              <X size={16} />
            </button>
          </div>
        </header>
        {modal && zoomView}
      </dialog>
      <p className="demo-panel-note">
        Photographs from the scikit-image sample collection. Image credits accompany each frame.
      </p>
    </div>
  )
}
