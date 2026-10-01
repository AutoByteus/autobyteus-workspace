# API/E2E Test-Case Ledger — round 1

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning`
- Investigation: `api-e2e-coverage-investigation.md`; report: `api-e2e-execution-coverage-report.md`; revision record: `api-e2e-revision-record.md` (created after completed result).
- Required because execution has multiple independent repository/browser cases and a potentially long-running browser probe. Initialized before durable edit/execution on 2026-09-26.

## Planned cases
| Case | Journey / AC | Surface / entry point | Order |
| --- | --- | --- | --- |
| CASE-001 | Focused fixed root/member and Org/new launch, AC-001–003 | Four adjacent Vitest files | 1 |
| CASE-002 | Shared selector/new Team/model patch regressions, AC-003 | Additional affected Vitest suites | 2 |
| CASE-003 | Saved Team fixed paths, null, model Save, responsive editor, AC-001–003 | Existing-run browser probe with contract-shaped GraphQL fixture | 3 |

## Execution events
| Seq | Case | UTC time | Event | Entry/config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| 1 | CASE-001 | 2026-09-26T12:28:07.008069+00:00 | Started (retrospective correction) | `pnpm test:nuxt --run` four adjacent specs | 30 focused tests pass | Initial ledger write targeted wrong CWD; test ran. | N/A | `evidence-focused.log` | Corrected immediately before next case. |
| 2 | CASE-001 | 2026-09-26T12:28:07.008069+00:00 | Completed | Same command | Focused regression passes | 4 files, 30 tests passed. | Pass | `evidence-focused.log` | CASE-002. |

| 3 | CASE-002 | 2026-09-26T12:28:07.046119+00:00 | Started | Shared selector, Team store, Team draft Vitest suites | Pass | Running | N/A | — | Await result. |

| 4 | CASE-002 | 2026-09-26T12:28:38.773410+00:00 | Completed | Three shared selector/Team store/Team draft Vitest suites | Shared behavior passes | 3 files, 35 tests passed. | Pass | `evidence-broader.log` | Update post-repository confidence, then CASE-003. |

| 5 | CASE-003 | 2026-09-26T12:28:38.810177+00:00 | Started | `pnpm test:e2e:existing-run-model-config` Chrome + schema-parsed GraphQL fixture | Saved Team path/edit/save browser checks pass | Running | N/A | `evidence/existing-run-model-config/` | Await probe. |

| 6 | CASE-003 | 2026-09-26T12:29:07.311361+00:00 | Checkpoint | First browser command exited before startup | Browser journey should run | Test fixture had `name` outside mapper; corrected coordinator/map assignment. No product result. | N/A | `evidence-browser-command.log` | Rerun same case. |
| 7 | CASE-003 | 2026-09-26T12:29:07.311361+00:00 | Started | Rerun after fixture correction | Browser probe passes | Running | N/A | `evidence/existing-run-model-config/` | Await result. |

| 8 | CASE-003 | 2026-09-26T12:30:05.659668+00:00 | Completed | Browser probe after fixture correction | Six browser scenarios pass | Six scenarios passed; owned Nuxt/browser/page cleaned. | Pass | `evidence/existing-run-model-config/existing-run-model-config-evidence.json` | Strengthen JSON evidence and keyboard read-only assertion, then rerun. |

| 9 | CASE-003 | 2026-09-26T12:30:37.951994+00:00 | Started | Browser probe rerun with keyboard/readback and JSON path evidence | Six browser scenarios pass | Running | N/A | `evidence/existing-run-model-config/` | Await result. |

| 10 | CASE-003 | 2026-09-26T12:31:18.583436+00:00 | Completed | Final browser probe rerun | Six browser scenarios pass; fixed paths/read-only/save preserved | Six scenarios Pass; exact paths in API-E2E-004-B details; owned resources cleaned. | Pass | `evidence/existing-run-model-config/existing-run-model-config-evidence.json`; screenshots; `nuxt-dev.log` | Reconcile report. |

## Re-entry and reconciliation
- Last event: CASE-003 Completed, Pass (final rerun).
- Next: Final assessment/report/revision record.
- Report reconciliation: Yes — `api-e2e-execution-coverage-report.md`, Ledger reconciliation and changed-boundary sections.
