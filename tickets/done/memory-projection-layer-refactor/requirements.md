# Requirements

## Status

- Current Status: `Design-ready`
- Scope Classification: `Medium`

## Goal / Problem Statement

Refactor the memory-view and run-history projection area so the raw memory model, the server-side historical replay model, and the frontend hydration model are cleanly separated. The current design mixes those concerns by letting the memory module synthesize and export a conversation view that is then reused as the canonical run-history projection contract across local memory-backed and runtime-backed histories, while the right-side activity pane remains live-only instead of being a sibling historical read model. The stronger reopen target is that runtime-backed historical replay should preserve source-native live-monitor distinctions when the historical source actually persists them, while remaining truthful when the source does not.

## In-Scope Use Cases

- `UC-001` A memory-oriented backend caller reads run-scoped working context, episodic memory, semantic memory, or raw traces from disk without depending on historical replay projection shapes.
- `UC-002` The memory inspector queries memory-oriented contracts only and remains decoupled from run-history replay concerns.
- `UC-003` Standalone run-history reopen/continue reads a server-owned `RunProjection` contract that is derived from raw memory or runtime-native history within the `run-history` subsystem.
- `UC-004` Team-member run-history reopen uses the same layered run-history projection ownership as standalone runs instead of an `agent-memory` helper returning `RunProjection`.
- `UC-005` Runtime-backed providers for Codex, Claude, and AutoByteus all converge onto the same run-history-owned projection entry contract.
- `UC-006` Trace-accurate or turn-accurate consumers keep a raw-trace path available when replay projection is intentionally lossy.
- `UC-007` Standalone historical reopen hydrates the right-side activity feed from a run-history-owned activity projection rather than from the live-only streaming store.
- `UC-008` Historical activity replay preserves the best fidelity available from the historical source, but does not reconstruct missing lifecycle/log detail indirectly from the middle-panel conversation UI.
- `UC-009` Runtime-backed reopen, especially for Codex, preserves separate reasoning, assistant-message, and tool/command structures when the historical source returns them separately so the reopened UI can mirror the live monitor structure.
- `UC-010` Runtime-backed reopen remains source-truthful and does not fabricate separate reasoning or lifecycle segments when the historical source does not persist them.
- `UC-011` Historical conversation hydration groups adjacent assistant-side replay entries into one segmented AI message in source order so reopened history stays structurally close to the live monitor instead of creating one historical AI message per replay entry.

## Requirements

- `R-001` Raw memory records on disk remain the source of truth for memory state; they are not replaced by replay projection records.
- `R-002` The `agent-memory` subsystem must own raw memory read models and memory-inspector-oriented derived views only; it must not own the canonical historical replay projection contract.
- `R-003` The `run-history` subsystem must own the authoritative server-side projection contract used for reopen/rehydration across local-memory-backed and runtime-backed histories.
- `R-004` Memory-view APIs and run-history projection APIs must remain distinct layers even when they are derived from the same raw traces.
- `R-005` Local AutoByteus historical replay must be built in `run-history` from raw memory inputs rather than by reusing a memory-layer conversation DTO as the authoritative contract.
- `R-006` Team-member local historical replay helpers that return `RunProjection` must live under the `run-history` subsystem rather than under `agent-memory`.
- `R-007` Replay projection may remain intentionally lossy, but raw-trace reads that preserve trace or turn identity must remain available for consumers that need them.
- `R-008` Frontend run hydration remains a presentation-layer transformation and should consume a server-owned run-history projection contract rather than a repurposed memory-layer DTO.
- `R-009` The `run-history` subsystem must own a historical activity projection contract as a sibling read model to historical conversation replay.
- `R-010` Historical activity hydration must consume the run-history activity projection directly rather than reconstructing the right-side activity pane from UI conversation segments.
- `R-011` Historical activity fidelity must be explicit and source-dependent: when the historical source lacks persisted lifecycle/log detail, the projection may be simplified, but the simplification must remain inside the run-history projection layer rather than being hidden in frontend inference.
- `R-012` The run-history-owned historical replay contract must preserve source-native conversational distinctions needed for live-monitor parity when the historical source persists them, including separate reasoning/think versus assistant-message text where available.
- `R-013` Runtime-backed provider normalization must not flatten a distinct reasoning/think item into assistant-message text inside the provider layer.
- `R-014` When the historical runtime source lacks a distinct reasoning item, the replay contract must keep that absence explicit rather than fabricating reasoning segments.
- `R-015` Frontend historical hydration must map explicit reasoning/think replay entries into the same UI segment family used by the live monitor, while tolerating source-limited histories that omit them.
- `R-016` Frontend historical conversation hydration must preserve source order and group adjacent assistant-side replay entries into one segmented AI message where that grouping is required to mirror the live monitor structure.

## Acceptance Criteria

- `AC-001` `agent-memory/domain/models.ts` no longer defines the canonical conversation-entry DTO used by `RunProjection`.
- `AC-002` `run-history/projection/run-projection-types.ts` owns a run-history projection entry type that is not imported from `agent-memory`.
- `AC-003` The local AutoByteus run-history provider builds projection entries from raw memory inputs inside `run-history` rather than delegating to `AgentMemoryService` conversation output as the authoritative contract.
- `AC-004` Team-member local historical projection is no longer produced by an `agent-memory` service that returns `RunProjection`.
- `AC-005` Codex, Claude, and AutoByteus historical providers all emit the run-history-owned projection entry type.
- `AC-006` Memory inspector contracts stay memory-oriented and continue to expose raw traces without requiring the run-history replay contract.
- `AC-007` Frontend run-hydration code continues to consume the run-history projection layer, but the consumed contract is clearly server-owned by `run-history`.
- `AC-008` `RunProjection` owns a run-history activity entry type and exposes historical `activities` alongside historical `conversation`.
- `AC-009` The local AutoByteus run-history path builds historical activities inside `run-history` from historical source data rather than deriving them from the UI conversation contract.
- `AC-010` Frontend reopen hydration populates the right-side historical activity view from `projection.activities` independently of conversation hydration.
- `AC-011` The design makes source-fidelity limits explicit: local raw-trace-backed reopen may expose simplified statuses/log coverage, but the system does not claim live-parity activity reconstruction without persisted historical lifecycle events.
- `AC-012` The run-history historical replay model can represent a reasoning/think entry explicitly instead of only `message` and `tool` when the source returns a separate reasoning item.
- `AC-013` The Codex historical provider emits separate reasoning replay entries when `thread/read` returns `reasoning` items and does not embed those items into assistant-message content.
- `AC-014` Frontend historical run hydration maps explicit reasoning replay entries into `think` segments so reopened history can match the live Codex monitor structure when the source preserves it.
- `AC-015` Direct Codex validation evidence documents both source-presence and source-absence behavior: at least one real `thread/read` inspection is recorded, and the design treats separate reasoning as optional rather than guaranteed.
- `AC-016` Historical conversation hydration no longer creates one AI message per replay entry by default; instead it groups adjacent assistant/reasoning/tool replay entries into one AI message with ordered segments until the next user boundary.

## Acceptance-Criteria Scenario Intent

- `ACS-001` Memory inspector queries continue to load working context, episodic memory, semantic memory, and raw traces without depending on replay projection ownership.
- `ACS-002` Standalone AutoByteus run reopen reads projection entries from a `run-history`-owned contract derived from raw traces.
- `ACS-003` Team-member reopen reads projection entries from a `run-history`-owned contract and no longer depends on `agent-memory` returning `RunProjection`.
- `ACS-004` Codex and Claude runtime providers compile into the same run-history projection entry contract as AutoByteus.
- `ACS-005` Turn-scoped consumers still read raw traces when they need `turnId` or full trace identity.
- `ACS-006` Standalone reopen hydrates a historical activity feed from `run-history` rather than from the live streaming path.
- `ACS-007` Historical activity replay shows only the fidelity carried by the historical source instead of inferring missing lifecycle/log detail from conversation UI state.
- `ACS-008` When Codex history returns separate reasoning items, reopened history preserves them as separate replay entries and UI think segments instead of folding them into assistant text.
- `ACS-009` When Codex history omits separate reasoning items, reopened history stays truthful and does not invent a reasoning segment.
- `ACS-010` A mixed assistant replay sequence such as reasoning -> tool -> assistant text hydrates into one reopened AI message with ordered `think`, tool, and text segments rather than three separate historical AI messages.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `R-002` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-003` | `UC-003`, `UC-004`, `UC-005` |
| `R-004` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-005` | `UC-003` |
| `R-006` | `UC-004` |
| `R-007` | `UC-006` |
| `R-008` | `UC-003`, `UC-004` |
| `R-009` | `UC-003`, `UC-004`, `UC-007`, `UC-008` |
| `R-010` | `UC-007`, `UC-008` |
| `R-011` | `UC-007`, `UC-008` |
| `R-012` | `UC-005`, `UC-009`, `UC-010` |
| `R-013` | `UC-005`, `UC-009` |
| `R-014` | `UC-005`, `UC-010` |
| `R-015` | `UC-009`, `UC-010` |
| `R-016` | `UC-009`, `UC-011` |

## Acceptance-Criteria-To-Scenario Mapping

| Acceptance Criteria ID | Scenario Intent IDs |
| --- | --- |
| `AC-001` | `ACS-002`, `ACS-003`, `ACS-004` |
| `AC-002` | `ACS-002`, `ACS-003`, `ACS-004` |
| `AC-003` | `ACS-002` |
| `AC-004` | `ACS-003` |
| `AC-005` | `ACS-004` |
| `AC-006` | `ACS-001`, `ACS-005` |
| `AC-007` | `ACS-002`, `ACS-003`, `ACS-004` |
| `AC-008` | `ACS-002`, `ACS-003`, `ACS-004`, `ACS-006` |
| `AC-009` | `ACS-002`, `ACS-006`, `ACS-007` |
| `AC-010` | `ACS-006` |
| `AC-011` | `ACS-007` |
| `AC-012` | `ACS-008`, `ACS-009` |
| `AC-013` | `ACS-008` |
| `AC-014` | `ACS-008`, `ACS-009` |
| `AC-015` | `ACS-008`, `ACS-009` |
| `AC-016` | `ACS-008`, `ACS-010` |

## Constraints / Dependencies

- Preserve the file-backed memory design where raw traces, episodic memory, semantic memory, and working-context snapshots remain the stored source of truth.
- Preserve runtime-specific run-history providers for Codex and Claude; the refactor is about boundary ownership, not removal of runtime-aware projection.
- Do not introduce backward-compatibility wrappers that preserve the mixed shared DTO indefinitely.
- Avoid touching unrelated dirty files in the shared `personal` worktree; implementation should happen in the dedicated ticket worktree.
- Historical file-change/artifact replay cleanup is out of scope for this ticket and should be handled in a follow-up task.
- There is no identified persisted run-event store for reopened AutoByteus runs today, so historical activity replay must be designed around the actually persisted historical sources instead of assuming full live lifecycle history is available.

## Assumptions

- The current issue is architectural rather than a one-off bug in a single provider.
- The correct layering is `raw memory data -> run-history projection -> frontend UI hydration`.
- The memory inspector does not need the run-history conversation projection in its current product surface.
- The right-side historical activity pane belongs to the same server-owned run-history projection boundary as the middle historical replay pane, but it is a sibling read model rather than a derivation of conversation.
- The reopened historical UI should preserve source-native distinctions when the history source actually stores them, but should not fabricate distinctions that the source did not persist.

## Open Questions / Risks

- Whether the memory subsystem should still expose an optional human-readable derived trace view for inspector/debug use, provided it is clearly not the run-history contract.
- Whether the run-history GraphQL contract should remain JSON-shaped temporarily during refactor sequencing or become strongly typed in the same scope.
- Whether any external or downstream server consumers rely implicitly on the current `MemoryConversationEntry` shape outside the identified run-history path.
- Whether exact live-parity right-side activity replay should become a later product requirement, which would likely require persisted lifecycle-event history instead of only raw traces.
- Whether Codex `thread/read` exposes separate reasoning items reliably enough across models, settings, and thread states to support a product promise stronger than “preserve them when present.”
