import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@atelier/theme/direction.css"
import "../index.css"
import "./workbench.css"
import "./new-studies.css"
import { Workbench } from "./workbench"

const root = document.getElementById("root")
if (!root) throw new Error("The workbench needs a root element")
createRoot(root).render(
  <StrictMode>
    <Workbench />
  </StrictMode>
)
