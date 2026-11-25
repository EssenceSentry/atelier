import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  BranchPickerPrimitive,
  type ChatModelAdapter,
  ComposerPrimitive,
  MessagePrimitive,
  type TextMessagePartProps,
  ThreadPrimitive,
  useAuiState,
  useLocalRuntime,
} from "@assistant-ui/react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  MessageSquare,
  RotateCcw,
  Square,
  User,
} from "lucide-react"
import { useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { download, groups, samples } from "./data"

const prompts = [
  "Summarize the records by region",
  "Which chart should I use?",
  "Explain the Bayesian update",
]
function answer(prompt: string) {
  const text = prompt.toLowerCase()
  if (/region|record|score|volume|summar/.test(text)) {
    const table = groups
      .map((group) => {
        const rows = samples.filter((row) => row.group === group)
        return `| ${group} | ${rows.length} | ${(rows.reduce((sum, row) => sum + row.score, 0) / rows.length).toFixed(3)} | ${rows.reduce((sum, row) => sum + row.volume, 0).toLocaleString()} |`
      })
      .join("\n")
    return `I calculated this directly from the **${samples.length} synthetic records** in the playground.\n\n| Region | Records | Mean score | Total volume |\n| :--- | ---: | ---: | ---: |\n${table}\n\nA dot plot or bar chart compares regional means. A box plot shows the spread behind those means. These illustrative records do not describe a live system.`
  }
  if (/bayes|prior|posterior|coin/.test(text))
    return "For the illustrated coin model, start with a **Beta(2, 2)** prior. Observing **14 heads and 6 tails** gives a **Beta(16, 8)** posterior.\n\nThe posterior mean is **16 / 24 ≈ 0.667**. In the program canvas, disconnecting the observations returns the distribution to its prior.\n\nThis is an analytic conjugate update. The trace playback visualizes deterministic quantiles; it is not MCMC output."
  if (/chart|plot|visual/.test(text))
    return "Choose the visual from the question:\n\n- **Compare groups:** bar, dot or interval plot.\n- **Inspect a distribution:** histogram, box plot, violin or ECDF.\n- **Relate two quantities:** scatterplot or binned heatmap.\n- **Follow change:** line, step or quantile band.\n- **Inspect a whole and its parts:** treemap or stacked bars.\n\nThe plot gallery contains runnable examples. Chart recommendations explore neighboring encodings of your chosen fields."
  return "This is a **local scripted demonstration** of the chat interface. No language model or external service is connected.\n\nI can calculate a regional summary, suggest chart families, or explain the Bayesian update. Try one of the example prompts. Streaming, stopping, editing, branching and exporting work through the real assistant-ui runtime."
}
const adapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const prompt =
      messages
        .at(-1)
        ?.content.filter((part) => part.type === "text")
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(" ") ?? ""
    const result = answer(prompt)
    for (let count = 0; count < result.length; count += 24) {
      if (abortSignal.aborted) return
      await new Promise<void>((resolve) => {
        const cancelled = () => {
          clearTimeout(timer)
          resolve()
        }
        const timer = setTimeout(() => {
          abortSignal.removeEventListener("abort", cancelled)
          resolve()
        }, 28)
        abortSignal.addEventListener("abort", cancelled, { once: true })
      })
      if (abortSignal.aborted) return
      yield { content: [{ type: "text", text: result.slice(0, count + 24) }] }
    }
  },
}
function Text({ text }: TextMessagePartProps) {
  return (
    <div className="chat-markdown">
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  )
}
function CopyMessage() {
  const [copied, setCopied] = useState(false)
  return (
    <ActionBarPrimitive.Copy
      className="demo-button"
      onClick={() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </ActionBarPrimitive.Copy>
  )
}
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="chat-message assistant">
      <div className="chat-avatar">
        <MessageSquare size={16} />
      </div>
      <div className="chat-message-body">
        <span className="chat-role">
          Local assistant <span>Scripted demo</span>
        </span>
        <MessagePrimitive.Parts components={{ Text }} />
        <MessagePrimitive.Error />
        <ActionBarPrimitive.Root className="chat-actions">
          <CopyMessage />
          <ActionBarPrimitive.Reload className="demo-button">
            <RotateCcw size={12} /> Regenerate
          </ActionBarPrimitive.Reload>
          <BranchPickerPrimitive.Root className="chat-branches" hideWhenSingleBranch>
            <BranchPickerPrimitive.Previous aria-label="Previous response">
              <ArrowUp size={12} />
            </BranchPickerPrimitive.Previous>
            <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
            <BranchPickerPrimitive.Next aria-label="Next response">
              <ArrowDown size={12} />
            </BranchPickerPrimitive.Next>
          </BranchPickerPrimitive.Root>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  )
}
function UserMessage() {
  return (
    <MessagePrimitive.Root className="chat-message user">
      <div className="chat-avatar">
        <User size={16} />
      </div>
      <div className="chat-message-body">
        <span className="chat-role">You</span>
        <MessagePrimitive.Parts components={{ Text }} />
        <ActionBarPrimitive.Root className="chat-actions">
          <ActionBarPrimitive.Edit className="demo-button">Edit message</ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  )
}
function EditComposer() {
  return (
    <ComposerPrimitive.Root className="chat-edit">
      <ComposerPrimitive.Input aria-label="Edit chat message" />
      <div className="demo-toolbar">
        <ComposerPrimitive.Send className="demo-button primary">
          Save & rerun
        </ComposerPrimitive.Send>
        <ComposerPrimitive.Cancel className="demo-button">Cancel edit</ComposerPrimitive.Cancel>
      </div>
    </ComposerPrimitive.Root>
  )
}
function ChatBody({ reset }: { reset: () => void }) {
  const running = useAuiState((state) => state.thread.isRunning)
  const messages = useAuiState((state) => state.thread.messages)
  return (
    <div className="demo-two-col chat-study">
      <section className="demo-panel chat-panel">
        <div className="demo-panel-head">
          <div>
            <h2>An analytical conversation</h2>
            <p>Local scripted demo · no model connected</p>
          </div>
          <div className="demo-toolbar">
            <button
              type="button"
              className="demo-button"
              disabled={!messages.length || running}
              onClick={() =>
                download(
                  "conversation.md",
                  messages
                    .map(
                      (message) =>
                        `## ${message.role === "user" ? "You" : "Local assistant"}\n\n${message.content
                          .filter((part) => part.type === "text")
                          .map((part) => (part.type === "text" ? part.text : ""))
                          .join("\n")}`
                    )
                    .join("\n\n"),
                  "text/markdown"
                )
              }
            >
              <Download size={12} /> Transcript
            </button>
            <button
              type="button"
              className="demo-button"
              disabled={running || !messages.length}
              onClick={reset}
            >
              <RotateCcw size={12} /> Clear chat
            </button>
          </div>
        </div>
        <ThreadPrimitive.Root className="chat-thread">
          <ThreadPrimitive.Viewport className="chat-viewport">
            <ThreadPrimitive.Empty>
              <div className="chat-empty">
                <span className="chat-empty-mark">
                  <MessageSquare size={24} />
                </span>
                <h3>A place to ask, inspect and refine.</h3>
                <p>
                  Try a question about the illustrative dataset, chart choices, or the probabilistic
                  model.
                </p>
                <div className="chat-suggestions">
                  {prompts.map((prompt) => (
                    <ThreadPrimitive.Suggestion
                      className="chat-suggestion"
                      prompt={prompt}
                      send
                      key={prompt}
                    >
                      {prompt}
                      <ArrowUp size={13} />
                    </ThreadPrimitive.Suggestion>
                  ))}
                </div>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={{ UserMessage, AssistantMessage, EditComposer }}
            />
            <ThreadPrimitive.ScrollToBottom className="chat-scroll-bottom demo-button">
              <ArrowDown size={13} /> Latest message
            </ThreadPrimitive.ScrollToBottom>
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root className="chat-composer">
            <ComposerPrimitive.Input
              className="chat-input"
              aria-label="Chat message"
              placeholder="Ask about these records…"
            />
            <div className="chat-composer-footer">
              <span className="demo-meta">
                {running
                  ? "Streaming a local response…"
                  : "Enter to send · Shift+Enter for a new line"}
              </span>
              {running ? (
                <ComposerPrimitive.Cancel className="demo-button" aria-label="Stop response">
                  <Square size={13} /> Stop
                </ComposerPrimitive.Cancel>
              ) : (
                <ComposerPrimitive.Send className="demo-button primary" aria-label="Send message">
                  <ArrowUp size={15} /> Send
                </ComposerPrimitive.Send>
              )}
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </section>
      <aside className="demo-stack">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Try the interaction</h2>
          </div>
          <div className="demo-panel-body input-form">
            <p className="status-message">
              Send a message, interrupt the stream, edit a previous question, or regenerate an
              answer. Branch controls appear after regeneration.
            </p>
            <div className="chat-example-prompts">
              {prompts.map((prompt) => (
                <ThreadPrimitive.Suggestion
                  className="demo-button"
                  prompt={prompt}
                  send
                  key={prompt}
                >
                  {prompt}
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Runtime boundary</h2>
          </div>
          <div className="demo-panel-body input-form">
            <p className="status-message">
              assistant-ui handles messages, streaming, cancellation, editing and branches. This
              demo's adapter returns deterministic text and calculates dataset summaries locally.
            </p>
            <p className="status-message">
              A live assistant would replace that adapter with a backend connection. The UI does not
              require a hosted chat service.
            </p>
          </div>
        </section>
      </aside>
    </div>
  )
}
export default function ChatStudy() {
  const runtime = useLocalRuntime(adapter)
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatBody reset={() => runtime.thread.reset()} />
    </AssistantRuntimeProvider>
  )
}
