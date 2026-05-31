# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

The compacting UI currently renders as a banner pinned above the event monitor conversation feed. This makes the status feel detached from the agent's event/activity flow and visually competes with the monitor header instead of reading as something the agent/run is doing. The desired UX is to make compacting appear as a distinct in-flow row inside the event monitor content, and also appear in the general Activity area as a non-tool run activity row driven by the same authoritative event/activity projection, not as a separate compaction-only section and not as a fake tool row.

## Investigation Findings

- `AgentEventMonitor.vue` currently renders `<CompactionStatusBanner>` before `<AgentConversationFeed>`, so the user observation is accurate: compaction is pinned at the top of the event monitor area, outside the scrollable conversation content.
- `CompactionStatusBanner.vue` is a banner-only presentation component. It has no timeline position and no relationship to individual event/activity rows.
- Live `COMPACTION_STATUS` messages are handled by `handleCompactionStatus` in `agentStatusHandler.ts`, which normalizes the payload into `context.state.compactionStatus` on `AgentRunState`.
- `AgentWorkspaceView.vue`, `MobileChat.vue`, and `AgentTeamEventMonitor.vue` pass focused run/member `state.compactionStatus` down to `AgentEventMonitor`, so the top banner appears in single-agent, mobile-agent, and focused team-member monitor views.
- The right-side Activity area is currently powered by `AgentActivityStore`, which stores `ToolActivity` rows only (`tool_call`, `write_file`, `terminal_command`, `edit_file`). Tool activity projection is owned by `toolActivityProjection.ts` from segment/lifecycle events, not by the compaction status handler.
- Historical run projection currently builds conversation entries and activity entries from user/assistant/reasoning/tool replay events. Persisted provider compaction boundary traces are recorded, but `raw-trace-to-historical-replay-events.ts` currently ignores `provider_compaction_boundary`, so historical compaction rows are not projected today.
- Existing docs explicitly describe compaction as "one banner-sized run status" stored directly on `AgentRunState`. The new UX request changes that product premise: compaction should be visible as a run/event activity in the monitor flow.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX refinement
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis:
  - `AgentEventMonitor.vue` owns compaction placement as a top-level banner rather than delegating row placement to the feed/timeline owner.
  - `AgentRunState.compactionStatus` is only latest-status state, so it cannot by itself express an in-flow timeline row or right-side activity row without ad hoc rendering.
  - `AgentActivityStore` is currently tool-only; putting compaction into Activity requires either a deliberate activity-model extension or an explicit decision not to show compaction there.
- Requirement or scope impact:
  - The primary behavior should move from banner placement to in-flow event-monitor placement.
  - The Activity side model must be extended cleanly and driven by the same compaction status event handler/projection, not by another component reading `state.compactionStatus` independently.

## Recommendations

1. **Primary recommendation:** replace the top banner with an in-flow `CompactionStatusRow` rendered inside the event monitor content/feed. This row should look like a system/run activity row, not a full-width top alert.
2. **State/projection recommendation:** keep `COMPACTION_STATUS` as the authoritative live event input, but route it through a compaction-status projection that updates both latest run status and row/activity projections. Do not let components independently synthesize compaction rows from unrelated state.
3. **Activity side recommendation:** broaden the Activity model from tool-only `ToolActivity` to a typed union such as `RunActivity = ToolActivity | CompactionActivity`. Render compaction inside the existing Activity feed as a non-tool run activity row. Do not add a separate compaction-only section and do not fake compaction as a tool call.
4. **Historical recommendation:** for persisted/reloaded runs, show compaction rows only when the persisted projection can derive them from durable traces/events. Do not fabricate historical compaction rows from a stale latest status.
5. **Visual recommendation:** the monitor row and Activity row should show phase (`queued`, `compacting`, `compacted`, `failed`), concise message, optional turn id, optional compactor agent/model/run metadata when available, and error detail only on failure.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User watches an active run while compaction is requested/started and sees a compacting row inside the event monitor content instead of a top banner.
- UC-002: User sees compaction completion or failure as a distinct in-flow run event with enough context to understand what happened.
- UC-003: User watches a focused team member and sees that member's compaction row in the same shared event monitor UI used for single-agent runs.
- UC-004: User watches mobile Chat and sees the same in-flow compaction representation without a top banner consuming vertical space.
- UC-005: User can see compaction as a non-tool run activity in the existing Activity area without mistaking it for a tool invocation or needing a separate compaction-only section.
- UC-006: User reopens a persisted run and sees compaction rows only when durable run projection contains sufficient compaction evidence.

## Out of Scope

- Changing when memory compaction is requested, started, completed, or failed.
- Changing the generated compacted memory content, compaction prompt, compactor agent, or compaction thresholds.
- Replacing the entire event monitor/conversation architecture.
- Inventing historical compaction rows where no durable compaction event/trace exists.
- Treating compaction as a synthetic/fake tool call just to fit the current Activity store shape.

## Functional Requirements

- REQ-CUI-001: The event monitor must stop rendering compaction as a primary top-of-monitor banner.
- REQ-CUI-002: Active compaction status must render as a visually distinct in-flow row inside the event monitor content area.
- REQ-CUI-003: The in-flow row must support at least queued/requested, active/started, completed, and failed visual states when those states are available from `COMPACTION_STATUS` payloads.
- REQ-CUI-004: The in-flow row must preserve the focused run/member scope used today by single-agent, team focused-member, and mobile monitor shells.
- REQ-CUI-005: The row must display concise compaction text and may display optional turn id / compactor identity metadata when available; failure must display the failure message.
- REQ-CUI-006: The row projection must be driven by the same authoritative compaction event/state path used by `handleCompactionStatus`; components must not duplicate compaction visibility rules independently.
- REQ-CUI-007: The Activity model must represent compaction as an explicit non-tool run activity type instead of a fake tool call.
- REQ-CUI-008: Desktop Activity feed and mobile Activity surfaces must render compaction rows inside the existing Activity area with labels/icons/statuses appropriate to compaction, while keeping existing tool rows unchanged.
- REQ-CUI-012: The UI must not introduce a separate compaction-only Activity section for this change; compaction should appear as part of the general run activity feed.
- REQ-CUI-009: Historical/reloaded runs must show compaction rows only when durable projection data provides compaction evidence; current non-compaction history hydration must remain unchanged.
- REQ-CUI-010: Existing conversation message rendering, tool call indicators, token cost display, autoscroll behavior, composer placement, and focused-member routing must not regress.
- REQ-CUI-011: Documentation that describes compaction as a top banner must be updated or explicitly recorded as no longer accurate after implementation.

## Acceptance Criteria

- AC-CUI-001: With `compactionStatus`/`COMPACTION_STATUS` present, `AgentEventMonitor` no longer renders `CompactionStatusBanner` above `AgentConversationFeed` as the primary UI.
- AC-CUI-002: In a single-agent run, a `requested`/`started` compaction status appears as a separate row in the monitor content/feed.
- AC-CUI-003: In a focused team-member view, the same shared monitor row appears for the focused member's compaction status and does not leak into other members.
- AC-CUI-004: In mobile Chat, the same shared monitor row appears inside the chat/event monitor content and does not consume a separate top banner slot.
- AC-CUI-005: Failed compaction displays the backend-provided error message in the row.
- AC-CUI-006: Completed compaction displays a completed/compacted state without blocking subsequent messages or composer use.
- AC-CUI-007: Desktop Activity feed count includes compaction rows as run activity events and renders them distinctly from tool rows.
- AC-CUI-008: Mobile Activity count/list includes compaction rows and is labeled to avoid implying the list is tool-only.
- AC-CUI-012: No new separate compaction-only Activity section is rendered; compaction appears in the existing Activity area/feed.
- AC-CUI-009: Existing `ToolActivity` rows still render tool name, context text, status chip, details, result, error, highlighting, and scroll-to-highlight behavior as before.
- AC-CUI-010: Reopened historical runs do not show synthetic compaction rows unless the run projection contains a compaction-derived entry.
- AC-CUI-011: Focused tests cover the streaming handler/projection, monitor row rendering, single-agent/team prop path, and Activity rendering if Activity side visibility is in scope.

## Constraints / Dependencies

- Must preserve the authoritative live stream path: backend/runtime `COMPACTION_STATUS` -> frontend streaming service -> handler/projection -> UI.
- Must preserve single-agent, team focused-member, and mobile reuse of `AgentEventMonitor`.
- Must not overload `ToolActivity` with non-tool rows without a deliberate type/model rename or union; target model is a typed activity union.
- Must preserve activity-row identity stability for existing tool rows.
- Must avoid duplicate compaction state sources across `AgentRunState`, conversation/feed rows, and Activity feed.
- Must treat provider-native compaction boundary payloads and agent-based semantic compaction phase payloads carefully; phase/message normalization must happen before presentation.

## Assumptions

- "Compacting UI" refers to the current `CompactionStatusBanner` rendered by `AgentEventMonitor` from `AgentRunState.compactionStatus`.
- "Middle of the event monitor" means inside the event monitor's content/feed area as a row, not in the shell header or as a toast/banner above the feed.
- Activity side integration is approved, but it must stay inside the existing Activity area as a non-tool run activity row, not as a separate section and not as a fake tool invocation.
- A compact in-flow row is acceptable even when only the latest live compaction status is available; durable chronological history should use projection data when available.

## Risks / Open Questions

- OQ-CUI-001: Should completed compaction rows remain visible indefinitely in live conversation, or should only requested/started/failed stay prominent while completed is compact/minimized?
- OQ-CUI-003: For provider-native compaction payloads that contain `status: compacting/compacted` but no `phase`, should the frontend normalizer map them into the same row model in this change?
- OQ-CUI-004: Should a row link to `compactionRunId` when present, and if so which existing run-history navigation API should own that action?

## Requirement-To-Use-Case Coverage

- REQ-CUI-001: UC-001, UC-003, UC-004
- REQ-CUI-002: UC-001, UC-002, UC-003, UC-004
- REQ-CUI-003: UC-001, UC-002
- REQ-CUI-004: UC-003, UC-004
- REQ-CUI-005: UC-001, UC-002
- REQ-CUI-006: UC-001, UC-002, UC-005
- REQ-CUI-007: UC-005
- REQ-CUI-008: UC-005
- REQ-CUI-009: UC-006
- REQ-CUI-012: UC-005
- REQ-CUI-010: UC-001, UC-003, UC-004, UC-005
- REQ-CUI-011: UC-001 through UC-006

## Acceptance-Criteria-To-Scenario Intent

- AC-CUI-001 through AC-CUI-006: Active/focused monitor-row behavior for single, team, and mobile surfaces.
- AC-CUI-007 through AC-CUI-009, AC-CUI-012: Activity side integration and tool-row regression protection.
- AC-CUI-010: Historical/reload behavior.
- AC-CUI-011: Validation coverage.

## Approval Status

Approved by user on 2026-05-31 in conversation. Approved scope: **include the in-monitor row as mandatory; include Activity side representation inside the existing general Activity area through a typed non-tool activity model; do not add a separate compaction-only section; do not fake compaction as a tool row.**
