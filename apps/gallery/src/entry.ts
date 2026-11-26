// The Pages homepage is the catalog. Existing preview URLs can specify any one
// of these controls, including a theme or a mode without a screen.
const query = new URLSearchParams(location.search)
if (
  import.meta.env.MODE === "pages" &&
  __HAS_CATALOG__ &&
  !["s", "d", "m", "chrome"].some((key) => query.has(key))
) {
  void import("./catalog")
} else {
  void import("./main")
}
