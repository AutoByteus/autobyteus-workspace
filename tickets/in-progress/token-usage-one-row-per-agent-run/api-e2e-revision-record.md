# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative. This record preserves concise round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / CRR-002 / round 1 | SR-006; ARCH-REV-006; IR-002; CRR-002 | N/A | Fail / 70.0% |
| API-REV-002 | `code_reviewer` / CRR-004 / round 2 | SR-006; ARCH-REV-006; IR-003; CRR-004 | Fail / 70.0% | Fail / 75.0% |
| API-REV-003 | `code_reviewer` / CRR-007 / round 3 | SR-006; ARCH-REV-006; IR-005; CRR-007 | Fail / 75.0% | Pass / 97.1% |
| API-REV-004 | `code_reviewer` / CRR-009 / round 4 | SR-006; ARCH-REV-006; IR-006; CRR-009; DR-002 | Pass / 97.1% | Pass / 97.3% |
| API-REV-005 | `code_reviewer` / CRR-011 / round 5 | SR-007; ARCH-REV-007; IR-007; CRR-011; DR-004 | Pass / 97.3% | Pass / 97.4% |
| API-REV-006 | `code_reviewer` / CRR-014 / round 6 | SR-009; ARCH-REV-009; IR-008–IR-009; CRR-014; DR-006 | Pass / 97.4% | Pass / 97.6% |
| API-REV-007 | `code_reviewer` / CRR-015 / round 7 Local Fix | SR-009; IR-009; CRR-014; CRR-015/TCR-001; DR-006 | Pass / 97.6% | Pass / 97.7% |

## Revision Entries

### API-REV-001 — Current-store mixed-pricing failure baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 1.
- Triggering finding or scenario IDs: `APIE2E-F001` discovered while implementing the planned APIE2E-002/current-store coverage.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-006`, `IR-002`, `CRR-002`; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result. A reset/migrated real Prisma/SQLite current-store scenario disproved the required mixed-currency cost-status/unit-price semantics, so execution correctly stopped and recorded `Fail` rather than crediting planned evidence.
- Coverage decisions or durable test paths changed:
  - added `autobyteus-server-ts/tests/helpers/token-usage-run-record-fixtures.ts`;
  - updated `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts`;
  - updated `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts`;
  - updated `autobyteus-server-ts/tests/integration/token-usage/providers/default-agent-run-event-pipeline-lifecycle.integration.test.ts`;
  - replaced obsolete contents in `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`;
  - replaced obsolete contents in `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`.
- Scenarios added, changed, removed, or rechecked: partial APIE2E-001/002/003 coverage was added/rechecked; `APIE2E-F001` was added and reproduced; APIE2E-004–008 and APIE2E-TMP-001 remain not tested; no durable test file was removed.
- Commands, environment, fixture, or broader-validation delta: frozen lockfile install, Prisma generation, and shared preparation passed. Focused Vitest ran against the normal reset/migrated worktree SQLite DB. The selected real-SQLite lifecycle/scale, live API, and Chrome validation did not start because a critical current-store failure requires rework first.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 70.0%`
- New or remaining failure IDs: `APIE2E-F001`
- Recommended recipient: `/code_reviewer` for focused failure-origin review, likely followed by `/implementation_engineer` for a bounded implementation fix.
- Remaining risks, blocked evidence, or untested scope: AC-008 fails; released-scale consolidation, migration lifecycle/recovery/overlap/freelist, every restore gate, GraphQL/live SafeInt, browser states, remaining stale coverage, and the known Nuxt typecheck toolchain incompatibility remain incomplete.

### API-REV-002 — Prior pricing failure resolved; local cache state failure found

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 2 after `CRR-004`.
- Triggering finding or scenario IDs: prior `APIE2E-F001` recheck, followed by new `APIE2E-F002`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-004`, prior `API-REV-001`; no delivery revision.
- Why this revision was recorded: the prior mixed-currency defect is resolved and all six original API/E2E durable changes pass, but resumed current-record/GraphQL maintenance exposed a second preserved public-semantic defect before lifecycle/scale/browser execution.
- Coverage decisions or durable test paths changed: retained the original six paths; corrected the pipeline post-quiescence assertion; converted statistics, display capture, enrichment, GPT-5.6 GraphQL, general GraphQL, provider-semantics GraphQL, and unit-price GraphQL coverage to current run-record owners. No file was removed.
- Scenarios added, changed, removed, or rechecked: `APIE2E-F001` resolved; APIE2E-001/003 and original store coverage passed; APIE2E-002/004/010 expanded; `APIE2E-F002` added and reproduced; APIE2E-005–008/TMP-001 remain not tested.
- Commands, environment, fixture, or broader-validation delta: ran focused F001/F002 commands, original durable paths, broad 30-file diagnostic, and seven-file current API suite using worktree-local lockfile dependencies and reset/migrated real Prisma/SQLite. No backend, browser, or scale process was started after F002.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F001` | Local Fix implementation defect | Resolved by `IR-003`, source-reviewed in `CRR-004`, and independently passed by API/E2E before other round-2 work | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/07-api-e2e-f001-round2-recheck.log` |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 70.0%`
- Current result and confidence: `Fail / 75.0%`
- New or remaining failure IDs: `APIE2E-F002`; `APIE2E-F001` resolved.
- Recommended recipient: `/code_reviewer` for focused failure-origin review, likely followed by `/implementation_engineer` for a bounded current record cache-state merge correction.
- Remaining risks, blocked evidence, or untested scope: two stale current GraphQL expectations and both source-shaping startup E2Es still need completion; released-scale consolidation, migration lifecycle/retry/overlap/freelist, every restore gate, live unsafe-SafeInt, Chrome UI states, and known Nuxt typecheck incompatibility remain incomplete.

### API-REV-003 — Current one-row transition and system boundaries pass

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 3 after `CRR-007`.
- Triggering finding or scenario IDs: prior `APIE2E-F002` recheck plus completion of APIE2E current fold/API, source shaping, consolidation, lifecycle, scale, SafeInt, and Chrome scenarios.
- Related revision IDs: `SR-006`, `ARCH-REV-006`, `IR-005`, `CRR-007`, prior `API-REV-002`; no delivery revision.
- Why this revision was recorded: the prior local cache-state defect and subsequent migration-only historical semantic correction are source-reviewed and pass direct executable rechecks. All remaining selected repository, actual-server, released-scale, and browser evidence is complete with no critical failure.
- Coverage decisions or durable paths changed: retained and completed the original 13 API/E2E-owned paths; retargeted historical unknown to actual released migration/current output; corrected two stale current GraphQL assertions; updated both source-shaping startup E2Es; expanded actual built-server production upgrade/lifecycle and migration rollback/freelist/empty-relaunch coverage. Seventeen repository-resident paths are added or updated; none removed.
- Scenarios added, changed, removed, or rechecked: `APIE2E-F002` resolved; source shaping, production success/relaunch, failed consolidation, old/new admission, retry, overlap, transaction rollback, all restore gates, unsafe SafeInt, ninth/reappearing series, byte caps, freelist, released-scale resources, and Chrome normal/degraded/fatal are complete. The external-runtime opt-in provider suite and unchanged Electron shell were not selected.
- Commands, environment, fixture, or broader-validation delta: final broad server selection passed 27 files/125 tests with three explicit external-runtime skips; server TypeScript/build/diff/static checks passed; Nuxt component/guards and production build passed; 154,100-row/880,848,896-byte real SQLite probe passed; actual built server plus Chrome 151 passed; all owned processes/data were cleaned. Nuxt typecheck reproduced only the previously recorded `vue-tsc`/TypeScript package-export blocker.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F002` | Local Fix implementation defect | First explicit local cache state now persists/hydrates truthfully; reviewed `IR-004` source passes the exact recheck | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/14-api-e2e-f002-round3-recheck.log` |
| Later historical-unknown assertion | Stale coverage setup | Current ingestion case replaced by real released-row consolidation/current-record GraphQL output after `IR-005` / `CRR-007` | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/15-round3-graphql-current-migration.log` |
| `APIE2E-F001` | Resolved in API-REV-002 | Remains resolved in final broad pricing/API suite | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/28-final-broad-server-lifecycle-api-suite.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 75.0%`.
- Current result and confidence: `Pass / 97.1%`.
- New or remaining failure IDs: `None`; `APIE2E-F001` and `APIE2E-F002` resolved.
- Recommended recipient: `/code_reviewer` for mandatory proportional review of the 17 changed durable coverage paths before delivery.
- Remaining risks, blocked evidence, or untested scope: known independent Nuxt typecheck package-export incompatibility; external-provider runtime E2E not selected; Electron shell unchanged and not executed. None blocks the approved current storage/migration/API/renderer scope.

### API-REV-004 — Integrated TeamRun/readiness lifecycle passes

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; focused API/E2E round 4 after `CRR-009`.
- Triggering finding or scenario IDs: no open source finding; latest-base integration required revalidation of built-server consolidation recovery/unmanaged restore, managed/offline exact restore/delete, and delegated-task readiness/settlement seams.
- Related revision IDs: `SR-006`, `ARCH-REV-006`, `IR-006`, `CRR-009`, `DR-002`; prior `API-REV-003` and proportional review `CRR-008` remain the unaffected broad baseline.
- Why this revision was recorded: source changed after API-REV-003 when the ticket branch integrated the latest base. The focused run directly proved the combined lifecycle at merge `cbbedd6ea0e6d466a3e3741c7216f03887b0182e` rather than inferring validity from the earlier result.
- Coverage decisions or durable paths changed: existing actual built-server, TeamRun service/manager, archive GraphQL, and settlement tests remained valid. Inventory found one real gap and updated `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts` to prove current-schema readiness rejection precedes agent-run allocation, TeamRun lookup, and task materialization. No durable file was added or removed.
- Scenarios added, changed, removed, or rechecked: rechecked actual built-server failed consolidation -> unmanaged old restore rejection -> current new-run admission -> corrected retry -> old restore success; rechecked manager-owned offline identity and exact restore/delete transition lanes; executed a temporary current GraphQL inactive-delete/managed-rejection probe; rechecked task settlement `unregisterTerminated()` cleanup; added the direct delegated-task readiness-order scenario.
- Commands, environment, fixture, or broader-validation delta: full server build passed; actual built-server lifecycle passed 1 selected case; temporary GraphQL plus service/manager selection passed 4 files/23 tests after a fixture-only diagnostic correction; task file passed 9 tests; final integrated selection passed 7 files/37 tests; server TypeScript, diff, ancestry, and cleanup checks passed. Broader scale/pricing/SafeInt/Chrome repetition was not required because the focused source and execution showed no impact beyond lifecycle integration.

#### Prior Failure Resolution

| Prior scenario / reference | Previous status | Current resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F001` / mixed pricing | Resolved before API-REV-003 | Remains resolved; IR-006 does not change pricing | Prior API-REV-003 broad evidence retained |
| `APIE2E-F002` / first cache state | Resolved in API-REV-003 | Remains resolved; IR-006 does not change current fold/cache semantics | Prior API-REV-003 broad evidence retained |
| DR-002 integrated restore conflict risk | Source-resolved in IR-006/CRR-009; executable proof pending | Resolved by direct focused built-server, GraphQL, TeamRun integration, and task lifecycle passes | `test-results/api-e2e/logs/32-ir006-built-server-restore-retry.log`; `logs/34-ir006-managed-offline-graphql-delete-pass.log`; `logs/36-ir006-final-integrated-focused-suite.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Pass / 97.1%`.
- Current result and confidence: `Pass / 97.3%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/code_reviewer` for proportional review of the one changed durable test before delivery resumes.
- Remaining risks, blocked evidence, or untested scope: known independent Nuxt typecheck package-export incompatibility; external-provider runtime and Electron shell remain unchanged and were not selected. No material IR-006 validation risk remains.

### API-REV-005 — Deterministic Prisma/SQLite legacy scalar transport passes

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 5 after `CRR-011`.
- Triggering finding or scenario IDs: `DR-004` production-shaped verification failure; reachable `MP-004`; approved `DS-009`; no new source-review finding ID.
- Related revision IDs: `SR-007`, `ARCH-REV-007`, `IR-007`, `CRR-011`, `DR-004`; prior `API-REV-004` and proportional review `CRR-010` form the integrated baseline.
- Why this revision was recorded: API-REV-004 predates the migration-only transport fix. The failed DR-003 Electron artifact cannot serve as acceptance evidence, so the exact nullable Prisma/SQLite result-order condition, invalid-source rollback/retry, actual built-server lifecycle, and changed scale query required fresh executable proof.
- Coverage decisions or durable paths changed: two new IR-007 durable files were accepted as `Add Durable Coverage` and executed unchanged: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts` and `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/legacy-token-usage-source-decoder.test.ts`. API/E2E added, updated, or removed no other durable path.
- Scenarios added, changed, removed, or rechecked: exact four-leading-`NULL` then `28826658`/`28987545` real-adapter import; tagged transport/checkpoint/current target/source cleanup; real JSON wrong types, negative, out-of-range rollback and retry; malformed/noncanonical decoder inputs; cleanup failure retry; freelist; actual-server success/warnings/degraded history and restore gate/new-run/retry/overlap/relaunch; refreshed 154,100-row scale execution.
- Commands, environment, fixture, or broader-validation delta: server build passed; two-file DS-009 selection passed 32 tests; four-file migration selection passed 43; actual built-server file passed 4; final combined five-file selection passed 47; refreshed scale probe passed at 12.804 seconds with peak WAL 12,112,832 bytes, zero temp spill, exact 1,269 current rows, integrity ok, and 215,037 freelist pages; TypeScript/diff/boundary/coercion/cleanup checks passed. All fixtures were disposable; the user's live database was not accessed or mutated.

#### Prior Failure Resolution

| Prior scenario / reference | Previous status | Current resolution | Evidence |
| --- | --- | --- | --- |
| `DR-004` / leading-NULL Prisma scalar decoding | Delivery verification failed; source fixed in IR-007/CRR-011 | Exact production condition passes through the actual query and transaction; invalid source remains atomic and retryable | `test-results/api-e2e/logs/39-ir007-ds009-leading-null-decoder.log`; `logs/40-ir007-four-file-migration-regression.log` |
| API-REV-003 released-scale result | Previously passed pre-DS-009 query | Refreshed against rebuilt DS-009 dist; output/resource conclusions remain valid and latency is superseded by 12.804 seconds | `logs/42-ir007-released-scale-154k.log`; `test-results/api-e2e/scale-probe-result.json` |
| API-REV-004 integrated TeamRun/task lifecycle | Passed before DS-009 | Still valid; affected unmanaged restore/degraded retry path directly rechecked through actual built server | `logs/41-ir007-built-server-production-upgrade-lifecycle.log`; `logs/43-ir007-final-migration-lifecycle-suite.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Pass / 97.3%`.
- Current result and confidence: `Pass / 97.4%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/code_reviewer` for proportional review of the two new durable test paths before delivery resumes.
- Remaining risks, blocked evidence, or untested scope: the pre-fix DR-003 package remains invalid. Delivery must rebuild Electron and obtain renewed explicit user verification. The known Nuxt typecheck toolchain incompatibility and external-provider opt-in exclusions remain unchanged and do not block DS-009 proof.

### API-REV-006 — Bounded terminal audit reads and reachable startup compaction pass

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 6 after `CRR-014`.
- Triggering finding or scenario IDs: reachable delivery residual `DR-006`; approved `REQ-028` / `AC-027`; reviewed `DS-010` / `DS-011`; resolved source finding `CR-007`. No new API/E2E failure ID.
- Related revision IDs: `SR-009`, `ARCH-REV-009`, cumulative `IR-008`–`IR-009`, `CRR-014`, `DR-006`; prior `API-REV-005` and proportional review `CRR-012` form the unaffected migration baseline.
- Why this revision was recorded: API-REV-005 predates the current migration-status bound, separate terminal-audit compactor, its actual startup reachability correction, and execution-policy-aware public retry capability. The exact frontend document and built-process restart path therefore required direct executable proof rather than inference from unit/source review.
- Coverage decisions or durable paths changed: accepted five upstream test/fixture paths and added one actual-system E2E at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts`. It executes the exact tracked frontend document before/after compaction through rebuilt `dist`, proves warning `canRetry=false`, current token health, and table immutability. No durable path was removed.
- Scenarios added, changed, removed, or rechecked: exact frontend query/finite response/per-summary 64 KiB bound; two 100,001-detail/>10 MiB terminal summaries/logs; actual startup `runPending()` scheduling; source tuple/count preservation; canonical summary/log replacement; both partial progression retries; terminal warning/manual-disabled semantics; malformed/wrong-shape/missing/unowned/nonregular/unwritable dispositions; current token tables/statistics health; Nuxt production build; static nonfatal/ownership boundaries.
- Commands, environment, fixture, or broader-validation delta: full server build passed; exact actual-system E2E passed; focused repository/runner/compactor passed 3 files/33 tests; mounted Settings/store passed 2 files/3 tests; Nuxt production build passed; final server selection passed 4 files/34 tests; TypeScript/diff/static/cleanup passed. All server/database/log fixtures were disposable and removed; the user's live database/profile was never accessed.

#### Prior Failure Resolution

| Prior scenario / reference | Previous status | Current resolution | Evidence |
| --- | --- | --- | --- |
| `DR-006` / reachable ~31 MB migration-status response | Live target observation; no target-code acceptance proof | DS-010 exact frontend query returns bounded summaries before compaction; actual startup DS-011 compacts both >10 MiB source summaries/logs and preserves outcome/counts | `test-results/api-e2e/logs/46-ir009-built-server-audit-compaction-e2e-rerun.log`; `logs/50-ir009-final-audit-compaction-suite.log` |
| `CR-007` / terminal startup-only warning falsely advertised manual retry | Source-resolved by IR-009/CRR-014; API/UI execution pending | Actual built GraphQL returns `SUCCEEDED_WITH_WARNINGS/canRetry=false`; mounted Settings button is disabled and dispatches nothing; runner later-startup/terminal rules pass | `logs/46-ir009-built-server-audit-compaction-e2e-rerun.log`; `logs/47-ir009-bounds-runner-compactor-suite.log`; `logs/48-ir009-settings-store-suite.log` |
| API-REV-005 DS-009 scale/lifecycle | Passed before SR-009 | Remains applicable; current audit changes do not modify consolidation/fold/API/renderer and new built startups run the full registry/current token health path | Prior API-REV-005 evidence retained; focused `logs/50-ir009-final-audit-compaction-suite.log` found no widened impact |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Pass / 97.4%`.
- Current result and confidence: `Pass / 97.6%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/code_reviewer` for mandatory proportional review of all six changed durable test/fixture paths before delivery resumes.
- Remaining risks, blocked evidence, or untested scope: fresh Electron packaging and renewed user verification remain delivery-owned after the review gate. The known independent Nuxt `vue-tsc`/TypeScript package-export incompatibility and unchanged external-provider opt-in runtime are retained limitations, not SR-009 acceptance failures.

### API-REV-007 — Canonical compacted-log evidence is durably asserted

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-test-review-report.md`; API/E2E round 7 bounded Local Fix after `CRR-015`.
- Triggering finding or scenario IDs: `TCR-001`; successful oversized owned-log compaction under `REQ-028` / `AC-027`.
- Related revision IDs: `SR-009`, `ARCH-REV-009`, cumulative `IR-008`–`IR-009`, source `CRR-014` Pass, prior `API-REV-006`, test-review `CRR-015`, delivery residual `DR-006`.
- Why this revision was recorded: the API-REV-006 product path passed, but proportional review found that size-only log assertions would admit empty/unrelated bounded content. Completed API/E2E results require a revision entry after correcting and rerunning durable coverage.
- Coverage decisions or durable paths changed: updated exactly the unit compactor and actual built-startup E2E. Both now read each replacement log and assert the complete canonical identity/outcome/count/omission/reason content while retaining the byte bound. No source, fixture, other test, or removal.
- Scenarios added, changed, removed, or rechecked: successful real Prisma/SQLite `runPending()` owned-log compaction; exact frontend-document/built-server restart compaction; both original source statuses/attempts/timestamps/error states and count tuples; exact 100,001 omitted details and 65,536-byte reason.
- Commands, environment, fixture, or broader-validation delta: focused unit passed 1 file/9 tests; focused actual built-startup passed 1 file/1 test; final combined passed 2 files/10 tests; server TypeScript/diff/assertion/exclusivity/cleanup audit passed. Test-owned runtime/database/logs were removed and production data was not accessed.

#### Prior Finding Resolution

| Prior scenario / reference | Previous status | Current resolution | Evidence |
| --- | --- | --- | --- |
| `TCR-001` / compacted log content not asserted | Open Local Fix under `CRR-015`; API-REV-006 execution otherwise passed | Resolved in both durable successful paths with complete canonical body equality tied to seeded source tuple/counts | `test-results/api-e2e/logs/53-tcr001-unit-compacted-log-content.log`; `logs/54-tcr001-built-startup-compacted-log-content.log`; `logs/55-tcr001-final-two-file-rerun.log`; `logs/56-tcr001-ts-assertion-cleanup.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Pass / 97.6%`.
- Current result and confidence: `Pass / 97.7%`.
- New or remaining failure IDs: `None`; `TCR-001` resolved in API/E2E evidence pending proportional re-review.
- Recommended recipient: `/code_reviewer` for proportional re-review of the two corrected durable paths.
- Remaining risks, blocked evidence, or untested scope: delivery/Electron/user verification remains paused through the review gate. The independent Nuxt typecheck limitation and unchanged external-provider opt-in runtime remain as previously recorded.

### API-REV-008 — Current startup-recovery contract and audit withdrawal pass

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 8 after `CRR-019`.
- Triggering finding or scenario IDs: resolved source finding `CR-009`; approved `DS-012`; user-directed audit withdrawal `SR-010`. No new API/E2E failure ID.
- Related revision IDs: `SR-012`, `ARCH-REV-012`, `IR-011`, `CRR-019`; `SR-010`/`IR-010` removal boundary; prior applicable token baseline `API-REV-005`. `API-REV-006`/`API-REV-007` and `DR-007` are withdrawn wherever they assert audit compaction.
- Why this revision was recorded: API-REV-007 predates the complete current-scope reset and does not validate DS-012. The actual built-server GraphQL enum, failed STARTUP_ONLY consolidation, localized disabled/no-dispatch guidance, later ordinary-startup retry, and nonmutation after compactor removal required fresh executable proof.
- Coverage decisions or durable paths changed: API/E2E updated `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`. The existing failed-consolidation lifecycle now asserts real GraphQL `RESTART_TO_RETRY/false` then `NONE/false` across ordinary restart and protects one >64 KiB historical summary/log from projection or mutation. Upstream runner, GraphQL, Settings, and store test changes passed. Four withdrawn audit tests and their fixture remain deleted as stale coverage.
- Scenarios added, changed, removed, or rechecked: actual GraphQL recovery transport; failed consolidation/history and old-restore gate; new current-run admission; restart retry/import/restore; terminal historical summary and log byte/value exactness; full supported/warning/overlap built-server suite; exact English/zh-CN Settings guidance; disabled/no-dispatch startup action; retained manual action; withdrawn source/test/build-output absence.
- Commands, environment, fixture, or broader-validation delta: full server build passed; runner/GraphQL passed 2 files/20 tests; selected built-server lifecycle passed 1 selected test; Settings/store passed 2 files/4 tests; full built-server suite passed 1 file/4 tests; Nuxt production build passed; TypeScript/localization/static/diff/cleanup and canonical artifact audits passed. All database/runtime/log fixtures were disposable and removed; the user's live profile/database was not accessed or mutated.

#### Prior Finding And Evidence Disposition

| Prior scenario / reference | Previous status | Current resolution | Evidence |
| --- | --- | --- | --- |
| `CR-009` / false or unexplained public recovery action | Resolved in source by IR-011/CRR-019; API/E2E pending | Actual built GraphQL returns `RESTART_TO_RETRY/canRetry=false` on failed startup consolidation and `NONE/false` after ordinary restart; mounted UI shows exact localized guidance and dispatches nothing | `test-results/api-e2e/logs/59-ir011-runner-graphql-suite.log`; `logs/60-ir011-built-server-recovery-action-restart.log`; `logs/61-ir011-settings-store-localized-suite.log` |
| SR-010 audit withdrawal/nonmutation | Source/tests removed in IR-010; current executable confirmation pending | No withdrawn identifiers/paths exist in source/tests/rebuilt dist; a real >64 KiB summary/log remains exact through failed and successful built startups | `logs/60-ir011-built-server-recovery-action-restart.log`; `logs/62-ir011-full-built-production-upgrade-suite.log`; `logs/64-ir011-static-localization-cleanup-audit.log` |
| `TCR-001` | Resolved for withdrawn compactor in API-REV-007 | Obsolete, not current acceptance; compactor source/tests remain deleted | `logs/64-ir011-static-localization-cleanup-audit.log` |
| API-REV-005 DS-009/scale and API-REV-003/004 unchanged token/team evidence | Passed before DS-012 | Remains applicable; affected consolidation/restore path was directly rechecked and no broader impact emerged | `logs/62-ir011-full-built-production-upgrade-suite.log`; prior canonical evidence retained |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior recorded result and confidence: `Pass / 97.7%`, but its audit-compaction scope is withdrawn; `API-REV-005 Pass / 97.4%` remains the applicable token/DS-009 baseline.
- Current result and confidence: `Pass / 97.9%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/code_reviewer` for proportional review of all nine current durable coverage changes before delivery.
- Remaining risks, blocked evidence, or untested scope: the known independent Nuxt `vue-tsc`/TypeScript package-export incompatibility; unchanged external-provider opt-in runtime; fresh Electron packaging and renewed explicit user verification remain delivery-owned. None blocks the current DS-012/SR-010 API/E2E result.
