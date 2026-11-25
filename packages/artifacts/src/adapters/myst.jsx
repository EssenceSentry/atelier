import { Document } from "./myst-document"
import MystWorker from "./myst-worker.ts?worker&inline"

const A = globalThis.Atelier
A.register("myst", async (host, initial, ctx) => {
  const root = A.ReactClient.createRoot(host)
  let worker
  let timeout
  const render = async (options) => {
    if (options.source.length > 500000)
      throw new Error("MyST accepts at most 500,000 characters. Split the document into sections.")
    worker?.terminate()
    worker = new MystWorker()
    const parsed = await new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error("MyST parsing exceeded eight seconds. Shorten the document."))
      }, 8000)
      worker.onmessage = ({ data }) => {
        clearTimeout(timeout)
        worker.terminate()
        data.error ? reject(new Error(data.error)) : resolve(data)
      }
      worker.onerror = (error) => {
        clearTimeout(timeout)
        worker.terminate()
        reject(new Error(error.message))
      }
      worker.postMessage(options.source)
    })
    if (ctx.signal.aborted) return
    A.ReactDOM.flushSync(() =>
      root.render(
        <Document
          tree={parsed.tree}
          labels={new Map(parsed.labels)}
          references={options.references}
        />
      )
    )
  }
  await render(initial)
  return {
    update: render,
    theme() {},
    destroy: () => {
      clearTimeout(timeout)
      worker?.terminate()
      root.unmount()
    },
  }
})
