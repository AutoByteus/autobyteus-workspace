# API/E2E Browser Observations

## Current run

- Source revision: `7140696c8b78c6bfbba2035aaa8868a68e1e05aa`
- Validation round: API/E2E round 2
- Date: 2026-07-17
- Browser bridge: AutoByteus browser tools; engine version is not exposed by the bridge.
- Desktop URL: `http://127.0.0.1:3317/` (redirected to `/agents`)
- Mobile URL: `http://127.0.0.1:3317/mobile`
- Backend proxy: `BACKEND_NODE_BASE_URL=http://127.0.0.1:3318`
- Viewport reported by the browser bridge: 1090x738 for the desktop tab.

## Desktop renderer bootstrap

The current-source Nuxt development renderer loaded `/agents` and exposed the normal desktop shell:

- navigation labels included Agents, Agent Teams, Skills, Memory, Nodes, Workspaces, and Settings;
- Temp Workspace was visible;
- the catalog reported 47 agents;
- the DOM contained no role-dialog or fixed full-screen overlay (`0` observed);
- the body had no visible error-class text in the sampled DOM state.

Supporting screenshot: `/Users/normy/.autobyteus/browser-artifacts/a39e65-1784287781544.png`.

The Nuxt dev log also emitted repeated Vite pre-transform errors for the generated `#app-manifest` import while warming the renderer. Despite those development-log errors, the requested `/agents` page rendered and the DOM assertions above passed. This is a renderer-environment observation, not Event Monitor/Files signoff.

## Phone-first shell bootstrap

The current-source Nuxt renderer loaded `/mobile` and displayed the pairing shell:

- `AUTOBYTEUS REMOTE ACCESS`;
- `Connect this phone`;
- QR/pairing instructions;
- `Paste pairing link`;
- `THIS DEVICE NAME`;
- `Pair this phone`;
- `Troubleshoot connection`;
- no role-dialog or fixed full-screen overlay (`0` observed).

Supporting screenshot: `/Users/normy/.autobyteus/browser-artifacts/dfb45d-1784287792064.png`.

No paired identity or mobile Files task was available. Therefore this proves only that the pairing shell is reachable, not phone-first request consumption, inline preview, stale/context rejection, or Attach suppression.

## Not reached

The browser run did not have a deterministic authenticated Event Monitor conversation or seeded agent run. It did not directly exercise:

- Event Monitor-only path actions and passive content;
- click, Enter, or Space activation;
- supported text/media/PDF/spreadsheet FileViewer journeys;
- repeat-open/dedupe, collapsed desktop panel, focus handoff, or overlay absence after an action;
- active-workspace mapping/refusal through the authenticated client journey;
- phone-first matching/stale request behavior;
- packaged Electron preload/IPC/media protocol or Windows parsing.

The run was intentionally not converted into model/tool activity solely to manufacture a fixture. Repository tests and live REST probes cover the available substitutes; the missing authenticated and paired sessions remain blockers for clean API/E2E signoff.
