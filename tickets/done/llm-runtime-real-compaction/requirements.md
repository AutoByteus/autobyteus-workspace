# Requirements Doc

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Complete compaction as a real production capability in the TS runtime. Today the runtime has the compaction trigger path, storage model, and snapshot rebuild scaffolding, but the current implementation still uses the wrong protection boundary for long-running tool-heavy turns: compaction eligibility is based on whole historical turns while preserving a fixed last-4-turn raw tail. In this runtime, one user-triggered turn can last for hours and contain many assistant legs, tool-call batches, and tool-result batches, so the largest prompt growth can occur inside a single active turn. The follow-up must therefore revise compaction from whole-turn/tail-count behavior to a long-turn-safe strategy that can compact settled earlier interaction blocks inside the same still-active turn, preserve only the unresolved active frontier raw, keep the main system prompt unchanged, and avoid falsely reporting successful skipped compaction when no eligible window exists.

The user also wants compaction to remain post-response (not mid-stream abort), to default to an 80% threshold, to have a dedicated way to choose which model performs compaction, and to support a runtime context-capacity override because LM Studio can fail before the theoretical max context is reached. The previously added local-provider timeout hardening for LM Studio/Ollama remains part of the overall ticket scope.

Live compaction inspection on 2026-04-12 also showed a second problem: the subsystem now compresses history mechanically, but the resulting memory quality is too flat. One real run compacted 23 settled blocks successfully, archived 92 raw traces, and rebuilt the snapshot correctly, yet the persisted semantic memory still mixed high-value items (critical validation bugs, unresolved work, user preference) with lower-value transient operational facts. The current model-generated `confidence` field is stored but not used anywhere in retrieval or snapshot rendering, so it adds output noise without improving decisions. The next revision must therefore improve compaction quality by introducing typed memory categories, removing unused model-confidence output, deterministically filtering low-value noise, and prioritizing the rebuilt snapshot around critical/actionable memory rather than a flat fact list. Because real persisted `semantic.jsonl` files from earlier runs already exist on disk, the refinement must also define an explicit current-schema-only reset path so old flat semantic memory is rejected on schema mismatch, removed from active persisted state, and never silently survives as untyped noise after the typed redesign lands.

## Investigation Findings

- `autobyteus-ts` currently has the compaction request flag, compaction window selection, episodic/semantic memory storage, archive/prune support, and working-context snapshot rebuild flow.
- The current `Summarizer` in `autobyteus-ts/src/memory/compaction/summarizer.ts` is only an abstract contract. The only concrete summarizers found are deterministic test doubles under `tests/`.
- Default `AgentFactory` composition creates a `MemoryManager` without wiring a production `Compactor`/`Summarizer`, so normal runtime creation still lacks real compaction behavior.
- The current default compaction trigger is 80% (`triggerRatio = 0.8`), not 10%.
- The current runtime has no dedicated compaction lifecycle logs and no dedicated frontend-visible compaction started/finished status event.
- `ServerSettingsService` already supports editable predefined settings, persists them through `AppConfig.set(...)`, and updates `process.env`, which makes live server-setting driven compaction controls feasible.
- The current server run-config path (`AgentRunConfig.llmConfig -> new LLMConfig({ extraParams: llmConfig })`) is not a good home for new typed compaction controls, so global/server settings are the cleanest first implementation path.
- `LLMFactory.createLLM(...)` and `BaseLLM.sendMessages(...)` already provide the primitives needed for one internal LLM-backed summarizer call owned by the compaction subsystem.
- The existing TS -> server -> web streaming/event pipeline can carry simple compaction lifecycle events without inventing a parallel transport.
- `LMStudioLLM` currently inherits `OpenAICompatibleLLM`, which creates the OpenAI Node client with default transport settings; no provider-specific timeout override is applied today.
- `OllamaLLM` currently creates `new Ollama({ host })` with the library default fetch; no provider-specific long-idle timeout override is applied today.
- Official Undici documentation says `bodyTimeout` and `headersTimeout` both default to 300 seconds and `0` disables them; this aligns with the observed ~5 minute disconnect pattern during long local prompt-processing windows.
- The installed OpenAI Node client source shows a separate SDK request timeout default of 10 minutes, but its implementation uses `setTimeout(abort, ms)`, so `timeout: 0` would abort immediately rather than disable the timer.
- Runtime log analysis on 2026-04-11 showed repeated `compaction_requested` events followed by `compaction_execution_context.selected_turn_count: 0` and `compaction_completed { skipped: true }`, after which the same agents still failed with `Context size has been exceeded`.
- The current compactor selects eligibility by distinct historical `turnId` and excludes the last `rawTailTurns` turns (default 4). Because tool continuations remain on the same active `turnId`, a single long-running turn can accumulate the majority of prompt data while remaining entirely protected from compaction.
- `MemoryIngestInputProcessor` currently skips `SenderType.TOOL` input to avoid duplicating tool results, which means same-turn continuation cycles do not create any new raw-trace boundary today.
- The current rebuilt prompt keeps the main system prompt as a dedicated system message and then injects compacted episodic memory, semantic memory, and recent raw traces into a synthetic memory payload message. This means the system prompt is already structurally separate from compacted history and should remain unchanged in the revised design.
- `WorkingContextSnapshotBootstrapper` currently rebuilds snapshot state without any persisted active-turn/frontier metadata; when schema rebuild happens, the revised design must therefore use an explicit conservative fallback rule instead of assuming frontier state can be inferred implicitly.
- The current prune/archive seam is still turn-based in `src/memory/store/base-store.ts` and `src/memory/store/file-store.ts`, so the revised design must explicitly move persistence pruning to raw-trace IDs rather than leaving that change implicit.
- Live compaction inspection on 2026-04-12 proved the new execution path works mechanically: one run compacted 23 blocks, archived 92 raw traces, kept 5 frontier traces, persisted one episodic summary plus 12 semantic facts, and rebuilt a new working-context snapshot.
- That same live result exposed the next quality gap: the episodic summary was broadly useful, but semantic memory still stored a flat mixture of durable facts, unresolved work, and low-value transient observations.
- `CompactionPromptBuilder` currently asks for one `episodic_summary` plus a generic `semantic_facts` array with `tags` and `confidence`, which encourages a mixed bag of facts rather than prioritized actionable memory.
- `CompactionResponseParser` currently parses and clamps `confidence`, but retrieval and snapshot rendering never use it, so model-generated confidence currently adds payload noise with no runtime value.
- `Retriever` currently returns semantic items by recency and `CompactionSnapshotBuilder` renders them as one flat `[MEMORY:SEMANTIC]` list, so critical issues and unresolved work are not structurally prioritized over lower-value facts in the rebuilt prompt.
- Real persisted semantic memory is append-only at the store layer, so old flat `semantic.jsonl` entries from successful pre-refinement compactions will remain on disk unless the redesign explicitly rejects and clears them on schema mismatch.

## Recommendations

- Implement compaction as one internal LLM summarization call governed by runtime code, not as a second user-visible/public agent.
- Keep the compaction trigger post-response and execute compaction before the next LLM leg, including tool-continuation legs.
- Change compaction eligibility from whole-turn windows to settled interaction blocks so earlier completed assistant/tool/result segments from the same still-active long turn can be compacted.
- Preserve only the active unresolved frontier raw rather than a fixed `last 4 turns` tail.
- Treat `compaction required but no eligible block exists` as an unsafe blocked condition, not a successful skipped compaction outcome.
- Lock one deterministic block/frontier contract for raw traces, including a conservative bootstrap/schema-rebuild fallback when no active turn is known.
- Create one lightweight persisted continuation-boundary trace for TOOL-origin same-turn continuation input so a long-running turn with multiple tool cycles can actually split into multiple compactable settled blocks without duplicating full tool-result payloads.
- Keep the main-agent system prompt unchanged across compaction rebuilds.
- Add a dedicated typed compaction settings UI (for example a `Compaction Config` section/card) backed by server settings for compaction ratio, optional effective-context override, optional compaction model override, and an optional detailed-compaction-logs toggle.
- Keep the compaction prompt built-in/internal for this ticket; do not require prompt-edit UI for the first production implementation.
- Replace the flat `semantic_facts` output contract with typed memory categories that distinguish at least critical issues, unresolved work, durable facts, user preferences, and important artifacts/files.
- Remove model-generated `confidence` from the compaction output contract because it is not currently used by retrieval or snapshot rendering and therefore adds noise without value.
- Add a deterministic post-parse quality stage that deduplicates entries, caps category counts, drops known low-value transient operational observations, and assigns internal priority/salience from category rather than from model self-confidence.
- Rebuild compacted memory in priority order so critical issues and unresolved work appear before lower-priority durable facts or artifact references in the next prompt.
- Keep one internal LLM summarization call as the default production path; optional repair/refinement passes may remain future extension points behind the summarizer boundary but are not required for the current ticket.
- Add an explicit persisted-semantic-memory schema gate and current-schema-only reset path: when old flat semantic memory is detected on disk, the runtime shall reject that persisted semantic data, invalidate the snapshot cache, rebuild from current canonical sources if available, and otherwise start clean instead of attempting legacy migration heuristics.
- Make compaction failure observable and non-destructive: no raw-trace prune on failure, no silent corruption, and clear failure events/logs.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: A normal agent run exceeds the compaction threshold after an LLM leg, requests compaction, performs real summarization before the next LLM leg, and continues with a compacted working context.
- UC-002: A tool-calling LLM leg exceeds the compaction threshold; tool execution still proceeds, and compaction happens before the next LLM continuation request rather than interrupting the already-issued tool call.
- UC-003: An operator changes the compaction threshold from server settings and the new percentage takes effect for subsequent runtime budget checks without restarting the app.
- UC-004: An operator sees simple frontend compaction lifecycle status while an agent run is active and uses logs for the detailed token/context numbers.
- UC-005: An operator applies a smaller effective-context override during LM Studio/debug validation so runtime budgeting and logs reflect a safer lower context ceiling.
- UC-006: An operator configures a dedicated compaction model; the runtime uses that model for the internal summarizer instead of silently reusing the main run model.
- UC-007: Compaction fails (model error / parse failure / validation failure) and the failure is visible, non-destructive, and recoverable.
- UC-008: A long-running LM Studio or Ollama request spends more than five minutes in prompt processing / delayed first-token generation without the client disconnecting due to the default transport idle timeout.
- UC-009: A single very long tool-heavy turn crosses the compaction threshold multiple times; the runtime compacts earlier settled interaction blocks from that same turn and continues without treating the whole still-active turn as permanently protected raw tail.
- UC-010: When compaction is required but the runtime cannot find any eligible block to compact, it surfaces an explicit unsafe/blocked compaction outcome instead of reporting `completed/skipped` and continuing into a provider context-limit failure.
- UC-011: When a working-context snapshot must be rebuilt without an active-turn runtime contract (for example after schema invalidation or restart), the runtime applies a conservative frontier fallback instead of over-compacting the latest block.
- UC-012: During one long-running turn with multiple tool continuation cycles, each continuation cycle creates a lightweight planner boundary so earlier same-turn cycles can become settled blocks without duplicating full tool-result content.
- UC-013: After a successful compaction, the rebuilt memory distinguishes critical issues, unresolved work, durable facts, user preferences, and important artifacts instead of storing one flat mixed fact list.
- UC-014: Low-value transient operational observations are filtered or deprioritized so the rebuilt compacted memory emphasizes what the agent must remember and do next.
- UC-015: When an agent is restored with pre-existing flat `semantic.jsonl` data from before the typed redesign, startup rejects the stale semantic store and snapshot cache, rebuilds from current canonical sources if available, and otherwise starts clean without any legacy semantic migration path.

## Out of Scope

- Mid-stream abort/retry compaction or background threshold polling while an LLM stream is still producing output.
- A separate public/user-visible “compaction agent” with its own conversation or tool loop.
- A prompt-editing UI or free-form compaction prompt authoring surface.
- A live frontend dashboard of detailed context-budget numbers; this ticket will keep those details in logs instead.
- LM Studio native REST `/api/v1/chat` support or provider-specific reasoning-control changes for Qwen3.5-style reasoning models on the current OpenAI-compatible `/v1/chat/completions` path.
- A new user-facing timeout setting surface for provider transports; this ticket only hardens LM Studio and Ollama defaults internally.
- Making a multi-pass compaction/refinement pipeline the default production behavior; this ticket keeps one-pass summarization as the default and only preserves the boundary for future optional repair/refinement.
- A larger memory-system redesign beyond the real summarizer, runtime wiring, observability, and settings/debug controls needed for production compaction.

## Functional Requirements

- FR-001 `real_compaction_summarizer`: The runtime shall implement a concrete production summarizer that performs compaction through one internal LLM request and returns structured episodic memory plus typed compacted-memory categories rather than one flat fact list.
- FR-002 `compaction_runtime_wiring`: Normal `AgentFactory` runtime composition shall wire the compaction path by default so production-created agents can request and execute compaction without test-only injection.
- FR-003 `post_response_trigger_timing`: Compaction shall continue to be triggered from post-response usage and shall execute before the next LLM leg, not during an in-flight stream.
- FR-004 `tool_continuation_safety`: If a threshold-crossing LLM leg also emits tool calls, the runtime shall allow those tool calls to proceed and shall apply compaction only before the next LLM continuation request.
- FR-005 `compaction_storage_and_snapshot_reset`: Successful compaction shall store episodic and semantic memory items, archive/prune the compacted raw traces, rebuild the working-context snapshot from system prompt + retrieved compacted memory + raw tail, and continue the active run with the rebuilt snapshot.
- FR-006 `compaction_failure_safety`: If the summarizer request fails or returns invalid output, the runtime shall emit failure observability, shall not prune the targeted raw traces, shall surface a recoverable error outcome for the active turn, and shall keep compaction pending as a safety gate so later dispatches cannot bypass the required compaction work.
- FR-007 `compaction_lifecycle_observability`: The runtime shall emit dedicated lifecycle logs and stream events for at least `compaction_requested`, `compaction_started`, `compaction_completed`, and `compaction_failed`.
- FR-008 `frontend_compaction_visibility`: The frontend shall surface simple compaction lifecycle status from events so users can tell when memory compaction is happening instead of seeing an unexplained pause.
- FR-009 `detailed_compaction_logs`: The runtime shall support detailed compaction/context-budget logging, including the effective context ceiling, input budget, output reserve, safety margin, trigger ratio, trigger token threshold, latest prompt-token usage, whether compaction is currently required, and whether an override is active.
- FR-010 `detailed_log_toggle`: The typed compaction settings UI shall expose a toggle that enables or disables the detailed compaction logs without removing the basic lifecycle logs.
- FR-011 `default_ratio_setting`: The compaction trigger shall default to 0.8 (80%) and shall be overrideable through a server setting/environment variable.
- FR-012 `live_ratio_update`: Updating the compaction-ratio server setting shall affect subsequent budget/threshold resolution for active and future runs without requiring a server restart.
- FR-013 `debug_context_override`: The runtime shall support an optional lower effective-context override sourced from server settings/environment so operators can force safer budgeting than the discovered model metadata reports.
- FR-014 `compaction_model_selection`: The runtime shall support an optional dedicated compaction model identifier sourced from configuration; if unset, compaction shall fall back to the active run model.
- FR-015 `compaction_prompt_ownership`: The compaction prompt shall be owned internally by the runtime as a built-in template for this ticket rather than a user-editable prompt surface.
- FR-016 `settings_surface`: The required operator controls for this ticket shall be exposed through a dedicated typed settings surface in the app (for example a `Compaction Config` section/card) instead of requiring users to manually type raw key/value pairs. The typed controls shall persist through the existing server-settings/env-backed infrastructure underneath.
- FR-017 `deterministic_validation_support`: The implementation shall preserve a deterministic way to force compaction in automated runtime tests, including a path that can lower the effective active context during validation.
- FR-018 `local_provider_timeout_hardening`: The LM Studio and Ollama runtime clients shall disable the default long-idle transport body/header timeouts used by the local HTTP stack so long prompt-processing or delayed first-token local runs do not disconnect after roughly five minutes.
- FR-019 `lmstudio_sdk_timeout_policy`: The LM Studio OpenAI-compatible client shall also use a high finite SDK request timeout instead of the 10-minute default because the installed OpenAI Node SDK does not provide a documented true-disable path and `timeout: 0` would abort immediately.
- FR-020 `block_based_compaction_unit`: The runtime shall determine compaction eligibility using settled interaction blocks / raw-trace segments rather than only completed whole-turn windows.
- FR-021 `same_turn_compaction_support`: Earlier settled interaction blocks from the same still-active long turn shall be eligible for compaction once they are no longer needed as the unresolved execution frontier.
- FR-022 `active_frontier_preservation`: The runtime shall preserve only the minimum unresolved active frontier raw for correctness and shall not rely on a fixed `last N turns` raw-tail rule as the primary protection mechanism.
- FR-023 `unsafe_skip_protection`: If compaction is required but no eligible block can be compacted under the current boundary, the runtime shall surface an explicit blocked/failure outcome instead of emitting `completed`/`skipped` success and continuing normally.
- FR-024 `tool_result_digestibility`: Historical large tool results shall become compactable/digestible so that old raw tool payloads do not remain protected indefinitely simply because they belong to the current or recent long-running turn.
- FR-025 `system_prompt_preservation`: The main-agent system prompt shall remain unchanged and outside the compacted-history rewrite; compaction shall only rewrite the memory/history payload that is reassembled after the system prompt.
- FR-026 `deterministic_block_frontier_contract`: The runtime shall implement one deterministic rule set for transforming ordered raw traces into interaction blocks, classifying settled vs frontier blocks, treating unmatched or malformed tool-call/result batches as frontier, and applying a conservative fallback when no active turn is known during bootstrap or schema-rebuild restore.
- FR-027 `trace_id_prune_persistence`: The memory-store persistence seam shall support pruning and optional archiving by raw-trace ID so compaction can remove only the selected settled traces instead of whole turn IDs.
- FR-028 `tool_continuation_boundary_trace`: TOOL-originated same-turn continuation input shall persist a lightweight continuation-boundary raw trace that creates a planner-visible block boundary without duplicating the full aggregated tool-result payload already stored elsewhere in raw traces.
- FR-029 `typed_compaction_memory_categories`: The compaction output contract shall distinguish at least `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts` in addition to the episodic summary.
- FR-030 `confidence_free_compaction_contract`: The compaction prompt/response contract shall not require or persist model-generated confidence values for compacted memory, because runtime prioritization shall be derived deterministically instead.
- FR-031 `deterministic_quality_filtering`: After parsing the compaction response, the runtime shall deterministically deduplicate entries, cap per-category counts, and filter or demote low-value transient operational observations before persistence.
- FR-032 `priority_aware_memory_rendering`: Retrieved compacted memory shall preserve category metadata/reference metadata and shall be rendered in priority order, with critical issues and unresolved work ahead of lower-priority durable facts or artifact references in the rebuilt snapshot.
- FR-033 `single_pass_default_compaction_quality`: The default production compaction path shall remain one internal LLM summarization call; optional repair/refinement passes may exist only as future extension points behind the summarizer boundary and shall not be required for normal successful compaction in this ticket.
- FR-034 `persisted_semantic_schema_reset_path`: The runtime shall enforce an explicit persisted semantic-memory schema version and, on schema mismatch, shall reject old semantic-memory files and invalidate the snapshot cache instead of attempting legacy migration.
- FR-035 `current_schema_only_semantic_gate`: Retrieval and snapshot rendering shall consume only current typed semantic-memory entries; old flat semantic entries shall not be silently defaulted, parsed, migrated, or rendered through hidden backward-compat logic.

## Acceptance Criteria

- AC-001 `real_runtime_compaction_executes`: In a normal production-style agent runtime flow, crossing the threshold causes compaction to execute through the real summarizer before the next LLM leg, and episodic/semantic memory records are persisted.
- AC-002 `tool_chain_continues_before_compaction`: In a tool-calling flow, threshold crossing does not cancel the issued tool call; compaction occurs before the subsequent continuation request and the continuation still completes successfully.
- AC-003 `compaction_logs_and_events_visible`: When compaction is requested and executed, dedicated logs/events are emitted for request, start, completion, and failure paths.
- AC-004 `frontend_shows_compaction_status`: The frontend receives the new compaction lifecycle events and visibly indicates when compaction is in progress and when it has completed; failure remains visible through logs/events.
- AC-005 `ratio_setting_live_update`: Changing the compaction-ratio server setting updates the effective trigger ratio used by subsequent runtime budget checks without restarting the server.
- AC-006 `detailed_logs_available`: When detailed compaction logs are enabled, detailed context-budget numbers are written to logs during compaction evaluation/execution so operators can inspect them without a dedicated frontend debug dashboard.
- AC-007 `effective_context_override_applies`: When the effective-context override is configured, the runtime budgets against the overridden ceiling, logs mark the override as active, and validation can deterministically force threshold crossings with it.
- AC-008 `compaction_model_override_applies`: When a compaction-model override is configured, the internal summarizer uses that model; when no override is configured, the main run model is used.
- AC-009 `compaction_failure_is_safe`: If the summarizer fails or returns invalid output, the run emits failure observability, the active turn resolves through a recoverable error response, raw traces remain unpruned, and later requests remain gated by pending compaction instead of silently bypassing it.
- AC-010 `local_provider_streams_survive_long_idle_processing`: LM Studio and Ollama long-running local streams no longer terminate around the default five-minute idle-body timeout, and regression coverage proves the clients are constructed with the hardened timeout policy.
- AC-011 `long_single_turn_compaction_executes`: In a long tool-heavy single turn that crosses the threshold repeatedly, the runtime compacts earlier settled blocks from that same turn and does not require older completed turn IDs to exist before compaction can help.
- AC-012 `unsafe_skip_is_not_reported_as_success`: When compaction is required but no eligible block exists, the runtime does not emit misleading `completed/skipped` success; it emits an explicit blocked/failure outcome and does not treat the path as safe compaction completion.
- AC-013 `system_prompt_remains_intact`: After compaction, the main system prompt remains unchanged while compacted memory/history is reassembled separately.
- AC-014 `planner_contract_handles_restart_and_partial_batches`: Validation proves the planner/frontier contract on canonical structural cases: plain user/assistant blocks, assistant/tool-call/tool-result blocks, unmatched tool batches, malformed/orphan tool-result traces, and bootstrap/schema-rebuild execution when no active turn is known.
- AC-015 `trace_id_prune_and_archive_is_exact`: Validation proves that raw-trace pruning removes only the selected trace IDs, preserves unselected traces from the same turn, and archives removed traces when archiving is enabled.
- AC-016 `single_long_turn_multiple_cycles_split_into_blocks`: Validation proves that one single long-running turn with multiple tool continuation cycles produces multiple planner-visible blocks because lightweight continuation-boundary traces are persisted between cycles.
- AC-017 `typed_memory_categories_are_persisted`: Validation proves successful compaction persists actionable typed memory categories that preserve critical issues, unresolved work, durable facts, user preferences, and important artifacts from a representative long-run scenario.
- AC-018 `low_value_noise_is_filtered_or_demoted`: Validation proves transient low-value observations such as process-count/runtime-noise or generic branch/doc-status clutter do not dominate the compacted memory that is persisted and rebuilt into the next prompt.
- AC-019 `confidence_is_removed_and_priority_is_deterministic`: Validation proves compaction no longer persists model-generated confidence values and that compacted memory priority comes from deterministic category-aware rules instead.
- AC-020 `snapshot_prioritizes_actionable_memory`: Validation proves the rebuilt snapshot renders critical issues and unresolved work ahead of lower-priority durable facts or artifact references, while the unresolved raw frontier still remains intact.
- AC-021 `legacy_semantic_memory_is_rejected_and_cleared`: Validation proves that a pre-existing flat `semantic.jsonl` file is explicitly rejected on schema mismatch, removed from active semantic-memory persistence, and never read through a compatibility path before normal retrieval resumes.
- AC-022 `schema_mismatch_rebuilds_or_starts_clean`: Validation proves that startup/bootstrap with stale semantic-memory schema invalidates the snapshot cache, rebuilds from current canonical sources when available, and otherwise starts clean rather than attempting semantic migration heuristics.

## Constraints / Dependencies

- Must align with the existing `autobyteus-ts` runtime/event architecture and the existing TS -> server -> web streaming pipeline.
- Must preserve the approved post-response compaction timing.
- Must keep the timeout hardening provider-specific to LM Studio and Ollama so existing cloud-provider behavior is not widened without review.
- Must work with the existing `ServerSettingsService` / `AppConfig` model for operator-controlled environment-backed settings.
- Must preserve post-response trigger timing even after the compaction boundary changes; the revised design should not depend on exact local tokenizer parity with provider token accounting.
- Must not require introducing a separate public agent run just to do compaction.
- The first production implementation should keep compaction prompt ownership internal instead of expanding into a broader prompt-management system.
- Current LM Studio + Qwen3.5 reasoning models on the existing OpenAI-compatible `/v1/chat/completions` path are a known validation limitation because reasoning-disable controls are not reliably honored there and the summarizer parses `response.content`, not `reasoning_content`.

## Assumptions

- Users should not have to manually know or type raw environment-variable keys for the main compaction controls; the app should provide typed controls such as a model dropdown, percentage input, and detailed-log toggle, even if those values are still persisted as server settings underneath.
- One internal summarizer LLM call per compaction remains the default production path for this ticket; multi-pass repair/refinement is a future extension point, not a default requirement.
- Provider-reported usage remains the primary trigger source where available.
- The revised design may still use local heuristics for structural selection of what to compact, but it should not require exact pre-dispatch token counting parity with provider internals to function.
- Global/server-level compaction-model selection is an acceptable first implementation even though future work may later add per-agent or per-run overrides.
- Detailed context-budget debugging will primarily happen through logs, not through a new live frontend numbers dashboard.
- For LM Studio, the correct practical fix is to disable the transport-layer 5-minute idle timeout and raise the separate SDK request timeout to a large finite value, not to set the SDK timeout to zero.

## Risks / Open Questions

- Whether provider usage gaps need an additional local estimation fallback in this same ticket or can remain future hardening.
- How aggressive the deterministic low-value filter should be in the first production cut without accidentally dropping future-relevant details.
- Clearing stale flat semantic memory on schema mismatch can discard some historical semantic value, but the clarified policy is current-schema-only persisted data, so the design must favor clean rejection/reset plus rebuild-from-canonical-sources over heuristic legacy preservation.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| FR-001, FR-002, FR-005 | UC-001 |
| FR-003, FR-004 | UC-002 |
| FR-011, FR-012, FR-016 | UC-003 |
| FR-007, FR-008, FR-009, FR-010 | UC-004 |
| FR-009, FR-010, FR-013, FR-016, FR-017 | UC-005 |
| FR-014, FR-015 | UC-006 |
| FR-006, FR-007 | UC-007 |
| FR-018, FR-019 | UC-008 |
| FR-020, FR-021, FR-022, FR-024 | UC-009 |
| FR-023 | UC-010 |
| FR-026 | UC-009, UC-010, UC-011 |
| FR-027 | UC-001, UC-009 |
| FR-028 | UC-009, UC-012 |
| FR-029 | UC-013, UC-014 |
| FR-030 | UC-013, UC-014 |
| FR-031 | UC-013, UC-014 |
| FR-032 | UC-013, UC-014 |
| FR-033 | UC-001, UC-013 |
| FR-034 | UC-015 |
| FR-035 | UC-013, UC-015 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Prove real compaction executes in the top-layer runtime path, not only via injected test doubles. |
| AC-002 | Prove tool-continuation behavior remains correct when compaction is pending. |
| AC-003 | Prove runtime-side observability exists for operators and logs. |
| AC-004 | Prove the frontend can show compaction activity instead of appearing stalled. |
| AC-005 | Prove the 80% threshold is operator-configurable live through server settings. |
| AC-006 | Prove detailed context-budget information is available in logs for debugging. |
| AC-007 | Prove the effective-context override supports LM Studio/debug validation and deterministic tests. |
| AC-008 | Prove compaction model selection is configurable and actually applied. |
| AC-009 | Prove production compaction failure is safe and recoverable. |
| AC-010 | Prove LM Studio and Ollama clients keep long local requests alive past the default five-minute idle transport cutoff. |
| AC-011 | Prove earlier settled blocks inside one long-running turn can be compacted without requiring older turn IDs. |
| AC-012 | Prove `compaction required + no eligible block` is surfaced as unsafe/blocked rather than successful skipped compaction. |
| AC-013 | Prove the main system prompt remains unchanged across compaction rebuilds. |
| AC-014 | Prove the planner/frontier rules behave deterministically for partial tool batches and restart/schema-rebuild fallback without an active turn. |
| AC-015 | Prove prune/archive behavior is exact at the raw-trace-ID persistence seam. |
| AC-016 | Prove one long-running turn with multiple tool continuation cycles is actually split into multiple blocks by the persisted continuation-boundary traces. |
| AC-017 | Prove the persisted compacted memory is categorized and retains the most actionable information from a representative run. |
| AC-018 | Prove low-value transient operational noise is filtered or demoted before it dominates persisted compacted memory. |
| AC-019 | Prove model-generated confidence is removed and deterministic category-aware priority is used instead. |
| AC-020 | Prove the rebuilt snapshot orders compacted memory by actionable priority while preserving the unresolved raw frontier. |
| AC-021 | Prove old flat semantic memory on disk is explicitly rejected/cleared on schema mismatch and never re-enters retrieval through compatibility logic. |
| AC-022 | Prove stale semantic schema triggers snapshot invalidation plus rebuild-from-canonical-sources or clean start instead of legacy migration. |

## Approval Status

Approved by user on 2026-04-10 and reconfirmed on 2026-04-12 after the long-turn compaction-boundary revision and the compaction-quality refinement approval.
