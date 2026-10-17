# API/E2E Test-Case Ledger — `baseline-e2e-probe-repair`

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair` (branch `codex/baseline-e2e-probe-repair`, HEAD `3108bb9ef8`, base `origin/personal` `516e592d7b`)
- Coverage investigation: `tickets/in-progress/baseline-e2e-probe-repair/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/baseline-e2e-probe-repair/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/baseline-e2e-probe-repair/api-e2e-revision-record.md`
- Ledger scope and reason it is required: 14 independent cases across 7 server e2e files, 3 browser probes and repository checks; several run for minutes.
- Last updated: 2026-10-17, by API/E2E Engineer (API-REV-001)

Evidence root: `tickets/in-progress/baseline-e2e-probe-repair/evidence/api-e2e/` (shortened to `E/` below).

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-000 | Build the server at HEAD | prerequisite | `dist/app.js` | `pnpm -C autobyteus-server-ts prebuild && build` | 0 | TESTING.md: suites need a current build |
| VAL-001 | `team-run-config-graphql` 7 tests | REQ-001 / AC-001 (verify-only) | built server, GraphQL | 7-file `vitest run` (clean env) ×2 | 1 | fixed upstream |
| VAL-002 | `agent-command-correlated-status` | REQ-002 / AC-002 | in-process WebSocket | same run ×2 | 1 | |
| VAL-003 | `standalone-error-termination-lifecycle` | REQ-003 / AC-003 | in-process GraphQL + manager | same run ×2; `-t` per test; injected-failure cascade check | 1, 2 | |
| VAL-004 | `team-run-v1-production-upgrade` 4 tests | REQ-004, REQ-011 / AC-004 | built server startup on released data | same run ×2 | 1 | Critical |
| VAL-005 | `memory-sync-multiprocess` | REQ-005 / AC-005 | two built server processes | same run ×2 | 1 | |
| VAL-007 | `recent-run-projection-graphql` 9 tests | REQ-007 / AC-007 (verify-only) | in-process GraphQL | same run ×2 | 1 | fixed upstream |
| VAL-008 | `configured-skill-on-demand-loading` 2 tests | REQ-008 / AC-008 | native backend factory | same run ×2 | 1 | |
| VAL-006 | UC-006 withdrawal | REQ-006 / AC-006 (withdrawn) | repository tree | `git ls-tree` base and HEAD; `tickets/done/remove-nested-task-team` | 3 | static |
| VAL-009 | `existing-run-model-config` probe | REQ-009 / AC-009 | Nuxt + Chrome, fixture boundaries | `pnpm -C autobyteus-web test:e2e:existing-run-model-config --output-dir <fresh>` | 4 | clean env |
| VAL-010 | `interrupt-result-presentation` probe | REQ-009 / AC-010 | Nuxt + Chrome + probe WS server | `pnpm -C autobyteus-web test:e2e:interrupt-result-presentation --output-dir <fresh>` | 5 | new script |
| VAL-011 | `run-settings-live --cases R03` | REQ-009 / AC-011, QR-002 | real built backend + Nuxt + Chrome | `pnpm -C autobyteus-web test:e2e:run-settings-live --cases R03 --output-dir <fresh>` | 6 | real HOME/USER/LOGNAME |
| VAL-012 | Diff, commit and no-production-change review | REQ-010, REQ-012 / AC-012 | git | `git diff/log 516e592d7b..HEAD` | 7 | static |
| VAL-013 | Server typecheck + `test:unit` | AC-012 | server src | `pnpm -C autobyteus-server-ts typecheck`; `test:unit` | 8 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event (`Started`/`Checkpoint`/`Completed`) | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`/`N/A`) | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | VAL-000 | 2026-10-17 ~17:59 | Completed | `prebuild && build` at `3108bb9ef8` | exit 0 | exit 0; bootstrap smoke passed | Pass | `E/server-build-3108bb9ef8.log` | — |
| 2 | VAL-001..005, 007, 008 | 18:01 | Completed | run 1: `env -i PATH HOME=/tmp/api-e2e-home-* TMPDIR vitest run --no-watch <7 files>` | 7 files / 26 tests pass | 7/7 files, 26/26 tests, exit 0, 57 s | Pass | `E/server-e2e-run1.plain.log` | — |
| 3 | VAL-001..005, 007, 008 | 18:03 | Completed | run 2: same, fresh temp HOME | 26/26 | 7/7 files, 26/26 tests, exit 0 | Pass | `E/server-e2e-run2.log` | — |
| 4 | VAL-003 | 18:04 | Completed | `-t` each test alone, fresh temp HOME each | each passes alone | 1 passed / 1 skipped, exit 0, for both | Pass | `E/uc003-each-test-alone.log` | — |
| 5 | VAL-003 | 18:05 | Completed | temporary copy with a throw injected after `startHarness(true)` in test 1 | test 1 fails; test 2 still passes (no cascade) | test 1 × (injected), test 2 ✓; temp file removed, `git status` clean | Pass | `E/uc003-injected-failure-no-cascade.log` | — |
| 6 | VAL-009 | 18:06 | Completed | clean env, temp HOME, fresh `--output-dir` | 0 failures, 0 page/console errors, cleanup complete | A–F Pass; failures []; 0 pageerror / console:error; cleanup complete (devServer terminated, temp page removed) | Pass | `E/probes/existing-run-model-config/` | — |
| 7 | VAL-010 | 18:08 | Completed | via the new `test:e2e:interrupt-result-presentation` script, clean env | SR008 cases pass, 0 browser errors | SR008-BR-001..004 Pass; failures []; 0 pageerror / console:error; only `GetTeamMemberRunProjection`, `GetRunFileChanges` sent; cleanup complete | Pass | `E/probes/interrupt-result-presentation/` | — |
| 8 | VAL-011 | 18:10 | Completed | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR … --cases R03` | failure copy, values kept, Run enabled, no run, 1 launch request | R03 Pass; launchRequests `["fragile-org"]`; status exact; model/approval kept; `mode=configuration`; Run enabled; historyUnchanged; browserErrors []; temp root removed; `~/.autobyteus` mtime unchanged | Pass | `E/probes/run-settings-live-R03/`, `E/probes/home-autobyteus-mtime-*.txt` | — |
| 9 | VAL-006, VAL-012 | 18:12 | Completed | `git diff/log/ls-tree 516e592d7b..HEAD` | only test files + 1 script line; 8 labelled baseline-fix commits; suite absent | as expected; no production file; suite absent at base and HEAD (only ticket docs mention it) | Pass | `E/ac012-diff-and-commit-review.txt` | — |
| 10 | VAL-013 | 18:07 | Started | typecheck, then `test:unit` (its own env isolation) | both exit 0 | — | — | `E/server-typecheck.log`, `E/server-test-unit.summary.txt` | — |
| 11 | VAL-013 | 18:16 | Completed | as above | both exit 0 | typecheck exit 0; test:unit 715 files / 5811 tests pass (4 files / 7 tests skipped), exit 0 | Pass | `E/server-typecheck.log`, `E/server-test-unit.summary.txt` (the 1.08 MB full log was not retained) | — |

## Re-entry And Reconciliation

- Last durably recorded event: 11
- Last completed case and result: VAL-013 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: None
- Interruption or rerun note: None
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: None
