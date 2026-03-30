# Workflow State

Use this file as the mandatory stage-control artifact for the ticket.
Update this file before every stage transition and before any source-code edit.
Stage movement is controlled by this file's Stage Transition Contract + Transition Matrix.

## Current Snapshot

- Ticket: `runtime-domain-subject-refactor`
- Current Stage: `5`
- Next Stage: `5`
- Code Edit Permission: `Locked`
- Active Re-Entry: `No`
- Re-Entry Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`): `N/A`
- Last Transition ID: `T-005`
- Last Updated: `2026-03-16`

## Stage Gates

| Stage | Gate Status (`Not Started`/`In Progress`/`Pass`/`Fail`/`Blocked`) | Gate Rule Summary | Evidence |
| --- | --- | --- | --- |
| 0 Bootstrap + Draft Requirement | Pass | Ticket bootstrap is complete on a dedicated branch, and draft requirements were captured before new design work. | `tickets/in-progress/runtime-domain-subject-refactor/requirements.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 1 Investigation + Triage | Pass | Investigation now captures the native-vs-external runtime asymmetry, the implicit external run concept, the normalized event/status boundary, and the carry-forward requirement to preserve one run/team-scoped websocket contract. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 2 Requirements | Pass | Requirements are now design-ready around runtime-neutral run subjects, backend implementations, normalized outward events/status, and unchanged websocket/frontend contracts. | `tickets/in-progress/runtime-domain-subject-refactor/requirements.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 3 Design Basis | Pass | Design basis now captures the runtime-neutral `AgentRun` / `TeamRun` model, the backend-factory seam, and the future team manager ownership target. | `tickets/in-progress/runtime-domain-subject-refactor/proposed-design.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 4 Runtime Modeling | Pass | The first team-runtime future-state call-stack slice is now written for create, continue, and member-runtime orchestration. | `tickets/in-progress/runtime-domain-subject-refactor/future-state-runtime-call-stack.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 5 Review Gate | In Progress | Round 1 deep review is complete with a candidate-go result for the scoped team core stack, but a second clean round is still required before code edits can unlock. | `tickets/in-progress/runtime-domain-subject-refactor/future-state-runtime-call-stack-review.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 6 Source + Unit/Integration | Not Started | Source edits remain locked until the design/review chain reaches `Go Confirmed`. | `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 7 API/E2E Gate | Not Started | Verification is deferred until implementation exists. | `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 8 Code Review Gate | Not Started | Code review is deferred until implementation and verification are complete. | `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 9 Docs Sync | Not Started | Docs sync is deferred until implementation/review close. | `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| 10 Final Handoff | Not Started | Final handoff awaits completed design, implementation, verification, and explicit user confirmation. | `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |

## Transition Log (Append-Only)

| Transition ID | Date | From Stage | To Stage | Reason | Classification | Code Edit Permission After Transition | Evidence Updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-000 | 2026-03-12 | 0 | 0 | Workflow bootstrap initialized for the runtime domain-subject refactor on a dedicated branch with source-code edits locked and draft requirements captured. | N/A | Locked | `tickets/in-progress/runtime-domain-subject-refactor/requirements.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| T-001 | 2026-03-12 | 0 | 1 | Bootstrap completed and investigation opened to document the current runtime architecture and the missing domain-subject boundary. | N/A | Locked | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| T-002 | 2026-03-12 | 1 | 2 | Investigation is now sufficient to lock the core architecture findings, so the ticket advances into requirements refinement for the runtime-neutral run-subject model. | N/A | Locked | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| T-003 | 2026-03-12 | 2 | 3 | Requirements are design-ready, so the ticket advances into the design basis for runtime-neutral `AgentRun` / `TeamRun` with backend implementations and preserved websocket contracts. | N/A | Locked | `tickets/in-progress/runtime-domain-subject-refactor/requirements.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| T-004 | 2026-03-16 | 3 | 4 | The first future-state team runtime call-stack slice is now written around manager-owned create/restore and member-runtime orchestration beneath one team backend factory. | N/A | Locked | `tickets/in-progress/runtime-domain-subject-refactor/future-state-runtime-call-stack.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |
| T-005 | 2026-03-16 | 4 | 5 | Deep review of the first team core stack is now active, with round 1 reaching candidate-go and one more clean round still required before implementation. | N/A | Locked | `tickets/in-progress/runtime-domain-subject-refactor/future-state-runtime-call-stack-review.md`, `tickets/in-progress/runtime-domain-subject-refactor/workflow-state.md` |

## Audible Notification Log

| Date | Trigger Type (`Transition`/`Gate`/`Re-entry`/`LockChange`) | Summary Spoken | Speak Tool Result (`Success`/`Failed`) | Fallback Text Logged |
| --- | --- | --- | --- | --- |
| 2026-03-12 | Transition | Stage 1 investigation is active for the runtime domain-subject refactor. Bootstrap is complete, code edits remain locked, and the next action is documenting the current and target runtime ownership model. | Success | N/A |
| 2026-03-12 | Transition | Stage 2 requirements refinement is now active for the runtime domain subject refactor. Investigation is sufficient, code edits remain locked, and the next action is defining the runtime neutral run subject requirements. | Success | N/A |
| 2026-03-12 | Transition | Stage 3 design basis is now active for the runtime domain subject refactor. Requirements are design ready, code edits remain locked, and the next action is writing the target AgentRun and TeamRun architecture. | Success | N/A |
| 2026-03-16 | Transition | Stage 4 runtime modeling is complete for the first team core stack slice. Code edits remain locked, and the next action is deep review of the future-state team create, continue, and member-runtime spines. | Success | N/A |
| 2026-03-16 | Gate | Stage 5 review round 1 reached candidate go for the scoped team core stack. Code edits remain locked, and the next action is one more clean review round before any implementation work starts. | Success | N/A |

## Process Violation Log

| Date | Violation ID | Violation | Detected At Stage | Action Taken | Cleared |
| --- | --- | --- | --- | --- | --- |
