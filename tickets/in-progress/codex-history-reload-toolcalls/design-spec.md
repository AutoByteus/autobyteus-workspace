# Design Spec

## Current-State Read

History reload currently moves through a runtime-agnostic projection contract:

`UI history selection -> GraphQL history query -> run-history projection service -> runtime-native provider and/or local-memory provider -> canonical projection bundle -> frontend hydration`

For Codex runs and Codex-backed team members, the runtime-native provider is `CodexRunViewProjectionProvider`. It calls `CodexThreadHistoryReader.readThread(threadId, cwd)` with `includeTurns: true` and transforms `thread.turns[].items[]` into historical replay events. That reader is not the proven loss boundary. The proven loss boundary is the provider-local `resolveToolEvent(...)` switch: it maps `fileChange`, `commandExecution`, and `webSearch`, but returns `null` for `dynamicToolCall` and `mcpToolCall` items.

Live Codex event normalization already treats `dynamicToolCall`, `mcpToolCall`, `webSearch`, `commandExecution`, and `fileChange` as tool lifecycles. Historical projection has duplicated only part of that raw-item policy. As a result, a thread can reload reasoning and assistant text from Codex native history while omitting dynamic/MCP tool cards before GraphQL serialization.

Frontend projection hydration is not the primary defect for canonical data. `runProjectionConversation.ts` already maps canonical `tool_call` / `tool_call_pending` rows to tool segments, and the focused frontend tests passed after Nuxt preparation.

A second current-state problem matters once the provider starts projecting the missing tools: `AgentRunViewProjectionService.mergeProjectionRows(...)` deduplicates by exact `JSON.stringify(row)` only. Team-member history already combines a local member projection with a Codex-native projection, so adding dynamic/MCP provider rows can either duplicate the same invocation or preserve an empty/source-limited row over a richer row unless merge becomes invocation-aware.

Constraints the design must respect:

- Keep the external GraphQL projection shape (`conversation` and `activities`) unchanged.
- Keep frontend runtime-agnostic; do not add a Codex-specific UI branch.
- Preserve existing `fileChange`, `commandExecution`, `webSearch`, reasoning, user, and assistant message history behavior.
- Do not rewrite historical raw trace files or add a persistent backfill.
- Use read-time projection/merge to recover all facts available from local traces and Codex native thread history.

## Intended Change

Fix backend Codex history projection so Codex native `thread/read` tool items produce canonical projection rows for the same active tool families as the live Codex runtime path. Add invocation-aware projection bundle merge so local-memory projection and Codex-native projection cooperate instead of duplicating or weakening the same tool invocation.

The intended user-visible outcome is: after restart or history selection, Codex/team-member histories that contain `dynamicToolCall` or `mcpToolCall` items in Codex thread history show the corresponding tool cards in the middle transcript and Activity panel, including tool name, arguments, result/error, status, and useful context text where available.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - Live Codex item conversion recognizes dynamic/MCP/web-search/file/command tool families.
  - Historical provider has an independent narrower item-family switch and drops dynamic/MCP items.
  - Scratch provider repro with `mcpToolCall` and `dynamicToolCall` returned zero tool rows.
  - Local and Codex-native projections can be merged for team members, but the current merge only removes exact JSON duplicates.
- Design response:
  - Move pure Codex tool payload parsing out of provider-local code and into an owned Codex item-normalization layer.
  - Make `CodexRunViewProjectionProvider` delegate tool-item interpretation to that layer instead of carrying its own limited branches.
  - Add invocation-aware projection merge for conversation tool rows and Activity rows.
- Refactor rationale:
  - Adding two more branches to `codex-run-view-projection-provider.ts` would fix one symptom but keep the drift-prone duplicate policy.
  - Adding provider rows without merge refactor creates duplicate/weak tool rows when local memory and Codex history overlap.
- Intentional deferrals and residual risk, if any:
  - No persistent migration/backfill is included. Histories whose Codex native thread is unavailable and whose local raw traces never captured the missing tool facts remain unrecoverable.
  - A live Codex stop/reload E2E should be gated because it requires a configured Codex runtime. Deterministic unit coverage is mandatory; live E2E is optional/gated validation.

## Terminology

- **Codex native history**: The payload returned by Codex app-server `thread/read` with turns/items.
- **Local-memory projection**: Projection rebuilt from stored raw traces under run/team-member memory.
- **Canonical projection bundle**: Backend `RunProjection` with `conversation` and `activities` arrays consumed by GraphQL/frontend.
- **Tool invocation identity**: Stable invocation id/call id/item id used to identify one visible tool call across transcript and Activity surfaces and across local/native sources.
- **Tool-like item family**: Codex item type that represents a tool execution or visible tool segment (`dynamicToolCall`, `mcpToolCall`, `webSearch`, `commandExecution`, `fileChange`, and explicitly recognized function/tool-call variants when a stable invocation/tool name is available).

## Design Reading Order

1. Follow DS-001 for the primary reload projection path.
2. Follow DS-002 for individual Codex thread item normalization.
3. Follow DS-003 for local/native projection merge.
4. Then read file responsibilities and boundary rules.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the narrow provider-local tool parser as the authoritative Codex history tool policy.
- Do not introduce a dual old/new projection path, UI compatibility branch, or historical storage migration.
- The exact-JSON row dedupe may remain only as a fallback for non-tool rows and anonymous rows without stable invocation identity; it must no longer be the sole tool-row merge policy.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User selects historical run/team-member | Frontend renders canonical transcript and Activity rows | Run-history projection service | Defines the actual reload path and proves the frontend should remain projection-driven. |
| DS-002 | Return-Event | One Codex `thread/read` item | One historical replay event or an intentional non-event | Codex history item normalizer | This is where dynamic/MCP tool items are currently lost. |
| DS-003 | Bounded Local | Local projection row + runtime-native projection row | One enriched canonical row per stable tool invocation | Run projection merge owner | Prevents duplicate/weak rows after provider coverage expands. |

## Primary Execution Spine(s)

- Standalone run: `History click -> getRunProjection(runId) -> AgentRunViewProjectionService -> CodexRunViewProjectionProvider + optional LocalMemoryRunViewProjectionProvider -> RunProjection -> frontend hydration`
- Team member: `Team member history click -> getTeamMemberRunProjection(teamRunId, memberRouteKey) -> TeamMemberRunViewProjectionService -> local member projection + AgentRunViewProjectionService(Codex provider) -> RunProjection -> frontend hydration`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user selects history; GraphQL asks run-history for a canonical projection; run-history chooses/combines local and runtime-native sources; the frontend renders only the canonical result. | GraphQL resolver, `AgentRunViewProjectionService`, runtime provider, local provider, frontend hydration | `AgentRunViewProjectionService` for standalone/member delegated projection; `TeamMemberRunViewProjectionService` for member resolution | Diagnostics, docs, test fixtures |
| DS-002 | The Codex provider walks `thread.turns[].items[]`; each item is classified; messages/reasoning become message/reasoning events; tool families become tool replay events through the shared Codex item normalizer. | Codex thread payload, item family resolver, tool payload parser, `HistoricalReplayToolEvent` mapper | Codex history item normalizer for Codex item interpretation; provider for replay-event assembly | Unsupported tool-like debug logging |
| DS-003 | When local and runtime-native projections are both present, stable tool invocation ids are merged field-by-field while non-tool rows retain existing exact-row/order-preserving behavior. | Local projection bundle, primary runtime projection bundle, merge helper | Run projection merge helper used by `AgentRunViewProjectionService` | Richness scoring and fallback selection |

## Spine Actors / Main-Line Nodes

- `getRunProjection(runId)` GraphQL resolver
- `getTeamMemberRunProjection(teamRunId, memberRouteKey)` GraphQL resolver
- `TeamMemberRunViewProjectionService`
- `AgentRunViewProjectionService`
- `CodexRunViewProjectionProvider`
- Codex thread history reader
- Codex thread-history item normalizer
- Run projection merge helper
- Frontend run projection hydration services

## Ownership Map

- **GraphQL resolvers** own transport exposure and argument passing only. They are thin facades and must not parse Codex items or merge projections.
- **`TeamMemberRunViewProjectionService`** owns team-member identity resolution and constructing the member metadata/local projection input for delegated run projection. It must not implement Codex item-family policy.
- **`AgentRunViewProjectionService`** owns runtime provider selection, fallback/complement source selection, and projection bundle merge invariants.
- **`CodexRunViewProjectionProvider`** owns Codex runtime-native history projection orchestration: read native thread history, walk turns/items, delegate item interpretation, and convert normalized item facts to run-history replay events.
- **Codex item normalization layer** owns Codex item type/family classification and payload extraction for tool name, arguments, result/error, status, and invocation id.
- **Local-memory projection provider/transformer** owns raw trace replay from persisted memory and remains a separate source.
- **Frontend hydration/rendering** owns canonical projection-to-display mapping and must not understand Codex raw item types.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getRunProjection` GraphQL field | `AgentRunViewProjectionService` | Transport API for standalone history | Runtime provider selection, Codex item parsing, merge policy |
| `getTeamMemberRunProjection` GraphQL field | `TeamMemberRunViewProjectionService` + delegated `AgentRunViewProjectionService` | Transport API for team-member history | Local/native merge logic, Codex item parsing |
| `CodexThreadHistoryReader.readThread` | Codex app-server history adapter | Encapsulates native `thread/read` request | Projection interpretation or frontend row shaping |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Provider-local `resolveFileChangeArguments`, `resolveCommandExecutionArguments`, `resolveWebSearchArguments`, `resolveWebSearchResult`, and narrow `resolveToolEvent` branch policy in `codex-run-view-projection-provider.ts` | These duplicate Codex raw tool parsing and omit active tool families. | Codex item normalization layer plus provider mapper. | In This Change | Existing behavior for file/command/web-search must be preserved through the new normalizer. |
| Exact-JSON-only merge as sole tool dedupe policy in `AgentRunViewProjectionService` | It cannot merge local/native rows for the same invocation when fields differ. | Invocation-aware projection merge helper. | In This Change | Exact JSON can remain as fallback for non-tool or anonymous rows. |
| Any frontend Codex-specific workaround branch for missing historical tool cards | Backend canonical projection is the correct source. | Backend projection fix. | In This Change | Do not add this branch. |
| Persistent backfill/migration for old raw trace files | Not required for read-time projection and cannot recover missing Codex native history. | None. | Follow-up only if separately requested | Explicitly out of scope. |

## Return Or Event Spine(s) (If Applicable)

Codex thread-history replay event spine:

`Codex thread/read payload -> turn ordering -> item classification -> normalized Codex tool facts or message/reasoning content -> HistoricalReplayEvent[] -> buildRunProjectionBundleFromEvents -> conversation/activity rows`

This spine is a read-time reconstruction path. It must not mutate Codex threads, raw traces, or persisted projections.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentRunViewProjectionService`
  - Chain: `primaryProjection + localProjection -> mergeProjectionBundles -> merge conversation rows -> merge activity rows -> buildRunProjectionBundle`
  - Why it matters: expanded Codex provider coverage makes local/native overlap normal for team-member histories.
- Parent owner: `CodexRunViewProjectionProvider`
  - Chain: `thread.turns -> sorted turns -> item loop -> item normalizer -> replay event push`
  - Why it matters: the provider must maintain transcript order without embedding raw tool-family policy.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Debug logging for unsupported tool-like Codex items | DS-002 | Codex history provider/normalizer | Emit item type/id/name/status summaries under an explicit debug flag. | Future Codex history formats should not fail silently. | Always-on noisy logging or payload leakage in normal history load. |
| Regression fixtures | DS-002, DS-003 | Backend tests | Prove dynamic/MCP projection and invocation-aware merge. | Prevents recurrence. | Manual-only reproduction and future drift. |
| Frontend projection tests | DS-001 | Frontend hydration | Confirm canonical rows still render. | Guards against accidental contract drift. | Codex-specific UI logic. |
| Documentation sync | All | Delivery/docs | Explain Codex history replay and merge behavior. | Keeps operators aware of debug gates and limits. | Hidden behavior and repeated investigations. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex thread reading | `agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Reuse | Reader already calls `thread/read` with turns included. | N/A |
| Pure Codex tool payload parsing | Existing `codex-tool-payload-parser.ts` / `codex-file-change-payload-helper.ts` | Extend / Re-home as shared Codex item parsing | These already parse dynamic args, results, error text, command, and web-search fields. | Provider-local parsing is too narrow and drift-prone. |
| History provider assembly | `run-history/projection/providers/CodexRunViewProjectionProvider` | Extend | It is the current runtime-native projection owner. | N/A |
| Projection bundle building | `run-history/projection/run-projection-utils.ts` | Reuse | Existing canonical bundle builder remains valid. | N/A |
| Projection merge | Inline service helper | Extract | Merge policy is becoming substantial enough to test directly. | Keeping it inline hides the invariant and makes unit tests harder. |
| Frontend canonical rendering | `autobyteus-web/services/runHydration/*` | Reuse | Tests show canonical tool rows already render. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex history adapter | Native `thread/read` access and thread-history item normalization | DS-002 | `CodexRunViewProjectionProvider` | Extend | Keep native read and item normalization under Codex backend. |
| Codex raw item parsing | Tool item family classification and payload extraction | DS-002 | Live event converter and history normalizer | Extend / Re-home pure parser helpers | Avoid separate live/history interpretation. |
| Run-history projection | Provider selection, bundle building, local/native merge | DS-001, DS-003 | GraphQL history resolvers | Extend | Merge invariant belongs here, not in Codex provider. |
| Frontend run hydration | Projection rows to UI segments/activity state | DS-001 | UI | Reuse | No Codex-specific branch. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/codex/items/codex-tool-item-family.ts` | Codex raw item parsing | Shared Codex item classifier | Normalize item type tokens and map to active tool families. | One small, stable vocabulary used by live and history paths. | N/A |
| `src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Codex raw item parsing | Pure payload parser | Extract tool name/args/result/error/status from Codex item payloads. | Existing pure parser concern should not live inside provider. | Yes |
| `src/agent-execution/backends/codex/items/codex-file-change-payload-helper.ts` | Codex raw item parsing | Pure file-change parser | Extract path/patch from file-change payloads. | Existing helper is pure and reused by parser/history. | Yes |
| `src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts` | Codex history adapter | History item normalizer | Convert one thread-history item into normalized tool replay facts or null. | Thread-read item shapes differ from streaming event notifications and need a read-time adapter. | Yes |
| `src/run-history/projection/providers/codex-run-view-projection-provider.ts` | Run-history projection | Codex runtime-native provider | Walk thread payload and map normalized item facts to `HistoricalReplayEvent`s. | Keeps provider as orchestrator, not parser. | Yes |
| `src/run-history/projection/run-projection-merge.ts` | Run-history projection | Projection merge owner | Merge local/runtime bundles by invocation identity and exact fallback. | Merge invariants are reusable/testable outside service constructor logic. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Codex item type normalization (`dynamicToolCall`, `mcpToolCall`, etc.) | `codex-tool-item-family.ts` | Codex raw item parsing | Live converter and history normalizer must agree on active tool families. | Yes | Yes | A run-history-specific classifier |
| Tool payload extraction (args/result/error/status) | `codex-tool-payload-parser.ts` | Codex raw item parsing | Avoid provider-local duplicate extraction. | Yes | Yes | A projection row builder |
| Tool row merge by invocation | `run-projection-merge.ts` | Run-history projection | Standalone and team-member projections use same merge invariant. | Yes | Yes | A Codex-only merge special case |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexToolItemFamily` | Yes | Yes | Low | Keep it as a finite current-family classifier, not arbitrary UI segment type. |
| `CodexThreadHistoryToolItem` / normalized replay fact | Yes | Yes | Medium | Fields must be Codex item facts only; run-history provider maps to `HistoricalReplayToolEvent`. |
| `RunProjection` tool conversation/activity rows | Yes | Yes | Medium | Merge helper owns enrichment/dedupe, avoiding parallel local/native row sets. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-item-family.ts` | Codex raw item parsing | Shared Codex item classifier | Export `resolveCodexToolItemFamily(itemType)` and family constants. | Centralizes which Codex item types are tool-like. | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-file-change-payload-helper.ts` | Codex raw item parsing | Pure payload helper | Existing file-change extraction moved/re-homed from `events/`. | Pure parser belongs under shared item parsing. | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Codex raw item parsing | Pure payload parser | Existing tool payload extraction moved/re-homed from `events/`. | Used by live event parser and history normalizer. | `codex-file-change-payload-helper.ts` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Codex live event conversion | Live event payload adapter | Continue to handle segment/reasoning/event-specific concerns; import pure parser from `../items`. | Keeps live event state/segment behavior in events. | Codex item parser files |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex live event conversion | Live event converter | Use `resolveCodexToolItemFamily` for family checks while preserving current emitted event semantics. | Prevent live/history item family drift. | `codex-tool-item-family.ts` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts` | Codex history adapter | Thread-history item normalizer | Normalize `dynamicToolCall`, `mcpToolCall`, `webSearch`, `commandExecution`, and `fileChange` history items into replay facts. | Thread-read item interpretation has one owner. | Codex item parser files |
| `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | Run-history projection | Codex provider | Walk ordered turns/items; create message/reasoning events; convert normalized tool facts to historical replay tool events. | Provider remains projection orchestrator. | Codex history normalizer |
| `autobyteus-server-ts/src/run-history/projection/run-projection-merge.ts` | Run-history projection | Merge helper | Merge projection bundles/rows with invocation-aware tool dedupe and enrichment. | Merge logic is independent of provider implementation. | Run projection types |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Run-history projection | Projection service | Delegate merge to helper; keep provider selection/fallback orchestration. | Service stays readable and policy boundary explicit. | `run-projection-merge.ts` |
| `autobyteus-server-ts/tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts` | Backend tests | Provider regression | Add dynamic/MCP fixtures plus existing file/command/web-search checks. | Proves backend loss is fixed. | N/A |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts` or `tests/unit/run-history/projection/run-projection-merge.test.ts` | Backend tests | Merge regression | Add duplicate/enrichment cases for local/native tool rows. | Prevents duplicate/weak projection rows. | N/A |

## Ownership Boundaries

- Codex item parsing is a Codex backend concern. Run-history may ask Codex history normalization for normalized facts but must not duplicate Codex raw field extraction.
- Run-history projection owns canonical projection rows and merge invariants. Codex-specific normalizers must not emit GraphQL/frontend rows directly.
- Frontend owns display of canonical rows only. It must not inspect `dynamicToolCall`, `mcpToolCall`, or any Codex native item type.
- GraphQL remains a thin API boundary. It must not add post-processing fixes for missing tool rows.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunViewProjectionService.getProjection*` | Provider selection, fallback/complement selection, projection merge | GraphQL history resolvers, team-member projection service | Resolver manually invoking providers or merging rows | Add service method/input fields, not resolver logic |
| `CodexRunViewProjectionProvider.buildProjection` | Native thread read + thread payload traversal | Run projection provider registry/service | Run-history service walking Codex `thread/read` payload directly | Extend provider/normalizer |
| Codex history item normalizer | Codex thread item family and payload extraction | Codex provider | Provider-local `if type === ...` payload parsing for tool details | Add family/parser support in normalizer |
| Frontend projection hydration | Canonical projection-to-UI mapping | UI stores/components | Codex raw item rendering branch | Fix backend projection contract |

## Dependency Rules

- `autobyteus-web` depends on the canonical projection contract only, never Codex raw item families.
- GraphQL history types depend on run-history services only.
- Run-history projection provider may depend on Codex history adapter/normalizer for Codex runtime-native projection.
- Codex item parser/normalizer must not depend on run-history services, GraphQL types, or frontend types.
- Codex history normalizer should return Codex replay facts; `CodexRunViewProjectionProvider` maps those facts into `HistoricalReplayToolEvent`.
- `AgentRunViewProjectionService` must call a run-history-owned merge helper rather than implementing provider-specific merge branches.
- No owner may introduce a persistent old/new projection compatibility path for this bug.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Standalone run projection | Return canonical projection bundle | `runId` | Unchanged. |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Team-member projection | Resolve member then return canonical projection | `teamRunId` + normalized/fallback member route key | Unchanged. |
| `CodexThreadHistoryReader.readThread(threadId, cwd)` | Codex native thread history | Return raw thread payload | Codex `threadId` + cwd | Unchanged; include turns remains required. |
| `normalizeCodexThreadHistoryItem(input)` (name flexible) | One Codex thread item | Return normalized tool replay facts or `null` | `item`, `turn`, `turnIndex`, `itemIndex`, `turnTimestamp` | New internal Codex history boundary. |
| `mergeProjectionBundles(runId, primary, secondary)` | Projection merge | Return one canonical bundle from two source bundles | `runId`; rows keyed by invocation id when stable | New/exported run-history helper or test-visible function. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getRunProjection` | Yes | Yes | Low | None. |
| `getTeamMemberRunProjection` | Yes | Yes | Medium | Existing route-key/member-name fallback remains in team-member service. |
| `normalizeCodexThreadHistoryItem` | Yes | Yes | Low | Include turn/item index only for deterministic fallback ids, not as primary identity. |
| `mergeProjectionBundles` | Yes | Yes | Low | Stable invocation ids are the only cross-source tool identity; anonymous rows fall back to exact dedupe. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Codex tool item family classifier | `codex-tool-item-family.ts` | Yes | Low | Use family names, not UI segment names. |
| Codex history item normalizer | `codex-thread-history-item-normalizer.ts` | Yes | Low | Keep `history` in name because input is `thread/read`, not live notifications. |
| Projection merge helper | `run-projection-merge.ts` | Yes | Low | Keep runtime-agnostic; no `codex` in name. |
| Historical tool replay event | Existing `HistoricalReplayToolEvent` | Yes | Low | Provider maps normalized facts into this existing type. |

## Applied Patterns (If Any)

- **Adapter/normalizer split**: Codex history provider orchestrates thread traversal; Codex history normalizer owns item interpretation.
- **Canonical projection contract**: Backend providers produce canonical `RunProjection`; frontend remains runtime-agnostic.
- **Identity-aware enrichment merge**: Rows with the same stable invocation id are merged by field richness rather than exact object equality.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/` | Folder | Codex raw item parsing | Shared pure parsers and item-family classifiers. | Used by both live event conversion and history replay. | Run-history rows, GraphQL DTOs, frontend concepts. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-item-family.ts` | File | Codex item classifier | Normalize item type tokens and classify tool families. | Prevents live/history family drift. | Payload parsing or projection row building. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-file-change-payload-helper.ts` | File | Codex payload parser | Extract file-change fields. | Pure parsing shared outside events. | Event emission. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | File | Codex payload parser | Extract tool name, args, results, errors, command, web-search facts. | Pure parsing shared outside events. | Event emission or projection merge. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts` | File | Codex history adapter | Interpret one thread-read item as normalized replay facts. | The input shape is Codex history, so this belongs with the reader. | GraphQL/frontend row construction. |
| `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | File | Codex run projection provider | Read thread history and build historical replay events. | Existing runtime-native provider. | Provider-local duplicated tool payload parser. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-merge.ts` | File | Run-history merge owner | Merge projection bundles/rows. | Runtime-agnostic projection invariant. | Codex raw item parsing. |
| `autobyteus-server-ts/docs/modules/run_history.md` | File | Docs | Document local/native merge and Codex preferred history path behavior. | Durable operator/developer guidance. | Design-ticket-only notes. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | File | Docs | Document Codex history replay support for dynamic/MCP tools and debug envs. | Codex module owns runtime integration docs. | Frontend implementation detail. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | File | Docs | Clarify live normalization and history replay share item family/payload parsing. | Prevent future live/history drift. | Duplicated exhaustive code copy. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `codex/items/` | Off-Spine Concern | Yes | Low | Pure raw item parsing supports multiple Codex paths without owning runtime flow. |
| `codex/history/` | Persistence-Provider / Adapter | Yes | Low | Native `thread/read` and history item normalization live together. |
| `run-history/projection/providers/` | Persistence-Provider | Yes | Low | Runtime providers convert source history into replay bundles. |
| `run-history/projection/` | Main-Line Domain-Control | Yes | Low | Merge helper is projection-domain policy. |
| `autobyteus-web/services/runHydration/` | Main-Line UI Hydration | Yes | Low | Reused only for canonical rows; no change expected. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Codex history dynamic tool item

Input shape may vary, but a thread item like this must produce one historical tool event:

```ts
{
  type: "dynamicToolCall",
  id: "call-send-1",
  name: "send_message_to",
  arguments: { recipient_name: "implementation_engineer", content: "handoff" },
  result: { success: true },
  status: "completed"
}
```

Expected canonical conversation row after provider mapping:

```ts
{
  kind: "tool_call",
  invocationId: "call-send-1",
  toolName: "send_message_to",
  toolArgs: { recipient_name: "implementation_engineer", content: "handoff" },
  toolResult: { success: true },
  toolError: null
}
```

Expected Activity row:

```ts
{
  invocationId: "call-send-1",
  toolName: "send_message_to",
  type: "tool_call",
  status: "success",
  contextText: "send_message_to",
  arguments: { recipient_name: "implementation_engineer", content: "handoff" },
  result: { success: true },
  error: null,
  detailLevel: "source_limited"
}
```

### Codex history MCP tool item

A thread item like this must not be dropped:

```ts
{
  type: "mcpToolCall",
  id: "call-shell-1",
  name: "functions.exec_command",
  arguments: { cmd: "pwd", workdir: "/tmp/workspace" },
  contentItems: [{ text: "{\"stdout\":\"/tmp/workspace\\n\",\"exit_code\":0}" }],
  status: "completed"
}
```

The normalizer should resolve the invocation id, tool name, arguments, parseable result, and success status using the same pure payload parser logic as live Codex tool processing.

### Merge example

Local row:

```ts
{ kind: "tool_call_pending", invocationId: "call-1", toolName: "send_message_to", toolArgs: {}, toolResult: null }
```

Codex-native row:

```ts
{ kind: "tool_call", invocationId: "call-1", toolName: "send_message_to", toolArgs: { content: "handoff" }, toolResult: { success: true } }
```

Merged row:

```ts
{ kind: "tool_call", invocationId: "call-1", toolName: "send_message_to", toolArgs: { content: "handoff" }, toolResult: { success: true } }
```

Rules:

- Stable invocation id wins over exact JSON identity for tool rows.
- Terminal status/kind (`success`, `error`, `denied`, `tool_call`) wins over pending/parsed when the invocation matches.
- Non-empty arguments/result/error/tool name/context/logs win over empty/default values.
- Timestamp ordering should remain stable: keep the earliest valid timestamp for placement unless only one source has a timestamp; do not reorder unrelated non-tool rows during merge.
- Anonymous tool rows without stable invocation ids must not be collapsed merely because they are adjacent or share a tool name.

## Implementation Sequence

1. Add/re-home pure Codex item parser files under `agent-execution/backends/codex/items/` and update imports in live event parser/converter tests.
2. Add `codex-tool-item-family.ts` and use it in both history normalization and the live converter family checks without changing emitted live events.
3. Add `codex-thread-history-item-normalizer.ts` for read-time tool item normalization.
4. Refactor `CodexRunViewProjectionProvider` to delegate tool items to the normalizer and remove provider-local tool parser branches.
5. Add `run-projection-merge.ts` and update `AgentRunViewProjectionService` to call it.
6. Add backend regression tests for dynamic/MCP provider coverage and invocation-aware merge.
7. Run focused frontend projection tests to confirm unchanged canonical contract.
8. Update durable docs during delivery after implementation/validation confirms exact behavior.

## Test / Validation Plan

Mandatory deterministic tests:

- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts`
  - Add fixtures for `dynamicToolCall` and `mcpToolCall` with arguments and results.
  - Preserve existing file-change, command-execution, web-search, reasoning, and workspace fallback assertions.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts`
  - Add case where local and Codex-native conversation/activity rows share an invocation id and merge into one enriched row.
  - Add case that anonymous tool rows without stable invocation id are not over-collapsed.
- `cd autobyteus-web && pnpm exec nuxi prepare && pnpm exec cross-env NUXT_TEST=true vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts --config vitest.config.mts --maxWorkers=1`
- `cd autobyteus-web && pnpm exec cross-env NUXT_TEST=true vitest run stores/__tests__/runHistoryStore.spec.ts --config vitest.config.mts --maxWorkers=1`

Optional/gated live validation:

- With a configured Codex app-server runtime, run a Codex/team-member scenario that emits at least one dynamic tool (`send_message_to` is ideal for team-member history) and one MCP/dynamic command-style tool.
- Enable debug/logging, for example `RUN_CODEX_E2E=1 CODEX_THREAD_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_LOG_DIR=<tmp-log-dir>` and any existing backend raw event log envs used by the test harness.
- Stop/restart the app or close/recreate the backend client, reload the run/team-member projection, and assert the same invocation ids/tool names/arguments/results are present in the projection after reload.

## Risks / Edge Cases

- Codex native `thread/read` item shapes can evolve. Unsupported tool-like items should be visible under explicit debug logging without failing the whole projection.
- Some thread items may lack timestamps. The provider should preserve turn/item order and only use timestamps when valid.
- Generated fallback invocation ids such as `codex-${turnIndex}-${itemIndex}` are stable only inside one thread payload; they must not be used to collapse unrelated anonymous rows across local/native sources.
- `mcpToolCall` completion may omit arguments that were present at start in live streaming. Thread history may already contain only the completed item. The normalizer should extract all available fields from the item; if a field is absent from both local and native sources, projection cannot invent it.
- Moving pure parser files requires import updates; avoid keeping compatibility re-export wrappers because the policy is no legacy code paths.

## Acceptance Criteria Trace

- FR-001/FR-002: Dynamic and MCP thread-history fixtures produce canonical tool conversation and Activity rows.
- FR-003: Existing provider tests for file-change, command-execution, and web-search still pass.
- FR-004/FR-005: Merge tests prove same-invocation rows dedupe/enrich and anonymous rows remain safe.
- FR-006: Frontend tests continue to pass with unchanged canonical projection input.
- FR-007: Debug path exposes unsupported tool-like item summaries under explicit opt-in.
- NFR-001/NFR-002: No frontend Codex branch and no raw trace migration/backfill are introduced.
