# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/design-spec.md`
- Supplemental Solution Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-domain-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-strategy-contract.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Source Review Round 2 Pass; fresh API/E2E investigation and realistic execution requested by `code_reviewer`.
- Prior Investigation Reviewed: `None`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The reviewed change is a clean-cut structural refactor of AutoByteus semantic working-context compaction, not a new algorithm. The critical executable outcome is: a pending, tool-safe operation resolves the current process-global strategy at operation time; a detached `WorkingContext` is transformed by the selected strategy; framework validation rejects invalid head/message/tool/alias output before installation; `MemoryManager` replaces and persists only an accepted complete context; and the next provider request renders that replacement. The only production registration is `structured-json` / `Structured JSON`.

The global `AUTOBYTEUS_COMPACTION_STRATEGY` setting must travel through the existing GraphQL -> `ServerSettingsService` -> `AppConfig.set` transport, validate against registered IDs, update `process.env`, persist the isolated app-data `.env`, and affect the next pending operation of an already-composed runtime. The current structured strategy must preserve parent lineage, active budget, `maxItemChars`, diagnostics, episodic/semantic durable effects, private `3`/`20` projection limits, sequential projection replacement, complete tool units, and next-request continuation. Current schema-v4 working-context snapshot supersets remain directly readable without migration, and the next ordinary write omits obsolete epoch/timestamp keys.

The no-compatibility rule remains active: no deleted `Compactor`/`CompactionPlan` path, alias, epoch/timestamp runtime state, per-agent strategy selection, or dual snapshot reader may be protected by new coverage. Approved residual risks are the existing non-transactional durable-side-effect/replacement ordering, lack of a new manager rollback guarantee, process-local rather than multi-process setting convergence, provider-session reconciliation, and provider-native compaction.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `WorkingContext -> WorkingContext` strategy contract, stable ID/name, registry, operation-time resolver | Added | REQ-PMCS-001, 008, 010, 017-019; AC-PMCS-001, 013-015 | Exercise registry/resolver through normal pending execution and the next rendered request; exact production registration and explicit unknown failure remain covered. |
| Process-global server setting transport and persistence | Added | REQ-PMCS-019, 021; AC-PMCS-017 | Add GraphQL E2E coverage spanning isolated `.env`, live process value, invalid-update preservation, and a runtime composed before the update. |
| Complete structured-JSON algorithm behind one strategy | Changed / Preserved | REQ-PMCS-004-005, 009, 022, 024; AC-PMCS-002, 004, 010, 018, 022 | Execute current deterministic strategy, configured server compactor boundary, durable effects, sequential compactions, diagnostics, and next request. |
| Tool-safe call -> real execution -> result ingestion -> compaction -> provider render | Changed / Preserved | REQ-PMCS-006, 009; AC-PMCS-003 | Existing new-boundary test begins at a synthetic terminal result. Update it to execute a real registered tool through `ToolPhase` before result ingestion and compaction. |
| Framework pre-install output validation/failure lifecycle | Added | REQ-PMCS-013, 023; AC-PMCS-006, 019-021 | Existing validator/executor scenarios are valid; run malformed shape, changed head, alias, tool protocol, unknown selection, strategy throw, and persistence failure coverage. |
| Messages-only deep-detached runtime context | Changed | REQ-PMCS-002-003, 011; AC-PMCS-007, 021 | Existing deep-copy and manager controlled-replacement scenarios remain valid and are included in focused/broader core suites. |
| Schema-v4 stored superset direct use and contracted next write | Changed | REQ-PMCS-014; AC-PMCS-008 | Update real agent bootstrap integration to start from an on-disk superset, continue a turn, and inspect the ordinary contracted write. |
| Obsolete block/raw-trace compactor family and compatibility names | Removed | REQ-PMCS-012; AC-PMCS-009 | No compatibility tests may be added. Run source/package boundary checks and include untracked files in packaging validation. |
| Provider rendering of replacement contexts | Preserved, newly material to strategy output | REQ-PMCS-006, 009, 023; AC-PMCS-002-004 | Run the comprehensive provider-native renderer/request-payload suite plus actual OpenAI-compatible next-render integration. |
| Electron-bundled server packaging | Preserved consumer of changed server/core packages | Code review residual risks; repository packaging instructions | Prepare/build the supported Darwin ARM64 Electron package and verify packaged server/core artifacts contain the changed runtime. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Context value, strategy/registry/resolver, validator, current algorithm, manager replacement | Extensive core unit/integration suites | Mocked compactor runner in deterministic tests | Existing server compactor integration plus isolated executable probes |
| API / transport / contract | Yes | Global setting is registered on existing GraphQL server-settings transport | Service unit tests only for new key | Real GraphQL resolver plus HTTP server persistence | Durable GraphQL E2E and live HTTP API |
| Frontend component / state | No | Dedicated selector/discovery UI is explicitly out of scope | N/A | None in approved scope | None |
| Browser integration / user journey | No | No frontend source or user journey changed | N/A | None; generic settings UI is unchanged and no selector is shipped | Browser not required |
| Authentication / session / permissions | No | Local server-settings transport has no changed auth/session policy | Existing server API architecture | None specific to this change | None |
| Desktop renderer / web-equivalent UI | No | No renderer source changed | N/A | None | None |
| Desktop shell / Electron-specific integration | Indirectly Yes | Bundled server/core package must include uncommitted new files | Build/package scripts | Source package omission could pass package-local tests | Project desktop package build and packaged artifact inspection |
| Process / lifecycle | Yes | Environment update is read per pending operation; requested/started/completed/failed phases | Core executor/runtime and server compactor integration tests | GraphQL-to-process-to-existing-runtime span | Live API plus durable cross-boundary GraphQL scenario |
| Persisted-data transition | Yes | v4 reader ignores obsolete extras; normal write contracts payload | Serializer unit tests | Existing agent bootstrap + later ordinary write not covered together | Durable agent restore integration |
| Worker / queue / distributed coordination | No for required scope | Multi-process setting convergence is explicitly out of scope | N/A | Process-local only, approved residual | None; record residual |
| External integration | Bounded | Configured compactor can launch a normal server agent run; provider APIs unchanged | Server compactor integration with real backend composition and fake run events | Live paid/nondeterministic LLM output | Use deterministic server integration; live external LLM only if safe and necessary |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`
- Project type and runtime stack: pnpm 10 workspace; Node.js/TypeScript; Vitest; Fastify + TypeGraphQL/GraphQL; Prisma/SQLite; Nuxt/Electron desktop packaging.
- Conflicting, missing, or unclear project instructions: None material. Server `AGENTS.md` requires one-shot `vitest run`; web instructions likewise prohibit watch mode. Root/server README require isolated `--data-dir` with `.env` for server execution. Electron packaging must use the project `prepare-server`/`build:electron:mac` boundary.
- Required environment variables or secrets available: `Yes` for optional OpenAI/Anthropic keys (values not recorded); no secret is required for deterministic planned proof. A live external compactor is not assumed merely because keys exist.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/README.md` | Workspace setup/build and release overview | `pnpm install`; workspace package builds; no release actions in validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/autobyteus-server-ts/README.md` | Server setup/runtime | Build, then `node autobyteus-server-ts/dist/app.js --data-dir <isolated> --host 127.0.0.1 --port <owned>`; `.env` must provide `AUTOBYTEUS_SERVER_HOST`; stop only owned process. |
| `autobyteus-ts/vitest.config.ts` | Core test configuration | Node environment, `tests/setup.ts`, 20-second default timeout. |
| `autobyteus-server-ts/vitest.config.ts` | Server test configuration | Fork pool, file parallelism disabled, Prisma setup/global setup. |
| `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md` | Electron packaging/testing | Use one-shot tests; `pnpm prepare-server`; supported macOS package path is `pnpm build:electron:mac`. |
| `autobyteus-web/scripts/prepare-server-dispatch.mjs` and `prepare-server.mjs` | Bundled server boundary | Builds/deploys the current server and local workspace dependencies into `resources/server`; validates portable runtime dependencies. |
| Root/core/server/web `package.json` files | Script authority | Core/server builds, server tests, Electron package commands and package manager versions. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Core/server dependencies | Worktree root | Already installed via reviewed `pnpm install --frozen-lockfile`; re-use lockfile state | No shared service | `node --version`, `pnpm --version` | None |
| Isolated live server | Worktree root | Build, create temp data `.env`, then `node autobyteus-server-ts/dist/app.js --data-dir <temp> --host 127.0.0.1 --port <owned>` | Own temp SQLite/log/memory state and port | HTTP GraphQL query/health response plus server log | Terminate recorded PID; remove only created temp directory |
| Electron packaging | `autobyteus-web` | `pnpm build:electron:mac` | Uses current worktree and generated ignored artifacts | Successful package output and packaged server hash/symbol inspection | Remove temporary verification scripts only; package outputs are ignored build artifacts |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server settings `.env` | Existing GraphQL E2E appConfig temp directory and live server `--data-dir` | Never use default `~/.autobyteus`; no secret values printed | Remove temp directory after test/probe |
| Existing agent/runtime before setting update | Pre-compose core manager/resolver/executor/assembler in GraphQL E2E before mutation | In-memory + temp FileMemoryStore only | Vitest/afterEach cleanup |
| Real tool execution | Register existing `read_file` tool and read a deterministic temp fixture through `ToolPhase` | No shell/network; workspace limited to temp directory | Remove temp directory and restore registry state |
| Existing v4 snapshot | Write representative schema-v4 JSON with extra epoch/timestamp to temp snapshot store, restore with `AgentFactory`, continue one turn | No user data accessed | Agent stop + temp directory removal |
| Compactor execution | Existing deterministic `ServerCompactionAgentRunner` integration fixture with normal backend composition and isolated memory/workspace | No paid external provider required | Existing test teardown |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: Design “Persisted Data / State Transition Decision”; implementation “Persisted Data Transition Check”; REQ-PMCS-014 / AC-PMCS-008.
- Representative existing-data setup and required behavior: current schema version 4 payload with `agent_id`, serialized messages, and obsolete `epoch_id` / `last_compaction_ts`; normal agent bootstrap must restore messages and the next ordinary snapshot write must retain current messages while omitting both extras.
- Evidence planned: durable agent restore integration using the physical `WorkingContextSnapshotStore`, `AgentFactory.restoreAgent`, one normal posted message/LLM continuation, and final raw JSON inspection.
- Migration-specific completion/recovery scenarios: N/A; migration is prohibited/unnecessary.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | Threshold request waits for injected terminal result, current strategy compacts, OpenAI render contains complete tool group | AC-PMCS-002-003, 011, 018 | Needs Update | Starts at constructed `ToolResultEvent`; bypasses real registered tool lookup/execution | Execute existing registered `read_file` through `ToolPhase`, then ingest its actual result and retain existing compaction/render assertions |
| `autobyteus-ts/tests/unit/memory/pending-compaction-executor.test.ts` | Test-only strategy selection, per-operation env reread, render, failure lifecycle | AC-PMCS-001, 006, 014-015, 019-021 | Still Valid | Direct new-boundary behavior and stable failure assertions | Run focused and broader core suites |
| `autobyteus-ts/tests/unit/memory/structured-json-compaction-strategy.test.ts` | Durable effects, private 3/20, sequential projection replacement | AC-PMCS-002, 004, 010, 018 | Still Valid | Real FileMemoryStore used for sequential case; deterministic runner | Run focused suite |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-strategy-registry.test.ts` | Exact production registration/construction mapping | AC-PMCS-013, 015, 018 | Still Valid | Exact six-field mapping and private policy asserted | Run focused suite |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-output-validator.test.ts` | Head, role/payload, tool protocol, alias invariants | AC-PMCS-019-021 | Still Valid | Direct invariant-coded validation | Run focused suite |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` | Runtime trigger, structured compaction, diagnostics/lifecycle | AC-PMCS-002, 006, 011 | Still Valid | Real runtime with deterministic provider/runner | Run core regression |
| `autobyteus-server-ts/tests/integration/agent-execution/compaction/compaction-agent-parent-fallback.integration.test.ts` | Normal server backend triggers visible compactor run, parent runtime/model lineage, next turn | AC-PMCS-002, 011, 018 | Revised During Execution: Needs Update | Its intended boundary remained valid, but fresh execution exposed stale `backend.getStatus()` calls and legacy `prompt_tokens`-shaped usage that no longer drove current budget evaluation | Use `getStatusSnapshot()`, canonical `LlmTokenUsageObservation`, immediate-completion semantics, and assert the next provider request contains the compacted projection |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | GraphQL settings persistence for other predefined keys | AC-PMCS-017 | Needs Update | New strategy key has only service-unit coverage | Add strategy key GraphQL persistence, invalid preservation, and existing-runtime operation-time selection scenario |
| `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` and `tests/unit/config/app-config.test.ts` | Normalization/delegation; `.env` and `process.env` semantics | REQ-PMCS-021 / AC-PMCS-017 | Still Valid | Correct owning unit boundaries | Run with GraphQL E2E |
| `autobyteus-ts/tests/unit/memory/working-context-snapshot-serializer.test.ts` | Direct v4 superset read + contracted serialization | AC-PMCS-008 | Still Valid | Direct adapter proof | Run; supplement with lifecycle integration |
| `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts` | Normal agent bootstrap from current snapshot | AC-PMCS-008, 022 | Needs Update | Fixture is newly serialized and does not prove old superset plus later write | Seed extras and continue a normal turn before inspecting contracted physical write |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts` and `tests/unit/llm/api/provider-native-request-payloads.test.ts` | Native tool history/request shapes for Gemini, Ollama, Anthropic, Mistral, OpenAI Responses and OpenAI Chat | AC-PMCS-002-003; strategy/test-owned provider quality | Still Valid | Real renderer/request construction with canonical tool payloads | Run comprehensive provider set |
| Deleted compactor/block-plan tests listed in implementation diff | Obsolete `Compactor` / `CompactionPlan` APIs | REQ-PMCS-012 / AC-PMCS-009 | Stale / Remove (already removed upstream) | Reviewed clean-cut implementation deletion | Do not restore or replace compatibility-only assertions; current behavior is covered through new boundaries |
| Web/browser tests | Unchanged UI | Out of scope | Out Of Scope | No frontend source or approved UI selector | No browser run; package only |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Implementation-removed `compactor.test.ts`, `compaction-window-planner.test.ts`, block snapshot/prompt/digest tests, and legacy memory-compaction flow files | Protect deleted `Compactor.compact(CompactionPlan)` or old fragmented executor ownership | Clean-cut removal is required; restoring those tests would recreate invalid compatibility pressure | REQ-PMCS-012, AC-PMCS-009, design removal plan, reviewed implementation/code-review Pass | New strategy/registry/executor/structured-strategy/runtime tests cover current behavior | No API/E2E removal is performed this round; upstream deletions are validated, not altered |

## Durable Coverage To Add

No new standalone test file is planned. The initial investigation selected three existing durable integration/E2E files. Fresh execution then invalidated one additional existing configured-compactor fixture; that fourth file was updated rather than preserving a false pass or creating a parallel fixture.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| PMCS-E2E-001 | `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Cover normalized registered strategy update through GraphQL, isolated `.env`, live `process.env`, rejection without replacement, and a manager/resolver/executor composed before the update using the selected test-only registration on its next operation | REQ-PMCS-019, 021; AC-PMCS-014, 017 | Register test-only strategy only inside the isolated Vitest worker/file; production registration remains unchanged |
| PMCS-E2E-002 | `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | Execute a real existing registered `read_file` tool through `ToolPhase`, ingest the returned event through the canonical continuation builder, then preserve compaction/diagnostic/OpenAI render assertions | REQ-PMCS-006, 009; AC-PMCS-003, 011 | Temp workspace/file; no network or shell dependency |
| PMCS-E2E-003 | `autobyteus-server-ts/tests/integration/agent-execution/compaction/compaction-agent-parent-fallback.integration.test.ts` | Replace stale backend/status and token-usage fixture shapes with current public/canonical shapes; wait for immediate compaction completion; assert parent runtime/model lineage, status diagnostics, durable structured projection, and its presence in the next provider request | REQ-PMCS-004, 009, 022; AC-PMCS-002, 004, 011, 018 | Execution-discovered API/E2E-owned local fix; the initially intended server integration boundary remains valid |
| PMCS-E2E-004 | `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts` | Seed a schema-v4 physical superset, restore through normal agent bootstrap, post a normal next turn, then assert the physical next write omits epoch/timestamp and preserves context | REQ-PMCS-011, 014; AC-PMCS-007-008 | Proves direct use and ordinary contraction together |

## Durable Coverage To Remove

None in this API/E2E round.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | One-shot focused Vitest for the initial three updated files | Worktree; core files serialized, server `--no-watch` | GraphQL reselection, real tool lifecycle, v4 restore/write contraction | Pass: core `1/1` + `1/1`; server `10/10` | `validation-evidence/round1-focused-durable-tests.log` |
| 2 | Focused core compaction/validator/registry/restore/runtime/tool suite | `autobyteus-ts`; `--no-file-parallelism` | Critical transformation, validation, failure, persisted-data, tool, and runtime behavior | Pass: `11` files / `45` tests | `validation-evidence/round1-core-provider-focused.log` |
| 3 | Provider renderer directory plus provider-native request payloads | `autobyteus-ts`; `--no-file-parallelism` | Gemini, Ollama, Anthropic, Mistral, DeepSeek, LM Studio, OpenAI Chat/Responses rendering | Pass: `11` files / `56` tests | `validation-evidence/round1-core-provider-focused.log` |
| 4 | Server settings service, AppConfig, GraphQL E2E, compactor integration, runner unit | `autobyteus-server-ts`; `--no-watch` | Settings transport plus configured compactor lineage/diagnostics/next request | Initial fail exposed stale test API/usage fixture; API/E2E local fix; final Pass: `5` files / `80` tests | `validation-evidence/round1-server-settings-compactor.log`, `validation-evidence/round1-configured-compactor-rerun3.log`, `validation-evidence/round1-server-settings-compactor-final.log` |
| 5 | Broader affected core memory/runtime regression | `autobyteus-ts`; `--no-file-parallelism` | Regression across changed memory and runtime packages | Pass: `38` files / `158` tests | `validation-evidence/round1-broader-core-regression.log` |
| 6 | `pnpm --filter autobyteus-ts build`; `pnpm --filter autobyteus-server-ts build` | Worktree root | Production TypeScript, runtime dependencies, Prisma, built-in-agent bootstrap | Pass | `validation-evidence/round1-builds.log` |
| 7 | Full status, staged/unstaged/untracked boundary, diff checks, effective-size guard, obsolete/selection/registration/test-only probes | Worktree root | Clean-cut source and complete working-tree package boundary | Pass | `validation-evidence/round1-static-boundary.log` |

## Post-Repository Confidence Scorecard

Repository execution completed against the full uncommitted boundary at `fdb370d48106df252f77b684f76675a77226fffc`. Scores below deliberately exclude the later live HTTP and Electron-package evidence so that the broader-validation decision remains evidence-based.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | Mapped focused/server/provider/broader suites pass, including all four updated durable scenarios | External-model compliance remains deterministic rather than live | Live package/API cannot materially improve model nondeterminism; retain approved residual |
| Changed-boundary execution directness | 96% | Actual registered `read_file`, normal restore/next write, GraphQL resolver/service, current executor/strategy, and configured server backend executed | Live HTTP and package entrypoint not yet counted | Execute planned live API and package runtime |
| Cross-boundary integration realism and mock gap | 93% | Real manager/resolver/executor/provider render and server backend composition pass | Configured compactor response remains a deterministic fake run; HTTP/package startup not yet counted | Live HTTP and packaged-server startup |
| Environment, configuration, identity, and fixture fidelity | 95% | Isolated app data, physical `.env`, FileMemoryStore, real tool registry/workspace, Prisma, parent lineage | No packaged runtime yet counted | Package and run built server from owned temp data |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Unknown selection, malformed output, changed head, alias/tool invariants, throw/persistence failure, pending retention, invalid setting preservation, v4 contraction all pass | Existing non-transactional ordering remains approved | None proportionate in current scope |
| User-surface, browser, and desktop-shell confidence | 90% | No UI changed and browser is inapplicable; production builds pass | Electron package inclusion/execution not yet proven | Supported macOS package build and artifact/runtime verification |
| Durable regression coverage quality and relevance | 97% | Four narrow current-boundary updates plus `38/158` broader core and `5/80` final server suites pass | Proportional test-code review still required | Code reviewer review after API/E2E pass |

- Overall post-repository confidence: `94.9%` (`664 / 7`)
- Calculation method: Simple average of applicable categories after execution; browser inapplicability does not remove the desktop-package portion of category 6.
- Every critical acceptance criterion directly proven: `Yes` at the repository boundary.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `No` — `94.9%`, so the already-selected broader validation remains required.
- Material residual risks: Approved non-transactional durable effect/replacement ordering; process-local multi-process convergence; provider-session reconciliation; provider-native compaction; live external LLM nondeterminism/cost.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` + `Project Desktop Validation` + `Lifecycle`
- Specific confidence gap or residual risk addressed: GraphQL HTTP/process/`.env` fidelity and Electron-bundled current-server inclusion are not fully proven by direct schema tests/builds; repository tests still use deterministic provider/compactor doubles.
- Why the selected mode can materially improve confidence: An isolated live server proves the actual built HTTP transport and physical app-data file. The supported Electron package path proves untracked new core/server files are included in the distributable runtime. Existing server lifecycle integration provides proportionate configured-compactor execution without an uncontrolled paid model.
- Expected confidence after selected validation: At least 95%, with every applicable category at least 90%, if all critical mapped scenarios pass.
- Browser-specific decision and rationale: Browser validation is not required because no frontend component, route, renderer state, or selector changed. A browser would only proxy the unchanged generic GraphQL settings UI and add less direct evidence than the GraphQL/live API checks.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron, with bundled Node server.
- Relevant README or development instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, `autobyteus-web/scripts/prepare-server-dispatch.mjs`, `prepare-server.mjs`.
- Web-equivalent behavior: None changed; no dedicated strategy UI is in scope.
- Shell-specific or lifecycle behavior: Bundled server/package inclusion only.
- Chosen validation approach and why it fits the project: Use the project-supported macOS Electron package build and inspect packaged server/core runtime artifacts; do not launch or disrupt the user's installed desktop app.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: No manual UI selection (out of scope); no multi-process server setting convergence (approved residual).

## Live Environment And Fixture Plan

- Startup order and commands: complete builds; create `mktemp` app data with minimal `.env`; start built server on an owned high port; wait for GraphQL response; issue list/update/invalid/list mutations; inspect `.env`; stop recorded PID; then run supported Electron package build.
- Environment choices that materially affect the run: Darwin ARM64 host; Node 22.23.1; pnpm 10.28.2; isolated `APP_ENV=test`, SQLite, loopback host/port; no default user app data.
- Health / readiness checks: HTTP GraphQL query succeeds and server log reports ready.
- Seed data / fixtures: Only `.env`; Prisma startup creates isolated DB.
- Test identities, authentication, permissions, or session state: Local owner GraphQL path, no changed auth boundary.
- Requirement-linked journeys or scenarios: PMCS-E2E-001 live HTTP setting; PMCS-E2E-008 package inclusion.
- Evidence to capture: exact commands, GraphQL JSON, `.env` key, server log, packaged file hashes/symbols/package output.
- Owned processes and temporary state to clean up: one server PID, one temporary app-data directory, temporary probe scripts if any.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PMCS-E2E-008 | Live built server on isolated data/port plus curl GraphQL requests | Actual HTTP transport, physical `.env`, invalid update preservation | Durable schema-level GraphQL scenario covers the behavior deterministically; live port/process startup is environment orchestration |
| PMCS-E2E-009 | Electron package build plus packaged-server/core file hash and symbol checks | Current untracked implementation is present in supported package | Packaging scripts are already durable; ticket-specific symbol/hash probe would be brittle as a permanent test |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| True multi-process setting convergence | Explicitly outside scope; setting is process-local | Different processes can diverge until separately updated/restarted | Record approved residual; no escalation |
| Provider-session reconciliation and provider-native compaction | Explicitly outside scope | Some remote session caches may not reflect generic context replacement | Record approved residual |
| Live paid/nondeterministic external LLM compactor | Secrets exist, but no validation-only selected compactor definition/model fixture has yet been established; deterministic server/core runner boundaries directly prove this ticket | Bounded uncertainty in actual model compliance, which is pre-existing rather than changed strategy architecture | Reassess after repository/server integration; do not use user app data or uncontrolled paid calls merely to increase a score |
| Manual browser/Electron UI | No UI/source change and strategy selector is out of scope | Negligible for changed scope | No follow-up |

## Ambiguities Or Reroute Triggers

None at initial investigation.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update four existing files; add/remove none.
- Post-repository confidence: `94.9%`.
- Broader validation decision: `Required`.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Investigation was written before durable coverage edits or final execution. Existing tests were treated as evidence, not authority. Three gaps were identified initially; fresh execution invalidated a fourth stale configured-compactor fixture, which received the bounded API/E2E-owned update recorded above.
