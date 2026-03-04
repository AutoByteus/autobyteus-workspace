# Requirements

## Status

`Refined`

## Ticket

`codex-team-run-history-student-message-hydration`

## Goal / Problem Statement

Fix Codex runtime team run-history restore so that after app restart both professor and student member conversations are hydrated from persisted history.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Crosses continuation + persisted team-manifest/runtime-reference correctness.
  - Requires regression coverage for Codex team member runtime-reference refresh behavior.

## In-Scope Use Cases

- `UC-001` Reopen a Codex team run where both members previously exchanged messages.
- `UC-002` Continue a Codex team run after restart when one member’s previous thread is no longer resumable and fallback creates a new thread.
- `UC-003` Fetch team-member projection from history for both members after continuation and restart cycles.

## Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Codex team continuation must persist refreshed member runtime references returned by member-session restore, including updated `threadId`. | Team manifest and member manifests no longer retain stale thread IDs after restore fallback. | UC-002, UC-003 |
| R-002 | Team member projection must use current persisted runtime references for Codex fallback projection. | Student/professor projection parity is preserved when one member thread ID changes. | UC-001, UC-003 |
| R-003 | Existing AutoByteus team continuation behavior must remain unchanged. | No regression in non-Codex team path. | UC-001 |

## Acceptance Criteria

| acceptance_criteria_id | mapped_requirement_ids | Testable Criteria |
| --- | --- | --- |
| AC-001 | R-001 | After `restoreCodexTeamRunSessions` returns updated bindings, persisted team manifest and member run manifests reflect updated member `runtimeReference.threadId`. |
| AC-002 | R-002 | Team-member projection flow uses updated persisted reference and no longer relies on stale thread IDs after continuation. |
| AC-003 | R-003 | Existing autobyteus-team continuation unit test remains passing. |

## Constraints / Dependencies

- Backend-only fix in `autobyteus-server-ts`; no GraphQL schema change required.
- Must preserve existing run-history index summaries/status behavior.
