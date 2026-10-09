# API/E2E Test-Case Ledger — composer-context-file-removal

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: ten independent cases in one long probe run with backend restarts.
- Last updated: 2026-10-09 (run-2 reconciled)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-001 | Universal draft routes over real HTTP, every owner kind; status mapping; traversal; bearer | AC-005, QR-001 | Live API (built backend) | `pnpm -C autobyteus-web test:e2e:composer-context-file-removal` | 1 | Real owners from real delegation |
| CF-002 | Delegated Agent copy: paste, `+`, ×, Clear All, disk | AC-001, AC-002 | Browser | same | 2 | |
| CF-003 | Delegated Team-copy member (19.png) | AC-001, AC-002 | Browser | same | 3 | |
| CF-006 | Regressions: Manager, New chat, Team + sub-team member, Org direct, Org task | AC-004 | Browser | same | 4 | includes CF-010 send |
| CF-007 | Paste another composer's draft URL → clone; source intact | AC-006 | Browser | same | 5 | |
| CF-008 | Injected DELETE/upload 5xx → visible error naming file; retry | AC-008 | Browser | same | 6 | |
| CF-009 | Org task agent pending: gate | AC-007 | Browser | same | 7 | |
| CF-004 | Real outage during ×, retry after backend returns | AC-008 | Browser + process | same | 8 | |
| CF-005 | Delegated child after root stop + backend restart + reload | AC-003 | Browser + process | same | 9 | |
| CF-010 | Sent uploaded draft reaches the runtime (resolver via codec) | D2 preserved | Browser + runtime | same | within CF-006 | Dropped (see sequence 8) |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | all | 2026-10-09T15:36Z | Started | run-1: `node autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs --output-dir <ticket>/api-e2e-evidence/run-1 --ledger <this file>` | 9 cases pass | — | — | `api-e2e-evidence/run-1/` | — |
| 2 | CF-001..CF-007, CF-009, CF-004 | 2026-10-09T15:38Z | Completed | run-1 | Pass | Pass (per-case lines appended below) | Pass | run-1 `evidence.json` | — |
| 3 | CF-008 | 2026-10-09T15:38Z | Completed | run-1 | Pass | Timed out reading the error line (probe race: count then `innerText` on an element being removed) | Fail (probe defect) | run-1 `evidence.json` | Fix `errorText` to a non-waiting read |
| 4 | CF-005 | 2026-10-09T15:38Z | Completed | run-1 | Pass | Owner folder not empty: draft left by the failed CF-008 | Fail (probe cascade) | run-1 `evidence.json` | Check only drafts the journey added |
| 5 | all | 2026-10-09T15:38:55Z | Started | run-2 (fixed probe), same command with `run-2` | 9 cases pass | — | — | `api-e2e-evidence/run-2/` | — |
| 6 | CF-001..CF-009 | 2026-10-09T15:39:54Z | Completed | run-2 | Pass | 9/9 Pass; cleanup: browser closed, backend/Nuxt groups terminated, data root removed | Pass | run-2 `evidence.json` | — |
| 7 | all | 2026-10-09 | Completed | Stability: `pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir /tmp/ccfr-api-e2e/stability-1` | 9 cases pass | 9/9 Pass; cleanup complete | Pass | `/tmp/ccfr-api-e2e/stability-1/evidence.json` | — |
| 8 | CF-010 | 2026-10-09 | Completed | — | — | Dropped: draft locators are not on a runtime send path | N/A | investigation | — |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 7 (stability rerun, 9/9 Pass)
- Last completed case and result: run-2 CF-005 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: run-1 → run-2 after two probe-defect fixes (sequences 3–4)
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: none

## Probe Case Log (appended by the probe as each case finishes)

- CF-001: Pass — Universal draft routes over real HTTP: every owner kind, status mapping, traversal, bearer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-002: Pass — Delegated Agent copy: paste, +, path, ×, Clear All; drafts leave the disk. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-003: Pass — Delegated Team-copy member (19.png): paste, +, path, ×, Clear All; drafts leave the disk. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-006: Pass — Regressions: Manager, New chat, Team members, Org direct member, Org team member, Org task agent. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-007: Pass — Pasted foreign draft URL is cloned; removing it keeps the source. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-008: Fail — Injected DELETE/upload failure: visible error naming the file, item kept, retry clears (Timed out: upload retry clears the error (locator.innerText: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-test="workspace-center-pane"] [data-file-drop-target="true"]').first().locator('[data-testid="context-file-error"]')
)). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-009: Pass — Org task agent while its message is pending: + disabled, paste shows message, path still attaches. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-004: Pass — Server unreachable during ×: visible error, item kept; retry after it returns. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

- CF-005: Fail — Delegated children after root stop + backend restart + reload (Timed out: offline-agent-copy owner folder empty). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-1/evidence.json

(run-1 above: CF-008 / CF-005 failures were probe defects — non-waiting error-line read and a journey disk check that counted a draft left by the failed CF-008; fixed before run-2.)

- CF-001: Pass — Universal draft routes over real HTTP: every owner kind, status mapping, traversal, bearer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-002: Pass — Delegated Agent copy: paste, +, path, ×, Clear All; drafts leave the disk. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-003: Pass — Delegated Team-copy member (19.png): paste, +, path, ×, Clear All; drafts leave the disk. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-006: Pass — Regressions: Manager, New chat, Team members, Org direct member, Org team member, Org task agent. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-007: Pass — Pasted foreign draft URL is cloned; removing it keeps the source. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-008: Pass — Injected DELETE/upload failure: visible error naming the file, item kept, retry clears. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-009: Pass — Org task agent while its message is pending: + disabled, paste shows message, path still attaches. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-004: Pass — Server unreachable during ×: visible error, item kept; retry after it returns. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json

- CF-005: Pass — Delegated children after root stop + backend restart + reload. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/api-e2e-evidence/run-2/evidence.json
