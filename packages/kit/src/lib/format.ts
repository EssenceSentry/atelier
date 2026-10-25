/**
 * Joins numbers to the unit or word after them with a no-break space, so a
 * wrapping line never strands "3.1" from "MiB" or "exit code" from "1".
 */
export function keepUnits(text: string) {
  return text
    .replace(/(\d)\s+(?=[A-Za-z%°µ]+\b)/g, "$1 ")
    .replace(/\b(code|attempt|shard|cell|step|page)\s+(?=\d)/gi, "$1 ")
}
