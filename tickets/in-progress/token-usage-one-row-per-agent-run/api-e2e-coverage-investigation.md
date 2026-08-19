# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Supplemental Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Solution / Architecture Revisions: `SR-009`; `ARCH-REV-009`
- Implementation / Source Review Revisions: `IR-009` (cumulative `IR-008`); `CRR-014` Pass at 93.2/100 with no open source finding
- Prior API/E2E Revisions: `API-REV-001` Fail at 70.0%; `API-REV-002` Fail at 75.0%; `API-REV-003` Pass at 97.1%; `API-REV-004` Pass at 97.3%
- Current API/E2E Revision: `API-REV-007` Pass at 97.7%
- Investigation Round: `6`
- Trigger: `DR-006` reachable oversized terminal audit residue, reviewed `SR-009` / `ARCH-REV-009` / cumulative `IR-008`–`IR-009` / `CRR-014`, bounded status projection `DS-010`, and reachable startup audit compactor `DS-011`.
- Investigation timing: this round-6 decision was recorded before any API-REV-006 execution or API/E2E-owned durable edit. All fixtures will be disposable production-repository/runtime targets. The user's live database will not be accessed or mutated, and the pre-SR-009 Electron artifact is excluded from acceptance evidence.

## Round 6 SR-009 / IR-008 / IR-009 Coverage Investigation Before Execution

### Changed Boundary And Required Proof

- `REQ-028` / `AC-027` add two connected boundaries without changing current token accounting: a migration-ID-agnostic SQL/repository projection that caps every materialized migration summary at 64 KiB, and a separate migration-owned compactor for the two known terminal 20260730 records and their owned logs.
- Production reachability is material. The compactor is now `requiredOnStartup=true` plus `STARTUP_ONLY`, so the ordinary built-server `AppDataMigrationRunner.runPending()` path must execute it. It remains nonfatal because it is neither a token-consolidation prerequisite nor an explicit `ServerRuntime` fatal-status gate.
- Public retry capability is execution-policy-aware. A terminal or failed `STARTUP_ONLY` compactor cannot be manually dispatched from Settings (`canRetry=false`), while `FAILED` or stale `RUNNING` remains eligible for a later ordinary startup retry. A `SUCCEEDED_WITH_WARNINGS` result is terminal and skipped.
- Critical proof includes: the exact exported frontend `GetAppDataMigrations` document before and after compaction; finite total response and <=64 KiB per-summary bounds; actual built-server restart scheduling; two 100,001-detail/>10 MiB source summaries and owned logs; preservation of source ID/status/attempt/timestamps/error/counts; canonical bounded replacement; both injected partial-progression retries; malformed/wrong-shape/missing/unowned/unwritable dispositions; token-table immutability; and healthy current token reads.

### Durable Coverage Inventory And Decisions

| Coverage path / group | Decision before execution | Reason / planned evidence |
| --- | --- | --- |
| `tests/unit/app-data-migrations/app-data-migration-record-repository-bounds.test.ts` | `Add Durable Coverage` (added by IR-008; execute unchanged) | Real Prisma/SQLite proof that small summaries remain exact, oversized valid summaries are SQL-projected before Node materialization, invalid shapes become bounded unavailable markers, and `getRecord`/`listRecords` stay within 64 KiB |
| `tests/unit/app-data-migrations/token-usage-migration-audit-compaction-v1.test.ts` | `Add Durable Coverage` (added by IR-008/updated by IR-009; execute unchanged) | Direct 100,001-detail/>10 MiB real repository/log fixture, instrumented bounded `runPending()`, source tuple/count preservation, token sentinels, both partial-progression retries, terminal warning skip/canRetry, malformed/wrong-shape/missing/unowned/unwritable dispositions, and registry/nonfatal placement |
| `tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | `Needs Update` completed upstream in IR-008/IR-009; execute | Locks execution-policy-aware manual capability, startup-only rejection, later-startup FAILED/stale-RUNNING retry, terminal warning skip, and unchanged executable ANYTIME warning behavior |
| `tests/helpers/app-data-migration-audit-fixtures.ts` | `Add Durable Coverage` fixture added upstream; reuse | Disposable real SQLite/Prisma audit and token-sentinel owner shared by the bounded read and compactor suites |
| `autobyteus-web/components/settings/__tests__/ServerMigrationsManager.spec.ts` | `Add Durable Coverage` (added by IR-009; execute unchanged) | Mounted user-surface proof that `canRetry=false` renders disabled and dispatches no mutation, while a truly executable warning remains enabled and dispatches |
| `autobyteus-web/stores/__tests__/appDataMigrationsStore.spec.ts` | `Still Valid`; rerun with component test | Existing store contract proves the actual retry mutation path used only after the component action |
| Exact frontend document + actual built-server startup boundary | `Add Durable Coverage` in `tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts` | No existing test imports and executes the exact web `GetAppDataMigrations` document against a built server before/after seeding terminal oversized records, then proves restart-only compactor scheduling and live current-token health. Unit-only or resolver-local evidence leaves this material AC-027 boundary unproven. |
| API-REV-005 DS-009 migration scale/lifecycle and API-REV-003 current token API/SafeInt/Chrome evidence | `Still Valid`; retain without repetition unless focused failure widens impact | IR-008/IR-009 do not change consolidation SQL/fold, current token repository/GraphQL, SafeInt projection, or token statistics renderer. The new built-server journey will directly recheck startup, GraphQL, and current token health. |
| DR-006 live production response observation | `Triggering evidence only`, not target-code acceptance evidence | It proves reachability of the old 31 MB response. It predates the implementation under test and the live user database must not be modified by API/E2E. |
| Prior Electron package | `Stale / not acceptance evidence` | It predates SR-009/IR-009. Delivery may rebuild and request renewed user verification only after successful API/E2E and proportional test review. |

### Planned Durable Delta

- Add one API/E2E-owned durable path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts`.
- Return that file plus every upstream durable test/fixture change listed above to `/code_reviewer` for proportional test-code review after a successful result. No durable test removal is planned.
- The new actual-system test must own and clean its runtime, database, server processes, and >10 MiB files through the tracked live-E2E harness. It must not touch the user's live profile.

### Planned Execution Order And Broader Gate

1. Implement the classified actual built-server/frontend-document durable journey.
2. Build the full integrated server so the spawned server executes reviewed `dist` code.
3. Run the bounded repository, runner, and compactor selection, including >100,000-detail source, both partial retries, warnings, and immutability.
4. Run the new actual built-server E2E, including exact frontend query before/after restart compaction and a current token summary health read.
5. Run mounted Settings/store coverage, web production build, server TypeScript, focused combined regression, diff/static ownership checks, and cleanup audit.

- Initial broader-validation decision: `Required`, satisfied by the new durable actual built-server/API journey because repository tests alone mock or bypass the frontend document and process-start boundary. A new Chrome journey is not initially selected: there is no renderer implementation change, and the mounted component directly proves disabled/no-dispatch semantics. Prior token scale/API/Chrome evidence remains applicable because no such source changed.
- Reroute rule: any critical implementation failure stops execution and returns the cumulative evidence package to `/code_reviewer` for failure-origin review. A clean result becomes `API-REV-006` and returns all six durable coverage/fixture paths for mandatory proportional review.

### Round 6 Executed Evidence And Final Coverage Decision

- Full integrated server build passed, including shared packages, Prisma generation, server TypeScript, managed assets, and sanitized built-in bootstrap smoke.
- The focused DS-010/DS-011 repository/runner/compactor selection passed `3 files / 33 tests`. It directly proves 100,001-detail/>10 MiB input, no raw oversized summary returned by the instrumented repository, both partial-progression retries through `runPending()`, warning terminality, malformed/wrong-shape/missing/unowned/unwritable disposition, registry reachability, nonfatal gate absence, and token sentinels.
- The new durable actual-system journey passed against rebuilt `dist`: it started a fresh built server, seeded two >10 MiB terminal summaries and owned logs plus a valid current token row, executed the exact query text read from the exported frontend `GetAppDataMigrations` document before compaction, stopped and restarted the server, and observed the registered compactor created as `SUCCEEDED/attempts=1/canRetry=false`. Both source outcome tuples/counts were preserved, summaries/logs became <=64 KiB, the token tables were byte/row-equivalent, and current token GraphQL remained healthy. A second restart condition with malformed oversized source produced a healthy `SUCCEEDED_WITH_WARNINGS/canRetry=false` result, bounded frontend response, preserved unsupported source, and unchanged token data.
- The mounted Settings/store selection passed `2 files / 3 tests`: the terminal-warning Retry action is disabled and dispatches nothing, while the executable control remains enabled and dispatches exactly once.
- The final combined server selection passed `4 files / 34 tests`; Nuxt production client/server/prerender build passed; server TypeScript, `git diff --check`, fatal-gate/token-table boundary scans, no `.only`/`.skip`, and owned runtime/database cleanup passed.
- An initial test-collection diagnostic tried to import the frontend module directly from the server Vitest package and failed because `graphql-tag` is not directly linked into that package. This was test-harness package isolation, not product execution: the normal Nuxt build passed. The durable test now reads the exact tracked frontend document source and executes its exported template text, avoiding a test-only dependency link. The authoritative rerun and final combined suite pass.

Final coverage decisions:

- `Add Durable Coverage` is complete for the actual frontend-document/built-startup gap.
- All five upstream test/fixture changes remain valid and passed; no stale test was removed.
- API-REV-005 released-scale consolidation, current token pricing/SafeInt/API, TeamRun lifecycle, and Chrome evidence remains applicable because IR-008/IR-009 changes none of those sources. Focused execution did not show broader impact.
- Broader validation is `Required and completed` through the durable actual built-server/API journey. Additional Chrome execution is `Not Required`; mounted DOM/action coverage plus production build is direct for the only user-surface semantic, and no layout/style/rendering code changed.

Final confidence scorecard:

| Confidence category | Final | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-027 material cases pass directly; prior unaffected requirement evidence retained |
| Changed-boundary execution directness | 99% | Real Prisma/SQLite, exact tracked frontend document, actual rebuilt server and restarts |
| Cross-boundary integration realism and mock gap | 97% | Real API/process path plus real repository; fault injection remains intentionally controlled in-process |
| Environment, configuration, identity, and fixture fidelity | 98% | Production repository/schema, normal startup/bootstrap, 100,001-detail/>10 MiB owned fixtures, isolated runtime |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Both partial retries, terminal warning, malformed/shapes/path ownership, healthy nonfatal restart, immutability |
| User-surface, browser, and desktop-shell confidence | 95% | Mounted disabled/no-dispatch action and Nuxt build; Electron rebuild/user verification remains delivery-owned |
| Durable regression coverage quality and relevance | 98% | Six cohesive changed paths including one actual-system E2E; final proportional review pending |

- Overall final confidence: `97.6%` (simple average, rounded from 97.57%).
- Every critical acceptance criterion directly proven: `Yes`.
- Applicable category below 90%: `No`.
- Default 95% clean target met: `Yes`.
- Remaining limitations: the previously recorded independent Nuxt `vue-tsc`/TypeScript package-export issue; external-provider opt-in runtime; and a fresh Electron package/user verification owned by delivery. None is a material SR-009/IR-009 API/E2E gap.

## Round 7 TCR-001 Local-Fix Investigation Before Durable Edit

- Trigger: `CRR-015` proportional durable-test review found `TCR-001`, a bounded API/E2E-owned assertion gap. Source remains `CRR-014` Pass and the executed API-REV-006 product behavior remains Pass.
- Validity decision: `Needs Update` for exactly two successful owned-log scenarios:
  1. `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-migration-audit-compaction-v1.test.ts`;
  2. `autobyteus-server-ts/tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts`.
- Obsolete assertion: size-only checks (`<=64 KiB`) admit an empty or unrelated short replacement and therefore do not independently prove the `REQ-028` / `AC-027` canonical audit-evidence contract.
- Required replacement/expansion: retain the byte bound, then read a real successfully replaced owned log and assert deterministic content tied to the seeded source outcome: migration ID, display name, terminal status, attempts, ISO start/completion timestamps, error presence/absence, all four exact counts, `detailsOmitted=100001`, and the `65,536`-byte historical-detail reason. Both the direct real Prisma/SQLite compactor path and actual built-startup path will receive the assertion so a local unit regression cannot mask a process-path regression.
- No production source, fixture builder, unrelated durable test, or requirement interpretation changes. No test removal is planned.
- Planned execution: focused unit compactor file; focused actual built-startup file against the already rebuilt reviewed `dist`; combined two-file rerun; TypeScript/diff/exclusivity/cleanup audit; then update the canonical execution/revision artifacts as `API-REV-007` and return the two changed paths for proportional re-review.
- Broader-validation decision: `Required`, limited to the existing actual built-startup durable test because the finding concerns observable output on that process path. Repeating scale, current token API/SafeInt, Settings, Chrome, Nuxt build, or Electron would not add evidence for the log-content assertion.

### Round 7 Executed Result

- Both classified durable paths now retain the 64 KiB assertion and read every successfully replaced owned log. They compare the entire canonical body against values derived from the seeded source tuple and summary: migration ID, display name, `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS`, attempts 5/6, exact ISO timestamps, absent/present error state, all four counts, `detailsOmitted=100001`, and `reason=historical audit detail exceeded 65,536 bytes`.
- Focused real Prisma/SQLite compactor coverage passed `1 file / 9 tests`.
- Focused exact-frontend-document/actual-built-startup coverage passed `1 file / 1 test` across its success and warning restart lifecycle.
- The combined authoritative rerun passed `2 files / 10 tests`; server TypeScript, `git diff --check`, assertion-field audit, no-disabled-test scan, and owned runtime/database/process cleanup passed.
- `TCR-001` is resolved in executable evidence. No implementation source, fixture owner, other durable path, or acceptance interpretation changed.
- Final broader-validation decision: `Required and completed` through the actual built-startup durable rerun. Prior API-REV-006 server build, repository/runner, Settings/store, Nuxt build, and retained API/scale/Chrome evidence remain applicable.
- Final confidence: `97.7%`. The only score delta is durable regression quality (`99%` from `98%`) because canonical log content is now locked at both the real compactor and actual process boundary; every other category and residual-risk decision remains API-REV-006-valid. No category is below 90%, every critical criterion is proven, and the 95% clean target remains met.

## Round 5 DS-009 Coverage Investigation Before Execution

### Changed Boundary And Required Proof

- Changed production source is confined to the registered `20260819_token_usage_run_records_v1` migration boundary:
  - `legacy-token-usage-consolidation-repository.ts` now projects all 15 nullable cumulative-source JSON fields as `NULL` or closed-field, parameterized `<json_type>:<exact text>` transport;
  - `legacy-token-usage-row.ts` treats the transport as untrusted, admits only `integer:(0|[1-9][0-9]*)`, parses through `BigInt`, and enforces nonnegative SafeInt before checkpoint use.
- Critical new acceptance criterion: `AC-026`. A disposable real Prisma/SQLite query and transaction must preserve one ordered batch with four leading `NULL` values followed by `28826658` and `28987545`, create one exact current record/checkpoint, validate, and clean the source. Real invalid source type/grammar/range must preserve all source rows, leave the target empty, and repeat the same failure on ordinary retry.
- Existing lifecycle requirements remain `AC-022` and `AC-024`: a failed consolidation must leave the actual built server healthy, gate history and unmanaged pre-existing-run restore before provider construction, admit a globally new current run, and succeed after a corrected restart retry.
- No current token domain, repository, GraphQL, frontend, TeamRun, or Electron source changed in IR-007.

### Durable Coverage Inventory And Decisions

| Coverage path / group | Decision before execution | Reason / planned evidence |
| --- | --- | --- |
| `tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts` | `Add Durable Coverage` (added by IR-007; execute without API/E2E edit initially) | Direct real Prisma/SQLite repository query and actual migration transaction contains the exact four-NULL/safe-integer order plus real JSON type, negative, and out-of-range rollback/retry cases |
| `tests/unit/app-data-migrations/legacy-token-usage-source-decoder.test.ts` | `Add Durable Coverage` (added by IR-007; execute without API/E2E edit initially) | Focused strict-tag/grammar/BigInt/SafeInt boundary, including malformed and noncanonical forms not constructible as valid JSON integers through SQLite |
| `tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts` | `Still Valid`; rerun | Real released upgrade, independent cleanup-failure rollback/retry, empty relaunch, source cleanup, and freelist behavior exercise the changed repository/decoder transitively |
| `tests/unit/app-data-migrations/legacy-token-usage-run-fold.test.ts` | `Still Valid`; rerun | Confirms DS-009 transport does not change legacy fold semantics, checkpoint compaction, or target totals |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | `Still Valid`; rerun all four actual built-server cases | Revalidates successful startup/relaunch, warning isolation, failed consolidation -> history/restore gates -> new current run -> corrected retry -> restore success, and overlap rejection on the affected migration lifecycle |
| `test-results/api-e2e/probes/released-scale-token-consolidation.mjs` | `Temporary Executable Probe`; rerun | DS-009 changes the SQL work performed for 15 projections across every released row. Prior volume/WAL/temp/disk architecture remains relevant, but the 11.287-second latency is not treated as current until the same 154,100-row/1,269-run probe executes the new query |
| API-REV-003 current fold/pricing/SafeInt/GraphQL/API suites | `Still Valid`; retain without repetition unless a focused failure widens impact | IR-007 changes no current runtime or API source and successful migration produces the same current record contract |
| API-REV-003 Chrome normal/degraded/fatal renderer evidence | `Still Valid`; retain without repetition | No UI, resolver, readiness code, error code, or browser contract changed. Actual built-server lifecycle will revalidate backend classification; rerunning visual layout would add no DS-009 evidence |
| API-REV-004 managed/offline exact delete and task lifecycle evidence | `Still Valid`; retain except the built-server restore lifecycle selected above | IR-007 changes neither TeamRun/task source nor manager identity; CRR-011 confirms those seams unchanged |
| DR-003 Electron artifact and DR-004 live failures | `Stale / not acceptance evidence` | DR-003 contains pre-DS-009 code and failed explicit verification. Delivery must build a new artifact and obtain renewed user verification only after API/E2E and proportional test-review gates |

### Durable Coverage Delta And Edit Decision

- Two repository-resident durable test files were added upstream in `IR-007` and must be returned for proportional review after successful execution:
  1. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts`
  2. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/legacy-token-usage-source-decoder.test.ts`
- No API/E2E-owned durable edit, replacement, or removal is planned initially. If execution reveals a real gap, this investigation will be updated before editing another durable path.
- No production/live fixture will be used. All database and runtime targets must be disposable and owned by the repository harness or ticket probe.

### Planned Execution Order And Broader Gate

1. Full integrated server build.
2. Exact two-file DS-009 real-adapter/decoder selection.
3. Four-file migration regression selection covering released mapping, invalid-source/cleanup rollback and retry, freelist, and fold semantics.
4. Entire actual built-server production-upgrade E2E file to cover success, degraded history/restore/new-run/retry, warning isolation, and overlap.
5. Rebuilt-server 154,100-row scale/WAL/temp/disk/latency probe because the SQL projection work changed.
6. Server TypeScript, diff, current-runtime legacy-boundary, closed-field ownership, residue, and process cleanup checks.

- Initial broader-validation decision: `Required`, limited to the retained released-scale probe. Browser and Electron execution are not selected: browser presentation is unaffected, and delivery owns the required fresh Electron build and renewed explicit user verification after this gate.
- Reroute rule: any critical implementation or migration failure stops execution and returns the cumulative evidence package to `/code_reviewer` for failure-origin review. A clean result becomes `API-REV-005` and returns both new durable paths to `/code_reviewer` for proportional test-code review.

## Round 4 Integrated-Source Resumption Delta

- Source delta: `TeamRunService.restoreTeamRun()` now distinguishes an already manager-owned current root from an unmanaged historical restore. Only an unmanaged restore calls `assertExistingRunRestoreReady()` before manager/provider construction. New TeamRuns and delegated tasks retain `assertCurrentSchemaReady()`; accepted task settlement uses `unregisterTerminated()` with no compatibility alias.
- Required focused revalidation:
  1. actual built-server failed consolidation -> unmanaged old restore rejection -> corrected retry -> successful old restore;
  2. latest-base managed/offline root identity and exact inactive restore/delete behavior through the current application/GraphQL surface;
  3. delegated-task current-schema admission and accepted-settlement cleanup at the integrated contract.
- Existing coverage decisions: the actual built-server token consolidation lifecycle test, latest-base archive/history GraphQL E2E, TeamRun manager/service lifecycle coverage, and task-delegation current-invariant coverage remain valid and directly target the integrated seams. No durable change is planned unless focused execution exposes a real gap.
- Coverage-gap update before durable edit: focused inventory confirmed settlement cleanup is durable (`unregisterTerminated()` is asserted) but delegated-task `assertCurrentSchemaReady()` ordering has no direct test. Classify this as `Add Durable Coverage` in `tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts`: rejection must occur before delegated agent-run allocation, TeamRun lookup, or task materialization. This is the only planned round-4 repository-resident coverage change.
- Broader-validation decision: `Not Required` initially for unaffected released scale, pricing, SafeInt, and Chrome layout because CRR-009 changes only TeamRun/task lifecycle integration. Escalate only if a focused failure indicates a wider boundary impact.
- Round-4 reroute rule: stop and send a critical failure with evidence to `/code_reviewer`; otherwise issue `API-REV-004`, explicitly report whether durable coverage changed, and return through `/code_reviewer` for proportional review when it did or an explicit `Not Applicable` result when it did not.

## Round 3 Resumption Delta

- Recheck `APIE2E-F002` first against reset/migrated Prisma/SQLite and GraphQL.
- Preserve the local OLLAMA `unsupported_or_local` assertion. Retarget the later historical-unknown case from current observation ingestion to actual released-row consolidation and current-record output because current ingestion correctly applies current normalization.
- Correct two already-classified stale GraphQL assertions: a mixed runtime summary is the bounded `Mixed` state, and multiple observations folded into one run remain one current record rather than reconstructed event buckets.
- Update both unchanged-ID source-shaping startup E2Es to bounded keyset/CAS/scalar owners and capability-scoped outcomes; do not retain removed whole-ledger test helpers or global-fatal expectations.
- Complete actual built-server consolidation success/failure/retry/overlap and restore gating; injected rollback; empty-source relaunch; freelist; unsafe SafeInt; ninth/reappearing series and byte caps; released scale/WAL/temp/disk/latency; GraphQL/API; normal/degraded/fatal Chrome; frontend build/component checks; static forward-only checks; cleanup.
- A new critical implementation failure would stop and reroute. Otherwise all selected evidence is required before `Pass`.

## Current Requirement And Design Basis

The approved system has one unique `token_usage_run_records` row per canonical run for standalone, direct, nested, delegated, and task-team origins. Direct deltas add; cumulative snapshots advance from bounded hashed checkpoints; replay/regression cannot double count or subtract; checkpoint and idempotency state have entry and byte caps. Current services, GraphQL, activation, and statistics are forward-only. Only registered app-data migrations may understand released ledger rows.

The two unchanged-ID source-shaping migrations run before one atomic SQLite consolidation. Successful validation deletes supported legacy rows without startup `VACUUM`; SQLite pages need only become reusable. An incomplete consolidation gates stored history and every pre-existing-run restoration before provider construction while valid current schema still admits newly allocated runs. A missing required current schema is fatal. JavaScript/GraphQL unsafe integers must reject without rounding and without undoing the exact committed BigInt fold. Settings ranges select by run creation (first-use fallback) and display lifetime totals.

## Changed Behavior Summary

| Boundary | Requirement / AC Basis | Coverage Consequence | Final Decision |
| --- | --- | --- | --- |
| Current one-row fold/store | REQ-001–REQ-007; AC-001–AC-005 | Replace event append/list fixtures with current fold/repository tests, concurrency, replay/regression, ninth-series, and byte-cap proof | Updated / expanded durable coverage |
| Run/team/member/statistics GraphQL | REQ-008–REQ-011; AC-006–AC-010 | Seed or fold current records; one concrete run counted once; mixed summaries and lifetime range semantics | Updated durable GraphQL and browser coverage |
| Source-shaping migrations | REQ-012–REQ-016, REQ-022; AC-011–AC-015, AC-021 | Remove whole-ledger helper expectations; prove bounded candidates/CAS/scalars, capped evidence, ordinary retry, sibling continuation | Updated durable startup E2Es plus scale probe |
| Consolidation / cleanup | REQ-017–REQ-021; AC-016–AC-020 | Prove released mapping, transaction rollback, retry/overlap, empty relaunch, source zero, reusable freelist, no required shrink | Expanded durable migration and actual built-server E2E plus scale probe |
| Degraded/fatal lifecycle | REQ-023–REQ-026; AC-022–AC-025 | Exercise healthy degraded server/new run/restore rejection/retry and fatal current schema; scan runtime for removed legacy APIs | Expanded actual server, restore service, Chrome, and static evidence |
| Public SafeInt/live quality | REQ-006/REQ-010; AC-007/AC-009 | Assert exact committed BigInt state, typed GraphQL rejection, no rounding, and public-summary rather than persistence-unavailable quality | Expanded durable GraphQL/lifecycle coverage |

## Changed Surface And Boundary Classification

| Surface | Affected | Direct Repository Evidence | Remaining Gap After Repository Stage | Broader Mode |
| --- | --- | --- | --- | --- |
| Domain/backend | Yes | Fold, accumulator, pricing, migration mapper, repository/store tests | Released-scale resource behavior | Real SQLite scale probe |
| API/transport | Yes | Current GraphQL E2E, typed readiness and SafeInt tests, live token message coverage | Browser/backend runtime integration | Actual built server + Chrome |
| Frontend / web-equivalent desktop renderer | Yes | Four mounted Nuxt component tests | Real rendering, proxy config, compact degraded/fatal states | Local Chrome 151 |
| Electron shell | No material shell change | No preload/IPC/native/window/package change | None | Actual Electron not justified |
| Process/lifecycle | Yes | Runner/runtime/activation/team service tests | Whole startup/failure/new-run/retry/overlap sequence | Built-server E2E |
| Persisted-data transition | Yes | Real Prisma/SQLite migration tests | Released-volume WAL/temp/disk/time and physical freelist | Scale probe |
| External provider runtime | No provider change | Deterministic observations plus stable live-message contract | Real LM Studio/Codex/Claude requires external services and does not close a ticket-specific persistence gap | Not selected |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run`
- Stack: Node 22.23.1, pnpm 10.28.2, TypeScript, Fastify/Mercurius/TypeGraphQL, Prisma 5.22/SQLite, Nuxt 3/Vue, Vitest 4.0.18, Playwright Core with installed Google Chrome.
- Authoritative server instructions: `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/README.md`, server `package.json`, Vitest config, `.env.test`, and `tests/setup/prisma-*`.
- Authoritative frontend instructions: `autobyteus-web/README.md`, `package.json`, Nuxt config, component test setup, and web/localization boundary scripts.
- Actual server/browser helper: `test-support/live-e2e/test-runtime-bootstrap.mjs`; it creates isolated data roots, database files, ports, migrations, and built server processes.
- Constraints: never use the user profile/database or port 29695 for owned live probes; build the server before actual standalone startup; use migration-owned legacy fixtures only; clean only owned resources.
- Known independent toolchain issue: `pnpm exec nuxi typecheck` loads transient `vue-tsc` against a TypeScript package that does not export `./lib/tsc`. It must remain a recorded blocked check, not a fabricated pass or product failure. Component tests, Nuxt production build, server TypeScript build, Chrome, and API tests remain executable.

## Persisted Data Transition Coverage Basis

- Approved outcome: `Migration Required`.
- Released source shapes: 20260624 ledger plus 20260625 pricing and later released display/address/name columns.
- Required evidence: deterministic released row mapping, equal-time numeric ledger ordinal, historical unknown/local semantics, source-shaping order, one transaction, validation-before-delete, rollback, ordinary retry, disjoint run IDs, current preservation, source zero, integrity, reusable pages, no runtime legacy owner.
- Representative fixtures: exact released migration SQL in durable built-server tests; a 154,100-row/1,269-run, 880,848,896-byte seeded SQLite probe (larger than the reported ~774.5 MiB reference); malformed/conflicting/missing custom-provider candidates; mixed runtimes; BigInt unsafe projection; injected overlap and cleanup failure.

## Existing Durable Coverage Inventory And Validity

| Coverage Group | Decision | Basis / Action | Final Status |
| --- | --- | --- | --- |
| Original helper, normalizer, unit-price, pipeline, repository, and store paths | Needs Update | Obsolete ledger/event owners replaced with current record owners; one post-quiescence assertion locally corrected | Pass |
| Statistics/display/enrichment/GPT-5.6/general/provider/unit-price GraphQL | Needs Update | Ledger-seeded fixtures and event-bucket assumptions were stale | Pass after current-owner conversion |
| Source-shaping startup E2Es | Needs Update | Removed whole-ledger helpers and global-fatal expectations | Pass with bounded adapter/runner semantics |
| Production upgrade built-server E2E | Needs Update | New consolidation adds a second migration record and deletes legacy source | Pass with success, degraded retry, and overlap paths |
| Migration/fold/runner/schema/restore unit tests | Still Valid / Expand | Directly exercise current and migration boundaries | Pass |
| TokenUsageStatistics component tests | Still Valid | Lifetime copy, migration guidance, and query state remain required | Pass |
| Runtime provider GraphQL E2E (`RUN_RUNTIME_TOKEN_USAGE_E2E=1`) | Still Valid, not selected | Requires external LM Studio/Codex/Claude runtime; deterministic live-message plus current store/API coverage directly exercises changed ticket boundaries | Three opt-in cases remain skipped by design |

## Stale Or Obsolete Coverage Decisions

| Obsolete Assertion / Owner | Classification | Replacement |
| --- | --- | --- |
| Imports/calls to removed append/list/aggregate ledger APIs | Stale / replace | Current record fixture, fold, repository, store, and GraphQL assertions |
| Mixed-runtime team expected an event-derived runtime list | Stale / update | Assert bounded `Mixed` summary |
| Multiple observations in one run expected separate event model rows | Stale / update | Assert one mixed current run record and exact display grouping |
| Historical unknown injected through current observation normalization | Stale / update | Insert released row, run real consolidation, assert current output/source deletion |
| Source-shaping failure globally blocks startup | Stale / update | Capability-scoped failure remains retryable and sibling work continues |
| Production upgrade leaves token ledger unchanged | Stale / update | Assert current rows, exact totals, source deletion, and immutable relaunch |

No durable test file was removed. Obsolete statements were replaced inside retained requirement-linked files.

## Round 3 Durable Coverage Added Or Updated

Seventeen API/E2E-owned repository paths were changed for `API-REV-003` and passed proportional test-code review in `CRR-008`:

1. `autobyteus-server-ts/tests/helpers/token-usage-run-record-fixtures.ts`
2. `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts`
3. `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts`
4. `autobyteus-server-ts/tests/integration/token-usage/providers/default-agent-run-event-pipeline-lifecycle.integration.test.ts`
5. `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`
6. `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
7. `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
8. `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts`
9. `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts`
10. `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts`
11. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
12. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`
13. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts`
14. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`
15. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`
16. `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`
17. `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts`

## Repository Coverage Execution Plan And Results

| Scenario / Evidence | Result | Evidence |
| --- | --- | --- |
| Exact F002 recheck and historical-case diagnostic | Expected local case passes; stale historical setup identified | `logs/14-api-e2e-f002-round3-recheck.log` |
| Corrected current/migration GraphQL | 2 files / 6 tests pass | `logs/15-round3-graphql-current-migration.log` |
| All 13 originally owned paths | 12 executable files / 43 tests pass | `logs/16-all-13-api-e2e-owned-durable-paths.log` |
| Bounded source-shaping startup coverage | 2 files / 4 tests pass | `logs/17-source-shaping-startup-current-coverage.log` |
| Server production build | Pass, including shared builds, Prisma generation, TypeScript, bootstrap smoke | `logs/18-server-build.log` |
| Production actual startup/relaunch | 2 selected actual-server upgrade tests pass | `logs/19-production-upgrade-built-server.log` |
| Failed consolidation/new run/restore/retry and overlap | 2 selected actual-server lifecycle tests pass | `logs/20-built-server-consolidation-lifecycle.log` |
| Injected rollback, freelist, empty relaunch | 1 file / 3 tests pass | `logs/21-rollback-freelist-relaunch.log` |
| Unsafe SafeInt persistence + GraphQL | Selected test passes; exact 9007199254740992n/revision 2 retained, GraphQL null + typed error | `logs/22-unsafe-safeint-graphql-persistence.log` |
| Final broad lifecycle/API suite | 27 files / 125 tests pass; one external-runtime file / 3 opt-in cases skipped | `logs/28-final-broad-server-lifecycle-api-suite.log` |
| Server TS, diff, forward-only scan | Pass | `logs/29-server-ts-diff-legacy-boundary.log` |

## Post-Repository Confidence Scorecard

This score was taken after durable/API/build checks but before scale and Chrome.

| Category | Score | Evidence / Gap At Gate |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 95% | All semantic/lifecycle assertions pass; released resource behavior and real renderer still pending |
| Changed-boundary execution directness | 97% | Real Prisma/SQLite, current GraphQL, actual built server, exact migration; no scale yet |
| Cross-boundary integration realism | 94% | Actual server startup/API passes; browser proxy/render path pending |
| Environment/configuration/fixture fidelity | 94% | Released SQL and isolated runtime roots; released-volume fixture pending |
| Failure/edge/lifecycle/recovery evidence | 96% | Rollback, retry, overlap, restore topology, SafeInt, series caps pass |
| User-surface/browser/desktop-shell confidence | 88% | Component coverage only; renderer gap requires Chrome; shell itself unchanged |
| Durable regression coverage quality | 96% | Focused current-owner coverage passes; proportional review still required |

- Overall post-repository confidence: `94.3%` (simple average).
- Category below 90%: browser/user surface at 88%.
- Broader validation decision: `Required`.

## Broader Validation Decision And Completed Evidence

- Decision: `Required`.
- Expected gain: prove released-scale SQLite behavior and web-equivalent desktop rendering against actual backend classifications.
- Selected modes: temporary owned scale probe; actual built server; Nuxt development frontend; semantic Chrome assertions and screenshots; Nuxt production build.
- Scale result: 154,100 rows / 1,269 current runs; seeded DB 880,848,896 bytes; 144 custom candidates scanned (141 migrated, 3 bounded warnings) while ~154k unrelated rows were excluded; provider-name scan 144 (142 migrated, 2 bounded warnings); consolidation 11.287s against a 30-minute timeout; peak WAL 12,112,832 bytes; peak temp 0; peak RSS 192,937,984 bytes; source 0; current 1,269; report/input/output totals 154,100; `integrity_check=ok`; freelist 215,037 pages; physical DB not forced to shrink.
- Chrome result: Chrome 151 normal current/migrated task/model totals and lifetime copy; compact degraded actionable guidance while navigation remains available; fatal current-schema server exits 1 with the versioned platform-fatal protocol and browser shows a nonempty fetch error without breaking settings navigation.
- Frontend result: component 1 file / 4 tests, all boundary/localization guards, and Nuxt production build pass. Nuxt typecheck reproduces only the known `vue-tsc`/TypeScript `ERR_PACKAGE_PATH_NOT_EXPORTED` toolchain incompatibility.
- Evidence: `logs/23-released-scale-154k-774mib.log`, `scale-probe-result.json`, `logs/24-chrome-normal-degraded-fatal.log`, `browser-probe-result.json`, three screenshots, `logs/25-web-component-and-guards.log`, `logs/26-nuxt-typecheck-known-toolchain-block.log`, `logs/27-nuxt-production-build.log`, and `logs/30-probe-syntax-and-cleanup-audit.log`.

## Desktop Application Validation Decision

- Changed renderer behavior is web-equivalent; Chrome is the project-supported least-invasive direct surface.
- Actual Electron was not launched because no IPC, preload, native, window, packaging, or shell lifecycle behavior changed. Browser evidence is not claimed as Electron-shell proof.
- Chrome semantic assertions, actual backend correlation, normal/degraded/fatal screenshots, compact viewport, and production Nuxt build close the material renderer risk.

## Live Environment And Fixture Plan / Actual

- Owned targets: unique loopback ports, generated runtime roots under server test temp, unique SQLite DB names, local Nuxt child processes, isolated headless Chrome context.
- Normal fixture: released legacy row consolidated by actual startup, then queried/rendered as current data.
- Degraded fixture: released row with blank run ID makes consolidation fail while server stays healthy.
- Fatal fixture: current run table deliberately removed after normal schema migrations; built server must exit through current-schema fatal protocol.
- Scale fixture: temporary OS directory and unique SQLite file; exact released migration SQL; 154,100 wide rows with 1,269 run IDs, 144 candidate custom rows, malformed/conflicting/missing identities, and ~154k unrelated runtime rows.
- Production profile, user DB, Electron process, external accounts, and paid providers: untouched.

## Temporary Executable Validation

| Artifact | Purpose | Durable Replacement Decision |
| --- | --- | --- |
| `test-results/api-e2e/probes/released-scale-token-consolidation.mjs` | Released-volume latency/WAL/temp/RSS/disk/freelist/integrity measurement | Temporary only; a 154k/840 MiB fixture is too heavy for routine repository tests |
| `test-results/api-e2e/probes/token-usage-chrome-browser.mjs` | Correlated actual-server normal/degraded/fatal Chrome journey | Temporary only; repository already uses component tests and has no general token-statistics browser runner |

Both probes are retained as ticket evidence, syntax-checked, and clean only their owned resources.

## Not Tested / Infeasible / Deferred

- External real-runtime provider suite: three `RUN_RUNTIME_TOKEN_USAGE_E2E=1` cases skipped because LM Studio/Codex/Claude services and credentials are not deterministic or needed to prove the changed storage/migration contract. GPT-5.6 live-message E2E, transformer, pipeline, current store, GraphQL, and actual server tests cover the changed contract directly.
- Electron shell: not applicable to changed boundaries; Chrome proves only renderer/client-server behavior.
- Nuxt typecheck: attempted and blocked by the already-recorded transient `vue-tsc`/TypeScript package-export incompatibility. This is not a product failure; production Nuxt build passes.
- Hostile corruption, power-cut taxonomy, kernel/device faults, adversarial writers, and same-release `VACUUM`: deliberately out of scope under REQ-024/AC-023.

## Ambiguities Or Reroute Triggers

- Requirement gap: none.
- Design impact: none.
- Implementation failure in round 3: none. `APIE2E-F002` is resolved; the later historical assertion and two GraphQL assertions were stale coverage, classified before correction.
- Environment blocker: none. The known Nuxt typecheck incompatibility has alternative direct product/build evidence and was already disclosed upstream.

## Prior API-REV-003 Final Confidence And Investigation Decision

| Category | Final Score | Final Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 97% | All AC groups have direct durable or executable evidence | External provider implementations were not re-exercised because they did not change |
| Changed-boundary execution directness | 98% | Current fold/store/SQLite/GraphQL, actual startup, released migration, fatal schema | Negligible synthetic-fixture versus field-data distribution difference |
| Cross-boundary integration realism | 97% | Actual built server, GraphQL, Nuxt proxy, Chrome DOM and screenshots | No Electron-shell execution, correctly scoped N/A |
| Environment/configuration/fixture fidelity | 97% | Exact released SQL, larger-than-reference DB, owned ports/data, Chrome 151 | Synthetic rather than copied production rows |
| Failure/edge/lifecycle/recovery evidence | 98% | Rollback, retry, overlap, old/new admission, all restore gates, SafeInt, caps, freelist | No out-of-scope power/kernel fault matrix |
| User-surface/browser/desktop-shell confidence | 97% | Normal/degraded/fatal Chrome, compact viewport, production build, components | Browser proves renderer, not unchanged Electron shell |
| Durable regression coverage quality | 96% | 17 focused changed paths; 125-test broad pass | Required proportional test-code review is pending |

- Overall final confidence: `97.1%` (simple average).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default clean target met: `Yes`.
- Result: `Pass`.
- Required next recipient at API-REV-003: `/code_reviewer` for proportional review of the 17 API/E2E-owned durable paths before delivery; completed as `CRR-008` Pass.

## Round 4 Focused Integrated-Source Result — API-REV-004

### Coverage Decisions And Execution

| Integrated seam | Coverage decision | Focused result | Evidence |
| --- | --- | --- | --- |
| Failed consolidation -> unmanaged old restore rejection -> retry -> successful restore | `Still Valid`; rerun the actual built-server production-upgrade lifecycle | Pass: one selected actual-server case passed; the server remained healthy after the failed consolidation, rejected the unmanaged old restore, admitted and persisted a new current run, imported the corrected released rows on restart, deleted the source, and restored the old run | `test-results/api-e2e/logs/32-ir006-built-server-restore-retry.log` |
| Managed/offline root identity plus exact inactive restore/delete | `Still Valid` with a temporary GraphQL probe for the exact delete mutation | Pass: the integrated manager/service suites preserved manager-owned offline identity, gated only unmanaged restoration, serialized exact-ID delete/restore transitions, deleted only the inactive exact package through GraphQL, and rejected deletion of the managed root | `logs/34-ir006-managed-offline-graphql-delete-pass.log`; `logs/36-ir006-final-integrated-focused-suite.log` |
| Delegated-task schema admission and accepted settlement cleanup | `Add Durable Coverage` for the missing readiness-order assertion; retain existing settlement assertions | Pass: the new durable case proves `assertCurrentSchemaReady()` rejects before agent-run allocation, TeamRun lookup, or task materialization; the integrated suite retains accepted-settlement `unregisterTerminated()` and failure cleanup evidence | `logs/35-ir006-task-admission-settlement.log`; `logs/36-ir006-final-integrated-focused-suite.log` |

- Full integrated server build passed at merge `cbbedd6ea0e6d466a3e3741c7216f03887b0182e`: `logs/31-ir006-integrated-server-build.log`.
- Final focused integrated suite passed `7 files / 37 tests`: `logs/36-ir006-final-integrated-focused-suite.log`.
- Server `tsconfig.build.json` typecheck, `git diff --check`, latest-base ancestry (`0 behind / 2 ahead`), temporary-probe absence, run-specific database scan, and post-command owned-process check passed: `logs/37-ir006-ts-diff-cleanup.log`.
- The first copied temporary GraphQL probe run exposed only a stale local mock missing the latest-base `withUnmanagedHistoryDeletion` method. The product tests in that run passed; the temporary fixture was corrected and the exact rerun passed. This is classified as `Temporary Fixture Fix`, not a source/API failure, and the probe file was deleted after evidence capture. Diagnostic: `logs/33-ir006-managed-offline-graphql-delete.log`.
- Round-4 durable coverage changed: `Yes`, exactly one updated path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts`. No durable path was added or removed.
- Unaffected `API-REV-003` scale, pricing, SafeInt, GraphQL, and Chrome evidence remains valid. Focused execution showed no broader impact, so those expensive/system surfaces were not repeated.

### Round 4 Final Confidence

| Category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | Every material token transition criterion remains proven; all three IR-006 integration seams passed focused evidence |
| Changed-boundary execution directness | 99% | Actual built server and released SQLite migration lifecycle plus direct service/task contract execution |
| Cross-boundary integration realism and mock gap | 98% | Built-server restart/GraphQL path, real manager/service integration, and current GraphQL delete surface; temporary delete fixture uses a controlled manager boundary |
| Environment, configuration, identity, and fixture fidelity | 97% | Integrated merge, repository build, reset/migrated SQLite, exact released source fixtures, and exact root/run identities |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Failed consolidation, rejected old restore, new admission, retry, managed/offline identity, exact delete/restore serialization, and settlement cleanup |
| User-surface, browser, and desktop-shell confidence | 95% | Prior Chrome normal/degraded/fatal evidence remains applicable; IR-006 did not change renderer or shell code |
| Durable regression coverage quality and relevance | 96% | One narrow ordering assertion closes the only focused gap; `7 files / 37 tests` pass; proportional review remains pending |

- Overall final confidence: `97.3%` (simple average, rounded from 97.29%).
- Result: `Pass`.
- Broader validation decision: `Not Required` for round 4. The real changed lifecycle boundaries were exercised directly and no focused failure indicated impact to the retained scale, pricing, SafeInt, or Chrome evidence.
- Applicable category below 90%: `None`.
- Critical acceptance criterion unproven: `None`.
- Residual non-product limitation: the previously recorded Nuxt `vue-tsc`/TypeScript package-export incompatibility remains; no frontend/typecheck boundary changed in IR-006.
- Required next recipient: `/code_reviewer` for proportional review of the one round-4 durable test update. Delivery and Electron work remain paused through that gate.

## Round 5 DS-009 Execution Result — API-REV-005

### Executed Coverage And Decisions

| Scenario / boundary | Result | Evidence |
| --- | --- | --- |
| Full integrated server build | Pass: shared packages, Prisma generation, server TypeScript, assets, and sanitized bootstrap smoke | `test-results/api-e2e/logs/38-ir007-integrated-server-build.log` |
| Exact leading-NULL Prisma/SQLite transport plus strict decoder | Pass: 2 files / 32 tests. The real ordered batch returned four `NULL` values then `integer:28826658` and `integer:28987545`; consolidation produced one validated record/checkpoint and emptied the source | `logs/39-ir007-ds009-leading-null-decoder.log` |
| Invalid source and migration regression | Pass: 4 files / 43 tests. Real JSON real/text/boolean/array/object, negative integer, and `9007199254740992` cases retained source, left the target empty, and repeated the bounded failure; decoder grammar and cleanup-failure retry/freelist/fold semantics passed | `logs/40-ir007-four-file-migration-regression.log` |
| Actual built-server upgrade/degraded/history/restore lifecycle | Pass: all 4 cases. Success/relaunch, warning isolation, failed consolidation -> unavailable history/rejected old restore -> new current run -> corrected retry/import -> successful restore, and overlap rejection all passed | `logs/41-ir007-built-server-production-upgrade-lifecycle.log` |
| Refreshed released-scale consolidation | Pass: 154,100 rows / 1,269 runs / 880,848,896-byte seeded DB; 12.804-second consolidation; peak WAL 12,112,832 bytes; peak temp 0; peak RSS 193,183,744 bytes; source 0; target 1,269; exact totals; `integrity_check=ok`; freelist 215,037 | `logs/42-ir007-released-scale-154k.log`; `test-results/api-e2e/scale-probe-result.json` |
| Final combined migration/lifecycle regression | Pass: 5 files / 47 tests | `logs/43-ir007-final-migration-lifecycle-suite.log` |
| TypeScript, diff, ownership/boundary, refreshed scale result, and cleanup | Pass: 15-field closed set, no current-runtime legacy transport reference, no broad source coercion, latest base ancestor (`0 behind / 3 ahead`), no probe/database/process residue | `logs/44-ir007-ts-boundary-cleanup.log` |

Final canonical revision markers, all evidence files, both durable paths, diff cleanliness, and post-report resource state were re-audited successfully in `logs/45-ir007-final-artifact-audit.log`.

### Prior Evidence Applicability After Execution

- **API-REV-003 released scale:** superseded for DS-009 latency by the refreshed 154,100-row probe. The new consolidation completed in 12.804 seconds versus the prior 11.287 seconds, with the same 12,112,832-byte peak WAL, zero temp spill, exact totals, integrity, and freelist result. Volume/WAL/temp/disk conclusions therefore remain directly current.
- **API-REV-003 current fold, pricing, SafeInt, GraphQL, and general API:** remains applicable without repetition. IR-007 changes no current runtime/API source; the real migration and built-server runs create and serve the same current record contract. The affected GraphQL history/restore/new-run surfaces were exercised by the actual built-server file.
- **API-REV-003 Chrome normal/degraded/fatal:** remains applicable without repetition. No renderer, frontend, GraphQL shape, error code, readiness, or layout source changed. The backend degraded classification was directly revalidated through the built server.
- **API-REV-004 managed/offline delete and delegated-task lifecycle:** remains applicable. No TeamRun/task code changed; the affected unmanaged restore gate was re-executed in the actual built-server recovery case.
- **DR-003 Electron package:** remains invalid as acceptance evidence. It contains the pre-DS-009 failure. API/E2E did not launch or reuse it; delivery owns a fresh package build/integrity check and renewed explicit user verification after proportional test review.

### Durable Coverage And Edit Outcome

- Repository-resident durable coverage in the candidate changed: `Yes`, two upstream IR-007 additions:
  1. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts`
  2. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/legacy-token-usage-source-decoder.test.ts`
- API/E2E-owned edits to those tests: `None`; they passed exactly as source-reviewed.
- Other durable files added, updated, or removed by API/E2E in round 5: `None`.
- The two new paths require proportional test-code review before delivery.

### Round 5 Final Confidence

| Category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-026 exact adapter condition, rejection matrix, AC-022/024 lifecycle, cleanup, scale, and retained current-contract evidence all pass |
| Changed-boundary execution directness | 99% | Actual production repository query/transaction, real Prisma/SQLite, actual built server, and rebuilt dist scale probe |
| Cross-boundary integration realism and mock gap | 98% | Real driver/database, migration runner/startup, GraphQL history/restore/new work, retry/relaunch, and target repository reads |
| Environment, configuration, identity, and fixture fidelity | 97% | Exact observed values/order and released schemas in disposable fixtures; live user database correctly not used |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Type/grammar/range rejection, atomic rollback/retry, cleanup failure, failed startup capability gate, overlap, warning isolation, and relaunch |
| User-surface, browser, and desktop-shell confidence | 95% | Prior Chrome evidence remains source-current; corrected Electron package/user verification is intentionally delivery-owned and still pending |
| Durable regression coverage quality and relevance | 96% | Two narrow production-condition files plus 47-test combined pass; proportional review remains pending |

- Overall final confidence: `97.4%` (simple average, rounded from 97.43%).
- Result: `Pass`.
- Broader validation decision: `Required` and completed through the refreshed released-scale probe. Browser repetition was `Not Required`; Electron execution remains a downstream delivery/user-verification gate.
- Applicable category below 90%: `None`.
- Critical acceptance criterion unproven: `None`.
- New or remaining API/E2E failure IDs: `None`.
- Required next recipient: `/code_reviewer` for proportional review of both new durable tests. Delivery must remain paused until that gate passes.
