// Run with: node --test packages/kit/test/*.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { keepIds, keepUnits } from "../src/lib/format.ts"

const NBSP = "\u00a0"
const JOIN = "\u2060"
const BREAK = "\u200b"

test("keepUnits joins a number to its unit", () => {
  assert.equal(
    keepUnits("shard 27/36 written · 3.1 MiB"),
    `shard${NBSP}27/36 written · 3.1${NBSP}MiB`
  )
  assert.equal(
    keepUnits("dipped to 268 rows/s for 4 min"),
    `dipped to 268${NBSP}rows/s for 4${NBSP}min`
  )
  assert.equal(keepUnits("AlgorithmError: exit code 1"), `AlgorithmError: exit code${NBSP}1`)
})

test("keepUnits leaves ordinary words breakable", () => {
  assert.equal(keepUnits("job 1785866245 AlgorithmError"), "job 1785866245 AlgorithmError")
  assert.equal(keepUnits("shard-026 uploaded"), "shard-026 uploaded")
  assert.equal(keepUnits("3 seconds"), "3 seconds")
})

test("keepIds keeps hyphenated identifiers whole and paths breakable", () => {
  assert.equal(keepIds("job embed-travel-1785866245"), `job embed-${JOIN}travel-${JOIN}1785866245`)
  assert.equal(keepIds("s3://lab/v4"), `s3:/${BREAK}/${BREAK}lab/${BREAK}v4`)
  assert.equal(keepIds("a well-known word"), "a well-known word")
})
