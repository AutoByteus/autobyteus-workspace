# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/design-spec.md`
- Supplemental Solution Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/tool-trace-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/codex-search-web-lifecycle-probe.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/code-review-report.md`
- Current Investigation Round: 2
- Trigger: After round-1 Pass, the user explicitly requested a plan and execution against the real OpenAI API using the canonical repository `.env.test` credential.
- Prior Investigation Reviewed: Round 1 (Pass; final confidence 97.2% after live Codex validation)
- Latest Authoritative Investigation: Round 2

## Round 2 User-Requested OpenAI Live Extension (Plan And Result)

### Scope And Evidence Gap

Round 1 directly proved the native persistence path with deterministic test LLMs and proved an external provider with live Codex, but it did not execute the native AutoByteus agent loop against the real OpenAI Chat Completions tool-call stream. The remaining OpenAI-specific gap is streamed provider argument assembly flowing through `LlmPhase`, early call persistence, real tool execution, minimal result persistence, and the continuation turn.

LM Studio is not part of this extension: the user identified an OpenAI credential, and a live OpenAI run closes the newly requested provider gap without requiring a separately running local LM Studio model/server.

### Environment Discovery

- Canonical secret source: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test`.
- Credential readiness: confirmed by presence only; no value, prefix, hash, or response content is recorded.
- Provider readiness preflight: an authenticated `GET /v1/models` returned HTTP 200. `gpt-5.4-mini` is available and is selected as the lower-cost tool-capable model for this run.
- Loading method: execute Node/Vitest with `env -u OPENAI_API_KEY node --env-file=<canonical .env.test> ...` so the evidence proves the canonical file supplies the key rather than inheriting an unrelated shell value.
- Data safety: one isolated temporary workspace and memory directory; harmless `write_file` only; no shared or production file mutation.

### Existing Coverage Decision

| Path / Scenario | Round-2 Validity Decision | Evidence Gap | Action |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/openai-single-agent-flow.test.ts` | Needs Update | It already executes a real OpenAI tool journey, but it proves only the output file/events and does not inspect physical memory or prove call persistence at tool-start time | Keep the env-gated journey; supply an explicit test-local memory directory and add strict call/result JSONL assertions, including a synchronous tool-start snapshot |

### Scenario And Success Contract

| Scenario ID | Execution Surface | Required Observable Evidence | Durable Decision |
| --- | --- | --- | --- |
| TTR-OPENAI-014 | Real `OpenAILLM` -> streamed API tool-call handler -> native agent loop -> `write_file` -> `MemoryManager` -> physical JSONL -> continuation | At tool execution start, one non-empty-ID `write_file` call with explicit model-issued args is already durable and no correlated result exists. At completion, exactly one correlated result physically contains both outcome keys and omits name/args; call precedes result; file content and final continuation also pass. A unique success marker must be present so provider-access skip handling cannot be mistaken for executed proof. | Update the existing env-gated durable integration test; no new temporary test file |

### Planned Execution And Failure Handling

1. Recreate only the worktree dependency link required for core Vitest.
2. Update the existing live OpenAI test with test-local memory and strict physical JSONL assertions.
3. Execute only TTR-OPENAI-014 first with canonical `.env.test` loading and `OPENAI_AGENT_FLOW_MODEL=gpt-5.4-mini`.
4. Require both Vitest Pass and `OPENAI_LIVE_TOOL_MEMORY_ASSERTIONS=PASS`; absence of the marker is a failed/blocked execution, not a pass.
5. If provider access fails, record the exact HTTP/access class without exposing credentials and do not claim execution. If the tool lifecycle fails, retain the exact scenario/log for focused failure-origin review.
6. On success, run the focused native memory/approval regression, source typecheck, and diff/whitespace checks; then remove all owned setup and compare ignored artifacts with the round-1 clean baseline.
7. Update the canonical execution report as round 2 and redeliver the cumulative package to `code_reviewer` for proportional review of the newly changed durable test path plus the existing round-1 paths.

### Round 2 Execution Result

- TTR-OPENAI-014: **Pass** against real OpenAI `gpt-5.4-mini`.
- Credential source proof: canonical `.env.test` loaded the key after the inherited `OPENAI_API_KEY` was explicitly removed; authenticated model discovery returned HTTP 200 and confirmed the selected model.
- Provider execution proof: Vitest reported 1 file / 1 test passed in 5.24 seconds; the real journey itself completed in 3.861 seconds.
- Silent-skip guard: `OPENAI_LIVE_TOOL_MEMORY_ASSERTIONS=PASS` was present and `[provider integration skip]` was absent.
- At the synchronous `AGENT_TOOL_EXECUTION_STARTED` observation, the physical JSONL already contained the model-issued `write_file` call with a non-empty ID and explicit path/content arguments, and contained no correlated result.
- After execution and the live continuation turn, JSONL contained exactly one call and one correlated result in order. The call had no outcome keys; the result physically had both outcome keys, including `tool_error:null`, and had no name/args.
- The harmless output file contained every required line, the final assistant response referenced its path, and no tool/generation failure was emitted.
- Focused native regression: `MemoryManager` plus approval integration passed 2 files / 24 tests.
- Core source typecheck, tracked diff check, targeted whitespace check, and round-2 cleanup passed.
- Durable impact: one additional existing test file updated; no production source and no test path added or removed.

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
| 11 | `env -u OPENAI_API_KEY OPENAI_AGENT_FLOW_MODEL=gpt-5.4-mini node --env-file=<canonical core .env.test> node_modules/vitest/vitest.mjs run tests/integration/agent/openai-single-agent-flow.test.ts --reporter=verbose` | Real OpenAI API; test-local workspace/memory; inherited key explicitly removed | TTR-OPENAI-014; live native early persistence, strict JSONL, execution, continuation | Pass — 1 file / 1 test; assertion marker present; no provider skip | `api-e2e-evidence/round2-openai-live-tool-memory.log` |
| 12 | Core `MemoryManager` unit plus native approval integration | Assigned worktree | Round-1 native contract regression after the OpenAI durable update | Pass — 2 files / 24 tests | `api-e2e-evidence/round2-native-regression.log` |
| 13 | Core source typecheck, `git diff --check`, targeted whitespace scan | Assigned worktree | Round-2 compile and artifact integrity | Pass | `api-e2e-evidence/round2-openai-static-checks.log` |

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

### Round 2 Final Confidence Extension

| Confidence Category | Round-1 Final | Round-2 Final | OpenAI Evidence Effect |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 99% | Adds a real native provider to the already direct AC-001/AC-004 proof |
| Changed-boundary execution directness | 98% | 99% | Synchronous tool-start JSONL inspection proves early call/no-result state on a live stream |
| Cross-boundary integration realism and mock gap | 97% | 99% | Real OpenAI stream, native agent loop, tool, memory filesystem, and continuation join the prior live Codex proof |
| Environment, configuration, identity, and fixture fidelity | 96% | 98% | Canonical secret file, authenticated model discovery, available selected model, isolated data, and explicit no-skip marker |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | 97% | No change; round-1 edge/recovery matrix remains authoritative |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Still inapplicable |
| Durable regression coverage quality and relevance | 97% | 98% | Existing env-gated live journey now protects the exact physical persistence contract |

- Overall round-2 final confidence: **98.3%** (simple average of six applicable categories).
- Every critical acceptance criterion directly proven: Yes.
- Any applicable category below 90%: No.
- Default clean-confidence target met: Yes.
- Remaining external-provider gap: no live LM Studio run was performed; it requires a separately running/reachable configured model and is not evidence supplied by the OpenAI credential.

## Broader Validation Decision (Mandatory)

- Decision: Required; both selected rounds executed and passed.
- Selected execution mode: Live API / Lifecycle — Codex App Server in round 1 and native OpenAI API in round 2; no browser.
- Specific confidence gap or residual risk addressed: Round 1 addressed evolving hosted-Codex search events; round 2 addressed real OpenAI streamed argument assembly flowing through the native early-write/result/continuation boundary.
- Why the selected mode can materially improve confidence: Codex checks the installed App Server against converter/recorder/writer JSONL. OpenAI checks a second real provider through `OpenAILLM`, native agent/tool execution, synchronous tool-start persistence, final strict JSONL, and continuation.
- Expected/achieved confidence after selected validation: 98.3%, with no applicable category below 90% and direct proof for every critical acceptance criterion.
- Browser-specific decision and rationale: Browser validation is not applicable; no frontend, browser API, renderer, routing, or desktop-shell behavior changed.
- If Not Required: N/A.
- If Blocked: N/A; Codex authentication/catalog/thread/search and OpenAI canonical credential/model/tool execution were available.

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

- Startup order and commands: Build current core package, execute repository coverage, run the env-gated live Codex memory E2E and hosted-search probe, then in round 2 load canonical core `.env.test`, preflight OpenAI models, and run the env-gated OpenAI single-agent journey.
- Environment choices that materially affect the run: `RUN_CODEX_E2E=1`; installed `codex-cli 0.144.1`; real OpenAI `gpt-5.4-mini`; canonical `.env.test`; isolated temporary workspace and memory directories.
- Health / readiness checks: `codex --version`; Codex model catalog/thread startup; OpenAI `/v1/models` HTTP 200 and selected-model presence; explicit live assertion marker and no provider-skip marker.
- Seed data / fixtures: No durable shared data; unique run/token IDs and test-local JSONL.
- Test identities, authentication, permissions, or session state: Existing local Codex authentication plus canonical OpenAI test credential loaded in-process; no credential values recorded and no production account mutation.
- Requirement-linked journeys or scenarios: TTR-API-008 live Codex recorder smoke, TTR-PROBE-001 live hosted-search lifecycle, and TTR-OPENAI-014 native OpenAI tool/memory lifecycle.
- Evidence to capture: Exact commands, Vitest output, shape-only JSONL assertions, OpenAI no-skip marker, temporary Codex harness checksum, and cleanup result; no provider-private content is reproduced in the reports.
- Owned processes and temporary state to clean up: Spawned Codex client/thread, Codex/OpenAI temporary workspaces and memory, dependency links, build output, and test DB artifacts created by the runs.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TTR-PROBE-001 | One isolated live Codex hosted-search turn through production manager/recorder followed by a shape-only JSONL audit | Pass: exactly one terminal-argument call precedes exactly one correlated minimal result; placeholder writes nothing | Provider/model network behavior is nondeterministic and version-specific; durable captured-frame integration is the stable regression. Temporary source removed; checksum/evidence retained. |
| TTR-PROBE-002 | Static diff/search against bootstrap for migration/version/update/combined-call vocabulary | Pass: no forbidden compatibility or migration mechanism was added | This is execution evidence, not runtime product code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Claude paid-provider tool execution | Deterministic coordinator/converter inputs and persistence composition directly exercise the changed local boundary; external Claude service behavior did not change | Low residual external-provider drift | Revisit only if local provider composition fails or live Claude lifecycle is materially uncertain |
| Live LM Studio model execution | Round 2 was explicitly enabled by the OpenAI credential; LM Studio requires a separately running/reachable configured model and remains a distinct external environment | Low bounded OpenAI-compatible endpoint drift | Run only if LM Studio-specific confidence is requested and a concrete model is confirmed ready |
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
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes — four scenarios added and seven files updated across both rounds; no removals
- Post-repository confidence: 96.3%
- Broader validation decision: Required; live Codex and live OpenAI lifecycles executed and passed
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 2 was planned in this canonical investigation before the OpenAI durable edit. TTR-OPENAI-014 passed without provider skip, raised final confidence to 98.3%, and requires a renewed proportional review of the seventh changed durable test path.
