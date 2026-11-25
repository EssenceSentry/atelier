import hljs from "highlight.js/lib/common"
import { editor, updateEditor } from "./code-editor"

const A = globalThis.Atelier
A.register("editor", (host, options) => {
  const view = editor(host, options)
  return {
    update: (next) => updateEditor(view, next),
    theme() {},
    destroy: () => view.destroy(),
    api: {
      view,
      get source() {
        return view.state.doc.toString()
      },
    },
  }
})

// The family name is also the natural widget name for a read-only code example.
A.register("code", (host, options, ctx) => {
  const pre = ctx.element("pre", "at-code-block")
  const code = ctx.element("code")
  pre.append(code)
  host.append(pre)
  let current
  const render = (next) => {
    current = next
    if (next.language && hljs.getLanguage(next.language))
      code.innerHTML = hljs.highlight(next.source, { language: next.language }).value
    else code.textContent = next.source
  }
  render(options)
  return {
    update: render,
    theme() {},
    api: {
      get source() {
        return current.source
      },
    },
  }
})
