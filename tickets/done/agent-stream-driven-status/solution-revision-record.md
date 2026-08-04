# Solution Revision Record

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This record is the durable solution-round and rationale index only.

## Current Authority (2026-08-03)

`SR-008` is the current solution authority. `ARCH-REV-007` accepted the `SR-007` Codex provider design and the server/admitted-request interrupt acknowledgement contract, but failed the overall design on `ARCH-FIND-004`: canonical Running may survive a disconnected/reconnecting socket, and synchronous send failure after pending registration had no rollback/feedback/false-return transition. `SR-008` adds one shared frontend failure-safe admission helper used by both streaming services. It registers the exact entry, gates on `CONNECTED`, attempts send, atomically deletes/reports exact local failure on nonconnection or throw, returns false when not admitted, and lets later disconnect drain only entries still pending. No server acknowledgement is fabricated and no lifecycle, team liveness, transcript, provider, or reconnect retry semantics change. It is ready for focused architecture re-review, not implementation.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution Designer / initial approved solution baseline / round 1 | N/A | Initial Baseline | Ready for architecture review |
| SR-002 | Architecture Reviewer / `ARCH-REV-001` / round 1 rework | `ARCH-FIND-001`, `ARCH-FIND-002` | Design Impact | Revised solution ready for architecture re-review |
| SR-003 | User-approved requirements expansion after `ARCH-REV-002` / expanded solution round | N/A (requirements expansion) | Requirement And Design Expansion | Complete expanded solution ready for fresh architecture review |
| SR-004 | Architecture Reviewer / `ARCH-REV-003` / round 3 rework | `ARCH-FIND-003` | Design Impact | Scoped recursive snapshot contract ready for architecture re-review |
| SR-005 | Code Reviewer / `CRR-003` / expanded source review round 3 | `CODE-FIND-002`, `CODE-FIND-003` | Design Impact (controlling) + Local Fix | Coordinate-consistent task-team stream scope ready for architecture re-review |
| SR-006 | User feedback during `DR-004` explicit verification hold | N/A (approved presentation correction) | Requirement And Presentation Change | Binary group and exact-run activity indicators ready for fresh architecture review |
| SR-007 | User live verification and approval after `DR-005` | N/A (approved defect refinement) | Provider Identity Fix + Control-Result Contract Completion | Codex exact-turn steering and interrupt-result design ready for architecture review |
| SR-008 | Architecture Reviewer / `ARCH-REV-007` / round 7 rework | `ARCH-FIND-004` | Design Impact | Failure-safe immediate interrupt admission ready for architecture re-review |

## Revision Entries

### SR-001 — Status-only lifecycle and stream-companion baseline

- Triggering role, report path, and round: Solution Designer; initial solution package; round 1
- Triggering finding IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result at baseline: User-approved requirements and an initial architecture-review design proposal for one backend-owned five-state lifecycle, status companions on every final agent event, current/retired turn safety, removal of separate interrupt permission, and unified composer action guarding.
- Why this baseline or revision entry is recorded: Establish the initial architecture-review baseline required before implementation.
- Resolution: Treat `running` as the sole public busy/interruptible state; derive status from command/runtime/current-turn facts; make lifecycle projection the final event-pipeline stage; preserve exact interrupt identity; remove `can_interrupt`/`canInterrupt`; narrow local sending state to submission pending; route click and Enter through one discriminated action policy.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; REQ-001–REQ-012; AC-001–AC-015
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — approved requirements basis
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — current production paths, evidence, and design investigation
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — full target spines, ownership, removals, interfaces, file mapping, and sequence
- Supplemental artifacts updated, added, or removed:
  - Retained `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` as evidence-only.
  - Retained `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` as user-supplied evidence.
- Downstream and architecture-review impact: Architecture review must validate the finalizer-stage design, `AgentRun`/lifecycle ownership split, clean contract removal, current-turn promotion safety, snapshot ordering, and frontend action guard before implementation.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture review should challenge high-frequency companion cost, runtime snapshot fallback ordering, and current-versus-retired activity promotion; cross-runtime executable evidence remains downstream API/E2E work.

### SR-002 — Single `AgentRun` event gateway and canonical snapshot precedence

- Triggering role, report path, and round: Architecture Reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`; `ARCH-REV-001` / architecture review round 1
- Triggering finding IDs: `ARCH-FIND-001`, `ARCH-FIND-002`
- Prior authoritative result: `ARCH-REV-001` / `Fail` / `Design Impact`
- Current authoritative result: The revised solution inventories every production runtime, local, and processor-derived `AgentRunEvent` origin; makes `AgentRun` the sole serialized processing/finalization/listener gateway; and defines one run-owned lifecycle reconciliation/read/publication path with explicit startup/current-turn precedence. The package is ready for architecture re-review, not implementation.
- Why this revision entry is recorded: The initial backend-only finalizer design omitted supported local event origins and did not make fresh backend current-turn evidence authoritative over a retained startup override.
- Resolution:
  - `ARCH-FIND-001`: ORIGIN-001–ORIGIN-007 now cover all production outward origins. Runtime backends expose neutral source batches; `AgentRun` subscribes once and owns the queue/listeners; local producers await `AgentRun.publishEvent`; local lifecycle facts use the same queued state/canonicalizer; processor-derived events are finalized last; `emitLocalEvent` and backend public dispatch are removed.
  - `ARCH-FIND-002`: `statusOverride` and active-run direct broadcaster replacement are removed. Each `AgentRun` owns one `AgentTurnLifecycleState`; backend adapters expose a tight internal lifecycle snapshot with current-turn evidence; command acceptance, finalization, and `getStatusSnapshot()` reconcile that same state. Fresh identified/anonymous current-turn evidence promotes stale `initializing`, while racy idle/initializing cannot close an identified turn.
- Approved behavior or requirement IDs affected: No intended-behavior change; BEH-001–BEH-004 evidence and target paths refined; REQ-001–REQ-012 and AC-001–AC-015 remain the user-approved authority.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — current-behavior evidence for local bypass and reconnect race; approved intended behavior unchanged
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — production origin inventory, exact bypass call sites, startup race, and precedence constraints
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — DS-003/DS-004/DS-006/DS-007/DS-009, ownership/dependencies/interfaces/files/removals/sequence, full origin coverage, canonical snapshot rules, and concrete race/local-event examples
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-002`
- Supplemental and triggering artifacts retained:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
- Downstream and architecture-review impact: Architecture must re-review both high findings before implementation. If approved, implementation must perform the backend event-contract cut and local caller migration before frontend work; direct backend/dispatcher tests must move through `AgentRun` rather than preserve compatibility seams.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture approval is pending. Implementation/API-E2E must prove cross-runtime source ordering, the exact startup/reconnect race, all local-origin companions, awaited local publication behavior, and status volume; none of those require another design authority if the revised boundary passes.

### SR-003 — Manager-owned binary team liveness and aggregate-team removal

- Triggering role, report path, and round: User-approved requirements expansion following the `SR-002` implementation/code-review stage; expanded solution round; evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
- Triggering finding IDs: N/A — this is a material user requirement expansion, not an architecture finding.
- Prior authoritative result: `ARCH-REV-002` / `Pass` for `SR-002`; agent implementation and code review completed through branch commit `24256a6af`. The complete prior design became superseded when the user rejected definition/root aggregate team status.
- Current authoritative result: The complete user-approved basis now separates agent lifecycle, team-definition metadata, root-team liveness, task stage, operation failure, request pending, and socket state. `SR-003` preserves the reviewed agent gateway/snapshot/action foundation and provides an implementation-ready clean cut for aggregate team status. Fresh architecture review is required before source rework.
- Why this revision entry is recorded: The prior design intentionally preserved `deriveTeamApiStatus`/`TEAM_STATUS`. The second investigation proved that public team liveness already has a narrower authoritative owner and that the aggregate creates invalid definition presentation, circular frontend state, and hidden task/failure/settlement coupling.
- Resolution:
  - Team definitions carry no runtime status or status visual.
  - Root team runs expose only manager-owned `isActive`; the manager supplies an exact-run lifecycle snapshot/subscription and the team socket carries minimal `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`.
  - Aggregate `TeamStatusPayload`, `AgentTeamStatus`, root/nested `TEAM_STATUS`, root/team `currentStatus`, status-to-active conversions, team status visuals, and compatibility paths are deleted.
  - Mixed agent/team handle contracts are specialized: initial status snapshots recursively flatten actual leaf agents, while subteams/task teams no longer masquerade as agent status subjects.
  - Task terminal events/record reconciliation own task-team UI cleanup; canonical leaf-agent failure and explicit operation results own failures; a private `TeamRun.hasOpenExecutionWork()` predicate owns settlement safety.
  - Stop uses `isActive` plus local `stopPending`; failed termination leaves activity true; socket disconnect never changes liveness.
- Approved behavior or requirement IDs affected: BEH-006–BEH-009 and their interaction with BEH-001–BEH-005; REQ-013–REQ-019; AC-016–AC-025. REQ-001–REQ-012 and AC-001–AC-015 are preserved.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — complete approved agent/team subject model and acceptance criteria
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — second investigation, nested snapshot/termination/task cleanup evidence, branch continuation state, and review risks
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — revised behavior map, DS-008/DS-010–DS-012, manager lifecycle boundary, recursive leaf snapshots, consumer reassignment, removals, interfaces, file mapping, and sequence
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-003`
- Supplemental and triggering artifacts retained:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md` as prior `ARCH-REV-002` context
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-handoff.md`, implementation/code-review revision records, and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md` as evidence of the preserved branch starting state
- Downstream and architecture-review impact: Architecture must review the complete expanded boundary, with special attention to manager lifecycle notification after backend listener teardown, recursive nested leaf snapshot identity, deletion of generic team-as-agent handle contracts, and completeness of task/failure/open-work replacements. Only after a pass should implementation perform team source rework while preserving the reviewed agent foundation and held API/E2E edits.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture approval is pending for `SR-003`. Manager unregister notification coverage, nested snapshot identity parity, task cleanup after aggregate removal, and work-predicate semantics are review/implementation risks. The API/E2E engineer's held uncommitted test changes require later reconciliation and must not be overwritten during source rework.

### SR-004 — Scoped recursive initial leaf snapshots

- Triggering role, report path, and round: Architecture Reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`; `ARCH-REV-003` / architecture review round 3
- Triggering finding IDs: `ARCH-FIND-003`
- Prior authoritative result: `ARCH-REV-003` / `Fail` / `Design Impact`
- Current authoritative result: The revised design makes every recursive initial leaf snapshot capable of carrying the same task-team execution scope as a live `TeamRunEvent`. It is ready for architecture re-review, not implementation. The approved team simplification and all other `SR-003` behavior remain unchanged.
- Why this revision entry is recorded: `SR-003` promised live/reconnect leaf identity parity but specified `AgentStatusPayload[]` at the recursive snapshot boundary. That payload intentionally has no task-team run/instance/logical-team envelope, so reconnect mapping could not represent the exact transient task-team leaf.
- Resolution:
  - `ARCH-FIND-003`: Add a discriminated internal `TeamLeafAgentStatusSnapshot` that composes a required leaf `AgentStatusPayload` specialization with either ordinary scope or one complete cloned `TaskTeamInstanceIdentity`; do not add task-team fields to standalone `AgentStatusPayload`.
  - Change `TeamRun`, `TeamRunBackend`, `TeamManager`, and all mixed member handles to the exact `getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` contract. Leaf handles create one ordinary carrier; ordinary subteams preserve child scope; task-team handles stamp their exact execution identity.
  - Extract `prefixMixedTeamAgentScope` as the single member/source path and task-team-scope prefix core used by both live-event and initial-snapshot adapters.
  - Extract `buildTaskTeamScopedIdentityPayload` as the single tight task-team wire flattener used by live and initial stream mapping. The initial snapshot service must retain the carrier through `mapTeamLeafAgentStatusSnapshot` rather than unwrap it early.
  - Add a concrete nested task-team example proving root-relative member/source paths, agent run identity, task-team run/instance/task/logical-team identity, relative member identity, and the resulting frontend scoped route.
- Approved behavior or requirement IDs affected: No intended-behavior change; BEH-009, REQ-017, and AC-021 are specified more precisely. BEH-001–BEH-008, REQ-001–REQ-016/REQ-018–REQ-019, and AC-001–AC-020/AC-022–AC-025 remain unchanged.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — approved intended behavior unchanged
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — `ARCH-REV-003` source evidence, live/initial representability finding, constraints, and review note
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — scoped carrier, exact recursive signatures, shared prefix/flatten functions, mapping order, nested example, file ownership, sequence, risks, and implementation guidance
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-004`
- Supplemental and triggering artifacts retained:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
- Downstream and architecture-review impact: Architecture should re-review `ARCH-FIND-003` specifically and confirm that the carrier remains intact through initial stream mapping and that live/initial paths share both identity functions. Implementation remains blocked until pass; the preserved source foundation and held API/E2E files are unchanged.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture approval remains pending. Implementation must avoid early carrier unwrapping, double prefixing, or copied relative-path logic and must prove live/initial identity parity for nested task-team leaves. Held API/E2E work still requires later reconciliation after source review.

### SR-005 — One coordinate frame for nested task-team leaf streams

- Triggering role, report path, and round: Code Reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md`; `CRR-003` / expanded source review round 3
- Triggering finding IDs: `CODE-FIND-002`, `CODE-FIND-003`
- Prior authoritative result: `CRR-003` / `Fail`; controlling classification `Design Impact`. `ARCH-REV-004` had passed `SR-004`, and `IR-003` implemented it before the nested coordinate defect was reproduced.
- Current authoritative result: The revised design gives all outward nested task-team events and recursive leaf snapshots one explicit enclosing-`TeamRun` coordinate frame. It is ready for architecture re-review, not implementation. `CODE-FIND-003` is recorded as required implementation-local work after a pass; it does not change the production manager contract.
- Why this revision entry is recorded: A supported `root -> ordinary subteam -> task team -> leaf` flow made source/member paths root-relative while retaining a child-local `TaskTeamInstanceIdentity.logicalTeam` path. Live mapping lost the leaf selector and reconnect mapping threw. The implementation followed `SR-004`, so this was a design defect rather than an unauthorized local source deviation.
- Resolution:
  - `CODE-FIND-002`: Keep operational `TaskTeamInstanceIdentity` unchanged and local to task activation, directories, persistence, ingress, coordinator selection, and delivery. Derive only `TaskTeamStreamScope { taskTeamRunId, taskTeamInstanceId, taskId, logicalTeamPath, logicalTeamRouteKey }` for outward live/snapshot recursion.
  - Replace the leaf-only prefix helper with one `prefixMixedTeamStreamScope` core used by every `TeamRunEvent` type and `TeamLeafAgentStatusSnapshot`. A task-team handle supplies a scope override already built in its immediate parent frame; every ordinary parent rebases a retained logical-team path with the same prefix rule as source/member paths and rebuilds all route keys.
  - Make the mixed-team boundary assert that carrier `teamRunId`, source path, agent member path, and task-team logical-team path share one frame. Keep the stream mapper strict: it only subtracts consistent paths and never guesses, prefixes, or falls back to a task-team root.
  - Specify exact event/snapshot contracts, method signatures, all-event and leaf adapters, mapper functions, and a concrete multi-boundary live/reconnect example that resolves `task-team-run-7/review_group/critic` identically in both paths.
  - `CODE-FIND-003`: After architecture approval, extend the stale `TeamRunService` unit manager double with the already-required `subscribeToLifecycle` and `getLifecycleSnapshot` methods and rerun all 13 focused tests. No optional production fallback is authorized.
- Approved behavior or requirement IDs affected: No intended-behavior change; BEH-009, REQ-017, and AC-021 now state the already-approved “any team depth” coordinate-frame/live-reconnect parity more explicitly. All other BEH-001–BEH-008, REQ-001–REQ-016/REQ-018–REQ-019, and AC-001–AC-020/AC-022–AC-025 remain unchanged.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — nested current defect and exact any-depth live/reconnect acceptance language; intended behavior unchanged
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — `CRR-003`/`CR-MP-002` evidence, reachable product path, coordinate-frame root cause, tight-carrier rationale, and local fixture classification
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — `TaskTeamStreamScope`, coordinate invariant, shared all-event/live/snapshot rebaser, strict mapper boundary, exact multi-boundary example, file ownership, sequence, risks, and implementation guidance
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-005`
- Supplemental and triggering artifacts retained:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-revision-record.md`
- Downstream and architecture-review impact: Architecture must re-review the complete `SR-005` coordinate contract before implementation. If it passes, implementation produces a new revision that changes the internal carrier/bridge/mapper, adds multi-boundary live/reconnect coverage, fixes the stale manager test double, and returns to code review. API/E2E remains blocked and its held edits remain untouched until source review passes.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture approval is pending for the target-frame override, ordinary-boundary rebase, all-event coverage, strict leaf invariant, and exact live/reconnect parity. The held API/E2E investigation and edits are stale for this revision and must later be reconciled rather than treated as sign-off.

### SR-006 — Binary team activity indicators at group and exact-run levels

- Triggering role, report path, and round: User feedback during the explicit delivery verification hold for `DR-004`; user-supplied screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png`; post-delivery presentation round
- Triggering finding IDs: N/A — this is a user-approved presentation correction, not a downstream finding.
- Prior authoritative result: `SR-005` passed `ARCH-REV-005`, was implemented as `IR-004`, passed source review in `CRR-004`, passed fresh API/E2E investigation/execution in `API-REV-002`, and passed proportional durable-test review. Delivery `DR-004` built a local candidate and correctly waited for explicit user verification.
- Current authoritative result: `SR-006` adds binary activity cues at both levels users scan: an exact team-run row reflects only that run's `isActive`, and its definition group reflects whether any displayed child run is active. It is design-ready for fresh architecture review. The prior delivery candidate must not be finalized as the completed result.
- Why this revision entry is recorded: Removing the former borrowed five-state team dots correctly simplified domain status ownership, but removing all team activity visuals also removed useful scan information. Exact-row activity answers “which run can I stop?” while definition-group activity answers “does this collapsed agent-team definition contain any active runs?” Both can be represented directly from the already-authoritative binary lifecycle without recreating aggregate team status.
- Resolution:
  - Add a boolean-only `TeamActivityDot` presentation primitive with `isActive` and a localized accessible label; active is solid blue, inactive solid gray, and neither state pulses.
  - Exact history/running team-run rows pass their own `teamRun.isActive`/`team.isActive` directly to the dot.
  - Agent-team definition groups derive `hasActiveRuns = runs.some(run => run.isActive)` from the final displayed child list and render one group dot. The value is not persisted, transported, or installed as definition lifecycle state.
  - Keep agent `StatusDot` and its five-state/pulsing behavior unchanged. Do not map team activity to `running`/`offline`, inspect member statuses, use socket state, use the representative run, or couple the dot to Stop availability/pending state.
  - Preserve every accepted `SR-005` server, GraphQL, WebSocket, task-team identity, leaf-agent status, and Stop mutation contract. This revision is a bounded frontend presentation change plus focused coverage and localization.
- Approved behavior or requirement IDs affected: BEH-006 and BEH-008 are refined; REQ-013 and REQ-016 are clarified; new REQ-020 specifies both indicators; AC-016 and AC-023 are refined; new AC-026 verifies exact/group semantics. BEH-001–BEH-005/BEH-007/BEH-009, REQ-001–REQ-012/REQ-014–REQ-015/REQ-017–REQ-019, and AC-001–AC-015/AC-017–AC-022/AC-024–AC-025 remain preserved.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — user-approved two-level binary presentation requirements and acceptance criteria
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — accepted integrated baseline, current frontend component trace, user-feedback evidence, root-cause classification, and implementation constraints
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — `DS-013`, exact projection formulas, boolean-only component contract, surface/file mapping, rejection rules, sequence, coverage, and risks
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-006`
- Supplemental and triggering artifacts retained or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md` — updated with the distinction between prohibited aggregate lifecycle and allowed binary presentation projections
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png`
  - All accepted `SR-005` architecture, implementation, code-review, API/E2E, proportional test-review, and delivery-hold artifacts remain cumulative baseline evidence; they are not current `SR-006` sign-off.
- Downstream and architecture-review impact: Architecture should verify that the group summary remains a presentation-only projection, that the exact row uses only its own binary lifecycle, that a separate component prevents reintroduction of five-state team semantics, and that both history and running surfaces are covered. On pass, implementation adds the bounded frontend change and local tests; source review follows; API/E2E performs a fresh coverage investigation; delivery refreshes against the latest base, rebuilds, and prepares new explicit verification.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. The main implementation risks are computing group activity before the final history/current run merge, accidentally coupling dots to representative/member/socket/action state, or reusing the pulsing agent component. Focused coverage must prove mixed active/inactive siblings, all-inactive transition, both group-building paths, history/running parity, accessibility, and unchanged agent visuals/actions.

### SR-007 — Exact Codex current-turn steering and observable interrupt results

- Triggering role, report path, and round: User live Electron verification and follow-up approval after delivery candidate `DR-005`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/codex-steering-stale-running-evidence.md`; post-delivery defect-refinement round
- Triggering finding IDs: N/A — this is a user-reproduced and user-approved product defect refinement, not a downstream review finding.
- Prior authoritative result: The complete `SR-006` foundation passed `ARCH-REV-006`, was implemented as `IR-005`, passed source review in `CRR-007`, passed fresh API/E2E in `API-REV-003`, passed proportional durable-test review in `CRR-008`, and reached delivery candidate `DR-005` for explicit user verification.
- Current authoritative result: `SR-007` is requirements- and design-ready for architecture review. It preserves the accepted agent lifecycle, binary team activity, two-level team presentation, nested task-team identity, exact member routing, current/retired-turn safeguards, and native AutoByteus queued-turn model. No implementation is authorized until architecture passes this revision.
- Why this revision entry is recorded: In the live Article Writing Team candidate, native Codex opened/completed turn A and accepted reviewer input inside A. The AutoByteus Codex adapter nevertheless called `turn/start`, recorded response/request identity B as current, and retained B after terminal A. The server then snapshotted `running` while Codex had no active provider turn. Seventeen exact Stop requests reached the correct member and failed with `No active turn id`, but the current transport logged those results without returning a general interrupt acknowledgement, so the UI appeared inert.
- Resolution:
  - Add BEH-010 / REQ-021 / AC-027–AC-028: serialize Codex input submission inside `CodexThread`; after startup and prior queued submission, read the owned current provider turn. No current turn uses `turn/start`, requires its nested returned turn ID, and reconciles that response with independently processed start/terminal notifications so it cannot reopen S. Current A uses `turn/steer(expectedTurnId=A)`, requires returned A, and never calls `markTurnStarted` or otherwise mutates current lifecycle identity.
  - Make start and steer response parsing method-specific. Provider precondition rejection, malformed response, or returned-ID mismatch produces a typed structured failure with no start fallback, no phantom B, and no lifecycle repair heuristic. A terminal event racing a successful steer remains authoritative and cannot be undone by the response.
  - Keep runtime-neutral `AgentRun`/team/inter-agent callers and `AgentOperationResult` intact. Busy accepted-input/memory correlation receives A; `TURN_COMPLETED(A)` or interruption/failure settles A through the accepted canonical lifecycle. Native AutoByteus retains FIFO queued later turns and is not changed to steering.
  - Add BEH-011 / REQ-022 / AC-029: widen existing `AGENT_COMMAND_ACK` into tight SEND_MESSAGE and INTERRUPT_GENERATION arms. Both standalone and exact-team-member handlers return one same-connection accepted/rejected/failed result with client command ID and exact target identity for supported product requests.
  - Add ephemeral frontend command-ID/target matching in both streaming services, intercept team control acknowledgements before task/member projection, and surface matched rejection/failure as localized toast feedback. Accepted control acknowledgement clears only correlation; canonical provider terminal/status remains the sole authority for idle. Disconnect uses a separate local transport-failure callback rather than fabricating a server acknowledgement.
- Approved behavior or requirement IDs affected: New BEH-010–BEH-011, REQ-021–REQ-022, and AC-027–AC-029. BEH-001–BEH-009, REQ-001–REQ-020, and AC-001–AC-026 remain preserved except where those existing lifecycle/action guarantees are strengthened by eliminating the proven phantom identity.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — approved Codex same-turn identity and observable interrupt-result behavior, requirements, acceptance criteria, preserved scope, and risks
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — live IDs/logs, provider/native/runtime comparison, source/schema trace, root-cause classification, user approval, and native AutoByteus preservation decision
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — DS-014/DS-015, serialized provider branch, exact response/failure contracts, interrupt acknowledgement union, frontend matching/feedback, files, sequence, coverage, and risks
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/codex-steering-stale-running-evidence.md` — evidence-only live/native/AutoByteus/protocol/source correlation and focused constraints
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-007` and updated current authority/index
- Supplemental and triggering artifacts retained:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_638f89bebf84__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_3456bc49f3dc__image.png`
  - All accepted `SR-006` architecture, implementation, source-review, API/E2E, proportional test-review, and delivery-candidate artifacts remain cumulative baseline evidence; they are not current `SR-007` sign-off.
- Downstream and architecture-review impact: Architecture should review provider ownership/serialization, distinct schema parsing, race behavior, no-fallback identity safety, acknowledgement completeness, exact target matching, and the canonical-lifecycle boundary. On pass, implementation performs the bounded provider/control-plane changes and focused local checks, source review follows, API/E2E performs a fresh coverage investigation and realistic Codex/browser-equivalent execution, and delivery refreshes/rebuilds before another explicit user verification hold.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture approval remains pending. The main implementation risks are reading `activeTurnId` outside the serialized submission, reinstalling A after its terminal event, parsing the wrong response shape, falling back to start after steer rejection, dropping/misrouting a team acknowledgement, treating accepted control result as idle, or fabricating a server acknowledgement on disconnect. Real-runtime validation must confirm the bundled Codex version's steer success/rejection behavior.

### SR-008 — Failure-safe immediate interrupt transport admission

- Triggering role, report path, and round: Architecture Reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`; `ARCH-REV-007` / architecture review round 7
- Triggering finding IDs: `ARCH-FIND-004`
- Prior authoritative result: `ARCH-REV-007` / `Fail` / `Design Impact`. DS-014 passed completely. DS-015 passed for server handling, admitted commands, acknowledgement shape/delivery, exact target matching, projection interception, canonical lifecycle separation, and in-flight disconnect, but not immediate local transport admission failure.
- Current authoritative result: `SR-008` completes DS-015 for already-disconnected, connecting, reconnecting, and synchronous send-throw paths and is ready for focused architecture re-review. Implementation remains blocked.
- Why this revision entry is recorded: Canonical agent `running` intentionally survives socket disconnect, so Stop remains invokable while a retained streaming service is not connected. Current `WebSocketClient.send()` throws outside `CONNECTED` and may propagate an underlying send throw. Registering pending state before that call without immediate rollback leaves a stale command; the earlier disconnect event cannot complete a command created afterward, while void service methods let stores incorrectly return true.
- Resolution:
  - Add shared frontend `interruptCommandAdmission.ts` with tight pending/local-failure types, `tryAdmitInterruptCommand`, and delete-guarded `completePendingInterruptTransportFailure`.
  - Both services register exact command/target first, read state immediately before send, skip send and complete one `INTERRUPT_TRANSPORT_NOT_CONNECTED` failure when not connected, catch send throws as `INTERRUPT_TRANSPORT_SEND_FAILED`, and return false. A normal send leaves the entry pending and returns true.
  - Both service interrupt methods return boolean. Stores return that boolean unchanged; the synchronous local-failure callback owns the toast, so false does not trigger duplicate feedback.
  - Automatic and intentional disconnect drain only command IDs still pending through the same delete-before-callback helper; intentional disconnect drains before unregistering handlers. Immediate rollback, matched acknowledgement, or prior disconnect removes the entry, making repeated/reentrant cleanup a no-op.
  - No local path constructs `AGENT_COMMAND_ACK`, changes `AGENT_STATUS`/team `isActive`, appends an `ErrorSegment`, hides Stop, queues/retries through reconnect, or changes the architecture-approved Codex/server contracts.
  - Add standalone/team coverage for disconnected, connecting, reconnecting, connected send throw, reentrant disconnect-plus-throw, admitted-then-disconnect, acknowledgement-before-disconnect, false/true return truthfulness, exact callback identity, empty pending state, and exactly-once toast/no-state-mutation behavior.
- Approved behavior or requirement IDs affected: No intended-behavior change. This precisely completes BEH-011, REQ-022, and AC-029. BEH-001–BEH-010, REQ-001–REQ-021, and AC-001–AC-028 remain unchanged.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md` — `ARCH-REV-007` result, exact transport source path, reachability, owner, invariant, risks, and focused re-review note
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` — SR-008 status, DS-015 admission branch, exact local types/signatures, shared helper ownership, disconnect exact-once behavior, file maps, rejection rules, sequence, tests, risks, and implementation guidance
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/codex-steering-stale-running-evidence.md` — immediate local admission source evidence, invariant, and focused coverage
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` — appended `SR-008` and updated current authority/index
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md` — unchanged, already design-ready and sufficient; architecture classified no requirement gap
- Triggering and cumulative review artifacts retained:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
  - All `SR-007` supplements, screenshots, and accepted `SR-006` downstream artifacts remain cumulative context.
- Downstream and architecture-review impact: Architecture should re-review only `ARCH-FIND-004`: register-before-send, immediately checked connection state, caught send race, delete-before-callback exactness, truthful service/store boolean, later disconnect on only still-pending entries, and no ack/lifecycle/transcript/retry side effects. On pass, route the complete SR-008 package to implementation.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No requirement gap is known. Architecture approval remains pending. Implementation must not duplicate the transition in two services, check state before registration, return true after a throw, invoke both immediate and later disconnect feedback, or add reconnect retry. Callback/localization failures and provider/runtime residual risks remain downstream test concerns but cannot mutate lifecycle.
