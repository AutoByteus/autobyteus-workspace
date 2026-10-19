# API/E2E Test-Case Ledger — draft-run-id-validation

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: 11 probe cases in one run with backend restarts.
- Last updated: 2026-10-10 (run-1 reconciled)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Surface | Command | Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-001 | Universal draft routes; traversal/dot-only/agent-final rows → 400 + detail; live upload/finalize rejections; context-file snapshot unchanged; bearer | AC-001..004, AC-007..009, REQ-002/003 | Live API | `pnpm -C autobyteus-web test:e2e:composer-context-file-removal` | 1 | Extended this round |
| CF-002 | Delegated Agent copy journey | REQ-005, AC-006 | Browser | same | 2 | Regression |
| CF-003 | Delegated Team-copy member journey | REQ-005, AC-006 | Browser | same | 3 | Regression |
| CF-006 | Manager, New chat, Team members, Org members journeys | REQ-005, AC-006 | Browser | same | 4 | Regression |
| CF-007 | Foreign draft clone | REQ-005 | Browser | same | 5 | Regression |
| CF-008 | Injected failures visible | REQ-005 | Browser | same | 6 | Regression |
| CF-009 | Org task agent pending gate | REQ-005 | Browser | same | 7 | Regression |
| CF-011 | `+` on Manager → New chat → attach → send → agent-final read | REQ-005, AC-006, AC-007 (valid) | Browser + API | same | 8 | New |
| CF-012 | `+` on Team run → New chat → attach → send → team final read | REQ-005, AC-006 | Browser + API | same | 9 | New |
| CF-004 | Outage during × and retry | REQ-005 | Browser + process | same | 10 | Regression |
| CF-005 | Delegated children after restart | REQ-005, persisted data | Browser + process | same | 11 | Regression |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | all | 2026-10-10T04:15:20Z | Started | run-1: `pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir <ticket>/api-e2e-evidence/run-1 --ledger <this file>` | 11 cases pass | — | — | `api-e2e-evidence/run-1/` | — |
| 2 | CF-001..CF-012, CF-004, CF-005 | 2026-10-10T04:16:51Z | Completed | run-1 | Pass | 11/11 Pass (per-case lines appended below); cleanup: browser closed, groups terminated, data root removed | Pass | run-1 `evidence.json` | — |
| 3 | all | 2026-10-10 | Completed | Stability: same command, `--output-dir /tmp/drv-api-e2e/stability-1` | 11 cases pass | 11/11 Pass; cleanup complete | Pass | `/tmp/drv-api-e2e/stability-1/evidence.json` | — |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 3 (stability rerun, 11/11 Pass)
- Last completed case and result: run-1 CF-005 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: none (development runs in `/tmp/drv-api-e2e/dev-*` preceded run-1)
- Reconciled into execution coverage report: `Yes`
- Reconciliation note for any case missing a terminal result: none

## Probe Case Log (appended by the probe as each case finishes)

- CF-001: Pass — Universal draft routes over real HTTP: every owner kind, status mapping, traversal, bearer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-002: Pass — Delegated Agent copy: paste, +, path, ×, Clear All; drafts leave the disk. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-003: Pass — Delegated Team-copy member (19.png): paste, +, path, ×, Clear All; drafts leave the disk. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-006: Pass — Regressions: Manager, New chat, Team members, Org direct member, Org team member, Org task agent. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-007: Pass — Pasted foreign draft URL is cloned; removing it keeps the source. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-008: Pass — Injected DELETE/upload failure: visible error naming the file, item kept, retry clears. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-009: Pass — Org task agent while its message is pending: + disabled, paste shows message, path still attaches. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-011: Pass — + on the Manager run → New chat → attach → send: temp-chat draft finalized, agent-final file readable. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-012: Pass — + on a Team run → New chat for the team → attach → send: temp-chat draft finalized, team-member final file readable. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-004: Pass — Server unreachable during ×: visible error, item kept; retry after it returns. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json

- CF-005: Pass — Delegated children after root stop + backend restart + reload. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/api-e2e-evidence/run-1/evidence.json
