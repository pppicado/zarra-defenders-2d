# AGENTS.md — zarra-defenders-2d

> Project-level instructions for AI agents working on this codebase.
>
> The **canonical URL rule** (verification + format + Tailscale caveats) lives in
> the global `~/.config/opencode/AGENTS.md`. This file applies that rule to the
> specific URLs and dev server of **this** project. Read both.

---

## When the user asks for "urls" / "dame los enlaces" / "urls tailscale"

Deliver **the URLs that are currently live and useful for THIS project**, in this
order:

1. **Tailscale dev server** (entry points, query-params variants the user can
   paste into their browser).
2. **Local loopback** (`127.0.0.1:8000`) variants — only if Tailscale is down or
   the user explicitly wants local.
3. **Asset catalogs** (`catalog.html`, `catalogoraw.html`) when assets/sprites/
   backgrounds are the topic of conversation.
4. **Test fixtures / debug pages** from `tests/*.html` only if the user is
   debugging or running e2e harnesses.

Do **not** deliver:

- The pedagogy source URLs in `src/i18n/es.js` — those live in code by design
  (project rule A6: zero `https://` literals outside `src/i18n/es.js`). Only
  surface them if the user explicitly asks about pedagogy data sources.
- The Pixi.js CDN URL — internal implementation detail.
- Any URL you have not verified in the current session.

---

## Project URLs catalog

### Dev server

| Item | Value |
|---|---|
| Script | `./start_server.sh [port]` (defaults to **8000**) |
| Bind | `0.0.0.0:8000` (reachable from Tailscale + loopback) |
| PID file | `/tmp/zarra2d-server.pid` |
| Log | `/tmp/zarra2d-server.log` |
| Sandbox Tailscale IP | **`100.116.137.66`** (this sandbox only — verify with `ip -4 addr show tailscale0` before sharing) |

### Entry points

| URL path | Purpose |
|---|---|
| `/` | Main game — `index.html` (Pixi.js app, 5 stages) |
| `/catalog.html` | Lightbox catalog of all `assets/sprites/` |
| `/catalogoraw.html` | Raw catalog of generated backgrounds |

### Test query params (combine freely)

| Param | Effect |
|---|---|
| `?test=1` | Enable headless test API (`__zarra.test`) |
| `?seed=42` | Deterministic RNG seed |
| `?hitboxes=1` | Render hitbox overlays |
| `?debug=1` | Verbose debug overlay |
| `?unlock=all` | Unlock all 5 stages |
| `?unlock=reset` | Reset unlock state |

Canonical "kitchen-sink" e2e URL used by `tests/e2e/*.spec.mjs` via `TEST_URL`:

```
http://127.0.0.1:8000/?test=1&seed=42&hitboxes=1&unlock=all
```

### Debug / fixture pages (under `tests/`)

Only share if user is debugging a specific subsystem: `iso-smoke.html`,
`tile-gallery.html`, `single-tile-test.html`, `f3-screenshots.html`,
`diag-real.html`, `with-module.html`, `zarra-demo.html`. Each is served at
`http://<host>:8000/tests/<file>.html` once the dev server is up.

---

## Verification protocol (BEFORE delivering any URL)

Run, in this order, every time:

1. **Server alive** — `ss -tlnp | grep ':8000 '` or
   `kill -0 "$(cat /tmp/zarra2d-server.pid)" 2>/dev/null`. If missing, restart:
   `./start_server.sh 8000` and tail `/tmp/zarra2d-server.log` for "Server PID".

2. **Tailscale interface up** — `ip -4 addr show tailscale0 | grep 100.116.137.66`.
   If absent, warn the user that Tailscale is down and offer `127.0.0.1` instead.

3. **Loopback HTTP check** — for each unique URL+query-param combo:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8000/<path>"
   ```

   Must return `200`. Non-200 → fix the path, do not deliver.

4. **Tailscale HTTP check** — same `curl` against
   `http://100.116.137.66:8000/<path>`. From the sandbox this exercises
   loopback-via-tailscale0; the kernel routes it locally. A `200` here only
   proves the server answers on that IP — it does NOT prove another Tailscale
   peer can reach it.

5. **JS app headless test** — for game URLs (`/`, `/catalog.html`,
   `/catalogoraw.html`), additionally open with Playwright/Chromium and assert
   `console.error` count = 0 + a DOM-mounted marker (e.g. Pixi canvas in DOM
   for `/`, catalog grid rendered for `/catalog.html`). Pixi/Three/React apps
   pass the `curl` 200 but can still mount broken.

6. **What you may say about Tailscale reachability** (exact wording):

   - ✅ "The server binds `0.0.0.0:8000`"
   - ✅ "The sandbox's `tailscale0` interface has IP `100.116.137.66`"
   - ✅ "The server answers HTTP 200 on `100.116.137.66:8000` from inside the sandbox"
   - ❌ "Tailscale peers can reach this URL" — **NOT verifiable from the
     sandbox**. Ask the user to run `curl http://100.116.137.66:8000/` from
     their machine, or recommend SSH port-forward as more reliable than DERP.

---

## Output format (mandatory)

When listing URLs to the user:

- **One URL per line**.
- **Blank line between groups** (e.g. between local vs Tailscale, or between
  entry points vs query-param variants). Visual breathing room.
- **No commentary inside the URL block** — explanation goes before or after, never
  between URLs.
- Each URL must be one of the forms you just verified in the current session.

Example:

```
http://127.0.0.1:8000/

http://127.0.0.1:8000/?test=1&seed=42

http://100.116.137.66:8000/

http://100.116.137.66:8000/?test=1&seed=42&hitboxes=1&unlock=all
```

NEVER deliver URLs inside Markdown tables, code blocks mixing prose, or inline
within sentences.

---

## Quick commands

```bash
# Start dev server (idempotent, kills previous instance on 8000)
./start_server.sh 8000

# Verify server up
ss -tlnp | grep ':8000 ' && curl -sI http://127.0.0.1:8000/ | head -1

# Verify Tailscale IP present
ip -4 addr show tailscale0 | grep 100.116.137.66

# Run the e2e suite against the live server
TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/<spec>.spec.mjs
```

---

## Pointers to existing URL documentation in this repo

- `MANUAL_PLAYTHROUGH.md` §"URLs probadas" — running verified-URL inventory,
  updated per-session.
- `docs/IMPLEMENTATION-STATUS.md` — mentions Tailscale as the TEST_URL fallback.
- `src/i18n/es.js` — the ONLY file allowed to contain `https://` literals
  (project rule A6). Do not surface these unless explicitly asked.