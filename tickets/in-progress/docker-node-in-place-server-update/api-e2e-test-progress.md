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

## Round 2 — build step 2 (API-REV-002)

| Time | Case ID | Event | Result | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-30T17:25Z | setup | Started | — | round 2: pnpm install, prebuild, nuxt prepare, server build at 5939cc48be; next API-10 |
| 2026-10-30T17:26Z | setup | Completed | Pass | install/prebuild/nuxt prepare/server build exit 0 at 6637b54d46 (docs-only on top of 5939cc48be) |
| 2026-10-30T17:26Z | API-10 | Started | — | Prisma Docker probe on step2 sha256:50b3211b4b38…; evidence/API-10-step2-prisma |
| 2026-10-30T17:28Z | API-10 | Completed | Pass | API002..API005 Pass; pid from cli.mjs status (105, 109); cleanup clean |
| 2026-10-30T17:28Z | API-11 | Started | — | address probe --docker-image=autobyteus-server-305-test:step2; evidence/API-11-step2-nodes-docker-address |
| 2026-10-30T17:30Z | API-11 | Completed | Pass | ND-01..ND-05 Pass; imageDistDiff empty; cleanup clean; host IPs redacted |
| 2026-10-30T17:30Z | API-14 | Started | — | pwsh parse of 5 launcher sources |
| 2026-10-30T17:31Z | API-14 | Completed | Pass | 5 sources parsed (pwsh 7.4.22); ContainerConfig control fails as expected |
| 2026-10-30T17:31Z | API-12 | Started | — | dind journey phases A-D (API-21 inside A) and E (API-22); script api12-step2-launcher.sh; evidence/API-12-step2-launcher.log |
| 2026-10-30T17:52Z | API-12 | Completed | Pass (A-D) | phases A-D all CHECK PASS; API-21 phone part invalid (fixture: loopback pairing URL refused, REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY); phase E failed: PowerShell new-container Get-UsedPorts bug, pre-existing (evidence/API-22-cause.log) |
| 2026-10-30T17:52Z | API-21/API-22 | Started | — | run 2 on the same dind: phone pairing via private address; PowerShell node created by a patched copy, unpatched launcher for storage/upgrade/destroy; evidence/API-21-22-rerun.log |
| 2026-10-30T17:54Z | API-21/API-22 | Completed | Pass | run 2: CHECK FAILURES: 0; PowerShell new-container bug reproduced, FU-006; dind, its volume, helper images and test root removed |
| 2026-10-30T17:54Z | API-13 | Started | — | compose up --no-build with step2 tagged autobyteus-server:latest; evidence/API-13-step2-compose.log |
| 2026-10-30T17:57Z | API-13 | Completed | Pass | CHECK FAILURES: 0; project removed; autobyteus-server:latest untagged |

## Round 3 — build step 3 (API-REV-003)

| Time | Case ID | Event | Result | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-30T19:36Z | setup | Started | — | throwaway key, built-in package of step3 image, signed test packages (IMP3 harness) under /private/tmp/ab305-api-e2e/s3 |
| 2026-10-30T19:45Z | setup | Completed | Pass | key pair, package A from step3 image (1.5.11-beta.5), packages 1.5.12..1.5.20 signed with the throwaway key |
| 2026-10-30T19:45Z | API-31..API-36 | Started | — | dind journeys phases 1-4; script api3x-launcher-update.sh; evidence/API-3x-launcher-update.log |
| 2026-10-30T20:04Z | API-31..API-36 | Completed | Pass | 69 CHECK PASS; 2 over-strict step-print checks (polling; target and result printed); dind, images, temp root and throwaway key removed |
