Status: Complete
Scope: Small

# Reproduction

1. Open an inactive agent-team run and focus `solution_designer`.
2. Add unsent draft input, including at least one screenshot in `Context Files`.
3. Switch focus to another team member such as `implementation_engineer`.
4. Switch back to `solution_designer`.
5. Observe that the original screenshot and unsent requirement draft are gone.

# Findings

1. `autobyteus-web/stores/agentTeamContextsStore.ts:222-251` explicitly retargets unsent `requirement` and `contextFilePaths` from the currently focused member to the next focused member. This makes the input form behave like a shared buffer instead of member-local state.
2. `autobyteus-web/stores/runHistorySelectionActions.ts:55-77` reopens inactive persisted team members through `openTeamMemberRun(...)` instead of reusing the existing local team context.
3. `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts:63-90` replaces `existingTeamContext.members` with freshly hydrated member contexts when the team is inactive, which discards any unsent draft state already stored on the local `AgentContext` instances.
4. The single-agent reopen path already preserves unsent draft state because `upsertProjectionContext(...)` refreshes config/conversation/status in place without clearing `requirement` or `contextFilePaths`.

# Re-Entry Findings

5. `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` keeps text in component-local `internalRequirement` and only writes it to the active context through a 750ms debounce. If focus changes before the debounce flushes, the delayed write targets the newly focused member.
6. `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` performs async upload completion against `activeContextStore` after the upload resolves. If focus changes mid-upload, the final remove/add mutations can land on the newly focused member instead of the original member that initiated the upload.
7. The prior tests covered store-level member switching and inactive reopen, but they did not cover component-local draft state surviving a live member switch in the shared team composer.

# Root Cause

Two team-only behaviors combine into the regression:

- focus switching actively moves draft state to another member
- inactive history reopen rebuilds member contexts and drops any local member draft state

# Fix Direction

1. Remove draft retargeting from `setFocusedMember(...)`; changing focus should only change `focusedMemberName`.
2. When reopening an existing inactive team context, refresh conversation/config/status from hydration while preserving each member's local unsent draft fields on matching member route keys.
3. Add targeted tests for both focus-switch isolation and inactive reopen preservation.
4. Bind text-area draft flushes and context-file upload completion to the member context captured when the user started the interaction, not whoever is focused when async work completes.
