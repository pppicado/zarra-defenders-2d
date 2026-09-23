/**
 * src/ui/i18n-bootstrap.js
 *
 * Mini-bootstrap that applies STRINGS to the static DOM of index.html.
 * Loaded as `<script type="module">` BEFORE main.js so the critical
 * strings (orientation modal, fullscreen aria-label) are available
 * from the first paint.
 *
 * Maintains the A2 contract: zero free Spanish prose in index.html;
 * all user-facing strings live in `src/i18n/es.js`.
 */
import { STRINGS } from '../i18n/es.js?v=44'
import { maybeShowDisclaimerSplash } from './disclaimer-splash.js?v=44'

function apply() {
  // Orientation modal text
  const orientP = document.querySelector('#orientation-warning p')
  if (orientP) orientP.textContent = STRINGS.orientation.rotarMovil

  // Fullscreen button aria-label
  const fsBtn = document.getElementById('fullscreen-btn')
  if (fsBtn) fsBtn.setAttribute('aria-label', STRINGS.fullscreen.ariaLabel)

  // Title (extra; viene de STRINGS.app.nombre)
  if (document.title !== STRINGS.app.nombre) {
    document.title = STRINGS.app.nombre
  }

  // F3.3 — disclaimer splash (cold-load only; suppressed if user opted out).
  // Skipped in ?test=1 mode so e2e harnesses don't have to dismiss it before
  // exercising gameplay UI. ?test=1 already disables main-menu flow (see
  // src/test-api.js), so this is consistent with the existing test contract.
  const testMode = new URLSearchParams(window.location.search).has('test')
  if (!testMode) maybeShowDisclaimerSplash()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', apply, { once: true })
} else {
  apply()
}