# Release Requested — autobyteus-519: beta v1.5.13-beta.9

- Classification: `Release Requested` (no change to the software)
- Project Task: `autobyteus-519` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), moved to this team at the founder's word (the team that built the phone work cuts it)
- Requested by: the founder, in his words (2026-11-17): **"Let's release one beta version."** One beta from `origin/personal`.
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.13-beta.9`, `finalize/release-v1.5.13-beta.9` (the beta.8 naming), from `origin/personal` @ `2b73308ce5` (re-checked 2026-11-17); finalization target `origin/personal`
- Previous team's handover (what it verified and what not): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_b092580a-e815-40bd-a3f2-dca7673fc1ed/context/ctx_b2864c097ccf__release-beta9-handover-20261117.md` (also `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-beta9-handover-20261117.md`)

## Re-checked by the Solution Designer (2026-11-17)

| Item | Command | Result |
| --- | --- | --- |
| Base | `git fetch origin personal --tags && git rev-parse --short origin/personal` | `2b73308ce5` |
| Last beta | `git tag -l "v1.5.13*" --sort=-v:refname \| head -1` | `v1.5.13-beta.8` |
| beta.9 free | `git ls-remote --tags origin "v1.5.13-beta.9*" \| wc -l` | `0` |
| Content since beta.8 | `git log --oneline --first-parent v1.5.13-beta.8..origin/personal` | beta.8's record `4cbf9e7881`; autobyteus-448 part 1 (`e479be4539`, `895cf3992d`); autobyteus-483 (`c5f063f992`, `e16f0b0d55`); autobyteus-458 with 506 (`19f0cf5cd2`, `2b73308ce5`). Nothing else |

## What the release must do (from the Task)

- RELEASE.md in full: Secret Gate; full release smoke; notes starting with "What you need to do"; the four workflows watched together (Android, iOS/TestFlight, Server Docker, Desktop); `latest*.yml` only after the six server packages; Docker `:beta` moves to the new tag, `:latest` untouched (not a stable); an annotated tag whose release commit is in `personal`; a published tag is never moved or deleted.
- Before cutting: check the Apple developer agreement status (beta.7's first attempt failed macOS notarization on a missing agreement).
- **Grok rule, this release only:** the founder's standing word "Waive grok if no usage limit anymore" covers a Grok smoke case failing **solely** on a usage limit. Any other failure, or any other runtime, needs his own new words: ask him directly; no waiver by the PM.
- Release notes, "What you need to do" first, from the tickets' `release-notes.md` (483: `tickets/done/shell-command-time-limits-483/release-notes.md`; 458: `tickets/done/phone-run-model-runtime-458/release-notes.md`; 448: its ticket folder), and the Task's points:
  - (a) nothing to do for the 483 and 458 features; a restart for the app/node update as usual; the phone screens come from the node, but check the new APK/TestFlight build as the workflows publish it;
  - (b) the 448 notice and the first update into beta.9: state what is true. **Read by the Solution Designer** (`git diff 4cbf9e7881 e479be4539 -- autobyteus-server-ts/src/restart-resume/busy-run-record.ts`): the record is written by the running (old) version; beta.8 records only mid-turn runs and writes no `shutdownAt` and no `backgroundTasks`; beta.9 reads such a record with `backgroundTasks: false`, `shutdownAt: null`. So after the first update into beta.9, agents that were idle with a running background task are **not** told (beta.8 never recorded them), and mid-turn runs are resumed from beta.8's record; please check how beta.9 words the notice for a record with `shutdownAt: null` (the restart-cause logic treats a missing `shutdownAt` like an unexpected stop?) and write the true sentence. From the update after beta.9 the full notice applies;
  - (c) phone Settings for runtime and model: a model with no usage left is not marked (dropped by the founder).
- Done when (Task): pre-release published; four workflows succeeded; 23 assets as for beta.8; order rules held; Docker `:beta` moved, `:latest` unchanged; annotated tag, release commit in `personal`; archive and a record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/`; no worktree, branch or tmp left (remote release branch too); the report to the Solution Designer with the verification commands. Follow-ups become Tasks through the PM.
