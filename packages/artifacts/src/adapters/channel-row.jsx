import { ChannelRow } from "../../../kit/src/blocks/channel-row"

const A = globalThis.Atelier
A.register("channel-row", (host, channel) => {
  const root = A.ReactClient.createRoot(host)
  const render = (next) =>
    A.ReactDOM.flushSync(() => root.render(<ChannelRow key={next.id} channel={next} />))
  render(channel)
  return { update: render, destroy: () => root.unmount() }
})
