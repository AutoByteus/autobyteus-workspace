# Preview isolation probe (autobyteus-417, investigation 2026-11-07)

Measures what a page shown by the HTML preview can reach, in real Electron with the app window's
webPreferences (`preload`, `contextIsolation: true`, `sandbox: true`, page loaded from `file://` as
in the packaged app), with the current sandbox (`allow-scripts allow-same-origin`) and with
`allow-scripts` only.

- `server.mjs`: stand-in for the node. Serves `workspace/` at `/rest/workspaces/ws-1/static/*` and logs
  the `Origin` of every HTTP request and WebSocket upgrade (loopback, port 47921).
- `app.html`: the app window. Builds the two preview kinds as `HtmlPreviewer.vue` does: a `blob:` URL
  made by the window (with the same `<base href="${window.location.origin}/">`) and the node's
  workspace static URL; each with both sandboxes.
- `preload.cjs`: exposes `electronAPI.ping()` through `contextBridge`, as the app's preload exposes
  `electronAPI`. `main.cjs` logs the IPC call with its sender frame.
- `workspace/report.html`: the previewed page. Reports its origin, inline/classic/module scripts,
  relative CSS, `fetch` of a relative JSON file, `localStorage`, `parent.document`,
  `parent.electronAPI` (and calls it), a POST to the node and a WebSocket to `/ws/terminal/x`.

Command (from this folder; Electron from the main checkout's `autobyteus-web`, 42.4.1):

```bash
node server.mjs 47921 "$PWD/server-log.txt" &
env -u ELECTRON_RUN_AS_NODE <repo>/autobyteus-web/node_modules/.bin/electron main.cjs | grep PROBE
kill %1
```

Output: `electron-output.txt` (what each frame reported) and `server-log.txt` (Origins the node saw).
The stand-in server sends no CORS headers and accepts every request; the real node's gate refuses
`Origin: null` (`remote-access-request-origin.ts`), so a request sent with `null` here is refused there.
Results are summarised in `../../investigation-notes.md` (Runtime, Probe, Or Reproduction Findings).

CSP check (the header the design adds to the static route):

```bash
PROBE_CSP_SANDBOX=1 node server.mjs 47921 "$PWD/server-log-csp.txt" &
env -u ELECTRON_RUN_AS_NODE <repo>/autobyteus-web/node_modules/.bin/electron main-csp.cjs | grep PROBE
kill %1
```

`main-csp.cjs` loads `app-csp.html` (iframes with `allow-scripts`, with `allow-scripts allow-same-origin`,
and without a sandbox attribute) and opens the static URL top-level. Output: `electron-output-csp.txt`,
`server-log-csp.txt`.
