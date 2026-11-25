import camera from "./photos/camera.jpg"
import cell from "./photos/cell.jpg"
import coins from "./photos/coins.jpg"
import field from "./photos/field.jpg"
import launch from "./photos/launch.jpg"
import pilot from "./photos/pilot.jpg"

export const scenes = [
  {
    id: "launch",
    src: launch,
    title: "Cape Canaveral",
    credit: "SpaceX",
    note: "Falcon 9 and its launch towers above the floodlit pad at dusk.",
  },
  {
    id: "pilot",
    src: pilot,
    title: "Eileen Collins",
    credit: "NASA",
    note: "The shuttle pilot in an orange flight suit, holding her helmet.",
  },
  {
    id: "field",
    src: field,
    title: "Hubble eXtreme Deep Field",
    credit: "NASA",
    note: "Spirals, bright cores and elongated galaxies fill a single telescope field.",
  },
  {
    id: "camera",
    src: camera,
    title: "Behind the camera",
    credit: "Lav Varshney",
    note: "A photographer and tripod stand in silhouette against the pale sky.",
  },
  {
    id: "coins",
    src: coins,
    title: "Coins from Pompeii",
    credit: "Brooklyn Museum",
    note: "Rows of Greek coins photographed against a gray ground.",
  },
  {
    id: "cell",
    src: cell,
    title: "A cell in saline",
    credit: "Müller et al.",
    note: "A quantitative phase image recovered from a digital hologram. The cell stands out against the banded background.",
  },
]

// Deterministic sample sets let the same review record retain its frames across sorts.
export function evidenceFrame(id: string, frame: number) {
  const start = Number(id.slice(2)) - 1
  return scenes[(start + frame) % scenes.length]
}
