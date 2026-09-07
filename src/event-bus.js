/**
 * src/event-bus.js
 *
 * Shared EventTarget singleton for the F3 combat/integrity/score decoupling.
 * One event bus per page; all cross-module handoffs go through it.
 *
 * Topics (locked payload shapes):
 *   - combat:fire     { isoX, isoY, sourceScreen }
 *   - combat:hit      { enemyId, hpRemaining, archetype, damage, scoreDelta, firmasDelta }
 *   - combat:miss     { isoX, isoY }
 *   - enemy:destroyed { enemyId, archetype, score, firmas }
 *   - enemy:escaped   { enemyId, archetype }
 *   - integrity:changed   { current, max }
 *   - integrity:exhausted { current, max, score, firmasRecogidas }
 *   - stage:cleared   {}
 *   - stage:failed    {}
 *   - score:changed   { score, firmas, best }
 *   - menu:startRequested {}
 *   - menu:aboutRequested {}
 *   - menu:disclaimerRequested {}
 *   - menu:back       {}
 *   - ui:overlayShown {}
 *   - ui:overlayHidden {}
 */
export const eventBus = new EventTarget()

/** Convenience emit. Detail payload is forwarded to subscribers verbatim. */
export function emit(topic, detail) {
  eventBus.dispatchEvent(new CustomEvent(topic, { detail }))
}

/** Convenience subscribe. Returns an unsubscribe function. */
export function on(topic, handler) {
  const listener = (e) => handler(e.detail)
  eventBus.addEventListener(topic, listener)
  return () => eventBus.removeEventListener(topic, listener)
}
