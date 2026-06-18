# Requirements: Codex Provider Compaction Boundary Capture

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready.

## Goal / Problem Statement

Codex-based agent runs should rotate raw trace files when Codex reports provider-owned context compaction. The finalized raw trace rotation layout already supports direct rotation files such as `raw_traces_000001.jsonl`, and the memory recorder already knows how to persist `provider_compaction_boundary` markers. However, local Software Engineering Team Codex runtime data shows large active `raw_traces.jsonl` files with no `provider_compaction_boundary` traces and no rotated segments, indicating the current Codex event conversion path is not catching the live Codex compaction event surface reliably.

The goal is to capture the current Codex app-server compaction completion event shapes, persist exactly one provider compaction boundary marker per provider boundary, rotate pre-boundary raw traces into the next direct rotation segment, and ensure provider compaction status events from Codex and Claude Agent SDK runtimes reach the same frontend-visible compaction activity path used by raw AutoByteus compaction status events.

## Investigation Findings

- Runtime data under `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e7b2bea880d14b83904d03906fde574f` contains one active `raw_traces.jsonl` per Software Engineering Team member and no rotated `raw_traces_000001.jsonl` files.
- A structured scan of that team data found zero `provider_compaction_boundary` raw traces.
- The only Software Engineering Team directory with multiple raw trace files was `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_edbbe55c/solution_designer_20f3afe41163964e`, but its manifest segments are `native_compaction` / `AUTOBYTEUS`, not Codex.
- Current source already handles deprecated/older Codex compaction surfaces:
  - `thread/compacted`
  - `rawResponseItem/completed` where `item.type === "compaction"`
- Official Codex app-server docs state that `thread/compact/start` returns immediately while progress streams through `turn/*` and `item/*` notifications, including a `contextCompaction` item lifecycle (`item/started` then `item/completed`).
- Current Codex app-server TypeScript bindings generated from local `codex-cli 0.140.0` show newer compaction surfaces:
  - `thread/compacted` still exists but is documented as deprecated.
  - `ThreadItem` includes `{ type: "contextCompaction", id: string }`.
  - `ResponseItem` includes `{ type: "context_compaction", encrypted_content?: string }`.
  - `ResponseItem` also includes `{ type: "compaction_trigger" }`.
- The current `CodexItemEventConverter` routes `item/completed` through normal item completion handling and does not special-case `contextCompaction`, so that live event shape would become a normal segment end instead of a provider compaction boundary.
- The current raw response converter catches `compaction` but not `context_compaction`.
- Frontend visibility analysis found an existing generic live path for compaction status events:
  - raw AutoByteus `StreamEventType.COMPACTION_STATUS` is converted to `AgentRunEventType.COMPACTION_STATUS`;
  - Codex and Claude provider boundary events also become `AgentRunEventType.COMPACTION_STATUS` when their runtime converters recognize the provider event;
  - `AgentRunEventMessageMapper` maps every `AgentRunEventType.COMPACTION_STATUS` to websocket `ServerMessageType.COMPACTION_STATUS`;
  - team streams reuse the same mapper and add member identity;
  - frontend `handleCompactionStatus` projects those payloads into `AgentActivityStore` compaction rows and `AgentRunState.compactionStatus`.
- Therefore the expected Codex frontend visibility gap is primarily upstream of the websocket mapper: current Codex `contextCompaction` / `context_compaction` events are not converted into `COMPACTION_STATUS`, so the frontend never receives them.
- Claude Agent SDK runtime already converts `status_compacting` and `compact_boundary` into `COMPACTION_STATUS`; the implementation scope should preserve and prove this frontend-visible path rather than redesigning frontend transport.
- Historical/reopen visibility is also already modeled: durable `provider_compaction_boundary` raw traces project to historical compaction activity rows, and frontend hydration loads those rows without fabricating conversation content.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, but narrow.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small and local.
- Evidence basis: Codex provider compaction detection policy is split across thread-level conversion and raw-response conversion while `item/completed` `contextCompaction` is not routed to the shared compaction boundary creation path.
- Requirement or scope impact: The fix should tighten Codex compaction item classification under the existing Codex event conversion owner and prove the already-existing `COMPACTION_STATUS` streaming/frontend projection path, rather than changing raw trace storage, memory recorder ownership, or adding a parallel frontend transport.

## Recommendations

- Extend the Codex event conversion path to recognize current `contextCompaction` item lifecycle events: emit a non-rotating provider compaction status on `item/started` for frontend progress visibility, and emit a rotating completed provider compaction boundary on `item/completed`. Also recognize raw response `context_compaction` completion as a completed boundary.
- Keep `compaction_trigger` non-rotating unless implementation investigation proves it is a completed boundary; based on the generated protocol name, it should be treated as a trigger/start signal, not a completed compaction boundary.
- Reuse the existing `createCodexCompactionBoundaryEvent` and `ProviderCompactionBoundaryRecorder` path so persistence, dedupe, and rotation remain owned by the existing memory recording subsystem.
- Add focused durable coverage for:
  - `item/completed` with `item.type: "contextCompaction"`.
  - `rawResponseItem/completed` with `item.type: "context_compaction"`.
  - duplicate reporting across deprecated and current surfaces.
  - websocket/frontend projection for provider compaction status payloads from Codex and Claude, using the existing `COMPACTION_STATUS` message and compaction activity projection path.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The expected code change is narrow, but it crosses runtime event conversion, memory recording, raw trace rotation, and integration coverage.

## In-Scope Use Cases

- A Codex app-server run emits `item/started` for a `contextCompaction` thread item when context compaction begins and the user should see a provider compaction activity start.
- A Codex app-server run emits `item/completed` for a `contextCompaction` thread item after context compaction and the backend should record/rotate at the completed boundary.
- A Codex app-server run emits `rawResponseItem/completed` for a `context_compaction` response item after context compaction.
- A Codex run emits duplicate boundary surfaces for the same compaction and should produce one marker and one rotated segment.
- Existing AutoByteus native compaction and Claude provider compaction behavior remain unchanged.
- Codex provider compaction boundaries are visible to frontend users as provider compaction activities when emitted live and after run history hydration.
- Claude Agent SDK `status_compacting` and `compact_boundary` events remain visible to frontend users as provider compaction activities when emitted live and after run history hydration.

## Out of Scope

- Changing raw trace rotation file names or layout.
- Adding an app-data migration.
- Inferring compaction from file size or token count without a provider event.
- Changing Codex runtime compaction settings or forcing Codex to compact.
- Changing semantic memory compaction behavior.
- Building a new websocket message type or parallel frontend transport for provider compaction; the target path is the existing `COMPACTION_STATUS` contract.
- Changing frontend center-feed policy beyond showing provider compaction activity rows through existing compaction activity projection.
- Rotating on Codex `compaction_trigger` unless deeper implementation evidence proves it is the final completed boundary event.

## Functional Requirements

- `R-CODEX-COMPACTION-001`: The Codex event conversion path must recognize provider context compaction start from `item/started` events whose item type normalizes to `contextcompaction`, emitting a frontend-visible `AgentRunEventType.COMPACTION_STATUS` with `status: "compacting"`, `rotation_eligible: false`, stable provider identity, and no raw-trace rotation.
- `R-CODEX-COMPACTION-001B`: The Codex event conversion path must recognize completed provider context compaction from `item/completed` events whose item type normalizes to `contextcompaction`, emitting `status: "compacted"` and `rotation_eligible: true`.
- `R-CODEX-COMPACTION-002`: The Codex raw response conversion path must recognize completed provider context compaction from `rawResponseItem/completed` events whose item type normalizes to `contextcompaction`.
- `R-CODEX-COMPACTION-003`: Every recognized completed Codex provider compaction boundary must emit an `AgentRunEventType.COMPACTION_STATUS` event with `kind: "provider_compaction_boundary"`, `runtime_kind: "CODEX"`, `provider: "codex"`, `status: "compacted"`, `rotation_eligible: true`, and a stable `boundary_key`.
- `R-CODEX-COMPACTION-004`: The memory recorder must append exactly one active `provider_compaction_boundary` raw trace marker and rotate pre-boundary active traces into a complete `provider_compaction_boundary` segment for each unique Codex boundary key.
- `R-CODEX-COMPACTION-005`: Duplicate Codex reports for the same provider boundary must not create duplicate markers or duplicate segments.
- `R-CODEX-COMPACTION-006`: `compaction_trigger` must not create a rotated segment unless separately proven to represent completed compaction.
- `R-CODEX-COMPACTION-007`: Existing AutoByteus native compaction, Claude `compact_boundary` rotation, and Claude `status_compacting` non-rotation behavior must remain unchanged.
- `R-CODEX-COMPACTION-008`: Every live Codex provider boundary event emitted as `AgentRunEventType.COMPACTION_STATUS` must be mapped to websocket `ServerMessageType.COMPACTION_STATUS` and remain consumable by the frontend compaction status handler as a `kind: "compaction"` activity row.
- `R-CODEX-COMPACTION-009`: Claude Agent SDK provider compaction lifecycle events (`status_compacting` and `compact_boundary`) must continue to reach the frontend through websocket `COMPACTION_STATUS` and project into stable provider compaction activity rows, including the started-to-completed identity merge when provider operation identity is available.
- `R-CODEX-COMPACTION-010`: Durable run history projection and frontend hydration must surface recorded provider compaction boundaries as compaction activities without converting them into normal assistant/tool conversation content.

## Acceptance Criteria

- `AC-CODEX-COMPACTION-001`: Given a Codex `item/started` event with `item.type: "contextCompaction"`, when it is processed, then the frontend receives a provider compaction `COMPACTION_STATUS` activity in started/compacting phase and no raw trace rotation occurs solely from the start event.
- `AC-CODEX-COMPACTION-001B`: Given active Codex raw traces before an `item/completed` event with `item.type: "contextCompaction"`, when the run memory recorder becomes idle, then active raw traces include exactly one `provider_compaction_boundary` marker and `raw_traces_manifest.json` contains one complete `provider_compaction_boundary` segment.
- `AC-CODEX-COMPACTION-002`: Given active Codex raw traces before a `rawResponseItem/completed` event with `item.type: "context_compaction"`, when the run memory recorder becomes idle, then active raw traces include exactly one `provider_compaction_boundary` marker and `raw_traces_manifest.json` contains one complete `provider_compaction_boundary` segment.
- `AC-CODEX-COMPACTION-003`: Given duplicate Codex reports for the same compaction through `thread/compacted`, `item/completed contextCompaction`, or `rawResponseItem/completed context_compaction`, when all are processed, then the run has one active marker and one complete archive segment for the deduplicated boundary key.
- `AC-CODEX-COMPACTION-004`: Given a Codex `compaction_trigger` item, when processed without a completed boundary item, then no `provider_compaction_boundary` marker or rotated segment is created solely from that trigger.
- `AC-CODEX-COMPACTION-005`: Given Claude `status_compacting`, Claude final `compact_boundary`, and AutoByteus native compaction scenarios, their existing expected rotation or non-rotation behavior remains valid.
- `AC-CODEX-COMPACTION-006`: Given a converted Codex provider boundary `AgentRunEventType.COMPACTION_STATUS`, when mapped for a single-agent websocket stream and for a team member stream, then clients receive `COMPACTION_STATUS` payloads retaining provider identity, source surface, boundary key, runtime kind, turn id, and rotation eligibility.
- `AC-CODEX-COMPACTION-007`: Given Claude `status_compacting` followed by Claude `compact_boundary` for the same provider operation, when the frontend handles the live `COMPACTION_STATUS` messages, then the user-visible compaction activity row progresses from started to completed instead of creating unrelated rows.
- `AC-CODEX-COMPACTION-008`: Given durable run projection entries derived from provider compaction boundary raw traces, when frontend run history hydration loads the run, then provider compaction activities are present in `AgentActivityStore` and are not replayed as center conversation content.

## Constraints / Dependencies

- Base branch is `origin/personal` at `3171a5a4416e718cb4b38464206d9603733bf7a1`.
- Raw trace storage layout is the finalized direct rotation layout:
  - active: `raw_traces.jsonl`
  - segments: `raw_traces_<index>.jsonl`
  - manifest: `raw_traces_manifest.json`
- Use the local generated Codex app-server protocol from `codex-cli 0.140.0` as the current contract evidence.
- Do not bypass `ProviderCompactionBoundaryRecorder`; persistence and rotation should stay centralized there.
- Do not bypass `AgentRunEventMessageMapper` / `COMPACTION_STATUS` frontend protocol; live provider compaction visibility should use the existing streaming boundary.

## Assumptions

- `contextCompaction` / `context_compaction` are completed compaction boundary items, not merely in-progress status.
- `compaction_trigger` represents a trigger/start signal and is not sufficient to rotate.
- Stable boundary keys can be derived from thread id, turn id, item id, response id, or existing compaction id fields without requiring a schema migration.
- The existing frontend `COMPACTION_STATUS` handler is the correct user-visible path once Codex and Claude runtimes emit provider compaction status events.

## Risks / Open Questions

- Live Electron logs available locally did not contain a recent raw Codex compaction payload, so the generated local protocol is the strongest current evidence of the real event shape.
- If Codex emits additional completion shapes beyond `contextCompaction` / `context_compaction`, implementation may need to include a focused diagnostic path or broaden coverage after observing live raw events.
- Boundary-key dedupe must avoid merging separate compactions in the same thread/turn if their item ids differ.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| `item/started contextCompaction` frontend progress | `R-CODEX-COMPACTION-001`, `R-CODEX-COMPACTION-008` |
| `item/completed contextCompaction` capture | `R-CODEX-COMPACTION-001B`, `R-CODEX-COMPACTION-003`, `R-CODEX-COMPACTION-004` |
| `rawResponseItem/completed context_compaction` capture | `R-CODEX-COMPACTION-002`, `R-CODEX-COMPACTION-003`, `R-CODEX-COMPACTION-004` |
| Duplicate Codex boundary reports | `R-CODEX-COMPACTION-005` |
| Trigger-only non-rotation | `R-CODEX-COMPACTION-006` |
| Non-Codex regression prevention | `R-CODEX-COMPACTION-007` |
| Live frontend provider compaction visibility | `R-CODEX-COMPACTION-008`, `R-CODEX-COMPACTION-009` |
| Historical provider compaction visibility | `R-CODEX-COMPACTION-010` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-CODEX-COMPACTION-001` | Proves current thread-item Codex start events are visible to users without rotating raw traces prematurely. |
| `AC-CODEX-COMPACTION-001B` | Proves current thread-item Codex completion events rotate raw traces. |
| `AC-CODEX-COMPACTION-002` | Proves current raw-response Codex completion events rotate raw traces. |
| `AC-CODEX-COMPACTION-003` | Proves idempotent dedupe across old and new Codex surfaces. |
| `AC-CODEX-COMPACTION-004` | Prevents premature rotation on trigger/start-only events. |
| `AC-CODEX-COMPACTION-005` | Protects existing AutoByteus and Claude behavior. |
| `AC-CODEX-COMPACTION-006` | Proves provider boundary events use the existing websocket contract for single-agent and team views. |
| `AC-CODEX-COMPACTION-007` | Proves Claude provider compaction lifecycle remains user-visible and stable in the frontend activity feed. |
| `AC-CODEX-COMPACTION-008` | Proves persisted provider boundaries remain visible after reopening history without polluting conversation content. |

## Approval Status

Approved by user on 2026-06-18 after frontend-visibility and Codex event-surface clarification.
