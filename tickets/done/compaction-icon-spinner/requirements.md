# Requirements

## Status

`Design-ready`

## Goal / Problem Statement

The frontend compaction indicator uses the two-curly-arrow/sync icon while compaction is in progress, but the icon is static. Users expect this symbol to rotate while processing. Add a visible cycling/spinning animation only during active compaction so the UI communicates that processing is ongoing.

## In-Scope Use Cases

| Use Case ID | Requirement ID(s) | Description | Scope |
| --- | --- | --- | --- |
| UC-001 | R-001 | Right-side Activity feed renders a compaction activity whose phase is `started` / label is `Compacting`. The arrow-path icon spins. | Included |
| UC-002 | R-001 | Center conversation feed renders a compaction status row whose phase is `started` / label is `Compacting`. The arrow-path icon spins. | Included |
| UC-003 | R-002 | Completed/failed/requested compaction rows remain visually stable and do not spin. | Included |

## Requirements

| Requirement ID | Requirement | Rationale |
| --- | --- | --- |
| R-001 | When a compaction activity/status row is in active processing phase (`phase === 'started'`), the two-arrow icon must visibly spin/cycle. | Communicates ongoing processing using the conventional sync/processing icon behavior. |
| R-002 | When compaction is not actively processing (`requested`, `completed`, or `failed`), the icon must not spin. | Avoids falsely implying background work is still running. |
| R-003 | The change must be localized to frontend presentation and must not alter compaction lifecycle data, streaming, backend contracts, or persistence. | Keeps the fix safe and proportional to the UI bug. |
| R-004 | The animation should respect reduced-motion preferences where available. | Avoids unnecessary motion for users who prefer reduced motion. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Criterion | Expected Outcome |
| --- | --- | --- | --- |
| AC-001 | R-001 | Mount `CompactionActivityItem` with `phase: 'started'`. | The compaction icon element has a spin animation class. |
| AC-002 | R-001 | Mount `CompactionStatusRow` with `phase: 'started'`. | The centered compaction icon element has a spin animation class. |
| AC-003 | R-002 | Mount each changed component with `phase: 'completed'`. | The rendered icon does not have a spin animation class. |
| AC-004 | R-003 | Review changed files and diff. | Only frontend presentation/test files are changed; no compaction lifecycle contracts are modified. |
| AC-005 | R-004 | Review applied animation utility. | Animation uses `motion-safe:animate-spin` so reduced-motion preferences suppress it. |

## Requirement-To-Use-Case Coverage

| Requirement ID | Use Case ID(s) |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-003 |
| R-003 | UC-001, UC-002, UC-003 |
| R-004 | UC-001, UC-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Component test validates Activity feed compacting icon class. |
| AC-002 | Component test validates centered compaction status icon class. |
| AC-003 | Component tests validate completed state stays non-animated. |
| AC-004 | Code review validates no backend/lifecycle files changed. |
| AC-005 | Code review validates `motion-safe:animate-spin` instead of unconditional animation. |

## Constraints / Dependencies

- Existing frontend stack: Nuxt/Vue with Tailwind CSS and Iconify.
- Existing compaction phase model is authoritative; this ticket must not redefine lifecycle semantics.
- The current request targets desktop frontend surfaces shown in the supplied screenshots.

## Assumptions

- `phase === 'started'` is the only processing state that should spin.
- Users expect the arrow-path/sync icon to spin only while status reads `Compacting`.

## Open Questions / Risks

- None blocking. Mobile list has no sync icon in this area and is not part of the screenshot/request.

## Confirmed Scope Classification

`Small`
