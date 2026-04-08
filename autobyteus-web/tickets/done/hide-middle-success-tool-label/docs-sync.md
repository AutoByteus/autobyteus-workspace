# Docs Sync Report

## Scope

- Ticket: `hide-middle-success-tool-label`
- Trigger: `Stage 8 code review PASS on 2026-04-08; proceed to Stage 9 docs sync.`

## Why Docs Were Updated

- Summary: Promoted the reviewed UI ownership split for tool-activity rendering into canonical architecture docs so the final implementation state is documented outside ticket artifacts.
- Why this should live in long-lived project docs: The inline conversation tool card and the right-side Activity item are separate long-lived UI owners backed by the same `AgentActivityStore`, and future changes need one canonical doc that explains which surface owns compact non-text status vs textual activity status.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `docs/agent_execution_architecture.md` | Canonical runtime/ownership doc for activity-store-driven UI surfaces | `Updated` | Added explicit ownership notes for inline `ToolCallIndicator.vue` cards vs right-side `ActivityItem.vue` rows. |
| `ARCHITECTURE.md` | Checked whether the top-level architecture summary described this UI boundary in enough detail to require correction | `No change` | Existing top-level summary stays accurate; the detailed ownership note belongs in the execution-architecture doc instead. |
| `README.md` | Checked for any user/developer workflow text that claimed inline tool cards show textual status | `No change` | No README workflow or setup text needed correction for this UI-only refinement. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `docs/agent_execution_architecture.md` | Runtime ownership clarification | Documented that `AgentActivityStore` feeds two distinct surfaces: compact inline conversation tool cards in `ToolCallIndicator.vue` and textual right-side activity rows in `ActivityItem.vue`; clarified that inline chat status remains non-textual while textual activity status remains owned by the right-side row. | This ticket finalized that boundary in reviewed code and tests, so the architecture doc should preserve it for future maintenance. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Activity presentation ownership split | Center conversation tool cards and right-side Activity rows intentionally present the same activity stream differently; density changes to chat cards belong in `ToolCallIndicator.vue`, while textual status-chip changes belong in `ActivityItem.vue`. | `tickets/in-progress/hide-middle-success-tool-label/proposed-design.md`, `tickets/in-progress/hide-middle-success-tool-label/implementation.md`, `tickets/in-progress/hide-middle-success-tool-label/code-review.md` | `docs/agent_execution_architecture.md` |
| Inline tool-card navigation contract | Non-awaiting inline tool cards remain a navigation affordance into the matching right-side activity item rather than a second textual-status surface. | `tickets/in-progress/hide-middle-success-tool-label/proposed-design.md`, `tickets/in-progress/hide-middle-success-tool-label/code-review.md` | `docs/agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Center inline header textual status label branch in `components/conversation/ToolCallIndicator.vue` | Compact non-text status affordances in `ToolCallIndicator.vue`, with textual status remaining on the right-side `components/progress/ActivityItem.vue` activity row | `docs/agent_execution_architecture.md` |

## Handoff To Deployment

- Result: `Pass`
- Next recipient: `deployment_engineer`
- Notes: Canonical docs now match the reviewed implementation: inline tool cards are compact/non-textual in the conversation, while textual status remains owned by the right-side Activity feed row.
