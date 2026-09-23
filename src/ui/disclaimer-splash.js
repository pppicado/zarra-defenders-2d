/**
 * src/ui/disclaimer-splash.js
 *
 * F3.3 — Disclaimer legal modal on cold load (Art. 20 CE + Art. 11 CDFUE).
 *
 * Shows the legal disclaimer the first time the user loads index.html.
 * "No volver a mostrar" sets a localStorage flag (`zarra2d:disclaimer:suppressed`)
 * so the splash is skipped on subsequent loads unless the user clears storage.
 *
 * Closed via:
 *   - Click "Aceptar" button
 *   - Esc / Enter on keyboard
 *
 * Idempotent: if localStorage says suppressed, this is a no-op.
 */
import { STRINGS } from '../i18n/es.js?v=44'

const STORAGE_KEY = 'zarra2d:disclaimer:suppressed'

/**
 * Show the disclaimer splash unless the user previously opted out.
 * @param {Storage} [storage]  injectable for tests (defaults to localStorage)
 */
export function maybeShowDisclaimerSplash(storage) {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!s) return  // No storage (private browsing / SSR) → skip silently
  try {
    if (s.getItem(STORAGE_KEY)) return  // user opted out
  } catch {
    return  // Storage access failed → skip
  }

  const root = document.getElementById('disclaimer-splash')
  if (!root) return

  const D = STRINGS.disclaimer
  root.innerHTML = `
    <div class="disclaimer-splash-card" role="dialog" aria-modal="true" aria-label="${D.splashTitulo}">
      <h2 class="disclaimer-splash-title">${D.splashTitulo}</h2>
      <div class="disclaimer-splash-body">${D.full}</div>
      <label class="disclaimer-splash-checkbox-label">
        <input type="checkbox" id="disclaimer-splash-no-show" />
        <span>${D.splashCheckbox}</span>
      </label>
      <div class="disclaimer-splash-buttons">
        <button type="button" class="disclaimer-splash-btn disclaimer-splash-btn--primary" data-role="ack">${D.splashAceptar}</button>
      </div>
    </div>
  `

  root.classList.remove('hidden')
  root.setAttribute('aria-hidden', 'false')

  const checkbox = root.querySelector('#disclaimer-splash-no-show')
  const ack = root.querySelector('[data-role="ack"]')

  let onKey

  function close() {
    if (checkbox && checkbox.checked) {
      try { s.setItem(STORAGE_KEY, '1') } catch { /* no-op */ }
    }
    root.classList.add('hidden')
    root.setAttribute('aria-hidden', 'true')
    root.innerHTML = ''
    if (onKey) window.removeEventListener('keydown', onKey)
  }

  onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault()
      close()
    }
  }

  if (ack) ack.addEventListener('click', close)
  window.addEventListener('keydown', onKey)

  // Defer focus to the next tick so the user can see the splash render first
  setTimeout(() => { if (ack) ack.focus() }, 0)

  return { close }
}
