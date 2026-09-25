/**
 * src/sharing/share.js
 *
 * ShareEngine — share buttons for Twitter / Facebook / clipboard / navigator.share().
 * ROADMAP §5.4 — Phase 5 sharing (no tracking, no backend).
 *
 * Public API:
 *   isAvailable()                — true if window exists
 *   hasNativeShare()             — true if navigator.share exists
 *   buildShareText(scoreData)    — returns the pre-formatted share string (uses STRINGS.share.template)
 *   buildShareUrl(scoreData)     — returns '?ref=<base64>' URL for current page
 *   parseRefFromUrl(search)      — inverse of buildShareUrl's payload (best-effort)
 *   encodeRef(scoreData)         — base64-encode {firmas, score, stageId}
 *   decodeRef(encoded)           — decode and return {firmas, score, stageId} or null
 *   openTwitter(text, url)       — window.open to twitter intent (URL from STRINGS)
 *   openFacebook(url)            — window.open to facebook sharer (URL from STRINGS)
 *   copyToClipboard(text)        — navigator.clipboard.writeText; resolves true/false
 *   nativeShare({title, text, url}) — navigator.share if available, else false
 */
import { STRINGS } from '../i18n/es.js?v=44'

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function isHttpsOrLocal() {
  if (!isBrowser()) return false
  if (window.location.protocol === 'https:') return true
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true
  return false
}

export class ShareEngine {
  isAvailable() {
    return isBrowser()
  }

  hasNativeShare() {
    return isBrowser() && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  }

  buildShareText(scoreData, url) {
    const firmas = (scoreData && typeof scoreData.firmas === 'number') ? scoreData.firmas : 0
    const shareUrl = url || (isBrowser() ? this.buildShareUrl(scoreData) : '')
    return (STRINGS.share.template || '')
      .replace('{firmas}', String(firmas))
      .replace('{url}', shareUrl)
  }

  buildShareUrl(scoreData) {
    if (!isBrowser()) return ''
    const encoded = this.encodeRef(scoreData)
    const base = window.location.origin + window.location.pathname
    return encoded ? `${base}?ref=${encoded}` : base
  }

  parseRefFromUrl(searchString) {
    const search = searchString || (isBrowser() ? window.location.search : '')
    if (!search) return null
    const params = new URLSearchParams(search)
    const ref = params.get('ref')
    if (!ref) return null
    return this.decodeRef(ref)
  }

  encodeRef(scoreData) {
    if (!scoreData) return ''
    const payload = {
      f: scoreData.firmas ?? 0,
      s: scoreData.score ?? 0,
      st: scoreData.stageId ?? '',
    }
    try {
      if (isBrowser() && typeof btoa === 'function') {
        return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      }
      return Buffer.from(JSON.stringify(payload)).toString('base64')
    } catch (_) {
      return ''
    }
  }

  decodeRef(encoded) {
    if (!encoded || typeof encoded !== 'string') return null
    try {
      let json
      if (isBrowser() && typeof atob === 'function') {
        json = decodeURIComponent(escape(atob(encoded)))
      } else {
        json = Buffer.from(encoded, 'base64').toString('utf8')
      }
      const obj = JSON.parse(json)
      if (typeof obj !== 'object' || obj === null) return null
      return {
        firmas: typeof obj.f === 'number' ? obj.f : 0,
        score: typeof obj.s === 'number' ? obj.s : 0,
        stageId: typeof obj.st === 'string' ? obj.st : '',
      }
    } catch (_) {
      return null
    }
  }

  openTwitter(text, url) {
    if (!isBrowser()) return false
    const t = encodeURIComponent(text || '')
    const u = encodeURIComponent(url || '')
    const template = STRINGS.share.twitterIntent
    const intent = template
      .replace('{text}', t)
      .replace('{url}', u)
    try {
      window.open(intent, '_blank', 'noopener,noreferrer,width=550,height=420')
      return true
    } catch (_) {
      return false
    }
  }

  openFacebook(url) {
    if (!isBrowser()) return false
    const u = encodeURIComponent(url || '')
    const template = STRINGS.share.facebookIntent
    const intent = template.replace('{url}', u)
    try {
      window.open(intent, '_blank', 'noopener,noreferrer,width=550,height=420')
      return true
    } catch (_) {
      return false
    }
  }

  async copyToClipboard(text) {
    if (!isBrowser()) return false
    if (!navigator || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      return this._fallbackCopy(text)
    }
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (_) {
      return this._fallbackCopy(text)
    }
  }

  _fallbackCopy(text) {
    if (!isBrowser() || !document.body) return false
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      ta.style.pointerEvents = 'none'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return !!ok
    } catch (_) {
      return false
    }
  }

  async nativeShare(payload) {
    if (!this.hasNativeShare()) return false
    try {
      await navigator.share(payload)
      return true
    } catch (_) {
      return false
    }
  }

  getTitle() {
    return STRINGS.share.title || ''
  }

  getHint() {
    return STRINGS.share.hint || ''
  }

  getCopyOkMsg() {
    return STRINGS.share.copyOk || ''
  }

  getCopyFailMsg() {
    return STRINGS.share.copyFail || ''
  }

  getShareOkMsg() {
    return STRINGS.share.shareOk || ''
  }

  getTemplateText() {
    return STRINGS.share.template || ''
  }

  canClipboard() {
    return isHttpsOrLocal() || (isBrowser() && typeof navigator !== 'undefined' && navigator.clipboard)
  }
}

export const shareEngine = new ShareEngine()