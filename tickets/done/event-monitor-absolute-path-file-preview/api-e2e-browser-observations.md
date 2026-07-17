# API/E2E Browser Observations

## Current run

- Source revision: `b59c7668637efdb9e910c3c8c0ff91466198e8f8`
- Validation round: API/E2E round 5
- Date: 2026-07-17
- Browser bridge: AutoByteus browser tools; engine version is not exposed by the bridge.
- Desktop URL: `http://127.0.0.1:3317/` (redirected to `/agents`)
- Mobile URL: `http://127.0.0.1:3317/mobile`
- Backend proxy: `BACKEND_NODE_BASE_URL=http://127.0.0.1:3318`
- Browser viewport observed: 487x738 for both tabs.

## Desktop renderer and responsive strip bootstrap

The current-source Nuxt development renderer loaded `/agents` and exposed the desktop shell:

- the page redirected to `/agents`;
- the desktop catalog and navigation rendered without a modal overlay (`0` sampled role-dialog/fixed full-screen overlays);
- the responsive strip was mounted at this narrow browser viewport;
- the strip contained a `Nodes` button with `aria-label="Nodes"`, `title="Nodes"`, and a visible inline SVG with `data-testid="nodes-network-icon"`;
- the SVG included the expected node rectangles and connector paths;
- no visible product error text was observed in the sampled DOM.

Supporting screenshot: `/Users/normy/.autobyteus/browser-artifacts/1fa09a-1784299157422.png`.

The Nuxt dev log also emitted repeated generated `#app-manifest` pre-transform resolution errors while warming client/server routes. The browser nevertheless rendered the inspected routes; this is retained as an environment/runtime-fidelity observation and is not hidden or treated as Event Monitor signoff.

## Phone-first shell bootstrap

The current-source Nuxt renderer loaded `/mobile` and displayed:

- `AUTOBYTEUS REMOTE ACCESS`;
- `Connect this phone` and QR/pairing instructions;
- `Paste pairing link`;
- `THIS DEVICE NAME`;
- `Pair this phone`;
- `Troubleshoot connection`;
- no sampled role-dialog or fixed full-screen overlay (`0`).

Supporting screenshot: `/Users/normy/.autobyteus/browser-artifacts/94cb05-1784299157509.png`.

No paired identity or mobile Files task was available. This proves only pairing-shell reachability, not phone-first request consumption, inline preview, stale/context rejection, or Attach suppression.

## Label-only, compact-inline, and source/strip coverage

The current-source 2-file/15-test label suite directly asserted that generated links visibly contain only `action.displayLabel`, while localized `Open <file> in Files` remains in `aria-label` and the normalized full path remains in `title`. The combined 6-file/67-test and changed-chain 16-file/119-test suites also passed. These repository tests cover authored labels, bare/inline/fenced source preservation, native-anchor action semantics, Enter/Space emission, and no legacy button.

A live browser DOM with an authenticated Event Monitor message was not reachable. The narrow `/agents` route did provide direct live DOM evidence for the current strip-mode Nodes SVG, label/title, and no-overlay behavior. It did not prove the Event Monitor label-only action in a mounted conversation or the full responsive/Files visual matrix.

## Live API negative boundary

The isolated current-source server returned HTTP 200 for the task-owned relative fixture and HTTP 400 containment refusal for `/etc/passwd`, `../etc/passwd`, and placeholder `/Users/normy/.../report.md`. This proves the existing server boundary negative, not the client-side no-action rendering decision.

## Not reached

The browser run did not have a deterministic authenticated Event Monitor conversation or seeded agent run. It did not directly exercise:

- Event Monitor-only link/prose/inline/fenced actions, including click/Enter/Space;
- generated label-only action text in a mounted Event Monitor message;
- passive arrival, invalid/truncated path source preservation, or unsupported-file no-action DOM behavior in a mounted Event Monitor message;
- supported text/media/PDF/spreadsheet viewers, missing/directory/unreadable states;
- repeat-open/dedupe, collapsed panel, Files selection, focus handoff, or overlay absence after a real action;
- authenticated active-workspace mapping/refusal through the client journey;
- phone-first matching/stale/context handling or Attach suppression;
- packaged Electron preload/IPC/media protocol or Windows parsing;
- full visual inspection of Event Monitor/Files and viewer matrix.

No model/tool activity was started solely to manufacture the missing Event Monitor fixture. Repository tests, live REST probes, and renderer bootstrap were used as safe alternatives; authenticated, paired, packaged, Windows, and full Event Monitor visual runtime gaps remain blockers for clean API/E2E signoff.
