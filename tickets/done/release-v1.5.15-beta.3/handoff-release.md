# Release Requested — v1.5.15-beta.3 (Project Task autobyteus-663)

- From: Solution Designer, 2026-11-27 06:40 CET · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the founder's word of 2026-11-27 (read by the PM): "Okay then just do it".
- Release kind: **beta**, version **`v1.5.15-beta.3`** (next after `v1.5.15-beta.2`; the tag exists neither locally nor on `origin`, checked 2026-11-27).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.15-beta.3`
- Branch: `codex/release-v1.5.15-beta.3`
- Base: `origin/personal` @ `80420a8bf6` (fetched 2026-11-27 06:35 CET). First-parent since `v1.5.15-beta.2`: the merges of 652 (`7efe1844b2`), 516 Stage 1 (`1d2e9a7e75`), 657 (`4fee6719c8`), 581 (`72cdfd1d70`) and their records. Use a newer tip if one has landed.
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.15-beta.3/` (this file)
- Pre-check (`git diff --name-only v1.5.15-beta.2..80420a8bf6` outside `tickets/`): **RELEASE.md changed** (the new "Extensions catalog check" gate); **a client-data migration was added**: `autobyteus-web/client-data-migrations/migrations/remove-desktop-voice-input-install/` (the one-time removal of the old built-in Voice Input the notes must name); `autobyteus-server-ts/src/sandboxes/sandbox-docker.ts` (server code, not the Docker image). Confirm the Docker system level with the release guide's check.

## The Task's direction, in its words (follow `RELEASE.md` strictly)

1. Prepare everything that does not need Codex first (base, secret/leak gate, version bump, notes draft, the Extensions catalog check). Run the FULL live `release_smoke.py` (with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`) only AFTER 07:43 local time, so Codex can run. Codex is NOT waived in advance: if Codex fails ONLY on a usage limit even after the reset, STOP and ask the founder, who must give a waiver in his own words, recorded verbatim; any other Codex failure stops and is investigated (TESTING.md Rule 9). The standing Grok usage-limit-only waiver ("Waive grok if no usage limit anymore") applies; every other runtime needs his words.
2. Release notes start with "What you need to do". MUST say, in plain words: updating from v1.5.15-beta.2 is a normal update, EXCEPT that on first start the app removes the OLD built-in Voice Input once; Voice Input is now an extension: open Settings, Extensions, install Voice Input (it downloads about 2 GB), then dictation works again; sandboxes need Docker; login-token mode of the provider relay is off by default and not proven live; keep the older notes for anyone upgrading from earlier versions. Then every user-visible change since beta.2. One Full Changelog line.
3. Build and publish all four workflows together (Desktop pre-release, Docker with :beta moving to the new tag and :latest staying on v1.5.14 at System level 2, Android, iOS TestFlight); latest*.yml after the server packages; never move or delete a published tag.
4. Finalization: record commit on origin/personal; bring the founder's checkout up to date (`git fetch` + `git merge --ff-only`; his uncommitted tracked files untouched; report the line); remove the release worktree, branch and temp files; save the verified record copy under /Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.15-beta.3-<taskId>-20261127/ with checksums.
- Tell the founder what ONLY he can do afterwards: update the app, install Voice Input from Settings, and check dictation; update the iPhone TestFlight build.

Constraints (Task): release only the founder's word above, for this beta only. Never run an app built from personal against his real ~/.autobyteus before the catalog check passes; use isolated instances for tests. The private signing key stays untouched; never open it.

Done when (Task): the beta is published and verified first-hand (tag, pre-release with all assets, notes, four workflows green, Docker :beta digest, TestFlight build, the Extensions catalog check passed again, the live smoke with Codex truly run or the founder's recorded waiver), finalized with the founder's checkout in sync, cleanup done, record copy saved, follow-ups recorded.

## Notes from the Solution Designer

- **Smoke timing:** it is 06:40 CET now; start the live smoke after 07:43 CET. If Codex fails only on a usage limit, or anything else fails that is not Grok's usage limit: report `Blocked` to me with evidence and options and do not tag; I ask the founder and relay his words verbatim.
- **The Extensions catalog check** is a blocker gate: a failure is reported `Blocked`, never waived.
- The macOS in-job signing/notarization retry is still unfixed; the job-level rerun is the known recovery.
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
