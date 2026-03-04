# Future-State Runtime Call Stack

## Version

`v1`

## UC-002 Codex Continue With Fallback Thread

1. `sendMessageToTeam` (continue path) enters `TeamRunContinuationService.continueTeamRun`.
2. Codex branch calls `TeamMemberRuntimeOrchestrator.restoreCodexTeamRunSessions(manifest)`.
3. Restore returns `memberBindings[]` with current `runtimeReference.threadId` per member.
4. Continuation persists updated manifest via team-history service before dispatching user turn.
5. Member routing sends turn to target member.
6. Team history activity update runs with manifest already aligned to refreshed thread IDs.

## UC-003 Projection After Continue

1. Frontend requests `getTeamMemberRunProjection(teamRunId, memberRouteKey)`.
2. Projection service reads team manifest binding for member.
3. Codex fallback projection reads with persisted `runtimeReference.threadId`.
4. Projection succeeds for both professor and student when their updated thread IDs are persisted.
