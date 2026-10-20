# API/E2E Coverage Investigation — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (approved baseline SR-007)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md` (current SR-014)
- Design Spec (required on every route): `…/design-spec.md` (SR-014)
- Supplemental Task Artifacts: `…/slice-plan.md` (approved), `…/follow-ups.md` (FU-001 done, FU-002 RSK-106)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-004)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-006, Pass; CRR-003 and CRR-005 were the failure-origin reviews of F-001 and F-002)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005`
- Current Investigation Round: 5
- Trigger: code review pass CRR-002 (reviewed code `744641b35c`, documents `676ecbbb7a`), Large / High. Then, during round 1, the Solution Designer's hold of steps 3–6 (ARCH-REV-003 Fail / Design Impact, SR-015 `f1d7dd9337`, docs only)
- Prior Investigation Reviewed: rounds 1 and 2 (API-REV-001, API-REV-002)
- Latest Authoritative Investigation: this document, round 5
- Round 5 trigger: CRR-009 pass of the integration merge `c59c6f7359` (`origin/personal` with autobyteus-205). Rerun by impact: the two-server E2E twice and API-22 once. No test change.
- Round 4 trigger: delivery DR-001. On the integrated state (HEAD `303eb6ca1d`), RC-10 raced a prepared remote run under load (DEL-06). The fix takes the run from the task agent's `delegate_task` result. Rerun: the whole E2E twice on the integrated state; API-23b, the real app on the integrated build, replaces a duplicate screenshot.
- Round 3 trigger: CRR-006 pass of IR-004 (code `7a5a9af077`, documents `284769f392`): the F-002 fix in `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` (SR-017, ARCH-REV-007). Rerun by impact: every case of the E2E file (each one starts both servers, and the validators run at every package scan); API-21 and API-22 (the suites go through the same validators); API-23 reused (the receiving node's standalone run view does not use the Team/Org validators). RC-13 adds the reviewer's checks: the owner reopens the Team and Org runs after alpha's restart and after another root is created, and the woken delegators follow up.
- Round 2 trigger: CRR-004 pass of IR-003 (code `31d46978ad`, documents `7383e89a0f`): SR-015/SR-016 (ARCH-REV-004, ARCH-REV-006 Pass) and CR-002 (F-001). The roots, engine, `RemoteRunLinks`, Task lifecycle and `PeerClient` changed, so every E2E case reruns; nothing is held any more.

## Current Requirement And Design Basis

Slice 1 adds remote delegation between two AutoByteus nodes on a trusted network, text only, for Agents:

- **Settings per node** (REQ-101/102/103/115): the switch `ENABLE_REMOTE_COLLABORATION` (off by default), peers pinned to the peer's `serverInstanceId` (`peers.json`), published Agents with launch settings (`published-agents.json`), through GraphQL and the Nodes tab.
- **Delegation** (REQ-104/105, DS-001): `delegate_task({node, recipient_address, description})` → A plans by asking B to prepare a standalone run (B's run ID) → A links the Task, writes the tree link (`taskExecutions` entry with `nodeId`) → sends the work packet → B admits it. A refusal by B leaves nothing on A.
- **Messages** (REQ-106/107/108, DS-002/003): `send_message_to(run id)` between the delegator and its remote run only (pair rule), both ways; one message ID in both logs; headers name the other node; the recipient is woken or restored (idle shutdown on B, restart of either node; on A the coordinating root is restored by `coordinatingRun` for all three root kinds).
- **Refusals** (REQ-109/110/111): specific reasons; files and saved Tasks refused before anything is sent; a DONE/CANCELLED Task fences the remote run on A.
- **Receiving node** (REQ-112): the remote run is an ordinary standalone run in B's history (open, watch, compose, stop).
- **No credential crosses** (REQ-113); one gateway entry per request kind (REQ-114).
- **Preserved** (AC-112, QR-105): same-node collaboration unchanged with the switch off and on.

Code-review expectations carried in (CRR-002 notes): (1) a Team or Org view stream stays open with no sequence gap while remote messages flow, and a later local message still appears; (2) AC-107 for a sender in another root on A is today's live-only refusal ("not running here"), same-root unpaired is `REMOTE_TARGET_NOT_PERMITTED`, and an unlinked inbound on B is `REMOTE_TARGET_NOT_PERMITTED` with nothing written; (3) HTTP 400/404 from a peer reads "could not be reached"; (4) RSK-106 timeout ambiguity is accepted (FU-002), not a failure; (5) Team and Org delegators have unit evidence only.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-101 … SCN-108; SCN-109 as a refusal path only (it is classified "Technically Possible but Unsupported (refusal path)": tested only to confirm the refusal, never as a feature).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-1 (CRR RS-1/RS-2): the owner keeps the delegator's root view (Agent, Team, Org) open on A while messages flow both ways; trigger: the root view WebSocket the web attaches to.
  - RU-2: a Team member and an Org member as delegators (design step 6); trigger: the member's own `delegate_task` call.
  - RU-3: a task agent working on a Project Task delegates remotely, so its remote run joins that Task (`role: delegated`); trigger: the Manager's `delegate_task({task_id})`, whose work packet makes the local copy call `delegate_task({node})`.
  - RU-4: the owner of B answers on the remote run's composer (REQ-112) — used as the real trigger that makes B's scripted agent call `send_message_to`.
  - RU-5: a peer that accepts the connection but never answers (network partition, QR-102), and a stopped peer.
  - RU-6: the peer's address now reaches a different AutoByteus server (identity mismatch, AC-102).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested as features): SCN-109 (only its refusal is asserted).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-101 switch + peers | Added | REQ-101/102/114; DS-004/005 | Two-server E2E over real HTTP/GraphQL |
| BEH-102 publishing | Added | REQ-103; DS-004 | Two-server E2E (publish, unpublish, cannot run) |
| BEH-103 remote delegation | Added | REQ-104/105/111; DS-001 | Two-server E2E for Agent, Team and Org delegators, plus a task agent |
| BEH-104 run-ID messages | Added | REQ-106/107/108; DS-002/003/006 | Two-server E2E both ways, idle shutdown, restarts of both nodes, history deleted |
| BEH-105 files / saved Task refused | Added | REQ-110 | Two-server E2E with request capture (nothing sent) |
| BEH-106 remote run on B | Added | REQ-112 | E2E API checks + browser journey on B |
| Same-node collaboration | Preserved | AC-112, QR-105 | Existing E2E suites with the switch off and on |
| Root view streams | Changed (IR-002) | CR-001 | E2E sequence check on live Agent/Team/Org views |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | roots, engine, `RemoteRunLinks`, receivers, stores | IMP-02/03/11 unit; in-process A↔B (standalone only) | Team/Org delegators end to end; real runtime processes | Two-server E2E |
| API / transport / contract | Yes | `/rest/remote/*`, GraphQL settings, `delegate_task` `node` | IMP-07 curl smoke (settings/gateway only) | Full contract under real use; capture | Two-server E2E with a capturing proxy |
| Frontend component / state | Yes | Nodes → Remote Collaboration tab | IMP-04/05/08 | none material (reused) | — |
| Browser integration / user journey | Yes | B's run history (existing views) for a remote run; view streams | IMP-08 (settings only) | AC-110 not observed | Browser journey against B |
| Authentication / session / permissions | Yes | route class `REMOTE_PEER`, gateway admission | unit + IMP-07 | none beyond E2E gateway checks | E2E gateway refusals |
| Desktop renderer / web-equivalent UI | Yes (web-equivalent) | same as browser | — | — | Browser journey (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — (the embedded server is the same server) | — |
| Process / lifecycle | Yes | idle shutdown of B's host, restore on message, restart of both nodes | unit (idle schedule), in-process restart | real process restart, real CLI shutdown | Two-server E2E (lifecycle) |
| Persisted-data transition | Yes (new optional fields) | tree link with `nodeId`, `delegatedFrom`, settings files | `remote-task-execution-links.test.ts` key-set/round trip | real files written by real servers, survival across restarts and later saves | Two-server E2E file assertions |
| Worker / queue / distributed coordination | Yes | two nodes | in-process only | real two-process coordination | Two-server E2E |
| External integration | Yes (runtime CLI) | AGY runtime per node | scripted CLI in E2E | real paid inference (not needed: TESTING "a scripted runtime proves the transport") | User check AC-113 |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`, branch `codex/cross-node-agent-communication-r2`
- Project type and runtime stack: pnpm monorepo; Node 22 Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`), Nuxt web (`autobyteus-web`), Electron desktop
- Project testing guideline path(s): `/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`)
- Conflicting, missing, or unclear project instructions: none. TESTING requires a current build for suites that run `dist/app.js`; the two-server E2E needs one (built as API-00).
- Required environment variables or secrets available: `N/A` (scripted runtime, no provider keys)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/TESTING.md` | Test layers, rules | Server E2E in `tests/e2e/`; gated runtime suites; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` with `ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1` ("drive real delegation, Tasks and streams without provider calls"); clean environment for E2E (`env -i`, temp `HOME` resolved with `pwd -P`); own data roots and ports; `pnpm -C autobyteus-server-ts build` before `dist/app.js` suites; serialize builds; never the user's app or data; browser probes own their stack and assert DOM/state |
| `/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Package rules | `vitest run <file> --no-watch`; never `git add -A` |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Existing two-process harness (design § Guidance) | spawn `dist/app.js --host --port --data-dir`, `/rest/health` readiness, SIGTERM stop |
| `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`, `task-closure-root-visibility.e2e.test.ts` | Scripted-actor patterns | `CALL_TOOL:{…}` in a message makes the agent call the real tool; `CALLED:<result>` in the conversation; root view routes `/ws/agent-collaboration|agent-team|agent-org/<id>`; minimum idle grace `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=60000`; CLI process liveness by `pgrep`+`lsof` cwd |
| `autobyteus-web/services/**/sequencedStreamRange.ts`, `teamExecutionViewState.ts`, `agentOrgExecutionContext.ts`, `agentRunCollaborationContext.ts` | The web's stream check | every frame's `change_sequence` (or `[change_sequence, change_sequence_through]`) must follow `base_change_sequence` of the snapshot contiguously |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` (API-00) | once per commit; serialized | `exit=0`, bootstrap smoke | — |
| Node "alpha" (A) and node "beta" (B) | `autobyteus-server-ts` | spawned by the test: `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>/<node>` | clean env (PATH, temp HOME, scripted AGY variables); own data roots | `GET /rest/health` | SIGTERM (SIGKILL after 10 s); temp root removed |
| Capturing proxies A→B and B→A | test process | `http.createServer` on free ports | forward / blackhole / retarget modes; records every request | listening | closed in `afterAll` |
| Scripted AGY CLI | `tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_CASE=linked_skills` | one process per live agent; argv log per node | — | stops with its run/server; leftover check |
| Nuxt dev (browser journey) | `autobyteus-web` | `pnpm dev` against node B | after the E2E; one dev server only | page loads | Ctrl+C / kill; temp root removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definitions (Delegator, Manager, Worker on A; Publisher, Fragile, Bystander on B); Team and Org definitions on A | GraphQL `createAgentDefinition`, `createAgentTeamDefinition`, `createAgentOrgDefinition` | test-owned data roots only | removed with the temp root |
| Peers, switch, published Agents | GraphQL settings API (the Nodes tab's API) | — | removed with the temp root |
| Project + Project Task on A | GraphQL `createProject`, `createProjectTask` | — | removed |
| Canary provider keys on both nodes (AC-111) | GraphQL `saveProviderApiKey` (test-owned vault of each node) | fake values only, never real keys | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (new files and new optional fields; no migration)
- Design-spec and implementation-handoff references: design § Persisted-data transition decision; handoff § Persisted Data Transition Check
- Representative existing-data setup and required behavior: trees without remote links keep their exact key set (covered by the existing tree/metadata suites and `remote-task-execution-links.test.ts`, reused); trees written by a real server with a remote link keep it across later saves and restarts.
- Evidence planned: E2E file assertions of the tree link (exact keys) and `delegatedFrom` (exact keys) after creation, after further local saves (a later local delegation/message in the same root) and after restarts of both nodes.
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/remote-collaboration/*.test.ts` (6 files) | settings, client, gateway, walkers, in-process A↔B, view sequence | BEH-101 … BEH-106, CR-001 | Still Valid | IMP-03, IMP-10, IMP-11 | Reuse |
| `tests/unit/run-history/store/remote-task-execution-links.test.ts` | on-disk link shape, round trip per tree kind | AR-001, RSK-108 | Still Valid | IMP-03 | Reuse |
| `tests/unit/standalone-agent-run-root/standalone-host-idle-shutdown.test.ts` | host idle schedule | DS-006 | Still Valid | IMP-03 | Reuse |
| Server unit suite (all) | everything, switch off | AC-112 | Still Valid | IMP-11 at `744641b35c` | Reuse |
| `tests/e2e/projects/*.e2e.test.ts`, `tests/e2e/run-history`, `tests/e2e/agent-team-runs`, `tests/e2e/agent-org-runs` | same-node delegation, Tasks, run history, streams | AC-112, QR-105 | Still Valid (unchanged by this ticket) | not run yet at this commit | Run with the switch off and on (API-20/21) |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | two-process harness pattern | — | Out Of Scope (pattern source only) | — | none |
| Web suite + guards | Nodes tab | REQ-115 | Still Valid | IMP-04/05 at `8491e0d916`; web unchanged since (`git diff --name-only 8491e0d916 HEAD -- autobyteus-web` empty) | Reuse |

## Planned Cases

Round 1 was split by the Solution Designer's hold (ARCH-REV-003, SR-015, 2026-10-20): change-sequence steps 0–2 (contract, on-disk data model, settings, `PeerClient`, `PeerGateway`, routes, web tab) are stable and validated now; steps 3–6 (engine remote send/accept, `RemoteRunLinks` endpoint kinds, root wiring and remote delegation, the Task-closure fence) are being revised, so every case that delegates or messages across nodes waits for the revised code. Case `API-NN` is the E2E's `RC-NN` (`autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`).

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why | Now |
| --- | --- | --- | --- | --- | --- | --- |
| API-00 | all | build | Existing Test | `pnpm -C autobyteus-server-ts build` | TESTING: `dist/app.js` suites need a current build | Run |
| API-R1 | AC-112, unit level | unit | Reused | IMP-17 (full unit suite at `7a5a9af077`; earlier rounds used IMP-11, IMP-14) | HEAD `284769f392` changes only `tickets/` after `7a5a9af077` | Reuse |
| API-R2 | BEH-101 … BEH-106 in process, AR-003 … AR-008, CR-002, F-002 | unit | Reused | IMP-13 (at `31d46978ad`), IMP-15 and IMP-16 (at `7a5a9af077`) | IMP-13's files are unchanged by the two-validator delta except `remote-link-walkers.test.ts`, which IMP-15 reran | Reuse |
| API-R3 | REQ-115 | web | Reused | IMP-04, IMP-05, IMP-08 | `autobyteus-web` unchanged since `8491e0d916` | Reuse |
| API-R4 | REQ-114 (N-3) | route policy | Reused | IMP-07 (a mobile credential on `/rest/remote/*` → 403) | `api/security/` and `api/rest/remote.ts` unchanged since `4c07f5b268`; IMP-07's gateway and settings parts are superseded by API-01/03 | Reuse |
| API-01 | AC-101, AC-111 | settings, gateway | Durable | RC-01: off by default (`DEFAULT_DISABLED`, nothing in `.env`); both inbound kinds → `REMOTE_COLLABORATION_OFF`; `addPeerNode` refused; nothing contacted or recorded | — | Run |
| API-02 | AC-101 | delegation | Durable | RC-02: fresh node, switch off: `delegate_task({node})` refused "turned off", nothing sent | — | Run (round 2) |
| API-03 | AC-101, AC-102, AC-103, AC-111 | settings, client, gateway | Durable | RC-03: switch on (`.env`); inbound evaluated (`PEER_NOT_REGISTERED`); registration both ways through the proxies with pinned IDs; non-AutoByteus page, 404 web server and dead URL refused with nothing recorded; rename; `peers.json` exact keys; gateway order for both kinds (`toNodeId` → caller; 400 with `nodeId`); publish-time validation (missing workspace, unknown model) records nothing; publish (address derived), `published-agents.json` exact keys; unpublish | — | Run |
| API-04 | AC-103, REQ-109 | delegation | Durable | RC-04: not published; publish Publisher; cannot run (workspace removed); nothing left on A or B | — | Run (round 2) |
| API-05 | AC-104, AC-105, RU-1 | delegation, messages | Durable | RC-05: standalone delegator, view open: result, B metadata + `delegatedFrom`, A tree link exact keys, Task record, packet header, reply via B's composer, follow-up, one message ID once per log, contiguous view sequence, every request kind captured | — | Run (round 2) |
| API-06 | AC-104, AC-105, AC-107, RU-1/2 | delegation, messages | Durable | RC-06: Team coordinator with the Team view open; local message after; the other member → `REMOTE_TARGET_NOT_PERMITTED` | CR-001 expectations 1, 5 | Run (round 2) |
| API-07 | AC-104, AC-105, RU-1/2 | delegation, messages | Durable | RC-07: Org member with the Org view open; local message after | CR-001 expectations 1, 5 | Run (round 2) |
| API-08 | AC-107 | messages | Durable | RC-08: other root on A → "not running"; local run on B → refused; forged unlinked inbound to B and A → `REMOTE_TARGET_NOT_PERMITTED`, nothing written | CR-001 expectation 2 | Run (round 2) |
| API-09 | AC-108 | delegation, messages | Durable | RC-09: `reference_files` (delegate, follow-up), `task_id` with `node`, saved Task to the remote run (AR-003); nothing sent | — | Run (round 2) |
| API-10 | AC-109, RU-3 | Task | Durable | RC-10: Project Task → task agent delegates remotely; Task record `role: delegated`; link in the Manager's tree; after DONE the remote reply is refused (closed Task) | AR-007 changes the fence | Run (round 2) |
| API-11 | AC-109 | Task | Durable | RC-11: ad hoc Task DONE: the delegator's message refused, nothing sent; the remote reply refused | AR-007 | Run (round 2) |
| API-12 | AC-106, DS-006 | lifecycle | Durable | RC-12: B's remote run idles out (60 s grace); A's follow-up restores it (`--conversation`) | — | Run (round 2) |
| API-13 | AC-106, REQ-108 | lifecycle | Durable | RC-13: restart B, then A; replies restore A's standalone, Team and Org roots; links and `delegatedFrom` unchanged on disk | — | Run (round 2) |
| API-14 | AC-106 | lifecycle | Durable | RC-14: history deleted on B → "no longer exists" | — | Run (round 2) |
| API-15 | QR-102, AC-104 | channel | Durable | RC-15: partition (≤ 30 s, "did not answer in time"), stopped peer; nothing left | CR-001 expectation 3; RSK-106 accepted | Run (round 2) |
| API-16 | AC-102 | channel | Durable | RC-16: B's URL reaches A: delegation and message refused "identity mismatch" | — | Run (round 2) |
| API-17 | AC-103 | delegation | Durable | RC-17: unpublish → refused; existing run still exchanges | — | Run (round 2) |
| API-18 | AC-101, SCN-107 | delegation, messages | Durable | RC-18: B off, then A off: "turned off" refusals, nothing sent from A | — | Run (round 2) |
| API-19 | AC-102, SCN-107 | delegation, messages | Durable | RC-19: removal on B, then on A: refusals both ways; history stays | — | Run (round 2) |
| API-20 | AC-111, REQ-113, REQ-114 | channel | Durable | RC-20: every captured request: only the contract paths; no credential header; no canary key or token-like text; exact body keys per kind | runs over whatever was captured | Run (round 2: full) |
| API-21 | AC-112, QR-105 | same-node E2E suites | Existing Test | `tests/e2e/projects`, `run-history`, `agent-team-runs`, `agent-org-runs` with the AGY gate, switch off | — | Run (round 3) |
| API-22 | AC-112, QR-105 | same-node E2E suites | Existing Test | the same with `ENABLE_REMOTE_COLLABORATION=true` | — | Run (rounds 2 and 3) |
| API-23 | AC-110, REQ-112 | browser | Journey | two nodes + one remote delegation (`evidence/api-e2e/API-23-setup-two-nodes.mjs`, temporary), Nuxt dev against B: history lists the run, open it, work packet visible, composer message, stop | DOM/state assertions; a durable browser probe would need a two-node stack the web probe harness does not provide, and the E2E already proves the same server behavior (RC-05 composer) | Reused in round 3 (round 2 result; the fix does not touch the receiving node's standalone run view) |
| API-24 | AC-113 (Docker networking part) | Docker node | Temporary Probe | a test-owned container from `autobyteus/autobyteus-server` with this dist mounted read-only (TESTING § Docker server nodes), reaching a host node through `host.docker.internal` | tried in round 3 to shrink the user-only part; allowed only when the image's dist differs just in this branch's files | Not run: the image differs in 31 other files (`API-24-docker-node-attempt.log`) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01 … API-20 | `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (gated by `RUN_AGY_FAILURE_E2E=1` and `ANTIGRAVITY_CLI_COMMAND`, like the other scripted-runtime suites) | The design names a two-server E2E as the proof of AC-101 … AC-111; no repository test exercises two real server processes with real runtimes for this contract; it is the regression guard for later slices (S2 … S6) |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with an embedded copy of the same server.
- Testing guideline used: `/TESTING.md` § Choosing the path.
- Web-equivalent behavior: the Nodes tab (reused IMP-08) and B's run history views (API-22).
- Shell-specific or lifecycle behavior: none changed (no Electron main/preload/IPC change; the embedded server is the server under test).
- Chosen approach: two built server processes + a browser journey; an isolated desktop instance adds no evidence for this change. The desktop + Docker journey in both directions is AC-113, the user's check.
- How the run avoids disturbing an already-running desktop application: only test-owned processes, ports and temp data roots; no isolated-app or user app touched.

## Live Environment And Fixture Plan

- Startup order and commands: API-00 build → the E2E starts A and B and two proxies → cases RC-01 … RC-20 in order (they share the nodes; `-t "RC-(01|03|20) "` runs the settings and gateway cases alone) → `afterAll` stops everything.
- Environment choices that materially affect the run: `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=60000` in both `.env` files (the minimum); scripted AGY `linked_skills`; each node's base URL is its proxy, so every cross-node request is captured.
- Health / readiness checks: `/rest/health`; `remoteCollaborationCapability`.
- Seed data / fixtures: GraphQL only.
- Test identities: none (trusted network, no authentication in slice 1).
- Evidence to capture: a JSON receipt (`REMOTE_E2E_EVIDENCE_DIR`): captured requests, tool results, file contents, sequence checks, timings; the vitest log.
- Owned processes and temporary state: two server processes (and their restarts), proxies, AGY processes, temp root with both data dirs and HOME.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-113 desktop + Docker, both directions, real runtimes | needs the user's own desktop node, Docker node and signed-in runtimes | real network (`host.docker.internal`), real inference | Yes | Delivery takes it to the user |
| Linux Docker `host-gateway` | no Linux Docker host here | reachability on Linux only | Yes (part of AC-113) | — |
| RSK-106 timeout after acceptance | accepted for slice 1 (FU-002) | known | No | FU-002 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-001 (round 1; resolved by CR-002 in IR-003, rechecked in API-03 round 2): registering a URL that answers but is not an AutoByteus node (an HTML page, or a web server answering 404) is refused as `PEER_UNREACHABLE` "could not be reached: …" instead of `PEER_NOT_AUTOBYTEUS` "is not an AutoByteus node." | `Local Fix` (preliminary) | API-03; `peer-client.ts:89-100` (`response.json()` and the `!ok` throw are inside the transport `try`) | Implementation Engineer, via the code reviewer's failure-origin review |
| F-002 (round 2; resolved by SR-017/IR-004, rechecked in API-13 round 3): Team and Org root packages whose message log holds a message with a remote endpoint fail the current root-package validator (`validateTeamRunStatePackage` / `validateAgentOrgStatePackage` require both endpoints of every message to be agents of the tree). The next package re-scan (any new root, every startup) excludes them: their member views fail while they run, and after a restart replies from the remote run are refused "no longer exists" and the runs cannot be reopened (`…_STATE_PACKAGE_NOT_CATALOGED`). The AR-001 walker table has no row for this validator; the design names this as its escalation trigger. | `Design Impact` (preliminary; the fix looks bounded) | API-13 (RC-13), `API-13-F002-package-validator-scan.log`, `API-13-F002-restart-reopen.log` | Solution Designer / Implementation Engineer, via the code reviewer's failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one new E2E file)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: round 3 reruns every E2E case and API-21/22 on IR-004. Round 2 ran every case on IR-003 (API-21 waited for the F-002 fix). Round 1 ran API-00, API-01, API-03 and API-20; the held cases run on the revised code (SR-015), together with a rerun of these by impact. The E2E is long (idle grace and two restarts, about 6–10 minutes); it runs alone, not in parallel with other runtime suites.
