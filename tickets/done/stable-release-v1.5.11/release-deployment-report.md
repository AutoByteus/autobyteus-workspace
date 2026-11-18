# Delivery / Release / Deployment Report — stable-release-v1.5.11 (autobyteus-375)

## Release / Publication / Deployment Scope

- **Release Requested:** stable `v1.5.11` from beta `v1.5.11-beta.12`. The work is already merged; there is no software change. The handoff is `handoff.md`, from the Solution Designer, 2026-11-02.
- Contents since `v1.5.10` (2026-10-29): 37 ticket merges on `personal`, listed in the notes' sections.
- Docs sync, handoff summary and Verify From Evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- Release guide: `RELEASE.md` read from `origin/personal` @ `c4788d81b5`.
- Deviations from the guide and why: none. The waiver below is the guide's own exception, decided by the user.
- Proposed guide fixes: `None`.

## The User's Decisions

- **Release smoke waiver: Grok.** The user, 2026-11-02, verbatim: "Waive grok please release the stable version". Reason: Grok's free quota was exhausted (`429 … free-usage-exhausted`, rolling 24 h) by the same day's beta smoke checks.
- **No Codex waiver.** Codex must pass.
- **The paid live suites that autobyteus-318 repaired:** not requested, so not run (per the handoff: "Run them only if he says so").

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `python3 scripts/check_licensing.py` | Pass |
| `python3 scripts/check_repository_artifact_hygiene.py` | Pass |
| Secret Gate `v1.5.10..origin/personal` (753 commits) and the ticket branch | Pass (`evidence/REL-01-pretag-checks.log`) |
| Build-only release run `41473349105` on `personal` @ `c4788d81b5` | Pass on attempt 1: all five desktop targets (`evidence/REL-03-build-only-run.log`) |
| Release smoke check `python3 scripts/release_smoke.py` | Claude 3/3, Codex 3/3, Antigravity 2/2 and AutoByteus 2/2 PASS on `3d637b266a`. Grok 0/3, refused for quota and **waived by the user** (`evidence/REL-02-release-smoke.log`) |

## Release Notes

- Curated, user-facing notes: `tickets/done/stable-release-v1.5.11/release-notes.md`, copied by the release script to `.github/release-notes/release-notes.md`.
- They cover the handoff's points:
  - the first update from 1.5.10 does not resume busy agents;
  - update Docker nodes together with the desktop, including reinstalling the launcher once, since 1.5.10 images cannot update in place;
  - GitHub through the Integrations page;
  - the automatic update switch, off by default, with about 36 s on macOS;
  - rollback.
- **Rollback wording differs from the handoff; reported to the Solution Designer.** The only startup migration added since `v1.5.10` is `raw-trace-manifest-runtime-names`, which makes no backup and whose ticket says rolling back works. No vault migration was added in this range; the vault migration and its backups date from 1.5.9. So the notes say:
  - rolling back to 1.5.10 is possible;
  - removed empty never-started runs are not restored;
  - a runtime-switched run has not been tested on 1.5.10.
  They keep the 1.5.10 notes' backup and unsupported-rollback warning for users coming from before 1.5.9.

## Release

- Revision released: **tag `v1.5.11` on the release commit `caa7fb9a4e`** (`chore(release): bump workspace release version to 1.5.11`).
  - It sits on `personal` @ `3d637b266a`: the merge of this ticket's notes and records onto `c4788d81b5`, which is `v1.5.11-beta.12` (`260d4e3fc4`) plus one record commit. No code change since beta.12.
  - The build-only run was on `c4788d81b5`; the smoke check was on `3d637b266a`.
- Method: `bash scripts/desktop-release.sh release 1.5.11 --release-notes tickets/done/stable-release-v1.5.11/release-notes.md --branch finalize/stable-release-v1.5.11 --no-push`.
  - It wrote `.github/release-notes/release-notes.md`, identical to the ticket's notes, and bumped the web version to `1.5.11`.
  - Then the Secret Gate on the release commit (Pass), a fetch confirming `personal` unmoved, `git push origin HEAD:personal` (`3d637b266a..caa7fb9a4e`) and `git push origin v1.5.11` at 16:24:02Z.
- Pipelines (`evidence/REL-04-rollout.log`), watched together:
  - Android APK Release: success.
  - Server Docker Release: success.
  - iOS App Store Connect Release: success on attempt 2. On attempt 1 Build And Test succeeded, but the Archive And Upload job got no hosted runner.
  - Desktop Release: success on attempt 4.
    - Attempt 1 failed stapling Apple's notarization ticket on a network drop (`NSURLErrorDomain -1005`, staple error 68), after the build and signing succeeded.
    - Attempts 2 and 3: macOS ARM64 got no hosted runner; no steps ran.
    - Each was transient per RELEASE.md Recovery: `gh run rerun --failed`, the same tag, no content change.
- **Partial window:** from about 16:40Z to 17:53Z, `v1.5.11` was GitHub "Latest" without the desktop files, so stable desktop installs saw no update during that time.
- Published artifacts:
  - the GitHub release `v1.5.11`: not a draft, not a pre-release, **GitHub "Latest"**, **23 of 23 assets**:
    - macOS ARM64 and x64 `.dmg` and `.zip` with blockmaps;
    - the Linux x64 and ARM64 AppImages, the Windows `.exe`;
    - `latest*.yml` ×4;
    - the Android APK and its `.sha256`;
    - the signed server packages for x64 and arm64.
    The body is the curated notes.
  - Docker Hub: `autobyteus/autobyteus-server:1.5.11`, `:latest` and `:beta` all point to `sha256:28042aca8bc7…` (amd64, arm64). `:1.5.10` is unchanged.
  - The TestFlight upload.
- Release/publication/deployment result: `Completed`.

## Repository Finalization

- Finalization target: `origin` / `personal`.
- Ticket branch `codex/stable-release-v1.5.11` @ `02b07c56bf` (notes, records, archive); Secret Gate passed before the push.
- Merged `--no-ff` on `finalize/stable-release-v1.5.11` → `3d637b266a` (tree = `02b07c56bf`). `personal` was unmoved, so it was pushed: `c4788d81b5..3d637b266a`.
- The release commit `caa7fb9a4e` was pushed with the tag, and the record commit follows.
- Repository finalization status: `Completed`.

## Post-Release Cleanup

- Remote branch `origin/codex/stable-release-v1.5.11`: deleted after this record is pushed (its head is in `personal`).
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1.5.11` and the local `codex/…` and `finalize/…` branches: removed from the main checkout after this record commit is pushed. The results are confirmed in the terminal message.

## What The User Should Check After Updating

- The app shows **1.5.11** (Settings → Updates), and **Update automatically** is off unless turned on.
- Docker nodes: after reinstalling the launcher and `autobyteus-docker upgrade --all`, each node in **Nodes → Manage Nodes** shows server `1.5.11` and no "Not reachable.".
- GitHub, if connected in a 1.5.11 beta: the Integrations page shows it connected after importing `https://github.com/AutoByteus/autobyteus-integrations`.
- The next update after this one is the first in which busy agents continue by themselves.

## Rollback Criteria

- Never move or delete the published tag. Fix forward with `1.5.12`.
- Rolling back to 1.5.10 is possible, with the caveats in the notes. The desktop never downgrades by itself; Docker users pin `:1.5.10`.

## Final Status

- Release complete: `Yes`. Stable `v1.5.11` is GitHub "Latest" with 23 of 23 assets and the curated notes; all four workflows succeeded (iOS on attempt 2, Desktop on attempt 4, all transient); Docker `:1.5.11`, `:latest` and `:beta` point to it.
- Revision released: tag `v1.5.11` → `caa7fb9a4e` (code identical to `v1.5.11-beta.12`).
- Waiver: Grok in the release smoke check, by the user's words.
- Unresolved blocker: `None`.
- Terminal package eligible and sent to the Solution Designer: `Yes`, after this commit and the cleanup.
