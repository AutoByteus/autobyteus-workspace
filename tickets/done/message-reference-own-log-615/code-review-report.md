# Code Review Report — autobyteus-615 (message-reference-own-log-615)

- **Round:** CRR-001 (IR-001, initial)
- **Review scope:** Full Review
- **Reviewed:** `origin/personal` @ `1956c232c8` … `bbb374a5b2` (`aff155fceb` server, `1b1be2e822` web, `0629b5c631` AC-007 E2E)
- **Basis:** requirements SR-002, design spec SR-001, ARCH-REV-001 (N-1…N-4), implementation handoff IR-001
- **Result:** **Pass**. No findings. Next: API/E2E.

## Spine Check

DS-001 works as designed:

1. The web builds `messageReferenceContentPath(key, …)` inside `participantMessagesView`.
2. The request reaches `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content`.
3. `MessageReferenceContentReader.resolve` reads `RunViewMessagesReader.read(view)` and finds the message, then the reference by `messageReferenceId`.
4. The reader checks that the path is absolute and that the file can be read, then streams it with `sendUserFile` and `no-store`.

DS-002 is unchanged in behavior. `ParticipantMessagesReader` now reads its records through the same `RunViewMessagesReader`. The body of `rootRecords` moved over unchanged: the open subtree is read once, and a run that can't be read below the view is left out with a warning.

## Requirement and Design Checks

| Item | Evidence | Result |
| --- | --- | --- |
| REQ-001 / AC-001, AC-002: every listed reference opens | The reader looks the message up in the composed view, not in one log. Unit cases cover the view's own log, a root's message stored in a delegated run's log, and a delegated team's internal message from both the team view and the host view. AC-007 E2E (IMP-09) covers 12 views across 3 root kinds. | OK |
| REQ-002 / QR-001: only a file a message of the same view names | `composeRunViewMessages` already applies `isMessageOfView`. The reference must be one of `message.referenceFiles`, matched by `sha256(messageId\0path)`. Unit cases: a message outside the view, a reference not on the message, an ID made from the path but another message. All three give `REFERENCE_NOT_FOUND`. | OK |
| REQ-003 / AC-004 / DEC-003: honest not-found text | The viewer reads `code` on a 404. `REFERENCE_NOT_FOUND` shows the DEC-003 text in en and zh-CN. An unavailable file, or a 404 without a code, keeps the current text. The token check comes after the body read. | OK |
| REQ-004: one web builder | Three hand-written builders are removed. `test-support/teamWorkspaceContextView.ts` now calls the owner's builder instead of keeping a copy. Specs cover each context kind: the standalone host, a delegated task agent, a delegated task team member, a Team's own member, and an Org (IMP-13). The negative control fails 4 cases (IMP-14). | OK |
| REQ-005: context files | Not touched. Rendered check R615-03 (IMP-07). | OK |
| REQ-006 / AC-007: permanent guard | `message-references-every-view.e2e.test.ts` checks the property itself: every reference of every page in every view must return 200 with that file's unique bytes. It also requires that each scripted reference was listed in each view it belongs to, so a test over empty lists cannot pass. The negative control fails on the in-team reference with 404 `REFERENCE_NOT_FOUND` (IMP-10). | OK |
| Removal plan | Removed: the three routes, `TeamCommunicationContentService`, `AgentOrgReferenceContentService` and its copy of the ID rule, `resolveReference`, `projectMessage`, and the tests of removed code. Grep finds no caller left in `src`, `tests` or web source. `getCollaborationRecordsSnapshot` stays, because `RunRecordsSource` still uses it, as the design says. | OK |
| Semantic preservation | The new reader does what both old services did: trim and require each ID, check for an absolute path, check `stat().isFile()` and `R_OK`, map `EACCES` to FORBIDDEN, and fall back to `text/plain` for the MIME type. The status map is unchanged (404/400/404/403). | OK |
| N-1 | `ParticipantMessagesReader` takes `{ views, scope, identities }`. `records` and `delegatedRunAgents` are gone from its constructor; `delegatedRunAgents` still reaches `CounterpartIdentities`. | OK |
| N-2 | `messageReferenceId` is kind-neutral. `projectTeamReferenceFile` uses it, and a unit test pins the two to the same value. | OK |
| N-3 | `MobileMessages.vue:55` uses `messagesView.referenceContentPath(...)`. The phone prefix list now has `/rest/collaboration-messages/` (deviation 1), checked by spec and phone probe (IMP-08). A side effect: the old standalone and Org prefixes were never on the list, and now all three kinds are covered. | OK |
| Principle 16: process binding | `setProcessMessageReferenceContentReader` is set in `composeCollaboration`, next to the participant reader, using the same `runViewMessages` instance. It releases through `releases`. `getMessageReferenceContentReader()` throws when nothing is set. The route reads it on each request. No cycle. | OK |
| Principle 13: empty indirection | `RunViewMessagesReader` owns the composition and has two real consumers. | OK |
| Size | New files are 32, 93 and 43 lines; every changed file is under 220. | OK |
| Typecheck | Ran `pnpm -C autobyteus-server-ts typecheck`: 0 production errors, test errors at baseline (973/300). PASS. | OK |

## Deviations (handoff Legacy / Compatibility notes 1–6)

1. **The phone prefix `/rest/collaboration-messages/` replaces the stale `/rest/team-communication/`.** Correct. The stale prefix matched no route.
2. **An unknown `rootKind` answers 400 `INVALID_ROOT_KIND` before any read.** Accepted. It is the route's schema parse, and the unit test proves no read happens.
3. **A blank message or reference ID is now `REFERENCE_NOT_FOUND`; before, it was a 500.** Accepted, and an improvement.
4. **The architecture test names the new route.** Correct. `user-file-replies.test.ts` passes (3/3), so the protective headers still apply.
5. **Tests were rewritten onto the new reader or route.** Checked. The rewritten tests assert behavior on the new owner; none keeps a removed shape alive.
6. **The comment in the sealed migration `org-path-rewrite.ts:23` still names the old service file.** Accepted. Sealed migrations are not edited.

## Candidate Findings Considered

- **Hold — an unavailable view answers 500.** A view whose records can't be read now answers 500 (the handoff's known risk). Before, the standalone route answered 404 for `StandaloneRootUnavailableError`; the Team and Org routes already answered 500.
  - There is no supported scenario where this shows. A reference link exists only in a list that the same `RunViewMessagesReader.read` already loaded for that view. A view that later becomes unreadable is a deleted or broken run, and its participant page fails the same way.
  - Mapping it back would make the run-history reader depend on standalone's error type, and the Team kind has no matching typed error.
  - Not promoted. If a supported "run deleted while its tab is open" scenario appears, the right owner is `RunRecordsSource`, with a typed not-found error for every kind.
- **Reject — the E2E keeps its own copy of the link and ID rule.** A server E2E cannot import web code. The web builder is unit-tested per context kind, with a negative control. The copy follows the documented contract.
- **Reject — the old Team service's per-failure `console.warn` was dropped.** No requirement depended on it. The Org and standalone routes never logged it either.

## Ticket Scope

No follow-up added. FU-001…FU-003 are already recorded and outside this change.

For delivery's docs sync (the design spec puts it there), these files still name the old routes:
- `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`
- `autobyteus-server-ts/docs/modules/{agent_orgs,run_history,standalone_agent_run_root}.md`
- `autobyteus-web/docs/{agent_execution_architecture,agent_artifacts}.md`

## Checks Run by the Reviewer

| Check | Result |
| --- | --- |
| Server unit tests: `message-reference-content-reader.test.ts`, `collaboration-message-references.test.ts`, `user-file-routes.test.ts`, architecture test `user-file-replies.test.ts` | 19 passed |
| Web specs: `teamCollaborationMessagesViewReferences.spec.ts`, `agentRunCollaborationContext.spec.ts`, `CollaborationMessageReferenceViewer.spec.ts`, `authorizedResourceUrl.spec.ts` | 28 passed |
| Server `pnpm typecheck` | PASS (0 production errors) |

Everything ran on synthetic, test-owned data only. Nothing ran against a real server or `~/.autobyteus`.

## Scorecard

| Category | Score |
| --- | --- |
| Requirement fit | 9.5 |
| Spine / ownership | 9.5 |
| Boundary and security (QR-001) | 9.4 |
| Legacy removal | 9.5 |
| Tests and guard quality | 9.4 |
| Readability / size | 9.3 |

## For API/E2E

- Run AC-007 on a freshly built dist; the test's header notes that a stale dist proves nothing.
- AC-008, the TESTING.md rule, is API/E2E's to write.
- Phone authorization of the new prefix was probed (IMP-08). Re-check it if the API/E2E plan covers the phone.
