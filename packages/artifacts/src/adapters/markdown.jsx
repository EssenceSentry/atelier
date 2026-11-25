import Markdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import "katex/dist/katex.min.css"

const A = globalThis.Atelier
A.register(
  "markdown",
  (host, options) => {
    host.classList.add("at-prose")
    const root = A.ReactClient.createRoot(host)
    const render = (next) =>
      A.ReactDOM.flushSync(() =>
        root.render(
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { trust: false }]]}
            skipHtml
          >
            {next.source}
          </Markdown>
        )
      )
    render(options)
    return { update: render, theme() {}, destroy: () => root.unmount() }
  },
  { Markdown }
)
