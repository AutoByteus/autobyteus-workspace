# API/E2E Test-Case Ledger — APP-STARTUP-LATENCY-20260918-001

## Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis`
- Investigation: `api-e2e-coverage-investigation.md`
- Report: `api-e2e-execution-coverage-report.md`
- Revision record: `api-e2e-revision-record.md`
- Latest round: `API-REV-002`
- Last event: API-REV-002 C01 cleanup completed.
- Running/interrupted/unstarted cases: none.
- Reconciled into report: yes.

## Current Case Status

| Case | Journey | Authority | Surface | Latest status |
| --- | --- | --- | --- | --- |
| P01 | One corrected retry, all eight warning details, no source/target damage | AC-005 | Full process + SQLite/filesystem | Pass |
| L01 | Three later terminal starts, <10s, zero readiness trace reads, no repeat writes | AC-001/005 | Full process/lifecycle | Pass |
| E01 | Typed token rollback/local guard; unrelated root; fatal categories/precedence | AC-006/007 | Real SQLite/manager fixtures | Pass |
| H01 | Retained Team/AgentOrg history remains usable | AC-003 | Browser | Pass |
| A01 | Actual Team/AgentOrg attachment Open remains usable | AC-004 | Browser + exact REST | Pass |
| D01 | First authorized ledger delta and subsequent byte stability | AC-003/005 | Hash/SQLite | Pass |
| C01 | Cleanup, report, revision and handoff | All | Workflow | Pass |

## API-REV-002 Execution Events

| # | Case | Timestamp | Event | Expected | Observed | Result | Evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 16 | P01 | 2026-09-19T01:20:00Z | Started | Fresh owned representative clone; run prior failing scenario first | Created `.local/api-startup-profile-r2` from prior API/E2E-owned clone; captured ledger, eight root and full profile baselines | Checkpoint | `validation/api-e2e-r2/{p01-ledger-before.json,p01-before-roots.json,profile-before.json}` |
| 17 | P01 | 2026-09-19T01:27:00Z | First corrected startup | Terminal warning, all eight identities/reasons, failed8, zero targets, unchanged sources | Health 6425.083ms; `FAILED` attempts27 → `SUCCEEDED_WITH_WARNINGS` attempts28; all eight details persisted; migrated0/skipped518/failed8; source exact; targets0; trace reads0; fetches0 | Pass | `p01-first-corrected-*`, `p01-terminal-warning-log.txt`, `p01-after-first-roots.json` |
| 18 | D01 | 2026-09-19T01:28:00Z | First-run persistence reconciliation | Only authorized migration ledger state may change | 21 SQLite tables compared; only `app_data_migration_records` changed. Flat-family record became terminal; separate previously NOT_RUN summary migration recorded successful no-op. Other20 tables and non-DB categories exact | Pass | `p01-db-logical-comparison.json`, `profile-after-first.json` |
| 19 | L01 | 2026-09-19T01:32:00Z | Three later full starts | Each <10s, zero trace reads/fetches, exact attempts/timestamps/log path/targets/profile | 3210.487 / 2555.660 / 2562.309ms; zero reads/fetches; ledger exact; all profile categories exact | Pass | `p01-stable-{1,2,3}-*`, `p01-terminal-stability.json` |
| 20 | E01 | 2026-09-19T01:48:00Z | Typed-token/fatal executable control | Typed data warns/rolls back/blocks locally; unrelated root works; operational failures fatal; fatal wins | 5 files / 66 tests Pass at real SQLite/manager/coordinator boundary, including terminal skip | Pass | `token-warning-fatal-executable.log` |
| 21 | H01/A01 | 2026-09-19T03:38:00Z | Normal Chrome Team history/attachment | Retained history and actual Open load exact bytes | Software Engineering Team retained conversation opened; `solution_designer` image loaded at exact Team REST URL, 3024×1886 | Pass | `team-history-attachment.png`, `team-attachment-open.png`, `browser-history-attachment-proof.json` |
| 22 | H01/A01 | 2026-09-19T03:42:00Z | Normal Chrome AgentOrg history/attachment | Retained mounted-member conversation and actual Open load exact bytes | `/StudentStudyGroup/student_one` retained conversation opened; click created browser tab on exact AgentOrg REST URL, 3012×1892 | Pass | `org-history-attachment.png`, `org-attachment-open.png`, `browser-history-attachment-proof.json` |
| 23 | D01 | 2026-09-19T03:45:00Z | Post-browser preservation | Read-only browser journey changes no tracked profile data | Definitions, 6577 traces, 1107 context files, 5618 history/runtime files, DB and config exact | Pass | `browser-readonly-preservation.json`, `profile-after-browser.json` |
| 24 | C01 | 2026-09-19T03:47:00Z | Cleanup | No owned tabs/listeners/processes/generated SDK output | Tabs0; ports51481/51483 closed; owned process match0; generated SDK dist removed | Pass | `cleanup-process-check.txt` plus empty `list_tabs` result |

## API-REV-001 Historical Baseline

| Case | Historical result | Key observation | Evidence |
| --- | --- | --- | --- |
| R01 | Pass | Current owner/access suites and build passed | `validation/api-e2e/repository-*.log` |
| L01 | Pass after invalidated setup was rerun | Three corrected isolated starts under10s and zero trace reads | `validation/api-e2e/three-launch-summary.json` |
| H01 | Pass | Actual Agent, Team and AgentOrg history rendered; invalid roots excluded | `history-all-families.png`, `readiness-diagnostics.json` |
| A01 | Pass | Actual Team/Org Open and 13/13 exact status/continuity matrix | `team-attachment-open.png`, `org-attachment-thumbnail.png`, `live-rest-matrix.json` |
| P01 | **Fail** | Failed migration retried each start and changed its ledger, contradicting the then-approved literal no-DB-write contract | `p01-preservation-result.json` |
| C01 | Pass | Owned resources cleaned | `cleanup-check.txt` |

Historical safety note: the initial API-REV-001 clone inherited absolute user paths. Those observations were invalidated, the process was stopped, and only the already-failed migration attempt/timestamp advanced four times (`migrated 0`). API-REV-001 was fully rerun with explicit owned paths. API-REV-002 used a fresh clone of that already-owned corrected profile and did not repeat the incident.
