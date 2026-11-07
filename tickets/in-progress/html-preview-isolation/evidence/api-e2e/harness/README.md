# api-e2e harness — html-preview-isolation (autobyteus-417), API/E2E round 1 (API-REV-001)

Ticket-owned journey harness used for API-10…API-15 on 2026-11-07, against an isolated desktop instance of the
worktree build (`codex/html-preview-isolation`, code `cdba18ba35`, HEAD `2d59c0db2c`). Evidence, not product code.
All pages are synthetic (QR-002).

Files:

- `pages.mjs`: the synthetic page. `hostilePage({label, version, nodeBase, cdnBase, markerDir})` reports into
  `window.__report.checks`: origin; inline/classic/module/other-site scripts; relative CSS, image, font, `fetch`;
  worker; storage and cookies; `parent.document`, `parent.electronAPI` and a `readLocalTextFile` call through it;
  the phone credential through `parent.localStorage`; and node attacks: a terminal WebSocket to
  `/ws/terminal/hostile-<label>?cwd=<markerDir>` that would `touch <markerDir>/hostile-<label>.marker`, a JSON
  GraphQL mutation (`createAgentDefinition` named `HOSTILE-JSON-<label>`), a simple `text/plain` POST
  (`HOSTILE-TEXT-…`), a JSON read, and a GET mutation through `<img>` (`HOSTILE-GET-…`, no Origin).
- `setup.mjs`: writes the synthetic workspace and creates the agent definition and run (public GraphQL).
- `say.mjs`: sends a message to the run over `/ws/agent/<runId>` (as the composer does) and waits for the reply.
- `agy-artifact-cli.diff`: the one-line change to a temp copy of `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`:
  `GENERATE_IMAGE:<path>` writes `<path>.next` when present (so the artifact holds the synthetic page). Set through the
  instance data root's `.env` (`ENV-instance-data-root.env`) with `AGY_FAKE_CASE=linked_skills`.
- `act.mjs` + `s-*.js`: attach to the instance window over its CDP control port with `playwright-core` and run one step.
  `s-preview-report.js files|artifacts <outDir> <caseId>` opens the preview and reads the preview frame's report.
  `s-versions.js` reads `#version` of every preview frame (API-13).
- `checks.mjs`: node state after a page ran: marker files, `HOSTILE*` agent definitions, refusal and terminal lines.
- `control.mjs`: API-12 positive control (same WS input and mutation from an allowed client).
- `toplevel.mjs`: API-14, the static URL opened top-level in headless Chrome.
- `phone.mjs`: API-15, pairs a phone browser (390×844) through Phone Access at the node's LAN address and previews the
  run's HTML artifact.
- `cdn-server.mjs`: stand-in other site on its own port; `accesslog.py`: node log excerpts.

Order used: `pnpm --silent isolated-app start --build --data-root <temp>/data-root` (data root's `server-data/.env`
pre-written), `node cdn-server.mjs <port>`, `node setup.mjs <node> <cdn> <temp> <pixel.png> <font.ttf>`, artifact via
`say.mjs … "GENERATE_IMAGE:<temp>/workspace/artifact.html"`, then `WEB_DIR=<worktree>/autobyteus-web node act.mjs
<controlPort> s-preview-report.js files|artifacts <evidence> API-10|API-11`, `checks.mjs`, `control.mjs`, the API-13
rewrites, `toplevel.mjs`, `phone.mjs`; `isolated-app stop <instanceId>`.
