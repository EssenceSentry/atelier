// Units a number must never be parted from. Only real units: joining a number
// to any following word would weld whole phrases into unbreakable blocks.
const UNITS = "B|KB|MB|GB|KiB|MiB|GiB|TiB|ms|s|min|h|d|rows/s|px|%|×"
const AFTER_NUMBER = new RegExp(`(\\d)\\s+(?=(?:${UNITS})(?!\\w))`, "g")
const BEFORE_NUMBER = /\b(code|attempt|shard|cell|step|page)\s+(?=\d)/gi

/**
 * Joins numbers to their unit with a no-break space, so a wrapping line never
 * strands "3.1" from "MiB" or "exit code" from "1".
 */
export function keepUnits(text: string) {
  return text.replace(AFTER_NUMBER, "$1 ").replace(BEFORE_NUMBER, "$1 ")
}

/**
 * Keeps identifiers and paths readable when a line wraps: no break after the
 * hyphens inside a token with a digit or a slash, so "embed-travel-1785866245"
 * stays whole, and an allowed break after each "/" so a long path wraps
 * between its segments rather than inside one.
 */
export function keepIds(text: string) {
  return text.replace(/\S*[\d/]\S*/g, (token) => token.replaceAll("-", "-⁠").replaceAll("/", "/​"))
}
