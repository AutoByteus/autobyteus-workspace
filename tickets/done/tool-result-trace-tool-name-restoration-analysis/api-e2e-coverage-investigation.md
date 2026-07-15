# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis/design-spec.md`
- Supplemental Solution Artifacts: None.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Source/architecture review Pass at commit `0bfe1e41ce289df30cde885a036649a2731837c1`.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1 (this file).

## Current Requirement And Design Basis

Future native, Codex, and Claude `tool_result` raw-trace rows must carry the non-empty canonical name from the matched call while never carrying `tool_args`. Compound `(turn_id, tool_call_id)` remains authoritative. A present terminal name must match the call after existing normalization; conflict must not write or complete and a later valid terminal may complete. A missing name is accepted when the call supplies a canonical name. Success, denial, failure, explicit/turn interruption, result-first/deferred, archived-call, duplicate, and unmatched paths must preserve these invariants. Historical sparse results and historical name/argument supersets remain version-agnostically readable without migration. Result-local name must be observable through raw-memory/API inspection, while full projections still correlate the call.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Native future result persistence includes canonical `tool_name` | Changed | R-001/R-003/R-004-R-007; native builder/manager implementation | Direct native lifecycle execution required. |
| Shared Codex/Claude future result persistence includes canonical `tool_name` | Changed | R-001-R-007; sequencer/writer implementation | Provider converter-to-recorder and server lifecycle execution required. |
| Conflicting observed terminal name is rejected before completion | Added invariant | R-004/R-005, AC-003 | Conflict, no-write, no-completion, later-valid recovery coverage required. |
| Missing terminal name uses matched call name | Changed | R-006, AC-004 | Missing-name and interruption coverage required. |
| `tool_args` remains call-only | Preserved | R-003, AC-001/002/004 | Every future result-shape assertion must verify absence. |
| Compound identity and duplicate suppression | Preserved | R-002, AC-006 | Reused-ID different-turn and duplicate-terminal coverage remains valid. |
| Historical sparse and superset rows are directly usable | Preserved | R-008/R-009, AC-008 | Version-agnostic reader/projection scenarios remain required; no compatibility branch or migration test. |
| GraphQL raw-memory view exposes result-local name | Observable consequence | AC-007 and downstream coverage hint | Existing GraphQL E2E fixture/query needs a result-local name and explicit API assertion. |
| Run-history/work-trace projections correlate archived call and active result | Preserved with refined current row shape | AC-006-R-009 and handoff hints | Existing executable projection scenarios should use the future name-bearing result shape; historical sparse behavior stays separately covered. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Native `MemoryManager`; shared `RuntimeToolTraceSequencer` | Focused unit tests | None after broader affected suites. | Repository integration/API |
| API / transport / contract | Observable only | GraphQL memory view serializes existing `toolName` field | Existing converter/unit tests; GraphQL E2E lacks the new result assertion | Result-local field could be lost at resolver/converter/query boundary. | Durable GraphQL E2E |
| Frontend component / state | No | None | N/A | None | None |
| Browser integration / user journey | No | None | N/A | None | None |
| Authentication / session / permissions | No | None | N/A | None | None |
| Desktop renderer / web-equivalent UI | No | None | N/A | None | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes | Tool call/result sequencing, interruption, recovery, archive hydration | Native/server lifecycle tests | Provider live-process fidelity is not needed because converters and recorder are exercised in-process with real stores. | Repository lifecycle/integration |
| Persisted-data transition | Yes | Future writer shape; unchanged version-agnostic readers | RawTraceItem, logical reader, projection tests | Historical mixed corpus needs broader affected-suite execution. | Repository unit/integration |
| Worker / queue / distributed coordination | No | Recorder queue is exercised in-process; no distributed protocol changed | Recorder `waitForIdle` integration | No multi-process behavior affected. | None |
| External integration | No | Provider converters only; no live provider contract changed | Captured/synthetic converter-to-recorder events | Live Codex/Claude execution adds cost/variability without stronger writer-boundary evidence. | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis`
- Project type and runtime stack: pnpm TypeScript monorepo; Vitest; TypeGraphQL; filesystem JSONL memory store; Prisma client required to load server integration graph.
- Conflicting, missing, or unclear project instructions: `autobyteus-server-ts/AGENTS.md` is authoritative for Vitest invocation. Server `tsconfig.json` includes tests with `rootDir: src` and has known TS6059 noise; implementation handoff records `tsconfig.build.json` as the valid source typecheck. No applicable `AGENTS.md` exists under `autobyteus-ts`.
- Required environment variables or secrets available: N/A; selected coverage uses deterministic temp directories and in-process GraphQL/schema/runtime harnesses. Live provider E2E gates (`RUN_CODEX_E2E`) are unnecessary.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/autobyteus-server-ts/AGENTS.md` | Closest test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration suite path supported. |
| `autobyteus-server-ts/README.md` | Setup/environment | Tests use `.env.test` and temp SQLite; some integrations/live Codex are gated; Prisma generation is part of build. |
| `autobyteus-server-ts/package.json` | Scripts | `pretest` builds shared workspaces; direct `exec vitest` avoids unrelated pretest and matches project agent notes. |
| `autobyteus-server-ts/vitest.config.ts` | Runner config | Vitest config/environment for server tests. |
| `autobyteus-ts/package.json`, `autobyteus-ts/vitest.config.ts` | Core test/build config | Direct Vitest execution; build compiles and verifies runtime dependencies. |
| Implementation handoff environment notes | Proven local setup | Dependencies already installed offline; Prisma client was generated; no tracked generated files. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts tests | worktree root | `pnpm -C autobyteus-ts exec vitest run ... --no-watch` | In-process, temporary filesystem fixtures | Test discovery/pass | Tests remove temp dirs |
| autobyteus-server-ts tests | worktree root | `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | In-process GraphQL/schema/runtime; generated Prisma client already present | Test discovery/schema construction/pass | Hooks remove temp dirs; no service process |
| Builds/typecheck | worktree root | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | No service/port | Exit 0 | No process cleanup |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Native tool lifecycles | `MemoryManager` + `FileMemoryStore` temp dirs | No external data | Test `finally` cleanup |
| Codex/Claude tool lifecycles | Existing runtime factory/converter/recorder harness + temp dirs | Synthetic provider events; real sequencer/writer/store | Existing temp-dir hooks |
| GraphQL raw-memory API | In-process schema + temp app-data directory | No server port/auth | Existing suite hooks |
| Historical sparse/superset corpora | Explicit `RawTraceItem`/record fixtures | Approved direct-use data; no migration | In-memory/temp fixture cleanup |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design spec “Persisted Data / State Transition Decision”; handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: name-less result with explicit null outcomes; result-side name/argument superset; same call ID reused in different turns; archived call plus active result.
- Evidence planned: execute `RawTraceItem`, interaction builder, historical replay projection, GraphQL/run-history, work-trace, and lifecycle hydration coverage. Confirm no migration/version branch appears in changed diff.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` focused lifecycle scenarios | Native success/denial/failure/interruption, conflict atomicity and later missing-name completion, unmatched, duplicate, archive hydration, no result args | R-001-R-007; AC-001/003-006/009 | Still Valid | Reviewed changed scenarios and surrounding lifecycle suite | Execute focused file. |
| `autobyteus-ts/tests/unit/memory/raw-trace-item.test.ts` | Historical missing outcome and name-less explicit-null result parsing | R-008; AC-008/009 | Still Valid | Uses normal version-agnostic model | Execute. |
| `autobyteus-ts/tests/unit/memory/tool-interaction-builder.test.ts` | Sparse result reconstruction; historical terminal superset; compound identity | R-002/R-008/R-009; AC-006/008/009 | Still Valid | Explicit same call ID across turns and terminal args | Execute. |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts` | Result-first/deferred, failure/denial, missing/equal/conflict, later valid, duplicates, compound identity, interruption, archive hydration | R-001-R-007; AC-002-006/009 | Still Valid | Direct sequencer/writer/store execution | Execute. |
| `autobyteus-server-ts/tests/unit/agent-memory/run-memory-writer.test.ts` | Required result name serialized with explicit null outcomes and no args | R-001/R-003; AC-001/002/009 | Still Valid | Direct writer/store assertion | Execute. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Codex hosted-search and Claude MCP normalization-to-recorder; denial/duplicate; raw/view result names and no args | R-001-R-007; AC-002/004/005/009 | Still Valid | Real converters, recorder queue, writer/store | Execute. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` “returns memory view…” | GraphQL exposes raw traces, but result fixture lacks name and query omits tool fields | AC-007/009 | Needs Update | API field exists in schema/converter; scenario does not assert refined contract | Add name to future-shaped result, query `toolName/toolArgs/toolResult/toolError`, assert result-local name and null args. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` archived call/active minimal result | Cross-file correlation through GraphQL; current result fixture omits now-required writer name | R-001/R-008/R-009; AC-006/007/009 | Needs Update | Scenario calls current `RunMemoryWriter`, so it should represent the upgraded write contract; historical sparse reads exist elsewhere | Add canonical name and assert lifecycle result name/no args; retain exactly-once projection proof. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` archived call/active minimal result | Cross-file work-trace projection exactly once | R-001/R-009; AC-006/007/009 | Needs Update | Fixture represents active future row and should carry canonical name | Add result-local name/no args and keep projection exactly-once assertions. |
| `autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` | Sparse result merge/orphan and historical result-side args superset | R-008/R-009; AC-008/009 | Still Valid | Explicit historical shapes | Execute. |
| `autobyteus-server-ts/tests/unit/agent-memory/raw-trace-record-normalizer.test.ts` | Absent vs explicit-null historical outcomes | R-008; AC-008/009 | Still Valid | Normal reader path | Execute. |

## Stale Or Obsolete Coverage Decisions

No durable scenarios will be deleted. Three active/future fixtures contain obsolete name-less result shapes; they will be updated in place. Historical sparse assertions remain valid because they prove the approved no-migration reader policy rather than protecting an obsolete writer.

## Durable Coverage To Add

None as a new test case. The existing GraphQL memory-view scenario is the correct durable API boundary and will be strengthened rather than duplicated.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-001 | `tests/e2e/memory/memory-view-graphql.e2e.test.ts` / raw traces | Query/assert result-local `toolName`; assert GraphQL `toolArgs` is null; include future result name | R-001/R-003, AC-001/007/009 | Direct API exposure proof. |
| API-002 | `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` / archived call + active result | Use required canonical result name and assert physical lifecycle result name/no args | R-001-R-003/R-009, AC-006/007/009 | Keeps GraphQL exactly-once correlation. |
| EXEC-001 | `tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / archived call + active result | Use future name-bearing result and assert input row has no args; retain one rendered tool | R-001-R-003/R-009, AC-006/007/009 | Executable projection surface. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/memory-manager.test.ts tests/unit/memory/raw-trace-item.test.ts tests/unit/memory/tool-interaction-builder.test.ts --no-watch` | Worktree root | Native future writes, conflicts/recovery, interruption, archive, historical reads, compound identity | Pass (29/29) | `api-e2e-evidence/01-native-memory.log` |
| 2 | Focused server writer/sequencer/normalizer/historical replay Vitest command | Worktree root | Shared lifecycle states, future serialization, historical readers | Pass (20/20) | `api-e2e-evidence/02-server-unit-readers.log` |
| 3 | Cross-runtime persistence integration Vitest command | Worktree root | Codex and Claude converter-to-recorder/store, denial/duplicate | Pass (16/16) | `api-e2e-evidence/03-cross-runtime-integration.log` |
| 4 | GraphQL memory-view/run-projection E2E and work-trace projection Vitest command | Worktree root | Raw API exposure and downstream executable projections | Pass (16/16) | `api-e2e-evidence/04-api-projections.log` |
| 5 | Broader server agent-memory/run-history/memory E2E/work-trace Vitest command | Worktree root | Regression coverage across memory readers/projections | Initial fail: 4 stale assertions; rerun Pass (212/212, 1 unrelated live skip) | `api-e2e-evidence/05-broader-server-memory-projection.log`, `06-stale-coverage-fixes.log`, `07-broader-server-memory-projection-rerun.log` |
| 6 | `autobyteus-ts` build, server source typecheck, `git diff --check` | Worktree root | Compile/build/package integrity | Pass | `api-e2e-evidence/08-build-typecheck-diff.log` |
| 7 | `pnpm -C autobyteus-ts exec vitest run tests/unit/memory --no-watch` | Worktree root | Broader native memory regression | Pass (130/130) | `api-e2e-evidence/09-broader-native-memory.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | Direct durable scenarios cover `AC-001`-`AC-009`: all runtime families, result shape, mismatch/retry, missing/unmatched, compound identity, partial API inspection, historical sparse/superset reads, and focused/broader execution. | No material requirement gap. | None proportionate. |
| Changed-boundary execution directness | 98% | Real `MemoryManager`, sequencer, recorder, writer, JSONL stores, GraphQL schema/converter, run projection, and work-trace projection executed. | GraphQL E2E is in-process rather than socket transport, which does not bypass the changed converter/resolver boundary. | A network GraphQL call would add negligible evidence. |
| Cross-boundary integration realism and mock gap | 96% | Codex/Claude converters feed the real recorder queue/sequencer/writer/store; native uses real store; archived/active and API/projection paths use filesystem corpora. | Provider processes are synthetic, not live. Provider wire parsing is nevertheless directly exercised and no provider protocol code changed. | Live tool call could marginally confirm current provider output but would be nondeterministic and redundant for the writer invariant. |
| Environment, configuration, identity, and fixture fidelity | 96% | Project Vitest config, Prisma reset, temp app-data roots, compound turn/call identities, archive manifests, and real JSONL stores used. | No production-scale corpus; not material to a small denormalized field. | None proportionate. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Failure, denial, explicit/turn interruption, result-first/deferred, missing/equal/conflicting name, later valid terminal, unmatched, duplicate, archive hydration, and cross-turn reused IDs pass. | No material unresolved lifecycle edge. | None. |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend, browser, renderer, or shell surface changed; the observable API is directly covered by GraphQL E2E. | N/A | N/A |
| Durable regression coverage quality and relevance | 97% | Six existing scenarios were narrowly updated rather than duplicated; broader execution found and corrected four stale assertions; historical compatibility coverage remains separate and requirement-backed. | Live Codex test remains env-gated and is unrelated because it explicitly requests no tools. | Proportional code review of changed tests. |

- Overall post-repository confidence: **97.2%**
- Calculation method: Simple average of six applicable categories; N/A user/browser/desktop category excluded.
- Every critical acceptance criterion directly proven: Yes.
- Any applicable category below `90%`: No.
- Default clean-confidence target of `95%` met: Yes.
- Material residual risks: None. Negligible residual risk remains that a future provider wire-schema change could emit a different name; current converter-to-recorder tests and mismatch rejection make that failure safe and diagnosable.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Selected execution mode: `None` beyond repository-resident GraphQL API, lifecycle, integration, and projection execution.
- Specific confidence gap or residual risk addressed: All material gaps were closed by direct repository execution: API exposure through GraphQL, provider conversion through recorder/store, lifecycle edge cases, archive hydration, and historical readers.
- Why the selected mode can materially improve confidence: Additional browser/live-provider execution would not traverse a changed browser boundary and the available live Codex memory test explicitly avoids tools, so it cannot prove the changed result shape.
- Expected confidence after the selected validation: 97.2% (achieved).
- Browser-specific decision and rationale: Not applicable; no UI/browser contract changed.
- If `Not Required`, evidence proving the real changed boundary without broader execution: 130 native memory tests; 212 passing server memory/run-history/API/work-trace tests; direct Codex/Claude converter-to-recorder integration; focused GraphQL raw-memory and projection E2E; build/source typecheck/diff checks. The one skipped live Codex test is unrelated and intentionally gated because its scenario forbids tool use.

## Desktop Application Validation Decision (When Applicable)

N/A; no desktop renderer or shell boundary changed.

## Temporary Executable Validation Plan

None planned. Repository-resident tests exercise the real changed boundaries.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live provider processes | Converter event normalization and recorder persistence are directly covered without external services; live execution would be nondeterministic and does not improve writer invariant evidence | Negligible future provider wire-schema drift | Preserve converter-to-recorder durable coverage; no escalation. |
| Browser/desktop UI | No affected surface | None | None. |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: Yes — completed.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes — six existing files updated; no files added or removed.
- Post-repository confidence: 97.2%.
- Broader validation decision: Not Required.
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: Initial investigation was written before durable coverage edits. Broader execution then found four stale pre-change assertions; this artifact was updated before those API/E2E-owned fixes, and the complete affected suites passed on rerun.

## Investigation Update — Broader Affected-Suite Evidence (2026-07-15)

The first broader server memory/projection run executed 213 scenarios (208 pass, 4 fail, 1 env-gated live Codex skip) and exposed four obsolete assertions, not implementation failures. Each failed assertion expected the pre-change name-less future result shape, directly contradicting approved `R-001`, `AC-001/002`, and the reviewed writer invariant. The scenarios themselves remain valuable and therefore are `Needs Update`, not remove/replace:

| Scenario ID | Existing Path / Scenario | Obsolete Assertion | Validity Decision | Required Update |
| --- | --- | --- | --- | --- |
| EXEC-002 | `tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` / inferred result-first terminal | Result `toolName === null` | Needs Update | Expect canonical `run_bash`; keep `toolArgs === null`. |
| EXEC-003 | Same file / assistant-tool-assistant order | Result `toolName: null` | Needs Update | Expect canonical `Bash`; preserve order/outcome proof and null args. |
| EXEC-004 | `tests/unit/agent-memory/agent-run-memory-recorder.test.ts` / Claude route-backed `send_message_to` | Result name null | Needs Update | Expect canonical `send_message_to`; preserve MCP result and null args. |
| EXEC-005 | `tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | Physical/logical result omits name | Needs Update | Expect canonical `generate_image`; preserve absence/null of result args and projection behavior. |

Evidence: `api-e2e-evidence/05-broader-server-memory-projection.log`. These are API/E2E-owned stale durable assertions discovered during the valid broader run. Updating them is within the approved behavior and requires no implementation or design reroute. The focused changed-boundary runs before this broader run all passed.
