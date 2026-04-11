# Proposed Design Document

## Design Version

- Current Version: `v5`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| `v1` | Initial draft | Defined the layer split between raw memory reads, server-owned run-history projection, and frontend hydration; removed memory ownership of the canonical replay DTO. | 1 |
| `v2` | Scope expansion for touched-file replay and artifact viewer analysis | Added the file-change replay spine, clarified that backend touched-file reconstruction is already a dedicated projection, documented the latest-path-state limitation, and separated backend ownership from frontend artifact-viewer concern mixing. | 1 |
| `v3` | User narrowed scope back to projection-only | Removed touched-file/artifact cleanup from the active design scope and left it as deferred follow-up context. | 1 |
| `v4` | User expanded projection scope to include the right-side historical activity pane | Made historical activities a sibling run-history read model beside historical conversation, introduced a shared normalized historical replay event layer, and made source-fidelity limits explicit. | 1 |
| `v5` | Stage 8 requirement-gap re-entry for Codex live-monitor parity | Added explicit source-native reasoning preservation, clarified that reasoning must not be flattened into assistant text when the runtime source preserves it, and required frontend historical hydration to group adjacent assistant-side replay entries into one segmented AI message in source order. | 4 |

## Artifact Basis

- Investigation Notes: `tickets/done/memory-projection-layer-refactor/investigation-notes.md`
- Requirements: `tickets/done/memory-projection-layer-refactor/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`

## Summary

Refactor the current memory/projection area into three explicit layers:

1. `agent-memory` owns disk-backed raw memory reads and memory-oriented contracts.
2. `run-history` owns historical replay projection contracts and compilers that derive a replay bundle from raw memory or runtime-native history.
3. `autobyteus-web/services/runHydration` remains the UI hydration layer that converts server replay projection into frontend conversation and activity state.

The replay bundle is the key design change. `run-history` should own one historical projection bundle with two sibling read models:

- `conversation` for the middle event-monitor pane
- `activities` for the right-side activity pane

Those two read models come from the same historical source boundary, but neither is derived from the other.
Provider arbitration and replay metadata must therefore become bundle-aware, not conversation-first.
Standalone and team-member reopen paths should both use this same replay bundle shape, even if a specific frontend surface does not render every child read model immediately.
Within that replay bundle, the normalized historical event stream must also preserve source-native distinctions that matter to the live monitor:

- separate `reasoning` / `think` events when the source provides them
- separate assistant message events for assistant text
- separate tool/activity events for tool/command execution

The frontend historical hydration layer should then rebuild those ordered assistant-side events into one segmented AI message until the next user boundary, instead of creating one historical AI message per replay entry.

## Goal / Intended Change

- Restore clear ownership boundaries between raw memory data, replay projection, and frontend presentation.
- Keep raw memory as the source of truth.
- Make `run-history` the authoritative owner of historical replay projection.
- Add historical activity replay to the same run-history boundary as historical conversation replay.
- Make provider arbitration and replay metadata bundle-aware instead of conversation-only.
- Keep raw-trace fidelity available for consumers that need trace or turn identity.
- Make historical activity fidelity explicit and source-dependent instead of implicitly promising live-parity.
- Preserve source-native reasoning/think structure for runtime-backed reopen when the historical source persists it.
- Keep reopened history truthful when runtime history omits a separate reasoning item.
- Hydrate adjacent assistant-side replay entries into one ordered segmented AI message so the reopened center pane is structurally close to the live monitor.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - remove `agent-memory` ownership of the canonical replay conversation DTO,
  - remove `agent-memory` helpers that return `RunProjection`,
  - remove local run-history provider dependence on memory-layer conversation output as the authoritative projection contract,
  - remove the assumption that the right-side activity pane is live-only and outside the historical replay boundary,
  - remove any frontend reopen logic that would infer historical activity rows from conversation UI segments instead of a server-owned activity projection.
- Gate rule:
  - the design is invalid if `run-history` continues to depend on a memory-owned replay DTO as the canonical public contract,
  - the design is invalid if historical activities are reconstructed from middle-pane conversation UI state rather than from a run-history-owned projection.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Raw memory records remain the source of truth. | `AC-003`, `AC-006`, `AC-011` | Replay derives from raw memory or runtime history; raw-trace access remains available. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007`, `UC-008` |
| `R-002` | `agent-memory` owns memory-layer contracts only. | `AC-001`, `AC-006` | Canonical replay DTO leaves the memory subsystem. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-003` | `run-history` owns the server replay contract. | `AC-002`, `AC-003`, `AC-004`, `AC-005`, `AC-007`, `AC-008` | One server-owned replay bundle spans local and runtime-backed histories. | `UC-003`, `UC-004`, `UC-005`, `UC-007`, `UC-008` |
| `R-004` | Memory-view APIs and run-history projection APIs stay separate. | `AC-001`, `AC-006`, `AC-007` | Different layers, different contracts. | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-005` | Local AutoByteus replay is built inside `run-history`. | `AC-003`, `AC-009` | Local provider compiles conversation and activities from historical source inside `run-history`. | `UC-003`, `UC-007`, `UC-008` |
| `R-006` | Team-member local replay helpers live under `run-history`. | `AC-004` | No `agent-memory` service returns `RunProjection`. | `UC-004` |
| `R-007` | Lossy replay projection does not replace raw-trace reads. | `AC-006`, `AC-011` | Raw traces remain available for precise consumers. | `UC-006`, `UC-008` |
| `R-008` | Frontend run hydration consumes a server-owned replay contract. | `AC-007`, `AC-010` | Presentation-layer hydration stays presentation-layer only. | `UC-003`, `UC-004`, `UC-007` |
| `R-009` | `run-history` owns a historical activity projection contract as a sibling to conversation replay. | `AC-008`, `AC-009`, `AC-010` | Historical activities are first-class replay output. | `UC-003`, `UC-004`, `UC-007`, `UC-008` |
| `R-010` | Historical activity hydration does not derive from UI conversation segments. | `AC-009`, `AC-010` | Right-side historical pane hydrates from `projection.activities`. | `UC-007`, `UC-008` |
| `R-011` | Historical activity fidelity is explicit and source-dependent. | `AC-011` | Local raw-trace-backed replay may be simplified; missing lifecycle/log detail is not fabricated. | `UC-007`, `UC-008` |
| `R-012` | Replay preserves source-native reasoning/think distinctions when the historical source persists them. | `AC-012`, `AC-013`, `AC-014`, `AC-015` | Runtime-backed replay can carry separate reasoning instead of flattening it into assistant text. | `UC-005`, `UC-009`, `UC-010` |
| `R-013` | Provider normalization must not flatten a distinct reasoning item into assistant text. | `AC-013`, `AC-015` | Codex runtime normalization stays faithful to runtime-native item boundaries. | `UC-005`, `UC-009` |
| `R-014` | Replay stays truthful when the historical runtime source does not provide a separate reasoning item. | `AC-012`, `AC-015` | Separate reasoning is optional, not fabricated. | `UC-005`, `UC-010` |
| `R-015` | Frontend historical hydration maps explicit reasoning replay entries into the same `think` segment family used by the live monitor. | `AC-014`, `AC-016` | Reopened UI uses the same segment semantics as live streaming. | `UC-009`, `UC-010`, `UC-011` |
| `R-016` | Frontend historical hydration groups adjacent assistant-side replay entries into one segmented AI message in source order. | `AC-016` | Reopen no longer creates one AI message per replay entry when the replay stream represents one assistant turn. | `UC-009`, `UC-011` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Memory GraphQL and run-history GraphQL are separate entrypoints, but they converge on a shared memory-owned replay DTO. The right-side activity pane remains live-only. | `src/api/graphql/types/memory-view.ts`, `src/api/graphql/types/run-history.ts`, `autobyteus-web/services/runHydration/runContextHydrationService.ts`, `autobyteus-web/stores/agentActivityStore.ts` | Whether team-member historical activity UI needs immediate frontend consumption in the same ticket. |
| Current Ownership Boundaries | `agent-memory` owns raw memory IO correctly, but also owns `MemoryConversationEntry`, `buildConversationView`, and a team-member helper that returns `RunProjection`. Historical activity ownership is missing entirely on the reopen path. | `src/agent-memory/domain/models.ts`, `src/agent-memory/services/agent-memory-service.ts`, `src/agent-memory/services/team-member-memory-projection-reader.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Whether any non-run-history server consumer still depends on memory conversation DTOs. |
| Current Coupling / Fragmentation Problems | `run-history` imports `MemoryConversationEntry` as its own contract, local AutoByteus history delegates to memory conversation output, and the frontend only has live activity hydration. | `src/run-history/projection/run-projection-types.ts`, `src/run-history/projection/providers/*`, `autobyteus-web/services/runHydration/*` | None blocking the design direction. |
| Existing Constraints / Compatibility Facts | Memory inspector does not request `conversation`; raw-trace consumers still need precise identity fields such as `turnId`; no dedicated persisted lifecycle-event store was found for AutoByteus reopen. | `autobyteus-web/graphql/queries/agentMemoryViewQueries.ts`, `teamMemoryQueries.ts`, `channel-turn-reply-recovery-service.ts`, `agent-execution/domain/agent-run-event.ts` | Exact historical live-parity activity replay would require a richer persisted historical source in a follow-up. |
| Relevant Files / Components | Cleanup is concentrated in server memory/run-history contracts and the frontend run-hydration consumer types plus the activity store hydration boundary. | `src/agent-memory/**`, `src/run-history/**`, `autobyteus-web/services/runHydration/**`, `autobyteus-web/stores/agentActivityStore.ts` | None blocking. |

## Current State (As-Is)

- `AgentMemoryService.getRunMemoryView(...)` returns one mixed object containing:
  - memory-oriented tabs (`workingContext`, `episodic`, `semantic`, `rawTraces`)
  - replay-oriented `conversation`
- `RunProjection` is typed as `MemoryConversationEntry[]`, so the replay contract is imported from the memory subsystem.
- The local AutoByteus run-history provider asks `AgentMemoryService` for `conversation` and wraps it into `RunProjection`.
- `TeamMemberMemoryProjectionReader` lives under `agent-memory` and returns `RunProjection`.
- Codex and Claude providers bypass raw memory but still emit the same memory-owned replay DTO.
- The frontend performs another transformation from server replay entries into UI `Conversation` messages and segments. That step is acceptable, but it currently consumes a DTO with the wrong server owner.
- The right-side activity panel is populated only by live streaming lifecycle handlers and is not hydrated on reopen.
- Historical reopen currently rebuilds coarse middle-pane tool segments only; it does not rebuild right-side activities.
- The current replay event model still only distinguishes `message` and `tool`, so runtime-native `reasoning` is flattened into assistant text instead of remaining a first-class historical replay event.
- The current frontend historical conversation hydration creates a new AI message for each replay entry rather than grouping adjacent assistant-side entries into one segmented AI message.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Memory inspector requests run memory view | Inspector receives memory-oriented data for tabs | `agent-memory` via memory GraphQL boundary | This is the correct raw-memory/memory-view spine and should stay memory-owned. |
| `DS-002` | `Primary End-to-End` | User opens historical standalone run | Web receives server-owned conversation replay and hydrates the middle pane | `run-history` via run-history GraphQL boundary | This is the historical conversation replay spine whose ownership is currently blurred. |
| `DS-003` | `Primary End-to-End` | User opens historical standalone run | Web receives server-owned activity replay and hydrates the right-side activity pane | `run-history` via run-history GraphQL boundary | This is the missing historical activity spine. |
| `DS-004` | `Primary End-to-End` | User opens historical team-member run | Web receives server-owned replay bundle for the focused team-member run | `run-history` via team run-history GraphQL boundary | Team-member historical replay should follow the same owner split as standalone replay. |
| `DS-005` | `Primary End-to-End` | Turn-accurate recovery service asks for reply text | Raw traces are read and merged by turn | `agent-memory` raw-trace read path | This proves replay projection is not the same layer as raw trace access. |
| `DS-006` | `Bounded Local` | Historical source load begins | Normalized replay events produce `conversation` and `activities` together | `run-history` historical replay compiler | This is the internal compile loop that prevents the middle and right panes from deriving from each other. |

## Primary Execution / Data-Flow Spine(s)

- `DS-001`: `Memory Inspector UI -> Memory GraphQL -> AgentMemoryService -> MemoryFileStore -> disk memory files`
- `DS-002`: `Run Open UI -> Run History GraphQL -> AgentRunViewProjectionService -> runtime-specific or local-memory projection provider -> RunProjection.conversation -> web conversation hydration`
- `DS-003`: `Run Open UI -> Run History GraphQL -> AgentRunViewProjectionService -> runtime-specific or local-memory projection provider -> RunProjection.activities -> web activity hydration`
- `DS-004`: `Team Run Open UI -> Team Run History GraphQL -> TeamMemberRunViewProjectionService -> runtime-specific or local-memory projection provider -> RunProjection bundle -> web team run hydration`
- `DS-005`: `Turn Reply Recovery -> raw trace reader -> raw trace records -> reply text merge`
- `DS-006`: `Historical source records -> normalized replay events -> conversation builder + activity builder -> RunProjection bundle`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `MemoryViewResolver` | Memory entrypoint | Exposes memory-oriented read APIs only. |
| `AgentMemoryService` | Raw memory read orchestrator | Reads working context, episodic, semantic, and raw traces from disk-backed sources. |
| `AgentRunViewProjectionService` | Historical replay boundary | Chooses the correct provider and returns one server-owned replay bundle. |
| `Replay bundle scoring` | Bounded local selection concern | Scores bundle richness and usability so provider arbitration does not privilege conversation-only completeness. |
| `RunProjectionProvider` | Runtime/local adapter boundary | Loads historical source data for one runtime and normalizes it into replay output. |
| `HistoricalReplayEvent` normalizer | Bounded local compiler concern | Produces one internal normalized event stream for both conversation and activities. |
| `RunProjectionConversationBuilder` | Replay read-model builder | Produces middle-pane historical conversation entries. |
| `RunProjectionActivityBuilder` | Replay read-model builder | Produces right-pane historical activity entries. |
| `runHydration` services | Frontend presentation boundary | Convert projection bundle into UI stores and message/segment state. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Raw disk-backed memory reads | `agent-memory` | `Reuse` | Already the correct owner of raw memory files and raw memory models. | N/A |
| Historical replay contract and providers | `run-history` | `Extend` | This subsystem already owns historical replay services and provider arbitration. | N/A |
| Shared normalized historical replay events | `run-history` | `Create New` | A new internal owned structure is needed so conversation and activities do not derive from each other or duplicate parsing logic. | Existing memory transformer is in the wrong owner and conversation-only. |
| UI `Conversation` hydration | `autobyteus-web/services/runHydration` | `Reuse` | Already the correct last-mile presentation boundary. | N/A |
| UI activity hydration | `autobyteus-web/services/runHydration` | `Extend` | Same frontend boundary should hydrate the right-side store from server projection. | Do not put historical hydration into the live streaming handlers. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory` | raw memory types, raw file IO, raw memory read service, memory inspector models | `DS-001`, `DS-005` | `AgentMemoryService` | `Reuse` / `Tighten` | Remove replay DTO ownership. |
| `run-history` | replay bundle DTOs, normalized historical replay events, replay providers, local replay compiler, team-member local replay reader | `DS-002`, `DS-003`, `DS-004`, `DS-006` | `AgentRunViewProjectionService`, `TeamMemberRunViewProjectionService` | `Extend` | Main refactor target. |
| `api/graphql` | API boundary for memory view and replay view | `DS-001`, `DS-002`, `DS-003`, `DS-004` | resolvers | `Extend` | Keep memory and replay boundaries separate. |
| `autobyteus-web/services/runHydration` | transform server replay bundle into UI state | `DS-002`, `DS-003`, `DS-004` | frontend hydration services | `Extend` | Add explicit activity hydration. |
| `autobyteus-web/stores/agentActivityStore.ts` | UI activity state store | `DS-003` | activity pane | `Reuse` | Historical hydration should populate this store, not streaming logic only. |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `run-history` -> `agent-memory` raw read models and raw read services
  - `api/graphql/run-history` -> `run-history`
  - `api/graphql/memory-view` -> `agent-memory`
  - `web run hydration` -> `run-history` GraphQL contract
- Authoritative public entrypoints versus internal owned sub-layers:
  - replay callers above the server boundary depend on `run-history`, not on `agent-memory` replay internals
  - memory callers above the server boundary depend on `agent-memory` memory-view APIs, not on `run-history`
  - historical UI callers above the frontend hydration boundary depend on hydrated conversation/activity state, not on raw projection parsing helpers
- Authoritative Boundary Rule per domain subject:
  - run-history callers must not depend on both `RunProjection` service/provider boundaries and `agent-memory` replay DTOs/helpers
  - frontend reopen flows must not depend on both run-history replay bundle data and live streaming lifecycle handlers for the same historical subject
- Forbidden shortcuts:
  - `run-history` importing a memory-owned replay DTO as its canonical contract
  - `agent-memory` services returning `RunProjection`
  - local replay providers delegating authoritative replay construction to a memory-view contract
  - historical activity hydration deriving rows from conversation UI segments or generic message segments
- Temporary exceptions and removal plan:
  - Keep GraphQL replay arrays JSON-shaped in this ticket if needed to keep the ownership split bounded. That is a transport simplification only; the server-owned DTOs and builders still move into `run-history`.

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - `Move canonical historical replay ownership into run-history, keep raw memory ownership in agent-memory, and expose one replay bundle with sibling conversation and activity read models to frontend hydration.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - Lowers conceptual complexity by aligning each layer with one data concern.
  - Prevents the middle and right panes from re-implementing or inferring each other.
  - Improves testability because raw-memory tests, normalized-event tests, conversation-builder tests, and activity-builder tests become distinct.
  - Reduces future drift: runtime-native providers and local-memory-backed providers converge on one run-history-owned replay bundle contract.
  - Preserves operability by making fidelity limits explicit instead of promising live-parity where no persisted historical source exists.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`):
  - `Split responsibilities, Add normalized replay event layer, Move replay compilation ownership, Remove mixed legacy contract ownership`

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `Yes` | Local and runtime-backed providers all converge on the same replay semantics, and activity replay needs the same owner. | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | `Yes` | `agent-memory` currently owns raw memory reads and replay DTO/compilation concerns. | Split |
| Proposed indirection owns real policy, translation, or boundary concern | `Yes` | The normalized historical replay event layer owns cross-provider replay semantics for both panes. | Keep |
| Every off-spine concern has a clear owner on the spine | `Yes` | GraphQL conversion, runtime history readers, normalized event builders, and UI hydration all serve one main-line owner. | Keep |
| Authoritative Boundary Rule is preserved | `Yes` | Replay callers depend on `run-history`; raw callers depend on `agent-memory`; historical activities do not depend on live streaming internals. | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | `Yes` | `agent-memory`, `run-history`, and `runHydration` all already exist and map cleanly to the split. | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | `Yes` | Normalized historical replay events plus separate conversation/activity builders remove duplication. | Extract |
| Current structure can remain unchanged without spine/ownership degradation | `No` | Memory-owned replay DTO and live-only activity reopen keep the architecture mixed and incomplete. | Change |

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| `A` | Keep `MemoryConversationEntry` in `agent-memory`, but add historical activities separately in `run-history` | Smaller churn on conversation side | Leaves replay ownership split across subsystems | `Rejected` | Does not solve the main ownership problem |
| `B` | Derive historical activities in the frontend from historical conversation/tool segments | Fastest UI-only patch | Violates ownership, loses fidelity, duplicates parsing logic, and couples the right pane to the middle pane | `Rejected` | Breaks the authoritative boundary |
| `C` | Move replay DTOs and compilers into `run-history`, add a normalized internal replay event stream, and expose sibling `conversation` + `activities` outputs | Clean layer split, one authoritative historical owner, scalable to richer providers later | Requires more explicit builder/normalizer structure | `Chosen` | Best alignment with the real data-flow spine |
| `D` | Extend the replay bundle with explicit reasoning events and grouped assistant-side historical hydration | Preserves runtime-native live-monitor distinctions without inventing data that the source never stored | Requires a tighter normalized replay event model and frontend grouping logic | `Chosen` | Necessary to satisfy the stronger Codex reopen requirement while staying source-truthful |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `autobyteus-server-ts/src/agent-memory/domain/models.ts` | same | Remove memory-owned canonical replay DTO and replay field from memory view types. | memory domain | Keep raw memory models only. |
| `C-002` | `Remove` / `Move` | `autobyteus-server-ts/src/agent-memory/transformers/raw-trace-to-conversation.ts` | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Replay compilation belongs to `run-history`, not `agent-memory`. | memory / run-history | Raw traces normalize into internal replay events first. |
| `C-003` | `Add` | `N/A` | `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts` | Create one internal normalized replay event model for both conversation and activities. | run-history | Internal only, not public API. |
| `C-004` | `Add` | `N/A` | `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts` | Build middle-pane replay entries from normalized replay events. | run-history | Public replay output builder. |
| `C-005` | `Add` | `N/A` | `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts` | Build right-pane activity entries from normalized replay events. | run-history | Public replay output builder. |
| `C-006` | `Modify` | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | same | Remove replay compilation from memory-view service; keep raw memory reads only. | memory service | `getRunMemoryView` becomes memory-only. |
| `C-007` | `Modify` | `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts` | same | Introduce run-history-owned replay bundle, conversation entry type, and activity entry type. | run-history contract | Stop importing memory replay DTO. |
| `C-008` | `Modify` | `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts` | same | Build local replay bundle from raw memory inputs inside `run-history`. | local replay provider | Uses normalized replay event compiler plus builders. |
| `C-009` | `Rename/Move` | `autobyteus-server-ts/src/agent-memory/services/team-member-memory-projection-reader.ts` | `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts` | Team-member local replay helper belongs under `run-history`. | team replay | Name reflects actual concern. |
| `C-010` | `Modify` | `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`, `claude-run-view-projection-provider.ts` | same | Runtime-backed providers emit the run-history-owned replay bundle and activity entries. | runtime providers | May populate richer activity fidelity when source supports it. |
| `C-011` | `Modify` | `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | same | Remove replay-only memory API fields/args or narrow them to memory-only semantics. | memory GraphQL | No active consumer for `conversation`. |
| `C-012` | `Modify` | `autobyteus-server-ts/src/api/graphql/types/run-history.ts`, `team-run-history.ts` | same | Expose `activities` alongside `conversation` in the run-history replay payload. | run-history GraphQL | JSON transport can remain temporarily if needed. |
| `C-013` | `Modify` | `autobyteus-web/services/runHydration/runContextHydrationService.ts` | same | Hydrate historical activity state from `projection.activities` in addition to conversation. | web run hydration | Keep historical hydration explicit. |
| `C-014` | `Add` | `N/A` | `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Create the presentation-layer boundary that maps server activity entries into `agentActivityStore`. | web run hydration | Prevents UI derivation from conversation segments. |
| `C-015` | `Modify` | `autobyteus-web/stores/agentActivityStore.ts` | same | Accept historical hydration input while remaining the UI activity store. | web store | No architectural ownership change. |
| `C-016` | `Modify` | `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | same | Make projection scoring, usability checks, and fallback choice bundle-aware instead of conversation-only. | replay boundary | Required for correct provider arbitration. |
| `C-017` | `Modify` | `autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts` | same | Derive summary and `lastActivityAt` from replay bundle semantics rather than only from conversation tail. | replay metadata | Bundle metadata must match bundle ownership. |
| `C-018` | `Modify` | `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`, `team-run-history.ts`, `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | same | Make the team-member replay surface bundle-complete so it carries `activities` alongside `conversation`. | team replay | Prevents team path from collapsing back to conversation-only. |
| `C-019` | `Modify` | `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts`, `historical-replay-events-to-conversation.ts` | same | Add a first-class historical reasoning event and preserve it in run-history-owned conversation entries instead of flattening it into assistant text. | run-history replay internals | Required for runtime-native reasoning fidelity. |
| `C-020` | `Modify` | `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | same | Emit reasoning replay events in source order when Codex `thread/read` returns `reasoning` items, and keep absence explicit when none are present. | Codex runtime provider | Do not merge reasoning into assistant content. |
| `C-021` | `Modify` | `autobyteus-web/services/runHydration/runProjectionConversation.ts` | same | Group adjacent assistant/reasoning/tool replay entries into one ordered AI message with `think`, tool, text, and media segments until the next user boundary. | web historical hydration | Required for reopened center-pane structure to stay close to the live monitor. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryConversationEntry` as the shared replay DTO | Replay contract belongs to `run-history` | `RunProjectionConversationEntry` in `run-history` | `In This Change` | Core removal |
| `AgentMemoryView.conversation` and `includeConversation` path | Memory inspector does not use replay projection; mixed concern | memory-only `AgentMemoryView` | `In This Change` | Remove contract clutter |
| `agent-memory/services/team-member-memory-projection-reader.ts` returning `RunProjection` | Wrong subsystem owner | `run-history/services/team-member-local-run-projection-reader.ts` | `In This Change` | Move and rename |
| Local AutoByteus provider dependence on memory-layer conversation output | Wrong authoritative contract owner | run-history local replay compiler | `In This Change` | Central layering fix |
| Historical activity reopen being live-only | Right-side pane belongs to historical replay boundary too | `RunProjection.activities` plus activity hydration | `In This Change` | Core addition and cleanup |
| Conversation-first projection scoring and metadata | Replay selection and metadata stay biased toward one child read model | bundle-aware scoring in `AgentRunViewProjectionService` and bundle-aware metadata in `run-projection-utils.ts` | `In This Change` | Required for coherent replay-bundle ownership |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-memory/domain/models.ts` | `agent-memory` | memory domain | Raw memory record and memory-view types only | One memory domain contract file | N/A |
| `src/agent-memory/services/agent-memory-service.ts` | `agent-memory` | memory read service | Read and normalize memory-oriented data from `MemoryFileStore` | One memory read orchestrator | Reuses raw memory domain types |
| `src/run-history/projection/historical-replay-event-types.ts` | `run-history` | normalized replay internals | Internal normalized historical event types | One internal replay model owner | Shared by both builders |
| `src/run-history/projection/run-projection-types.ts` | `run-history` | replay contract | Canonical replay bundle plus conversation/activity entry shapes | One replay contract file | Shared by all providers |
| `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | `run-history` | local replay compiler | Convert raw traces into normalized replay events | One local replay transform boundary | Reuses raw memory trace types |
| `src/run-history/projection/transformers/historical-replay-events-to-conversation.ts` | `run-history` | conversation builder | Build historical conversation entries from normalized replay events | One replay output concern | Reuses normalized replay events |
| `src/run-history/projection/transformers/historical-replay-events-to-activities.ts` | `run-history` | activity builder | Build historical activity entries from normalized replay events | One replay output concern | Reuses normalized replay events |
| `src/run-history/services/agent-run-view-projection-service.ts` | `run-history` | replay bundle selector | Choose the richest usable replay bundle and apply fallback policy | One authoritative replay boundary | Reuses replay contract |
| `src/run-history/services/team-member-local-run-projection-reader.ts` | `run-history` | team-member local replay reader | Read local team-member historical source and compile replay bundle | One team-member local replay boundary | Reuses replay compiler and builders |
| `src/run-history/services/team-member-run-view-projection-service.ts` | `run-history` | team-member replay boundary | Return the same replay bundle shape for team-member reopen | One team-member replay API boundary | Reuses replay contract |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | `web run hydration` | UI activity hydration boundary | Convert server activity entries into UI activity rows | One presentation transform | Reuses run-history GraphQL contract |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical replay bundle shapes | `src/run-history/projection/run-projection-types.ts` | `run-history` | All replay providers need one public contract | `Yes` | `Yes` | A memory-owned or generic catch-all shared DTO |
| Historical source normalization logic | `src/run-history/projection/historical-replay-event-types.ts` plus normalizers | `run-history` | Both conversation and activity builders need one shared internal source model | `Yes` | `Yes` | UI-facing DTOs or raw-memory-owned helpers |
| Conversation/activity derivation policy | separate builder files | `run-history` | Keeps sibling read models independent while reusing source normalization | `Yes` | `Yes` | One mixed builder that derives right pane from left pane |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `MemoryTraceEvent` | `Yes` | `N/A` | `Low` | `Yes` | Keep as raw memory read shape |
| `HistoricalReplayEvent` | `Yes` | `Yes` | `Low` | `Yes` | Keep internal and source-normalized only |
| `RunProjectionConversationEntry` | `Yes` | `Yes` | `Low` | `Yes` | Keep replay-only semantics explicit; do not add raw-trace identity promises |
| `RunProjectionActivityEntry` | `Yes` | `Yes` | `Low` | `Yes` | Keep right-pane replay-only semantics explicit; allow source-dependent optional fields |
| `AgentMemoryView` | `Yes` after replay removal | `Yes` | `Low` | `Yes` | Remove replay fields and args |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | `agent-memory` | memory domain | Raw memory types and memory-view types | Memory-layer contract only | N/A |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | `agent-memory` | memory read service | Read memory-oriented snapshots from disk-backed files | Memory-layer orchestration | Reuses raw memory types |
| `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts` | `run-history` | normalized replay internals | Shared internal historical replay event shape | Internal shared source model owner | Shared by builders/providers |
| `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts` | `run-history` | replay contract | Canonical replay bundle plus public conversation/activity entry types | One replay contract owner | Shared by all providers |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | `run-history` | local replay normalizer | Convert raw traces into normalized replay events | One local replay transform owner | Reuses raw trace types |
| `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts` | `run-history` | conversation builder | Convert normalized replay events into middle-pane replay entries | One replay output owner | Reuses normalized replay events |
| `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts` | `run-history` | activity builder | Convert normalized replay events into right-pane activity entries | One replay output owner | Reuses normalized replay events |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | `run-history` | replay bundle selector | Choose the best replay bundle across primary/fallback providers | One authoritative replay boundary | Reuses replay contract |
| `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts` | `run-history` | local replay provider | Read raw traces from memory layer and compile replay bundle in `run-history` | One local provider | Reuses normalizer and builders |
| `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | `run-history` | Codex replay provider | Convert Codex native history into replay bundle | One runtime adapter | Reuses replay contract |
| `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts` | `run-history` | Claude replay provider | Convert Claude session history into replay bundle | One runtime adapter | Reuses replay contract |
| `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts` | `run-history` | team-member local replay reader | Local team-member replay read path | One team-member replay reader | Reuses normalizer and builders |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | `run-history` | team-member replay boundary | Return the same replay bundle shape for team-member reopen | One team-member replay API boundary | Reuses replay contract |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | `api/graphql` | memory API boundary | Expose memory-only GraphQL shapes | One memory API surface | Reuses memory domain types |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | `api/graphql` | standalone replay API boundary | Expose replay-only GraphQL payload with conversation and activities | One replay API surface | Reuses replay contract |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | `api/graphql` | team-member replay API boundary | Expose team-member replay-only payload | One replay API surface | Reuses replay contract |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | `web run hydration` | UI conversation hydration boundary | Convert server replay entries into UI messages and segments | One presentation transform | Reuses run-history GraphQL contract |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | `web run hydration` | UI activity hydration boundary | Convert server replay activities into `agentActivityStore` rows | One presentation transform | Reuses run-history GraphQL contract |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `team-member-memory-projection-reader.ts` | `src/agent-memory/services/team-member-memory-projection-reader.ts` | `src/run-history/services/team-member-local-run-projection-reader.ts` | team-member historical replay | `No` currently | `Low` | `Move` | Wrong subsystem owner today |
| `raw-trace-to-conversation.ts` | `src/agent-memory/transformers/raw-trace-to-conversation.ts` | `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | local replay normalization | `No` currently | `Low` | `Move/Rename` | Replay normalization belongs to `run-history` |
| conversation + activity derivation | `N/A` | separate builder files under `src/run-history/projection/transformers/` | replay output construction | `Yes` | `Low` | `Split` | Prevents the middle and right panes from deriving from each other |
| `agent-memory-service.ts` | `src/agent-memory/services/agent-memory-service.ts` | same | memory read orchestration | `Yes` after replay removal | `Low` | `Keep` | Correct owner once narrowed |
| `run-projection-types.ts` | `src/run-history/projection/run-projection-types.ts` | same | replay contract | `Yes` after contract ownership fix | `Low` | `Keep` | Correct owner once memory import removed |

## Concrete Design Example

- Good target shape:
  - `disk memory files -> AgentMemoryService raw reads -> AutoByteusRunViewProjectionProvider -> raw-trace normalizer -> normalized replay events -> conversation builder + activity builder -> RunProjection bundle -> web conversation hydration + web activity hydration`
- Bad current shape:
  - `disk memory files -> AgentMemoryService mixed memory view -> run-history wrapper -> conversation-only projection -> frontend infers anything else it needs`

The difference is not where the data originates. The difference is who owns the historical read model layered above the raw data, and whether the middle and right panes are sibling outputs or accidental derivations.

## Deferred Follow-Up Note

- The touched-file and artifact area was investigated but is intentionally deferred from this ticket.
- Current high-level conclusion for later follow-up:
  - backend touched-file replay already has a dedicated projection owner
  - the remaining issues there are replay fidelity for repeated same-path edits and presentation-layer mixing in the artifact viewer
- Exact live-parity historical activity replay is also a follow-up candidate if the product later requires persisted approval/log/execution history for AutoByteus reopen.
