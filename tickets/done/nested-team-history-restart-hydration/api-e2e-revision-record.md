# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer` / `CRR-001` / API/E2E round 1 | `SR-004`, `ARCH-REV-002`, `IR-001`, `CRR-001` | `N/A` | `Fail` / `82.7%` |
| `API-REV-002` | `code_reviewer` / `CRR-003` / API/E2E round 2 | `SR-007`, `ARCH-REV-003`, `IR-002`, `CRR-003` | `Fail` / `82.7%` | `Pass` / `98.6%` |
| `API-REV-003` | user Electron/data report / API/E2E round 3 | `SR-007`, `ARCH-REV-003`, `IR-002`, `CRR-003` | `Pass` / `98.6%` | `Fail` / `82.1%` |
| `API-REV-004` | user-approved incident recovery / API/E2E round 4 | `SR-007`, `ARCH-REV-003`, `IR-002`, `CRR-005`, recovery assessment | `Fail` / `82.1%` | `Pass` / `98.7%` |

## Revision Entries

### API-REV-001 — Initial restart-hydration API/E2E baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/code-review-report.md`; round `1`.
- Triggering finding or scenario IDs: `CRR-001` Pass plus stale exact-ledger note; `NTH-E2E-001`–`004`, `NTH-LIVE-001`, `NTH-BR-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-004`, `ARCH-REV-002`, `IR-001`, `CRR-001`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: first completed mandatory API/E2E investigation and validation result. No prior outcome or confidence is inferred.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts`; updated `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` and `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts`; removed none. Existing frontend coverage was reclassified as inadequate for settled historical delegated-task navigation.
- Scenarios added, changed, removed, or rechecked: added restart/migration recovery, MP-001/MP-002, real-provider cold API/browser journey; updated exact ledger transition; rechecked changed owners, focused frontend controls, production build, full server E2E, and broad failures serially.
- Commands, environment, fixture, or broader-validation delta: 3 durable E2E files / 7 tests passed; 23 owner files / 101 tests passed; 4 frontend files / 18 tests passed; production build passed. Real `deepseek-v4-flash` Nested Classroom browser journey used isolated data/database and actual packages, then SIGKILL/cold restart. Full server E2E exposed unrelated baseline/stale failures separately.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; retained evidence under `api-e2e-evidence/`.
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail` / `82.7%`
- New or remaining failure IDs: `NTH-BR-001`; AC-002 and browser AC-012.
- Recommended recipient: `/code_reviewer` for focused failure-origin review.
- Remaining risks, blocked evidence, or untested scope: configured nested member browser AC-001 was not separately live-proven; Electron-only behavior is out of scope. The critical task-Team browser failure already blocks Pass. Five persistent unrelated broad-suite baseline/stale failures and two parallel flakes are documented without conflation.

### API-REV-002 — Resolve cold historical task navigation and execute three exact live routes

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/code-review-report.md`; round `2` after `CRR-003` Pass.
- Triggering finding or scenario IDs: prior `NTH-BR-001` failure; configured nested browser AC-001; user-mandated `NTH-LIVE-002A`, `NTH-LIVE-002B`, and `NTH-LIVE-002C` / AC-017.
- Related revision IDs: `SR-007`, `ARCH-REV-003`, `IR-002`, `CRR-003`; delivery `N/A`.
- Why this revision was recorded: IR-002 corrected lifecycle-purpose historical navigation/focus, and the user required independent real team-address messaging, direct-member messaging, and nested-team delegation, each across its own real server stop/cold restart and same-route/tool continuation.
- Coverage decisions or durable paths changed: reproduced the stale missing-store-mock failure in `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts`, added only the three current store-contract mock members, and retained all assertions. No durable test was removed. Five files only inside the dedicated private Nested Classroom fixture were updated to make the exact approved routes deterministic.
- Scenarios rechecked/added: rechecked `NTH-BR-001`, `NTH-E2E-001`–`004`, configured AC-001, direct-root and Team Communication controls, failed migration retry/prerequisites, MP-001/MP-002; added/completed `NTH-LIVE-002A/B/C`.
- Execution delta: current server build; 3 server E2E files / 7 tests Pass; repaired frontend test 1/1 Pass; combined frontend 7 files / 33 tests Pass; web guards and production builds Pass. Real `deepseek-v4-flash` with both authorized package roots used three distinct root runs and markers on isolated backend `62318` plus production Nuxt/Chrome `62319`.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `NTH-BR-001`; AC-002 and browser AC-012 | `Local Fix`; settled task subtree absent from inactive history and exact focus rejected it | Resolved. Cold inactive history renders two exact settled task-Team rows; exact task Student row is selectable; conversation, Event Monitor, Activity, Task panel, and last activity render; active restore excludes settled rows; same-route delegation continues after restart. | `api-e2e-evidence/round-2/real-classroom/nth-live-002c-post-result.json`; `nth-live-002c-live-projection-result.json`; `real-boundary-graphql-summary.json`; retained screenshots |
| Configured nested browser AC-001 gap | Not tested in round 1 | Resolved twice through independent A/B roots: exact configured Student conversation, Event Monitor, Activity, and non-null last activity survive cold restart through UI and GraphQL. | A/B post result JSON, cold screenshots, GraphQL summary |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; evidence under `api-e2e-evidence/round-2/`.
- Prior result and confidence: `Fail` / `82.7%`
- Current result and confidence: `Pass` / `98.6%`
- New or remaining failure IDs: `None`
- Recommended recipient: `/code_reviewer` for proportional successful-test and dedicated-fixture review, then delivery if that review passes.
- Remaining risks / untested scope: actual Electron shell and remote Docker/WAN topology were not executed because no shell or network-routing contract changed; arbitrary mechanical migration failure matrices remain explicitly excluded. These are negligible and do not leave any critical acceptance criterion unproven.

### API-REV-003 — Recheck the user's real Electron data and expose the false-success migration ledger

- Triggering role, report path, and round: user report plus actual packaged Electron screenshots; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-execution-coverage-report.md`; round `3`.
- Triggering scenario IDs: `NTH-USER-ELECTRON-001`, `NTH-MIG-REAL-001`, and direct-root control `NTH-DIRECT-ROOT-CTRL-001`.
- Related revision IDs: `SR-007`, `ARCH-REV-003`, `IR-002`, `CRR-003`; delivery work existed but final delivery was not accepted.
- Why this revision was recorded: the user demonstrated that the exact older Nested Classroom configured and task member rows render in the delivery-built Electron app but their center history remains blank after startup. API-REV-002 had used isolated fresh data and could not establish that this older real cohort was migrated.
- Coverage decisions or durable paths changed: no repository test, production source, or fixture changed. API-REV-002 remains valid for fresh canonical data but is no longer authoritative for the complete persisted-data scope.
- Execution delta: read-only inspection of the running packaged Electron process, embedded server, public GraphQL/Event Monitor, production migration ledger, exact persisted paths, and migration-log inventory. The user independently confirmed new nested data survives restart, providing a fresh-data control, then performed another real packaged-app stop/start. The repeated probe on replacement Electron/server PIDs reproduced the exact flat-only/empty-history/terminal-ledger failure.

#### Prior Failure Resolution

| Prior Scenario / Result | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-REV-002 isolated A/B/C `Pass` | Fresh canonical restart behavior proved | Still valid but bounded. It does not resolve the newly tested older production-data migration. | Round-2 evidence plus round-3 exact production-data analysis |

- Expected: eligible configured/task nested flat directories move under their ancestor TeamRun IDs before canonical public history reads.
- Observed: configured Student One/Two and all four data-bearing task Student One traces remain flat; all required canonical directories are absent; affected GraphQL/Event Monitor histories are empty; direct-root Teacher remains non-empty.
- Production ledger: `20260823_repair_team_agent_memory_layout` is terminal `SUCCEEDED` with `migrated 0`, while its log path belongs to API/E2E's deleted isolated runtime and no matching repair log exists under the user's real app data.
- Preliminary origin: API/E2E environment contamination. The ledger/path mismatch directly proves an isolated runtime wrote the shared production ledger; correlation to the disclosed omitted-`DATABASE_URL` attempt is an inference from retained path/time evidence.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; evidence under `api-e2e-evidence/round-3/user-electron-data/`.
- Prior result and confidence: `Pass` / `98.6%`.
- Current result and confidence: `Fail` / `82.1%`; diagnosis confidence `99%`.
- New failure IDs: `NTH-USER-ELECTRON-001`, `NTH-MIG-REAL-001`.
- Recommended recipient: `/code_reviewer` for focused failure-origin review; user-requested direct notification to `/solution_designer` for recovery/design assessment.
- Remaining risk / safety gate: the terminal ledger prevents normal retry. Do not edit the DB or move data until a reviewed backed-up recovery is selected. Final acceptance must restart the packaged app and click the exact configured Student One and at least one affected task Student One, verifying Conversation, Activity, and Event Monitor.

### API-REV-004 — Complete approved incident recovery and supersede the contaminated-state failure

- Triggering role, report path, and round: `/solution_designer` recovery assessment plus explicit user direction; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-execution-coverage-report.md`; round `4`.
- Triggering scenarios: unresolved `NTH-USER-ELECTRON-001` and `NTH-MIG-REAL-001` from API-REV-003; recovery scenarios `NTH-RECOVERY-001/002`, `NTH-USER-ELECTRON-002/003`, and `NTH-ISOLATION-001`.
- Related revision IDs: `SR-007`, `ARCH-REV-003`, `IR-002`, `CRR-005`; authoritative supplemental decision `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/production-ledger-contamination-recovery-assessment.md`.
- Why this revision was recorded: API-REV-003 described a real but team-created contaminated deployment state. The user approved a backed-up exact-row recovery, the unchanged reviewed migration then ran successfully against the real paired state, and the user directly confirmed packaged restart/click success.
- Coverage or source changes: none. No production source, repository-resident durable test, private fixture, manual memory move, follow-up migration, fallback, generic retry, or release changed.
- API/E2E isolation correction: every future realistic runtime must bind both app-data and `DATABASE_URL` to one test-owned root and reject the user's production data/database before process startup.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `NTH-MIG-REAL-001` false terminal success | API/E2E environment/execution `Local Fix`; recovery `Unclear` in `CRR-005` | Resolved through explicit user-approved, stopped-state, full-backup, exact-row reset; normal reviewed migration then recorded `SUCCEEDED`, attempt 1, `Scanned 112; migrated 9; skipped 103; failed 0` under the real app data. | Recovery assessment; deletion log; production migration log |
| `NTH-USER-ELECTRON-001` empty configured/task history | Consequence of migration skip, not source/navigation defect | Resolved. Six data-bearing nested members are canonical and byte-identical to backup; all public histories/Event Monitor are non-empty; user confirmed actual packaged restart/click success. | `post-restart-migration-verification.json`; user confirmation |

- Integrity evidence: entire migration-visible memory tree plus DB/key/sidecars backed up; 9,202 source/backup files; checksum verification passed; one row deleted; zero remaining; SQLite `quick_check=ok`; no memory change during cleanup.
- Exact configured Student One result: 60 conversation / 17 activities / 60 Event Monitor / non-null last activity.
- Exact task Student One results: 3/1/3, 3/1/3, 3/1/3, and 6/2/6 conversation/activity/event counts; all canonical targets byte-identical to their backed-up flat sources.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record.
- Prior result and confidence: `Fail` / `82.1%`.
- Current result and confidence: `Pass` / `98.7%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/code_reviewer` for proportional reconciliation / `Not Applicable` because no durable coverage changed in round 4, then `/delivery_engineer`.
- Remaining risk: only the recorded API/E2E process-control risk; it is bounded by the mandatory coupled app-data/`DATABASE_URL` pre-start assertion. Unsupported cross-root/shared-ledger pairing is not a product lifecycle.
