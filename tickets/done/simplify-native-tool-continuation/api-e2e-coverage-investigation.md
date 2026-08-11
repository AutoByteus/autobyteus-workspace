# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/surviving-native-loop-responsibility-inventory.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-003`, `DR-004`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005`
- Current Investigation Round: `5`
- Trigger: `CRR-007` Pass for IR-003 commit `7aa4bc6d7f3216db8dfc703eaf5ebfbc67da3804`, implementing BEH-011 / REQ-013 / AC-016.
- Prior Investigation Reviewed: Round 4 / `API-REV-004` Pass at 98.2%, delivery `DR-004`, and the cumulative reviewed implementation package.
- Latest Authoritative Investigation: This file.


## Round 5 Re-entry Decision — IR-003 Five-Minute Compaction Completion Default

- Reviewed implementation/source authority: `CRR-007` Pass, no findings, for IR-003 commit `7aa4bc6d7f3216db8dfc703eaf5ebfbc67da3804` over delivery-integrated parent `012257323d5b7303184ca7c5f385602c6a6914f3`.
- Changed boundary: the sole production delta is the runner-local named `DEFAULT_COMPACTION_AGENT_COMPLETION_TIMEOUT_MS = 300_000` and existing `options.timeoutMs ?? constant` fallback. Ordinary backend construction omits an override; the unchanged collector consumes the resolved value. No config/API/UI/persisted-data or unrelated timeout surface changed.
- Existing coverage decision and completed maintenance:
  - `server-compaction-agent-runner.test.ts` was correctly classified `Needs Update`. Its five cases remained valid; two deterministic cases now directly observe omitted/default `300_000` and explicit `17` ms propagation, immediate typed failure metadata, exactly one unsubscription, empty listener set, and exactly one child termination.
  - `compaction-run-output-collector.test.ts` remained `Still Valid` and passed unchanged. Its actual short-timer mechanism plus the retained runner 10 ms case prove genuine timeout behavior without a five-minute sleep.
  - `compaction-agent-parent-fallback.integration.test.ts` initially failed before compaction because the integrated base had replaced `subscribeToEvents` / `getStatusSnapshot` with batch/lifecycle APIs. Investigation was updated before a bounded fixture correction. The corrected test observes `subscribeToSourceEventBatches` / `getLifecycleSnapshot().phase`; all original parent-trigger, fallback, exact context and continuation assertions remain unchanged and passed.
- Completed execution:
  - Focused runner: Pass, 7/7 in 19 ms.
  - Unchanged collector plus corrected parent-fallback integration: initial 11 pass / 1 stale-fixture failure; rerun Pass, 2 files / 12 tests.
  - Broader server compaction unit matrix: Pass, 4 files / 26 tests.
  - Full server/shared production build and sanitized built-in bootstrap: Pass.
  - Source/diff contract scan: Pass; reviewed production delta remains one file / 3 insertions / 1 deletion, ordinary factory omits `timeoutMs`, API/E2E changed no production source, and changed durable tests contain no 300,000 ms timer sleep.
  - Cleanup: Pass; no owned test process or temporary compaction workspace remains.
- Durable coverage delta: two updated repository paths—direct AC-016 runner proof and the relevant parent-fallback fixture's current backend observation API. No durable file was added or removed; no test-support or production path was edited by API/E2E.
- Broader validation decision: `Not Required`. Deterministic tests directly observe the only changed argument/lifecycle boundary, the current parent-triggered server path passes, build/bootstrap passes, and round 4's real LM Studio/DeepSeek compaction behavior remains valid because IR-003 changes no provider, prompt, request, strategy, context or continuation behavior.
- Completed revision: `API-REV-005` Pass at 98.8% final confidence. Successful durable coverage changes require proportional `code_reviewer` review before delivery resumes.

## Round 4 Re-entry Decision — Compaction Percentage And Post-Compaction Behavior

- User clarification: use the existing `autobyteus-ts` compaction E2E rather than inventing a duplicate harness, and establish both exact configured-percentage arithmetic and real post-compaction continuation.
- Existing durable coverage remains valid and was used unchanged:
  - `autobyteus-ts/tests/unit/agent/token-budget.test.ts` proves `triggerThresholdTokens = floor(compactionRatio * inputBudget)` across context/output/safety-margin caps and ratio precedence.
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` and `memory-compaction-strategy-tool-lifecycle.test.ts` prove deterministic trigger, failure fence, lifecycle, and continuation behavior.
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts` is the existing env-gated real local-model E2E; its explicit LM Studio prerequisites were READY and it passed unchanged.
  - The canonical managed-provider product E2E `deepseek.compaction-agent-flow` runs through the built server and actual AgentRun using the previously authorized imported vault. It checks the configured 5% ratio, prompt usage below and at/above the computed threshold, completed compaction, continued tools, compacted-memory/current-user projection, exact retained output, ordered traces, and no obsolete continuation marker.
- Execution result on delivery-integrated HEAD `012257323d5b7303184ca7c5f385602c6a6914f3`:
  - Exact-math and deterministic lifecycle matrix passed, 3 files / 9 tests.
  - Real LM Studio `qwen/qwen3.6-35b-a3b` compaction E2E passed, 1/1. Its 5% threshold was exactly `floor((262144 - 1024 - 256) * 0.05) = 13043`; prompt usage crossed from `5105` to `14418`, lifecycle completed, post-compaction usage fell to `10883`, and subsequent tool/turn continuation returned the exact retained nine-field JSON.
  - Managed DeepSeek preflight was READY using credentials previously imported by audited `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`. The first live attempt observed one invalid-JSON compactor response and was strictly rejected despite a later completion; the unchanged rerun passed 2/2. Its threshold was exactly `floor((1000000 - 1024 - 256) * 0.05) = 49936`; usage crossed at `56152`, compaction completed, three tools succeeded, ordered traces/no marker passed, projected memory/current user passed, and the exact retained artifact passed.
- Coverage decision: no repository-resident durable coverage was added, updated, or removed in round 4. Value-safe arithmetic audits, including an executable parser/assertion over both real logs, are temporary execution evidence, not product coverage.
- Broader validation decision: `Required — Live API plus real local model`; completed. The managed-provider invalid-JSON observation remains a disclosed provider stochasticity risk rather than a hidden pass or a ticket source finding.
- Completed revision: `API-REV-004`.

## Round 3 Re-entry Decision — IR-002 / CR-001 Resolution

- Prior failure first: `API-E2E-F-001` was the deterministic absence of root `ToolSchemaProvider` in both the corrected durable test and compiled package probe.
- Reviewed source delta: `IR-002` adds exactly one canonical export in `autobyteus-ts/src/tools/index.ts`; `CRR-004` confirms source Pass with no alias, wrapper, compatibility module, test weakening, or unrelated redesign.
- Coverage validity: the round 2 positive `publicApi` assertion remains the correct AC-012 durable proof and needs no further edit. Re-execute it unchanged against `IR-002`.
- Planned execution: focused root-contract test, package build/runtime dependency verification, compiled five-symbol canonical identity probe, and diff/source-delta integrity evidence.
- Broader validation: `Not Required`. The reviewed source change is a one-line static re-export with no runtime provider/tool-loop impact; preserve the successful managed-secret/live-provider evidence from round 1 unless the focused package checks reveal broader impact.
- Revision handling: `API-REV-003` records the completed focused refresh while keeping `API-REV-001` and `API-REV-002` history intact.

## Round 2 Re-entry Decision — TR-001

- Finding: the package-contract test positively asserted retained handler/schema/custom-processor symbols only through internal source subpaths while `publicApi` was used only for removed-symbol assertions. A missing retained root export could therefore escape the durable contract check.
- Validity decision: `Needs Update` for `autobyteus-ts/tests/unit/legacy-tool-calling-public-surfaces-removed.test.ts`; retain the negative root/path matrix and add positive root namespace identity assertions for `LlmStreamingResponseHandler`, `ToolSchemaProvider`, `SegmentEvent`, `BaseToolExecutionResultProcessor`, and `ToolExecutionResultProcessorRegistry`.
- Planned execution: run the focused contract test and `pnpm -C autobyteus-ts build` (or equivalent package contract build) after the bounded test edit.
- Broader validation: `Not Required` for this correction. The finding concerns durable proof of static root exports only and does not change runtime source, provider behavior, secrets, fixtures, or the real AgentRun evidence from round 1. If the new assertion exposes a missing retained root export, classify the observed result truthfully and return it to `code_reviewer` for failure-origin review rather than adding a production compatibility shim.
- Revision handling: `API-REV-002` records this completed correction/failure result without rewriting the `API-REV-001` baseline.

## Current Requirement And Design Basis

The supported runtime remains one provider-native tool loop. The refactor changes ownership and representation, not provider semantics: `AgentTurnRunner` must run every custom result processor and then commit the complete final array once through `MemoryManager.ingestToolResults`; a pure `ToolContinuationInputBuilder` projects semantic text and optional context files; `AgentInputPipelineResult.llmUserMessage` is required and nullable; one `LLMRequestAssembler.prepareRequest` transaction optionally appends that message; and one `LlmStreamingResponseHandler` handles ordinary text while admitting native deltas only when tools are configured. Active batch identity/admission, provider schemas/histories, context media, approval/external results, compaction, recovery, mixed stream lifecycle, and all failure/interruption fences remain supported.

The explicitly changed observable behavior is that new native continuations persist ordered `tool_call` and `tool_result` facts but no `tool_continuation` trace, `Native API tool continuation` card, or replacement marker. Historical generic records remain directly readable without migration. Factory/result-wrapper/base/pass-through/old-handler selection, continuation mode metadata/request strings, built-in memory result processing/deferral, builder-owned persistence, duplicate assembler entrypoints, settlement state, and old exports are intentionally absent without compatibility aliases. This investigation treats old tests as evidence to classify, never as authority that could justify restoring removed source.

For BEH-011 / REQ-013 / AC-016, an ordinarily constructed server compaction runner now passes exactly `300_000` ms to its unchanged output collector, while an explicit `timeoutMs` retains precedence and timeout failure retains typed metadata, unsubscription, and child termination. This is a bounded in-memory default correction with no configuration or migration surface.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / DS-001/006/008 external and internal input | Changed representation / preserved lifecycle | REQ-001/008/012; AC-001/010/015 | Update pipeline/runner/input-memory tests to assert exactly-once processors, strict same-turn TOOL identity, required nullable message, and no continuation trace. |
| BEH-002/006 / DS-002/006/009 streaming and schema setup | Contracted / preserved behavior | REQ-002/003/009; AC-002/003/009/012 | Replace factory/pass-through/old-class coverage with a single handler tools-enabled/disabled matrix plus direct LlmPhase request assertions. |
| BEH-003 / DS-002/010/012 ordered result ownership | Changed owner | REQ-004/005/008; AC-004/005/008/010 | Remove built-in memory processor coverage; strengthen runner proof for processor ordering, active-batch closure, one final batch commit, and continuation build. |
| BEH-004/005 / DS-004/005/008/013 continuation shape | Changed representation / preserved outcomes | REQ-005/006/007; AC-005/006/007/010 | Rename/update builder tests, update integration/provider histories, add null/carrier assembler cases and post-processor carrier evidence. |
| BEH-007 / DS-003/010 batch state/admission | Contracted / preserved identity | REQ-004; AC-004/011 | Remove settlement assertions; retain/expand expected order, accepts, stale/turn mismatch, duplicate/late/no-waiter/interruption coverage. |
| BEH-008 / DS-007/008/009/010 recovery | Preserved | REQ-008; AC-008/010 | Retain focused LlmPhase/runtime/handler recovery tests and execute after structural updates. |
| BEH-009 / DS-011 package contract | Removed/preserved split | REQ-009/010; AC-012/013 | Update root/subpath tests for the new handler and clean failure of all newly retired symbols while retaining unrelated facilities. |
| BEH-010 / DS-004/005/012 trace history | Removed write / preserved direct read | REQ-001/005/008/012; AC-001/005/006/008/015 | Replace positive continuation-trace tests with zero-new-marker and historical-inert-read coverage; extend the real compaction AgentRun to inspect raw trace corpus. |
| BEH-011 / DS-014 server compaction completion timeout | Bounded default correction / preserved lifecycle | REQ-008/013; AC-008/016 | Add deterministic direct runner coverage of exact `300_000` omission, explicit override precedence, typed timeout metadata, unsubscription and child termination without a real-duration wait. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Core agent loop, pipelines, memory command timing, stream projection | Extensive core unit/integration/runtime tests | Mocks may miss provider/model sequencing | Live API product AgentRun |
| API / transport / contract | Yes | TypeScript package root/subpaths and provider request tool-schema presence | Build/import tests and clean-path scans | Unknown external consumers cannot be enumerated | Compiled contract probe; release docs downstream |
| Frontend component / state | No | No web source changed | N/A | None | None |
| Browser integration / user journey | No | No browser-rendered behavior changed; trace UI merely projects generic stored facts | Server/core run-history projections unchanged | Historical cards intentionally remain | None; raw trace is better proven at storage/product AgentRun boundary |
| Authentication / session / permissions | No | No auth boundary changed | N/A | Provider credentials needed only for authorized live validation | Managed secret-vault preflight |
| Desktop renderer / web-equivalent UI | No | No renderer/UI change | N/A | None | None |
| Desktop shell / Electron-specific integration | No | No shell boundary changed | N/A | None | None |
| Process / lifecycle | Yes | Turn loop, tool phase, continuation, compaction, interruption/failure | AgentRuntime and LlmPhase integration coverage | External provider timing/model variance | Live API AgentRun |
| Persisted-data transition | Yes | Stop future `tool_continuation` writes; unchanged generic reader | MemoryManager/file-store tests | Need real new-run corpus proof | Live AgentRun raw-trace corpus inspection |
| Worker / queue / distributed coordination | No | No worker/distributed behavior changed | N/A | None | None |
| External integration | Yes | Provider-native schema/delta/history behavior retained through refactored loop | Deterministic provider renderer/request/handler fixtures | Real SDK/network/model execution still unproven on this commit | DeepSeek native tools/compaction plus OpenAI no-tool AgentRun |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Project type and runtime stack: pnpm TypeScript monorepo; Node.js 22; Vitest; Fastify/GraphQL server; SQLite/Prisma secret vault; provider SDKs; built real-E2E runner.
- Conflicting, missing, or unclear project instructions: None. Delivery had already materialized the root/core/server/shared-package dependency directories on the integrated worktree; round 4 verified them as pre-existing, used them in place, and did not take cleanup ownership.
- Required environment variables or secrets available: `Yes`, by the user's explicit authorization to import `/Users/normy/.autobyteus/server-data/.env` through the project importer into this worktree's isolated test database. Secret values must never be sourced, printed, or copied into artifacts.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/AGENTS.md` | Closest server test instructions | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; avoid watch mode. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Workspace execution | `pnpm test:e2e`, `pnpm test:e2e:real:preflight`, and `pnpm test:e2e:real`; real provider scenarios run through test-owned runtime. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/README.md` | Secret/data/runtime authority | Import only with explicit absolute `--source` and `--database-url`; dry-run first; importer does not infer target; unavailable capabilities are skips, not passes. |
| `package.json` | Canonical scripts | `secrets:import` builds server then invokes the audited importer; real E2E builds server and launches a captured Vitest process against an isolated built test server. |
| `autobyteus-ts/vitest.config.ts` | Core test runner | Core unit/integration files can be selected with `pnpm -C autobyteus-ts exec vitest run --no-watch ...`. |
| `test-support/live-e2e/run-live-e2e.mjs` and `live-e2e-harness.ts` | Real provider harness | Uses sanitized child environment, explicit scenario selection, built server, isolated workspace/memory, product AutoByteus backend/AgentRun, evidence scanner, and owned cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Core tests/build | Worktree root | Existing delivery-materialized dependencies; `pnpm -C autobyteus-ts ...` | Source and workspace packages resolve inside this integrated worktree | Package import/build output | Retain pre-existing dependencies for delivery ownership |
| Server/import/real E2E | Worktree root | Use existing delivery-materialized dependency tree, verify current worktree HEAD, then run canonical scripts | Test DB: `autobyteus-server-ts/db/test.db`; built server chooses owned loopback port | Harness preflight and built-server health | Harness stops owned server; retain pre-existing dependencies |
| Provider APIs | Harness-owned product runtime | `pnpm test:e2e:real -- --scenarios=...` | Secrets resolve only from imported encrypted test vault | `test:e2e:real:preflight` reports READY/MISSING without values | Provider clients/runtime cleaned by harness |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Provider credentials | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:<worktree>/autobyteus-server-ts/db/test.db` | Dry-run then actual TTY confirmation; no value output; source unchanged | Retain isolated test DB/vault for explicitly authorized future real tests |
| Native tool/compaction fixture | Built-in `deepseek.compaction-agent-flow` | Temporary isolated files/memory/run ID; exact literals; evidence scanner | Harness removes owned root |
| No-tool fixture | Built-in `openai.agent-flow` | Product AgentRun with no tool names; managed resolver | Harness removes owned root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; implementation `Persisted Data Transition Check` and BEH-010 trace.
- Representative existing-data setup and required behavior: a generic historical `tool_continuation` raw-trace item remains constructible/readable/inert; a new native tool run writes ordered call/result facts and zero continuation coordination markers.
- Evidence planned for the approved direct-use outcome: update `memory-manager.test.ts` to prove historical generic read and absence of a writer API; update provider-native integration and the real compaction harness to inspect the complete raw-trace corpus for call/result facts and zero `tool_continuation` or replacement phrase.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts` | Factory selects API/pass-through and returns schema wrapper | AC-002/003/009 | Replace | Factory/wrapper/selection are intentionally removed | Delete; cover conditional schemas in LlmPhase and behavior in unified handler. |
| `tests/unit/agent/streaming/handlers/pass-through-streaming-response-handler.test.ts` | Separate no-tool class text/interruption/failure behavior | AC-003/008/009 | Replace | Behavior survives but class does not | Delete old class test; merge applicable cases into unified handler test. |
| `tests/unit/agent/streaming/handlers/api-tool-call-streaming-response-handler.test.ts` | Native indexed/mixed/file/callback/reset/terminal behavior | AC-002/003/008/009 | Needs Update | Behavior and implementation survive under current class plus explicit gate | Rename path/class, provide `toolCallsEnabled`, and add disabled unexpected-delta/no-tool lifecycle matrix. |
| Handler-focused integration/live files (OpenAI/Claude/Gemini/Mistral/Kimi/GLM/DeepSeek) | Provider normalized deltas feed old handler class | AC-002/009/013 | Needs Update | Provider coverage remains valuable; only class/path/options are stale | Update to `LlmStreamingResponseHandler` and enable tools. |
| `tests/unit/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.test.ts` | Per-result ingestion/deferral owner | AC-005/009 | Stale / Remove | Processor is intentionally deleted; no compatibility owner | Delete; runner and MemoryManager batch coverage replace it. |
| `tests/unit/agent/loop/tool-result-continuation-builder.test.ts` | Builder persists batch, adds mode metadata, and projects carriers | AC-005/006/007 | Replace | Projection remains; persistence/mode assertions are obsolete | Rename to `tool-continuation-input-builder.test.ts`; retain only pure semantic/context/turn/count assertions. |
| `tests/unit/agent/pipelines/agent-input-pipeline.test.ts` | Same-turn processors plus request-mode result | AC-001/006/007 | Needs Update | Processor/identity/carrier behavior remains; mode does not | Assert null for text-only and one media message for post-processor carrier. |
| `tests/unit/agent/loop/agent-turn-runner.test.ts` | Interruption fences and old builder/mode continuation | AC-005/006/008/015 | Needs Update | Runner is new authoritative commit owner | Update mock/class/result shape; assert final processor order, active closure, one commit, builder order, and ephemeral continuation event. |
| `tests/unit/agent/llm-request-assembler.test.ts` plus reasoning/compaction callers | Request lifecycle and duplicate continuation method | AC-006/007/010 | Needs Update | Transaction remains, one nullable-message method is current | Use `LLMUserMessage`; add null no-append and both compaction shapes; update removed method callers. |
| `tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts` | External ingestion plus positive TOOL boundary write | AC-001/015 | Needs Update | External path valid; TOOL write is explicitly retired | Assert TOOL is side-effect free but still validates active turn. |
| `tests/unit/memory/memory-manager.test.ts` | Positive `ingestToolContinuationBoundary` trace | AC-015 / no migration | Replace | New writer is prohibited; historical generic read remains | Replace with historical inert generic-record/direct-read and current call/result evidence. |
| `tests/unit/agent/tool-invocation.test.ts` | Settlement-map completion plus AgentTurn behavior | AC-004/011 | Needs Update | Batch identity/admission/order survives; settlement does not | Replace settlement assertions with expected IDs, copy safety, `expectsInvocation`, `accepts`, turn mismatch. |
| `tests/unit/agent/streaming/reexports.test.ts` | Unrelated current wrappers plus old handler compatibility wrapper | AC-012/013 | Needs Update | Unrelated wrappers remain; old handler wrapper intentionally removed | Keep unrelated assertions, remove old handler assertion, assert current handler via canonical export tests. |
| `tests/unit/legacy-tool-calling-public-surfaces-removed.test.ts` | Previous ticket treated factory/API/pass-through as supported | AC-009/012/013 | Needs Update | That expectation is stale under this approved contraction | Assert current handler/schema/segments/custom processors; add newly removed symbols/subpaths to absence matrix. |
| `tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Cross-provider native call/result histories, old processor, positive continuation card | AC-002/005/006/015 | Needs Update | Core flow remains critical; processor/card expectations are opposite current behavior | Remove built-in processor; assert ordered call/result facts, no new marker, no aggregate user message. |
| Read-media continuation tests | Builder/pipeline carries audio/video under old mode API | AC-007/010 | Needs Update | Context carrier remains critical | Update builder and nullable message assertions; retain provider rendering. |
| `tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | Tool-safe compaction using old builder/mode | AC-005/006/010/015 | Needs Update | Scenario directly proves changed spine | Update builder, null request, one batch ingestion/no marker assertions. |
| Runtime approval/external-result/interruption suites and `turn-tool-input-port.test.ts` | Active identity, stale/duplicate/no-waiter/turn mismatch, interrupted/late behavior | AC-004/008/011 | Still Valid | These use retained active batch/port/runner boundaries | Execute unchanged unless compilation evidence requires a current-shape fixture update. |
| `tests/integration/agent/tool-approval-flow.test.ts` result persistence helper | Approval tool execution and persisted trace evidence | AC-004/005/011/015 | Needs Update | Execution showed the helper still relied on the retired result processor and stale negative name/arguments assertions | Update helper to apply custom processors then one runner-style batch commit; assert current call/result names, arguments and output. |
| Direct raw-environment provider live files | Ad hoc constructors and raw ambient provider credentials | AC-002/009/013 | Out Of Scope for credential execution; current-handler imports need update | They predate the managed secret resolver and some constructors are independently stale. User/repository authority requires the audited importer and `test:e2e:real`. | Update only changed handler imports/options; do not treat these files as canonical real evidence or restore source compatibility. |
| LlmPhase recovery, incomplete-call, provider renderer/history, file projector tests | Recovery, protocol repair, native history, indexed/file projection | AC-002/007/008/010/013 | Still Valid except old handler imports | Behavior is explicitly preserved | Update only renamed imports/options; execute targeted and broader suites. |
| Planner tests with unrelated `isComplete` fields | Message/compaction planning data | AC-011 exclusion | Out Of Scope | Fields are unrelated to ToolInvocationBatch settlement | Do not change. |
| `test-support/live-e2e/live-e2e-harness.ts` and provider-capability E2E | Real product AgentRun tools/compaction/continuation and no-tool | AC-002/003/005/006/010 | Needs Update | Already exercises the real boundary but does not report AC-015 raw-trace absence | Add value-safe corpus assertions/result fields for ordered tool facts and zero continuation marker. |
| `autobyteus-server-ts/tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts` | Runner creation, output/failure wrapping, injected short timeout, activity and termination | AC-008/016; DS-014 | Needs Update | Existing cases are valid but omitted/default propagation and explicit unsubscription count are absent | Add one deterministic omitted/default + explicit override matrix; preserve existing 10 ms mechanism case. |
| `autobyteus-server-ts/tests/unit/agent-execution/compaction/compaction-run-output-collector.test.ts` | Early success/failure/no-output mechanism behavior for caller-supplied timeouts | AC-008/016; DS-014 | Still Valid | Collector is unchanged and intentionally owns no default | Execute unchanged; do not duplicate default policy here. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `streaming-handler-factory.test.ts` | Factory/result selects two handler classes | One handler and direct LlmPhase setup are approved | REQ-002/003/009; AC-009 | Unified handler plus LlmPhase schema/no-schema tests | No factory behavior remains. |
| `pass-through-streaming-response-handler.test.ts` | Separate class is supported | Class is intentionally deleted | REQ-009; AC-003/009 | Same cases in current handler with `toolCallsEnabled=false` | No old-path import test should survive. |
| `memory-ingest-tool-result-processor.test.ts` | Built-in per-result ingestion/deferral is supported | Runner now owns one final batch commit | REQ-005/009; AC-005 | Runner ordering/one-call tests and integration | No processor replacement is approved. |
| Old builder memory/mode assertions | Builder commits results and writes native mode metadata | Builder is pure and modes are removed | REQ-005–007; AC-005–007 | Renamed pure builder and runner tests | Persistence belongs to runner/MemoryManager. |
| Positive continuation trace assertions | New run writes `tool_continuation`/card | Observable writer removal is required | REQ-012; AC-015 | Negative unit/integration/live corpus evidence plus historical read | No replacement marker is permitted. |
| Batch settlement-map assertions | Batch settles/completes result map | State/APIs have no production caller and are removed | REQ-004; AC-011 | Identity/order/admission tests | ToolPhase final array/runner commit owns completion. |
| Old handler compatibility re-export | Old name/path resolves | Clean public contraction forbids alias | REQ-009; AC-012 | Current handler import plus absence scan | Unknown consumers receive documented break, not code shim. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-001 | Unified handler disabled-tool delta safety with full text/interruption/failure lifecycle | AC-003/008/009; DS-006/009 | Renamed `llm-streaming-response-handler.test.ts` | Directly protects the material consolidation risk. |
| API-E2E-002 | Runner final post-processor array, active closure, one commit, pure build and status order | AC-005/006/008/015; DS-010/012 | `agent-turn-runner.test.ts` | Current ownership change needs deterministic call-order proof. |
| API-E2E-003 | Single assembler null/carrier paths across compaction and rollback | AC-006/007/010; DS-008 | `llm-request-assembler.test.ts` | Existing tests cover only additional-message path. |
| API-E2E-004 | Historical continuation record remains generically readable while no current writer exists | Directly usable/no migration; AC-015 | `memory-manager.test.ts` / package surface test | Protects approved data outcome without compatibility business logic. |
| API-E2E-005 | Real native AgentRun raw trace has ordered calls/results and no continuation marker | AC-005/006/010/015; DS-002/012 | `test-support/live-e2e/live-e2e-harness.ts` and E2E assertion | Closes mock and persistence gaps at the real product/provider boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-006 | Unified handler/provider handler tests | Current import/name and explicit enabled/disabled gate | AC-002/003/008/009 | Preserve indexed/parallel/file/callback coverage. |
| API-E2E-007 | Builder/pipeline/read-media tests | Pure builder, factual metadata, null text-only, one processed media carrier | AC-001/006/007 | Carrier decision occurs after processors. |
| API-E2E-008 | Provider-native continuation/history tests | Remove built-in processor/card; assert ordered once/no user aggregate/no marker | AC-002/005/006/015 | Preserve all provider renderers. |
| API-E2E-009 | Compaction/reasoning/request callers | One `prepareRequest` with null/carrier | AC-006/007/010 | Preserve protocol safety and recovery order. |
| API-E2E-010 | Input memory/batch/exports | Side-effect-free TOOL, identity-only batch, current contract | AC-001/004/009/011/012/015 | No compatibility aliases. |
| API-E2E-011 | Server compaction runner default/override/failure cleanup | Observe exact `300_000` omitted value and explicit short override; assert typed metadata, unsubscribe and terminate with immediate mocked timeout | AC-008/016; DS-014 | No real five-minute wait; no production source edit. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts` | Tests removed selection/wrapper architecture | REQ-009; AC-009 | Unified handler and LlmPhase coverage. |
| `autobyteus-ts/tests/unit/agent/streaming/handlers/pass-through-streaming-response-handler.test.ts` | Tests removed class; behavior moves | REQ-002/009; AC-003/009 | Merge behavior into renamed unified handler suite. |
| `autobyteus-ts/tests/unit/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.test.ts` | Tests prohibited obsolete owner/deferral | REQ-005/009; AC-005 | Runner batch commit and custom processor tests. |

## Repository Coverage Execution Plan And Results

| Order | Command / Execution | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial full `tests/unit` diagnostic | `autobyteus-ts`, verified temporary dependencies | Identified assertions importing/protecting retired architecture | Diagnostic complete: 270 files passed, 17 failed; ticket-related failures informed the recorded update/remove/replace decisions | `validation-logs/round1/core-unit-initial-diagnostic.log` |
| 2 | Focused changed-unit matrix plus final unified-handler rerun | `autobyteus-ts`, explicit files | Unified handler, runner, input, builder, assembler, memory, batch and contracts | Pass in final combined state; unified handler 23/23 | `core-durable-focused-rerun.log`, `unified-handler-rerun.log` |
| 3 | Full core unit suite after coverage edits | `autobyteus-ts/tests/unit` | Broader stale-reference/regression detection | Ticket scope Pass: 282 files / 1508 tests passed. Three unrelated image-client expectations failed in two files. | `core-unit-full.log` |
| 4 | Curated deterministic native/media/compaction/approval/runtime/provider integration matrix with ambient LM Studio and DeepSeek keys unset | `autobyteus-ts`; nine explicit files | Provider histories, media carrier, compaction, approval/external result and failure lifecycle | Pass: 8 files passed, 1 skipped; 28 tests passed, 6 skipped | `core-integration-final.log` |
| 5 | Final approval and mocked DeepSeek fixture rerun | `autobyteus-ts`; raw DeepSeek key unset | Current runner batch ownership and assembler fixture | Pass: 2 files; 6 passed, 5 environment-gated skips | `approval-deepseek-rerun-3.log` |
| 6 | `pnpm -C autobyteus-ts build` | Worktree root | Production TypeScript/runtime dependency/package build | Pass; `[verify:runtime-deps] OK` | `core-build.log` |
| 7 | Exact retired production symbol/semantic-marker scans and `git diff --check` | Worktree root | Clean contraction and diff integrity | Pass | `static-and-diff-check.log` |

Diagnostic exclusions are explicit: the full unit suite's three remaining failures are pre-existing multimedia image-client argument expectations outside this ticket. A broad ambient-provider matrix and a later raw-key-unset collection run exposed stale ad hoc direct provider credential/constructor harnesses; those are non-authoritative for the changed boundary and are superseded by the managed-secret real product harness required by project instructions and the user. They are retained in `core-integration-matrix.log` and `legacy-live-files-collection.log`, not reported as passes.

### Round 2 TR-001 Correction Execution

| Order | Command / Execution | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Focused `legacy-tool-calling-public-surfaces-removed.test.ts` after adding positive `publicApi` identity assertions | AC-012 retained root-package contract | **Fail:** 34 assertions passed; the new retained-root assertion failed only because `publicApi.ToolSchemaProvider` is absent | `validation-logs/round2/root-contract-focused.log` |
| 2 | `pnpm -C autobyteus-ts build` | Production TypeScript build/runtime dependency integrity | Pass; `[verify:runtime-deps] OK` | `validation-logs/round2/core-build.log` |
| 3 | Compiled `dist/index.js` root namespace probe | Distinguishes test defect from root export defect | **Fail:** handler, segment, processor base and registry are present; `ToolSchemaProvider=MISSING` | `validation-logs/round2/compiled-root-contract-probe.log` |
| 4 | `git diff --check` and production-source working-tree check | Coverage edit integrity and API/E2E ownership boundary | Pass; no API/E2E-owned `autobyteus-ts/src` edit | `validation-logs/round2/diff-integrity.log` |

The requested durable assertion correction is implemented and behaves as intended: it exposed an approved retained root export that is missing from the built package. API/E2E will not mask this failure by weakening the assertion or editing production source.


### Round 5 AC-016 Repository Execution

| Order | Command / Execution | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Focused updated `server-compaction-agent-runner.test.ts` | Exact omitted `300_000`, explicit `17`, typed metadata, unsubscribe and terminate without real wait | Pass: 7/7; 19 ms test time | `validation-logs/round5/api-server-compaction-agent-runner-focused.log` |
| 2 | Unchanged collector + parent-fallback integration | Collector early settlement and ordinary parent-triggered compaction/fallback | Initial 11 pass / 1 stale fixture failure; corrected rerun Pass 12/12 | `api-compaction-collector-and-parent-fallback.log`, `api-compaction-collector-and-parent-fallback-rerun.log` |
| 3 | Full server compaction unit matrix | Runner, collector, launch resolver and lineage scope regression | Pass: 4 files / 26 tests | `api-server-compaction-unit-matrix.log` |
| 4 | `pnpm -C autobyteus-server-ts build` | Shared packages, server production build and sanitized built-in bootstrap | Pass | `api-server-build-full.log` |
| 5 | Source/durable diff contract scan, cleanup and artifact consistency | Bounded IR-003 source, ordinary omission, no real five-minute wait, no owned residue, exact hashes and canonical revision consistency | Pass | `api-source-and-diff-contract-scan.log`, `api-cleanup-and-final-state.log`, `api-artifact-consistency.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Current durable cases map every material AC, and ticket-related stale failures are gone | No real provider result yet at this checkpoint | Real native and no-tool AgentRuns |
| Changed-boundary execution directness | 96% | Direct handler, runner, assembler, memory and package tests plus runtime integration | Provider/network path remains simulated | Product AgentRun |
| Cross-boundary integration realism and mock gap | 90% | Deterministic multi-provider histories, compaction, approval/external result and media all pass | Provider SDK/network/model response remains a material mock gap | Real DeepSeek/OpenAI |
| Environment, configuration, identity, and fixture fidelity | 90% | Isolated worktree plan and audited importer are documented | Authorized import/readiness not yet counted in repository-only checkpoint | Dry-run, actual import and READY preflight |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Unit/runtime coverage includes interruption, stale/late, preflight, mode failure, rollback and approval | Live provider variability unobserved | Real multi-turn tool lifecycle |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend/browser/shell surface changed | None | None |
| Durable regression coverage quality and relevance | 97% | Obsolete class/owner/mode tests removed or replaced with current boundary assertions | Proportional test-code review remains | Code reviewer pass |

- Overall post-repository confidence: `94.0%`.
- Calculation method: Simple average of six applicable categories.
- Every critical acceptance criterion directly proven: `Yes` at a deterministic repository boundary; live provider realism remained open.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks at this checkpoint: real SDK/network/model sequencing; actual managed-secret configuration; provider model variability; unknown external package consumers.

## Round 1 Broader Validation Decision

- Decision: `Required`.
- Selected execution mode: `Live API` through the project product AgentRun harness.
- Specific confidence gap or residual risk addressed: The refactor spans the provider request/stream/tool/result/compaction/continuation/memory spine; deterministic tests cannot prove real SDK/network/model behavior or the exact new raw-trace corpus.
- Why the selected mode can materially improve confidence: DeepSeek compaction flow invokes real read/read/write native tools across multiple turns, compaction, retained memory and continuation. OpenAI agent flow proves real no-tool request/stream/finalization. Extending the harness's corpus assertion proves the changed observable at the actual product run boundary.
- Expected confidence after the selected validation: At least 95% if repository and real scenarios pass with no critical gap. Actual final confidence: `97.3%`.
- Browser-specific decision and rationale: Browser validation is not required. No frontend, browser API, web contract, or renderer behavior changed; the raw trace behavior is more direct at FileMemoryStore/product AgentRun.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Round 2 Confidence And Broader Validation Decision

| Confidence Category | Current Score | Round 2 Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 90% | All runtime criteria retain direct proof, but critical AC-012 fails for the missing retained `ToolSchemaProvider` root export. |
| Changed-boundary execution directness | 90% | Focused source-root and compiled-dist probes directly reproduce the package-contract failure. |
| Cross-boundary integration realism and mock gap | 97% | Unchanged from round 1; real DeepSeek/OpenAI evidence remains valid. |
| Environment, configuration, identity, and fixture fidelity | 98% | Unchanged; this static package-contract correction needs no provider environment. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Unchanged runtime evidence; focused contract failure is deterministic. |
| User-surface, browser, and desktop-shell confidence | N/A | No applicable surface. |
| Durable regression coverage quality and relevance | 98% | TR-001 is corrected; the durable assertion now catches the missing root contract exactly. |

- Overall current confidence: `94.8%` (simple average of six applicable categories).
- Every critical acceptance criterion directly proven: `No — AC-012 currently fails`.
- Default 95% clean target met: `No`.
- Round 2 broader validation decision: `Not Required`. A real provider/API/E2E rerun cannot improve evidence for a static root export and was explicitly not requested; focused test, build and compiled package probe are the direct surfaces.
- Preliminary origin: bounded production package-index omission (`Local Fix`, likely implementation-owned), subject to `code_reviewer` failure-origin confirmation.

## Round 3 IR-002 Refresh Results And Confidence

| Order | Command / Execution | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Unchanged focused `legacy-tool-calling-public-surfaces-removed.test.ts` | Corrected AC-012 positive root identities and retained negative contraction matrix | Pass: 35/35 | `validation-logs/round3/root-contract-focused.log` |
| 2 | `pnpm -C autobyteus-ts build` | Production TypeScript/runtime dependency package build | Pass; `[verify:runtime-deps] OK` | `validation-logs/round3/core-build.log` |
| 3 | Compiled `dist/index.js` identity probe against canonical defining modules | Exact root identity for all five retained minimum contracts | Pass: five `PRESENT_EXACT_IDENTITY` results | `validation-logs/round3/compiled-root-contract-probe.log` |
| 4 | Diff integrity and IR-002 production delta check | No uncommitted source edit; reviewed source delta is exactly one insertion in one path | Pass | `validation-logs/round3/diff-integrity.log`, `source-state.log` |

| Confidence Category | Current Score | Round 3 Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-012 now passes directly; round 1 runtime criteria remain proven. |
| Changed-boundary execution directness | 98% | Source-root test, production build and compiled canonical-identity probe all pass against `IR-002`. |
| Cross-boundary integration realism and mock gap | 97% | Preserved round 1 real DeepSeek/OpenAI evidence; one-line export has no provider runtime path. |
| Environment, configuration, identity, and fixture fidelity | 98% | Managed-secret/live environment evidence is preserved and round 3 package checks are isolated. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Round 1 lifecycle evidence remains valid; prior static failure is rechecked and resolved. |
| User-surface, browser, and desktop-shell confidence | N/A | No applicable surface. |
| Durable regression coverage quality and relevance | 98% | Corrected durable test catches the defect on IR-001 and passes exact canonical identity on IR-002. |

- Overall current confidence: `97.5%` (simple average of six applicable categories).
- Prior failure resolution: `API-E2E-F-001` / AC-012 resolved.
- Every critical acceptance criterion directly proven: `Yes`.
- Default 95% clean target met: `Yes`.
- Round 3 broader validation decision: `Not Required`; the reviewed one-line export cannot affect the previously proven provider/tool-loop runtime, and the direct package surfaces pass.
- Required next step: proportional re-review of the corrected durable test before delivery.


## Round 4 Compaction Verification Results And Confidence

| Confidence Category | Current Score | Round 4 Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Exact ratio arithmetic, deterministic trigger/failure behavior, two real-model compaction lifecycles, and post-compaction continuation are direct. |
| Changed-boundary execution directness | 99% | Existing core compaction tests and the real AgentRuntime/AgentRun paths ran unchanged on integrated HEAD. |
| Cross-boundary integration realism and mock gap | 98% | Both actual LM Studio inference and managed DeepSeek network/provider execution crossed stream, tool, memory, compaction and continuation boundaries. Other live providers were not repeated. |
| Environment, configuration, identity, and fixture fidelity | 99% | LM Studio model readiness was verified; DeepSeek was READY through the audited encrypted-vault resolver populated from the explicitly authorized source. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Deterministic invalid-output fencing passed; the first managed run disclosed stochastic invalid JSON and the strict harness rejected it; unchanged rerun and LM Studio passed. |
| User-surface, browser, and desktop-shell confidence | N/A | No user/browser/shell behavior is part of this supplemental compaction proof. |
| Durable regression coverage quality and relevance | 98% | Existing exact-math, deterministic lifecycle and two live compaction scenarios cover the requested behavior without duplicate durable tests. |

- Overall current confidence: `98.2%` (simple average of six applicable categories).
- Every critical acceptance criterion directly proven: `Yes`.
- Default 95% clean target met: `Yes`; no applicable category is below 90%.
- Round 4 broader validation decision: `Required — Live API plus real local model; completed`.
- Residual risk: a managed compactor can occasionally return invalid JSON. The runtime exposes failure and the strict E2E rejects such a run; this was observed and retained. It does not alter the exact percentage calculation, and both a real local model run and unchanged managed-provider rerun completed correctly.


## Round 5 AC-016 Confidence

| Confidence Category | Final Score | Round 5 Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | AC-016's exact default, explicit override, typed timeout metadata, unsubscribe, termination, and no-real-wait constraints are all direct. |
| Changed-boundary execution directness | 99% | Prototype observation captures the exact duration received by the unchanged collector; current parent-triggered server compaction integration passes. |
| Cross-boundary integration realism and mock gap | 98% | The product parent/factory/runner path passes deterministically; prior real model compaction remains valid. A real five-minute stall is deliberately not executed. |
| Environment, configuration, identity, and fixture fidelity | 99% | No setting/identity change exists; ordinary factory omission and explicit constructor override are both exercised. |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Immediate simulated default/override failures retain typed metadata, exact cleanup and termination; actual short-timer failure and early collector settlement remain covered. |
| User-surface, browser, and desktop-shell confidence | N/A | No UI/browser/shell surface changed. |
| Durable regression coverage quality and relevance | 99% | Direct two-case AC-016 matrix plus corrected parent integration and broader compaction unit matrix are deterministic and bounded. |

- Overall final confidence: `98.8%` (simple average of six applicable categories, rounded to one decimal place).
- Every critical acceptance criterion directly proven: `Yes`.
- Applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Residual risks: a genuinely stalled child can now remain allocated three minutes longer before existing cleanup; live compactor invalid-JSON stochasticity from round 4 remains exposed and unrelated; no real test waits five minutes by explicit requirement.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper exists elsewhere, but this ticket changes only core TypeScript agent runtime.
- Relevant README or development instructions: Root/server READMEs identify browser development and real provider test runtime.
- Web-equivalent behavior: None changed.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach and why it fits the project: Core repository coverage plus built-server real AgentRun; actual desktop/browser would be indirect and lower value.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: None; no unknown process will be stopped or reused.
- Behavior not directly proven and confidence consequence: Unknown external TypeScript consumers remain release risk, not executable local product risk.

## Live Environment And Fixture Plan And Outcome

- Startup order and commands: verified temporary dependencies; audited secret dry-run; confirmed actual import; selected preflight; real OpenAI no-tool AgentRun; real DeepSeek native/compaction AgentRun.
- Environment: isolated `autobyteus-server-ts/db/test.db`; sanitized harness environment; worktree-resolved core; owned loopback server; source `.env` passed only to the audited importer.
- Readiness result: 9 secrets configured without values in output; DeepSeek and OpenAI scenarios both `READY`.
- Fixtures: harness-owned evidence files/workspace/memory/run ID and exact retained artifact.
- `LIVE-NOTOOL-001`: real OpenAI product AgentRun passed, 2/2.
- `LIVE-NATIVE-001`: first DeepSeek attempt was correctly rejected after the live compactor returned invalid JSON and produced a failed lifecycle phase; unchanged rerun passed, 2/2, with three successful tools, one completed compaction, exact artifact and context projection, paired ordered trace IDs, and zero continuation marker.
- Evidence: `secrets-import-dry-run.log`, `secrets-import-actual.log`, `real-preflight.log`, `real-openai-agent-flow.log`, `real-deepseek-compaction-agent-flow.log`, and `real-deepseek-compaction-agent-flow-rerun.log`.
- Cleanup: harness-owned processes/workspaces/runtime root and temporary dependency setup removed. Explicitly authorized encrypted test DB/key retained and gitignored for future authorized real tests.
- Round 4 supplemental outcome: real LM Studio 1/1 and managed DeepSeek unchanged rerun 2/2 passed with exact 5% threshold arithmetic and post-compaction continuation; first DeepSeek attempt invalid-JSON failure retained as provider stochasticity evidence. See `validation-logs/round4/`.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| CONTRACT-SCAN-001 | Static/compiled import and removed-path scan | Supported and removed current surfaces | Generated command evidence is sufficient; durable root contract test owns regression. |
| COMPACTION-PCT-AUDIT-001 | Value-safe arithmetic audit over emitted LM Studio and managed DeepSeek budget evidence | Threshold equals floor of configured ratio times effective input budget after output reserve and safety margin | Derived execution evidence is run-specific; durable `token-budget.test.ts` owns formula regression. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Every provider making a live native tool call | Cost/availability and model variance; deterministic fixture/renderers cover the matrix | Bounded provider-specific SDK variance | DeepSeek native tools/compaction and OpenAI no-tool ran live; other providers remain deterministic. |
| Unknown external package consumers | Cannot be enumerated from repository | Intentional breaking contract may affect consumers | Delivery documentation/release note; do not add alias. |
| Historical UI card disappearance | Historical cards intentionally remain under no-migration decision | None for new runtime; old data appearance persists | Document; do not rewrite/filter old data. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `API-E2E-F-001` / `CR-001` | Resolved Local Fix | `IR-002` one-line canonical export; round 3 focused 35/35, build, and compiled exact-identity probe pass | `code_reviewer` for proportional test-code re-review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — round 5 completed`.
- Repository-Resident Durable Coverage Added / Updated / Removed: round 5 updated 2 paths, added 0, removed 0. Historical cumulative delta remains recorded in `durable-coverage-diff.txt`.
- Current result/confidence: `API-REV-005 Pass / 98.8%`.
- Round 5 broader validation: `Not Required`; direct deterministic server timer/lifecycle evidence plus current parent-triggered integration/build is authoritative, and round 4 real compaction remains valid.
- Latest result: `Pass`; exact five-minute omitted default, override precedence, typed failure metadata, unsubscription, child termination, and no-real-wait contract are directly proven.
- Reroute Required: `No`.
- Required next recipient: `code_reviewer` for proportional review of the two changed durable test paths before delivery resumes.
- Notes: The initial parent-fallback failure was a stale integrated-base test API, not an IR-003 source failure; investigation was revised before the bounded fixture correction, and the rerun passed 12/12. Production source remained untouched by API/E2E.
