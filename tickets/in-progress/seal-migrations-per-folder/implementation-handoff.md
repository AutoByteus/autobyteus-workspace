# Implementation Handoff: seal-migrations-per-folder (autobyteus-280)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed (ARCH-REV-002; ARCH-REV-003 after DI-001). `get_handoff_rules` → `/software_engineering_team/code_reviewer` (Large or High).
- Requirements doc: `tickets/in-progress/seal-migrations-per-folder/requirements-doc.md` (REQ-001..011, AC-001..007)
- Investigation notes: `tickets/in-progress/seal-migrations-per-folder/investigation-notes.md`
- Solution revision record: `tickets/in-progress/seal-migrations-per-folder/solution-revision-record.md` (SR-001..SR-003)
- Design spec: `tickets/in-progress/seal-migrations-per-folder/design-spec.md` (SR-003)
- Supplemental task artifacts: `release-notes.md` (REQ-008 sentence and the R-6 wording, by the Solution Designer); `frozen-layer-record.md` (this implementation: every freeze's source path, members kept and commit); `follow-ups.md`
- Design review report: `tickets/in-progress/seal-migrations-per-folder/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/seal-migrations-per-folder/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/seal-migrations-per-folder/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-002, SR-003
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review / API-E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

What the code does now:

- **Sealed migration area** (`autobyteus-server-ts/src/app-data-migrations/`):
  - the contract: runner, registry, `domain/`, `repositories/`;
  - `migrations/<name>/` for each of the 31 registered migrations, holding only the code that migration uses;
  - `frozen/`, shared by migrations only. It holds:
    - the former `legacy/` released shapes (`frozen/released-*`, `frozen/team-run-*`);
    - code several migrations share (for example `frozen/team-run-execution-tree-v1/`, `frozen/token-usage-source-shaping-constants.ts`);
    - frozen copies of the application and library members migrations use (`frozen/server/<path>`, `frozen/autobyteus-ts/<path>`), copied from `27f2d2f72d` and pruned to the members used;
    - the moved `memory/migration/` (from `autobyteus-ts`).
- **Imports.** Migration folders and `frozen/` import only `domain/`, `frozen/`, their own folder, `config/prisma-client-factory.ts`, node APIs and third-party libraries. No folder imports another (prerequisite ids are local literals). Production imports only the contract.
  - `tests/architecture/app-data-migration-boundaries.test.ts` enforces this, including folder-to-folder imports and a negative case.
  - It also reports `frozen/` files no migration reaches. Both lists are empty, and the starting exception list is gone.
- **The registry is the one wiring point.** It passes each migration:
  - paths;
  - the migration ledger (to the three migrations that read predecessor statuses);
  - `SecretRemovalOwner` (the live vault, as a lazy getter, R-5);
  - the live built-in provider names;
  - `DefinitionNameLookup`: the live file definition providers, loaded by dynamic import only when a name is needed (R-8);
  - `RunHistoryCatalogInvalidation`: the three live catalog resets, called where the migrations called them before; the port carries `memoryDir` and the family (R-8).

  Every constructor default that read production config or services is gone.
- **Capability readiness.** `AppDataCapability = "token_usage_history" | "custom_llm_providers"`.
  - The token-usage records migration and the custom-provider readable-identity migration declare `holdsBackCapabilities`, and `runner.capabilityReadiness()` answers.
  - `startup/app-data-capability-readiness.ts` is the one owner. Its `markCapabilitiesPending()` runs right after the token-usage schema check; its `applyCapabilityReadiness()` runs after `runPending()` in both hosts, and after a successful Settings retry.
  - **G-2** is `TokenUsageCapability`, with unchanged codes.
  - **G-1** is narrowed: the server starts, and `CustomLlmProviderStore` refuses every read and write with `CUSTOM_PROVIDERS_MIGRATION_PENDING` while the capability is pending.
  - The TeamRun V2 warning and the GraphQL id special case are gone. Any successful retry rebuilds run-package admission and refreshes capabilities.
- **205 same-ID repair (REQ-008).** Helper runs come from three sources only: the records' `improverRunId`/`evolverRunId`, the session files' `current…RunId`/`prior…RunIds` (the released session shape), and the built-in improver's runs. `server_helper` alone no longer marks a helper run.
  - M4 is guarded like M5: a session folder goes only when every run it names is fully removed.
  - An unreadable session file is preserved and reported `PRESERVED_UNREADABLE`.
- **Tests.**
  - Each migration's unit and integration tests are in `tests/app-data-migrations/<name>/`.
  - Tests of frozen code are in `tests/app-data-migrations/frozen/`, and the two multi-migration upgrade-path tests are in `tests/app-data-migrations/upgrade-paths/`.
  - Contract tests stay in `tests/unit/app-data-migrations/`, and e2e startup suites stay in `tests/e2e/`.
  - `test:unit` and `test:integration` include the new folder, and the server test isolation covers it.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 31 migrations were reorganized; 129 frozen copies or moves; 64 test files moved.
  - A startup gate changed (G-1), and shared readiness (G-2) was renamed across 11 production files.
  - A cross-package move.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: none open. DI-001 (two ports, D-7 simplification, no cross-migration imports) was raised during implementation and accepted as SR-003 / ARCH-REV-003.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001..005, 007, 011; AC-001, AC-002) | Sealed code; same results | `src/app-data-migrations/{migrations/<name>/,frozen/,app-data-migration-registry.ts}`; `tests/architecture/app-data-migration-boundaries.test.ts`; `tests/app-data-migrations/<name>/` | Boundary test passes with no crossing and no unused frozen file (IMP-02). Every migration suite passes; no existing migration-test assertion changed (IMP-04 compares every `expect(` of the 94 test files changed or moved since `27f2d2f72d`: migration tests only gained assertions, in the 205 suite) |
| BEH-002 (REQ-006; AC-003) | G-2 by capability, unchanged codes | `token-usage/providers/token-usage-capability.ts`, `startup/app-data-capability-readiness.ts`, both hosts | `tests/unit/startup/app-data-capability-readiness.test.ts` (runner → owner → `TokenUsageRunStore`: refuses with `TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED` / `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` while pending, serves once succeeded); host tests |
| BEH-003 (REQ-006; AC-004) | G-1 narrowed | `llm-management/llm-providers/stores/custom-llm-provider-{store,availability}.ts`, owner, both hosts | Host tests: the server and the standalone host start with the migration missing, running or failed, and the store refuses with `CUSTOM_PROVIDERS_MIGRATION_PENDING`. The capability test covers listing (built-ins only, in both the model catalog and Settings), a custom-model run refused while a built-in one passes, and create/delete refused before any probe or secret change |
| BEH-004 (REQ-008; AC-005) | 205 repair | `migrations/remove-skill-improvement-data/remove-skill-improvement-data-migration.ts`; fixture `tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts` | Three new tests: the beta.5 compactor run survives; an M3 failure keeps the session file and the next start deletes both; an unreadable session file is preserved. Every earlier 205 assertion is unchanged. `release-notes.md` carries the sentence |
| BEH-005 (REQ-010; AC-007) | Guideline | written by the Solution Designer (`db787cb6f9`, `da34ab3a7a`) | Code matches its layout and test name |
| DS-003 | Generic retry | `api/graphql/types/app-data-migrations.ts` | `tests/unit/api/graphql/types/app-data-migrations.test.ts`: a non-failed retry of any migration rebuilds admission and refreshes capabilities; a failed one does neither |
| REQ-009 (AC-006) | Library folder moved | `autobyteus-ts/src/memory/migration/` → `frozen/autobyteus-ts/memory/migration/`; tests and fixture moved | Library builds and its unit tests pass (IMP-07) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Contract: `src/app-data-migrations/domain/{app-data-migration-types,secret-removal-owner,definition-name-lookup,run-history-catalog-invalidation}.ts`, `app-data-migration-runner.ts` (`capabilityReadiness`), `app-data-migration-registry.ts` (all wiring and the live ports).
- Production: `src/startup/app-data-capability-readiness.ts`, `src/server-runtime.ts`, `src/standalone-application-host/start-standalone-application-host.ts`, `src/api/graphql/types/app-data-migrations.ts`, `src/token-usage/providers/token-usage-capability.ts`, `src/llm-management/llm-providers/stores/custom-llm-provider-{store,availability}.ts`.
- Migration area: `src/app-data-migrations/migrations/**`, `src/app-data-migrations/frozen/**` (see `frozen-layer-record.md`).
- Tests: `tests/architecture/app-data-migration-boundaries.test.ts`, `tests/unit/startup/app-data-capability-readiness.test.ts`, `tests/app-data-migrations/**`, `tests/setup/{prisma-env,test-environment-isolation}.ts`, `package.json` scripts.

## Important Assumptions

- **Frozen copies are whole files from `27f2d2f72d`, pruned mechanically.** The pruner removed only unreferenced declarations, class members and imports, so behavior is the source's. Non-verbatim edits are listed in `frozen-layer-record.md` § Changes Beyond Pruning: type-only edits, plus removed reads of `appConfigProvider`.
- **Locks and module-level state in frozen copies are separate instances from production's.**
  - `withFilePathLock` keeps its cross-process `.lock` file, so exclusion with production writers holds.
  - The atomic writer's singleton is a separate instance. Migrations run before serving, except a manual retry of an `ANYTIME` migration; each write is temp file plus rename.
- **The definition-name and catalog ports reproduce today's behavior exactly.**
  - Today each lookup built a new provider through a dynamic import, and the registry's port does the same per call.
  - The resets are the same functions, called at the same points.
- **Prerequisite ids became local constants.** The registry still rejects an unknown or misordered prerequisite at construction.
- **Where tests changed (setup only, no assertions):**
  - tests that inject, subclass or spy on a class a migration uses now target its frozen copy (an alias import where the test also reads results with the current class);
  - the constructor calls of the three port-taking migrations and the readable-identity migration;
  - the 205 fixture's session files now have the released shape (they name their helper runs), so "deleted as before" holds without changing an assertion.

## Known Risks

- **Size of `frozen/`:** 176 files and 14,336 non-blank lines in total, against the design's estimate of 7,000–12,000. That breaks down into:
  - frozen copies: 6,198 lines of server code and 2,161 of library code, including the moved converter;
  - the former `legacy/` shapes and the migration-shared code, which existed before as migration code.

  Member-level pruning is conservative: a class member is kept if any file in the area or tests accesses a property of that name.
- **One production architecture assertion followed the moved code.** `application-framework-boundaries.test.ts` checked that the two index-v2 migrations use the file definition providers. It now checks the registry, where the port lives, for the same rule.
- **Test command change.** `test:unit` now runs `tests/unit tests/app-data-migrations --exclude "**/*.integration.test.ts"`, and `test:integration` adds the `.integration.test.ts` filter. A future integration test in the migration folders must keep that suffix.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Refactor`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes` (DI-001, accepted as SR-003)
- Evidence / notes: the boundary test proves the two-way seal; DI-001 covered the two places where live behavior had to stay live.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. Removed:
  - production imports of migration ids;
  - `TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID` in token usage and `CURRENT_SCHEMA_DEGRADED`;
  - G-1 `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED`;
  - the TeamRun V2 warning;
  - the GraphQL id special case;
  - `legacy/`;
  - the D-8 bridge `asSourceIndependentIndexInput`;
  - `autobyteus-ts/src/memory/migration/`;
  - the migration-only `context-files/services/context-file-record-locators.ts` and `run-history/services/agent-org-run-history-summary-writer.ts`, both moved into `frozen/`;
  - the boundary test's exception list.
- Dead code in the touched files and modules removed: `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None (FU-001 is a pre-existing failing assertion, not dead code)
- Shared structures remain tight: `Yes`. The capability type is a closed union, and the ports are narrow.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. No changed file is over 500 effective lines: the 205 migration has 338, the registry 197, `server-runtime.ts` 226 and the standalone host 353, the last two smaller than before. The registry's diff exceeds 220 changed lines. I assessed it: 31 repointed imports plus the wiring the design gives the registry, with no logic of its own, so no split.
- Notes: the readiness test helpers and the live-port exports from the registry exist for tests that need the live wiring (the two index-v2 "persistence-only lookup" tests).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`, except REQ-008, which narrows a same-ID repair
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`. No stored shape changed. The 205 migration deletes less, never more.
- Migration implementation and focused checks: the 205 suite (IMP-03, IMP-04) and its startup e2e (IMP-06)
- Deviation: `None`

## Environment Or Dependency Notes

- macOS (darwin arm64), Node 22.23.1, pnpm, vitest 4.1.12.
- Every server test run used `env -i PATH="$PATH" HOME=/tmp/ab280/home TMPDIR="$TMPDIR"` with synthesized fixtures only, never the user's data or `~/.autobyteus`.
- Tooling I wrote for the mechanical move is kept outside the repository, under `/tmp/ab280/`:
  - `seal.py` plans and applies the moves and copies;
  - `prune2.mjs` prunes the frozen copies;
  - `move_tests.py` moves the tests;
  - `exceptions.py` mirrors the boundary rules;
  - `freeze-record.mjs` writes the record.

## Checks Run

All on `8b091176bf` (later commits change only ticket documents). Evidence is in `tickets/in-progress/seal-migrations-per-folder/evidence/`. The fixtures are all synthesized: no run touched the user's data or `~/.autobyteus`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `8b091176bf` | macOS arm64, Node 22.23.1 | all server `src` | REQ-001..006 | Pass | `IMP-01-server-typecheck.log` | `exit=0`, `error TS count: 0` |
| IMP-02 | `vitest run tests/architecture` | `8b091176bf` | macOS arm64, Node 22.23.1, clean env (`env -i PATH HOME=/tmp/ab280/home TMPDIR`) | the boundary test (sealed area, folder-to-folder rule, unused-frozen report, negative case) and the other architecture tests | REQ-003..005; AC-001 | Pass for this ticket. One failure, FU-001, also fails on the base | `IMP-02-architecture-boundaries.log` | `✓ ... sealed app-data migration area` (3 tests); the only `×` is "guards the exact SR-011 host definition...", whose diff is `+ "autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts"`. The service is unchanged since the base, and the expected list is not in this branch's hunk |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (now also `tests/app-data-migrations`, without the integration files) | `8b091176bf` | macOS arm64, Node 22.23.1, clean env (`env -i PATH HOME=/tmp/ab280/home TMPDIR`) | the whole server unit suite, every migration's unit tests in their folders, the frozen-code tests, the upgrade-path tests, the host gate tests, the capability readiness test, the GraphQL retry test | REQ-001..008, 011; AC-002..005 | Pass | `IMP-03-server-unit.log` (excerpt; the full 1.4 MB log is in `/tmp/ab280/`) | `Test Files  797 passed \| 4 skipped (801)`, `Tests  6624 passed \| 7 skipped (6631)`, `exit=0` |
| IMP-04 | `python3 /tmp/ab280/assertions.py 27f2d2f72d` (script in the file) | `8b091176bf` vs base `27f2d2f72d` | macOS arm64 | every `expect(...)` of the 94 test files changed or moved since the base | REQ-007; AC-002 | Pass | `IMP-04-assertion-preservation.log` | No migration test lost an assertion: the 205 suite `0 removed, 11 added`. Removals appear only in the two host gate tests (G-1 narrowed, intended), the application-framework architecture test (the rule now checks the registry) and none elsewhere |
| IMP-05 | `test:integration:prepare` then `test:integration` | `8b091176bf` | macOS arm64, Node 22.23.1, clean env (`env -i PATH HOME=/tmp/ab280/home TMPDIR`) | the server integration suite, including the 4 per-migration integration files | AC-002 | Pass | `IMP-05-server-integration.log` (excerpt) | `Test Files  78 passed \| 20 skipped (98)`, `exit=0`; the four `✓ tests/app-data-migrations/...integration.test.ts` lines |
| IMP-06 | `vitest run tests/e2e/app-data-migrations` plus the token-usage and projects startup e2e files (command in the file) | `8b091176bf` | macOS arm64, Node 22.23.1, clean env (`env -i PATH HOME=/tmp/ab280/home TMPDIR`), test-owned server and database | migration startup through the real runner and registry | AC-002, AC-005 (205 startup suite) | Pass | `IMP-06-migration-startup-e2e.log` | `Test Files  14 passed (14)`, `Tests  49 passed (49)` |
| IMP-07 | `pnpm -C autobyteus-ts build`; `vitest run tests/unit` in `autobyteus-ts` | `8b091176bf` | macOS arm64, Node 22.23.1, clean env (`env -i PATH HOME=/tmp/ab280/home TMPDIR`) | the library without `memory/migration` | REQ-009; AC-006 | Pass | `IMP-07-library.log` | `build exit=0`, `ls: autobyteus-ts/src/memory/migration: No such file or directory`, `Test Files  305 passed (305)` |

- Not run, and why:
  - the web suites (no web change);
  - live-provider e2e (gated, not affected);
  - a packaged-app startup with a pending custom-provider migration (left to API/E2E, see Downstream Coverage Hints).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: there is no frontend change. The web still matches the unchanged token-usage codes. The new code `CUSTOM_PROVIDERS_MIGRATION_PENDING` reaches Settings as an error message through the existing error path.

## Downstream Coverage Hints / Suggested Scenarios

- A real startup (test-owned server and database) with a released V2 `custom-llm-providers.json` and the readable-identity migration forced to fail. Check that:
  - the server serves;
  - Settings lists built-in providers only and shows `CUSTOM_PROVIDERS_MIGRATION_PENDING` on create;
  - a retry in Settings → Migrations after fixing the file makes custom providers available without a restart.
- A real startup with the token-usage migration failing. History reads and existing-run restore refuse with the unchanged codes, and new runs work.
- The 205 startup e2e with a beta.5 compactor run added: the run and its history row survive.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The scenarios above on a real test-owned server, plus the migration startup e2e suites (IMP-05 ran them locally).
