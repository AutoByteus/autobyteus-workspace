# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `3`
- Trigger Stage: `6`
- Prior Round Reviewed: `2`
- Latest Authoritative Round: `3`

## Testing Scope

- Ticket: `instruction-panel-expand-collapse`
- Scope classification: `Small`
- Workflow state source: `tickets/done/instruction-panel-expand-collapse/workflow-state.md`
- Requirements source: `tickets/done/instruction-panel-expand-collapse/requirements.md`
- Call stack source: `tickets/done/instruction-panel-expand-collapse/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`
- Interface/system shape in scope: `Browser UI`
- Platform/runtime targets: `Nuxt 3`, `Vue 3`, `Vitest`, `Vue Test Utils`, `Happy DOM`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-web/components/common/__tests__/ExpandableInstructionCard.spec.ts`
  - `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts`
  - `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts`
- Temporary validation methods or setup to use only if needed: `None`
- Cleanup expectation for temporary validation: `N/A`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Durable frontend executable validation added and targeted scenarios passed |
| 2 | Stage 6 local-fix re-entry exit | Yes | No | Pass | No | Shared component refinement reduced fade strength and moved the collapsed chevron into the fade zone without breaking page integration behavior |
| 3 | Stage 6 local-fix re-entry exit | Yes | No | Pass | Yes | Shared component refinement upgraded the toggle to a larger circular Iconify chevron with stronger contrast while preserving the overlaid collapsed affordance |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Shared UX across agent and team detail views | AV-001 | Passed | 2026-03-31 |
| AC-002 | R-002 | Default preview for long content | AV-002 | Passed | 2026-03-31 |
| AC-003 | R-003 | No inner scrollbar | AV-003 | Passed | 2026-03-31 |
| AC-004 | R-002 | Expand affordance visibility | AV-002 | Passed | 2026-03-31 |
| AC-005 | R-003 | Full inline expansion | AV-003 | Passed | 2026-03-31 |
| AC-006 | R-004 | Collapse control availability | AV-004 | Passed | 2026-03-31 |
| AC-007 | R-005 | Short-content simplicity | AV-005 | Passed | 2026-03-31 |
| AC-008 | R-004 | Accessible toggle semantics | AV-004 | Passed | 2026-03-31 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | detail pages | AV-001, AV-002, AV-005 | Passed | page integrations verified on both agent and team detail screens |
| DS-002 | Bounded Local | shared instruction component | AV-002, AV-003 | Passed | overflow detection and collapsed viewport behavior verified |
| DS-003 | Bounded Local | shared instruction component | AV-003, AV-004 | Passed | toggle state and accessibility semantics verified |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001 | R-001 | UC-001,UC-002 | Integration | `Vitest + Vue Test Utils` | None | agent/team detail integration parity | both detail pages expose the same chevron-driven instruction UX | `AgentDetail.spec.ts`, `AgentTeamDetail.spec.ts` | None | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/instruction-panel-expand-collapse/autobyteus-web exec vitest --run components/common/__tests__/ExpandableInstructionCard.spec.ts components/agents/__tests__/AgentDetail.spec.ts components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Passed |
| AV-002 | DS-001,DS-002 | Requirement | AC-002,AC-004 | R-002 | UC-002 | Integration | `Vitest + Vue Test Utils` | None | overflowing content should preview-collapse and show affordance | fade and downward chevron render only when content overflows, the collapsed chevron overlays the faded text area instead of taking a separate row, and the toggle remains visually discoverable with a circular higher-contrast affordance | `ExpandableInstructionCard.spec.ts`, page detail specs | None | same targeted Vitest command | Passed |
| AV-003 | DS-002,DS-003 | Requirement | AC-003,AC-005 | R-003 | UC-002,UC-003 | Integration | `Vitest + Vue Test Utils` | None | no nested scrolling, full inline expansion | collapsed state uses hidden overflow and expanded state removes the collapsed viewport restriction | `ExpandableInstructionCard.spec.ts` | None | same targeted Vitest command | Passed |
| AV-004 | DS-003 | Requirement | AC-006,AC-008 | R-004 | UC-003 | Integration | `Vitest + Vue Test Utils` | None | toggle must remain accessible and reversible | `aria-expanded` flips correctly and collapse/expand works from the same control | `ExpandableInstructionCard.spec.ts`, page detail specs | None | same targeted Vitest command | Passed |
| AV-005 | DS-001 | Requirement | AC-007 | R-005 | UC-001 | Integration | `Vitest + Vue Test Utils` | None | short content should remain simple | short content shows no toggle or fade | `ExpandableInstructionCard.spec.ts`, `AgentDetail.spec.ts` | None | same targeted Vitest command | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/common/__tests__/ExpandableInstructionCard.spec.ts` | Other | Yes | AV-002, AV-003, AV-004, AV-005 | direct shared-component executable validation |
| `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | Other | Yes | AV-001, AV-002 | agent detail integration coverage |
| `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Other | Yes | AV-001, AV-002 | team detail integration coverage |

## Failure Escalation Log

None.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- Environment constraints (secrets/tokens/access limits/dependencies): full Nuxt typecheck currently reports many unrelated baseline workspace issues outside this ticket’s changed scope
- Compensating automated evidence: targeted executable validation for all in-scope scenarios passed
- Residual risk notes: no browser-level screenshot automation was added; current confidence comes from component/page executable tests plus code review
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`

## Stage 7 Gate Decision

- Latest authoritative round: `3`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes: targeted frontend executable validation is authoritative for this ticket; full workspace typecheck remains noisy for unrelated pre-existing issues
