/**
 * src/engine/dom-debug.js
 *
 * Two responsibilities:
 *   1. The SINGLE permitted carve-out for `console.*` calls in src/ (A8 contract from 3D).
 *      Production modules import `__zr.{log,warn,error}` from here; the
 *      functions gate behind the `__zr.debug` flag (set via
 *      `localStorage.__zr.debug = "1"` or `?debug=1` query string).
 *
 *   2. DOM helpers (getCanvas, setOverlayVisible, setOverlayText) for UI overlays
 *      and pixel-perfect game canvas lookups.
 *
 * `verify.sh` (Fase 2) checks `grep -rn "console\." src/ | grep -v engine/dom-debug.js`
 * and expects zero matches outside this module — every other source file
 * MUST use `__zr.{log,warn,error}` instead of bare `console.*`.
 *
 * Adapted from zarra-defenders (3D, src/engine/dom.js) which uses `__zarra`.
 * The 2D project uses `__zr` to keep namespaces distinct when both projects
 * live on the same workstation.
 */

// ---- Debug flag (gated console.* export) -------------------------------

function debugFlag() {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("__zr.debug") === "1") return true;
    if (typeof location !== "undefined" && new URLSearchParams(location.search).get("debug") === "1") return true;
  } catch (_) {
    // private browsing / sandboxed iframe — fall through to false
  }
  return false;
}

export const __zr = {
  get debug() { return debugFlag(); },
  log:   (...a) => { if (__zr.debug) console.log(...a); },
  warn:  (...a) => { if (__zr.debug) console.warn(...a); },
  error: (...a) => { if (__zr.debug) console.error(...a); },
};

// ---- DOM helpers -------------------------------------------------------

/**
 * Returns the #game-canvas-wrapper or #game-hud-wrapper depending on id.
 * Centralised so engine/game modules all reach the canvas through the same
 * accessor — avoids id-typo bugs.
 */
export function getCanvasWrapper(id = "game-canvas-wrapper") {
  const c = document.getElementById(id);
  if (!c) {
    throw new Error(`engine/dom-debug: #${id} not found in DOM`);
  }
  return c;
}

/**
 * Toggle a single overlay visible/hidden by flipping its `hidden` class.
 * Used by menu.js, overlay.js, pause.js, data-screen.js.
 */
export function setOverlayVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  if (visible) {
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
  } else {
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  }
}

/**
 * Set text content on a child of a given overlay. Returns the element so
 * callers can chain attribute tweaks (e.g., href for final-screen links).
 */
export function setOverlayText(overlayId, childId, text) {
  const el = document.getElementById(childId);
  if (!el) {
    throw new Error(`engine/dom-debug: #${childId} not found inside #${overlayId}`);
  }
  el.textContent = text;
  return el;
}