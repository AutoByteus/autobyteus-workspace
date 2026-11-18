# Delivery / Release / Deployment Report — beta-release-v1.5.12-beta.1 (autobyteus-383)

## Release / Publication / Deployment Scope

- **Release Requested:** the next beta after stable `v1.5.11` (`next-beta` → `1.5.12-beta.1`). The work is already merged; there is no software change. The handoff is `handoff.md`, from the Solution Designer, 2026-11-04 (the user: "let's release a beta version, I forgot to say").
- **Released** as `v1.5.12-beta.1` from `origin/personal` `d09985c561` (release commit `f10c45aab8`), on 2026-11-05.
  - First-parent merges since `v1.5.11`: autobyteus-381, remove-read-media-file-381 (`7cc4961b39`, code only, no user-visible change); autobyteus-384, list-projects-workspaces-384 (`d09985c561`: `list_projects` returns each Project's linked folders); and these records (`1964ce9874`).
  - **How this release was carried out:** the first attempt on 2026-11-04 (on `1964ce9874`) stopped before tagging. Its build-only run `41853372496` had Linux x64, Linux ARM64 and Windows succeed, but both macOS jobs were cancelled by GitHub: "The job was not acquired by Runner of type hosted even after multiple attempts" (macOS arm64 capacity constraints). No tag was made and these sections were left as placeholders.
  - The first attempt's pre-tag log and smoke summary were never committed. They are kept as `evidence/ATTEMPT1-REL-01-pretag-checks.log` and `evidence/ATTEMPT1-REL-02-release-smoke.log`. Codex 0/3 was refused by quota. Grok 2/3: "different same-named skill" failed on the fallback `grok-4.5`, because the agent searched with grep/list_dir/read_file instead of using the skill. The user waived both on 2026-11-04 ("waive for both"). On 2026-11-05, Grok passed 3/3 on the same `grok-4.5`.
  - On 2026-11-05 the user asked for a beta for autobyteus-384 (its DEC-004). The delivery engineer cut this version from the tip that holds both tickets, which fulfils autobyteus-383's request. The sections below record that run.
- Docs sync, handoff summary and Verify From Evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- `RELEASE.md`, read from `origin/personal`. Deviations: none, unless recorded below. Proposed fixes: `None`.

## Checks Before Tagging

On `d09985c561` (the merged `personal` tip):

| Check | Result | Evidence |
| --- | --- | --- |
| `check_licensing.py` | `Licensing is consistent.` | — |
| `check_repository_artifact_hygiene.py` | passed | — |
| `check_secrets.sh v1.5.11..HEAD` | PASS | — |
| `release_smoke.py` (no overrides) | **FAIL, exit 1: 10 of 13 PASS.** Claude 3/3, Grok 3/3 (on `grok-4.5`: "pinned grok-4.7 not offered"), Antigravity 2/2 and AutoByteus 2/2 pass. Codex 3/3 refused by the account's usage limit: "You've hit your usage limit … try again at Nov 10th, 2026". **Codex waived by the user** | `evidence/REL-01-release-smoke.txt` |
| Build-only release run `41980791585` (`pnpm release:test --ref personal`) | `success`: 5 of 5 desktop builds, macOS included; publish `skipped` | — |
| Beta notes with a user action | none: no `release-notes.md` changed since `v1.5.11` has a `## What you need to do` section, so the generated notes stand alone | `git log --merges --first-parent v1.5.11..HEAD`; grep |

- **Codex waiver, the user's words, 2026-11-05:** "waive please for the beta". Cause (Rule 9): a provider quota refusal on the user's ChatGPT account, not a product failure. Neither ticket in the release touches Codex specifically.

## Release

- **Version and tag:**
  - `python3 scripts/release_versions.py next-beta` → `1.5.12-beta.1`;
  - `scripts/desktop-release.sh beta --branch finalize/list-projects-workspaces-384 --no-push` → `f10c45aab8` and annotated tag `v1.5.12-beta.1`.
- **Push:** Secret Gate `d09985c561..HEAD` passed. `origin/personal` was unchanged, so I pushed `d09985c561..f10c45aab8` and the tag.
- **Workflows,** watched together:

  | Workflow | Run | Result | Time (UTC) |
  | --- | --- | --- | --- |
  | Desktop Release | `41987163326` | success | 07:25:42 → 07:51:35 |
  | Server Docker Release | `41987163362` | success | 07:25:42 → 08:18:45 |
  | Android APK Release | `41987163517` | success | 07:25:42 → 07:31:28 |
  | iOS App Store Connect Release | `41987163577` | success | 07:25:42 → 07:40:36 |

- **GitHub:** pre-release `v1.5.12-beta.1`, not a draft, **23 of 23 assets**: the desktop set, the Android APK and its `.sha256`, the four `latest*.yml`, and the signed server packages `autobyteus-server-1.5.12-beta.1-linux-{x64,arm64}.{tar.gz,json,json.sig}`. GitHub Latest stays `v1.5.11`.
- **Docker Hub:** `:1.5.12-beta.1` and `:beta` share digest `sha256:58bbad0e5671dd38…`, for amd64 and arm64. `:latest` is unchanged on `1.5.11` (`sha256:28042aca8bc7818d…`).
- **Notes:** GitHub-generated; no user-action section (see Checks).
- **Result:** `Completed`.

## Repository Finalization And Cleanup

- The records (this folder) were merged to `personal` on 2026-11-04 as `1964ce9874`, before the first attempt. This completion is committed on top of the release commit.
- The first attempt's worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-v1.5.12-beta.1` and its local branches are removed once they are confirmed clean and contained in `origin/personal`.

## What The User Should Check After Updating

- Users on stable `v1.5.11` have the restart-resume recorder, so an update from `v1.5.11` to this beta is the **first** that resumes busy agents by itself: each continues with one note that the app restarted.
- With **Receive beta updates** on, the app is offered this beta. With **Update automatically** also on, it downloads, installs and restarts by itself (on macOS about half a minute after the download). Docker nodes whose own switch is on follow the desktop to this version.
- The app shows the beta's version in Settings → Updates.

## Rollback Criteria

- Never move or delete a published tag; fix forward with the next beta.
- A beta never becomes "Latest". `:latest` stays on `1.5.11`. Turning beta updates off waits for the next newer stable; desktop updates never downgrade.

## Final Status

- Release: `Completed`. All four workflows succeeded, the release has 23 of 23 assets, and Docker `:beta` moved.
- Codex: waived by the user for this beta (quota until 2026-11-10).
- autobyteus-383's request is fulfilled by this release; the Solution Designer is told.
