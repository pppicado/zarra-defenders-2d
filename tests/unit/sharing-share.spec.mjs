/**
 * tests/unit/sharing-share.spec.mjs
 *
 * Pin the F5.4 ShareEngine contract (ROADMAP §5.4):
 *  - buildShareText(score, url) inserts {firmas} and {url} into the template.
 *  - buildShareUrl(score) returns '?ref=<base64>' for current page.
 *  - encodeRef(score) / decodeRef(ref) round-trip firmas + score + stageId.
 *  - decodeRef returns null on malformed input.
 *  - parseRefFromUrl(?ref=...) decodes the payload.
 *  - openTwitter / openFacebook return false when window.open fails.
 *  - hasNativeShare() reflects navigator.share presence.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { shareEngine, ShareEngine } from '../../src/sharing/share.js?v=44'

function setupBrowser(opts = {}) {
  globalThis.window = globalThis.window || {}
  globalThis.window.location = globalThis.window.location || {
    origin: 'https://example.test',
    pathname: '/',
    protocol: 'https:',
    hostname: 'example.test',
    search: '',
  }
  if (opts.search !== undefined) globalThis.window.location.search = opts.search
  globalThis.document = globalThis.document || { body: null }
  const fakeNav = {}
  if (opts.share) {
    fakeNav.share = async () => {}
  }
  if (opts.clipboard) {
    fakeNav.clipboard = { writeText: async (t) => t }
  }
  try {
    globalThis.navigator = fakeNav
  } catch (_) {
    Object.defineProperty(globalThis, 'navigator', { value: fakeNav, writable: true, configurable: true })
  }
}

test('ShareEngine: isAvailable() reflects window presence', () => {
  setupBrowser()
  assert.equal(shareEngine.isAvailable(), true)
})

test('ShareEngine: buildShareText inserts {firmas} and {url}', () => {
  setupBrowser()
  const text = shareEngine.buildShareText({ firmas: 42 }, 'https://example.test/play')
  assert.ok(text.includes('42'), 'should insert firmas count')
  assert.ok(text.includes('https://example.test/play'), 'should include url')
  assert.ok(text.includes('TRECO'), 'template includes TRECO reference')
})

test('ShareEngine: buildShareText defaults firmas=0 when missing', () => {
  setupBrowser()
  const text = shareEngine.buildShareText({}, 'https://x')
  assert.ok(text.includes('0 '))
})

test('ShareEngine: buildShareUrl appends ?ref=<base64>', () => {
  setupBrowser()
  const url = shareEngine.buildShareUrl({ firmas: 10, score: 500, stageId: 'stage1' })
  assert.ok(url.includes('?ref='))
  assert.ok(url.startsWith('https://example.test/'), 'should use origin + pathname')
})

test('ShareEngine: encodeRef/decodeRef round-trip', () => {
  setupBrowser()
  const payload = { firmas: 17, score: 1234, stageId: 'stage2-lahoz' }
  const encoded = shareEngine.encodeRef(payload)
  assert.ok(typeof encoded === 'string' && encoded.length > 0)
  const decoded = shareEngine.decodeRef(encoded)
  assert.deepEqual(decoded, { firmas: 17, score: 1234, stageId: 'stage2-lahoz' })
})

test('ShareEngine: decodeRef returns null on malformed input', () => {
  setupBrowser()
  assert.equal(shareEngine.decodeRef(''), null)
  assert.equal(shareEngine.decodeRef('not-valid-base64-!@#$'), null)
  assert.equal(shareEngine.decodeRef(null), null)
  assert.equal(shareEngine.decodeRef(undefined), null)
  assert.equal(shareEngine.decodeRef(42), null)
})

test('ShareEngine: parseRefFromUrl extracts and decodes ref param', () => {
  setupBrowser()
  const payload = { firmas: 7, score: 250, stageId: 'stage3' }
  const encoded = shareEngine.encodeRef(payload)
  const search = `?ref=${encoded}`
  const result = shareEngine.parseRefFromUrl(search)
  assert.deepEqual(result, payload)
})

test('ShareEngine: parseRefFromUrl returns null when no ref param', () => {
  setupBrowser()
  assert.equal(shareEngine.parseRefFromUrl(''), null)
  assert.equal(shareEngine.parseRefFromUrl('?other=x'), null)
})

test('ShareEngine: hasNativeShare() false without navigator.share', () => {
  setupBrowser({ share: false })
  assert.equal(shareEngine.hasNativeShare(), false)
})

test('ShareEngine: hasNativeShare() true with navigator.share', () => {
  setupBrowser({ share: true })
  assert.equal(shareEngine.hasNativeShare(), true)
})

test('ShareEngine: openTwitter returns true and calls window.open', () => {
  setupBrowser()
  let openedUrl = null
  globalThis.window.open = (url) => { openedUrl = url; return {} }
  const result = shareEngine.openTwitter('hello', 'https://x')
  assert.equal(result, true)
  assert.ok(openedUrl.startsWith('https://twitter.com/intent/tweet'))
  assert.ok(openedUrl.includes('hello'))
  assert.ok(openedUrl.includes('https%3A%2F%2Fx'))
})

test('ShareEngine: openTwitter returns false when window.open throws', () => {
  setupBrowser()
  globalThis.window.open = () => { throw new Error('blocked') }
  assert.equal(shareEngine.openTwitter('hi'), false)
})

test('ShareEngine: openFacebook returns true and calls window.open', () => {
  setupBrowser()
  let openedUrl = null
  globalThis.window.open = (url) => { openedUrl = url; return {} }
  const result = shareEngine.openFacebook('https://example.test/play?ref=abc')
  assert.equal(result, true)
  assert.ok(openedUrl.startsWith('https://www.facebook.com/sharer/sharer.php'))
})

test('ShareEngine: copyToClipboard returns true with navigator.clipboard', async () => {
  setupBrowser({ clipboard: true })
  const ok = await shareEngine.copyToClipboard('test')
  assert.equal(ok, true)
})

test('ShareEngine: nativeShare returns true when navigator.share present', async () => {
  setupBrowser({ share: true })
  let sharedPayload = null
  globalThis.navigator.share = async (p) => { sharedPayload = p }
  const ok = await shareEngine.nativeShare({ title: 't', text: 'txt', url: 'https://x' })
  assert.equal(ok, true)
  assert.deepEqual(sharedPayload, { title: 't', text: 'txt', url: 'https://x' })
})

test('ShareEngine: nativeShare returns false without navigator.share', async () => {
  setupBrowser({ share: false })
  const ok = await shareEngine.nativeShare({ title: 't' })
  assert.equal(ok, false)
})

test('ShareEngine: getTitle returns the share title', () => {
  setupBrowser()
  assert.ok(shareEngine.getTitle().length > 0)
  assert.ok(shareEngine.getTitle().includes('Zarra'))
})

test('ShareEngine: getTemplateText returns the template with placeholders', () => {
  setupBrowser()
  const tpl = shareEngine.getTemplateText()
  assert.ok(tpl.includes('{firmas}'))
  assert.ok(tpl.includes('{url}'))
})

test('ShareEngine: encodeRef handles missing fields with defaults', () => {
  setupBrowser()
  const encoded = shareEngine.encodeRef({})
  const decoded = shareEngine.decodeRef(encoded)
  assert.deepEqual(decoded, { firmas: 0, score: 0, stageId: '' })
})

process.exit(0)
