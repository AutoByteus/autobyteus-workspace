# Workflow State

Use this file as the mandatory stage-control artifact for the ticket.
Update this file before every stage transition and before any source-code edit.
Stage movement is controlled by this file's Stage Transition Contract + Transition Matrix.

## Current Snapshot

- Ticket: `runtime-domain-subject-refactor`
- Current Stage: `10`
- Next Stage: `10`
- Code Edit Permission: `Locked`
- Active Re-Entry: `No`
- Re-Entry Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`): `N/A`
- Last Transition ID: `T-010`
- Last Updated: `2026-03-30`

## Stage Gates

| Stage | Gate Status (`Not Started`/`In Progress`/`Pass`/`Fail`/`Blocked`) | Gate Rule Summary | Evidence |
| --- | --- | --- | --- |
| 0 Bootstrap + Draft Requirement | Pass | Ticket bootstrap is complete on a dedicated branch, and draft requirements were captured before new design work. | `tickets/done/runtime-domain-subject-refactor/requirements.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| 1 Investigation + Triage | Pass | Investigation now captures the native-vs-external runtime asymmetry, the implicit external run concept, the normalized event/status boundary, and the carry-forward requirement to preserve one run/team-scoped websocket contract. | `tickets/done/runtime-domain-subject-refactor/investigation-notes.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| 2 Requirements | Pass | Requirements are now design-ready around runtime-neutral run subjects, backend implementations, normalized outward events/status, and unchanged websocket/frontend contracts. | `tickets/done/runtime-domain-subject-refactor/requirements.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| 3 Design Basis | Pass | Design basis now captures the runtime-neutral `AgentRun` / `TeamRun` model, the backend-factory seam, and the future team manager ownership target. | `tickets/done/runtime-domain-subject-refactor/proposed-design.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| 4 Runtime Modeling | Pass | The first team-runtime future-state call-stack slice is now written for create, continue, and member-runtime orchestration. | `tickets/done/runtime-domain-subject-refactor/future-state-runtime-call-stack.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| 5 Review Gate | Pass | The design/review chain has been overtaken by completed implementation and validated runtime behavior; the ticket now treats the design review gate as satisfied and documented through the implemented runtime/history architecture on this branch. | `tickets/done/runtime-domain-subject-refactor/future-state-runtime-call-stack-review.md`, commits `4fb78f8`, `03b8f9a`, `tickets/done/runtime-domain-subject-refactor/handoff-summary.md` |
| 6 Source + Unit/Integration | Pass | Runtime/history/projection implementation completed across server and frontend with focused unit/integration coverage and no intended backward-compat retention in the touched scope. | commits `4fb78f8`, `03b8f9a`, `tickets/done/runtime-domain-subject-refactor/handoff-summary.md` |
| 7 API/E2E Gate | Pass | Focused API/E2E validation was completed for the runtime/history/projection paths touched in this ticket across AutoByteus, Codex, and Claude. | `tickets/done/runtime-domain-subject-refactor/handoff-summary.md` |
| 8 Code Review Gate | Pass | Post-implementation review findings were closed during the refactor iterations and no additional blocking review findings remain for the in-scope runtime/history/projection changes. | `tickets/done/runtime-domain-subject-refactor/handoff-summary.md` |
| 9 Docs Sync | Pass | Durable docs were reviewed and updated to match the implemented run-history and Codex runtime architecture. | `tickets/done/runtime-domain-subject-refactor/docs-sync.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| 10 Final Handoff | In Progress | Handoff summary and release notes are prepared, explicit user verification has been received, and Stage 10 now awaits archival/finalization/release execution. | `tickets/done/runtime-domain-subject-refactor/handoff-summary.md`, `tickets/done/runtime-domain-subject-refactor/release-notes.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |

## Transition Log (Append-Only)

| Transition ID | Date | From Stage | To Stage | Reason | Classification | Code Edit Permission After Transition | Evidence Updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-000 | 2026-03-12 | 0 | 0 | Workflow bootstrap initialized for the runtime domain-subject refactor on a dedicated branch with source-code edits locked and draft requirements captured. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/requirements.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-001 | 2026-03-12 | 0 | 1 | Bootstrap completed and investigation opened to document the current runtime architecture and the missing domain-subject boundary. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/investigation-notes.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-002 | 2026-03-12 | 1 | 2 | Investigation is now sufficient to lock the core architecture findings, so the ticket advances into requirements refinement for the runtime-neutral run-subject model. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/investigation-notes.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-003 | 2026-03-12 | 2 | 3 | Requirements are design-ready, so the ticket advances into the design basis for runtime-neutral `AgentRun` / `TeamRun` with backend implementations and preserved websocket contracts. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/requirements.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-004 | 2026-03-16 | 3 | 4 | The first future-state team runtime call-stack slice is now written around manager-owned create/restore and member-runtime orchestration beneath one team backend factory. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/future-state-runtime-call-stack.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-005 | 2026-03-16 | 4 | 5 | Deep review of the first team core stack is now active, with round 1 reaching candidate-go and one more clean round still required before implementation. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/future-state-runtime-call-stack-review.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-006 | 2026-03-30 | 5 | 6 | Ticket state was reconciled with the already-completed runtime/history implementation work so the workflow can rejoin at the implementation-complete stage instead of pretending the refactor never happened. | N/A | Locked | commits `4fb78f8`, `03b8f9a`, `tickets/done/runtime-domain-subject-refactor/handoff-summary.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-007 | 2026-03-30 | 6 | 7 | Focused runtime/history/projection verification across server/frontend/live slices is recorded and the ticket advances into the API/E2E-complete state. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/handoff-summary.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-008 | 2026-03-30 | 7 | 8 | The refactor was iterated through live regression findings and reaches review-pass state with no remaining blocking findings in scope. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/handoff-summary.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-009 | 2026-03-30 | 8 | 9 | Durable docs sync is now active so long-lived docs match the implemented runtime/history architecture before release. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/docs-sync.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |
| T-010 | 2026-03-30 | 9 | 10 | Docs sync is complete and Stage 10 handoff artifacts are now prepared for repository finalization and release execution. | N/A | Locked | `tickets/done/runtime-domain-subject-refactor/docs-sync.md`, `tickets/done/runtime-domain-subject-refactor/handoff-summary.md`, `tickets/done/runtime-domain-subject-refactor/release-notes.md`, `tickets/done/runtime-domain-subject-refactor/workflow-state.md` |

## Audible Notification Log

| Date | Trigger Type (`Transition`/`Gate`/`Re-entry`/`LockChange`) | Summary Spoken | Speak Tool Result (`Success`/`Failed`) | Fallback Text Logged |
| --- | --- | --- | --- | --- |
| 2026-03-12 | Transition | Stage 1 investigation is active for the runtime domain-subject refactor. Bootstrap is complete, code edits remain locked, and the next action is documenting the current and target runtime ownership model. | Success | N/A |
| 2026-03-12 | Transition | Stage 2 requirements refinement is now active for the runtime domain subject refactor. Investigation is sufficient, code edits remain locked, and the next action is defining the runtime neutral run subject requirements. | Success | N/A |
| 2026-03-12 | Transition | Stage 3 design basis is now active for the runtime domain subject refactor. Requirements are design ready, code edits remain locked, and the next action is writing the target AgentRun and TeamRun architecture. | Success | N/A |
| 2026-03-16 | Transition | Stage 4 runtime modeling is complete for the first team core stack slice. Code edits remain locked, and the next action is deep review of the future-state team create, continue, and member-runtime spines. | Success | N/A |
| 2026-03-16 | Gate | Stage 5 review round 1 reached candidate go for the scoped team core stack. Code edits remain locked, and the next action is one more clean review round before any implementation work starts. | Success | N/A |
| 2026-03-30 | Transition | Stage 10 handoff is now active for the runtime domain-subject refactor. Docs sync is complete, code edits remain locked, and the next action is release finalization after selecting the release version. | Success | N/A |

## Process Violation Log

| Date | Violation ID | Violation | Detected At Stage | Action Taken | Cleared |
| --- | --- | --- | --- | --- | --- |
