# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md` | Initial implementation-source review for commit `8e75bfd8e`, triggered by `IR-001` | N/A | Fail | `F-001` |
| CRR-002 | `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md` | Repeated implementation-source review after `IR-002` fix commit `6176e1525` | Fail (`F-001`) | Pass | `F-001 resolved` |
| CRR-003 | `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-test-review-report.md` | Separate proportional durable test-code review after successful `API-REV-001` | N/A; first proportional test review | Pass | None |
| CRR-004 | `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md` | Repeated implementation-source review after architecture-authorized `IR-003` snapshot rework commit `4b06b96ba` | Pass (`CRR-002`); architecture rework authorized by `ARCH-REV-005` | Fail | `F-002`; `F-001` remains resolved |
| CRR-005 | `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md` | Repeated implementation-source review after `IR-004` Migration B invariant correction commit `9e3d8d86e` | Fail (`CRR-004`, `F-002`) | Pass | `F-002 resolved`; `F-001` remains resolved |
| CRR-006 | `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-test-review-report.md` | Separate proportional durable-test review after successful `API-REV-002` | Pass (`CRR-005` source gate) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation-source review

- **Canonical review report:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- **Review entry point / round:** Full implementation-source and structural review, round 1.
- **Triggering role and evidence:** `implementation_engineer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-handoff.md`; implementation revision `IR-001`; commit `8e75bfd8e`.
- **Relevant solution revision:** `SR-004`.
- **Relevant architecture revision:** `ARCH-REV-003`.
- **Relevant API/E2E revision:** `N/A`; API/E2E was not authorized because source review failed.
- **Prior authoritative result:** `N/A`; this is the initial code-review baseline.
- **Current authoritative result:** `Fail` with `F-001` (`Local Fix` -> `implementation_engineer`).
- **What changed in this review result and why:** The complete implementation package was reviewed against the exact approved provider/model display policy, raw/accounting preservation rules, recursive alignment contract, and migration lifecycle. The normal custom-provider path, raw/accounting boundaries, GraphQL/frontend propagation, Task alignment, and migration mechanics are structurally sound. A supported malformed `model_value` path incorrectly falls back to a non-composite raw identifier or recognized built-in provider instead of the exact `Unknown Provider:Unknown Model` fallback when no valid raw composite exists.
- **Evidence:** Focused server tests passed (3 files / 15 tests), production build passed, `git diff --check` passed, and a direct built-module probe reproduced `Unknown Provider:legacy-model` and `DeepSeek:Unknown Model` for the failing malformed-value matrix cells.
- **New or remaining finding IDs:** `F-001`.
- **Score / classification:** `8.8/10` (`88/100`); `Local Fix`.
- **Required next action:** Implementation engineer must correct the malformed-value branch and add focused assertions for malformed composite values with non-composite raw identities and built-in provider metadata. Then source review and API/E2E must be repeated.
- **Handoff recipient:** `implementation_engineer`.

#### Prior Finding Resolution

None. This is the initial review baseline.

### CRR-002 — Re-review after F-001 implementation fix

- **Canonical review report:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- **Review entry point / round:** Repeated full implementation-source and structural review, round 2.
- **Triggering role and evidence:** `implementation_engineer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-handoff.md`; implementation revision `IR-002`; fix commit `6176e1525`.
- **Relevant solution revision:** `SR-004`.
- **Relevant architecture revision:** `ARCH-REV-003`.
- **Relevant API/E2E revision:** `N/A`; API/E2E had not started at this gate.
- **Prior authoritative result:** `Fail` with `F-001` from `CRR-001`.
- **Current authoritative result:** `Pass`; `F-001` resolved and no new source findings identified.
- **What changed in this review result and why:** Rechecked the failed malformed-composite `model_value` path from the approved Token Statistics user journey through the current projection. The implementation now uses only a valid raw composite provider/suffix when available; otherwise it clears provider metadata and returns exactly `Unknown Provider:Unknown Model`. Focused assertions cover both the non-composite raw identity and built-in-provider metadata cases. The unchanged implementation paths remain aligned with the prior full source review.
- **Evidence:** Focused server suite passed (3 files / 15 tests), production server build passed, `git diff --check` passed, and a direct built-module probe returned the exact expected fallback for both corrected cases and the valid raw-composite case.
- **New or remaining finding IDs:** None; `F-001` resolved.
- **Score / classification:** `9.3/10` (`93/100`); no failure classification.
- **Next recipient:** `api_e2e_engineer` for independent API/E2E coverage investigation and execution. The next result must return to `code_reviewer` for proportional test-code review or failure-origin analysis.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| `F-001` | Open | Resolved | Current source clears provider/model fallback state for malformed composite values without a valid raw composite; focused tests and direct built-module probes produce exactly `Unknown Provider:Unknown Model`. |

### CRR-003 — Proportional test-code review after successful API/E2E

- **Canonical review report:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-test-review-report.md`
- **Review entry point / round:** Separate successful API/E2E durable test-code review, round 1.
- **Triggering role and evidence:** `api_e2e_engineer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-revision-record.md`; `API-REV-001`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/coverage-investigation.md`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/execution-coverage-report.md`.
- **Relevant solution revision:** `SR-004`.
- **Relevant architecture revision:** `ARCH-REV-003`.
- **Relevant implementation revision:** `IR-002`.
- **Relevant implementation-source review:** `CRR-002` `Pass`.
- **Prior authoritative test-review result:** `N/A`; this is the initial proportional test-code review.
- **Current authoritative result:** `Pass`; no actionable test-code findings.
- **What changed in this review result and why:** Reviewed only the two durable test paths added or updated during API/E2E. The live GraphQL scenario provides direct raw/display, cross-runtime, recursive Task, and accounting assertions with isolated provider metadata. The migration E2E provides real Prisma/runner lifecycle coverage for warnings, partial failure, startup continuation, retry, and raw-identity invariants. Both files have clear scenario names, bounded fixtures/helpers, deterministic identities and timestamps, and explicit cleanup. No durable test was removed or stale, disabled, or duplicated.
- **Evidence:** `API-REV-001` reports the changed durable GraphQL/migration E2E paths passed (2 files / 6 tests), full token-usage E2E passed (8 files / 16 tests), live GraphQL and migration startup validation passed, browser validation passed, and no failures or reroutes occurred. The changed test source and cumulative coverage artifacts agree with that result. No reviewer rerun was needed.
- **New or remaining finding IDs:** None.
- **Score / classification:** `Pass`; proportional test-code review has no implementation scorecard or source-size deduction.
- **Next recipient:** `delivery_engineer` for integrated-state refresh, documentation/no-impact record, and final handoff.

#### Prior Finding Resolution

No prior proportional test-review findings. Implementation finding `F-001` remains resolved as recorded in `CRR-002` and is not reopened by this successful test-code review.

### CRR-004 — Re-review after architecture-authorized provider-name snapshot rework

- **Canonical review report:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- **Review entry point / round:** Full implementation-source and structural review, round 3.
- **Triggering role and evidence:** `implementation_engineer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-handoff.md`; implementation revision `IR-003`; commit `4b06b96ba`; architecture gate `ARCH-REV-005`; solution revision `SR-006`.
- **Prior authoritative result:** `Pass` from `CRR-002`; prior `F-001` remains resolved.
- **Current authoritative result:** `Fail` with `F-002` (`Local Fix` -> `implementation_engineer`).
- **What changed in this review result and why:** Reviewed the new nullable provider-name schema/ingestion contract, snapshot-first display behavior, direct-runtime null propagation, Migration B classifier/CAS/lifecycle, and the affected persistence/normalization boundaries. Producer propagation, precedence, snapshot-first display, registry ordering, status/retry semantics, and normal raw/accounting boundaries are structurally aligned. The Migration B final invariant check and focused test shape compare only row count, provider type, model identifier, and model value; they do not verify the approved token/cost/accounting fields, timestamps, or raw JSON preservation contract.
- **Evidence:** Reviewer ran the current worktree tests: `autobyteus-ts` normalizer suite 1 file / 9 tests passed; focused server set 12 files / 78 tests passed; both package production builds passed; the new Prisma schema migration applied in isolated test setup; `git diff --check` passed. Source inspection identified the missing invariant fields at the Migration B raw-row projection and final comparison.
- **New or remaining finding IDs:** `F-002`; `F-001` remains resolved.
- **Score / classification:** `8.8/10` (`88/100`); `Local Fix`.
- **Required next action:** Implementation engineer must extend Migration B's before/after invariant projection and tests to cover the approved preserved token/cost/accounting fields and design-listed timestamps/raw JSON, excluding only the intentionally changed `provider_name`. Then repeat source review and API/E2E.
- **Handoff recipient:** `implementation_engineer`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| `F-001` | Resolved in `CRR-002` | Resolved | Current snapshot-aware display projection still forces the exact unknown pair for malformed composite values without a valid raw composite; focused projection tests pass. |
| `F-002` | N/A | Open | Migration B's `RawTokenUsageProviderNameBackfillRow` and final identity comparison omit the approved token/cost/accounting, timestamp, and raw-JSON preservation fields; focused migration facts assert only the same reduced tuple. |

### CRR-005 — Re-review after IR-004 Migration B invariant correction

- **Canonical review report:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- **Review entry point / round:** Full implementation-source and structural review, round 4.
- **Triggering role and evidence:** `implementation_engineer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-handoff.md`; implementation revision `IR-004`; fix commit `9e3d8d86e`; triggering `CRR-004/F-002`.
- **Relevant solution revision:** `SR-006`.
- **Relevant architecture revision:** `ARCH-REV-005`.
- **Relevant API/E2E revision:** `N/A`; API/E2E was unauthorized before this source pass. Historical `API-REV-001` and downstream artifacts predate `SR-006`.
- **Prior authoritative result:** `Fail` with `F-002` from `CRR-004`; `F-001` remained resolved.
- **Current authoritative result:** `Pass`; `F-002` resolved and no new source findings identified.
- **What changed in this review result and why:** Rechecked the supported startup-migration path and the full Migration B preservation contract. The implementation now selects all 80 current `TokenUsageLedgerEvent` columns in both Prisma row adapters, snapshots all 79 current non-`provider_name` fields in one migration-owned helper, compares sorted before/after snapshots plus row count, and retains a provider-name-only CAS update. The durable unit fixture covers the complete field set and deliberately mutates an accounting field after the pre-read to prove the invariant failure path.
- **Evidence:** Independent schema/projection audit found 80/80 columns in each SELECT and 79/79 preserved fields with no missing, extra, or duplicate names. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts --no-watch` passed 1 file / 5 tests. `pnpm -C autobyteus-server-ts build` passed, including shared builds, Prisma generation, production TypeScript build, asset copy, and bootstrap smoke. `git diff --check 9e3d8d86e^ 9e3d8d86e` and worktree `git diff --check` passed. No changed implementation source exceeds the 500-line hard limit; Migration B is 453 non-empty lines and the extracted row boundary is 116 non-empty lines.
- **New or remaining finding IDs:** None; `F-001` and `F-002` are resolved.
- **Score / classification:** `9.26/10` (`92.6/100`); source-review Pass with no failure classification.
- **Required next action:** Authorize `api_e2e_engineer` to regenerate stale coverage/execution/API artifacts and independently execute broader migration lifecycle, GraphQL, and browser validation for `SR-006`/`IR-004`. Then return successful durable test changes for the separate proportional test-code review.
- **Handoff recipient:** `api_e2e_engineer`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| `F-001` | Resolved in `CRR-002` | Resolved | The malformed composite display branch remains unchanged by IR-004 and retains the exact `Unknown Provider:Unknown Model` fallback when no valid raw composite exists. |
| `F-002` | Open in `CRR-004` | Resolved | Both SQL projections select all 80 ledger columns; `preservedRowSnapshot` includes exactly the 79 non-provider-name schema columns; the final invariant compares sorted snapshots and row count; the fifth unit test detects an `accounting_total_tokens` mutation. |

### CRR-006 — Proportional test-code review after API-REV-002

- **Canonical review report:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-test-review-report.md`
- **Review entry point / round:** Separate successful API/E2E durable test-code review, round 2.
- **Triggering role and evidence:** `api_e2e_engineer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-revision-record.md`; `API-REV-002`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/coverage-investigation.md`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/execution-coverage-report.md`.
- **Relevant solution revision:** `SR-006`.
- **Relevant architecture revision:** `ARCH-REV-005`.
- **Relevant implementation revision:** `IR-004`.
- **Relevant implementation-source review:** `CRR-005` `Pass`.
- **Prior authoritative test-review result:** `Pass` from `CRR-003` after `API-REV-001`; no unresolved proportional test findings.
- **Current authoritative result:** `Pass`; no actionable test-code findings.
- **What changed in this review result and why:** Reviewed only the three durable E2E paths changed during `API-REV-002`: the GraphQL suite now proves persisted provider snapshots and post-deletion display stability; the new Migration B suite proves real Prisma/runner warning, retry, failure, sibling, and full preserved-row behavior; the legacy-path suite applies the new provider schema migration to its manually assembled fixture. The source remains organized by one coherent boundary per file, assertions are tied to approved behavior, and cleanup/setup is deterministic.
- **Evidence:** `API-REV-002` reports `Pass` at `96%` confidence: focused server `6` files / `28` tests; shared normalizers `1` / `9`; Migration B E2E `1` / `2`; GraphQL E2E `1` / `4`; final token-usage folder `9` / `18`; web `3` / `6`; live startup/GraphQL/browser/build/guard validation passed. The intermediate missing-column failure was an API/E2E-owned stale fixture and was corrected before final reruns; it is not a remaining test-review finding. No reviewer rerun was needed.
- **New or remaining finding IDs:** None.
- **Score / classification:** `Pass`; proportional test review has no implementation scorecard or source-size deduction.
- **Next recipient:** `delivery_engineer` for integrated-state refresh, docs/no-impact synchronization, and final handoff.

#### Prior Finding Resolution

No prior proportional test-review findings. Implementation findings `F-001` and `F-002` remain resolved as recorded in `CRR-002` and `CRR-005`; they are not reopened by this test-only review.
