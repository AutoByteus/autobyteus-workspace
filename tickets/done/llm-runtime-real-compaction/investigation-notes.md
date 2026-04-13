# Investigation Notes

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Investigation Status

- Bootstrap Status: Completed
- Current Status: The requirements were originally approved, then revised after new runtime findings exposed a compaction-boundary design gap, and were reconfirmed by the user on 2026-04-12. The design has now been revised again to lock the planner/frontier contract, the raw-trace-ID prune/archive persistence seam, the explicit same-turn `tool_continuation` boundary-trace contract, the compaction-quality contract, and a clarified current-schema-only persisted-semantic-data policy for re-review.
- Investigation Goal: Produce a requirements basis and then a design spec for real production compaction implementation plus observability, server settings, simple frontend lifecycle events backed by detailed logs, local-provider timeout hardening for LM Studio/Ollama, and a revised long-turn-safe compaction boundary.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Scope crosses `autobyteus-ts` runtime/memory/LLM composition, `autobyteus-server-ts` server settings plus stream event conversion, and `autobyteus-web` run-monitor display/state.
- Scope Summary: Real LLM-backed compaction summarizer, default runtime wiring, compaction lifecycle logs/events, detailed compaction/context logs, live threshold/override settings, a dedicated compaction-model selection surface, local-provider timeout hardening for LM Studio/Ollama, a revised long-turn-safe compaction boundary that can summarize settled blocks inside a still-active turn while leaving the main system prompt unchanged, a quality-focused compacted-memory contract that prioritizes actionable memory over flat noisy fact lists, and a clean-cut startup/schema rejection path so old flat semantic memory is cleared instead of migrated after the typed redesign.
- Primary Questions Resolved:
  - Current TS compaction path exists architecturally but lacks a real production summarizer and default runtime wiring.
  - No production summarizer implementation was found elsewhere in the checked-out codebase; only tests/docs mention it.
  - Existing server settings infrastructure is strong enough to persist the new operator controls without inventing a new settings backend, but the user now prefers a typed UI layer above raw key/value editing.
  - Existing event/stream plumbing is strong enough to carry simple compaction lifecycle updates end-to-end.
  - The cleanest first configuration boundary is server-global/env-backed settings, because the current `AgentRunConfig.llmConfig` path is effectively provider `extraParams`, not a typed runtime compaction config surface.
  - The first real implementation can keep the compaction prompt internal and built-in while still making the compaction model configurable.
- The previously validated budget contract must be preserved: derive a context-based prompt cap from total context minus reserved output, merge it with `maxInputTokens` only when both exist, and do not subtract output twice when `maxInputTokens` is already an input cap.
- Live LM Studio + Qwen3.5 compaction validation is currently constrained by the existing OpenAI-compatible `/v1/chat/completions` path: tested reasoning-disable fields were not honored there, so the summarizer can receive reasoning-only output with empty/insufficient `response.content`.
- Long LM Studio local requests are also currently vulnerable to a client-side idle transport timeout around five minutes; the paired app/LM Studio logs match Undici's documented 300-second default `bodyTimeout`.
- `OpenAICompatibleLLM` and `OllamaLLM` both currently use default client transports with no timeout override; LM Studio therefore inherits both the OpenAI SDK request timeout layer and the default underlying transport timeouts, while Ollama inherits the default fetch transport behavior.
- New runtime evidence shows the current compaction boundary is wrong for long-running tool-heavy turns: the runtime repeatedly requested compaction, then selected zero eligible turns because it preserves the last `rawTailTurns` whole turns, and then still crashed with `Context size has been exceeded`.
- Tool continuations stay on the same active `turnId`, so one active turn can accumulate the majority of prompt growth while remaining protected from whole-turn compaction.
- `MemoryIngestInputProcessor` currently skips `SenderType.TOOL` input entirely to avoid duplicate tool results, so same-turn continuation cycles do not currently create any raw-trace boundary that a planner could split on.
- `WorkingContextSnapshotBootstrapper` rebuilds from persisted memory state without any active-turn/frontier metadata, so restart/schema-rebuild behavior needs an explicit conservative planner fallback.
- The current persistence seam is still turn-based at `src/memory/store/base-store.ts` and `src/memory/store/file-store.ts`, so raw-trace-ID prune/archive ownership must be made explicit in the design.
- Live compaction inspection on 2026-04-12 shows the execution path now works mechanically: one run compacted 23 blocks, archived 92 raw traces, retained 5 frontier traces, persisted one episodic summary plus 12 semantic facts, and rebuilt a snapshot successfully.
- That same live result exposed the next gap: the episodic summary was useful, but semantic memory still mixed critical findings with low-value operational noise.
- The current compaction prompt/response contract is too generic (`episodic_summary` + `semantic_facts` with `tags` and `confidence`), which encourages a flat mixed bag of facts rather than typed actionable memory.
- Model-generated `confidence` is currently parsed and stored but is not used anywhere in retrieval or snapshot rendering, so it adds payload cost without runtime value.
- `CompactionSnapshotBuilder` currently flattens semantic memory into one `[MEMORY:SEMANTIC]` section, and `Retriever` returns semantic items by recency, so critical issues and unresolved work are not structurally prioritized over lower-value facts.
- The current semantic store is append-only, and real pre-redesign `semantic.jsonl` files already exist on disk from successful runs, so the typed redesign needs an explicit persisted-data cut plus current-schema-only reset behavior rather than implicit fallback or migration behavior.

## Request Context

- The user explicitly called the current ticket incomplete because the “real” compaction implementation is still missing.
- The user wants compaction to remain post-response and default to 80%.
- The user wants compaction lifecycle logs plus frontend-visible started/completed/failed status signals when compaction is happening.
- The user wants an easy settings UI for the main compaction controls and prefers to inspect the detailed context/token numbers in logs instead of building a live frontend numbers panel; a typed detailed-log toggle fits that workflow.
- The user wants a way to override the effective context ceiling because LM Studio can fail before the advertised maximum context is reached.
- The user also wants LM Studio and Ollama long-running local requests to stop disconnecting at the apparent five-minute mark; if the timeout cannot be truly disabled safely, the solution should still remove the five-minute cutoff by default.
- The user wants compaction quality to be controllable via model selection and agrees a built-in/internal prompt is acceptable if properly designed.
- The user asked whether compaction is “another agent”; the recommended answer is no: it should be one internal LLM summarization call owned by the compaction subsystem, not a public second agent.
- The user explicitly rejected the fixed `skip last four turns` behavior after seeing live logs, because in this runtime one turn can last for hours and contain the largest amount of data.
- The user agrees the main system prompt should stay intact and only the history/memory payload after it should be rewritten by compaction.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction`
- Current Branch: `codex/llm-runtime-real-compaction`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed successfully on 2026-04-10.
- Task Branch: `codex/llm-runtime-real-compaction`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): Unknown
- Bootstrap Blockers: None after creating the dedicated worktree.
- Notes For Downstream Agents: The original `personal` checkout contained unrelated local modifications, so all task artifacts/work should stay in this dedicated worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-10 | Command | `git fetch origin`, `git worktree add ... codex/llm-runtime-real-compaction` | Bootstrap dedicated task worktree/branch | Dedicated ticket worktree created successfully off `origin/personal` | No |
| 2026-04-10 | Code | `autobyteus-ts/src/memory/compaction/summarizer.ts`, `compactor.ts`, `memory-manager.ts`, `agent/llm-request-assembler.ts`, `agent/handlers/llm-user-message-ready-event-handler.ts`, `agent/factory/agent-factory.ts` | Verify current compaction path and production wiring state | Compaction trigger/storage/snapshot flow exists, but summarizer is abstract and default runtime composition does not wire a real compactor/summarizer | No |
| 2026-04-10 | Code | `autobyteus-ts/tests/integration/agent/memory-compaction-*.test.ts` | Determine whether any concrete summarizer exists outside tests | Only deterministic/fake summarizers were found under tests; no production summarizer implementation exists in `src` | No |
| 2026-04-10 | Code | `autobyteus-ts/src/agent/token-budget.ts`, `memory/policies/compaction-policy.ts`, `llm/models.ts`, `llm/utils/llm-config.ts` | Confirm current threshold defaults and budget inputs | Current default compaction threshold is 0.8; current budget logic still relies on `maxTokens`/`tokenLimit` naming in the checked-out branch | Yes |
| 2026-04-10 | Code | `autobyteus-ts/src/llm/llm-factory.ts`, `llm/base.ts` | Check feasibility of a real internal summarizer call | `LLMFactory.createLLM(...)` can create a second internal LLM instance and `BaseLLM.sendMessages(...)` can execute one internal summarization request | No |
| 2026-04-10 | Code | `autobyteus-ts/src/events/event-types.ts`, `agent/events/notifiers.ts`, `agent/streaming/events/stream-events.ts` | Check outward runtime event seams | Existing notifier/stream pipeline can carry new compaction lifecycle events such as started/completed/failed | No |
| 2026-04-10 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`, `agent-execution/domain/agent-run-event.ts`, `services/agent-streaming/models.ts` | Check server-side normalized-event mapping impact | Server event mapping will need new event types if compaction/telemetry should reach the frontend via the existing WebSocket protocol | Yes |
| 2026-04-10 | Code | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`, `protocol/messageTypes.ts`, `handlers/agentStatusHandler.ts`, `components/workspace/agent/AgentEventMonitor.vue`, `types/agent/AgentRunState.ts` | Check frontend ownership point for compaction status | Current frontend run monitor has a natural insertion point for a compacting-started/finished status widget, but no existing state/event handling for compaction exists | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts`, `config/app-config.ts`, `autobyteus-web/components/settings/ServerSettingsManager.vue`, `stores/serverSettings.ts` | Check whether operator settings can be added without new infrastructure | Server settings already support predefined editable keys, live `process.env` updates, persistence to `.env`, and frontend editing through the existing settings UI | No |
| 2026-04-10 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `agent-execution/domain/agent-run-config.ts` | Check whether typed compaction config should ride the current run-config path | Current run-config `llmConfig` is just forwarded as provider `extraParams`, so it is a poor boundary for new typed compaction/runtime settings in this ticket | No |
| 2026-04-10 | Code | `autobyteus-ts/src/llm/api/lmstudio-llm.ts`, `llm/api/openai-compatible-llm.ts` | Confirm LM Studio streaming usage path | LM Studio inherits the OpenAI-compatible adapter and requests `stream_options.include_usage = true`, but exact LM Studio behavior still depends on the provider returning usage in the final chunk | Yes |
| 2026-04-10 | Trace | User-provided LM Studio error log (`Compute error`, `n_tokens = 128865`, etc.) | Capture motivating failure mode for telemetry/override | User observes practical LM Studio failures before the theoretical context max, which justifies a lower effective-context override plus live telemetry | No |
| 2026-04-11 | Probe | API/E2E exploration of LM Studio native `/api/v1/chat` vs OpenAI-compatible `/v1/chat/completions` for model `qwen/qwen3.5-35b-a3b` | Determine whether current LM Studio integration can reliably disable reasoning for compaction summarizer calls | Native `/api/v1/chat` honored `reasoning:"off"` and returned normal content with `reasoning_output_tokens: 0`; the existing `/v1/chat/completions` path did not honor tested reasoning-disable controls and continued returning reasoning-only output | Yes |
| 2026-04-11 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts`, `autobyteus-ts/src/llm/api/lmstudio-llm.ts`, `autobyteus-ts/src/llm/api/ollama-llm.ts` | Verify current long-stream timeout ownership for local providers | LM Studio path creates `new OpenAIClient({ apiKey, baseURL })` with no timeout/fetch override; Ollama path creates `new Ollama({ host })` with default fetch and no timeout override | Yes |
| 2026-04-11 | Code | `autobyteus-ts/node_modules/openai/src/client.ts`, `autobyteus-ts/node_modules/openai/src/internal/utils/values.ts` | Verify whether OpenAI SDK timeout can be safely disabled for LM Studio path | SDK default timeout is 10 minutes; request execution uses `setTimeout(abort, ms)` and accepts `0`, which would abort immediately instead of disabling the timer | Yes |
| 2026-04-11 | Doc | Official Undici Client docs (`ClientOptions.bodyTimeout`, `headersTimeout`) | Confirm default long-idle transport timeout semantics | `bodyTimeout` and `headersTimeout` both default to 300 seconds and `0` disables them entirely | No |
| 2026-04-11 | Doc | `autobyteus-ts/node_modules/ollama/README.md` (`Custom client`, `fetch`) | Confirm Ollama JS client supports custom fetch injection | Ollama client accepts a custom `fetch`, giving the runtime a clean seam to inject a long-running local transport policy | No |
| 2026-04-12 | Log | `~/.autobyteus/logs/app.log`, `~/.autobyteus/server-data/logs/server.log` filtered around `api_e2e_engineer_3be947acda0e05f3` and `code_reviewer_5e724daf379180da` | Diagnose why queued/skipped compaction still led to context-limit failure | Repeated `compaction_requested` events were followed by `compaction_execution_context.selected_turn_count: 0` and `compaction_completed { skipped: true }`; later both agents failed with `Context size has been exceeded`, proving the whole-turn / fixed-tail strategy is insufficient | Yes |
| 2026-04-12 | Code | `autobyteus-ts/src/memory/compaction/compactor.ts`, `memory/policies/compaction-policy.ts`, `agent/context/agent-runtime-state.ts`, `agent/handlers/user-input-message-event-handler.ts`, `agent/handlers/tool-result-event-handler.ts` | Verify current unit-of-compaction and turn/continuation behavior | Compactor selects by distinct `turnId` and excludes the last `rawTailTurns`; tool continuations reuse the same active `turnId`, so a single long-running turn can remain entirely protected raw even while it causes the overflow | Yes |
| 2026-04-12 | Code | `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`, `autobyteus-ts/tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts`, `autobyteus-ts/tests/integration/agent/memory-tool-call-flow.test.ts` | Verify whether same-turn tool continuations currently create any raw-trace planner boundary | TOOL-originated continuation input is currently skipped entirely, existing unit tests assert that skip behavior, and integration flow confirms later continuation cycles therefore lack any planner-visible raw-trace boundary today | Yes |
| 2026-04-12 | Log / Data | `/Users/normy/.autobyteus/logs/app.log`, `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_c5689477/solution_designer_6f961204b9c3f71c/{episodic.jsonl,semantic.jsonl,raw_traces.jsonl,raw_traces_archive.jsonl,working_context_snapshot.json}` | Inspect live compaction result quality after the new block-based execution path ran | One run compacted 23 blocks, archived 92 raw traces, retained 5 frontier traces, and rebuilt the snapshot correctly; however the persisted semantic memory still mixed high-value actionable items with low-value transient observations | Yes |
| 2026-04-12 | Code | `autobyteus-ts/src/memory/compaction/compaction-prompt-builder.ts`, `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts`, `autobyteus-ts/src/memory/compaction/compaction-result.ts`, `autobyteus-ts/src/memory/models/semantic-item.ts`, `autobyteus-ts/src/memory/retrieval/retriever.ts`, `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | Verify why compacted memory quality is flat and whether model confidence has real runtime value | Prompt/output contract is a generic episodic-summary plus semantic-facts bag; `confidence` is parsed/stored but not used in retrieval or rendering; snapshot rebuilding currently flattens semantic memory into one undifferentiated list | Yes |
| 2026-04-12 | Code | `autobyteus-ts/src/memory/store/file-store.ts`, `autobyteus-ts/src/memory/models/semantic-item.ts`, `autobyteus-ts/src/memory/retrieval/retriever.ts`, persisted `semantic.jsonl` files under `~/.autobyteus/server-data/memory/...` | Determine whether old flat semantic memory can silently survive after the typed redesign | Semantic persistence is append-only today, old flat entries already exist on disk, and no explicit schema gate currently rejects and clears them | Yes |
| 2026-04-12 | Spec / Validation | `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/{design-review-report.md,implementation-handoff.md,api-e2e-validation-report.md}` | Reconcile the typed semantic-memory redesign with the clarified persistence policy from downstream review/validation | Authoritative policy is now current-schema-only persisted data: on semantic-schema mismatch the runtime must reject old semantic data and snapshot cache, rebuild from current canonical sources if possible, otherwise start clean; no migration heuristics are allowed | No |
| 2026-04-12 | Code | `autobyteus-ts/src/memory/models/raw-trace-item.ts`, `memory/compaction-snapshot-builder.ts`, `memory/compaction/compaction-prompt-builder.ts`, `memory/compaction-snapshot-recent-turn-formatter.ts` | Verify exactly what data compaction consumes and how rebuilt prompts are shaped | Compaction consumes raw traces containing user/assistant/tool_call/tool_result entries; the rebuild keeps the system prompt as a system message and flattens compacted episodic+semantic memory plus recent raw traces into a synthetic memory payload message | Yes |

## Current Behavior / Current Flow

- `LLMUserMessageReadyEventHandler` inspects returned token usage after each LLM leg and can call `memoryManager.requestCompaction()`.
- `LLMRequestAssembler.prepareRequest(...)` checks `memoryManager.compactionRequired` before the next LLM call and, if a compactor exists, runs compaction, rebuilds the working-context snapshot, and returns `didCompact = true`.
- `Compactor` selects old turn IDs, loads raw traces, calls the abstract summarizer, stores episodic/semantic items, and prunes raw traces through the memory store.
- `MemoryManager` owns the compaction flag and working-context snapshot but currently has no dedicated compaction lifecycle logging or outward event emission.
- `AgentFactory` composes `MemoryManager` but does not currently create or inject a real compactor/summarizer.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/summarizer.ts` | Summarizer contract | Abstract interface only | Must gain a concrete production implementation |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | Compaction orchestration (select, summarize, store, prune) | Already owns the right orchestration boundary | Should remain orchestration owner while calling a real summarizer |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Default runtime composition | Creates `MemoryManager` without compactor/summarizer | Primary runtime-wiring gap |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Post-response LLM leg handling | Requests compaction from provider-reported usage | Correct trigger owner; can also emit request-side telemetry/log input |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Pre-dispatch request preparation | Executes compaction on the next LLM request if flagged | Correct owner for `compaction_started/completed/failed` around actual execution |
| `autobyteus-ts/src/llm/llm-factory.ts` + `src/llm/base.ts` | LLM instance creation + request execution | Already sufficient for one internal summarizer call | Supports configurable compaction model without inventing a second public agent |
| `autobyteus-server-ts/src/services/server-settings-service.ts` + `src/config/app-config.ts` | Server-global env-backed settings | Updating a server setting also updates `process.env` live | Enables live ratio/override/telemetry toggles |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Server -> TS runtime composition | Current `llmConfig` forwarding only populates provider `extraParams` | Reinforces using server-global settings first instead of typed run-config piggybacking |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Active run monitor container | Currently only wraps conversation feed + input form | Natural place for a context/compaction status widget plus optional debug numbers |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-10 | Trace | User LM Studio error log showing `Compute error` with prompt processing only ~24.9% complete | Practical runtime failures can occur before the theoretical context limit is reached | Real implementation should support a lower effective-context override and expose enough telemetry to diagnose the mismatch |

## External / Public Source Findings

- Official Undici Client docs confirm `bodyTimeout` and `headersTimeout` both default to 300 seconds and that `0` disables them entirely; this matches the observed ~5 minute local disconnect pattern.
- OpenAI Node public docs plus installed source confirm a separate default SDK request timeout of 10 minutes; installed source further shows that timeout is enforced with `setTimeout(abort, ms)`, so `timeout: 0` is not a safe disable path for the LM Studio adapter.
- Ollama JS public docs confirm the client accepts a custom `fetch`, which gives the runtime a clean provider-specific seam for long-running local transport hardening.
- The live runtime logs provide the strongest evidence for the compaction-boundary problem: in this architecture, tool continuations remain in the same turn, so whole-turn tail protection is not a safe proxy for the unresolved frontier.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: LM Studio may be useful later for live validation but was not required for this requirements phase.
- Required config, feature flags, env vars, or accounts: None beyond the local repo/worktree during investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo fetch origin`
  - `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction codex/llm-runtime-real-compaction`
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The current runtime already models the correct compaction timing: mark after a completed LLM leg, execute before the next LLM leg.
- The observed LM Studio `Client disconnected` failures line up with a ~304 second gap after prompt processing, which closely matches Undici's documented 300 second default `bodyTimeout`; this strongly suggests a client-side transport idle timeout rather than LM Studio proactively cancelling the request.
- The missing production piece is not only the real summarizer and default runtime wiring; the current whole-turn/fixed-tail compaction boundary is also wrong for the runtime's long-turn tool-continuation model.
- Current logs show that `compaction_required` can be true while the assembler still selects zero eligible turns and emits `completed/skipped`; this is unsafe because it presents compaction as done even though no prompt-reducing rewrite occurred.
- The main system prompt is already structurally separate in the rebuilt prompt; the revised design should preserve that separation and only rewrite the memory/history payload after it.
- The first production implementation can and should be one internal LLM summarization request, not a second user-visible agent.
- The existing server settings path is a strong fit for the user’s requested “set a percentage in settings and let it take effect” behavior because setting updates immediately propagate to `process.env`.
- The frontend currently has no dedicated state or UI for compaction lifecycle status even though the event-driven architecture can support it.
- The backing persistence can still use server settings / env keys, but the user explicitly prefers a typed `Compaction Config` UI (model dropdown, percentage input, optional override field, detailed-log toggle) instead of asking users to enter raw keys manually.
- The user explicitly prefers detailed context/token debugging in logs rather than a live frontend numbers dashboard.
- API/E2E exploration on 2026-04-11 shows that LM Studio native `/api/v1/chat` can disable reasoning for Qwen3.5-style models, but the current `LMStudioLLM -> OpenAICompatibleLLM` `/v1/chat/completions` path does not reliably honor tested reasoning-disable fields.
- Because `OpenAICompatibleLLM` uses the OpenAI Node SDK, the correct LM Studio fix is split: disable the underlying transport idle timeouts, but use a high finite SDK timeout instead of `timeout: 0` because the installed SDK implementation would turn `0` into an immediate abort.
- Because `OllamaLLM` accepts a custom fetch, the runtime can fully disable the same transport idle timeouts for Ollama via a provider-specific long-running fetch wrapper.

## Constraints / Dependencies / Compatibility Facts

- `autobyteus-ts` should stay independently reusable; direct dependence on `autobyteus-server-ts` config classes would be the wrong direction.
- Provider timeout hardening should stay scoped to local providers (LM Studio and Ollama) rather than silently changing transport behavior for cloud-backed providers.
- Reading env-backed settings from `process.env` at runtime is already an accepted pattern in `autobyteus-ts` and is compatible with live updates from `ServerSettingsService`.
- Any compaction lifecycle shown in the frontend will require adding new event types through TS runtime, server normalized event mapping, WebSocket message types, and frontend stream handlers.
- The revised compaction strategy should continue to rely on provider-reported post-response usage as the primary trigger source rather than requiring exact local pre-dispatch tokenizer parity.
- If the implementation needs direct Undici primitives rather than Node's implicit global fetch behavior, `autobyteus-ts` may need an explicit `undici` runtime dependency for a stable provider-local transport helper.
- Because the current server `AgentRunConfig.llmConfig` path becomes provider `extraParams`, a server-global setting is the lowest-risk way to deliver the requested live threshold/model/debug controls in this ticket.
- The user has already approved keeping compaction post-response; the design should not drift into mid-stream interruption work for this ticket.

## Open Unknowns / Risks

- Whether provider-usage fallback estimation should be pulled into this same ticket or left as future hardening.
- The first production summarizer will fail safely and surface the failure; later requests should stay gated by pending compaction until compaction eventually succeeds, while automatic retry policy beyond that remains future hardening if needed.
- A follow-up should likely introduce either LM Studio native REST support or another provider-bound reasoning-control solution before Qwen3.5-style reasoning models are recommended for live compaction smoke tests.
- If the long-stream disconnects persist even after timeout hardening, the remaining cause is likely below the current client wrapper (for example another transport/proxy layer), and that would need a new investigation loop rather than further compaction changes.
- The revised design now locks the compaction unit as block-based `InteractionBlock`s split by explicit `user` and lightweight `tool_continuation` boundary traces; future work may still tune heuristics, but the core boundary contract is no longer open.
- The next quality improvement should focus on typed compacted-memory categories, deterministic filtering, and category-aware snapshot prioritization rather than immediately adding a second LLM pass; the current weakness is memory-shape quality, not the basic fact that compaction only uses one LLM call.

## Notes For Architect Reviewer

- This investigation now supports a concrete design around a real internal compaction summarizer, runtime wiring, server-global operator settings, and end-to-end compaction lifecycle observability.
- The current recommended config boundary is intentionally conservative: use global server settings for threshold/model/override now, expose them through a typed Compaction UI, use logs for detailed budget debugging, and leave finer-grained per-agent/per-run controls as later extension points.
