# Investigation Notes

- Ticket: `team-grid-view-modes`
- Last Updated: `2026-03-07`

## Sources Consulted

- User bug report screenshot in current thread showing blank AI cards in `Spotlight`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/TeamGridView.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/TeamSpotlightView.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/TeamMembersPanel.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/layout/RightSideTabs.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/composables/useRightSideTabs.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/AIMessage.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/UserMessage.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/ToolCallIndicator.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/TextSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/ToolCallSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/WriteFileCommandSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/EditFileCommandSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/TerminalCommandSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/ThinkSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/ErrorSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/conversation/segments/MediaSegment.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/agentTeamRunStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/activeContextStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/workspaceCenterViewStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/types/agent/AgentTeamContext.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/types/conversation.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/types/segments.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/tickets/event-monitor-single-instance-flow-ticket/implementation-plan.md`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/tickets/done/team-run-left-tree-visibility-personal/proposed-design.md`

## Current-State Findings

1. The center team workspace currently renders only one `AgentTeamEventMonitor`, so team center-pane rendering is single-focus by construction.
2. `AgentTeamEventMonitor` itself resolves only `focusedMemberContext`, then passes only that member's conversation into the shared `AgentEventMonitor`.
3. The data model `AgentTeamContext` contains exactly one focus field, `focusedMemberName`, and no existing center-pane layout mode state.
4. The right-side `Team` tab already does not own member navigation in practice; it is a supporting panel with member list plus task plan, while the left tree also exposes team members under the active run.
5. Right-side tabs such as activity and artifacts flow through `activeContextStore.activeAgentContext`, which maps a selected team to the focused team member context.
6. Team message sending and tool-approval routing are both keyed off the focused member via `agentTeamRunStore` and `activeContextStore`, so focused-member state is not just visual state; it is also behavioral routing state.
7. The current full `AgentEventMonitor` includes the shared bottom input/composer area and is therefore too heavy to render unchanged inside a multi-tile grid.
8. Existing recent workspace simplification work intentionally removed duplicate center-pane switching surfaces and standardized instance switching on the left running tree, which supports keeping the left tree as the primary member selector.
9. `TeamGridView` and `TeamSpotlightView` both render `TeamMemberMonitorTile` for compact previews; the spotlight primary panel is also a tile, not the full `AgentTeamEventMonitor`.
10. `TeamMemberMonitorTile` builds its preview from `memberContext.state.conversation.messages.slice(...)` and renders `message.text` directly for both user and AI rows.
11. Streaming AI message construction does not primarily update `message.text`; `segmentHandler.findOrCreateAIMessage(...)` initializes `text: ''`, then appends live content into `message.segments`.
12. The detailed conversation path (`AgentEventMonitor -> AIMessage`) renders `message.segments` by segment type, which is why focus mode remains correct while grid/spotlight compact cards can show blank AI entries.
13. The current grid/spotlight tests stub out the tile component entirely and therefore do not exercise real preview rendering or streaming-segment data.
14. Tool-bearing segments (`tool_call`, `write_file`, `edit_file`, `terminal_command`) already converge on the shared one-row `ToolCallIndicator` component, so they are not the primary density problem in compact tiles.
15. The largest density cost comes from text-bearing segments:
  - `UserMessage` renders full body text plus optional context-file chips,
  - `TextSegment` renders full markdown,
  - `InterAgentMessageSegment` renders a titled markdown block with toggleable metadata.
16. `ThinkSegment` is already collapsible in the full monitor and can be omitted in compact tiles without losing execution-state visibility because tool/status segments remain present.
17. `SystemTaskNotificationSegment`, `ErrorSegment`, and `MediaSegment` are visually heavier than tool-call rows and may need compact variants or summaries in tile mode even if they remain visible in focus mode.
18. The current custom compact tile renderer prevents blank-stream regressions, but it still wraps each message in custom card chrome and changes message alignment enough that the user perceives it as a different, worse conversation UI.
19. The user specifically prefers a smaller version of the real event monitor where messages continue to flow naturally upward in the same visual structure, even if the visible viewport is smaller.
20. The best architectural fit for that feedback is to extract the read-only conversation-feed portion of `AgentEventMonitor` into a shared component that both `Focus` mode and smaller team tiles can reuse, while keeping the composer outside that shared feed.
21. Live validation after the shared-feed extraction showed the next defect clearly: the content renderer is now correct, but the tile containment is not. One tile can still grow tall enough that the outer center pane becomes the effective conversation scrollbar.
22. The missing behavior is bounded tile height plus tile-local scroll ownership:
  - each tile should keep a stable height,
  - the shared conversation feed inside the tile should own `overflow-y-auto`,
  - new messages should continue to auto-stick within the tile viewport,
  - outer center scrolling should remain for navigating across tiles, not for one conversation transcript growing unbounded.

## Constraints

- A valid design should preserve one focused member per active team run; removing focus semantics would ripple through right-side tabs, send routing, stop/approval flows, and test assumptions.
- The new multi-member center view should be treated as a presentation/layout layer on top of the existing focus model.
- The left workspace tree should remain the canonical team/member navigation surface; the center grid can add secondary focus changes by clicking a tile, but it should not replace left-tree navigation.
- The right panel should remain stable:
  - member-scoped tabs continue to show focused-member data,
  - task plan remains team-scoped.
- A reusable compact member monitor component is needed so `Grid` and `Spotlight` do not duplicate the full `AgentEventMonitor` composer and large-thread layout per tile.

## Unknowns / Risks

- Whether the default team mode on open should remain `Focus` for compatibility or move to `Spotlight` for better overview.
- Whether `Grid` tiles should be fixed-height previews or support internal scrolling.
- Whether maximize behavior from `Grid` should route to `Focus` or `Spotlight`.
- Whether the right-side `Files` tab needs explicit copy indicating workspace/team scope when the center is in `Grid`.
- Whether `SystemTaskNotificationSegment`, `ErrorSegment`, and `MediaSegment` should keep full visuals in compact mode or collapse to lighter summaries.

## Impacted Modules / Responsibilities

| Area | Current Responsibility | Expected Change Pressure |
| --- | --- | --- |
| `TeamWorkspaceView.vue` | Team header + single monitor container | Add team layout mode state consumption and render mode-specific center content |
| `TeamMemberMonitorTile.vue` | Compact read-only member preview tile | Should switch from custom preview rendering to a smaller reused conversation feed |
| `components/workspace/agent/AgentEventMonitor.vue` | Full monitor shell with feed + composer | Good extraction point for a shared read-only conversation feed component |
| `components/workspace/team/TeamGridView.vue` / `TeamSpotlightView.vue` | Layout containers for multi-member tiles | Need explicit height containment so the shared feed scrolls inside each tile instead of expanding the grid row |
| `components/conversation/*` | Canonical message/segment rendering | Should remain the visual source of truth for both focus mode and smaller tiles |
| `AgentTeamEventMonitor.vue` | Focused-member adapter into `AgentEventMonitor` | Stay as focus-mode adapter or become one branch in a larger team-content renderer |
| `agentTeamContextsStore.ts` | Active team + focused member getters/actions | Likely extend with stable member iteration helpers and possibly persisted default view mode hookup |
| `activeContextStore.ts` | Maps selected team to focused member active context | Must remain stable; grid cannot break this contract |
| `agentTeamRunStore.ts` | Focused-member send/approval/stop routing | Must remain stable; input should still target focused member only |
| Team workspace tests | Validate header/focus monitor behavior | Need expansion for mode switching, grid highlighting, and input target persistence |

## Scope Triage

- Classification: `Medium`
- Reasoning:
  - No backend/schema changes are currently needed.
  - The feature spans multiple UI layers and state contracts: team workspace view, compact per-member rendering, focus semantics, active-context routing assumptions, and workspace tests.
  - The design must be explicit before coding because the center layout, right-panel semantics, and bottom-composer behavior must stay coherent.

## Implications For Requirements / Design

- Requirements should explicitly preserve one focused member in all team modes.
- Design should separate `team view mode` from `focused member` rather than introducing multiple simultaneous active contexts.
- The design should prefer a shared read-only conversation feed extracted from `AgentEventMonitor`, then embed that feed in smaller tiles instead of maintaining a separate compact preview renderer.
- Implementation should keep code-edit work gated behind a design artifact, future-state runtime call stack, and review rounds because the user experience semantics are cross-cutting and easy to make inconsistent.
- The next tile implementation should reuse the real event-monitor rendering model directly:
  - keep existing message alignment and segment rendering,
  - keep tool-call segments unchanged,
  - rely on a smaller viewport and read-only mode rather than summary-card replacement,
  - preserve natural autoscroll behavior so live output continues to flow in-place.
- The next layout adjustment should make per-tile viewport ownership explicit:
  - fixed or strongly bounded tile heights,
  - `min-h-0` through the tile flex chain,
  - the feed viewport fills the remaining tile body and scrolls internally.
