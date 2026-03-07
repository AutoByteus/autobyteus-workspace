# Future-State Runtime Call Stack

- Ticket: `team-grid-view-modes`
- Last Updated: `2026-03-07`
- Design Basis: `proposed-design.md v5`

## Scope

This document models the future runtime behavior for the frontend-only team center-pane layout expansion:

- `Focus` mode
- `Grid` mode
- `Spotlight` mode
- focused-member preservation
- focused-member input routing while multi-member layouts are visible
- shared read-only conversation-feed reuse for multi-member layouts
- smaller tile viewport rendering without custom message summarization
- per-tile viewport ownership and internal scroll containment

## Mode State Contract

- `selected team run` remains owned by `agentSelectionStore`.
- `focused member` remains owned by `AgentTeamContext.focusedMemberName`.
- `team center-pane mode` is owned by `teamWorkspaceViewStore`.
- `member-scoped right-side tabs` continue to resolve through `activeContextStore.activeAgentContext`.
- `task plan` remains team-scoped through `TeamOverviewPanel`.

## UC-001: Open Selected Team Run In Focus Mode

### Primary Path

1. `[ENTRY] components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:handleTeamMemberSelect(...)`
- User selects a team member or team row from the left tree.

2. `stores/runHistorySelectionActions.ts:selectTreeRunFromHistory(...)`
- Resolves the local or persisted team context.
- If a member row is selected, calls `agentTeamContextsStore.setFocusedMember(memberRouteKey)`.
- Persists selection through `agentSelectionStore.selectRun(teamRunId, 'team')`.

3. `stores/agentSelectionStore.ts:selectRun(...)`
- Mutates selected run state.
- Ensures `workspaceCenterViewStore.showChat()` remains active.

4. `components/layout/WorkspaceDesktopLayout.vue:render()`
- Branches to `TeamWorkspaceView` because `selectedType === 'team'`.

5. `components/workspace/team/TeamWorkspaceView.vue:setup()`
- Reads:
  - `agentTeamContextsStore.activeTeamContext`
  - `teamWorkspaceViewStore.getMode(teamRunId)`
  - presentation helpers from `useTeamMemberPresentation(...)`
- Fallback branch:
  - if no stored mode exists, `teamWorkspaceViewStore.getMode(teamRunId)` returns `focus`.

6. `components/workspace/team/TeamWorkspaceView.vue:template`
- Renders header for the focused member.
- Renders `TeamWorkspaceModeSwitch` with `mode='focus'`.
- Renders `AgentTeamEventMonitor`.

7. `components/workspace/team/AgentTeamEventMonitor.vue:setup()`
- Resolves `focusedMemberContext` from `agentTeamContextsStore.focusedMemberContext`.
- Builds sender-name map from all team members.

8. `components/workspace/team/AgentTeamEventMonitor.vue:template`
- Passes focused conversation into `components/workspace/agent/AgentEventMonitor.vue`.

### Fallback / Error Branches

- If `focusedMemberName` is missing or stale:
  - `agentTeamContextsStore.focusedMemberContext()` returns `null`.
  - `TeamWorkspaceView` falls back to the team name in the header.
  - `AgentTeamEventMonitor` shows the existing focused-member empty state until a valid member is selected.
- If the selected team has zero members:
  - `TeamWorkspaceView` renders the team empty state instead of mode content.

## UC-002: Switch From Focus To Grid Without Losing Draft Or Focus

### Primary Path

1. `[ENTRY] components/workspace/team/TeamWorkspaceModeSwitch.vue:handleSelect('grid')`
- User clicks `Grid`.

2. `stores/teamWorkspaceViewStore.ts:setMode(teamRunId, 'grid')`
- Mutates UI-only mode state for the active team run.
- Persistence point: in-memory Pinia UI state only.

3. `components/workspace/team/TeamWorkspaceView.vue:currentMode(computed)`
- Re-evaluates to `grid`.
- Does not mutate `AgentTeamContext.focusedMemberName`.
- Does not mutate `activeContextStore.currentRequirement`.

4. `components/workspace/team/TeamWorkspaceView.vue:template`
- Replaces `AgentTeamEventMonitor` with `TeamGridView`.
- Renders bottom target banner plus shared `AgentUserInputForm`.

5. `components/workspace/agent/AgentConversationFeed.vue`
- Renders the canonical read-only conversation feed for each visible member tile.
- Uses the full conversation message list and auto-scroll pinning logic without the composer.
 - Runs inside a bounded tile body rather than expanding the outer grid row.

6. `components/agentInput/AgentUserInputTextArea.vue:watch(storeCurrentRequirement)`
- Rehydrates the input text from `activeContextStore.currentRequirement`.
- Draft text survives because it is stored on the active focused member context, not only in the unmounted textarea.

### Fallback / Error Branches

- If the mode store has no entry for the team:
  - `setMode(...)` creates one lazily and the view continues.
- If the focused member context is temporarily unavailable during the render swap:
  - `AgentUserInputForm` remains disabled until `activeContextStore.activeAgentContext` resolves again.

## UC-003: Click A Grid Tile To Change Focus And Update Right-Side Tabs

### Primary Path

1. `[ENTRY] components/workspace/team/TeamMemberMonitorTile.vue:handleClick()`
- User clicks the `student` tile in `Grid` mode.

2. `components/workspace/team/TeamGridView.vue:emit('select-member', memberRouteKey)`
- Stateless grid view forwards the event to the shell.

3. `components/workspace/team/TeamWorkspaceView.vue:handleMemberSelect(memberRouteKey)`
- Delegates to `agentTeamContextsStore.setFocusedMember(memberRouteKey)`.

4. `stores/agentTeamContextsStore.ts:setFocusedMember(memberName)`
- Mutates `activeTeamContext.focusedMemberName`.
- Persistence point: in-memory active team runtime state.

5. `components/workspace/team/TeamWorkspaceView.vue:computed`
- Header avatar, title, and status recompute for `student`.
- Grid highlight recomputes so only `student` is focus-styled.
- Bottom target label recomputes to `Replying to: student`.

6. `components/workspace/agent/AgentConversationFeed.vue:template`
- Renders:
  - `UserMessage`
  - `AIMessage`
- Preserves the same alignment and segment rendering path as focus mode inside the tile viewport.

7. `stores/activeContextStore.ts:activeAgentContext(computed)`
- Because a team is selected, resolves to `agentTeamContextsStore.focusedMemberContext`.
- The active context becomes the `student` member context.

8. `components/layout/RightSideTabs.vue:currentAgentRunId(computed)`
- Recomputes from `activeContextStore.activeAgentContext.state.runId`.
- Existing `Activity`, `Artifacts`, and member-scoped tab content now point at `student`.

### Fallback / Error Branches

- If the clicked tile references a member that is no longer present:
  - `agentTeamContextsStore.setFocusedMember(...)` ignores the request because the active team no longer has that key.
  - Existing focused member remains unchanged.

## UC-004: Spotlight Mode Swaps Primary Member

### Primary Path

1. `[ENTRY] components/workspace/team/TeamWorkspaceModeSwitch.vue:handleSelect('spotlight')`
- User switches from `Grid` to `Spotlight`.

2. `stores/teamWorkspaceViewStore.ts:setMode(teamRunId, 'spotlight')`
- Stores the UI-only mode.

3. `components/workspace/team/TeamWorkspaceView.vue:template`
- Renders `TeamSpotlightView` with:
  - active team context,
  - focused member route key,
  - `handleMemberSelect` callback.

4. `components/workspace/team/TeamSpotlightView.vue:computed`
- Splits members into:
  - `primaryMember` = focused member
  - `secondaryMembers` = all other members

5. `components/workspace/team/TeamSpotlightView.vue:template`
- Renders large primary panel for focused member.
- Renders smaller tiles for secondary members.
- Both primary and secondary tiles use the shared read-only conversation feed path.
 - Secondary tiles remain bounded and scroll internally.

6. `[ENTRY] components/workspace/team/TeamMemberMonitorTile.vue:handleClick()`
- User clicks a secondary tile, e.g. `planner`.

7. `TeamSpotlightView -> TeamWorkspaceView -> agentTeamContextsStore.setFocusedMember('planner')`
- Repeats the same focus mutation path as `UC-003`.

8. `TeamSpotlightView.vue:computed`
- Re-evaluates and swaps the primary panel to `planner`.

### Fallback / Error Branches

- If the focused member disappears while in spotlight:
  - `TeamSpotlightView` falls back to the first available member as primary for render purposes, but no send action is enabled until a valid focused context exists.

## UC-005: Send A Message While In Grid Mode

### Primary Path

1. `[ENTRY] components/agentInput/AgentUserInputTextArea.vue:handlePrimaryAction()`
- User presses Enter or clicks Send while `Grid` mode is visible.

2. `stores/activeContextStore.ts:send()`
- Resolves `activeAgentContext` to the focused team member because `selectedType === 'team'`.
- Verifies `context.requirement.trim()` is not empty.

3. `stores/agentTeamRunStore.ts:sendMessageToFocusedMember(text, contextPaths)`
- Reads:
  - `activeTeamContext`
  - `focusedMemberContext`
  - `activeTeam.focusedMemberName`
- Pushes optimistic user message into the focused member conversation.
- Sets `focusedMember.isSending = true`.

4. `stores/agentTeamRunStore.ts:client.mutate(SendMessageToTeam, variables)`
- Sends `targetMemberName: activeTeam.focusedMemberName`.
- Decision gate:
  - temporary team run -> launch + promote flow
  - existing team run -> direct send flow

5. `services/agentStreaming/TeamStreamingService.ts:dispatchMessage(...)`
- Streaming updates continue to mutate per-member contexts as they arrive.

6. `components/workspace/agent/AgentConversationFeed.vue`
- Recomputes when the focused member receives new conversation messages or streaming segment updates.
- Preserves the same message order, avatars, tool-call rows, and segment rendering as focus mode.
- Keeps the feed auto-pinned to the bottom unless the user scrolls upward inside the tile.

7. `components/workspace/team/TeamGridView.vue:template`
- All member tiles continue streaming.
- The focused member tile reflects optimistic send state immediately.
- Right-side member-scoped tabs remain pinned to the same focused member.
 - Long transcript growth stays inside each tile viewport instead of expanding the outer center pane.

## UC-008: Reuse The Canonical Conversation Feed In Multi-Member Tiles

### Primary Path

1. `[ENTRY] components/workspace/team/TeamMemberMonitorTile.vue:template`
- Tile body mounts `components/workspace/agent/AgentConversationFeed.vue` for the member conversation.

2. `components/workspace/agent/AgentConversationFeed.vue:setup()`
- Receives:
  - `conversation`
  - `agentName`
  - `agentAvatarUrl`
  - `interAgentSenderNameById`
  - display flags such as `showTokenCosts=false`, `showTotalUsage=false`
- Reuses the same scroll-stickiness logic currently owned by `AgentEventMonitor`.

3. `components/workspace/agent/AgentConversationFeed.vue:template`
- Iterates `conversation.messages` in full order.
- Renders `UserMessage` and `AIMessage` directly.
- Applies the same message/segment alignment as focus mode inside a smaller scroll viewport.

4. `components/workspace/agent/AgentEventMonitor.vue`
- Reuses `AgentConversationFeed` for focus mode, then composes the bottom `AgentUserInputForm` below it.
- Focus mode remains the full shell, but the conversation rendering source of truth is now shared.

5. `components/workspace/team/TeamMemberMonitorTile.vue`
- Hosts the shared feed inside the tile shell with unchanged focus-selection behavior.

### Fallback / Error Branches

- If the member has no messages yet:
  - the tile shows the existing empty-state placeholder.
- If the user scrolls upward inside a tile:
  - the feed temporarily stops auto-pinning to the bottom, matching focus-mode behavior.
- If a message contains any segment type supported by focus mode:
  - the same shared `AIMessage` / segment path renders it in the tile, so there is no tile-specific content fallback path to drift out of sync.

## UC-009: Keep Tile Conversations Internally Scrollable Instead Of Stretching The Outer Pane

### Primary Path

1. `[ENTRY] components/workspace/team/TeamMemberMonitorTile.vue:template`
- Tile shell renders with a bounded compact height (or primary-panel height in spotlight).
- The tile's flex chain propagates `min-h-0` so child overflow can be contained.

2. `components/workspace/agent/AgentConversationFeed.vue:root container`
- Receives `class="h-full"` from the tile body.
- Owns `overflow-y-auto` and remains the sole conversation scroll container inside the tile.

3. `services/agentStreaming/* -> memberContext.state.conversation`
- New messages/segments append to the conversation as before.

4. `AgentConversationFeed.vue:onUpdated()`
- If the feed is pinned near the bottom, it scrolls the tile viewport to the bottom.
- The visible effect is that new information flows upward inside the tile while the tile height stays stable.

5. `components/workspace/team/TeamGridView.vue`
- Outer center-pane scrolling remains available only for navigating among multiple tiles when the grid itself exceeds the viewport.

### Fallback / Error Branches

- If a tile has no messages:
  - the tile shows the existing empty-state body and remains bounded.
- If there are many team members:
  - the outer grid can still scroll to reveal more tiles, but individual transcript growth remains inside each tile.

### Fallback / Error Branches

- If the send mutation fails:
  - `agentTeamRunStore` clears `focusedMember.isSending`.
  - The input draft remains in active context state until the user edits or retries.
- If the user changes focus before sending:
  - The same draft text is now associated with the newly focused member because `activeContextStore.updateRequirement(...)` targets the current active member context.
  - The target banner makes that retargeting explicit before send.

## UC-006: Large Team Grid Remains Navigable

### Primary Path

1. `[ENTRY] components/workspace/team/TeamGridView.vue:template`
- Receives many members from `activeTeamContext.members`.

2. `TeamGridView.vue:computed`
- Produces a stable array of member entries.

3. `TeamGridView.vue:template`
- Renders the tile list in a scrollable grid container with responsive columns.
- The outer `TeamWorkspaceView` shell preserves:
  - header
  - grid viewport
  - bottom composer row

4. `components/layout/WorkspaceDesktopLayout.vue:render()`
- Right panel width remains independent from the center scroll region.

### Fallback / Error Branches

- If member count exceeds the available viewport:
  - only the center grid viewport scrolls,
  - the header, mode switcher, and composer remain accessible.

## Structural Cleanliness Review Notes

- Focus state remains singular and continues to power all existing behavioral routes.
- Team mode state is separated from runtime team data, which avoids mixing UI-only concerns into `AgentTeamContext`.
- `Grid` and `Spotlight` require a compact tile component rather than repeated full monitors, which keeps responsibility boundaries cleaner than reusing `AgentEventMonitor` unchanged in multiple places.
