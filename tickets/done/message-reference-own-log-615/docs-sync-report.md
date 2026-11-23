# Docs Sync Report: autobyteus-615 (a message's reference file opens from the view its list was read from)

## Scope

- Ticket: `message-reference-own-log-615` (Project Task `autobyteus-615`)
- Trigger: the code reviewer's post-API/E2E test-code review `CRR-002` `Pass` (no findings), after API/E2E `API-REV-001` `Pass` (final confidence 95.4%), reviewed route (`task_size` Medium, `architectural_risk` High; architecture review `ARCH-REV-001` `Pass`; source review `CRR-001` `Pass`; test-code review `CRR-002` `Pass`).
- Bootstrap base reference: `origin/personal` @ `1956c232c8`
- Integrated base reference used for docs sync: `origin/personal` @ `a59fbc005b` (47 commits, the phone and web follow-ups of autobyteus-609, merged into the branch as `6472d9199c`; the code reviewer's untracked `CRR-001` and `CRR-002` records were committed first as the checkpoint `3c645b83e8`)
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (both typechecks, the server build, the ticket's six E2E files, the whole server unit, whole web unit and server integration suites, all on `6472d9199c`)

## Why Docs Were Updated

- Summary: a reference file of a message in the Messages tab used to open through one of three routes (`/team-runs/:id/team-communication/…`, `/agent-org-runs/:id/communication/…`, `/agent-collaborations/:id/communication/…`), each reading only one run's log. A message stored in a delegated run's log (the founder's case: a delegated task team member's tab) answered "not found", although the list showed it. The ticket gives "the messages of the view of run X" one server reader (`RunViewMessagesReader`, used by the page and by the references) and one route for every root kind, `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content`, and the web builds the link in one place from the key that loaded the list. The viewer tells "this file's message was not found in this conversation" (`REFERENCE_NOT_FOUND`) apart from "the file is missing or unreadable" (`REFERENCE_CONTENT_UNAVAILABLE`). The three routes, `TeamCommunicationContentService`, `AgentOrgReferenceContentService` and `src/api/rest/team-communication.ts` are removed. The design spec gives the docs that describe these routes to delivery's docs sync; delivery searched every long-lived doc for the removed routes, services and files and read each hit against the final code.
- Why this should live in long-lived project docs: eight docs named a route that no longer exists, and one listed two deleted source files as the owners of reference serving. A maintainer who followed them would look for a route and a service that are gone, or restore a per-log reader and bring the defect back.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md`, `docs/design-cases.md` | Project design rules and cases | No change by delivery | The Solution Designer added Case 28 ("one fact derived in four places, and a refactor updated one"); it matches the final design. The file now holds two cases numbered 26 and two numbered 27 (parallel tickets), recorded as `follow-ups.md` FU-001, not renumbered here |
| `TESTING.md` | Project testing guideline | Updated by API/E2E (its document); checked | The "Choosing the path" row for a change that moves where data lives (AC-008) was written in `725891acc1`: every read path for every owner kind, asserted as a property over everything a view lists, no credit for an old-place copy, "expected to work" is a gap; its example is `message-references-every-view.e2e.test.ts`, which exists and passed on the merged state. The row merged cleanly with the base's own `TESTING.md` change (the contract-dist rule) |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed, and no build input changed in this ticket's diff (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package or generated file: checked with `git diff --name-only origin/personal...HEAD`), so the fresh-start build rule does not apply |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Names the reference route and the owners | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Lists the source files of Team Communication references | Updated | It listed `team-communication-content-service.ts` and `src/api/rest/team-communication.ts`, both deleted; the code reviewer's list of six did not name it |
| `autobyteus-server-ts/docs/modules/agent_orgs.md`, `run_history.md`, `standalone_agent_run_root.md` | Name the three removed routes | Updated | See Docs Updated |
| `autobyteus-web/docs/agent_artifacts.md`, `agent_execution_architecture.md` | Name the removed Team route and describe the viewer | Updated | See Docs Updated |
| `autobyteus-web/docs/remote_access.md` | The troubleshooting entry for a phone reference file that does not open | Updated | It named `/rest/team-runs/.../team-communication/.../references/.../content`; also not in the reviewer's list |
| `autobyteus-web/docs/content_rendering.md`, `autobyteus-server-ts/docs/features/remote_access.md` | Describe the viewer and the user-file routes | No change | They say "the message-owned reference content route" and that message references answer through `sendUserFile`; both stay true (the new route replies through `sendUserFile`, `user-file-reply.ts`) |
| `autobyteus-server-ts/docs/modules/agent_communication.md`, `agent_team_execution.md`, `docs/design/collaboration_model.md`, `GLOSSARY.md` | Mention messages, participants and "reference files" | No change | They describe delivery of messages and the `reference_files` an agent attaches, not how the viewer reads one; `GLOSSARY.md`'s "Reference file" is the file an agent attaches |
| `autobyteus-server-ts/src/**` comments, `migrations/**/org-path-rewrite.ts` | The code states the same rules | No change | The new reader, route and builder carry doc comments that match the final behavior. A comment in a sealed migration still names the removed service file; sealed migrations are not edited (CRR-001 accepted it) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Reference | Item 6 now describes the one route and its reader: the view's messages through `RunViewMessagesReader` (the root's log and the logs of the runs it delegated to), the message, then the reference by `messageReferenceId`, only a file that message names; `REFERENCE_NOT_FOUND` (404), `REFERENCE_CONTENT_UNAVAILABLE` (404), `REFERENCE_CONTENT_FORBIDDEN` (403), each with `{ detail, code }`. The owner table drops "content resolution" from the projection, names the participant-messages GraphQL file that really exists (`collaboration-participant-messages.ts`; the doc named `team-communication.ts`, which does not), and adds a "Message reference route" row | The doc named the removed Team route, the deleted REST file and a resolver the projection no longer has |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Reference | The Team Communication reference source list drops the deleted content service and REST file and adds the participant-messages resolver, `run-view-messages-reader.ts`, `message-reference-content-reader.ts` and `collaboration-message-references.ts` | Two listed files do not exist |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Reference | A message's reference file opens through the one route with root kind `agent_org`, read through the Org root's view like its list; the `/agent-org-runs/:orgRunId/communication/…` and `/task-delegations/…` routes are removed | The doc named the removed Org route |
| `autobyteus-server-ts/docs/modules/run_history.md` | Reference | The Team tab's referenced content opens through the one route (root kind `agent_team`), by the identity the list was read with, from the same view reader | The doc named the removed Team route |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Reference | Message references: the one route with root kind `agent`, reading the run's own log composed with the logs of the runs it delegated to; the former `/rest/agent-collaborations/:runId/communication/…` route is removed | The doc named the removed standalone route |
| `autobyteus-web/docs/agent_artifacts.md` | Reference | Reference content opens through the one route, with the link built by `messageReferenceContentPath` (`participantMessageRows.ts`) from the key the list was loaded with and no context writing its own; the viewer row says a 404 shows "Reference file unavailable" with "This file's message could not be found in this conversation." for `REFERENCE_NOT_FOUND` and "The file may have been deleted, moved, or become unreadable." otherwise | The doc named the removed Team route and the old single 404 text |
| `autobyteus-web/docs/agent_execution_architecture.md` | Reference | The Team tab's reference opening is by the list's `rootKind + rootRunId`, then `messageId + referenceId`, through the one route and its builder | The doc said `teamRunId + messageId + referenceId` through the removed route |
| `autobyteus-web/docs/remote_access.md` | Reference | The phone troubleshooting entry names the one route and says the phone's authorized fetch covers the `/rest/collaboration-messages/` prefix (`authorizedResourceUrl.ts`) | The entry named the removed route |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One fact, one owner: "the messages of the view of run X" | A list and the references it shows must be read from the same view; the server finds a reference only through a message of that view, so it serves only a file a message names (QR-001); whichever run's log holds the message, the view finds it | `design-spec.md` DS-001, `requirements-doc.md` DEC-001, REQ-002 | `docs/design-cases.md` Case 28 (the Solution Designer's), `artifact_file_serving_design.md`, `run_history.md` |
| A change that moves where data lives proves every read path | A property over everything a view lists, for every owner kind, through the real route; an old-place copy does not count | `test-gap-report.md`, REQ-006, AC-007, AC-008 | `TESTING.md` "Choosing the path" (API/E2E's), the permanent test `message-references-every-view.e2e.test.ts` |
| The viewer tells "not found in this view" from "the file is gone" | The route's 404 carries a code; the viewer reads it | `requirements-doc.md` REQ-003, DEC-003 | `autobyteus-web/docs/agent_artifacts.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `/rest/team-runs/:teamRunId/team-communication/messages/…`, `/rest/agent-org-runs/:orgRunId/communication/messages/…`, `/rest/agent-collaborations/:runId/communication/messages/…` | `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content` | the eight docs above |
| `TeamCommunicationContentService`, `AgentOrgReferenceContentService`, `resolveReference`, `projectMessage`, `src/api/rest/team-communication.ts` | `MessageReferenceContentReader` over `RunViewMessagesReader`, `collaboration-message-references.ts` | `agent_artifacts.md` (server), `artifact_file_serving_design.md` |
| Three hand-written reference links in the web contexts and a copy in `test-support` | `messageReferenceContentPath` | `autobyteus-web/docs/agent_artifacts.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: eight docs changed in delivery, and `TESTING.md` and `docs/design-cases.md` in earlier stages.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (duplicate design case numbers 26 and 27, the Solution Designer's), FU-002 (a unit test that fails when `TMPDIR` is not canonical, the implementation's) and FU-003 (three server E2E files that fail on the base) are in `follow-ups.md`; delivery adds FU-004 (a server E2E file, `scoped-org-history-graphql`, that fails in whole runs and passes alone). FU-002 and FU-003 showed again in delivery's whole runs (`release-deployment-report.md`). The Solution Designer sends them.
