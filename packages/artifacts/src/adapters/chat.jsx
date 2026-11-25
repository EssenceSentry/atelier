import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react"

const A = globalThis.Atelier
function UserMessage() {
  return (
    <MessagePrimitive.Root className="at-message">
      <strong>You</strong>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  )
}
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="at-message">
      <strong>Assistant</strong>
      <MessagePrimitive.Parts />
      <MessagePrimitive.Error />
    </MessagePrimitive.Root>
  )
}
function Chat({ options }) {
  const runtime = useLocalRuntime(options.adapter)
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="at-chat">
        <ThreadPrimitive.Viewport className="at-chat-viewport">
          <ThreadPrimitive.Empty>
            <p>{options.emptyMessage ?? "Start a conversation."}</p>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </ThreadPrimitive.Viewport>
        <ComposerPrimitive.Root className="at-composer">
          <ComposerPrimitive.Input
            aria-label="Chat message"
            className="at-input"
            placeholder={options.placeholder ?? "Write a message…"}
          />
          <ComposerPrimitive.Send className="at-button">Send</ComposerPrimitive.Send>
          <ComposerPrimitive.Cancel className="at-button">Stop</ComposerPrimitive.Cancel>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  )
}
A.register(
  "chat",
  (host, options) => {
    if (!options.adapter?.run)
      throw new Error(
        "Chat needs an assistant-ui ChatModelAdapter: {adapter: {async *run({messages, abortSignal}) {...}}}. Do not embed API keys."
      )
    const root = A.ReactClient.createRoot(host)
    let revision = 0
    const render = (next) =>
      A.ReactDOM.flushSync(() => root.render(<Chat key={revision++} options={next} />))
    render(options)
    return { update: render, theme() {}, destroy: () => root.unmount() }
  },
  { useLocalRuntime }
)
