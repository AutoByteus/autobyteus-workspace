Status: Approved
Scope: Small

# Solution Sketch

1. Update `autobyteus-web/stores/agentTeamContextsStore.ts` so `setFocusedMember(...)` only changes focus and does not copy draft fields across members.
2. Update `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` so reopening an existing inactive team context refreshes member config and projection state in place while preserving each member's local unsent draft fields.
3. Update `autobyteus-web/stores/activeContextStore.ts` with context-bound draft/context-file mutation helpers so delayed UI work can target the originating member directly instead of whichever member is focused later.
4. Update `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` so debounced draft writes stay attached to the member context that originated the draft, including fast focus switches.
5. Update `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` so async upload completion/remove/add operations stay attached to the initiating member context.
6. Update `autobyteus-web/stores/voiceInputStore.ts` so composer voice transcription captures the originating member context at recording start and applies transcript text back to that same member even if focus changes before transcription completes.
7. Update `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` so member switches flush any pending debounced write for the previously focused member before the textarea syncs to the newly focused member.
8. Extend focused frontend tests in:
   - `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
   - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
   - `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`
   - `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts`
   - `autobyteus-web/stores/__tests__/voiceInputStore.spec.ts`

# Changed Files Planned

- `autobyteus-web/stores/agentTeamContextsStore.ts`
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
- `autobyteus-web/stores/activeContextStore.ts`
- `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
- `autobyteus-web/stores/voiceInputStore.ts`
- `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`
- `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts`
- `autobyteus-web/stores/__tests__/voiceInputStore.spec.ts`
