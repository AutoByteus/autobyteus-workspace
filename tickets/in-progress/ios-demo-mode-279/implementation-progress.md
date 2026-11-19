# Implementation progress — ios-demo-mode-279 (autobyteus-279)

A running record of the build, kept in the ticket so the work stays traceable between rounds. The authority is the design spec (SR-002, with N-1…N-3 applied) and the requirements; this file only says where the build stands.

## Done

- **R-002 premise check: Pass** on the iPhone 17 Pro Max and iPad Air 11-inch (M3) simulators, iOS 26.1 (`evidence/implementation/r002/summary.md`, commit `12e85dcc05`).
  - **Constraint found:** the demo's `WebSocket` must be the class that defines `send`/`close` itself, because noVNC checks a socket's immediate prototype only.
  - **Note for the iPad layout:** on iPad the web view reports a desktop user agent, so the layout must follow the viewport width, never the user agent.

## Step 1: the web demo node (in progress)

| Part | State | Files |
| --- | --- | --- |
| Demo fact in every build | written | `utils/remoteAccess/demoSession.ts` (`DEMO_ENTRY_ID`) |
| Demo plugin registered only for `AUTOBYTEUS_DEMO_BUILD=1` | written | `nuxt.config.ts`, `demo/plugins/00.demoBoot.client.ts` |
| Identity | written | `demo/demoIdentity.ts` |
| Transport (fetch and WebSocket at the page boundary) | written | `demo/demoTransport.ts` |
| Operation table (43 operations, generated types) | written | `demo/graphql/operations.ts` |
| Boot (transport → world → session) | to do | `demo/demoBoot.ts` |
| Dispatch | to do | `demo/DemoNode.ts` |
| World, GraphQL handlers, REST, streams, runtime, RFB | to do | `demo/world/*`, `demo/graphql/*`, `demo/rest/*`, `demo/streams/*`, `demo/runtime.ts` |
| `--demo` build target | to do | `scripts/build-mobile-web.mjs` |
| Local icons | to do | `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs` |
| Contract, inventory and build guard tests; the sweep probes | to do | `demo/__tests__`, `tests/e2e/mobile-demo-*.mjs` |

## Steps 2–5

Not started (design spec, Change Sequence).
