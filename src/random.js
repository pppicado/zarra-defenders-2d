/**
 * src/random.js
 *
 * Tiny seeded PRNG (mulberry32) for deterministic ?test=1 runs.
 *
 *   mulberry32(seed) -> () => float in [0, 1)
 *
 * Production paths use Math.random — only the test branch injects a seeded PRNG.
 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1
  const fn = function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  fn.seed = (seed >>> 0) || 1
  return fn
}

/** Convenience: deterministic 60 Hz clock. */
export function fixedClock() {
  let t = 0
  return {
    advance(dtMs) { t += dtMs; return t },
    setTime(ms) { t = ms },
    now() { return t },
  }
}
