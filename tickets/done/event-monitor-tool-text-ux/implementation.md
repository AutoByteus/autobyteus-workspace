# Implementation

- Ticket: `event-monitor-tool-text-ux`
- Scope Classification: `Small`
- Current Status: `Completed`
- Last Updated: `2026-04-09`

## Upstream Artifacts

- Workflow state: `tickets/done/event-monitor-tool-text-ux/workflow-state.md`
- Investigation notes: `tickets/done/event-monitor-tool-text-ux/investigation-notes.md`
- Requirements: `tickets/done/event-monitor-tool-text-ux/requirements.md`

## Solution Sketch

- Use Cases In Scope:
  - `UC-001`: center feed with long command summary while Activity panel is open
  - `UC-002`: center feed after Activity panel width changes
  - `UC-003`: right-side Activity card remains the nested detail surface
- Spine Inventory In Scope:
  - `DS-001`: streaming payload/store data -> summary extraction -> center tool row render
- Primary Spine Span Sufficiency Rationale:
  - The fix spans the data already carried in the streaming layer, the summary formatting boundary, and the user-facing center render surface. This is enough to explain the real UX path without broadening into unrelated workspace layout logic.
- Primary Owners / Main Domain Subjects:
  - `ToolCallIndicator.vue` owns the inline center-feed tool row.
  - A small shared summary helper can own reusable summary extraction/redaction rules.
- Requirement Coverage Guarantee:
  - `R-001` and `R-002` map to the inline indicator and shared summary helper.
  - `R-003` maps to preserving the original Activity card detail model.
  - `R-004` maps to utility and component tests.
- Target Architecture Shape:
  - Introduce one small UI utility for tool summary extraction.
  - Remove the fixed command truncation from `ToolCallIndicator.vue`.
  - Strengthen flex sizing in `ToolCallIndicator.vue` so the summary text can claim available width.
  - Keep `ActivityItem.vue` in its original header/detail form.
- API/Behavior Delta:
  - No backend/API contract changes.
  - The DOM will now retain the full redacted command/path summary instead of a hard-truncated string.
  - The Activity panel remains unchanged as the detail surface.
- Key Assumptions:
  - Existing store data is sufficient; no new stream payload changes are required.
  - CSS-based truncation plus better flex sizing is enough to address the user-visible problem.
- Known Risks:
  - The shared helper must stay presentation-only and not start carrying cross-surface policy beyond summary extraction/redaction.

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001` | Shared UI summary extraction | `autobyteus-web/utils/toolDisplaySummary.ts` | Existing tool arguments/context data | Centralize rendering rules before touching the center surface |
| 2 | `DS-001` | Center tool row | `autobyteus-web/components/conversation/ToolCallIndicator.vue` | Summary helper | Remove fixed truncation and improve width usage |
| 3 | `DS-001` | Validation | Focused utility/component tests | Prior implementation tasks | Lock the regression and prove the new behavior |

## File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Shared summary helper | `N/A` | `autobyteus-web/utils/toolDisplaySummary.ts` | Shared web UI summary formatting | `Create` | Utility tests |
| Center row component | `autobyteus-web/components/conversation/ToolCallIndicator.vue` | same | Conversation tool row UI | `Modify` | Component test |

## Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | Shared UI summary extraction | summary parsing/redaction | `N/A` | `autobyteus-web/utils/toolDisplaySummary.ts` | `Create` | None | Completed | `autobyteus-web/utils/__tests__/toolDisplaySummary.spec.ts` | Passed | `N/A` | `N/A` | Planned | Helper now returns full redacted command/path summaries and supports compact-path mode |
| `C-002` | `DS-001` | Center tool row | responsive summary display | `autobyteus-web/components/conversation/ToolCallIndicator.vue` | same | `Modify` | `C-001` | Completed | `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts` | Passed | `N/A` | `N/A` | Planned | Removed fixed truncation, added responsive flex sizing, preserved navigation/approval behavior |

## Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001`, `AC-002` | `DS-001` | `Solution Sketch` | `UC-001`, `UC-002` | `C-001`, `C-002` | Utility + component tests | `AV-001` |
| `R-002` | `AC-002` | `DS-001` | `Solution Sketch` | `UC-001`, `UC-002` | `C-002` | Component tests | `AV-001` |
| `R-003` | `AC-003` | `N/A` | `Solution Sketch` | `UC-003` | `N/A` | Regression confirmation | `AV-002` |
| `R-004` | `AC-004` | `DS-001` | `Solution Sketch` | `UC-001`, `UC-002`, `UC-003` | `C-001`, `C-002` | Utility + component tests | `AV-001`, `AV-002` |

## Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | Full redacted command remains in DOM | `AV-001` | `Browser UI` | Planned |
| `AC-002` | `R-002` | `DS-001` | Center row summary uses responsive layout classes and no fixed truncation | `AV-001` | `Browser UI` | Planned |
| `AC-003` | `R-003` | `N/A` | Activity header remains unchanged and details stay nested | `AV-002` | `Browser UI` | Planned |
| `AC-004` | `R-004` | `DS-001` | Targeted tests pass | `AV-001`, `AV-002` | `Browser UI` | Planned |

## Step-By-Step Plan

1. Add a shared summary helper with redaction and path/command extraction.
2. Update `ToolCallIndicator.vue` to use the helper and let CSS/layout width control truncation.
3. Confirm the Activity panel remains unchanged as the detail surface.
4. Add targeted tests and run them.
5. Record validation and review artifacts.

## Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Spine Span Sufficiency preserved: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

## Test Strategy

- Unit tests:
  - Summary helper extraction/redaction rules.
- Component tests:
  - `ToolCallIndicator.vue` keeps the full command in the DOM and preserves navigation behavior.
  - `ActivityItem.vue` remains on the original header/detail contract.
- Stage 7 handoff notes:
  - Use targeted Vitest execution for the helper and affected component specs.

## Execution Tracking

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Pending transition`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- `2026-04-09`: Stage 3 solution sketch created.
- `2026-04-09`: Stage 5 review reached `Go Confirmed` with two clean rounds.
- `2026-04-09`: Added `autobyteus-web/utils/toolDisplaySummary.ts` to centralize tool summary extraction and redaction.
- `2026-04-09`: Updated `ToolCallIndicator.vue` to remove fixed command truncation and rely on responsive layout width.
- `2026-04-09`: User-confirmed final scope keeps the Activity panel in its original style and detail model.
- `2026-04-09`: Focused tests passed for the new helper, center indicator, and unchanged Activity regression coverage.
