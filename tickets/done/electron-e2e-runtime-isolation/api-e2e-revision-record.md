# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`; `code-review-report.md`; API/E2E round 1 | `SR-003`, `ARCH-REV-003`, `IR-003`, `CRR-003` | N/A | Pass / 96.7% |

## Revision Entries

### API-REV-001 — Exact-artifact isolation and live Classroom baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/code-review-report.md`; round 1.
- Triggering finding or scenario IDs: Source review `CRR-003` Pass; `E2E-PROD-OBS-001`, `E2E-PKG-001` through `E2E-PKG-005`, and user-authorized `E2E-LIVE-006`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-003`, `ARCH-REV-003`, `IR-003`, `CRR-003`; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result. It establishes actual repository, native packaged, lifecycle, Playwright Electron, environment/provisioning and live user-journey evidence without inferring a prior result.
- Coverage decisions or durable test paths changed:
  - Added `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs`.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/package.json` with `test:e2e:electron:isolation`.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/autobyteus-web/electron/server/__tests__/platformServerEnvironment.spec.ts` to skip only under the incompatible Nuxt runner while remaining enabled in authoritative Electron Vitest.
  - Removed no coverage.
- Scenarios added, changed, removed, or rechecked: Added `E2E-PKG-001..005` and temporary `E2E-LIVE-006`; observed production preservation as `E2E-PROD-OBS-001`; rechecked 17 Node lifecycle/support contracts, the full Electron suite, 45 focused renderer tests, the full Nuxt suite, compilation/generation, and native packaging.
- Commands, environment, fixture, or broader-validation delta: Built one macOS arm64 package and reused executable SHA-256 `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`. Ran direct and Playwright Electron, two parallel instances, six raw invalid launches, an owned foreign-port race, and a user-authorized disposable-vault/local-package Classroom Simulation Team journey using AutoByteus `deepseek-v4-flash`. No ordinary app state was reused or modified.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/api-e2e-revision-record.md`
- Prior result and confidence: N/A.
- Current result and confidence: `Pass` / **96.7%**.
- New or remaining failure IDs: None for the ticket. `REG-NUXT-BASELINE` records three unrelated existing failures, not an API/E2E ticket failure.
- Recommended recipient: `/code_reviewer` for proportional review of changed durable coverage before delivery.
- Remaining risks, blocked evidence, or untested scope:
  - Real Windows CIM/`taskkill` behavior was not run because no supported Windows host was available; deterministic creation-identity/PID-reuse contracts passed.
  - E2E correctly suppresses updater side effects, but the renderer displays a non-blocking update-initialization error notice when its updater handler is intentionally absent.
  - Three unrelated full-Nuxt baseline tests still fail; focused changed-boundary renderer tests pass 45/45.
  - Other provider variants and a risky second production-profile launch were intentionally not run.
