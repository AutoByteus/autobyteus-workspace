# API/E2E Coverage Investigation — S1: Node desktop through the node's own server (autobyteus-405)

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `.../node-desktop-through-node-server/investigation-notes.md`
- Solution Revision Record: `.../node-desktop-through-node-server/solution-revision-record.md` (SR-001 … SR-004)
- Design Spec: `.../node-desktop-through-node-server/design-spec.md` (SR-004, Ready; Large / High)
- Supplemental Task Artifacts: parent `probes/rfb-forwarding-probe.mjs` (superseded for this route by `evidence/IMP-10-check-node-desktop.mjs`)
- Design Review Report: `.../design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001, Pass, 9.5/10, no findings)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created after this round)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code_reviewer, implementation review passed (CRR-001), 2026-11-06
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Code under test: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server`, branch `codex/node-desktop-through-node-server`, base `origin/personal` @ `9e0681bf39`, reviewed at `952bc1fcd0` (source at `ce13fa9727`; `git diff --name-only ce13fa9727 952bc1fcd0` outside `tickets/` is empty).

## Current Requirement And Design Basis

The desktop app's VNC Viewer reaches a Docker node's node desktop only through the node's own server: `GET /rest/node-desktop` → `{ available }` and `/ws/node-desktop?mode=view|control`. The route authorizes with the shared WebSocket policy first, then bridges to Xvnc on `127.0.0.1:5900` through a table-driven RFB input filter. In View only the filter drops keys, pointer and clipboard (except the extended-clipboard Caps). It never forwards SetDesktopSize. Every viewer starts View only, and a deliberate switch reconnects in Control. A stream exists only while the view is open and visible. Slow viewers are capped at 8 MiB, and the logs carry metadata only. The launchers and compose publish only the backend port and set no `AUTOBYTEUS_VNC_SERVER_HOSTS`, with config hash `v9`. The "AutoByteus VNC Hosts" settings card and the password keys are removed (REQ-001…008, 010, 011, 017, 020; AC-001…011, 013, 014, 020, 022).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-006, SCN-007, SCN-008, SCN-009. SCN-003 (cloud node behind Tailscale Serve `wss`) is partly covered, see Not Tested.
- Real-use scenarios added from investigating the implemented behavior:
  - **SCN-007a — the desktop app in Control reads the Mac's clipboard.** noVNC 1.7.0 `AsyncClipboard` reads `navigator.clipboard` on canvas focus in Control (`core/clipboard.js:39-46`, `rfb.js:323-326`) and pastes it to the node. The real trigger is a user clicking into a Control viewer. The test must not push the user's real clipboard into a test node, so the Electron Control check runs with clipboard permission answered `denied` in that one window (only noVNC's clipboard sync is affected). Clipboard behavior per mode is proven by IMP-15/IMP-19 and API-05.
  - **SCN-008a — an S0 node (v8: backend + `127.0.0.1:N:6080`, `AUTOBYTEUS_VNC_SERVER_HOSTS` set) meets the S1 launcher.** The next `workspace apply --name` / `upgrade --all` recreates it once (`v9`), keeping the backend port. This is the real starting point of every user node today; IMP-25's fake test covers bash and IMP-20 a fresh bash node.
- Unsupported / contrived scenarios recorded by the designer: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 desktop through the node's server | Changed | DS-001, DS-002 | Electron node window against a node reachable only by its LAN backend URL; CDP network capture |
| BEH-005 no resize | Changed | D-5 row 251, `resizeSession` false | Maximize in the app; raw SetDesktopSize alongside the app viewer |
| BEH-006 View only enforced by the node | Changed | filter table | Raw-client clipboard boundary vs real Xvnc; app Control/View only typing and pointer |
| BEH-007 publishing | Changed | launcher `v9` | pwsh real run (v8 → v9); compose config |
| BEH-008 shared policy | Preserved semantics, new route | route order | IMP-03/IMP-21 E2E (reused) |
| REQ-008 lifecycle (visibility, tab, restart) | Added | tile `visibilitychange`, stream close | Electron minimize / hide / tab switch, Xvnc restart in the app |
| BEH-011 embedded node | Changed | `VncViewer` unavailable state | Electron main window |
| BEH-012 VNC Hosts card | Removed | settings card | Electron Settings → Server Settings |
| Persisted: launcher state `NOVNC_PORT`/`noVncPort`; saved `AUTOBYTEUS_VNC_*` | Removed (no reader) | Directly Usable — No Migration | pwsh v8 JSON rewritten; bash IMP-25 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | filter, stream, availability | unit + integration (IMP-21) | Xvnc's own parsing of forwarded clipboard messages | Raw client vs real Xvnc |
| API / transport / contract | Yes | `/rest/node-desktop`, `/ws/node-desktop` | route E2E (IMP-21), real node (IMP-16/17) | TLS-terminating proxy (`wss`) | Raw `wss` client through a local TLS proxy |
| Frontend component / state | Yes | tile, viewer, session, settings card | web specs (IMP-06) | Real visibility events in Electron | Isolated desktop instance |
| Browser integration / user journey | Yes | noVNC over the route | browser probe (IMP-19) | — | — |
| Authentication / session / permissions | Yes (reused policy) | shared WS policy on the new route | route E2E (IMP-21) | — | — |
| Desktop renderer / web-equivalent UI | Yes | VNC Viewer tab | IMP-19 | Electron renderer specifics (permissions, visibility on minimize/hide) | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes (behavior) | window minimize/hide → `document.visibilityState` | none | Whether Electron reports `hidden` on minimize and on app hide | Isolated desktop instance |
| Process / lifecycle | Yes | stream close, Xvnc/server restart | IMP-17 (raw) | The viewer UI after a restart in the app | Isolated desktop instance |
| Persisted-data transition | Yes (small) | launcher state | IMP-25 (bash, fake) | PS JSON | pwsh real run |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Xvnc 1.13.1, Docker publishing | IMP-15–20 | — | Real node |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server`
- Project type: pnpm monorepo; Fastify server (`autobyteus-server-ts`), Nuxt/Electron app (`autobyteus-web`), bash/PowerShell launcher; Docker Desktop on macOS arm64.
- Testing guideline: root `TESTING.md` (no closer `TESTING*.md`). Applicable rules: Docker server nodes (test-owned container from the same image, fresh volumes, this worktree's server package mounted read-only over `/opt/autobyteus/server-package`, `docker rm -f -v`), isolated desktop instance, fresh-start build, one heavy run at a time, rerun by impact.
- Conflicts / discrepancies: TESTING.md says to bind test containers to `127.0.0.1`. AC-002 needs a node reachable only by another address, so one test node publishes its backend on the Mac's LAN address only (`192.168.2.158:<port>:8000`), and nothing on loopback. This is the exposure every launcher node already has (backend on all interfaces), limited to a fresh test node for the run.
- Changed build-input paths: `scripts/**`, `autobyteus-server-ts/docker/**`, `autobyteus-web/nuxt.config.ts`, `autobyteus-web/tsconfig.cross-package-tests.json`, and a web test importing server source → fresh-start case API-07. The server image's build stage reads the changed server source, so its `server-package` target is built from the same fresh clone. A gate input changed (`tsconfig.cross-package-tests.json` include, `nuxt.config.ts` exclude), so DESIGN.md rule 12 / RELEASE.md also ask for the build-only release run on the ticket branch (`pnpm release:test --ref <branch>`). That needs the branch pushed and GitHub runners, so it is not run here (Not Tested).
- Secrets: `N/A`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | guideline | above |
| `DESIGN.md` rule 12, `RELEASE.md` "Build-only release run" | release safety | `pnpm release:test --ref <ticket-branch>` on runners, before merge |
| `docs/isolated-app-instances.md` | desktop instance | `pnpm isolated-app start --app <bundle>`; CDP on the control port; `stop <id>` |
| `implementation-handoff.md` | ticket | test-owned nodes; never `upgrade --all` / `new-container` / `reset`; image `autobyteus/autobyteus-server:beta` (`9c5aa01bb2fc`) + worktree server package |
| `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh` | node run shape | the launcher's `docker run` arguments, reused for the hand-made test container |
| noVNC 1.7.0 `core/clipboard.js`, `core/util/browser.js` | clipboard | Control reads the system clipboard on focus when the permission query is not `denied` |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness Check | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Fresh clone + builds | `/private/tmp/abx405-api/fresh-clone` | `/private/tmp/abx405-api/fresh-start.sh` | heavy; first | `== ALL DONE` | `rm -rf` |
| Test node `abx405-api-node` | — | `docker run` with the launcher's arguments, image `autobyteus/autobyteus-server:beta`, fresh-clone server package read-only over `/opt/autobyteus/server-package`, `-p 192.168.2.158:<B>:8000` only, label `com.autobyteus.api-e2e-owner=abx405-api` | starter starts Xvnc `:99` | `GET /rest/node-desktop` → `{available:true}` | `docker rm -f -v`; volumes rm |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --app <fresh-clone AutoByteus.app>` | own data root and ports | start JSON | `isolated-app stop <id>` |
| pwsh launcher | container | native arm64 pwsh 7.4.6 in `dotnet/runtime-deps:8.0` with the Docker socket (as autobyteus-402) | real engine | launcher output | PS `destroy --name`; volume rm; images rm |
| TLS proxy | `/private/tmp/abx405-api/probes` | Node `https` server (self-signed cert) piping HTTP and Upgrade to the node | loopback only | handshake | kill |

| Data / Fixture / Identity | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Node desktop content | the fresh node's own desktop | no user data | container + volumes removed |
| Typed / clipboard strings | `abx405-api-*` markers | never the user's clipboard (Control window: permission denied) | removed with the node |
| v8 PS state | seeded JSON in S0's shape | temp state dir | removed |

**Not used on purpose:** `new-container`, `upgrade --all`, `reset`, `workspace apply --all` (reach the user's nodes and leftover `autobyteus-server-3…7-*` volumes); Tailscale (stopped; starting it changes the user's network).

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Setup: a v8 PowerShell state written by the S0 (v8) PowerShell launcher itself (`noVncPort` present), then the S1 launcher.
- Evidence: JSON before/after (only `backendPort` after), container env and ports after; bash covered by IMP-25.
- Migration scenarios: N/A.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Criteria | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/node-desktop/rfb-viewer-input-filter.test.ts` | filter table, both modes, Caps-only rule (AR-007) | AC-006, 007, 008, D-5 | Still Valid | IMP-21 | Reuse |
| `tests/unit/node-desktop/node-desktop-availability.test.ts` | starter env → available | AC-004, REQ-002 | Still Valid | IMP-21 | Reuse |
| `tests/unit/api/websocket/node-desktop.test.ts` | authorize-first order, early bytes 4400 | AC-005, D-5 | Still Valid | IMP-21 | Reuse |
| `tests/integration/node-desktop/node-desktop-stream.integration.test.ts` | bridge, close propagation, 8 MiB | AC-010, 013 | Still Valid | IMP-21 | Reuse |
| `tests/e2e/node-desktop/node-desktop-routes.e2e.test.ts` | REST + WS with fake desktop, policy refusals, query refusals | AC-003, 005 | Still Valid | IMP-21 | Reuse |
| `autobyteus-web/tests/integration/novnc-node-desktop-filter-contract.integration.test.ts` | every noVNC 1.7.0 encoder framed | D-5, AR-007 | Still Valid | IMP-22 | Reuse; in API-07's typecheck |
| web specs `useVncSession`, `NodeDesktopTile`, `VncViewer`, `nodeDesktopClient`, `ServerSettingsEndpointCards` | D-7 rows, D-10, visibility, states | AC-004, 007, 010 | Still Valid | IMP-06 | Reuse |
| `autobyteus-web/tests/e2e/vnc-live-probe.mjs` | browser journey | AC-001, 007, 008, 020 | Still Valid | IMP-19 | Reuse |
| `scripts/tests/test_public_docker_launcher_*.py` | backend-only, `v9`, state | AC-022 | Still Valid | IMP-25 | Reuse; PS parse test runs under pwsh in API-06 |
| `utils/__tests__/vncHosts.spec.ts` (removed) | host list parsing | — | Stale / Remove (done by implementation) | REQ-001 removes the host list | No replacement: the feature is gone |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, 005, 006, 007, 008, 009, 010, 011, 013, 014, 020, 022; gates | server, web, launcher, real node, browser | Reused | IMP-04, IMP-06, IMP-15, IMP-16, IMP-17, IMP-18, IMP-19, IMP-20, IMP-21, IMP-22, IMP-23, IMP-24, IMP-25 | IMP-15…25 ran on `ce13fa9727` = source of HEAD. IMP-04/06 ran on `6407bfc15f`; only the filter, its tests, the contract test and docs changed since, and those were rerun as IMP-21/22. Each log has a header and a quoted line |
| API-02 | AC-022 (compose) | compose | Existing Test (rerun) | `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config` | IMP-09 kept no output |
| API-03 | gates (IMP-07 part) | Electron/gate specs | Existing Test (rerun) | `serverRuntimeEnv.spec.ts`, `typecheckGate.spec.ts` | IMP-07 kept no output for these; the guards rerun inside API-07 |
| API-04 | AC-006, REQ-006, REQ-017 boundary; reviewer's optional Caps check; AC-002 reachability | raw client vs real Xvnc through the route | Temporary Probe | test node on LAN address only; probe per mode: Caps exchange (noVNC's caps, all action bits), agent copies text, then client Request; client Provide with zlib text; Caps with request+provide action bits; check Provide replies, node clipboard (`xclip -o`), stream still open; Control as positive control; loopback refused, LAN reaches `/rest/node-desktop` | Measures what reaches Xvnc; the filter unit tests cannot show Xvnc's parsing |
| API-05 | AC-001, 002, 004, 007, 008, 009, 010, 011 (UI), 022 ("works through the server"), BEH-012 | Electron shell + renderer | Journey | isolated instance of the fresh-clone app; add node `http://192.168.2.158:<B>`; node window → VNC Viewer: CDP Network capture (all requests/sockets go to the node base URL), "Connected · View only", typed keys/pointer do not arrive; Control: pointer + keys arrive; Maximize → `1920x1080`; raw SetDesktopSize alongside → unchanged; minimize → hidden → stream ends ≤ 2 s (node log `reason=viewer-closed`, upstream 0) → restore → View only reconnect; app hide (Cmd-H) → same; other tab → stream closed; Xvnc restart → "The node's desktop disconnected" + Reconnect → View only; main window: embedded node "no shared desktop"; Settings: no VNC Hosts card | The Electron shell's visibility and the real UI are the remaining gaps (TESTING.md: isolated desktop instance) |
| API-06 | AC-022 (PowerShell), REQ-020, persisted | PowerShell launcher, real pwsh + real engine | Temporary Probe | (a) launcher test file with pwsh available; (b) v8 PS launcher (`git archive 9e0681bf39`) creates `abx405-ps-node` from a seeded JSON → S1 PS launcher `workspace apply --name` twice; `docker ps`, env, JSON; `urls`, `help`; `destroy --name`; volume rm | No `pwsh` on the Mac; durable parse test exists |
| API-07 | fresh-start build | server image `server-package` stage + desktop release job | Journey | `fresh-start.sh` (clone `952bc1fcd0`; buildx `--target server-package`; hygiene; licensing; `pnpm install --frozen-lockfile`; `build:electron:mac --arm64`; Prisma + terminal-runtime verifications) | TESTING.md build inputs changed |
| API-08 | AC-002 / SCN-003 transport part | `wss` through a TLS-terminating proxy | Temporary Probe | local Node `https` proxy (self-signed) in front of the node; raw `wss` client: RFB handshake in view, SetDesktopSize ignored, pointer dropped | The Tailscale Serve hop cannot run here; this proves the route behind TLS termination |
| API-09 | AC-014 | logs | Journey | scan the node's logs after API-04/05/08 for the typed/clipboard markers, `access_token`, `password` | All new traffic in this round |
| API-10 | AC-022 end to end, AC-001 (local), fresh-start of the server image | the S1 launcher creating a node from an S1 image; the app viewer on it | Journey | `docker buildx build … --load` of the full image from the fresh clone; push to a test-owned `registry:2` on 127.0.0.1 (the launcher's `docker pull` must succeed); seed state; `autobyteus-docker.sh workspace apply --name abx405-launcher-node`; ports, env, state; isolated instance: add `http://localhost:<B>`, VNC Viewer, network capture; destroy | Added after the first confidence pass (94.9%): the weakest category was environment fidelity, because the desktop node was a hand-made container with the package mounted. This case runs a launcher-made node from a real S1 image |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None planned. The journeys need a real Docker node, the Electron app or pwsh, and the repository has no gated suite for them. The browser probe `vnc-live-probe.mjs` already covers the web-equivalent journey.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None (the implementation removed `vncHosts.spec.ts` with its feature; recorded above).

## Desktop Application Validation Plan

- Framework: Electron 42 + Nuxt renderer.
- Instructions: TESTING.md, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: rendering, mode switch, Maximize (IMP-19 + API-05).
- Shell-specific: window minimize, app hide and restore → `visibilitychange`; real permission defaults for the clipboard.
- Approach: isolated instance of this commit's fresh-clone build, driven over CDP (`Runtime.evaluate`, `Input.*`, `Network.*`, `Browser.setWindowBounds`), plus `osascript` for app hide by PID.
- No disturbance: own instance, ports and data root; the user's app and the other engineer's isolated instance are not addressed; the user's clipboard is not read or written (Control window permission `denied`).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| SCN-003 through a real Tailscale Serve `wss` in the Electron app | Tailscale is stopped on this Mac; starting it changes the user's network. A self-signed TLS proxy cannot be trusted by the Electron app without changing the user's keychain. API-08 proves the route behind TLS termination; the client derives `wss` the same way as every other `/ws` route (`nodeEndpoints.ts:29-30`, `nodeDesktopClient.spec.ts:16`) | Low | Yes (needs the user's tailnet) | Delivery asks the user |
| Build-only release run (`pnpm release:test --ref codex/node-desktop-through-node-server`) | Needs the branch pushed and GitHub runners; the branch is not on origin. RELEASE.md places it before the merge | Medium-low: Windows/Linux runners only; macOS proven by API-07 | No | Delivery runs it before the merge |
| A node on a physically separate machine | One machine available; API-04/05 use a node reachable only by the Mac's LAN address | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
