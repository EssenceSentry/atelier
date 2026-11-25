import { ArrowDown, ArrowUpRight, Layers } from "lucide-react"
import { createRoot } from "react-dom/client"
import "../../../packages/theme/src/bundles/editorial.css"
import "./index.css"
import "./catalog.css"
import { studies } from "./playground/study-pages"
import type { Direction, Screen } from "./theme/board"

const screens: { id: Screen; name: string; direction: Direction; mode: "light" | "dark" }[] = [
  { id: "monitor", name: "Run monitor", direction: "instrument", mode: "light" },
  { id: "report", name: "Research report", direction: "editorial", mode: "light" },
  { id: "lab", name: "Embedding lab", direction: "console", mode: "dark" },
  { id: "review", name: "Review station", direction: "instrument", mode: "light" },
  { id: "channels", name: "Channel evidence", direction: "editorial", mode: "light" },
  { id: "states", name: "Feedback states", direction: "console", mode: "light" },
]
const families = studies
  .filter((study) => study.id !== "notebook")
  .sort((a, b) => a.name.localeCompare(b.name))
const previews = import.meta.glob<string>("./previews/*.webp", { eager: true, import: "default" })

function Catalog() {
  return (
    <div className="catalog">
      <header className="catalog-mast">
        <span>
          <Layers aria-hidden="true" size={20} /> Atelier
        </span>
        <a href="./playground.html?view=notebook">
          Open notebook <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <div className="catalog-title">
          <h1>Interface gallery</h1>
          <nav aria-label="Gallery sections">
            <a href="#screens">
              Screens <small>{screens.length}</small>
            </a>
            <a href="#components">
              Component studies <small>{families.length}</small> <ArrowDown size={14} />
            </a>
          </nav>
        </div>
        <section id="screens" aria-label="Screens" className="catalog-screens">
          {screens.map(({ id, name, direction, mode }) => (
            <a
              key={id}
              className="catalog-screen"
              href={`./index.html?s=${id}&d=${direction}&m=${mode}`}
            >
              <div className="catalog-photo">
                <img alt="" width="680" height="382" src={previews[`./previews/${id}.webp`]} />
              </div>
              <div className="catalog-caption">
                <h2>{name}</h2>
                <ArrowUpRight aria-hidden="true" size={18} />
              </div>
              <span className="catalog-spec">
                {direction} · {mode}
              </span>
            </a>
          ))}
        </section>
        <section id="components" className="catalog-families">
          <h2>Component studies</h2>
          <ul>
            {families.map(({ id, name, libraries }) => (
              <li key={id}>
                <a href={`./playground.html?view=${id}`}>
                  <img
                    src={previews[`./previews/${id}.webp`]}
                    width="112"
                    height="70"
                    loading="lazy"
                    alt=""
                  />
                  <span>
                    <strong>{name}</strong>
                    <small>{libraries.slice(0, 2).join(" · ")}</small>
                  </span>
                  <ArrowUpRight aria-hidden="true" size={15} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
const root = document.getElementById("root")
document.documentElement.dataset.direction = "editorial"
if (root) createRoot(root).render(<Catalog />)
