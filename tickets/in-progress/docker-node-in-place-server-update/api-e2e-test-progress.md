# API/E2E Test Progress — autobyteus-305, build step 1

My own progress log while tests run. Read it first whenever the run is picked back up.

- Write a `Started` row right before a case begins and a `Completed` row with its result right after it ends, before the next case starts. During a long case, add `Checkpoint` rows.
- Only add rows; never change earlier ones.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` → Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-30T16:12Z | setup | Started | — | `pnpm install`, server prebuild, `nuxt prepare`, server build in the worktree; next API-10 |
| 2026-10-30T16:11Z | setup | Completed | Pass | install/prebuild/nuxt prepare/server build exit 0 |
| 2026-10-30T16:11Z | API-10 | Started | — | prisma-engine-discovery docker probe, image step1 arm64, output evidence/API-10-prisma |
| 2026-10-30T16:15Z | API-10 | Completed | Fail | round 1: API003 'bundled' !== 'cache' (pre-fix baseline precondition is layout-bound; cause evidence/API-10-cause.log); probe updated in its own commit |
| 2026-10-30T16:15Z | API-10 | Started | — | round 2 on 4c356d69b7, output evidence/API-10-prisma |
| 2026-10-30T16:16Z | API-10 | Completed | Pass | round 2 on 4c356d69b7: API002..API005 Pass, cleanup receipt clean |
| 2026-10-30T16:16Z | API-11 | Started | — | nodes-docker-address probe, --docker-image=autobyteus-server-305-test:step1, output evidence/API-11-nodes-docker-address |
| 2026-10-30T16:18Z | API-11 | Completed | Pass | ND-01..ND-05 Pass; imageDistDiff empty; cleanup clean; host IPs redacted |
| 2026-10-30T16:18Z | API-15 | Started | — | amd64 step-1 image start under QEMU, no volumes |
| 2026-10-30T16:19Z | API-15 | Completed | Pass | 0 check failures; container removed |
| 2026-10-30T16:19Z | API-14 | Started | — | PowerShell launcher parse in mcr.microsoft.com/powershell |
| 2026-10-30T16:25Z | API-14 | Completed | Pass | 4 sources parsed in pwsh 7.4.22 (arm64 dotnet/sdk:8.0); control fails as expected; first attempt with a 32-bit arm pwsh image crashed under QEMU, discarded |
| 2026-10-30T16:25Z | API-12 | Started | — | dind launcher upgrade journey (phases A and B); script /private/tmp/ab305-api-e2e/scripts/api12-launcher-upgrade.sh; evidence/API-12-launcher-upgrade.log |
| 2026-10-30T16:30Z | API-12 | Completed | Pass | phases A and B, CHECK FAILURES: 0; dind container, its volume and test root removed |
| 2026-10-30T16:30Z | API-13 | Started | — | compose up --build-local -p ab305-api-compose; evidence/API-13-compose-start.log |
| 2026-10-30T16:37Z | API-13 | Completed | Pass | CHECK FAILURES: 0; project down --volumes --delete-state; autobyteus-server:latest and run-owned images removed |
