import EmblaCarousel from "embla-carousel"

const A = globalThis.Atelier
A.register(
  "carousel",
  (host, initial, ctx) => {
    let embla
    let current = initial
    const render = (options) => {
      current = options
      embla?.destroy()
      host.replaceChildren()
      const area = ctx.element("div", "at-carousel")
      const track = ctx.element("div", "at-carousel-track")
      options.slides.forEach((item, index) => {
        const slide = ctx.element("div", "at-slide")
        if (item.src) {
          const image = ctx.element("img")
          image.src = item.src
          image.alt = item.alt ?? `Image ${index + 1}`
          slide.append(image)
        }
        if (item.title) slide.append(ctx.element("h3", "", item.title))
        if (item.text) slide.append(ctx.element("p", "", item.text))
        track.append(slide)
      })
      area.append(track)
      host.append(area)
      embla = EmblaCarousel(area, { loop: false, ...options.embla })
      const tools = ctx.element("div", "at-toolbar")
      const count = ctx.element("span")
      const prev = ctx.button("Previous slide", () => embla.scrollPrev(), tools)
      const next = ctx.button("Next slide", () => embla.scrollNext(), tools)
      const selected = () => {
        count.textContent = `${embla.selectedScrollSnap() + 1} / ${options.slides.length}`
        prev.disabled = !embla.canScrollPrev()
        next.disabled = !embla.canScrollNext()
        options.onSelect?.(embla.selectedScrollSnap())
      }
      embla.on("select", selected)
      embla.on("reInit", selected)
      selected()
      tools.append(count)
      host.append(tools)
    }
    render(initial)
    return {
      update: render,
      theme() {},
      resize: () => embla.reInit(),
      destroy: () => embla.destroy(),
      api: {
        get embla() {
          return embla
        },
        snapshot: () => current,
      },
    }
  },
  { EmblaCarousel }
)
