/**
 * src/ui/i18n-bootstrap.js
 *
 * Mini-bootstrap que aplica STRINGS al DOM estático de index.html.
 * Se carga como `<script type="module">` ANTES del main.js para que los
 * strings críticos (orientation modal, fullscreen aria-label) estén
 * disponibles desde el primer paint.
 *
 * Mantiene el contrato A2: cero prosa española libre en index.html;
 * todos los strings user-facing viven en `src/i18n/es.js`.
 */
import { STRINGS } from '../i18n/es.js?v=44'

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', apply, { once: true })
} else {
  apply()
}