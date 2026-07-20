# API/E2E Browser Observations

## Run Meta

- Ticket: `event-monitor-file-uri-internal-preview`
- Source revision: `c489f92da4d3d3d97fb3542912a9c9b0adb42aed`
- Execution round: 1
- Date: 2026-07-20
- Browser mode: project Nuxt development renderer, Chromium-based browser tool
- Frontend: `http://127.0.0.1:3327/`
- Backend: `http://127.0.0.1:3328/`
- Authentication / Event Monitor fixture: unavailable; no authenticated agent conversation was mounted

## Setup And Readiness

Started from the assigned worktree after a clean offline dependency install:

```text
pnpm install --offline --frozen-lockfile --ignore-scripts
BACKEND_NODE_BASE_URL=http://127.0.0.1:3328 pnpm --dir autobyteus-web exec nuxt dev --host 127.0.0.1 --port 3327
node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-event-monitor-file-uri-api-e2e-r1 --host 127.0.0.1 --port 3328
```

Nuxt reached its ready signal at `http://127.0.0.1:3327/`. The server reached `Server listening on 127.0.0.1:3328`; `/rest/health` returned HTTP 200. The server log also records an inherited public URL override to `http://127.0.0.1:29695`; requests used the confirmed internal port 3328.

## Desktop Web-Equivalent Bootstrap

Opening `/` redirected to `/agents` and rendered the normal agent landing surface. DOM checks observed:

- `document.readyState`: `complete`
- visible agent content, Reload/Create Agent, featured agents, and individual agent sections
- the existing shell `Nodes` button with title/accessible label `Nodes`
- 9 SVG elements
- no `[role="alert"]` elements
- no raw `file:` strings in the mounted document HTML
- zero `data-event-monitor-invalid-file-link` markers and zero file-action markers, because no authenticated Event Monitor conversation was mounted

Screenshot evidence:

- `/Users/normy/.autobyteus/browser-artifacts/9ffc03-1784552313995.png`

The screenshot was visually inspected. The shell and agent landing page were laid out coherently; this is only bootstrap/shell evidence, not proof of the URI action renderer or Files preview.

## Mobile Web Bootstrap

Opening `/mobile` rendered the unauthenticated remote-access pairing page. DOM checks observed:

- `document.readyState`: `complete`
- `AUTOBYTEUS REMOTE ACCESS`, `Connect this phone`, pairing instructions, Paste pairing link, device name, Pair this phone, and Troubleshoot connection
- no raw `file:` strings in the mounted document HTML
- no runtime alert

Screenshot evidence:

- `/Users/normy/.autobyteus/browser-artifacts/1c0682-1784552313995.png`

The screenshot was visually inspected. The pairing surface rendered coherently. Pairing and mobile Files behavior were not exercised because no desktop-generated Phone Access identity or paired session was available.

## URI-Specific Browser Coverage Decision

The browser could not reach a valid Event Monitor message without authenticated workspace/agent state. Consequently it did not directly mount or activate:

- a valid POSIX or Windows `file:` Markdown action;
- an encoded-space or encoded-backslash URI action;
- invalid/traversal/placeholder/unsupported inert links;
- click, Enter, or Space action dispatch;
- no-navigation/no-read/raw-URI-leakage behavior on a mounted Event Monitor message;
- valid-but-remote-unmapped activation and host-only/unavailable result;
- Files panel/read-only viewer or mobile preview request.

Repository component tests directly cover the parser, render model, inert shell, action markers, raw URI exclusion from sanitized HTML, and keyboard/pointer semantics. The browser session therefore adds renderer bootstrap and visual shell evidence only and leaves the URI user journey blocked.

## Cleanup

Both browser tabs were closed. The Nuxt and server processes were stopped. The task-owned `/tmp/autobyteus-event-monitor-file-uri-api-e2e-r1` data directory was removed. No task-owned process remained.
