# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: The fix stays within web client store/projection/component/test boundaries and does not require backend schema/API changes.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> proposed-design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes: Round 1 findings were written back into v2 artifacts; round 2 passed gate (`Implementation can start: Yes`).

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Minimum review rounds satisfied: Yes (2/1)
- Final gate decision in review artifact is `Implementation can start: Yes`: Yes

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - UC-001: Workspace tree agent rows display avatar image with initials fallback.
  - UC-002: Avatar fallback recovers after refresh cycle instead of permanently sticking.
  - UC-003: Avatar data composition ownership is in run-history store lifecycle, not component lifecycle coupling.
- Touched Files/Modules:
  - `stores/runHistoryStore.ts`
  - `utils/runTreeProjection.ts`
  - `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `stores/__tests__/runHistoryStore.spec.ts`
  - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- API/Behavior Delta:
  - Extend run-tree agent node with `agentAvatarUrl`.
  - Add run-history-store-owned avatar cache hydration flow.
  - Component no longer preloads definitions for this feature path.
  - Avatar error fallback reset on refresh completion.
- Key Assumptions:
  - Definition avatar + live-context avatar are sufficient sources for tree rendering.
- Known Risks:
  - Cross-node `agentDefinitionId` collision remains a follow-up risk (non-blocking for this ticket).

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001..003 | `tickets/workspace-tree-avatar-hardening/proposed-design-based-runtime-call-stack.md` | `tickets/workspace-tree-avatar-hardening/runtime-call-stack-review.md` | Pass | Pass | Pass | Fail | Yes | Fail |
| 2 | UC-001..003 | `tickets/workspace-tree-avatar-hardening/proposed-design-based-runtime-call-stack.md` | `tickets/workspace-tree-avatar-hardening/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: 2
  - Final review round: 2
  - Final review gate line (`Implementation can start`): Yes

## Principles

- Data composition in store, render behavior in component, merge/sort in utility.
- No legacy/backward-compat behavior branches.
- Keep feature local to workspace tree path.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `stores/runHistoryStore.ts` | existing fetchTree/getTreeNodes flow | Establish SoC ownership and avatar cache first. |
| 2 | `utils/runTreeProjection.ts` | step 1 contract | Align projection model with explicit avatar field. |
| 3 | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | steps 1-2 | Consume contract and own only render/error state. |
| 4 | tests | steps 1-3 | Lock regressions and verify behavior. |

## Step-By-Step Plan

1. Introduce store-owned avatar index and hydration in `fetchTree`.
2. Remove component dependency on `agentDefinitionStore.fetchAllAgentDefinitions`.
3. Make avatar error key include URL and reset on refresh completion.
4. Update targeted tests and run focused vitest commands.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `stores/runHistoryStore.ts` | store owns avatar index and no component preload dependency | `stores/__tests__/runHistoryStore.spec.ts` pass | N/A | SoC owner |
| `utils/runTreeProjection.ts` | avatar field propagated end-to-end in projection model | covered by store tests | N/A | pure utility |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | render + recoverable fallback behavior | component spec pass | N/A | presentation only |
