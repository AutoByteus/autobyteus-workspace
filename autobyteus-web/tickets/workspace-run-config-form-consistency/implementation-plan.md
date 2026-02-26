# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Behavior bug is localized to run-entry UI handlers and one store action.
  - No schema/API contract changes.
  - Expected file touch count is small and confined to workspace run orchestration.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> proposed-design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes:
  - Root cause confirmed before coding: several "new run" handlers call `createInstanceFromTemplate()` directly, which selects a run and suppresses `RunConfigPanel` rendering.

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Minimum review rounds satisfied: `Yes` (`Small` requires >= 1)
- Final gate decision in review artifact is `Implementation can start: Yes`: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - UC-001: User clicks "+" from workspace run history tree agent row.
  - UC-002: User clicks "+" from active agent/team workspace header.
  - UC-003: User clicks "+" from running panel agent/team groups.
- Touched Files/Modules:
  - `stores/runHistoryStore.ts`
  - `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `components/workspace/agent/AgentWorkspaceView.vue`
  - `components/workspace/team/TeamWorkspaceView.vue`
  - `components/workspace/running/RunningAgentsPanel.vue`
  - related tests under `stores/__tests__` and `components/workspace/**/__tests__`
- API/Behavior Delta:
  - Change "new run" behavior from immediate draft instance creation to config-first preparation.
  - Keep run creation only in `RunConfigPanel` "Run Agent/Team" action.
- Key Assumptions:
  - Existing "Run" from catalog pages remains config-first and should not be changed.
  - `RunConfigPanel` is the canonical place to create instances.
- Known Risks:
  - Existing tests may assert old create-on-plus behavior and require updates.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001/UC-002/UC-003 | `tickets/workspace-run-config-form-consistency/proposed-design-based-runtime-call-stack.md` | `tickets/workspace-run-config-form-consistency/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: `1`
  - Final review round: `1`
  - Final review gate line (`Implementation can start`): `Yes`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `stores/runHistoryStore.ts` | none | Central behavior shift for left tree "+" flow. |
| 2 | Workspace UI handlers (`AgentWorkspaceView`, `TeamWorkspaceView`, `RunningAgentsPanel`) | existing config stores | Align entrypoints with config-first policy. |
| 3 | Tests (`runHistoryStore.spec.ts`, running/history panel tests) | implementation updates | Verify no regression in expected orchestration flow. |

## Step-By-Step Plan

1. Remove immediate draft instance creation from run-history draft action and keep config preparation only.
2. Update all in-workspace "+" handlers to clear selection and prepare config without creating instances.
3. Update tests to assert config-preparation behavior.
4. Run targeted vitest files for touched modules.

## Test Strategy

- Unit tests:
  - `stores/__tests__/runHistoryStore.spec.ts`
  - `components/workspace/running/__tests__/RunningAgentsPanel.spec.ts`
  - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- Integration tests:
  - N/A for this scoped front-end state fix.
