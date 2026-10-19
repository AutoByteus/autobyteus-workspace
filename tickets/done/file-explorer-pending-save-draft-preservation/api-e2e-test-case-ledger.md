# API/E2E Test-Case Ledger

## Ledger Meta
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation
- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-coverage-investigation.md
- Execution coverage report: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-execution-coverage-report.md
- API/E2E revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-revision-record.md
- Scope: 11 independent real-Monaco cases in one probe run (sequential, one workspace, one file per case)
- Last updated: 2026-10-15

## Planned Cases
| Case ID | Case | AC | Surface | Entry | Order |
| --- | --- | --- | --- | --- | --- |
| PSD-001 | Type, Save held, real Ctrl/Cmd+Z to original, release, Save again | AC-001 | Real Monaco + real server | `pnpm -C autobyteus-web test:e2e:file-explorer-pending-save-draft --output-dir <dir>` | 1 |
| PSD-002 | Same, reverting by retyping the original | AC-001 | same | same | 2 |
| PSD-003 | Clear-all while pending | AC-002 | same | same | 3 |
| PSD-004 | Different later edit | AC-005 | same | same | 4 |
| PSD-005 | Later input equals saved content | AC-003 | same | same | 5 |
| PSD-006 | Failed Save (edit made before Save), then next Save | AC-004a | same | same | 6 |
| PSD-007 | Failed Save, revert to unchanged committed text | AC-004b | same | same | 7 |
| PSD-008 | Ordinary Save, no later input, no model change | AC-008 | same | same | 8 |
| PSD-009 | Undo to committed, no Save pending | AC-006 | same | same | 9 |
| PSD-010 | Save pending, differing later edit, Save then fails | AC-004a | same | same | 10 |
| PSD-011 | Save pending, revert to committed text, Save then fails | AC-004b | same | same | 11 |

## Execution Events
Results are the per-case `result` fields written by the probe immediately after each case into evidence.json.
| Run | Evidence | PSD-001..011 |
| --- | --- | --- |
| Fix, run 1 | /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/evidence/api-e2e-final-run1/evidence.json | all Pass |
| Fix, run 2 | /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/evidence/api-e2e-final-run2/evidence.json | all Pass |
| Base store (discrimination), run 1 | /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/evidence/api-e2e-base-run1/evidence.json | PSD-001 Fail, PSD-002 Fail, PSD-011 Fail; others Pass |

## Re-entry And Reconciliation
- Last completed case: PSD-011 of the base run
- Not started / interrupted: none
- Reconciled into execution coverage report: Yes — /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-execution-coverage-report.md
