# API/E2E Coverage Investigation

## Metadata

- Ticket: `canonical-identity-startup-recovery`
- Investigation owner: API/E2E engineer
- Execution round: 3
- Current revision record: `API-REV-003` in `api-e2e-revision-record.md`.
- Upstream implementation revision: `IR-003`
- Upstream code-review revision: `CRR-003` (`Pass`)
- Proportional durable-test review revision: `CRR-004` (`Fail / Local Fix`, findings `AT-001`, `AT-002`)
- Trigger: Post-source-review coverage investigation before any API/E2E execution or API/E2E-owned durable coverage edit, followed by a user-directed packaged-production startup observation and precise TeamRun metadata repair after the synthetic validation baseline passed.

## Source Package Reviewed

The investigation used the complete upstream package:

- `ticket-description.md`
- `requirements.md`
- `investigation-notes.md`
- `released-data-shape-inventory.md`
- `design-use-case-validation.md`
- `design-spec.md`
- `solution-revision-record.md`
- `design-review-report.md`
- `architecture-review-revision-record.md`
- `implementation-handoff.md`
- `implementation-revision-record.md`
- `code-review-report.md`
- `code-review-revision-record.md`

The superseded `migration-recovery-policy.md` and `startup-blocker-status-contract.md` are not treated as current authority.

Round 3 additionally reviewed `api-e2e-test-review-report.md` and the `CRR-004` entry in `code-review-revision-record.md` before changing the durable E2E.

## Changed Surface Summary

- Backend migration/runtime logic changed: Yes.
- API behavior changed: Indirectly. GraphQL/API availability and history/run operations must remain available after warning-only startup migration outcomes.
- Frontend behavior changed: No renderer feature was changed, but renderer-observable Electron startup status is in scope.
- Browser journey changed: No workflow redesign; browser validation is required to prove the unchanged web-equivalent surface remains usable against a warning-ready migrated server.
- Auth/session behavior changed: No.
- Desktop shell behavior changed: Yes. Server readiness is health-only, fatal startup detail is structured, and current-generation error settlement is exactly once.
- Process/bootstrap behavior changed: Yes. One final TeamRun V1 gate replaces the removed canonical-identity gate and must distinguish warning-ready from platform-fatal startup.
- Persisted-data transition changed: Yes. Released Team packages, immutable migration ledger rows, token-usage roots/evidence, and history indexes are affected.
- External integration behavior changed: No external provider or model call is required for acceptance evidence.
- Other executable surfaces: packaged Electron with embedded server, isolated synthetic app-data roots, and relaunch/idempotence.

## Project Execution Discovery

| Concern | Source of truth | Discovered command or behavior | Decision |
|---|---|---|---|
| Server tests | `autobyteus-server-ts/AGENTS.md`, `package.json`, `vitest.config.ts` | `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch` | Use for focused deterministic and real-SQLite coverage. |
| Server build/typecheck | `autobyteus-server-ts/package.json` | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; `pnpm -C autobyteus-server-ts build` | Run build-scoped typecheck and a production build before actual startup. Root `tsconfig.json` is known to include pre-existing test/rootDir diagnostics and is not the build gate. |
| Server process harness | `test-support/live-e2e/test-runtime-bootstrap.mjs` | `materializeTestRuntime`, `createSanitizedTestEnvironment`, `startBuiltTestServer`, loopback port and disposable runtime helpers | Reuse. The helper confines server runs to `autobyteus-server-ts/tests/.tmp` and verifies `.env.test` is unchanged. |
| Server health/API | `src/server-runtime.ts`, `src/app.ts`, GraphQL E2Es | `/rest/health`, `/graphql` | Health is the authoritative ready condition; use GraphQL for continuation evidence. |
| Browser | `autobyteus-web/AGENTS.md`, `README.md`, existing `tests/e2e/*.mjs` | Nuxt dev/browser probe using Playwright Core | Use a temporary executable browser probe against a synthetic warning-ready server unless a stable repository gap proves a durable probe is necessary. |
| Electron unit coverage | `autobyteus-web/package.json`, Electron specs | `pnpm -C autobyteus-web test:electron -- --run <paths>` | Re-run lifecycle, output, and renderer status suites. |
| Packaged server smoke | `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | Disposable profile, packaged server executed with Electron as Node, health probe | Useful but insufficient alone because it does not exercise the packaged Electron renderer/status path. |
| Electron packaging | `autobyteus-web/electron-builder.yml`, package scripts | `prepare-server`, `build:electron:mac`; app output under `electron-dist` | Build and launch the actual packaged app with an isolated `HOME`. |
| Packaged Electron automation | installed `playwright-core` | `_electron.launch({ executablePath, env })`, renderer evaluation | Use as an isolated executable probe. Persist only if it is stable, reproducible, and materially closes the coverage gap. |
| Data-root selection | `electron/appDataPaths.ts`, server CLI | Electron derives `~/.autobyteus/server-data`; server accepts `--data-dir` | Set a disposable `HOME` for Electron and an explicit disposable `--data-dir` for standalone server. Realpath-guard both before launch. |

## Existing Coverage Inventory And Validity

| Coverage path / suite | Surface covered | Current validity | Action | Reason |
|---|---|---|---|---|
| `tests/unit/app-data-migrations/predecessor-team-metadata-converter.test.ts` | Released nested metadata, explicit child `teamRunId`, fallback to `memberRunId` | Still Valid | Re-run | Directly covers `META-01..03`. |
| `tests/unit/app-data-migrations/predecessor-team-communication-converter.test.ts` | Released address-based and run-ID communication plus contradictions | Still Valid | Re-run | Directly covers `COMM-01..04`. |
| `tests/unit/app-data-migrations/team-execution-address-normalizer.test.ts` | Exact current and nested multi-member/task-team addresses | Still Valid | Re-run | Directly covers `ADDR-01..05`. |
| `tests/unit/app-data-migrations/team-run-migration-state-classifier.test.ts` | Current/predecessor/historical/orphan/unsafe root classification | Still Valid | Re-run | Directly covers strict admission cases `ROOT-01..08`. |
| `tests/unit/app-data-migrations/team-run-predecessor-source-resolver.test.ts` | Live/protected backup/unfinished predecessor selection | Still Valid | Re-run | Directly covers source resolution and ambiguity rejection. |
| `tests/unit/app-data-migrations/team-run-v1-package-promoter.test.ts` | Commit, post-promotion admit-if-valid, exclude-if-invalid warnings | Still Valid | Re-run | Directly covers `PROMO-01..03`. |
| `tests/unit/app-data-migrations/token-usage-team-run-v1-row-planner.test.ts` | Standalone/current/direct/retained/retired/unsupported token identities | Still Valid | Re-run | Directly covers `TOK-01..08`. |
| `tests/unit/token-usage/token-usage-team-run-v1-migration-repository.test.ts` | Real SQLite root update, evidence/fact retention, SQL rollback | Still Valid | Re-run | Directly covers transactional `TOK-07/08`. |
| `tests/unit/app-data-migrations/team-run-history-index-reconciler.test.ts` | History reconciliation/idempotence/warning with byte preservation | Still Valid | Re-run | Directly covers `HISTORY-01..04`. |
| `tests/unit/app-data-migrations/team-run-execution-tree-v1-app-data-migration.test.ts` | Orchestration, warning accumulation, preservation claims | Still Valid | Re-run | Directly covers final migration result semantics. |
| `tests/unit/app-data-migrations/app-data-migration-registry.test.ts` and runner/repository suites | Exact registry/ledger admission and immutable terminal records | Still Valid | Re-run | Covers the released cohort and one-final-attempt rules at the repository boundary. |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts` | Warning continuation, strict final gate, structured platform fatal | Still Valid | Re-run | Covers `START-01..03` at injected runtime boundaries. |
| `autobyteus-web/electron/server/__tests__/BaseServerManager.spec.ts` | Health-only readiness, generic code-zero fallback, structured fatal | Still Valid | Re-run | Directly covers `START-03` Electron process settlement. |
| `autobyteus-web/electron/server/__tests__/ServerStatusManager.spec.ts` and `serverOutputLogging.spec.ts` | Exactly-once current-generation status and structured log parsing | Still Valid | Re-run | Directly covers renderer-observable error/status handling. |
| `tests/integration/agent-team-runtime/agent-team-run-manager.integration.test.ts` | Current package restore/runtime context | Still Valid | Re-run focused cases | Supplies deterministic restore/controlled-input evidence without an external provider. |
| Existing live Agent/AgentTeam GraphQL E2Es | End-to-end run workflows | Partial | Do not depend on provider-backed cases | Several cases need live LM Studio/Codex/model credentials; they are not deterministic acceptance gates for this migration. |
| Existing generic browser E2Es | General renderer workflows | Partial | Use targeted temporary probe | They do not seed the released TeamRun V1 migration cohort. |
| `scripts/verify-packaged-server-startup.mjs` | Embedded packaged server health | Partial | Run as supplemental smoke | It bypasses the packaged Electron renderer and status APIs. |
| Removed `team-run-metadata-member-tree-history.integration.test.ts`, canonical token/repository migration tests, and removed canonical migration definitions | Obsolete two-gate/canonical compatibility path | Stale / Remove | Keep removed; do not restore or replace with compatibility assertions | The reviewed design requires one final migration and no unpublished canonical runtime branch. Deletions are already part of `IR-003` and passed source review. |

## Persisted-Data Coverage Decision

- Persisted state is affected: Yes.
- A successful realistic migration path is required: Yes.
- An intentionally failing or warning path is required: Yes. Mixed warning-ready startup and independent platform-fatal startup are separate acceptance boundaries.
- Migration result must be verified directly: Yes. The exact 14-row released cohort, the sole new final V1 attempt, statuses/attempt numbers, and relaunch immutability must be asserted from SQLite.
- Production profile use in the API/E2E validation matrix: Forbidden and honored. `/Users/normy/.autobyteus/server-data` was never copied into a test root or launched by API/E2E. After the baseline completed, the user independently launched the worktree-built app against that profile and explicitly requested log inspection and one precise TeamRun thread-ID repair; that operational follow-up is recorded separately and is not a test fixture or a substitute for synthetic evidence.
- Synthetic fixtures: Required. They must model released metadata, communication, token, history, memory, partial/unsupported, and ledger shapes without using reporter production bytes.
- Reversibility/cleanup: Every runtime uses an owned temporary root under the repository test temp area or the OS temp directory. Cleanup is performed only after realpath containment verification; evidence snapshots are captured before cleanup.

## Data, Environment, And Credential Needs

| Need | Source | Handling | Validation |
|---|---|---|---|
| Exact released migration ledger cohort | Requirements/design inventory | Create synthetic rows with the required IDs, statuses, and `attempt = 1` in disposable SQLite | Query before first launch, after first launch, and after relaunch; compare every pre-existing row byte-for-value and assert the final V1 row is the sole new attempt. |
| Released Team metadata/communication | `released-data-shape-inventory.md` | Hand-authored synthetic JSON fixtures only | Assert exact route/run identity conversion and retained source/evidence expectations. |
| Token-usage rows | `token-usage-team-run-v1-row-planner` matrix | Synthetic rows in disposable SQLite | Assert root remap classes, fact/evidence column retention, and transaction rollback. |
| History indexes/packages | design matrices | Synthetic current/predecessor/malformed roots | Assert list/resume/restore continuity and warning-only reconciliation. |
| Existing memory assets | synthetic bytes | Write distinctive fixture bytes | Compare unchanged bytes after launch/relaunch. |
| Server port | runtime bootstrap | Reserve loopback port dynamically | Fetch `/rest/health` and issue GraphQL operations. |
| Browser | local Nuxt + Playwright Core | Use local loopback only | Open renderer, query warning-ready backend, and exercise one stable web-equivalent API/UI journey. |
| Packaged Electron profile | OS temp directory | Set isolated `HOME`; require realpath inside owned temp parent and require it is not the reporter home | Evaluate renderer-observable server status for warning-ready and platform-fatal profiles. |
| Provider/model credentials | None | Do not request or load | New-work acceptance uses definition/run creation and deterministic mocked/in-process controlled-input coverage, not live model inference. |

## Required Coverage Matrix

| Use case / matrix | Required proof | Coverage source | Planned action |
|---|---|---|---|
| `E2E-01` all-supported success | Exact cohort/ledger, final sole attempt, supported migration, health, new Agent/AgentTeam work, history, relaunch | Existing focused suites plus new actual-startup server E2E | Add durable full-server coverage because no existing test combines real registry + real SQLite + real process + API + relaunch. |
| `E2E-02` mixed warning availability | Partial/unsupported roots/messages/token, warning terminal state, health, new work, unaffected history, relaunch | Existing policy suites plus new actual-startup server E2E | Add durable warning-ready process coverage. |
| `E2E-03` platform-fatal | Independent current-platform failure, prompt structured fatal, no ready | Server runtime and Electron unit suites plus packaged Electron probe with an isolated corrupt/unusable synthetic profile | Execute packaged renderer-visible probe; persist only if stable. |
| `E2E-04` post-promotion/token/history failures | Admit/exclude promotion warnings, token rollback and evidence/fact retention, history warning and continuation | Durable focused promoter, real-SQLite token repository, history reconciler, coordinator, and warning-ready full-server suites | Re-run all focused proofs and use the full-server warning case to prove process availability; do not add production fault-injection hooks solely for testing. |
| `ROOT-01..08` | Strict root classification, warning byte preservation | Classifier/resolver/coordinator suites | Re-run. |
| `META-01..03`, `ADDR-01..05`, `COMM-01..04` | Released identity/address/message conversion | Converter/normalizer suites and supported full-server fixture | Re-run and include representative released shapes in full-server fixture. |
| `TOK-01..08` | Token root planning, remap, evidence/facts, rollback | Planner + real SQLite repository | Re-run. |
| `PKG-01..02`, `PROMO-01..03` | Idempotent package write and promotion classification | Package writer/promoter suites | Re-run. |
| `HISTORY-01..04` | Index reconciliation and warning continuation | Reconciler + full-server GraphQL history | Re-run and assert API continuity. |
| `LEDGER-01..04` | Exact immutable cohort, one final attempt, old failed row inert | Registry/repository + new process E2E | Assert directly from SQLite before/after/relaunch. |
| `START-01..03` | Warning ready; platform fatal; Electron health-only exactly once | Runtime gate, Electron suites, packaged probe | Re-run and validate packaged boundary. |
| `CONT-01..05`, `NEW-01..03` | Existing memory/history/loadability and new Agent/AgentTeam operations | New process E2E, focused integration, browser | Cover without external providers. |

## Durable Coverage Decision

Durable repository coverage was required because no existing test proved the exact released cohort and sole final attempt through the real startup process, health/API availability, and relaunch. The executed change is:

1. `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (added in round 1; assertion contract corrected in round 3 per `AT-001` and `AT-002`)

No co-located helper was needed. Browser and packaged-Electron probes remained temporary execution methods with retained evidence because they require local Chrome/macOS application coordination and do not belong in the repository's current durable CI surface. No production code test hook was added.

No production code test hook will be added merely to synthesize failures. Fault-boundary evidence will use the existing dependency-boundary suites plus realistic process checks.

Because this investigation authorizes new durable API/E2E coverage after `CRR-003`, the completed package must return to `code_reviewer` for proportional test-code review before delivery.

`CRR-004` found two bounded assertion issues without reopening source review or validation confidence. Round 3 corrected only the reviewed test: health now requires `status: "ok"`, no-fatal checks use the exported fixed platform-fatal protocol, and relaunch compares the complete ledger rather than a prefix. The affected E2E rerun passed 1 file / 2 tests in 10.20 seconds. Both `AT-001` and `AT-002` are resolved pending proportional re-review.

## Executed Sequence

1. Completed the safety preflight and captured only reporter-profile directory metadata; every launched data root resolved under an owned synthetic location.
2. Passed 12 focused server files / 64 tests for root, metadata, address, communication, token, package, promotion, history, runner, coordinator, and startup gate behavior.
3. Passed 3 AgentTeam integration files / 14 tests, including restore/run-service and conversation-target behavior.
4. Passed server build-scoped typecheck and production build.
5. Added and passed the actual full-server durable E2E: 2 scenarios / 2 tests for supported and mixed-warning profiles, direct SQLite ledger/evidence checks, health, GraphQL history/new-work operations, and relaunch.
6. Passed Electron typecheck and the Electron suite: 29 files passed, 1 skipped; 126 tests passed, 1 skipped. The targeted lifecycle/output/status suites were included.
7. Passed a Google Chrome + Nuxt warning-ready renderer probe with health, migration status, Agent API, warning log, listen log, and no fatal log.
8. Built the actual packaged macOS application and ran its embedded server directly through the Electron shell; this superseded a separate packaged-server-only smoke because it exercised the stronger boundary.
9. Passed packaged warning-ready startup, renderer IPC/API observation, one renderer-triggered embedded-server restart, immutable ledger checks, and packaged platform-fatal startup with a renderer-visible precise structured error.
10. Rechecked production-profile directory metadata unchanged, verified validation ports closed, retained evidence, removed temporary scripts/pages, and passed `git diff --check`.

## Broader Validation Decision

Broader validation was **required and completed** because persisted data and startup/bootstrap logic changed, warning-vs-fatal behavior crosses server/process/renderer boundaries, and focused tests could not by themselves prove real health/API availability, browser-equivalent continuation, relaunch idempotence, or packaged Electron behavior.

## Desktop And Browser Decision

- Browser route: Preferred for web-equivalent UI/API continuation; required as a targeted executable probe.
- Actual desktop route: Used only for the non-web-equivalent packaged Electron server-manager/status boundary. The warning instance was shell-launched by the user after explicitly stopping their existing app, then observed through Playwright CDP; after explicit permission, API/E2E terminated that exact isolated instance, launched the fatal instance, observed it, and cleaned it up. Both validation instances used isolated `HOME` values and explicit synthetic embedded-server data paths. The later user-directed production startup observation is separate from this validation route.

## Post-Repository And Final Confidence Scorecard

The post-repository score was assessed before the browser and packaged-Electron checks. The final score includes those broader boundaries.

| Mandatory category | Post-repository | Final | Evidence-based rationale |
|---|---:|---:|---|
| Requirement and acceptance-criteria proof | 96% | 98% | Durable focused/full-server checks directly prove `AC-001..015` and `AC-017`; browser/package evidence closes `AC-016`. `AC-018` remains explicitly delivery-owned. |
| Changed-boundary execution directness | 95% | 98% | Real SQLite, built server process, health, GraphQL, restart, actual Chrome, and packaged Electron were executed. |
| Cross-boundary integration realism and mock gap | 94% | 97% | Process/API/renderer/shell boundaries are real. Live provider inference is intentionally excluded; controlled run/service tests cover new work deterministically. |
| Environment, configuration, identity, and fixture fidelity | 95% | 97% | Exact released ledger cohort and representative released shapes were synthetic by requirement; every planned validation runtime was isolated. The later user-directed production observation was not used to inflate this score. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 98% | Promotion admit/exclude, SQL rollback, history warning, mixed warning, restart/no-rerun, generic/code-zero handling, and one packaged structured platform fatal all passed. |
| User-surface, browser, and desktop-shell confidence | 90% | 97% | Repository Electron evidence was extended by actual Chrome rendering and packaged warning/fatal renderer observations. |
| Durable regression coverage quality and relevance | 96% | 96% | One focused actual-startup E2E adds the previously missing real-process cohort/relaunch boundary without production hooks; existing focused suites remain aligned. |

- Overall post-repository confidence: `94%` (simple average `94.4%`, rounded).
- Overall final confidence: `97%` (rounded simple average `97.3%`).
- Every critical executable acceptance criterion is directly proven; `AC-018` is not an executable gate and remains reserved for the delivery-owned documentation sync.
- No applicable final category is below `90%`.
- Residual uncertainty: the planned validation matrix intentionally used no real user production bytes and no external model/provider inference. A later user-directed production launch supplied corroborating operational evidence only; exact synthetic released-shape fixtures, actual storage/process/API/browser/shell execution, and deterministic controlled-run coverage remain the reproducible proof.

## Post-Baseline User-Directed Operational Observation

- The user independently launched the unsigned worktree-built packaged app against `/Users/normy/.autobyteus/server-data`; API/E2E did not initiate that production launch.
- The final ledger row `20260814_team_run_execution_tree_v1` completed at attempt 1 as `SUCCEEDED_WITH_WARNINGS`: 515 items scanned, 506 migrated, and 9 isolated warning items. Eight invalid/unrecognized historical TeamRun roots were preserved and excluded before mutation; the token-usage root update reported `Maximum call stack size exceeded` as a warning, and startup continued.
- The server subsequently listened on port 29695. The ticket TeamRun `software_engineering_team_8547bc07df6c42f5940cf357bfb54850` was explicitly reported `MIGRATED`, and its current V1 package files were present.
- The user then requested correction of that TeamRun's `/api_e2e_engineer` `platformAgentRunId`. Stable identity evidence selected the root by exact workspace path, exact member/agent-run identity, and the sole trace package containing this task's thread ID, rather than by recency.
- API/E2E gracefully stopped only the worktree app and child, retained a 5 KB metadata-only backup inside the production data area, and atomically changed exactly one value from `01a01451-5b4a-7a23-8f8c-c1fb1d0f6fbe` to `01a0142d-9671-7623-8eb7-0e0390aea27b`. JSON validation and byte-level post-write verification passed.
- After the user restarted the app, the corrected value remained stored and the server listened on port 29695. One transient `thread-store conflict` was logged while another writer still held the same Codex thread; current conversation continuity and the retained corrected identity confirm the intended session is now active. This concurrency condition is operational context, not a TeamRun V1 migration failure.
- Sanitized evidence: `evidence/user-directed-production-observation/summary.json`. Raw production content was not copied into the ticket or test suite.

## Investigation Result

- Existing focused coverage is valid and directly aligned with the approved matrix.
- Removed canonical-compatibility coverage is intentionally stale and stayed removed.
- The actual-startup, real-SQLite, exact-ledger, warning-ready, API/relaunch gap is closed by the new durable server E2E.
- Browser and packaged Electron boundary evidence passed and is retained under `evidence/browser` and `evidence/packaged-electron`.
- Final disposition: `Pass`, `97%` validation confidence, broader validation completed.
- Because repository-resident durable coverage was added after `CRR-003`, the next recipient is `code_reviewer` for proportional review of the new test file before delivery.
- The `CRR-004` local-fix rerun changed no implementation source and preserves the delivery-owned `REQ-013` / `AC-018` documentation obligation.
