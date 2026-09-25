# Spec — Pixi.js Offline Bundle

This spec defines the local-first Pixi.js bundle strategy. Phase 6
implementation: 2026-09-25, archived as
`openspec/changes/archive/2026-09-25-fase-6-stages-menus/`.

## Purpose

Enable deployment of Zarra Defenders 2D to offline / Tailscale-only
environments without breaking the game when the CDN is unreachable. The
local bundle is the primary source; the CDN is a fallback for fresh deploys
that haven't populated `vendor/` yet.

## Requirements

### Requirement: Local Pixi.js Bundle

The game SHALL ship a local copy of pixi.js v7.4.0 at `vendor/pixi.min.js`.

#### Scenario: Bundle loads first

When `index.html` is loaded, the browser SHALL request `vendor/pixi.min.js`
before any CDN URL.

#### Scenario: Bundle serves as the canonical Pixi

When loaded locally, `window.PIXI.VERSION` SHALL equal `"7.4.0"`.

### Requirement: CDN Fallback

When the local bundle fails to load (HTTP 404, missing file, or script
error), the game SHALL fall back to the CDN URL
`https://cdn.jsdelivr.net/npm/pixi.js@7.4.0/dist/pixi.min.js`.

#### Scenario: Fresh deploy without vendor/ still works

If a developer clones the repo but `vendor/pixi.min.js` is missing (e.g. not
yet generated), the `onerror` handler on the script tag SHALL swap the
src to the CDN URL and the game SHALL still boot.

### Requirement: Version Pinning

The local bundle SHALL be exactly pixi.js v7.4.0 to match the CDN fallback.
A different version would risk API divergence.

#### Scenario: Same version on both sources

The local bundle's `PIXI.VERSION` SHALL equal `"7.4.0"`, matching the
CDN-pinned version `7.4.0`.

## Out of Scope

- Pinned version upgrades (future enhancement would update both local and CDN)
- SRI hashes for either source (future security enhancement)
- Per-environment bundling (single global bundle)
