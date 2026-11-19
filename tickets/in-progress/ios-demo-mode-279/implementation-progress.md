# Implementation progress — ios-demo-mode-279 (autobyteus-279)

A running record of the build, kept in the ticket so the work stays traceable between rounds. The authority is the design spec (SR-002, with N-1…N-3 applied) and the requirements; this file only says where the build stands.

## Done

- **R-002 premise check: Pass** on the iPhone 17 Pro Max and iPad Air 11-inch (M3) simulators, iOS 26.1 (`evidence/implementation/r002/summary.md`, commit `12e85dcc05`).
  - **Constraint found:** the demo's `WebSocket` must be the class that defines `send`/`close` itself, because noVNC checks a socket's immediate prototype only.
  - **Note for the iPad layout:** on iPad the web view reports a desktop user agent, so the layout must follow the viewport width, never the user agent.

## Step 1: the web demo node (in progress)

Working on the dev server (`AUTOBYTEUS_MOBILE_WEB_BUILD=true AUTOBYTEUS_DEMO_BUILD=1 NUXT_APP_BASE_URL=/ nuxt dev`):

- the run list renders from the world, with statuses over `/ws/run-status`;
- the showcase conversation renders (VIS-007);
- a send plays the scripted turn (tool call, the streamed answer, the closing line, Idle) with no console error.

| Part | State | Files |
| --- | --- | --- |
| Demo fact in every build | done | `utils/remoteAccess/demoSession.ts` (`DEMO_ENTRY_ID`) |
| Demo plugin registered only for `AUTOBYTEUS_DEMO_BUILD=1` | done | `nuxt.config.ts`, `demo/plugins/00.demoBoot.client.ts` |
| Boot (transport, then world, then session) and the transport | done | `demo/demoBoot.ts`, `demo/demoTransport.ts`, `demo/demoIdentity.ts` |
| Dispatch (loud on anything unknown) | done | `demo/DemoNode.ts` |
| World: runs as trees, definitions, conversations, Activity, background tasks, run trees | done | `demo/world/*` (content ported from the design reference) |
| GraphQL | in progress | done: histories, definitions, workspaces, run tree, projections, file changes, resume configs, Tasks. To do: the remaining inventory operations (files, search, models and runtimes, Settings saves, New run, terminate, background task view, Org inspection and checkpoint, participant messages) |
| REST | in progress | done: health, status, node desktop. To do: file content, file-change content, message references, media |
| Streams | in progress | done: `/ws/agent` (the agent's snapshot and frames), `/ws/agent-collaboration`, `/ws/run-status`, the package-definitions and projects feeds. To do: `/ws/agent-team`, `/ws/agent-org`, `/ws/file-explorer`, the node-desktop RFB |
| Runtime | in progress | done: send (a scripted turn) and Stop for agent runs. To do: Team and Org members, New run, attachments, Settings Save |
| `--demo` build target | done | `scripts/build-mobile-web.mjs`; the build is 12 MB (R-004) |
| Local icons | to do | `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs` |
| Contract, inventory and build guard tests; the sweep probes | to do | `demo/__tests__`, `tests/e2e/mobile-demo-*.mjs` |

## Steps 2–5

Not started (design spec, Change Sequence).
