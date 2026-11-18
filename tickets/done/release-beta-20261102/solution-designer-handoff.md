# Handoff — release request: a new beta (package release-beta-20261102)

Classification: **Release Requested** (nothing to design; no requirements, notes or design written).

## Request (the user's words, 2026-11-02)
"wait a moment. let delivery engineer release a new beta"
Given while the Solution Designer was starting the later items of Task autobyteus-348. Requested by: the user, directly in the Solution Designer's conversation. Release kind: **beta**; version not given: the next beta of the current line (the last tag is `v1.5.11-beta.10`, so expected `v1.5.11-beta.11`); the version, steps and checks come from `RELEASE.md` and the release guide, which the delivery engineer follows. Include: everything merged on `personal`; leave out nothing. No change to the software is requested.

## Context
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-20261102`; branch `codex/release-beta-20261102`; base `origin/personal` @ `84ea944ac596fb76f5b544ca3764d921b6c8232d` (fetched 2026-11-02); finalization target `origin/personal`.
- Since `v1.5.11-beta.10`: 137 commits, among them the merges of autobyteus-348 (runtime switch for Team members, Org members and delegated copies; `046f089f2b`), autobyteus-97 (delegated copy runs in its Task's Project folder), autobyteus-358 (large runs load less) and autobyteus-318 (test and tooling hygiene round 2).
- Notice points the beta notes should carry (from the ticket's own release notes at `tickets/done/runtime-switch-members/release-notes.md` on `personal`): the GraphQL clean cut of autobyteus-348 (`updateStoppedTeamRunSelections`, `selectionPatches`, `runtimeKind` required on Team, Org and delegated settings; `updateStoppedAgentRunSelection` since 316) breaks old clients; each member switches at its own first message; a partly switched Team is normal; there is no data migration.
- Known open item, not a release blocker by itself: the flaky `agent-package-folder-watcher.test.ts` (follow-up FU-C3, routed to autobyteus-333); the delivery engineer judges it under TESTING.md Rule 9 if it fails in the release checks.
- Task autobyteus-348 stays open for FU-004, FU-001 of 316, FU-005 and FU-008; the Solution Designer pauses that design work until the release result returns.

## Expected output
The release result (version, tag, published artifacts, the release guide's checks) in the release report; `Delivery Completed` back to the Solution Designer, who verifies the receipt and reports to the requester.

## Update 2026-11-02 (after the blocker was fixed)
- The blocker (clean-runner-build-order) is merged: `origin/personal` @ 1df12d475a (merge 5d9eb4391f). The base for the release is now that head, not 84ea944ac5; it also carries autobyteus-363 (Manage Nodes) and autobyteus-366 (agent settings), 35 web commits since. Rebase `codex/release-beta-20261102` (your report commit 1d5afd7a41) onto it before use.
- Resume at the pre-tag checks on the new head: the Secret Gate over the whole range since `v1.5.11-beta.10`, the release smoke and the build-only run on `personal` (RELEASE.md), then tag `v1.5.11-beta.11`.
- Beta notes: include one line for API clients on the autobyteus-348 GraphQL clean cut (`updateStoppedAgentRunSelection`, `updateStoppedTeamRunSelections`, `selectionPatches`; the old names are gone). Decided by the Solution Designer: the Task asks for this release note. No "What you need to do" section.
- Follow-up of delivery, FU-4 (macOS staple -1005 not covered by the workflow's retry), is recorded; if the macOS Intel job fails the same way again in the release run, rerun it as in the build-only run; the follow-up goes to a Task.
