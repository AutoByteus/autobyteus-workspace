# Requirements Doc

## Status

`Refined`

## Goal / Problem Statement

Simplify the surviving AutoByteus agent loop now that provider-native API tool calling is the only supported model-to-tool transport. Remove single-value “mode” vocabulary, non-semantic continuation trace markers, duplicate memory coordination, request-assembly duplication, unused batch settlement state, and handler-selection layers that no longer represent distinct behaviors. Preserve the supported native tool loop, context-file/media continuation, custom processor extension points, no-tool streaming, compaction/recovery, and all turn, approval, interruption, failure, and finalization invariants.

As a post-implementation requirement re-entry, prevent the server's compaction-agent completion wait from failing slow local-model or very-large-context runs after only two minutes. Raise that one production default to five minutes without changing explicit injected timeouts, cancellation/interruption behavior, child-run cleanup, or unrelated timeout policies.

This is a fresh follow-up refactor. It does not reopen or extend the finalized `remove-xml-tool-calling` ticket.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | External user, system, and inter-agent inputs start an `AgentTurn`, run configured input processors, enter memory, and produce the first LLM request. | Keep this established input path; remove continuation-mode knowledge and coordination-only TOOL trace persistence from shared input processing. | Input processor ordering/execution, turn validation, notifications, external user/media construction and memory ingestion, compaction, and provider request outcomes remain unchanged. | REQ-001, REQ-008, REQ-012; AC-001, AC-010, AC-015 |
| BEH-002 | `LlmPhase` asks `StreamingResponseHandlerFactory` to choose `ApiToolCallStreamingResponseHandler` when tools exist or `PassThroughStreamingResponseHandler` when none exist. The factory also builds provider-native schemas and returns them in `StreamingHandlerResult`. | Use one concrete native-capable stream handler for ordinary text and native tool deltas. `LlmPhase` builds schemas only when configured tools exist and enables tool-delta handling only in that case; the factory, data wrapper, abstract base, and duplicate pass-through implementation are removed. | Provider-native schema shapes, normalized invocation identity/arguments/context, text/file segment lifecycles, and no-tool absence of schemas/invocations remain unchanged. | REQ-002, REQ-003, REQ-009; AC-002, AC-003, AC-009, AC-012 |
| BEH-003 | Normal tool results run through configured processors. An auto-injected `MemoryIngestToolResultProcessor` sees the active batch and defers each result; after all results, `ToolResultContinuationBuilder` ingests the final batch into memory once. | Run all configured custom result processors, then let `AgentTurnRunner` ingest the final processed result array once as one ordered batch. Remove the built-in memory result processor and active-batch deferral branch. | Tool preparation, approval, execution, external-result admission, processed result values, provider call order, exactly-once memory records, terminal lifecycle events, and interruption recovery remain unchanged. | REQ-004, REQ-005, REQ-008; AC-004, AC-005, AC-008, AC-010 |
| BEH-004 | A text-only tool continuation is represented by `SenderType.TOOL` plus `tool_continuation_mode=native_api`; `AgentInputPipeline` converts that metadata into `llmRequestMode=tool_history_only`; `LlmPhase` selects a separate assembler method that does not append a user message. | Delete the continuation-mode metadata/constants and request-mode union/string. Represent the same fact structurally: the processed continuation has no additional LLM user message, so one assembler path renders current canonical history without appending one. | Same-turn validation, configured input processors, `ToolContinuationReadyEvent`, native assistant/tool-result history, pending compaction timing, request recovery, and absence of synthetic aggregate user text remain unchanged. | REQ-001, REQ-005, REQ-006, REQ-007; AC-001, AC-005, AC-006, AC-007 |
| BEH-005 | If tool results contain `ContextFile` values or supported serialized shapes, the continuation builder attaches them to an internal TOOL message. The input pipeline builds an LLM user/media carrier and request assembly appends it once. | Keep context-file extraction explicit. The presence of the processed carrier message—not a continuation mode—causes the single assembler path to append it once. | Semantic completion wording, context reference text, image/audio/video URLs, media sanitation, provider rendering, and exactly-once tool-result history remain unchanged. | REQ-006, REQ-007; AC-006, AC-007 |
| BEH-006 | No-tool turns use a separate pass-through handler, send no schemas, treat tool-like text as text, and preserve text/reasoning/media/token/interruption/failure/finalization events. | The single handler provides the same text lifecycle while native tool-delta processing is disabled for an empty tool list. No handler class selection remains. | All no-tool observable outputs and zero-invocation behavior remain unchanged. | REQ-002, REQ-003, REQ-008; AC-003, AC-008, AC-009 |
| BEH-007 | `ToolInvocationBatch` provides active invocation identity/order but also carries a result-settlement map and methods that production never calls. | Retain only batch identity/order and active-turn admission responsibilities; remove unused result-settlement state and APIs. | Approval/external result targeting, stale/duplicate rejection, per-turn batch identity, and LLM loop sequencing remain unchanged. | REQ-004; AC-004, AC-011 |
| BEH-008 | Interruption and failure fences can close mixed text/reasoning/tool segments, record completed facts, terminalize incomplete calls, restore or commit request snapshots, and recover the turn. | Preserve these paths exactly while changing only their setup/continuation inputs. | Mixed events, segment order, partial response retention, exactly-once facts, protocol repair, diagnostics, and turn outcomes remain unchanged. | REQ-008; AC-008, AC-010 |
| BEH-009 | Several now-redundant classes are exported from the `autobyteus-ts` root/streaming/processor indices even though repository production has no external consumer. | Remove obsolete exports and files without aliases or no-op wrappers; retain current native schemas, concrete stream handler, segments, custom processor bases/registries, and provider renderers. | Unrelated supported public APIs and provider contracts remain unchanged. | REQ-009, REQ-010; AC-012, AC-013 |
| BEH-010 | Every internal TOOL continuation passes through `MemoryIngestInputProcessor`, which writes a `tool_continuation` raw trace such as `Native API tool continuation`. This record repeats a loop transition after the meaningful `tool_call` and `tool_result` records; repository production has no semantic reader for it. | Stop persisting the internal continuation transition. Delete `MemoryManager.ingestToolContinuationBoundary`; the TOOL branch of `MemoryIngestInputProcessor` returns the processed message after existing validation without a memory write. Keep `ToolContinuationReadyEvent` as an ephemeral runtime lifecycle/status event only. | Actual `tool_call` and `tool_result` traces, canonical history, turn identity, context carriers, continuation execution, and all lifecycle/status behavior remain unchanged. Existing historical `tool_continuation` records remain readable but inert. | REQ-001, REQ-005, REQ-008, REQ-012; AC-001, AC-005, AC-006, AC-008, AC-015 |
| BEH-011 | Ordinary server construction creates `ServerCompactionAgentRunner` without `timeoutMs`, so the runner defaults to `120_000` ms and passes that value to `CompactionRunOutputCollector.waitForFinalOutput`; on timeout the run fails and is terminated in the runner's existing `finally` cleanup. Explicit tests/custom construction can inject a shorter timeout. | Change only the runner's ordinary/default completion timeout to exactly `300_000` ms. Keep `ServerCompactionAgentRunnerOptions.timeoutMs` as the explicit override; do not add an application setting/configuration surface in this bounded change. | Successful/failure output collection, canonical failure handling, timeout error/metadata, explicit injected timeouts, prompt cancellation/interruption behavior, subscription cleanup, and child-run termination remain unchanged. Unrelated 120-second test/process/server-start timeouts remain untouched. | REQ-008, REQ-013; AC-008, AC-016 |

## Investigation Findings

- The single-value continuation “mode” is mechanically inherited from the former native/text split. Its only writer and two readers are internal; no persisted reader or supported external trigger depends on it.
- `tool_history_only` is not a second transport, but its string travels across pipeline, runner, LLM phase, and assembler merely to represent that no additional user message exists. A nullable additional message expresses the same request shape without selection vocabulary.
- `MemoryIngestToolResultProcessor` is auto-injected, yet its normal production behavior is to defer every active native result. The runner is the only `ToolResultPipeline` caller, and the continuation builder later ingests the same final processed array. This is duplicated coordination, not two supported ingestion paths.
- `ToolResultContinuationBuilder` has real context-carrier/display responsibilities, but turn resolution and memory mutation belong to the runner that already owns the batch lifecycle.
- `ApiToolCallStreamingResponseHandler` already implements ordinary text, interruption, failure, and finalization behavior in addition to native tools. The separate pass-through handler duplicates the no-tool text lifecycle.
- The stream abstract base has no shared implementation, the factory has one caller, and `StreamingHandlerResult` is a behavior-free wrapper. With one handler, `LlmPhase` is the natural request-setup owner.
- Active `ToolInvocationBatch` identity remains necessary for turn-scoped approval/external results. Its result-settlement map is dead production code and must not be confused with that valid identity boundary.
- Current-base focused execution passed 8 test files / 45 tests, including five provider-native continuation renderers and the read-media context carrier.
- The user-visible `Native API tool continuation` card is written only by `MemoryIngestInputProcessor -> MemoryManager.ingestToolContinuationBoundary`. Repository production search found no semantic reader of `tool_continuation`; the generic raw-trace viewer merely exposes the stored record. The meaningful persisted facts are the existing `tool_call` and `tool_result` records.
- Integrated production source at `012257323d5b7303184ca7c5f385602c6a6914f3` gives the server compaction runner a `120_000` ms default, and ordinary backend construction does not override it. The collector uses that exact value for its final-output timer, and the runner terminates the visible compactor run during existing `finally` cleanup after timeout.
- A bounded `300_000` ms default is proportionate to the user request. The existing constructor option already supports explicit tests/custom factories; adding an `AppConfig`/environment setting would expand configuration, validation, documentation, and support behavior without an approved need for runtime/user selection.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/simplify-native-tool-continuation/surviving-native-loop-responsibility-inventory.md` | Evidence/context classification of each suspected layer | REQ-001 through REQ-012 | AC-001 through AC-015 | Complete / Approval `N/A` | Supports the removal/retention boundary; intended behavior remains in this requirements doc. |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor` / `Cleanup`
- Initial design issue signal: `Yes`
- Root cause classification: `Legacy Or Compatibility Pressure`, `Duplicated Policy Or Coordination`, and `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: Single-value mode metadata still drives four layers; a raw-trace marker persists an internal coordination transition with no semantic reader; a mandatory result processor exists mainly to defer to a later owner; duplicated request methods differ only by user-message append; duplicate streaming handlers and a one-caller factory survive despite one transport; unused batch settlement APIs have no production caller. The re-entry additionally exposes a local policy defect: the server compactor's otherwise valid runner/collector boundary uses a default too short for a reachable slow-model workload.
- Requirement or scope impact: Refactoring is in scope because the objective is architectural contraction. The change must not erase lifecycle identities that remain real: external versus same-turn input, tools configured versus absent, context carrier present versus absent, and active tool-batch identity. The timeout re-entry is a bounded behavior correction at the existing server compaction owner, not a reason to redesign the agent loop or introduce a configuration subsystem.

## Recommendations

1. Delete `tool-continuation-metadata.ts` and derive continuation request shape from whether the processed internal TOOL message has a context-file carrier.
2. Replace `llmRequestMode` with `llmUserMessage: LLMUserMessage | null`; merge `prepareToolContinuationRequest` into one request assembler method that optionally appends that message.
3. Make `AgentTurnRunner` ingest the final processed result batch once, then let a pure renamed continuation-input builder create semantic text and context carriers.
4. Remove `MemoryIngestToolResultProcessor` and its automatic registration/export; retain the customizable result pipeline itself.
5. Use the current API handler implementation as the sole concrete LLM stream owner, renamed naturally to `LlmStreamingResponseHandler`, with tool deltas disabled when no tools are configured. Delete the factory, result wrapper, abstract base, duplicate pass-through implementation, and old-name forwarding surface.
6. Retain `ToolInvocationBatch` for active identity/order but remove unused settlement state/methods.
7. Retain `MemoryIngestInputProcessor` for external user-memory ingestion, but make its internal TOOL branch side-effect free and delete `MemoryManager.ingestToolContinuationBoundary`; do not persist `ToolContinuationReadyEvent` or a replacement coordination marker.
8. Preserve `SenderType.TOOL`, the ephemeral `ToolContinuationReadyEvent`, provider renderers/schema formatters, stream-local native delta state, file projectors, and interruption/recovery boundaries because they still own supported behavior.
9. Replace the server compaction runner's `120_000` ms literal default with a named module-local `300_000` ms completion-timeout constant. Retain explicit `timeoutMs` injection and existing collector/cleanup flow; do not add an `AppConfig` or UI setting.

## Scope Classification

`Medium`

The main production contraction is localized to `autobyteus-ts` and changes the loop, request assembly, memory coordination, raw-trace emission, stream construction, root exports, documentation, and durable coverage. The re-entry adds one bounded `autobyteus-server-ts` compaction-runner default change and direct coverage. No web surface or persisted schema migration is expected.

## In-Scope Use Cases

- UC-001: An external user/system/inter-agent input produces a normal first provider request.
- UC-002: A provider emits one or multiple native tool calls, which execute and return ordered results exactly once before the next native provider request.
- UC-003: A tool requires approval or an externally posted result associated with the active invocation batch.
- UC-004: A completed tool batch has no context files, so continuation uses existing native history without an extra user message.
- UC-005: A completed tool batch contains image/audio/video or other context-file carriers, so one semantic user/media carrier is appended.
- UC-006: An agent has no tools and receives ordinary or former-tool-looking text, reasoning, media, completion, interruption, or failure output.
- UC-007: A tool/LLM phase is interrupted or fails at an awaited seam and memory/protocol recovery preserves completed facts without duplicate continuation.
- UC-008: Pending compaction executes before a same-turn continuation while preserving the native assistant tool-call/result suffix.
- UC-009: An external library consumer builds against the intentionally contracted current package surface.
- UC-010: A native tool batch continues to the model without adding a coordination-only `tool_continuation` item to raw trace/run history.
- UC-011: An ordinarily constructed server compaction agent needs more than two minutes but no more than five minutes to return final output, so it is allowed to complete instead of being prematurely timed out; explicit short test/custom timeouts still take effect.

## Out of Scope

- Reopening the finalized XML/JSON-text/sentinel removal or restoring textual tool calls.
- Changing provider SDK contracts, native schema shapes, normalized tool-call delta types, or provider-native history renderers.
- Removing the bounded indexed stream state or incremental write/edit file projectors required by chunked API responses.
- Parallelizing tool execution or redesigning approval/external-result transport.
- Removing custom input, result, invocation, response, lifecycle, or system-prompt processor extension points.
- Redesigning memory storage, working-context snapshots, compaction strategy, protocol repair, or request recovery beyond removing the unused continuation-boundary writer.
- Bulk rewriting, deleting, or hiding historical `tool_continuation` records already present in stored raw traces.
- Changing unrelated XML/JSON facilities, JSON Schema generation, queue sentinels, or lifecycle/tool log strings.
- Adding compatibility aliases, deprecated wrappers, or a new generic “continuation manager”/“stream setup manager.”
- Adding an application, environment, API, or UI setting for the server compaction-agent completion timeout.
- Changing unrelated 120-second E2E/process/server-start limits, provider-client timeouts, or general agent-idle/callback timeouts.

## Functional Requirements

- **REQ-001:** External-input and internal same-turn input validation and configured input processor execution must remain exactly once per leg; internal TOOL input must remain unable to start a new external turn.
- **REQ-002:** One concrete stream handler must own ordinary text plus provider-native tool/file delta lifecycles for both tool-equipped and no-tool turns.
- **REQ-003:** `LlmPhase` must send provider-native schemas only when the resolved tool list is non-empty and must prevent native tool deltas from creating segments/invocations when the turn has no configured tools.
- **REQ-004:** `ToolInvocationBatch` must continue to own active invocation identity/order used for approval/external-result admission, while production-unused result settlement state and APIs are removed.
- **REQ-005:** After every normal tool batch, `AgentTurnRunner` must ingest the final post-processor result array exactly once and in provider invocation order before building the continuation and starting the next LLM leg.
- **REQ-006:** Text-only tool continuation must append no synthetic user message; context-file continuation must append exactly one semantic user/media carrier with all supported extracted context files.
- **REQ-007:** Continuation mode constants, metadata keys, parsers, request-mode strings/unions, and duplicate request-assembler entrypoints must be removed; request assembly must use one path with an optional additional user message.
- **REQ-008:** Provider-native history/result rendering, compaction timing, media sanitation, request recovery, no-tool outputs, mixed stream events, approval/execution, interruption, failure, and finalization semantics must remain supported.
- **REQ-009:** The obsolete stream factory/result wrapper/abstract base/pass-through handler and built-in memory result processor files/exports must be removed without compatibility aliases or no-op replacements.
- **REQ-010:** The refactor must not remove or rename unrelated XML/JSON/schema/sentinel facilities and must retain supported custom processor bases/registries, `SegmentEvent`, the concrete native stream handler, `ToolSchemaProvider`, and provider renderers.
- **REQ-011:** Durable coverage and documentation must be updated downstream to describe data-shape/lifecycle distinctions rather than tool transport modes, following the team ownership workflow.
- **REQ-012:** New runs must not write a `tool_continuation` raw trace or replacement persistence marker for the internal same-turn transition. `MemoryManager.ingestToolContinuationBoundary` must be removed, while actual `tool_call`/`tool_result` persistence and the ephemeral `ToolContinuationReadyEvent` lifecycle remain intact.
- **REQ-013:** `ServerCompactionAgentRunner` must use exactly `300_000` ms as its completion timeout when `timeoutMs` is omitted. A supplied `ServerCompactionAgentRunnerOptions.timeoutMs` must continue to override the default, and no new production setting layer may be introduced.

## Acceptance Criteria

- **AC-001:** External inputs and same-turn TOOL continuations each run configured input processors once, use the same active turn, and TOOL input remains rejected by the external event inbox/new-turn entrypoint.
- **AC-002:** For configured tools, schemas reach the provider request; normalized indexed deltas produce the same invocation IDs, names, object arguments, turn ID, native context, mixed text/tool/file segments, and callbacks as before.
- **AC-003:** With no configured tools, no `tools` request field is sent; ordinary and former-tool-looking text remains text; unexpected native tool deltas produce no segments or invocations; reasoning/media/token/finalization behavior remains intact.
- **AC-004:** Approval and external-result scenarios accept only IDs in the active batch/turn and retain explicit stale, duplicate/late, interrupted, no-waiter, and unknown-invocation outcomes.
- **AC-005:** A two-call native batch whose result processors transform both results produces exactly two ordered `tool_result` raw traces and two ordered canonical tool messages, with one core `ingestToolResults` batch call and no per-result core memory processor/deferral.
- **AC-006:** A text-only completed batch emits `ToolContinuationReadyEvent`, preserves provider-native tool call/result history, and adds no aggregate or semantic `role:user` message to the next provider request.
- **AC-007:** A completed batch containing supported context-file values/serialized shapes appends exactly one semantic carrier whose context reference and image/audio/video data survive sanitation and provider rendering; tool results remain recorded once.
- **AC-008:** Interruption/failure tests preserve closure of active text/reasoning/tool segments, suppression of incomplete invocations/normal terminal side effects, completed-fact recording, pending-call repair, recovery snapshot behavior, and truthful turn outcomes.
- **AC-009:** Source and tests demonstrate that one concrete handler serves tool-equipped and no-tool streams; the factory, result wrapper, abstract base, and pass-through implementation have no production/public export remaining.
- **AC-010:** Pending compaction and request recovery behave identically for first requests, text-only continuations, and context-carrier continuations under the single assembler entrypoint.
- **AC-011:** Repository-wide production search finds no call to the removed `ToolInvocationBatch` settlement APIs, while active batch identity and LLM loop batch sequencing remain covered.
- **AC-012:** `autobyteus-ts` builds/typechecks and the contracted root surface exports supported native stream/schema/segment and custom processor contracts while removed symbols fail cleanly rather than resolving through aliases.
- **AC-013:** Repository-wide source review confirms unrelated XML context files, provider JSON Schema formatting, ordinary JSON parsing, queue sentinel objects, provider renderers, and custom processor registries remain present and functional.
- **AC-014:** The API/E2E coverage investigation classifies factory/pass-through/memory-processor/mode tests as stale or updateable and retains/expands provider-native continuation, media carrier, no-tool, compaction, recovery, approval/external result, and interruption evidence.
- **AC-015:** After a native tool batch, raw trace/run history contains the same ordered `tool_call` and `tool_result` facts but no newly written `tool_continuation` record or `Native API tool continuation` card; the next LLM leg and its ephemeral lifecycle/status transition still occur exactly once.
- **AC-016:** Direct deterministic coverage proves that an ordinary/default runner passes `300_000` ms to `CompactionRunOutputCollector.waitForFinalOutput`, an explicitly injected short timeout is still honored, and timeout failure still reaches the existing error metadata and child-run termination path. The proof must not sleep for five real minutes.

## Constraints / Dependencies

- Original refactor base: refreshed `origin/personal` commit `3cddeec6b93602da172fec2e7b9a80acc7c05117`. Authoritative re-entry source state: delivery-integrated ticket HEAD `012257323d5b7303184ca7c5f385602c6a6914f3`.
- Completed `remove-xml-tool-calling` artifacts are upstream context only; the current source and this ticket are authoritative.
- `MemoryManager.ingestToolResults` enforces provider call/result identity and idempotency; the new direct runner call must preserve its batch validation.
- Tool execution is currently sequential, so `ToolPhase` returns results in invocation order. The design must not assume parallel execution was requested.
- Configured custom tool-result processors must complete before core memory ingestion, including processors ordered later than the old built-in processor.
- Context-file carriers are the only supported reason a tool continuation appends a new user-shaped message.
- The internal continuation boundary is runtime coordination, not a durable memory fact; its status event must not be replaced with another raw-trace record.
- Public exported symbol removal is intentional but may affect unknown external consumers; release documentation must identify it.
- Durable repository test edits belong to `api_e2e_engineer` after initial implementation code review.
- `ServerCompactionAgentRunner` already owns the completion timeout and exposes an injected `timeoutMs` option; ordinary production construction omits it. The bounded default change must stay in this owner and must not alter `CompactionRunOutputCollector`'s terminal/failure semantics.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing raw trace JSONL, working-context snapshots, tool call/result payloads, compaction lineage, and run history. Existing traces may include `source_event: "native_api_ordered_batch"` or historical `trace_type: "tool_continuation"` records.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing memory and history records as-is. The removed continuation mode metadata is ephemeral and is not stored. Existing historical tool-continuation trace records remain structurally readable but semantically inert; new runtime code stops producing them. No bulk rewrite is required.
- Unacceptable data loss or corruption: Any loss/reordering/duplication of user messages, assistant tool calls, tool results, provider context, media paths, compaction state, recovery boundaries, or meaningful raw-trace provenance. Omitting a new coordination-only `tool_continuation` marker is intentional, not data loss.
- Relevant availability, maintenance-window, or rollout constraints: No rewrite, maintenance window, dual reader, or migration step. New runtime code reads current canonical records directly.
- Related requirement and acceptance-criteria IDs: REQ-005 through REQ-008, REQ-012; AC-005 through AC-008, AC-010, AC-015.

## Assumptions

- Provider-native API tool calling remains the sole supported invocation transport.
- Internal `AgentInputPipeline`, `LLMRequestAssembler`, and continuation builder classes are not promised public contracts even when their files are importable.
- Root-exported obsolete handler/processor symbols may be removed cleanly if the user approves this requirements basis.
- No downstream consumer relies semantically on the exact diagnostic string `native_api_ordered_batch`; existing stored values remain readable.
- One native-capable stream handler with tool processing disabled for an empty tool set can preserve the current pass-through observable contract.
- Five minutes is the approved minimum/default for ordinary server compactor completion. Per-user/per-model runtime selection is not required in this change.

## Risks / Open Questions

- Unknown external consumers may import the removed root/subpath handler or built-in memory processor symbols.
- Consolidating no-tool handling must explicitly ignore native tool deltas when schemas/tools are absent; simply instantiating the native handler without that guard would change segment behavior.
- Request consolidation must preserve the exact pre-compaction, recovery-snapshot, append, pre-render, sanitation, and rollback order for all three request shapes.
- Moving core result ingestion into the runner makes ownership clearer but requires interruption fences to avoid publishing normal continuation after an accepted interrupt.
- Existing documentation currently describes `tool_history_only` and `native_api` metadata as intentional; it must be rewritten rather than left stale.
- Historical raw traces can still display old `tool_continuation` cards because this refactor intentionally avoids rewriting stored files; only new writes disappear.
- A stalled server compactor will now occupy its child-run resources for up to three additional minutes before the same timeout cleanup runs. This is the intentional tradeoff for avoiding premature failure; explicit cancellation/interruption and terminal failure still settle earlier through existing paths.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-004, UC-005 |
| REQ-002 | UC-001, UC-002, UC-006 |
| REQ-003 | UC-002, UC-006 |
| REQ-004 | UC-002, UC-003 |
| REQ-005 | UC-002, UC-004, UC-005, UC-007 |
| REQ-006 | UC-004, UC-005 |
| REQ-007 | UC-001, UC-004, UC-005, UC-008 |
| REQ-008 | UC-001 through UC-008 |
| REQ-009 | UC-006, UC-009 |
| REQ-010 | UC-001 through UC-009 |
| REQ-011 | UC-001 through UC-010 |
| REQ-012 | UC-002, UC-004, UC-005, UC-007, UC-010 |
| REQ-013 | UC-011 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion ID | Scenario Intent |
| --- | --- |
| AC-001 | Entry-path and custom-input-processor preservation with strict same-turn TOOL identity. |
| AC-002 | Positive configured-tool native schema, stream, invocation, and callback fidelity. |
| AC-003 | No-tool unified-handler regression and unexpected-delta safety. |
| AC-004 | Approval/external-result active-batch admission and rejection matrix. |
| AC-005 | Ordered exactly-once final post-processor result-batch ingestion. |
| AC-006 | Text-only provider-native continuation with no appended user message. |
| AC-007 | Context-file/media carrier continuation with exactly one appended message. |
| AC-008 | Mixed-stream, interruption, failure, and recovery invariants. |
| AC-009 | Static/runtime proof of one handler and obsolete stream-layer removal. |
| AC-010 | Single assembler path across compaction and recovery request shapes. |
| AC-011 | Active-batch contraction without loss of identity/sequence behavior. |
| AC-012 | Build and supported public-surface contraction. |
| AC-013 | Protection against unrelated XML/JSON/sentinel/schema deletion. |
| AC-014 | Downstream durable coverage classification and execution intent. |
| AC-015 | Removal of coordination-only continuation persistence without changing the actual next LLM leg. |
| AC-016 | Five-minute server compaction-agent default and explicit-override/cleanup contract without a real-duration test. |

## Approval Status

The original refactor basis was explicitly approved by the user on 2026-08-09. Approval covers the clean removal of single-value continuation modes and the coordination-only raw-trace boundary, direct runner-owned batch ingestion, one optional-message request path, one concrete stream handler, contraction of unused batch state, and deletion of obsolete root exports without compatibility wrappers. Existing historical `tool_continuation` records remain untouched while new runs stop writing them. The user additionally requires the design to follow the shared design principles and map every approved use case to an explicit data-flow spine so architectural improvement does not weaken preserved behavior.

Requirement re-entry approved/requested by the user and conveyed through `api_e2e_engineer` on 2026-08-11: increase the ordinary server compaction-agent completion timeout from two minutes to at least five minutes for slow local models and very large contexts while preserving cancellation and explicit test timeouts. The selected requirements interpretation is the bounded option: exactly `300_000` ms by default with the existing injected override, not a new configurable production setting.
