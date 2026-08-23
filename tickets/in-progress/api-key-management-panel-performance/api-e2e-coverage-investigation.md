# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-spec.md`
- Supplemental Task Artifacts: `ui-ux-spec.md`; `api-key-panel-loading.png`
- Solution Revision Record: `solution-revision-record.md` (`SR-005`–`SR-007` current basis)
- Design Review Report: `design-review-report.md` (`ARCH-REV-008 Pass`)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (`IR-006`)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (`CRR-004 Pass`, 96/100)
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-005` latest test-review routing entry)
- API/E2E Test Review Report: `api-e2e-test-review-report.md` (round 1 `Fail / Local Fix`, `TEST-001`)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `/code_reviewer` returned bounded `TEST-001` in proportional test review `CRR-005`: the negated aggregate matcher did not independently prove all five removed query operations absent.
- Prior Investigation Reviewed: Round 1 / `API-REV-001` Pass at 96.7%; its execution evidence remains valid outside the bounded assertion correction.
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

The current contract separates credential state from model state. `providerCredentialSettings` is local and value-free; `providerModelCatalogSnapshots` is a network-free projection of static/current registry rows; only provider-targeted `ensureProviderModelCatalog` and `reloadProviderModelCatalog` may perform discovery. Static providers are immediately available and have no Reload. Dynamic AutoByteus, Ollama, LM Studio, and custom-provider sources are source-local, single-flight, generation-fenced, and process-cached until explicit Reload or a governing input change. Credential/custom/settings commands settle after their own durable work and do not await model discovery. Full endpoint identity, exact provider publication tokens, current/partial/stale semantics, canonical identifiers, and registry-only row ownership are required. The prior coupled `providerSettings` and `available*ProvidersWithModels` operations and global reload operations are intentionally removed and must not be restored through production aliases.

### Round 2 Coverage-Review Local-Fix Decision

`TEST-001` is a valid API/E2E-owned `Local Fix`, not an implementation or requirement finding. The prior `not.toEqual(arrayContaining([...]))` matcher proved only that the schema did not contain the complete five-name set; it could pass if any subset of removed aliases returned. The durable schema-boundary scenario remains required and is refined in place to assert each removed query name independently with `not.toContain`. Only the focused provider-secret lifecycle file plus the scoped removed-contract/source audit require rerun; all other repository and browser evidence remains direct and unaffected.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / credential GraphQL + Settings entry | Changed | `REQ-001`–`REQ-006`; `AC-001`–`AC-006`; `DS-001` | API/E2E must use `providerCredentialSettings`, prove value-free configured state, and prove the browser form is not gated by discovery. |
| `BEH-003` / static and dynamic catalog GraphQL | Changed | `REQ-007`–`REQ-011`; `AC-008`–`AC-012`; `DS-002`–`DS-005` | Durable queries must use `providerModelCatalogSnapshots`; dynamic discovery must be tested only through targeted ensure/reload. |
| `BEH-004` / reload surface | Removed / Changed | `REQ-011`; `AC-011`; removal plan | Global/static reload coverage is stale and must not be preserved. Dynamic provider-local Reload remains valid. |
| `BEH-005` / command results | Changed | `REQ-005`, `REQ-012`–`REQ-014`; `AC-005`, `AC-014`–`AC-016`; `DS-006` | Durable GraphQL coverage must consume current object results for save/create/delete/Gemini commands and prove credential/model separation. |
| `BEH-006` / AutoByteus discovery and presentation | Changed | `REQ-015`; `AC-007`, `AC-017`–`AC-020`; `DS-007`, `DS-009` | Repository coverage remains relevant; browser evidence is required for local loading/error/partial/stale presentation and credential interactivity. |
| `BEH-007` / non-Settings consumers and construction | Changed | `REQ-016`; `AC-021`; `DS-008` | Existing runtime/API tests that only need a current model list stay valid in purpose but must read current snapshot fields. Construction/reset coverage remains directly relevant. |
| `BEH-008` / exact invalidation/publication and clean removal | Changed / Removed | `REQ-017`, `REQ-018`; `AC-013`, `AC-022`; `DS-009`, `DS-010`; `CRR-004` | Existing ordering tests remain valid; stale coupled queries/fixtures must be updated, and no aliases may be introduced. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Registry-owned rows, source lifecycle, endpoint identity, targeted availability | Focused SDK/server unit tests | Whole built-server transport and process reset | Built-server API/E2E |
| API / transport / contract | Yes | Removed coupled fields; new credential/snapshot/ensure/reload operations and object command results | Resolver unit tests and stale API/E2E suite | Current schema across real built server | Built-server GraphQL API/E2E |
| Frontend component / state | Yes | Separate credential/catalog state, provider tokens, partial/stale lattice | Focused Pinia/runtime/component tests | Real navigation and network order | Browser |
| Browser integration / user journey | Yes | API Keys entry, provider selection, dynamic local loading, settings return | Implementation browser inspection; no current durable journey for this ticket | Current branch browser journey and latency budget | Browser |
| Authentication / session / permissions | No material auth change | Existing local Settings access | Existing app behavior | None specific to this change | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used by Electron | Component tests and implementation Chrome inspection | Final browser-equivalent journey on current API contract | Browser preferred |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package behavior changed | Existing shell suites | None attributable to this change | None; actual Electron is not required |
| Process / lifecycle | Yes | In-process snapshots disappear on restart; persisted identifiers target exact source | Unit tests and runtime E2E scenarios | Built-server restart/current contract after coverage repair | API/E2E lifecycle |
| Persisted-data transition | No representation change | Existing credentials, hosts, providers, identifiers stay authoritative | Existing restart/migration tests, currently using stale queries | Current reader proof after query repair | Built-server E2E |
| Worker / queue / distributed coordination | No | No queue/FIFO/event bus exists | Source inspection and unit tests | None | None |
| External integration | Yes, bounded | Dynamic provider discovery | Deterministic local fixtures and mocked/deferred adapters | Real external accounts are not required for correctness and may be unavailable | Local deterministic HTTP fixtures; optional preflight only |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance`
- Project type and runtime stack: pnpm workspace; TypeScript SDK; Fastify/Mercurius/type-graphql server; Nuxt/Vue/Pinia web + Electron wrapper; Vitest; Playwright Core browser probes.
- Conflicting, missing, or unclear project instructions: None. `autobyteus-web` requires `--run` for Vitest. Actual desktop validation is documented but shell behavior is unaffected, so browser validation is preferred. Standalone Nuxt typecheck has a known environment-level package-export blocker; production build is the authoritative compile path for this scope.
- Required environment variables or secrets available: `N/A` for deterministic repository/API/browser validation. Real-provider credentials are optional and must be reported by preflight, not assumed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration path is supported. |
| `autobyteus-web/AGENTS.md` | Closest web instruction | Colocated tests; use `pnpm test:nuxt ... --run`; Electron tests separate. |
| root `README.md` lines 306–410 | Full-stack/API/E2E authority | `pnpm dev` owns backend/frontend; `pnpm test:e2e` runs isolated server Vitest E2E; real capabilities use explicit preflight/execution. |
| `autobyteus-server-ts/README.md` lines 458–520 | Server test/environment authority | Test runtime owns an isolated DB; never use development DB for tests. |
| `autobyteus-web/README.md` lines 222–505 | Web/browser/Electron authority | Browser dev path is supported; Playwright Core probes are accepted; packaged Electron is for shell-specific behavior. |
| root and package `package.json` files | Executable commands | Root `test:e2e`; server build/test; web build/tests/guards; SDK build. |
| `autobyteus-server-ts/vitest.config.ts` and `tests/setup/*` | Test runner and fixture isolation | Fork pool, serial files, Prisma global reset, test-owned SQLite URL. |
| `autobyteus-web/vitest.config.mts` | Nuxt test environment | Happy DOM, localization/WebSocket setup, relevant exclusions. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| SDK | worktree root | `pnpm -C autobyteus-ts build` | Builds runtime dependencies | Exit 0 | No process |
| Built server API/E2E | worktree root | `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch` | Test helpers create owned runtime roots/SQLite DBs | Test assertions/server health | Test helpers stop/remove owned state |
| Full server E2E | worktree root | `pnpm test:e2e` | Uses isolated test runtime and may skip capability-gated live scenarios | Vitest result | Vitest/global teardown |
| Web checks | `autobyteus-web` | `pnpm test:nuxt <paths> --run`; guards; build | No external account needed | Exit 0 | No persistent process |
| Real browser stack | worktree root | documented `pnpm dev`, or a smaller owned equivalent based on the existing launcher | Persistent dev state must not be deleted unless created for this run; prefer isolated owned runtime for deterministic evidence | backend `127.0.0.1:8000`, frontend `127.0.0.1:3000` | Ctrl+C/owned process-tree cleanup; remove only explicitly created temporary state |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server database | Prisma test global setup or `test-runtime-bootstrap.mjs` | Isolated from development/production data | Automated owned cleanup |
| Dynamic provider behavior | Local HTTP fixtures and deferred/mock adapters in existing tests | No public endpoint or real secret required | Close owned fixture ports |
| Browser credential/catalog state | Isolated server runtime plus controlled GraphQL/local endpoint state | No credential values in evidence | Remove owned runtime/browser state |
| External provider capability | `pnpm test:e2e:real:preflight` | Optional; missing capability is not a failure for deterministic scope | No secret output retained |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; implementation `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: existing custom-provider records, host strings, credentials, and saved canonical identifiers remain directly readable; only ephemeral registry/lifecycle state is rebuilt.
- Evidence planned: repair and run the existing startup/restart/migration and runtime construction E2E scenarios against the current snapshot/credential operations; retain canonical identifier forms without rewrite or compatibility grammar.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

The implementation-focused SDK/server/web unit and component tests changed upstream and are `Still Valid`; they directly cover source single-flight/generation, endpoint identity, exact setting and deletion tokens, partial/stale presentation, identifiers, and custom probe reuse. The following broader durable artifacts have valid scenario intent but stale transport/fixture setup.

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` | Custom create metadata, stale preservation, delete cleanup | `REQ-014`, `AC-016`, `DS-006` | Needs Update | Uses removed aggregate query and obsolete create/delete result shapes | Update to current credential/snapshot/delete contracts; preserve behavior assertions. |
| `tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` | Static Gemini metadata provenance | `REQ-007`; metadata boundary | Needs Update | Uses removed aggregate query | Replace with local snapshot fields; no dynamic ensure. |
| `tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` | Qwen persistence/restart/routing | `REQ-012`, `AC-014`, `AC-021` | Needs Update | Uses removed aggregate query | Replace with current snapshot list. |
| `tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts` | Provider/Gemini/custom value-free command lifecycle | `REQ-001`–`REQ-006`, `REQ-012`–`REQ-014`; `AC-004`–`AC-006`, `AC-014`–`AC-016` | Needs Update | Uses removed coupled credential/catalog query, old catalog query, and old mutation results | Rewrite to current credential and catalog operations; add removed-schema assertions and timing/no-secret proof. |
| `tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts` | Credential status after restart | `REQ-002`, `REQ-006`; persistence `Not Affected` | Needs Update | Uses removed `providerSettings` and old save result | Update to `providerCredentialSettings` and current object result. |
| `tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` | Existing provider IDs/data remain usable through startup transitions | `REQ-016`, `AC-021`; `Not Affected` | Needs Update | Uses removed `providerSettings` and old create/delete results | Update current credential result/query only; retain data semantics. |
| `tests/e2e/media/server-owned-media-tools.e2e.test.ts` video catalog scenario | Static video rows through GraphQL | `REQ-007`, `AC-008`; no dynamic video | Needs Update | Uses removed `availableVideoProvidersWithModels` | Read `videoModels` from current snapshots. |
| `tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Static model inventory used by token usage | `REQ-007`, `AC-008` | Needs Update | Uses removed aggregate query | Read `llmModels` from current snapshots. |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Select a valid static model for migration journey | `REQ-007`; persisted data `Not Affected` | Needs Update | Incidental removed query | Replace only model-selection helper with current snapshots. |
| 12 runtime E2E files under `tests/e2e/runtime/` (`agent-runtime`, `all-runtime-send-message-matrix`, `autobyteus-team-runtime`, `claude-team-inter-agent-roundtrip`, `codex-single-agent-history-title`, `codex-standalone-send-message-global-routing`, `codex-team-inter-agent-roundtrip`, `context-file-storage-runtime`, `mixed-task-delegation`, `mixed-team-runtime`, `nested-mixed-team-runtime`, `token-usage-runtime`) | Obtain a runtime model then exercise agent/team/runtime behavior | `REQ-007`, `REQ-016`, `AC-021` | Needs Update | Scenario intent is valid; model selection uses removed field. | Replace incidental aggregate list with current snapshot `llmModels`; preserve runtime scenario. |
| `tests/integration/services/claude-model-catalog.integration.test.ts`; `codex-model-catalog.integration.test.ts` | Runtime-specific curated models through GraphQL | `REQ-007`, `AC-008` | Needs Update | Removed aggregate query | Update to current snapshot fields. |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` + fixture page | Browser interrupt result presentation | Current web transport | Needs Update | Mock includes the removed aggregate field; execution also exposed a stale pre-view-state Team fixture | Remove obsolete field and update the fixture to the current Team execution-view snapshot and exact AgentRun interrupt contract; rerun browser probe. |
| `test-support/live-e2e/live-e2e-harness.ts` provider preflight | Value-free configured status for optional real providers | `REQ-002`, `REQ-006` | Needs Update | Uses removed `providerSettings` | Read `providerCredentialSettings`; keep preflight semantics. |
| Focused changed SDK/server/web tests listed in `implementation-handoff.md` | Direct lifecycle, identity, publication, and presentation invariants | `REQ-001`–`REQ-018`, `AC-001`–`AC-022` | Still Valid | Current-contract tests passed code review | Rerun narrow groups, then broader suites. |
| Packaged Electron isolation/Electron tests | Shell launch/profile/IPC behavior | No changed shell boundary | Out Of Scope | No Electron-specific source or requirement changed | Do not run actual desktop; browser-equivalent evidence is sufficient. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| All 19 server E2E + 2 integration queries using `available*ProvidersWithModels` | One aggregate list is the supported model API | The query is intentionally removed because it coupled local reads to discovery/global ownership | `REQ-002`, `REQ-007`–`REQ-011`, `AC-022`; design removal plan; `CRR-004` | Current `providerModelCatalogSnapshots` for local rows; targeted ensure/reload only where discovery is the subject | N/A |
| Three server E2E helpers using `providerSettings` | Credential truth is embedded in a provider+models projection | Credential state is now independent and locally authoritative | `REQ-001`–`REQ-006`; `DS-001`; `AC-022` | `providerCredentialSettings` | N/A |
| Old scalar/string/Boolean command expectations | Provider/Gemini/custom commands return old coarse results | Current API returns exact credential/config/delete objects so callers do not refetch coupled state | `REQ-005`, `REQ-012`–`REQ-014`; current resolver | Current result field assertions | N/A |
| Synchronous GraphQL live-metadata/provenance expectations | Reading a static snapshot performs a credential lookup and live metadata HTTP call; reading seeded custom rows performs a second enrichment request | The current snapshot is deliberately network-free, curated static metadata is immediately sufficient, and optional enrichment is supplementary/non-authoritative | `REQ-007`; metadata enrichment boundary in `design-spec.md`; `UXJ-002` | Static snapshot E2E asserts curated values with zero credential lookup/HTTP; custom create E2E asserts one authoritative probe and seeded metadata rows | N/A |
| Post-create custom-provider discovery expectation | The first read/ensure after custom create performs a second `/models` request | Custom create seeds the authoritative probe rows as the initial process-local `READY` snapshot and warm ensure is a no-network cache hit | `REQ-009`, `REQ-014`; `AC-016` | Same-process ensure asserts one total call; first ensure after process restart asserts the second call | N/A |
| Web probe's `availableLlmProvidersWithModels: []` fixture | Renderer receives the old aggregate operation | Web production code no longer sends that operation | Current web GraphQL operations; `AC-022` | Current credential/snapshot mock response when the probe reaches the Settings client | If the property is unreachable dead fixture data, remove it without replacement. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-001` | Current GraphQL credential/snapshot contract, removed fields absent, static rows local/value-free | `REQ-001`, `REQ-002`, `REQ-006`, `REQ-007`; `AC-004`, `AC-006`, `AC-008`, `AC-022` | Extend `provider-secret-lifecycle-graphql.e2e.test.ts` | The existing durable boundary is stale and the new split API currently has no built-server E2E proof. |
| `API-002` | Current custom create result seeds ready snapshot and delete removes exact provider | `REQ-014`; `AC-016` | Update/extend custom-provider and provider-secret E2E files | Direct transport proof complements unit lifecycle coverage. |
| `BROWSER-001` | API Keys provider/form usable while a selected dynamic model source is pending/unavailable; no global/static Reload | `REQ-001`–`REQ-004`, `REQ-007`–`REQ-011`; `AC-001`–`AC-003`, `AC-008`, `AC-011`; `UXJ-001`–`UXJ-005` | Prefer a current durable self-starting browser probe if it can reuse existing probe infrastructure without disproportionate test scaffolding; otherwise a retained temporary executable probe with rationale | UI independence is explicitly browser-required and cannot be established by mocked component tests alone. |
| `BROWSER-002` | Supported host change clears only affected shared provider and survives section navigation/older response | `REQ-017`, `REQ-018`; `AC-013`; `UXJ-007` | Browser probe or targeted existing live fixture | Real route/store/network ordering provides direct cross-boundary evidence. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `COV-001` | 19 server E2E files with removed aggregate operations | Use `providerModelCatalogSnapshots` + kind-specific arrays; rename result variables/messages | `AC-022`; clean-cut removal | Preserve original non-catalog scenario intent. |
| `COV-002` | 2 runtime model-catalog integration files | Use current snapshot operation | `REQ-007`, `AC-008` | Runtime catalog behavior remains relevant. |
| `COV-003` | 3 credential/restart/custom migration E2E files | Use `providerCredentialSettings` and current mutation object results | `REQ-002`, `REQ-005`, `REQ-006`, `REQ-012`–`REQ-014` | Do not add compatibility aliases. |
| `COV-004` | `interrupt-result-presentation-probe.mjs` | Replace/remove stale fixture field based on request interception path | `AC-022` | Keep only current web operations. |
| `COV-005` | `test-support/live-e2e/live-e2e-harness.ts` | Use current credential query | `REQ-002`, `REQ-006` | Needed for truthful optional real-provider preflight. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| No entire test file is currently approved for removal | The represented runtime, migration, secret, metadata, and media behaviors remain supported | Existing scenario purposes remain valid | Update obsolete setup/assertions rather than delete the broader scenarios. Individual old query fixture properties and old-schema assertions will be removed. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | Focused changed-boundary SDK/server unit tests | Worktree root; 6 SDK + 6 server Vitest files | Endpoint identity, source lifecycle, 30-second deadline, exact availability/construction, custom sync, row ownership | Pass — 12 files/55 tests | `validation-evidence/01e-sdk-server-changed-boundary-units.log` |
| 1 | Focused current-contract server E2E/integration selection | Worktree root; server Vitest, isolated Prisma runtime | Split GraphQL contract, local snapshot semantics, custom-provider lifecycle | Pass — 7 files passed, 2 optional-runtime files skipped; 22 tests passed, 2 skipped | `validation-evidence/01d-focused-current-contract-pass.log` |
| 2 | All 23 updated server E2E/integration files, then focused repaired restart file | Worktree root; server Vitest, isolated Prisma runtime | Every updated GraphQL consumer and restart/probe-cache semantics | Pass after one coverage-only expectation correction — aggregate run 29 passed/50 capability-skipped with one stale assertion; focused rerun 4/4 passed | `validation-evidence/02-updated-durable.log`; `validation-evidence/02b-custom-provider-restart-repaired.log` |
| 3 | `pnpm test:e2e` | Worktree root | Broader isolated server E2E regression | Scoped Fail — 48 files/180 tests passed; four unchanged baseline files failed (one import, three tests), none in changed/coverage paths | `validation-evidence/03-server-e2e.log`; `validation-evidence/03b-file-explorer-rerun.log`; `validation-evidence/03c-unrelated-failure-audit.log` |
| 4 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts run build:full` | Worktree root | SDK/server compilation, managed assets, sanitized built bootstrap | Pass | `validation-evidence/04-builds.log` |
| 5 | Affected Nuxt tests; web boundary/localization guards; localization audit; production build | `autobyteus-web`; Vitest `--run` | Current transport/store/components, localization and production bundle | Pass — 12 files/80 tests; all guards/audit/build passed | `validation-evidence/05a-web-affected-tests.log`; `validation-evidence/05b-web-guards-build.log` |
| 6 | Current-contract interrupt result Playwright probe | `autobyteus-web`; owned Nuxt/browser/WebSockets | Updated durable browser fixture reaches current Team snapshot/exact AgentRun contract | Pass | `validation-evidence/05f-interrupt-probe-current-contract.log`; `validation-evidence/05f-interrupt-probe-current-contract/evidence.json` |
| 7 | `pnpm test:e2e:real:preflight` | Worktree root; value-safe capability output | Updated live harness uses `providerCredentialSettings`; reports available/missing capabilities without secret values | Pass — 18/18 capability scenarios; external success not asserted | `validation-evidence/04b-live-preflight.log` |
| 8 | Removed-contract scan and `git diff --check` | Worktree root | No executable production/durable removed operation; negative schema assertions retained; patch hygiene | Pass | `validation-evidence/07c-audit-final-clean.log` |
| 9 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts`; scoped removed-contract audit; `git diff --check` | Worktree root; isolated Prisma runtime | `TEST-001`, `API-001`, `AC-022`: every removed query name is independently absent and no production/durable executable query restores it | Pass — 1 file/6 tests; audit and patch hygiene pass | `validation-evidence/08-provider-secret-test-001-fix.log`; `validation-evidence/08b-removed-contract-test-001-audit.log` |

The broader `pnpm test:e2e` result is not relabeled as green. Its four failures are retained as explicit, non-ticket baseline evidence: a missing Codex bootstrap import target already absent at `HEAD`, a persistent file-watcher event timeout on rerun, an obsolete workspace-history field, and a workspace-removal response expectation mismatch. `git diff --name-only` proves all four files are unchanged by this ticket. Every executed changed deterministic API/E2E scenario passed after the coverage expectation was corrected to the approved current cache lifecycle.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | Focused unit/component evidence plus built-server credential, snapshot, lifecycle, restart, schema-removal and command coverage passed | Browser timing/navigation/presentation still needed at this gate | Production-build browser journey |
| Changed-boundary execution directness | 96% | Current GraphQL schema and built-server processes were exercised directly; no production aliases were used | Renderer interaction not yet direct | Browser |
| Cross-boundary integration realism and mock gap | 93% | Isolated built server, Prisma, real GraphQL and local HTTP provider fixtures cover material server boundaries | Store/route/backend request ordering not yet observed together | Browser with built server |
| Environment, configuration, identity, and fixture fidelity | 94% | Owned databases/runtime roots, real builds, exact provider IDs, full endpoint paths and value-safe preflight | Production frontend journey not yet executed | Production-build renderer |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Deferred discovery, stale publication, create/delete, restart, unavailable/partial/stale unit paths and host identity coverage | Browser failure/recovery state not yet observed | Browser failure journey |
| User-surface, browser, and desktop-shell confidence | 86% | Component tests passed and Electron shell is not changed | Critical `AC-001`, navigation, localized unavailable/Retry and responsive behavior require browser evidence | Browser (required) |
| Durable regression coverage quality and relevance | 96% | 26 durable API/E2E paths use current operations; `TEST-001` now independently excludes every removed query and the focused file/audit pass | Repeat proportional review is still required for the bounded correction | `/code_reviewer` repeat test-code review |

- Overall post-repository confidence: **93.4%**.
- Calculation method: simple average of seven applicable scores.
- Every critical acceptance criterion directly proven: `No` at the repository-only gate; browser-required criteria remained.
- Any applicable category below `90%`: `Yes` — user-surface/browser confidence (86%).
- Default clean-confidence target of `95%` met: `No` at the repository-only gate.
- Material residual risks at this gate: real production-renderer entry latency; route/store/network ordering across API Keys and Server Settings; responsive localized failure presentation.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` against the production Nuxt static build and built server, with owned deterministic HTTP discovery fixtures.
- Specific confidence gap or residual risk addressed: `AC-001` full-entry latency, credential/model independence, static-vs-dynamic Reload surface, targeted host-setting convergence while API Keys is unmounted, failure copy, and 768px layout.
- Why the selected mode can materially improve confidence: it crosses the actual production renderer, Apollo/Pinia, GraphQL, built server, settings persistence, discovery adapter, DOM and navigation boundaries.
- Expected confidence after the selected validation: at least 95% overall with no category below 90%.
- Browser-specific decision and rationale: Required by the approved scope; the affected Electron behavior is web-equivalent and browser execution is more direct than shell launch for this boundary.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant README or development instructions: root and web README development/browser/packaged-Electron sections.
- Web-equivalent behavior: API Keys, Server Settings, Apollo/Pinia lifecycle and model/credential presentation.
- Shell-specific or lifecycle behavior: no preload, IPC, window or packaging logic changed.
- Chosen validation approach and why it fits the project: Chrome against the production Nuxt static build and built server; this exercises the exact changed renderer/server surface without disturbing a desktop instance.
- Server/frontend setup when browser validation is used: existing built-server bootstrap, production static output from the passing web build, an owned loopback static/runtime-config harness, and an owned local Ollama-compatible fixture.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron shell launch/IPC was not rerun; because no shell boundary changed, this is a negligible residual and not scored as missing changed-scope evidence.

## Live Environment And Fixture Plan And Result

- Startup order and commands: start deterministic Ollama-compatible loopback fixture; start built server with isolated runtime/SQLite and fixture host; serve the already-built production Nuxt static output through an owned loopback harness with runtime endpoints pointed at that server; launch Chrome/Playwright; run DOM journey; stop all owned resources.
- Environment choices: loopback-only ephemeral ports; production frontend assets; built server; isolated runtime/database; no home/development data.
- Health / readiness checks: built-server listening marker; frontend `/settings` HTTP 200; semantic `API Key Management`, provider navigation and credential input locators.
- Seed data / fixtures: delayed `path-a` and `path-b` Ollama-compatible tags/ps/show responses plus failing `path-c`; no secret values.
- Test identities/authentication/session state: local unauthenticated Settings surface.
- Requirement-linked journeys: `BROWSER-001`, `BROWSER-002`.
- Evidence captured: `validation-evidence/06l-settings-browser-production-build-authoritative.log`, `validation-evidence/browser/settings-browser-summary.json`, backend/frontend logs, and three screenshots.
- Cleanup: Chrome context/browser, built server, static server, HTTP fixture and isolated runtime/database all stopped/removed; summary reports every cleanup flag true.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `BROWSER-001` / `BROWSER-002` | Ticket-local Playwright Core script using existing test server bootstrap, production web output, and local Ollama protocol fixture | Full-entry latency, credential independence, source-local loading, dynamic-only Reload, exact host convergence/order, failure state, navigation persistence and 768px layout | Repository has no reusable Settings full-stack browser framework; retaining a task-specific production runtime-config/static harness in product tests would be disproportionate. The durable store/component/API/E2E layers retain the regression invariants. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real external provider success across every vendor | Deterministic fixtures prove lifecycle/protocol; value-safe preflight reports unavailable secrets rather than fabricating success | Vendor service availability remains outside deterministic contract proof | Optional operator live run when credentials are intentionally supplied |
| Actual Electron shell | No shell boundary changed; production browser renderer is the direct surface | Negligible for this ticket | None |
| Four unrelated full-server-E2E baseline failures | Files and failure boundaries are unchanged; one was rerun and remained isolated | Repository baseline is not globally green | Preserve evidence for separate maintenance; do not change unrelated code in this ticket |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Stale `autobyteus-web/docs/settings.md` still describes `providerSettings` and global/selected reload behavior | Delivery documentation follow-up | `validation-evidence/07c-audit-final-clean.log` | `/delivery_engineer` after proportional test review |
| Four unchanged full-suite baseline failures | Non-ticket baseline / maintenance signal | `03-server-e2e.log`; `03c-unrelated-failure-audit.log` | Record only; no ticket reroute |
| `TEST-001` incomplete aggregate-negation matcher from `CRR-005` | API/E2E-owned `Local Fix` — resolved in round 2 | `08-provider-secret-test-001-fix.log`; `08b-removed-contract-test-001-audit.log` | `/code_reviewer` for repeat proportional review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — 26 paths updated; no entire supported scenario removed.
- Post-repository confidence: **93.4%**.
- Broader validation decision: `Required` — completed with authoritative browser pass.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: N/A.
- Notes: Every removed aggregate operation now has an independent negative GraphQL schema assertion. No executable production/durable query, alias, global reload or compatibility path was retained. `TEST-001` is resolved locally and the focused 6-test E2E file plus removed-contract audit pass. Final confidence and result are authoritative in `api-e2e-execution-coverage-report.md`.
