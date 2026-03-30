# API/E2E Testing

## Validation Round Meta

- Current Validation Round: `1`
- Trigger Stage: `6`
- Prior Round Reviewed: `None`
- Latest Authoritative Round: `1`

## Testing Scope

- Ticket: `team-global-thinking-config`
- Scope classification: `Small`
- Workflow state source: `tickets/done/team-global-thinking-config/workflow-state.md`
- Requirements source: `tickets/done/team-global-thinking-config/requirements.md`
- Call stack source: `tickets/done/team-global-thinking-config/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A (Small scope)`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-web/types/agent/__tests__/TeamRunConfig.spec.ts`
  - `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts`
  - `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
  - `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- Temporary validation methods or setup to use only if needed:
  - None required.
- Cleanup expectation for temporary validation:
  - No temporary validation-only scaffolding was introduced.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | Focused Vitest suites passed for all mapped scenarios. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-101 | R-101 / R-102 | Team form renders the global thinking/model-config controls | AV-101 | Passed | 2026-03-30 |
| AC-102 | R-104 | Launch payload inherits team-global `llmConfig` when member override is absent | AV-102 | Passed | 2026-03-30 |
| AC-103 | R-103 | Member override item displays inherited global config by default | AV-103 | Passed | 2026-03-30 |
| AC-104 | R-103 | Divergent member keeps only the explicit override | AV-104 | Passed | 2026-03-30 |
| AC-105 | R-101 / R-105 | Rehydrated team config reconstructs global defaults and drops redundant overrides | AV-105 | Passed | 2026-03-30 |
| AC-106 | R-106 | Invalid global/member config is cleared or sanitized on runtime/model changes | AV-106 | Passed | 2026-03-30 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End / Bounded Local | Team config UI | AV-101, AV-103, AV-104, AV-106 | Passed | Global UI, member inheritance, divergence, and sanitize paths covered in component specs. |
| DS-002 | Primary End-to-End | Team launch state | AV-102 | Passed | Launch payload and temporary team context inheritance covered in store specs. |
| DS-003 | Primary End-to-End / Bounded Local | Team reopen / hydration | AV-105 | Passed | Shared restore inference helper covered with focused reconstruction assertions. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-101 | DS-001 | Requirement | AC-101 | R-101, R-102 | UC-101 | E2E | Prove team config UI exposes the same global model-config control pattern as single-agent config | Team form renders global `ModelConfigSection` when the selected model exposes schema | `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | None | `pnpm -C autobyteus-web exec vitest run ...TeamRunConfigForm.spec.ts...` | Passed |
| AV-102 | DS-002 | Requirement | AC-102 | R-104 | UC-102 | API | Prove global `llmConfig` is expanded into launched members unless explicitly overridden | Launch payload and temporary member contexts inherit global `llmConfig` | `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`, `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | None | `pnpm -C autobyteus-web exec vitest run ...agentTeamContextsStore.spec.ts ...agentTeamRunStore.spec.ts` | Passed |
| AV-103 | DS-001 | Requirement | AC-103 | R-103 | UC-103 | E2E | Prove member override item uses the inherited global config as its effective displayed value | Member override renders the inherited thinking value without creating a member-specific `llmConfig` override | `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | None | `pnpm -C autobyteus-web exec vitest run ...MemberOverrideItem.spec.ts` | Passed |
| AV-104 | DS-001 | Requirement | AC-104 | R-103 | UC-103 | E2E | Prove member divergence persists only when different from the global config | Explicit object/null override is emitted only for the divergent member | `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | None | `pnpm -C autobyteus-web exec vitest run ...MemberOverrideItem.spec.ts` | Passed |
| AV-105 | DS-003 | Requirement / Design-Risk | AC-105 | R-101, R-105 | UC-104, UC-105 | API | Prove reopened team metadata reconstructs a stable global default with minimal overrides | Restored config chooses dominant defaults and keeps only divergent member overrides | `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | None | `pnpm -C autobyteus-web exec vitest run ...teamRunConfigUtils.spec.ts` | Passed |
| AV-106 | DS-001 | Requirement | AC-106 | R-106 | UC-105 | E2E | Prove stale model-config is cleared when runtime/model changes invalidate the schema | Invalid team-global/member config is cleared or sanitized instead of leaking forward | `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | None | `pnpm -C autobyteus-web exec vitest run ...TeamRunConfigForm.spec.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`E2E Test`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/__tests__/TeamRunConfig.spec.ts` | API Test | Yes | AV-101 | Confirms the new default top-level `llmConfig` field is present in team config state. |
| `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | API Test | Yes | AV-105 | Covers explicit override semantics, equality normalization, and restore inference. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | E2E Test | Yes | AV-101, AV-106 | Covers global config rendering and runtime/model sanitize flows. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | E2E Test | Yes | AV-103, AV-104 | Covers inherited config display and explicit null/object override behavior. |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | API Test | Yes | AV-102 | Covers temporary team-context inheritance. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | API Test | Yes | AV-102 | Covers create-team-run member payload inheritance for both flat and nested teams. |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A |

## Failure Escalation Log

- None.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - A broader accidental `test:nuxt` invocation ran unrelated suites and hit existing sandbox/baseline failures outside this ticket.
  - Offline sandbox blocked `nuxi typecheck` from fetching `vue-tsc`, so Stage 7 relies on the durable in-repo Vitest coverage above.
- Compensating automated evidence:
  - Focused component/store/helper Vitest suites covering all mapped acceptance criteria and spines passed in one authoritative run.
- Residual risk notes:
  - Reopened-team default inference is heuristic for heterogeneous member configs, but deterministic majority/tie-break behavior is now encoded and covered.
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `N/A`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

## Stage 7 Gate Decision

- Latest authoritative round: `1`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable API/E2E validation that should live in the repository was implemented or updated: `Yes`
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
- Notes:
  - Authoritative command: `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts`.
