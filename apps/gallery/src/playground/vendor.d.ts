declare module "plotly.js-dist-min" {
  import type * as Plotly from "plotly.js"

  const value: typeof Plotly
  export default value
}
declare module "compassql/build/compassql.js" {
  const engine: typeof import("compassql/build/src/index")
  export default engine
}
