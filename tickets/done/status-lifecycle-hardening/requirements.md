# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready.

The user delegated the worth-it decision and asked to start work if the follow-up is worthwhile. Current investigation confirms it is worthwhile as a focused behavior-preserving architecture hardening ticket, not as a broad status-system rewrite.

## Goal / Problem Statement

Follow up the merged `offline-agent-initializing-status` ticket with a focused refactor that makes team command-start status lifecycle ownership explicit and reusable.

The merged product behavior must remain intact: when a command targets an offline/idle team member, the backend emits early `initializing` before slow runtime startup/provider/native send work resolves. This ticket addresses maintainability pressure left by that fix:

1. Pending command-start status overlays are currently split across shared helper functions, backend-local maps, and mixed-member local overrides.
2. Native AutoByteus member status identity/projection is embedded in both `AutoByteusTeamRunBackend` and `AutoByteusTeamRunEventProcessor`.
3. Root/team command-start overlays exist only in the native backend and mixed sub-team handle, not in the shared overlay helper.

The target outcome is a clean-cut refactor with one bounded pending-overlay lifecycle owner and one native AutoByteus member status identity/projector owner, while preserving backend source-of-truth status semantics.

## Investigation Findings

- `team-member-command-start-status-overlays.ts` currently exports function helpers (`getCommandStatusSnapshot`, `publishTeamMemberCommandStatus`) around caller-owned maps. This centralizes some event building for Codex/Claude but does not own lifecycle.
- `team-member-command-start-status-events.ts` already centralizes member and root/team command-start event/payload construction and should be reused, not duplicated.
- `CodexTeamManager` and `ClaudeTeamManager` each own `commandStatusByMemberRouteKey`, clear it on member `AGENT_STATUS`, and call the helper before `ensureMemberReady`/send.
- `AutoByteusTeamRunBackend` owns `pendingRootCommandStartStatus`, `pendingCommandStartStatusByRunId`, `lastMemberStatusByRunId`, native member snapshot projection, overlay application, same-batch aggregate derivation, replacement clearing, and command failure replacement.
- `AutoByteusTeamRunEventProcessor` also resolves native member identity from native agent id, configured member run id, member name, route key, and runtime context; this duplicates native identity policy.
- `MixedAgentMemberHandle` and `MixedSubTeamMemberHandle` still keep local `commandStatusOverride` state and duplicate offline/idle gating, publish, replacement-clear, and failure replacement behavior.
- Attempted local focused Vitest execution failed because `vitest` is not installed in the current worktree dependencies (`pnpm -C autobyteus-server-ts exec vitest ...` returned `Command "vitest" not found`). This is an environment/dependency setup gap, not evidence against the refactor.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / architecture hardening.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now for this follow-up ticket.
- Evidence basis:
  - Same lifecycle policy appears in Codex/Claude maps, native backend maps, and mixed local overrides.
  - Native identity is resolved in both backend snapshot code and native event processor code.
  - Backend files now combine command sequencing with overlay lifecycle and projection policy.
  - The code-review follow-up explicitly recommended extracting native identity/projector and promoting the overlay helper into an explicit lifecycle owner while avoiding a global status manager.
- Requirement or scope impact:
  - Scope includes all current team command-start overlay copies: Codex, Claude, native AutoByteus, mixed leaf members, and mixed sub-team members.
  - Scope excludes leases/tokens unless a concrete stale/duplicate overlay defect is discovered.
  - The refactor must not move target resolution, runtime startup, provider/native send, child-team creation, or backend status authority out of existing command owners.

## Recommendations

Proceed.

Recommended target:

1. Replace the function helper in `team-member-command-start-status-overlays.ts` with a bounded `TeamCommandStatusOverlayStore`-style owner under `agent-team-execution/services`.
2. The overlay store owns pending member overlays and pending team/source-path overlays; it gates `initializing` on current effective `offline`/`idle`; it replaces overlays with `error` on command failure; it applies overlays to snapshots/aggregate inputs; it clears overlays when replacement runtime/native/team events arrive; it can be cleared on terminate/dispose.
3. Extract an AutoByteus-native member status projector/identity owner under `backends/autobyteus` to canonicalize native agent id, configured member run id, member name, route key, member path, and status payload projection for both backend snapshots and event processing.
4. Keep `team-member-command-start-status-events.ts` as the event/payload builder unless implementation proves a tighter placement is needed.
5. Keep command owners responsible for deciding when a command starts and for target/runtime/native send sequencing.
6. Apply the store consistently to Codex, Claude, native AutoByteus, mixed agent members, and mixed sub-team members so no duplicate overlay lifecycle path remains.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

This crosses team runtime status paths and tests across Codex, Claude, native AutoByteus, and mixed member handles. It is behavior-preserving and should not rewrite the whole team status system.

## In-Scope Use Cases

- UC-001: A Codex team member receives a user or inter-agent command while offline/idle; the command owner emits member `initializing` using the shared overlay lifecycle owner before runtime startup/provider send resolves.
- UC-002: A Claude team member receives a user or inter-agent command while offline/idle; the same overlay lifecycle owner is used without duplicating policy.
- UC-003: A mixed leaf agent member receives a command while offline/idle; its local `commandStatusOverride` lifecycle is replaced by the shared overlay owner.
- UC-004: A mixed sub-team member receives a command while offline/idle; its represented team/source-path `initializing` overlay is managed by the shared overlay owner.
- UC-005: A native AutoByteus team member receives a user or inter-agent command; member identity is canonicalized by the native projector and pending overlays are stored/applied/cleared by the shared overlay owner.
- UC-006: A native AutoByteus root/no-target command emits root `TEAM_STATUS initializing` when applicable and clears/replaces the pending root overlay when native/root status events arrive or failure is published.
- UC-007: Team snapshots and derived aggregate status reflect pending command-start overlays consistently until runtime/native/team replacement events arrive.
- UC-008: Already-running/active members do not receive a new `initializing` overlay solely because another command was submitted.

## Out of Scope

- Frontend optimistic status updates.
- A global status manager or a new global source of truth for all agent/team status.
- Moving target resolution, runtime startup, provider/native message send, child-team creation, or command routing ownership out of existing command owners.
- Changing user-visible status semantics beyond preserving the merged early-initializing behavior.
- Implementing command-start leases/tokens unless a concrete stale/duplicate overlay defect is discovered and approved as a scope change.
- Large runtime manager rewrites unrelated to status identity or pending command-start overlays.
- Broad unrelated `TeamRunEvent` / `AgentStatusPayload` schema changes. The targeted status-event-name cleanup in this re-entry is explicitly in scope.

## Functional Requirements

- REQ-001: The implementation shall preserve the backend-source-of-truth status model; all command-start status updates must still originate from backend runtime/team command paths.
- REQ-002: The implementation shall centralize pending team command-start overlay lifecycle in one bounded reusable owner that supports member overlays and team/root/source-path overlays.
- REQ-003: The overlay owner shall publish/store `initializing` command-start overlays only when the current effective status for that member or team source path is `offline` or `idle`.
- REQ-004: The overlay owner shall support replacing a pending `initializing` overlay with `error` when the command fails before runtime/native/team status events supersede it.
- REQ-005: The overlay owner shall clear pending member overlays when runtime/native member `AGENT_STATUS` events are observed for the same canonical member identity.
- REQ-006: The overlay owner shall clear pending team/root/source-path overlays when matching `TEAM` status events are observed for the same source path.
- REQ-007: Team member snapshots and aggregate team status derivation shall include pending overlays consistently until they are replaced or cleared.
- REQ-008: Native AutoByteus member status identity/projection shall be centralized so configured member run id, native agent id, runtime member context, member name, member route key, and member path are canonicalized by one explicit owner.
- REQ-009: Native AutoByteus event processing and native backend snapshot projection shall use the same native identity/projector owner rather than duplicating identity resolution.
- REQ-010: Codex, Claude, native AutoByteus, and mixed command owners shall continue to own target resolution, runtime startup, child-team creation, and provider/native/child send sequencing.
- REQ-011: The refactor shall remove obsolete caller-owned overlay maps/local overrides for in-scope paths; it shall not introduce compatibility wrappers, dual old/new status paths, or frontend-only fallback behavior.
- REQ-012: Durable tests shall cover the extracted overlay owner, native identity/projector behavior, and existing runtime-manager/backend command-start behavior.

## Acceptance Criteria

- AC-001: Authoritative artifacts live under `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/status-lifecycle-hardening` on branch `codex/status-lifecycle-hardening` based on `origin/personal`.
- AC-002: Code review can identify exactly one bounded owner for pending command-start overlays and one explicit owner for native AutoByteus member status identity/projection.
- AC-003: Existing command-start behavior tests for Codex, Claude, mixed leaf agent, mixed sub-team, native AutoByteus member, native inter-agent delivery, native root/no-target command, snapshot reflection, aggregate reflection, event replacement clearing, and failure replacement continue to pass without weakened assertions.
- AC-004: New or updated unit tests directly verify the overlay owner gates `initializing`, stores/applies member overlays, stores/applies team/source-path overlays, replaces failures, clears on matching member `AGENT_STATUS`, clears on matching `TEAM` source-path status, and clears all overlays on dispose/terminate.
- AC-005: New or updated unit tests verify native AutoByteus identity canonicalization across runtime member context, native agent id, configured member run id, member name, route key, and member path.
- AC-006: Native AutoByteus backend snapshots do not expose duplicate native agent id and configured member run id entries for the same member.
- AC-007: Team aggregate status remains `initializing` while a pending command-start overlay is active, changes to runtime/native replacement status after the replacement event, and does not emit `initializing` over an already-running member.
- AC-008: Code review confirms no global status authority, no frontend optimistic status fallback, and no compatibility wrapper preserving old overlay maps beside the new owner.
- AC-009: TypeScript typecheck/build and relevant unit tests pass in an environment with dependencies installed; if local dependency installation is absent, the validation artifact must record that blocker explicitly.
- AC-010: Runtime manager/backend/handle files no longer own raw pending overlay maps or local command override fields for the in-scope paths.

## Constraints / Dependencies

- Base branch: latest tracked `origin/personal` as of bootstrap (`d2b4f4331e95e49a3109b851463b8bae0d48ecae`).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening`.
- Ticket branch: `codex/status-lifecycle-hardening`.
- Preserve the behavior delivered by `offline-agent-initializing-status`.
- Preserve backend `TeamRunEvent` and `AgentStatusPayload` shape except for the targeted canonical status-event cleanup defined in the re-entry addendum.
- Native AutoByteus status mapping must continue to interoperate with `AutoByteusTeamRunEventProcessor`, `AutoByteusTeamRunBackendFactory`, current runtime contexts, and current `TeamRunEvent` shapes.
- Current local test command cannot run until dependencies provide `vitest`.

## Assumptions

- `origin/personal` contains the merged `offline-agent-initializing-status` code.
- The user’s “if worth it, start work” instruction is sufficient approval to move requirements to design-ready after the value assessment.
- Existing command-start tests are a valid behavior-preservation baseline, but direct unit tests for extracted owners should be added.
- Command-start leases/tokens are unnecessary for this ticket unless implementation uncovers verified stale/duplicate overlay behavior.

## Risks / Open Questions

- RISK-001: Over-extracting the overlay owner could accidentally create a global status manager. Mitigation: keep it per team/backend/handle instance and bounded to pending command-start overlays and replacement clearing.
- RISK-002: Native AutoByteus identity has several related IDs. Mitigation: centralize canonical identity shape and avoid a loose object with overlapping authoritative fields.
- RISK-003: Mixed sub-team overlays use `TEAM` events at a non-root source path. Mitigation: the overlay store should key team overlays by explicit `sourcePath`, with root represented as `[]`.
- RISK-004: Dependency setup currently blocks local Vitest execution. Mitigation: downstream validation must either install/prepare dependencies or record the environment blocker.
- RISK-005: Refactor churn soon after the behavior ticket could regress user-visible status timing. Mitigation: pin behavior with existing and new tests before removing old paths.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007 |
| REQ-002 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007 |
| REQ-003 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-008 |
| REQ-004 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006 |
| REQ-005 | UC-001, UC-002, UC-003, UC-005, UC-007 |
| REQ-006 | UC-004, UC-006, UC-007 |
| REQ-007 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007 |
| REQ-008 | UC-005 |
| REQ-009 | UC-005, UC-007 |
| REQ-010 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006 |
| REQ-011 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007 |
| REQ-012 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007, UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Bootstrap isolation and reproducible downstream handoff |
| AC-002 | Ownership readability and design objective are achieved |
| AC-003 | No regression from merged early-initializing behavior |
| AC-004 | Overlay lifecycle owner is real and executable |
| AC-005 | Native identity/projector extraction is real and executable |
| AC-006 | Native identity canonicalization prevents duplicate snapshot identities |
| AC-007 | Aggregate/snapshot behavior remains correct across pending and replacement states |
| AC-008 | Architecture guardrails are upheld |
| AC-009 | Basic implementation quality gates pass or blocker is explicitly recorded |
| AC-010 | Old duplicate overlay lifecycle paths are removed, not wrapped |

## Approval Status

Design-ready by delegated user instruction and completed value assessment. Ready for architecture review.

## Re-Entry Requirements Addendum — Native AutoByteus Live Member Must Not Drop Offline After Completion (2026-05-18)

### Added / Refined In-Scope Use Cases

- UC-009: A native AutoByteus member starts an active turn; status may be projected as `running` from turn lifecycle evidence even if the mutable native status snapshot still says `idle`.
- UC-010: A native AutoByteus member completes a turn and remains part of the active team; the member transitions to `idle`, not `offline`, even if the mutable native `team.context.agents` snapshot is stale or temporarily missing the native member.
- UC-011: A native AutoByteus `AGENT_STATUS` event carries an explicit status payload such as `status: "idle"`; backend conversion uses that event payload as the primary status source and uses mutable snapshots only as fallback/enrichment.
- UC-012: A classroom-style native team run with multiple native members preserves each live member status independently: professor and student may move `initializing -> running -> idle`, but must not drop to `offline` unless the backend/team/member is actually inactive or explicitly terminated.

### Added / Refined Functional Requirements

- REQ-013: Native AutoByteus status event conversion shall treat explicit native status event payloads (`status`) as the primary status source for `AGENT_STATUS` events.
- REQ-014: Native AutoByteus mutable team/member snapshots shall be used for identity, can-interrupt, and fallback status projection, but shall not override an explicit live native status event to `offline` merely because the current native member lookup is stale or missing.
- REQ-015: The native member status projector shall distinguish unknown-never-observed members from known live members. For a known member with an observed live status, a missing native member snapshot shall fall back to the observed status instead of `offline` while the backend remains active.
- REQ-016: A native AutoByteus member that completes a turn while the team/backend remains active shall settle to `idle`, not `offline`, unless an explicit terminal/offline event or backend termination occurs.
- REQ-017: The implementation shall preserve valid offline transitions for inactive backend/team termination and explicit member/team terminal events; the fix must not make observed statuses immortal.

### Added / Refined Acceptance Criteria

- AC-011: A regression test simulates a native `TURN_STARTED -> AGENT_STATUS(status=running) -> TURN_COMPLETED -> AGENT_STATUS(status=idle)` sequence and verifies the member status sequence is `running -> idle`, never `offline`, while the backend remains active.
- AC-012: A regression test simulates a native status update with `status: "idle"` while `team.context.agents` is empty/stale for that member and verifies the processed `AGENT_STATUS` payload is `idle` with the canonical configured member run id/route/path.
- AC-013: A regression test verifies `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot` returns the last observed live status for a known member when the native member snapshot is missing, and returns `offline` only for never-observed/inactive/explicitly terminal cases.
- AC-014: A classroom-style multi-member native test verifies professor and student statuses are independently retained as live (`running` or `idle`) and do not drop to `offline` after their responses complete.

### Approval / Classification Update

This addendum is a `Design Impact` correction discovered during user verification. The original status-lifecycle hardening design remains directionally correct for pending overlays and identity ownership, but it must be amended before implementation finalization because native status event flow after turn completion was under-specified.

## Re-Entry Requirements Addendum — Single Canonical Agent Status Event (2026-05-18)

### New Requirement Scope
The status lifecycle hardening work shall simplify AutoByteus status reporting by removing the duplicated `AGENT_STATUS_UPDATED` event concept in favor of one canonical `AGENT_STATUS` event. This is a clean-cut replacement, not a compatibility migration.

### Additional Functional Requirements
- **REQ-018:** The AutoByteus runtime stream, server domain event, websocket message, and frontend status pipeline MUST use one canonical agent status event concept named `AGENT_STATUS` for current status reporting.
- **REQ-019:** The canonical status event payload MUST expose the authoritative current status through a single `status` field after normalization. Transition metadata such as a previous status MAY be retained only as optional metadata and MUST NOT be required for display or lifecycle correctness.
- **REQ-020:** The codebase MUST remove `AGENT_STATUS_UPDATED` from the canonical runtime/server/frontend status path. No compatibility alias, dual-read branch, or legacy event wrapper may be retained for this in-repository product path.
- **REQ-021:** Native AutoByteus fine-grained statuses such as processing, awaiting LLM, analyzing response, awaiting tool approval, executing tool, processing tool result, and interrupting MUST map to app-facing `running`; bootstrapping/uninitialized MUST map to `initializing`; idle MUST map to `idle`; shutdown-complete MUST map to `offline`; error MUST map to `error`.

### Additional Acceptance Criteria
- **AC-015:** New or updated tests show that a native AutoByteus streamed `AGENT_STATUS { status: <native status> }` becomes server/websocket `AGENT_STATUS { status: <offline|initializing|idle|running|error> }` without passing through `AGENT_STATUS_UPDATED`.
- **AC-016:** The native AutoByteus live-idle regression is covered by a test where a member transitions from running to idle and remains live instead of dropping to offline.
- **AC-017:** Repository source code no longer uses `AGENT_STATUS_UPDATED` in the canonical runtime/server/frontend status path, and no compatibility alias or dual-path fallback remains.

### Supersession Note — Clean-Cut Status Event Naming

The single canonical `AGENT_STATUS` requirements supersede any earlier wording that preserved status-event wire compatibility for `AGENT_STATUS_UPDATED`. For this ticket, `AGENT_STATUS_UPDATED` is legacy in current-state evidence only and must not survive in the target runtime/server/frontend status path.

## Re-Entry Requirements Addendum — Preserve Internal Fine-Grained Status Vocabulary (2026-05-18)

### Boundary Clarification
The single `AGENT_STATUS` event-name cleanup MUST NOT remove AutoByteus's fine-grained internal status vocabulary. The target removes `AGENT_STATUS_UPDATED` and the canonical `new_status`/`old_status` event shape; it does not collapse internal runtime state into frontend-only status values.

### Additional Functional Requirements
- **REQ-022:** `autobyteus-ts` MUST preserve the fine-grained internal `AgentStatus` vocabulary for runtime control, internal consumers, CLI/internal displays, diagnostics, and future internal product behavior.
- **REQ-023:** `autobyteus-ts` status streaming MUST emit `AGENT_STATUS` with a canonical `status` field whose value is the fine-grained internal `AgentStatus` at the AutoByteus runtime boundary.
- **REQ-024:** `autobyteus-server-ts` MUST own the projection from fine-grained AutoByteus `AgentStatus` to public/product `AgentApiStatus` before emitting server-domain/websocket `AGENT_STATUS` payloads.
- **REQ-025:** Public/frontend status consumers MUST receive only the public/product runtime status vocabulary (`offline`, `initializing`, `idle`, `running`, `error`) unless a separate future feature explicitly adds fine-grained diagnostic UI under its own contract.
- **REQ-026:** The design MUST keep the internal/public status boundary explicit in type names, tests, and converter/projector responsibilities so `AGENT_STATUS` event-name unification does not imply a single status enum everywhere.

### Additional Acceptance Criteria
- **AC-018:** Tests verify fine-grained AutoByteus statuses still exist and are emitted by `autobyteus-ts` as `AGENT_STATUS { status: <fine-grained AgentStatus> }`.
- **AC-019:** Tests verify server projection maps fine-grained processing statuses (`processing_user_input`, `awaiting_llm_response`, `analyzing_llm_response`, `awaiting_tool_approval`, `executing_tool`, `processing_tool_result`, `interrupting`) to public `running`.
- **AC-020:** Tests verify startup statuses map to public `initializing`, `idle` maps to public `idle`, `shutdown_complete` maps to public `offline`, and `error` maps to public `error`.
- **AC-021:** Code review confirms the frontend/websocket path does not consume fine-grained internal statuses directly and the runtime/internal path does not lose them.
