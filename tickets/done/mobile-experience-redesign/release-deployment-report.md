# Delivery / Release / Deployment Report — mobile-experience-redesign (autobyteus-277), beta v1.5.12-beta.4

## Scope

- Ticket: autobyteus-277. `task_size` Large, `architectural_risk` High, independent review route.
- Release decision: a new **beta** carrying this ticket. DEC-015, in the user's words: "For this ticket we definitely need to release the new beta, okay?". At delivery the user said: "remove a new beta please waive for codex", read as "release a new beta".
- Final tag: **`v1.5.12-beta.4`** (annotated) on `666b881b52` (`chore(release): bump workspace release version to 1.5.12-beta.4`). The commit changes only `autobyteus-web/package.json` and sits on the merge `562c7a2333`.

## Project Release Guide

- Followed: `RELEASE.md` at `origin/personal` `9e0681bf39` and `562c7a2333`. Its last change is `277660ed19` (autobyteus-401, rules only). It was read in the ticket worktree after integration, not in the main checkout.
- Build-only run: not run. The guide has no per-tag run. The ticket-branch run is required only for a release workflow, packaging, runner or build-step change, and this ticket has none: its only build-input change is the `test:e2e:mobile-shell` script in `autobyteus-web/package.json`. API/E2E's fresh-start build passed (`evidence/api-e2e/round-4/FSB/`).
- Deviations: none. Proposed guide fixes: none.

## Repository Finalization

- Ticket branch `codex/mobile-experience-redesign`, with the Secret Gate (`origin/personal..codex/mobile-experience-redesign`) run first: PASS, 55 commits. Then pushed.
- `finalize/mobile-experience-redesign` from `origin/personal` `9e0681bf39` → `git merge --no-ff` → **`562c7a2333`**. The merged tree equals the ticket tree. The Secret Gate on the merged state passed (56 commits). `origin/personal` was unchanged, then `git push origin HEAD:personal` (`9e0681bf39..562c7a2333`).

## What The Tag Carries

From `git log --merges --first-parent v1.5.12-beta.3..562c7a2333` (`evidence/delivery/release/REL-04-tag-contents.log`):

| Merge | Ticket |
| --- | --- |
| `562c7a2333` | autobyteus-277 mobile-experience-redesign (this ticket) |
| `dc8bee36b6` | autobyteus-402 Docker nodes publish only the Backend and a loopback VNC Viewer port |
| `9d8077fd2a` | autobyteus-401 RELEASE.md and DESIGN.md hold rules only (docs) |
| `0a18802f51` | autobyteus-393 Agent Runtimes: full runtime versions, SemVer precedence |
| `b78fd86fe4` | autobyteus-397 beta.3 records (docs) |
| `45643690ce` | stopped-run-edit-root-check: a registered root follows the saved edit of its stopped host |

## Checks Before Tagging

All run on `562c7a2333` (`evidence/delivery/release/REL-01`, `REL-02`, `REL-02b`):

- `check_licensing.py`: consistent.
- `check_repository_artifact_hygiene.py`: passed.
- `check_secrets.sh v1.5.12-beta.3..HEAD`: PASS, 91 commits. Also PASS on the bump commit.
- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`: exit 0.
- `release_smoke.py`: **7/13**, exit 1.
  - PASS: Claude 3/3, Antigravity 2/2, AutoByteus 2/2.
  - Models: `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`.
  - Codex 0/3: refused by the account quota ("You've hit your usage limit … try again at Nov 10th, 2026 10:31 AM").
  - Grok 0/3: refused by the free-tier quota ("429 … subscription:free-usage-exhausted … grok-4.7 … rolling 24-hour window").
  - Neither is a code failure.
  - **Waivers, in the user's words verbatim:**
    - Codex: "remove a new beta please waive for codex".
    - Grok: "Waive Grok too".
    - Scope: Codex and Grok, `v1.5.12-beta.4` only.

## Version / Tag

- `release_versions.py next-beta` → `1.5.12-beta.4`. The tag did not exist on the remote before.
- The untracked SDK `dist/` folders were deleted, so the tree was clean. Then `bash scripts/desktop-release.sh beta --branch finalize/mobile-experience-redesign --no-push` → `666b881b52` and the tag.
- `personal` was fetched again (still `562c7a2333`). Then `git push origin HEAD:personal` and `git push origin v1.5.12-beta.4`, at 16:46:42 UTC.

## Release / Publication

- Applicable: `Yes`. Method: `Project Release Guide`.
- Pipelines (`evidence/delivery/release/REL-05-rollout.log`) were watched together and stopped on the first failure:

| Workflow | Run | Result | Finished (UTC) |
| --- | --- | --- | --- |
| Desktop Release | `42255525999` | success | 17:15:52 |
| Android APK Release | `42255526138` | success | 16:53:10 |
| iOS App Store Connect Release | `42255526027` | success, attempt 2 | 17:25:54 |
| Server Docker Release | `42255526224` | success | 17:47:44 |

- **Failed job triage:**
  - Job: iOS attempt 1, "Archive And Upload To App Store Connect", cancelled at 17:20:31. No step ran.
  - Log line: annotation "The job was not acquired by Runner of type hosted even after multiple attempts", plus "Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times".
  - Classification: **the platform's** (the guide names this message).
  - Action: `gh run rerun 42255526027 --failed`.
  - Result: attempt 2 succeeded. No version was used up.
- Published:
  - GitHub release `v1.5.12-beta.4`: pre-release, not a draft, **23/23 assets**. GitHub "Latest" is still `v1.5.11`.
  - Docker Hub `autobyteus/autobyteus-server`:
    - `:1.5.12-beta.4` = `sha256:69e9c09535fa…`
    - `:beta` moved to the same digest (17:39 UTC)
    - `:latest` is unchanged: `sha256:28042aca8bc7…` (`v1.5.11`)
- **Beta notes with a user action:**
  - After all four workflows succeeded, `## What you need to do` was put above the generated notes with `gh release edit --notes-file`. The tag and assets did not change.
  - Tickets used: autobyteus-277 (update the node; on Android 15 and later install the APK) and autobyteus-402 (reinstall the Docker launcher, then `upgrade --all`). The others have no section.
  - The 277 APK line was corrected before publishing: the keyboard fix comes from the node, not the APK. The ticket's `release-notes.md` was corrected to match.
- Result: `Completed`.

## User Checks (Open, On The Beta)

- The user chose to check on the beta. His desktop auto-updated to `beta.4`.
- At his request, delivery installed the release APK on his phone (Xiaomi Civi 5 Pro, Android 16):
  - the checksum matched the published `.sha256` (`73dccf44…4867`);
  - `adb install -r` over `1.4.90` kept the app's data;
  - the phone now reports `versionName=1.5.12-beta.4`, `versionCode=10051204`.
- Open checks, the user's:
  - QR-003: 2 s over Tailscale with his history;
  - AC-005: the screens on his phone;
  - AC-010 and AC-011: on his device.
- A problem he finds is fixed forward in the next beta.

## Rollback

- No stored data changes, so rollback is possible. Desktop updates never downgrade. Docker users pin an earlier tag. The Android APK can be reinstalled from an earlier release, after uninstalling the app, because Android refuses a downgrade.

## Cleanup

- After the records merge: the ticket worktree is removed, and the local branches `codex/mobile-experience-redesign`, `finalize/mobile-experience-redesign` and `codex/mobile-experience-redesign-release-records` are deleted. The remote ticket branch `codex/mobile-experience-redesign` is deleted once confirmed merged. The temporary evidence and APK folders are deleted.
