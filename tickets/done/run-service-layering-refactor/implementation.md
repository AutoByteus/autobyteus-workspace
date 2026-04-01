# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The change spans service APIs, multiple external-channel runtime callers, and targeted tests, but it stays within one architectural seam.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/run-service-layering-refactor/workflow-state.md`
- Investigation notes: `tickets/done/run-service-layering-refactor/investigation-notes.md`
- Requirements: `tickets/done/run-service-layering-refactor/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/run-service-layering-refactor/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/run-service-layering-refactor/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/done/run-service-layering-refactor/proposed-design.md`

## Document Status

- Current Status: `Implemented`
- Notes:
  - Stage 6 implementation is complete.
  - The final design keeps `AgentRunService` / `TeamRunService` pure and removes create-time activity seeding from the launcher path.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001`, `UC-002`, `UC-003`, `UC-004`
- Spine Inventory In Scope:
  - `DS-001`, `DS-002`, `DS-003`, `DS-004`
- Primary Owners / Main Domain Subjects:
  - `AgentRunService`
  - `TeamRunService`
  - `ChannelBindingRunLauncher`
  - `AcceptedReceiptRecoveryRuntime`
  - `ChannelAgentRunFacade`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `R-001`..`R-007` are covered by the use cases above.
- Target Architecture Shape:
  - Extend `AgentRunService` to own agent live lookup, active-or-restore resolution, and service-owned activity recording after accepted sends.
  - Add a service-owned team resolve helper and reuse `TeamRunService.recordRunActivity(...)` after accepted sends.
  - Keep `ChannelBindingRunLauncher` limited to binding continuity plus resolve/create orchestration only.
- API/Behavior Delta:
  - Add service APIs for agent live lookup, agent activity recording, and team active-or-restore.
  - Remove the temporary create-time activity API and the launcher `initialSummary` parameter.
  - Preserve current continuity behavior while moving activity persistence to the post-send path.
- Key Assumptions:
  - Service API expansion is the correct fix, not a new wrapper layer.
  - Team runtime manager remains internal to `TeamRunService`.
- Known Risks:
  - Agent create semantics differ today between GraphQL/service and external-channel launch; the refactor must preserve intended behavior while collapsing ownership into the service.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Candidate Go` | `1` |
| 2 | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Go Confirmed` | `2` |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-004` | `AgentRunService` / `TeamRunService` | Extend service APIs first | Approved design and review artifacts | Higher-level callers cannot be cleaned until the service APIs exist. |
| 2 | `DS-001`, `DS-002`, `DS-003` | external-channel runtime owners | Switch launcher/recovery/facade callers to service APIs | Service API changes | Removes manager bypasses after the service boundary is ready. |
| 3 | `DS-001`..`DS-003` | tests | Update/add unit tests for service and runtime callers | code changes | Validation must reflect the new authoritative boundaries. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Agent lifecycle boundary | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | same | agent lifecycle service | `Keep` | New APIs stay on the existing owner |
| Team lifecycle boundary | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | same | team lifecycle service | `Keep` | Resolve helper stays on the existing owner |
| Binding continuity owner | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | same | external-channel continuity | `Keep` | File remains, responsibility narrows |
| Recovery owner | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | same | accepted-receipt recovery | `Keep` | Uses service helpers |
| Agent dispatch owner | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | same | agent dispatch | `Keep` | Manager bypass removed if the strengthened service boundary is enough |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-004` | `AgentRunService` | Add agent live lookup, active-or-restore, and service-owned post-send activity recording | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | same | `Modify` | design gate | `Completed` | `autobyteus-server-ts/tests/unit/agent-execution/agent-run-create-service.test.ts` | `Passed` | `N/A` | `N/A` | `Passed` | No create-time activity API remains |
| `C-002` | `DS-004` | `TeamRunService` | Add team active-or-restore helper and keep team activity recording service-owned | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | same | `Modify` | design gate | `Completed` | `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-service.test.ts` | `Passed` | `N/A` | `N/A` | `Passed` | Runtime-context helper extracted to keep file size in gate |
| `C-003` | `DS-001`, `DS-002` | `ChannelBindingRunLauncher` | Limit launcher to resolve/create continuity only | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | same | `Modify` | `C-001`, `C-002` | `Completed` | `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts` | `Passed` | `N/A` | `N/A` | `Passed` | No message-content parameter remains |
| `C-004` | `DS-003` | `AcceptedReceiptRecoveryRuntime` | Use service helpers for run resolution | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | same | `Modify` | `C-001`, `C-002` | `Completed` | `autobyteus-server-ts/tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | `Passed` | `N/A` | `N/A` | `Passed` | Manager bypass removed |
| `C-005` | `DS-001` | `ChannelAgentRunFacade` / `ChannelTeamRunFacade` | Post message first, then record activity through the owning service | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | same | `Modify` | `C-001`, `C-002`, `C-003` | `Completed` | `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`, `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-team-run-facade.test.ts` | `Passed` | `N/A` | `N/A` | `Passed` | Lifecycle ordering now matches the intended abstraction |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001`, `AC-003` | `DS-001`, `DS-003`, `DS-004` | `Ownership Map`, `Ownership-Driven Dependency Rules` | `UC-001`, `UC-002`, `UC-004` | `C-001`, `C-003`, `C-004`, `C-005` | `Unit` | `AV-001`, `AV-002` |
| `R-002` | `AC-001`, `AC-003` | `DS-001`, `DS-003`, `DS-004` | `Change Inventory`, `Derived Implementation Mapping` | `UC-001`, `UC-002`, `UC-004` | `C-001`, `C-004`, `C-005` | `Unit` | `AV-001`, `AV-002` |
| `R-003` | `AC-002` | `DS-001`, `DS-004` | `Concrete Design Example` | `UC-002` | `C-001`, `C-003` | `Unit` | `AV-001` |
| `R-004` | `AC-002` | `DS-001`, `DS-004` | `Ownership Map` | `UC-002` | `C-001`, `C-003` | `Unit` | `AV-001` |
| `R-005` | `AC-001`, `AC-002`, `AC-004` | `DS-001`, `DS-002` | `Spine Narratives` | `UC-001`, `UC-002`, `UC-003` | `C-001`, `C-002`, `C-003` | `Unit` | `AV-001`, `AV-003` |
| `R-006` | `AC-004` | `DS-002`, `DS-003`, `DS-004` | `Change Inventory` | `UC-003`, `UC-004` | `C-002`, `C-004` | `Unit` | `AV-002`, `AV-003` |
| `R-007` | `AC-001`, `AC-004` | `DS-001`, `DS-002`, `DS-003`, `DS-004` | `Ownership Map`, `Subsystem Allocation` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `C-001`, `C-002`, `C-003`, `C-004`, `C-005` | `Unit` | `AV-001`, `AV-002`, `AV-003` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001`, `DS-004` | Launcher no longer mixes service and manager for agent lifecycle orchestration | `AV-001` | `API` | `Planned` |
| `AC-002` | `R-003`, `R-004` | `DS-001`, `DS-004` | Agent create path goes through `AgentRunService` with authoritative persistence | `AV-001` | `API` | `Planned` |
| `AC-003` | `R-001`, `R-002` | `DS-003`, `DS-004` | Recovery/runtime callers use service-owned active-or-restore behavior | `AV-002` | `API` | `Planned` |
| `AC-004` | `R-005`, `R-006`, `R-007` | `DS-002`, `DS-003`, `DS-004` | Team side remains service-owned and gains helper symmetry where appropriate | `AV-003` | `API` | `Planned` |
| `AC-005` | `R-001`..`R-007` | `DS-001`..`DS-004` | Targeted unit suites pass | `AV-001`, `AV-002`, `AV-003` | `API` | `Planned` |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-001` | `No` | `Unit + AV-001/AV-002` |
| `C-002` | `C-002` | `No` | `Unit + AV-003` |
| `C-003` | `C-003` | `Yes` | `Unit + AV-001` |
| `C-004` | `C-004` | `No` | `Unit + AV-002` |
| `C-005` | `C-005` | `No` | `Unit + AV-001` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | Direct `agentRunManager` dependency in `ChannelBindingRunLauncher` | `Remove` | Replace with service APIs and update tests | Must preserve live-owned reuse semantics |
| `T-DEL-002` | Launcher-owned agent metadata/history persistence | `Remove` | Route creation through `AgentRunService` | Must preserve intended initial history semantics |

### Step-By-Step Plan

1. Extend `AgentRunService` and `TeamRunService` with the needed lifecycle helpers.
2. Refactor external-channel runtime callers onto those service APIs.
3. Update or add targeted unit tests, then run focused validation suites.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/run-service-layering-refactor/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Pending`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/run-service-layering-refactor/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-01: Implementation baseline created after Stage 5 `Go Confirmed`.
- 2026-04-01: Removed direct manager bypasses from external-channel runtime and introduced service-owned resolve helpers.
- 2026-04-01: Removed create-time activity seeding, deleted launcher `initialSummary`, and moved activity recording to the post-send service path.
- 2026-04-01: Extracted `team-run-runtime-context-support.ts` so touched service files stay within the review-size gate.

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-04-01` | `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-restore-service.test.ts ...` | Agent service now owns active lookup, resolve, and post-send activity recording. |
| `C-002` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-04-01` | `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-run-service.test.ts ...` | Team service keeps pure create semantics and owns resolve/activity helpers. |
| `C-003` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-04-01` | `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts ...` | Launcher no longer accepts message content. |
| `C-004` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-04-01` | `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts ...` | Recovery runtime now resolves through service helpers only. |
| `C-005` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-04-01` | `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts ...` | Facades now post first, then call service-owned activity recording. |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/run-service-layering-refactor/api-e2e-testing.md` | `Pass` | `2026-04-01` | Focused executable validation passed; full-package typecheck remains blocked by pre-existing `TS6059` |
| 8 Code Review | `tickets/done/run-service-layering-refactor/code-review.md` | `Pass` | `2026-04-01` | No findings; touched source files remain within size/delta gates |
| 9 Docs Sync | `tickets/done/run-service-layering-refactor/docs-sync.md` | `Pass` | `2026-04-01` | No external docs impact; ticket artifacts updated |
| 10 Handoff / Ticket State | `tickets/done/run-service-layering-refactor/handoff-summary.md` | `Pass` | `2026-04-01` | User verification, repository finalization into `personal`, and ticket cleanup are complete; no release/version step was required |
