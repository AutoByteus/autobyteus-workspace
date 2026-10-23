# API/E2E Coverage Investigation — one-nodes-tab

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-006)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001 … SR-007)
- Design Spec: `design-spec.md` (SR-007, Ready)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` with `visual-references/` VIS-001…031 (approved)
- Design Review Report: `design-review-report.md` (Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass 9.3/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: `N/A` (no delivery re-entry)
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer, CRR-002 Pass (run `code_reviewer_0207bf9e57664241955db13fff5f4c91`)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this document, round 1

All paths are in the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/` unless absolute. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`, branch `codex/one-nodes-tab`, source under test `23f3feb193` (HEAD `0a1e02ba09` adds ticket documents only).

## Current Requirement And Design Basis

- One Manage Nodes tab with one list: desktop entries (desktop registry / browser `localStorage`) and this node's peers (`peers.json`), joined on screen by node ID (`serverInstanceId` on the desktop side), never merged in storage (DEC-701). No Remote Collaboration tab; this node's switch and rules are a section (REQ-701, REQ-709).
- Add once (REQ-704): always-open form, switch on by default; a reachable node with the switch on opens the one confirmation; nothing changes before Confirm; Cancel leaves it listed only; duplicates by address (any state) or node ID; unreachable → added with its cause; adding never opens the window.
- Collaborate in one confirmed plan carried out by the window on both nodes (REQ-705, DEC-702/704); each registering server resolves the other's address from candidates verified by node ID (DS-005; switch must be on, DEC-709 b). Partial results stay visible with one fixing button (REQ-706, run rules).
- Errors name the cause (`refused`, `timeout`, `not_found`, `unreachable`, not AutoByteus, identity mismatch, this node, not registered, off there); a loopback address used by a node in a container gets the `host.docker.internal:<port>` hint and "Use this" (REQ-707/708, server-computed `loopbackInContainer`). Change address is one server-checked step on the typed address (A1, accepted in CRR-001).
- Rename once; Remove confirms and removes there when reachable, and says so when not (REQ-710).
- Persisted data: `Directly Usable — No Migration` (desktop registry gains `serverInstanceId`, drops `capabilities`/`capabilityProbeState` on the next save; `peers.json` unchanged) (REQ-711).
- 20 s bound per node, no polling, 267 offer timing preserved; the window never asks a peer for its offer directly (REQ-712, 267 REQ-503).
- Works in a window on a Docker node and in en/zh-CN (REQ-713).
- Contract delta: `addPeerNode({nodeId, name, baseUrl})` with `PEER_IDENTITY_MISMATCH`; `resolvePeerAddress`, `peerAddressCandidates`, `peerNodeAvailability`, `changePeerAddress`; `peerNodeOffer.unreachableReason`; error extensions `{code, reason, address, loopbackInContainer, attempts}`; desktop registry change `identify`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-701 … SCN-706 (all `Supported Normal`).
- Real-use scenarios added from the implemented behavior, each with its real trigger:
  - SCN-A01 Name collision on the other node: the other node already has a peer named like this node (another desktop registered there first). Trigger: Turn on for that row. Expected: the plan registers "<name> 2" and says so (design § Naming Rule, AR-002).
  - SCN-A02 Name race: between the confirmation opening and Confirm, the other node gains a peer with the planned name (its own owner, in its own window). Trigger: Confirm. Expected: "<node> already has a node named <name>." and the row's fixing button re-plans with a free name. Real use: two owners/windows act on the same node; the probe makes the other change through that node's GraphQL, as its window would.
  - SCN-A03 Node recreated with a fresh identity at a listed address (AR-003). Covered by IMP-11 step 1 (browser); rechecked in Electron via `identify` replacing the stored ID only if it occurs naturally (not planned separately).
  - SCN-A04 First Open of a peer-only row adds a desktop entry (DEC-706, TR-714). Trigger: Open on a row only this node's server knows.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements table. CRR C-05 (a peer-only row the window cannot reach, connection detail with an empty host) was rejected as not a supported normal path; it is not tested as a failure.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-703 one row per node (DS-001) | Changed | REQ-702/711, AC-702 | Browser probe (localStorage) + Electron registry journey with a release-shaped registry |
| BEH-701/702 add once (DS-002) | Changed | REQ-704, AC-703 | Browser probe (peers.json unchanged on both nodes); Electron: add opens no window, Open does |
| BEH-704 collaborate both ways (DS-003/004) | Added | REQ-705/706, AC-704…706 | Browser probe on two host servers; Docker node for the `host.docker.internal` address; Electron Docker case |
| BEH-705 causes + Docker hint (DS-005) | Added | REQ-707/708, AC-707 | Server unit (reused); browser on a window bound to a test-owned Docker node; Electron Docker window |
| BEH-706 tab removed, switch section | Changed | REQ-701/709, AC-701 | Browser probe; component tests (reused) |
| BEH-707 offers and timing | Preserved | REQ-712, AC-710, AC-713 | Browser probe (black hole, refresh, switch, no polling, no direct peer offer ask) |
| REQ-710 rename / remove | Changed | AC-708/709 | Browser probe incl. the other node stopped |
| GraphQL contract (`addPeerNode` input, new ops, extensions) | Changed | design § Interface Boundary Mapping | Server E2E two-server (updated input); the probes call the real GraphQL |
| Desktop registry `identify`, `serverInstanceId`, dropped probe fields | Changed | design § Persisted Data | Electron specs (reused) + isolated desktop instance with a release-shaped registry file |
| `?nodeTab=remoteCollaboration` | Removed | design § Legacy Removal | Browser probe: falls to Manage Nodes |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `PeerAddressResolver`, `PeerDirectory.add/changeAddress`, classifier, `runsInContainer` | Server unit (IMP-03) | Real container (`/.dockerenv`, `host.docker.internal`) | Test-owned Docker node |
| API / transport / contract | Yes | GraphQL settings ops and extensions | IMP-04 sanity; two-server E2E (not run) | Full server E2E with the new input | Server E2E |
| Frontend component / state | Yes | `nodeListStore`, connector, dialog store, components | Web unit (IMP-09) | Mocked node APIs | Browser probe on real servers |
| Browser integration / user journey | Yes | Manage Nodes page against real servers | IMP-08/11 (manual, agent browser) | Not durable; black hole, races, offer timing not rerun | Durable browser probe |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer in Electron | Browser probe | Electron bridge (`window.electronAPI`) paths | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes | `identify` IPC, `openNodeWindow`, registry file | Electron specs (IMP-06) | Live IPC, window opening, real file | Isolated desktop instance |
| Process / lifecycle | Yes (minor) | Registry load/save across a restart | Electron specs | Real restart | Isolated instance restart |
| Persisted-data transition | Yes | `node-registry.v1.json` direct use | Electron spec fixtures | A release-written file through the real app | Isolated instance with a synthesized release-shaped file |
| Worker / queue / distributed coordination | Yes | Two-node plan run from the window | Connector unit tests | Real two-node partial failures, races | Browser probe + Docker |
| External integration | Yes | Docker Desktop networking (`host.docker.internal`) | None | All | Test-owned container |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`
- Project type and runtime stack: pnpm monorepo; Node 22 server (`autobyteus-server-ts`, Fastify + GraphQL, Prisma/SQLite); Nuxt 3 web (`autobyteus-web`) also packaged as Electron.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`).
- Conflicting, missing, or unclear project instructions: `test:integration:prepare` rebuilds the server `dist` itself (observed: it removed the API-00 build and rebuilt it); the probes wait for it. Not a conflict.
- Required environment variables or secrets available: `N/A` (no provider keys; the two-server E2E uses the scripted AGY CLI).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing guideline | Layers and commands; clean env for E2E (`env -i … HOME=<resolved temp>`); Docker: test-owned container from the same image, `127.0.0.1` port, no user volumes, `dist` mounted read-only after checking the image `dist` differs only in changed files, `docker rm -f -v`; isolated desktop instance for shell behavior; browser probes own their stack and fail on browser errors; rule 9 for every failure |
| `AGENTS.md`, `DESIGN.md` | Repository instructions | Design rule 9 (no compatibility code) |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `pnpm --silent isolated-app start --build [--data-root <dir>]`; userData is `<dataRoot>/electron/user-data`; control via CDP on `controlPort`; `stop <instanceId>` |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` header | Two-server E2E | Prerequisites build + `test:integration:prepare`; `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<fixture>` under `env -i`; ~5 min |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` header | Existing 267 browser probe | Own servers from `dist/app.js`, `nuxt dev` with `BACKEND_NODE_BASE_URL`, playwright-core Chrome |
| `autobyteus-web/electron/launch-profile/electronLaunchProfile.ts` | e2e launch profile | `userData = <root>/electron/user-data` |
| Image `autobyteus/autobyteus-server:beta` (`entrypoint.sh`) | Docker node | Server on `0.0.0.0:8000`, data `/home/autobyteus/data`, `AUTOBYTEUS_SERVER_HOST` env; `dist` at `/app/autobyteus-server-ts/dist` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` (and via `test:integration:prepare`) | serialized | `exit=0` | — |
| Test-owned host servers | worktree | `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>` with `env` reduced to PATH/HOME/TMPDIR | own data roots | `/rest/health` | SIGTERM, temp root removed |
| Nuxt dev server | `autobyteus-web` | `corepack pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | one at a time per worktree | page answers | process-group kill |
| Test-owned Docker node | — | `docker run -d --name one-nodes-api-<id> -p 127.0.0.1:<port>:8000 -v <worktree dist>:/app/autobyteus-server-ts/dist:ro -e AUTOBYTEUS_SERVER_HOST=http://localhost:<port> autobyteus/autobyteus-server:beta` | no user volumes; user containers `autobyteus-server-0/1/2` untouched | `/rest/health` on the published port | `docker rm -f -v` |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build --data-root <temp>` | packaged worktree build | `start` JSON `ok` | `isolated-app stop <instanceId>`; `list` shows none of mine |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Peers, switches, shared agents | Public GraphQL (`setRemoteCollaborationEnabled`, `addPeerNode`, `createAgentDefinition`) and the page | Own data roots only | Removed with the temp roots |
| Browser desktop list (release shape) | `localStorage` `autobyteus.node_registry.v1` set by the probe's init script, keys as a current release writes them | Synthesized; shape learned read-only from the user's registry (keys only, no values copied) | Browser context closed |
| Desktop registry file (release shape) | Synthesized `node-registry.v1.json` in the isolated instance's userData before start | Same | Data root removed at stop |
| Black-holed node | TCP listener that never answers (probe-owned) | Loopback only | Sockets destroyed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (desktop registry); `peers.json` `Not Affected`.
- References: design-spec § Persisted Data / State Transition Decision; implementation-handoff § Persisted Data Transition Check.
- Representative existing-data setup: a `node-registry.v1.json` with the keys the current release writes (`id`, `name`, `baseUrl`, `nodeType`, `capabilities {terminal, fileExplorerStreaming}`, `capabilityProbeState: "ready"`, `isSystem`, `createdAt`, `updatedAt`; an `embedded` entry and `remote` entries), plus existing peers created through GraphQL on the embedded server.
- Evidence planned: the real app loads it, the joined row appears once (AC-702), `identify` writes `serverInstanceId`, the next save has no `capabilities`/`capabilityProbeState`, and a restart changes nothing further (TESTING.md: a second start changes nothing).
- Migration-specific scenarios: not applicable.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/remote-collaboration/*` (resolver, classifier, directory, client, discovery, offer resolver, settings) | New and updated server rules | REQ-707/708, DS-005, AC-713 | Still Valid | IMP-03 | Reuse IMP-03 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | 191/245/247/261/267 between two real servers; input updated to `{nodeId, name, baseUrl}` | AC-713 preserved; contract change | Still Valid (updated by implementation) | diff `ca1f09e52a..23f3feb193` | Run (API-06) |
| Server integration suite `tests/integration/**` | In-process integration (none specific to remote-collaboration) | regression | Still Valid | — | Run (API-05) |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` (267, RNP-01…09) | Drives `?nodeTab=remoteCollaboration`, the old peer form testids (`remote-collaboration-peer-*`), the old `addPeerNode {baseUrl, name}` input, and asserts "the window never contacts a peer" | 267 REQ-501…510; superseded by REQ-701 (tab removed), REQ-704 (one add form), design DS-004 (the window now reads the other node's settings API) | Replace | The tab, testids and input no longer exist (`NodeManagerTabs.vue`, `AddPeerNodeInput`); RNP-09's assertion contradicts DS-004 / DEC-702 | Replace with the one-tab probe (API-07); RNP-09 narrowed to 267 REQ-503 (offers only from this node's server) |
| Web unit/component specs (`stores/__tests__/node*.spec.ts`, `services/nodeCollaboration/__tests__/*`, `components/settings/nodes/__tests__/*`, …) | Rows, connector plans/run rules/naming, dialog, row | BEH-701…707 | Still Valid | IMP-09 | Reuse IMP-09 |
| `autobyteus-web/electron/__tests__/nodeRegistryStore.spec.ts` | Projection, `identify` | REQ-711 | Still Valid | IMP-06 | Reuse IMP-06 |
| Web guards | Boundary, localization | REQ-713 | Still Valid | IMP-10 | Reuse IMP-10 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | all server | server `src` typecheck | Reused | IMP-02 | `git diff --name-only e16d848e0f HEAD -- autobyteus-server-ts` is empty |
| API-02 | REQ-707/708, DS-005, AC-713 | server unit | Reused | IMP-03 | same diff empty |
| API-03 | BEH-701…707 | web unit/component | Reused | IMP-09 | ran on `23f3feb193`; nothing outside `tickets/` changed since |
| API-04 | REQ-711 | Electron main-process specs | Reused | IMP-06 | `git diff --name-only e16d848e0f HEAD -- autobyteus-web/electron autobyteus-web/types` empty |
| API-04b | REQ-713 | web guards | Reused | IMP-10 | ran on `23f3feb193` |
| API-05 | regression | server integration | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | never run on this change |
| API-06 | AC-713, contract | server E2E, two real servers | Existing Test | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | updated input, never run |
| API-07 | AC-701…710, AC-713, REQ-711 (browser store), SCN-A01/A02 | Browser + real host servers | Durable | `pnpm -C autobyteus-web test:e2e:remote-nodes-page --output-dir=<evidence>` (replaced probe; sub-cases NP-01…NP-12) | replaces the stale 267 probe; covers the real two-node journeys, the black hole and 267 timing durably |
| API-08 | AC-704 (Docker address), AC-707, REQ-708, REQ-713 | Browser + host server + test-owned Docker node | Durable | `pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=autobyteus/autobyteus-server:beta --output-dir=<evidence>` (new probe; sub-cases ND-01…ND-04) | the hint and the container-side resolution exist only in a real container; durable, gated by Docker availability |
| API-09 | REQ-711, AC-702, AC-703 (Electron), DEC-706, REQ-713, AC-704 (desktop + Docker), AC-707 (Docker window) | Isolated desktop instance of the worktree build + test-owned Docker node | Temporary Probe (journey script kept in evidence) | `pnpm --silent isolated-app start --build --data-root <temp>` with a synthesized release-shaped registry; drive over CDP (sub-cases EL-01…EL-06) | needs a packaged build and Docker; the shell logic has durable Electron specs; the journey is ticket-owned automation (TESTING.md § headless: "Temporary ticket-owned automation does not require a new global package command") |

API-07 sub-cases (one probe run): NP-01 tabs and switch default (AC-701; `?nodeTab=remoteCollaboration` → Manage); NP-02 release-shaped desktop list joins with peers once, never-reached entry its own row (AC-702); NP-03 peer states and a black-holed node (AC-706, AC-710); NP-04 add: switch off, switch on + Cancel, duplicate by address and by node ID, unreachable (AC-703, peers.json unchanged on both); NP-05 Turn on with the other switch off: one confirmation includes it, both sides registered with pinned IDs, both directions working, both servers' `peerNodeOffer` available (AC-704); NP-06 name collision " 2" (SCN-A01); NP-07 name race (SCN-A02); NP-08 rename (AC-708) incl. invalid and taken; NP-09 stop collaborating, then with the other node stopped (AC-705); NP-10 remove collaborating, then with the other node stopped (AC-709); NP-11 267 timing: Refresh asks one node, switch off asks nobody, on asks every collaborating node once, quiet period no requests (REQ-712, AC-713); NP-12 the window never asks a peer for its offer (267 REQ-503).

API-08 sub-cases (ND-05 added during execution: the window on the Docker node shows it as "This node"): ND-01 desktop-side window, Docker node added and turned on: the Docker node registers this node at `host.docker.internal:<port>` and both directions work (AC-704); ND-02 window on the Docker node: Change address to `http://127.0.0.1:<host port>` → hint with `host.docker.internal:<port>`, Use this saves it (AC-707, REQ-708); ND-03 causes from inside the container: refused, name not found, timeout, different node, each named, no "fetch failed" (AC-707); ND-04 the hint never in the add form (design § Loopback Hint Surface).

API-09 sub-cases: EL-01 release-shaped registry loads, "docker" row once with both roles, never-reached entry its own row, `identify` writes `serverInstanceId` over IPC, the dropped fields are gone after the save, a restart changes nothing (REQ-711, AC-702); EL-02 add with the switch off opens no window; Open opens it (AC-703); EL-03 peer-only row: first Open adds a desktop entry with the node ID and opens the window (DEC-706); EL-04 Turn on the Docker node from the desktop window: the Docker node registers the embedded node at `host.docker.internal:<port>` (AC-704); EL-05 window opened on the Docker node: "This node" is the Docker node, the embedded node is a row (REQ-713); EL-06 in that window, Change address with `127.0.0.1` shows the hint and Use this saves it (AC-707); EL-07 restart twice: the registry file keeps its content and a second start leaves it byte-identical (REQ-711; TESTING.md "a second start changes nothing").

- Test progress log needed: `Yes` ([api-e2e-test-progress.md](api-e2e-test-progress.md)).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-08 | `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` + script `test:e2e:nodes-docker-address` | The Docker loopback hint and `host.docker.internal` resolution can only be proven in a container; no repository test exercises them |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-07 | `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | Rewritten for the one Manage Nodes tab (Replace, below); script name kept | 267's timing cases carried over |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `remote-nodes-page-probe.mjs` RNP-01…RNP-08 as written | The Remote Collaboration tab, its peer chips/rows/form testids and the `addPeerNode {baseUrl, name}` input | REQ-701, REQ-704, design § Removal Plan, `AddPeerNodeInput` clean cut | NP-01…NP-11 in the rewritten file (same 267 timing, on the one list) |
| `remote-nodes-page-probe.mjs` RNP-09 "the window never contacts a peer" | The window now reads the other node's settings API and probes its identity by design | DS-001/DS-004, DEC-702 | NP-12: the window never asks a peer for its *offer* (267 REQ-503, design § Dependency Rules) |

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (`autobyteus-web/electron`), packaged with the Nuxt renderer and an embedded server.
- Testing guideline used: TESTING.md § Choosing the path (desktop-shell → Electron tests + isolated desktop instance), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: rows, add, plans, dialogs, causes (API-07, API-08 in a browser).
- Shell-specific or lifecycle behavior: `identify` over IPC and the registry file, `openNodeWindow` (Open; adding not opening), the peer-only first Open, a window bound to another node (Docker), the registry across a restart.
- Chosen approach: isolated desktop instance of a worktree build (`--build`), driven over its CDP control port with playwright-core `connectOverCDP` (the same endpoint browser-automation attaches to).
- How the run avoids the user's app: own data root, ports and process group; the user's `~/Library/Application Support/AutoByteus` is only read once for key names (no values); the user's containers are never touched.

## Live Environment And Fixture Plan

- Startup order: build → integration → two-server E2E → API-07 (own servers + Nuxt dev) → API-08 (host server + test-owned container + Nuxt dev) → Electron build → API-09 (instance + container).
- Environment choices: clean env for servers (PATH/HOME/TMPDIR only); `APP_ENV=test`; `en` locale preference in the browser.
- Health / readiness: `/rest/health`; Nuxt page 200 and a warm-up load; `isolated-app start` JSON.
- Seed data: GraphQL only; a synthesized registry file / `localStorage` entry.
- Requirement-linked journeys: above.
- Evidence: JSON receipts per probe (DOM text, server GraphQL answers, `peers.json` reads, request logs), screenshots, server logs, the registry file before/after.
- Cleanup: probe-owned processes and temp roots; containers `docker rm -f -v`; `isolated-app stop`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-711 on the user's own desktop and Docker nodes | Never test against the user's app or containers (TESTING.md rule 2) | The user's real addresses | Yes | Delivery takes it to the user |
| Agents actually delegating across the nodes after connect (paid inference) | `peerNodeOffer`/`peerNodeAvailability` both ways prove admission; delegation transport is proven by API-06 | Low | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| After a name race (`PEER_NAME_TAKEN` at run time), the row line reads "… mu already has a node named ." without the name. The design § Naming Rule 4 and VIS-015 require "mu already has a node named Embedded Node." | `Local Fix` (found in execution, NP-07) | `evidence/api-e2e/API-07-remote-nodes-page-run4/remote-nodes-page-probe.json` `cases.NP-07.rowLine`; `NodeRow.vue:172` | Implementation engineer (failure-origin review by the code reviewer) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-07 replaced, API-08 added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: the coverage changes go to proportional test-code review on a Pass.
