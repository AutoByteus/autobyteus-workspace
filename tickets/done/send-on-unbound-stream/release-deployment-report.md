# Delivery / Release / Deployment Report — autobyteus-540 (send-on-unbound-stream)

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`. No release, publication or deployment: the user did not ask for one and `RELEASE.md` makes none the default (a release is available; `release-notes.md` is ready).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as on `origin/personal` `914eb36577` (the branch's tree has the same file: `git diff 914eb36577 HEAD -- RELEASE.md` is empty). Not created by this delivery.
- Deviations from the guide and why: `None`. One judgement about a project rule, `TESTING.md` "Fresh-start build", is recorded under "Initial Delivery Integration Refresh" (not a deviation from `RELEASE.md`).
- Proposed guide fixes, and whether the user agreed: `None` new. The proposal from autobyteus-533 stands (its `follow-ups.md` FU-008: whether a `package.json` change that only adds a `test:*` script line triggers the Fresh-start build); this ticket adds one more such line.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written on a branch that equals the latest tracked remote base plus the ticket's commits.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `914eb36577`
- Latest tracked remote base reference checked: `origin/personal` `914eb36577` (`git fetch origin personal`, 2026-11-19, at the start of delivery)
- Base advanced since bootstrap or previous refresh: `No` (`git rev-list --count HEAD..origin/personal` = 0; `git merge-base HEAD origin/personal` = `914eb36577`)
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed` (no integration)
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `No`
- Post-integration verification result: `Passed` (the validated state is the integrated state)
- No-rerun rationale: no base commit came in, so the state API/E2E validated (code `f70d3cb968`, `49ed8967f0`, tests `41bba2c734`) is the state that merges. `git diff --name-only 41bba2c734 HEAD -- . ':!tickets'` is empty: only documents changed after the tested commit, and delivery's own edits are documents. API/E2E's typechecks (reused IMP-02…06; API-02) and suites ran on that code. RELEASE.md asks for a rerun only on new base commits or a named request; neither applies. Delivery ran the checks a `package.json` edit and the first push need, which need no new base: `pnpm install --frozen-lockfile --lockfile-only` (consistent), `scripts/check_repository_artifact_hygiene.py` (below), the Secret Gate (below).
- **Build-input rule.** TESTING.md's Fresh-start build is triggered by any `*/package.json` path. The ticket changes one build-input path: `autobyteus-web/package.json`, by one added line (`"test:e2e:send-delivery": "node tests/e2e/send-delivery-probe.mjs"`; `git diff 914eb36577 HEAD -- autobyteus-web/package.json`), and adds no workspace-package import to a typechecked file (`git diff 914eb36577 HEAD` shows only the ticket's own relative imports). A script entry that no build step runs cannot change what a runner installs or builds, and the lockfile is consistent, so delivery did not run a fresh-clone desktop build or send this back for one; it records the judgement here, as it did for autobyteus-533 (its FU-008 asks the user to decide the rule).
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` at `914eb36577`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-001: Acceptance-Criteria Proof, 95.3 % final confidence, target met, no category below 90 %, every critical criterion `Proven`), the evidence files its Cases table names (opened below), `code-review-report.md` (CRR-001 Pass, with CG-01 the kept prepared run accepted) and `api-e2e-test-review-report.md` (CRR-002 Pass).
- What was mocked or not tested: the model runtime (scripted AGY with a held turn; the queued case ran on AGY only); the network (the wire loses or drops a socket at an exact moment; HTTP is not delayed); zh-CN rendered by unit only; a physical phone; Electron (unchanged).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (no send before `CONNECTED`) | API-01 (unit, fake socket per kind); `API-07-desktop-send-delivery/evidence.json` SDD-01/02; `API-08-mobile-shell/mobile-shell-probe.json` MSP-85 | SDD-01 and SDD-02: 20 rounds each, every `sends[].bound` `true`, `notReady` 0; MSP-85 `"rounds": 15`, each send `"bound"` on its link, `"notice": null` | Proven |
| AC-002 (every send starts its turn; no `SESSION_NOT_READY`) | `API-06-sends-after-stops/evidence.json`; SDD-01/02; MSP-85, MSP-80…84 | API-06: `"sends": 80`, `"sendStalls": []`, 0 `SESSION_NOT_READY` among 1 235 wire entries, 80 rounds with one Stop each and no toast; SDD-01/02: 40 of 40 `started: true`, `notReady` 0, `count` 1, no notice; MSP-85: 15 of 15 started; MSP-80…84 (533's phone Stop cases, which send after Stops) `Pass`. 533's own run of the same case lost 1 of 80 | Proven |
| AC-003 (decided from the snapshot) | SDD-03, 04, 05, 06, 11; API-02 | SDD-03 answer lost → `count: 1`, no notice, snapshot `input_state` `entries: []` (stored); SDD-04 queued behind another window's turn → snapshot `entries: ["forwarded:…", "queued:client_…"]`, `count: 1`, no notice, status `Running`; SDD-05 missing from a live run → text (a), `count: 0`, draft `PLAIN lost-live-…`; SDD-06 missing from a stopped run (`snapshotInputState: null`) → text (b); SDD-11 the branch `input state at the rebind` → found. Server: the active run's snapshot carries `input_state` (unit/integration, API-02/API-04) | Proven |
| AC-004 (notice text, draft back, status unchanged, per kind) | SDD-05/06/07/08/09/10; MSP-86 (phone standalone), MSP-87 (Org member), MSP-88 (peer run) | Text (a) "Your message was not sent: not connected to the node. It is back in the message box; send it again." and text (b) "The connection to the node was lost while sending. Your message is back in the message box; if it does not appear in the conversation, send it again." verbatim, no run id or internal word; not bound → text (a) after 10 009 ms (SDD-07), 10 031 ms (SDD-09), 10 132 ms (MSP-88); status `Idle`→`Idle` (SDD-05, MSP-86), `Offline`→`Offline` (SDD-06/07/08), `Idle · in Delivery Org` before and after (MSP-87); SDD-10: a new run's first message refused → draft back, the resend `answers: ["accepted"]`, `started: true`, `sentOn` the refused stream, one new run | Proven. SDD-09's Team status reads `Initializing` while the notice shows: SDD-12 (no send at all) shows `Offline` → `Initializing` at 820 ms from the history placeholder of an active Team whose stream is not connected, so the send did not change it (FU-003) |
| AC-005 (notice and draft survive the snapshot) | API-01 (unit); SDD-05/06; MSP-86…88 | the notice and draft are in the view after the rebind's snapshot replaced the conversation (the case's final `view`) | Proven |
| AC-006 (a lost send fails the probe) | API-06; MSP-80…84; the two `holdTurn` functions | `holdTurn` throws at once on a lost send; API-06's 80 rounds and MSP-80…84 have empty `sendStalls`; no second send attempt in either probe | Proven |
| AC-007 (existing suites) | API-04, API-05/05b, API-08, API-02 | integration `Test Files  1 failed \| 88 passed`, `Tests  4 failed \| 510 passed`: the 4 failures are all in `file-system-watcher.integration.test.ts` (FSEvents: `API-04b` measured `none in 10000 ms` once, `fseventsd` 157.9 %), a file the diff does not touch; server E2E whole `8 failed \| 193 passed` on load, the 8 rerun serially `Test Files  8 passed (8)`, `Tests  62 passed (62)`; phone probe 87 cases, 86 Pass, `duplicates: []`, `unknown browser errors: 0`, cleanup `serversLeft: 0`; guards `Passed` | Proven for the changed scope |
| QR-001 | texts in SDD-05…10, MSP-86…88 | no run id, `SESSION_NOT_READY`, stream, session or socket in any notice | Proven |
| QR-002 (no added delay on a bound stream) | API-01 (unit); API-06 | sends after Stops on bound streams went at once; `started` in every round | Proven |

- Open points weighed: (1) The phone probe's verdict is `Fail`: MSP-41 (the desktop Files editor's own save read twice, `readsAfterSave: 2`). It failed again alone (`API-08b`). The diff touches no file editor, explorer or watcher code (`git diff --name-only 914eb36577 HEAD` lists none), and autobyteus-458 recorded the same failure as intermittent and base-side (its `follow-ups.md` FU-003: alternating the base's web sources and its branch gave the same failures, and it fails alone); autobyteus-522's summary names it too. Accepted as outside this ticket; delivery did not rerun the base. (2) `/ws/agent-collaboration`'s Stop has no web sender (533); not part of this ticket. (3) SDD-11's other branch (the rebind's snapshot comes before the node made the run active again) shows (b) and then the message appears: the design's residual risk, in the notes and the release notes.
- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: `N/A`
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (the user did not ask for a release in the request or later). A release is available.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/agent_execution_architecture.md` (by the ticket; one stale name corrected), `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` (added), `docs/design-cases.md` (by the ticket)
- No-impact rationale (if applicable): `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `AGENTS.md`: no change (docs-sync report).

## Ticket State Transition

- Ticket moved to `tickets/done/send-on-unbound-stream`: `Yes`, in the commit that precedes the merge
- Archived ticket path: `tickets/done/send-on-unbound-stream/`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`, branch `codex/send-on-unbound-stream`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/send-on-unbound-stream`
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/send-on-unbound-stream` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push. Merge `b0c2d94117` on `origin/personal`.

## Release / Publication / Deployment

- Applicable: `No`
- Method: none
- Pipelines triggered and their results: none (no tag pushed)
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (`release-notes.md` is ready for a later release; it has no `## What you need to do` section)

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: no stored data or migration changed. The one wire change is a clean cut under `DESIGN.md` rule 9 (no compatibility between versions): every `AGENT_STREAM_SNAPSHOT` now carries `input_state` (`null` when the node cannot tell), and the page's parser (`parseAgentStreamMessage`, `agentStreamEnvelope.ts`) requires it, so a page of this release cannot read the snapshot of a node of an earlier release (it rejects it as an invalid snapshot). The desktop app, its web UI, its embedded server, the phone bundle the node serves and a paired node ship from one release, so no supported setup meets the case; the release notes say the node must be on the same release. No app-data migration, so the release's `RELEASED` set is unaffected.

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the merge commit on `personal` (`git revert -m 1 <merge>`). Nothing persistent changes; the snapshot field is a wire change only (a clean cut, `DESIGN.md` rule 9), so a revert takes page and node back together.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes` (Finalization Record below)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: run after the record commit's push (Finalization Record, last two bullets); its result is in the terminal message
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: by `send_message_to` after the record commit's push and the cleanup
- Terminal message/reference: the `send_message_to` message to the Solution Designer, address from `get_handoff_rules`

## Finalization Record

Written after the push of the merge, the way earlier tickets recorded theirs.

- Ticket branch `codex/send-on-unbound-stream`: committed (tip `30c87b91dc`) and pushed to `origin` (`[new branch]`); Secret Gate on `origin/personal..codex/send-on-unbound-stream`: `PASS`, 14 commits.
- Target refreshed before the merge and again before the push: `git fetch origin personal` showed `914eb36577` both times (no re-integration, no re-verification needed).
- Merge: on `finalize/send-on-unbound-stream` (from `origin/personal` `914eb36577`), `git merge --no-ff codex/send-on-unbound-stream` = `b0c2d94117` (parents `914eb36577` and `30c87b91dc`; the merged tree equals the ticket branch's tree). Secret Gate on the merged state: `PASS`, 15 commits. Hygiene check on the archived tree: passed (99 653 tracked files).
- Push: `git push origin HEAD:personal` `914eb36577..b0c2d94117`; `origin/personal` = `b0c2d94117` afterwards.
- Release: none (no tag, no version bump, no pipeline).
- This record: committed on `finalize/send-on-unbound-stream` and pushed to `origin/personal` as the commit that follows `b0c2d94117`.
- The user's checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, on `personal`): `git fetch`, then `git merge --ff-only origin/personal` after this record's push, only if it is on `personal` with no local commits and git accepts it; nothing is stashed, reset or checked out there. The result (commit, or why not) is in the terminal message.
- Cleanup, after this record's push: `git worktree remove --force /Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream` (only untracked build output `*/dist/` remains), `git worktree prune`, delete the local branches `finalize/send-on-unbound-stream` and `codex/send-on-unbound-stream`. Remote branch: `Not required` (the repository keeps pushed `codex/*` branches). The result is in the terminal message.
