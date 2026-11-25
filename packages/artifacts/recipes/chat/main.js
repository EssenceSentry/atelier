const book = Atelier.notebook({
  title: "Conversation interface",
  description: "Local scripted example. No language model or remote service is connected.",
})
const cell = book.cell({ id: "conversation", title: "Ask about this artifact" })
Atelier.mount("chat", cell.view, {
  emptyMessage: "Ask a question to try the scripted adapter.",
  adapter: {
    async *run({ messages, abortSignal }) {
      const text = messages
        .at(-1)
        .content.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ")
      const answer = `This is a local scripted response to: ${text}. Supply a real adapter when a service is available.`
      for (let i = 16; i < answer.length + 16; i += 16) {
        if (abortSignal.aborted) return
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield { content: [{ type: "text", text: answer.slice(0, i) }] }
      }
    },
  },
})
