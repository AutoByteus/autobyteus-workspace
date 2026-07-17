# API/E2E Browser Observations

## Current run

- Source revision: `46b9b8e13a477ebaaa006a8a814679416b7b4707`
- Validation round: API/E2E round 4
- Date: 2026-07-17
- Browser bridge: AutoByteus browser tools; engine version is not exposed by the bridge.
- Desktop URL: `http://127.0.0.1:3317/` (redirected to `/agents`)
- Mobile URL: `http://127.0.0.1:3317/mobile`
- Backend proxy: `BACKEND_NODE_BASE_URL=http://127.0.0.1:3318`
- Desktop viewport observed through browser bridge: 1090x738.

## Desktop renderer bootstrap

The current-source Nuxt development renderer loaded `/agents` and exposed the desktop shell:

- the page redirected to `/agents`;
- the body reported `47 agents` and normal agent catalog controls;
- no sampled role-dialog or fixed full-screen overlay was present (`0` observed);
- no visible error-class text was present in the sampled DOM state;
- the normal desktop catalog page does not mount the responsive strip Nodes item, so `Nodes` was not independently observed in this route snapshot.

Supporting screenshot: `/Users/normy/.autobyteus/browser-artifacts/e1d2ce-1784295685322.png`.

This current run's Nuxt log completed client/server/Nitro builds without the prior `#app-manifest` pre-transform warnings. This confirms a clean renderer bootstrap only; it is not Event Monitor/Files signoff.

## Phone-first shell bootstrap

The current-source Nuxt renderer loaded `/mobile` and displayed:

- `AUTOBYTEUS REMOTE ACCESS`;
- `Connect this phone` and QR/pairing instructions;
- `Paste pairing link`;
- `THIS DEVICE NAME`;
- `Pair this phone`;
- `Troubleshoot connection`;
- no sampled role-dialog or fixed full-screen overlay (`0` observed).

Supporting screenshot: `/Users/normy/.autobyteus/browser-artifacts/0d51b3-1784295685277.png`.

No paired identity or mobile Files task was available. This proves only that the pairing shell is reachable, not phone-first request consumption, inline preview, stale/context rejection, or Attach suppression.

## New compact-inline and strip-mode coverage

The current-source 3-file/23-test focused suite directly exercised compact inline Event Monitor anchors and strip-mode Nodes SVG behavior through the project component/composable tests. The combined 6-file/67-test suite and 16-file/119-test changed-chain suite also passed. These tests cover authored labels, bare/inline/fenced source preservation, native-anchor action semantics, Enter/Space emission, localized accessibility/title behavior, and gated Nodes icon visibility/route behavior.

A live browser DOM with an authenticated Event Monitor message and a responsive strip was not reachable in this environment. The `/agents` catalog route is desktop-expanded and did not mount the strip item in the sampled DOM. Therefore the new browser-equivalent behavior has direct durable component evidence but not live Event Monitor/strip visual signoff.

## Live API negative boundary

The isolated current-source server returned HTTP 200 for the task-owned relative fixture and HTTP 400 containment refusal for `/etc/passwd`, `../etc/passwd`, and a placeholder `/Users/normy/.../report.md` request. This proves the existing server boundary negative, not the client-side no-action rendering decision.

## Not reached

The browser run did not have a deterministic authenticated Event Monitor conversation or seeded agent run. It did not directly exercise:

- Event Monitor-only link/prose/inline/fenced actions, including click/Enter/Space;
- passive arrival, invalid/truncated path source preservation, compact inline action styling, or unsupported-file no-action DOM behavior in a mounted Event Monitor message;
- supported text/media/PDF/spreadsheet viewers, missing/directory/unreadable states;
- repeat-open/dedupe, collapsed panel, Files selection, focus handoff, or overlay absence after a real action;
- authenticated active-workspace mapping/refusal through the client journey;
- phone-first matching/stale/context handling or Attach suppression;
- packaged Electron preload/IPC/media protocol or Windows parsing;
- independent live responsive strip visual inspection with desktop settings capability gating.

No model/tool activity was started solely to manufacture the missing Event Monitor fixture. Repository tests, live REST probes, and renderer bootstrap were used as safe alternatives; authenticated, paired, packaged, Windows, and full visual runtime gaps remain blockers for clean API/E2E signoff.
