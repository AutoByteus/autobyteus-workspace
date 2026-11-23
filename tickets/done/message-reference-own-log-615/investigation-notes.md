# Investigation Notes

## Investigation Meta

- Package identifier: `message-reference-own-log-615` (autobyteus-615)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/message-reference-own-log-615`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/message-reference-own-log-615`
- Base: `origin/personal` @ `1956c232c8` (fetched 2026-11-23)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` passed (`/tmp/615-install.log`)
- Current solution revision ID: `SR-001`
- Authorities read: requirements and design gates (read in this conversation), `DESIGN.md`, `autobyteus-server-ts/docs/design/node_access_model.md` (NA-7)
- Investigation status: complete

## Evidence

The first evidence is the root-cause report, `root-cause-report.md` (a copy of `task-results/autobyteus-615-investigation/root-cause-report.md`). It establishes the founder's server log (90 requests, all 404), where the clicked messages are stored, the web code path, and that no workspace boundary is involved.

## Additional Findings (architecture)

| Source | Finding | Implication |
| --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/participant-messages-reader.ts:42-93` | The message page reads the view of `(rootKind, rootRunId)`. `rootRecords` reads the run's own records and every open run below it through `RunRecordsSource` and `DelegatedRunAgentsReader.openRunsBelow`, then composes them with `composeRunViewMessages` | This is the one correct "messages of a view" |
| `autobyteus-server-ts/src/run-history/services/run-view-messages.ts:42-62` | `composeRunViewMessages`: the base rule `isMessageOfView`; one message is kept once; an unreadable run is left out with a warning | Reused as is |
| `autobyteus-server-ts/src/run-history/services/run-records-source.ts:25` | Reads a run's records by kind (Team: `getTeamCommunicationProjectionService().getCollaborationRecordsSnapshot`) | Used by both readers |
| `autobyteus-server-ts/src/api/rest/agent-collaboration-references.ts:20-45` | Standalone root: `AgentOrgReferenceContentService.resolveCommunication` over `getStandaloneAgentRunRootManager().getCollaborationRecordsSnapshot(runId)`, which is the root's own records only | Misses the subtree |
| `autobyteus-server-ts/src/api/rest/team-communication.ts:9-50` and `services/team-communication/team-communication-content-service.ts` (136 lines) | Team root: `TeamCommunicationProjectionService.resolveReference`, the team's own snapshot only | Misses the subtree |
| `autobyteus-server-ts/src/api/rest/agent-org-references.ts:36` and `agent-org-execution/services/agent-org-reference-content-service.ts` (99 lines) | Org root: its own snapshot | Misses the subtree |
| `agent-org-reference-content-service.ts:32-33` and `agent-team-execution/services/team-reference-file-projection.ts:30` | The reference ID rule `sha256(ownerId \0 path)` is written twice in the server. The web mirrors it lazily (`autobyteus-web/services/agentOrgExecution/agentOrgReferenceProjection.ts:15-30`) | One server copy; the web copy is the client side of the contract and is kept |
| The two content services | Each has its own readable-file check and mime lookup (`team-communication-content-service.ts:43-60, 117-125`) | One implementation |
| `autobyteus-web/services/collaborationMessages/participantMessageRows.ts:67-90` | `participantMessagesView({ key, … })` already owns listing and loading by `key` | The web owner of the reference link |
| `autobyteus-web/test-support/teamWorkspaceContextView.ts:70` | A fourth hand-written link, in test support | Removed with the others |
| `autobyteus-server-ts/docs/design/node_access_model.md` NA-7 | Owner and phone reach every endpoint except owner actions | The new route needs no rule change |
| `app-data-migrations/migrations/delegated-run-own-attachment-links/attachment-link-conversion.ts:20` | Message reference URLs are not stored ("not an attachment link") | No data transition |
| `grep` of `autobyteus-web` and `autobyteus-server-ts/src` for the three route strings | Callers: the three web builders and `test-support`; the server registers them in `api/rest/index.ts` | Clean-cut removal is safe |

## Persisted Data And State Facts

- Not affected.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| RSK-001 | Risk | Reading the view per reference costs a subtree read | The same cost as one list page (QR-002); it happens on a click only |
| UNK-001 | Unknown | Whether `isMessageOfView` keeps a message that the participant filter would hide | REQ-002 needs the message to be in the view (`composeRunViewMessages`), not in the participant's filtered page: a reference of a listed message is always in the view. Confirmed by reading `participant-messages-reader.ts:46-60` (the page is filtered from `records.messages`). |
