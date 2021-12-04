/* eslint-disable import/no-unused-modules */
import type { Falsy } from "./types.js"

export function codeBlock(code: string) {
  return ["```", code, "```"].join("\n")
}

export function joinContentfulStrings(
  strings: Array<string | Falsy>,
  separator: string,
) {
  return strings.filter(Boolean).join(separator)
}
