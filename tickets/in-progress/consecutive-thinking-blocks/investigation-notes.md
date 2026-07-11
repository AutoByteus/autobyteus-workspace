# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Packaged Electron user verification failed on 2026-07-11. Exact new-run evidence confirms a Design Impact: terminal updates to an already-started tool card were incorrectly treated as new ordered reasoning boundaries. Architecture Round 3 accepted that correction but found a permanent-unsupported-protocol requirement gap and a stale formal spine model. The user approved the bounded package corrections and authorized architecture re-review on 2026-07-11.
- Investigation Goal: Locate the precise segmentation boundary responsible for consecutive `Thinking` cards and determine whether AutoByteus behavior is defective.
- Scope Classification: `Medium`
- Scope Classification Rationale: The bounded production correction spans Codex App Server reasoning normalization, Codex ordered-tool card-existence classification, and generic memory trace sequencing. History, GraphQL, and frontend production remain unchanged consumers.
- Scope Summary: Reproduce the exact report, compare provider-native history with AutoByteus history, inspect live segment identity and replay hydration, and define a verifiable grouping invariant.
- Primary Questions Resolved:
  1. Codex can emit multiple consecutive reasoning response items in one turn.
  2. Codex `thread/read` folds the reported sequence into one reasoning item.
  3. AutoByteus preserves the provider item IDs as separate live segment identities and separate replay rows.
  4. The frontend renders the distinct normalized inputs faithfully; it is not duplicating DOM state.

## Request Context

The user reports frequent adjacent `Thinking` cards when software-engineering team agents use Codex App Server and GPT-5.6-Sol. They expect streaming reasoning chunks to append to the preceding thinking block until a tool call or another semantic transcript item appears. Three screenshots were supplied; the first screenshot's user message was located exactly in local durable run data.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks`
- Current Branch: `codex/consecutive-thinking-blocks`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-11; worktree created at `ce83847296d9eace2f6eb832521c1d6b135c4722` from refreshed `origin/personal`.
- Task Branch: `codex/consecutive-thinking-blocks`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only the dedicated ticket worktree above. Existing dependencies/tests were executed from the shared checkout only because it was at the identical commit and already had `node_modules`; no source files were modified there.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md` | Specify observable contiguous-thinking grouping, separators, ordered-card boundaries, live/replay parity, and non-happy states | User-facing target behavior revised from packaged verification plus completed-snapshot-only content source | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008`–`REQ-CTB-010`; `AC-CTB-003`–`AC-CTB-007`, `AC-CTB-009`–`AC-CTB-011` | User approved for architecture re-review | Approved input to the revised design |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/user-verification-failure-analysis.md` | Preserve exact packaged-app failure and origin evidence | Running process/build markers, live GraphQL pairs, raw trace ordering, implementation/design origin | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-009`; `AC-CTB-003`–`AC-CTB-006`, `AC-CTB-010` | Confirmed Design Impact | Include in all rework handoffs |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-11 | Other | User screenshots `ctx_5fbc36717b00__image.png`, `ctx_7d132a369dfb__image.png`, `ctx_ace8a2f6f6b1__image.png` | Establish symptom and runtime configuration | Multiple adjacent `Thinking` cards appear under Codex App Server / GPT-5.6-Sol; first screenshot contains five immediately before assistant text | No |
| 2026-07-11 | Command | `git fetch origin personal`; `git worktree add -b codex/consecutive-thinking-blocks ... origin/personal` | Establish isolated current task state | Dedicated task branch/worktree created at refreshed commit `ce838472` | No |
| 2026-07-11 | Code/Doc | `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/docs/agent_execution_architecture.md` | Establish repository rules and current segment identity contract | Frontend intentionally trusts backend `(segment_type,id)`; provider adapters must encode semantic boundaries | No |
| 2026-07-11 | Command | `codex --version`; `codex app-server --help`; `codex app-server generate-json-schema --experimental -o /tmp/codex-appserver-schema-ctb` | Verify installed runtime and current protocol | CLI `0.144.1`; model catalog includes `gpt-5.6-sol`; schema exposes reasoning summary part/delta item methods and `thread/read` | No |
| 2026-07-11 | Probe | `/tmp/probe_codex_reasoning.py` using direct stdio JSON-RPC `initialize`, `model/list`, `thread/start`, `turn/start` | Observe current GPT-5.6-Sol raw methods without AutoByteus | No-tool probe emitted one reasoning item, one summary part, `summaryTextDelta` frames, then assistant message; confirms raw method shapes but not multi-item reproduction | No |
| 2026-07-11 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_15eb25f9280f4cc0910708e1495c53a4/solution_designer_4209b1ca0cdd48858d859c641b86ad34/raw_traces_active.jsonl` | Locate exact screenshot reproduction | Turn `019f4f1e...` contains five adjacent reasoning traces, then assistant trace, matching UI | No |
| 2026-07-11 | Data | `/Users/normy/.codex/sessions/2026/07/10/rollout-2026-07-10T06-45-56-019f4a58-bb22-7ee3-85b6-e77f31055775.jsonl`, lines 2747–2771 | Inspect provider-native persisted items for exact turn | Five distinct consecutive `response_item(type=reasoning)` IDs with summary part counts `3,3,3,3,2`; no tool/message item between; assistant follows | No |
| 2026-07-11 | Probe | `/tmp/read_codex_thread.py`: direct `codex app-server` `thread/read({threadId:"019f4a58...",includeTurns:true})` | Compare Codex canonical history view for exact turn | Direct app-server response returns `userMessage -> reasoning(14 summary parts) -> agentMessage`; provider history folds the five response items into one reasoning item | No |
| 2026-07-11 | Probe | `curl http://127.0.0.1:29695/graphql` query `getTeamMemberRunProjection(teamRunId:"software_engineering_team_15eb...", memberRouteKey:"solution_designer")` | Inspect running AutoByteus server projection for exact screenshot turn | Projection indexes 848–852 are five adjacent reasoning entries before assistant at 853 | No |
| 2026-07-11 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-segment-tracker.ts` | Identify live identity owner | Stable item ID is returned before turn-cache reuse, so every provider reasoning item becomes a new segment despite adjacency | No |
| 2026-07-11 | Code | `codex-item-event-converter.ts`, `codex-thread-event-converter.ts`, `codex-turn-event-converter.ts` | Map cache lifecycle and event projection | Non-reasoning item starts, text deltas, and turn completion clear the reasoning block cache; completed reasoning snapshots use tracker ID | Design must align clearing with visible boundaries |
| 2026-07-11 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `protocol/segmentTypes.ts`, `components/conversation/AIMessage.vue` | Verify frontend live behavior | An unseen ID creates a synthetic think segment; each segment renders once. No DOM duplication was found | No |
| 2026-07-11 | Code | `runtime-memory-event-accumulator.ts`, `raw-trace-to-historical-replay-events.ts`, `runProjectionConversation.ts` | Trace persistence and reload | Distinct live segment IDs become distinct reasoning traces; later verification showed matching tool results also flush an open same-ID segment | Modify accumulator flush timing; keep schema/projection/frontend and pre-fix history unchanged |
| 2026-07-11 | Command | `pnpm -C autobyteus-server-ts exec vitest run ...codex-reasoning-segment-tracker... ...codex-thread-event-converter...`; `pnpm -C autobyteus-web exec vitest run ...segmentHandler... ...runProjectionConversation... --run` from identical-commit shared checkout | Validate current intended behavior and test baseline | Server 51 tests and web 28 tests pass; existing tracker test explicitly prefers stable item IDs, confirming current behavior is intentional/tested but wrong for the approved UX | Update tests after approval/design |
| 2026-07-11 | Repo | `git log`, `git blame` for `codex-reasoning-segment-tracker.ts` | Determine history and refactor pressure | Tracker introduced with runtime/history refactor in `4fb78f86`; correct owner already exists, so local correction is sufficient | No |
| 2026-07-11 | Review | `design-review-report.md`, Round 1 | Independently validate implementation safety | Found missing collision-safe new-block allocation (`DR-CTB-001`) and incomplete mapping of early-return/event-family boundaries (`DR-CTB-002`) | Revise and re-review with the same IDs |
| 2026-07-11 | Code | `codex-item-event-converter.ts`, `codex-item-compaction-event-converter.ts`, `codex-raw-response-event-converter.ts`, `codex-turn-event-converter.ts`, `codex-thread-lifecycle-event-converter.ts` | Inventory every converted or ignored event family | Ordinary item/text/turn paths clear; compaction returns before general clear; approval/local-tool/raw-output/status/error paths need an explicit semantic decision | Add governing matrix and sequence coverage |
| 2026-07-11 | Code | `codex-reasoning-segment-tracker.ts` fallback and clear behavior | Test post-boundary identity safety | `reasoning:${turnId}` and repeated provider/event IDs can be reused after a clear in the same turn | Allocate normalized IDs independently from provider candidates |
| 2026-07-11 | User verification | Screenshots `ctx_87f7e12a4287__image.png`, `ctx_c024a3e629af__image.png` against the packaged app | Validate the implemented future-run behavior | New `delivery_engineer` run still shows adjacent Thinking cards | Block finalization and trace exact sequence |
| 2026-07-11 | Process/package probe | `ps -p 2900,3521`; `rg` packaged `Contents/Resources/server/dist` | Exclude wrong-app/stale-server testing | Running app and bundled server are the consecutive-thinking-blocks build; new tracker/allocation and terminal clear markers are present | Failure is in candidate behavior |
| 2026-07-11 | GraphQL/data probe | `getTeamMemberRunProjection` plus `raw_traces_active.jsonl` for `delivery_engineer_44d7...` | Correlate visible pairs with raw order | Four adjacent projection pairs each have exactly one matching `TOOL_EXECUTION_SUCCEEDED` trace between their source reasoning traces | Terminal result update is the split trigger |
| 2026-07-11 | Code | `toolLifecycleHandler.ts`, `runtime-memory-event-accumulator.ts`, Codex item/raw converters | Identify lifecycle placement and persistence behavior | Frontend updates an existing invocation card; converter clears block; accumulator flushes reasoning on every tool result | Boundary must be ordered-card creation, with bounded accumulator change |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Codex App Server `item/*` notifications with provider item IDs and turn IDs.
- Current execution flow:
  `GPT-5.6-Sol response items -> Codex item notifications -> CodexThreadEventConverter -> CodexReasoningSegmentTracker -> normalized SEGMENT_CONTENT(id=itemId) -> WebSocket mapper -> frontend segmentHandler -> AIMessage.segments -> AIMessage.vue`
- Current replay flow:
  `normalized SEGMENT_CONTENT ids -> RuntimeMemoryEventAccumulator -> raw reasoning traces -> LocalMemoryRunViewProjectionProvider -> raw-trace replay events -> GraphQL conversation entries -> buildConversationFromProjection -> AIMessage.vue`
- Ownership or boundary observations:
  - Codex event converter/tracker is the authoritative owner of live provider-to-normalized segment identity.
  - Runtime memory/replay projection owns application history semantics.
  - Frontend live handler and hydration are consumers, not the right place for Codex-specific item grouping.
- Current behavior summary: One provider reasoning item ID becomes one normalized/persisted/frontend reasoning segment even when several items are adjacent. The exact report therefore produces five cards.

## Design Health Assessment Evidence

- Change posture: `Bug Fix` / `Behavior Change`
- Candidate root cause classification: original `Local Implementation Defect`; packaged-verification `Design Impact` in the tool-lifecycle boundary definition; Round 3 `Requirement Gap` for permanent unsupported-delta behavior and `Design Impact` from the incomplete formal owner/spine model
- Refactor posture evidence summary: The normalized identity refactor is sound. Three bounded production owners require coordinated correction: reasoning normalization owns completed-snapshot content and block identity; ordered-tool classification distinguishes new-card creation from in-place updates; the generic memory accumulator preserves or flushes an open reasoning segment using its existing `callWritten` fact. Run-history and frontend production remain correct consumers.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Exact Codex rollout | Five unique reasoning response item IDs are contiguous | Provider item identity is not a user block identity | Normalize at adapter boundary |
| Direct `thread/read` | Same five become one reasoning item with 14 parts | Upstream canonical history supports contiguous folding | Use as semantic corroboration, not runtime dependency |
| AutoByteus GraphQL | Five reasoning entries remain because the live adapter persisted five IDs | Pre-fix projection faithfully exposes the defective normalized facts | Diagnostic evidence only; user excluded old-run correction |
| Tracker code/test | Stable item ID always wins | Local precedence defect in existing owner | Reverse/reshape active-block resolution |
| Frontend docs/code | Frontend trusts segment identity | Vue-side runtime detection would violate boundary | Keep frontend generic |
| Round 1 `DR-CTB-001` | Current fallback IDs can repeat after clear | Provider/event candidates cannot safely be normalized block identity | Use a converter-instance nonce plus monotonic block sequence |
| Round 1 `DR-CTB-002` | Compaction and other special paths bypass general clear | “Non-reasoning item” is too coarse as an implementation rule | Classify by transcript/lifecycle semantics before branch returns |
| Packaged user verification | Four visible adjacent pairs correlate to matching tool results | “Transcript-producing” remains too coarse because result updates an earlier card | Govern by ordered-card creation, not every lifecycle event |
| User product decision / Round 3 `DR-CTB-003` | Real-time internal Thinking streaming is not required; `summaryTextDelta` support is rejected now and in future | Completed reasoning item snapshots are the sole content source; delta notification is explicit no-effect | Record the permanent product rule and add state/content regression |
| Round 3 `DR-CTB-004` | Ordered-tool classification and memory flush are material production flows | Formal spine inventory must represent both owners without importing Codex raw-event policy into memory | Add bounded ordered-tool and memory sequencing spines |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-segment-tracker.ts` | Resolve normalized reasoning segment identity | Stable provider item IDs replace the active turn block | Primary live fix owner |
| `.../codex-item-event-converter.ts` | Map Codex item lifecycle to normalized events | Ordinary non-reasoning/text paths clear, but compaction and special early returns bypass a single general rule | Apply explicit semantic disposition before branch returns |
| `.../codex-thread-event-converter.ts` | Top-level raw event dispatch and normalized content creation | Uses tracker for reasoning content IDs | No bypass; should remain caller of tracker |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Persist normalized content as raw application traces | Different IDs flush as different reasoning rows | Future runs become canonical after live ID fix |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Convert stored facts to display replay events | Emits every reasoning trace one-to-one | Keep unchanged; future corrected runs already contain one trace per contiguous block |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Apply normalized segment events to live state | Correctly creates one segment per normalized identity | Keep runtime-agnostic; regression coverage only |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Hydrate GraphQL projection into conversation segments | Correctly creates one think segment per projected reasoning row | Keep unchanged; future persistence should provide one row per contiguous block |
| `autobyteus-web/components/conversation/AIMessage.vue` | Render ordered segments | Renders every segment once | No production change expected |
| `.../codex-item-compaction-event-converter.ts` | Classify context-compaction/trigger item events | Returns before general item clearing and emits only provider status/no transcript | Explicitly preserve the active reasoning block |
| `.../codex-raw-response-event-converter.ts` | Convert raw compaction and function-call output | Compaction is maintenance; function-call output may update a known tool card or create a result-first synthetic card | Preserve compaction; classify matching update versus result-first |
| `.../codex-thread-lifecycle-event-converter.ts` | Convert status and error lifecycle events | Status/token updates have no transcript meaning; runtime error is terminal | Preserve status; clear on terminal error lifecycle cleanup |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Apply tool lifecycle events | `ensureToolLifecycleSegment` updates the existing invocation segment and only synthesizes when missing | Matching terminal events do not add a new ordered card |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Persist normalized content/tool facts | `recordToolResult()` unconditionally flushes open reasoning even when `tool.callWritten` is already true | Preserve open reasoning for matching results; retain inferred-call flush for result-first |
| `.../codex-reasoning-event-normalizer.ts` and top-level unknown-event dispatch | Resolve supported reasoning content and block updates | Current Codex emits `item/reasoning/summaryTextDelta`; product intentionally rejects this content path | Consume completed reasoning item snapshots only; explicit delta no-effect must emit nothing and mutate no tracker |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-11 | Probe | Direct stdio JSON-RPC current-model probe | `gpt-5.6-sol` is available; current no-tool turn produced one reasoning item; current method is `item/reasoning/summaryTextDelta` | Establishes runtime version/method facts; no-tool prompt alone does not reproduce multi-item segmentation |
| 2026-07-11 | Probe | Direct `thread/read` for exact historic thread/turn | Canonical history has one reasoning item with 14 parts | Consecutive provider items are one logical block in upstream history |
| 2026-07-11 | Trace | Exact Codex rollout lines 2749–2767 | Five response reasoning items, no intervening tool/message | Upstream does emit multiple items, not merely transport chunks |
| 2026-07-11 | Probe | Running AutoByteus GraphQL projection | Same turn returns five reasoning entries | Segmentation survives server persistence/replay and is ours to normalize |
| 2026-07-11 | Test | Targeted server/web tests | All baseline tests pass; current tests encode separate stable-ID behavior | Bug is covered as current behavior and needs deliberate test revision |
| 2026-07-11 | User verification | Packaged Electron plus live GraphQL/raw trace correlation | Four new-run adjacent pairs remain; each is split by an in-place matching tool result | Prior coverage missed long-running-tool interleaving |

## External / Public Source Findings

No web sources were required. The installed Codex CLI schema, direct JSON-RPC responses, local Codex rollout, and running AutoByteus server were more authoritative for the exact installed version and reproduction.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Installed/authenticated Codex CLI and the running AutoByteus desktop server on `127.0.0.1:29695`.
- Required config, feature flags, env vars, or accounts: Existing local Codex authentication; direct probe used `experimentalApi: true`, model `gpt-5.6-sol`, summary `auto`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Generated Codex protocol schemas in `/tmp/codex-appserver-schema-ctb`; created temporary probe scripts `/tmp/probe_codex_reasoning.py` and `/tmp/read_codex_thread.py`.
- Cleanup notes for temporary investigation-only setup: Probe app-server processes were terminated. Temporary `/tmp` scripts/schemas may be removed; no repository or production history data was mutated. One ephemeral direct probe thread was created with `ephemeral: true`.

## Findings From Code / Docs / Data / Logs

1. **The upstream nuance:** The user's assumption is directionally correct for presentation but incomplete at protocol level. GPT-5.6-Sol can emit multiple complete reasoning response items, not only deltas of one item.
2. **The upstream canonical view:** Codex itself groups the exact sequence in `thread/read`, so presenting it as one block is well-founded.
3. **The AutoByteus defect:** The adapter's active turn cache is defeated by stable item-ID precedence. It therefore exposes provider storage identity as presentation identity.
4. **The frontend is behaving as designed:** Five inputs become five cards; there is no duplicate render of one input.
5. **Persistence preserves the bug:** Those five normalized IDs are persisted as five valid audit traces and projected one-to-one on reload. Conversely, one corrected future ID will persist and reload as one block without reader changes.
6. **Correct posture:** Fix future live identity and content joining in the Codex adapter. Do not change pre-fix history or teach Vue about Codex raw item IDs.
7. **Identity safety:** Provider item/event IDs are correlation facts, not allocation candidates. A tracker-instance nonce plus monotonic counter gives every new normalized block a fresh namespaced ID, including after clears and process-local provider ID reuse.
8. **Round 1 boundary safety:** Boundary behavior must be decided explicitly, not by fall-through.
9. **Verified correction:** Event family alone is insufficient. A tool start creates an ordered card and clears; a matching terminal/status/log event updates that earlier card and preserves. A result-first terminal event that synthesizes a missing card remains a boundary.
10. **Permanent content-source decision:** Completed reasoning item snapshots are the sole supported displayed/persisted summary source. `item/reasoning/summaryTextDelta` is intentionally and permanently unsupported and must remain ignored/no-effect.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: JSONL raw traces under `.autobyteus/server-data/memory`; exact turn has five `trace_type:"reasoning"` rows followed by one assistant row. The overall store is large and audit-oriented.
- Relevant code-model, serialization, semantic, or physical-store change: No schema change. Writer behavior changes so a matching result does not flush the open reasoning segment; a result-first inferred call retains existing flush/order behavior.
- Normal readers and writers, including unknown/extra-field behavior: Writer records each normalized segment. Local memory projection reads ordered traces and currently creates one reasoning event per row.
- Representative direct-read or compatibility evidence: Current files parse normally; exact GraphQL query returns all content/order. No transformation is needed to interpret them.
- Required semantics and invariants preserved by direct use: `Yes` for future runs — the current writer accumulates a repeated normalized segment ID into one reasoning trace, and the normal reader projects that trace as one entry.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Raw traces are audit evidence and should remain immutable; reasoning summaries must not be copied into new migration artifacts.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration or pre-fix read-time correction is required or desired. Rewriting old audit data would add risk for behavior the user explicitly does not require.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- `thread/read` is corroborating evidence, not an allowed live dependency.
- Provider adapters own normalized segment identity; frontend consumers must not parse runtime-native IDs.
- Existing Codex tool/non-reasoning, assistant-text, and turn boundary behavior must remain distinct.
- Pre-fix raw data remains untouched and may continue to display fragmented blocks.
- `item/reasoning/summaryTextDelta` is intentionally and permanently unsupported. It must emit no normalized content and must not allocate, append, clear, or otherwise mutate reasoning-block or ordered-tool state; completed reasoning item snapshots are the sole supported summary-content source.

## Open Unknowns / Risks

- The revised invariant is ordered-conversation placement: new card/text/turn creation clears; in-place lifecycle mutation preserves. Backend converters and the accumulator must encode this without moving Codex policy into Vue.
- An explicit ignored/no-effect regression must prevent current or future dispatch-table changes from routing `item/reasoning/summaryTextDelta` into content or state handling.
- Exact live/reload parity needs executable coverage for a run produced after the fix; no repaired-output expectation applies to pre-fix traces.

## Notes For Architecture Reviewer

Ready for architecture re-review following explicit user approval on 2026-07-11. The review must preserve `DR-CTB-001` and `DR-CTB-002`, confirm the ordered-card correction, verify permanent `summaryTextDelta` no-effect behavior under `DR-CTB-003`, and verify the formal reasoning, ordered-tool, and generic memory sequencing spines under `DR-CTB-004`.


## User Scope Revision — 2026-07-11

The user explicitly removed pre-fix historical runs from scope. Existing raw traces and their current projection may remain fragmented. The target is correct normalization for future live runs; reload parity is required only for runs persisted after the fix. This eliminates the proposed read-time historical reasoning fold and all run-history production changes.
