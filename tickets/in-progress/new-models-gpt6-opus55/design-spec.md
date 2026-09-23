# Design Specification — GPT-6 Sol/Luna, Claude Opus 5.5, Anthropic SDK refresh

## Solution And Approval Basis

- Package/revision: `new-models-gpt6-opus55` / **SR-005** (bounded catalog file-responsibility revision after code review CRR-001 Fail / CR-F-001; approved SR-002 requirements and ARCH-REV-002-passed SR-004 runtime architecture unchanged).
- Requirements: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/requirements-doc.md`, Approved SR-002; user 2026-09-23 “do you think you can start to work on it now?” after the SR-002 approval request; Solution Designer stated the both-SDK interpretation in reply. No behavior-defining supplement; three screenshots are evidence only.
- Investigation: same directory `investigation-notes.md`, evidence I-01–I-22; independent architecture review `design-review-report.md` ARCH-REV-002 Pass on SR-004; code review `code-review-report.md` CRR-001 Fail / Design Impact CR-F-001 on IR-001 commit `704e2108e`. Design status: **Ready for renewed independent architecture review of the bounded SR-005 change**, not API/E2E. No Product UI/UX spec applies.
- Workspace: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55`, branch `requirements/new-models-gpt6-opus55`, base `origin/personal@467c1bc12d439ee79243d124402c2f65f25c3cd2`, finalization target `origin/personal`.

## Current-State Read

At the pre-implementation baseline, Autobyteus direct API models came from `supported-model-definitions.ts`; the server exposed that factory catalog and used its pricing for new usage snapshots. OpenAI already used Responses and had Astra/long-context patterns. Anthropic direct requests used `@anthropic-ai/sdk` **Messages API** (`client.messages.create`), not Claude Agent SDK, but its stream reduced signed thinking to display text and tool-use deltas; `LlmPhase`/`MemoryManager` and the prompt renderer lost native signatures. SR-004 resolved the direct signed replay, normal-turn and compaction design gaps (ARCH-F-001/002), and IR-001 implemented those reviewed paths. Codex and Claude Agent SDK catalogs remain independently discovered at runtime (I-08/I-10). Both Anthropic SDKs were upgraded to exact stable pins in IR-001. This historical baseline is retained to explain the cumulative design; the only new SR-005 source change is catalog structure.

**Post-implementation source-structure finding:** IR-001 implemented the approved rows and reviewed runtime paths; CRR-001 confirmed those behavior traces but found that changed `supported-model-definitions.ts` is 538 effective nonempty lines versus a `>500` changed-source hard limit (I-21). The file combines local catalog pricing construction, Anthropic-specific schemas/rows and other providers. Existing `qwen-supported-model-definitions.ts` demonstrates provider-specific row grouping while the one exported `supportedModelDefinitions` aggregate remains LLMFactory's authority (I-22). This SR-005 delta moves Anthropic-owned payload and genuinely shared pricing construction; it does **not** reopen Opus 5.5 runtime, persistence or SDK design.

## Task Size And Architectural Risk (Mandatory)

- **Task size: Large.** The cumulative approved solution still crosses provider stream, shared response/agent, memory/compaction and SDK runtime boundaries. The **new SR-005 delta alone** is a small/low-risk catalog file extraction, not a fresh broad refactor; the cumulative package and re-review route remain Large.
- **Architectural risk: High.** Cumulative signed-provider/persistence/SDK risk remains and was independently confirmed by ARCH-REV-002. The new catalog split changes no runtime owner, public API, persistence or request semantics; its local risk is preserving exact order/metadata/prices and avoiding import cycles. Classification is not downgraded merely because this repair is bounded.
- Escalate on any new schema migration, public API change, SDK permission/event semantic break, live provider behavior inconsistent with documented payloads, or evidence that old snapshots cannot be consumed directly. Return Design Impact/Requirement Gap as appropriate; do not silently broaden scope.

## Architecture Investigation Evidence

| Evidence | Observation → decision | Remaining uncertainty |
| --- | --- | --- |
| I-01/I-04/I-05 | Exact GPT-6 IDs, metadata, tier pricing and established Responses adapter → add Sol/Luna rows and focused payload tests, reuse Astra path. | Live API entitlement without keys. |
| I-02/I-06/I-13–I-15 | Opus 5.5 requires adaptive thinking and signed block replay; current renderer loses it → provider-specific request policy plus ordered native assistant-turn preservation at the tool-cycle boundary. | No-key contract tests cannot prove live 200/400 behavior. |
| I-07/I-16 | Existing catalog pricing and immutable historical snapshots → use existing pricing shape, no historical repricing. | Production record volume not inspected. |
| I-08/I-10/I-17 | Codex/Claude SDK discover models dynamically → preserve discovery; validate local Codex IDs/turns rather than static Codex entries. | Local Codex account's advertised models. |
| I-11/I-12/I-17 | Exact current pins and no-key Claude test seams → refresh both pins after re-query, adapt only compilation/behavior deltas, run focused regressions. | Latest version may advance before implementation. |
| I-18–I-20; ARCH-F-001 | Official provider contract permits removal of **all** thinking blocks, but not a middle gap; dynamic tools/system/media make indefinite prefix preservation broader than approved tool-cycle need → actively end signed retention at the next independent turn, never reintroduce old blocks. | No direct-key enforcement test. |
| I-18/I-19; ARCH-F-002 | Client-authored keep-tail summary invalidates retained signed blocks; current compaction is reachable even before tool continuation → defer compaction inside active signed tool cycle and strip stale thinking at accepted client compaction before retained tail is sent. | No direct-key enforcement test. |
| I-21/I-22; CR-F-001 | Changed catalog file is 538 effective lines, above source-review 500 limit; Anthropic schemas/rows and shared pricing helper can be extracted while one aggregate remains authoritative → bounded provider-owned split and focused equivalence tests. | Implementation must verify effective-line counts and zero duplicate IDs/import cycles. |

## Intended Change

Add exact provider API model definitions and Standard pricing, make the existing Anthropic Messages path valid for Opus 5.5 including signed thinking/tool continuation, refresh both Anthropic SDK packages, and validate dynamic Codex GPT-6 with the local account. Preserve other provider IDs, model defaults, historical snapshots and SDK/runtime journeys. No new selectors/routes or static Codex/Claude SDK catalog entries. **SR-005 technical correction:** keep these exact catalog semantics but move Anthropic schemas/rows into a provider-owned module and shared pricing construction into one small helper so the changed aggregator stays below the source-review hard limit.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind / requirement / trigger | Current evidence → approved outcome | Target path / spine |
| --- | --- | --- | --- |
| BEH-001 | User/System; REQ-001, AC-001/002; direct model selection | I-04/05: Astra present, Sol/Luna absent → exact Sol/Luna metadata and valid Responses tool/usage | Selector → catalog/factory → agent LLM → Responses; DS-001 |
| BEH-002 | User/System; REQ-002, AC-003/004; direct Opus 5.5 multi-turn/tool continuation | I-06/I-13–20: baseline row absent, signed thinking lost; SR-004/IR-001 provides valid active replay; CR-F-001 requires structural-only catalog extraction | Selector → one aggregate catalog (Anthropic provider sublist) → Anthropic Messages → stream → memory → turn-boundary/compaction validity owner → renderer → Messages; DS-002/003/008 |
| BEH-003 | System; REQ-003, AC-005; usage observed | I-07/I-16: price factory/snapshot → documented Standard rates/tier/cache, no fabricated trust | Usage → catalog price → calculator → snapshot; DS-004 |
| BEH-004 | User/Operational; REQ-004, AC-006; Codex advertised selection | I-08/10: dynamic model/list → same discovered ID in thread/turn and local live smoke | Codex discovery → selector → thread/turn; DS-005 |
| BEH-005 | Operational; REQ-005/006, AC-007/008; validation | I-03/09/17: no API keys, Codex auth present → deterministic tests, live Codex attempt, honest outcome | Test harness → provider mocks / Codex local; DS-006 |
| BEH-006 | Operational/System; REQ-007, AC-009/010; SDK maintenance | I-11/12: both pins stale → stable exact pins and preserved Agent SDK/direct API journeys | manifests/lock → Claude SDK client/session; DS-007 |

## Relevant Supplemental Task Artifacts

None authoritative. User screenshots are input evidence (absolute paths in investigation notes); no behavior-defining supplement or Product artifact.

## Task Design Health Assessment (Mandatory)

- Change posture: Feature + provider contract bug fix + dependency maintenance.
- Current design issue: **Yes**, for signed-thinking tool replay and lifecycle. Root cause: **Boundary Or Ownership Issue / Shared Structure Looseness**. The Anthropic adapter knows complete native blocks but reduces them before the agent/memory/renderer boundary; first design omitted the approved normal-turn and compaction lifecycle. Adding only a model row or immediate-turn replay would leave the supported agent path broken (ARCH-F-001/002).
- Refactor needed now: **Yes, bounded**. Carry one typed provider-native assistant turn as a response-level unit rather than scattering thinking onto individual tool calls. Memory owns a single immutable signed-retention window and one atomic stale-thinking invalidation operation used at independent-turn and accepted-compaction boundaries. The Anthropic adapter/renderer own capture/replay; generic response transport remains narrow. Do not refactor unrelated providers or Claude Agent SDK internals.
- SR-005 additional design-health finding: **File Placement Or Responsibility Drift** in the static catalog. CR-F-001 found the changed aggregate at 538 effective nonempty lines, over the established 500 limit. A bounded provider-owned extraction is required now: one Anthropic definitions module contains its rows/schemas, one genuinely shared pricing constructor serves it and the remaining aggregate, and `supported-model-definitions.ts` remains the sole authoritative assembled registry. This is not a second catalog owner and does not change factory behavior.
- Residual risk: no-key mocks cannot prove provider acceptance; local Codex entitlement may differ from screenshot; latest SDK may introduce an uncovered runtime change. These are validation disclosures, not reasons to assert success.

## Terminology

- **Native assistant turn:** The ordered, complete `text`/`thinking`/`redacted_thinking`/`tool_use` content blocks from one Anthropic Messages assistant response, including thinking signatures or redacted data. It is distinct from display `reasoning_content` and per-call tool context.
- **Tool continuation:** Sending that assistant turn back with matching user `tool_result` blocks; signed thinking blocks must be byte-for-byte unchanged.
- **Active signed-retention window:** Consecutive Anthropic tool-result continuations within one active agent tool cycle. On the first independent later turn, all prior `thinking`/`redacted_thinking` blocks are removed atomically from replayable native turns and never restored. This is an allowed all-block reset, not a middle gap. Text, tool-use/results and display reasoning remain.

## Legacy Removal Policy (Mandatory)

Policy: **No backward compatibility; remove legacy code paths.** Replace the current lossy Anthropic tool-bearing assistant reconstruction as the path for newly captured Opus 5.5 native turns. Do not keep a second Opus 5.5 strip/rebuild branch. Existing generic rendering for historical messages without native blocks and existing other Anthropic models remains a supported data path, not a new compatibility shim. An all-block reset retains native text/tool-use blocks but removes signed reasoning; it does not synthesize signatures or use a beta drop fallback. Do not introduce aliases, static Codex fallbacks or duplicate SDK wrappers.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subjects: run config model ID (string), immutable token-usage price snapshots, working-context snapshot v5 assistant messages with optional metadata/native tool-call context; disk snapshot files through `RunMemoryFileStore`. Approximate production volume not observed. Representative **code shape**, serializer and validators inspected (I-15/I-16); no private production records were opened.
- Delta: new catalog identifiers/prices; optional typed `provider_native_assistant_turn` metadata on newly captured Anthropic assistant tool turns. Existing generic `Message.metadata` is serialized/deserialized unchanged and may be absent. Native turn includes sensitive reasoning/signature material already represented in reasoning memory, so keep it within working-context persistence; no segment event/log/GraphQL projection of the raw block payload. At an independent-turn reset or accepted client compaction, a **new current snapshot** stores retained native turns without old thinking/redacted blocks; raw historical traces and display reasoning are not rewritten.
- Invariants: old model IDs still resolve; historical price snapshots remain fixed; old snapshots without this optional key still parse and finalize. Within an active tool cycle, signed native blocks round-trip exactly and tool results match. Before a later independent turn or after a client-authored summary, **all** earlier replayable signed blocks are removed together and never reintroduced; retained text/tool-use/results/provenance remain and no orphaned tool result arises. Never strip the current tool-use assistant thinking before its immediate tool-result continuation; defer compaction until the tool cycle has settled. Snapshot v5's version-agnostic metadata reader supports absence or stripped form of the key.
- Decision: **Directly Usable — No Migration.** Neither storage envelope nor required old-field semantics change; `metadata` is an optional object and serializer already preserves it. No bulk I/O, downtime or data rewrite is justified. Current runtime may atomically replace its working-context snapshot at the explicit turn/compaction boundary; that is normal state progression, not historical migration. Test old-snapshot read, signed snapshot resume, all-block reset, new round-trip, compaction and rollback/retry behavior. If implementation finds a normal reader that drops or corrupts this key, return Design Impact rather than adding ad-hoc dual reads.
- SR-005 catalog extraction introduces **no additional persisted-data shape or state transition**. The same exact model IDs, prices and metadata reach the same readers; historical snapshots remain untouched. Verify catalog equivalence rather than inventing a migration.
- `Migration Plan`: N/A. Existing records lack Opus 5.5 signed turns because the model was not registered; they need no synthetic signatures. Existing generic tool turns remain directly readable.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start → End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001 | Model selection → Responses reply/usage | Direct API factory + OpenAI adapter |
| DS-002 | Primary end-to-end | BEH-002 | Opus selection → Anthropic reply/tool continuation | Anthropic adapter + agent loop/memory |
| DS-003 | Return-event | BEH-002 | Anthropic stream events → working context → next Messages request | Anthropic assembler/renderer across memory transport |
| DS-004 | Bounded local | BEH-003 | Usage observation → price snapshot | Token pricing owner |
| DS-005 | Primary end-to-end | BEH-004 | Codex model/list → local thread/turn | Codex catalog/runtime |
| DS-006 | Operational | BEH-005 | Tests → evidence report | Implementation/API-E2E roles |
| DS-007 | Operational | BEH-006 | Registry stable check → pinned SDK → Claude runtime | Dependency manifest + Claude SDK integration |
| DS-008 | Bounded local / lifecycle | BEH-002 | New independent turn or accepted client compaction → signed-history validity reset → next Anthropic request | MemoryManager + AcceptedCompactionBuilder |
| DS-009 | Bounded local / catalog assembly | BEH-001/002/003 | Provider-owned static row modules → sole aggregate list → LLMFactory/price lookup | Static model catalog |

## Primary Execution Spine(s)

- DS-001: Existing selector → server model catalog → `LLMFactory`/Sol-Luna definition → `OpenAILLM`/`OpenAIResponsesLLM` → Responses API → agent stream/usage.
- DS-002/003: Existing selector → factory/Opus 5.5 definition → `AnthropicLLM` Messages API → ordered native block assembler + tool delta stream → `LlmPhase` response aggregation → `MemoryManager` assistant/tool batch → working-context snapshot → `AnthropicPromptRenderer` native turn + tool results → immediate next `messages.create` within the active tool cycle. At a later independent turn, DS-008 runs before rendering.
- DS-008: New independent agent turn → memory-owned all-block signed reset (persisted before recovery checkpoint) → optional accepted keep-tail compaction with retained stale blocks stripped → append new input → renderer. Pending compaction is **deferred** during an active tool continuation; no client summary is inserted between assistant tool-use and its required signed continuation.
- DS-005: Codex `model/list` → normalizer/catalog/GraphQL selector → configured run → `thread/start` → `turn/start` → local authenticated completion.
- DS-007: exact dependency pins/lockfile → Claude SDK client/query and session/backend adapters → existing model/event/tool/interrupt behavior.
- DS-009: `anthropic-supported-model-definitions.ts` (rows/schemas) + existing other provider rows/Qwen sublist + one `supported-model-pricing.ts` constructor → ordered `supportedModelDefinitions` aggregate → unchanged LLMFactory lookup and server price projection. No second runtime registry or alias.

## Spine Narratives (Mandatory)

DS-001 adds catalog payload only; existing Responses request and usage handling remain the governing path. DS-002/003 captures complete ordered assistant content for a tool-bearing response and carries it once through the response/memory path; the renderer sends it unchanged with matching results during the active tool cycle. DS-008 closes that cycle at the next independent turn: it removes **every** earlier signed thinking/redacted block from replayable Anthropic turns in one persisted operation before the new request, even when a plain assistant reply occurred between tool cycles. This consciously trades earlier reasoning continuity for a valid non-beta Messages request under the provider's allowed all-block-removal rule; it does not lose text, tool-use/results or display reasoning. Accepted client-side compaction independently applies the same reset to its retained tail, and execution is deferred while a tool continuation needs the signed blocks. DS-004 uses current catalog price fields and calculator tier logic for new usage snapshots, without repricing old ones. DS-005 has no static model substitution; validation observes and invokes each local advertised GPT-6 ID. DS-006/007 separate no-key contracts from real local Codex evidence and check SDK compatibility with the existing runtime test seams. **DS-009 is SR-005's only new spine**: provider-owned static row payload is combined once by the existing aggregate, then the same LLMFactory/pricing readers consume it; no new runtime path.

## Spine Actors / Main-Line Nodes

Model catalog/factory; provider adapter; agent LLM phase; memory manager/working context; Anthropic prompt renderer; pricing calculator; Codex App Server client/thread; Claude SDK client/session. Existing selector/GraphQL is a thin presentation entry, not a new owner.

## Ownership Map

Catalog owns exact static API definitions, config schema, metadata and price. Its **one authoritative exported aggregate** owns row ordering and all LLMFactory reads; the Anthropic provider module owns only its row/schema declarations, and a shared pricing constructor owns the common catalog metadata wrapper. Anthropic adapter owns request restrictions and raw stream assembly; it must not persist state directly. `LlmPhase` owns response aggregation and identifies whether the next request is an immediate tool continuation or a new independent turn; it does not edit Anthropic blocks. `MemoryManager` owns durable assistant/tool protocol, snapshot and **atomic all-block reset** of stale provider-native reasoning at turn boundary. `AcceptedCompactionBuilder` owns the same reset for retained messages before committing a client-authored summary; `PendingCompactionExecutor`/assembler defer that compaction during an active tool continuation. Renderer owns translating retained native turn/tool results into Messages payload and must never reconstitute stripped thinking from display reasoning. Codex/Claude SDK clients own dynamic discovery and session transport. Pricing owner owns trust/tier calculation.

## Thin Entry Facades / Public Wrappers (If Applicable)

Existing GraphQL/model catalog and LLM factory are entry boundaries only for this change. Do not add a route or expose native thinking/signatures through these facades.

## Removal / Decommission Plan (Mandatory)

| Item | Replacement / action | Scope |
| --- | --- | --- |
| Lossy reconstruction of newly captured Anthropic signed tool turns from `reasoning_content`/tool calls | Exact ordered native assistant turn in Anthropic renderer | In this change |
| Silent pass-through of Opus 5.5 forced `tool_choice` and unsupported explicit thinking modes | Opus 5.5 request preflight validation | In this change |
| Indefinite replay of signed blocks after a new independent turn or client-authored summary | One memory-owned, persistent all-block reset at these explicit validity boundaries | In this change |
| Client keep-tail compaction inside an active signed tool continuation | Defer pending compaction until the cycle settles; preserve exact immediate tool replay | In this change |
| Anthropic rows/schemas and shared pricing constructor embedded in an over-limit aggregate file | Move Anthropic payload to `anthropic-supported-model-definitions.ts`; move shared constructor to `supported-model-pricing.ts`; replace inline Anthropic block with one ordered spread | In SR-005 rework |
| Old exact Anthropic SDK pins/lock entries | Re-resolved stable exact versions | In this change |
| Generic historical tool-call rendering with no native turn | Retain: required for directly usable historical data/other supported models | N/A, not obsolete |

## Return Or Event Spine(s) (If Applicable)

Anthropic streaming `content_block_start/delta/stop` and `message_delta/stop` are assembled in provider order. Continue emitting text/reasoning/tool deltas for existing UX/tool execution. Emit a single completion chunk only after all content blocks/signatures are complete, with usage and optional native turn. Interruption must not persist an incomplete signed native turn; existing partial display/error handling remains. A new independent turn resets all prior replayable native thinking before request assembly; an immediate tool continuation does not. The reset persists before the request recovery checkpoint so a failed request cannot restore removed blocks. Codex/Claude SDK event flows remain unchanged except adaptations required by exact upgraded SDK types.

## Bounded Local / Internal Spines (If Applicable)

- Anthropic request preflight: model policy → provider-extra/kwargs merge → reject Opus 5.5 forced choice (`any`/`tool`) and explicit disabled/manual-budget thinking; omit unsupported sampling → `messages.create`. Do not silently pretend an explicit invalid user setting worked. Existing models retain their current policy.
- Anthropic native block capture: initialize indexed block from `content_block_start`; append `text_delta`, `thinking_delta`, `signature_delta`, `input_json_delta` to the corresponding block; retain `redacted_thinking`; finalize at `content_block_stop`; validate complete ordered blocks against tool IDs before attaching to terminal response. Fail closed on incomplete signature/JSON rather than replaying a lossy approximation.
- Tool replay: read typed native turn from assistant message; validate model/provider block shape and tool-use IDs match `ToolCallPayload`; emit blocks unmodified (deep-clone only) then user tool results. Do not derive thinking from display reasoning or mutate its signature.
- Turn-boundary lifecycle: determine independent turn versus immediate tool continuation from the agent-turn/tool-protocol state, not merely a UI sender label; on the former, use one typed all-block reset over **all** retained Anthropic native turns in working context and persist it before rendering. Reset removes `thinking` and `redacted_thinking` blocks, not text/tool-use blocks, executable tool intents/results, display reasoning or provenance. It must not reinsert old thinking on retry, rollback, snapshot restore or later renderer calls. A plain non-tool assistant reply does not create a signed block under this deliberately turn-scoped strategy; no later signed turn can be separated from an earlier retained one by that reply because prior signed blocks are gone before the later independent turn.
- Compaction lifecycle: if a pending automatic compaction is reached during an immediate tool-result continuation, **defer** it without marking the pending request failed or consumed. On the next eligible independent turn, run reset before compaction; at the accepted-compaction boundary, apply the same reset to every retained assistant native turn before finalizing summary + keep-tail. Do not compact between a tool-use assistant response and its signed tool-result continuation. Validator asserts no pre-summary signed block survives, tool-use/results remain paired, and new post-summary signed blocks may be captured normally.

## Off-Spine Concerns Around The Spine

Pricing cache/tier policy stays in catalog/pricing owner. Snapshot validation/compaction and signed-retention reset stay in memory owner; LlmPhase supplies only the lifecycle fact (continuation vs independent) and the compaction executor honors it. Provider key resolution stays in existing secret resolver; mocks use fake client, no key inspection. Telemetry emits existing text/reasoning/usage events only, not raw native blocks. SDK package/peer resolution stays in manifests/lockfile, not runtime version branching.

## Ownership Boundaries

Provider-native assembly and validation belong to `autobyteus-ts/src/llm/api` plus a JSON-safe Anthropic native-turn structure under `llm/utils`; shared response types provide only an optional transport slot. Working context persists the typed payload and owns removal of its signed blocks only at explicit turn/compaction validity boundaries; it never edits a surviving signed block. Renderer is the only consumer that turns it back into Anthropic request blocks. Claude Agent SDK session path is separate from direct Messages path; it must not consume the static Opus row.

## Boundary Encapsulation Map

Caller → `LLMFactory` → provider adapter; agent loop → `MemoryManager` (not snapshot store directly); provider adapter → shared response transport → agent loop/memory → provider renderer. Request assembler invokes the memory boundary before an independent turn and consults the existing pending-compaction owner; accepted compaction transforms retained messages through the same typed reset helper. Server model catalog → factory; Claude backend → `ClaudeSdkClient`; Codex backend → App Server client. No caller above these owners reaches into their private storage/stream internals.

## Dependency Rules

No Anthropic SDK resource types in generic memory/response types; define a tight JSON-safe provider-native turn type/validator and pure `withoutThinkingBlocks` transform in `llm/utils`, with assembly in Anthropic API code. Both independent-turn and compaction paths call that single pure transform via the memory owner; no provider-SDK import in memory. No duplicated signatures or redundant parallel block arrays. Do not put provider request policy in catalog or generic agent loop. No dynamic runtime model IDs hard-coded into static API definitions. No unverified fallback to another model on Codex failure.

SR-005 catalog dependency rule: `supported-model-definitions.ts` may import `anthropic-supported-model-definitions.ts` and `supported-model-pricing.ts`, and the Anthropic module may import the pricing helper, but **the provider module and pricing helper must never import the aggregate**. `LLMFactory` and server readers continue to import only the aggregate. Do not duplicate a `pricing` wrapper or create a second independently queried model registry. Preserve original order and all exact row values; source extraction is not a pricing correction.

## Interface Boundary Mapping

| Boundary | Subject / identity | Contract |
| --- | --- | --- |
| Catalog/factory | Exact API model ID string | One definition per new ID, provider/class/schema/metadata/pricing. |
| Anthropic request policy | Exact selected model ID + explicit params | Valid Messages payload or clear local error. |
| Stream → response → memory | One assistant response/tool batch | Optional immutable ordered native assistant turn, distinct from display text and per-call context; retained signed blocks last only through active tool cycle. |
| Working context → renderer | Assistant message with matching tool-call IDs | Replay complete signed blocks then matching results; reject malformed new native payload. |
| Independent turn / compaction → memory | Working-context message sequence + lifecycle classification | Remove all stale native thinking/redacted blocks atomically, persist before rendering/summary commit; retain text/tool protocol. |
| Codex catalog/runtime | Discovered model ID and advertised effort/tier | Propagate same ID without alias. |
| SDK client | Agent SDK query/session ID/model descriptor | Preserve existing auth/discovery/session/event/tool contracts. |
| Static catalog aggregate → LLMFactory | Exact API model ID string | One ordered public list, including an Anthropic provider-owned sublist at the existing position; no consumer imports the sublist as an alternate registry. |

## Interface Boundary Check

No mixed agent/team ID or generic provider selector is introduced. Existing model ID remains an exact string at its owning catalog/runtime boundary. New response field is provider-discriminated, not a bag of unrelated optional provider attributes.

## Main Domain Subject Naming Check

Use `AnthropicAssistantTurn` (or equivalent) for the complete signed assistant response; do not call it `ToolCallContext`, because multiple ordered blocks belong to the turn, not one tool call. Keep `ToolCallPayload` for executable intents and `reasoning_content` for display text.

## Existing Capability / Subsystem Reuse Check

Reuse current factory, Responses adapter, pricing calculator, memory snapshot/finalizer, compaction planner/builder/executor, Codex catalog/runtime and Claude SDK client. No new model registry, API endpoint, migration owner or UI component. Introduce only a small Anthropic-native turn assembler if keeping it in `anthropic-llm.ts` would overload request/stream duties; share one JSON-safe native-turn shape/reset helper across provider, renderer and memory. For CR-F-001, reuse the existing Qwen provider-list pattern, not a new registry abstraction.

## Subsystem / Capability-Area Allocation

- `autobyteus-ts/llm`: static rows, Anthropic request/stream adapter and prompt renderer; shared response transport.
- SR-005 static catalog subdivision within `autobyteus-ts/llm`: aggregate retains sole public registry ownership; Anthropic definition file owns related rows/schemas; pricing helper owns only the reusable catalog wrapper.
- `autobyteus-ts/agent` + `memory`: pass/persist native turn at established aggregation boundary; classify tool continuation vs independent turn; atomically reset signed history at independent-turn and accepted-compaction boundaries; defer compaction during active tool continuation; validate snapshots.
- `autobyteus-server-ts/token-usage`: existing price projection and tests, no new calculator.
- `autobyteus-server-ts/runtime-management/claude` and Claude backend: only SDK compatibility adaptations.
- Codex runtime: no product code unless a live/discovery test proves a real defect.

## Draft File Responsibility Mapping

SR-004 initial mapping modified `supported-model-definitions.ts`, `anthropic-llm.ts`, `response-types.ts`, `llm-phase.ts`, `llm-request-assembler.ts`, `memory-manager.ts`, `anthropic-prompt-renderer.ts`, compaction files, manifests/lockfile and tests. **SR-005 rework inventory is deliberately smaller:** modify only the aggregate and focused catalog tests; add Anthropic provider definitions and shared pricing-helper modules. Do not reopen the signed-turn lifecycle source without a separately evidenced finding.

## Reusable Owned Structures Check

The same complete native turn crosses three boundaries; define one narrow `provider-native-assistant-turn` type with Anthropic variant, ordered JSON-safe blocks, validator and pure all-block removal. It is response-level, not repeated on each tool call. The assembler is Anthropic-specific, not a generic provider framework. The reset helper operates on one typed turn; memory maps it over the complete retained message sequence, avoiding duplicated policy.

SR-005 catalog reuse is narrower: extract only the already-shared USD/source/effective-date `pricing` constructor because both the aggregate and Anthropic provider rows need identical defaults. Anthropic schemas are provider-owned, not promoted to generic shared configuration.

## Shared Structure / Data Model Tightness Check

Keep display `reasoning` separate from replayable signed `thinking`; never regenerate signature from text. All-block removal changes only the replayable native turn; display reasoning remains historical evidence and must never be turned back into provider thinking. Existing per-call `nativeToolCallContext` still records tool-use evidence but is not the authoritative full turn for Opus 5.5. Avoid storing duplicate native turns on both each call and message. No broad optional fields for other providers.

The SR-005 provider sublist contains only Anthropic rows and its three relevant schemas; it is not a second mixed-provider catalog. The pricing helper carries **no** model IDs, rate table or provider-specific tier rule. One aggregate owns global order and uniqueness.

## Final File Responsibility Mapping

| Change | File(s) | Final responsibility |
| --- | --- | --- |
| Modify (SR-005 correction) | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Sole ordered export `supportedModelDefinitions`; preserve other provider rows and spread Anthropic sublist once at its original position. Import shared pricing wrapper; remove moved inline Anthropic schemas/rows and local wrapper. Target **well below 500 effective lines**, not an exactly-500 brittle result. |
| Add (SR-005) | `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | All existing Anthropic provider rows plus `claudeSchema`, `claudeAdaptiveThinkingSchema`, `claudeOpus55Schema`; exact IDs, order, dates, metadata, config/prices unchanged. Export one typed provider row array only; no factory/registry lookup. |
| Add (SR-005) | `autobyteus-ts/src/llm/supported-model-pricing.ts` | Single shared `pricing` constructor with the existing USD/source/effective-date defaults and override semantics; imported by aggregate and Anthropic sublist. No provider-specific rate policy or duplicate wrapper. |
| Add | `autobyteus-ts/src/llm/api/anthropic-assistant-turn-assembler.ts` (or equivalent Anthropic-owned file) | Ordered stream block assembly and completion validation; no memory mutation. |
| Add | `autobyteus-ts/src/llm/utils/provider-native-assistant-turn.ts` | Tight JSON-safe Anthropic turn type/validator and pure all-block thinking removal; no SDK import or generic provider machinery. |
| Modify | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Opus 5.5 request preflight and stream capture/terminal emission. |
| Modify | `autobyteus-ts/src/llm/utils/response-types.ts`, `autobyteus-ts/src/agent/loop/llm-phase.ts` | Optional provider-discriminated transport of one completed native turn. |
| Modify | `autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/llm/prompt-renderers/anthropic-prompt-renderer.ts` | Persist once on tool-bearing assistant message; expose memory-owned atomic signed reset; replay exact surviving blocks with results. |
| Modify | `autobyteus-ts/src/agent/llm-request-assembler.ts`, `autobyteus-ts/src/agent/loop/llm-phase.ts` | Classify independent request vs immediate tool continuation; reset before new-turn render/recovery checkpoint; defer compaction for continuation. |
| Modify | `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts`, `pending-compaction-executor.ts`, `working-context-compaction-output-validator.ts` | Strip stale signed blocks from all retained turns before client summary commit; keep pending compaction unconsumed during tool continuation; validate no pre-summary thinking survives and tool protocol remains complete. |
| Modify | `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `pnpm-lock.yaml` | Exact current stable Anthropic SDK pins/resolution. |
| Modify only on proven break | `autobyteus-server-ts/src/runtime-management/claude/**`, `src/agent-execution/backends/claude/**` | Adapt SDK type/event/session/tool differences while preserving behavior. |
| Add/modify tests | Existing `autobyteus-ts/tests/unit/llm/**`, `tests/unit/memory/**`, `autobyteus-server-ts/tests/unit/runtime-management/claude/**`, `tests/unit/agent-execution/backends/claude/**`, pricing/Codex test locations | No-key contracts, snapshot continuity, SDK regression, live Codex evidence. |

## Applied Patterns (If Any)

Existing adapter, factory and repository patterns only. Anthropic block assembler is an adapter-internal state machine keyed by content-block index; no new generic pattern layer.

## Target Subsystem / Folder / File Mapping

Paths above keep files under existing owners. Stream assembly remains under `llm/api`, while the JSON-safe native-turn shape/reset helper lives in `llm/utils` because response transport, memory compaction and renderer share it without importing SDK types. Do not create a general `common` folder. Compaction changes stay in existing memory files rather than a new subsystem.

SR-005 places provider catalog payload beside existing `qwen-supported-model-definitions.ts` under `llm`, not under `llm/api` (runtime adapter) or a new registry folder. The small `supported-model-pricing.ts` belongs beside catalog definitions because its USD/source/date wrapper is shared by the aggregate and Anthropic sublist. This placement preserves the flat existing catalog layout while removing the over-limit monolith.

## Folder Boundary Check

No new top-level subsystem. `llm/api` owns provider contract, `llm/prompt-renderers` owns outbound provider format, `memory` owns persistence and compaction validity, server Claude SDK area owns dynamic runtime. The small shared response field is transport only; no Anthropic API imports in generic folders. The native-turn helper in `llm/utils` is deliberately provider-discriminated and JSON-safe, not a vague shared policy container.

The SR-005 split follows provider subject depth: one provider row/schema file and one genuinely cross-provider pricing constructor. It does not arbitrarily split each model into a file or introduce a new folder. `supported-model-definitions.ts` remains the only assembled catalog and the sole import used by `LLMFactory`; import-direction tests/build should catch a cycle.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Good immediate tool cycle: `[{type:'thinking',thinking:'…',signature:'signed…'}, {type:'text',text:'…'}, {type:'tool_use',id:'toolu_1',name:'search',input:{q:'x'}}]` is stored once and replayed unchanged as assistant, followed by `{type:'tool_result',tool_use_id:'toolu_1',content:'…'}` as user. Do not surface actual signatures in test logs; fixtures use synthetic values.

Good multi-turn sequence for ARCH-F-001: turn A has signed tool call A/result A; before independent turn B, memory removes **all** turn-A thinking blocks but keeps A text/tool protocol. Turn B returns a plain assistant text answer, with no native signed block to replay. Before independent turn C, no earlier signed block exists; C's signed tool call C/result C is replayed intact. Thus there is no retained A → missing B → C signed-block gap. Bad: keep A signed block, omit B's thinking, then send C's signed block.

Good keep-tail compaction for ARCH-F-002: original prefix + retained `assistant[{thinking:S1,text:T1,tool_use:U1}], user[{tool_result:R1}]` becomes compacted-summary user message + retained `assistant[{text:T1,tool_use:U1}], user[{tool_result:R1}]`; S1 is removed in the committed current snapshot and never restored. A new post-summary tool cycle gets a fresh signed block. If U1 has just been produced and R1 needs immediate continuation, defer compaction instead and first replay S1 unchanged with R1. Bad: client summary plus retained S1 bound to the old prefix.

Good SR-005 catalog shape: `supportedModelDefinitions = [ ...existing earlier rows, ...anthropicSupportedModelDefinitions, ...existing later rows ]` with provider rows declared once in the Anthropic module, while both modules call the same `pricing` wrapper from `supported-model-pricing.ts`. Bad: two exported full catalog arrays or importing `supported-model-definitions.ts` from the provider module, which creates a circular/competing authority.

## Backward-Compatibility Rejection Log (Mandatory)

Reject model aliases, Codex static fallbacks, silent Opus 5.5 invalid-setting coercion, beta `drop_block`/retry as a hidden compaction fallback, and an old/new snapshot migration branch. The optional metadata field is directly absent on old data, not a parallel schema. Retain existing generic rendering for historical assistant tool turns because those are still valid supported records; new signed Opus 5.5 turns must use the exact native path during their active cycle. Once all signed blocks are intentionally removed, renderer must not re-create them from display text. SR-005 also rejects parallel catalog exports, a circular pricing import or duplicate Anthropic rows kept inline as a transition.

## Derived Layering (If Useful)

N/A — spine/owner boundaries above are clearer than a new layer diagram.

## Change / Refactor Sequence

1. Recheck official docs and npm stable dist-tags at implementation time; **first** pin exact both Anthropic packages and update lockfile, install in the isolated worktree, inspect the updated SDK Messages stream/content-block types and Claude Agent SDK query/session/tool contracts, then compile and run focused pre-adapter tests to surface concrete adaptations. Do not accept prerelease/floating pins or infer that a package upgrade alone repairs application-level thinking replay.
2. Add catalog metadata, schemas and Standard rates for Sol/Luna/Opus 5.5; unit-test exact IDs, default/effort, tier/cache and older rows.
3. Implement Opus 5.5 request preflight and ordered native block assembler; preserve existing send/stream usage and tool delta behavior. Test valid/invalid payloads with fake Messages client.
4. Add optional response transport; thread through `LlmPhase` and `MemoryManager` into one typed assistant message payload. Render exact signed blocks plus matching results **only inside the active tool cycle**; reject malformed/incomplete payload rather than silently stripping current-cycle thinking. Test multiple tool calls/continuations, interruption and resume.
5. Implement one JSON-safe `withoutThinkingBlocks` helper and memory-owned atomic reset at independent-turn boundary **before** recovery snapshot; classify by tool-cycle/turn state, not merely sender. Add compaction deferral for active continuation and accepted-compaction retained-tail reset/validator. Test A signed tool → B plain → C signed tool, retry/restart non-reintroduction, protected tool protocol, automatic pending-compaction timing, summary + retained signed turn, post-summary fresh thinking, old/new snapshot round-trips.
6. Adapt Agent SDK integration only to actual build/test findings; run focused no-key Claude direct/Agent SDK and Autobyteus-runtime regressions, then broader build/tests.
7. API/E2E Engineer observes local Codex `model/list`, attempts a minimal authenticated turn for every advertised Astra/Sol/Luna, and reports each exact outcome. Direct provider live tests remain Not Run without keys; no fake success. Delivery owns docs/final verification/finalization.

**SR-005 recovery sequence (overrides only catalog source allocation above):** (a) from IR-001 commit `704e2108e`, move the existing Anthropic schemas and all Anthropic rows verbatim into a typed provider-definition module; (b) move the reusable `pricing` wrapper unchanged into a catalog-pricing helper and import it from aggregate/provider module; (c) replace the exact contiguous Anthropic block at its original aggregate position with one spread; (d) build and test exact catalog order/identity, Sol/Luna/Opus metadata, reasoning schemas, Standard rates, tier/cache and pricing trust, plus old rows; (e) audit every changed implementation-source file with the reviewer effective-line rule, keeping aggregate safely below 500 and each new file below 500, with no `>220` changed-source delta; (f) send reworked implementation through independent source review before API/E2E. No direct-provider/Codex validation bypass is authorized by this structural correction.

## Key Tradeoffs

One typed native turn in working-context metadata avoids a new snapshot schema/migration and keeps generic memory mostly provider-agnostic, at cost of retaining signed thinking inside private context storage during the active tool cycle. The revised **turn-scoped** retention deliberately discards earlier replayable reasoning before the next independent turn, as the official contract permits, rather than implementing indefinite append-only binding across dynamic tool/system/media changes. This does not discard display reasoning or text/tool history and is consistent with the pre-change product, which never preserved native signed thinking across turns. Client-authored compaction strips stale thinking, not tool protocol; active-cycle compaction is deferred instead of silently weakening the immediate replay contract. No beta header/new provider feature. A scoped shared response field is preferable to hiding native data in each tool delta. No static Codex changes because account discovery is authoritative.

## Risks

- Provider may reject a payload despite doc-based mocks: live API keys unavailable; report unverified status.
- Native block assembly can miss `signature_delta`/redacted or emit before block completion: fail-closed tests for fragmented/multi-tool streams and message-stop ordering.
- A lifecycle classifier could mistakenly reset during a tool continuation or retain thinking into a new turn: explicit turn/tool-protocol state, persisted reset before recovery checkpoint and request-sequence tests. If the implementation cannot prove the classifier from existing state, return Design Impact rather than guessing.
- Client compaction may commit a summary with stale signed blocks or consume its pending request before tool continuation: defer without status transition, reset all retained blocks at accepted boundary and validate the finalized request shape.
- Persisted sensitive thinking/signature may leak via generic metadata projections: test/inspect outward serialization and redact/omit native field from events/logs; keep only private snapshot use.
- SDK 0.3.280/0.128.0 or later stable may change query/session/event/permission semantics: exact pin and focused regressions, no silent old-version retention.
- Local Codex may not advertise all three GPT-6 IDs despite screenshot from another host; report per-model blocker rather than substitute.
- SR-005 extraction could change row order, pricing defaults, config-schema references or introduce a catalog import cycle; compare catalog projections before/after the move, compile, assert exact rates/IDs and source effective-line counts. Do not “fix” unrelated catalog content while moving it.

## Guidance For Implementation

Honor approved AC-001–010 and no-key constraint. Treat surviving signed provider-native assistant content as immutable; validate complete block order and tool IDs before persist/replay. Use the documented all-block removal rule at explicit validity boundaries only; never drop a current tool-turn thinking block before its matching tool-result continuation, never remove one middle block and keep later blocks, and never reintroduce removed blocks on retry/resume. **For CR-F-001, change only the catalog file responsibilities described in SR-005 and retain the already reviewed runtime implementation unless a new evidenced finding requires more.** Do not run direct live API tests or print secrets. The user supplied `$HOME/.autobyteus/server-data/.env` as a possible later credential source; do not read/print it here, and carry it to API/E2E only after source-review pass for secret-safe validation. Follow repository `AGENTS.md` test/commit rules. If lifecycle classification cannot be proven or a required stored-data transition emerges, return a classified finding to Solution Designer rather than changing approved behavior. Renewed independent architecture review of SR-005 precedes implementation rework; renewed independent source review precedes API/E2E.
