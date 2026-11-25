import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Download, RotateCcw, Save } from "lucide-react"
import { useState } from "react"
import { type DateRange, DayPicker } from "react-day-picker"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { download } from "./data"
import "react-day-picker/style.css"

const schema = z.object({
  name: z.string().trim().min(3, "Use at least three characters for the name."),
  count: z.number().int().min(10, "Choose at least 10 records.").max(500),
  threshold: z.number().min(0).max(1),
  region: z.enum(["All regions", "North", "Central", "South"]),
  reviewed: z.boolean(),
  notes: z.string().max(500, "Keep the notes within 500 characters."),
})
type Config = z.infer<typeof schema>
const defaults: Config = {
  name: "October review",
  count: 120,
  threshold: 0.65,
  region: "All regions",
  reviewed: false,
  notes: "Compare the selected records with the previous review.",
}

export default function Inputs() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 9, 5),
    to: new Date(2026, 9, 23),
  })
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null)
  const [message, setMessage] = useState("")
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<Config>({ resolver: zodResolver(schema), defaultValues: defaults })
  const values = watch()
  const configuration = (config: Config) => ({
    ...config,
    dates: {
      from: range?.from?.toLocaleDateString("en-CA"),
      to: range?.to?.toLocaleDateString("en-CA"),
    },
  })
  const save = (config: Config) => {
    if (!range?.from || !range.to) {
      setMessage("Choose a start and end date before saving.")
      return
    }
    const next = configuration(config)
    try {
      localStorage.setItem("atelier-workbench-configuration", JSON.stringify(next))
      setSaved(next)
      setMessage("Configuration saved in this browser.")
    } catch {
      setMessage("Browser storage is unavailable. Use Download JSON to keep the configuration.")
    }
  }
  return (
    <div className="demo-two-col">
      <form className="demo-panel" onSubmit={handleSubmit(save)} noValidate>
        <div className="demo-panel-head">
          <div>
            <h2>Review configuration</h2>
            <p>Structured inputs and a date range</p>
          </div>
          <span className="demo-meta">{isDirty ? "Unsaved edits" : "Example configuration"}</span>
        </div>
        <div className="demo-panel-body input-form">
          <label className="demo-field">
            <span>Configuration name</span>
            <input
              className="demo-input"
              {...register("name")}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <small className="field-error" role="alert">
                {errors.name.message}
              </small>
            )}
          </label>
          <div className="demo-equal-col">
            <label className="demo-field">
              <span>Sample size</span>
              <input
                type="number"
                className="demo-input"
                {...register("count", { valueAsNumber: true })}
                min={10}
                max={500}
              />
              {errors.count && (
                <small className="field-error" role="alert">
                  {errors.count.message}
                </small>
              )}
            </label>
            <label className="demo-field">
              <span>Region</span>
              <select className="demo-input" {...register("region")}>
                {["All regions", "North", "Central", "South"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="demo-field">
            <span className="range-label">
              Minimum score <output>{Number(values.threshold).toFixed(2)}</output>
            </span>
            <input
              aria-label="Minimum score"
              type="range"
              min={0}
              max={1}
              step={0.01}
              {...register("threshold", { valueAsNumber: true })}
            />
            <small>Retain records with a score at or above this value.</small>
          </label>
          <fieldset className="calendar-field">
            <legend>Date range</legend>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={(next) => {
                setRange(next)
                setMessage("")
              }}
              defaultMonth={new Date(2026, 9, 1)}
              numberOfMonths={1}
              showOutsideDays
            />
          </fieldset>
          <label className="demo-checkbox">
            <input type="checkbox" {...register("reviewed")} /> Include reviewed records
          </label>
          <label className="demo-field">
            <span>Notes</span>
            <textarea className="demo-input" rows={3} {...register("notes")} />
          </label>
        </div>
        <div className="input-form-footer">
          <button type="submit" className="demo-button primary">
            <Save size={13} /> Save configuration
          </button>
          <button
            type="button"
            className="demo-button"
            onClick={() => {
              reset(defaults)
              setRange({ from: new Date(2026, 9, 5), to: new Date(2026, 9, 23) })
              setMessage("")
            }}
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        {message && (
          <div role="status" className={`demo-panel-note ${saved ? "saved-message" : ""}`}>
            {saved && <Check size={13} />}
            {message}
          </div>
        )}
      </form>
      <div className="demo-stack input-preview">
        <section className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <h2>Current values</h2>
              <p>Updates as the inputs change</p>
            </div>
            <button
              type="button"
              className="demo-button"
              onClick={handleSubmit((config) =>
                download(
                  "review-configuration.json",
                  JSON.stringify(configuration(config), null, 2)
                )
              )}
            >
              <Download size={12} /> JSON
            </button>
          </div>
          <div className="demo-panel-body">
            <pre className="code-preview">{JSON.stringify(configuration(values), null, 2)}</pre>
          </div>
        </section>
        <section className="demo-panel">
          <div className="demo-panel-head">
            <h2>Saved configuration</h2>
            <button
              type="button"
              className="demo-button"
              onClick={() => {
                try {
                  const value = localStorage.getItem("atelier-workbench-configuration")
                  if (value) {
                    setSaved(JSON.parse(value))
                    setMessage("Loaded the saved configuration preview.")
                  } else setMessage("There is no saved configuration in this browser yet.")
                } catch {
                  setMessage("Could not read browser storage.")
                }
              }}
            >
              Load saved
            </button>
          </div>
          <div className="demo-panel-body">
            {saved ? (
              <pre className="code-preview">{JSON.stringify(saved, null, 2)}</pre>
            ) : (
              <p className="status-message">
                Save a configuration to inspect the persisted values here. Data stays in this
                browser.
              </p>
            )}
          </div>
        </section>
        <div className="input-note">
          <div className="eyebrow">Try the behavior</div>
          <p>
            Clear the name and save to see validation. Pick two days to change the range. Download
            the configuration or save it locally and reload the preview.
          </p>
        </div>
      </div>
    </div>
  )
}
