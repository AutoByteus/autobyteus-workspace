# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-doc.md` (`RER-002`, Approved)
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-revision-record.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/design-spec.md` (`AD-REV-001`)
- Supplemental Task Artifacts: `N/A — not applicable`; the approved package has no separate UI/UX or prototype supplement.
- Architecture Design Revision Record: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/architecture-design-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/design-review-report.md` (`Pass`)
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/code-review-report.md` (`Pass`, `CRR-001`)
- Code Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A — initial API/E2E round`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: Code Reviewer handoff after `CRR-001` passed implementation snapshot `c2bdef91bd28f7643ed9766ae2097fea7ecdf24e` (production commit `880af7a98e524dfda2ccbe51a9b0533eff9f6758`).
- Prior Investigation Reviewed: `N/A — no prior API/E2E investigation or revision record exists`
- Latest Authoritative Investigation: Round 1, this file.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` because this investigation identifies durable test changes.

## Current Requirement And Design Basis

RER-002 requires one exact current `gemini-3.8-flash` catalog row, no current 3.7 alias or rewrite, low/medium/high thinking with medium default, exact 3.8 identity across AI Studio and both Vertex setup modes, lower-case `thinkingLevel`, omission of every forbidden sampling/penalty/count/budget field, preserved thought-summary/text/media/tool/stream/abort/usage/error behavior, two observation-time price periods, credential-independent static metadata, stale 3.7 launch rejection, and immutable historical 3.7 identity/cost evidence. AD-REV-001 confines the production change to the existing catalog, Gemini adapter, and runtime-map owners and requires the exact 3.8 branch to preserve 3.1 Pro. `ARCH-REV-001`, `IR-001`, and `CRR-001` confirm that implementation shape. API/E2E must now prove repository, HTTP/API, actual installed-SDK serialization, persistent-history, failure, and credential-gated live boundaries without claiming unavailable access.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / current catalog and schema | Changed / Removed | REQ-001, REQ-002, REQ-004, REQ-007, REQ-009; AD-REV-001 DS-001 | Prove exact 3.8 row and schema through built HTTP GraphQL, retain the three-mode credential/network-free E2E matrix, and prove 3.7 absence. |
| BEH-002 / Gemini provider request | Changed / Preserved | REQ-003–REQ-006, REQ-010; AD-REV-001 DS-002/DS-003/DS-007/DLS-001 | Retain final-client capture coverage and add actual installed `@google/genai` loopback-wire serialization/error evidence; rerun tool, stream, and 3.1 regressions. |
| BEH-003 / stale current selection and history | Removed / Preserved | REQ-002, REQ-011; AD-REV-001 DS-004/DS-008 | Exercise the real `LLMFactory` membership guard through server launch-host validation and exact stored 3.7 identity through persistence/GraphQL analytics. |
| BEH-004 / pricing | Changed / Preserved | REQ-008, REQ-011; AD-REV-001 DS-005 | Rerun exact boundary/invalid-time pricing policy and broader token-usage E2E regression; confirm stored historical totals are not repriced. |
| BEH-005 / operational validation | Changed | REQ-012, REQ-013; AD-REV-001 DS-006 | Run broader server E2E, active-reference classification, installed dependency/build checks, and scoped live preflight/execution. Delivery retains the three documented prose updates. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Catalog row, pricing payload, adapter config dispatch, runtime mapping | Focused package/server unit tests | Interaction with built server/current registry and persistent analytics | Built server HTTP GraphQL + broader server E2E |
| API / transport / contract | Yes | Provider request wire and GraphQL catalog projection | Mocked Google client captures; in-process GraphQL E2E | Installed SDK serialization and actual HTTP server transport | Loopback SDK HTTP and built-server HTTP GraphQL |
| Frontend component / state | No source change | Generic store/form consumes catalog unchanged | Existing generic path and GraphQL schema | Rendered selector content is delivery-owned verification; no UI behavior changed | None for API/E2E; no browser risk material to changed code |
| Browser integration / user journey | No | No browser/frontend code changed | N/A | None material after built GraphQL contract proof | None |
| Authentication / session / permissions | Preserved | Gemini setup modes and vault slots unchanged | Mode matrix and secret lifecycle/live harness | Availability of configured live credentials/entitlement | Live preflight and gated live attempt |
| Desktop renderer / web-equivalent UI | No | No renderer code changed | N/A | No shell or renderer-specific changed behavior | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes, validation only | Built server startup/test runtime and live harness | Project `startBuiltTestServer`; server E2E | Current build/runtime integration | Built server HTTP, full deterministic E2E, live runner |
| Persisted-data transition | Yes, semantics only | Removed current membership with unchanged stored strings/snapshots | Current guard unit; history projection unit | Real factory-to-launch boundary and SQL/GraphQL historical projection | Server durable integration/E2E |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Yes | Google Gen AI SDK/provider | Mocked final SDK-method captures | SDK JSON transformation and account-specific provider acceptance | Actual SDK to loopback HTTP; credential-gated live API |

## Project Execution Discovery

- Assigned task worktree: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash`, branch `requirements/gemini-3-8-flash`.
- Project type and runtime stack: pnpm 10.28.2 TypeScript monorepo; Node.js 22.23.2; Vitest 4; Fastify/GraphQL server; SQLite/Prisma test data; `@google/genai` 1.42.0 from the unchanged root lockfile.
- Conflicting, missing, or unclear project instructions: No `AGENTS.md` exists. Root/server README instructions are coherent. The server `typecheck` baseline is known to fail from pre-existing `rootDir=src` plus included tests; this will not be confused with a task defect. The full core suite has known unrelated image-client failures/open handles; task-focused and broader bounded suites will be reported separately.
- Required environment variables or secrets available: `No` for the selected Gemini live providers. Value-safe preflight proved the persistent test vault lacks both `provider.google.ai-studio.api-key` and `provider.google.vertex-express.api-key`. No value was read or recorded. Deterministic test configuration and isolated test databases were available.
- Existing process safety: PID 43 runs `node dist/app.js ... --data-dir /home/autobyteus/data` outside the task worktree. It is not owned by this validation and will not be stopped, reused, or queried.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/README.md` | Workspace setup/development/testing | `pnpm install`; deterministic `pnpm test:e2e`; value-safe `pnpm test:e2e:real:preflight` then `pnpm test:e2e:real`; dev state is distinct and not used for tests. |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/autobyteus-server-ts/README.md` | Server build/test/runtime | Build with `pnpm -C autobyteus-server-ts build`; tests use `.env.test` and temporary SQLite state; do not use development/production DB; unavailable live capability must be explicitly reported. |
| Root/core/server `package.json` | Authoritative scripts/dependency versions | Core build runs TypeScript plus runtime dependency verification; server build builds shared packages, generates Prisma, compiles, copies assets, and runs bootstrap smoke. |
| `autobyteus-ts/vitest.config.ts` | Core test runner | Node environment, setup file, 20s default timeout. |
| `autobyteus-server-ts/vitest.config.ts` | Server test runner | Fork pool, file parallelism disabled, Prisma setup/global setup, tests under `tests/**/*.test.ts`. |
| `test-support/live-e2e/run-live-e2e.mjs` | Value-safe live runner | Starts an owned built test server, runs selected live scenarios, scans output/evidence for secrets, verifies `.env.test` immutability, stops its server, deletes temporary evidence. |
| `test-support/live-e2e/live-e2e-scenarios.mjs` | Live scenario catalog | Current Gemini text scenarios are `gemini.ai-studio.llm` and `gemini.vertex-express.llm`, both exact 3.8. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Isolated test server/GraphQL helper | Starts built server on test-owned loopback resources; provides `executeGraphql` and `removeOwnedTestRuntime`; cleanup only owned roots/DBs. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | Worktree root | Existing `pnpm install --frozen-lockfile` state; rerun only if dependency links are invalid | `node_modules` already present; lockfiles must remain unchanged | Package version/build commands | No cleanup; committed dependency state unchanged |
| Core tests / SDK loopback | `autobyteus-ts` | `pnpm exec vitest run <paths> --no-watch` | Test-owned ephemeral loopback port; synthetic key only | Vitest result and captured JSON assertions | Test `afterEach/afterAll` closes server |
| Built server HTTP GraphQL | Worktree root/server | `pnpm --filter autobyteus-server-ts build`, then E2E test uses `startBuiltTestServer` | Unique temp runtime/SQLite and loopback port | `/rest/health` bootstrap readiness and GraphQL response | `server.stop()` and `removeOwnedTestRuntime` |
| Deterministic server E2E | Worktree root | `pnpm test:e2e` | Vitest global setup and test-owned temporary SQLite | Suite result | Project hooks/global cleanup |
| Live Gemini runner | Worktree root | `pnpm test:e2e:real:preflight -- --scenarios=...`; `pnpm test:e2e:real -- --scenarios=...` is not the root-script argument shape, so invoke `node test-support/live-e2e/run-live-e2e.mjs --scenarios=...` after server build or use `pnpm exec` equivalent | Persistent project test runtime/vault; value-safe output; owned child server | Harness health/status JSON | Runner stops child server and removes evidence dir; do not delete configured vault/test state |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Exact catalog projection | Built test server static registry | No credential or provider HTTP required | Unique runtime/DB removed |
| Historical 3.7 token record | `buildCurrentTokenUsagePayload` + current SQL store in test DB | Synthetic identity/cost only | Delete owned run/facet rows after each test |
| Stale saved/current selection | Existing application launch-host validator with real `LLMFactory.requireCurrentModelIdentifier` | No persisted user profile or live process | Reset factory test state |
| SDK wire | Local Node HTTP server plus installed `GoogleGenAI` | Synthetic API key; never record headers; body contains no real secret | Close loopback server and retain only assertions |
| Live account identity | Existing encrypted test vault through `LiveE2eHarness` | Preflight/output are value-free and evidence-scanned; no direct vault reads | Retain configured project test vault; runner removes only owned temp evidence/server process |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` sections `Persisted Data / State Transition Decision` and `Migration Plan`; `implementation-handoff.md` sections `Legacy / Compatibility Removal Check` and `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: an AutoByteus configuration with exact `gemini-3.7-flash` must fail current-model launch validation, while a SQL token-usage record storing exact 3.7 provider/identifier/value and cost remains projected exactly as stored.
- Evidence planned: a server launch-host validation test wires the production `LLMFactory` membership guard; a token-usage SQL/GraphQL E2E inserts and queries exact historical 3.7 identity and stored aggregate cost; source/diff scans confirm no migration or compatibility branch.
- Migration-specific completion/recovery scenarios: `N/A — migration is forbidden/not required`.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/gemini-llm.test.ts` | Final method-level send/stream config, modes, levels/thoughts, forbidden fields, 3.1 preservation | AC-003–AC-005, AC-009; DLS-001 | Still Valid | Review-passed 7-test focused suite | Rerun; complement with actual SDK HTTP serialization/error test. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | 3.8 tool calls/results, native context, ID/name/order | AC-005; DS-003 | Still Valid | Existing final provider-method capture | Rerun. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Exact row/schema/metadata/pricing and 3.7 rejection | AC-001, AC-002, AC-006, AC-007 | Still Valid | Review-passed catalog assertions | Rerun. |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Exact API-key/Vertex mapping | AC-003 | Still Valid | Explicit mapping cases | Rerun. |
| `autobyteus-ts/tests/unit/llm/errors/provider-error.test.ts` | Safe redaction and stable Gemini missing-key message | AC-009 | Still Valid | Generic shared error contract | Rerun with adapter/SDK failure-path complement. |
| `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` | Three modes project 3.8 metadata with zero Gemini vault lookup/fetch | AC-001, AC-008 | Still Valid | In-process GraphQL plus test-server migration bootstrap | Rerun; complement with actual built HTTP GraphQL exact identity/schema. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Intro/standard boundary and invalid time | AC-007 | Still Valid | Direct production pricing provider | Rerun with broader token E2E. |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts` | Exact historical 3.7 display from stored identity | AC-006 | Still Valid | Pure projection unit | Rerun; add SQL/GraphQL durable boundary. |
| `autobyteus-server-ts/tests/unit/application-platform/application-current-model-selection-policy.test.ts` and host validator tests | Generic removed model produces current-selection issue | AC-006 | Still Valid but incomplete for this exact identity | Dependencies currently mocked with generic `removed-model` | Add exact 3.7 case using real current registry through host validator. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | SQL store to GraphQL analytics identity/cost | AC-006, AC-007 | Still Valid but incomplete for 3.7 history | Strong existing persistence/GraphQL fixture; no exact Gemini history case | Add exact stored 3.7 identity/cost case. |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Value-safe preflight/live provider boundary | AC-009, AC-011 | Still Valid | Current scenarios exact 3.8 and harness masks operation failures | Run selected Gemini preflight and live attempts. |
| Broader `autobyteus-server-ts/tests/e2e/**` | Server/API/process/persistence regression | AC-011, QR-003 | Still Valid | Project authoritative deterministic E2E route | Run as broader regression. |

## Stale Or Obsolete Coverage Decisions

No existing coverage will be deleted. Assertions that name 3.7 are valid only where they prove removed-current selection or historical identity. Archived ticket evidence remains out of scope and unchanged.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| SCN-002 / SCN-006 | Actual SDK JSON serialization and provider-error extraction | REQ-003, REQ-005, REQ-010, REQ-013; AC-003, AC-009, AC-011; DLS-001 | `autobyteus-ts/tests/integration/llm/api/gemini-llm-wire-contract.test.ts` | Method mocks bypass the installed SDK converter and HTTP error shape; lower-case typing/wire seam is the main residual external-boundary risk. |
| SCN-001 | Built server HTTP GraphQL exact row/schema/absence | REQ-001, REQ-002, REQ-004, REQ-007, REQ-009; AC-001, AC-002, AC-008 | `autobyteus-server-ts/tests/e2e/llm-management/gemini-3-8-catalog-http.e2e.test.ts` | Existing metadata test invokes GraphQL in process; actual built process/HTTP transport adds direct system-boundary evidence. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| SCN-004 | `autobyteus-server-ts/tests/unit/application-platform/application-launch-host-capability-validator.test.ts` | Add exact stale 3.7 validation using production `LLMFactory.requireCurrentModelIdentifier` | REQ-002, REQ-011; AC-006; DS-004 | Proves real catalog membership reaches launch-host readiness without alias. |
| SCN-004 / SCN-005 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Add exact historical 3.7 SQL/GraphQL identity and stored-cost assertion | REQ-011; AC-006, AC-007; DS-008 | Proves current row removal does not rename or reprice historical evidence. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused core Vitest including new SDK-wire, adapter, provider-native, catalog, mapping, provider-error tests | `autobyteus-ts` | SCN-001–SCN-003, SCN-006 | Pass — 6 files / 43 tests | Ledger `API-E2E-001` |
| 2 | `pnpm --filter autobyteus-ts build` | Worktree root | Type/runtime dependency and lower-case SDK seam | Pass | Ledger `API-E2E-001` |
| 3 | Server build plus focused HTTP catalog, three-mode metadata, stale selection, pricing, historical analytics/projection Vitest | `autobyteus-server-ts`; owned built test server | SCN-001, SCN-004, SCN-005 | Pass — build; 2 files / 4 tests; 5 files / 43 tests | Ledger `API-E2E-002` / `API-E2E-003` |
| 4 | `pnpm test:e2e` plus individual fresh-process reruns of all failed files | Worktree root | Broader server API/process/persistence regressions | Fail — 53 files / 184 tests passed; 6 files / 25 tests failed; 14 files / 53 tests skipped. Five unchanged suites reproduced 23 unrelated failures; the only changed failed suite passed 5/5 alone. No Gemini scenario failed. | `api-e2e-evidence/server-e2e.log`; `api-e2e-evidence/server-e2e-isolation.log`; ledger `API-E2E-004` |
| 5 | Broader core LLM suite; reference, diff, manifest/lock, SDK, and generated-output checks | Worktree root | Clean replacement, provider regressions, QR-002/QR-004, no incidental dependency change | Pass — 63 files / 310 tests; zero active source/live 3.7 references; no manifest/lock diff; clean diff check | `api-e2e-evidence/core-llm-unit.log`; ledger `API-E2E-005` |
| 6 | Scoped live preflight and live execution for both Gemini LLM modes | Worktree root, project live runner, owned built server | SCN-002, SCN-006 / AC-011 | Preflight Pass 2/2; live operations Blocked/Skipped 2/2 by exact missing key capabilities | `api-e2e-evidence/gemini-live-preflight.log`; `api-e2e-evidence/gemini-live-execution.log`; ledger `API-E2E-006` / `API-E2E-007` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — seven independently meaningful cases include a potentially long full E2E suite and credential-gated live execution, creating interruption risk.
- Canonical ledger path: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: independently meaningful boundary or operational journey.

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| API-E2E-001 | Core adapter, installed SDK wire/error, tool/stream/3.1 regressions, build | REQ-003–REQ-006, REQ-010, REQ-013; AC-003–AC-005, AC-009, AC-011 | Core durable unit/integration + loopback HTTP + build | Focused Vitest and core build | 1 | Exact JSON body, safe error, all focused tests/build pass |
| API-E2E-002 | Catalog over built HTTP and three-mode metadata independence | REQ-001, REQ-002, REQ-004, REQ-007, REQ-009; AC-001, AC-002, AC-008 | Built server HTTP GraphQL plus in-process spy matrix | Focused server E2E | 2 | Exact row/schema/limits; 3.7 absent; zero credential/fetch calls |
| API-E2E-003 | Stale-selection, historical identity/cost, observation-time pricing | REQ-002, REQ-008, REQ-011; AC-006, AC-007 | Server launch policy + SQL/GraphQL + pricing | Focused server unit/E2E | 3 | Exact 3.7 issue; stored 3.7/cost unchanged; exact price boundaries |
| API-E2E-004 | Broader deterministic server E2E regression | REQ-013; AC-011; QR-003 | Repository E2E suite | `pnpm test:e2e` | 4 | Full deterministic E2E outcome, unrelated skips/failures classified |
| API-E2E-005 | Build/reference/secret/lock hygiene | REQ-012, REQ-013; AC-010, AC-011; QR-002, QR-004 | Repository/source/package evidence | scans and `git diff --check` | 5 | Only docs/stale/history 3.7 matches; no locks/manifests/secrets changed |
| API-E2E-006 | Gemini live capability preflight | REQ-010, REQ-013; AC-009, AC-011 | Built test server + encrypted vault/harness | selected live preflight | 6 | Value-safe READY or exact configured/access blocker |
| API-E2E-007 | Gemini live provider request(s) | REQ-003, REQ-005, REQ-010, REQ-013; AC-003, AC-009, AC-011 | Live Google provider via product LLM factory | selected live runner | 7 | Live response when access exists, otherwise explicit safe skip/blocker |

## Post-Repository Confidence Scorecard

Scores below reflect completed deterministic repository, actual installed-SDK loopback HTTP, built-server HTTP, persistence/GraphQL, build, hygiene, and isolation-classification evidence before giving the credential-gated live result any confidence credit.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | All eleven ACs are linked to passing focused/build/API/persistence evidence; AC-011's permitted live-blocker branch is separately exercised | Live Google acceptance could not be observed | Configure either approved test-vault capability and rerun live |
| Changed-boundary execution directness | 98% | Production adapter/catalog/pricing/guard/history code was exercised, including actual SDK JSON and built HTTP GraphQL | No live provider response | Credentialed live run |
| Cross-boundary integration realism and mock gap | 96% | Installed SDK → HTTP, built server → HTTP GraphQL, SQL → analytics GraphQL, and factory → launch guard all passed | External Google service/account boundary remains unavailable | Credentialed live run |
| Environment, configuration, identity, and fixture fidelity | 95% | Pinned SDK/toolchain, clean builds, all three identity modes, owned test server, isolated SQLite, and current live scenario definitions were verified | Account entitlement/quota/region not known before live preflight | Value-safe preflight/live attempt |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Actual SDK 429 shape/redaction, missing-key error, invalid time, stale selection, history retention, build/start lifecycle, and broader-failure isolation all have evidence | Repository-wide E2E has unrelated baseline failures | Repair five unchanged test suites and cross-test analytics isolation outside this package |
| User-surface, browser, and desktop-shell confidence | `N/A` | No frontend, renderer, or desktop-shell code changed; exact generic GraphQL contract is the relevant user-surface input | Delivery still owns final docs/user verification | No browser validation is justified for unchanged generic UI |
| Durable regression coverage quality and relevance | 98% | Two narrow durable additions and two boundary-strengthening updates passed; broader LLM 310/310 passed | Independent proportional test-code review remains pending | Code Reviewer reviews the four changed test paths |

- Overall post-repository confidence: `96.7%`.
- Calculation method: simple average of the six applicable categories; browser/desktop is genuinely inapplicable.
- Every critical acceptance criterion directly proven: `Yes` — AC-011 explicitly accepts the truthful access-blocker path when live access is unavailable.
- Any applicable category below 90%: `No`.
- Default clean-confidence target of 95% met: `Yes`.
- Material residual risks: account-specific Google acceptance is unobserved because both key capabilities are missing; the repository-wide server E2E command has unrelated baseline failures in five unchanged files plus cross-test analytics DB contamination.

## Broader Validation Decision

- Decision: `Blocked` after the required `Live API` attempt.
- Selected execution mode: `Live API` plus project `CLI` live harness, after repository/built-system checks.
- Specific confidence gap or residual risk addressed: actual Google account/model acceptance, setup-mode credentials/entitlement/quota/region, and truthful access classification.
- Why the selected mode can materially improve confidence: the provider is the only boundary that can confirm account-specific model availability after deterministic request construction has been proven independently.
- Expected confidence after selected validation: met. The exact safe unavailable/not-configured outcome preserves confidence above 95%, while live success would have raised external-integration fidelity further.
- Browser-specific decision and rationale: Browser validation is not required. No web code, UI state transition, route, browser API, or desktop-renderer boundary changed. The generic selector consumes the GraphQL catalog/schema, which is directly exercised over built HTTP; a screenshot would not improve provider/persistence confidence.
- If Blocked: Both owned-harness scenarios were ready, but the encrypted test vault had no configured `provider.google.ai-studio.api-key` and no configured `provider.google.vertex-express.api-key`. Actual execution returned `SKIPPED_NOT_CONFIGURED` for both after safe build/preflight/live attempts. No provider request occurred.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists elsewhere in the workspace, but no shell or renderer code changed.
- Relevant README or development instructions: Root README distinguishes web-equivalent and packaged Electron paths.
- Web-equivalent behavior: Generic model selector consumes server GraphQL data; changed input contract will be proved by built HTTP GraphQL.
- Shell-specific or lifecycle behavior: None affected.
- Chosen validation approach: No desktop/browser run; it would not close the SDK/provider/history risks.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: Final documentation/user-facing verification remains Delivery-owned, not an API/E2E confidence blocker.

## Live Environment And Fixture Plan

- Startup order and commands: build core/server; run deterministic cases; run selected Gemini preflight; run selected live scenarios only through the project runner.
- Environment choices: existing `.env.test` template and persistent test runtime/vault; never `.env.development`, production DB, or PID 43 process.
- Health/readiness checks: `startBuiltTestServer` exact health wait; live harness preflight health JSON.
- Seed data/fixtures: isolated synthetic server DBs for deterministic cases; no live provider data beyond one minimal text prompt.
- Test identities/authentication/permissions: existing encrypted test-vault slots for AI Studio and Vertex Express if configured; no values read or printed.
- Requirement-linked journeys: exact 3.8 one-shot text request in each ready mode; value-safe skip/blocker otherwise.
- Evidence to capture: sanitized Vitest stdout/result, stable instruction codes, no secret-bearing headers or payloads.
- Owned processes/state cleanup: runners stop only their own children; deterministic tests remove unique runtimes/DBs; configured vault remains intact.
- Executed result: The rebuilt owned server passed preflight for both exact scenarios. Actual runner execution passed harness checks and skipped both live provider calls with exact missing-capability identifiers; the built child server stopped cleanly and evidence scanning raised no leak error.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| SCN-002 discovery probe | One-off installed `GoogleGenAI` call to an ephemeral local HTTP server | Confirmed SDK 1.42.0 supports custom loopback base URL and serializes lower-case `thinkingLevel`; informed durable test feasibility | Replaced by `gemini-llm-wire-contract.test.ts`; no probe file retained |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Three current documentation files | Explicitly Delivery-owned upstream | Stale prose until delivery sync | Delivery must update and classify remaining references |
| Vertex Project live provider | Current live scenario catalog exposes AI Studio and Vertex Express only; deterministic mode matrix covers Vertex Project construction/mapping | Account/project-specific Vertex Project acceptance may remain unobserved | Record as bounded residual unless existing configured project surface becomes safely available; do not invent credentials |
| Credentialed AI Studio and Vertex Express provider response | Both required test-vault capabilities are absent; the value-safe live runner returned `SKIPPED_NOT_CONFIGURED` for each | Account/model entitlement, quota, and remote-service acceptance remain unobserved | Configure an approved isolated test credential in either named vault slot and rerun the existing selected live command; no source change is implied |
| Browser/Electron | No changed boundary | None material | No action |

## Ambiguities Or Reroute Triggers

None identified. A deterministic test failure will be investigated before classification; a provider access result will not be mislabeled as source failure.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — add two files, update two files, remove none`
- Post-repository confidence: `96.7%`.
- Broader validation decision: `Blocked after required Live API attempt — exact missing AI Studio and Vertex Express key capabilities; approved truthful blocker recorded`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The coverage plan was executed. Direct SDK/HTTP and exact persisted-boundary evidence replace the main mock gaps. The broad server command's nonzero result was isolated to unrelated baseline defects; it is retained as a limitation rather than hidden or treated as a Gemini regression.
