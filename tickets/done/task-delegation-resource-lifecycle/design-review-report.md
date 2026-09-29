# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/requirements-doc.md` (SR-007 = SR-002 plus the user-approved SR-007 delta DEC-008: REQ-013/REQ-014 updated, REQ-018 new, AC-018 updated, AC-020/AC-021 new)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/investigation-notes.md` (ARCH-01 … ARCH-15)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-spec.md` (SR-007; round 1 reviewed SR-003, round 2 SR-004, round 3 SR-005, round 4 SR-006)
- Supplemental Task Artifacts Reviewed: None (the package declares none; `solution-handoff.md` was read as routing context)
- Relevant Solution Revision IDs: SR-002 (requirements), SR-003 (design, round 1), SR-004 (design revision for ARCH-REV-001), SR-005 (migration guideline checklist, real-data evidence, basis refresh to `origin/personal@f2924a2b0`), SR-006 (resolution of ARCH-REV-003), SR-007 (requirements delta DEC-008 plus design: tolerant tree reading, no migration)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger (round 5): Solution Designer revised package SR-007, 2026-09-29 (time-sensitive: implementation is building the migration this revision removes). This is a focused re-review of REQ-018, AC-020/AC-021 and "SR-007 Tolerant Tree Reading — No Migration", checked against `origin/personal@f2924a2b0`: the V1 `runtimeKind` values against the current `RuntimeKind` enum; the `20260901` candidate-plan classifier (`agent-org-history-candidate-plan.ts:86`); and the tree `schemaVersion` consumers, including the stream DTOs.
- Trigger (round 4): Solution Designer revised package SR-006, 2026-09-29. This is a focused re-review of Terminology (liveness), checklist items 5, 7 and 8, and "SR-006 Resolution (ARCH-REV-003)", checked against `origin/personal@f2924a2b0`: runner list order, registry, `20260926`/`20260905` read/write behavior, and the `ConfiguredAgentExecutionHandle` `dispose`/`ensureReady`/`isActive` semantics.
- Trigger (round 3): Solution Designer revised package SR-005, 2026-09-29. This is a focused re-review of "Persisted Data / State Transition Decision" (Migration Plan), "SR-005 Migration Checklist And Basis Refresh" and the DS-003 wake simplification, checked against `origin/personal@f2924a2b0` (guideline, registry, runner, released migrations, `ConfiguredAgentExecutionHandle`). Unaffected round 2 verdicts are preserved.
- Trigger (round 2): Solution Designer revised package SR-004 ("Review Round 1 Resolution"), 2026-09-29. This round is a focused re-review of DS-002, DS-003, DS-005, the restore contract, the result shape and R-1 to R-4. Unaffected verdicts from round 1 are preserved.
- Prior Review Round Reviewed: 4 (`ARCH-REV-004`, Pass on SR-006); 3 (`ARCH-REV-003`, Fail: AR-004, AR-005); 2 (`ARCH-REV-002`, Pass on SR-004); 1 (`ARCH-REV-001`, Fail: AR-001, AR-002, AR-003)
- Latest Authoritative Round: 5
- Current-State Evidence Basis: I read the code in worktree `codex/task-delegation-resource-lifecycle` @ `8bffda045` (`autobyteus-server-ts/src`), including:
  - `root-task-lifecycle-engine.ts`, `root-task-lifecycle-adapter.ts` and `root-task-lifecycle-command-queue.ts`
  - `team-task-lifecycle-adapter.ts` and `task-delegation-service.ts`
  - `root-team-run.ts` and `root-team-run-materialization-gate.ts`
  - `agent-org-run.ts` (exact delivery and event hook)
  - `global-agent-run-message-router.ts` and `active-collaboration-root-directory.ts`
  - `task-agent-execution-registry.ts`, `configured-agent-activation-planner.ts`, `configured-agent-execution-handle.ts` and `agent-conversation-activity-inspector.ts`
  - `flat-team-execution-manager.ts` (quiescence and open work) and `agent-run.ts` (quiescence)
  - the status projectors and `agent-run-command-status-overlay-store.ts`
  - `root-run-package-current-validator.ts`, `team-run-state-package-validator.ts`, `run-execution-tree-shared-records.ts` and the Org tree type
  - `app-data-migration-registry.ts` and the migrations folder
  - `task-delegation-result-contract.ts` and `send-message-to-tool-result-contract.ts`
  - the web offline label
  - Round 2 addition: `agent-memory/store/external-runtime-memory-writer.ts`. External runtimes (Codex/Claude) write local raw traces, so the new conversation-activity precheck works for all three runtimes.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Yes. The change spans the server lifecycle owner, the Team/Org adapters and registries, the router, persistence and admission, a new tree migration, two stream-contract packages, API removal, settings, the LLM contract and about 40 web files. The evidence I checked confirms this (15 released migrations import tree/task types, strict shared `TaskExecution` schema, two live-only delivery gates).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The round 3 corrections were verified in round 4. Round 5: the requirements basis is now SR-007. The delta has an explicit user approval quote in the requirements status block (DEC-008), and the design adds no behavior beyond it.
- Approved requirements / intended behavior understood: Yes. Model A applies: `delegate_task` is a pure spawn; `send_message_to` is the only later channel; children are resources (quiet + grace → shut down; a same-root message wakes them); the task lifecycle, records, APIs and UI are deleted; old runs load and old conversations render.
- Relevant existing behavior and evidence confirmed: Yes. I checked each point against code:
  - Settlement happens only after accepted or interrupted (engine `settleAtHead`).
  - Records are the only delegator link (`TaskDelegationRecordV1.delegatorAgentRunId`); the tree has `settledAt` (shared records).
  - Two live-only gates exist (router `getActiveRun`; roots `isLiveAgent`).
  - Reopen repair exists.
  - The records file is a required admission authority (`requiredTeamFiles` / `requiredOrgFiles`).
  - The restore planner exists (`ConfiguredAgentActivationPlanner.resolvePlan`).
  - Team quiescence already includes hosted task agents and teams (`FlatTeamExecutionManager.tryPrepareTerminationIfQuiescent`).
  - AgentRun quiescence requires no active turn (`agent-run.ts:211-221`).
- Scope guardrail confirmed: Yes. In scope: UC-001–UC-007. Out of scope: cross-root wake, silent-child notification, rename, configured-member lifecycle, converting records, deleting records files. Preserved: BEH-001, BEH-005 running and address delivery, BEH-007, BEH-009 tree and Messages, BEH-010 old runs load, BEH-012 old notifications. Invariant: running work is never shut down. Review authority: understood.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (AR-001 → REQ-004, REQ-011, AC-004, AC-015; AR-002 → REQ-006, REQ-007, AC-011, AC-013; AR-003 → REQ-001, AC-001)
- Remaining material ambiguity: None. P-02 no longer drives any decision because of the `assertRestorableChain` precheck.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass (DS-001; result `{target_agent_run_id}` or `{target_agent_run_id: null, message}`) | Confirmed | AR-003 resolved |
| BEH-002/003 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (single liveness predicate: an agent is live when its handle's AgentRun is active; a team is live when its TeamRun is registered; applied to the schedule ignore rule and queue skip) | Confirmed | AR-005 resolved |
| BEH-005 | Contract | Pass | Pass | Pass (dormant set = the non-live members of the chain; `approve_tool`/`interrupt` on a non-live agent → `RUN_NOT_ACTIVE` without calling the handle; all input goes through the lease) | Confirmed | AR-005 resolved |
| BEH-006 | Operational | Pass | Pass | Pass (DS-004), subject to AR-002 for AC-013's alternate outcome | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass | Pass (task executions count only `initializing|running`; configured members unchanged) | Confirmed | See R-5 |
| BEH-009 | User | Pass | Pass | Pass (DS-006) | Confirmed | See R-4 |
| BEH-010 | Contract | Pass (REQ-014 and REQ-018 as amended by DEC-008) | Pass (real-data inventory ARCH-16/17; V1 enum evidence) | Pass (round 5: `Directly Usable — No Migration`; tolerant read with projection, exact write; released strict classifiers frozen; `20260905` adaptation; skip-version and installed-data evidence) | Confirmed | Supersedes the round 4 migration basis |
| BEH-011 | Contract | Pass | Pass | Pass | Confirmed | R-1 recorded as an evidence-only clarification |
| BEH-012 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change + Refactor | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/Ownership (resource lifetime owned by a review-gated status machine; engine `settleAtHead` and `hasOpenWork` confirm it). Legacy pressure: records duplicate the conversation and the tree | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes, now; no deferrals | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Engine replaced; tree becomes the single authority; removal plan, migration and file mapping are present | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Spawn | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 Resource release | Primary | Pass | Pass (minor stale wording, R-6) | Pass | Pass | Pass | Pass | Pass |
| DS-003 Wake + deliver | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (precheck before any restore; release arms the chain; failed partial restore arms the restored executions) |
| DS-004 Startup / reopen | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 Idle schedule | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 UI projection | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 Admission | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass (see R-2) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTeamRun` / `AgentOrgRun` | Pass | Pass | Pass | Pass | Tools, router and handlers go through root methods only |
| `RootTaskExecutionLifecycle` | Pass | Pass | Pass | Pass | Root calls the lifecycle, never the adapter directly |
| `ActiveRootMessageBoundary` | Pass | Pass | Pass | Pass | `hasAgentExecution` avoids the router inspecting trees |
| Host registries | Pass | Pass | Pass | Pass | Reached only through adapters |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | Root-neutral; keeps today's rule |
| Adapters | Pass | Pass | Pass | Pass | — |
| Runtime vs `app-data-migrations` | Pass | Pass | Pass | Pass | Migration may import current validators for target validation only |
| Router | Pass | Pass | Pass | Pass | Asks the sender's root boundary |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `delegate_task` → `DelegateTaskResult` | Pass | Pass | Pass | Low | Pass (AR-003 resolved) |
| `RootTaskExecutionLifecycle.delegate / onAgentStatus / acquireLiveLease` (coded errors; `release()` arms) | Pass | Pass | Pass | Low | Pass |
| Adapter `assertRestorableChain` / `hasRunningTaskWork` | Pass | Pass | Pass | Low | Pass (subject-specific; stays in the adapter, so the root-neutral rule holds) |
| `RootTaskExecutionAdapter` port | Pass | Pass | Pass (`TaskExecutionReference` for shutdown) | Medium→Low | Pass |
| `ActiveRootMessageBoundary.hasAgentExecution` | Pass | Pass | Pass | Low | Pass |
| `executeAgentCommand(post_message)` wake | Pass | Pass | Pass | Low | Pass |
| Stream `TASK_EXECUTION_STARTED` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent restore | Pass | Pass | Pass (precheck reuses `AgentConversationActivityInspector`) | Pass | The planner is unchanged. The precheck guarantees `present` before a task-execution ingress restore, so `restore_native` / `restore_external` is selected. Round 1 AR-002 is resolved |
| Team restore | Pass | Pass | Pass (`prepareRestoredTaskTeam`, restore node builder) | Pass | — |
| Quiet detection | Pass | Pass | N/A | Pass | Agent and team quiescence already exist |
| Serialization | Pass | Pass | N/A | Pass | FIFO rename; gate is an admission counter, not a mutex, so no gate/queue deadlock (P-04) |
| Setting | Pass | Pass | Pass | Pass | ARCH-13 pattern |
| Migration | Pass | Pass | Pass | Pass | Runner, atomic writer, frozen-schema precedent (`agent-org-flat-team-families-v1/released-team-run-v2-schema.ts`) |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| `agent-team-execution` / `agent-org-execution` | Pass | Pass | Pass | Pass | — |
| `agent-communication` | Pass | Pass | Pass | Pass | — |
| `run-history` / `app-data-migrations` | Pass | Pass | Pass | Pass | — |
| `api`, `agent-tools`, streaming, config, web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskExecution` record | Pass | Pass | Pass | Pass | — |
| Task-team restore node builder | Pass | Pass | Pass | Pass | Shared by Team and Org |
| `TaskExecutionReference` | Pass | Pass | Pass | Pass | Moves out of the records type |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskAgentExecution` / `TaskTeamExecution` | Pass | Pass | Pass | Pass | Pass | Delegator is in one place; `settledAt` is removed |
| `DelegateTaskResult` | Pass | Pass | Pass | N/A | Pass | No `task_id` or `status` |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `root-task-execution-lifecycle.ts` | Pass | Pass | Pass | Pass | — |
| `task-execution-idle-shutdown-schedule.ts` | Pass | Pass | N/A | Pass | Mapping revised (AR-001) |
| Team/Org adapters, registries, factory | Pass | Pass | Pass | Pass | — |
| Migration folder files | Pass | Pass | N/A | Pass | — |
| Remaining Team `task-delegation/*` helpers | Pass | Pass | N/A | Pass | Dispositions stated (R-3) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task/` | Pass | Pass | Low | Pass | — |
| `agent-team-execution/task-delegation/` (with `records/` removed) | Pass | Pass | Low | Pass | — |
| `app-data-migrations/migrations/task-execution-delegator-tree-v1/` | Pass | Pass | Low | Pass | — |
| `config/task-execution-idle-shutdown-setting.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Submit/review tools (native + MCP) | Pass | N/A | Pass | Pass | — |
| Engine, reopen repair, events | Pass | Pass | Pass | Pass | — |
| Records types/stores/validators/admission | Pass | Pass | Pass | Pass | Required-not-retired rule explicit (R-2), with AC-018 coverage |
| `settledAt` handling | Pass | Pass | Pass | Pass | The runtime `settledAt` list matches my grep (23 files) |
| GraphQL/REST, contracts, web task UI | Pass | Pass | Pass | Pass | — |
| Residual Team helpers | Pass | Pass | Pass | Pass | Keep / reshape / remove table present (R-3) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime task-records reading | No | Pass | Pass | Round 5: no migration. Records are read only by released migrations, through the frozen records v1 module |
| Tolerant tree reader (round 5) | No | Pass | Pass | A generic projection of known fields with no old-shape branch or version switch, so it is not compatibility code (design principles §5). Optional `delegatorAgentRunId` is a user-approved current contract (DEC-008), not a fallback |
| Nullable delegator / reinterpreted `settledAt` | No | Pass | Pass | Rejected in the log |
| No-op submit/review; empty GraphQL | No | Pass | Pass | Rejected |
| `SYSTEM_TASK_NOTIFICATION` kept for the spawn packet and old conversations | No | Pass | Pass | Current use (spawn packet) plus REQ-015 rendering; not legacy retention |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Team and Org execution trees (round 5, authoritative) | Directly Usable — No Migration (DEC-008, REQ-018) | Pass. The change is compatible under tolerant reading: `settledAt` is ignored; `delegatorAgentRunId` is optional with a truthful absent meaning, approved in REQ-013; no field name is reused. A preserved V1 tree is still rejected structurally: V1 `runtimeKind` values (`"AUTOBYTEUS"`, `"CLAUDE"`, `"CODEX"`, `team-run-execution-tree-v1-schema.ts:79`) fail the current lowercase `RuntimeKind` enum check (`run-execution-tree-shared-record-schemas.ts:78`). The invariant "delegator, when present, resolves" is kept | Pass. It avoids a transform on 594 roots for a field the approved UI tolerates missing. There is no version switch: known fields are projected and unknown ones ignored (design principles §5; guideline §4 allows nullable data when the current contract says so, and REQ-013/REQ-018 do) | N/A (no migration). Released migrations that use strict validators as classifiers (`20260901` candidate plan line 86, `20260824` "already current") are repointed to a frozen strict module (~850 lines, verbatim). `20260926` is unchanged; `20260905` gets a small adaptation | Pass | The round 2–4 migration rows below are superseded and kept for history |
| Team tree v2 → v3; Org tree v1 → v2 (round 4, superseded by SR-007) | Migration Required | Pass | Pass | Pass. Option (b) verified at `f2924a2b0`: the runner iterates `listDefinitions()` in list order. All tree producers (`20260814` → `20260824` → `20260901`) come earlier in the list. `20260926` and `20260905` only read trees (no tree-file writes in their code). Released pre-position migrations repoint to a verbatim frozen legacy module. `20260905` gets a small adaptation. The execution policy and audit boundary are answered. Skip-version fixture added | Pass | Supersedes rounds 2 and 3 |
| Team tree v2 → v3; Org tree v1 → v2 (round 3) | Migration Required | Pass. SR-005 adds a real-data inventory (594 roots; 9 with task executions; 8 tree-less preserved) and dispositions | Pass. Reading records only for trees with task executions is sound | **Fail (AR-004).** Registry position "after `20260926_team_context_file_execution_locators_v1`" does not account for the runner executing in registry list order. Released migrations `20260926` (`RootRunPackageCurrentValidator.scan()`) and `20260905` (current Org tree store, `validateAgentOrgStatePackage`, `AgentOrgExecutionIndex`, run-history projector/summary writer) depend on current services, not only types | Fail | See AR-004 and P-05; the round 2 row below is kept for history |
| Team tree v2 → v3; Org tree v1 → v2 (round 2) | Migration Required | Pass. The delegator exists only in records. Strict exact-key tree schemas. The current admission validator already requires `index.requireAgent(task.delegatorAgentRunId)`, so the invariant "every delegator resolves in the tree" holds for every admitted package | Pass. It is a small per-package deterministic transform, and a nullable/runtime fallback is prohibited | Pass. Isolated owner, ordering after existing tree/Org migrations, frozen released schemas (including repointing released migrations), pre-rename validation, single-file atomic write, per-package idempotence, bounded dispositions | Pass | Missing records file: I confirmed the records file is in `requiredTeamFiles` / `requiredOrgFiles`, so those packages are already non-admitted today; `SKIPPED_MISSING_TASK_RECORDS` is correct |
| Task-records files | Not Affected (left on disk, unread) | Pass | Pass | N/A | Pass | R-2 applied: not required and not retired |
| Communication messages | Not Affected | Pass (no task coupling in message schemas) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Freeze schemas → new schemas → migration → lifecycle → adapters → router → tools → removal → contracts → web → docs | Pass (round 4: frozen legacy module sized; repoint list and ordering explicit) | Pass (none remain) | Pass | Pass |
| Rebase onto `origin/personal@f2924a2b0` before further implementation (ARCH-19) | Pass | N/A | N/A | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool result | Yes | Pass | Pass | Pass | Revised shape |
| Errored child | Yes | Pass | Pass | Pass | Added in SR-004 |
| Tree record, wake race, routing, team shutdown, nested wake, operator composer | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-01` — A live task child ends a turn or command in `error` status and emits no later `idle`

- Related approved requirement or established contract: REQ-004 ("Quiet for an agent means not running and no pending input"), REQ-011, AC-004, AC-015
- Relevant behavior ID(s): BEH-004, BEH-008
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: a child's runtime command or turn fails. Examples: a provider or model error, the external runtime process exiting, or a rejected input post.
- Support evidence: `ConfiguredAgentExecutionHandle.postMessage` publishes a sticky `error` status overlay when the post is rejected or activation throws (`configured-agent-execution-handle.ts:113-131`). Runtime backends project phase `error` (for example `agy-agent-run-backend.ts` sets `phase = "error"` on process exit or turn failure). Status payloads carry `error` (`agent-status-payload.ts`).
- Forward production path: child running → failure → `AGENT_STATUS {status:"error"}` → root event hook → `RootTaskExecutionLifecycle.onAgentStatus` → DS-005 mapping `running|initializing|error → cancel chain timers` → no timer. With no further input, no `idle` event follows.
- Lifecycle preconditions and material consequence: the child is not running and has no pending input, so REQ-004 says it is quiet. Under the design it is never shut down. Because `ConfiguredAgentExecutionHandle.hasOpenExecutionWork()` counts `error` as open work (`configured-agent-execution-handle.ts:101-103`, and `FlatTeamExecutionManager.hasOpenExecutionWork`), the root also keeps reporting open execution work. This recreates the leak the ticket removes (REQ-004, REQ-011, AC-015).
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-001

### `P-02` — A shut-down task execution is woken when its agent has no saved conversation trace

- Related approved requirement or established contract: REQ-006 ("restores the child with its prior conversation context"), REQ-007, AC-011 ("Saved state unavailable → Specific rejection"), AC-013 alternate outcome, SCN-007 ("Missing state → rejection")
- Relevant behavior ID(s): BEH-005, BEH-006
- Initiating basis kind: `Operational` (with `Contract` for the required outcome)
- Independent product-supported initiating trigger or applicable governing contract: the operator reopens a root run (SCN-007), including a pre-change run (Data Continuity "Unknowns"), and an agent in it messages an earlier child's run ID. AC-011 governs the required outcome.
- Support evidence: the requirements explicitly list pre-change saved state as unknown and define the outcome. The design's Risks section asserts "missing state yields a REQ-007 rejection".
- Forward production path: reopen → loader → root with no task handles → `send_message_to(run ID)` → sender-root → `acquireLiveLease` → `restoreChain` → handle in `restore` mode → reserve input → `ensureReady` → `ConfiguredAgentActivationPlanner.resolvePlan`. When the activity inspector returns `none`, native restore returns `{kind:"new"}` and external restore returns `new` or `replace_external_without_conversation` (`configured-agent-activation-planner.ts:61-90`).
- Lifecycle preconditions and material consequence: if the child's trace is absent, the child silently starts fresh. It receives only the follow-up, with no work packet or context, and the sender gets no rejection. That contradicts AC-011 and the design's own claim. The unreadable and restore-failed cases already produce coded errors, which surface because `RootCommunicationEngine` reserves input before persisting (`root-communication-engine.ts:52-56`). Only the `none` case is affected.
- Reachability: `Unclear`. It depends on whether pre-change task agents always retain a conversation trace under the rooted memory layout.
- Review consequence / proportionate response: AR-002 (round 1). Round 2: SR-004 adopted option (a). `assertRestorableChain` rejects with `TASK_EXECUTION_CONTEXT_UNAVAILABLE` before any restore, so the outcome is correct whatever the answer. The frequency is only a validation observation, and the premise no longer drives any decision.

### `P-03` — A sender outside the root wakes a child through a race in the global live path

- Related approved requirement or established contract: REQ-008, QR-003
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: SCN-011, where an agent in another root messages a child's run ID.
- Support evidence: SCN-011 is a Supported Explicit Edge.
- Forward production path: the router's cross-root path calls `targetRun.postUserMessage` directly on the live `AgentRun` (`global-agent-run-message-router.ts:152-165`). It never calls the target root's `deliverExactAgentMessage`. A shut-down child has no active `AgentRun`, so the call is rejected at `getActiveRun`.
- Lifecycle preconditions and material consequence: none. The wake-capable root path is reached only when the sender's root contains the target.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: no finding and no extra machinery.

### `P-04` — Deadlock between the root materialization gate and the lifecycle FIFO during lease acquisition

- Related approved requirement or established contract: REQ-006, QR-002
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: concurrent `delegate_task` and `send_message_to` inside one root.
- Support evidence: `RootTeamRunMaterializationGate.run` is an admission counter, not a mutex (`root-team-run-materialization-gate.ts`).
- Forward production path: both operations enter the gate without mutual exclusion and then serialize only on the lifecycle FIFO.
- Lifecycle preconditions and material consequence: there is no lock-order inversion.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: no finding.

### `P-05` — A skip-version upgrade runs released tree-reading migrations in the same startup as the new migration

- Related approved requirement or established contract: REQ-014 ("Old runs still load"), AC-018. Governing contract: the canonical data migration guideline, which the requirements scope snapshot names as the migration authority. Section 3 says migrations are retained "for supported direct/skip-version upgrades"; checklist item 5 says "Verify schema ordering … same-ID versus new-migration applicability". The design's own Retention statement says "keep the migration permanently for skip-version upgrades".
- Relevant behavior ID(s): BEH-010, BEH-006
- Initiating basis kind: `Operational` + `Contract`
- Independent product-supported initiating trigger or applicable governing contract: a user whose install has not yet applied `20260905_agent_org_history_first_message_summary_v1` and/or `20260926_team_context_file_execution_locators_v1` installs the release that contains this change, and startup runs all pending app-data migrations.
- Support evidence: the in-app update and install path is the supported upgrade action. The guideline makes skip-version upgrades a supported contract, and both migrations are released (applied on the inspected install, ARCH-17).
- Forward production path:
  - `AppDataMigrationRunner` iterates `registry.listDefinitions()` in list order (`app-data-migration-runner.ts:58` at `f2924a2b0`).
  - Registry list order at `f2924a2b0`: `…20260926 locators (list pos. 57)` → `20260905 org first-message summary (pos. 64)` → …
  - `20260926` calls `new RootRunPackageCurrentValidator(memoryDir).scan()`, the full current admission scan (`team-context-file-locator-transition.ts:20`).
  - `20260905` reads with the current `AgentOrgRunExecutionTreeStore` and current `validateAgentOrgStatePackage` (including records), and uses `AgentOrgExecutionIndex`, `projectAgentOrgRunHistoryRow` and `AgentOrgRunHistorySummaryWriter`.
  - `20260901` (`agent-org-context-file-locator-transition.ts`, `agent-org-flat-team-families-v1-app-data-migration.ts`) also calls the current `validateAgentOrgStatePackage`.
- Lifecycle preconditions and material consequence:
  - If the new migration is placed after `20260926` as the design states, then on a skip-version upgrade `20260926` runs first against v2 trees using a current validator that now requires v3 trees and no records file. Every old Team package is diagnosed invalid, so its locators are not converted.
  - `20260905` then runs against whatever shape precedes it, using changed current Org services.
  - If the new migration is placed before them (as the pre-rebase worktree currently registers it), these released migrations run on converted current-shape trees through current code. That can work, but only if their dependencies on current services are adapted and their semantics verified. The design specifies neither.
  - Either way, old runs' history rows and context-file locators can silently fail to convert, contradicting REQ-014 and AC-018.
- Reachability: `Reachable` (governing skip-version contract plus the supported install action)
- Review consequence / proportionate response: AR-004. Round 4: resolved by option (b) plus a skip-version fixture.
- Related sub-premise (round 4): our migration fails as a whole (write failure), then `20260926` completes against unconverted trees, and the locators for those roots are never converted. Classification: infrastructure/storage failure, outside the guideline's normal operating assumptions (§2) → `Not Reachable`; no machinery. See the optional note R-10.

### `P-06` — An operator `approve_tool` or `interrupt` reaches a shut-down task agent whose handle is retained

- Related approved requirement or established contract: the design interface row "`approve_tool`/`interrupt` on a shut-down child → `RUN_NOT_ACTIVE`"
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the operator acts on a stale approval card after the child was shut down.
- Support evidence: a child is shut down only when quiet (no active turn), so no approval is pending at shutdown. A stale approval action would need contradictory timing.
- Forward production path: none that is supported.
- Lifecycle preconditions and material consequence: none.
- Reachability: `Not Reachable` (Technically Possible but Unsupported/Contrived)
- Review consequence / proportionate response: no finding on this scenario. AR-005 asks only for the liveness definition, which the design's own `RUN_NOT_ACTIVE` gating depends on.

### `P-07` — Orphan task executions (no record) remain in old trees now that no migration or reopen repair drops them

- Related approved requirement or established contract: REQ-013 (children in the members tree), REQ-007
- Relevant behavior ID(s): BEH-009, BEH-010
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: activation committed the tree write and then the records write failed (`treeOrphanMayExist`).
- Support evidence: this requires an I/O failure between two file writes, which is outside the guideline's normal operating assumptions (§2). ARCH-16 found none on the inspected install.
- Forward production path: none under supported conditions.
- Lifecycle preconditions and material consequence: if it existed, the entry would show as a child with no starter. A wake would be rejected by the precheck (`TASK_EXECUTION_CONTEXT_UNAVAILABLE`), because an orphan never received its first message.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: none. No repair machinery.

### `P-08` — A released `20260824` or `20260901` re-runs after the new runtime has written version-less trees

- Related approved requirement or established contract: REQ-014, REQ-018
- Relevant behavior ID(s): BEH-010
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: the runner re-runs only non-terminal migrations. Pending migrations on a skip-version install complete before runtime writes, and a non-terminal aggregate would need a failed write (infrastructure).
- Support evidence: the pending chain runs before any runtime write; the 20260901 ledger on the inspected install is terminal (SUCCEEDED_WITH_WARNINGS).
- Forward production path: none under supported conditions.
- Lifecycle preconditions and material consequence: even if it happened, the frozen strict classifier fails on a version-less tree. `20260901` then tries `validateReleasedTeamRunV2`, which throws, so the item is recorded as a failure with no write.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: none.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Whether pre-change (and normal) shut-down task agents always have a conversation trace | No longer decision-relevant (precheck) | Observe on a copied real install during validation | Closed as a design dependency (SR-004) |

## Review Decision

- `Pass` (round 5): the SR-007 behavior basis (user-approved delta) is confirmed, the design is ready for implementation on the rebased basis, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

None open.

Round 5 verification (SR-007):

- **Persisted-data decision:** `Directly Usable — No Migration` is evidence-backed and proportionate (see the Persisted-Data Transition Verdict, round 5 row). REQ-018's rule ("read tolerantly, write exactly, no version field, never reuse a field name") is realized as a projection of known fields plus required-key and invariant checks, with no version switch.
- **Structural recognition without versions:** confirmed for V1 trees through the `runtimeKind` enum mismatch. The delegator-resolution invariant is retained.
- **Released migrations:** I confirmed `20260901` uses the current strict validator as its flat-versus-nested classifier (`agent-org-history-candidate-plan.ts:86`), so freezing strict copies is necessary, not optional.
  - The disposition table covers `20260814` (+helpers, classifier), `20260824`, `20260819` (+index), `20260901` (+transitions), `20260926` (unchanged; admits trees without records, locator conversion unchanged) and `20260905` (adaptation).
  - Keeping the current `AgentOrgExecutionIndex` is acceptable given the stated freeze-if-changed condition.
- **Removal:** the new migration, its folder, registry entry and tests are explicitly removed, and implementation is told to delete the in-progress code.
- **Evidence obligations:** updated to the no-migration design (tolerant/exact unit tests, V1 rejection, released-migration regression including the classifier, skip-version chain, and an installed-data copy with no startup rewrite verified by hashes).
- AR-001 to AR-005 remain resolved and unaffected (lifecycle, wake, lease, liveness, precheck, result shape).

### Non-blocking notes for implementation

- R-5, R-6, R-7, R-11: unchanged. R-10 is obsolete, because there is no new migration.
- **R-12 — Stale migration-era statements (precedence).** SR-007 lists what it supersedes and says "everything else stands", but several statements outside that list still describe the removed migration or a required delegator:
  - Investigation Evidence row ARCH-03/04/05 ("Team tree v3 / Org tree v2 migration");
  - Legacy Removal Policy ("reads only Team tree v3, Org tree v2");
  - DS-004 row ("v3/v2 tree");
  - Subsystem allocation and File mapping ("Schemas v3/v2", "(v3)", "(v2)");
  - the Shared Structure / Data Model table (`delegatorAgentRunId` shown as required);
  - the Examples "Tree record" row ("Clean cut; migration fills it");
  - the Backward-Compatibility Rejection Log ("Nullable `delegatorAgentRunId` … Rejected");
  - Change / Refactor Sequence steps 1–3 (step 3 "Migration plus registry entry");
  - the Guidance "Migration tests" list.

  I reviewed on the basis that the "SR-007 Tolerant Tree Reading — No Migration" section takes precedence over every conflicting statement. Implementation must follow SR-007. The Solution Designer should align these lines at the next design touch.
- **R-13 — `schema_version` in stream and view DTOs.** It is a wire field, not part of the persisted file, and REQ-018 governs files only. Examples: `team-execution-view-dtos.ts:145,163` (`z.literal(2)`), `root-execution-view-dtos.ts:24,29`, and the projectors `team-execution-view-projector.ts:163` and `agent-org-execution-view-projector.ts:29`. Decide explicitly: keep the literals as wire constants independent of the file, or remove them consistently across both contract packages, the projectors and the web. The projectors must not copy the removed file field.
- **R-14 — "Always write `delegatorAgentRunId`" wording.** In the SR-007 format table, "always write" applies to children created after this change. Old children loaded without the field are re-written without it (AC-021 says "`delegatorAgentRunId` on new children"). Don't fabricate a value.

## Classification

N/A (Pass)

## Recommended Recipient

`/implementation_engineer` (primary pass handoff), then `/solution_designer` (informational), per `get_handoff_rules`.

## Residual Risks

- Every exact-message delivery (including to live children) now waits behind the per-root lifecycle FIFO for lease acquisition, which can include activation commits with a disk write. Latency should be bounded but deserves a test under concurrent delegation.
- Shutdown at the queue head calls `AgentRun.tryPrepareTerminationIfQuiescent`, which enqueues on the agent's event dispatch queue. Today's settlement already does this, so the risk is low; cover it with the race test for QR-002.
- Per-runtime restore of external provider sessions for task agents, and approval-pending-is-never-quiet, remain validation obligations (AC-006, AC-007 per runtime), as the design states.
- Migration on real installed data (coexistence of valid, missing-tree and missing-records packages; repeat startup; unchanged records hashes) remains a validation obligation.

## Latest Authoritative Result

- Review Decision: `Pass` (round 5, `ARCH-REV-005`, on SR-007)
- Material-Premise Gate: `Pass`. P-07 and P-08 are Not Reachable and drive nothing. P-05 is moot (no new migration). P-01 to P-04 and P-06 are unchanged.
- Notes:
  - The SR-007 section is authoritative over conflicting earlier statements (R-12).
  - Implementation must delete the in-progress migration, then implement on the basis rebased onto `origin/personal@f2924a2b0` or later. Earlier downstream gate results apply only to their own basis (R-9).
  - Validation obligations: the SR-007 evidence items 1–5, AC-006/AC-007 per runtime, and R-4 at Delivery.
