# Implementation Handoff — Remote Agent Teams (autobyteus-247)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-002 `Pass` (design commit `173d336a2a`, SR-006; N-304 addendum `e03f96871a`). This handoff goes to the code reviewer (Large / High route).
- Requirements doc: `tickets/in-progress/remote-agent-teams/requirements-doc.md`
- Investigation notes: `tickets/in-progress/remote-agent-teams/investigation-notes.md`
- Solution revision record: `tickets/in-progress/remote-agent-teams/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/remote-agent-teams/design-spec.md`
- Supplemental task artifacts: `tickets/in-progress/remote-agent-teams/validation-cases.md` (C-01 … C-33, G-1 … G-9, P-1 … P-4); `autobyteus-server-ts/docs/design/collaboration_model.md`
- Design review report: `tickets/in-progress/remote-agent-teams/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/remote-agent-teams/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams`, branch `codex/remote-agent-teams`, base `origin/personal` `4a05909457`. Two implementation commits:

- `9ec78440e2` (step 1, data model): kinded in-memory remote links (`RemoteTaskAgentExecution` / `RemoteTaskTeamExecution`), the stored Team link (`teamRunId`, `coordinatorAddress`, `members`) with validation (C-32, C-33), `delegatedFrom` on the Team tree (tolerant read, exact write), and `agentRunIdsOfTree` as the one endpoint rule (Team link members; the tree's own back-link delegator).
- `13131733b9` (steps 2 … 6): the contract (`targetRoot`, answer union), the endpoints (`pairedAgentRunIds`, `delegated_team`, `teamLinkFor`), the delegating node (Team planning and link; G-3 / G-4 / G-6), the receiving node (`RemoteTeamRunStarter`, `createTeamRun` with `delegatedFrom`, the Team root's back-link and work packet, `RemoteTeamIdleShutdown` + `RootTeamRun.shutDownIfQuiet()`), `RemoteMessageReceiver` by `targetRoot` with the stored-link check before a restore (N-303 / N-304), removal of `REMOTE_TEAMS_NOT_SUPPORTED`, docs and the Nodes tab note.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/remote-agent-teams/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001 … SR-006
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A (the review's non-blocking notes N-301 … N-304 are implemented; see the trace)

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the inter-node contract changed both ways (`targetRoot`, answer union), new persisted fields (the Team link, `delegatedFrom` on Team trees), a new lifecycle (quiet idle shutdown of peer-started Teams), changes across `agent-collaboration`, `agent-team-execution`, `run-history`, `remote-collaboration`, the standalone and Org roots, docs and web text; every remote Team member auto-approves.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The escalation triggers did not fire: no consumer of Team trees or links outside the named files, and `createTeamRun` carries `delegatedFrom` by plumbing only (service → manager → initial tree).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-301 / REQ-301, 303, 304 | B starts a Team run of a shared Agent Team (each agent's default, else the Team's; temp workspace; auto-approve); A's result is the Team-copy shape plus `node` | A: `RemoteDelegation.planActivation` (answer union → Team target `{teamRunId}` entered through the member at `coordinatorAddress`, `ownedAgentRunIds: []`), `beginActivation` → `linkOf` (Team link with members) → `beginRemoteTaskActivation` (`ingressAgentRunId`), work packet with `targetRoot {agent_team, teamRunId}`. B: `RemoteDelegationReceiver` → `RemoteTeamRunStarter.start` → `TeamRunService.createTeamRun({..., delegatedFrom})` → `AgentTeamRunManager.createTeamRun` (tree + `delegatedFrom`) → `RootTeamRun.acceptRemoteWorkPacket` → `TeamRunMessageDelivery.acceptRemoteWorkPacket` (link check, coordinator only) → the coordinator's post (starts only it) | Implemented. In-process test AC-301 case: result `{delegated, copy: {kind: "team", teamRunId, teamCoordinatorAgentRunId}, node, taskId}`; only the coordinator starts; A's stored link and B's `delegatedFrom` asserted on disk. `REMOTE_TEAMS_NOT_SUPPORTED` removed (code, text, branch, tests) |
| BEH-302 / REQ-302 | A Team with an agent no default covers: refused before anything starts, "…target agent team <name> on node <node>."; a default that can't run: its reason | Resolver (unchanged) → `CollaboratorNoDefaultLaunchError(name, "agent_team")`; `peerRefusalText` `NO_DEFAULT_RUNTIME` now words B's reason plus the node (Agent text unchanged) | Implemented; receiver test "REQ-302 / AC-302"; text test in `remote-delegation-receiver.test.ts`. See FU-002 for the two other texts |
| BEH-303 / REQ-305 | Delegator ↔ any member by run ID both ways; a never-started member is woken; team run ID → coordinator guidance; others refused | A: `delegatedTeamEndpoints` (one per member; delegator-only; chain `[{teamRunId}]`; `targetRoot` the Team run). B: `teamRunRemoteLinks` → `delegatorEndpoint(members, delegatedFrom)`. Inbound receiver = the message's target (admitted by `allowsTarget`) in all three roots. G-6: `RootTaskExecutionLifecycle.teamCoordinatorOf` answers from `teamLinkFor` | Implemented; in-process AC-303 case (both logs, one ID each, never-started writer starts, forged sender and non-coordinator packet refused) |
| BEH-303 / REQ-308 | Task closure fences the remote Team both ways (`fenced_remote`); a saved Task to it refused | G-4: `RootTaskExecutionResourceScope.remoteEndpointOf` (a `{teamRunId}` execution → `teamLinkFor` → the coordinator's `delegated_team` endpoint → `closureFence`). G-3: `RemoteEndpointLookup.isRemoteTeam` in `assignToExistingCopy` | Implemented; in-process AC-305 case |
| BEH-304 / REQ-306 | A peer-started Team shuts down after the grace period once every member is quiet; the next message restores it; links survive restarts | `RemoteTeamIdleShutdown` (arms on agent idle / offline / error, background-task end, lease release, and once at root open; cancels on running / initializing) → `RootTeamRun.shutDownIfQuiet()` (in the gate: no open child work or live lease, then `TeamRunBackend.tryPrepareTerminationIfQuiescent()`; then `terminate(quiet)`, which commits the prepared termination instead of fencing). Restore: `RemoteRootDirectory.team` → `resolveManagedTeamRun`; the restored root rebuilds the back-link from its tree | Implemented; DS-004 unit cases (all quiet; not-quiet member keeps the Team and its background-task end re-arms; a message during the grace cancels; open child work skips; a local Team has no idle shutdown) and the in-process AC-304 case (idle → both nodes restart → follow-up restores B's Team → reply wakes A's delegator) |
| BEH-305 / REQ-307 | On B an ordinary Team run in history; the coordinator's first message names the delegator's run ID and node | `TeamRunService.createTeamRun` (catalog `recordTeamRunCreated` as for any Team run); `buildTaskAssigneeWorkPacket({delegatorNode})` | Implemented; the AC-301 case asserts the exact first message |
| G-2 (contract) | Every message and work packet carries `targetRoot`; `coordinatingRun` removed from messages | `remote-run-channel.ts`, `remote-requests.ts`, `peer-gateway.ts` (parses `targetRoot`), `peer-client.ts` (strict answer union), `remote-endpoint.ts` `messageRequest`, `RemoteMessageReceiver` | Implemented; peer-client / peer-gateway / receiver tests |
| N-301 | One pair-rule representation | `RemoteEndpointCore.pairedAgentRunIds`; `pairRule` derives `allowsSender` / `allowsTarget` | Implemented; `pairedAgentRunId` (single) removed |
| N-302 | A config for every planned member; drift → `AGENT_CANNOT_RUN`, a created root terminated | `RemoteTeamRunStarter` passes a member config per resolved member (by address under the mount); the planner's member-set check now throws a typed `TeamLayoutMismatchError` (added / removed / other Agent → refused before creation); a coordinator that differs after creation → `terminateTeamRun` then refused | Implemented; `remote-team-run-starter.test.ts` with the real admission, `TeamRunService` and planner. Nested sub-teams: see Assumptions |
| N-303 / N-304 | Stored-link check before restoring an inactive root, through `RemoteRootDirectory` | `RemoteRootDirectory.storedLinkCheck(targetRoot, query)` → composition → `StandaloneAgentRunRootManager` / `TeamRunService` → `AgentTeamRunManager` / `AgentOrgRunService` → `AgentOrgRunManager` `.storedRemoteLinkCheck` → `storedRemoteLinkCheck(stored links, query)` (`RemoteRunLinks.admitsInbound`, the same rules as the live root) | Implemented; `remote-collaboration` parses no root files. Receiver tests and the in-process N-303 case |
| G-5 | `agentRunIdsOfTree` is the one endpoint rule | Step 1 (`9ec78440e2`); Team store and validator use it | Implemented in step 1; AC-303 / AC-304 cases exercise B's Team log and restore with delegator messages |
| REQ-309 | Docs and the Nodes tab note: Agents and Agent Teams; every agent auto-approves | `docs/modules/remote_collaboration.md`, `agent_team_execution.md` (new § Team Runs Started By A Peer Node), `agent_tools.md`, `agent_communication.md`; `autobyteus-web/localization/messages/{en,zh-CN}/remoteCollaborationSettings.ts` | Implemented; rendered (IMP-06) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

(Paths under `autobyteus-server-ts/src` unless noted.)

- Contract and channel: `agent-collaboration/execution/remote/remote-run-channel.ts`, `remote-collaboration/domain/remote-requests.ts`, `remote-collaboration/channel/peer-client.ts`, `remote-collaboration/channel/peer-gateway.ts`, `remote-collaboration/domain/remote-refusals.ts`, `agent-collaboration/execution/remote/remote-refusal-codes.ts`.
- Endpoints and links: `agent-collaboration/execution/remote/remote-endpoint.ts`, `remote-run-links.ts` (`teamLinkFor`, `admitsWorkPacket`, `admitsInbound`, `storedRemoteLinkCheck`).
- Delegating node: `agent-collaboration/execution/remote/remote-delegation.ts`, `remote-task-activation.ts`; `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (G-3, G-6, `hasLiveLeases`, `onLiveLeaseReleased`), `root-task-execution-resource-scope.ts` (G-4), `task-execution-live-holds.ts`; the three roots' tree mutators and task adapters (link union).
- Receiving node: `remote-collaboration/inbound/remote-team-run-starter.ts` (new), `remote-delegation-receiver.ts`, `remote-message-receiver.ts`; `agent-team-execution/domain/team-run-remote-links.ts` (new), `domain/root-team-run.ts`, `services/remote-team-idle-shutdown.ts` (new), `services/team-run-message-delivery.ts`, `services/team-run-service.ts`, `services/agent-team-run-manager.ts`, `services/flat-team-topology-planner.ts` (`TeamLayoutMismatchError`); stored-link checks in `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts`, `agent-org-execution/services/agent-org-run-manager.ts` / `agent-org-run-service.ts`; `compositions/remote-collaboration-composition.ts`.
- Message deliveries (receiver = the message's target): `standalone-root-message-delivery.ts`, `team-run-message-delivery.ts`, `agent-org-run-message-delivery.ts`.
- Tests: `tests/unit/remote-collaboration/` (`team-remote-delegation.test.ts`, `remote-team-run-starter.test.ts`, `remote-message-receiver.test.ts` new; `peer-client`, `peer-gateway`, `remote-delegation-receiver`, `remote-messaging-owners`, `remote-link-walkers`, `standalone-remote-delegation` updated); step 1's `remote-task-execution-links.test.ts` and `tests/unit/run-history/store/team-tree-delegated-from.test.ts`.

## Important Assumptions

1. **Standalone back-link in `agentRunIdsOfTree` (step 1).** The design moves the standalone store's separate back-link parameter "into the standalone shape". A standalone tree does not hold `delegatedFrom` (it is in `run_metadata.json`), so `agentRunIdsOfTree(shape, tree, backLink = shape.storedBackLink(tree))` takes it as a parameter: the Team shape reads it from the tree, the standalone shape returns `null` and its store is given the back-link. One rule, every store and validator.
2. **Nested sub-teams (N-302's test).** Agent Team definitions are flat: `FlatTeamDefinitionResolver` resolves direct Agent members only (`TeamMember` has no team reference), so a Team with a nested sub-team cannot be defined. The starter test covers several members, the mount rebasing (`/studio_team/x` ↔ `/x`) and every drift kind through the real planner.
3. **Drift detection.** `createTeamRun` plans before it creates, so a member added, removed or of another Agent is refused before any root exists (`TeamLayoutMismatchError`, a typed form of the planner's existing three errors; their messages are unchanged for local callers). Only a changed coordinator is visible after creation; that root is terminated, then refused.
4. **Answer member addresses** are mounted at the catalog address (`/studio_team/lead`), as A addresses them (the design's on-disk example). B's tree keeps the root-relative addresses (`/lead`). `peerStartedTeamMembers(tree)` is the one member set for the answer and for B's pair rule.
5. **Idle schedule extra arm.** `RemoteTeamIdleShutdown` also arms once when the root opens (create or restore), so a Team that never gets work (RSK-301: A failed after B started it) stops after the grace period. The lease-release signal comes from a new `onRelease` hook on `TaskExecutionLiveHolds` through `RootTaskExecutionLifecycle` (`onLiveLeaseReleased`).
6. **Quiet termination path.** `RootTeamRun.terminate(quiet?)`: with a prepared quiet termination it commits that instead of freezing and fencing; the rest of the teardown is the Stop's. A Stop that wins the race cancels the prepared quiet termination. The history catalog's `terminatedAt` is not written on idle shutdown (as on fail-stop); the run's active state comes from the manager.
7. **The Team root sends through the process `RemoteRunChannel`** (as its `RemoteDelegation` already did); only the standalone root takes a channel option.
8. **Work packet target** must be the Team's coordinator (stricter than the pair rule, which allows any member).
9. **`storedLinkCheck`** answers `proceed` for a root that is registered or loading (it is checked in memory after resolve), `not_found` without a stored package (or a standalone run that cannot host one), else the stored links' verdict. A work packet naming an `agent_org` root is not found (Orgs are never started for a peer).

## Known Risks

- **Refusal wording for Teams (FU-002).** `AGENT_CANNOT_RUN` reads "The Agent <Team name> on node … cannot run there: …" and `AGENT_NOT_FOUND` "…has no Agent at /team…" for a Team: A words B's refusal without the target's kind, and changing them would alter 245's Agent texts (preserved) or the contract. `NO_DEFAULT_RUNTIME` (REQ-302) is correct for both.
- **Tool text (FU-003).** The `node` parameter description ("the address of an agent on that node") is a pinned, user-approved text; I changed it and reverted it when its test failed, since REQ-309 covers only docs and the Nodes tab.
- **Stale E2E assertion.** `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts:622` still expects `REMOTE_TEAMS_NOT_SUPPORTED` for `/review_squad`; it fails now by design (API/E2E owns the E2E update).
- **DS-004 not-quiet cases in unit tests.** "Waiting for tool approval" and "a running background task" are modelled by the agent-run manager declining `tryPrepareAgentRunTerminationIfQuiescent` for that member (the real checks live in `AgentRunManager` / `hasRunningBackgroundTasks`). The Team-level all-or-nothing preparation is the real `FlatTeamExecutionManager` one.
- **Contract change both ways.** A node on this build and a node on 245 cannot talk (no version field, DESIGN rule; both nodes must run the same build).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: feature extension with targeted generalization (kinded links, endpoint kinds, symmetric `targetRoot`).
- Reviewed root-cause classification: three missing structures (Team link, pair sets, root naming in messages) — `design-spec.md` § Task Design Health Assessment.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): the decisions listed in the design only; no other refactor.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the only structural additions beyond the file map are small owned helpers: `team-run-remote-links.ts` (the Team root's links and member set, shared by the live root and the stored check) and `TeamLayoutMismatchError` in the planner (N-302 needs to tell drift from other failures).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no `coordinatingRun` beside `targetRoot`; an Agent answer without `kind` is refused, per the rejection log)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — `REMOTE_TEAMS_NOT_SUPPORTED` (code, text, receiver branch, tests), the message field `coordinatingRun` and the receiver's standalone guess, `pairedAgentRunId`, the receiver's unused `policy` dependency, a duplicated doc comment and blank lines in `root-team-run.ts`.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` — the link and answer are discriminated unions; the endpoint kinds share one core.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — largest effective sizes: `root-team-run.ts` 497 (471 at base; the work-packet logic went into `TeamRunMessageDelivery` to stay under 500), `standalone-agent-run-root.ts` 472, `root-task-execution-lifecycle.ts` 477, `agent-org-run-manager.ts` 470. Largest delta: `remote-team-run-starter.ts` +97 (new); no file over 220 changed lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (new optional fields only; no migration)
- Design-spec decision reference: `design-spec.md` § On-Disk Data Model, "Persisted-data decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: step 1 tests: a Team tree without `delegatedFrom` reads and writes without the key; stored Agent links keep their shape (no `kind` on disk); invalid Team links are left out with a warning (C-32, C-33).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are untracked build outputs in the worktree; not part of this change.
- Test-owned data only: every check used temp directories (`os.tmpdir()`), the test SQLite DB under `autobyteus-server-ts/tests/.tmp/`, and a web dev server on `127.0.0.1:3947` with no backend, stopped after use. Nothing touched `~/.autobyteus` data or the user's running app (the browser tool's screenshot was copied from its artifact folder into the ticket's evidence).

## Checks Run

Evidence folder: `tickets/in-progress/remote-agent-teams/evidence/implementation/`. Environment for all: macOS Darwin 25.5.0, Node from the worktree toolchain.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `npx tsc -p tsconfig.build.json --noEmit` (`autobyteus-server-ts`) | `13131733b9` | macOS | all server sources | all | Pass | `IMP-01-server-typecheck.log` | `TYPECHECK EXIT 0` |
| IMP-02 | `npx vitest run tests/unit/remote-collaboration tests/unit/run-history/store` | `13131733b9` | macOS | contract, endpoints, links, receivers, starter, in-process A→B Team flow, idle shutdown, stored links, step-1 data model | BEH-301 … 305, G-2, N-301 … N-304, AC-301 … 305 (implementation level) | Pass | `IMP-02-remote-and-store-tests.log` | `Test Files  24 passed (24)`, `Tests  163 passed (163)` |
| IMP-03 | `npx vitest run tests/unit/agent-team-execution tests/unit/agent-collaboration tests/unit/standalone-agent-run-root tests/unit/agent-org-execution tests/unit/agent-tools` | `13131733b9` | macOS | the three roots, lifecycle, Team service / manager / planner, tool texts (preserved behavior) | AC-306 (unit level) | Pass | `IMP-03-affected-areas.log` | `Test Files  143 passed (143)`, `Tests  1214 passed (1214)` |
| IMP-04 | `npx vitest run tests/unit` (`autobyteus-server-ts`) | `13131733b9` | macOS | the whole server unit suite | AC-306 (unit level) | Pass | `IMP-04-server-unit-full-excerpt.log`, `IMP-04-server-unit-full.log` | `Test Files  783 passed \| 4 skipped (787)`, `Tests  6435 passed \| 7 skipped (6442)` (the `APP_DATA_STARTUP_GATE_FAILED` lines are expected output of the startup-gate tests) |
| IMP-05 | `npx vitest run components/settings/__tests__/RemoteCollaborationCard.spec.ts localization` (`autobyteus-web`) | `13131733b9` | macOS | the Nodes tab card and the en / zh-CN catalogs (key parity, glossary) | REQ-309 | Pass | `IMP-05-web-card-localization.log` | `Test Files  15 passed (15)`, `Tests  41 passed (41)` |
| IMP-06 | `nuxt dev --port 3947 --host 127.0.0.1` (no backend), open `/nodes?nodeTab=remoteCollaboration`, read the availability section, screenshot | `13131733b9` working tree (web text identical) | macOS, built-in browser tool | `RemoteCollaborationCard.vue` with the new en text | REQ-309 | Pass | `IMP-06-nodes-tab-availability-note.png` | the heading "Agents and Agent Teams available to peers" and the note's "every agent of the run has its tool calls auto-approved" |

- Not run, and why:
  - the two-server E2E (`tests/e2e/remote-collaboration/…`, AC-301 … AC-306) and its update for Teams (including line 622): API/E2E's;
  - `tests/integration`: not run (needs the integration prerequisites; the Team service and manager paths it covers are exercised at unit level by IMP-02 / IMP-03 with the real manager, backend and stores);
  - the full web suite: not run; the web change is two localization values (IMP-05 covers the card and the catalog checks);
  - zh-CN rendering: not inspected in the browser (the string is covered by the localization specs).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Nodes → Remote Collaboration tab, "available to peers" section (text only).
- Approved UI/UX, interaction, requirement, or design references: REQ-309; `design-spec.md` § Final File Responsibility Mapping (Nodes tab note, web localization).
- Existing design system, shared components, and adjacent product surfaces reviewed: `RemoteCollaborationCard.vue` (unchanged markup; heading + gray note), the peers section above it; the localization glossary specs (zh-CN "智能体团队").
- Testing guideline or development / preview instructions and rendered surface used: the web dev server (`nuxt dev`) on a test port, no backend.
- States, layouts, viewports, and interactions inspected: the default desktop width in the browser tool; the section renders regardless of the switch and peer state; the longer heading stays on one line and the note wraps within the card.
- Visual or interaction issues found and corrected: none.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-05, IMP-06; zh-CN and narrow widths not rendered.

## Downstream Coverage Hints / Suggested Scenarios

- Two-server E2E, building on `remote-delegation-two-server.e2e.test.ts`: a shared Team on B (two members with defaults, one without → Team default); AC-301 (the result's `target_team_run_id`, `target_team_coordinator_agent_run_id`, `node`; only the coordinator starts; its first message); AC-302 (a member with no default and no Team default → "…target agent team <name> on node <node>."; nothing on either node); AC-303 (coordinator ↔ delegator; delegator → a never-started member and its reply; a message to the team run ID → coordinator guidance; another run on A → not permitted); AC-304 (idle shutdown with a short `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`, then restart B, then restart A); AC-305 (closure fence both ways, `fenced_remote`, saved Task refused); AC-306 (slice 1 and 245 suites, local Team copy suites).
- Replace the line-622 case (`/review_squad` refused as a Team) with the Team flow, or with the FU-002 texts once decided.
- On B, check that the Team run appears in run history and can be opened and stopped (BEH-305), and that a Stop during the idle grace period wins cleanly.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All of AC-301 … AC-306 at the two-server level, and BEH-305 in the real UI on B.
- The real-runtime quiet rule (tool-approval wait, running background task) through the actual `AgentRunManager`, with a short grace period.
