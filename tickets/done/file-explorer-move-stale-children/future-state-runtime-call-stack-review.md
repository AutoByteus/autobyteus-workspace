# Future-State Runtime Call Stack Review - file-explorer-move-stale-children

## Review Meta

- Scope Classification: `Small`
- Current Round: `2`
- Current Review Type: `Deep Review`
- Clean-Review Streak Before This Round: `1`
- Clean-Review Streak After This Round: `2`
- Round State: `Go Confirmed`
- Missing-Use-Case Discovery Sweep Completed This Round: `Yes`
- New Use Cases Discovered This Round: `No`
- This Round Classification: `N/A`
- Required Re-Entry Path Before Next Round: `N/A`

## Review Basis

- Requirements: `tickets/done/file-explorer-move-stale-children/requirements.md` (status `Design-ready`)
- Runtime Call Stack: `tickets/done/file-explorer-move-stale-children/future-state-runtime-call-stack.md`
- Source Design Basis: `tickets/done/file-explorer-move-stale-children/implementation-plan.md`

## Round History

| Round | Requirements Status | Design Version | Call Stack Version | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Clean Streak After Round | Round State | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Design-ready | v2 | v2 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go |
| 2 | Design-ready | v2 | v2 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |

## Per-Use-Case Review

| Use Case | Architecture Fit | Layering Fitness | Boundary Placement | Future-State Alignment | Use-Case Coverage Completeness | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| UC-101 | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-102 | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-103 | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-104 | Pass | Pass | Pass | Pass | Pass | Pass |

## Findings

- None.

## Review Notes

- The ignore-rule source of truth remains in the backend watcher layer; the change only moves that evaluation earlier to the watch-registration boundary.
- Reusing `WorkspaceConverter.toGraphql(...)` keeps the create-workspace payload aligned with the existing listing path and avoids introducing a second serialization shape.
- The missing-use-case sweep explicitly checked:
  - pre-existing ignored directories before watcher startup,
  - nested `.gitignore` exclusions,
  - non-ignored runtime events,
  - `.gitignore` changes after startup via handler-side re-evaluation.

## Gate Decision

- Implementation can start: `Yes`
- Clean-review streak at end of this round: `2`
- Gate rule checks summary: no blocker remains in architecture, layering, boundary placement, or use-case coverage for the watcher-boundary refactor.
