# Handoff — Architecture Design Complete (autobyteus-412, SR-001)

## Result

- Classification: `Architecture Design Complete`; `task_size` `Medium`; `architectural_risk` `High`.
- Route: independent architecture review (handoff rule: risk High) → `/software_engineering_team/architecture_reviewer`.
- Package identifier: `node-update-failure-and-release-order`.
- Current SR: `SR-001`.

## Original Request

Project Task `autobyteus-412` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`):
1. FU-003: the node card keeps showing "Automatic update failed … No server package was published for 1.5.12-beta.5" after a later update of the same node succeeded. The failed state should clear.
2. FU-004: the desktop release becomes available before its server packages are uploaded, so the first automatic node updates fail. The team decides where the fix belongs (the earliest stage that can reproduce it).

Constraints:
- Automatic updates stay opt-in and off by default (autobyteus-356).
- Never move or delete a published tag.
- Tests on isolated nodes.
- Release only on the user's word.

Done when: both are fixed, or the team explains why one is not worth it; tests; finalized on the base branch.

## Goals And Decisions

- FU-003: the main process removes an `AUTO_FAILED` entry for V once the node answers that it runs V or newer. This happens at its own checks, and when a node card asks it to recheck after the card's answer from the node changes (switch on or off, any update route).
- FU-004: Desktop Release uploads the binaries, waits (≤ 60 min) for the six server package files, then uploads the four `latest*.yml` updater files. RELEASE.md and the docs are updated.
- Not done, with reasons: a desktop retry of `NO_PACKAGE_FOR_VERSION` (DEC-002; follow-up FU-001), and holding back the installers or the APK (DEC-003).

## Approval Basis

Requirements approved by the Solution Designer within the Task's direction; there was no `Needs user` decision. The user was informed in the Solution Designer's conversation on 2026-11-07. Design approval by the user is not required by the Task.

## Evidence (key)

- MEAS-01: on v1.5.12-beta.5 and beta.7, the server packages appeared 14–15 and 25–26 min after the desktop's `latest*.yml`. On beta.6 they appeared first.
- RUN-01 / RUN-02 (the user's desktop record and nodes, read-only): both nodes run beta.7 and their update succeeded at 12:42. The record still says `AUTO_FAILED` for beta.7, from an attempt at 12:05:28, 7 min before the arm64 package.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`
- Branch: `codex/node-update-failure-and-release-order`
- Base: `origin/personal` at `6225a734a3`
- Finalization target: `origin/personal`
- The ticket documents are in the worktree and not committed yet.

## Artifacts

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/tickets/in-progress/node-update-failure-and-release-order/`
- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md`
- this file

Supplements: none. Prior review artifacts: none.

## Open Risks

- RSK-001: a failed server package job now also holds back the desktop update (intended; recovery in RELEASE.md).
- RSK-002: the real asset order shows only on the next tag; delivery checks it then (AC-005).
- The Fresh-start build path rule matches the workflow file, while the build-only run does not exercise `publish-release`. See the design spec's Guidance For Implementation.

## Route Record

- 2026-11-07: sent to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_38cc2f96de77454fbc9453bba17ea17b`), DELIVERED.

## Expected Next Action

Independent architecture review of SR-001.

## Round 2 — SR-002 (response to ARCH-REV-001, Fail / Design Impact)

- Result: `Architecture Design Complete`, unchanged `Medium` / `High`. Requirements unchanged; the SR-001 approval still applies.
- AR-001 → DS-002 trigger: one watch in `NodeServerUpdate.vue` (cell part, `immediate`) on the combined key answer version | update state | entry version | entry outcome. On each change it sends one recheck when an answer is present and the entry is `AUTO_FAILED`. This covers the first view, where the entries load after the first answer. A first-view example and component test cases were added.
- AR-002 → the `recheckFailure` sequence is written out:
  - It returns early when the guard is held, then reads the entry, which must be `AUTO_FAILED` for V, and finds the node.
  - It adds the entry ID to `checking`, then calls `getStatus(?target=V)`.
  - After the await it returns if stopped, then re-reads the entry. It removes the entry only if it is still `AUTO_FAILED` for V and superseded, then emits.
  - `finally`, it deletes the entry ID from `checking`.
  - An example and a unit test case were added: a pass during a recheck, and a `PENDING` entry stored meanwhile is kept.
- AR-003 → DS-001's narrative and the Not-cleared example now say that a pass clears only while the desktop still runs V. After V+1, the card's recheck (`?target=V`) clears it, or the next request replaces it.
- Residual note → RELEASE.md's Recovery names the case "Android fails, the server job's 30-min wait for the release runs out, and the desktop publish fails after its 60-min wait", with the recovery steps.
- Project design case: `docs/design-cases.md` Case 10 gained the autobyteus-412 AR-002 instance.
- Changed files: `design-spec.md`, `solution-revision-record.md` (SR-002), `investigation-notes.md` (P-001/P-002 facts), `docs/design-cases.md`.

### Route Record (Round 2)

- 2026-11-07: to `/software_engineering_team/architecture_reviewer` for re-review.
- 2026-11-07: ARCH-REV-002 **Pass** on SR-002 (requirements SR-001), `Medium` / `High`. AR-001 to AR-003 resolved. P-003 is a non-blocking residual: a recheck dropped while a pass holds the guard leaves the line until the card's next key change, which is cosmetic. The reviewer sent the package to `/software_engineering_team/implementation_engineer`. The Pass was informational; the Solution Designer sends no second handoff.
