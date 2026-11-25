import { z } from "zod"

const A = globalThis.Atelier
A.register(
  "inputs",
  (host, initial, ctx) => {
    let options
    let values
    const render = (next) => {
      options = next
      values = {
        ...Object.fromEntries(
          next.fields.map((field) => [
            field.key,
            field.value ?? (field.type === "checkbox" ? false : ""),
          ])
        ),
        ...next.values,
      }
      host.replaceChildren()
      const form = ctx.element("form", "at-controls")
      const result = ctx.element("p", "at-note")
      result.setAttribute("role", "status")
      for (const field of next.fields)
        ctx.field(form, {
          ...field,
          value: values[field.key] ?? field.value,
          onChange(value) {
            values[field.key] = value
            next.onChange?.({ ...values }, field.key)
          },
        })
      const submit = ctx.element("button", "at-button", next.submitLabel ?? "Apply settings")
      submit.type = "submit"
      form.append(submit, result)
      form.addEventListener("submit", async (event) => {
        event.preventDefault()
        const parsed = options.schema?.safeParse(values)
        if (parsed && !parsed.success) {
          result.textContent = parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(" · ")
          return
        }
        submit.disabled = true
        try {
          await options.onSubmit?.(parsed?.data ?? { ...values })
          result.textContent = options.successMessage ?? "Settings applied."
        } catch (error) {
          result.textContent = error.message ?? String(error)
        } finally {
          submit.disabled = false
        }
      })
      host.append(form)
    }
    render(initial)
    return {
      update: render,
      theme() {},
      api: {
        get values() {
          return { ...values }
        },
      },
    }
  },
  { z }
)
