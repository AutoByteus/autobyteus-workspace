# Origin probe (autobyteus-403, investigation 2026-11-06)

Measures which `Origin` header real clients send, against a header-logging server.

- `server.mjs` — logs `Origin`/`Host` of every HTTP request and WebSocket upgrade to `log.txt` (port 47911, loopback).
- `page.html` — opens a WebSocket, sends a JSON `fetch` POST, and opens a WebSocket from a sandboxed iframe.
- `main.cjs` — Electron: loads `page.html` from `file://` with the app's webPreferences (sandbox, contextIsolation).
- `nodeclient.mjs` — Node 22 built-in `WebSocket` (what peer nodes use, `peer-run-observation-client.ts`).
- `cors-probe.mjs` — Fastify + `@fastify/cors` `{ origin: true }` as in `build-studio-server.ts`, preflight and POST from `https://evil.example`.

Commands (run from this folder, files copied to an empty temp folder first):

```bash
node server.mjs &
node nodeclient.mjs
env -u ELECTRON_RUN_AS_NODE <repo>/autobyteus-web/node_modules/.bin/electron main.cjs
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=<tmp> --virtual-time-budget=3000 --dump-dom file://<path>/page.html
node cors-probe.mjs <repo>/autobyteus-server-ts
```

Results are recorded in `../../investigation-notes.md` (Runtime, Probe, Or Reproduction Findings).
