import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@atelier/theme/direction.css"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
