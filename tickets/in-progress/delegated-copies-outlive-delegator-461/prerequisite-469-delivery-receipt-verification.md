# Delivery Receipt Verification: autobyteus-469 (prerequisite PRE-001 of autobyteus-461)

- Verified by: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`), 2026-11-11
- Receipt: `Delivery Completed`, DR-001, from `/software_engineering_team/delivery_engineer` (run `delivery_engineer_f6373448551f4525b1a219af10a33b35`)
- Package: `collaboration-tree-open-tasks-only-469`, solution revision `SR-009`
- Archived ticket folder (read-only for this verification): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/collaboration-tree-open-tasks-only-469/`
- This file lives in the 461 worktree because the 469 worktree was cleaned up and its documents are finalized.

## Result

`Blocked`: `Delivery Receipt Evidence Gap`. One acceptance criterion is recorded as proven on evidence that does not cover it. Everything else in the receipt is verified. Not `Terminal` yet.

## Verified (opened and checked, read-only)

| Item | Check | Result |
| --- | --- | --- |
| Package identity | Folder name, SR-009 in the documents | Same package |
| Finalization | `git log` in the user's checkout: merge `1ee1ea61cf`, parents `bff4faa6f6` and `bc9496e604`; merge tree equals the ticket branch tree; `HEAD` = `origin/personal` = `1ee1ea61cf` | As reported |
| Cleanup | No 469 worktree; no local `codex/…` or `finalize/…` branch; remote ticket branch kept; nothing left in `tickets/in-progress` | As reported |
| Reviews | `design-review-report.md` Pass (ARCH-REV-006); `code-review-report.md` current Pass (CRR-003); `api-e2e-test-review-report.md` Pass | As reported |
| API-I01 | `evidence/API-I01-round2-server-integration.txt`: 90 files, 524 tests passed | As reported |
| API-E01 | `evidence/API-E01-round2-server-e2e.txt`: 182 files passed, 849 tests; OT-1, OT-2, OT-3 and EXC-E2E-007 with check marks | As reported |
| API-B01 | `evidence/API-B01-round2-probe-evidence.json`: result Pass, 16 of 16 cases (BR-001 … BR-016), no failures; `storedLocalEntriesAfterA` 0, `framesDiffering` 0, `unknownTeammateFrames` 0, `teamTabRows` 1; data root removed | As reported |
| Release | None made; `release-notes.md` carries the rollback warning | As reported |
| Follow-ups | `follow-ups.md` FU-001 … FU-004, none sent | As reported |

## The gap: AC-007 and the Task's "an earlier attachment still opens"

- AC-007: "A file attached in an earlier conversation of a dismissed run is opened → It opens". The Task's "Done when" lists "an earlier attachment still opens" after a closure.
- The receipt's row for AC-007 cites API-I01 (context-file integration), TAU-1 ("context file served through the hub") and AOML-1/2 ("message references resolve").
- Those fixtures give their delegated runs open Tasks: `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts:19` imports `writeOpenTaskRecordsOfReleasedData`, and TAU-1 asserts the runs open with all their task agents (`task-agent-own-run-startup.e2e.test.ts:216-222`). So they prove attachments of runs that are in the tree.
- No case opens an attachment of a run that left the tree. The browser probe evidence holds no reference or attachment step; `open-task-tree-upgrade-startup.e2e.test.ts` (OT-1 … OT-3) fetches no attachment; `tests/integration/api/team-communication-api.integration.test.ts` reads a reference with `pastParticipants: []`.

Two kinds of attachment are behind the criterion:

| Kind | Route | After the other run left the tree | Status |
| --- | --- | --- | --- |
| (a) A file attached to a message between the top run and a delegated run (Team tab) | `…/communication/messages/:messageId/references/:referenceId/content` | The reader finds the message by ID in the root's records; the view rule keeps a message with one own agent. Expected to open | Designed, **not proven** by a case |
| (b) A context file of the delegated run's own conversation | `/agent-collaborations/:hostRunId/agent-runs/:agentRunId/context-files/:storedFilename` and the Team and Org equivalents | The owner is resolved through `findAgent` on the composed tree (`context-files/services/context-file-owner-resolver.ts:60-69, 112-120`). A run that left the tree is not found, so the route refuses | **Changed behavior**, not tested |

For (b), the Solution Designer's design said "context file owner lookup: used for a run that is open; no change" without checking the closed case. Reading the web client: links of kind (b) are built for a run's conversation view (`utils/contextFiles/contextAttachmentModel.ts`), and no screen opens the conversation of a run whose Task is closed, before or after this change (hidden in the tree; the Task page line is not openable). The Memory page builds no such link. So no screen reaches (b) while the Task is closed; after a reopen the run is in the tree and the route answers again.

## Decision of the Solution Designer on what AC-007 requires

- (a) is required and must be proven: after a closure, and after a restart, a file attached to a message with the closed run opens from the top run's side.
- (b) is not required while the run's Task is closed, because no screen opens it then, as before the change. It is required again once the run is back in the tree; a proof of that is wanted in the same case.
- The route answer of (b) for a closed run is recorded as a follow-up (below), not as a defect of this ticket.

## Correction requested from delivery

A targeted proof for AC-007, with the receipt's row corrected to cite it:
1. Close a Task whose delegated run exchanged a message with a reference file; the reference opens through the top run's route (at least a standalone top run; a Team and an Org root if cheap), also after a server restart.
2. Reopen the Task and continue the run; a context file of the run's own conversation opens again.

If (1) fails it is a product failure and goes through failure-origin review as usual.

## Follow-ups found at this verification (to send with the Terminal result, with FU-001 … FU-004)

| ID | What | Evidence | Why outside 469 | Urgent |
| --- | --- | --- | --- | --- |
| FU-005 | Memory Sync imported sources that hold delegated runs were not tested with trees built from Task records: a composed read of an imported Team or Org tree asks this node's Task records, which never name an imported root | `api-e2e-execution-coverage-report.md` "Not Tested / Residual Risks"; the user's data has 1 imported source | No fixture exists; the report reasons by code reading that such runs stay listed through own-file presence | No |
| FU-006 | The context-file route of a delegated run refuses while the run's Task is closed (kind (b) above) | `context-file-owner-resolver.ts:60-69, 112-120` | No screen opens such a link while the Task is closed; decided above | No |

## Route

`get_handoff_rules` (2026-11-11): the rule "Solution Designer checks a Delivery Completed receipt and finds missing or inconsistent delivery-owned completion evidence" matches. Sent to `/software_engineering_team/delivery_engineer` with this file. No Terminal result was returned to `/project_task_manager`.

---

## Re-verification of the corrected receipt DR-002 (2026-11-11)

Result: **`Terminal`**. The gap is closed; everything verified for DR-001 stands.

| Item | Check | Result |
| --- | --- | --- |
| AC-007 proof | `autobyteus-server-ts/tests/e2e/projects/closed-run-attachments.e2e.test.ts` (186 lines) read at `827f1e68dc`, lines 140-182: after `update_task` DONE the test waits until the worker left the tree, then the message reference returns HTTP 200 with the exact bytes; the same after a real restart from the stopped root and after the restore, with the worker asserted absent; after `IN_PROGRESS` and `send_message_to` by run ID the worker is back in the tree and its context file and the reference return HTTP 200 with the exact bytes. Agent and Org roots | Proven as required: (a) after closure and restart; (b) after the reopen |
| Evidence | `evidence/API-E03-closed-run-attachments.txt`: `✓ CRA-1 …`, `Tests 1 passed (1)`; observed `{"agentContextFileWhileClosed":404,"orgContextFileWhileClosed":404}` | As reported; matches FU-006 |
| Team root | Not covered (its context file goes through a Team draft owner the journey cannot address) | Accepted: the requirement was a standalone root at least; the reference route of every kind uses the same reader |
| Reports | `release-deployment-report.md` row AC-007 keeps the DR-001 mis-citation on record and cites API-E03; `api-e2e-execution-coverage-report.md` row AC-007 cites API-E03; `api-e2e-test-review-report.md` result Pass (CRR-005) | Consistent |
| Finalization | `HEAD` = `origin/personal` = `827f1e68dc`; its parents `1ee1ea61cf` and `a85c725656`; merge tree equals the branch tree; no `ac007` worktree or local branch left | As reported |
| Follow-ups | `follow-ups.md` FU-001 … FU-006 (FU-005 and FU-006 rows added by delivery from this file) | Sent with the Terminal result (below) |

## Route

No handoff rule matches a verified `Terminal` result. Returned to the requester, `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), with FU-001 … FU-006, naming the Task key autobyteus-469. The archived `follow-ups.md` is finalized and is not edited; this file records the sending: **Sent to `/project_task_manager`, 2026-11-11**.

Next: autobyteus-461 resumes on top of `827f1e68dc` (its prerequisite PRE-001 is delivered).
