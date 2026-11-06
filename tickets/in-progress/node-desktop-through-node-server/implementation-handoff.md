# Implementation Handoff — S1: Node desktop through the node's own server (autobyteus-405)

Status: **Design Impact raised (IMP-DI-001)**. The implementation of the reviewed design is complete and committed, but a real-node check showed that D-5's View only row for ClientCutText breaks noVNC and puts the agent's clipboard on the View only viewer's wire. The code is not handed to code review until the Solution Designer decides the filter change.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High) and passed (ARCH-REV-002); after implementation the package goes to code review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `.../node-desktop-through-node-server/investigation-notes.md` (+ parent AF-01…AF-17)
- Solution revision record: `.../node-desktop-through-node-server/solution-revision-record.md` (SR-001…SR-003)
- Design spec: `.../node-desktop-through-node-server/design-spec.md` (SR-003)
- Design review report: `.../node-desktop-through-node-server/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `.../node-desktop-through-node-server/architecture-review-revision-record.md`
- Evidence: `.../node-desktop-through-node-server/evidence/`

## Design Impact IMP-DI-001 — View only drops the viewer's extended-clipboard Caps, so Xvnc pushes the clipboard and noVNC desyncs

- **Design point:** D-5 table, type 6 ClientCutText: `view → drop` (every form).
- **Observed (real Xvnc, test-owned node, IMP-13, IMP-14):**
  - noVNC always advertises the ExtendedClipboard pseudo-encoding (−1063131698). Xvnc then sends an extended ServerCutText **Caps**, and noVNC answers with its own Caps as an extended ClientCutText (`RFB.messages.extendedClipboardCaps`, sent in every mode: `rfb.js` `_handleServerCutText`, the caps branch is not gated by `viewOnly`).
  - In View only the filter drops that Caps reply. Without the viewer's caps, Xvnc treats the client as accepting unsolicited data: when the agent's clipboard changes it sends an extended **Provide** carrying the zlib-compressed clipboard text (IMP-14: `actions: ["provide"], payloadBytes: 54, firstPayloadByte: 120`).
  - In Control the Caps reply is forwarded and Xvnc sends only **Notify** (no content), the client asks only when it wants the text (IMP-14).
  - noVNC 1.7.0 in `viewOnly` returns from the Provide branch without consuming the zlib payload (`rfb.js` `_handleServerCutText`, `actions === extendedClipboardActionProvide` → `if (this._viewOnly) return true;` before `rQshiftBytes(length - 4)`), so the next byte (0x78, the zlib header) is read as a message type: "Failed while connected: Unexpected server message (type 120)" and the viewer disconnects (IMP-13, browser probe through the real web app; screenshot IMP-13).
- **Consequences:** (1) a View only viewer drops whenever the agent copies text, which is the AC-020 scenario; (2) the agent's clipboard content reaches the View only viewer's device over the wire (noVNC discards it, but REQ-017 is meant to keep it off the device); (3) AC-020 cannot pass as designed.
- **Why not patched here:** the table is the reviewed View only boundary (D-5, design case 16). Changing what passes in View only is an architecture decision.
- **Proposed fix (A, recommended):** in View only, forward an extended ClientCutText only when it is a well-formed **Caps** message (negative length; flags have the Caps bit 1<<24; length = 4 + 4 × the number of format bits in flags 0–15) and drop every other ClientCutText (standard text, Request, Peek, Notify, Provide). A Caps message carries capabilities and maximum sizes, no clipboard text and no input. Xvnc then sends only Notify to a View only viewer, which noVNC ignores in `viewOnly` without desync, and no clipboard content reaches the device. This is the pre-S1 wire behavior for View only viewers. Control is unchanged. Cost: one row-level rule and its tests (filter unit, noVNC contract `extendedClipboardCaps` case now `forward` in view, real-node IMP-14 rerun).
- **Alternative (B):** in View only, also strip the ExtendedClipboard pseudo-encoding from SetEncodings (like −316). Xvnc then falls back to standard ServerCutText, which noVNC consumes and discards in `viewOnly`; simpler framing, but the agent's clipboard text is then sent in clear to the View only viewer on every copy (worse for REQ-017).
- **Not affected:** View only key/pointer/resize behavior and everything else measured (IMP-10, IMP-11).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../node-desktop-through-node-server/implementation-revision-record.md`, `IR-001`
- Related solution revision IDs: SR-001, SR-002, SR-003; architecture review ARCH-REV-002; CRR / API-REV / DR `N/A`
- Triggering finding IDs: AR-006 (settled, below)
- Commits: implementation `6407bfc15f`; evidence and these documents in the next commit. Base `origin/personal` @ `9e0681bf39`.

What exists, per the design: server `src/node-desktop/` (availability, `RfbViewerInputFilter`, `NodeDesktopStream`), `GET /rest/node-desktop`, `/ws/node-desktop` (authorize → validate query → resolve → stream); predefined `AUTOBYTEUS_VNC_SERVER_HOSTS` removed; web `nodeDesktopClient.ts`, `nodeDesktopWs`, `useVncSession` owning the WebSocket (close listener before RFB, `resizeSession` always false, `viewOnly` = mode), `NodeDesktopTile` (renamed; hidden → disconnect, visible → View only reconnect; mode switch reconnects), `VncViewer` availability states; VNC Hosts card, `hostPort`/`format` code, `vncHosts.ts`, password typings removed; localization en/zh-CN; launcher (bash, PowerShell) and compose: backend port only, no host env, `v9`; docs, GLOSSARY, `node_desktop.md`.

### Decisions settled in implementation

- **AR-006 / D-7:** 1005 → `disconnected` with Reconnect (SR-003). A code the table does not list also → `disconnected` with Reconnect (`viewerStateForClose` default). When the viewer ends the stream itself (Disconnect, mode switch, hidden window) no error state is shown: the composable drops its session before noVNC's disconnect event arrives (unit-tested).
- `viewerStateForClose` returns `{ state, messageKey }`: 4400 and 4502 share the `disconnected` state but show different text (D-7), and only `nodeDesktopClient.ts` knows the codes.
- Settings card: with the VNC entry gone the `format` field had one value, so the field, `QuickFieldFormat`, the protocol-by-format map and the host:port row template were removed, not only the two always-true checks.
- The noVNC encoder contract test imports the server's filter, so it joins the cross-package typecheck project (`tsconfig.cross-package-tests.json`, `nuxt.config.ts` exclude), as the three existing cross-package tests do.
- Launcher help/urls and the in-app Docker Guide `urls` text now name Backend and GraphQL only.
- `registerNodeDesktopWebsocket(app, resolveTarget = () => resolveNodeDesktop(process.env))` takes the target resolver as a parameter with the production default, like `registerTerminalWebsocket(app, handler = …)` and `registerNodeUpdateRoutes(app, starter = …)`; the E2E test passes a fake desktop.

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design-spec.md) — `Confirmed`.
- Selected route now: `Solution Designer` (Design Impact IMP-DI-001); after the decision: `Code Review`.
- New design impact or escalation trigger: IMP-DI-001.

## Checks Run (commit `6407bfc15f` unless noted)

| Check ID | Command Or Steps | Environment | Code It Exercises | Criteria | Result | Evidence / Look For |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/node-desktop tests/unit/api/websocket/node-desktop.test.ts --no-watch` | macOS arm64, Node 22 | filter, availability, WS route order | AC-003, 006 (unit), REQ-007 | Pass (23 + 6) | every table row both modes, −316 strip, split chunks, early bytes, authorize→validate→resolve order |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/node-desktop --no-watch` | real `ws` + fake RFB TCP | `NodeDesktopStream` | AC-010, 013, 014 | Pass (6) | ≤ 8 MiB peak with non-reading viewer, upstream closed ≤ 2 s, 4502 on refused/ended, one metadata log line |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/node-desktop --no-watch` | test-owned Fastify + Remote Access policy | REST + WS routes | AC-003, 005, BEH-011 | Pass (5) | 10 refused queries + 3 path variants and invalid/revoked/disabled phone credentials with 0 desktop connections |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | full suite | server | green suite | Pass (8005; the one failure was tracked-imports before commit, rerun on `6407bfc15f`: 2 passed) | `Tests 1 failed | 8005 passed` → tracked-imports rerun `2 passed` |
| IMP-05 | `pnpm -C autobyteus-web exec vitest run tests/integration/novnc-node-desktop-filter-contract.integration.test.ts` | happy-dom, real noVNC 1.7.0 | filter vs every `RFB.messages` encoder | D-5, case 16 | Pass (17) | encoder coverage test lists none missing |
| IMP-06 | `pnpm -C autobyteus-web exec vitest run components/workspace/tools components/settings components/layout composables utils localization tests/integration/{novnc-package-contract,novnc-node-desktop-filter-contract,app-font-size-fixed-px-audit}…` | Nuxt test env | web | AC-004, 007, 010, D-7, D-10 | Pass (234 files, 1526 tests) | incl. useVncSession (18: order, no resize, each D-7 row + 1005 + unlisted), NodeDesktopTile (7), VncViewer (3), nodeDesktopClient (4) |
| IMP-07 | `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-server-ts typecheck`; web guards (`guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`); electron `serverRuntimeEnv.spec.ts`; `scripts/__tests__/typecheckGate.spec.ts` | — | both packages | gates | Pass | `production errors: 0`, test errors at baseline (web 99, server 1182) |
| IMP-08 | `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_public_docker_launcher_update scripts.tests.test_public_docker_launcher_stop` | fake Docker | launcher bash (+ PowerShell static) | AC-022 | Pass (46, 2 skipped: no `pwsh`; host port 8001 in use) | only `B:8000`, no host env, only `BACKEND_PORT` state, `v9`, v8 node recreated once keeping 8001 |
| IMP-09 | `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config` | Docker Compose | compose | AC-022 | Pass | one port entry (8000), no `AUTOBYTEUS_VNC_SERVER_HOSTS` |
| IMP-10 | real node: `IMP-10-check-node-desktop.mjs` | test-owned container, worktree server package | route + filter + stream vs real Xvnc | AC-006, 007, 008, 009, 010, AC-003 | Pass | `IMP-10-…txt`: view pointer → `x:300 y:300` (unchanged), control → `x:53 y:59`, dimensions `1920x1080` after both SetDesktopSize, two viewers both closed 1000, upstream 0 after 132 ms, target query 4400 |
| IMP-11 | real node: `IMP-11-check-restarts.mjs` | same | restarts | AC-011 | Pass | Xvnc restart → `4502 NODE_DESKTOP_DISCONNECTED`; server restart → `1005`; upstream 0; reconnect works |
| IMP-12 | log scan of the test node | same | logging | AC-014 | Pass | 0 `access_token`/`mra_`; metadata-only lines; note below |
| IMP-13 | browser probe `tests/e2e/vnc-live-probe.mjs` via Nuxt dev bound to the test node | Chrome headless | web app end to end | AC-001 (local), AC-020 | **Fail → IMP-DI-001** | stream on `/ws/node-desktop?mode=view` connected and reconnected; Maximize kept `1920x1080`; then `Unexpected server message (type 120)` after the agent clipboard changed in View only |
| IMP-14 | real node: `IMP-14-check-clipboard-desync.mjs` | same | Xvnc clipboard messages per mode | IMP-DI-001 | Diagnosis | view: `provide`, 54 bytes, first byte 120; control: `notify` only |

Not run yet: real launcher container check (AC-022 on Docker), isolated desktop instance, fresh-start build, `pwsh`. They follow the IMP-DI-001 decision.

## Known Risks / Notes

- A stream ended by a server shutdown logs no line: the process exits before the viewer socket's close event (IMP-12: one line per stream except the IMP-11 server-restart stream). Its Xvnc connection closes with the process (upstream 0). Not a requirement gap in my reading (REQ-011 limits what logs contain); noted for the designer.
- Until S2, 5900/6080/9223 still listen inside the node; none is published.
