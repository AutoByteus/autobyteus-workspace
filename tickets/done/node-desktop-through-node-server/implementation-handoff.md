# Implementation Handoff — S1: Node desktop through the node's own server (autobyteus-405)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High), passed ARCH-REV-002 and, for SR-004, ARCH-REV-003; this package goes to independent code review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `.../node-desktop-through-node-server/investigation-notes.md` (S1-01…S1-07; parent AF-01…AF-17)
- Solution revision record: `.../node-desktop-through-node-server/solution-revision-record.md` (SR-001…SR-004)
- Design spec: `.../node-desktop-through-node-server/design-spec.md` (SR-004)
- Design review report: `.../node-desktop-through-node-server/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture review revision record: `.../node-desktop-through-node-server/architecture-review-revision-record.md`
- Supplemental: parent `probes/rfb-forwarding-probe.mjs` (the starting point for `evidence/IMP-10-check-node-desktop.mjs`, which adds resize, input and multi-viewer checks; the parent's `MODE=resize` WS→TCP bridge needs a published 5900 and no longer applies)
- Evidence: `.../node-desktop-through-node-server/evidence/`

## Current Implementation Summary

- Implementation cycle: `Initial` (IR-001) + `Design Impact` round (IR-002)
- Implementation revision record: `.../node-desktop-through-node-server/implementation-revision-record.md`; current `IR-002`
- Related revision IDs: SR-001…SR-004; ARCH-REV-002, ARCH-REV-003; CRR-001 (`Pass`, no findings, `code-review-report.md`, on IR-002); API-REV / DR `N/A`
- Triggering finding IDs: AR-006 (settled in IR-001), IMP-DI-001 (raised in IR-001, decided SR-004, implemented in IR-002), AR-007 (tests, IR-002)
- Commits on `codex/node-desktop-through-node-server` (base `origin/personal` @ `9e0681bf39`): `6407bfc15f` (implementation), `4b8e3b8900` (IR-001 documents and evidence), `ce13fa9727` (IR-002 filter fix + AR-007 tests + SR-004/ARCH-REV-003 ticket documents), then this handoff and the IR-002 evidence.

What exists:

- **Server** `src/node-desktop/`: `node-desktop-availability.ts` (`resolveNodeDesktop`: a node desktop at `127.0.0.1:5900` exactly when `AUTOBYTEUS_STARTER_SOCKET` is set), `rfb-viewer-input-filter.ts` (handshake, table-driven framing, per-mode policy, −316 strip, View only Caps-only clipboard rule), `node-desktop-stream.ts` (TCP bridge, pause at 8 MiB − 64 KiB − 16 / resume below 1 MiB, close propagation, one metadata log line). Entries `src/api/rest/node-desktop.ts` (`GET /rest/node-desktop` → `{ available }`) and `src/api/websocket/node-desktop.ts` (`/ws/node-desktop`: message listener attached synchronously; authorize → validate query → resolve → stream; early bytes 4400). Predefined `AUTOBYTEUS_VNC_SERVER_HOSTS` removed.
- **Web**: `utils/nodeDesktopClient.ts` (`fetchNodeDesktop`, `nodeDesktopStreamUrl`, `viewerStateForClose`), `NodeEndpoints.nodeDesktopWs`, `useVncSession` (creates the WebSocket, close listener before `new RFB(container, socket, { shared: true })`, `resizeSession` always false, `viewOnly` = mode, mode switch reconnects), `NodeDesktopTile.vue` (renamed from `VncHostTile.vue`; hidden window → disconnect, visible → View only reconnect, Reconnect/Connect per D-7), `VncViewer.vue` (loading / no shared desktop / cannot reach the node + Retry / tile). Removed: `vncHosts.ts` (+ spec), password keys and `'mysecretpassword'`, resize-on-connect and fullscreen-fit resize, the "AutoByteus VNC Hosts" card with the `hostPort`/`format` code, the novnc credentials typings, the generated `VncHostTile.*`/`VncViewer.*` keys. New keys in the manual `workspace.ts` catalogs (en, zh-CN).
- **Launcher / compose**: bash and PowerShell publish only `-p <B>:8000`, no `AUTOBYTEUS_VNC_SERVER_HOSTS`, no `NOVNC_PORT`/`noVncPort` allocation or state, `v9`; help/urls name Backend and GraphQL; compose, `.env.example`, `docker-start.sh` likewise. In-app Docker Guide `urls` text updated.
- **Docs**: GLOSSARY (node desktop, viewer, mode), `autobyteus-server-ts/docs/modules/node_desktop.md` (+ modules index), `autobyteus-web/docs/workspace_layout.md`, `autobyteus-web/docs/settings.md`, `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`; `docs/design-cases.md` Case 16 (the designer's).

### Decisions settled in implementation (for the reviewer)

- **AR-006 / D-7**: 1005 → `disconnected` + Reconnect (SR-003; measured on a real node: a server restart closes viewers with 1005, IMP-11/IMP-17). A code the table does not list → `disconnected` + Reconnect (the `viewerStateForClose` default). A stream the viewer ends itself (Disconnect, mode switch, hidden window) shows no error: the composable drops its session before noVNC's disconnect event, which it then ignores (unit-tested).
- `viewerStateForClose` returns `{ state, messageKey }`: 4400 and 4502 share `disconnected` but show different text, and only `nodeDesktopClient.ts` knows the codes.
- **Settings card**: with VNC Hosts gone, `format` had one value, so the field, `QuickFieldFormat`, the protocol-by-format map and the host:port row were removed, not only the always-true checks (AR-003 note).
- **Endpoints** from `useWindowNodeContextStore().getBoundEndpoints()` in `useVncSession` and `VncViewer` (review note).
- **Backpressure margin**: pause at `8 MiB − 64 KiB − 16` so frame headers keep `bufferedAmount` ≤ 8 MiB (review note); the integration test asserts the peak `bufferedAmount` (headers included) ≤ 8 MiB.
- **The noVNC encoder contract test** imports the server's pure filter, so it joins the cross-package typecheck project (`tsconfig.cross-package-tests.json`, `nuxt.config.ts` exclude), as the three existing cross-package tests do. `nuxt.config.ts` is a build input (see Fresh-start build below).
- **`registerNodeDesktopWebsocket(app, resolveTarget = () => resolveNodeDesktop(process.env))`** takes the target resolver as a parameter with the production default, the same shape as `registerTerminalWebsocket(app, handler = …)` and `registerNodeUpdateRoutes(app, starter = …)`; the route E2E passes a fake desktop through it.
- **Control paste over 1 MiB** ends the stream with 4400 (documented in `node_desktop.md`, review note).
- **IMP-DI-001 (SR-004, D-5 row 6)**: View only forwards exactly one ClientCutText form, a well-formed extended Caps message (`length < 0`, flags & 1<<24, `abs(length) = 4 + 4 × popcount(flags & 0xffff)`); every other ClientCutText is dropped there; framing (abs(length) ≤ 1 MiB) is unchanged, so a malformed Caps is dropped without losing place. Control unchanged.
- Accepted by the designer without change: a stream ended by a server shutdown logs no end line (the process exits first; its upstream closes).

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design-spec.md) — `Confirmed`. Evidence: new REST/WS contract, the View only boundary filter, long-lived binary streams, settings removal, published ports changed; no escalation trigger fired (every noVNC 1.7.0 encoder is framed, IMP-05/IMP-22; no image change; the shared policy unchanged).
- Selected route: `Code Review`.
- Lightweight self-review: `Not Applicable` (Large/High); I reread the full diff against the design's file map and removal plan.
- New design impact or escalation trigger: `None` open (IMP-DI-001 decided and implemented).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change | Production Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-001/002 (REQ-001, 004) | Desktop only through the node's server | `VncViewer` → `nodeDesktopClient.fetchNodeDesktop` → `/rest/node-desktop`; `NodeDesktopTile` → `useVncSession` → `/ws/node-desktop` → `NodeDesktopStream` → Xvnc | IMP-19: only `/ws/node-desktop?mode=view|control` sockets, renders through the real web app (local node; other-machine/cloud AC-002 not run) |
| REQ-002 / AC-003 | Node decides; no client target | `resolveNodeDesktop`; `parseNodeDesktopStreamQuery` | IMP-03, IMP-10/16 (`?mode=view&host=…&port=5900` → 4400, 0 upstream) |
| BEH-008 / AC-005 (REQ-003) | Shared WS policy before anything opens | `authorizeRemoteAccessWebSocket` first in the route | IMP-03 (invalid/revoked/disabled phone, 0 desktop connections), route unit order test |
| BEH-006 (REQ-005, 006, 017) / AC-006, 007, 020 | View only enforced by the node; Control by switch | filter table; `useVncSession.switchMode`; tile mode button | IMP-16: view pointer → mouse unchanged `x:300 y:300`, control → `x:53 y:59`; IMP-15: View only gets only `notify`; IMP-19: View only browser clipboard unchanged, Control clipboard both ways |
| BEH-005 (REQ-007) / AC-008, 009 | No viewer resizes | filter drops 251; `resizeSession = false` | IMP-16: `1920x1080` after SetDesktopSize in both modes with two viewers; IMP-19: Maximize and Control keep `1920x1080` |
| REQ-008 / AC-010, 011 | Stream only while visible; restarts handled | tile `visibilitychange`, unmount; stream close propagation; preClose | IMP-02, IMP-16 (upstream 0 after 114 ms), IMP-17 (Xvnc 4502, server 1005, reconnect), tile unit tests |
| REQ-010 / AC-013 | ≤ 8 MiB per slow viewer | `NodeDesktopStream` watermarks | IMP-02 |
| REQ-011 / AC-014 | Metadata-only logs | one `[node-desktop] stream ended …` line | IMP-02, IMP-18 (0 credentials, 0 clipboard texts) |
| BEH-011 / AC-004 | Embedded node: no shared desktop | `VncViewer` unavailable state | `VncViewer.spec.ts` |
| BEH-012 | VNC Hosts card retired | `ServerSettingsEndpointCards.vue`, settings service | specs |
| BEH-007 (REQ-020) / AC-022 | Backend port only, no host env | launcher bash/PowerShell, compose | IMP-25, IMP-09, IMP-20 (real launcher container: `0.0.0.0:58298->8000/tcp, [::]:58298->8000/tcp` only, 0 `AUTOBYTEUS_VNC*` env, state only `BACKEND_PORT`) |
| BEH-009 | Preserved | — | untouched |

- Changes stayed within the Scope Guardrail: `Yes` (images, `EXPOSE`, websockify, the 9223 forwarder, `/mobile`, the policy and other routes untouched; nothing run against `autobyteus-server-0/1/2`).

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/node-desktop/{node-desktop-availability,rfb-viewer-input-filter,node-desktop-stream}.ts`, `src/api/rest/node-desktop.ts`, `src/api/websocket/node-desktop.ts`, `src/api/{rest,websocket}/index.ts`, `src/services/server-settings-service.ts`
- Web: `autobyteus-web/utils/nodeDesktopClient.ts`, `utils/nodeEndpoints.ts`, `types/node.ts`, `types/novnc.d.ts`, `composables/useVncSession.ts`, `components/workspace/tools/{NodeDesktopTile,VncViewer}.vue`, `components/settings/ServerSettingsEndpointCards.vue`, `localization/messages/{en,zh-CN}/{workspace,workspace.generated,settings}.ts`, `nuxt.config.ts`, `tsconfig.cross-package-tests.json`, `tests/e2e/vnc-live-probe.mjs`
- Launcher/compose: `scripts/public/docker/autobyteus-docker.d/{bash,powershell}/*`, `autobyteus-server-ts/docker/{docker-compose.yml,.env.example,docker-start.sh}`
- Tests: `autobyteus-server-ts/tests/{unit/node-desktop,unit/api/websocket/node-desktop.test.ts,integration/node-desktop,e2e/node-desktop}`, web `composables/__tests__/useVncSession.spec.ts`, `components/workspace/tools/__tests__/{NodeDesktopTile,VncViewer}.spec.ts`, `utils/__tests__/nodeDesktopClient.spec.ts`, `tests/integration/novnc-node-desktop-filter-contract.integration.test.ts`, `scripts/tests/test_public_docker_launcher_shared_workspace.py`

## Important Assumptions

- One node desktop per Docker node (ASM-001); its target is fixed (`127.0.0.1:5900`).
- The image's starter is the Docker-node fact (C4); an in-place-updated node on today's image gets the route without image changes (measured: the `beta` image with this server package, IMP-16).

## Known Risks

- PowerShell is checked statically only (no `pwsh` on this Mac).
- AC-002 (a node reachable only over another address / Tailscale `wss`) and the Electron shell (minimize/hide → `visibilitychange`, AC-010 in the desktop app) are not run here; the browser probe proves web-equivalent behavior.
- Until S2, 5900/6080/9223 still listen inside the node; none is published.
- A paired phone can open a Control stream through a raw client before S3 (DEC-S1-1, approved).

## Task Design Health Assessment Implementation Check

- Change posture: Larger Requirement; root cause: Boundary Or Ownership Issue + Legacy Or Compatibility Pressure; refactor: `Refactor Needed Now` (clean cut).
- Implementation matched the assessment: `Yes`. Challenged once and routed as `Design Impact` (IMP-DI-001, D-5 row 6); decided in SR-004, implemented in IR-002.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Legacy retained: `No` (no host-list fallback, no password option, no 6080 publishing).
- Dead code in touched files removed: `Yes` (removal plan rows all done, plus the single-valued `format` field). Dead code elsewhere: none found (`follow-ups.md` unchanged).
- Shared structures tight: `Yes` (`NodeEndpoints` gains one field; state loses `NOVNC_PORT`).
- File sizes: largest touched source files `docker-runtime.sh` 422, `DockerRuntime.ps1` 413, `NodeDesktopTile.vue` 322, `ServerSettingsEndpointCards.vue` 273 non-empty lines (all below 500; the launcher files and the card shrank).

## Persisted Data Transition Check

- Decision: `Directly Usable — No Migration` (design-spec). Saved `AUTOBYTEUS_VNC_*` values have no reader and show as deletable custom settings; launcher state's `NOVNC_PORT` is ignored and dropped at the next write (launcher test: a v8 state with `NOVNC_PORT` is rewritten with only `BACKEND_PORT`, IMP-25). No migration code.

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `nuxt prepare` run in this worktree (no lockfile change). Untracked `dist/` build outputs of two SDK packages are not committed.
- Real-node checks used the local `autobyteus/autobyteus-server:beta` (`9c5aa01bb2fc`, built-in package 1.5.12-beta.3) with this commit's server package (`docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package`) mounted read-only, per TESTING.md "Docker server nodes".
- **Fresh-start build** applies (`scripts/**`, `autobyteus-server-ts/docker/**`, `autobyteus-web/nuxt.config.ts`, `tsconfig.cross-package-tests.json`, and a web test importing server source): not run here.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/evidence/`. Rerun-by-impact after IR-002: only `rfb-viewer-input-filter.ts` (and its tests, the contract test, the module doc) changed since `6407bfc15f`; checks that exercise the filter were rerun on `ce13fa9727` (IMP-15…IMP-25); the others stay valid.

| Check ID | Command Or Steps | Commit | Code It Exercises | Criteria | Result | Evidence / Look For |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-21 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/node-desktop tests/unit/api/websocket/node-desktop.test.ts tests/integration/node-desktop tests/e2e/node-desktop --no-watch` | ce13fa9727 | filter (incl. AR-007 Caps cases), availability, route order, stream, REST/WS routes | AC-003, 005, 006, 010, 013, 014, D-5 | Pass | `IMP-21-server-node-desktop-tests.log`: `Tests  52 passed (52)`. AR-007 cases also shown to fail on the previous filter (5 failed) before the fix |
| IMP-22 | `pnpm -C autobyteus-web exec vitest run tests/integration/novnc-node-desktop-filter-contract.integration.test.ts` | ce13fa9727 | filter vs every noVNC 1.7.0 `RFB.messages` encoder; noVNC's exact Caps reply (`abs(length)` 8) forwarded in view | D-5, case 16, AR-007 | Pass | `IMP-22-novnc-filter-contract.log`: `Tests  18 passed (18)` |
| IMP-23 | `pnpm -C autobyteus-server-ts typecheck` | ce13fa9727 | server src + tests | gate | Pass | `production errors: 0; test-file errors: 1182 … (baseline 1182 …)` |
| IMP-24 | `pnpm -C autobyteus-web typecheck` | ce13fa9727 | app, Electron, build scripts, cross-package tests | gate | Pass | `cross-package tests … 0 errors`; `production errors: 0; test-file errors: 99 … (baseline 99 …)` |
| IMP-25 | `python3 -m unittest scripts.tests.test_public_docker_launcher_{shared_workspace,update,stop} -v` | ce13fa9727 | launcher bash; PowerShell static | AC-022 | Pass | `Ran 46 tests` / `OK (skipped=2)` (no `pwsh`; host port 8001 held by the user's node) |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | 6407bfc15f sources | full server suite | green suite | Pass | `IMP-04-server-unit-suite-excerpt.log`: `1 failed | 8005 passed`, the failure tracked-imports (files not yet committed); rerun on `6407bfc15f`: `2 passed`. Still valid: only the filter changed since |
| IMP-06 | `pnpm -C autobyteus-web exec vitest run components/workspace/tools components/settings components/layout composables utils localization tests/integration/{novnc-package-contract,novnc-node-desktop-filter-contract,app-font-size-fixed-px-audit}.integration.test.ts` | 6407bfc15f sources | web | AC-004, 007, 010, D-7 (incl. 1005 + unlisted), D-10 | Pass | `IMP-06-web-affected-specs.log`: `Test Files  234 passed`, `Tests  1526 passed`. The contract file in it was rerun as IMP-22; the rest exercises no filter code |
| IMP-07 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`; Electron `serverRuntimeEnv.spec.ts` (13); `scripts/__tests__/typecheckGate.spec.ts` (29) | 6407bfc15f sources | web gates | gates | Pass | `Passed.` ×3; specs passed (output not kept; unaffected by IR-002) |
| IMP-09 | `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config` | 6407bfc15f | compose | AC-022 | Pass | one port (8000), no `AUTOBYTEUS_VNC_SERVER_HOSTS` (output not kept; compose unchanged since) |
| IMP-15 | real node: `IMP-14-check-clipboard-desync.mjs` | ce13fa9727 | Xvnc clipboard messages per mode, through the fixed filter | AR-007, AC-020, REQ-017 | Pass | `IMP-15-…txt`: view `caps…`, then `notify` only (no `provide`); control `notify` |
| IMP-16 | real node: `IMP-10-check-node-desktop.mjs` | ce13fa9727 | route + filter + stream vs real Xvnc | AC-003, 006, 007, 008, 009, 010 | Pass | view mouse `x:300 y:300`, control `x:53 y:59`, `1920x1080` after both SetDesktopSize, two viewers each closed 1000, upstream 0 after 114 ms, target query 4400 / 0 upstream |
| IMP-17 | real node: `IMP-11-check-restarts.mjs` | ce13fa9727 | restarts | AC-011 | Pass | Xvnc restart `4502 NODE_DESKTOP_DISCONNECTED`; server restart `1005`; upstream 0; reconnect `RFB 003.008` both times |
| IMP-18 | real node log scan | ce13fa9727 | logging | AC-014, REQ-011 | Pass | metadata-only lines; `credential hits: 0`; `clipboard text hits: 0` |
| IMP-19 | browser probe `tests/e2e/vnc-live-probe.mjs` via Nuxt dev bound to the test node | ce13fa9727 | web app end to end against the real node | AC-001 (local), AC-007, AC-008, AC-020 | Pass | `"result": "Pass"`, 3 scenarios; `nodeDesktopSockets` only `/ws/node-desktop?mode=view|control`; `maximizedRemote`/`controlRemote` `1920x1080`; `browserClipboardInViewOnly` unchanged; screenshot `IMP-19-browser-probe-connected-control.png` |
| IMP-20 | real launcher container (worktree launcher, temp state, test node) | ce13fa9727 | launcher bash end to end | AC-022 | Pass | `0.0.0.0:58298->8000/tcp, [::]:58298->8000/tcp` only; `AUTOBYTEUS_VNC*` env 0; state only `BACKEND_PORT`; destroyed, volumes removed |
| IMP-10…IMP-14 | first-round real-node runs | 6407bfc15f | — | — | superseded by IMP-15…IMP-19 | IMP-13/IMP-14 are the IMP-DI-001 diagnosis |

- Not run, and why: isolated desktop instance (Electron shell: minimize/hide ends the stream, Maximize in the desktop app) — left to API/E2E; AC-002 (node reachable only through another address, Tailscale `wss`) — left to API/E2E; fresh-start build and build-only release run — delivery/API-E2E per TESTING.md; `pwsh` launcher run — no `pwsh` here; full server `test:unit` and full web `test:nuxt` not repeated after IR-002 (only the filter changed; its tests and the contract rerun).

## Frontend Rendered-Result Check

- Affected surfaces: workspace right panel **VNC Viewer** tab (`VncViewer`, `NodeDesktopTile`), Settings → Server Settings endpoint cards (VNC Hosts card removed), Settings → Docker Guide `urls` text.
- References: requirements "UI, Interaction, And Experience Requirements" (states, "View only"/"Control", Maximize scales); design D-7, D-10.
- Surfaces reviewed: the existing tile's layout, colors and controls were kept (status dot, title, status line, Connect/Disconnect, Maximize, mode button).
- Rendered surface used: Nuxt dev server bound to the test-owned node (`BACKEND_NODE_BASE_URL`), driven by the headless-Chrome probe (IMP-19), screenshots inspected.
- States inspected: connecting → "Connected · View only" → Disconnect/Connect → Maximize (teleported full-window tile, picture scaled, agent desktop unchanged) → Escape → "Connected · Control" (screenshot IMP-19); "The node's desktop disconnected" + Reconnect (first-round screenshot IMP-13). Loading, no-shared-desktop, cannot-reach + Retry, not-allowed states are covered by component specs only.
- Issues found and corrected: the View only clipboard desync (IMP-DI-001), fixed in IR-002; no layout defects seen.
- Limitations: the Settings card removal and Docker Guide text were not inspected in a browser (component specs only); the Electron desktop app was not run.

## Downstream Coverage Hints / Suggested Scenarios

- Isolated desktop instance against a Docker test node: VNC Viewer renders; minimizing/hiding the window ends the stream (server log `reason=viewer-closed` within 2 s) and restoring reconnects in View only; Control switch types into the node; Maximize keeps `1920x1080`.
- AC-002: a test node reachable only by its backend URL from another address (or behind Tailscale Serve `wss`).
- A raw client in View only sending a Caps with extra action bits plus Provide/Request: only the Caps reaches Xvnc (filter unit covers framing; a real-Xvnc check would confirm Xvnc's caps-first parsing).
- `pwsh` run of the PowerShell launcher.

## API / E2E / Executable Coverage Still Required

- Independent validation of AC-001…AC-011, 013, 014, 020, 022 per TESTING.md (test-owned nodes only; single-node launcher commands; never `upgrade --all`/`new-container`/`reset` on the user's machine, which reach the user's nodes by label), fresh-start build, and the gaps listed above.
