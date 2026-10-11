# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-012` (revised after CRR-010 F-9; SR-011 after CRR-008 F-6/F-7/F-8; SR-010 after CRR-006 CR-004; SR-009 after ARCH-REV-004: ARCH-005, ARCH-006; SR-008 after CRR-005)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-008 (SR-002 approved 2026-10-09; SR-007 approved and SR-008 explicitly delegated by the user, both 2026-10-11; quotes in Document Status).
- Behavior-defining supplements and their approval references: `supplements/cached-summary-instruction.md`. It holds the normative text of `COMPACTION_SUMMARY_INSTRUCTION` **v5** (SR-008/SR-009) and `COMPACTION_SUMMARY_PROMPT` v6. User-approved/delegated 2026-10-11.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md`
- Authorities read (design reading gate): `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md`, the data-migration checklist (section 2 of `autobyteus-server-ts/docs/design/data_migration_guideline.md`). All were read in full on 2026-10-09. For SR-010, `architecture-design.md`, `design-principles.md` and the repository `DESIGN.md` were re-read in full on 2026-10-11. `design-examples.md` was not used.
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
8. **One nine-heading output contract and normative texts (SR-007, F-2).**
   - `COMPACTION_SUMMARY_HEADINGS` becomes the nine headings: Task and constraints; Requests and instructions received; Decisions and findings; Unverified points and open conflicts; Files created or changed; Completed work; Current state; Open work and next steps; Essential references.
   - `validateCompactionSummaryBody` keeps its rules: exact headings in order, `- ` bullets or `(none)`.
   - `COMPACTION_SUMMARY_INSTRUCTION` and `COMPACTION_SUMMARY_PROMPT` (v6) are set **verbatim** from `supplements/cached-summary-instruction.md`.
   - One parser and one contract serve both paths.
   - **Explained empty section accepted (SR-012, F-9).** In `validateCompactionSummaryBody`, a section counts as empty when its first line starts with `(none` (case-insensitive), followed by `)` or by a space or dash and an explanation. Examples: `(none)`, `(none) — read-only investigation`, `(none — read-only investigation)`. Otherwise the section still needs at least one `-`/`*`/`+` bullet. All other checks are unchanged: no text before the first heading, the nine exact headings in order, and the marker rules. Sonnet 5 explains the legitimately empty "Files created or changed" section on read-only histories in 6 of 6 replies; the bare-`(none)` rule rejected all of them and blocked compaction. Prompt texts are unchanged.
   - **Unwrapped reply accepted (SR-011, F-6).** `parseCompactionSummary(content)`:
     - a reply with exactly one opening and one closing marker is handled as today;
     - a reply with **no** marker at all is passed whole (trimmed) to `validateCompactionSummaryBody`, which already requires the reply to start with the first heading, to have the nine exact headings in order, and bullets or `(none)` under each;
     - anything else (one marker only, two blocks, markers out of order, text before the first heading of an unwrapped reply, a code fence) fails as today.

     The prompts keep asking for the block; the texts do not change. Reasons:
     - Sonnet 5 and DeepSeek wrote complete nine-heading summaries without the markers, and the parser rejected them until compaction blocked.
     - 5 of the 6 rejected replies recorded in round 3 pass the existing body validation unchanged. The sixth wrote `(none — …)` and is rejected on that attempt; the other attempts cover it.
     - Accepting the summary on its own shape works on every model, with no per-model prompt tuning.
     - The markers carry no information when the reply is only the summary. A false accept would need the nine exact headings in order from the first line, which is itself a summary.
9. **System prompt from the request's own messages, for every adapter (SR-007, F-1).**
   - `GeminiLLM` builds `systemInstruction` from `leadingSystemMessages(messages)` (content joined with `\n`, as Anthropic does) instead of `this.systemMessage`. When the request has no leading SYSTEM message, it sends no `systemInstruction`.
   - `GeminiPromptRenderer` keeps skipping SYSTEM messages in `contents`. Late system notes stay out of scope (pre-existing).
   - Applies to both sync and stream paths, Gemini API and Vertex.
   - Normal agent requests carry the same text as today: the leading SYSTEM message is the processed system prompt. System notes carried to the front by compaction now also reach Gemini (accepted).
   - The other adapters already comply (inventory in the investigation notes).
10. **Per-model summary mode (SR-008, F-5).** The cached summary is turned on per model, not per provider.
   - `LLMModel` gets `compactionSummaryMode: 'cached_conversation' | 'transcript'`. Its value comes from the static catalog definition; when absent, and for all dynamic or custom models, it is `'transcript'`.
   - The Anthropic catalog entries (`anthropic-supported-model-definitions.ts`) set `'cached_conversation'`.
   - The DeepSeek catalog entries set `'cached_conversation'` (SR-011, final). The cached notes are accepted 6 of 6 and reuse the cache. Gap A goes to the follow-up Task. Remove the "pending rerun" comment. Gemini and all other models stay `'transcript'`.
   - `ConversationSummaryPort` gets `usesCachedSummary(): boolean`, implemented by `LlmPhaseSummaryPort` from `llm.model.compactionSummaryMode`.
   - `CompactionSummarizer` sends the cached request only when that returns true. Otherwise it goes straight to the transcript request, with the existing attempt budget.
   - No provider names appear in memory or agent code: the model owns the decision, as with `defaultCompactionRatio`.
11. **Output-limit floor for summary requests (SR-008/SR-009/SR-010, F-3, ARCH-005, CR-004).**
   - **Override mechanism.** `LLMInvocationOptions` gets `maxOutputTokens?: number`, a per-request override. `BaseLLM.resolveMaxOutputTokens(options?)` returns `options.maxOutputTokens` when set, and `resolveRequestMaxOutputTokens(model, config)` otherwise. The adapters already call this shared resolver; they pass the invocation options through. Anthropic's non-streaming path honours it too. The agent's own requests never set it.
   - **Rule** (owned by `LlmPhaseSummaryPort`, the same for both summary paths):
     - `R = resolveRequestMaxOutputTokens(model, config)`: the agent's resolved limit, possibly `null`.
     - If `R === null` or `R >= FLOOR` (16,384): no override. The summary uses exactly the agent's limit and reservation, as today.
     - Otherwise: `L = max(R, min(FLOOR, model.maxOutputTokens ?? FLOOR, contextCapacity !== null ? floor(contextCapacity / 4) : FLOOR))`, where `contextCapacity` is the agent's effective context capacity (`resolveLlmRequestCapacity(...).effectiveContextCapacity`). `L` is the **ceiling** of the raised limit and is computed once per port (`resolveSummaryOutputTokenOverride`, unchanged).
     - **Fitted to each request (SR-010, CR-004).** Each summary request, cached or transcript, sends `L_eff = max(R, min(L, room))`, where `room = contextCapacity − E − safetyMarginTokens` and `E` is the estimate of exactly what that request sends:
       - cached: messages + instruction + tool schemas, as `fitsInputBudget` estimates today;
       - transcript: the system prompt + transcript messages, as the transcript input check estimates today.

       When `contextCapacity` is `null`, `room` is unbounded and `L_eff = L`. Because `L ≤ ⌊context ÷ 4⌋` already, this only matters near the end of the context.
   - **Budget (SR-010, replaces "reserve L").** Both paths accept a request with the agent's own input budget, `requestCapacity.inputBudget` (which reserves the agent's output as today):
     - `fitsInputBudget` returns `E ≤ inputBudget`;
     - the transcript check stays `E > inputBudget → input_budget_exceeded`.

     `cachedSummaryInputBudget` (the "reserve L" budget) is removed. An accepted request has `E ≤ context − R − margin`, so `room ≥ R`, and `L_eff ≤ room` whenever `L_eff > R`. Input plus output therefore stays within `context − margin`, the same tolerance as the agent's own requests. (When `config.maxTokens` exceeds the model maximum, the agent reserves less than `R`. `L_eff = R` is then exactly today's request and today's behavior.)
   - **Why not reserve L (the SR-009 rule).** Reserving `L` on the transcript path turns every input in `(context − L − margin, context − R − margin]` into `input_budget_exceeded`, so a compaction that works today is blocked. Leaving the transcript check as it was overflows the context in the same window (CR-004). On the cached path, reserving `L` sends such inputs to the transcript fallback and gives up the cache although the agent's own request fits. Fitting the limit to the room keeps both today's input acceptance and today's minimum output.
   - **Owner.** The port owns the whole rule. It holds `R` and `L` and computes `L_eff` per request from its own estimate. This is one private method used by both request methods, for example `summaryOutputLimit(estimatedInputTokens): number | null`, which returns `null` when there is no override. The summarizer, the `ConversationSummaryPort` interface and the adapters do not change. `maxOutputTokens` stays a plain per-request option.
   - **Why this never makes compaction impossible:**
     - it only raises a *known* limit that is too small;
     - it is never above the model maximum;
     - it is never above a quarter of the context;
     - it is never above the room the request leaves (SR-010);
     - it is never below the agent's own limit;
     - it accepts exactly the inputs the agent's own budget accepts (SR-010).

     Budget-thinking models are safe: when the agent's limit is valid for its thinking budget, raising it keeps it valid, and an unset limit resolves to the model maximum (≥ the floor), so there is no override.
   - **Cache.** The output limit is not part of the cached prompt prefix: on Anthropic, `max_tokens` lies outside system/tools/messages, and thinking budgets come from `extraParams` (`anthropic-llm.ts:160–170`).
   - **Worked examples** (unit-tested):

     | Case | R | Model max | Context | Override L |
     | --- | --- | --- | --- | --- |
     | Opus 5.5, `maxTokens` 1,024 | 1,024 | 128,000 | 1,000,000 | 16,384 |
     | Opus 5.5, no `maxTokens` | 128,000 | 128,000 | 1,000,000 | none |
     | Ollama, no output metadata, no `maxTokens`, `num_ctx` 8,192 | null | null | 8,192 | none (today) |
     | Ollama, `maxTokens` 1,024, `num_ctx` 8,192 | 1,024 | null | 8,192 | 2,048 |
     | Ollama, `maxTokens` 1,024, `num_ctx` 32,768 | 1,024 | null | 32,768 | 8,192 |
     | Sonnet 4.6, budget thinking 20,000, no `maxTokens` | 64,000 | 64,000 | 1,000,000 | none |
     | Sonnet 4.6, `maxTokens` 8,192, budget 4,096 | 8,192 | 64,000 | 1,000,000 | 16,384 (> budget, valid) |
     | DeepSeek scenario, `maxTokens` 1,024 | 1,024 | catalog value | catalog value | min(16,384, model max, context ÷ 4) |

     **Boundary examples (SR-010, CR-004).** These use the default safety margin of 256 and an input estimate `E`; the limit sent is `L_eff`. Each must be unit-tested on the **transcript** path, and one row on the cached path.

     | Case | R | L | Agent input budget | E | room | Limit sent | Result |
     | --- | --- | --- | --- | --- | --- | --- | --- |
     | Ollama, `maxTokens` 1,024, `num_ctx` 8,192 | 1,024 | 2,048 | 6,912 | 4,000 | 3,936 | 2,048 | sent (well inside) |
     | same | 1,024 | 2,048 | 6,912 | 6,500 | 1,436 | 1,436 | sent; 6,500 + 1,436 = 7,936 = context − margin (CR-004 window) |
     | same | 1,024 | 2,048 | 6,912 | 6,912 | 1,024 | 1,024 | sent with today's limit |
     | same | 1,024 | 2,048 | 6,912 | 7,000 | — | — | `input_budget_exceeded`, as today |
     | Ollama, `maxTokens` 1,024, `num_ctx` 32,768 | 1,024 | 8,192 | 31,488 | 26,000 | 6,512 | 6,512 | sent (CR-004 window) |
     | Opus 5.5, `maxTokens` 1,024 (cached path) | 1,024 | 16,384 | 998,720 | 990,000 | 9,744 | 9,744 | cached request sent; under SR-009 it would have dropped to the transcript fallback |
     | Ollama, no `maxTokens`, `num_ctx` 8,192 | null | none | — | any | — | not set | today's request, unchanged |
12. **Instruction v5 (SR-008, F-4/F-5).** `COMPACTION_SUMMARY_INSTRUCTION` = the v5 normative text in `supplements/cached-summary-instruction.md`. It adds:
   - the self-exclusion sentence;
   - "earlier decisions and corrections that still apply";
   - "keep every open doubt";
   - commit hashes and IDs among the references;
   - "do not write names or paths you did not actually see".

   The `COMPACTION_SUMMARY_PROMPT` v6 fallback is unchanged. The durable `assertNoInstructionEcho` test stays.
13. **Remove the compaction-model setting:**
   - server: the config key, parser, settings-service entry and LLM factory;
   - wiring: the backend and provider builders;
   - web: the model UI and its i18n.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..004, REQ-006, REQ-008; AC-001..004, AC-006, AC-008, AC-010 | Compaction trigger at a settled point | Separate uncached summarizer | Cached summary request on the agent's LLM; same-model fallback; plan, validator and commit preserved | DS-001, DS-002 |
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
- Summary format change (SR-007): stored compaction summaries (six-heading) live as plain messages in working contexts and are never re-parsed. The parser runs only on newly generated summaries. So the nine-heading contract needs no transition, and old six-heading summaries stay readable as context (ARCH-REV-003).
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
| Summary instruction text (`COMPACTION_SUMMARY_INSTRUCTION`) | DS-002 | `CompactionSummarizer` | Normative text from `supplements/cached-summary-instruction.md` (**v5**): a handover note in the agent's own voice, covering the conversation from the first user message, without restating system instructions, with the nine headings, the evidence rule, full paths, and requests marked open/done/cancelled | Single versioned prompt source | Prompt drift between paths |
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
| Summary format and parse | `COMPACTION_SUMMARY_PROMPT`, `parseCompactionSummary` | Reuse | Same nine-heading contract; the parser also accepts an unwrapped summary (SR-011) | — |
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
| `autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts` | memory | prompt | `COMPACTION_SUMMARY_INSTRUCTION` (**v5**) and `COMPACTION_SUMMARY_PROMPT` (v6), verbatim from the supplement's two normative blocks; `COMPACTION_SUMMARY_HEADINGS` = nine headings; update the approved fixture and `compaction-summary-prompt.test.ts` |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | llm/api | `GeminiLLM` | `systemInstruction` from `leadingSystemMessages(messages)` (sync + stream); none when absent |
| `autobyteus-ts/src/llm/models.ts`, `supported-model-definition.ts`, `anthropic-supported-model-definitions.ts`, DeepSeek catalog definitions | llm | catalog | `compactionSummaryMode` (default `'transcript'`); Anthropic and DeepSeek `'cached_conversation'` (SR-011) |
| `autobyteus-ts/src/llm/base.ts` + adapters (`anthropic-llm.ts`, `gemini-llm.ts`, `mistral-llm.ts`, `ollama-llm.ts`, `openai-compatible-llm.ts`, `openai-responses-llm.ts`) | llm | `BaseLLM` | `LLMInvocationOptions.maxOutputTokens`; `resolveMaxOutputTokens(options)` |
| `autobyteus-ts/src/memory/compaction/conversation-summary-port.ts`, `compaction-summarizer.ts`, `agent/loop/llm-phase-summary-port.ts` | memory/agent | port/summarizer | `usesCachedSummary()`; summary output-limit floor fitted per request (SR-010); both paths use the agent's input budget |
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

- **Per-model enablement over one rule for all (SR-008).** The cached summary is turned on where it is proven better (Anthropic; DeepSeek if its rerun passes). Other models keep today's transcript summary, so no provider gets worse. Model-specific compression strategies, for example for Gemini, are a follow-up Task. The architecture, the cache correctness and the provider-neutral seams are the same for every model.
- **A per-request output limit, after all.** SR-007 had declined this because it touches every adapter. Since the incomplete-content-block fix, all adapters use one shared resolver, so the override is a small change in a single owner. The F-3 evidence (a permanent `COMPACTION_BLOCKED` at a supported 1,024-token setting) outweighs that cost.

- **Cost premise corrected (SR-007).** The transcript path sends only the older, compacted part, truncated to 2,000 characters per item. Measured on Opus 5.5:

  | History | Transcript path | Cached path |
  | --- | --- | --- |
  | A | $0.08 | $0.12 |
  | B | $0.37 | $0.10 |

  The cached path is roughly the same cost or lower, and its main value is summary quality: the full, untruncated conversation in its original form. The user confirmed continuing (2026-10-11).

- The summary covers the whole conversation, while the kept tail overlaps it (approved). This is simpler and safer than asking the model to stop at a boundary.
- The fallback costs a full-price request when the fork fails, which is rare and preferable to a blocked turn.
- `tool_choice` is unchanged to avoid model-specific cache effects; we rely on the instruction plus the parser.

## Risks

- **OBS-1 (superseded by SR-008 Intended Change 11).** The summary inherits the agent's `max_tokens`. The default is the catalog output limit (128k on Opus 5.5) since the incomplete-content-block fix. A very small agent-configured limit can truncate both summary modes and block compaction. No separate summary limit is added: that would touch every adapter for an edge configuration.
- **Nine-heading contract on non-Anthropic models:** covered by the AC-003 rerun and the AC-008/AC-010 Gemini runs.

- **Large-context fork near the window limit:** the budget check runs first, with the fallback after it.
- **Providers that do not follow the instruction:** the parser rejects the output and the fallback runs. Validate one non-Anthropic provider.
- **Non-streaming limits:** streaming is used for both paths.
- **Remote-session providers (AutoByteus):** compaction-scoped ids are released after each attempt (ARCH-001). For these providers the cached request is effectively a fresh session, so no cache saving is expected; correctness is what matters.
- **Token-usage projection with null latest prompt and the new ingestion kind:** verify in server tests.
- **Summary overlap with the kept tail grows the post-compaction context slightly:** the existing `post_compaction_target_exceeded` validation still applies, and on failure the existing recovery handles it.

## Guidance For Implementation

**SR-012 additions (F-9):**
- `compaction-summary-parser.ts` `validateCompactionSummaryBody`: accept a section whose first line matches `/^\(none(\)|[\s\u2013\u2014-])/i`. Otherwise keep the bullet requirement. Nothing else changes.
- Unit tests:
  - accept `(none)`;
  - accept `(none) — explanation`;
  - accept `(none — explanation)`;
  - accept `(None)`;
  - reject `none` without the parenthesis, `(nonexistent …)`, and a section with prose only;
  - the summarizer accepts the recorded round-4 Sonnet B reply shape.
- API/E2E: rerun Sonnet 5 transcript-only on history B, and on A as a regression check.

**SR-011 additions (F-6, F-7, F-8):**
- `compaction-summary-parser.ts`, `parseCompactionSummary`:
  - when the reply contains neither marker, return `validateCompactionSummaryBody(content)`;
  - all other marker handling is unchanged;
  - `validateCompactionSummaryBody` itself is unchanged.
- `pending-compaction-executor.ts` keeps calling `validateCompactionSummaryBody` on the summary text; nothing changes there.
- Unit tests:
  - an unwrapped valid nine-heading reply is accepted and equals the body;
  - an unwrapped reply with text before the first heading, a missing or reordered heading, or a section with no bullets is rejected;
  - a reply with one marker only is rejected;
  - a fenced reply is rejected;
  - the wrapped cases are unchanged;
  - the summarizer accepts an unwrapped transcript reply on the first attempt.
- Catalog: DeepSeek stays `'cached_conversation'`; drop its "pending rerun" comment.
- No prompt or instruction text changes. `assertNoInstructionEcho` stays.
- API/E2E (AC-003 SR-011 bar): rerun the transcript-only path on Sonnet 5 and DeepSeek, histories A and B. An accepted summary within 3 attempts is required. A quality comparison is not required for these models.

**SR-010 additions (CR-004):**
- `LlmPhaseSummaryPort`:
  - keep `resolveSummaryOutputTokenOverride` (L) as it is, and also hold `R`;
  - add one private per-request limit, `L_eff = max(R, min(L, context − E − margin))`, with no bound when the context is unknown, and `null` when there is no override;
  - both request methods send `maxOutputTokens = L_eff` computed from the estimate of what they send;
  - `fitsInputBudget` goes back to `requestCapacity.inputBudget`; remove `cachedSummaryInputBudget`;
  - the transcript check stays as it is.
- To estimate `E` in the cached request, use the same estimate as `fitsInputBudget`: messages + instruction + tool schemas. The media-sanitized messages may be used; they are never larger.
- Unit tests:
  - every row of the Intended Change 11 boundary table;
  - transcript requests near the limit carry the fitted limit;
  - an input at the agent budget carries R;
  - an input above it gives `input_budget_exceeded`;
  - a cached request between `context − L − margin` and the agent budget is still sent as cached, with the fitted limit;
  - no override → no `maxOutputTokens` on either path.
- Update the existing tests that assert "`fitsInputBudget` reserves L".
- API/E2E's OLR-E2E-010 must assert the REQ-009 limit, not `SUMMARY_CUT_LIMIT` (CR-001 / C-020, API/E2E-owned).

**SR-008 additions:**
- Catalog: add `compactionSummaryMode` to the definition type and to `LLMModel`. Anthropic entries → cached. DeepSeek entries → cached, flipped back to transcript if the SR-008 rerun fails. Everything else defaults to transcript.
- Summarizer and port: `usesCachedSummary()`. Test both branches.
- Output limit:
  - `LLMInvocationOptions.maxOutputTokens`;
  - `resolveMaxOutputTokens(options)` at every adapter call site;
  - request-body unit tests per adapter showing the override wins and agent requests are unchanged;
  - port tests for the floor and the cap (fitted per request since SR-010).
- Instruction: v5 verbatim; update the prompt fixture and test.
- AC-011 live: the 1,024-token DeepSeek compaction scenario succeeds. On Anthropic, the cache read is unchanged with the floor.
- AC-003 rerun with v5: Opus 5.5, one more Anthropic model and DeepSeek. If DeepSeek fails, API/E2E reports back to the Solution Designer. It does not flip the catalog value itself (ARCH-REV-004).
- AC-011 unit cases: every row of the Intended Change 11 worked-examples table.


**SR-007 additions:**
- Copy both texts verbatim from `supplements/cached-summary-instruction.md`.
- Update `COMPACTION_SUMMARY_HEADINGS`, the parser tests and the prompt fixture to the nine headings.
- Gemini: unit-test the request bodies (sync and stream; API and Vertex):
  - a leading SYSTEM message becomes `systemInstruction`;
  - a normal agent request has the same `systemInstruction` text as before;
  - with no SYSTEM message there is no `systemInstruction`;
  - the transcript fallback request carries `COMPACTION_SUMMARY_PROMPT`.
- AC-003 rerun: on histories A and B with the new texts; the pass conditions are in requirements AC-003.
- AC-010: a live Gemini fallback run.


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
