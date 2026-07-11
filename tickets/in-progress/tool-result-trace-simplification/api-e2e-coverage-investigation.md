# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/design-spec.md`
- Supplemental Solution Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/tool-trace-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/codex-search-web-lifecycle-probe.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/tickets/in-progress/tool-result-trace-simplification/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Implementation source-review round 2 passed and requested API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved contract preserves separate `tool_call` and `tool_result` rows while removing redundant invocation metadata from every future result row. Calls carry a non-empty compound identity, name, and explicit arguments object. Results carry the correlated call ID plus physically present `tool_result` and `tool_error`, including explicit null, and physically omit name/arguments. Native AutoByteus and Claude persist authoritative calls early; ordinary Codex does likewise when normalized arguments are explicit; a hosted Codex `webSearch` placeholder start has absent arguments and persists nothing until terminal action data permits ordered call-then-result writes. Identity, duplicate suppression, and reconstruction are compound `(turn_id, tool_call_id)` operations. Complete-corpus context may enrich active projections, but active records alone own compaction eligibility and pruning. Historical supersets remain directly readable through one version-agnostic projection; no migration, version branch, or compatibility writer is allowed.

Critical proof is AC-001 through AC-013, with particular emphasis on physical JSONL shapes, provider timing, null/failure/denial/interruption outcomes, malformed and duplicate events, reconstruction, cross-file projection, active-only pruning, unresolved multi-call compaction barriers, historical supersets, and the explicit no-migration decision.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Future raw result shape | Changed | REQ-002, AC-004, contract “New-Write Record Shapes” | Assert physical JSONL property presence/absence, not only normalized DTO values. |
| Native call timing and argument meaning | Preserved/tightened | REQ-003, AC-001 | Exercise canonical call ingestion before approval/execution and prove model-issued arguments occur once. |
| Claude observed input timing | Preserved/tightened | REQ-005, AC-002 | Compose Claude converter events through the server persistence spine and inspect raw JSONL. |
| Ordinary Codex call timing | Preserved/tightened | REQ-004–REQ-005 | Exercise explicit `{}` and non-empty arguments before a minimal result. |
| Hosted Codex web-search timing | Changed | REQ-006, AC-003, probe supplement | Compose captured placeholder/terminal shapes through converter, recorder, and writer; assert no start row and terminal call-before-result. |
| Terminal outcome and dedupe policy | Changed | REQ-007–REQ-009, AC-005–AC-009 | Run success-null, failure, denial, interruption, duplicate, malformed, equal-ID/different-turn, and reconstruction scenarios. |
| Read/projection correlation | Changed | REQ-011, AC-010–AC-011 | Exercise new minimal pairs, historical supersets, archive-call/active-result, run-history GraphQL, work traces, recovery, and digests. |
| Compaction scope | Changed | REQ-010, AC-007, AC-010 | Prove unresolved multi-call group protection and active-only removal IDs with corpus call context. |
| Persisted-data transition | Preserved | REQ-012, AC-012 | Run representative historical supersets through current readers and static-check that no migration/version behavior was added. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Core/native lifecycle, server accumulator, logical projection, compaction | Focused unit and integration suites | Cross-file composition and physical JSONL need direct integration evidence | Integration / lifecycle |
| API / transport / contract | Yes | GraphQL run-history projection consumes changed logical interactions | Existing run-projection GraphQL E2E | Existing fixture is partly historical and one constructor is stale | Durable GraphQL E2E update |
| Frontend component / state | No | No frontend source changed | N/A | None | None |
| Browser integration / user journey | No | No browser-owned behavior changed; GraphQL data shape is sufficient | Repository GraphQL E2E | No browser-specific uncertainty | None |
| Authentication / session / permissions | No product auth change | Tool approval/denial lifecycle is relevant, not auth/session | Native approval integration and server denial integration | None requiring browser identity | Integration |
| Desktop renderer / web-equivalent UI | No | No renderer/client code changed | N/A | None | None |
| Desktop shell / Electron-specific integration | No | No shell, IPC, packaging, or lifecycle code changed | N/A | None | None |
| Process / lifecycle | Yes | Crash gaps, interruption, recorder reconstruction, provider event order | Unit plus recovery integration | Real hosted Codex event shape should be rechecked against current converter/persistence | Live Codex / lifecycle |
| Persisted-data transition | Yes | Forward-only result contraction; historical files unchanged | Historical fixtures and real-corpus investigation | Need representative executable direct-use proof and no-version static audit | Integration / static audit |
| Worker / queue / distributed coordination | Limited | Recorder promise queue serializes provider events | Recorder/unit/integration tests | No multi-node coordination changed | Repository integration |
| External integration | Yes, bounded | Codex App Server normalized lifecycle; Claude SDK observation boundary | Captured Codex frames and converter tests; Claude coordinator tests | Current code should be exercised against installed Codex App Server when safe | Live Codex |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification`
- Project type and runtime stack: pnpm 10.28.2 TypeScript monorepo; Node.js 22.23.1; Vitest 4; Fastify/GraphQL server; SQLite/Prisma test setup; Codex App Server CLI 0.144.1 available.
- Conflicting, missing, or unclear project instructions: `autobyteus-ts` has no test script and uses `pnpm -C autobyteus-ts exec vitest run ...`; server `AGENTS.md` requires `vitest run --no-watch`. Root/server README requires `RUN_CODEX_E2E=1` for Codex tickets. No `.env.test` is present in this worktree, but selected tests use deterministic temporary data and available environment secrets are not recorded.
- Required environment variables or secrets available: Yes for the installed/authenticated Codex path and ordinary repository tests; Claude live execution is not required because the changed persistence boundary can be deterministically composed from the real converter/coordinator contract. Secret values are not recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `vitest run` and `--no-watch`; commands are run from the assigned worktree. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/README.md` | Workspace setup and Codex test policy | `pnpm install`; Codex tickets run backend tests with `RUN_CODEX_E2E=1`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification/autobyteus-server-ts/README.md` | Server environment, test DB, and live E2E instructions | Tests use temporary SQLite under `tests/.tmp`; live Codex is gated by `RUN_CODEX_E2E`; build/test commands and cleanup script are documented. |
| `autobyteus-ts/vitest.config.ts` | Core runner configuration | Node environment, 20-second default timeout, `tests/setup.ts`. |
| `autobyteus-server-ts/vitest.config.ts` and `tests/setup/prisma-*.ts` | Server runner and DB lifecycle | Serial forks; global setup resets isolated SQLite test DB using Prisma. |
| `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, root `pnpm-workspace.yaml` | Build/dependency scripts | Core build precedes server typecheck; server prepares shared workspaces and Prisma. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Worktree dependencies | Worktree root | Temporary links to the already-installed canonical superrepo package `node_modules`; build worktree `autobyteus-ts/dist` before server tests | Avoids an unrelated lock/install mutation; links are API/E2E-owned | `pnpm exec vitest --version`; imports resolve | Remove only links/build output created for this run |
| Core repository checks | `autobyteus-ts` | `pnpm exec vitest run ...` | Temp files are test-owned and should be isolated | Vitest result | Tests clean their temp dirs; compare ignored-dir baseline |
| Server repository checks | `autobyteus-server-ts` | `pnpm exec vitest run ... --no-watch` | Global setup resets worktree test SQLite | Prisma reset succeeds | Remove API/E2E-created DB/build/dependency artifacts |
| Codex live App Server | Spawned by E2E | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts --no-watch` | Test creates temporary workspace, memory dir, thread, and client | Startup-ready promise and model catalog | Test terminates threads, closes client, removes temp dirs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Raw JSONL | Test-local temporary memory directories and `RunMemoryWriter`/`MemoryManager` | No production corpus writes | Remove temp dirs |
| GraphQL run projection | Existing `buildGraphqlSchema`, temporary app-data dir, metadata stores | No network service or user account needed | Existing `afterAll` cleanup |
| Historical supersets | Intentional fixture rows containing result-side metadata and sparse outcome keys | Fixture-only; no migration or live corpus mutation | Retain as durable regression coverage |
| Codex hosted search | Existing captured-frame shapes plus installed Codex live transport | Isolated ephemeral thread/workspace; no mutating tool request | Terminate/close/remove through test cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design “Persisted Data / State Transition Decision”, DS-007/DS-009/DS-010; contract “Logical Read Contract” and “Historical Superset And No-Migration Policy”; implementation handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: historical exact-duplicate result metadata, historical terminal-only late/effective arguments, sparse historical outcome keys, and archive-call/active-result records must project through the current readers without rewriting bytes.
- Evidence planned: core logical projection tests, server normalizer/replay tests, GraphQL E2E using both minimal and historical rows, package-wide work-trace cross-file regression, writer/accumulator reconstruction, and static diff/search showing no migration, schema discriminator, Memory Sync, or version branch.
- Migration-specific completion/recovery scenarios: N/A; migration is explicitly forbidden.
- Upstream ambiguity or reroute required: No.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/raw-trace-item.test.ts` | Physical null outcome presence and non-tool exclusion | AC-004–AC-005 | Still Valid | Direct `toDict` assertions | Execute |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` | Native early/minimal results, atomic invalid batches, failure, interruption, dedupe, archive hydration | AC-001, AC-004–AC-006, AC-008–AC-010 | Still Valid | 19 reviewed scenarios | Execute |
| `autobyteus-ts/tests/unit/memory/tool-trace-lifecycle-index.test.ts` and `tool-interaction-builder.test.ts` | Compound physical groups, writer-safe context, null success, historical overlay, reused IDs | AC-005, AC-009–AC-011 | Still Valid | Direct model/projection assertions | Execute |
| `autobyteus-ts/tests/unit/memory/working-context-message-window-planner.test.ts` | Multi-call group remains protected until every result | AC-007 | Still Valid | Explicit two-call/one-result scenario | Execute |
| `autobyteus-ts/tests/unit/memory/compaction-window-planner.test.ts` | Archive context enriches active result without archive pruning IDs | AC-010 | Still Valid | Direct plan/removal assertions | Execute |
| `autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts` | Crash-recovered unmatched call is fenced and LLM resumes without invented success | AC-008 | Still Valid | Real snapshot/file-store recovery path | Execute |
| `autobyteus-ts/tests/integration/agent/memory-compaction-runtime-e2e.test.ts` | Compaction is requested after high usage, deferred across an unresolved tool continuation, and executed after a terminal result | AC-007 | Needs Update | Round-1 execution exposed a stale fixture using retired `prompt_tokens`/`completion_tokens`; current runtime consumes `input_tokens`/`output_tokens`, so the intended threshold was never crossed | Update only the usage fixture keys, then rerun |
| `autobyteus-ts/tests/integration/agent/tool-approval-flow.test.ts` | Real native approval/tool execution | AC-001, AC-004 | Needs Update | It bypasses call persistence and asserts forbidden result-side `tool_name` | Seed canonical call before ToolPhase and assert strict call/result JSONL |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Captured hosted-search placeholder omits arguments; terminal supplies action | AC-003 | Still Valid | Direct provider adapter contract | Execute and compose at integration boundary |
| Existing Claude converter/coordinator unit tests | Observed `tool_use` input is retained through start/terminal/denial | AC-002, AC-006 | Still Valid | Direct real adapter/coordinator event shapes | Execute and compose at persistence boundary |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | Empty args, deferred call, null success, failure/denial/interruption, malformed events, duplicates, compound reconstruction | AC-002–AC-009 | Still Valid | 22 state-machine scenarios | Execute |
| `autobyteus-server-ts/tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | Ordinary Codex early call/minimal result and UI projections | AC-004, AC-010–AC-011 | Needs Update | Normalized view asserts null fields but not physical property absence | Add physical JSONL assertions |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Recorder/converter/store integration, denial dedupe, provider rotation | AC-002–AC-003, AC-006, AC-010 | Needs Update | No direct Claude tool-pair or hosted-web-search composed persistence scenario | Add direct provider-spine JSONL scenarios |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Archive call plus active minimal result renders once package-wide | AC-010–AC-011 | Still Valid | Round-2 source-review regression | Execute |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | GraphQL projection for tool pairs and historical supersets | AC-010–AC-011 | Needs Update | Constructor omits lifecycle groups; all fixture results currently use historical metadata | Fix constructor, mix minimal and intentional historical rows, and add cross-file API projection |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Real Codex App Server -> recorder -> JSONL/snapshot | AC-003, AC-013 | Needs Update | Round-1 execution failed before provider startup because the test still omitted the now-required explicit run ID when calling `AgentRunManager.createAgentRun`; the journey itself remains valid | Pass its already-created unique `runId`, rerun, then use a targeted hosted-search probe if needed |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/tool-approval-flow.test.ts` read-file predicate | A `tool_result` carries `tool_name === "read_file"` | REQ-002 forbids name/args on new results; call correlation owns metadata | REQ-001–REQ-003, AC-001, AC-004 | Same integration journey asserts call row metadata, correlated minimal result, and one logical interaction | N/A |

No whole test is removed. The useful approval journey is updated rather than discarded.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| TTR-API-001 | Hosted Codex placeholder start produces no row; terminal writes call then minimal result | REQ-004, REQ-006; AC-003–AC-004 | `cross-runtime-memory-persistence.integration.test.ts` | Joins captured provider shape, converter, recorder queue, writer, and physical JSONL. |
| TTR-API-002 | Claude complete observed input writes early call and later minimal result | REQ-004–REQ-005; AC-002, AC-004 | `cross-runtime-memory-persistence.integration.test.ts` | Closes the provider-to-persistence composition gap without requiring a paid/flaky live Claude session. |
| TTR-API-003 | Archive-call/active-result projects once through GraphQL | REQ-008, REQ-010–REQ-011; AC-009–AC-011 | `run-projection-toolcalls-graphql.e2e.test.ts` | Direct API-boundary proof complements unit and work-trace evidence. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria | Notes |
| --- | --- | --- | --- | --- |
| TTR-API-004 | Native approval integration | Persist canonical call before ToolPhase, assert it exists while approval is pending, and assert physical minimal result | REQ-001–REQ-003; AC-001, AC-004 | Also prove a large issued argument occurs once in raw JSONL. |
| TTR-API-005 | Ordinary Codex MCP integration | Inspect physical JSONL and exact tool-specific property presence | REQ-002, REQ-004–REQ-005; AC-004 | Keep normalized projection assertions. |
| TTR-API-006 | Run-history GraphQL fixture and accumulator construction | Supply physical lifecycle groups; use a minimal new result plus an intentional historical superset | REQ-011–REQ-012; AC-010–AC-012 | Preserves direct-use historical evidence while covering the new shape. |
| TTR-API-007 | Native compaction runtime E2E high-usage fixture | Replace stale OpenAI-specific usage keys with canonical `input_tokens`/`output_tokens` keys | REQ-010; AC-007 | Round-1 execution proved the old fixture no longer crosses the threshold; the runtime behavior and assertions remain approved and useful. |
| TTR-API-008 | Live Codex memory E2E setup | Supply the unique explicit run ID already owned by the test to `createAgentRun` | AC-003, AC-013 | Restores the documented env-gated live transport journey without changing production behavior. |

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec vitest run` over 11 focused serializer/lifecycle/manager/projection/compaction/recovery/interruption unit files | Assigned worktree; linked dependencies only for execution | AC-001, AC-004–AC-011 | Pass — 11 files / 53 tests | `api-e2e-evidence/core-focused-unit.log` |
| 2 | `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/tool-approval-flow.test.ts tests/integration/agent/memory-compaction-runtime-e2e.test.ts` | Assigned worktree; final rerun after both fixture corrections | TTR-API-004, TTR-API-007; native early write, strict physical shapes, and compaction lifecycle | Pass — 2 files / 8 tests | `api-e2e-evidence/final-core-durable-rerun.log` |
| 3 | `pnpm -C autobyteus-ts exec vitest run` over recovery/compaction integrations | Assigned worktree | Crash recovery plus protected compaction group | Initial stale-fixture failure, then Pass after TTR-API-007 local test fix | `api-e2e-evidence/core-recovery-compaction-integration.log`; `api-e2e-evidence/core-compaction-runtime-e2e-rerun.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run` over 9 focused converter/accumulator/writer/normalizer/replay unit files `--no-watch` | Assigned worktree; isolated Prisma test DB | Provider readiness, null/failure/denial/interruption, malformed/duplicate events, compound reconstruction | Pass — 9 files / 125 tests | `api-e2e-evidence/server-focused-unit.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts --no-watch` | Assigned worktree; final durable rerun | TTR-API-001–003, TTR-API-005–006; provider-to-JSONL and GraphQL boundaries | Pass — 3 files / 23 tests | `api-e2e-evidence/final-server-durable-rerun.log` |
| 6 | Focused memory-layout, work-trace, replay, and GraphQL projection integrations | Assigned worktree; isolated Prisma test DB | Cross-file lifecycle, archived-call/active-result, one-activity rendering, historical supersets | Pass — 3 files / 20 tests across commands | `api-e2e-evidence/server-memory-layout-integration.log`; `api-e2e-evidence/server-run-projection-graphql-e2e.log` |
| 7 | Full core and server unit diagnostics | Assigned worktree | Broad regression comparison | Baseline-only diagnostics: core 320/322 files and 1681/1683 tests; server 354/369 files and 1890/1917 tests. All relevant changed suites passed and failure sets match the upstream implementation-handoff baseline. | `api-e2e-evidence/core-full-unit.log`; `api-e2e-evidence/server-full-unit.log` |
| 8 | `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`; `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; `git diff --check` | Assigned worktree; server dependency overlay resolved current worktree core | Source compile and diff integrity | Pass | `api-e2e-evidence/final-source-typecheck-and-diff-check.log` |
| 9 | Static changed-path/vocabulary audit for migration, version, Memory Sync, provider branching, obsolete prototypes | Diff from bootstrap commit `3effb76ab56d4d1bb876ad0623a8e5eb7093a584` | AC-012 and no compatibility writer/runtime branch | Pass | `api-e2e-evidence/no-migration-legacy-static-audit.log` |
| 10 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts --no-watch` | Installed/authenticated Codex App Server, isolated run/workspace/memory | TTR-API-008 and live transport readiness | Initial stale setup failure, then Pass — 1 file / 1 test after bounded test fix | `api-e2e-evidence/codex-live-memory-e2e.log`; `api-e2e-evidence/codex-live-memory-e2e-rerun.log` |

The full TypeScript configuration that includes every test file was also run diagnostically. It exposes broad pre-existing test-root and unrelated typing debt and is not the project’s source-build authority; the authoritative core and server build configurations both pass. Evidence is retained in `api-e2e-evidence/typecheck-tests.log`.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | AC-001–AC-012 have direct durable serializer, provider-spine, recovery, compaction, projection, and static-audit evidence; AC-013’s repository component passed | Current external hosted-search lifecycle was still represented by captured frames at this gate | Execute a live hosted-search lifecycle |
| Changed-boundary execution directness | 98% | Physical JSONL property presence/absence is asserted for native, Claude, ordinary Codex, and deferred hosted search; GraphQL reads actual stored rows | Filesystem raw/snapshot writes are intentionally separate operations | No safe validation eliminates the approved transaction gap |
| Cross-boundary integration realism and mock gap | 94% | Real converters, recorder queue, writers, filesystem JSONL, recovery, compaction, and GraphQL schema execute together | Hosted-search provider behavior could drift from captured frames | Live installed Codex App Server probe |
| Environment, configuration, identity, and fixture fidelity | 95% | Project-native Vitest/Prisma setup, unique IDs, isolated temp directories, current worktree builds, and documented env gate were used | Repository logs contain harmless shared environment discovery warnings | Live isolated provider run and cleanup verification |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Null success, failure, denial, interruption, malformed/duplicate events, crash gaps, reused IDs, reconstruction, multi-call barriers, and cross-file lifecycle all pass | Hard kill between separate filesystem writes is represented deterministically rather than by destructive process control | None proportionate |
| User-surface, browser, and desktop-shell confidence | N/A | No UI/browser/desktop boundary changed; GraphQL is the affected public surface | None | N/A |
| Durable regression coverage quality and relevance | 97% | Six narrow requirement-linked durable files cover the previously missing/stale boundaries without deleting useful historical fixtures | Proportional code review remains the next team gate | Code reviewer’s separate durable-test review |

- Overall post-repository confidence: **96.3%** (`96%` rounded to a whole percent)
- Calculation method: Simple average of six applicable categories; UI/browser/desktop is N/A because no such boundary changed.
- Every critical acceptance criterion directly proven: Yes for repository-controlled behavior; current live hosted-search shape remained the selected broader-validation risk for AC-003/AC-013.
- Any applicable category below `90%`: No.
- Default clean-confidence target of `95%` met: Yes, but the material provider-drift risk still justified broader validation.
- Material residual risks: raw/snapshot writes are not cross-file transactional; live Codex protocol evidence is version-specific; deferred hosted calls may disappear on hard loss by approved contract.

## Broader Validation Decision (Mandatory)

- Decision: Required; executed and passed.
- Selected execution mode: Live API / Lifecycle (Codex App Server); no browser.
- Specific confidence gap or residual risk addressed: Repository fixtures can prove the adapter and persistence code, but the root cause is an external hosted-search lifecycle whose shape can evolve.
- Why the selected mode can materially improve confidence: It checks the installed/authenticated App Server against the current converter/recorder/writer boundary and inspects actual physical JSONL produced by a live hosted search.
- Expected confidence after the selected validation: Approximately 97%, with no applicable category below 90% and direct proof for every critical acceptance criterion.
- Browser-specific decision and rationale: Browser validation is not applicable; no frontend, browser API, renderer, routing, or desktop-shell behavior changed.
- If Not Required: N/A.
- If Blocked: N/A; authentication, model catalog, thread lifecycle, and hosted search were available.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists elsewhere in the monorepo, but no desktop code or boundary is affected.
- Relevant README or development instructions: Root README’s desktop guidance was reviewed only to classify scope.
- Web-equivalent behavior: None changed.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach and why it fits the project: Repository/API/lifecycle checks only.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: No desktop behavior is claimed.

## Live Environment And Fixture Plan

- Startup order and commands: Build current core package, execute repository coverage, then run the env-gated live Codex memory E2E and a one-off hosted-search probe through the same production manager/recorder path.
- Environment choices that materially affect the run: `RUN_CODEX_E2E=1`; installed `codex-cli 0.144.1`; isolated temporary workspace and memory directories; approval policy controlled by the existing harness.
- Health / readiness checks: `codex --version`; model catalog returns a supported model; thread startup-ready promise completes.
- Seed data / fixtures: No durable shared data; unique run/token IDs and test-local JSONL.
- Test identities, authentication, permissions, or session state: Existing local Codex authentication; no credential values recorded. No production account mutation.
- Requirement-linked journeys or scenarios: TTR-API-008 live recorder smoke and TTR-PROBE-001 live hosted-search placeholder/terminal lifecycle.
- Evidence to capture: Exact command, Vitest output, shape-only JSONL assertions, temporary harness checksum, and cleanup result; no provider-private content is reproduced in the reports.
- Owned processes and temporary state to clean up: Spawned Codex client/thread, temporary workspaces/memory dirs, dependency links, build output, and test DB artifacts created by this run.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TTR-PROBE-001 | One isolated live Codex hosted-search turn through production manager/recorder followed by a shape-only JSONL audit | Pass: exactly one terminal-argument call precedes exactly one correlated minimal result; placeholder writes nothing | Provider/model network behavior is nondeterministic and version-specific; durable captured-frame integration is the stable regression. Temporary source removed; checksum/evidence retained. |
| TTR-PROBE-002 | Static diff/search against bootstrap for migration/version/update/combined-call vocabulary | Pass: no forbidden compatibility or migration mechanism was added | This is execution evidence, not runtime product code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Claude paid-provider tool execution | Deterministic coordinator/converter inputs and persistence composition directly exercise the changed local boundary; external Claude service behavior did not change | Low residual external-provider drift | Revisit only if local provider composition fails or live Claude lifecycle is materially uncertain |
| Electron/browser UI | No changed UI or shell boundary | None for this task | None |
| Hard process kill between separate raw and snapshot filesystem writes | Existing recovery tests deterministically reproduce the durable states without unsafe process manipulation | Bounded accepted transaction-gap risk | Preserve recovery coverage and residual-risk statement |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Stale compaction E2E token-usage fixture | Local Fix | Initial run never crossed the intended threshold because the fixture used retired provider-specific keys; canonical observation builder fixes the test | API/E2E-owned; resolved locally |
| Stale live Codex run creation | Local Fix | Initial live run failed before provider startup because the test omitted its required explicit run ID | API/E2E-owned; resolved locally |
| No requirement/design ambiguity | N/A | Approved contract decides both cases without production changes | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes — three scenarios added and six files updated in total; no removals
- Post-repository confidence: 96.3%
- Broader validation decision: Required; live Codex lifecycle executed and passed
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: The initial investigation was written before any API/E2E-owned durable test edit. Execution exposed two bounded stale fixtures, both classified and repaired as API/E2E-owned local fixes before final reruns. Final confidence and broader evidence are recorded in the execution coverage report.
