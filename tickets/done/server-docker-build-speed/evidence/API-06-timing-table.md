# API-06 Before/After Timing Table (AC-001)

- Case: API-06. Commit under test: `31dfe3dad0` (workflow from `1b113a8313`).
- Source: GitHub's own run record, `gh run view <run-id> --json jobs,createdAt` (new runs, beta.8) and `gh api repos/AutoByteus/autobyteus-workspace/actions/runs/44123354990/attempts/<n>/jobs` (beta.9, per attempt). Durations from `startedAt`/`completedAt`, computed by a helper script (`timings.py`, not committed). Raw JSON: `API-02-run-44148955212-jobs.json`, `API-08-run-44149091734-jobs.json`.
- Date: 2026-11-17. Runner images: `ubuntu-latest` = `ubuntu-26.04` in beta.8 and in the new runs (same image), arm64 leg `ubuntu-24.04-arm`.

## Whole run

"Six files ready" = the last package job's signed files. For a release, the upload adds about 11-13 s (beta.8's upload step). The wait for the GitHub release is excluded, as REQ-001 says.

| Run | Workflow | Start → six files ready | Status |
| --- | --- | --- | --- |
| beta.8 `44047761247` (tag push) | old | 39m00s (08:33:31 → 09:12:31, includes 3 s wait + 13 s upload) | success |
| beta.9 `44123354990` attempt 1 (tag push) | old | not reached: build step ran 1h54m36s (16:16:24 → 18:11:00), then the run was cancelled at 18:12:03 | cancelled |
| beta.9 `44123354990` attempt 2 | old | not reached at 18:47:44Z: build step running since 18:16:17 (31m27s); version tag `1.5.13-beta.9` pushed 18:44:08 | in progress (see the final status row below) |
| **build-only `44148955212` (default)** | **new** | **9m52s** (18:32:29 → 18:42:21; wait and upload skipped) | **success** |
| build-only `44149091734` (zh, no packages) | new | 7m36s to the end of Publish Server Image (18:33:15 → 18:40:51) | success |

AC-001 limit: ≤ 30 min. Result: 9m52s (about 10m05s with a release's upload).

## Critical path, job by job

| Stage | beta.8 `44047761247` (old) | build-only `44148955212` (new) |
| --- | --- | --- |
| Resolve Release Metadata | 0m02s | 0m03s |
| Build (old: one job, both arches; new: two legs in parallel) | 31m42s | amd64 7m59s ‖ arm64 7m48s |
| Publish Server Image (new job: dry-run check) | — (inside the build job) | 0m18s |
| Publish Server Package (slowest leg) | 7m09s (arm64) | 1m23s (arm64) |
| **Total** | **39m00s** | **9m52s** |

## Build steps

| Step | beta.8 (one job) | new amd64 leg | new arm64 leg (native) | new zh amd64 | new zh arm64 |
| --- | --- | --- | --- | --- | --- |
| Checkout workspace | 1m00s (full history; git fetch 34 s) | 2m29s (depth 1; git fetch 2m03s) | 2m11s (git fetch 1m50s) | (git fetch 2m15s) | (git fetch 1m59s) |
| Free runner disk space (old) / when low (new) | 1m47s | 0m00s (79 GB free, skipped cleanup) | 0m00s (98 GB free) | 0m00s (83 GB) | 0m00s (98 GB) |
| Set up QEMU | 0m04s | removed | removed | removed | removed |
| Set up Docker Buildx | 0m04s | 0m15s | 0m09s | — | — |
| Build and push (old: both arches emulated + GHA cache export; new: one arch, push by digest, no cache) | 27m20s | 4m25s | **4m14s** | 3m42s | 3m56s |
| Move beta tag (old: in build job; new: in Publish Server Image, skipped in build-only) | 0m03s | skipped | — | — | — |
| Post Set up Docker Buildx | 1m12s | 0m42s | 1m01s | — | — |
| Job total | 31m42s | 7m59s | 7m48s | 7m06s | 6m53s |

U-001 / ASM-001: the native arm64 build-and-push takes 4m14s (default) and 3m56s (zh), the same as amd64 (4m25s, 3m42s). Under QEMU in beta.8 the two-architecture step took 27m20s. beta.9 attempt 1 hit 1h54m36s and was cancelled.

## Package job steps (per leg)

| Step | beta.8 amd64 | beta.8 arm64 | new amd64 | new arm64 |
| --- | --- | --- | --- | --- |
| Checkout (old: full; new: sparse, blob:none, depth 1) | 2m19s | 2m50s | 0m02s | 0m02s |
| Free runner disk space (old) / when low (new) | 1m37s | 2m39s | 0m00s (88 GB free) | 0m00s (88 GB free) |
| Extract the built-in server package | 0m58s | 0m46s | 0m58s | 1m03s |
| Archive, describe and sign | 0m25s | 0m23s | 0m16s | 0m12s |
| Wait for the GitHub release | 0m01s | 0m03s | skipped (build-only) | skipped (build-only) |
| Upload | 0m11s | 0m13s | skipped (build-only) | skipped (build-only) |
| Job total | 5m38s | 7m09s | 1m21s | 1m23s |

## Observation (non-blocking)

The build legs' depth-1 checkout (`fetch-depth: 1`) is slower than beta.8's full-history checkout. Its `git fetch --depth=1` took 1m50s-2m15s in all four legs; beta.8's full fetch took 34 s. Likely cause (not proven here): a shallow fetch of one commit gets a pack GitHub builds for that request, while a full fetch can be served from GitHub's prepared packs. This adds about 1.5 min to each build leg, on the critical path. It does not threaten AC-001 (9m52s against 30 min). It is recorded in the execution report as OBS-1 for the Solution Designer to weigh; nothing in this ticket depends on it.

## beta.9 status when the report was finalized

At 2026-11-17T19:10:37Z, run 44123354990 attempt 2 (old workflow) was still `in_progress`: "Build and push default multi-arch image" had run since 18:16:17Z (54m20s). The version tag `1.5.13-beta.9` was pushed at 18:44:08Z (Docker Hub `last_updated`), so the step had spent the 26 minutes since then after the push, presumably exporting the GHA layer cache (not read from its log, which is not available while the run is in progress). `Move beta tag` and both package jobs had not started. The beta.9 run is out of this ticket's scope (requirements: Out Of Scope), so this table does not wait for it.
