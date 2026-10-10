# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (revised for ARCH-REV-001: ARCH-001, ARCH-002, ARCH-003)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-002, approved by the user on 2026-10-09 (quotes in Document Status).
- Behavior-defining supplements and their approval references: None (probe evidence only).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md`
- Authorities read (design reading gate): `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md`, the data-migration checklist (section 2 of `autobyteus-server-ts/docs/design/data_migration_guideline.md`). All were read in full earlier in this conversation on 2026-10-09 and are not re-read, as the skill allows. `design-examples.md` was not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

Compaction lifecycle (`PendingCompactionExecutor.executeIfAuthorized`):
1. gate;
2. baseline;
3. `WorkingContextMessageWindowPlanner.plan` (compactable prefix, retained recent suffix, protected suffix);
4. `CompactionContentBuilder.build(compactableUnits)`, which renders a text transcript with each item truncated;
5. `createCompressionStrategy(execution).compress(content)`;
6. `validateCompactionSummaryBody`;
7. `prepareCompaction(baseline, {retainedMessages, summary})`;
8. validator;
9. commit.

It runs at two settled points:
- `before_parent_request`, from `LLMRequestAssembler.prepareRequest` on independent turns only;
- `after_final_response`, from `LlmPhase` after a final answer.

The strategy comes from `EnabledMemoryCompactionConfiguration.createCompressionStrategy`. The server injects it in `autobyteus-agent-run-backend-factory.ts` as `new DirectLlmCompressionStrategy(compactionLlmFactory, execution)`:
- `compactionLlmFactory` (`agent-execution/compaction/compaction-llm-factory.ts`) creates a **new LLM** each attempt.
- That LLM uses the Settings value `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` (`config/compaction-model-settings.ts`, `server-settings-service.ts`, web `CompactionModelSettings.vue` inside `CompactionConfigCard.vue`), or the parent model.
- It gets the summary system prompt, its own `maxTokens`, and filtered overrides.
- The call is `sendMessages([SYSTEM prompt, USER transcript])`: no cache scope, 3 attempts.

Nothing is reused from the prompt cache.

Compaction usage is captured in `CompactionExecutionMetadata.usage` but never emitted as a token-usage event (BEH-003).

Delivered context (`anthropic-prompt-caching`):
- Conversation requests are `llm.streamMessages(outboundMessages, {logicalConversationId, tools}, {promptCacheScope:'conversation', …})`.
- `prepareRequest` runs compaction **before** the prefix guard (`bindRetainedReasoningToRequestPrefix(digest(leadingSystem, tools))`).
- Outbound messages are `sanitizeMediaInputMessages(context, capabilities)`.
- Provider-native data is opaque to agent and memory.

The live probe shows the cached summary request works: fork read 9.4k–10.9k vs 8.3k uncached, no tool calls, valid summaries.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - core `autobyteus-ts` (memory/compaction: summarizer, executor, configuration contract; agent: assembler ordering, `LlmPhase` request port and metering);
  - server `autobyteus-server-ts`: remove the compaction LLM factory, the settings key and config, and the backend/provider-builder wiring;
  - web `autobyteus-web`: remove the compaction-model settings UI and its i18n;
  - tests across the three packages;
  - docs.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - It changes the approved compaction design and the shared `EnabledMemoryCompactionConfiguration` contract (the server-injected strategy factory is removed).
  - It interacts with Anthropic's enforced preserved-thinking contract (the fork replays kept thinking).
  - It removes a persisted user setting.
- Escalation trigger if implementation or validation discovers new impact:
  - a compaction caller outside `LlmPhase`/`LLMRequestAssembler`;
  - any other consumer of `createCompressionStrategy` or of `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`, such as applications, team runtime or the message gateway;
  - a non-streaming provider limit hit by the agent's own `maxTokens`;
  - any 400 during a fork in validation;
  - a token-usage projection that rejects compaction events.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live probe | `probes/fork-summary-probe-result.json` | Fork: 9,423 read / 4 uncached, valid summary, 0 tool calls. Separate summarizer: 8,279 uncached | Cached summary request | Large contexts and other providers → validation |
| Code: lifecycle | `pending-compaction-executor.ts`, planner, content builder | Planner and validator are independent of the strategy | Keep plan, validator and commit unchanged | — |
| Code: injection | `memory-compaction-configuration.ts`; server `autobyteus-agent-run-backend-factory.ts`, `agent-provider-factory-builder.ts`, `create-process-agent-provider-factory-builder.ts`, `compaction-llm-factory.ts` | The strategy factory and LLM factory are server-injected only to pick the model | Core owns the summarizer; remove injection | — |
| Code: settings | `config/compaction-model-settings.ts`, `server-settings-service.ts:119,308`, web `CompactionModelSettings.vue`, `utils/compactionModelSettings.ts`, `CompactionConfigCard.vue:40-43` | The model setting is isolated from the other compaction settings | Remove the model setting only | — |
| Code: request path | `llm-request-assembler.ts`, `llm-phase.ts` (delivered) | Guard after compaction; tools from `LlmPhase`; sanitize in the assembler | Guard before compaction; shared request construction | — |
| Code: metering | `llm-phase.ts` `notifyAgentTokenUsageUpdated`; server `TokenUsageIngestionKind` is an open string | No compaction events | Emit per-attempt compaction usage | Server projection with null latest prompt → verify |
| Code: sites | `compaction-recovery.ts`; `llm-phase.ts` after-final site | Both run with the agent's LLM idle and the history settled | Reuse the agent's LLM (ASM-001 confirmed) | — |

## Intended Change

1. **Core-owned summarizer.**
   - Compaction no longer gets a strategy factory from the server.
   - The core `CompactionSummarizer` produces the summary through a `ConversationSummaryPort` that the agent loop provides. The port carries the agent's own LLM, tools and request construction.
2. **Cached summary first.** The summarizer sends the compaction baseline conversation, built exactly like the agent's conversation requests, plus one appended summary instruction message, with `promptCacheScope: 'conversation'`.
3. **Same-model fallback.** If the cached request does not fit the context window, or gives no valid summary after 2 attempts, the summarizer sends today's request on the agent's own LLM: the summary prompt as system plus the rendered compactable transcript, no cache scope, up to 3 attempts.
4. **Prefix guard before compaction.** `prepareRequest` binds retained reasoning to the current request prefix before compaction, so the fork never replays thinking under a changed prefix. It still binds again after compaction.
5. **Compaction request isolation (ARCH-001).** Every summary attempt, cached or transcript, uses its own conversation id `compaction_<operationId>_<attempt>`, never the agent id. After the attempt the port releases that id through a new provider-neutral `BaseLLM.releaseConversation(id, {signal})`, bounded to 10 s as today's cleanup. The default is a no-op; `AutobyteusLLM` overrides it to call `AutobyteusClient.cleanup(id)` and drop the id from `usedConversationIds`. The agent's own LLM is never cleaned up by compaction. API providers ignore the id (`INTERNAL_PROVIDER_REQUEST_KWARG_KEYS`), so cache reuse is unaffected, and agent/memory need no provider branch.
6. **One provider call per attempt (ARCH-003).** Both port requests pass `retryMode: 'single_attempt'`, as today, so the attempt budget and metering stay exact.
7. **Compaction metering.** Each summary attempt's usage is emitted as a token-usage event of the agent run (`ingestion_kind: 'autobyteus_compaction'`).
8. **Remove the compaction-model setting:**
   - server: the config key, parser, settings-service entry and LLM factory;
   - wiring: the backend and provider builders;
   - web: the model UI and its i18n.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..004, REQ-006; AC-001..004, AC-006, AC-008 | Compaction trigger at a settled point | Separate uncached summarizer | Cached summary request on the agent's LLM; same-model fallback; plan, validator and commit preserved | DS-001, DS-002 |
| BEH-002 | User | REQ-005; AC-005 | Settings → Compaction | Model choice | Removed | DS-004 |
| BEH-003 | System | REQ-007; AC-007 | Compaction attempt | Not metered | Metered | DS-003 |
| BEH-004 | Contract | REQ-006; AC-006 | Preserved thinking | Guard after compaction | Guard before **and** after compaction | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/fork-summary-probe.mjs` + result + `probes/compaction-prompt.txt` | Feasibility, cost, quality; validation recipe | REQ-001, REQ-003 | Basis for the cached summary request | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` + `Refactor` + cost `Performance`.
- Current design issue found: `Yes`.
- Structural triggers that fire, each with evidence:
  - **Ownership.** The summarizer's model selection is injected from the server through two factories (`createCompressionStrategy`, `compactionLlmFactory`). Their only purpose is to choose a model and build a new LLM. The agent loop already owns the agent's LLM, tools and request construction. → Make the summary request an agent-provided port, and make the summarizer core-owned.
  - **Legacy cleanup.** The compaction-model setting can never use the cache and is removed by user decision. → Remove it end to end.
  - **Duplicated policy.** The fork needs exactly the agent's request construction (sanitized messages, tools, cache scope). → The port reuses `LlmPhase`'s construction; the fork does not rebuild it.
  - **Not fired:** empty indirection. The port owns a real boundary between memory/compaction and the agent's LLM.
- Root cause classification: `Boundary Or Ownership Issue` (summarizer LLM chosen outside the owner of the conversation) and `Missing Invariant` (the summary never reuses the cached conversation).
- Refactor needed now: `Yes`.
- Evidence: Current-State Read.
- Design response: Intended Change 1–6.
- Refactor rationale: a cached summary needs the agent's exact request. Building it from a server-created LLM would duplicate or bypass the agent's request owner.
- Intentional deferrals and residual risk:
  - Anthropic server-side compaction is out of scope.
  - The summary covers the whole conversation while the recent tail stays word for word (DEC-002), so there is some overlap by design.

## Terminology

- **Cached summary request (fork):** the agent's conversation request for the current settled history, unchanged, plus one appended summary instruction message, sent as a conversation request.
- **Transcript summary request (fallback):** today's request (summary system prompt plus rendered compactable transcript) on the agent's own LLM.
- **ConversationSummaryPort:** the agent-provided capability to send these requests and report their usage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed:
  - `EnabledMemoryCompactionConfiguration.createCompressionStrategy` and the `CompressionStrategyFactory` type, so `createEnabledMemoryCompactionConfiguration(policy)` takes only the policy;
  - `DirectLlmCompressionStrategy`, replaced by `CompactionSummarizer`;
  - `CompactionLlmFactory`;
  - server: `agent-execution/compaction/compaction-llm-factory.ts`, `config/compaction-model-settings.ts`, the `COMPACTION_MODEL_SETTINGS_KEY` entries in `server-settings-service.ts`, and the `compactionLlmFactory` dependencies in `agent-provider-factory-builder.ts`, `create-process-agent-provider-factory-builder.ts` and `autobyteus-agent-run-backend-factory.ts`;
  - web: `components/settings/CompactionModelSettings.vue`, `utils/compactionModelSettings.ts`, the model-settings parts and i18n keys of `CompactionConfigCard.vue` (e.g. `invalidModelSettings`);
  - affected tests.
- No dual path. The transcript request is not an alternative mode; it is only the recovery path of the one summarizer.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: the server setting `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` (a JSON string in the server config store, written by `config.setDurably`). It is one small value, possibly absent.
- Change: the key is no longer read, written or listed.
- Normal reader/writer behavior: after the change, no code reads the key. A leftover value stays inert in the config store.
- Required semantics: none. Compaction always uses the agent's model (approved).
- Decision: `Directly Usable — No Migration`, because an inert leftover key is tolerated. Compaction output and working-context snapshots: `Not Affected`. Usage events: new rows through the existing pipeline; schema `Not Affected`.
- Rationale: there is no meaning to preserve, and deleting the value has no benefit. The data-migration guideline prefers tolerant readers. If the settings page lists unknown keys generically, the implementer verifies the leftover is not shown as an editable compaction setting, or hides it there. Data-migration checklist:
  1. No migration.
  2. Startup unaffected.
  3. Source: the optional config key.
  4–7. N/A.
  8. None.
  9. Server test with a saved value.
  10. Guideline § tolerant readers.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | Compaction gate authorized at a settled point | Committed compacted context | `PendingCompactionExecutor` (lifecycle), `CompactionSummarizer` (summary), `LlmPhase` port (requests) | Cost path |
| DS-002 | Bounded Local | BEH-001 | `CompactionSummarizer.summarize` | Validated summary body | `CompactionSummarizer` | Fork → fallback sequencing |
| DS-003 | Return-Event | BEH-003 | Summary attempt usage | Token Meter | port → notifier → server pipeline | Metering |
| DS-004 | Primary End-to-End | BEH-002 | Settings page | No compaction-model option | web + server settings | Removal |

## Primary Execution Spine(s)

- DS-001:
  ```
  LlmPhase / LLMRequestAssembler (settled point)
    -> prefix guard (bind to the current request prefix)
    -> PendingCompactionExecutor
         (gate -> baseline -> plan -> transcript content)
    -> CompactionSummarizer.summarize({ baselineMessages, transcriptContent })
    -> ConversationSummaryPort.requestCachedSummary(baselineMessages, instruction)
    -> BaseLLM.streamMessages(sanitized messages + instruction,
         {logicalConversationId, tools}, {promptCacheScope:'conversation'})
    -> provider (cache read)
    -> validated summary
    -> prepareCompaction -> validator -> commit
    -> prefix guard (rebind)
  ```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | At a settled point the request prefix is bound first; if tools or system changed, prefix-bound reasoning is removed once. The executor then captures the baseline and plans the keep-tail split as today. It also builds today's transcript content (used only for the fallback). The summarizer asks the agent's port for a cached summary of the whole baseline conversation. The port sends the agent's own request for those messages, with the agent's tools and settings, plus the instruction, as a conversation request; the provider reads the prefix from cache. The summary is parsed and validated, then committed as today with the planned retained messages. | Settled point, baseline, plan, summary, compacted context | Executor / summarizer / `LlmPhase` | Instruction text, budget check, metering |
| DS-002 | `summarize`: if the cached request would not fit the input budget (prompt estimate plus the output reservation of the agent LLM's `maxTokens`) → transcript path. Otherwise up to 2 cached attempts; any attempt whose text has no valid summary block (including tool calls or a task answer) counts as failed. After 2 failures → transcript path, up to 3 attempts (today's delays and abort). Each attempt is observed with metadata and usage. | Attempts | `CompactionSummarizer` | `parseCompactionSummary` |
| DS-003 | Each attempt's usage is emitted by the port through the agent notifier as `TOKEN_USAGE_UPDATED`. Fields: `llm_call_id = ${executionTurnId}:compaction:${operationId}:${attempt}`, `ingestion_kind: 'autobyteus_compaction'`, `runtime_kind: 'autobyteus'`, the same usage observation fields as `LlmPhase` (cache read/write included), and `latest_prompt_tokens`/`context_window_usage_percent` null (the context-fill bar stays driven by agent calls). | Usage | port | notifier |
| DS-004 | Settings show only the remaining compaction settings; the server neither lists nor accepts the removed key. | Settings | web/server | i18n |

## Spine Actors / Main-Line Nodes

`LlmPhase`, `LLMRequestAssembler`, `PendingCompactionExecutor`, `CompactionSummarizer`, `ConversationSummaryPort` (implemented by `LlmPhase`), `BaseLLM` / provider adapter, `MemoryManager`.

## Ownership Map

- **`LlmPhase`** owns the agent's LLM, tools and conversation request construction. It now also implements the `ConversationSummaryPort`, giving the executor a narrow capability rather than its internals.
- **`LLMRequestAssembler`** owns request assembly order. It now binds the prefix before compaction as well as after.
- **`PendingCompactionExecutor`** owns the compaction lifecycle (gate, baseline, plan, validate, commit, recovery, status) and calls the summarizer. It is unchanged apart from the summarizer input.
- **`CompactionSummarizer`** (`memory/compaction/`, new) owns summary production: the fork-then-fallback order, attempts, the budget check, the instruction text, parsing and attempt observation. It is provider-neutral and uses only the port.
- **The provider adapter** owns caching and rendering (unchanged).
- **Server and web** no longer own any compaction model choice.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ConversationSummaryPort` | `LlmPhase` | Gives compaction the agent's request capability without exposing the LLM, notifier or tools | Compaction policy, summary parsing |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `DirectLlmCompressionStrategy`, `CompactionLlmFactory`, `CompressionStrategy`/`CompressionStrategyFactory` types | The summarizer no longer picks or creates an LLM | `CompactionSummarizer` + `ConversationSummaryPort` | In This Change | Export updates in `memory/index.ts` |
| `EnabledMemoryCompactionConfiguration.createCompressionStrategy`; second param of `createEnabledMemoryCompactionConfiguration` | Server no longer injects | `createEnabledMemoryCompactionConfiguration(policy)` | In This Change | `copyMemoryCompactionConfiguration` updated |
| Server `compaction-llm-factory.ts`, `config/compaction-model-settings.ts`, settings-service entries (`:24-26`, `:119-120`, `:308`) | Setting removed | — | In This Change | — |
| Server wiring `compactionLlmFactory` in `agent-provider-factory-builder.ts`, `create-process-agent-provider-factory-builder.ts`, `autobyteus-agent-run-backend-factory.ts` | Same | — | In This Change | — |
| Web `CompactionModelSettings.vue`, `utils/compactionModelSettings.ts`, model-settings parts and i18n in `CompactionConfigCard.vue` | Same | — | In This Change | Keep ratio, override and debug toggle |
| Tests targeting removed items | Same | New summarizer/port/settings tests | In This Change | — |
| Docs describing a compaction model setting / Direct strategy | Obsolete | Updated docs | In This Change | `autobyteus-ts/docs/agent_memory_design.md` (compaction), server docs on settings if present |

## Return Or Event Spine(s) (If Applicable)

DS-003.

## Bounded Local / Internal Spines (If Applicable)

DS-002 (above). Also `prepareRequest`:
```
ensure system
  -> protocol safety
  -> prefix guard
  -> compaction (independent turns only)
  -> prefix guard (rebind)
  -> recovery snapshot
  -> append input
  -> protocol safety
  -> build package
```

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Summary instruction text (`COMPACTION_SUMMARY_INSTRUCTION`) | DS-002 | `CompactionSummarizer` | `COMPACTION_SUMMARY_PROMPT` + fork suffix (summarize the whole conversation above; do not restate the system instructions, which remain in place; do not call tools or continue the task; reply only with the summary block) | Single versioned prompt source | Prompt drift between paths |
| Input-budget check | DS-002 | `CompactionSummarizer` via port | `estimateMessagesTokens(baseline + instruction)` + tool overhead + the output reservation ≤ the agent model's request capacity (`resolveLlmRequestCapacity`, whose input budget already excludes the output reservation) | Fits the window | — |
| Compaction conversation id + release | DS-002 | port | Unique id per attempt; `releaseConversation` after the attempt (bounded, best-effort, logged like today) | Never touch the agent's provider session; no session leak | Using the agent id posts into the agent's remote session (AutoByteus) |
| Usage emission | DS-003 | port | Token-usage event per attempt | Meter | Emitting from memory would couple memory to the notifier |

## Ownership Boundaries

- Memory/compaction never touches the LLM, the tools or the notifier directly; it uses `ConversationSummaryPort`.
- The agent loop never decides compaction policy; it only executes requests for compaction.
- Provider adapters are unchanged.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ConversationSummaryPort` | `llmInstance`, tool schemas, sanitization, cache scope, notifier | `CompactionSummarizer` | Compaction holding `BaseLLM` or creating LLMs | Add a port method |
| `PendingCompactionExecutor` | Lifecycle | `LLMRequestAssembler`, `LlmPhase` | Callers invoking the summarizer directly | — |

## Dependency Rules

- `memory/compaction/**` must not import `agent/**`, `llm/api/**` or server code. It may import `llm/utils` types (`Message`, `CompleteResponse`, usage observation) and its own parser and prompt.
- `agent/loop/llm-phase.ts` implements the port and passes it to `PendingCompactionExecutor`.
- The server must not reference compaction strategies or compaction models.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `ConversationSummaryPort` (methods below) | Agent request capability for compaction | Send and report | Explicit inputs | `executionTurnId`, `operationId` and `attempt` are used for usage identity |
| `CompactionSummarizer.summarize({ baselineMessages, transcriptContent, operationId, executionTurnId, signal, observe })` | Summary production | Fork → fallback | — | Returns the validated summary body |
| `PendingCompactionExecutorOptions.summaryPort: ConversationSummaryPort` (replaces `createCompressionStrategy`) | Lifecycle input | — | — | Test seam: inject a fake port |
| `createEnabledMemoryCompactionConfiguration(policy)` | Configuration | Policy only | — | — |
| `BaseLLM.releaseConversation(conversationId: string, options?: {signal?: AbortSignal}): Promise<void>` | One provider-side conversation of this LLM | Release a single conversation's provider-side state without cleaning up the LLM | Conversation id | Default no-op; `AutobyteusLLM` override |

`ConversationSummaryPort` methods:
- `requestCachedSummary(messages: Message[], instruction: string, identity, signal): Promise<SummaryAttemptResult>`
- `requestTranscriptSummary(systemPrompt: string, content: string, identity, signal): Promise<SummaryAttemptResult>`
- `fitsInputBudget(messages: Message[], extraText: string): boolean`

`SummaryAttemptResult = { content: string; hasToolCalls: boolean; completion: CompleteResponse['completionStatus']; metadata: CompactionExecutionMetadata }`.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `ConversationSummaryPort` | Yes | Yes | Low | — |
| `CompactionSummarizer` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Summary producer | `CompactionSummarizer` | Yes | Low | — |
| Agent capability | `ConversationSummaryPort` | Yes | Low | — |
| Requests | `requestCachedSummary` / `requestTranscriptSummary` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| Agent request construction | `LlmPhase` stream call, `sanitizeMediaInputMessages`, `request.tools` | Reuse via port | Byte-identical prefix | — |
| Summary format and parse | `COMPACTION_SUMMARY_PROMPT`, `parseCompactionSummary` | Reuse | Contract unchanged | — |
| Transcript content | `CompactionContentBuilder` | Reuse (fallback only) | — | — |
| Metering | `notifyAgentTokenUsageUpdated` | Reuse | — | — |
| Summarizer | — | Create `CompactionSummarizer` | Replaces Direct strategy | Direct strategy is tied to LLM creation |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Summarizer, port type, executor, configuration | DS-001, DS-002 | Modify / Create |
| `autobyteus-ts/src/agent` | Port implementation, metering, assembler order | DS-001, DS-003 | Modify |
| `autobyteus-server-ts` | Removal of model setting and wiring | DS-004 | Remove |
| `autobyteus-web` | Removal of model UI | DS-004 | Remove |

## Draft File Responsibility Mapping

As final.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Conversation request construction (messages sanitize + kwargs + options) | Private helper in `llm-phase.ts` (or `agent/loop/conversation-request.ts` if `llm-phase.ts` would exceed the file-size limit), used by the normal call and the port | agent | Fork prefix must equal normal requests | Yes | Yes | A second request builder |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `SummaryAttemptResult` | Yes | Yes | Low | — |
| `CompactionExecutionMetadata` (existing) | Yes | Yes | Low | Add `mode: 'cached' \| 'transcript'` for status/diagnostics |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concern |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/compaction-summarizer.ts` (new) | memory | `CompactionSummarizer` | Fork → fallback, attempts, budget, parse, observe |
| `autobyteus-ts/src/memory/compaction/conversation-summary-port.ts` (new) | memory | contract | `ConversationSummaryPort`, `SummaryAttemptResult` |
| `autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts` | memory | prompt | Add `COMPACTION_SUMMARY_INSTRUCTION` (prompt + fork suffix); update the approved fixture/test |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | memory | executor | Take `summaryPort`; call the summarizer with baseline messages + transcript content |
| `autobyteus-ts/src/memory/compaction/compaction-execution.ts` | memory | types | Remove the factory-based execution input if unused; add `mode` to metadata |
| `autobyteus-ts/src/memory/compaction/memory-compaction-configuration.ts`, `memory/index.ts` | memory | config | Policy-only configuration; exports |
| `autobyteus-ts/src/memory/compaction/direct-llm-compression-strategy.ts`, `compression-strategy.ts` | memory | — | Delete |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` (+ optional `agent/loop/conversation-summary-port-impl.ts`) | agent | `LlmPhase` | Port implementation (cached and transcript requests via `streamMessages`, collecting text, tool-call flag and usage; budget via `resolveLlmRequestCapacity`); per-attempt usage events; bind before the after-final compaction |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | agent | assembler | Guard before and after compaction |
| `autobyteus-ts/src/llm/base.ts` | llm | `BaseLLM` | Add `releaseConversation` (default no-op) |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | llm/api | `AutobyteusLLM` | Override `releaseConversation`: `client.cleanup(id)` if the id was used, then remove it from `usedConversationIds` |
| Server files listed in Removal | server | — | Delete or modify |
| Web files listed in Removal | web | — | Delete or modify |

## Applied Patterns (If Any)

**Port** (dependency inversion): memory/compaction defines `ConversationSummaryPort`; the agent implements it.

## Target Subsystem / Folder / File Mapping

Existing folders only; two new files in `memory/compaction/`, and optionally one in `agent/loop/`.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `memory/compaction/` | Main-line domain | Yes | Low | Existing |
| `agent/loop/` | Main-line control | Yes | Low | Existing |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Cached summary request | `streamMessages([...sanitize(baseline), {role:user, content: COMPACTION_SUMMARY_INSTRUCTION}], {logicalConversationId: 'compaction_<operationId>_<attempt>', tools}, {promptCacheScope:'conversation', retryMode:'single_attempt', signal, turnId: executionTurnId})`, then `releaseConversation('compaction_<operationId>_<attempt>')` | A new LLM with its own config; `tool_choice: none` (model-specific cache effect); changing thinking or effort | The prefix must be identical |
| Fallback | `streamMessages([SYSTEM COMPACTION_SUMMARY_PROMPT, USER transcript], {logicalConversationId: 'compaction_<operationId>_<attempt>'}, {retryMode:'single_attempt', signal})` on the agent's LLM, then `releaseConversation(...)` | A configured other model | One model |
| Ordering | Guard → compaction → guard | Compaction → guard (fork could replay thinking under changed tools → 400) | Preserved thinking |
| Usage | `llm_call_id: turn_0007:compaction:op_12:1`, `ingestion_kind: autobyteus_compaction`, `latest_prompt_tokens: null` | Hiding compaction cost | Meter = Console |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the compaction-model setting as an advanced option | Flexibility | Rejected (user decision) | Always the agent's model |
| Keep `createCompressionStrategy` injection for tests or custom strategies | Fewer changes | Rejected | Test seam via a fake `ConversationSummaryPort` |
| Delete the saved setting value at startup | Cleanliness | Rejected | An inert leftover is tolerated |
| `tool_choice: none` on the fork | Prevent tool calls | Rejected | Instruction + parser + fallback (tool_choice cache effects are model-specific) |
| Anthropic server-side compaction | Provider feature | Out of scope | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Core: add `conversation-summary-port.ts`, `compaction-summarizer.ts` and the instruction constant (+ fixture).
2. Core: switch `PendingCompactionExecutor` to `summaryPort`; make the configuration policy-only; delete the Direct strategy and its factory types; update exports.
3. Core: implement the port in `LlmPhase`, reusing the conversation request construction, with usage events. Pass the port to the executor. Bind the prefix before the after-final compaction.
4. Core: in the assembler, guard before and after compaction.
5. Server: remove the factory, settings and wiring; build the configuration with the policy only.
6. Web: remove the model UI and i18n.
7. Tests (Guidance); docs; live validation.

## Key Tradeoffs

- The summary covers the whole conversation, while the kept tail overlaps it (approved). This is simpler and safer than asking the model to stop at a boundary.
- The fallback costs a full-price request when the fork fails, which is rare and preferable to a blocked turn.
- `tool_choice` is unchanged to avoid model-specific cache effects; we rely on the instruction plus the parser.

## Risks

- **Large-context fork near the window limit:** the budget check runs first, with the fallback after it.
- **Providers that do not follow the instruction:** the parser rejects the output and the fallback runs. Validate one non-Anthropic provider.
- **Non-streaming limits:** streaming is used for both paths.
- **Remote-session providers (AutoByteus):** compaction-scoped ids are released after each attempt (ARCH-001). For these providers the cached request is effectively a fresh session, so no cache saving is expected; correctness is what matters.
- **Token-usage projection with null latest prompt and the new ingestion kind:** verify in server tests.
- **Summary overlap with the kept tail grows the post-compaction context slightly:** the existing `post_compaction_target_exceeded` validation still applies, and on failure the existing recovery handles it.

## Guidance For Implementation

Unit tests:
- **Summarizer:**
  - cached success (one port call; message list = baseline + instruction);
  - cached failure twice (invalid block, tool calls) → transcript success;
  - budget overflow → transcript directly;
  - all failures → `CompactionInvocationError` as today;
  - abort.
- **Isolation and attempts (ARCH-001, ARCH-003):** with a fake `AutobyteusLLM` client, each attempt uses `compaction_<op>_<n>` (never the agent id), the client receives `cleanup` for exactly that id after the attempt, and the agent LLM's `cleanup` is not called. `releaseConversation` timeout is bounded. Both port requests pass `retryMode: 'single_attempt'`. The `BaseLLM` default `releaseConversation` is a no-op.
- **Port** (`LlmPhase`):
  - the cached request uses the same sanitized messages, tools and `promptCacheScope: 'conversation'` as the normal call: compare with a normal request built from the same context;
  - the transcript request has no scope and no tools;
  - usage events carry the call id format, `ingestion_kind`, cache fields and null latest prompt.
- **Assembler:** guard before compaction (tools changed → thinking stripped before the baseline is captured) and after.
- **Executor:** plan, validator and commit unchanged with the fake port.
- **Configuration:** policy-only.
- **Server:** no compaction-model key in settings listing or validation; a saved value is ignored; backend wiring builds compaction with the policy only; token-usage ingestion of `autobyteus_compaction` events (cost priced with cache components).
- **Web:** Compaction card without model settings; the remaining controls still save.
- **Prompt fixture:** instruction constant.

Live validation (API/E2E, test vault): reuse `probes/fork-summary-probe.mjs` as a recipe.
- Anthropic Opus 5.5: a native run that reaches compaction (lower the trigger ratio for the test). The summary call's `cache_read_input_tokens` must be ≥ 90 % of its input under the strict preserved-thinking check (`"error"`). The run continues after compaction, and the meter shows the compaction call.
- One non-Anthropic native provider: compaction succeeds through the cached request or the fallback.
- Desktop: the Settings card has no model option; the user verifies the meter.
