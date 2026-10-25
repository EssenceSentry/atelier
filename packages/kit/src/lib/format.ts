/**
 * Joins numbers to the unit or word after them with a no-break space, so a
 * wrapping line never strands "3.1" from "MiB" or "exit code" from "1".
 */
export function keepUnits(text: string) {
  return text
    .replace(/(\d)\s+(?=[A-Za-z%°µ]+\b)/g, "$1\u00a0")
    .replace(/\b(code|attempt|shard|cell|step|page)\s+(?=\d)/gi, "$1\u00a0")
}

/**
 * Stops lines breaking after the hyphens inside identifiers and paths (tokens
 * with a digit or a slash), so "embed-travel-1785866245" stays whole.
 */
export function keepIds(text: string) {
  return text.replace(/\S*[\d/]\S*/g, (token) => token.replaceAll("-", "-\u2060"))
}
