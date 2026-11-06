# Delivery / Release / Deployment Report — beta-release-v1.5.12-beta.2 (autobyteus-389)

## Release / Publication / Deployment Scope

- **Release Requested** by the Solution Designer (`handoff-release.md`). The user, 2026-11-06: "please release a new beta". The work was already merged, with no software change.
- **Released:** `v1.5.12-beta.2` from `origin/personal` `e00581d485`, release commit `4500e7278d`, on 2026-11-06.
- **Contents since `v1.5.12-beta.1`** (`git log --merges --first-parent v1.5.12-beta.1..e00581d485`): autobyteus-385, workspace-tree-vs-chooser (merge `8142ba8116`):
  - the left panel's View menu with Runs, Workspaces (the default) and Projects;
  - the Runs view newest first, with delegated work nested;
  - the chat folder chooser's Remove.
  - The other commits are records only.
- Docs sync, handoff summary and Verify From Evidence don't apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- `RELEASE.md` read from `origin/personal` (last changed then by `2e0d7e8303`). Deviations: `None`.
- **Guide changes made after this release, decided by the user (2026-11-06):**
  - no build-only run before every tag;
  - the build-only run moves to the ticket branch, for runner-only and build/gate changes;
  - triage of every pipeline failure in Recovery;
  - a case study.

  These were reconciled with what autobyteus-390 had since put on `personal`, and committed with this record (see Guide Reconciliation).

## Checks Before Tagging (on `e00581d485`)

| Check | Result | Evidence |
| --- | --- | --- |
| `check_licensing.py` | `Licensing is consistent.` | — |
| `check_repository_artifact_hygiene.py` | passed | — |
| `check_secrets.sh v1.5.12-beta.1..HEAD` | PASS | — |
| `release_smoke.py` (no overrides) | **FAIL, exit 1: 10 of 13 PASS.** Claude 3/3, Grok 3/3 (on `grok-4.5`: "pinned grok-4.7 not offered"), Antigravity 2/2 and AutoByteus 2/2 pass. Codex 3/3 refused by the account's usage limit: "You've hit your usage limit … try again at Nov 10th, 2026". **Codex waived by the user** | `evidence/REL-01-release-smoke.txt` |
| Build-only release run `42157390815` (`pnpm release:test --ref personal`), required by the guide at the time | `success` after one rerun of macOS Intel x64 (attempt 2); publish `skipped` | — |
| Beta notes with a user action | none: autobyteus-385 has no `## What you need to do` section, so the generated notes stand alone | — |

- **Codex waiver, the user's words, 2026-11-06:** "waive Codex". It was asked for this beta specifically; the beta.1 waiver did not carry over. Cause: a provider quota refusal on the user's ChatGPT account, not a product failure. autobyteus-385 does not touch Codex.

### Failed Jobs

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| build-only `42157390815`, Build macOS Intel x64 (attempt 1) | `Platform` | after `[typecheck] PASS` and packaging: `Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost." … api.apple-cloudkit.com …`, then `The staple and validate action failed! Error 68.` | `gh run rerun 42157390815 --failed` after the run completed | attempt 2: `success`, all five builds green |

- The user, on this failure: "sometimes apple server has some issue, but if you trigger the job again, it might pass".
- Observation: the workflow's retry wrapper covers notarytool and offline errors, but not a stapling network error. A rerun of the failed job is the recovery.

## Release

- **Version and tag:**
  - `python3 scripts/release_versions.py next-beta` → `1.5.12-beta.2`;
  - `scripts/desktop-release.sh beta --branch finalize/beta-release-v1.5.12-beta.2 --no-push` → `4500e7278d` and annotated tag `v1.5.12-beta.2`.
- **Push:** Secret Gate `e00581d485..HEAD` passed. `origin/personal` was unchanged, so I pushed `e00581d485..4500e7278d` and the tag.
- **Workflows,** all first attempt, all `success`:

  | Workflow | Run | Time (UTC) |
  | --- | --- | --- |
  | Desktop Release | `42163291155` | 04:34:17 → 05:02:02 |
  | Server Docker Release | `42163291193` | 04:34:17 → 05:30:49 |
  | Android APK Release | `42163291162` | 04:34:17 → 04:40:33 |
  | iOS App Store Connect Release | `42163291204` | 04:34:17 → 04:51:40 |

- **Published artifacts:**
  - GitHub pre-release `v1.5.12-beta.2`, not a draft, published 04:40:24Z, **23 of 23 assets**. GitHub Latest stays `v1.5.11`.
  - Docker Hub: `:1.5.12-beta.2` and `:beta` share digest `sha256:05d569c3a434…`, for amd64 and arm64; `:beta` was pushed at 05:23:29Z. `:latest` is unchanged on 1.5.11 (`sha256:28042aca8bc7…`).
- **Result:** `Completed`.
- **Notes:** GitHub-generated.
- **The user's Docker nodes** (`autobyteus-server-0`, `-1`, `-2`) were not touched. He updates them himself; the new `:beta` is published.

## Guide Reconciliation (the three unpushed doc commits)

The finalize branch held three local doc commits (`f9adfbd538`, `fb40d10ced`, `456e4b829a`). They were never pushed. Meanwhile autobyteus-390 put TESTING.md's "Fresh-start build" section (`1063e5d89d`) and RELEASE.md changes (`d6bcff577b`) on `personal`. I rebuilt them on the current `personal` instead of merging:

| Commit | Decision | Why |
| --- | --- | --- |
| `f9adfbd538` TESTING.md "Fresh-start build proof" | **Dropped** | `personal`'s "Fresh-start build" section covers it and goes further: the objective changed-path trigger, the runner's exact build command and verify steps, and "a change to a build step or gate" also needs the ticket-branch run |
| `fb40d10ced` RELEASE.md, no per-tag build-only run | **Re-applied into `personal`'s section** | `personal` still had "Before every tag … run the desktop release workflow build-only", plus 390's "Why this run stays before every tag: … not the Windows and Linux builds". 390 wrote that without the user's decision of the same morning, which was never pushed. Kept 390's "Local builds are never signed"; replaced "why it stays" with the user's decision and the accepted Windows/Linux trade-off; the ticket-branch run is kept for runner-only and build/gate changes |
| `456e4b829a` RELEASE.md triage in Recovery | **Re-applied** | not on `personal`. Aligned with the team skill (autobyteus-agents-88): "Unclear: one rerun decides; a second identical failure is ours", and on a release request "ours" goes through the Solution Designer |

- The new case study, "The per-tag build-only run moved to the ticket (2026-11-06)", records why and how the rule came about.
- TESTING.md and DESIGN.md are unchanged. DESIGN.md's design case, which says the failure "is seen only at the build-only release run or, worse, after the tag", stays accurate.

## Rollback Criteria

- Never move or delete a published tag; fix forward with the next beta. A beta never becomes Latest; desktop updates never downgrade.

## Post-Release Cleanup

- The beta.2 worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-v1.5.12-beta.2` and the local branches `finalize/beta-release-v1.5.12-beta.2`, `codex/beta-release-v1.5.12-beta.2` and `codex/beta-release-v1.5.12-beta.2-records` are removed after this record is pushed. `/tmp/ab389` is removed.
- Not touched, because they aren't this delivery's: the `release-v1.5.12-beta.3` worktree and branch (the mobile team's delivery), and the isolated instance `iso-64731-40ef`, which this delivery did not start.
- The three original local doc commits are superseded by the reconciled commit; they existed only on the local finalize branch.

## Final Status

- Release: `Completed` (4/4 workflows, 23/23 assets, Docker `:beta` moved).
- Codex: waived by the user for this beta.
- Guide changes: reconciled and on `personal`.
- Cleanup: `Completed` after the push.
- Terminal package to the Solution Designer: `Delivery Completed`.
