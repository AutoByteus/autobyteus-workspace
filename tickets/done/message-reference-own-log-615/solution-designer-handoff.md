# Solution Designer Handoff — autobyteus-615 (message-reference-own-log-615)

- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-23
- Classification: `Architecture Design Complete`, `task_size = Medium`, `architectural_risk = High`
- Solution revision: SR-001
- Approval: the founder approved the fix on 2026-11-23 ("you analyze it and trust your proposals now you can continue"), with the direction that the architecture stay healthy and follow the design principles. No separate design approval is needed.

## Original request

Project Task `autobyteus-615`, from `/project_task_manager`. In the Messages tab, a `send_message_to` reference file shows "Reference file unavailable" although the file exists.
- First: investigate and report. Done: `root-cause-report.md`.
- Then: the founder's go-ahead for options A and B, done in a healthy way.

Constraints: `DESIGN.md`, `TESTING.md`; synthetic data; never the founder's running server; no release without his word.

## Root cause

A regression from autobyteus-461. The message list reads the view of run X: its own log plus the logs of the open runs below. The three reference routes and the three web links each read one log, the root's. So messages of delegated runs, and a root's messages stored in a delegated run's log, answer 404, which the viewer shows as "file deleted or moved".

## Design summary (design-spec.md)

- **Server:**
  - extract `RunViewMessagesReader` from `ParticipantMessagesReader.rootRecords`;
  - add `MessageReferenceContentReader`, which uses it and keeps the single reference ID rule and the file checks;
  - one route, `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content`, with the page's identity;
  - remove the three routes, `TeamCommunicationContentService`, `AgentOrgReferenceContentService` and `resolveReference`.
- **Web:** `participantMessagesView` builds `referenceContentPath` from its `key`; the three hand-written links and the test-support copy are removed; the viewer reads `code` on a 404 (DEC-003 text, `en` and `zh-CN`).
- **Not affected:** persisted data and NA-7 permissions.
- **Design case:** Case 28 is added to `docs/design-cases.md` in this worktree.

## Points for review

- The extraction boundary (`RunViewMessagesReader`) and the process binding for the route (the same pattern as the GraphQL reader).
- The removals: each must have no other caller.
- QR-001: the file-serving boundary in the new owner.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/message-reference-own-log-615`
- Branch: `codex/message-reference-own-log-615`
- Base: `origin/personal` @ `1956c232c8`
- Dependencies are installed.
- Ticket folder: `tickets/in-progress/message-reference-own-log-615/` (uncommitted; with `docs/design-cases.md`)

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `root-cause-report.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md` (FU-001)

## Routing record

- `get_handoff_rules`: the rule for Large or High sends to `/architecture_reviewer`.
- Sent 2026-11-23 to `/architecture_reviewer` (run `architecture_reviewer_e15cabc91ecb45a3a979819d39435d9f`): DELIVERED, with the handoff and the ticket documents attached.
- 2026-11-23: ARCH-REV-001 **Pass** on SR-001 (no findings). The reviewer delivered the package to `/implementation_engineer`. Informational, so no forwarding by the Solution Designer. The reviewer's notes N-1…N-3 went to implementation. N-1 corrects my design's wording: `ParticipantMessagesReader` drops `records` and `delegatedRunAgents`.
