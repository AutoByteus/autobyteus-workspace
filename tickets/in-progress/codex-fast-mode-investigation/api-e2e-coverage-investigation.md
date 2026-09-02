# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/fast-mode-probe-report.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/solution-revision-record.md` (`SR-001`, `SR-002`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/code-review-revision-record.md` (`CRR-001`, `CRR-002`)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3`
- Trigger: Explicit user request for a real browser test: start the repository backend and frontend, import `/Users/normy/autobyteus_org/autobyteus-agents`, select Daily Assistant, configure Codex Fast mode, and complete a real user turn through the browser using `open_tab`.
- Prior Investigation Reviewed: Round 2 / `API-REV-002` / `Pass / 96.9%`.
- Latest Authoritative Investigation: Round 3 / `API-REV-003` / `Pass / 98.7%`. The requested real-browser journey, actual Codex App Server turn, runtime-tier audit, and owned-resource cleanup all completed successfully.

## Current Requirement And Design Basis

The approved change is only Codex Fast capability discovery (`BEH-004`, `REQ-005`–`REQ-006`, `AC-006`–`AC-010`). Canonical camel-case `model/list.serviceTiers` is the sole capability authority. A structured entry whose string `id`, after trim/lowercase normalization, equals `priority` must publish the unchanged optional `service_tier` schema parameter labeled `Fast mode` with `enum_values: ["fast"]`. Missing, malformed, non-priority, deprecated camel-only, and deprecated snake-only input must omit that parameter. Reasoning metadata and other model mapping remain unchanged.

The stable product/runtime value remains `llmConfig.service_tier = "fast"`; existing values are directly usable with no migration. Existing runtime propagation/shared-process behavior (`BEH-001`, `REQ-001`–`REQ-004`, `AC-001`–`AC-005`) and the absence of effective-tier runtime/header UI (`BEH-005`, `REQ-007`, `AC-011`) are preserved. The 0.151.0/0.152.0 supplemental probes establish current structured metadata and correct Default -> Fast -> Default live tier isolation. The current repository live catalog test now independently projects the canonical structured capability and truthfully names both reasoning and Fast parity.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-004` / raw Codex `model/list` -> normalizer -> catalog -> GraphQL schema | Changed | Requirements `REQ-005`–`REQ-006`; design `DS-001`–`DS-002`; `IR-001`; `CRR-001` | Update the durable live raw-capability projection, then execute it against the real Codex app-server boundary. |
| `BEH-001` / stored product `fast` -> Codex start/resume/turn | Preserved | `REQ-001`–`REQ-004`, probe report, unchanged runtime source, implementation/code review | Re-run focused durable runtime normalization/propagation coverage; no new runtime test is required for this backend-local discovery edit. |
| `BEH-005` / generic configuration form only; no effective-tier status UI | Preserved | `REQ-007`, `AC-011`, user decision, two-file implementation diff | Re-run existing generic form coverage and source/diff audit. The later explicit user request authorizes a temporary real-browser journey without adding a new effective-tier UI. |
| Deprecated `additionalSpeedTiers` / `additional_speed_tiers` capability authority | Removed | `AC-009`, design legacy-removal policy, implementation/code-review audits | Retain the deterministic negative unit guard; remove the deprecated authority from the live test projection without adding fallback. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Raw external model-row normalization into generic `ModelInfo.config_schema` | Focused normalizer unit suite | Unit fixtures do not prove the current live provider row | Live Codex integration |
| API / transport / contract | Yes | Codex app-server `model/list` input and GraphQL catalog publication output | Corrected live catalog integration test | None material after the independent structured projection passed live | Completed live API/integration |
| Frontend component / state | No source change; preserved consumer behavior | Existing generic schema-driven selector | `ModelConfigSection.spec.ts`, `AgentRunConfigForm.spec.ts`, and completed real-browser use | None material | Completed browser supplement |
| Browser integration / user journey | No browser-specific source change; explicitly requested validation | Agent-package import -> Daily Assistant -> live catalog-driven Fast selection -> WebSocket/Codex response | Component DOM/state assertions plus completed `API-BROWSER-001` real-browser journey | None material after the completed live journey | Real browser via canonical development stack |
| Authentication / session / permissions | No source change | Existing Codex CLI authentication is used for live catalog discovery and the real Daily Assistant runtime turn | Live integration gating, upstream probes, and completed Round 3 Codex response | None material in the executed environment | Completed live catalog and runtime turn |
| Desktop renderer / web-equivalent UI | No source change | Same generic Vue component/schema contract | Frontend unit DOM assertions plus real browser execution of the equivalent web surface | None material for the web-equivalent surface | Completed real browser; Electron shell unnecessary |
| Desktop shell / Electron-specific integration | No | None | N/A | N/A | None |
| Process / lifecycle | No source change | Test-owned client lifecycle plus the canonical full backend/frontend development stack | Live integration lifecycle and Round 3 full-stack startup/shutdown/port audit | None material after browser tab, WebSocket session, services, and isolated state were cleaned | Completed canonical stack lifecycle |
| Persisted-data transition | Preserved | Existing `llmConfig.service_tier: "fast"` remains readable | Normalizer/runtime resolver/bootstrap coverage and upstream live history evidence | No catalog row is persisted; no migration boundary exists | None |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None |
| External integration | Yes | Installed/current Codex app-server structured model catalog | Corrected live integration plus 0.151/0.152 probe report | Future provider ID changes intentionally fail closed | Live Codex integration |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation`
- Project type and runtime stack: pnpm monorepo; Node.js/TypeScript Fastify + GraphQL server; Vitest; Vue/Nuxt frontend; external local Codex app-server CLI.
- Conflicting, missing, or unclear project instructions: the generic server `typecheck` is a known unusable gate because `tsconfig.json` combines `rootDir: src` with included tests, yielding repository-wide `TS6059`; the passing production build uses `tsconfig.build.json`. Direct `pnpm ... exec vitest` does not invoke package `pretest`, so shared outputs required explicit `prepare:shared`. The frontend worktree initially lacked generated `.nuxt/tsconfig.json`; `pnpm -C autobyteus-web exec nuxi prepare` generated the required test metadata.
- Required environment variables or secrets available: Yes. Existing Codex CLI authentication worked; no secret value was read or recorded. `RUN_CODEX_E2E=1` produced an executed, unskipped live catalog test on `codex-cli 0.152.0`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/AGENTS.md` | Closest server test instructions | Use `vitest run ... --no-watch`; integration command is `pnpm -C autobyteus-server-ts exec vitest run tests/integration --no-watch`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/README.md` lines 397-420 | Root E2E/Codex instruction | Deterministic E2E uses test-owned runtime; Codex tickets require `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/README.md` lines 483-646 | Server execution/environment instruction | Tests use `.env.test` and a temporary SQLite DB under `tests/.tmp`; live Codex suites are gated by `RUN_CODEX_E2E`; unavailable capabilities must not be called passed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/package.json` | Authoritative scripts | `test` runs Vitest; `build` runs shared builds, Prisma generation, production TypeScript, assets, and sanitized bootstrap smoke. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/vitest.config.ts` | Test configuration | Fork pool, serialized files, Node environment, setup/global DB reset; prompt-engineering exclusions. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/tests/setup/prisma-env.ts` and `prisma-global-setup.ts` | Fixture/data safety | Test `DATABASE_URL` is forced to the test-owned DB; global setup resets only that SQLite database. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-web/AGENTS.md` and `package.json` | Frontend test instruction | Use `pnpm test:nuxt <path> --run`; no watch mode. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | Direct changed-boundary durable coverage | Acquires real Codex client, pages `model/list`, independently projects raw capabilities, compares both direct catalog and GraphQL, releases/then closes the client manager. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/README.md` development instructions and root `package.json` | Canonical realistic-system execution | `pnpm dev` builds and starts the real backend at `127.0.0.1:8000` and Nuxt frontend at `127.0.0.1:3000` with isolated state under `.autobyteus/development/server-data`. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Vitest server test runtime | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation` | Selected `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | Resets test-owned SQLite DB under `tests/.tmp`; serialized test files | Vitest begins after Prisma reset | Process exits; no manually started server |
| Codex app-server | Spawned by the live integration through the client manager | `RUN_CODEX_E2E=1` on targeted/full Vitest command | Uses existing CLI auth; target test performs `model/list` only | Test must execute, not skip, and return at least one raw/catalog row | `releaseClient` in `finally`; manager `close()` in `afterAll` |
| Frontend unit DOM runtime | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-web` via pnpm `-C` | `pnpm -C autobyteus-web test:nuxt <paths> --run` | Vitest/happy-dom; no backend or browser process | Test runner executes relevant specs | Process exits |
| Production build | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation` | `pnpm -C autobyteus-server-ts build` | Rebuilds shared packages and Prisma client | Exit 0 plus built-in-agent smoke | Process exits |
| Real browser full stack | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation` | `pnpm dev`, then AutoByteus `open_tab` at `http://127.0.0.1:3000` | Real Fastify/GraphQL backend, Nuxt frontend, WebSocket, isolated development DB/run history, and existing Codex CLI identity | `DEV_SERVER_READY`, `DEV_WEB_READY`, browser DOM, exact assistant reply, persisted run metadata | Close tab, interrupt owned launcher, verify ports free, remove only Round 3-created development/generated paths |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Current raw Codex model rows | Real `model/list` via existing client manager | Read-only catalog request using existing CLI identity | Client released/manager closed |
| Server persistence fixture | Vitest global Prisma setup | Forced temporary SQLite DB; never development/production DB | Test-owned reset/reuse |
| Existing stored `service_tier: "fast"` shape | Deterministic runtime/unit fixture plus upstream historical real-run evidence | No migration or live user data mutation | No cleanup needed |
| Vue config-schema fixture | Existing component specs | In-memory only | Process exit |
| Browser-imported agent package | Settings -> Agent Packages UI imported `/Users/normy/autobyteus_org/autobyteus-agents` | External package read in place and not edited; registration isolated under Round 3 development state | Removed with the isolated `.autobyteus/development` state after completion |
| Live Daily Assistant run | Browser selected Daily Assistant, Codex App Server, GPT-5.6-Sol, and Fast | Existing Codex identity; minimal exact-response prompt; persisted metadata recorded `llmConfig.service_tier: "fast"` | Browser tab/session/services closed; isolated run data removed after evidence capture |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design “Persisted Data / State Transition Decision”; handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: `llmConfig.service_tier: "fast"` must continue resolving to runtime `serviceTier: "fast"`; Default remains omitted. Provider catalog rows are ephemeral.
- Evidence executed: focused normalizer/runtime resolver/bootstrap/thread tests passed (82 directly relevant backend assertions across the normalizer and three runtime files); the unchanged source/diff audit passed; Round 3 persisted real-run metadata directly records `service_tier: "fast"` for the completed Codex App Server turn.
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | Structured `priority` positive/normalized cases; malformed/non-priority/missing and deprecated-only negatives; unchanged reasoning/runtime normalization | `AC-006`–`AC-010`; persisted-data direct use | Still Valid | Updated by `IR-001`, independently source-reviewed in `CRR-001` | Execute focused suite. |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` / raw `advertisesFast` parity | Compare real raw structured capability with catalog and GraphQL schema; require a current positive `priority` row | `DS-001`, `DS-002`; `AC-006`, `AC-010` | Still Valid (after Round 2 update) | Commit `f6c16014f` supplies the independently normalized projection and positive live precondition; commit `06bcb57cf` resolves `CRR-002` / `TEST-001` by naming advertised reasoning and Fast capabilities; the focused live rerun passed 1/1 | Retain and return the name-only durable edit for proportional re-review. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` / service-tier normalization | Stored `service_tier` becomes Codex thread config | `BEH-001`; `AC-001`–`AC-005`; no migration | Still Valid | Runtime vocabulary remains `fast`; path unchanged | Execute focused file. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` / start and resume payload | Passes configured `serviceTier: "fast"` on thread start/resume | `BEH-001`; `AC-001`–`AC-005` | Still Valid | Runtime path intentionally unchanged | Execute focused file. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` / turn payload | Passes configured `serviceTier: "fast"` to `turn/start` | `BEH-001`; `AC-001`–`AC-005` | Still Valid | Runtime path intentionally unchanged | Execute focused file. |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` / Fast form, Default removal, stale sanitization | Generic schema renders Fast, emits `fast`, omits Default, removes unsupported stale config | `UC-001`–`UC-003`; `AC-011`; persisted data invariant | Still Valid | Generic schema shape is unchanged and no provider parsing exists | Execute focused file. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` / Codex schema defaults | Catalog-shaped schema reaches generic run form and leaves Default omitted | `UC-001`, `UC-003`; `AC-011` | Still Valid | Frontend source unchanged; fixture matches public shape | Execute focused file. |
| Other RUN_CODEX_E2E integration/E2E suites | Real thread, tool, memory, runtime, routing, and lifecycle behavior | Preserved `BEH-001` and broad Codex regressions | Unclear / mixed outside the changed boundary | Full execution exposed existing suite drift and environment/setup failures, including stale `submitInput` / `subscribeToEvents` test APIs, unrelated application-package setup, file-explorer, external-channel, and other failures. None can be caused by the one test-local projection edit or the reviewed normalizer predicate. | Do not use failing unrelated scenarios as feature proof. Preserve their evidence as repository health debt; no out-of-scope repair is made in this ticket. |
| Real browser full-stack journey | Agent-package import -> Daily Assistant discovery -> run configuration -> Codex Fast selection -> live response | User-requested confidence extension across unchanged browser surfaces and the changed catalog contract | Use Temporary Executable Probe Only — Completed / Pass | `API-BROWSER-001` exercised the real Nuxt UI, backend/WebSocket, persisted `service_tier: "fast"`, and Codex App Server response without adding ticket-specific durable coverage | Retain Round 3 logs/screenshots; no repository test change. |
| Electron-shell probe | Desktop-only shell, IPC, packaging, and window lifecycle | Out of scope | Out Of Scope | The user requested the web browser path specifically; no shell behavior changed | Do not launch Electron. |

## Stale Or Obsolete Coverage Decisions

No durable test is deleted or disabled. The live catalog scenario remains current and valuable; only its obsolete test-local authority is replaced.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/integration/services/codex-model-catalog.integration.test.ts` raw `advertisesFast` calculation | Deprecated `additionalSpeedTiers` / `additional_speed_tiers` determines live Fast capability | Approved contract makes canonical `serviceTiers[].id = priority` the sole authority; both fields may coexist and mask a production mismatch | `AC-006`–`AC-009`, design removal plan, `CRR-001` | Independent test-local structured-ID normalization in the same parity scenario | `N/A` — replacement required |

## Durable Coverage To Add

None. Existing unit, live catalog/GraphQL, runtime propagation, and generic form scenarios already cover the required boundaries once the stale live projection is updated.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-CAT-001` | `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` live catalog parity scenario | Completed at `06bcb57cf`: renamed the `it(...)` description from reasoning-only wording to explicitly state that the scenario preserves both advertised reasoning and Fast capabilities through catalog and GraphQL. The reviewed projection, precondition, assertions, fixtures, and cleanup are unchanged. | `CRR-002` / `TEST-001`; `REQ-005`–`REQ-006`; `AC-006`–`AC-010`; `DS-001`–`DS-002` | Focused live `API-CAT-001` passed 1/1; no full-suite rerun was required because no new evidence appeared. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

### Round 3 Real-Browser Results (plan recorded before service startup)

| Order | Command / Mode | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R3-1 | `pnpm dev` | Worktree root; ports 3000/8000 confirmed free; `.autobyteus/development` absent | Canonical current backend/frontend build, startup, isolated bootstrap, and readiness | Pass — `DEV_SERVER_READY` and `DEV_WEB_READY` | `api-e2e-evidence/19-round3-full-stack.log` |
| R3-2 | AutoByteus `open_tab` real-browser journey | `http://127.0.0.1:3000`; 450x738 viewport | Settings package remove/import, Daily Assistant selection, Codex App Server + GPT-5.6-Sol + Fast, actual prompt/response | Pass — exact assistant response `LIVE_FAST_BROWSER_OK`, browser status `Idle` | `api-e2e-evidence/20-round3-browser-runtime-audit.log`; browser screenshots |
| R3-3 | Read-only owned runtime-state and server-log audit | Isolated `.autobyteus/development/server-data` before cleanup | Confirms the browser run persisted `runtimeKind: codex_app_server`, model `gpt-5.6-sol`, and `llmConfig.service_tier: "fast"`; correlates prompt/response and WebSocket run id | Pass | `api-e2e-evidence/20-round3-browser-runtime-audit.log` |
| R3-4 | Browser/service/state cleanup audit | Closed tab `758f2e`; interrupted owned launcher; removed only paths confirmed absent before startup | No browser session, listeners on 3000/8000, isolated DB/run history, imported registration, or Round 3 generated output remains | Pass | `api-e2e-evidence/21-round3-cleanup.log` |

Round 3 changed no source, fixture, or durable test. Therefore no focused or full repository suite rerun was required. The prior repository evidence remains valid, while `API-BROWSER-001` adds direct realistic-system proof through the actual frontend, backend, WebSocket, persisted run metadata, and Codex App Server.

### Round 2 Focused Rerun Results (plan recorded before durable test edit)

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R2-1 | `pnpm -C autobyteus-server-ts prepare:shared` | Worktree root; Round 1 cleanup removed generated shared-package outputs | Restore the existing integration-test import prerequisite without changing product behavior | Pass — exit 0 | `api-e2e-evidence/15-round2-prepare-shared.log` |
| R2-2 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/services/codex-model-catalog.integration.test.ts --no-watch` | Worktree root; prepared shared outputs; current CLI auth | `API-CAT-001`: execute the unchanged structured Fast/reasoning assertions under the corrected truthful scenario name | Pass — 1 file / 1 test; runner output names both advertised reasoning and Fast capabilities | `api-e2e-evidence/16-round2-live-catalog-name-rerun.log` |
| R2-3 | Focused name/diff audit and owned generated-output cleanup | Worktree root | Only the reviewed scenario description changed; no unexpected durable or generated state remains | Pass — one-line name diff, `git diff --check` clean, no deprecated field in live test, exact generated outputs removed | `api-e2e-evidence/17-round2-name-diff-audit.log`; `18-round2-cleanup.log` |

The `CRR-002` correction is name-only and is committed as `06bcb57cf365ebc6ba12aef4ba4472e091fcd066`. The focused live rerun exposed no new evidence. The prior targeted, focused, build, UI, and full-suite evidence remains valid because no assertion or product behavior changed. Per the explicit code-review instruction, Round 2 did not rerun the full suite.

### Round 1 Authoritative Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts --no-watch` | Worktree root | `API-UNIT-001`: deterministic canonical/malformed/deprecated-removal contract | Pass — 1 file / 10 tests | `api-e2e-evidence/01-normalizer-unit.log` |
| 2 | First attempt: `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/services/codex-model-catalog.integration.test.ts --no-watch` | Worktree root; direct Vitest before shared-output preparation | `API-CAT-001` import/setup | Fail — 0 tests; missing built entry for `@autobyteus/application-sdk-contracts`. Preliminary local environment/setup classification; not a product assertion failure. | `api-e2e-evidence/02-live-codex-catalog-graphql.log` |
| 3 | `pnpm -C autobyteus-server-ts prepare:shared` | Worktree root | Required workspace package outputs for integration import | Pass | `api-e2e-evidence/03-prepare-shared.log` |
| 4 | Retry after setup: `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/services/codex-model-catalog.integration.test.ts --no-watch` | Worktree root; prepared shared outputs; current CLI auth | `API-CAT-001`: corrected real raw `model/list` -> catalog -> GraphQL parity | Pass — 1 file / 1 executed test | `api-e2e-evidence/04-live-codex-catalog-graphql-retry.log` |
| 5 | Final targeted run after adding an explicit positive structured-capability precondition: same command | Worktree root; prepared shared outputs; current CLI auth | `API-CAT-001`: confirms at least one live structured `priority` row and exact parity through catalog and GraphQL | Pass — 1 file / 1 executed test | `api-e2e-evidence/05-live-codex-catalog-graphql-positive.log` |
| 6 | Focused runtime files: `codex-thread-bootstrapper.test.ts`, `codex-thread-manager.test.ts`, `codex-thread.test.ts` | Worktree root | `API-RUNTIME-001`: preserved stored `fast` start/resume/turn propagation | Pass — 3 files / 72 tests | `api-e2e-evidence/06-runtime-propagation-unit.log` |
| 7 | First UI attempt: `pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts --run` | Worktree root before Nuxt generated metadata exists | `API-UI-001` import/setup | Fail — 0 tests; missing generated `.nuxt/tsconfig.json`. Preliminary local environment/setup classification; not a product assertion failure. | `api-e2e-evidence/07-generic-config-ui-unit.log` |
| 8 | `pnpm -C autobyteus-web exec nuxi prepare` | Worktree root | Generate Nuxt metadata required by documented frontend Vitest path | Pass | `api-e2e-evidence/08-nuxt-prepare.log` |
| 9 | Retry focused UI command | Worktree root after Nuxt prepare | `API-UI-001`: generic schema UI, Fast emission, Default omission, no new effective-tier surface | Pass — 2 files / 29 tests | `api-e2e-evidence/09-generic-config-ui-unit-retry.log` |
| 10 | `pnpm -C autobyteus-server-ts build` and scoped deprecated-reference/diff audit | Worktree root | Production/build integrity and clean-cut removal after test update | Pass — production build/bootstrap smoke; no deprecated production or live-parity references; `git diff --check` clean | `api-e2e-evidence/10-server-production-build.log`; `api-e2e-evidence/11-diff-legacy-audit.log` |
| 11 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run` | Worktree root; project-required Codex-ticket gate; `codex-cli 0.152.0` | `API-REG-001`: broader server regression/live Codex suite | Fail overall — 63 files / 177 tests failed; 593 files / 3,414 tests passed; 17 files / 76 tests skipped. The changed-boundary live catalog file passed (1/1). Failures span pre-existing unrelated/stale suites and are not causally reachable from the one test-local coverage edit or normalizer change. | `api-e2e-evidence/12-full-server-live-codex.log`; `api-e2e-evidence/13-environment-and-full-suite-summary.log` |

## Post-Repository Confidence Scorecard (Mandatory)

The changed boundary and all critical acceptance criteria are directly proven. Round 3 additionally joins the real browser UI to the backend/WebSocket/Codex runtime and persists the selected Fast value. The full repository gate remains non-clean, but its 177 failures are broad existing suite/setup/test-API drift outside this two-file feature change; the exact live catalog scenario passed inside that run and in three focused runs, including the Round 2 rerun under the corrected title.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 100% | `AC-006`–`AC-010` are covered by 10 focused normalizer cases plus a positive real structured catalog row through direct catalog and GraphQL; `AC-011` is covered by source scope and 29 UI tests; preserved runtime criteria have focused propagation coverage and upstream direct probes. | None material for approved scope | N/A |
| Changed-boundary execution directness | 100% | Real `codex-cli 0.152.0` `model/list` rows are independently projected and compared with production catalog and GraphQL output; the test requires at least one current `priority` row. | None material | N/A |
| Cross-boundary integration realism and mock gap | 100% | Real external app-server -> production catalog -> GraphQL passed durably, and `API-BROWSER-001` joined the real Nuxt UI, backend, WebSocket session, persisted run metadata, and actual Codex App Server response without mocks. | None material for the requested path. | N/A |
| Environment, configuration, identity, and fixture fidelity | 98% | Existing CLI identity worked; the live test executed unskipped; canonical `pnpm dev` built the current stack; fixed ports and isolated development storage were verified before/after; the imported agent package was exercised in place. | The broad repository suite remains a non-clean baseline, and generated prerequisites were initially absent in earlier focused runs. | Repair repository-wide setup/test drift separately. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Malformed, missing, non-priority, deprecated-only, case/whitespace, Default omission, client release/close, full-stack startup/shutdown, WebSocket disconnect, port release, and isolated-state removal passed. | The broad server run has 177 unrelated failures, including stale live runtime test APIs; those scenarios cannot be treated as clean regression evidence. | Separate repository-wide coverage maintenance would raise this score. |
| User-surface, browser, and desktop-shell confidence | 100% | 29 component assertions plus a real browser journey proved package import, agent discovery, live Fast control, run launch, response rendering, and Idle completion. Electron shell behavior is genuinely inapplicable because no shell-specific behavior changed. | None material for the web-equivalent requested path. | N/A |
| Durable regression coverage quality and relevance | 98% | Commit `f6c16014f` uses an independent canonical structured-ID projection, forbids legacy aliases by omission/audit, requires a positive live row, and compares both direct catalog and GraphQL; commit `06bcb57cf` makes that responsibility explicit in the scenario name and the live runner output. | Proportional re-review of the bounded durable test edit remains required. | `/code_reviewer` re-review. |

- Overall final confidence after Round 3 broader validation: `98.7%`
- Calculation method: simple average of seven applicable categories: `(100 + 100 + 100 + 98 + 95 + 100 + 98) / 7 = 98.7`.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: the full server suite is not a clean regression baseline (63 failed files / 177 failed tests across unrelated and stale areas); the generic package typecheck remains unusable; future provider-ID change intentionally fails closed.

## Broader Validation Decision (Mandatory)

- Decision: `Required — completed / Pass` because the user explicitly requested a real browser journey after Round 2.
- Selected execution mode: canonical isolated `pnpm dev` backend/frontend stack plus AutoByteus `open_tab` browser interaction and read-only runtime-state/log correlation.
- Specific confidence gap or residual risk addressed: joined the separately proven catalog, generic form, backend, WebSocket, persistence, and Codex runtime boundaries into one actual user journey.
- Why the selected mode materially improved confidence: the browser imported the requested agent package, configured Daily Assistant with live Codex Fast, sent a real prompt, rendered the exact Codex response, and the backend persisted `llmConfig.service_tier: "fast"` for the same run id.
- Expected confidence after the selected validation: achieved `98.7%` with no applicable category below `90%`.
- Browser-specific decision and rationale: `Required by explicit user request`; completed successfully through the real Nuxt application and canonical backend.
- Desktop-shell decision: `Not Required`; the tested behavior is web-equivalent and no Electron-shell boundary changed.
- If `Blocked`: `N/A`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the web UI, but shell behavior is not affected.
- Relevant README or development instructions: root packaged Electron API/E2E section; `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: generic schema-driven config controls only.
- Shell-specific or lifecycle behavior: none.
- Chosen validation approach and why it fits the project: focused frontend DOM/state specs, real backend GraphQL integration, and a real browser execution of the full web-equivalent journey; actual Electron execution would not add evidence about the changed normalizer or generic web path.
- Server/frontend setup when browser validation is used: canonical `pnpm dev`; backend `127.0.0.1:8000`; frontend `127.0.0.1:3000`; isolated state under `.autobyteus/development/server-data`.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron packaging/window/IPC remains unexecuted and inapplicable; the full web-equivalent behavior was directly proven in a real browser.

## Live Environment And Fixture Plan

- Startup order and commands: prior rounds prepared shared outputs and ran live Vitest; Round 3 confirmed ports/state ownership and ran canonical `pnpm dev`, then opened `http://127.0.0.1:3000` with `open_tab`.
- Environment choices that materially affected the run: current worktree; macOS arm64; Node 22.23.1; pnpm 10.28.2; real local Codex App Server identity; isolated development state under the worktree.
- Health / readiness checks: `DEV_SERVER_READY http://127.0.0.1:8000`, `DEV_WEB_READY http://127.0.0.1:3000`, browser DOM assertions, exact response, matching run metadata/trace, and post-stop port checks.
- Seed data / fixtures: the external agent package was imported through the UI; the launcher-created template registration was first removed so import was genuinely exercised. No external package files or user data were modified.
- Test identities, authentication, permissions, or session state: existing local Codex identity; no identity mutation or secret inspection.
- Requirement-linked journeys or scenarios: `API-CAT-001`; user-requested `API-BROWSER-001`.
- Evidence captured: all prior targeted/full Vitest/build/audit evidence plus Round 3 lifecycle log, browser/runtime audit, cleanup audit, package-import screenshot, and completed-run screenshot.
- Owned processes and temporary state cleaned up: browser tab closed; WebSocket session closed; owned `pnpm dev` stack interrupted; ports 3000/8000 free; only Round 3-created `.autobyteus/development`, shared SDK `dist`, and frontend `.nuxt` paths removed.

## Temporary Executable Validation Plan

### Round 3 Real Browser Journey (recorded before startup; now completed)

| Scenario ID | Setup / Action | Expected Evidence | Data / Process Ownership | Planned Evidence |
| --- | --- | --- | --- | --- |
| `API-BROWSER-001` | Confirm fixed ports `127.0.0.1:8000` and `:3000` are free; run canonical `pnpm dev` from the assigned worktree | Launcher builds the current server and reports exact backend/frontend readiness | The worktree has no pre-existing `.autobyteus/development` state; launcher owns both child processes | `api-e2e-evidence/19-round3-full-stack.log`; readiness probes |
| `API-BROWSER-001` | Open `http://127.0.0.1:3000` with `open_tab`; navigate to Settings -> Agent Packages; import `/Users/normy/autobyteus_org/autobyteus-agents` | Success feedback and a local package row; Daily Assistant becomes discoverable in Agents | External package is read in place and must not be edited; imported registration exists only in the test-owned development state | DOM snapshots and screenshots |
| `API-BROWSER-001` | Open Daily Assistant, choose Run, select Codex runtime and a live model exposing the structured Fast capability, select Fast mode, then send an exact-response smoke prompt | UI exposes Fast from the live catalog, the run starts through the real frontend/backend/WebSocket/Codex path, and the assistant returns the requested marker | Use a minimal ephemeral prompt and the isolated development DB/workspace/run history | Browser screenshots/DOM plus backend/runtime logs |
| `API-BROWSER-001` | Inspect owned logs/state for the stored `service_tier: "fast"` and live completion evidence | Corroborates that the browser selection reached the Codex runtime rather than only rendering | Read-only inspection of worktree-owned development data and logs | `api-e2e-evidence/20-round3-browser-runtime-audit.log` |
| `API-BROWSER-001` | Close the browser tab, stop the owning `pnpm dev` session, and remove only the newly created `.autobyteus/development` root | No owned service, imported-package registration, database, or run-history residue remains | Cleanup is safe because the root and fixed ports were confirmed absent/free before setup | `api-e2e-evidence/21-round3-cleanup.log` |

- Durable coverage decision: no repository-resident test addition or update is planned. This is a user-requested temporary realistic-system journey supplementing the already durable live catalog test.
- Browser approach: required by explicit user request and appropriate because the requested proof spans import UI, agent discovery, schema-driven Fast control, run launch, streaming response, and actual Codex runtime.
- Desktop approach: `Not Required`; the requested and material behavior is web-equivalent, and the user explicitly selected the real browser path.
- Reroute trigger: if the browser journey exposes a product defect, stop, preserve evidence, update this investigation, and route the failure package through `/code_reviewer`; do not repair unrelated UI or runtime code during validation.
- Completion result: `Pass`. The exact real run id was `daily_assistant_02fb5512fa2f4bf1bbecd2f7898d8516`; persisted metadata recorded model `gpt-5.6-sol`, runtime `codex_app_server`, and `llmConfig.service_tier: "fast"`; the browser rendered `LIVE_FAST_BROWSER_OK` and `Idle`.
- Cleanup result: `Pass`. Tab closed, WebSocket disconnected, both fixed ports free, and all Round 3-owned isolated/generated paths removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Future Codex provider IDs other than current `priority` | Explicitly outside approved current contract | Fast intentionally disappears if upstream contract changes | Separate reviewed contract update if observed |
| Effective-tier runtime/header status | Explicitly rejected/out of scope | None for capability discovery | No follow-up |
| Actual Electron shell | No shell-specific behavior changed | Negligible | None unless new evidence contradicts no-change scope |

## Ambiguities Or Reroute Triggers

No requirement/design ambiguity. The full-suite failures are recorded as unrelated repository coverage/setup debt rather than an ambiguity in this change.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No in Round 3`. Historical API/E2E durable updates remain commits `f6c16014f` and `06bcb57cf`; no file changed during browser validation.
- Final confidence after broader validation: `98.7%`
- Broader validation decision: `Required by explicit user request — completed / Pass`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: `TEST-001` remains resolved and its Round 2 focused live test passed 1/1. Round 3 added a successful real-browser Daily Assistant journey through the actual frontend/backend/WebSocket/Codex App Server with persisted Fast configuration and complete cleanup. Overall feature validation is `Pass / 98.7%` despite explicitly non-causal Round 1 full-suite debt. Because Round 3 changed no durable test code, its proportional review is `Not Applicable`; the downstream reviewer may close the already-pending Round 2 durable test review.
