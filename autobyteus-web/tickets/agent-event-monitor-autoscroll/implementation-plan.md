# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: Localized UI behavior change (auto-scroll only in conversation panel) touching one Vue component and its colocated test file; no API/schema/backend changes.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking (design doc optional)

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes: Runtime call-stack review passes for all in-scope use cases.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Sticky auto-scroll while streaming when user is at/near bottom.
  - Preserve user position (no forced jump) when user scrolls up.
  - Re-enable sticky behavior when user returns near bottom.
- Touched Files/Modules:
  - `components/workspace/agent/AgentEventMonitor.vue`
  - `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts`
- API/Behavior Delta:
  - Add conversation viewport stick-to-bottom logic driven by post-render updates (`onUpdated`).
  - Add scroll listener state gate (`near bottom` threshold) to avoid fighting manual scroll.
  - Resolve scroll container via stable DOM id lookup so scrolling targets the active panel instance.
- Key Assumptions:
  - `conversation.updatedAt` updates during streaming (already true from `AgentStreamingService`).
  - Conversation panel has a stable dedicated scroll container element.
- Known Risks:
  - JSDOM scroll metrics need explicit stubbing in unit tests.
  - Over-aggressive threshold can still feel jumpy; use a conservative pixel threshold.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Sticky auto-scroll while streaming | `tickets/agent-event-monitor-autoscroll/design-based-runtime-call-stack.md` | `tickets/agent-event-monitor-autoscroll/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Manual-scroll override protection | `tickets/agent-event-monitor-autoscroll/design-based-runtime-call-stack.md` | `tickets/agent-event-monitor-autoscroll/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Small`: refine implementation plan (and add design notes if needed), then regenerate call stack and re-review.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests (and integration tests when needed) before or alongside implementation.
- One file at a time is the default: complete a file and its tests before moving on when dependency graph is clean.
- Exception rule for rare cross-referencing: allow temporary partial implementation only when necessary, and record the design smell and follow-up design change.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `components/workspace/agent/AgentEventMonitor.vue` | Existing conversation reactive updates | Introduces runtime behavior that tests validate. |
| 2 | `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Updated component behavior | Verifies sticky and non-sticky branches with DOM stubs. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | N/A (Small scope) | N/A | No | N/A |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | N/A | N/A | N/A | None |

## Step-By-Step Plan

1. Add sticky auto-scroll state and helper methods in `AgentEventMonitor.vue` (near-bottom detection, scroll handler, scroll-to-bottom sync).
2. Bind the scroll container id + scroll event in template and wire `onUpdated` to auto-scroll only when pinned.
3. Extend `AgentEventMonitor.spec.ts` with DOM scroll tests for pinned and unpinned scenarios.
4. Run focused test command and record verification.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `components/workspace/agent/AgentEventMonitor.vue` | Sticky auto-scroll logic implemented and gated by user scroll position. | Covered by `AgentEventMonitor.spec.ts` auto-scroll tests. | N/A | Keep behavior local to conversation panel. |
| `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Includes tests for auto-scroll + no auto-scroll when user moved away from bottom. | `pnpm test:nuxt components/workspace/agent/__tests__/AgentEventMonitor.spec.ts --run` passes. | N/A | Stub scroll metrics in JSDOM. |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Pending |

## Test Strategy

- Unit tests:
  - `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts`
    - auto-scrolls to bottom when stream updates and user is pinned.
    - does not auto-scroll when user scrolled away from bottom.
- Integration tests: N/A for this small UI behavior.
- Test data / fixtures:
  - Existing `Conversation` fixture with updated `updatedAt` props in test cases.
