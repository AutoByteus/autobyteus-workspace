# Investigation Notes — Cross-Node Agent Collaboration (parent Task)

## Investigation Meta

- Package identifier: `cross-node-agent-communication`
- Request / ticket: Parent Project Task "Cross-node agent collaboration (trusted private network)", unparked 2026-10-19, from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2` / `codex/cross-node-agent-communication-r2` (new; the Task said to redo the stale one)
- Resolved base remote / branch / revision: `origin` / `personal` / `5de6a698b946a96a1205ee05f2a4987c427b9ca6` (fast-forwarded 2026-10-20 to include autobyteus-197; earlier base `69d7d4f3e643f770b172e565c2d88572f42ded65`) (fetched 2026-10-19, "docs(delivery): record task-part-of v1.5.6-beta.11 publication (DR-002)")
- Finalization target remote / branch: `origin` / `personal` (per slice; this parent itself produces documents only)
- Bootstrap result: Worktree created. Ticket folder `tickets/in-progress/cross-node-agent-communication/` created (untracked). The earlier draft was copied unchanged from the stale worktree into `history-sr-002/`.
- Bootstrap blocker: None. The stale worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication` (branch `codex/cross-node-agent-communication` at `b0b077b02`, 1,810 commits behind `origin/personal`, with no commits of its own) was left untouched; it can be removed when the user agrees.
- Current solution revision ID: `SR-012`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-19); `references/ticket-scope.md` (2026-10-19); the templates for the requirements doc, investigation notes and solution revision record (2026-10-19). Repository: `AGENTS.md`, `TESTING.md` (layers, 2026-10-19). The architecture reading gate (`architecture-design.md`, `design-principles.md`, `DESIGN.md`) applies in slice 1's Task, where the design is made.
- Investigation status: Requirements-phase investigation complete for slice 1 and the slice plan. Architecture investigation is for slice 1's Task.

## Initial Request And Clarifications

- Original request (2026-09-30, summarized in `history-sr-002/investigation-notes.md`): hand generated media to an agent with computer use on another node without manual copying; the agent keeps its own paths; the product transfers files; federation; foundation first; trusted private network includes VPN.
- Clarifications received: the user's direction of 2026-10-19 (through the Project Task Manager):
  - start simple, with a first working slice before any large design;
  - security comes after the main function;
  - trusted private network only, off by default, never exposed automatically, with a place for pairing and permission checks later;
  - no credential travels between nodes;
  - first slice: desktop + Docker node, text-only task to a published agent, follow-ups both ways;
  - propose small slices one by one.
- User-supplied facts and constraints: as above. Collaborators are removed; the collaboration model (CM-1 … CM-9) governs.
- Initial ambiguity: pairing in the trusted case; which agents may be published; whether the Product brainstorming is still wanted.

## Product And Domain Understanding

- Product area: agent collaboration (delegation, run-ID messaging, Tasks), nodes, node settings.
- Affected actors or systems: node owner; delegating run on node A; remote run on node B; both servers; node windows.
- Existing purpose: multi-node lets one desktop app open windows bound to independent servers. Agents collaborate only within one server.
- Terminology:
  - **Peer**: a node registered on this node for cross-node collaboration.
  - **Published Agent**: an Agent definition the owner offers to peers.
  - **Remote run**: a delegated run started on node B for a delegating run on node A.
  - **Link**: the record on both nodes that ties a delegating run to its remote run.

## Source Log

| ID | Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | 2026-10-19 | Command | `git fetch origin personal`; `git worktree add -b codex/cross-node-agent-communication-r2 … origin/personal` | Bootstrap | Base `69d7d4f3e6`; the stale branch is 1,810 commits behind | — |
| S-02 | 2026-10-19 | Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-1 … CM-9, § 4, § 5) | The governing model | CM-5: a delegated run is reached only by run ID, both ways. CM-6: every delegated run belongs to one Task. CM-7: the coordinating run hosts its delegated runs (the § 5 row "through links instead of hosting" is **Later (cross-node)**). CM-8/9 hold: own folder; message stored in both runs' logs with one ID. § 4 names transport, remote addresses, delivery status and attachment transfer as the cross-node additions. | F-3/F-4 in the slice plan |
| S-03 | 2026-10-19 | Doc | `docs/modules/agent_communication.md` (selectors, run-ID route, delegated catalog copies, launch resolver, sender header RD-004, Out Of Scope) | Current messaging | Run-ID message: in the sender's own root it goes through the root and wakes a shut-down delegated run (`restore`); otherwise it reaches only an active run on the same server (`TARGET_AGENT_RUN_NOT_ACTIVE`). Header: `You received a message from the agent with sender run id "<id>"`. The module's Out Of Scope names cross-process routing. Catalog copies take runtime/model from the agent default, then the run root; **workspace and auto-approve always come from the run root**. | A remote run has no root on B to inherit workspace/auto-approve from → the published Agent's launch settings (REQ-103) |
| S-04 | 2026-10-19 | Doc / Code | `docs/modules/agent_team_execution.md` § Server-Owned Task Delegation, § Delegated Child Lifecycle; `src/agent-tools/task-delegation/task-delegation-tool-contract.ts`; `src/agent-collaboration/collaborators/catalog-delegation.ts`; `src/agent-collaboration/execution/task/task-delegation-command.ts` | Current delegation | `delegate_task {recipient_address, description, reference_files?}` or `{recipient_address, task_id}`. The placement order is: CM-1 refusal, in-run placement, listed catalog definition. Results are a strict union (agent / team / `delegated:false` + message). Activation is serialized per root (`RootTaskExecutionLifecycle`), with one tree write before `TASK_EXECUTION_STARTED`. Idle shutdown after the grace period (default 10 min); wake on a same-root run-ID message; senders in another root can never wake. | Cross-node delegation is a new placement kind; follow-ups need the same-root wake across the link |
| S-05 | 2026-10-19 | Doc | `docs/modules/standalone_agent_run_root.md` | How B could host a remote run | Every collaboration-eligible standalone run has a root (`StandaloneAgentRunRoot`). The host handle's `ensureReady()` activates, restores a stopped/crashed run, or returns the live one. The next message restores the host. Roots exist lazily after a restart. The run shows in run history like any standalone run. | Basis for DEC-110 (no full CM-7 conversion needed); REQ-107, REQ-112 feasible |
| S-06 | 2026-10-19 | Doc | `autobyteus-web/docs/remote_access.md` | Node and trust model | Desktop/Electron remote-node access to the full backend is trusted-network-only and has no secret. Phone Access uses a one-time code → `mra_` credential. `serverInstanceId` from `GET /rest/remote-access/status` verifies the URL's identity. VPN options are documented. Strict owner pairing is "a separate future opt-in design". | DEC-101 option (a) reuses the identity check; RSK-001 still valid |
| S-07 | 2026-10-19 | Code | `autobyteus-server-ts/src/app.ts:18` (`host: "0.0.0.0"`); `autobyteus-web/electron/server/embeddedServerLaunchConfig.ts` (`listenerPolicy: 'preserve-backend-default'`); `remote_access.md` (port 29695) | Can the Docker node reach the desktop node? | The embedded server listens on all interfaces at 29695. A Docker container can reach it via `host.docker.internal:29695`; the desktop reaches the Docker node at its published Backend URL. | ASM-102 holds for desktop + Docker on one machine; Linux `host-gateway` to verify in the slice |
| S-08 | 2026-10-19 | Doc | `autobyteus-server-ts/docs/features/memory_sync.md` | Existing server-to-server precedent | A source pushes to a hub over `/rest/memory-sync/v1/...` with an `mhub_` bearer token. The hub advertises its URL. The doc warns that `localhost` on the hub is not reachable from a container and recommends `host.docker.internal`. | Precedent for versioned REST paths and URL choice; slice 1 sends no token (REQ-113) |
| S-09 | 2026-10-01 → 2026-10-19 | Code | `src/services/reference-files/absolute-local-reference-files.ts` (old S-log, unchanged in purpose) | Attachments | `reference_files` must be absolute local paths | REQ-110 refuses them across nodes in S1 |
| S-10 | 2026-10-19 | Code | `src/agent-definition/domain/models.ts:45`; `src/launch-preferences/default-launch-config.ts` | What a definition's default launch holds | `DefaultLaunchConfig = {llmModelIdentifier, runtimeKind, llmConfig}`: no workspace, no auto-approve | DEC-102: the owner must choose workspace and auto-approve at publish |
| S-11 | 2026-10-19 | Code | `src/api/security/remote-access-route-policy.ts` (`classifyHttpRoute`, `authorizeHttpRequest`); `src/agent-tools/mcp/agent-tools-mcp-local-access.ts` | What a network peer can already do | Requests from a non-loopback address without a credential are **allowed** for `TRUSTED_NETWORK_PROTECTED` routes (GraphQL POST, REST families) and `TRUSTED_NETWORK_OWNER` routes. Only mobile credentials are checked. So anyone who reaches a node can already start and message any run through GraphQL. The Agent Tools MCP endpoint is loopback-only. | QR-103/RSK-101: slice 1 adds no new class of access if its inbound routes stay within what is already open; RSK-001 confirmed |
| S-12 | 2026-10-19 | Doc | `history-sr-002/product-design-request.md`, `history-sr-002/solution-revision-record.md` | Product brainstorming state | Sent 2026-10-01 (with Addendum 1); no result returned | DEC-103 |
| S-13 | 2026-10-19 | Code | `autobyteus-web/components/settings/NodeManagerTabs.vue` (tabs: manage, memorySync, phoneSetup, dockerGuide, nfsGuide); `autobyteus-web/docs/settings.md` § Feature Capability Toggles (`ENABLE_APPLICATIONS`, `ENABLE_SKILL_IMPROVEMENT`, `FeatureCapabilityToggleCard`) | Where to configure slice 1 | Node-bound settings live as tabs of the node window's Nodes screen; on/off features use the capability-toggle pattern | DEC-108 |
| S-14 | 2026-10-19 | Code | `src/remote-access/services/server-instance-identity-service.ts`; `src/api/rest/remote-access.ts:31` | Stable identity | `srv_…` ID persisted in `remote-access/server-instance.json`, served on the public status route | Identity pinning for REQ-102 |
| S-15 | 2026-10-19 | Doc | `TESTING.md` § Test layers | How slice 1 can be proven | Server E2E runs on a test-owned server; two-server E2E needs two server instances (to plan in the slice); isolated desktop instance and Docker node for the user's check | AC verification intents |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | Operational | User adds a node in Nodes → Manage Nodes | The desktop app stores node profiles client-side; each window binds to one node | Servers are unaware of each other (except Memory Sync source → hub) | S-06, S-08, S-13 | High |
| BEH-102 | Operational | — | No concept of agents offered to other nodes | — | S-03 | High |
| BEH-103 | Contract | Agent calls `delegate_task` | The root resolves the placement and starts a copy hosted in its own process; the copy belongs to a Task | Same server only | S-04 | High |
| BEH-104 | Contract | Agent calls `send_message_to(target_agent_run_id)` | Same root: through the root, with wake. Otherwise: active run on the same server only | No cross-server delivery | S-03 | High |
| BEH-105 | Contract | `reference_files` | Absolute local paths passed through | Meaningful on the same machine only | S-09 | High |
| BEH-106 | User | — | No remote-started runs | — | — | High |
| BEH-107 | User | User workaround | Manual copy and manual start on node B | Manual | User report | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `RootTaskExecutionLifecycle`, task execution registries (`src/agent-collaboration/execution/task/`) | Serialized activation, idle shutdown, wake, stop of copies hosted in the root's process | A remote run cannot be hosted here | A new task-execution kind "remote link" on A; how it participates in liveness, idle schedule and Task records |
| `GlobalAgentRunMessageRouter` / `SendMessageToDispatcher` | Run-ID routing: same root, else live-only | Follow-ups across the link | A link branch before the live-only path; inbound delivery on B and A |
| `StandaloneAgentRunRoot` / `StandaloneAgentRunRootManager` | A standalone run's root; host restore on the next message | B can host the remote run as a normal run | Back-link to the remote coordinator; idle shutdown of a remote-started host (standalone hosts have no idle shutdown today; to verify) |
| `CollaboratorLaunchResolver` | Runtime/model for catalog copies; workspace/auto-approve from the root | Published Agent launch settings | Reuse the resolver's validation for published settings |
| `remote-access-route-policy.ts` | Trusted-network route classes | Inbound cross-node routes | Classify the new routes; keep them refused while the switch is off |
| `ServerInstanceIdentityService` | Stable server identity | Peer identity pinning | — |
| Memory Sync client/hub (`src/memory-sync/`) | Server-to-server REST with versioned paths | Transport precedent | Reuse patterns, not the token |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files and records: new peer and publish settings; link records on both nodes; the message-log entries of cross-node messages (existing log format, CM-9).
- Existing readers and writers that consume them: run history, Task `agent_run_resources.json`, execution trees, message logs.
- Evidence paths: S-02, S-04, S-05.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs:
  - a new inbound REST surface (server-to-server);
  - the run-ID router branch;
  - a new task-execution kind on A;
  - a remote-coordinated standalone run on B;
  - node-window settings UI and GraphQL for the settings.
- Existing surfaces that can support the behavior: the standalone run root (B), the root task lifecycle and Task records (A), the route policy, the identity service, the feature-capability toggle, Memory Sync's REST client patterns.
- Evidence paths: S-03 … S-08, S-11, S-13, S-14.

### Potential Structural Impacts To Investigate (slice 1 architecture)

- API or external-contract change: Yes. A new inter-node contract; the agent tool contract gains a way to name a peer.
- Persistence schema or invariant change: Yes, new records only. A new task-execution kind in execution trees: check the readers of existing trees and Task records for unknown kinds.
- Security or privacy boundary change: Yes. A new inbound surface, within the existing trusted-network model (S-11).
- Concurrency or lifecycle change: Yes. Remote activation inside A's serialized task lifecycle; inbound wake on both nodes; idempotent retries.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: no migration of existing data expected; new module ownership.
- Confirmed absent, present, or unknown: the restore behavior of a remote-started host is present (S-05); idle shutdown of standalone hosts is unknown.

## Runtime, Probe, Or Reproduction Findings

Premise checks for the slice 1 design (2026-10-20, `references/finding-the-cause.md`). Every other finding in these notes is `Read`.

| ID | Method / Command | Scenario | Observation | Established | Design Implication | Artifact / Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/remote-access/route-policy.test.ts --no-watch` (worktree `5de6a698b9`) | A non-loopback caller without credentials on protected routes | 8/8 pass, including "allows trusted-network protected HTTP without bearer credentials" (peer `100.64.1.2` → `ok, trusted_network`) | Reproduced (unit, real policy code) | QR-103 / RSK-101: the trusted-network backend is already open to network callers; the new `/rest/remote/*` routes add no new class of access | Command output in this session |
| P-2 | `docker run --rm curlimages/curl -s http://host.docker.internal:29811/health.json` against a throwaway `python3 -m http.server 29811 --bind 0.0.0.0` on the Mac (stopped after) | A Docker container reaching a server on the host | Returned `{"probe":"host-reachable"}` (Docker 29.0.1, macOS) | Reproduced | ASM-102 holds for the desktop + Docker setup on macOS; Linux `host-gateway` stays to check in the slice's E2E | `/tmp/cross-node-r2/probe/` |
| P-3 | `docker run --rm curlimages/curl -s -X POST --data '{"query":"{ __typename }"}' http://host.docker.internal:29695/graphql` (read-only query against the running desktop server) | A container calling the desktop node's GraphQL without credentials | `{"data":{"__typename":"Query"}}` | Reproduced (real server, real network path) | Confirms P-1 end to end: a peer on the network can already call the full backend (RSK-001/RSK-101 basis) | Command output in this session |
| P-4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/standalone-agent-run-root/standalone-host-agent-handle.test.ts --no-watch` | A standalone host made ready again after it went offline | 3/3 pass, including "re-activates after a crash and lets a failed attempt be retried" | Reproduced (unit, fake backend) | DS-002/DS-006: an inbound message can restore a remote-started host through `ensureReady()`. Restore through real runtimes is for the slice's E2E | Command output in this session |
| P-5 | `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` (read) | Two real built server processes in one E2E | An existing harness spawns two servers (`dist/app.js`) on separate ports and data directories | Read | Two-server E2E for AC-101 … AC-111 can reuse this harness | File header |

- Temporary diagnostics: none in the repository. The throwaway server and probe file were only in `/tmp/cross-node-r2/probe/`; the server was stopped.
- Reproduction for implementation to start from: `None`. This is a new capability with no bug to reproduce; P-5 is the harness to start from.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-09-30/10-01) | Hand the video to the computer-use node without manual steps; the agent keeps its own paths | Direct | Parent target; S2 | — |
| User (2026-10-19 via PTM) | Start simple; security later; trusted network only; off by default; no credential crosses nodes; first slice is text-only between desktop and Docker | Direct | Scope of slice 1 | DEC-101/102/103 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Private networks (LAN, Tailscale, WireGuard, NetBird, company VPN) | User-operated | Reachability | S-06 | Product does not manage them |
| Docker host networking | Docker | `host.docker.internal` to reach the host | S-07, S-08 | Linux needs `host-gateway` |

## Persisted Data And State Facts

- Affected stored subject: new records only (peers, published Agents, links). Existing data is unchanged.
- Location and representative shape: to be decided in slice 1 architecture.
- Approximate volume: small (a few peers, a few published Agents, one link per remote delegation).
- Current readers and writers: execution-tree and Task-record readers must tolerate the new link kind (to verify).
- Required semantics: links survive restarts (REQ-108); removing a peer keeps history.
- Acceptable loss: none for existing data.
- Remaining evidence gap: tree readers' behavior on unknown task-execution kinds (slice 1 architecture).

## Product Design Request Context

- Product Design request in the current input: `Needs clarification` (DEC-103). The 2026-10-01 request is in `history-sr-002/product-design-request.md`; no result was returned.
- User's requested outcome, in the user's own terms (2026-10-01): "I want to brainstorm with the product prototype because it's much easier to brainstorm with the product prototype itself."
- Requirement / behavior IDs involved: to be restated if DEC-103 = resend.
- Remaining fields: N/A until the user answers DEC-103.

## Product Design Findings

N/A — no result returned.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `slice-plan.md` | Solution Designer | Ordered slices, foundations, slice 1 Task text | Parent | All | Ready for Approval (SR-003) | Approved with the requirements |
| `history-sr-002/requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `product-design-request.md` | Solution Designer | The earlier draft, unchanged | History | Old IDs | Superseded | None |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Pre-existing: the full backend is open to anyone who reaches the node (S-11). On a VPN shared with other people, that exceeds what the owner intends. | Shared networks | Its own Task (optional owner pairing for the full backend); Project Task Manager to record it when the user wants | Recorded; out of scope |
| RSK-101 | Risk | Slice 1 adds inbound server-to-server routes. If they offered more than GraphQL already offers to a network peer, they would widen exposure. | Security posture of the trusted model | QR-103; the switch is off by default; the routes accept only registered peers, published Agents and linked runs | Mitigated by requirements |
| RSK-102 | Risk | A peer's messages are untrusted input to agents that may have computer use (prompt injection) | Safety | Publishing is explicit; auto-approve off by default (DEC-102); origin shown | Mitigated by scope |
| RSK-103 | Risk | Until S6, a node's identity is checked against the pinned `serverInstanceId` but not proven; a device on the network can claim it | Impersonation within the trusted network | S6; equivalent to today's trusted-network backend (S-11) | Accepted for slice 1 by the direction |
| RSK-104 | Unknown → Resolved | Standalone hosts have no idle shutdown (A-07) | Resource use on B | Design DS-006: idle schedule for remote-started hosts | Resolved in design |
| RSK-105 | Unknown → Resolved | Tool-call timeouts vs. remote calls (A-11) | QR-102 | Design: peer timeout ≤ 20 s; B returns before the remote run's first turn | Resolved in design |

## Architecture Investigation Findings

Slice 1 (autobyteus-191), 2026-10-19. Authorities: `architecture-design.md`, `design-principles.md`, `/DESIGN.md`, `collaboration_model.md`, `data_migration_guideline.md` §1–§3.

| ID | Source | Observation | Design use |
| --- | --- | --- | --- |
| A-01 | `src/agent-communication/services/global-agent-run-message-router.ts` | Same-root path when `senderRoot.hasAgentExecution(target)`, then `deliverExactAgentMessage`; otherwise team-run refusal, then live-only `getActiveRun` | The router stays unchanged; roots answer for remote endpoints |
| A-02 | `src/agent-collaboration/execution/communication/root-communication-engine.ts`, `root-communication-adapter.ts` | `deliver`: open check, both identities current in the root, Task check (`assertDeliveryAllowed`), message ID = hash, `reserveRecipientInput` (in-process), `commitAppend` (logs + admit) | `RootRemoteLinks` splits send/accept around the local half; inbound needs a supplied message ID |
| A-03 | `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts`, `standalone-root-communication-adapter.ts` | Host made ready by `host.ensureReady()`; commit refuses a duplicate `messageId` | Inbound to B restores the host; message idempotency by ID |
| A-04 | `src/run-history/store/task-agent-message-logs.ts`, `message-log.ts` | `messageLogOwners`: receiver's log, then sender's; message = 7 fields (no node) | Remote owner kind is skipped; no log format change |
| A-05 | `standalone-agent-run-root-manager.ts:139` `resolveRoot`; `team-run-service.ts` `resolveManagedTeamRun`; `agent-org-run-service.ts:162` `restore` | Every root kind is restorable by its run ID | Inbound to A resolves the root by `coordinatingRoot` (no scan) |
| A-06 | `src/agent-collaboration/execution/task/root-task-execution-adapter.ts`, `task-delegation-command.ts` | Activation = prepare → commit (tree) → acceptSeed; outcome union | `RemoteTaskActivation` as an operation variant; B creates without work, A commits, then sends the packet |
| A-07 | `grep idle` in `standalone-agent-run-root/`, `agent-execution/services` | Standalone hosts have no idle shutdown; only children's idle timers | DS-006 host idle schedule for remote-started hosts |
| A-08 | `docs/modules/projects.md` § Agent Run Resources | Task entry `agentRun: {kind: agent, agentRunId}`, `hostRoot` | A remote copy fits the existing Task record shape |
| A-09 | `src/run-history/domain/run-execution-tree-shared-records.ts` | `TaskExecution = TaskAgentExecution \| TaskTeamExecution`, told apart by `"agentRunId" in value` (about 170 checks, ARCH-REV-001) | On disk the remote link is a `taskExecutions` entry with `nodeId` (SR-009). In memory the store puts it in `remoteTaskExecutions`, so the existing checks never see it (SR-013, AR-001) |
| A-10 | `src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts`, `-parameter-schemas.ts`; `task-execution-input.ts` | Strict zod schemas; work packet header `You have a new task from the agent with sender run id …` | `node` parameter; node in headers |
| A-11 | `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | Only `startup_timeout_sec: 5` is set; the Codex default tool timeout applies | Peer timeout ≤ 20 s stays under it (RSK-105) |
| A-12 | `/DESIGN.md` rule 9 | No version checks between nodes | REQ-114 changed (SR-005) |
| A-13 | Read-only inspection of `~/.autobyteus/server-data` (2026-10-19): a task agent's `memory/agents/<id>/run_metadata.json` (`taskAgent {coordinatingRun {kind, runId}, delegatorAgentRunId, address, origin}`); a standalone `collaboration/collaboration_tree.json` (`subjectKind`, `host`, `taskExecutions [{address, teamRunId \| agentRunId, delegatorAgentRunId, startedAt}]`); a Team tree (`schemaVersion`, `rootTeam.taskExecutions`); an Org tree (`rootOrg.taskExecutions`); an Org message-log line (7 fields); `remote-access/server-instance.json` (`serverInstanceId`); settings in `<data>/.env` (`app-config.ts:306`). A leftover `node-identity.v1.json` is not referenced by current code. | Real shapes for the on-disk data model | Design § On-Disk Data Model |
| A-14 | `git merge --ff-only origin/personal` → `5de6a698b9` (2026-10-20); `git diff --stat 69d7d4f3e6 HEAD` over run-history, agent-collaboration, agent-communication, standalone root, task delegation, route policy | autobyteus-197 removed `taskAgent.origin` and `standalone-root-task-source-resolver.ts`. `TaskAgentExecution.source` is now required (every copy restores from its own file). `TaskAgentSection` = `{coordinatingRun, delegatorAgentRunId?, address, launchSource?, userLaunchSelection?}`, and its presence still makes a file a task agent's (G1/G2). The router, root communication engine and route policy are unchanged | The remote link loads as its own kind (`RemoteTaskAgentExecution`); DEC-112 reasoning still holds |
| A-15 | ARCH-REV-001 (2026-10-20). Read: `run-history/store/task-execution-tree-split.ts` (`composeTaskExecutions`, `splitTaskExecutions`, L4–L6); `task-agent-message-logs.ts:125` (`composeMessageLogs`); `root-task-execution-resource-scope.ts:84-137` (closure release; NO_AUTHORITY → stopped); `agent-run-service.ts:246-266` and `agent-run-provisioning-service.ts:42` (prepared runs, TTL 24 h, `cleanupStalePreparedRuns`) | One shared compose/split owner serves all three tree kinds and keeps on-disk entries it did not load. The stored message view filters by loaded endpoints. Closure release of a run the root holds no authority over counts as stopped. A prepared run expires after 24 h | AR-001 in-memory partition; message-view include; closure fence by construction; N-2 prepared path |

## Requirement Implications

- Cross-node work is new behavior; no current path crosses servers (BEH-103/104).
- The receiving node can host a remote run with existing machinery (S-05), so slice 1 does not need the full CM-7 conversion (DEC-110).
- Trusted-network exposure already exists (S-11), so a slice without authentication fits the existing model, provided its routes add no new class of access (QR-103).
- A definition default has no workspace or auto-approve (S-10), so publishing must record them (DEC-102).
- Prerequisite test (ticket-scope.md): none of the traced dependencies (router, root lifecycle, standalone root, route policy, embedded listener, Docker networking) blocks slice 1's goal. No prerequisite.

## Notes For Architecture Design

- Map SCN-101 … SCN-109 (requirements doc).
- Verify:
  - unknown task-execution kinds in tree and Task readers;
  - idle shutdown for remote-started hosts (RSK-104);
  - the inbound wake of a delegating run in Team/Org roots;
  - Linux Docker `host-gateway`;
  - MCP tool-call timeouts (RSK-105).
- Keep the inbound entry points single per request kind (REQ-114) so S6 adds checks in one place.
