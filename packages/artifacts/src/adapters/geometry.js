import JXG from "jsxgraph"

const A = globalThis.Atelier
A.register(
  "geometry",
  (host, options, ctx) => {
    const area = ctx.element("div", "at-canvas")
    area.id = `at-jxg-${crypto.randomUUID()}`
    host.append(area)
    const t = ctx.tokens()
    const board = JXG.JSXGraph.initBoard(area.id, {
      boundingbox: [-5, 4, 5, -4],
      axis: true,
      keepaspectratio: true,
      renderer: "svg",
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: true, needShift: true },
      zoom: { wheel: true, needShift: true },
      defaultAxes: {
        x: { strokeColor: t.axis, ticks: { label: { strokeColor: t.text } } },
        y: { strokeColor: t.axis, ticks: { label: { strokeColor: t.text } } },
      },
      ...options.board,
    })
    const cleanup = options.setup(board, t, JXG)
    const tools = ctx.element("div", "at-toolbar")
    ctx.button("Zoom in", () => board.zoomIn(), tools)
    ctx.button("Zoom out", () => board.zoomOut(), tools)
    ctx.button(
      "Fit construction",
      () => board.setBoundingBox(options.board?.boundingbox ?? [-5, 4, 5, -4], true),
      tools
    )
    host.append(tools)
    return {
      update: (next) => next.update?.(board, ctx.tokens()),
      theme: () => {
        options.update?.(board, ctx.tokens())
        board.fullUpdate()
      },
      resize: () => board.resizeContainer(area.clientWidth, area.clientHeight),
      destroy: () => {
        cleanup?.()
        JXG.JSXGraph.freeBoard(board)
      },
      api: { board },
    }
  },
  { JXG }
)
