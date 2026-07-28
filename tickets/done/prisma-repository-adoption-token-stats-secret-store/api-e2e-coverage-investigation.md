# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/repository-prisma-architecture-analysis.md`
  - `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/handoff-summary.md`
  - `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/release-deployment-report.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/solution-revision-record.md` (`SR-001`, `SR-002`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/implementation-revision-record.md` (`IR-001` through `IR-003`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/code-review-revision-record.md` (`CRR-001` through `CRR-003`)
- API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/api-e2e-test-review-report.md` (`TR-001`)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/api-e2e-revision-record.md` (`API-REV-001`, `API-REV-002`)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: proportional durable test-code review round 1 `Fail — Local Fix` (`TR-001`). The prior same-process initializer test uses two repositories over one process-global package client and therefore cannot prove the approved `MP-003` independent-process/same-SQLite path.
- Prior Investigation Reviewed: yes — round 1 and `API-REV-001` were rechecked against `TR-001`
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The approved package replaces backend-owned/raw Prisma access in the normal token-usage and secret-vault runtime with the published `repository_prisma@1.0.9` process-global lifecycle and `BaseRepository`/model-repository composition. Startup must run migrations before exactly targeted package initialization. Shutdown must stop inbound work, quiesce and drain accepted token events, zeroize secret material, and then shut down Prisma without a late reopen; repeated stop must be safe, and only the explicit test reset hook may create a new default event composition.

Token-usage persistence must retain its canonical mappings, append/idempotency behavior, cumulative-snapshot normalization, safe-integer guards, display projections, and statistics. Secret data is `Directly Usable — No Migration`: the established database and key must remain readable and byte/data-version stable, with no WAL/logging policy change. The vault coordinator must use the approved domain names `SecretVaultRepository`, `SecretEntryRepository`, and `SecretEncryptionMetadataRepository` without provider-named compatibility aliases.

The importer preview path must be lifecycle-free. Execution must initialize the exact explicit target rather than ambient `DATABASE_URL`, close on success and failure, retain all-or-nothing batch behavior, and permit subsequent serialized global rebinding. Independent normal vault processes that share one SQLite target must serialize at the outer initialization transaction, not merely through one process-global client. The backend must use installed `repository_prisma@1.0.9` transaction-option support (initializer `2s/10s`, mutations `2s/5s`) without local patches, wrappers, raw clients, dual paths, schema changes, or a `1.0.8` fallback.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| APIE2E-B01 — startup and global Prisma ownership | Changed | REQ-001, REQ-006, AC-001, AC-006, MP-005 | Exercise exact datasource initialization, installed-package options, and serialized rebinding through real SQLite. |
| APIE2E-B02 — graceful event-persistence shutdown | Changed | REQ-002, AC-002, MP-001, IR-002, CRR-001/002 | Add durable scheduling/drain/quiescence coverage and execute repeated stop with accepted, concurrent, and late events. |
| APIE2E-B03 — token ledger repository/store | Changed | REQ-003, AC-003/004 | Convert raw-client test seams; retain real-SQLite append, duplicate, snapshot, projection, statistics, and safe-integer coverage. |
| APIE2E-B04 — secret repository composition and naming | Changed | REQ-004/005, AC-005, USER-NAMING-001, SR-002/IR-003 | Convert raw-client constructor seams; preserve repository/lifecycle behavior under the domain-named public classes. |
| APIE2E-B05 — importer target and cleanup | Changed | REQ-007, AC-007/008, MP-004 | Exercise preview, exact target authority, successful cleanup, failed-batch cleanup, and later lifecycle rebinding. |
| APIE2E-B06 — established secret data and restart | Preserved | REQ-008, AC-009, persisted-data decision | Exercise direct use across real built-server restart and confirm byte/hash/data-version stability and no WAL residue. |
| APIE2E-B07 — package/logging/WAL/version policy | Changed/Preserved | REQ-006/009, AC-006/010/011/012 | Update stale `1.0.8` assertion; probe installed ESM/CJS import safety, logging modes, package resolution, and absence of WAL/legacy seams. |
| APIE2E-B08 — GraphQL behavior | Preserved across changed persistence | AC-003/009 | Run token and secret GraphQL E2E against real SQLite/built server where the project already provides it. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | repository calls, transaction policies, token append/projections, secret coordination | unit and real-SQLite integration suites | none if all focused and broad suites pass | None |
| API / transport / contract | Yes, indirectly | GraphQL resolvers consume changed repositories/services | token and secret GraphQL E2E | built-server lifecycle ordering is only indirect in in-process GraphQL | Live API/process E2E |
| Frontend component / state | No | no frontend code or contract change | N/A | none | None |
| Browser integration / user journey | No | backend-only persistence/lifecycle change | N/A | browser adds no direct evidence | None |
| Authentication / session / permissions | No | unchanged | N/A | none | None |
| Desktop renderer / web-equivalent UI | No | unchanged | N/A | none | None |
| Desktop shell / Electron-specific integration | No | unchanged | N/A | none | None |
| Process / lifecycle | Yes | migration-before-init, global client binding, independent vault initializer contention, event drain, vault close, shutdown, restart | lifecycle unit tests and built-server/worker child-process E2E | `TR-001` identified that same-client scheduling does not prove independent process compositions | Lifecycle/process E2E |
| Persisted-data transition | Yes | current data must be directly usable with no migration | real established-data restart/import E2E | filesystem byte/WAL behavior requires isolated real database | Process/SQLite E2E |
| Worker / queue / distributed coordination | Yes, bounded | `setImmediate` token append tasks are in-process deferred work | new processor/default-pipeline lifecycle coverage | multi-node coordination is not part of the process-global design | Lifecycle |
| External integration | Yes, local installed package | `repository_prisma@1.0.9` and Prisma 5.22 runtime | installed-package policy probe and package metadata checks | publication itself is upstream delivery evidence; local resolution must still be verified | CLI/package probe |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store`
- Project type and runtime stack: pnpm TypeScript monorepo; Node ESM backend, Fastify/GraphQL, Prisma 5.22, SQLite, Vitest forks with file parallelism disabled.
- Conflicting, missing, or unclear project instructions: none. The server `typecheck` script includes tests despite `rootDir: src` and is documented upstream as having an existing TS6059 configuration limitation; production-source `tsc --noEmit` and the build remain authoritative executable checks.
- Required environment variables or secrets available: `N/A`; project test setup supplies isolated SQLite URLs and cryptographic fixtures. Live external-provider credentials are not required for this persistence/lifecycle scope.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | closest repository test instructions | Use `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; integration suite uses `vitest run tests/integration --no-watch`. |
| `autobyteus-server-ts/package.json` | authoritative scripts | `prepare:shared`, `build`, `typecheck`, `test`; build generates Prisma and performs sanitized built-agent bootstrap smoke. |
| `autobyteus-server-ts/vitest.config.ts` | test runtime | Node environment, fork pool, serial files, setup/global setup. |
| `autobyteus-server-ts/tests/setup/prisma-env.ts` and `tests/setup/prisma-global-setup.ts` | database fixture authority | Bind `DATABASE_URL`/`DATABASE_URL_TEST` to the project-owned `tests/.tmp/autobyteus-server-test.db` and reset it for a run. |
| root `package.json` / `pnpm-lock.yaml` | package-manager/runtime resolution | pnpm 10.28.2 workspace; server resolves `repository_prisma@1.0.9`. |
| requirements/design/implementation/review artifacts above | ticket behavior authority | Exact lifecycle order, no-compatibility rule, transaction options, risk inventory, and source-review result. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| shared packages | worktree root | `pnpm -C autobyteus-server-ts prepare:shared` | builds workspace dependencies | command exits 0 | no process |
| Prisma client/build | worktree root | `pnpm -C autobyteus-server-ts build` | generates server Prisma client and clean `dist` | build/bootstrap smoke exits 0 | no process |
| Vitest/SQLite | worktree root | project-documented focused/full Vitest commands | only project-owned `tests/.tmp` DB plus per-test temp dirs | global setup and test assertions | hooks close clients/processes; remove owned temp dirs/files |
| built server child process | E2E harness | existing E2E helper/test starts compiled server with isolated paths/ports | never reuse an unrelated running server or DB | GraphQL/health readiness in harness | test-owned child termination and temp-directory removal |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| token ledger rows | Vitest global SQLite plus test factories | project-local DB only | delete rows/shutdown package; global teardown or explicit removal |
| fresh and established secret vaults | per-test temp directories, migrations, built-server fixture | random key material in isolated paths; no user data | close runtime, shutdown Prisma, remove owned temp directory |
| importer source/target | existing importer E2E fixtures and hostile ambient URL | explicit target and redirect paths are test-owned | finally-close and remove all owned target/ambient paths |
| installed package probe | server `node_modules` and synthetic Prisma loader already used by durable test | no network or user data | temporary probe directories removed by test hooks |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design persisted-data section; implementation handoff `Persisted Data Transition Check`; REQ-008 and AC-009.
- Representative existing-data setup and required behavior: initialize an established secret DB/key, restart the built server against the same files, read/decrypt the same secret, and prove database/key byte hashes, data version, and WAL absence are stable.
- Evidence planned: existing `server-restart-secret-lifecycle.e2e.test.ts`, importer target/hash checks, lifecycle verify-only tests, empty schema/migration diff evidence from review, and explicit WAL/logging policy tests.
- Migration-specific completion/recovery scenarios: not applicable because no data migration is approved.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/app-data-migrations/custom-provider-v1-app-data-migration.test.ts` | secret migration and collision/compensation behavior | AC-007 | Needs Update | still passes a removed raw-client constructor seam | use explicit `initializePrisma`/`shutdownPrisma`; retain behavior assertions |
| `tests/unit/secret-management/secret-vault-lifecycle.test.ts` | fresh initialization, established verify, interruption recovery, and two repository owners over the process-global client | AC-007/009; MP-002/005 | Still Valid after round-2 narrowing | `TR-001` proved only its former label/independent-process claim was stale; the same-client scheduling responsibility itself remains useful | renamed to claim only in-process package-owner scheduling; it is not `MP-003` evidence |
| `tests/e2e/secret-management/secret-vault-independent-process-initialization.e2e.test.ts` plus worker fixture | two independent normal process/package compositions contend on one SQLite target | AC-007; MP-003 | Added / Still Valid | worker 1 is held after key publication while its outer initialization callback owns the transaction; worker 2 emits lock-requested but cannot emit callback/root-key-inspection/ready before release | passed focused, affected-scope, and five consecutive repeat executions; both workers then `READY` with identical key/domain, one metadata row, and one key file |
| `tests/unit/config/prisma-import-lifecycle.test.ts` | import safety and lazy/configured client acquisition | REQ-001/005/009; AC-012 | Needs Update + stale cases | token ownership assertions protect removed backend client factory/injection | retain import-safety/migration-owner checks; replace token cases with explicit package lifecycle/no factory acquisition |
| `tests/unit/logging/prisma-query-log-policy.test.ts` | installed package import/log policy | AC-010/011 | Needs Update | durable probe is strong, but one assertion expects obsolete `1.0.8` | assert installed `1.0.9` and retain log/import modes |
| token ledger repository/store integration tests | real SQLite mapping, append, duplicate, snapshot, display/statistics | AC-003/004 | Needs Update | production seam is valid; raw client constructor is removed | initialize package explicitly and use package root client only as test cleanup/observer |
| token GraphQL E2E tests that construct the default store (`gpt56`, ledger, provider semantics, unit prices) | ledger queries, provider semantics, pricing, safe integer, execution address | AC-003/008/009 | Needs Update | assertions are valid, but their default store now requires the explicit package lifecycle while a raw client is still used for cleanup | initialize/shutdown `repository_prisma` and use its root client as the test observer |
| opt-in `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | real runtime/websocket token flow and GraphQL persistence | AC-002/003 | Needs Update | the opt-in harness still owns a raw Prisma observer and omits package initialization | make the harness lifecycle-valid even though external-runtime execution remains optional |
| token enrichment/delta/pricing unit tests | canonical mapping, cumulative delta, costs | AC-003 | Still Valid | current assertions match approved behavior | execute focused suite |
| `tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts` — direct per-turn normalizer scenario | reported per-turn values become meter deltas | AC-003; approved transformer order | Needs Update | broad execution showed this legacy unit calls the delta normalizer with a payload that bypasses the preceding component-basis resolver, so its accounting fields remain correctly unresolved | route the fixture through `TokenUsageComponentBasisResolver` before the normalizer, matching the production pipeline |
| `tests/e2e/secret-management/current-database-import-lifecycle.e2e.test.ts` | preview, exact target, redirects, successful import | AC-007/008/009; MP-004/005 | Needs Update | post-import reopen bypasses new explicit package lifecycle; failure cleanup is not direct | explicit rebind for reopen and add failed-batch/finally cleanup proof |
| `tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts` | built-server restart, data/key byte stability | AC-001/002/009 | Still Valid | directly exercises process and established data | build and execute |
| provider secret lifecycle/migration GraphQL E2E | provider CRUD/decryption and startup migration | AC-007/009 | Still Valid | public API + built/server paths | execute focused suite |
| local importer service/CLI unit tests | preview/execution separation, target plumbing, close-on-success | AC-008 | Still Valid but incomplete | mocks cannot prove package cleanup on real failed batch | retain and supplement real E2E |
| `tests/unit/agent-execution/events/agent-run-event-pipeline.test.ts` | processor order/derived events | AC-002 indirectly | Still Valid but incomplete | no deferred append/drain/quiescence coverage | retain and add lifecycle-specific durable coverage |
| default token pipeline lifecycle coverage | none | AC-002; MP-001 | Missing | repository search found no stop/reset/late-event test | add durable coverage |
| historical token-schema migration tests | earlier product migrations | outside this ticket's no-new-migration outcome | Out Of Scope | no schema/migration diff in this ticket | do not change; broad suite still guards regressions |
| execution-address backfill and legacy-column-drop E2E runner/GraphQL record repositories | isolated historical migration runner uses an explicitly targeted raw Prisma fixture | regression guard for pre-existing migrations; bounded migration exception in AC-012 | Needs Update | broad execution showed the runner record repository accidentally falls back to uninitialized ambient app configuration, and the GraphQL status resolver legitimately uses the default migration runner | inject the already-owned isolated migration fixture client into the explicit runner and initialize isolated AppConfig for the GraphQL default runner; retain all historical migration assertions |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/config/prisma-import-lifecycle.test.ts` — token owner first-operation factory case | default token repository acquires `createConfiguredPrismaClient` lazily | token runtime now uses `repository_prisma` global lifecycle | REQ-001/003/005/009, AC-012 | explicit initialization followed by default token repository/store operations that prove the old factory is never acquired | N/A |
| same file — caller-injected token client case | token repository supports a raw caller-injected Prisma client | injection seam was intentionally removed; retaining it would protect invalid compatibility | REQ-003/005, AC-004/012, implementation legacy-removal check | retain bounded migration-owner injection assertions only; real token integration uses explicit package lifecycle | N/A |
| same file — shared lazy configured token client case | multiple token repositories share backend-owned config singleton and it disconnects once | package lifecycle owns the single client and shutdown | REQ-001/002/009, MP-005 | package initialization/default repos/global shutdown scenario | N/A |
| `tests/unit/logging/prisma-query-log-policy.test.ts` | exact unpatched package is version `1.0.8` | approved/published dependency is `1.0.9` | REQ-006/009, AC-006/011 | same installed-package scenario with `1.0.9` expectation | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-001 | deferred token append begins before event-loop callback, close waits, repeat close is safe, and late process is ignored | REQ-002, AC-002, MP-001 | `tests/unit/agent-execution/events/token-usage-event-persistence-processor-lifecycle.test.ts` | directly guards the race that triggered IR-002 |
| APIE2E-002 | stopped default composition is retained, stop-before-first creates no token owner, and only reset restarts it | REQ-002, AC-002, CRR-001/002 | `tests/unit/agent-execution/events/default-agent-run-event-pipeline-lifecycle.test.ts` | prevents ordinary late getters from silently reopening token persistence |
| APIE2E-003 | real importer batch failure closes package ownership and permits later exact-target rebind | REQ-007, AC-007/008, MP-004/005 | `tests/e2e/secret-management/current-database-import-lifecycle.e2e.test.ts` | mocked cleanup is insufficient for the global lifecycle boundary |
| APIE2E-003A | real SQLite default pipeline persists an accepted event during stop, ignores a late event, retains identity, and tolerates repeated stop | REQ-002, AC-002, MP-001/005 | `tests/integration/token-usage/providers/default-agent-run-event-pipeline-lifecycle.integration.test.ts` | combines the unit race/state checks with the installed package and actual ledger boundary |
| APIE2E-013 | two independent Node/package compositions initialize one SQLite vault; worker 1 is held inside initialization, worker 2 cannot cross the locked callback boundary, and both converge on one key/domain after release | AC-007, MP-003, TR-001 | `tests/e2e/secret-management/secret-vault-independent-process-initialization.e2e.test.ts` and `tests/e2e/secret-management/fixtures/secret-vault-initializer-worker.mjs` | directly restores the process/client boundary lost when the approved raw-client constructor seam was removed |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-004 | `tests/unit/app-data-migrations/custom-provider-v1-app-data-migration.test.ts` | replace raw constructor/disconnect with explicit package init/shutdown | AC-007, AC-012 | behavior assertions remain unchanged |
| APIE2E-005 | `tests/unit/secret-management/secret-vault-lifecycle.test.ts` | retain explicit global binding/no raw constructor seam, but rename the concurrency scenario so it claims only in-process package-owner scheduling | AC-007/009, MP-002/005, TR-001 | independent-process proof moves to APIE2E-013 |
| APIE2E-006 | token repository/store integration tests | explicit global init/shutdown; use root client as test observer/cleanup only | AC-003/004/012 | no production raw-client injection |
| APIE2E-007 | `tests/unit/config/prisma-import-lifecycle.test.ts` | remove obsolete token client-factory/injection expectations and prove package lifecycle | REQ-001/005/009, AC-012 | migration-owner injection remains valid and bounded |
| APIE2E-008 | `tests/unit/logging/prisma-query-log-policy.test.ts` | assert installed `1.0.9` | AC-010/011 | retain ESM/CJS and logging scenarios |
| APIE2E-009 | importer lifecycle E2E | explicit package rebind for reopen and failure cleanup | AC-007/008/009 | exact target plus hostile ambient URL |
| APIE2E-010 | token GraphQL/default-store E2E files and opt-in runtime harness | replace independent raw cleanup clients with explicit package initialization/root observer/shutdown | AC-002/003/008/009, MP-005 | keeps public API and optional live-runtime coverage executable under the current ownership contract |
| APIE2E-011 | execution-address backfill and legacy-column-drop E2E record repository setup | pass the existing isolated migration fixture client to bounded migration database/record owners and initialize isolated AppConfig for GraphQL status resolution | AC-012 bounded migration exception; broader regression validity | prevents accidental ambient configuration while preserving the normal GraphQL resolver ownership path |
| APIE2E-012 | direct per-turn delta-normalizer unit fixture | apply component-basis resolution before delta normalization | AC-003; design transformer order | replaces a stale test-only boundary bypass with the current production sequence |

## Durable Coverage To Remove

No complete test file is planned for removal. Obsolete scenarios in `prisma-import-lifecycle.test.ts` will be replaced in place; the removed assertions and replacements are inventoried above.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused Vitest run over the initial eight changed unit/integration files | worktree root; project global setup | explicit lifecycle conversions, installed package policy, transaction rollback, processor/default-pipeline state | Pass — 8 files, 58 tests | terminal result recorded in execution report |
| 2 | `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | worktree root | shared builds, Prisma generation, production TypeScript, sanitized built-module/bootstrap smoke | Pass | terminal result recorded in execution report |
| 3 | focused built-server/import/restart/provider secret E2E | isolated temp DB/key/ports | exact target, preview, successful/failed import cleanup, direct-use restart, GraphQL | Pass — 4 files, 10 tests | terminal result recorded in execution report |
| 4 | token integration/API/E2E run | project test SQLite plus isolated migration fixtures | token repository/store/GraphQL/statistics/safe integer/historical migrations | Initial Fail — 3 stale fixture/setup failures in 2 files; API/E2E-owned validity fixes applied | failure details and resolution recorded in execution report |
| 5 | rerun the two historical migration E2E files plus corrected direct-normalizer unit | isolated migration AppConfig/client | bounded migration ownership and production transformer sequence | Pass — 3 files, 5 tests | terminal result recorded in execution report |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run --no-watch` | entire server test inventory | broad regression signal | Non-gating broad Fail — 34 files/77 of 2,852 tests plus 6 unrelated unhandled errors; one changed-scope stale unit was fixed, remaining failures were outside the ticket diff/boundaries | failure-scope audit in execution report |
| 7 | final affected-scope Vitest run over 41 unit/integration/API/process files | project SQLite plus isolated temp paths/child servers | all changed and directly adjacent token, secret, importer, package, migration, GraphQL, restart, and lifecycle coverage | Pass — 40 files/225 tests; opt-in external-runtime file 3 tests skipped by documented environment flag | terminal result recorded in execution report |
| 8 | focused temporary changed-test TypeScript config | 16 changed paths without the repository's two known pre-existing opt-in/runtime test type errors | type safety of new and materially rewritten coverage | Pass | temporary config removed |
| 9 | package/version/naming/raw-bypass/schema/diff guards | worktree root and installed server dependency graph | exact `1.0.9`/Prisma `5.22.0`, no stale/link/patch path, empty schema diff, no old names/raw production clients, clean whitespace | Pass | terminal result recorded in execution report |
| 10 | round-2 focused independent-process initializer E2E | two independently initialized `repository_prisma` package instances in child processes; one isolated SQLite target | APIE2E-013, AC-007, MP-003, TR-001 | Pass — 1/1, plus five additional consecutive passes; two earlier harness-only failures exposed/closed a retained holder-stdin exit handle after correct behavior had completed | exact lifecycle/cleanup evidence is recorded in the execution report |
| 11 | round-2 affected secret/lifecycle rerun | focused vault unit plus secret/import/restart lifecycle E2E | APIE2E-003/004/005/007/009/013 and adjacent regression coverage | Pass — focused 2 files/14 tests; affected 8 files/43 tests | exact commands/results are recorded in the execution report |

## Latest Post-Rerun Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | all critical ACs map to source review plus SQLite/package/API/process evidence; APIE2E-013 directly closes `AC-007`/`MP-003` | delivery-only refresh/release excluded | proportional test-code re-review |
| Changed-boundary execution directness | 99% | actual installed package, distinct child-process clients, one SQLite target, real BaseRepository/vault operations and transaction callback events | none material | none |
| Cross-boundary integration realism and mock gap | 98% | installed package → Prisma 5.22 → SQLite across separate Node processes, plus GraphQL/restart/importer execution | external LLM networking immaterial and opt-in | none |
| Environment, configuration, identity, and fixture fidelity | 97% | exact file URLs, fresh isolated DB/key directories, hostile ambient target, actual child processes, cleanup audit | macOS arm64 only | none for ticket |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | rollback, interruption, independent contention/release, repeated/late stop, failed import cleanup/rebind, verify-only stability | none material | none |
| User-surface, browser, and desktop-shell confidence | N/A | no frontend/browser/desktop surface changed | none | none |
| Durable regression coverage quality and relevance | 97% | stale same-client labeling was narrowed; focused process/helper coverage is durable and requirement-linked; 5/5 repeat signal | proportional reviewer recheck remains downstream | code reviewer test-code review |

- Overall post-rerun confidence: **98.0%**
- Calculation method: arithmetic mean of six applicable categories
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: none within the ticket; unrelated repository-wide baseline failures, macOS-only execution, and credential-dependent external runtime skips remain explicitly bounded.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle`, `Live API`, and `CLI/package probe` through repository-resident built-server/SQLite E2E.
- Specific confidence gap or residual risk addressed: process-global lifecycle rebinding, deferred event drain, cross-process restart, byte-stable established data, exact importer target/failure cleanup, and installed-package behavior cannot be established by source review or mocked unit tests alone.
- Why the selected mode can materially improve confidence: it crosses the real Node process, built server, Prisma engine, SQLite filesystem, GraphQL, and installed package boundaries while retaining deterministic isolated fixtures.
- Expected confidence after selected validation: at least 95% overall with no category below 90%, provided every critical scenario passes.
- Browser-specific decision and rationale: browser execution is not required because no frontend or browser boundary changed and it would be less direct than the repository's GraphQL, built-server, lifecycle, and SQLite E2E.
- If `Not Required`: N/A.
- If `Blocked`: N/A.
- Execution outcome: completed successfully through repository-resident live process/API/lifecycle E2E, including the round-2 independent-process scenario; final confidence is recorded in the execution report.

## Live Environment And Fixture Plan

- Startup order and commands: build shared/server packages; let existing E2E helpers start the compiled server against per-test paths and ports; await their readiness probes; terminate only test-owned children.
- Environment choices: project test SQLite URL for suites; per-test explicit `file:` URLs for global-lifecycle tests; hostile ambient URL for importer authority; default logging unless the policy scenario intentionally opts in.
- Health/readiness checks: existing built-server GraphQL/HTTP readiness helpers and explicit SQLite query/metadata assertions.
- Seed data/fixtures: minimal token rows and one or more encrypted secret entries; established restart fixture; importer dry-run and batch fixtures.
- Identities/authentication/permissions/session state: no external identity required; public/internal test GraphQL harness.
- Requirement-linked journeys: APIE2E-001 through APIE2E-013 plus existing token/secret GraphQL and restart scenarios.
- Evidence: Vitest output, filesystem hashes/mtime/data version/WAL assertions, package metadata/import output, and cleanup assertions.
- Owned cleanup: shutdown global Prisma, close vaults, terminate child processes, and remove only test-created temp directories/databases/keys.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-T01 | sanitized production build/bootstrap smoke plus installed package probe | compiled module/import/package behavior matches source lifecycle | build/package hygiene is not a user journey and is best retained as command evidence |
| APIE2E-T02 | structural/version/schema/diff scans | absence of prohibited seams or generated drift | repository layout/package hygiene is clearer as report evidence than behavior test |
| APIE2E-T03 | temporary focused TypeScript configs for the round-1 16-file changed scope and round-2 process E2E | new/materially rewritten test code typechecks despite the repository `rootDir` limitation | project configuration, not an enduring alternate test command; files removed after use |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Browser/desktop UI | no changed surface | none | none |
| multi-node/distributed database ownership beyond same-host SQLite process contention | approved architecture does not define a remote/distributed coordination protocol; `MP-003` is bounded to separate normal processes sharing one SQLite target and is now planned under APIE2E-013 | negligible beyond the explicitly tested boundary | none |
| live third-party provider credentials | persistence/lifecycle paths use deterministic local/provider fixtures and do not change provider networking | negligible for this ticket | none |
| publication/tagging/remote refresh | delivery-owned and explicitly excluded from this stage | none for executable correctness | delivery engineer |

## Ambiguities Or Reroute Triggers

No requirement/design ambiguity exists in round 2: `MP-003` explicitly names the required separate-process/same-SQLite path. `TR-001` was an API/E2E-owned durable coverage correction. Its implementation-defect reroute condition did not occur: APIE2E-013 proved that worker 2 stays outside the callback while worker 1 is held and that both independent compositions reach `READY` after release.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add and update; no entire file removal planned
- Post-rerun confidence: **98.0%**
- Broader validation decision: `Required` and completed successfully
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: round 2 was recorded before the TR-001 durable edit and updated after execution. The prior same-client independent-initializer claim remains withdrawn; APIE2E-013 now supplies the direct separate-process proof. Focused, 8-file affected-scope, 5-repeat, build/type/syntax/diff, and cleanup checks pass.
