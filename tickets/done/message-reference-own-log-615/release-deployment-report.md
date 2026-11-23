# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `message-reference-own-log-615` (autobyteus-615): a message's reference file opens from the view its list was read from, for every root kind and every delegated run. Repository finalization into `origin/personal`; no release, publication or deployment (nobody asked for one; RELEASE.md's default is no release). `task_size` Medium, `architectural_risk` High, reviewed route (architecture review, source review and test-code review ran; all passed).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as in the worktree after the base refresh (last changed in `8f69917cc0`: the never-commit-dist rule names the contract packages' tracked `dist/` as its exception); the Finalization Target and Secret Gate sections apply, "Desktop signing readiness" gates tagging only.
- Deviations from the guide and why: `None`. The finalization steps run in the ticket worktree, not in the main checkout. The ticket branch is pushed first, as earlier tickets did (the repository keeps pushed `codex/*` branches). Delivery reran more than the guide's minimum after the base refresh (one relevant check and both typechecks): the whole server, web and integration suites and the whole server E2E, because the branch is Medium / High and TESTING.md's rerun rule marks everything for a changed fixture or contract package, which the base's 47 commits included.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/message-reference-own-log-615/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/message-reference-own-log-615/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written against the branch as API/E2E tested it (code `0629b5c631`, `TESTING.md` `725891acc1`, reports `6ef5c7e5dd`) and as the code reviewer passed it (`CRR-001`, `CRR-002`), plus delivery's merged-state reruns.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `1956c232c8`
- Latest tracked remote base reference checked: `origin/personal` @ `a59fbc005b` (`git fetch origin personal`, 2026-11-23, at the start of delivery, after the checks, and before each push)
- Base advanced since bootstrap or previous refresh: `Yes` (47 commits)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`3c645b83e8`: the code reviewer's untracked `api-e2e-test-review-report.md`, `code-review-report.md` and `code-review-revision-record.md`, committed before integrating)
- Integration method: `Merge` (`6472d9199c`). Both sides changed only `TESTING.md` (this ticket's AC-008 row; the base's contract-dist rule) and `docs/design-cases.md` (Case 28; the base's cases), and git merged both cleanly. The base's other changes are the stopped tool call, run-relative links, tool-call summary arguments and contract `dist/` rebuild of autobyteus-609, and a changed `tests/fixtures/agy-failure-cli.mjs`; none touches the reference route, the view readers, the link builder or the viewer.
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
- Post-integration verification result: `Passed`, with five failures, each explained and none on a path this ticket changed (below). On `6472d9199c` (`evidence/DEL-02…DEL-11`, each log with its command and commit): server typecheck `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`; web typecheck `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`; server build exit 0 with `Sanitized built-module/bootstrap smoke passed`; the ticket's six E2E files (`message-references-every-view`, `closed-run-attachments`, `append-only-message-logs-startup`, `controlled-org-publication-http`, `org-container-package`, `task-delegation-api-surface`, `RUN_AGY_FAILURE_E2E=1`, the scripted CLI) `Test Files  6 passed (6)`, `Tests  22 passed (22)`, with `MRV-1 opened 21 references in 12 views`; whole server unit `Test Files  1 failed | 1070 passed | 5 skipped (1076)`, `Tests  1 failed | 8907 passed | 9 skipped (8917)`; whole web unit `Test Files  801 passed (801)`, `Tests  6110 passed | 2 skipped (6112)`; server integration `Test Files  92 passed | 21 skipped (113)`, `Tests  523 passed | 71 skipped (594)`; whole server E2E (ungated) `Test Files  4 failed | 123 passed | 165 skipped (292)`, `Tests  4 failed | 569 passed | 784 skipped (1357)`, `ENOTEMPTY occurrences: 0`.
  - The unit failure is `SR-016` (587) `org-units-remote-files-and-renewal.test.ts`: it fails when `TMPDIR` is a link (`/var/folders/…` for `/private/var/folders/…` on macOS) and passes 4 of 4 with the canonical path three times (`DEL-09`); the implementation's `FU-002`. The ticket changes neither the file nor `src/remote-collaboration`.
  - Three E2E failures are `FU-003`: `collaborators-to-delegated-runs-startup`, `memory-collaboration-graphql`, `removed-skill-access-mode-history-graphql` fail identically alone twice (`DEL-11`) and on the base `1956c232c8` (`IMP-06d`).
  - The fourth, `scoped-org-history-graphql`, passes alone 2 of 2 (`DEL-11`) and failed the same way in the implementation's whole run; it is recorded as FU-004 (delivery's).
- No-rerun rationale (only if no new base commits were integrated): not applicable. Not run: the packaged Electron app (see the handoff summary, R-2).
- Delivery edits started only after integrated state was current: `Yes` (the eight docs edits and the documents came after `6472d9199c`)
- Handoff state current with latest tracked remote base: `Yes` (`origin/personal` @ `a59fbc005b` is an ancestor of the branch; re-checked before each push, see Repository Finalization)
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases, scorecard: final 95.4%, six applicable categories, none below 90%), `api-e2e-test-review-report.md` (`CRR-002` `Pass`), `code-review-report.md` (`CRR-001` `Pass`, with the held residual), the evidence files named below (opened; the two screenshots viewed), `implementation-handoff.md` Checks Run (IMP-01…IMP-14), delivery's merged-state reruns (`DEL-02…DEL-11`), and delivery's reading of the changed source (`message-reference-content-reader.ts`, `run-view-messages-reader.ts`, `collaboration-message-references.ts`, `participantMessageRows.ts` `messageReferenceContentPath`, the viewer's `REFERENCE_NOT_FOUND` handling, `authorizedResourceUrl.ts`) and of the `TESTING.md` row.
- Accepted unverified risks (`DEC-*`): `None`. No criterion is accepted as unverified risk.

| Acceptance-Criteria ID | Cases And Files Checked | What I Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (a reference of a delegated task team member, a delegated task agent and a member of a task team under an Org opens) | API-03 `API-03-ac007-fresh-build.log`; `DEL-05` (merged build); IMP-10 (control); IMP-07 `R615-01…03` (viewed); IMP-13 | MRV-1 `opened 21 references in 12 views` on a fresh build and again on the merged build, including "agent: task team lead"; the control (reader limited to the view's own log) fails exactly there with `404 REFERENCE_NOT_FOUND`; the rendered Messages tab of the delegated team member opens `inside-615.md` as rendered Markdown | Proven |
| AC-002 (a root's own Messages tab opens a message stored in a delegated run's log) | API-03 (MRV-1: the root views of the three kinds); IMP-11 | MRV-1 lists the root views' messages between the root's agent and a delegated run's agent and opens their references; IMP-11 `Tests  26 passed (26)` | Proven |
| AC-003 (a message not in the view, or a reference not on the message: `REFERENCE_NOT_FOUND`, 404) | IMP-11, IMP-12; the reader's source | `resolve` finds the message in the view's messages, then the reference by `messageReferenceId`, and throws `REFERENCE_NOT_FOUND` otherwise (404 in the route's table); IMP-12 with the ID check broken (`Boolean(referenceId)`) fails the reference-not-on-the-message and the other-message-ID cases | Proven |
| AC-004 (the viewer tells "not found in this conversation" from "the file is missing") | IMP-13 (viewer unit test); IMP-07 `R615-02` (viewed) | The viewer reads the 404's `code` (`isNotFoundInView`) and shows `reference_not_found_detail` or `reference_unavailable_detail` (en and zh-CN); the screenshot shows the gone file's "Reference file unavailable / The file may have been deleted, moved, or become unreadable." | Proven |
| AC-005 (one builder; the three hand-written links and the test-support copy are gone) | IMP-13, IMP-14; the diff; `CRR-001` | `messageReferenceContentPath` is the only builder (the test-support helper imports it); IMP-14, with the root kind fixed to `agent_team`, fails four tests | Proven |
| AC-006 (context files open as before) | IMP-07 `R615-03`; API-03 CRA-1; IMP-06 | `R615-03` `Pass`: the delegated agent's context file opens through `/rest/runs/<run>/context-files/…` with no wrong request; CRA-1 `✓` (a closed run's reference and context file) | Proven |
| AC-007 (every reference listed in every view opens, standalone, Team and Org roots, each with a delegated task team and task agent, cross-run and in-delegated-run messages; a web builder test per row kind) | API-03, `DEL-05`, IMP-09, IMP-10, IMP-13/14 | MRV-1 is a property test over everything the views list; `✓` on the fresh build and the merged build; its control fails on the shipped behavior; the builder is unit-tested per context kind with a control | Proven |
| AC-008 (`TESTING.md` states the rule for a change that moves where data lives) | API-02 (`725891acc1`); the merged `TESTING.md`; `CRR-002` | The row in "Choosing the path": every read path for every owner kind and form, lists, attachments and references, counts, links, live updates; assert the property over everything a view lists; an old-location copy does not count; "expected to work" is a gap to close in the same ticket; its example file exists and passed on the merged state | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`: nothing in this change is visible only to the user; the rendered checks ran on a probe-owned server with synthetic data
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed`: `origin/personal` did not advance before the push (see Repository Finalization)

## Release Decision

- Decision: `No release`
- Decided by: RELEASE.md's default (the user did not ask for a release). A release is available: `release-notes.md` holds the notes, with a `## What you need to do` section.

## Docs Sync Result

- Docs sync artifact: `tickets/done/message-reference-own-log-615/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `agent_orgs.md`, `run_history.md`, `standalone_agent_run_root.md`, `autobyteus-web/docs/agent_artifacts.md`, `agent_execution_architecture.md`, `remote_access.md`. `TESTING.md` (API/E2E) and `docs/design-cases.md` Case 28 (the Solution Designer) were updated in earlier stages
- No-impact rationale (if applicable): `DESIGN.md` and `RELEASE.md` are `No change` (reasons in the docs sync report)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`, in the final ticket commit
- Archived ticket path: `tickets/done/message-reference-own-log-615`

## Version / Tag / Release Commit

None: no release, no version bump, no tag.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin`, `personal`; ticket branch `codex/<ticket-name>`; merge `--no-ff` from a `finalize/` branch in the ticket worktree) and the ticket's bootstrap (base `origin/personal` @ `1956c232c8`).
- Ticket branch: `codex/message-reference-own-log-615`
- Ticket branch commit result: `PENDING-TICKET-COMMIT`
- Ticket branch push result: `PENDING-TICKET-PUSH`
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `PENDING-ADVANCED`
- Delivery-owned edits protected before re-integration: `Not needed` (the reviewer's records were committed as the checkpoint before the one integration; no re-integration followed)
- Re-integration before final merge result: `PENDING-REINTEGRATION`
- Target branch update result: `PENDING-TARGET-UPDATE`
- Merge into target result: `PENDING-MERGE`
- Push target branch result: `PENDING-PUSH`
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `PENDING-CHECKOUT`
- Repository finalization status: `PENDING-STATUS`
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `No`
- Method: N/A
- Method reference / command: N/A
- Pipelines triggered and their results: none (no tag pushed). The Secret Gate, licensing and hygiene checks recorded under Repository Finalization are the pre-merge checks RELEASE.md asks for.

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: N/A
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (written for the next release)
- Blocker (if applicable): None

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/message-reference-own-log-615`
- Worktree cleanup result, worktree prune result, local branch cleanup result: run after this record's push and the second update of the user's checkout (`git worktree remove` from the main checkout once the worktree's untracked and ignored files are confirmed to be build output and test data only and everything committed is pushed; `git worktree prune`; delete the local `codex/message-reference-own-log-615` and the temporary `finalize/message-reference-own-log-615`, both merged into `origin/personal`). The results are in the terminal message.
- Remote branch cleanup result: `Not required` (the repository keeps pushed `codex/*` branches)
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

Not used by delivery.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/message-reference-own-log-615/release-notes.md` (archived with the ticket)
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`, with a `## What you need to do` section: update the app and every node you connect to together, because the reference link changed and the old routes are gone. RELEASE.md collects that section into a beta's notes.

## Deployment Steps

None. This repository deploys no hosted service (RELEASE.md, Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. Links are built at display time and nothing stored names a reference URL (the logs and files are unchanged)
- Delivery action required: `None`
- Result and evidence: the design spec's persisted-data decision; `API-REV-001`

## Verification Checks

Listed in Verification and Initial Delivery Integration Refresh above.

## Rollback Criteria

Revert the merge commit on `personal` (RELEASE.md, Rollback). The change converts no data, so a revert needs no data step; a revert restores the three old routes together with the old web links. Revert if a reference file that the Messages tab lists does not open in a view that the old routes served (a standalone run, a Team, an Org), or if the phone cannot fetch a reference file; fix forward otherwise.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `PENDING-FINAL-FINALIZATION`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `PENDING-FINAL-CLEANUP`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `PENDING-ELIGIBLE`
- Terminal package sent to the Solution Designer: `PENDING-SENT`
- Terminal message/reference: `PENDING-MESSAGE`
