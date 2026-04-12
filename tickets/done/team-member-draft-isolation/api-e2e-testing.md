Status: Pass

# Executable Validation

Passed:

- `pnpm --dir autobyteus-web test:nuxt --run stores/__tests__/voiceInputStore.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/runHistoryStore.spec.ts`
  - `54 passed`
- `pnpm --dir autobyteus-web test:nuxt --run stores/__tests__/voiceInputStore.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/runHistoryStore.spec.ts`
  - `53 passed`
- `pnpm --dir autobyteus-web test:nuxt --run stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/runHistoryStore.spec.ts`
  - `36 passed`

Validated behaviors:

1. Switching focused team members no longer transfers unsent requirement/context-file draft state.
2. Reopening an inactive existing team context preserves the original member draft while refreshing hydrated projection state and moving focus to the requested member.
3. Switching members before the textarea debounce flushes keeps the typed draft with the originating member and clears the newly focused member composer unless that member already has its own draft.
4. Switching members before an async context-file upload completes keeps the uploaded file on the originating member and prevents it from appearing on the newly focused member.
5. Switching members after composer voice recording starts but before transcription completes keeps the transcript text on the originating member and prevents it from being appended to the newly focused member.
6. Switching members after typing in one member and then immediately resuming typing in the newly focused member preserves both drafts instead of allowing the newer debounce call to overwrite the older member's pending unsent draft.

Additional validation note:

- `pnpm --dir autobyteus-web exec tsc --noEmit` still fails with broad pre-existing repository type errors outside this ticket's touched scope, so it was not used as the acceptance gate for this localized regression fix.
