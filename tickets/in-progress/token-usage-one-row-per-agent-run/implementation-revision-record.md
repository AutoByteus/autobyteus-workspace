# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record identifies the implementation baseline and later deltas without replacing source review.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`; `design-review-report.md`; round 6 | N/A | `Initial Baseline` | `SR-006`, `ARCH-REV-006`; `CRR`/`API-REV`/`DR`: N/A | Current one-row runtime, bounded repairs, forward-only consolidation/readiness lifecycle, and UI semantics implemented; ready for source review. |
| IR-002 | `/code_reviewer`; `code-review-report.md`; round 1 | `CR-001`, `CR-002`, `CR-003` | `Local Fix` | `SR-006`, `ARCH-REV-006`, `CRR-001`; `API-REV`/`DR`: N/A | BigInt commit/public projection ordering fixed, pricing ownership extracted, and task delegation structurally reduced; ready for source re-review. |
| IR-003 | `/code_reviewer`; `code-review-report.md`; failure-origin round `CRR-003` | `CR-004` / `APIE2E-F001` | `Local Fix` | `SR-006`, `ARCH-REV-006`, `CRR-003`, `API-REV-001`; `DR`: N/A | Shared mixed-currency pricing semantics corrected for live, migration, and aggregate read paths; ready for source re-review. |
| IR-004 | `/code_reviewer`; `code-review-report.md`; failure-origin round `CRR-005` | `CR-005` / `APIE2E-F002` | `Local Fix` | `SR-006`, `ARCH-REV-006`, `CRR-005`, `API-REV-002`; `DR`: N/A | Empty-record cache sentinel removed from semantic reduction; current, migration, persisted, and public-summary regressions pass; ready for source re-review. |
| IR-005 | `/code_reviewer`; `code-review-report.md`; full source round `CRR-006` | `CR-006` | `Local Fix` | `SR-006`, `ARCH-REV-006`, `CRR-006`, `API-REV-002`; `DR`: N/A | Released non-local unknown-input meaning restored inside consolidation, independently validated, and proven through direct-upgrade SQLite/current-summary coverage; ready for source re-review. |
| IR-006 | `/delivery_engineer`; `delivery-integration-blocker.md`; `DR-002` | Latest-base TeamRun restore conflict | `Local Fix` | `SR-006`, `ARCH-REV-006`, `CRR-008`, `API-REV-003`, `DR-002` | Latest `origin/personal` integrated; managed/offline lifecycle and token restore readiness compose in the correct order; focused integrated checks pass; ready for source re-review. |

## Revision Entries

### IR-001 — Current one-row runtime and forward-only migration baseline

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`; round 6.
- Triggering finding IDs: `N/A`; historical `AR-001`–`AR-004` remain resolved in the superseding lifecycle.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Implementation complete and ready for `/code_reviewer`.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-006`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: The reviewed solution replaces append-only token-event storage with one cumulative current row per canonical run and requires bounded historical repairs, migration-only legacy knowledge, disjoint atomic consolidation, restore/history gating, current-schema failure classification, and truthful run-created/lifetime-total UI semantics.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-026`; `AC-001`–`AC-025`.
- Implementation delta:
  - Added the current BigInt run-record schema, domain, fold, codecs, repository, accumulator, store, aggregation, and awaited persistence path.
  - Replaced event-array runtime summaries and removed detached ledger append/list ownership.
  - Repaired both unchanged-ID 20260730 migrations with bounded keyset/CAS/scalar execution.
  - Added migration-only legacy consolidation with scalar set-disjointness preflight, deterministic bounded folding, target validation, and atomic cleanup.
  - Added current-schema readiness, degraded history/restore gates across all run kinds, startup-only manual execution policy, and typed fatal/degraded errors.
  - Updated GraphQL/statistics and Settings UI period/error semantics; removed obsolete runtime adapters and tests.
- Changed files or areas: `autobyteus-server-ts/prisma/`; current `src/token-usage/`; event persistence; standalone/team/task lifecycle services; app-data migration registry/runner and token migration folders; startup/runtime; GraphQL token statistics; `autobyteus-web` token statistics component/localization/tests.
- Local validation and result: Prisma format/generate passed; server TypeScript build check passed; focused server suite passed 13 files/64 tests; real temporary SQLite current-fold, consolidation commit/overlap/rollback, codec validation, and schema-readiness smokes passed; Nuxt prepare, four component tests, and localization guards passed. Nuxt typecheck was blocked before diagnostics by the installed `vue-tsc`/TypeScript package export mismatch.
- Next recipient or routing: `/code_reviewer`.
- Remaining limitations or risks: released-scale long-transaction resource/timeout evidence, downstream stale integration/E2E coverage maintenance, full browser visual verification, BigInt/SafeInt system behavior, all-run-kind system restore gates, >8-series durable behavior, and SQLite freelist evidence remain downstream work. Physical source-contract removal, file shrinking, and durable convention/doc promotion remain intentionally deferred to their approved stages.

### IR-002 — Source-review boundary and structure corrections

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; round 1 / `CRR-001`.
- Triggering finding IDs: `CR-001`, `CR-002`, `CR-003`.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-001` implemented the reviewed mechanics, but source review failed on one write-boundary correctness defect and two structural defects.
- Current authoritative result: All three local findings are addressed; the cumulative implementation is ready for `/code_reviewer` re-review.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-006`.
- Related code-review revision IDs: `CRR-001`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: `CRR-001` found that public SafeInt mapping could reject inside the transaction and roll back exact BigInt state, pricing-summary policy had no focused owner, and compressed imports masked task-delegation file-size pressure.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`; `REQ-001`, `REQ-004`, `REQ-006`, `REQ-008`, `REQ-010`; `AC-001`, `AC-003`, `AC-006`. `CR-002`/`CR-003` affect reviewed ownership and implementation guardrails without changing product behavior.
- Implementation delta:
  - `TokenUsageRunAccumulator` now completes the repository transaction and receives the exact persisted record before building the public/live summary. `TokenUsageSafeIntegerExceededError` preserves explicit checked narrowing; the event transformer uses a truthful `token_usage_public_summary_unavailable` disposition rather than `token_usage_persistence_unavailable` for this post-commit failure.
  - Pricing-summary empty/build/merge policy moved from `token-usage-run-record-state.ts` into focused `token-usage-pricing-summary.ts`; record state fell from 239 to 174 effective lines and aggregate dependencies now point to the pricing owner.
  - Task delegation imports were restored to readable form. The service host/activation contract and task-record/assignee resolution moved to focused owners; the normally formatted service is 486 effective lines instead of the cosmetic 497-line result reviewed in `CRR-001`.
- Changed files or areas: token run accumulator/aggregate/persistence transformer and focused tests; token pricing/run-record projection files; task-delegation service plus new service-contract and record-resolver files.
- Local validation and result: server TypeScript build check passed; focused suite passed 15 files/74 tests. The added real Prisma/SQLite regression proves `9007199254740992n` and revision/report advancement are committed before the public summary rejects. Transformer coverage proves the typed post-commit failure is not mislabeled as persistence failure. Task-delegation invariant tests pass; dependency and effective-line audits pass; `git diff --check` passes.
- Next recipient or routing: `/code_reviewer`.
- Remaining limitations or risks: unchanged from `IR-001` except that the implementation-level SafeInt persistence boundary now has durable SQLite evidence. Actual GraphQL/live-client behavior, released-scale consolidation, broader coverage maintenance, all-run-kind system gates, >8-series repository evidence, freelist measurement, browser validation, Nuxt typecheck incompatibility, and delivery-owned documentation remain downstream work.

### IR-003 — Mixed-currency pricing invariant correction

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; focused failure-origin review `CRR-003` of `API-REV-001` / `APIE2E-F001`.
- Triggering finding IDs: `CR-004` / `APIE2E-F001`.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-002` passed source review in `CRR-002`, but API/E2E exposed a supported mixed-currency pricing-semantics regression and `CRR-003` superseded the pass.
- Current authoritative result: `CR-004` is addressed at the shared pricing owner; the cumulative implementation is ready for `/code_reviewer` re-review.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-006`.
- Related code-review revision IDs: `CRR-003`.
- Related API/E2E revision IDs: `API-REV-001`.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: Current pricing merge independently combined currency, cost status, and numeric unit prices. A supported USD/CNY run therefore reported null currency/cost but falsely retained `estimated` status and a single price with no currency.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-005`; `REQ-006`, `REQ-010`, `REQ-017`–`REQ-019`; `AC-008`, `AC-016`–`AC-018`; `MP-CR-002`.
- Implementation delta:
  - `token-usage-pricing-summary.ts` now applies one post-merge mixed-currency invariant: `apiCostStatuses` becomes mixed, each non-not-applicable unit-price summary becomes mixed/null, and zero-use not-applicable summaries remain unchanged.
  - Because current record mutation, legacy migration fold, and current aggregate read all use this owner, live and migrated records share the rule. Aggregate read also canonicalizes previously stored inconsistent pricing summaries by merging them through the owner.
  - Added implementation-owned focused owner/aggregate unit coverage; the API/E2E-owned current-store reproducer and its other durable coverage files were not edited.
- Changed files or areas: `autobyteus-server-ts/src/token-usage/projections/token-usage-pricing-summary.ts`; `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-pricing-summary.test.ts`; current handoff/revision artifacts.
- Local validation and result: server TypeScript build check passed; focused implementation suite passed 16 files/76 tests. Owner coverage verifies equal numeric USD/CNY relevant prices become mixed/null with not-applicable preservation. Fold/aggregate coverage verifies persisted state uses mixed status and aggregate reads canonicalize an inconsistent mixed-currency record. Static shared-owner trace and `git diff --check` pass. The API/E2E reproducer was intentionally left for `/api_e2e_engineer` after source re-pass.
- Next recipient or routing: `/code_reviewer`.
- Remaining limitations or risks: `API-REV-001` remains stopped and must rerun `APIE2E-F001` plus its unfinished scale/lifecycle/API/browser plan. Six API/E2E-owned durable coverage changes still require successful execution and proportional code review. Other recorded released-scale, restore-topology, >8-series, freelist, browser, Nuxt typecheck, and delivery-documentation risks remain.

### IR-004 — First admitted cache-state reduction correction

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; focused failure-origin review `CRR-005` of `API-REV-002` / `APIE2E-F002`.
- Triggering finding IDs: `CR-005` / `APIE2E-F002`.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-003` passed source review in `CRR-004` and `APIE2E-F001` passed its API/E2E recheck, but API/E2E then exposed a supported local-provider cache-state regression and `CRR-005` superseded the pass.
- Current authoritative result: `CR-005` is addressed in the shared record-state reducer; the cumulative implementation is ready for `/code_reviewer` re-review.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-006`.
- Related code-review revision IDs: `CRR-005`.
- Related API/E2E revision IDs: `API-REV-002`.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: `createEmptyRunRecord` requires a schema-valid `unknown` cache-state placeholder before any report is admitted, but contribution mutation reduced that placeholder as if it were an observation. The first supported OLLAMA/local `unsupported_or_local` fact therefore persisted and surfaced as `unknown`; migration folding shared the same defect.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-005`; `REQ-006`, `REQ-010`; `MP-CR-003`.
- Implementation delta:
  - `token-usage-run-record-state.ts` now uses `usageReportCount` to distinguish the zero-record placeholder from admitted facts. The first counted contribution installs its cache state directly; later counted contributions retain the existing substantive `summarizeCacheState` policy, including real `unknown` observations.
  - Added current-fold and `LegacyTokenUsageRunFold` coverage for the first explicit local state, repeated local state, local plus unknown, unknown plus positive, local plus zero-reported, and a real single unknown observation.
  - Added a real Prisma/SQLite accumulator regression using the local-no-API-bill pricing path. It verifies the stored record, authoritative event payload, and public `run_summary_after_event` all retain `unsupported_or_local`.
  - The API/E2E-owned GraphQL reproducer and its other durable maintenance files were not edited.
- Changed files or areas: `autobyteus-server-ts/src/token-usage/projections/token-usage-run-record-state.ts`; `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-run-fold.test.ts`; `autobyteus-server-ts/tests/unit/app-data-migrations/legacy-token-usage-run-fold.test.ts`; `autobyteus-server-ts/tests/unit/token-usage/services/token-usage-run-accumulator.test.ts`; current handoff/revision artifacts.
- Local validation and result: server TypeScript build check passed. The focused defect suite passed 3 files/17 tests. The broader implementation-scoped suite passed 18 files/91 tests, including current/migration cache semantics, real persistence/public summary, pricing, SafeInt, fold bounds, migration runner/repairs, restore gates, event lifecycle, schema/bootstrap, TeamRun migration, and allocator behavior. `git diff --check` and the changed-source line audit pass; `token-usage-run-record-state.ts` remains 182 effective lines.
- Next recipient or routing: `/code_reviewer`.
- Remaining limitations or risks: `API-REV-002` remains stopped and must recheck `APIE2E-F002`, finish its two stale GraphQL assertions and source-shaping coverage maintenance, and complete the scale/lifecycle/API/live/browser plan. Its 13 API/E2E-owned durable changes still require successful final execution and proportional review. Other recorded released-scale, restore-topology, freelist, live SafeInt, browser, Nuxt typecheck, and delivery-documentation risks remain.

### IR-005 — Released unknown-input consolidation normalization

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; full source re-review `CRR-006` of `IR-004`.
- Triggering finding IDs: `CR-006`; related reachable premise `MP-CR-004`.
- Classification: `Local Fix`.
- Prior authoritative result: `CRR-006` confirmed `CR-005` resolved and independently reproduced the local `APIE2E-F002` assertion as passing, but failed the full implementation because consolidation did not preserve the released reader's non-local unknown-input meaning.
- Current authoritative result: `CR-006` is addressed entirely inside the registered consolidation boundary; the cumulative implementation is ready for `/code_reviewer` re-review.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-006`.
- Related code-review revision IDs: `CRR-006`.
- Related API/E2E revision IDs: `API-REV-002`.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: The released 20260624 ledger stored input/cache components and costs before 20260625 defaulted `input_token_semantic` and `cache_state` to `unknown`. The released reader normalized such non-local rows to uncertain component/input-cost facts, but the new migration mapper copied raw fields and could validate then delete an overconfident transformation.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-005`; `REQ-006`, `REQ-010`, `REQ-017`–`REQ-021`; `AC-007`; `MP-CR-004`.
- Implementation delta:
  - `legacy-token-usage-row.ts` now reproduces the released semantic before folding: non-local unknown input nulls standard/cache token components and input/cache costs, forces cache state `unknown`, keeps output and reasoning costs, sets total cost to the output cost, forces `partial_price_missing`, sets the released missing reason, and merges the semantic missing dimensions. Either released local-no-API-bill status bypasses that normalization.
  - Missing-price dimension JSON is constrained to 4 KiB, 32 distinct values, and 96 characters per value; the legacy fold also rejects a cross-row union above 32 rather than persisting unbounded explanation state.
  - `legacy-token-usage-consolidation-repository.ts` applies the same released normalization independently in scalar token/cost validation SQL, so destructive cleanup cannot validate raw overconfident facts against a normalized target. Target round-trip validation remains exact except for the already-approved `1e-9` finite-cost tolerance needed for normal SQLite float representation.
  - Added a real direct/skip-version SQLite fixture that inserts a 20260624 pre-component row, applies the released schema migrations that default it to unknown, adds a representative later unknown row and a local exception row, then runs the real consolidation transaction. It verifies normalized current storage/public summary, source cleanup, local preservation, output-only cost, partial status, unit-price semantics, and merged dimensions.
  - The current runtime and the 13 API/E2E-owned durable files were not edited. The historical-unknown API/E2E case remains for its owner to retarget from current observation ingestion to migration/current-record output.
- Changed files or areas: `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-row.ts`; `.../legacy-token-usage-run-fold.ts`; `.../legacy-token-usage-consolidation-repository.ts`; `autobyteus-server-ts/tests/unit/app-data-migrations/legacy-token-usage-run-fold.test.ts`; new `.../token-usage-run-records-v1-app-data-migration.test.ts`; current handoff/revision artifacts.
- Local validation and result: server TypeScript build check passed. Focused migration tests passed 2 files/9 tests. The broader implementation-scoped suite passed 19 files/94 tests. The direct-upgrade fixture proves three released rows become two current rows, validates exact normalized token facts and tolerant finite costs, exposes the unknown run truthfully through the current summary, preserves the local exception, and empties the source atomically. Static review confirms no legacy import/query outside `src/app-data-migrations`; `git diff --check`, trailing-space, and effective-line audits pass.
- Next recipient or routing: `/code_reviewer`.
- Remaining limitations or risks: `API-REV-002` remains stopped. API/E2E must retarget and rerun its historical-unknown scenario through migration/current records, finish two other stale GraphQL assertions and source-shaping coverage maintenance, then complete released-scale, lifecycle/restore, overlap/retry, freelist, live SafeInt, API, and browser execution. The 13 API/E2E-owned durable changes still require successful final execution and proportional review. Nuxt typecheck compatibility and delivery-owned documentation remain outstanding.

### IR-006 — Latest-base managed-run and token-readiness integration

- Triggering role, report path, and round: `/delivery_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-integration-blocker.md`; delivery re-entry `DR-002`.
- Triggering finding IDs: no separate finding ID; `DR-002` latest-base integration conflict in `TeamRunService.restoreTeamRun(...)`.
- Classification: `Local Fix`.
- Prior authoritative result: `CRR-008` passed the `API-REV-003` durable coverage delta and `DR-001` prepared a complete reviewed, executable, docs-synchronized candidate. `DR-002` then found `origin/personal` eight commits ahead and stopped its merge with one implementation-owned conflict before the requested Electron build.
- Current authoritative result: The latest-base merge is conflict-free and complete. The integrated source and implementation-owned durable tests are ready for `/code_reviewer`; Electron packaging remains delivery-owned and has not started.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-006`.
- Related code-review revision IDs: `CRR-008`.
- Related API/E2E revision IDs: `API-REV-003`.
- Related delivery revision IDs: `DR-002`.
- Why this implementation revision is recorded: Latest base replaced the active-only root guard with the offline-delete lifecycle's broader managed-run guard, while the token ticket requires every truly restored pre-existing run to pass migration readiness before provider construction. The clean task-delegation auto-merge also combined the ticket's current-schema admission gate with the latest base's terminated-run cleanup contract.
- Approved behavior or requirement IDs affected: token `BEH-001`, `BEH-005`, `BEH-006`; `REQ-003`, `REQ-005`, `REQ-018`–`REQ-019`, `REQ-023`–`REQ-026`; `AC-004`, `AC-016`, `AC-018`–`AC-019`, `AC-022`–`AC-025`. Latest-base managed/offline TeamRun lifecycle behavior is preserved independently.
- Implementation delta:
  - Merged `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b` into the protected `DR-001` candidate checkpoint `b68170cf608364bbcd264dde198ad83e030a3bb2`.
  - `TeamRunService.restoreTeamRun(...)` now rejects any already managed root first, including an offline managed root, then asserts pre-existing-run token readiness immediately before delegating to `AgentTeamRunManager.restoreTeamRun(...)`. Managed roots therefore are not spuriously restored, while unmanaged persisted roots cannot construct providers during incomplete token consolidation.
  - Reviewed the clean `TaskDelegationService` merge: `assertCurrentSchemaReady()` remains before task-run allocation/materialization, and successful settlement uses the latest `TeamRunResolver.unregisterTerminated()` lifecycle contract.
  - Added focused TeamRun service regressions for current-schema admission before construction and managed/offline rejection before restore-readiness consultation. Updated the implementation-owned task-delegation invariant harness from the retired `unregisterInactive` mock name to the current `unregisterTerminated` contract exposed by latest base.
- Changed files or areas: `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`; integrated `.../task-delegation/task-delegation-service.ts`; `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-service.test.ts`; `.../task-delegation-current-invariants.test.ts`; current implementation handoff/revision artifacts. The other latest-base paths are the already-reviewed offline-delete feature integrated unchanged from `origin/personal`.
- Local validation and result: server build TypeScript check passed. Focused integrated Vitest passed 6 files / 34 tests, covering current-schema admission, pre-existing restore gating before manager/provider construction, managed/offline roots, active/managed resolution, exact-ID delete/restore serialization, task-delegation activation/settlement, and root termination. The first focused run exposed only the stale implementation-owned `unregisterInactive` test double; after matching latest base's `unregisterTerminated` contract, the exact rerun passed.
- Next recipient or routing: `/code_reviewer`; if integrated executable coverage is required after source review, route through `/api_e2e_engineer` before delivery. Otherwise return to `/delivery_engineer` for latest-base confirmation and the user-requested Electron README/build/integrity verification.
- Remaining limitations or risks: Electron packaging has deliberately not started. The integrated state still carries the previously recorded independent Nuxt `vue-tsc`/TypeScript typecheck incompatibility and the `API-REV-003` external-provider opt-in exclusions. The latest-base merge imports a broad, separately reviewed offline-delete change; this implementation round validated the direct source intersections rather than rerunning that feature's complete prior API/E2E/browser matrix.
