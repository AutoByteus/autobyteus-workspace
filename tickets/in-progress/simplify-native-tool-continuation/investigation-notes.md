# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Current-state investigation complete; requirements explicitly approved; design complete and pending architecture review
- Investigation Goal: Determine how much the surviving provider-native tool loop and tool-result continuation architecture can contract without losing supported lifecycle behavior.
- Scope Classification: `Medium`
- Scope Classification Rationale: The recommended refactor is limited to `autobyteus-ts` but crosses the outer turn loop, input/result processors, memory ingestion, continuation carrier, request assembly, stream construction, transient batch state, root exports, documentation, and durable coverage.
- Scope Summary: Fresh follow-up refactor ticket. Remove post-contraction coordination that no longer represents multiple behaviors; retain real native lifecycle boundaries. Do not reopen or expand `remove-xml-tool-calling`.
- Primary Questions Resolved:
  - Which continuation abstractions remain justified with one tool transport? Same-turn TOOL identity, lifecycle event, context carrier, provider renderers, and active batch remain; mode metadata/request-mode strings do not.
  - Who should own exactly-once ordered result ingestion? `AgentTurnRunner`, after all configured result processors complete, because it owns the batch lifecycle and is the only production `ToolResultPipeline` caller.
  - Is `tool_history_only` still needed? Its behavior is needed—do not append a user message—but the mode vocabulary is not. A nullable additional LLM user message expresses the real request shape.
  - Can stream setup contract? Yes. The native handler already implements the no-tool text lifecycle. One guarded concrete handler removes factory/base/pass-through selection while `LlmPhase` remains the request setup owner.
  - Which suspected abstractions are not legacy? `ToolContinuationReadyEvent`, `SenderType.TOOL`, custom processor pipelines, provider renderers, bounded stream delta state/file projectors, approval/external result paths, memory protocol safety, compaction, and recovery remain necessary.
  - Is the raw-trace `Native API tool continuation` item a required memory fact? No. It is an internal loop-transition marker written after the meaningful tool call/results, has no semantic production reader, and should stop being persisted. The runtime status event remains ephemeral.

## Request Context

The user asked whether the agent loop can feel more natural now that API tool calls flow directly and no runtime is aware of XML, JSON-text, sentinel-text, manifests, or a tool protocol selector. After the previous ticket was finalized on `origin/personal`, `code_reviewer` requested a separate follow-up ticket rather than reopening the completed removal. During requirements review, the user supplied a raw-trace screenshot showing a `tool_continuation` item whose content is `Native API tool continuation` and identified it as a possible original design problem.

The follow-up objective supplied candidate areas as questions, not prescriptions: continuation building, request modes, result-memory deferral, native continuation metadata, handler setup, and context-file carriers. It explicitly requires supported product paths to be traced before deletion and preserves provider-native schemas/invocations, approval/execution, active-batch identity, ordered exactly-once results, provider histories, context media, no-tool streams, and all mixed/failure lifecycles.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/in-progress/simplify-native-tool-continuation`
- Current Branch: `codex/simplify-native-tool-continuation`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation`
- Bootstrap Base Branch: refreshed `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-09; `origin/personal` resolved to `3cddeec6b93602da172fec2e7b9a80acc7c05117`.
- Task Branch: `codex/simplify-native-tool-continuation`, created directly from refreshed `origin/personal`.
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared `personal` checkout has unrelated untracked `.article-work/`; the dedicated worktree is clean and authoritative. The archived completed ticket is context only.
- Requirements Approval: Explicit user approval received 2026-08-09 after adding removal of the coordination-only raw-trace boundary. The user requires design-principles compliance and a use-case-to-data-flow-spine mapping.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/in-progress/simplify-native-tool-continuation/surviving-native-loop-responsibility-inventory.md` | Classifies each candidate layer as remove, contract, or retain | Production callers, current responsibility, public surface, candidate target posture, deletion and coverage surface | Requirements, investigation, later design | REQ-001–REQ-012; AC-001–AC-015 | Complete | `N/A` — evidence/context only | Keep aligned with approved design |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-09 | Command | `git fetch origin personal`; `git worktree add -b codex/simplify-native-tool-continuation /Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation origin/personal` | Establish an isolated fresh base | Worktree created at `3cddeec6b93602da172fec2e7b9a80acc7c05117` | No |
| 2026-08-09 | Doc | `tickets/done/remove-xml-tool-calling/{requirements.md,investigation-notes.md,design-spec.md,implementation-handoff.md,code-review-report.md,api-e2e-coverage-investigation.md,api-e2e-execution-coverage-report.md,handoff-summary.md}` | Understand delivered upstream behavior and validation | Confirms native-only transport is finalized; ordered continuation, no-tool, context carrier, and provider histories are supported and validated | No |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/loop/{agent-turn-runner.ts,llm-phase.ts,tool-phase.ts,tool-result-continuation-builder.ts}` | Trace primary and return spines | Runner owns the loop; builder mixes memory, identity, metadata, display, and carrier concerns | Design after approval |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/pipelines/{agent-input-pipeline.ts,tool-result-pipeline.ts}` | Trace extension processing and continuation request shape | TOOL continuations still run input processors; result pipeline has one production caller; mode string is propagated only to select append/no-append | Design after approval |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/{input-processor/memory-ingest-input-processor.ts,tool-execution-result-processor/memory-ingest-tool-result-processor.ts,factory/agent-factory.ts}` | Determine whether memory processors remain valid owners | Input processor remains a real general user-memory owner; result processor is auto-injected and defers all normal active results | Design after approval |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/message/{tool-continuation-metadata.ts,agent-input-user-message.ts,multimodal-message-builder.ts,tool-continuation-display-text.ts}` | Trace internal carrier and metadata | Metadata accepts one literal; SenderType and context-file presence already carry the real semantics | No |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts` | Compare request paths | `prepareRequest` and `prepareToolContinuationRequest` duplicate safety, compaction, recovery, rendering, and sanitation; only user append differs | Design after approval |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/streaming/handlers/{streaming-handler-factory.ts,streaming-response-handler.ts,pass-through-streaming-response-handler.ts,api-tool-call-streaming-response-handler.ts}` | Assess handler/factory ownership | Native handler already covers text/interruption/failure; abstract base has no shared behavior; factory has one caller | Design after approval |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/{agent-turn.ts,tool-invocation-batch.ts,loop/turn-tool-input-port.ts}` | Verify active-batch and external-result invariants | Active ID/order is required; settlement map/methods have no production call | Design after approval |
| 2026-08-09 | Code | `autobyteus-ts/src/memory/memory-manager.ts`, `raw-trace-ingestion.ts`, tool protocol safety/recovery/compaction paths | Verify exactly-once/persistence boundaries | Batch ingestion validates persisted call identity, deduplicates results, appends ordered canonical tool messages, and remains required before continuation | No |
| 2026-08-09 | Command | `rg -n "ToolResultContinuationBuilder|processToolContinuation|prepareToolContinuationRequest|tool_history_only|..." autobyteus-ts/src autobyteus-ts/tests` plus focused caller searches | Enumerate production/test consumers | Mode/metadata consumers are internal; result pipeline/continuation builder/factory each have one production caller; settlement methods are test-only | No |
| 2026-08-09 | Command | `git show 33f632054 -- <continuation/factory/result processor files>`; `git log -S...`; `git blame` | Separate post-removal residue from essential owners | Removal commit collapsed old unions/branches to one native value but intentionally left a follow-up opportunity; several constructs predate native-only state | No |
| 2026-08-09 | Doc | Current `autobyteus-ts/docs/{api_tool_call_streaming_design.md,turn_terminology.md,agent_runtime_loop_and_interrupt.md,lifecycle_event_sourced_engine_design.md}` | Compare documented contract | Docs explicitly preserve no synthetic user message, context carriers, custom pipelines, status events, and interruption invariants, but now overstate batch result collection and mode metadata | Delivery docs update |
| 2026-08-09 | Test | Focused Vitest probe listed in Runtime / Probe Findings | Validate current supported baseline | 8 files / 45 tests passed, including five provider renderers and media continuation | Re-run/update downstream |
| 2026-08-09 | User evidence | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c130df2562304840ad82547b9c67cee7/solution_designer_10159b3e88354918ae7a2ac37e89fd48/context_files/ctx_9bc14cd6ea5f__image.png` | Determine whether the displayed raw-trace continuation card represents required history | Screenshot shows `trace_type=tool_continuation` with content `Native API tool continuation`; user identifies it as strange coordination noise | Include removal in requirements/design |
| 2026-08-09 | Code/search | `MemoryIngestInputProcessor`, `MemoryManager.ingestToolContinuationBoundary`, and repository-wide `rg -n 'tool_continuation|ingestToolContinuationBoundary'` excluding tickets/dependencies/build output | Trace the screenshot item from writer to any consumers | Exactly one production writer path creates the record; no production semantic reader branches on `tool_continuation`. Generic raw-trace presentation exposes any stored record. Unit tests assert the writer but do not prove product need. | Remove writer/method and update stale coverage downstream |
| 2026-08-09 | Design authority/examples | `.codex/skills/solution-designer/design-principles.md` and `references/design-examples.md` (agent runtime loop and no-migration contraction examples) | Apply the user's explicit design-principles/data-flow-spine requirement | Design must be behavior-first, spine-complete, owner-led, clean-cut, and explicit about directly usable historical data | Reflected in `design-spec.md` and SR-001 |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Accepted external input starts a turn | `AgentEventInbox -> turn-start handler -> AgentTurnRunner -> AgentInputPipeline -> configured input processors -> MemoryIngestInputProcessor -> LlmPhase -> LLMRequestAssembler.prepareRequest` | One processed user/media message is stored and appended; internal TOOL input cannot start a new turn | Pipeline, inbox, runner, input processor source/tests |
| BEH-002 | System | Resolved turn has configured tools and provider emits native deltas | `LlmPhase -> StreamingResponseHandlerFactory -> ToolSchemaProvider + ApiToolCallStreamingResponseHandler -> provider -> normalized ChunkResponse -> handler -> ToolInvocation` | Provider schemas, IDs, names, final JSON arguments, native context, segments, and callbacks | Factory/handler/LlmPhase source; native tests |
| BEH-003 | System | Native invocations complete normally | `LlmPhase.startToolInvocationBatch -> ToolPhase -> ToolResultPipeline (MemoryIngest result processor defers) -> runner clears batch -> ToolResultContinuationBuilder.ingestToolResults` | Processed results reach raw/canonical memory once in call order before continuation | Runner, processor, builder, MemoryManager; live focused logs |
| BEH-004 | System | Completed batch has no context files | `Builder TOOL message + native_api metadata -> AgentInputPipeline tool_history_only -> ToolContinuationReadyEvent -> LlmPhase -> prepareToolContinuationRequest` | Existing canonical native history is rendered with no synthetic user message | Pipeline/runner/assembler; provider-native integration |
| BEH-005 | System | Completed batch includes supported context files | `Builder extracts/hydrates ContextFile -> input processors -> multimodal builder -> append_user_message -> prepareRequest -> media sanitizer -> provider renderer` | Exactly one semantic context/media carrier is appended; results remain native/canonical | Read-media integration, builder/pipeline/assembler |
| BEH-006 | System | Resolved turn has zero tools | `LlmPhase -> factory -> PassThroughStreamingResponseHandler -> provider stream` | No schemas/invocations; ordinary text and lifecycle events remain | Factory/pass-through source/tests |
| BEH-007 | Contract | Active approval or external result is posted | `AgentTurn.activeToolInvocationBatch + TurnToolInputPort + ToolPhase` | Only current batch/turn IDs are admitted; stale/no-waiter/duplicate/interrupted states are rejected | AgentTurn/ToolPhase/port source and tests |
| BEH-008 | System | Turn is interrupted or LLM/tool processing fails | `executionScope fences -> handler finalizeInterrupted/finalizeFailed -> runner interruption/recovery -> MemoryManager repair/recovery` | Active segments close, incomplete invocations do not execute/continue normally, completed facts survive exactly once, turn settles truthfully | Runner/LlmPhase/handler/recovery tests |
| BEH-009 | Contract | Package root/streaming/processor surface is imported | `src/index.ts -> streaming/handlers and processor indices` | Factory/base/pass-through/result-wrapper/memory-result-processor are currently importable despite no repo production consumer | Export indices and repository-wide search |
| BEH-010 | User/Operational | Internal TOOL continuation passes the input-memory processor | `ToolContinuationInputBuilder/current builder -> AgentInputPipeline -> MemoryIngestInputProcessor -> MemoryManager.ingestToolContinuationBoundary -> raw trace viewer` | Current code writes a `tool_continuation` coordination marker, including `Native API tool continuation`, after actual tool facts; no semantic production reader consumes it | User screenshot; input processor/MemoryManager source; repository-wide consumer search |

## Design Health Assessment Evidence

- Change posture: `Refactor` / `Cleanup`
- Candidate root cause classification: `Legacy Or Compatibility Pressure`, `Duplicated Policy Or Coordination`, `Boundary Or Ownership Issue`
- Refactor posture evidence summary: The native-only removal made the remaining behavior coherent, but several constructs still encode the former plurality. Refactor is warranted now because the redundancy crosses the primary/return spines and creates misleading ownership rather than remaining harmless local naming.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `tool-continuation-metadata.ts` | Mode type has one value; only one writer/two readers; metadata is ephemeral | A selector abstraction with one outcome is legacy pressure | Delete after approval |
| `AgentInputPipeline` -> `LlmPhase` | `llmRequestMode` string is passed through four layers only to decide whether to append a message | Data-shape fact is encoded as distributed policy | Replace with nullable additional message |
| `LLMRequestAssembler` | Two methods duplicate nearly every line and differ only by append | Empty API split increases branch/test surface | Merge while preserving timing |
| Result probe/source | Mandatory memory processor logs deferral for every normal result; builder later ingests batch | Competing owners require a permanent coordination exception | Runner becomes single core result-ingestion owner |
| `ToolInvocationBatch` search | Settlement methods are never called in production | Stale state from former aggregation architecture | Remove methods, retain identity |
| Handler source/tests | Native handler and pass-through both implement text/interruption/failure; factory has one caller | One transport no longer justifies hierarchy/selection | Use guarded one-handler setup |
| Input processor source and raw-trace screenshot | General user ingestion remains active for external input, but the internal TOOL branch writes a coordination-only `tool_continuation` item with no semantic reader | Not all input-memory structure is legacy, but continuation persistence is responsibility drift | Retain external user ingestion; make TOOL branch side-effect free after validation |
| Tool/result/interrupt paths | Approval, external results, compaction, recovery, context carriers remain reachable | Aggressive merge into one giant loop would damage ownership | Preserve named lifecycle owners |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `src/agent/loop/agent-turn-runner.ts` | Outer turn loop and phase sequencing | Sole caller of result pipeline/builder; already has memory access and abort fences | Own normal processed result-batch commit |
| `src/agent/loop/tool-result-continuation-builder.ts` | Memory commit plus carrier construction | Four responsibilities; only carrier/display extraction remains cohesive | Contract/rename to pure input builder |
| `src/agent/pipelines/agent-input-pipeline.ts` | Input validation, processors, LLM message build | Mode resolution redundant; custom processors are supported | Keep entrypoints, return nullable LLM message |
| `src/agent/input-processor/memory-ingest-input-processor.ts` | Processed external input plus internal continuation-boundary trace | External user ingestion is valid; TOOL continuation already has durable call/result facts and needs no extra trace | Retain external ingestion; TOOL branch validates/returns without memory mutation |
| `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` | Per-result memory or active-batch deferral | Normal path always defers; no other production pipeline caller | Delete and remove auto-injection/export |
| `src/agent/llm-request-assembler.ts` | Compaction/safety/recovery/sanitize/render request | Duplicate methods differ only by optional append | One method with optional message |
| `src/agent/loop/llm-phase.ts` | One provider request/stream lifecycle | Current sole factory consumer and stream kwargs owner | Directly construct sole handler and optional schemas; no new manager |
| `src/agent/streaming/handlers/streaming-handler-factory.ts` | Handler/schema pairing | Becomes empty indirection with one handler | Delete, consciously accept export contraction |
| `src/agent/streaming/handlers/pass-through-streaming-response-handler.ts` | No-tool text lifecycle | Duplicated by API handler basics | Delete after adding explicit disabled-tool guard |
| `src/agent/streaming/handlers/streaming-response-handler.ts` | Abstract type only | One implementation remains; no shared behavior | Delete |
| `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | Text/native tool/file stream state and invocations | Valid bounded local state, not legacy parsing FSM | Retain; add tool-enabled fact for no-tool safety |
| `src/agent/tool-invocation-batch.ts` | Active ID/order and unused settlement state | Identity needed, settlement unused | Contract, do not delete batch |
| `src/memory/memory-manager.ts` | Canonical call/result validation, raw traces, working context, and continuation-boundary writer | `ingestToolResults` is required; `ingestToolContinuationBoundary` has one writer caller and no semantic reader | Retain memory authority and batch ingestion; delete the boundary method |
| `src/agent/message/tool-continuation-metadata.ts` | Single-value ephemeral mode | No distinct outcome remains | Delete |
| Root/streaming/processor indices | Package exports | Expose obsolete layers | Remove obsolete exports without aliases |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-09 | Setup | Temporary symlink from task `autobyteus-ts/node_modules` to the installed main-checkout package dependency tree; symlink removed immediately after execution | Enabled isolated current-base tests without installing/changing dependencies | No durable environment change |
| 2026-08-09 | Test | `pnpm --dir autobyteus-ts exec vitest --run tests/unit/agent/loop/agent-turn-runner.test.ts tests/unit/agent/loop/tool-result-continuation-builder.test.ts tests/unit/agent/pipelines/agent-input-pipeline.test.ts tests/unit/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.test.ts tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts tests/unit/agent/streaming/handlers/pass-through-streaming-response-handler.test.ts tests/integration/agent/read-media-file-continuation-flow.test.ts tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Pass: 8 files / 45 tests. Five provider-native continuation cases and audio/video carrier passed. Logs show each normal tool result was deferred by the memory processor before final batch continuation. | Baseline is healthy; refactor must preserve these outcomes while removing the observable redundant deferral chain |
| 2026-08-09 | Static trace | `rg` searches for batch settlement methods | `settleResult`, `hasSettled`, `isComplete`, `getOrderedSettledResults`, and `getSettledInvocationIds` have no production caller | Safe candidate removal; durable unit coverage is stale relative to production use |
| 2026-08-09 | Static trace | Repository-wide non-test search for factory/result/metadata/processor symbols | Factory and builder have one production caller; mode consumers are internal; no cross-package production consumer of obsolete exported symbols | Clean internal contraction is feasible; external package consumers remain unenumerable |
| 2026-08-09 | User trace + static trace | Inspected supplied raw-trace screenshot, then searched production source for `tool_continuation` and `ingestToolContinuationBoundary` | The shown card maps to `MemoryIngestInputProcessor -> MemoryManager`; no production semantic reader consumes this trace type | Treat the marker as persistence of coordination, not product/audit history; stop future writes without rewriting old stores |

## External / Public Source Findings

- Public API / spec / issue / upstream source: No external web/upstream source was required. The task concerns internal architecture and current package contracts.
- Version / tag / commit / freshness: Local repository at refreshed `origin/personal` commit `3cddeec6b93602da172fec2e7b9a80acc7c05117`, 2026-08-09.
- Relevant contract, behavior, or constraint learned: Provider-specific native schemas/history must remain because current provider APIs differ. No inference is made that every external model supports native tools.
- Why it matters: The refactor removes internal selection/coordination, not provider adaptation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Focused deterministic Vitest tests only; no external service.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; temporary dependency symlink for the focused test probe.
- Cleanup notes for temporary investigation-only setup: Dependency symlink removed; `git status` contains only the new ticket artifacts.

## Findings From Code / Docs / Data / Logs

1. **The real primary spine is already one native loop.** `AgentTurnRunner` calls `LlmPhase`; the phase sends provider schemas and consumes normalized deltas; the native handler creates invocations; `ToolPhase` executes them; results return to the same runner.
2. **The remaining “mode” is not product state.** `tool_continuation_mode=native_api` is manufactured inside the loop, read twice, and never selected by a user/provider or persisted as canonical memory. Removing it loses no supported distinction.
3. **The no-append behavior is real.** Native tool results are already canonical messages. Appending semantic completion text for an ordinary continuation would duplicate a user turn. The target must retain no append, expressed as absence of an additional message rather than `tool_history_only`.
4. **Context files are a deliberate exception.** Provider-native tool result payloads do not themselves carry the bytes/media reference in the form expected by the next multimodal request. A semantic user/media carrier remains required when tool results include context files.
5. **The result memory processor is coordination residue.** The normal runner holds an active batch while processing every result, so the processor's core action is to decline ingestion. The later builder is the real batch writer. Moving the one write to the runner eliminates the branch and clarifies exactly-once timing.
6. **Custom processors still matter.** Input and result pipelines are supported extension points. The refactor must ingest memory only after final result transformations and must continue routing internal TOOL carriers through configured input processors.
7. **Batch identity and batch settlement are different.** Active IDs/order gate approvals/external results and remain necessary. The internal result map is unused because the current `ToolPhase` returns a complete ordered array directly to the runner.
8. **Pass-through is behavior, not necessarily a class.** The native handler already emits the same ordinary text start/content/end and interruption/failure payloads. A no-tools guard is required so unexpected native deltas remain ignored, after which separate handler selection has no remaining reason.
9. **The abstract/factory layers are not protecting multiple implementations after contraction.** With one concrete handler, direct setup in the provider-call phase is clearer and avoids a behavior-free result wrapper.
10. **Stream-local state remains justified.** Indexed native calls can arrive fragmented/interleaved; file content projection is incremental. This bounded state is not the removed XML parser FSM and is explicitly outside deletion.
11. **Assembler consolidation is timing-sensitive but straightforward.** Both current methods perform the same safety -> pending compaction -> recovery snapshot -> pre-render safety -> sanitation/render sequence. An optional append inside one method preserves the order.
12. **Current docs already identify the outcomes to preserve but use obsolete vocabulary.** Documentation must state “additional carrier present/absent” and “configured tools present/absent,” not “native mode” or “tool history mode.”
13. **The raw-trace continuation card is an original ownership problem, not a native API requirement.** `ToolContinuationReadyEvent` is useful transient loop/status coordination, but persisting `Native API tool continuation` adds no tool identity, result, provider context, media, or user intent beyond the adjacent `tool_call`/`tool_result` facts. No production reader uses the marker. The clean target deletes the persistence method instead of renaming the card or inventing another continuation trace.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Per-agent raw trace JSONL and working-context snapshots may include `tool_call`, `tool_result`, and `tool_continuation` traces. The supplied screenshot shows `tool_continuation` content `Native API tool continuation`; `source_event` is a free string such as `native_api_ordered_batch`. Volume is per-run and unbounded over time but archived through existing memory mechanisms.
- Relevant code-model, serialization, semantic, or physical-store change: No canonical message, tool payload, snapshot, or file schema change is proposed. New code stops producing one generic raw-trace type and removes ephemeral `AgentInputUserMessage.metadata.tool_continuation_mode`; existing generic raw-trace readers require no schema change.
- Normal readers and writers, including unknown/extra-field behavior: `RawTraceItem.fromDict` accepts arbitrary `trace_type`/`source_event` strings; tool lifecycle readers select `tool_call`/`tool_result` and ignore continuation mode metadata because it is absent from stored records.
- Representative direct-read or compatibility evidence: `MemoryManager` initializes `ToolTraceLifecycleState` from existing raw traces; current tool interaction builders filter by `tool_call`/`tool_result`, not source-event string. Existing working-context messages use version-current `ToolCallPayload`/`ToolResultPayload` unchanged.
- Required semantics and invariants preserved by direct use: `Yes` — call/result identity, order, provider context, media paths, and compaction provenance remain in unchanged canonical structures. Historical continuation markers add no required semantic state and remain inert.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Existing memory files must not be rewritten or deleted. No migration/maintenance window is justified.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No benefit; rewriting or deleting historical coordination markers would add I/O/corruption risk without runtime value. Stopping future writes provides the architectural/UI cleanup safely.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable; decision is direct use with no migration.

## Constraints / Dependencies / Compatibility Facts

- Provider-native API tool calls are the sole model-to-tool transport, but provider-specific schemas and rendered history remain different and necessary.
- `MemoryManager.ingestToolResults` validates that each result has a persisted call, enforces tool name identity, deduplicates, and appends canonical messages in input order.
- `ToolPhase` currently processes invocations sequentially and returns its array in invocation order.
- The external result path depends on active-batch ID admission and `TurnToolInputPort`; that batch cannot be removed wholesale.
- Internal TOOL input is runner-owned and rejected by the external inbox, so deriving no-append from TOOL plus carrier absence is product-safe.
- Context-file presence must be evaluated after configured input processors because processors may transform the carrier.
- `ToolContinuationReadyEvent` is a status/lifecycle signal, not a model protocol mode.
- Raw trace is durable memory/history; internal loop-transition events should remain ephemeral unless they carry independent user/system facts. `tool_continuation` does not.
- Unknown external package consumers of root/subpath exports cannot be enumerated locally. Clean removal should be release-noted rather than hidden behind aliases.
- Durable tests may be deleted/updated only after the API/E2E coverage investigation and must return through code review if repository-resident coverage changes.

## Open Unknowns / Risks

- External consumers may instantiate the obsolete public handler factory/base/pass-through or built-in memory result processor.
- The concrete handler needs a precise no-tools guard so provider anomalies cannot surface tool segments when no schema was sent.
- Custom processors can mutate IDs/results; runner-owned batch ingestion must use the final processed values and allow `MemoryManager` to enforce canonical identity.
- `LlmPhase` is already a substantial file; direct setup should replace factory calls with a few local lines, not absorb schema formatter or handler internals.
- Exact durable test removals/updates remain downstream-owned.
- Old raw-trace files may continue to show historical continuation cards because no data rewrite is in scope; this is an explicit no-migration tradeoff, not a remaining runtime writer.

## Notes For Architecture Reviewer

- Review the distinction between deleting mode vocabulary and preserving no-user-append behavior. The latter is a provider protocol invariant.
- Confirm `AgentTurnRunner` is the correct one-call batch-ingestion owner and that custom result processors finish first.
- Do not approve deletion of `ToolInvocationBatch` wholesale; active identity is required even though settlement state is dead.
- Confirm one-handler no-tool behavior explicitly ignores native tool deltas when tools are disabled.
- Confirm request consolidation preserves compaction/recovery order and context-media sanitation.
- Confirm the design removes `MemoryManager.ingestToolContinuationBoundary` and keeps `ToolContinuationReadyEvent` runtime-only; do not approve a renamed/replacement raw-trace marker.
- Reject a replacement `ContinuationManager`, setup manager, compatibility alias, or boolean “native mode.” Use current owners and structural data presence.
- Requirements were explicitly approved on 2026-08-09. Review the design against the user's explicit requirement that every approved use case map to one or more sufficient data-flow spines.
