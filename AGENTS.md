# AGENTS.md — zarra-defenders-2d

> Project-level instructions for AI agents working on this codebase.
>
> The **canonical URL rule** (verification + format + Tailscale caveats) lives in
> the global `~/.config/opencode/AGENTS.md`. This file applies that rule to the
> specific URLs and dev server of **this** project. Read both.

---

## Documentación del proyecto

Toda la documentación vive en `docs/`. El entry point del repo para humanos es
[`README.md`](./README.md); este archivo es para agentes. Cuando el usuario
pregunte por diseño, pedagogía, planes, estado o script de aceptación, leer
desde aquí primero.

| Archivo | Para qué sirve | Cuándo leerlo |
|---|---|---|
| [`docs/VISION.md`](./docs/VISION.md) | Visión consolidada del 2D: identidad, tono, contrato cívico, decisiones tomadas y pendientes | Cuando el usuario pregunte "qué es este juego" o "¿por qué se hace así?" |
| [`docs/PLAN.md`](./docs/PLAN.md) | **Documento histórico** de planificación (sesión 2026-09-03). Decisiones originales, fases, inventario de assets | Solo como referencia histórica. El estado vivo está en `IMPLEMENTATION-STATUS.md` y `ROADMAP.md` |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Plan priorizado por fases (F0-F7) + polish iterations (F3.5.1bis, F3.5.1ter, F3.5.4, F6.1) | Cuando el usuario pregunte "¿qué viene después?" o "¿cuál es el siguiente paso?" |
| [`docs/IMPLEMENTATION-STATUS.md`](./docs/IMPLEMENTATION-STATUS.md) | Inventario técnico al HEAD actual: ✅ implementado, 🟡 parcial, ❌ no. Contratos A1-A9 del 3D, métricas de calidad | Cuando el usuario pregunte "¿qué está hecho?" o "¿qué falta?" |
| [`docs/MANUAL_PLAYTHROUGH.md`](./docs/MANUAL_PLAYTHROUGH.md) | Script de aceptación manual (21 secciones) + pedagogical sign-off + URLs verificadas | Cuando el usuario pida hacer QA manual, verificar URLs, o firmar la release |

**Orden de lectura recomendado** para un agente nuevo: VISION →
IMPLEMENTATION-STATUS → ROADMAP → MANUAL_PLAYTHROUGH. PLAN solo si necesitás
el rationale original de una decisión que ya cambió.

---

## When the user asks for "urls" / "dame los enlaces" / "urls tailscale"

**Default: deliver ALL URLs via Tailscale** (`http://100.116.137.66:8000/...`).
Only fall back to `127.0.0.1:8000` if Tailscale is unreachable from the
sandbox (verify with `ip -4 addr show tailscale0 | grep 100.116.137.66`).
This applies to **every URL** the agent shares with the user in this project:
- Entry points (`/`, `/catalog.html`, `/catalogoraw.html`)
- Diagnostic captures (`/tests/playwright-screenshots/...`)
- Any other resource served by the dev server
User confirmed this rule explicitly on 2026-09-29.

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
5. **Diagnostic Playwright captures** from `tests/playwright-screenshots/`
   when sharing screenshots (these are served as static files by the dev server).

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

- `docs/MANUAL_PLAYTHROUGH.md` §"URLs probadas" — running verified-URL
  inventory, updated per-session.
- `docs/IMPLEMENTATION-STATUS.md` — mentions Tailscale as the TEST_URL fallback.
- `src/i18n/es.js` — the ONLY file allowed to contain `https://` literals
  (project rule A6). Do not surface these unless explicitly asked.