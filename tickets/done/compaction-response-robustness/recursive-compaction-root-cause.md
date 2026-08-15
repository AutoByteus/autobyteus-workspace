# Recursive Memory Compactor Root-Cause Analysis

## Status And Authority

- Type: production investigation and intended-behavior supplement.
- Evidence date: 2026-08-15.
- Related behavior: BEH-012.
- Related requirement / acceptance criteria: REQ-017; AC-027–AC-029.
- Approval applicability: the user identified the nested task as strange, then explicitly agreed that the built-in Memory Compactor must be treated specially and must not use the same compaction policy. The user subsequently approved a bounded ownership refactor: memory owns automatic-compaction configuration, the current single policy decides whether, the current strategy decides how, and agent creation selects enabled or disabled without speculative policy/strategy hierarchies. The non-recursive leaf-run outcome and ownership direction below are approved intended behavior; they do not reopen the approved prompt, response, storage, retry, or Unicode contracts.

## Executive Conclusion

Yes, the small task with two START/END pairs is another local compaction bug. It is not the Daily Assistant being compacted twice with only a little new conversation. The intended Daily Assistant operation launched Memory Compactor run `memory_compactor_6d151dd0cc8441d8881a2d684f86b454`. After that child had already generated its compaction response, the ordinary agent LLM phase applied the same global 20% automatic-compaction policy to the Memory Compactor itself. Its 176,655-token prompt exceeded the 123,148-token trigger and launched nested Memory Compactor run `memory_compactor_08242efd53204df8b27dd4782347bd17`.

The nested child was asked to compact the outer child's one user message: the already-wrapped 540,257-character compaction task. `ReadableValueRenderer` shortened that single value to the configured per-value size, omitting 538,757 characters. The nested operation prompt was therefore only 2,432 characters and naturally contained an outer wrapper around a shortened inner wrapper. That exactly explains the screenshot's two START separators, two END separators, and unexpectedly small content.

## Exact Runtime Chain

| Stage | Agent / operation | Observed input | Outcome |
| --- | --- | ---: | --- |
| Intended parent observation | `daily_assistant_2a39c68eb96443ada6f5af9f4f81acef` | 372,123 prompt tokens at 20%; threshold 123,148 | Requested `compaction_operation_msu088l2_1` over 551 units / 1,762 raw traces. |
| Intended compactor child | `memory_compactor_6d151dd0cc8441d8881a2d684f86b454` / task `compaction_task_7e04c6d6764342b0b5d94f4ac010c02d` | 540,726 processed task characters; 176,655 provider prompt tokens | Generated the intended parent-compaction response, then incorrectly evaluated itself against the global 20% trigger. |
| Incorrect self-compaction | outer child operation `compaction_operation_msu09qwk_1` | One selected unit / one raw user trace | Launched another built-in Memory Compactor. |
| Nested compactor child | `memory_compactor_08242efd53204df8b27dd4782347bd17` / task `compaction_task_d16a001fb9c5493da9d567975c0dee7a` | 2,432 processed task characters; 1,758 prompt tokens | Summarized the shortened outer task envelope; committed 1 episode block and 11 facts into the outer child's ephemeral memory. |
| Intended parent completion | original Daily Assistant operation | 4,974 episode-summary characters and 33 semantic facts | Completed successfully; next actual parent prompt observation was 73,102, below threshold, so the threshold episode reset. |

The host's terminal metadata records 4,974 episode-summary characters and 33 semantic facts for the intended outer result. The nested result is not the Daily Assistant's canonical compaction result.

## Why The Inner Prompt Is Small

The outer compactor's raw user trace is one 540,257-character task containing exactly one START/END pair. When that trace is rendered as evidence for the nested compactor, the existing 2,000-character per-value presentation limit inserts:

```text
… [538757 characters omitted] …
```

The nested task adds its own identification sentence, wrapper, role label, and separators, producing 2,430 raw user characters / 2,432 post-processor characters. Its content therefore has exactly two START pairs and two END pairs:

1. the nested child's own task envelope; and
2. the shortened outer child's task envelope, escaped as evidence.

This is deterministic composition, not model hallucination and not a failure of the approved separator wording.

## Root Cause In Source Ownership

1. `ServerCompactionAgentRunner.runCompactionTask` launches the built-in Memory Compactor through the ordinary `AgentRunService.createAgentRun` path.
2. `AutoByteusAgentRunBackendFactory.buildAgentConfig` currently constructs and attaches a `ServerCompactionAgentRunner` to every AutoByteus agent definition, including `autobyteus-memory-compactor`.
3. `AgentConfig` carries that runner as an independent top-level nullable field, while `AgentFactory.createRuntimeWithId` separately and unconditionally constructs `new CompactionPolicy()` and passes it to `MemoryManager`.
4. `LlmPhase` reads the manager policy and top-level runner separately, resolves request capacity and ratio settings, constructs the strategy resolver/executor, and evaluates automatic compaction after every usable LLM response.
5. The global 20% runtime trigger therefore applies to the one-shot compactor child. Once its large source-history task exceeds the trigger, it recursively launches the same built-in definition.

The Unicode correction worked in this run: the previously rejected source became a well-formed 540,726-character task and DeepSeek produced a usable outer response. Recursive self-compaction is a separate pre-existing lifecycle/capability defect exposed only after that provider-boundary failure was removed.

## Correctness And Operational Impact

- The nested operation does not normally replace the already-generated outer JSON response; that response remained the intended Daily Assistant result in this reproduction.
- It adds one avoidable provider call, token cost, latency, run-history record, memory archive, activity card, and confusing nested task.
- It is a correctness risk, not merely UI noise. `LlmPhase` does not publish the outer completion until immediate self-compaction settles. If the nested compaction fails, the outer run returns an error completion and the parent rejects an otherwise usable compaction response.
- A bounded response-correction child is still legitimate when the outer model returns usable invalid output. Initial and correction children are siblings owned by the parent summarizer; neither may recursively compact itself.
- If a compactor task cannot fit the provider/request budget, it must fail through the existing planning/pre-launch or typed runner path. Recursively summarizing the compaction instruction/history changes the task and is not a valid capacity fallback.

## Required Behavioral Direction

Treat the built-in Memory Compactor as a non-compactable leaf through a bounded ownership cleanup:

1. Add one runtime-only discriminated memory-compaction configuration: `disabled`, or `enabled` with the single existing `CompactionPolicy` and the current strategy runner. Do not introduce alternative policy classes or a generic dependency bag.
2. `AgentConfig` carries that non-null composition into agent creation. Omitted direct-core construction resolves to the complete disabled variant. Remove the separate top-level `compactionAgentRunner` field.
3. `AgentFactory` passes the configuration to `MemoryManager` and stops unconditionally constructing its own policy. `MemoryManager` owns the configuration, defaults direct construction to disabled, and its existing internal coordinator remains the lifecycle/state owner. Production `AgentFactory` always passes the complete config.
4. `AutoByteusAgentRunBackendFactory` selects `disabled` for canonical `autobyteus-memory-compactor` on create and restore and does not invoke the runner factory. Normal definitions receive `enabled` with a fresh existing policy and their required runner; runner-factory failure/null fails normal-agent composition rather than silently disabling automatic compaction.
5. Generic `LlmPhase` asks the memory boundary once. Disabled means no policy application, strategy/executor construction, pending execution, post-response evaluation, or compaction lifecycle. Enabled retains the current policy and pluggable strategy path.
6. Resolve provider/model request capacity for both variants. Disabled removes the automatic 20% trigger; it does not bypass total context/input caps, output reserve, or ordinary safety. The captured 176,655-token prompt is below the 615,744 request budget and therefore runs directly.
7. The Memory Compactor still receives the complete parent-built operation task, subject only to approved per-value rendering and B/T/P parent planning; no whole-task character clamp is introduced.
8. Detailed logs may emit one bounded `compaction_budget_skipped` diagnostic with reason `automatic_compaction_disabled`, but no compaction status card, pending operation, or child run is created.
9. Do not add a persisted opt-out field, special prompt instruction, new controller layer, new policy subclass, new strategy implementation, or data migration.

Identity belongs in the server factory; automatic-compaction composition belongs to the memory boundary; `LlmPhase` remains the thin lifecycle integration point. The existing `MemoryManagerCompactionCoordinator` continues to own pending/attempt/episode/commit transitions and is not expanded into an agent/provider/reporting god object.

## Rejected Alternatives

| Alternative | Decision | Reason |
| --- | --- | --- |
| Set the child ratio to 100% | Reject | The global runtime override can supersede model config, and a hard-cap path could still recurse. It encodes leaf semantics as a numeric accident. |
| Remove/escape the duplicated separators | Reject | The separators are only evidence of recursive task inclusion. Changing prompt text hides the symptom while retaining the extra provider call and failure risk. |
| Accept the nested result as the outer result | Reject | It summarizes a truncated compaction task envelope, not the selected target-agent history, and bypasses parent-owned acceptance semantics. |
| Disable compaction globally | Reject | Normal agents still require proactive and hard-cap protection. Only the one-shot built-in compactor is a leaf. |
| Keep only the SR-007 null-runner guard | Superseded | It produces the leaf outcome but leaves policy construction, runner provisioning, strategy assembly, and capability inference split across unrelated owners. The user approved a bounded cleanup now. |
| Add a persistent `compaction_disabled` schema field | Reject | Enablement is runtime composition at agent creation. Persistence/versioning/migration would be unnecessary. |
| Add ratio-threshold and capacity-pressure policy subclasses | Reject | The current single policy already classifies `none`, `proactive`, and `hard_input_cap`; current evidence needs composition, not a hierarchy. |
| Add a new compaction controller over `MemoryManagerCompactionCoordinator` | Reject | The manager/coordinator already own the memory boundary and lifecycle state. One more coordinator would fragment ownership rather than clean it. |
| Implement chunked/map-reduce compaction now | Reject | The reproduced child fits the provider request budget. Chunking is a future strategy only if actual capacity evidence requires it. |
| Delete historical nested run directories | Reject | Existing run history is evidence and does not affect future correctness. No migration or cleanup is required. |

## Direct Coverage Required

- Configuration unit: disabled has no policy/runner; enabled requires the existing policy and runner; omitted direct `AgentConfig`/`MemoryManager` construction is disabled; no enabled-without-runner value can be constructed; copy preserves disabled or clones enabled policy scalar values without cloning/replacing the runner.
- Agent-factory unit: the supplied configuration is passed to `MemoryManager`; `AgentFactory` does not construct a second policy. A bare top-level `AgentConfig.compactionAgentRunner` no longer exists.
- Server backend-factory unit: `autobyteus-memory-compactor` receives disabled configuration and the runner factory is not invoked on create or restore; a normal agent receives enabled configuration containing a fresh existing policy and configured runner; thrown/null runner-factory outcomes fail normal-agent composition with no disabled fallback.
- Core LLM-phase integration: with disabled automatic compaction, valid usage above proactive and policy-hard-cap thresholds returns the model's original completion with zero policy application, strategy resolution, evaluation/request/start/completion status, pending operation, or runner call. Ordinary provider/model request capacity is still resolved.
- Enabled-path regression: the current single policy still returns `none`, `proactive`, or `hard_input_cap`, and the existing `structured-json` strategy still performs the selected operation through the registry/resolver.
- Server runner integration: with the global trigger forced to 20% and a compactor task above 123,148 tokens but below provider capacity, exactly one initial child is launched and its original completion reaches the collector; no second `autobyteus-memory-compactor` run is created.
- Repair regression: usable invalid output may create exactly one sibling correction child, but both child configs are non-compactable and no descendant run is created.
- Parent regression: the Daily Assistant scenario still requests and commits one parent operation, then records the actual 73,102-token below-threshold observation.
- Presentation regression: the original compactor task has one START/END pair. No generated compactor child task contains a nested wrapper unless the target agent's authentic source text itself happens to quote that text; no test should delete legitimate quoted source content.

## Separate Concurrent Observation

The same server log repeatedly reports Prisma failures because `token_usage_ledger_events.member_name` is absent from the active database. That is a separate token-usage schema/startup-migration defect: it did not cause the nested compaction, but token-usage events are not being persisted and the repeated errors create substantial log noise. It should be routed as an independent issue rather than hidden inside the non-recursion fix or used to justify a migration in this compaction ticket.

## Evidence

- `evidence/recursive-memory-compactor-ui.png` — SHA-256 `b3b17b0875ffaaa5334a8af9dc3c657375c780cc32d3495bc6334c7229caecea`
- `evidence/recursive-memory-compactor-server-log-excerpt.txt` — SHA-256 `d357fa1188b4518cc65985f9de9bde22d6f8f7487caaf219bc6857ed79f77681`
- `evidence/recursive-memory-compactor-proof.json` — SHA-256 `121ddc5f82e3bbfea36a33e3f3f9c1a5bbb1f98ef6708fbdbc79bebdf0e62add`
- Outer raw trace: `/Users/normy/.autobyteus/server-data/memory/agents/memory_compactor_6d151dd0cc8441d8881a2d684f86b454/raw_traces_000001.jsonl`
- Nested raw trace: `/Users/normy/.autobyteus/server-data/memory/agents/memory_compactor_08242efd53204df8b27dd4782347bd17/raw_traces_active.jsonl`
