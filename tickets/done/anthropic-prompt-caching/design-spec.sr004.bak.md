# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-003 approved by the user 2026-10-09. SR-004 revisions after architecture review ARCH-REV-001 (BEH-005, REQ-003, REQ-012, AC-004, AC-013, SCN-005/006) approved 2026-10-09 by explicit user delegation ("you decide the most reasonable … and then work on it").
- Behavior-defining supplements and their approval references: None (probe files are evidence only).
- Design status: `Ready` (revised for ARCH-REV-001: ARCH-001..004).
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-09): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/DESIGN.md`, data-migration checklist section 2 of `autobyteus-server-ts/docs/design/data_migration_guideline.md`; claude-api skill `shared/prompt-caching.md` and `shared/model-migration.md` (preserved thinking). `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

Native agent turn (standalone agent or native team member) → `LlmPhase.run` (`autobyteus-ts/src/agent/loop/llm-phase.ts`) builds tool schemas, then `LLMRequestAssembler.prepareRequest` (`agent/llm-request-assembler.ts`):
1. ensures the system message;
2. **on every non-tool-continuation request calls `MemoryManager.resetAnthropicSignedHistory()`, which removes all `thinking`/`redacted_thinking` blocks from every stored Anthropic native assistant turn** (BEH-005);
3. runs pending compaction (only on non-continuation requests);
4. appends the new user message and returns the working-context messages.

`LlmPhase` then calls `llm.streamMessages(messages, rendered, {logicalConversationId, tools}, {signal, turnId})`. `AnthropicLLM` (`llm/api/anthropic-llm.ts`):
- `splitSystemMessages` joins **every** SYSTEM-role message (wherever it sits) into the top-level `system` string;
- the renderer renders the rest;
- `applyAnthropicRequestParams` applies the model policy;
- the request is sent **without any `cache_control`** (BEH-001).

Usage is normalized with cache fields (BEH-002) and priced per component on the server (BEH-003).

Other writers into the request prefix:
- the interruption boundary note is appended as a SYSTEM message (`memory-manager.ts` `projectWorkingContextForNextLlm`), so the top-level `system` changes (BEH-007);
- accepted keep-tail compaction rebuilds the context and strips thinking from retained turns (correct; preserved);
- the compaction summarizer (`DirectLlmCompressionStrategy`) is a one-shot `sendMessages` call (BEH-004).

Tool schemas are stable within a run (UNK-002 resolved). Text-only Anthropic replies are stored without native blocks; S4 proves this is accepted once the per-turn strip is gone.

The request prefix is re-derived on every request. `ToolSchemaProvider.buildSchema` rebuilds `tools` from the shared registry, which changes when media default models or a tool schema are reloaded (`server-settings-service.ts:360` → `reloadMediaToolSchemas`; `tool-management.ts:66` → `reloadToolSchema`). A restored run (`restoreBackend`) rebuilds tools and system from the current definition, with a new in-memory `MemoryManager` loaded from the snapshot. Stored snapshots still hold the thinking of their latest tool cycle. With kept thinking, a changed `tools` list returns a 400 (probe P2). Removing all thinking once is accepted (P3). Sending the system prompt as a string or as a block array is binding-equivalent (P1).

Constraint: Opus 5.5 thinking blocks are bound to their prefix. Enforced accounts (created ≥ 2026-08-31) get a 400 when a replayed block's prefix changed. The design must therefore make the native Anthropic history strictly append-only between compactions.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 6 production files in `autobyteus-ts` (Anthropic adapter, invocation options, agent loop call site, request assembler, memory manager removal, catalog row), two package manifests plus the lockfile for the SDK upgrade, focused unit tests in `autobyteus-ts` and `autobyteus-server-ts`, and two docs. All within existing owners; no new subsystem, no persistence change.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - It removes a previously reviewed High-risk lifecycle behavior (the per-turn signed-thinking reset from `new-models-gpt6-opus55`). This changes the external-contract posture with Anthropic's preserved-thinking check: an unnoticed prefix edit now becomes a 400 on enforced accounts instead of being masked by the strip (RSK-003).
  - It adds a field to the shared `LLMInvocationOptions` contract used by every provider.
  - It upgrades a provider SDK shared with the Claude Agent SDK runtime's dependency graph.
- Escalation trigger if implementation or validation discovers new impact: any request path that edits earlier native history (other than compaction and the REQ-012 one-time removal) found during implementation, any other prefix input that varies within a run (beyond tools and leading system), or any 400 `prefix_binding_mismatch` / `Invalid signature` in validation → return `Design Impact`. Also: an SDK upgrade typing break outside the Anthropic adapter, or a Claude Agent SDK peer-dependency conflict.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live probe A | `probes/anthropic-cache-probe-result.json` | Production adapter: cache read/write 0 on identical prefix | Root cause: caching not requested | — |
| Claude Agent SDK transcripts | investigation notes § Deep Cost-Efficiency Investigation | All writes 1h TTL; 95–99 % hit; append-only | 1h TTL; append-only target | — |
| TTL simulation | `probes/transcript-analysis/sim.py` | Real sessions: none $1,073.65 / 5m $123.51 / 1h $88.63 | DEC-001 = 1h | Native workloads may differ slightly |
| Strategy probe S1–S3 | `probes/strategy-probe-result.json` | Per-turn strip rewrites latest cycle each turn (82.8 %, $0.434); append-only 90.9 %, $0.265 | Remove per-turn strip | — |
| Strategy probe S4 | `probes/strategy-probe-s4-result.json` | No strip, text-only replies without thinking: 90.8 %, $0.268, accepted under enforced check | No memory-capture change needed | Long real runs validated in API/E2E |
| Code read | `anthropic-llm.ts` `splitSystemMessages` + `memory-manager.ts:485` | Late SYSTEM notes merged into top-level system | Render late SYSTEM messages in place | — |
| Code read | `tools/registry/tool-definition.ts`, `agent-factory.ts` | Tool set fixed per run; schemas change on operator reload and restore | No tool-side change; reload/restore handled by the REQ-012 guard | — |
| Code read | `memory/compaction/direct-llm-compression-strategy.ts`, `server .../compaction-llm-factory.ts` | One-shot summarizer; model from compaction settings | No caching for one-shot calls | — |
| SDK typing | `autobyteus-ts/node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts` | `CacheControlEphemeral {type, ttl?: '5m'\|'1h'}` on blocks and top-level `MessageCreateParamsBase.cache_control` | Typed request shape, no casts | Re-check after upgrade |
| Prefix-change probe P1–P4 | `probes/prefix-change-probe-result.json` | String vs block system equivalent; tool change with kept thinking → 400; one-time strip accepted | REQ-012 guard design; ARCH-003 answer | — |
| Review trigger trace | investigation notes § SR-004 | `reloadMediaToolSchemas`, `reloadToolSchema`, `restoreBackend`; snapshots keep latest-cycle thinking | Guard events: digest change and first request after start/restore | Image bytes re-read per request (P-004, residual) |
| SDK changelog 0.129–0.132.1 | github.com/anthropics/anthropic-sdk-typescript CHANGELOG | No breaking change to Messages, cache_control, streaming used here | Upgrade to 0.132.1 | Claude Agent SDK peer range |

## Intended Change

1. Agent-conversation Anthropic requests carry caching markers:
   - an explicit `{type:'ephemeral', ttl:'1h'}` breakpoint on the last top-level system text block (covers tools + system);
   - top-level automatic caching `{type:'ephemeral', ttl:'1h'}` for the growing tail.
   One-shot calls carry none.
2. The unconditional per-turn signed-thinking reset is replaced by a prefix-binding guard. Before each request, `MemoryManager` removes all thinking once only if the tool definitions or leading system prompt differ from the previous request of this in-memory agent, or if this is the first request since the agent was created or restored and the history holds thinking. Otherwise the native Anthropic history is append-only between compactions.
3. SYSTEM-role messages after the conversation's leading system run are rendered in place as user-role text instead of being merged into the top-level `system`.
4. The Claude Sonnet 5 catalog price is corrected.
5. `@anthropic-ai/sdk` is upgraded to 0.132.1.
6. Tests prove request shape, append-only prefix, and cache pricing.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-005; AC-001, AC-002, AC-003 | User runs native agent/team on Anthropic model | No `cache_control` (probe A) | Markers on conversation requests, 1h | DS-001 |
| BEH-005 | System | REQ-003, REQ-012; AC-004, AC-013 | New independent turn; tool/system change; restore | Per-turn strip (S1); tool change with kept thinking → 400 (P2) | Append-only in normal turns (S3/S4); one-time removal on prefix change or restore (P3) | DS-001 (assembler step), DS-003 |
| BEH-007 | System | REQ-010; AC-011 | Turn interrupted, next turn | Note merged into system | Note rendered in place as user text | DS-001 (adapter rendering) |
| BEH-004 | System | REQ-004; AC-005 | Compaction summarizer | One-shot, uncached | Preserved: no markers | DS-002 |
| BEH-002/003 | Contract | REQ-006; AC-006, AC-007 | Anthropic usage, Token Meter | Already parsed and priced | Preserved; tests added | DS-004 |
| BEH-006 | System | REQ-007; AC-008 | New Sonnet 5 usage | Stale $3/$15 row | Official $2/$10 row | DS-004 |
| — | Operational | REQ-011; AC-012 | Dependency maintenance | SDK 0.128.0 | SDK 0.132.1 | N/A (build) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/anthropic-cache-probe.test.ts` + result | Root cause, feasibility | REQ-001 | Proves markers work on Opus 5.5 | Evidence only |
| `probes/strategy-probe.mjs` + `strategy-probe-result.json` + `strategy-probe-s4-result.json` | Strip vs append-only | REQ-003, REQ-005 | Basis for removing the reset without memory-capture change; reusable for live validation | Evidence only |
| `probes/transcript-analysis/*.py` | TTL economics | REQ-005 | Basis for 1h | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (plus `Performance` cost).
- Current design issue found: `Yes`.
- Structural triggers that fire, each with evidence:
  - **Legacy-cleanup trigger:** `resetAnthropicSignedHistory` runs a recovery mechanism every turn, which Anthropic's guidance says not to do. Its stated reason, the "middle gap", is disproved by S4. It also has a second, undocumented role: keeping requests valid after `tools` change or a restore (ARCH-001). → replace the unconditional call with an event-driven guard that owns exactly that role.
  - **Ownership:** caching intent is conversation-lifecycle knowledge owned by the agent loop. Request shape is owned by the Anthropic adapter. The design keeps that split: the loop states intent through the invocation contract, and the adapter decides markers. No generic layer decides provider markers.
  - **Ambiguous-boundary trigger** checked: the new invocation field names one subject (prompt-cache scope of this invocation) with an explicit enum. Not fired.
  - Empty-indirection and shared-structure triggers: not fired; no new helper module or shared type beyond one enum field.
- Root cause classification: `Missing Invariant` (the Anthropic adapter never applied the provider's caching contract) plus `Legacy Or Compatibility Pressure` (per-turn strip and the system-merge of late notes defeat the append-only invariant the provider requires).
- Refactor needed now: `Yes` (bounded: remove the reset; tighten system-message splitting).
- Evidence: investigation notes § Deep Cost-Efficiency Investigation; probes S1–S4.
- Design response: add caching in the adapter behind an explicit invocation intent; replace the per-turn reset with the prefix-binding guard (`MemoryManager.bindRetainedReasoningToRequestPrefix`); render late SYSTEM notes in place.
- Refactor rationale: without these, caching alone yields ~83 % and rewrites each cycle per turn; keeping thinking with a system-merged note would 400 on enforced accounts.
- Intentional deferrals and residual risk: compaction summarizer cache reuse deferred to a follow-up Task (≈ $3.20 → $0.16 per Opus 5.5 compaction at 800k). Residual: one cache restart and one-time reasoning removal per compaction, tool-definition change and restore. For a restore with unchanged tools inside the 1h window this costs one avoidable rewrite; avoiding it would need a persisted prefix digest (rejected for now: persistence change for an unmeasured cost). P-004: a changed image file under kept thinking would 400; no supported workflow does it.

## Terminology

- **Conversation request:** one model call that is a step of a growing agent conversation whose next call will resend this call's prefix plus appended content.
- **Leading system run:** the consecutive SYSTEM-role messages at the start of the working context (the agent's system prompt, and after compaction the carried system notes).
- **Late system note:** a SYSTEM-role message located after the first non-system message.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope: the unconditional per-turn call of `MemoryManager.resetAnthropicSignedHistory()` in `LLMRequestAssembler.prepareRequest`; the method is replaced (renamed and made conditional) by `bindRetainedReasoningToRequestPrefix`; the late-SYSTEM merge behavior of `splitSystemMessages`; the 0.128.0 SDK pin; the stale Sonnet 5 price values.
- No flag, fallback or dual path keeps the per-turn reset.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: native working-context snapshots (`memory/agent_teams/<team>/<member>/working_context_snapshot.json`, `memory/agents/<id>/...`), with assistant messages whose optional `metadata.provider_native_assistant_turn` holds Anthropic blocks. Representative file: `solution_designer_08a92ade…/working_context_snapshot.json` (309 KB, 25 native turns).
- Relevant change: none to the shape. Snapshots will now keep thinking blocks in native turns across turns, where today they are stripped at turn start; the key and block types are unchanged. Usage records: unchanged columns. Catalog price: only new usage is priced with the corrected row; stored records keep their snapshot prices.
- Normal reader/writer behavior: `parseAnthropicAssistantTurn` already accepts native turns with or without thinking blocks; the snapshot serializer preserves `metadata`.
- Required semantics: stored snapshots are **not** fully stripped. The old reset ran at the start of the *next* turn, so a snapshot keeps the thinking of its latest tool cycle (ARCH-003). Resuming one is a restore: the new `MemoryManager` has no recorded prefix digest, so the guard removes all thinking once before the first request. That request is valid whatever changed: the late-note relocation, the system rendered as a block array (P1 shows it is equivalent anyway), or tools from an edited definition. Later requests are append-only.
- Constraints: none.
- Decision: `Directly Usable — No Migration` (snapshots, usage records); `Not Affected` (schema).
- Rationale: no shape or meaning change; normal readers already handle both forms. Data-migration checklist: (1) no migration needed; (2) availability unaffected; (3) source shapes inspected: current snapshot v5 with optional metadata; (4)–(7) N/A, nothing converted; (8) no cross-package reference change; (9) tests: restore of a snapshot holding thinking → first request without thinking → following requests append-only; (10) consulted the prior ticket `new-models-gpt6-opus55` decision "Directly Usable — No Migration" for the same key.
- Supported ACs: AC-004, AC-009.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-005, BEH-007 | Turn input (user/teammate message or tool results) | Anthropic Messages API reads cached prefix; usage returned | `LlmPhase` (conversation intent), `AnthropicLLM` (request shape) | The cost path |
| DS-002 | Primary End-to-End | BEH-004 | Compaction trigger | Summarizer response | `DirectLlmCompressionStrategy` | Must stay uncached |
| DS-003 | Bounded Local | BEH-005 | `prepareRequest` | Request package | `LLMRequestAssembler` | Where the per-turn strip is removed |
| DS-004 | Return-Event | BEH-002, BEH-003, BEH-006 | Anthropic usage | Token Meter cost rows | normalizer → server `TokenCostCalculator` | Meter must match Console |

## Primary Execution Spine(s)

- DS-001: `Agent turn input -> LlmPhase -> LLMRequestAssembler (append-only working context) -> BaseLLM.streamMessages(options.promptCacheScope='conversation') -> AnthropicLLM request builder (system blocks + markers) -> Anthropic Messages API -> usage -> LlmPhase -> MemoryManager`
- DS-002: `PendingCompactionExecutor -> DirectLlmCompressionStrategy -> BaseLLM.sendMessages(no cache scope) -> AnthropicLLM (no markers) -> Anthropic`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A turn input reaches `LlmPhase`. The assembler returns the working context with history unchanged from the previous request plus the new input; there is no thinking strip. `LlmPhase` declares the call a conversation request. `AnthropicLLM` keeps the leading system run as top-level `system` blocks, marks the last one with a 1h breakpoint, sets top-level automatic caching with 1h, and renders late system notes in place. Anthropic reads the prior prefix and writes only the delta. Usage flows back unchanged in shape. | Turn, working context, conversation request, Anthropic request | `LlmPhase` / `AnthropicLLM` | Prompt renderer, model request policy, usage normalizer |
| DS-002 | Compaction builds a one-shot summarizer call without a cache scope; the adapter sends it without markers. | Compaction request | `DirectLlmCompressionStrategy` | — |
| DS-003 | `prepareRequest`: ensure system → protocol safety → (compaction if authorized and not a tool continuation) → **prefix-binding guard** (digest of leading system run + tool schemas; `MemoryManager` strips once only on change or first request since creation/restore) → recovery snapshot → append user message → render. The unconditional reset is deleted. The guard runs on tool continuations too, because tools can change mid-cycle. | Working context | `LLMRequestAssembler` | `MemoryManager`, request-prefix digest |
| DS-004 | Anthropic usage (`input`, `cache_read`, `cache_creation` with `ephemeral_5m/1h`) → `anthropic-token-usage-normalizer` → server basis/cost calculator using catalog prices → meter rows. | Usage observation | Server pricing | Model catalog |

## Spine Actors / Main-Line Nodes

`LlmPhase`, `LLMRequestAssembler`, `BaseLLM` (invocation contract), `AnthropicLLM`, Anthropic API, `MemoryManager`; for DS-002 `DirectLlmCompressionStrategy`.

## Ownership Map

- `LlmPhase`: knows the call is a step of the agent conversation; owns declaring `promptCacheScope: 'conversation'`.
- `BaseLLM` / `LLMInvocationOptions`: thin transport of per-invocation options; owns no policy.
- `AnthropicLLM`: owns the Anthropic request shape. That covers system-block construction, the leading-vs-late system split, marker placement, TTL, and the breakpoint budget (≤ 4; this design uses 2).
- `AnthropicPromptRenderer`: owns message rendering. It already maps any non-assistant role, including SYSTEM, to `user`, so late notes render as user text without change.
- `LLMRequestAssembler`: owns request-assembly sequencing; computes the request-prefix digest from the leading system run (after compaction) and the tool schemas it is given; asks memory to bind retained reasoning to it.
- `MemoryManager`: owns the working context and the in-memory `retainedReasoningPrefixDigest` (null at creation/restore; not persisted). Owns the only non-compaction removal of thinking (`bindRetainedReasoningToRequestPrefix(digest)`): remove all thinking from native turns if the digest differs and any thinking is present, persist the replaced context before the recovery checkpoint (as the old reset did), then record the digest. In normal turns nothing rewrites earlier messages.
- Model catalog (`anthropic-supported-model-definitions.ts`): owns prices.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `BaseLLM.streamMessages` / `sendMessages` | provider `_stream/_sendMessagesToLLM` | Hooks + uniform call | Any caching policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `MemoryManager.resetAnthropicSignedHistory()` (unconditional) | The per-turn strip defeats caching and is a recovery-only pattern; S4 proves append-only is accepted | `MemoryManager.bindRetainedReasoningToRequestPrefix(digest)`, which strips only on prefix change or first request since creation/restore | In This Change | Reuses `withoutAnthropicThinkingInMessage` (also used by compaction) |
| Unconditional call at `llm-request-assembler.ts:51` | Same | Guard call after compaction, before the recovery snapshot | In This Change | `isToolContinuation` stays (compaction deferral) |
| Test "…atomically removes signed blocks before an independent turn" (`tests/unit/llm/api/anthropic-signed-tool-continuation.test.ts`) and the `resetAnthropicSignedHistory` mock/assertion (`tests/unit/agent/llm-request-assembler.test.ts`) | Assert removed behavior | Replaced by append-only tests (see Guidance) | In This Change | — |
| Late-SYSTEM merge in `splitSystemMessages` | Changes top-level system mid-session | Leading-run split | In This Change | — |
| `@anthropic-ai/sdk` 0.128.0 pins | Outdated | 0.132.1 | In This Change | Both manifests + lockfile |
| Sonnet 5 price values $3/$15/.3/3.75/6 | Wrong vs official | $2/$10/.2/2.5/4 | In This Change | Update server test row `token-price-config-provider.test.ts:49` |
| Doc statements about the per-turn reset | Obsolete | Append-only statement | In This Change | `autobyteus-ts/docs/agent_memory_design.md` ~l.230; `autobyteus-server-ts/docs/modules/token_usage.md` ~l.381 |

## Return Or Event Spine(s) (If Applicable)

DS-004, unchanged in structure.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `LLMRequestAssembler`: `ensureSystemPrompt -> ensureToolProtocolSafe -> [compaction if independent turn] -> captureRecoverySnapshot -> append user input -> ensureToolProtocolSafe -> render`. The reset step is deleted. It matters because this is the only per-turn place that rewrote earlier history.
- Parent owner `AnthropicLLM` request builder: `split leading system run -> build system TextBlockParam[] (last block marked if conversation) -> render remaining (late system → user) -> base params -> applyAnthropicRequestParams (policy) -> apply cache scope (top-level cache_control) -> create`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Anthropic model request policy (`applyAnthropicRequestParams`) | DS-001/002 | `AnthropicLLM` | thinking/sampling/tool_choice policy | Existing | Mixing caching into policy function would blur two concerns; keep caching as its own small step in the adapter file |
| Usage normalizer | DS-004 | `AnthropicLLM` | Cache field parsing | Existing | — |
| Prompt renderer | DS-001 | `AnthropicLLM` | Message rendering | Existing | — |

## Ownership Boundaries

- The agent loop states intent only. It never constructs provider-specific `cache_control`.
- The Anthropic adapter is the only place that knows Anthropic marker syntax, TTL and limits.
- Memory owns history content. The adapter must not edit history to make caching work; it only adds markers and chooses where SYSTEM messages render.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BaseLLM.streamMessages/sendMessages` (+ `LLMInvocationOptions`) | Provider request building | `LlmPhase`, compaction strategy, other one-shot callers | Callers passing `cache_control` through kwargs/extraParams | Extend `LLMInvocationOptions` (done here) |
| `MemoryManager` | Working-context mutation | `LLMRequestAssembler`, compaction | Adapter mutating stored messages | — |

## Dependency Rules

- `agent/loop/llm-phase.ts` → `llm/base.ts` (`LLMInvocationOptions`) only. No import of Anthropic types.
- `llm/api/anthropic-llm.ts` → SDK types (`CacheControlEphemeral`, `TextBlockParam`, `MessageCreateParams*`).
- Forbidden: provider-specific caching code in `agent/` or `memory/`; caching decided from `logicalConversationId` or other heuristics; user-supplied `cache_control` in `extraParams`/kwargs overriding the adapter. Add `cache_control` to `ANTHROPIC_CONTROLLED_KWARG_KEYS` and drop it from provider extra params so the adapter is the single authority.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMInvocationOptions.promptCacheScope?: 'conversation'` | Caching intent of one invocation | Declares the call is a conversation step whose prefix will be resent | Literal `'conversation'`; absent = no caching | Providers without explicit caching ignore it |
| `AnthropicLLM._streamMessagesToLLM/_sendMessagesToLLM(messages, kwargs, options)` | Anthropic request | Applies markers when `options.promptCacheScope === 'conversation'` | — | Both paths identical |
| `LLMRequestAssembler.prepareRequest(input, identity, systemPrompt, requestTools)` | Request assembly | New `requestTools: ReadonlyArray<Record<string, unknown>>` (the exact provider-formatted tool schemas `LlmPhase` will send) feeds the prefix digest | Tool schemas array | `LlmPhase` passes `toolSchemas` |
| `MemoryManager.bindRetainedReasoningToRequestPrefix(digest: string): boolean` | Retained provider reasoning validity | Strip once on change/first request; returns whether it stripped (for tests/diagnostics) | Opaque digest string | Replaces `resetAnthropicSignedHistory` |
| `leadingSystemMessages(messages)` (`llm/utils/messages.ts`) | Leading system run | Single definition used by the Anthropic adapter (top-level `system`) and the assembler (digest) | `Message[]` | Prevents two diverging definitions |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `promptCacheScope` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Invocation caching intent | `promptCacheScope: 'conversation'` | Yes | Low | — |
| System split helper | `splitLeadingSystemMessages` (rename of `splitSystemMessages`) | Yes | Low | Rename reflects new semantics |
| Anthropic TTL constant | `ANTHROPIC_CONVERSATION_CACHE_CONTROL = { type: 'ephemeral', ttl: '1h' }` | Yes | Low | — |
| Guard method | `bindRetainedReasoningToRequestPrefix` | Yes | Low | — |
| Digest | `computeLlmRequestPrefixDigest({ leadingSystem, tools })` (sha256 over a stable JSON of leading system contents + tool schemas) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Per-invocation option transport | `LLMInvocationOptions` | Extend | Already carries signal/turnId/retryMode | — |
| Marker application | `anthropic-llm.ts` | Extend | Owns request shape | — |
| Late-note rendering | `AnthropicPromptRenderer.renderNonToolMessage` | Reuse | Already maps SYSTEM → user | — |
| Cache usage/pricing | normalizer, `TokenCostCalculator`, meter | Reuse | Already complete | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | invocation options, Anthropic adapter, catalog | DS-001/002/004 | `AnthropicLLM` | Extend | — |
| `autobyteus-ts/src/agent` | conversation intent; assembler step removal | DS-001/003 | `LlmPhase`, `LLMRequestAssembler` | Extend / Remove | — |
| `autobyteus-ts/src/memory` | reset method removal | DS-003 | `MemoryManager` | Remove | — |
| `autobyteus-server-ts` | SDK pin; price test | DS-004 | pricing | Extend | No production code change expected |

## Draft File Responsibility Mapping

See Final mapping (no reusable structures extracted; drafts unchanged).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Sync and stream param building in `AnthropicLLM` (both currently duplicate system/messages setup) | Private function `buildAnthropicRequestBase(...)` inside `anthropic-llm.ts` | `llm/api` | Caching must apply identically to both paths | Yes | Yes | A cross-provider helper |
| Leading system run (adapter's top-level `system` and the assembler's digest) | `leadingSystemMessages` in `autobyteus-ts/src/llm/utils/messages.ts` | `llm/utils` | Both must agree on what the prefix is | Yes | Yes | A provider-specific function |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMInvocationOptions` | Yes | Yes | Low | Single optional literal field |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/base.ts` | llm | `BaseLLM` | Add `promptCacheScope?: 'conversation'` to `LLMInvocationOptions` | Existing contract home | — |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | llm/api | `AnthropicLLM` | Leading-system split; system as `TextBlockParam[]`; 1h breakpoint on last system block and top-level 1h `cache_control` when conversation scope; shared base-param builder for sync/stream; `cache_control` controlled key | Owns Anthropic request shape | SDK types |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | agent | `LlmPhase` | Pass `promptCacheScope: 'conversation'` in options | Owns conversation lifecycle | — |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | agent | `LLMRequestAssembler` | Delete the unconditional reset call; accept `requestTools`; after compaction compute the digest and call `bindRetainedReasoningToRequestPrefix` before `captureRecoverySnapshot` | Owns request-assembly order | `leadingSystemMessages`, digest |
| `autobyteus-ts/src/agent/llm-request-prefix-digest.ts` (new, small) | agent | `LLMRequestAssembler` | `computeLlmRequestPrefixDigest` pure function | One concern; keeps hashing out of memory and adapter | — |
| `autobyteus-ts/src/memory/memory-manager.ts` | memory | `MemoryManager` | Replace `resetAnthropicSignedHistory` with `bindRetainedReasoningToRequestPrefix(digest)` plus in-memory `retainedReasoningPrefixDigest` | Owns working-context mutation | `withoutAnthropicThinkingInMessage` |
| `autobyteus-ts/src/llm/utils/messages.ts` | llm/utils | — | Add `leadingSystemMessages(messages)` | Home of `Message`/`MessageRole` | — |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` (also above) | agent | `LlmPhase` | Also pass `toolSchemas` to `prepareRequest` | — | — |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | llm | catalog | Sonnet 5 → `pricing(2, 10, {read 0.2, 5m 2.5, 1h 4})` | — | `pricing()` |
| `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `pnpm-lock.yaml` | build | — | `@anthropic-ai/sdk` 0.132.1 | — | — |
| Docs: `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/modules/token_usage.md`, plus an Anthropic caching note in the LLM docs if one exists | docs | — | Append-only + caching description; Sonnet 5 price | — | — |

## Applied Patterns (If Any)

Adapter (existing): provider-specific translation of a provider-neutral intent.

## Target Subsystem / Folder / File Mapping

All changes are in existing files listed above; no new folders or files in production code. New tests go next to existing ones (`autobyteus-ts/tests/unit/llm/api/`, `tests/unit/agent/`, `autobyteus-server-ts/tests/unit/token-usage/pricing/`).

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api` | Persistence-Provider (adapter) | Yes | Low | Existing |
| `autobyteus-ts/src/agent/loop` | Main-Line Domain-Control | Yes | Low | Existing |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Conversation request | `{ model, max_tokens, thinking, tools:[…], system:[{type:'text', text: SYSTEM, cache_control:{type:'ephemeral', ttl:'1h'}}], messages:[…], cache_control:{type:'ephemeral', ttl:'1h'} }` | Markers placed by `LlmPhase` or via kwargs; 5m on the tail and 1h on system plus a 1h tail later (TTL order) | Single authority; valid TTL order (all 1h) |
| No system prompt | top-level `cache_control` only (tools are covered by the tail breakpoint) | Marker on a fabricated empty system block (empty text blocks cannot carry `cache_control`) | API validity |
| Tool change mid-run | Request k digest D1; Settings changes media model → request k+1 digest D2 ≠ D1 → memory strips all thinking once and persists → request accepted (P3); request k+2 digest D2 → no strip, append-only | Keep thinking and send the new tools (P2: 400); or strip every turn (S1 cost) | The guard is event-driven, not per turn |
| Restore | New `MemoryManager` (digest null) on a snapshot holding latest-cycle thinking → first request strips once → valid | Assume snapshots are already stripped | ARCH-003 |
| One-shot | Compaction call: no `cache_control` anywhere | Automatic caching on unique content (1.25×/2× write never read) | Cost |
| Late note | working context `[SYSTEM prompt, user, assistant…, user(tool_results), SYSTEM note, user new]` → `system:[prompt]`, messages `…, {role:'user', content:'System note: …'}, {role:'user', content:'new'}` | `system: prompt + '\n' + note` | Keeps top-level system byte-identical; consecutive user messages are accepted and combined by the API |
| Append-only | Turn N+1 request = turn N request messages + appended messages, byte-identical | Stripping thinking at turn start | Cache + preserved thinking |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the per-turn reset behind a flag | Fear of preserved-thinking 400s | Rejected | Event-driven guard (REQ-012) |
| Store and replay the tool definitions as first sent (review option b) | Keeps the prefix stable across Settings changes | Rejected | Would stop Settings changes reaching running agents (behavior change); the guard keeps current behavior |
| Persist the prefix digest in the snapshot to skip the restore strip | Saves one rewrite per restore with unchanged tools | Rejected for now | In-memory digest; revisit only if restore rewrites are measured as material (DESIGN.md phase 2) |
| Production `thinking-binding-controls` beta with `drop_block` as a safety net (review option c) | Degrade instead of 400 on unknown edits | Rejected | Beta header on every request; the guard covers the known events deterministically; validation uses `"error"` and escalates any other edit |
| Extra breakpoint before the latest tool cycle (S2) | Survive the strip | Rejected | Unneeded once the strip is gone (S2 ≈ S1) |
| Capture native blocks for text-only replies | Strict append-only | Rejected for this scope | S4 shows equivalent cost and validity without a memory/persistence change |
| 5m TTL / configurable TTL | Cheaper for continuous sessions | Rejected | 1h fixed, matching Claude Agent SDK and real-session economics |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Upgrade `@anthropic-ai/sdk` to 0.132.1 in both manifests. Run `pnpm install`, then typecheck `autobyteus-ts` and `autobyteus-server-ts`, including the Claude Agent SDK backend. Fix any typing in place.
2. Add `promptCacheScope` to `LLMInvocationOptions`.
3. `anthropic-llm.ts`: extract the shared base-param builder; implement the leading-system split, the system block array, and markers under the conversation scope; add `cache_control` to the controlled kwargs and drop it from extra params.
4. `llm-phase.ts`: pass `promptCacheScope: 'conversation'`.
5. Add `leadingSystemMessages` and use it in the adapter. Add `computeLlmRequestPrefixDigest`. Replace `resetAnthropicSignedHistory` with `bindRetainedReasoningToRequestPrefix`. In `prepareRequest`, remove the unconditional call and add the guard after compaction and before the recovery snapshot. `LlmPhase` passes `toolSchemas`. Update the affected tests.
6. Correct the Sonnet 5 catalog row and the server test row.
7. Add tests (Guidance). Update the docs.
8. Live verification through the test vault (API/E2E).

## Key Tradeoffs

- 1h TTL costs 0.75× more on each written delta than 5m, but avoids full rewrites after 5–60-minute pauses. It is net cheaper on real sessions.
- Text-only replies still lose their own thinking on replay (unchanged behavior). This avoids a persistence change. Tool-cycle reasoning is now retained across turns, which improves on today.
- Fixed policy, no user configuration: simpler. Revisit only on evidence.

## Risks

- RSK-003: an unidentified history edit now yields a 400 on enforced accounts. Known events (tool definitions, leading system, restore) are covered by the guard. Mitigations: AC-002 byte-prefix test across tool continuation **and** independent turn, AC-013 guard tests, an interruption + new-turn test, and live validation with `prefix_mismatch_behavior: "error"`.
- P-004 (residual): image bytes re-read from disk per request; a changed file under kept thinking would 400. No supported workflow does it.
- Late-note rendering creates consecutive user messages. The API accepts and combines them (documented). A unit test asserts the shape and AC-011 is validated live.
- SDK upgrade peer resolution with `@anthropic-ai/claude-agent-sdk` 0.3.280. Verify the lockfile keeps one acceptable resolution and that the Claude backend typecheck and unit tests pass.
- Below-minimum prefixes (< 512/1024/2048 tokens by model) silently do not cache. This is acceptable as a non-goal.

## Guidance For Implementation

Unit tests (`autobyteus-ts`):
- `anthropic-llm.test.ts`:
  - conversation scope (sync and stream) → `system` is a block array whose last block has `{type:'ephemeral', ttl:'1h'}`, and top-level `cache_control` is `{type:'ephemeral', ttl:'1h'}`;
  - no scope → no `cache_control` anywhere and system unchanged in content;
  - no system + scope → only the top-level marker;
  - a late SYSTEM message renders in place as user text, and the top-level system contains only the leading run;
  - kwargs/extraParams `cache_control` cannot override;
  - Opus 5.5 policy tests still pass.
- `llm-request-assembler.test.ts` / `anthropic-signed-tool-continuation.test.ts`:
  - replace the "removes signed blocks before an independent turn" expectation with: thinking blocks are retained across an independent turn;
  - render request N and N+1 (tool continuation, then independent turn) and assert that N+1's rendered `system`, `tools` and message prefix are deep-equal to N's (AC-002);
  - add an interruption-then-new-turn case (AC-011).
- `llm-phase` test: options include `promptCacheScope: 'conversation'`; `prepareRequest` receives the same `toolSchemas` that are sent.
- Guard tests (AC-013): (1) unchanged tools and system across turns → no strip and thinking retained; (2) tool schema changed between two requests, including mid tool cycle → thinking stripped once and the snapshot persisted before the recovery checkpoint; the next request with the same tools does not strip; (3) a new `MemoryManager` restored from a snapshot with thinking → first `prepareRequest` strips; (4) a failed request after a strip cannot restore the stripped blocks; (5) a fresh run → no-op.
- Compaction strategy test: no `promptCacheScope` (AC-005).
- Normalizer test: a usage with `cache_creation.ephemeral_1h_input_tokens` and `cache_read_input_tokens` → observation fields and `cache_state='positive'`.
- Catalog test: Sonnet 5 row values.

Server tests:
- `token-price-config-provider.test.ts` Sonnet 5 row → `[2, 10, 0.2, 2.5, 4]`.
- Calculator test for `claude-opus-5-5`: uncached 1,000,000 × $4 + read 1,000,000 × $0.20 + 1h write 1,000,000 × $8 + 5m write 1,000,000 × $5, with exact component costs.

Live validation (API/E2E, via the test vault; user permission 2026-10-09):
- a native-runtime Opus 5.5 run with ≥ 25 calls and ≥ 2 independent turns, ≥ 90 % hit (AC-003);
- the first call of a new turn writes only the new input (AC-004);
- interruption then new turn without a 400 (AC-011);
- AC-013 in `"error"` mode: change a media default model in Settings while an Opus 5.5 agent is mid-run, and restart the app and continue a run that has thinking. Both must give no 400.
- `probes/strategy-probe.mjs` shows how to enable the strict preserved-thinking check (`thinking.block_binding.prefix_mismatch_behavior: "error"`, beta `thinking-binding-controls-2026-08-01`) for a validation harness. Do not ship it in production.
- The Token Meter's cache rows should match the Console (AC-007; user verification).
