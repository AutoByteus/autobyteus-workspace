# autobyteus-615: "Reference file unavailable" for a file that exists — root cause

- Investigated by: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-23
- Base read: `origin/personal` @ `cb5e1c80f3` (the founder's checkout)
- Method: code read, plus the founder's server log and message logs. The logs were read only, and only request lines and message metadata (IDs, senders, reference paths), never message content. Nothing was sent to the founder's running server.

## Answer

**It is a bug, not a workspace restriction, and the file being in a git worktree has nothing to do with it.**

The Messages tab of a **delegated run** lists that run's messages from the delegated run's own log. When you click a reference file, though, the web asks for the file **through the root run's log**, in this case the Project Task Manager's. The server looks for the message there, does not find it, and answers 404. The web shows every 404 as "Reference file unavailable — the file may have been deleted, moved, or become unreadable". So the message is also misleading: here the file was fine and the message lookup failed.

It is a regression from autobyteus-461 (2026-11-12, `d796d508b0` "rule 2 — a delegated row binds to its own run"). That change moved a delegated run's messages to its own run's log, but the reference link kept pointing at the root.

## Evidence

1. **What the click requests**, from the founder's server log (`~/.autobyteus/server-data/logs/server.log`, request lines only):
   - Since 2026-11-22 there are 90 requests for message reference content, all of them `GET /rest/agent-collaborations/project_task_manager_7c8dce0c…/communication/messages/<id>/references/<id>/content`, and every one answered **404**. The latest was 2026-11-23 05:48.
   - There is no request to the team route, `team-runs/<team>/team-communication/…`.
2. **Where those messages actually are**, from the message logs (metadata only):
   - `collabmsg_fw-yzB2…`, the 609 solution designer's message to its implementation engineer with `…/phone-web-followups-609/…/design-spec.md`, is stored in the 609 team's own log, `agent_teams/software_engineering_team_e2b38…/team_communication_messages_active.jsonl`.
   - `collabmsg_obOs…` (delivery's message to me, with `tickets/done/small-follow-ups-579/*.md`) is stored in my team's own log, `agent_teams/software_engineering_team_a7e92…/`.
   - Neither is in the Project Task Manager's log. Both teams are task teams the Project Task Manager delegated.
   - So files inside the main workspace fail the same way (the 579 files are under `autobyteus-workspace-superrepo`). The worktree location is not the cause.
3. **The code path:**
   - Click → `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue:153` passes `messages.referenceContentPath(messageId, referenceId)` to `CollaborationMessageReferenceViewer.vue`.
   - The viewer fetches it (`CollaborationMessageReferenceViewer.vue:172-200`). On `response.status === 404` it sets `isDeleted`, which shows "Reference file unavailable" (`:53-56`; the text is in `localization/messages/en/workspace.ts:236-237`). Every 404 looks the same, whatever its server code.
   - The path is built in three places. Each chooses the **delegated** run's log for the message list, but the **root** run for the reference:

     | Context | Message list | Reference path |
     | --- | --- | --- |
     | Standalone host run (the Project Task Manager), `services/agentCollaboration/agentRunCollaborationContext.ts:96-110` | `key = subject ? delegatedRunMessagesKey(subject) : …` (`:101-102`) | `agent-collaborations/${this.runId}/…` (`:109-110`), always the host |
     | Team root, `services/teamExecution/teamCollaborationMessagesView.ts:35-42` | `delegated ? delegatedRunMessagesKey(...) : …` (`:37`) | `team-runs/${rootRunId}/…` (`:41-42`), always the root |
     | Org root, `services/agentOrgExecution/agentOrgExecutionContext.ts:304-325` | `delegatedRunMessagesView` passes `delegatedRunMessagesKey(subject)` (`:305-307`) | `agent-org-runs/${this.orgRunId}/…` (`:323-324`), always the Org |

   - Server side, `autobyteus-server-ts/src/api/rest/agent-collaboration-references.ts:20-45`: the run ID in the URL picks the collaboration records that are searched. A message not in them gives `REFERENCE_NOT_FOUND`, which becomes 404. The team route behaves the same (`api/rest/team-communication.ts:9-21`).
4. **No workspace boundary on this path:** `team-communication-content-service.ts:90-125` requires only an absolute path that is a readable file. The collaboration reference service reads the stored absolute path the same way. A readable file outside the agent's workspace would open if the message were found.
5. **Phone:** the phone shows the same web page (the iOS `DemoWeb` bundle is this web build), so a delegated run's Messages tab on the phone fails the same way.
6. **Which messages work today:** messages of a run that is not delegated, such as a standalone run's own messages or a team that is its own root, request the right log and open. Only delegated runs (task agents, task teams, delegated copies under a host, Team or Org) are affected. Since every SE team ticket runs as a task team of the Project Task Manager, almost every reference the founder clicks fails.

## Recommended fix (for the founder to decide)

**Option A (recommended):** build the reference path from the same key that chose the message log, in one place.
- A delegated task team's reference goes to `team-runs/<its team run>/team-communication/…`, and a delegated single agent's to `agent-collaborations/<its own run>/…`.
- One shared function, keyed by `ParticipantMessagesKey` (`rootKind`, `rootRunId`), replaces the three hand-written paths, so they cannot drift again.
- Plus a test per context that opens a delegated run's reference.
- It also needs a check that a delegated single agent's own collaboration records serve its messages. Implementation confirms this.
- Size: small, in the web only. No server change is expected.

**Option B, together with A (recommended):** make the message honest. The viewer tells the server's codes apart (`REFERENCE_NOT_FOUND`: "This message's file could not be found in its conversation"; `REFERENCE_CONTENT_UNAVAILABLE`: today's "deleted, moved, or unreadable"). The same 404 then no longer blames the file when the lookup failed. Small, web only, with localization strings.

**Option C, not recommended:** have the server search every run in the tree for the message. That hides the client's mistake, and it widens what one URL can reach.

## Not decided here

- Whether to add B, or only A: a wording and product choice for the founder.
- Nothing was implemented; the Task asked for the report first.
