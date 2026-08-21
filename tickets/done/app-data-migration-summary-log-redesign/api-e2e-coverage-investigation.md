# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/design/production_data_migration_conventions.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`; round 2 executes against its integrated current-base worktree while finalization is held for user verification.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: Explicit user request on 2026-08-21 to add the README-documented packaged Electron check after the completed round-1 browser/API/E2E pass.
- Prior Investigation Reviewed: Round 1 in this file, plus `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign/api-e2e-execution-coverage-report.md` and `API-REV-001`.
- Latest Authoritative Investigation: This file, round 2.

## Current Requirement And Design Basis

The changed contract has four linked obligations. Current migration attempts must persist and expose exactly one runner-formatted string, `Scanned {scanned}; migrated {migrated}; skipped {skipped}; failed {failed}.`, with no database/API/UI count fields or item details (`REQ-001`–`REQ-009`, `AC-001`–`AC-009`). The existing rich execution result and `writeLog()` remain the sole count/detail diagnostic path, and the returned path remains terminal record metadata (`REQ-010`–`REQ-013`, `AC-010`–`AC-013`). A released `summary_json` database must be transformed by the actual transactional Prisma/SQLite startup migration before current runtime; invalid released data must roll back without a runtime fallback (`REQ-014`–`REQ-018`, `AC-014`–`AC-018`). Existing registry, prerequisite, attempt, stale-running, retry, startup selection, recovery action, and feature-gate behavior remains unchanged (`REQ-019`, `AC-019`).

`IR-001` and `CRR-001` confirm the rich definition/log contract is preserved while current Prisma/repository/GraphQL/web contracts are string-only. API/E2E must therefore remove obsolete assertions that treat database/API summary detail as current behavior, but must retain or replace their operational intent with assertions against the referenced attempt log.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / runner to database | Changed | `REQ-001`–`REQ-006`; `DS-001`–`DS-003`; `IR-001` | Execute real runner outcomes and assert exact scalar summaries plus preserved terminal metadata. |
| `BEH-002` / repository -> GraphQL -> web | Changed | `REQ-007`–`REQ-009`; `DS-005`; `CRR-001` | Exercise actual GraphQL schema/response and the Settings renderer without rich-summary fixtures. |
| `BEH-003` / attempt log | Preserved | `REQ-010`–`REQ-013`; `SR-004`; `DS-003` | Move E2E detail assertions from API summary objects to the file at `logPath`; compare the log count header with the scalar API summary. |
| `BEH-004` / released database startup | Changed | `REQ-014`–`REQ-018`; `DS-004`; migration convention | Use an isolated released-shape database whose migration history stops before the summary redesign, start the real built server, and inspect the migrated database and API. |
| Runner lifecycle/recovery | Preserved | `REQ-019`; `AC-019`; implementation and code review | Retain the existing startup/relaunch/failure/retry scenarios and rerun them after current-contract fixture correction. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Runner projection of four independent counts to one string | Formatter and runner unit tests | Mock repository does not prove built-server startup/API | Actual-startup E2E |
| API / transport / contract | Yes | GraphQL `summary` changed from JSON to nullable `String` | GraphQL unit test and generated client diff | Real schema/client response agreement | Built-server GraphQL E2E |
| Frontend component / state | Yes | Settings renders the stored string and removes detail expansion | Focused component/store tests | Real backend/client/render integration | Browser against owned backend/frontend |
| Browser integration / user journey | Yes | Settings Migrations status presentation | Implementation used intercepted browser data | Actual GraphQL response was not used in that render | Browser broader validation |
| Authentication / session / permissions | No | Migration status surface is not changed in this dimension | Existing local Settings/API behavior | None introduced by this ticket | None |
| Desktop renderer / web-equivalent UI | Yes | The Electron renderer uses the same Nuxt Settings surface | Nuxt component tests | Renderer-to-live-backend integration | Browser-preferred web-equivalent validation |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or updater change | Source diff and design | None | None; actual Electron is unjustified |
| Process / lifecycle | Yes | Prisma deploy precedes current runner; relaunch remains idempotent | Migration integration plus existing E2E lifecycle | Actual built process over released DB | Actual-startup/relaunch E2E |
| Persisted-data transition | Yes | Transactional `summary_json` -> `summary` rewrite/rename | Real-Prisma integration matrix | Same transition followed immediately by current runtime/API | Actual-startup E2E |
| Worker / queue / distributed coordination | No | No worker/queue coordination changed | Design and diff | None | None |
| External integration | No | No external provider access is required | Deterministic local fixtures | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Project type and runtime stack: pnpm monorepo; Node.js/TypeScript Fastify + TypeGraphQL + Prisma 5.22 + SQLite backend; Nuxt/Vue/Pinia frontend; Vitest; Playwright Core available for browser probes.
- Conflicting, missing, or unclear project instructions: No material conflict. Server `AGENTS.md` requires `vitest run`/`--no-watch`; web `AGENTS.md` requires `--run`; root README separates deterministic E2E from external-provider live E2E. Broad server `tsconfig.json` and standalone Nuxt typecheck have upstream-recorded baseline/tool-bootstrap limitations and are not substituted for the documented production build paths.
- Required environment variables or secrets available: `N/A`; deterministic local fixtures and the tracked credential-free test environment are sufficient. No provider secret or live user profile is required.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; avoid watch mode. |
| `autobyteus-web/AGENTS.md` | Closest frontend instruction | Use `pnpm test:nuxt ... --run`; browser development is the preferred web-equivalent renderer path. |
| Root `README.md`, Local full-stack development / E2E | Repository runtime authority | `pnpm dev` starts built backend and Nuxt; `pnpm test:e2e` runs isolated deterministic server E2E; external live providers are separate and must not be implied. |
| `autobyteus-server-ts/README.md`, Production data migrations | Server/startup authority | Startup runs `prisma migrate deploy`; use isolated synthetic fixtures, never a user's live database; current runtime is forward-only. |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Canonical persisted-transition rules | Real adapter, disposable DB, exact source validation, transactional rollback/source preservation, no legacy runtime fallback. |
| Root/server/web `package.json` | Executable scripts | Server build/typecheck/test scripts; root deterministic E2E; Nuxt build/test/dev scripts. |
| `autobyteus-server-ts/vitest.config.ts` and `tests/setup/*` | Test runtime | Serialized forks, Prisma test DB setup/reset, tracked test environment. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Built-server E2E ownership | Safe test database/runtime roots, sanitized environment, free loopback port, readiness, owned process stop and cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | Worktree root | `pnpm -C autobyteus-server-ts build` | Generates current Prisma client and `dist/app.js` | Exit 0 and built bootstrap smoke | No process |
| Deterministic E2E | Worktree root | `pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch` then `pnpm test:e2e` | Test-owned DB/runtime only; no live profile | Vitest results and built-server `/rest/health` assertions | Test `afterEach` stops owned children and removes roots |
| Nuxt focused tests/build | `autobyteus-web` | `pnpm test:nuxt <files> --run`; `pnpm build` | No external account | Exit 0 | No process |
| Browser broader validation | Worktree using documented dev path or equivalent owned free-port services | Start owned built backend + Nuxt; run Playwright Core temporary probe | Use isolated app-data root/database; no desktop shell | HTTP health, Settings DOM, actual GraphQL response | Terminate only owned processes and remove owned temporary state |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Released app-data ledger | Update the existing TeamRun E2E fixture to materialize the released `summary_json` schema/migration-history state in its already isolated database | Must not use `~/.autobyteus/server-data`; preserve production-profile metadata sentinel | Existing `removeOwnedTestRuntime` cleanup |
| Rich execution diagnostics | Existing registered migration fixtures and attempt logs under the owned runtime root | Assertions move from API summary details to the stored `logPath` | Removed with owned runtime |
| Browser statuses | Clean isolated backend startup creates deterministic migration records | No identity/auth secret required | Remove owned development/test root and browser evidence after retaining report evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: `design-spec.md` **Persisted Data / State Transition Decision**, `DS-004`, and `implementation-handoff.md` **Persisted Data Transition Check**.
- Representative existing-data setup and required behavior: A released table with `summary_json` values containing the four nonnegative integer counts and cardinality-sized `details[]`, plus status/attempt/timestamps/error/log path and a pre-existing log byte sentinel. Current startup must rewrite/rename before repository initialization, expose the canonical string, keep other metadata and the log unchanged, and retain no current database detail document.
- Evidence planned for the approved migration outcome: Existing disposable real-Prisma valid/large/null/fresh/invalid matrix, plus an updated built-server E2E that begins from the released ledger, runs actual startup deployment, inspects current columns/rows, queries GraphQL, and relaunches.
- Migration-specific completion/recovery scenarios: Valid released transition and idempotent relaunch in E2E; invalid source rollback/source preservation remains directly covered by the focused real-Prisma integration matrix because starting current runtime is correctly impossible in that case.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` / actual startup, relaunch, warning, token-retry paths | Strong actual-process lifecycle coverage, but seeds through removed Prisma `summaryJson`, selects `summary_json` after current deploy, expects rich GraphQL summary details, and asserts a database/API value remains larger than 64 KiB | `BEH-001`–`BEH-004`; `AC-001`–`AC-019` | `Needs Update` | Those specific fixtures/assertions contradict approved string-only current behavior; the startup/relaunch/system journey remains valuable and is the best existing home for released-DB-to-current-runtime proof | Convert setup to a genuine released-schema ledger, assert actual startup transition/current GraphQL string, compare summary with log counts, move detail evidence to `logPath`, preserve lifecycle scenarios |
| `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` / current registered-migration statuses | Queries actual GraphQL but models/inspects rich `summary.details` and count properties; its readable-provider scenario also reads the deleted legacy token event after the already-released token run-record consolidation | `REQ-007`–`REQ-012`; `DS-003`, `DS-005`; current-base token run-record contract recorded throughout the upstream package | `Needs Update` | GraphQL now exposes nullable `String`; rich execution details remain current only in the attempt log. First execution after the summary correction exposed `NotFoundError: No TokenUsageLedgerEvent found`, while the startup migration correctly produced the current `TokenUsageRunRecord` | Change status DTO/query to scalar summary + `logPath`; retain detail assertions against the referenced log; read preserved provider/model identity from the current run record rather than the intentionally consumed legacy event |
| `autobyteus-server-ts/tests/integration/app-data-migrations/app-data-migration-summary-schema-migration.integration.test.ts` | Real Prisma deploy of large valid/null/fresh and invalid rollback fixtures | `REQ-014`–`REQ-018`; `AC-014`–`AC-018`; `DS-004` | `Still Valid` | Uses the migration-owned historical fixture boundary intentionally; current-runtime legacy knowledge is not retained | Rerun unchanged |
| `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | Exact returned/thrown canonical persistence, unchanged log bytes, lifecycle/recovery behavior | `REQ-001`–`REQ-013`, `REQ-019` | `Still Valid` | Direct requirement-linked assertions at the owner boundary | Rerun focused and broader app-data unit scope |
| Formatter/repository/GraphQL unit tests | Exact wording, current scalar CRUD, GraphQL `String` | `REQ-001`–`REQ-009` | `Still Valid` | Direct current-contract seams | Rerun |
| `autobyteus-web` store/component Settings tests | String store shape and direct Settings rendering | `REQ-007`–`REQ-009`; `AC-007`–`AC-009` | `Still Valid` | Current-contract fixtures; no detail expansion | Rerun; supplement with browser/live backend |
| Other migration-definition unit/E2E tests whose `result.summary` remains counts/details | Definition execution and log-source contract | `REQ-010`–`REQ-012`; preserved boundary | `Still Valid` | The rich internal result is explicitly current, not compatibility behavior | Retain; do not rewrite internal result assertions |
| Electron shell tests | Shell/process behavior unrelated to this contract | None | `Out Of Scope` | No shell-specific source changed | Do not run actual desktop |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| TeamRun production-upgrade E2E / historical audit helper | Current API/DB retains rich details and exceeds 64 KiB | Database/API detail duplication is the defect intentionally removed | `REQ-001`, `REQ-004`, `REQ-005`, `REQ-007`, `REQ-014`–`REQ-017`; `SR-004`; `ARCH-REV-002` | Assert short canonical API/DB string plus byte-exact unchanged attempt log and path | N/A |
| TeamRun production-upgrade E2E / warning assertions | `status.summary.details` contains failed items | Details are no longer in the status contract | `REQ-007`, `REQ-010`, `AC-007`, `AC-010` | Read the same item diagnostics from `status.logPath`; compare log counts with scalar summary | N/A |
| Custom-provider startup E2E / readable/V1 detail assertions | GraphQL `summary.details` ordering/content | GraphQL current field is scalar; diagnostic ordering remains a log concern | `REQ-007`–`REQ-012`; `DS-003`, `DS-005` | Read and parse current attempt-log detail lines through `logPath` | N/A |
| Custom-provider startup E2E / token identity assertion | Reads `TokenUsageLedgerEvent` after startup has successfully consolidated/deleted legacy events | The current base intentionally stores one `TokenUsageRunRecord` per canonical run after this startup sequence | Current-base implementation, TeamRun production-upgrade E2E, and the observed `NotFoundError` after successful startup | Assert the same provider/model identity through `TokenUsageRunRecord.latest*` fields | N/A |

## Durable Coverage To Add

No new standalone durable file is planned. The strongest existing actual-startup scenario will be expanded to cover the released summary migration and current runtime boundary rather than duplicating its expensive setup.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `AE2E-001` | TeamRun released production upgrade, supported and warning/relaunch cases | Start from released `summary_json`; force current startup migration; assert current column, exact compact API/DB summary, unchanged metadata/log, no API details, and relaunch immutability | `AC-001`–`AC-019`; `DS-001`, `DS-003`–`DS-005` | Retains the original broader lifecycle value |
| `AE2E-002` | TeamRun token-consolidation failure/restart paths | Replace historical rich-summary preservation with canonical-summary/log preservation | `REQ-003`, `REQ-007`, `REQ-010`–`REQ-013`, `REQ-019` | Preserve recovery behavior |
| `AE2E-003` | Custom-provider readable-ID actual startup cases | Treat GraphQL summary as string; use `logPath` for detail ordering/content; read post-consolidation provider/model identity from the current run record | `AC-007`, `AC-010`, `AC-011`, `AC-019`; current-base token run-record contract | Prevents both stale status-summary and stale token-ledger assertions from remaining |

## Durable Coverage To Remove

No file or operational scenario should be removed. Only obsolete rich database/API assertions will be replaced at the correct log boundary.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/app-data-migration-summary-formatter.test.ts tests/unit/app-data-migrations/app-data-migration-record-repository.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts tests/unit/api/graphql/types/app-data-migrations.test.ts tests/unit/server-runtime-app-data-migration-gate.test.ts --no-watch` | Worktree root | Narrow current formatter/repository/runner/GraphQL/lifecycle seams | Pass — 5 files / 34 tests | `api-e2e-evidence/01-focused-server-unit.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/app-data-migrations/app-data-migration-summary-schema-migration.integration.test.ts --no-watch` | Worktree root; disposable Prisma DBs | Valid/large/null/fresh and invalid rollback schema transition | Pass — 1 file / 7 tests | `api-e2e-evidence/02-prisma-migration-integration.log` |
| 3 | `pnpm -C autobyteus-server-ts build` | Worktree root | Production build/current generated Prisma and built startup entry | Pass | `api-e2e-evidence/03-server-build.log` |
| 4a | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | Worktree root; owned released-shape databases/runtime/processes | Actual startup summary migration, current GraphQL/log fan-out, relaunch, recovery | Pass — 1 file / 4 tests | `api-e2e-evidence/04a-team-run-production-upgrade-e2e.log` |
| 4b | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts --no-watch` | Worktree root; owned runtime/DB/processes | Actual GraphQL scalar/log path and other current migration interactions | Fail — 3 passed / 1 failed; summary/log assertions passed, but a stale unrelated legacy token-event read found no row after successful current run-record consolidation | `api-e2e-evidence/04b-custom-provider-startup-e2e.log`; coverage corrected locally before rerun |
| 4c | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts --no-watch` | Worktree root; owned runtime/DB/processes | Corrected current run-record identity assertion plus actual GraphQL scalar/log-path behavior | Pass — 1 file / 4 tests | `api-e2e-evidence/04c-custom-provider-startup-e2e-rerun.log` |
| 5 | `pnpm test:e2e` | Worktree root | Broader deterministic built-server E2E regression | Relevant scenarios pass, but aggregate command exits 1 on four unrelated current-base files: 3 failed tests and 1 load failure; 47 files / 176 tests pass, 14 files / 51 tests skip. None of the failing files overlaps the ticket diff or app-data migration contract. | `api-e2e-evidence/05-full-deterministic-server-e2e.log` |
| 6 | `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/ServerMigrationsManager.spec.ts stores/__tests__/appDataMigrationsStore.spec.ts --run` | Worktree root | Current client/store/component contract | Pass — 2 files / 5 tests | `api-e2e-evidence/06-focused-web.log` |
| 7 | `pnpm -C autobyteus-web build` | Worktree root | Production frontend integration/build | Pass — Nuxt client/server build and 15-route prerender complete; chunk-size warning only | `api-e2e-evidence/07-web-build.log` |
| 8 | `git diff --check` and targeted obsolete-contract scans | Worktree root | Coverage/source hygiene and no stale current-runtime API fixture | Pass; legacy summary-field references are absent from current app-data runtime/API/web paths and confined to the released-schema setup/assertions in the updated production-upgrade E2E | `api-e2e-evidence/08-hygiene.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | All `AC-001`–`AC-019` map to passing focused unit, real-Prisma, or actual-startup scenarios; the exact string, metadata, log fan-out, migration rollback, lifecycle, and recovery obligations are directly asserted. | No critical criterion is missing; only the live UI join remains outside repository test execution. | Execute `AE2E-BROWSER-001`. |
| Changed-boundary execution directness | 98% | Built-server E2E executes actual startup migration, SQLite, runner, repository, GraphQL and relaunch; focused tests directly cover formatter and web owners. | Browser presentation has not yet consumed that actual response. | Execute the owned browser journey. |
| Cross-boundary integration realism and mock gap | 94% | Real SQLite/startup/GraphQL E2E and separately passing Nuxt store/component/build evidence cover both sides. | The repository web tests mock Apollo/store data, so the backend-to-render join remains indirect. | Browser against actual backend/frontend. |
| Environment, configuration, identity, and fixture fidelity | 97% | Project harness uses sanitized environments, isolated safe roots/free ports, actual Prisma deployment, released schema/history, built server, and real log files; custom-provider identity is checked in the current store. | No external/profile fidelity is needed; browser services still need an owned isolated run. | Use the documented endpoints/configuration on non-colliding free ports and clean all owned resources. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Seven-case real migration matrix covers large/null/fresh/invalid rollback; actual-startup E2Es cover warnings, prerequisite failure, relaunch retry, failed item diagnostics, and idempotence. | Broader server suite has four unrelated current-base failures, recorded as residual regression noise rather than ticket-path failure. | Browser is not needed for backend failures; retain the broad-suite residual explicitly. |
| User-surface, browser, and desktop-shell confidence | 90% | Direct component rendering, no-`details` assertion, store mapping, production Nuxt build, and route shell tests substantially prove the web-equivalent surface. No shell boundary changed. | No browser has yet consumed live GraphQL data. | Execute `AE2E-BROWSER-001`; actual Electron remains unjustified. |
| Durable regression coverage quality and relevance | 97% | Stale rich-contract assertions were identified before edits and replaced in their existing actual-startup scenarios; focused reruns pass and no redundant file was added. | Proportional code review of the two updated durable files remains required after API/E2E. | Return through `/code_reviewer` after execution. |

- Overall post-repository confidence: `96.0%` (`672 / 7`)
- Calculation method: Simple average of the seven applicable category scores after execution; no category will be hidden by the average.
- Every critical acceptance criterion directly proven: `Yes at its owning backend/API/migration boundary`; the browser journey remains required to eliminate the separate live frontend/backend integration gap.
- Any applicable category below `90%`: `No`; user-surface confidence is exactly `90%` before broader validation.
- Default clean-confidence target of `95%` met: `Numerically yes`, but the selected browser validation remains required because the live web join is a material broader-validation risk.
- Material residual risks: Preserved source-cardinality-sized attempt logs and no guaranteed immediate physical SQLite file shrink are approved residuals, not validation failures. The aggregate deterministic E2E command also has four unrelated current-base failures: missing Codex bootstrap module in `agent-package-private-skills`, incomplete app-config mock in `server-owned-media-tools`, stale `coordinatorMemberRouteKey` selection in workspace history, and a workspace removal expectation mismatch. The ticket's changed E2Es pass both focused and within that broad run.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser`
- Specific confidence gap or residual risk addressed: Real GraphQL scalar response -> generated/client store -> Settings rendering has only separate server E2E and mocked component evidence; the user-facing detail-removal/string presentation boundary is changed.
- Why the selected mode can materially improve confidence: A browser against an owned actual backend/frontend proves the web-equivalent renderer consumes the real current schema, displays canonical summary text and log-path/status metadata, and exposes no obsolete detail disclosure.
- Expected confidence after the selected validation: At least `95%` overall with no applicable category below `90%`, assuming all critical repository and browser scenarios pass.
- Browser-specific decision and rationale: Required for the changed web-equivalent Settings surface. Actual Electron is not required because no shell-specific behavior changed.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`
- Execution status: `Completed — Pass` on rerun. The live response contained 16 canonical summary strings; the DOM showed the exact selected summary and its `logPath`, retained them after a 200 Refresh request, and contained zero `<details>` elements. Evidence: `api-e2e-evidence/09-settings-live-browser.json`, `09-settings-live-browser.png`, and `09b-settings-live-browser-rerun.log`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, root `README.md` Local full-stack development.
- Web-equivalent behavior: Settings -> Server Settings -> Migrations query/render/status/error/log/retry presentation.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach and why it fits the project: Round 1 used the browser to prove the changed renderer/backend contract. At the user's explicit request, round 2 supplemented it with the repository's host-native packaged Electron Playwright launcher.
- Server/frontend setup when browser validation is used: Owned isolated backend database/data root plus Nuxt development or preview server on verified free loopback ports.
- Effect on any already-running desktop application: `None`; no production profile or existing process will be used or stopped.
- Behavior not directly proven and confidence consequence: Round 2 directly proved package creation, main/preload/renderer inclusion, bundled-backend readiness, and first-window creation. The packaged smoke does not itself navigate the Migrations table, so the round-1 live browser assertions remain the direct ticket-specific UI evidence.

## Live Environment And Fixture Plan

- Startup order and commands: Build server; start an owned built server over an isolated test database/data root; start Nuxt on an available loopback port pointed at that backend using the repository-supported development configuration; run Playwright Core.
- Environment choices that materially affect the run: Test/development mode, SQLite, sanitized environment, free ports, isolated app-data root; no external credentials.
- Health / readiness checks: Backend `/rest/health`; frontend HTTP success; GraphQL `getAppDataMigrations` returns scalar summaries.
- Seed data / fixtures: Normal clean startup migration records; if needed, one deterministic failed/retryable current record created through the owned test database before browser launch, never in a live profile.
- Test identities, authentication, permissions, or session state: None required for local Settings migration status.
- Requirement-linked journeys or scenarios: Open Settings Migrations; observe scalar summary and metadata; assert no `<details>`/rich item content; verify Refresh; exercise Retry only if a safe deterministic current record is available.
- DOM, screenshot, log, API, process, or other evidence to capture: Semantic DOM text and control state, actual GraphQL payload, screenshot, backend/frontend process logs.
- Owned processes and temporary state to clean up: Backend child, Nuxt child, browser context, isolated database/data root, temporary probe script if created.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `AE2E-BROWSER-001` | Temporary Playwright Core probe against owned actual backend/frontend | Current scalar response renders in Settings with no detail disclosure and preserved metadata | Repository currently has no general Settings-live-backend browser harness; this one-time integration probe is ticket-specific, while durable server E2E and component tests own the repeatable boundaries |

### Broader Validation Execution Notes

- Initial `AE2E-BROWSER-001` attempt reached the owned backend, Nuxt route, actual migration table, and exact live summary string, then failed only on the temporary probe's heading literal: it expected `Application Data Migrations`, while the authoritative English catalog renders `App Data Migrations`.
- This is a `Local Fix` to the ticket-local probe, not a product or durable-coverage failure. The probe expectation is corrected to the catalog value before rerun. The first attempt cleaned its owned browser, frontend, backend, runtime root, database, and key through `finally`.
- Nuxt emitted transient `#app-manifest` pre-transform diagnostics while rebuilding development artifacts after the preceding production build, but completed client/server/Nitro startup and rendered the target route. The rerun remains responsible for a clean semantic result rather than treating startup noise as a pass.
- Corrected rerun: `Pass`. Chrome/Playwright exercised the actual Nuxt development route against the owned built server on free ports. All 16 GraphQL summaries were strings matching the canonical format; exact summary, migration ID, and log path were visible; Refresh returned 200; no details control, target request failure, or browser-console warning/error occurred. Screenshot and structured evidence were retained, while browser, frontend, backend, runtime, database, key, and listeners were cleaned.

## Final Confidence After Round 2 Supplemental Validation

| Confidence Category | Post-Repository | Final | Evidence Gained / Residual Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 98% | Browser confirms the already-direct API/UI acceptance mapping; only approved residual storage characteristics remain. |
| Changed-boundary execution directness | 98% | 98% | Material backend boundaries were already actual-process; browser now also consumes their output directly. |
| Cross-boundary integration realism and mock gap | 94% | 98% | Actual built server -> GraphQL -> Nuxt proxy/Apollo/store -> rendered DOM and Refresh eliminates the material mock gap. |
| Environment, configuration, identity, and fixture fidelity | 97% | 97% | Browser resources and packaged-launch E2E profile both used owned roots/free ports and cleaned successfully. The advertised default package-build entrypoint currently targets `ALL` rather than the host and remains a disclosed tooling residual. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | 98% | Browser success does not change the already-strong rollback/retry/relaunch evidence; unrelated broad-suite failures remain disclosed. |
| User-surface, browser, and desktop-shell confidence | 90% | 99% | Semantic browser assertions prove the Settings journey; the host-native package then built and its packaged first Electron window and bundled backend became ready through Playwright. |
| Durable regression coverage quality and relevance | 97% | 97% | No durable coverage changed in round 2; the round-1 durable E2E edits already passed proportional review at `CRR-002`. |

- Overall final confidence: `97.9%` (`685 / 7`)
- Critical acceptance criteria directly proven: `Yes`
- Final applicable category below `90%`: `No`
- Default `95%` confidence target met: `Yes`
- Final residuals: The default packaged E2E command does not currently perform its promised host-native build because `build:electron` reaches an `ALL` target; the explicit macOS build plus `--skip-build` launcher passes. The broad deterministic server command still reports four unrelated current-base failures; attempt logs may remain cardinality-sized; SQLite physical files do not immediately shrink without `VACUUM`. None contradicts a ticket acceptance criterion.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron navigation to the Migrations table | The checked-in packaged smoke validates readiness and first-window creation but does not expose a journey hook for route/DOM assertions | Bounded; the same Settings surface passed against a live backend in Chrome | Retain browser evidence; a future durable packaged journey could extend the launcher if shell-specific UI proof becomes required |
| External provider live E2E | No external integration is changed and deterministic fixtures prove the boundary | None for this ticket | None |
| User production profile/database | Automated migration proof against live user data is forbidden | None; synthetic released fixture is the correct evidence | None |
| Immediate SQLite file shrink | Explicitly outside approved scope; no `VACUUM` | Physical file may not shrink immediately | Preserve as documented residual |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Custom-provider E2E read an intentionally consumed legacy token event after startup consolidation | `Local Fix` (durable coverage) | `04b-custom-provider-startup-e2e.log`; current base and the passing TeamRun consolidation scenarios prove the target is `TokenUsageRunRecord` | API/E2E engineer corrected the test locally; no upstream reroute |
| Initial live-browser probe expected a non-catalog heading literal after already finding the exact live summary | `Local Fix` (temporary probe) | `09-settings-live-browser.log`; `autobyteus-web/localization/messages/en/settings.ts` defines `App Data Migrations` | API/E2E engineer corrects the ticket-local probe and reruns; no upstream reroute |

## Round 2 Packaged Electron Supplemental Investigation

- Prior authoritative result: `API-REV-001 — Pass / 97.7%`.
- New requested evidence: Build and launch the current-worktree host-native packaged Electron application through the repository's documented isolated Playwright adapter.
- Instruction basis: Root `README.md` **Packaged Electron API/E2E testing**, `autobyteus-web/README.md` **Packaged Electron E2E Launches**, `autobyteus-web/docs/electron_packaging.md` **Packaged E2E Launch Profile**, and `autobyteus-web/package.json` script `test:e2e:electron`.
- Exact planned command and working directory: `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --adapter playwright` from `autobyteus-web`.
- Coverage classification: `Use Temporary Executable Probe Only`; no repository-resident durable test edit is required. The checked-in launcher is already the durable mechanism.
- Direct evidence expected: `build:electron` produces the current host package; the launcher selects a safe free non-production port and owned temporary data root; the packaged main process starts its bundled backend under the explicit E2E profile; readiness succeeds; Playwright observes the first Electron window; cleanup confirms the owned process tree and temporary root are gone.
- Confidence value: This is materially more end-to-end for packaging, Electron main-process startup, embedded-server routing, and packaged renderer creation than the browser journey. It does **not** replace `AE2E-BROWSER-001` for the ticket-specific Settings summary assertions because `run-electron-e2e.mjs` only waits for readiness and the first window; it does not navigate or assert the Migrations table.
- Safety: The launcher owns its selected process tree/root, rejects production port `29695` and unsafe roots, disables updater side effects in E2E mode, and must not affect any already-running desktop application.
- Durable coverage changes planned: `None`.
- Execution status: First documented-command attempt `Fail before packaging/launch`. Guards, server preparation, mobile generation, Electron renderer/main/preload generation, and native-module rebuild passed, but `pnpm build:electron` invoked `node build/dist/build.js` without a host flag. The build script defaults that invocation to `ALL`, calls the Linux target first, and correctly rejects Linux packaging on the current Darwin/arm64 host. Therefore no package was launched. Evidence: `api-e2e-evidence/10-packaged-electron-playwright.log`.
- Preliminary classification: `Local Fix / existing packaging-launcher configuration mismatch`, outside the ticket implementation. The README and `prepareElectronE2ELaunch()` promise a host-native default build, while the current default `build:electron` script reaches the build tool's `ALL` default. This is not evidence against the migration-summary change.
- Safe continuation plan recorded before retry: Use the repository's explicit host script `env -u ELECTRON_RUN_AS_NODE pnpm build:electron:mac`, then run the same packaged launcher as `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --skip-build --adapter playwright`. This preserves the intended exact current-worktree artifact, isolated E2E launch profile, readiness, first-window, and cleanup checks while avoiding unsupported cross-platform packaging. The default-command mismatch remains a disclosed residual even if the host-specific retry passes.
- Host-specific build result: `Pass`. Boundary/localization guards and literal audit passed; server and bootstrap smoke passed; bundled server deployment, Prisma generation, Electron native-module rebuild, Electron renderer/main/preload generation, and unsigned Darwin/arm64 DMG/ZIP packaging completed. Evidence: `api-e2e-evidence/10b-packaged-electron-mac-build.log`.
- Packaged launch result: `Pass`. Playwright launched `/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus`; the bundled server became healthy at `http://127.0.0.1:49629/rest/health`; the first Electron window was observed; the launcher returned `electron-e2e-ready`. Evidence: `api-e2e-evidence/10c-packaged-electron-playwright-skip-build.log` and `10-packaged-electron-result.json`.
- Cleanup result: `Pass`. The owned temporary root was removed, port 49629 had no listener, and no matching packaged process remained. Packaged build artifacts were intentionally retained. Evidence: `api-e2e-evidence/10d-packaged-electron-cleanup.log`.
- Round 2 result: `Pass with disclosed existing tooling residual`; no ticket requirement failed and no durable coverage changed. Final confidence: `97.9%`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Round 1 `Yes` — two updated E2E files already reviewed at `CRR-002`; round 2 `No`.
- Post-repository confidence: `96.0%`
- Broader validation decision: Round 1 required browser and passed; round 2 user-requested packaged Electron supplement passed through the explicit host build and isolated Playwright launch. Final confidence `97.9%`.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Latest API/E2E result is `Pass with disclosed existing tooling residual`. No durable coverage changed in round 2. The cumulative package returns through `/code_reviewer`, which may record the round-2 durable-test review as `Not Applicable`, before delivery resumes.
