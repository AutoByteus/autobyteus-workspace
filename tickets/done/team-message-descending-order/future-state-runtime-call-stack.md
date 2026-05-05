# Future-State Runtime Call Stack

## Team Message List Rendering

1. `TeamCommunicationPanel.vue` receives `teamRunId` and `focusedMemberRunId`.
2. `teamCommunicationStore.getPerspectiveForMember(teamRunId, focusedMemberRunId)` returns focused-member perspective messages sorted descending by `createdAt`.
3. `displayMessages` exposes that ordered list unchanged.
4. The left list renders one row per message from `displayMessages`.
5. Direction-specific icons and counterpart metadata indicate sent versus received without changing the list order.
6. The selection watcher chooses `displayMessages[0]` when there is no selected message.

## Review Result

Small-scope runtime review: Go Confirmed.

- No new data ownership boundary is introduced.
- The store remains the ordering authority.
- The component no longer creates a conflicting presentation order.
