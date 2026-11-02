# DEL-01 post-integration and build-only checks (delivery, 2026-11-02)

## AC-004: the build-only desktop release run on the pushed ticket branch

- Command: `pnpm release:test --ref codex/clean-runner-build-order`; run `41421050683`, head `a5f4f00ff1` (the branch before the base refresh below); no GitHub release published (`Publish GitHub Release: skipped`).
- Result: all five desktop build jobs `success`: Linux x64, Linux ARM64, Windows x64, macOS ARM64, macOS Intel x64.
- Every job passed `pnpm typecheck` from the runner's bare install (`[typecheck] production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `PASS`). The same run on `personal` @ `84ea944ac5` (run `41416112093`) had failed all five at this step with about 392 production errors.
- The macOS Intel job needed two reruns (`gh run rerun 41421050683 --failed`), for reasons outside this change:
  1. First attempt: signing completed (`[macSign] AutoByteus macOS signing policy completed`), then `Failed to staple your application with code: 68`. The log shows the runner lost its connection to Apple's ticket service (`api.apple-cloudkit.com … NSURLErrorDomain Code=-1005 "The network connection was lost."`).
  2. Rerun 1: cancelled, `The job was not acquired by Runner of type hosted even after multiple attempts` (GitHub macOS capacity).
  3. Rerun 2: the same staple failure and the same `-1005` message.
  4. Rerun 3: success.
  The job's own retry loop does not match `-1005` or the staple error (it retries notarytool failures, "offline", `-1009`, "No network route", "timed out"). Recorded as FU-4. Every earlier build-only and tag run on this job passed (beta.8, 9, 10).

## Integration

`origin/personal` advanced from `84ea944ac5` to `43f3ed791e` (35 commits: autobyteus-363 Manage Nodes, autobyteus-366 focused agent settings; web presentation only) while the run was in progress. Merged into the branch (no conflicts; one overlapping file, `autobyteus-web/package.json`, which gained a test script line). The build chain, workflows and prepare scripts are unchanged by the incoming commits.

| Check on the merged state | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | up to date |
| `pnpm -C autobyteus-web typecheck` | production errors 0; baseline 99 in 43 files unchanged; PASS |
| `pnpm -C autobyteus-server-ts typecheck` | production errors 0; baseline 1185 in 366 files unchanged; PASS |
| `pnpm -C autobyteus-web codegen:check` | `generated/graphql.ts is current.` |
| `check_licensing.py`, `check_repository_artifact_hygiene.py` | pass |
| Secret Gate, merged state | recorded in the release/deployment report |

Why the build-only run is not repeated on the merged state: the incoming commits are web components and a test script, not the build chain; the gates pass on the merged state; and the release itself repeats the build-only run on `personal` before any tag (RELEASE.md).
