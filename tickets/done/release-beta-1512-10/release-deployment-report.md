# Release Report — beta v1.5.12-beta.10

## Result: Completed (tagged, all four workflows succeeded, 23 of 23 assets, GitHub pre-release)

## Release Decision
- `Beta`, requested by the user in the delivery engineer's conversation ("release a new beta; waive for codex if no token limit", 2026-11-09). Version `v1.5.12-beta.10` (`python3 scripts/release_versions.py next-beta`; previous `v1.5.12-beta.9`).
- Codex waived in the release smoke check by the user's instruction, because Codex had no quota (see Checks).

## Project Release Guide
- `RELEASE.md` on `origin/personal` @ `d4a5586376`: pre-tag checks are licensing, hygiene, Secret Gate and the release smoke check; there is no build-only desktop run before a tag any more (the user's decision, v1.5.12-beta.2). Deviations: none.

## Contents
- 12 commits since `v1.5.12-beta.9`: one ticket, autobyteus-440 (`switch-back-eexist`): a run can switch back to Antigravity (Antigravity → another runtime → Antigravity): a new start replaces the capsule of an earlier era or failed start, so the message no longer fails with `EEXIST … agy-project`. This releases the fix for the user's stuck run on node 8001 (a pending switch with an earlier capsule completes at its next message on this version).

## Checks before tagging (merged `personal` @ `d4a5586376`, clean worktree, frozen install, `prebuild`)
| Check | Result |
| --- | --- |
| `check_licensing.py`, `check_repository_artifact_hygiene.py` | pass |
| `scripts/check_secrets.sh v1.5.12-beta.9..HEAD` (12 commits) | PASS |
| `python3 scripts/release_smoke.py` | 10 of 13 PASS: Claude 3 of 3 (haiku), Grok 3 of 3 (`grok-4.5`, pinned `grok-4.7` not offered, the script's fallback), Antigravity 2 of 2, AutoByteus 2 of 2; **Codex 0 of 3: usage limit** |

## Codex waiver
- All three Codex scenarios failed the same way before running anything of ours: `You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again at Nov 10th, 2026 10:31 AM.` (`RUNTIME_ERROR`, `CODEX_TURN_FAILED`). It is the ChatGPT account quota, the case `RELEASE.md` treats like a runtime that cannot run. The user told delivery to waive Codex if there was no token limit left; recorded here as the explicit waiver.
- Codex was last exercised by the release smoke check on the previous beta (see its record), and no Codex-specific file changed in this release (the only change is the Antigravity capsule).

## Cutting the release
- `bash scripts/desktop-release.sh beta --branch finalize/release-beta-1512-10 --no-push`: release commit `97ed263074` (`autobyteus-web/package.json` to `1.5.12-beta.10`), annotated tag `v1.5.12-beta.10`; `origin/personal` was still `d4a5586376`; pushed `d4a5586376..97ed263074` to `personal`, then the tag.

## Rollout (tag push 2026-11-09)
| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 42557024043 | success |
| iOS App Store Connect Release | 42557024033 | success |
| Desktop Release | 42557024006 | success (all five build jobs on the first attempt, then the publish step, which waits for the Docker job's server packages) |
| Server Docker Release | 42557024004 | success (image about 50 minutes, then both server packages) |

- No failed job, so no triage or rerun was needed.
- Assets: `gh release view v1.5.12-beta.10`: pre-release `true`, not a draft, 23 assets: Android APK and `.sha256`; Linux x64 and ARM64 AppImages; macOS ARM64 and x64 `.dmg`, `.zip` and blockmaps; Windows `.exe`; `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`; the signed server package per architecture (`.tar.gz`, `.json`, `.json.sig`). The Docker image `autobyteus/autobyteus-server:1.5.12-beta.10` was published by the Docker workflow (success); not pulled.

## Beta notes
- GitHub generated notes only. No `## What you need to do` section: the one ticket in this release has none.

## Rollback
- Desktop updates never downgrade; revert on `personal` and cut a new beta. `:beta` on Docker only moves forward (pin `1.5.12-beta.9` to go back). Reverting brings back the `EEXIST` failure for a run that returns to Antigravity.

## Final Status
- Release complete: `Yes` (all four workflows succeeded; assets complete). Cleanup: the release worktree and branches are removed (below).
