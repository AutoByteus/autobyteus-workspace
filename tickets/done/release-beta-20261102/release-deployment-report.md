# Release Report — beta v1.5.11-beta.11 (release-beta-20261102)

## Result: Completed (tagged, all four workflows succeeded, 23 of 23 assets, GitHub pre-release)

## Release Decision
- `Beta`, requested by the user through the Solution Designer ("let delivery engineer release a new beta"). Version `v1.5.11-beta.11` (`python3 scripts/release_versions.py next-beta`; previous `v1.5.11-beta.10`).
- Grok waived in the release smoke check by the user (see Checks).

## Project Release Guide
- `RELEASE.md` on `origin/personal` @ `1df12d475a` (23-asset table, per-runtime smoke models, beta user-action notes, DESIGN.md rule 12 pointer). Deviations: none. The build-only run was done on `personal` as the guide asks.

## Contents
- 184 commits since `v1.5.11-beta.10`; the tickets merged since: autobyteus-318 (test and tooling hygiene), autobyteus-358 (large runs load less), autobyteus-97 (delegated copy runs in its Task's Project folder), autobyteus-348 (agent runtime switch for Team members, Org members and delegated copies), autobyteus-366 (focused agent settings), autobyteus-363 (Manage Nodes), clean-runner-build-order (the fix that unblocked this beta).

## First attempt (blocked, nothing published)
- On `personal` @ `84ea944ac5` the build-only desktop run `41416112093` failed all five jobs in `pnpm typecheck` (about 392 `TS2307` errors): autobyteus-318's cross-package type project reads `autobyteus-ts` from an untracked `dist/` that the gate's prepare step did not build. Fixed by the ticket `clean-runner-build-order` (merged `5d9eb4391f`), which also added DESIGN.md rule 12. No tag, no version number used.

## Checks before tagging (merged `personal` @ `1df12d475a`, clean worktree, frozen install, `prebuild`)
| Check | Result |
| --- | --- |
| `check_licensing.py`, `check_repository_artifact_hygiene.py` | pass |
| `scripts/check_secrets.sh v1.5.11-beta.10..HEAD` (184 commits) | PASS |
| `python3 scripts/release_smoke.py` | 12 of 13 PASS; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`; Grok brand-new team member FAIL (see below) |
| Build-only desktop run `pnpm release:test --ref personal` (run 41433118603, head `1df12d475a`) | all five jobs success; macOS ARM64 was cancelled once (`The job was not acquired by Runner of type hosted`, GitHub macOS capacity) and passed on a rerun of the failed job |

## Grok waiver
- The failing scenario: `grok · brand-new team member`, `AssertionError: expected 'The user wants me to use the link-pro…' to contain 'LINKCODE-…'`. The member read a skill and replied with `OWNCODE-…` (the workspace-owned skill's code) after several `grep`/`run_bash` calls, instead of the configured skill's `LINKCODE-…`.
- Judgement: model behavior, not product code. No Grok or skill file changed in `autobyteus-server-ts/src` since `v1.5.11-beta.10`; the same scenario passed in a full 13 of 13 run on `84ea944ac5` earlier the same day; run in isolation once on this head it passed. A second isolated run could not reach the check: `Rate limited … subscription:free-usage-exhausted … tokens (actual/limit): 601696/600000` (Grok's free tier, 600k per rolling 24 hours). Not proven benign by a repeat.
- The user explicitly waived Grok for this beta ("i waive grok for this beta", 2026-11-02), the exception `RELEASE.md` allows. Recorded here.

## Cutting the release
- `bash scripts/desktop-release.sh beta --branch finalize/release-beta-11 --no-push`: release commit `4c6a59ff61` (`autobyteus-web/package.json` to `1.5.11-beta.11`), annotated tag `v1.5.11-beta.11`; `origin/personal` was still `1df12d475a`; pushed `1df12d475a..4c6a59ff61` to `personal`, then the tag.

## Rollout (tag push 2026-11-02)
| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 41440179963 | success |
| iOS App Store Connect Release | 41440180048 | success |
| Desktop Release | 41440180030 | success (all five build jobs) |
| Server Docker Release | 41440179962 | success (image, then both server packages) |

- Published assets checked against the guide's table: `gh release view v1.5.11-beta.11`: pre-release `true`, not a draft, 23 assets: Android APK and `.sha256`; Linux x64 and ARM64 AppImages; macOS ARM64 and x64 `.dmg`, `.zip` and their blockmaps; Windows `.exe`; `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`; the signed server package per architecture (`autobyteus-server-1.5.11-beta.11-linux-<x64|arm64>.tar.gz`, `.json`, `.json.sig`). The Docker image `autobyteus/autobyteus-server:1.5.11-beta.11` was published by the Docker workflow (success); not pulled.

## Beta notes
- GitHub generated notes, with one added section at the top, "For API clients", on the autobyteus-348 GraphQL clean cut (`updateStoppedAgentRunSelection`, `updateStoppedTeamRunSelections`, `selectionPatches`, `runtimeKind` required; old names gone), as the Solution Designer asked. No "What you need to do" section: none of the tickets since beta.10 has one. Edited with `gh release edit --notes-file` after all workflows succeeded; the assets did not change (still 23).

## Release-run observations
- The macOS Intel job of the build-only run on the fix branch failed twice earlier (Apple staple `Error 68`, `NSURLErrorDomain Code=-1005`); on this release's tag run and on the `personal` build-only run it passed. FU-4 (the retry pattern does not cover it) is a Task, not part of this release.
- GitHub's macOS runner capacity cancelled one job once, in the `personal` build-only run.

## Rollback
- Desktop updates never downgrade; revert on `personal` and cut a new beta. `:beta` on Docker only moves forward (pin `1.5.11-beta.10` to go back). The autobyteus-348 runtime switch leaves `runtime_switch` segments in switched runs' raw traces; how an older build reads them was not tested.

## Final Status
- Release complete: `Yes` (all four workflows succeeded; assets complete). Repository: release commit on `personal`. Cleanup: the release worktree is removed (below).

## Release story moved from RELEASE.md (autobyteus-401, 2026-11-06)

This story was RELEASE.md's case study until the project documents kept rules only; the rules it taught stay in [RELEASE.md](../../../RELEASE.md).

### `v1.5.11-beta.11`: the same gate, widened without its prepare step (2026-11-02)

- **What happened:** the first build-only run for the beta failed all five desktop
  builds in `pnpm typecheck` (about 390 `TS2307` errors). autobyteus-318 had added a
  project to the web type gate that compiles the server's source, which reads
  `autobyteus-ts` and the Prisma client; the gate's prepare step still built only
  `application-sdk-contracts`.
- **Why every earlier check passed:** the tickets before it ran on machines with those
  outputs already built (316, 345 and 348 passed locally).
- **What caught it:** the build-only run, before any tag: nothing was published and no
  version number was used.
- **Rule added from it:** [DESIGN.md](../../../DESIGN.md) rule 12 (the second incident of the
  class, after `v1.5.9-beta.14`).
- **Recovery:** the ticket `clean-runner-build-order` fixes the prepare step; the beta ships after it.
