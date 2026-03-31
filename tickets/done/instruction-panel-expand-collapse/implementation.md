# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning: the change is isolated to one reusable frontend interaction component, two detail-view integrations, and targeted frontend tests.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/instruction-panel-expand-collapse/workflow-state.md`
- Investigation notes: `tickets/done/instruction-panel-expand-collapse/investigation-notes.md`
- Requirements: `tickets/done/instruction-panel-expand-collapse/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/instruction-panel-expand-collapse/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/instruction-panel-expand-collapse/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `In Execution`
- Notes: Stage 10 user verification reopened Stage 6 for a small local-fix refinement to the collapsed affordance layout; downstream Stages 7-9 will be rerun after the patch.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`
- Primary Owners / Main Domain Subjects: `AgentDetail.vue`, `AgentTeamDetail.vue`, new shared instruction component
- Requirement Coverage Guarantee: every in-scope requirement maps to at least one use case and at least one planned verification step
- Design-Risk Use Cases: none
- Target Architecture Shape: both detail pages render one shared `ExpandableInstructionCard` that owns overflow measurement, preview fade, and chevron toggle state while page components keep their page-specific layout and data ownership
- New Owners/Boundary Interfaces To Introduce: `autobyteus-web/components/common/ExpandableInstructionCard.vue`
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta: long instructions become preview-collapsed by default with fade plus chevron-only toggle; short instructions remain fully visible with no toggle
- Key Assumptions: overflow can be measured locally via rendered content height; visible label text is not required because the chevron and fade provide sufficient visual cue
- Known Risks: measurement logic must remain stable under viewport resize and test environments

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-002,DS-003 | shared instruction component | `autobyteus-web/components/common/ExpandableInstructionCard.vue` | N/A | shared overflow and toggle logic should exist before page integrations |
| 2 | DS-001 | agent detail page | `autobyteus-web/components/agents/AgentDetail.vue` | C-001 | agent page integrates the shared owner |
| 3 | DS-001 | team detail page | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | C-001 | team page integrates the shared owner |
| 4 | DS-001,DS-002,DS-003 | frontend verification | component and page test files | C-001,C-002,C-003 | tests verify shared behavior and page integration |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| shared instruction behavior | duplicated inline in detail pages | `autobyteus-web/components/common/ExpandableInstructionCard.vue` | shared frontend instruction UX | Promote Shared | confirm both pages stop owning overflow/toggle logic |
| agent detail composition | `autobyteus-web/components/agents/AgentDetail.vue` | same | agent detail page | Keep | verify page still owns agent-specific layout only |
| team detail composition | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | same | team detail page | Keep | verify page still owns team-specific layout only |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-002,DS-003 | shared instruction component | overflow detection, fade, chevron-only toggle | N/A | `autobyteus-web/components/common/ExpandableInstructionCard.vue` | Create | N/A | Completed | `autobyteus-web/components/common/__tests__/ExpandableInstructionCard.spec.ts` | Passed | N/A | N/A | Passed | shared owner for instruction preview behavior |
| C-002 | DS-001 | agent detail page | replace inline instructions card body with shared component | `autobyteus-web/components/agents/AgentDetail.vue` | same | Modify | C-001 | Completed | `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | Passed | `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | Passed | Passed | keep agent-specific page layout |
| C-003 | DS-001 | team detail page | replace inline instructions card body with shared component | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | same | Modify | C-001 | Completed | `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Passed | `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Passed | Passed | keep team-specific page layout |
| C-004 | DS-001,DS-002,DS-003 | frontend verification | direct shared-component behavior coverage | N/A | `autobyteus-web/components/common/__tests__/ExpandableInstructionCard.spec.ts` | Create | C-001 | Completed | `autobyteus-web/components/common/__tests__/ExpandableInstructionCard.spec.ts` | Passed | N/A | N/A | Passed | verifies short-content, overflow, toggle semantics, and no nested-scroll behavior |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | DS-001 | Solution Sketch | UC-001,UC-002 | C-002,C-003 | Unit + Integration | AV-001 |
| R-002 | AC-002 | DS-001,DS-002 | Solution Sketch | UC-002 | C-001,C-002,C-003,C-004 | Unit + Integration | AV-002 |
| R-003 | AC-003,AC-005 | DS-001,DS-002,DS-003 | Solution Sketch | UC-002,UC-003 | C-001,C-002,C-003,C-004 | Unit + Integration | AV-003 |
| R-004 | AC-006,AC-008 | DS-003 | Solution Sketch | UC-003 | C-001,C-004 | Unit + Integration | AV-004 |
| R-005 | AC-007 | DS-001 | Solution Sketch | UC-001 | C-001,C-002,C-003,C-004 | Unit + Integration | AV-005 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | DS-001 | Agent and team detail views both use the same shared interaction model | AV-001 | E2E | Planned |
| AC-002 | R-002 | DS-001,DS-002 | Long content is preview-limited on initial render | AV-002 | E2E | Planned |
| AC-003 | R-003 | DS-001,DS-002 | No inner scrollbar is introduced in collapsed or expanded state | AV-003 | E2E | Planned |
| AC-004 | R-002 | DS-001,DS-002 | Overflowing content shows the chevron affordance | AV-002 | E2E | Planned |
| AC-005 | R-003 | DS-001,DS-003 | Chevron expands to full inline height | AV-003 | E2E | Planned |
| AC-006 | R-004 | DS-003 | Chevron collapses back to preview state | AV-004 | E2E | Planned |
| AC-007 | R-005 | DS-001 | Short content renders fully with no control noise | AV-005 | E2E | Planned |
| AC-008 | R-004 | DS-003 | Toggle exposes accessible state semantics | AV-004 | E2E | Planned |

### Step-By-Step Plan

1. Create the shared `ExpandableInstructionCard.vue` component with overflow measurement, fade overlay, and chevron-only toggle behavior.
2. Replace the duplicated instruction-card body in `AgentDetail.vue`.
3. Replace the duplicated instruction-card body in `AgentTeamDetail.vue`.
4. Add direct component tests and update page tests for integration coverage.
5. Run targeted frontend tests and then proceed to Stage 7 executable validation.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/instruction-panel-expand-collapse/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/instruction-panel-expand-collapse/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-03-31: small-scope solution sketch finalized after Stage 5 `Go Confirmed`
- 2026-03-31: created `ExpandableInstructionCard.vue` with overflow measurement, fade overlay, and chevron-only toggle behavior
- 2026-03-31: integrated the shared instruction component into `AgentDetail.vue` and `AgentTeamDetail.vue`
- 2026-03-31: targeted executable validation passed for shared component and both page integrations
- 2026-03-31: full workspace `nuxt typecheck` was attempted but reported broad unrelated baseline errors outside this ticket’s changed scope
- 2026-03-31: user verification found the fade too aggressive and the chevron visually consuming its own row; Stage 6 local-fix re-entry opened to overlay the chevron within the fade area and reduce fade intensity
- 2026-03-31: refined `ExpandableInstructionCard.vue` so the collapsed chevron overlays the fade zone instead of taking its own row, reduced fade strength, and reran the targeted frontend suite successfully
- 2026-03-31: user verification accepted the overlay placement but found the chevron too subtle; Stage 6 local-fix re-entry opened again to make the toggle larger, higher-contrast, and circular using the frontend’s existing Iconify pattern
- 2026-03-31: upgraded the shared toggle to a larger circular Iconify chevron with stronger contrast and reran the targeted frontend suite successfully

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/instruction-panel-expand-collapse/api-e2e-testing.md` | Passed | 2026-03-31 | targeted frontend executable validation reran cleanly after the stronger toggle-affordance refinement |
| 8 Code Review | `tickets/done/instruction-panel-expand-collapse/code-review.md` | Pass | 2026-03-31 | rerun recorded no blocking findings after the stronger toggle-affordance patch |
| 9 Docs Sync | `tickets/done/instruction-panel-expand-collapse/docs-sync.md` | No impact | 2026-03-31 | stronger toggle-affordance refinement did not change the earlier no-impact docs conclusion |
