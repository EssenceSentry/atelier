import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { sql } from "@codemirror/lang-sql"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { Compartment, EditorState } from "@codemirror/state"
import { EditorView, keymap, lineNumbers } from "@codemirror/view"
import { tags } from "@lezer/highlight"

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], class: "at-code-keyword" },
  { tag: [tags.string, tags.propertyName], class: "at-code-string" },
  { tag: [tags.number, tags.bool, tags.null], class: "at-code-number" },
  { tag: tags.comment, class: "at-code-comment" },
])
const configs = new WeakMap()
const language = (name) => (name === "json" ? json() : sql())
export function updateEditor(view, options) {
  const state = configs.get(view)
  state.options = options
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: options.source },
    effects: state.language.reconfigure(language(options.language)),
  })
}
export function editor(host, options) {
  const state = { options, language: new Compartment() }
  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: options.source,
      extensions: [
        state.language.of(language(options.language)),
        history(),
        lineNumbers(),
        syntaxHighlighting(highlight),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((value) => {
          if (value.docChanged) state.options.onChange?.(value.state.doc.toString())
        }),
        EditorView.theme({
          "&": { backgroundColor: "var(--card)", color: "var(--foreground)" },
          ".cm-content": { caretColor: "var(--primary)", minHeight: "200px" },
          ".cm-gutters": {
            backgroundColor: "var(--sunken)",
            color: "var(--muted-foreground)",
            borderColor: "var(--border)",
          },
        }),
      ],
    }),
  })
  configs.set(view, state)
  return view
}
