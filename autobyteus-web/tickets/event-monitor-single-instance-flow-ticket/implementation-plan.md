# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: Focused UI architecture simplification in workspace instance navigation with limited store cleanup; no API/schema/backend changes.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking (design doc optional)

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Runtime call stack review gate passed for all in-scope use cases.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Select an existing agent/team instance from the left running panel and render only that instance in the center.
  - Create a new instance from the left group-level `+` and switch center view to it.
  - Close/remove an instance from the left panel and auto-select fallback instance (or empty state).
  - Collapse left panel and require explicit reopen for switching (no center-tab fallback).
- Touched Files/Modules:
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/AgentEventMonitorTabs.vue` (remove)
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/team/AgentTeamEventMonitorTabs.vue` (remove)
  - `/Users/normy/autobyteus_org/autobyteus-web/stores/agentContextsStore.ts` (remove dead getter)
  - `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts` (doc wording cleanup)
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/RunningInstanceRow.vue` (comment cleanup)
- API/Behavior Delta:
  - Center workspace no longer has per-instance tabs.
  - Instance switching happens only from the left running panel.
  - If left panel is collapsed, user must reopen it to switch.
- Key Assumptions:
  - Single source of truth for selected context remains `agentSelectionStore`.
  - Left panel is the canonical control surface for create/switch/remove.
- Known Risks:
  - Users who relied on center tabs must adapt to left-panel-only switching.
  - Mobile users may need one extra navigation hop in some flows.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Select instance from left panel | `tickets/event-monitor-single-instance-flow-ticket/design-based-runtime-call-stack.md` | `tickets/event-monitor-single-instance-flow-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Create new instance from left panel | `tickets/event-monitor-single-instance-flow-ticket/design-based-runtime-call-stack.md` | `tickets/event-monitor-single-instance-flow-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Remove selected instance with fallback selection | `tickets/event-monitor-single-instance-flow-ticket/design-based-runtime-call-stack.md` | `tickets/event-monitor-single-instance-flow-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Collapsed-left-panel switching behavior | `tickets/event-monitor-single-instance-flow-ticket/design-based-runtime-call-stack.md` | `tickets/event-monitor-single-instance-flow-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Small`: refine implementation plan (and add design notes if needed), then regenerate call stack and re-review.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: run targeted tests in touched areas.
- One file at a time is the default.
- Update progress after each meaningful status change.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `tickets/event-monitor-single-instance-flow-ticket/*.md` | Existing workspace selection architecture | Pre-implementation gate and traceability |
| 2 | `AgentWorkspaceView.vue` + `TeamWorkspaceView.vue` | Selection state from stores | Remove duplicated center-tab UI surface |
| 3 | Remove tab components | Workspace views no longer importing tabs | Dead-code elimination |
| 4 | `agentContextsStore.ts` + `agentRunStore.ts` cleanup | Post-removal usage scan | Remove stale getter/comments |
| 5 | Targeted tests | Final code state | Verify behavior and store integrity |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | Yes | N/A |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | `AgentEventMonitorTabs.vue` | `Remove` | Remove imports/usages and verify no references remain | Low |
| T-DEL-002 | `AgentTeamEventMonitorTabs.vue` | `Remove` | Remove imports/usages and verify no references remain | Low |

## Step-By-Step Plan

1. Replace center tab containers with direct active-instance rendering in agent/team workspace views.
2. Remove obsolete tab components and stale imports.
3. Run dead-reference scan; remove now-unused `agentContextsStore.allInstances` getter.
4. Run targeted unit tests for workspace layout/running panel/store interactions.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | No center tabs; renders selected agent only | Workspace layout test passes | N/A | Empty state preserved |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | No team tabs; renders selected team only | Existing tests unaffected | N/A | Empty state preserved |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentContextsStore.ts` | Unused getter removed cleanly | Store tests pass | N/A | No behavior change in selection |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | None | Not needed | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Redundant center instance tabs duplicated left-panel switching | Workspace views + removed tab components | Solution Sketch | Remove duplicate navigation surface | Updated |
| Dead getter after tab removal | `stores/agentContextsStore.ts:allInstances` | Solution Sketch | Remove dead getter | Updated |
| Dead selection getter after surface consolidation | `stores/agentSelectionStore.ts:hasSelection` | Solution Sketch | Remove dead getter | Updated |

## Test Strategy

- Unit tests:
  - `pnpm test:nuxt components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run`
  - `pnpm test:nuxt components/workspace/running/__tests__/RunningAgentsPanel.spec.ts --run`
  - `pnpm test:nuxt stores/__tests__/agentContextsStore.spec.ts --run`
  - `pnpm test:nuxt stores/__tests__/agentRunStore.spec.ts --run`
- Integration tests: N/A for this small UI architecture change.
- Test data / fixtures: Existing testing-pinia fixtures.
