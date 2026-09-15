# API/E2E Revision Record

Canonical investigation and execution report in this directory are authoritative. This file indexes completed rounds; missing prior results never imply Pass.

## Revision index
| Revision | Trigger / related upstream | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| API-REV-001 | CRR-001 initial implementation-review Pass; SR-001–004 (approved SR-003), DS-001, ARCH-REV-001, IR-001 | N/A | Pass / 95% |

## API-REV-001 — Initial isolated migration-to-continuation validation
- Date/round: 2026-09-15 / 1. Trigger: code_reviewer, code-review-report.md CRR-001; no triggering finding IDs.
- Medium task / High architectural risk, Reviewed route retained. No previous API record/result; prior confidence N/A.
- Established baseline: independent existing migration/SQL/I/O/recovery coverage; 501-root/member batch tests; exact referenced-current-Org lookup; actual legacy materialization→same family→full Org/mounted Team/Agent restore→default pipeline→token/response DTO→recorded-history journeys for first upgrade and token-only rerun. External backend scripted, not live provider.
- Durable paths added: server tests/integration/app-data-migrations/agent-org-token-batch-boundaries.integration.test.ts; agent-org-exact-reference.integration.test.ts; tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts; tests/helpers/org-migration-continuation-fixtures.ts. Updated tests/helpers/token-usage-run-record-fixtures.ts (six nullable fields). No removals or production changes.
- Scenarios API-C01–07 / SCN-001–005 / AC-001–008. Final combined 402 tests / 79 files pass, zero skips; server build, source compiler, selected-test compiler and whitespace pass. Canonical report gives exact commands/config.
- Intermediate confidence 82.86%; required broader lifecycle validation raised final to 95%. Seven applicable categories each 95%, no unresolved critical AC or category below 90%. Default test-inclusive TS6059 remains an upstream-disclosed limitation, not passed.

### Prior failure resolution
None — no previous API round. Within-round setup/test errors (copied seed id, event-envelope/public DTO expectations, missing built-server output, nullable fixture typing) corrected locally; raw attempts retained in logs and ledger. No supported implementation failure observed or suppressed.

- Canonical artifacts created/updated: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-test-case-ledger.md, this record; execution/build/compiler logs retained.
- Current result: **Pass / 95%**. Remaining failure IDs: None. Recommended recipient: rule-returned Code Reviewer for proportional durable-test review, not implementation re-review.
- Cleanup: disposable roots/DBs and owned child processes cleaned; generated untracked SDK dist and compiler config removed; exact test-created worktree workspace metadata removed, fixture corrected to avoid ambient registration. No live data, app lifecycle, ledger reset, commit/push/merge/release performed.
- Remaining limits: scripted provider/cost lookup; no browser render or Electron-shell run; no user-profile qualification or total startup timing claim. Later live-profile work requires separate approval/stopped writers/paired backups. Eventual target requirements/flat-agent-organization-model, NOT personal.
- Routing confirmed: get_handoff_rules selected Pass + High risk + proportional durable-test review → `/code_reviewer`, single most-specific rule.
