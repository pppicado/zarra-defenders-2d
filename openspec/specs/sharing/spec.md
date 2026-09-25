# Spec — Sharing

This spec defines the social sharing behavior for Zarra Defenders 2D's
victory flow. Phase 5 implementation: 2026-09-24, archived as
`openspec/changes/archive/2026-09-25-fase-5-a11y-share/`.

## Purpose

Let players share their stage-clear achievement via social media, with a
back-link payload that encodes their score for casual referral tracking. No
backend, no third-party tracking — purely client-side intent URLs.

## Requirements

### Requirement: Shareable URL with Score Payload

The game SHALL build a share URL of the form
`{origin}{pathname}?ref={base64(JSON.stringify({f,s,st}))}` where:
- `f`: firmas (number)
- `s`: score (number)
- `st`: stageId (string)

#### Scenario: encodeRef round-trip

`encodeRef(scoreData)` followed by `decodeRef(encoded)` SHALL recover the
original `{firmas, score, stageId}` values.

#### Scenario: decodeRef returns null on malformed input

`decodeRef('')` SHALL return null. `decodeRef('not-base64-!@#$')` SHALL return
null. `decodeRef(null)` SHALL return null.

#### Scenario: parseRefFromUrl extracts payload

`parseRefFromUrl('?ref={encoded}')` SHALL return the decoded payload.
`parseRefFromUrl('')` and `parseRefFromUrl('?other=x')` SHALL return null.

### Requirement: Share Text Template

The game SHALL pre-format the share text using a template stored in
`STRINGS.share.template` with placeholders `{firmas}` and `{url}`.

#### Scenario: buildShareText inserts firmas and url

`buildShareText({firmas: 42}, 'https://example.test/play')` SHALL return the
template with `{firmas}` replaced by "42" and `{url}` replaced by the URL.

#### Scenario: Missing firmas defaults to 0

`buildShareText({}, 'https://x')` SHALL substitute "0" for the firmas
placeholder.

### Requirement: 4 Share Targets

The victory overlay SHALL expose 4 share buttons:
1. Twitter (𝕏 Twitter)
2. Facebook
3. Copiar al portapapeles
4. Compartir (nativo, visible solo si `navigator.share` existe)

#### Scenario: Twitter opens intent URL

Clicking the Twitter button SHALL call `window.open('https://twitter.com/intent/tweet?text=...&url=...', '_blank', 'noopener,noreferrer')`.

The intent URL template SHALL come from `STRINGS.share.twitterIntent` (not
hardcoded in source).

#### Scenario: Facebook opens sharer URL

Clicking the Facebook button SHALL call
`window.open('https://www.facebook.com/sharer/sharer.php?u=...', '_blank', 'noopener,noreferrer')`.

The intent URL template SHALL come from `STRINGS.share.facebookIntent`.

#### Scenario: Copy uses navigator.clipboard with fallback

Clicking the Copy button SHALL call
`navigator.clipboard.writeText(shareText)` and resolve to true on success.

If `navigator.clipboard` is unavailable, fall back to `document.execCommand('copy')`
via a hidden textarea.

#### Scenario: Native share when available

If `navigator.share` is available, the "Compartir" button SHALL be visible.
Clicking it SHALL call `navigator.share({title, text, url})`.

If `navigator.share` is not available, the button SHALL be hidden.

### Requirement: No Backend, No Tracking

All share logic SHALL be client-side. The game SHALL NOT send player data
to any third-party server beyond what the user explicitly chooses to share
(via clicking a share button that opens an intent URL).

#### Scenario: Build URL without server request

`buildShareUrl(scoreData)` SHALL NOT make any network request. It returns a
URL string purely from in-memory data + `window.location`.

## Out of Scope

- Server-side ref tracking (only client-side URL encoding)
- Share to additional platforms (LinkedIn, WhatsApp, etc.)
- Shortening the URL (no URL shortener integration)
