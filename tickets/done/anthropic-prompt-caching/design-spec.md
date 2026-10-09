# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-005. SR-003 was approved by the user on 2026-10-09; SR-004 by explicit user delegation. SR-005 (provider-boundary refactor, REQ-013) was approved by explicit user instruction on 2026-10-09: "If you think the refactoring will make it better, do it … Update your design."
- Behavior-defining supplements and their approval references: None (probe files are evidence only).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-09):
  - `references/architecture-design.md`, `design-principles.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/DESIGN.md`
  - data-migration checklist, section 2 of `autobyteus-server-ts/docs/design/data_migration_guideline.md`
  - claude-api skill `shared/prompt-caching.md` and `shared/model-migration.md` (preserved thinking)
  - `design-examples.md` was not used.
- Project design-principle conflicts or discrepancies: None.
- Review history: ARCH-REV-001 (Fail) and ARCH-REV-002 (Pass) reviewed SR-004. SR-005 changes the structure, so it needs a new review. The SR-004 design is kept at `design-spec.sr004.bak.md`.
- In-flight implementation: the implementation engineer stopped at SR-004 step 7, with work uncommitted in the worktree. § Change / Refactor Sequence states which parts carry over.

## Current-State Read

How a native agent turn (standalone or team member) works today:

1. `LlmPhase.run` (`agent/loop/llm-phase.ts`) builds the tool schemas. `ToolSchemaProvider` reads the shared registry on every request.
2. It creates an `LLMRequestAssembler` with the renderer taken from `(llmInstance as any)._renderer ?? new OpenAIChatRenderer()`.
3. `prepareRequest` then:
   - ensures the system message;
   - on every independent turn calls `MemoryManager.resetAnthropicSignedHistory()` (the per-turn strip, BEH-005);
   - runs compaction;
   - captures the recovery snapshot;
   - appends the input;
   - **renders a `renderedPayload` with that renderer**.
4. `LlmPhase` calls `llm.streamMessages(messages, renderedPayload, kwargs{logicalConversationId, tools}, options)`.
5. `BaseLLM` passes `renderedPayload` only to the extension `beforeInvoke` hooks. No production extension exists; only tests subclass `LLMExtension`.
6. `AnthropicLLM` ignores the payload and **renders again**. It merges every SYSTEM message, late interruption notes included, into the top-level `system` (BEH-007). It sends no `cache_control` (BEH-001).

Provider-specific rules sit in generic code:

- `llm/utils/provider-native-assistant-turn.ts` is Anthropic-only code in a generic folder. It holds the `AnthropicAssistantTurn` type, its parser, `withoutThinkingBlocks`, `withoutAnthropicThinkingInMessage` and `assertAnthropicTurnMatchesToolCalls`.
- It is imported by:
  - `memory/memory-manager.ts` (ingest validation, metadata key, reset);
  - `memory/compaction/accepted-compaction-builder.ts` (keep-tail strip);
  - `memory/compaction/working-context-compaction-output-validator.ts` (no stale thinking);
  - `agent/loop/llm-phase.ts` (type);
  - `llm/utils/response-types.ts` (field typed `AnthropicAssistantTurn`).
- The validator also has its own `takeLeadingSystemMessages`, duplicating the adapter's notion of the leading system run.

Precedent for the target: per-tool-call `nativeToolCallContext` (`llm/utils/tool-call-delta.ts`) is already a provider-tagged union (gemini, anthropic, mistral, ollama, openai_responses). Memory stores it **without interpreting it**, and only renderers read it. The Anthropic whole-turn object is the only provider data memory interprets.

Stored data: `message.metadata.provider_native_assistant_turn = { provider: 'anthropic', blocks: [...] }`. It is already provider-tagged.

Other facts:
- The prefix inputs are re-derived on every request. Tools can change through Settings or a schema reload, and restore rebuilds them (SR-004).
- With kept thinking, a changed `tools` list returns a 400 (probe P2). Removing all thinking once is accepted (P3). Sending the system prompt as a string or as a block array is equivalent (P1).
- `LlmPhase` and `LLMRequestAssembler` are rebuilt for every call. A restored run gets a new `MemoryManager` (`agent-factory.ts:130`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - the caching feature (SR-004 scope);
  - a structural refactor across three subsystems of `autobyteus-ts`:
    - `llm`: response transport type, `BaseLLM` call signature, extension hook signature, a new provider-native folder, a moved Anthropic module;
    - `agent`: `LlmPhase`, `LLMRequestAssembler`;
    - `memory`: `MemoryManager`, compaction builder and validator, the prefix binding;
  - about 25 test files to adapt (the `sendMessages`/`streamMessages` signature and moved imports);
  - the SDK upgrade and the catalog fix.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - shared contracts change: `BaseLLM.sendMessages/streamMessages` and `LLMExtension.beforeInvoke` lose the `renderedPayload` parameter, `CompleteResponse`/`ChunkResponse` change their native-turn type, and a new provider-neutral policy interface is added;
  - an ownership boundary moves (history rules leave memory);
  - reviewed signed-thinking lifecycle behavior is removed under Anthropic's enforced preserved-thinking contract (RSK-003);
  - the provider SDK is upgraded.
- Escalation trigger if implementation or validation discovers new impact:
  - another prefix input that varies within a run;
  - any request path that edits earlier native history, other than compaction or the REQ-012 guard;
  - a production `LLMExtension`, any other consumer of `renderedPayload`, or a non-test caller passing a non-null second argument to `sendMessages/streamMessages`;
  - a persisted shape that a generic reader cannot read;
  - any 400 `prefix_binding_mismatch` during validation.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live probe A | `probes/anthropic-cache-probe-result.json` | Production adapter: cache read/write 0 on an identical prefix | Root cause | — |
| Claude Agent SDK transcripts | investigation notes § Deep Cost-Efficiency Investigation | 1h writes; 95–99 % hit; append-only | 1h TTL; append-only | — |
| TTL simulation | `probes/transcript-analysis/sim.py` | none $1,073.65 / 5m $123.51 / 1h $88.63 | 1h | — |
| Strategy probes S1–S4 | `probes/strategy-probe-result.json`, `probes/strategy-probe-s4-result.json` | Per-turn strip rewrites each cycle; append-only 90.9 %; S4 (text-only replies stored as today) 90.8 %, accepted | Remove per-turn strip; no change to reply storage | — |
| Prefix-change probe P1–P4 | `probes/prefix-change-probe-result.json` | String ≡ block-array system; tool change with kept thinking → 400; one-time strip accepted | REQ-012 guard | P-005 (strip mid tool round) → live validation |
| Code: provider-specific imports | `grep -rln provider-native-assistant-turn autobyteus-ts/src` | 4 memory/agent production importers plus the response types | REQ-013 boundary | — |
| Code: rendered payload | `grep -rn renderedPayload`; `grep "extends LLMExtension"` | Only consumer is the extension hook; no production extension; the agent pre-renders through the private `_renderer` | Remove the pre-render and the parameter | — |
| Code: precedent | `llm/utils/tool-call-delta.ts` | Provider-tagged opaque per-call native context, interpreted only by renderers | Same principle for whole turns | — |
| Code: duplicates | `takeLeadingSystemMessages` in the validator; `splitSystemMessages` in the adapter | Two definitions of the leading system run | One shared `leadingSystemMessages` | — |
| Implementation progress | implementation engineer report 2026-10-09; `git status` in the worktree | SR-004 steps 1–6 done, uncommitted | Reuse (see sequence) | Tests not yet run |
| SDK | `messages.d.ts` 0.128/0.132.1; changelog 0.129–0.132.1 | `CacheControlEphemeral{ttl}` is typed; no breaking change; the lockfile resolves claude-agent-sdk against 0.132.1 | Upgrade | — |

## Intended Change

1. **Caching (SR-004, unchanged).**
   - Conversation requests carry a 1h breakpoint on the last system block plus top-level automatic 1h caching. One-shot calls carry none.
   - Late SYSTEM notes are rendered in place.
   - The Sonnet 5 price is fixed.
   - The SDK goes to 0.132.1.
2. **Append-only history + prefix-binding guard (SR-004, behavior unchanged).** The per-turn strip is gone. Prefix-bound reasoning is removed once only when the request prefix (leading system run + tools) changes, or on the first request since creation or restore.
3. **Provider-native history boundary (SR-005, new).**
   - Memory and agent treat provider-native assistant output as an opaque `ProviderNativeAssistantTurn` (`{ provider, ... }`).
   - All provider-specific meaning moves behind a `ProviderNativeHistoryPolicy` interface. The Anthropic implementation lives next to the Anthropic adapter in `llm/api/`.
   - Memory, compaction and the guard call provider-neutral operations.
4. **One request builder per provider (SR-005, new).**
   - The agent stops pre-rendering.
   - `renderedPayload` is removed from the agent's request package, from `BaseLLM.sendMessages/streamMessages` and from the `LLMExtension.beforeInvoke` hook.
   - No caller reaches a provider's private renderer.
5. **Explicit request-prefix owner (SR-005, new).**
   - `LLMRequestAssembler` owns "what is sent": it receives the tool schemas, binds retained reasoning to the prefix digest, and returns the `tools` in the request package.
   - `LlmPhase` sends exactly `request.tools`.
   - Tools are not frozen per run, so Settings changes still reach running agents.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-005; AC-001..003 | Native agent/team on Anthropic | No `cache_control` | Markers on conversation requests, 1h | DS-001 |
| BEH-005 | System | REQ-003, REQ-012, REQ-013; AC-004, AC-013, AC-014 | New turn; tool/system change; restore; compaction | Per-turn strip in memory; Anthropic rules inside memory | Append-only; one-time removal on prefix change/restore; rules behind the provider policy | DS-001, DS-003, DS-005 |
| BEH-007 | System | REQ-010; AC-011 | Interruption, then the next turn | Note merged into system | Rendered in place | DS-001 |
| BEH-004 | System | REQ-004; AC-005 | Compaction summarizer | One-shot, uncached | Preserved | DS-002 |
| BEH-002/003 | Contract | REQ-006; AC-006, AC-007 | Usage → meter | Already complete | Preserved + tests | DS-004 |
| BEH-006 | System | REQ-007; AC-008 | Sonnet 5 usage | Stale price | Official price | DS-004 |
| — | Operational | REQ-011; AC-012 | Dependency maintenance | SDK 0.128.0 | 0.132.1 | — |
| — | Structural | REQ-013; AC-014 | Code ownership | Provider rules in memory/agent; double render | Provider policy; single render | DS-001, DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/anthropic-cache-probe.test.ts` + result | Root cause, feasibility | REQ-001 | Markers work on Opus 5.5 | Evidence only |
| `probes/strategy-probe.mjs` + `strategy-probe-result.json` + `strategy-probe-s4-result.json` | Strip vs append-only | REQ-003, REQ-005 | Basis for append-only | Evidence only |
| `probes/prefix-change-probe.mjs` + result | Validity after a prefix change | REQ-012 | Basis for the guard; validation recipe | Evidence only |
| `probes/transcript-analysis/*.py` | TTL economics | REQ-005 | 1h | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` + `Refactor` (plus cost `Performance`).
- Current design issue found: `Yes`.
- Structural triggers that fire, each with evidence:
  - **Authoritative boundary:** `llm-phase.ts:125` reaches into the provider's private `_renderer` to pre-render a payload that the provider then ignores and re-renders. The caller bypasses the provider boundary. → Remove the pre-render; the provider becomes the only request builder.
  - **Empty indirection / unnecessary work:** the `renderedPayload` parameter flows only to an extension hook with no production implementation. → Remove it (DESIGN.md: "remove unnecessary work before adding complexity").
  - **Ownership / shared folder:** Anthropic-only rules live in `llm/utils/`, a generic folder, and `memory/` and `agent/` apply them. Memory owns the history's lifecycle but today also owns the meaning of one provider's payload. → Move the meaning behind a provider-owned policy; memory keeps the lifecycle.
  - **Shared-structure tightness:** the leading system run is defined twice (`takeLeadingSystemMessages` in the validator, `splitSystemMessages` in the adapter). → One `leadingSystemMessages`.
  - **Legacy cleanup:** the per-turn reset (SR-004).
  - **Not fired:** repeated coordination (no fan-out or retry duplication found) and ambiguous boundaries (the new interfaces take explicit typed subjects).
- Root cause classification: `Boundary Or Ownership Issue` (provider rules in memory/agent; the agent bypasses the provider's renderer). Also `Missing Invariant` (no caching contract) and `Legacy Or Compatibility Pressure` (the per-turn strip).
- Refactor needed now: `Yes` (user-approved, REQ-013).
- Evidence: § Current-State Read; the investigation evidence table.
- Design response: § Intended Change items 3–5.
- Refactor rationale:
  - The caching fix adds a new history rule, the prefix-binding guard. Putting it into memory as Anthropic code would deepen the boundary problem.
  - The next providers with bound reasoning (OpenAI encrypted reasoning items, Gemini thought signatures) would add more special cases to memory.
  - The double render is wasted work on every call, and it is why two places shaped one request.
- Intentional deferrals and residual risk:
  - Per-call `nativeToolCallContext` stays as it is. It is already opaque to memory. Unifying it with whole-turn envelopes would touch every provider's renderer and the persisted snapshots, with no demonstrated need.
  - Tool transport through `kwargs.tools` stays, because changing it touches all 12 provider adapters.
  - Compaction summarizer cache reuse is a separate Task.
  - P-004: image bytes are re-read on every request (residual).

## Terminology

- **Conversation request:** a model call that is one step of a growing agent conversation (`promptCacheScope: 'conversation'`).
- **Leading system run:** the consecutive SYSTEM messages at the start of the working context.
- **Late system note:** a SYSTEM message after the first non-system message.
- **Provider-native assistant turn:** a provider's opaque, provider-tagged record of one assistant response. It is stored with the assistant message and replayed only by that provider's renderer.
- **Prefix-bound reasoning:** the parts of a provider-native turn that the provider ties to the request prefix (for Anthropic, `thinking` and `redacted_thinking` blocks).
- **Request prefix:** the leading system run plus the tool definitions sent with a request.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope:
  - the per-turn `resetAnthropicSignedHistory()`;
  - `llm/utils/provider-native-assistant-turn.ts` (moved into the Anthropic adapter area and split into a generic envelope plus an Anthropic policy);
  - agent-side pre-rendering: `RequestPackage.renderedPayload`, `LLMRequestAssembler.renderPayload`, the assembler's renderer dependency, and the `(llmInstance as any)._renderer ?? new OpenAIChatRenderer()` lookup;
  - the `renderedPayload` parameter of `BaseLLM.sendMessages/streamMessages`, `executeBeforeHooks` and `LLMExtension.beforeInvoke`, and its entry in `INTERNAL_PROVIDER_REQUEST_KWARG_KEYS`;
  - the late-note merge in `splitSystemMessages`;
  - the duplicate `takeLeadingSystemMessages`;
  - the stale Sonnet 5 price;
  - the 0.128.0 SDK pins.
- No re-export shims, aliases or dual signatures: all callers move to the new signatures in the same change.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: native working-context snapshots (`memory/agent_teams/<team>/<member>/working_context_snapshot.json` and `memory/agents/<id>/…`). Assistant messages carry an optional `metadata.provider_native_assistant_turn = { provider: 'anthropic', blocks: [...] }`. Representative file: `solution_designer_08a92ade…/working_context_snapshot.json` (309 KB, 25 native turns).
- Relevant change:
  - The shape does not change: the metadata key string and value stay the same. Only the code that reads them moves (the generic envelope reader to `llm/provider-native/`, the Anthropic policy to `llm/api/`).
  - Snapshots now keep thinking across turns.
  - Usage records are unchanged. Only new usage gets the corrected price.
- Normal reader/writer behavior: the snapshot serializer preserves `metadata` as JSON. The Anthropic policy's `parseTurn` accepts turns with or without thinking, with the same validation as today's `parseAnthropicAssistantTurn`.
- Required semantics: snapshots hold the latest cycle's thinking, because the old strip ran at the next turn. The first resume after the upgrade is a restore, so the guard strips once and the request is valid (ARCH-003 resolution).
- Constraints: none.
- Decision: `Directly Usable — No Migration`; schema `Not Affected`.
- Rationale: same key and value; only reader ownership moves. Frozen migration shapes (`memory/migration/native-working-context-snapshot-shapes.ts`) are untouched.
- Data-migration checklist:
  1. No migration needed.
  2. Availability is unaffected.
  3. Source shape: the current v5 snapshot with optional metadata.
  4–7. N/A.
  8. No cross-package reference changes.
  9. Tests: a snapshot round-trip with a native turn; restore → one strip → append-only.
  10. Consulted the prior decision for the same key in `new-models-gpt6-opus55`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-005, BEH-007 | Turn input | Anthropic reads the cached prefix; usage and native turn returned and stored | `LlmPhase` (intent), `LLMRequestAssembler` (what is sent), `AnthropicLLM` (request shape) | Cost path |
| DS-002 | Primary End-to-End | BEH-004 | Compaction trigger | Summary | `DirectLlmCompressionStrategy` | Stays uncached |
| DS-003 | Bounded Local | BEH-005 | `prepareRequest` start | `RequestPackage{messages, tools}` | `LLMRequestAssembler` | Prefix binding, no pre-render |
| DS-004 | Return-Event | BEH-002/003/006 | Anthropic usage | Meter rows | normalizer → server pricing | Meter = Console |
| DS-005 | Return-Event | BEH-005 | Provider response with a native turn | Stored opaque turn; later replay or reasoning removal | `MemoryManager` (lifecycle) + `ProviderNativeHistoryPolicy` (meaning) | The provider boundary |

## Primary Execution Spine(s)

- DS-001:
  ```
  Turn input
    -> LlmPhase                      (promptCacheScope='conversation'; builds tool schemas)
    -> LLMRequestAssembler           (append-only history; prefix guard; returns {messages, tools})
    -> BaseLLM.streamMessages(messages, kwargs{tools}, options)
    -> AnthropicLLM                  (single request builder: leading system blocks + 1h markers;
                                      late notes in place; renderer)
    -> Anthropic Messages API
    -> ChunkResponse{usage, providerNativeAssistantTurn}
    -> LlmPhase
    -> MemoryManager                 (stores the opaque turn after policy validation)
  ```
- DS-002:
  ```
  PendingCompactionExecutor
    -> DirectLlmCompressionStrategy
    -> BaseLLM.sendMessages(messages, kwargs, options without scope)
    -> AnthropicLLM (no markers)
    -> Anthropic
  ```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | `LlmPhase` builds the tool schemas and hands them, with the input, to the assembler. The assembler keeps the history append-only, binds retained reasoning to the prefix digest, and returns the messages plus the exact tools to send. `LlmPhase` calls `streamMessages(messages, {tools, logicalConversationId}, {promptCacheScope:'conversation', …})`. `AnthropicLLM` alone renders the request, places the cache markers and keeps late notes in place. The response carries usage and, for tool-bearing turns, an opaque `ProviderNativeAssistantTurn`. `MemoryManager` stores it after the provider policy validates it against the tool calls. | Turn, working context, request package, Anthropic request, native turn | `LlmPhase` / `LLMRequestAssembler` / `AnthropicLLM` | Prompt renderer, request policy, usage normalizer, provider policy |
| DS-003 | Ensure system → tool-protocol safety → compaction (independent turn only) → prefix guard → recovery snapshot → append input → sanitize media → return `{messages, tools, …}`. The guard computes `computeLlmRequestPrefixDigest(leadingSystemMessages(context), tools)` and calls `memory.bindRetainedReasoningToRequestPrefix(digest)`. | Working context, request prefix | `LLMRequestAssembler` | `MemoryManager`, digest |
| DS-005 | **On store:** memory reads `response.providerNativeAssistantTurn`, resolves the policy by `turn.provider`, runs `parseTurn` and `assertTurnMatchesToolCalls`, and stores the turn under `provider_native_assistant_turn`. **On a prefix change, restore or compaction:** memory calls `messageWithoutPrefixBoundReasoning(message)` for each message, which delegates to `policy.withoutPrefixBoundReasoning`. **On replay:** the provider's renderer reads its own turn (the Anthropic renderer parses it with the Anthropic module). | Native turn | `MemoryManager` (lifecycle) | `ProviderNativeHistoryPolicy` (meaning) |

## Spine Actors / Main-Line Nodes

`LlmPhase`, `LLMRequestAssembler`, `BaseLLM`, `AnthropicLLM` (with `AnthropicPromptRenderer`), the Anthropic API and `MemoryManager`. For DS-002, also `DirectLlmCompressionStrategy`.

## Ownership Map

- **`LlmPhase`** owns turn orchestration. It declares the conversation intent and builds the tool schemas. It no longer touches renderers or provider types.
- **`LLMRequestAssembler`** owns "what is sent" for one call. It does not render. It owns:
  - the append-only working-context steps;
  - the request prefix (leading system run plus the tools it is given);
  - the prefix-binding call;
  - the returned `RequestPackage{ canonicalMessages, outboundMessages, tools, mediaDiagnostics, didCompact, recoverySnapshot }`.
- **`BaseLLM`** is a thin uniform call surface (hooks plus delegation). It owns no policy.
- **`AnthropicLLM`** is the only builder of Anthropic requests: the leading-system split, system blocks, cache markers, TTL, model policy, rendering through its renderer, and response assembly including the Anthropic native turn.
- **`ProviderNativeHistoryPolicy`** (interface, `llm/provider-native/`) is the provider-neutral contract for what a provider-native turn means.
- **`AnthropicNativeHistoryPolicy`** (`llm/api/`) holds the Anthropic meaning: the turn shape, the match against tool calls, and "thinking is prefix-bound".
- **`MemoryManager`** owns the history's lifecycle, persistence and the in-memory prefix binding (through `RetainedReasoningPrefixBinding`). It handles native turns only through the generic `llm/provider-native` operations.
- **Compaction builder and validator** own the compaction output. They use the generic operations for the keep-tail strip and for the check that no prefix-bound reasoning survives.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `BaseLLM.streamMessages/sendMessages` | provider `_stream/_sendMessagesToLLM` | Hooks + uniform call | Rendering, caching policy |
| `llm/provider-native/provider-native-history.ts` operations | the registered provider policies | One neutral entry point for memory and compaction | Any provider-specific rule |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Per-turn `resetAnthropicSignedHistory()` | Defeats caching | `bindRetainedReasoningToRequestPrefix` guard | In This Change | Already done in the worktree |
| `src/llm/utils/provider-native-assistant-turn.ts` | Anthropic code in a generic folder, used by memory | `src/llm/provider-native/*` (generic) + `src/llm/api/anthropic-native-assistant-turn.ts` + `src/llm/api/anthropic-native-history-policy.ts` | In This Change | Update the 5 production and 4 test importers |
| Uses of `withoutAnthropicThinkingInMessage` and `assertAnthropicTurnMatchesToolCalls` in memory/compaction | Provider rule in memory | `messageWithoutPrefixBoundReasoning` and `nativeTurnMetadata` (generic; delegate to the policy) | In This Change | — |
| `ANTHROPIC_ASSISTANT_TURN_KEY` used outside the Anthropic module | Provider name in a generic key constant | `PROVIDER_NATIVE_ASSISTANT_TURN_KEY` (same string, `provider_native_assistant_turn`) | In This Change | Persisted value unchanged |
| `RequestPackage.renderedPayload`, `LLMRequestAssembler.renderPayload`, the assembler's `renderer` constructor parameter | Double render; private-field access | The provider adapter renders once | In This Change | — |
| `llm-phase.ts` `(llmInstance as any)._renderer ?? new OpenAIChatRenderer()` and the `OpenAIChatRenderer` import | Boundary bypass | — | In This Change | — |
| `renderedPayload` parameter of `BaseLLM.sendMessages/streamMessages/executeBeforeHooks` and `LLMExtension.beforeInvoke`; `'renderedPayload'` in `INTERNAL_PROVIDER_REQUEST_KWARG_KEYS` | No consumer | New signatures `sendMessages(messages, kwargs?, options?)`, `streamMessages(messages, kwargs?, options?)`, `beforeInvoke(messages, kwargs)` | In This Change | 4 production callers + ~21 test files |
| `takeLeadingSystemMessages` (validator), `splitSystemMessages` (adapter) | Duplicate definitions | `leadingSystemMessages` (`llm/utils/messages.ts`, already added) | In This Change | — |
| Stale Sonnet 5 price; SDK 0.128.0 pins | — | — | In This Change | Already done in the worktree |
| Doc statements about the per-turn reset and the native-turn location | Obsolete | Updated docs | In This Change | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/modules/token_usage.md`, and any LLM docs that describe the renderer or rendered payload |

## Return Or Event Spine(s) (If Applicable)

DS-004 (structure unchanged) and DS-005 (above).

## Bounded Local / Internal Spines (If Applicable)

- **`LLMRequestAssembler.prepareRequest`:** DS-003, above.
- **`AnthropicLLM` request builder:**
  1. Split the messages with `leadingSystemMessages`.
  2. Build the system `TextBlockParam[]` from the joined leading run, with a 1h marker when it is a conversation request.
  3. `renderer.render(rest)`: late SYSTEM notes become user text; native turns are replayed through the Anthropic module.
  4. Base parameters.
  5. `applyAnthropicRequestParams` (model policy).
  6. Top-level 1h `cache_control` when it is a conversation request.
  7. Create.
- **`RetainedReasoningPrefixBinding.bind(digest)`:**
  - same digest → no-op;
  - otherwise map the messages through `messageWithoutPrefixBoundReasoning`, replace the context if anything changed, then record the digest.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `computeLlmRequestPrefixDigest` | DS-003 | `LLMRequestAssembler` | sha256 over a stable JSON of the leading system contents + tools | Detects prefix changes | Hashing in memory or the adapter would scatter knowledge of the prefix |
| `RetainedReasoningPrefixBinding` | DS-003, DS-005 | `MemoryManager` | In-memory digest + one-time removal | One concern; keeps `memory-manager.ts` under the file-size limit | — |
| Provider-native history registry + operations | DS-005 | `MemoryManager`, compaction | Resolve the policy by `provider`; neutral message operations | Provider-neutral boundary | Provider rules leaking back into memory |
| `AnthropicNativeHistoryPolicy` | DS-005 | provider-native registry | Anthropic meaning | Provider ownership | — |
| Model request policy, usage normalizer, renderer | DS-001 | `AnthropicLLM` | Existing | Existing | — |

## Ownership Boundaries

- **Agent:** owns orchestration and knowing *when* something changed. It never interprets provider payloads and never renders.
- **Memory:** owns the history's lifecycle and the opaque storage of provider-native turns. For meaning, it asks the provider policy through `llm/provider-native`.
- **Provider adapter** (`llm/api/anthropic-*`): owns request construction and the meaning of its own native turns. Its policy is registered with the provider-native registry.
- Dependency direction stays `agent → memory → llm` and `agent → llm`.
  - Inside `llm`, the generic `provider-native/registry → api/anthropic-native-history-policy` composition is allowed. It is the same direction as `LLMFactory → api/*`.
  - `llm/api` must not import `memory` or `agent`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BaseLLM.streamMessages/sendMessages` (+ `LLMInvocationOptions`) | Provider rendering and request construction | `LlmPhase`, compaction, other callers | Reading `llm._renderer`; passing pre-rendered payloads; passing `cache_control` via kwargs | Extend `LLMInvocationOptions` |
| `llm/provider-native/provider-native-history.ts` | Provider policies | `MemoryManager`, compaction builder/validator, `RetainedReasoningPrefixBinding` | Importing `llm/api/anthropic-*` from memory or agent | Add a neutral operation to the policy interface |
| `MemoryManager` | Working-context mutation, prefix binding | `LLMRequestAssembler`, compaction | The assembler editing messages directly | — |

## Dependency Rules

- `agent/**` and `memory/**` must not import `llm/api/**`, Anthropic SDK types, or any `anthropic-*` module. AC-014 checks this with a grep test or a review grep. The exception is the frozen migration shapes, which only name per-call context keys.
- `llm/provider-native/**` must not import `memory` or `agent`.
- `llm/api/anthropic-*` may import `llm/provider-native` types (it implements the interface) and `llm/utils`.
- No caller outside a provider adapter reads `_renderer`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMInvocationOptions.promptCacheScope?: 'conversation'` | Caching intent | Declares a conversation step | Literal | SR-004 |
| `BaseLLM.sendMessages(messages, kwargs?, options?)` / `streamMessages(messages, kwargs?, options?)` | One provider call | Hooks + delegation | `Message[]` | `renderedPayload` removed |
| `LLMExtension.beforeInvoke(messages, kwargs)` / `afterInvoke(messages, response, kwargs)` | Extension hook | — | — | `renderedPayload` removed |
| `type ProviderNativeAssistantTurn = { readonly provider: string } & Readonly<Record<string, unknown>>` | Opaque native turn | Provider-tagged JSON value | `provider` tag | Same persisted shape |
| `interface ProviderNativeHistoryPolicy` (below) | Meaning of one provider's turn | Validate, match, strip | Turn | One implementation per provider |
| `provider-native-history.ts` operations (below) | Neutral operations | Resolve the policy by provider and delegate | `Message`, turn | An unknown provider throws (fail closed, as today for invalid turns) |
| `LLMRequestAssembler.prepareRequest(input, identity, systemPrompt, requestTools)` → `RequestPackage{…, tools}` | Request assembly | Returns the exact tools to send | — | `renderedPayload` removed |
| `MemoryManager.bindRetainedReasoningToRequestPrefix(digest): boolean` | Prefix binding | Strips once on a change or first request | Digest string | SR-004 |
| `leadingSystemMessages(messages)` | Leading system run | Single definition | `Message[]` | Used by the adapter, assembler and validator |

`ProviderNativeHistoryPolicy` members:
- `provider`
- `parseTurn(value): ProviderNativeAssistantTurn`
- `assertTurnMatchesToolCalls(turn, calls: readonly ToolCallSpec[]): void`
- `hasPrefixBoundReasoning(turn): boolean`
- `withoutPrefixBoundReasoning(turn): ProviderNativeAssistantTurn`

`provider-native-history.ts` exports:
- `PROVIDER_NATIVE_ASSISTANT_TURN_KEY`
- `readProviderNativeTurn(message)`
- `nativeTurnMetadata(turn, calls)`: parses, asserts, and returns the metadata object
- `messageHasPrefixBoundReasoning(message)`
- `messageWithoutPrefixBoundReasoning(message)`

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ProviderNativeHistoryPolicy` | Yes | Yes (`provider`) | Low | — |
| provider-native operations | Yes | Yes | Low | — |
| `prepareRequest` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Opaque native turn | `ProviderNativeAssistantTurn` | Yes | Low | — |
| Policy | `ProviderNativeHistoryPolicy` / `AnthropicNativeHistoryPolicy` | Yes | Low | — |
| Prefix-bound parts | `prefixBoundReasoning` | Yes | Low | — |
| Anthropic turn module | `anthropic-native-assistant-turn.ts` (`AnthropicAssistantTurn`, `parseAnthropicAssistantTurn`, `withoutThinkingBlocks`, `assertAnthropicTurnMatchesToolCalls`) | Yes | Low | Moved, not renamed |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider-tagged opaque native data | The `nativeToolCallContext` pattern | Reuse the principle | Proven | — |
| Home for the provider policy | `llm/` | Create a new folder, `llm/provider-native/` | A neutral contract shared by memory and providers; `llm/utils` is for generic message and response types | `llm/utils` would again mix generic and provider-specific code |
| Anthropic meaning | `llm/api/anthropic-*` | Extend | Provider ownership | — |
| Prefix binding | `RetainedReasoningPrefixBinding` (worktree) | Reuse; switch it to the neutral operation | — | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` (base, utils, provider-native, api) | Call surface, response types, neutral native-turn contract, Anthropic adapter and policy, catalog | DS-001, DS-002, DS-004, DS-005 | `AnthropicLLM`, memory | Extend / create `provider-native/` | — |
| `autobyteus-ts/src/agent` | Orchestration, request assembly, prefix digest | DS-001, DS-003 | `LlmPhase`, `LLMRequestAssembler` | Extend; remove the pre-render | — |
| `autobyteus-ts/src/memory` | Lifecycle, binding, compaction | DS-003, DS-005 | `MemoryManager` | Modify (neutral operations only) | — |
| `autobyteus-server-ts` | SDK pin, price test | DS-004 | — | Done | No production change expected (no `sendMessages` callers) |

## Draft File Responsibility Mapping

Same as the final mapping; no further extraction was needed after the draft.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Leading system run | `llm/utils/messages.ts` `leadingSystemMessages` | llm | Adapter, assembler, validator | Yes | Yes | — |
| Sync/stream Anthropic request building | private `buildRequestParams` in `anthropic-llm.ts` | llm/api | Same markers on both paths | Yes | Yes | A cross-provider helper |
| Native-turn neutral operations | `llm/provider-native/provider-native-history.ts` | llm | Memory, compaction, binding | Yes | Yes | A home for provider rules |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ProviderNativeAssistantTurn` | Yes (`provider` + provider-owned fields) | Yes | Medium: the per-call `nativeToolCallContext.anthropic.toolUseBlock` overlaps with the whole-turn `tool_use` blocks | Deferred (see the Health Assessment); renderers already prefer the whole turn when present |
| `RequestPackage` | Yes | Yes (`renderedPayload` removed) | Low | — |
| `CompleteResponse/ChunkResponse.providerNativeAssistantTurn` | Yes | Yes | Low | Typed as `ProviderNativeAssistantTurn` |

## Final File Responsibility Mapping

New and moved files:

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/llm/provider-native/provider-native-assistant-turn.ts` (new) | llm | contract | `ProviderNativeAssistantTurn` type, `PROVIDER_NATIVE_ASSISTANT_TURN_KEY` | One type | — |
| `src/llm/provider-native/provider-native-history-policy.ts` (new) | llm | contract | `ProviderNativeHistoryPolicy` interface | One interface | — |
| `src/llm/provider-native/provider-native-history.ts` (new) | llm | neutral entry point | Policy registry (static: anthropic) plus `readProviderNativeTurn`, `nativeTurnMetadata`, `messageHasPrefixBoundReasoning`, `messageWithoutPrefixBoundReasoning` | Single neutral entry point for memory and compaction | Policies |
| `src/llm/api/anthropic-native-assistant-turn.ts` (moved from `llm/utils/provider-native-assistant-turn.ts`) | llm/api | Anthropic | `AnthropicAssistantTurn` types, parse, `withoutThinkingBlocks`, `assertAnthropicTurnMatchesToolCalls` | The Anthropic turn model | Generic type |
| `src/llm/api/anthropic-native-history-policy.ts` (new) | llm/api | Anthropic | Implements the policy over the Anthropic turn model (`thinking`/`redacted_thinking` = prefix-bound) | One provider policy | Anthropic turn module |
| `src/agent/llm-request-prefix-digest.ts` (worktree) | agent | assembler | Digest | One function | — |
| `src/memory/retained-reasoning-prefix-binding.ts` (worktree) | memory | `MemoryManager` | Switch to `messageWithoutPrefixBoundReasoning` | One concern | Neutral operations |

Changed files:

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/llm/utils/response-types.ts` | llm | transport | Field typed `ProviderNativeAssistantTurn` | Existing | Generic type |
| `src/llm/base.ts`, `src/llm/extensions/base-extension.ts`, `src/llm/api/provider-request-kwargs.ts` | llm | `BaseLLM` | New signatures without `renderedPayload`; `promptCacheScope` | Existing | — |
| `src/llm/api/anthropic-llm.ts`, `anthropic-assistant-turn-assembler.ts`, `src/llm/prompt-renderers/anthropic-prompt-renderer.ts` | llm/api | `AnthropicLLM` | Caching (worktree); imports from the moved Anthropic module | Existing | — |
| `src/llm/utils/messages.ts` | llm | — | `leadingSystemMessages` (worktree) | Existing | — |
| `src/agent/loop/llm-phase.ts` | agent | `LlmPhase` | Remove the renderer lookup and the pre-rendered payload; send `request.tools`; pass the cache scope; use the generic native-turn type | Existing | — |
| `src/agent/llm-request-assembler.ts` | agent | `LLMRequestAssembler` | No renderer; guard (worktree); return `tools` | Existing | Digest |
| `src/memory/memory-manager.ts` | memory | `MemoryManager` | Store native turns through `nativeTurnMetadata`; binding delegate (worktree) | Existing | Neutral operations |
| `src/memory/compaction/accepted-compaction-builder.ts`, `working-context-compaction-output-validator.ts` | memory | compaction | Neutral operations; `leadingSystemMessages` | Existing | Neutral operations |
| Catalog, manifests, lockfile | — | — | Done in the worktree | — | — |

## Applied Patterns (If Any)

- **Strategy + Registry:** `ProviderNativeHistoryPolicy` implementations are looked up by their `provider` tag in a static registry. The registry only does lookup, no orchestration.
- **Adapter** (existing): provider request building.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/provider-native/` | Folder | Neutral native-turn contract | Type, interface, registry and neutral operations | Shared by memory and providers; distinct from the generic `llm/utils` | Provider-specific rules |
| `autobyteus-ts/src/llm/api/anthropic-native-*.ts` | Files | Anthropic adapter area | Anthropic turn model and policy | Next to `anthropic-llm.ts` | Memory or agent imports |
| Other paths | Files | As in the Final File Responsibility Mapping | — | — | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `llm/provider-native/` | Off-Spine Concern (contract) | Yes | Low | 3 small files |
| `llm/api/` | Persistence-Provider (adapter) | Yes | Low | Follows the existing flat provider-folder convention |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Memory storing a native turn | `metadata = nativeTurnMetadata(response.providerNativeAssistantTurn, toolCalls)`. It resolves the policy by `turn.provider`, runs `parseTurn` and `assertTurnMatchesToolCalls`, and returns `{ [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: turn }` | `import { parseAnthropicAssistantTurn } from '../llm/…'` inside memory | Provider meaning stays with the provider |
| Removing prefix-bound reasoning | `messages.map(messageWithoutPrefixBoundReasoning)` | `messages.map(withoutAnthropicThinkingInMessage)` | Same |
| One request builder | `llm.streamMessages(request.outboundMessages, { logicalConversationId, tools: request.tools }, { signal, turnId, promptCacheScope: 'conversation' })` | `new LLMRequestAssembler(memory, (llm as any)._renderer, …)` and `streamMessages(messages, renderedPayload, …)` | No boundary bypass, no double render |
| Conversation request | `system: [{ type: 'text', text, cache_control: { type: 'ephemeral', ttl: '1h' } }]` plus top-level `cache_control: { type: 'ephemeral', ttl: '1h' }` | Markers placed by agent code | Single authority |
| Tool change mid-run | Digest D1 → Settings change → D2 → strip once → request accepted (P3) → D2 again → no strip | Keep thinking (P2: 400), or strip on every turn | The guard is event-driven |
| Future provider | Register `OpenAiResponsesNativeHistoryPolicy` under `'openai_responses'` if whole-turn replay of encrypted reasoning is adopted | New `if (provider === 'openai')` branches in memory | Extensible without changing memory |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the per-turn reset behind a flag | Fear of 400s | Rejected | REQ-012 guard |
| Store and replay the tools as first sent | Keeps the prefix stable | Rejected | Would stop Settings changes from reaching running agents |
| Production `drop_block` beta | Safety net | Rejected | The guard plus `"error"`-mode validation |
| Persist the prefix digest | Avoids the strip on restore | Rejected for now | Revisit if the cost is measured to matter |
| Re-export `llm/utils/provider-native-assistant-turn.ts` from its new location | Fewer import edits | Rejected | Update all importers |
| Keep `renderedPayload` as an optional deprecated parameter | Fewer test edits | Rejected | Change all callers |
| Unify the per-call `nativeToolCallContext` into the whole-turn envelope | A single representation | Deferred (not a compatibility mechanism) | Separate task if a provider needs it |

## Derived Layering (If Useful)

`agent` (orchestration) → `memory` (history lifecycle) → `llm` (call surface, neutral provider-native contract) ← `llm/api` (provider adapters and their policies).

The agent reaches `llm/api` only through `BaseLLM`. Memory reaches it only through `llm/provider-native`.

## Change / Refactor Sequence

**Carry over** the uncommitted SR-004 work in the worktree:
- SDK and lockfile; `promptCacheScope`;
- adapter caching (`splitLeadingSystemMessages`, `buildRequestParams`, controlled `cache_control`);
- `leadingSystemMessages`, the digest, `RetainedReasoningPrefixBinding`, the assembler guard, the `llm-phase` scope;
- the catalog and server test rows;
- the assembler and adapter tests written so far.

Delete the untracked build outputs `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` if they are not part of the repository.

Then:

1. **Provider-native boundary.**
   - Create `llm/provider-native/{provider-native-assistant-turn,provider-native-history-policy,provider-native-history}.ts`.
   - Move `llm/utils/provider-native-assistant-turn.ts` to `llm/api/anthropic-native-assistant-turn.ts`.
   - Add `llm/api/anthropic-native-history-policy.ts` and register it.
   - Retype the field in `response-types.ts`.
   - Switch `memory-manager.ts`, `retained-reasoning-prefix-binding.ts`, `accepted-compaction-builder.ts` and `working-context-compaction-output-validator.ts` to the neutral operations. The validator also switches to `leadingSystemMessages`.
   - Point the Anthropic adapter, turn assembler and renderer at the moved module.
   - Delete the old file.
2. **Single render.**
   - Remove `renderedPayload` from `RequestPackage`, from the assembler (`renderPayload` and the renderer constructor parameter), from `llm-phase.ts` (the renderer lookup and the `OpenAIChatRenderer` import), from `BaseLLM`, from `LLMExtension`, and from the internal kwargs list.
   - Update the 4 production callers and all test callers to `sendMessages(messages, kwargs?, options?)` and `streamMessages(messages, kwargs?, options?)`.
3. **Request prefix owner.** `prepareRequest` returns `tools`, and `LlmPhase` sends `request.tools`.
4. **Tests:** see Guidance. Also update the remaining `prepareRequest` callers listed by the implementation engineer.
5. **Docs.**
6. **Live validation.**

## Key Tradeoffs

- Refactoring now makes the change larger (Large), but it keeps a new provider rule out of memory and gives future providers a clean extension point.
- A static registry is simpler than dynamic registration: adding a provider is one line in the llm layer.
- Per-call native context stays as it is, to keep this change bounded.
- The 1h TTL, the one-time strip on restore and the text-only reply storage are as in SR-004.

## Risks

- **RSK-003:** an unknown prefix edit → 400. Covered by the guard, by tests (AC-002, AC-004, AC-011, AC-013) and by `"error"`-mode validation.
- **Signature change ripple:** about 25 test files and 4 production callers. Mitigation: typecheck both packages. Correction (ARCH-REV-003, ARCH-005): there are no server *production* callers, but `autobyteus-server-ts/tests/.../compaction-provider-requests.test.ts:37` calls `sendMessages(messages, null, …)`, and `test-support/live-e2e/live-e2e-harness.ts:269` subclasses `LLMExtension`. Both must move to the new signatures. Also avoid an import cycle between the provider-native registry and the Anthropic policy (review R-1), for example by keeping the policy free of registry imports.
- **Behavior parity after the move:** the existing Anthropic signed-continuation, compaction and snapshot tests must pass with unchanged assertions; only their imports change.
- **P-004 and P-005:** as recorded (residual risk; live validation).

## Guidance For Implementation

Keep the SR-004 test guidance:
- adapter markers: sync and stream, no scope, no system, late note, kwargs override;
- AC-002: byte-identical prefix across a tool continuation **and** an independent turn;
- AC-013 guard cases: unchanged prefix; tool change, including mid tool round; restore; a failed request after a strip; a fresh run;
- AC-011: interruption;
- AC-005: compaction without a cache scope;
- normalizer with 1h writes;
- the Sonnet 5 catalog row;
- the Opus 5.5 calculator components;
- rewrite `anthropic-signed-tool-continuation.test.ts` to start with a real first request.

Add for SR-005:
- **AC-014 static check:** a unit test or repository check script that fails if any file under `autobyteus-ts/src/agent/` or `autobyteus-ts/src/memory/` (except `memory/migration/`) imports from `llm/api/` or has `anthropic` in an import path. Also add a grep to the code-review checklist.
- **Provider-native operations:**
  - an unknown provider tag → throws;
  - an Anthropic turn round-trips through `nativeTurnMetadata` / `readProviderNativeTurn`;
  - `messageWithoutPrefixBoundReasoning` removes only `thinking` and `redacted_thinking` and keeps `text` and `tool_use`;
  - `messageHasPrefixBoundReasoning`.
- **Signature:** `BaseLLM` calls the extension hooks with `(messages, kwargs)`. Adapt the existing extension-registry tests.
- **No pre-render:** an `LlmPhase` test asserts that `streamMessages` receives `(messages, kwargs, options)` with `kwargs.tools === request.tools`.
- **Parity:** the snapshot serializer round-trips `provider_native_assistant_turn` unchanged (fixture `tests/fixtures/memory/released-native-snapshot-shapes.json`).

Live validation (API/E2E, through the test vault): as in SR-004, meaning AC-003, AC-004, AC-011 and AC-013 in `"error"` mode. The user checks that the Token Meter matches the Console.
