# Stage 7 Executable Validation (API/E2E)

Use this document for Stage 7 executable validation implementation and execution.
Stage 7 can cover API, browser/UI, native desktop/UI, CLI, process/lifecycle, integration, or other executable scenarios when those are the real boundaries being proven.
Do not use this file for unit/integration tracking; that belongs in `implementation.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

## Validation Round Meta

- Current Validation Round: `2`
- Trigger Stage: `6`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Testing Scope

- Ticket: `skill-prompt-absolute-paths`
- Scope classification: `Small`
- Workflow state source: `tickets/done/skill-prompt-absolute-paths/workflow-state.md`
- Requirements source: `tickets/done/skill-prompt-absolute-paths/requirements.md`
- Call stack source: `tickets/done/skill-prompt-absolute-paths/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`
- Interface/system shape in scope: `Other`
- Platform/runtime targets: `autobyteus-ts` local Node/Vitest runtime
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-ts/tests/unit/skills/format-skill-content-for-prompt.test.ts`
  - `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts`
  - `autobyteus-ts/tests/unit/tools/skill/load-skill.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-skills.test.ts`
  - `autobyteus-ts/tests/integration/tools/skill/load-skill.test.ts`
- Temporary validation methods or setup to use only if needed:
  - none
- Cleanup expectation for temporary validation:
  - none

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Initial formatter and consumer validation passed |
| 2 | Stage 6 local-fix rerun after Stage 10 consistency review | N/A | Yes | Pass | Yes | First rerun exposed one stale integration assertion expecting the old guidance copy; the assertion was updated and the authoritative rerun passed with the same focused suite plus `tsc` |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001` | Preloaded skill prompt injection rewrites same-directory relative Markdown link targets to absolute paths | `AV-001`, `AV-005` | Passed | 2026-04-08 |
| `AC-002` | `REQ-001` | Child-directory references rewrite correctly when the target exists | `AV-001`, `AV-005` | Passed | 2026-04-08 |
| `AC-003` | `REQ-001` | Parent-relative references rewrite correctly when the target exists | `AV-002` | Passed | 2026-04-08 |
| `AC-004` | `REQ-002` | External URLs, anchors, absolute paths, and unresolved targets remain unchanged | `AV-002` | Passed | 2026-04-08 |
| `AC-005` | `REQ-003` | Rewritten output preserves labels and uses skill-visible absolute paths without exposing symlink-target metadata | `AV-002`, `AV-005`, `AV-006` | Passed | 2026-04-08 |
| `AC-006` | `REQ-004` | `load_skill` output uses the same rewritten target behavior as preloaded prompt injection | `AV-003`, `AV-006` | Passed | 2026-04-08 |
| `AC-007` | `REQ-005` | Automated coverage guards architect-style links and unchanged non-relative targets | `AV-001`, `AV-002`, `AV-003`, `AV-004`, `AV-005`, `AV-006` | Passed | 2026-04-08 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `AvailableSkillsProcessor` | `AV-001`, `AV-005` | Passed | Helper and consumer assertions both passed |
| `DS-002` | `Primary End-to-End` | `loadSkill` | `AV-003`, `AV-006` | Passed | Tool unit and integration assertions both passed |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `DS-001` | Requirement | `AC-001`, `AC-002` | `REQ-001` | `UC-001` | Other | local Node/Vitest | None | Same-dir and child-dir rewriting in preloaded prompt path | Preloaded prompt output contains absolute targets for same-dir and child-dir links | `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | None | shared Vitest command | Passed |
| `AV-002` | `DS-001` | Requirement | `AC-003`, `AC-004`, `AC-005` | `REQ-001`, `REQ-002`, `REQ-003` | `UC-003`, `UC-004` | Other | local Node/Vitest | None | Parent-relative rewrite and unchanged-target guardrails | Formatter rewrites parent-relative links and leaves non-relative/unresolved targets unchanged while preserving labels | `autobyteus-ts/tests/unit/skills/format-skill-content-for-prompt.test.ts` | None | shared Vitest command | Passed |
| `AV-003` | `DS-002` | Requirement | `AC-006` | `REQ-004` | `UC-005` | Other | local Node/Vitest | None | `load_skill` output reuses formatter behavior | Tool output contains rewritten absolute targets | `autobyteus-ts/tests/unit/tools/skill/load-skill.test.ts` | None | shared Vitest command | Passed |
| `AV-004` | `DS-001`, `DS-002` | Requirement | `AC-007` | `REQ-005` | `UC-001`, `UC-004`, `UC-005` | Other | local Node/Vitest | None | Durable helper coverage exists | New helper-focused unit coverage is present and passing | `autobyteus-ts/tests/unit/skills/format-skill-content-for-prompt.test.ts` | None | shared Vitest command | Passed |
| `AV-005` | `DS-001` | Requirement | `AC-001`, `AC-002`, `AC-005`, `AC-007` | `REQ-001`, `REQ-003`, `REQ-005` | `UC-001`, `UC-002` | Other | local Node/Vitest | None | Integration path through `AgentFactory` preloaded skills | Real preloaded agent prompt shows rewritten absolute targets | `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | None | shared Vitest command | Passed |
| `AV-006` | `DS-002` | Requirement | `AC-005`, `AC-006`, `AC-007` | `REQ-003`, `REQ-004`, `REQ-005` | `UC-005` | Other | local Node/Vitest | None | Integration path through registered `load_skill` tool | Real `load_skill` tool output shows rewritten absolute targets | `autobyteus-ts/tests/integration/tools/skill/load-skill.test.ts` | None | shared Vitest command | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` | Helper | Yes | `AV-001` through `AV-006` | Shared formatter added for both prompt-visible skill surfaces |
| `autobyteus-ts/tests/unit/skills/format-skill-content-for-prompt.test.ts` | Other | Yes | `AV-002`, `AV-004` | Covers same-dir, child-dir, parent-dir, and unchanged-target cases |
| `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | Other | Yes | `AV-001` | Confirms prompt processor consumes rewritten content |
| `autobyteus-ts/tests/unit/tools/skill/load-skill.test.ts` | Other | Yes | `AV-003` | Confirms `load_skill` consumes rewritten content |
| `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | Other | Yes | `AV-005` | Confirms `AgentFactory` preloaded prompt output carries rewritten links |
| `autobyteus-ts/tests/integration/tools/skill/load-skill.test.ts` | Other | Yes | `AV-006` | Confirms integration `load_skill` output carries rewritten links |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| None | N/A | `N/A` | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `1` | `N/A` | `Pass` | `Resolved` | Same authoritative Vitest + `tsc` rerun on 2026-04-08 | Round 2 revalidated the entire scoped behavior after the model-facing guidance-copy local fix |

## Failure Escalation Log

- Round 2 initial rerun surfaced one stale integration assertion in `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` that still expected the old prompt heading text.
- The assertion was updated during the same local-fix cycle, and the authoritative rerun passed. No product/runtime failure remained in the authoritative round.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): `Local Node/Vitest environment required`
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `N/A`
- Compensating automated evidence:
  - `pnpm exec tsc -p tsconfig.build.json --noEmit`
- Residual risk notes:
  - Non-Markdown skill reference conventions are intentionally out of scope for this ticket
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `N/A`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage:
  - N/A

## Stage 7 Gate Decision

- Latest authoritative round: `2`
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
- Notes:
  - Authoritative command:
    - `pnpm exec vitest --run tests/unit/skills/format-skill-content-for-prompt.test.ts tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts tests/unit/tools/skill/load-skill.test.ts tests/integration/agent/agent-skills.test.ts tests/integration/tools/skill/load-skill.test.ts`
  - Supporting type-safety command:
    - `pnpm exec tsc -p tsconfig.build.json --noEmit`
  - Round 2 refreshed the same focused gate after aligning the model-facing guidance copy with the already-rewritten absolute-link behavior.
