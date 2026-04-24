# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/review-report.md`
- Current Validation Round: `2`
- Trigger: `code_reviewer re-review pass after implementation-owned local fix for packaged backend vendor payload/imports`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review-passed validation handoff from `code_reviewer` | N/A | Yes | Fail | No | Live REST/UI checks passed far enough to expose a packaged-app launch blocker in both touched bundled applications. |
| 2 | `code_reviewer` pass after implementation-owned local fix | Yes | No | Pass | Yes | Prior executable failures resolved; live immersive entry, configure, reload, and exit checks now pass for both touched bundled applications. |

## Validation Basis

Validated the review-passed worktree at `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup` against the approved artifact package above.

Round 1 established:
- application resource-configuration REST contract behavior,
- setup-first browser UX and technical-details hiding,
- one-time legacy saved-config migration behavior,
- packaged-app bootstrap failure in both touched applications.

Round 2 rechecked the prior executable failures first, then reran live immersive/runtime checks against the repaired packaged backend payloads. No new repository-resident durable validation was added in this round.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Notes:
- A legacy `launch_defaults_json` row was exercised explicitly in round 1.
- The row was rewritten in place to `launch_profile_json` during readback, and `launch_defaults_json` was cleared, which matches the approved one-time migration direction instead of leaving a permanent dual-path fallback in place.

## Validation Surfaces / Modes

- Live GraphQL/API against a clean local server instance
- Live REST validation against `/rest/applications/...`
- Live browser UI validation against local Nuxt dev server using the in-app browser
- Live bundled-application bootstrap / `backend/ensure-ready` executable checks
- Live immersive entry/configure/reload/exit checks for both touched bundled applications
- Direct SQLite state seeding only for the legacy migration scenario

## Platform / Runtime Targets

- macOS host workspace
- Server: `http://127.0.0.1:8001`
- Web UI: `http://127.0.0.1:3100`
- Temp validation data dir: `/tmp/autobyteus-api-e2e-clean`
- Server DB: `/tmp/autobyteus-api-e2e-clean/db/production.db`

## Lifecycle / Upgrade / Restart / Migration Checks

- Imported the current worktree application packages into a clean temp server registry and removed an accidentally discovered superrepo package root before running authoritative checks.
- Seeded a legacy `launch_defaults_json` record for `lessonTutorTeam` and confirmed readback migrated it into `launch_profile_json` while clearing the legacy column.
- Re-opened application routes after API saves to confirm the setup-first route remained the active owner and did not auto-enter immersive mode on page load.
- Round 2 rechecked `backend/ensure-ready` for both touched bundled applications after the packaged backend vendor/import fix and confirmed each backend reached `state: "ready"`.
- Round 2 reloaded each immersive app surface and observed a new `launchInstanceId` in the iframe URL without surfacing host failure overlays.

## Coverage Matrix

| Scenario ID | Surface | Intent | Latest Round | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `API-001` | GraphQL/import | Import current worktree packages into a clean server and confirm authoritative app IDs | 1 | Pass | `importApplicationPackage` for both worktree `dist/importable-package` roots; `listApplications` returned Brief Studio + Socratic Math Teacher from the worktree package IDs only |
| `API-002` | REST readback | Confirm `resource-configurations` and `available-resources` expose the new launch-profile contract and bundle/shared resource choices | 1 | Pass | `GET /rest/applications/:id/resource-configurations` and `GET /rest/applications/:id/available-resources` for both apps returned `supportedLaunchConfig`, bundle defaults, and shared team options |
| `API-003` | REST save/readback | Save a valid team `launchProfile` with defaults + member override and verify persisted readback | 1 | Pass | `PUT /rest/applications/<brief>/resource-configurations/draftingTeam` returned `200`; subsequent `GET` preserved defaults, workspace root, and writer override |
| `API-004` | REST validation failure | Reject unresolved inherited-model save with HTTP 400 | 1 | Pass | `PUT /rest/applications/<brief>/resource-configurations/draftingTeam` with missing effective writer model returned `400` + expected validation detail |
| `API-005` | Migration | Prove legacy `launch_defaults_json` migrates once into `launchProfile` | 1 | Pass | Seeded `/tmp/autobyteus-api-e2e-clean/applications/bundle-app__socratic-math-teacher__1253b7c46c2ee407ff298dafcc7dd42856461a12741fec8a1a5780fd842348bb/db/platform.sqlite`; readback returned `launchProfile`; DB row then showed populated `launch_profile_json` and `launch_defaults_json = NULL` |
| `UI-001` | Browser/catalog | Confirm catalog stays business-first and hides technical metadata by default | 1 | Pass | `/applications` showed application cards with business summary + setup CTA; no package/local-id/bundle mapping text was surfaced by default |
| `UI-002` | Browser/setup route | Confirm setup route hides technical metadata by default and reveals it only behind the toggle | 1 | Pass | Brief Studio route initially hid `Package`, `Local application id`, and bundle-resource mapping; after clicking `Show technical details`, the page showed those fields and the toggle changed to `Hide technical details` |
| `UI-003` | Browser/setup-first flow | Confirm configured application still loads into setup-first route instead of auto-launching on route entry | 1 | Pass | Opening the Brief Studio route after a valid save stayed on the setup surface with an enabled `Enter application` button and no automatic immersive entry |
| `EXE-001` | Live bundled app bootstrap | Boot Brief Studio backend/iframe host from the packaged app | 2 | Pass | `POST /rest/applications/<brief>/backend/ensure-ready` returned `200` with `state: "ready"`, `ready: true`, and no `lastFailure` |
| `EXE-002` | Live bundled app bootstrap | Boot Socratic Math Teacher backend/iframe host from the packaged app | 2 | Pass | `POST /rest/applications/<socratic>/backend/ensure-ready` returned `200` with `state: "ready"`, `ready: true`, and no `lastFailure` |
| `EXE-003` | Browser/immersive entry | Enter Brief Studio immersive mode successfully after setup | 2 | Pass | Parent page showed `application-immersive-phase`, `application-surface-canvas` at `opacity-100`, one iframe mount, and no loading/failure overlays or initialization error |
| `EXE-004` | Browser/immersive configure+reload+exit | Confirm Brief Studio immersive configure panel, reload, and exit all work | 2 | Pass | Configure drawer surfaced launch setup in `data-presentation="panel"`; reload changed iframe `autobyteusLaunchInstanceId` from `launch-1` to `launch-2` without failure; exit returned to `/applications` catalog |
| `EXE-005` | Browser/immersive entry | Enter Socratic Math Teacher immersive mode successfully after setup | 2 | Pass | Parent page showed `application-immersive-phase`, `application-surface-canvas` at `opacity-100`, one iframe mount, and no loading/failure overlays or initialization error |
| `EXE-006` | Browser/immersive configure+reload+exit | Confirm Socratic immersive configure panel, reload, and exit all work | 2 | Pass | Configure drawer surfaced launch setup in `data-presentation="panel"`; reload changed iframe `autobyteusLaunchInstanceId` from `launch-1` to `launch-2` without failure; exit returned to `/applications` catalog |

## Test Scope

Focused, scenario-driven API/E2E/executable validation only.
No repository-resident durable validation was added or modified by API/E2E in either round.
No new source patches were applied during round 2.

## Validation Setup / Environment

- Clean server instance launched from built server output in session `95709` using temp data dir `/tmp/autobyteus-api-e2e-clean` and SQLite.
- Existing Nuxt dev server was reused in session `11987` at `http://127.0.0.1:3100` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001`.
- Authoritative application package roots imported:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/applications/brief-studio/dist/importable-package`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/applications/socratic-math-teacher/dist/importable-package`
- A Docker-stack attempt was abandoned before authoritative validation because the stack build failed on a missing repo patch file (`/app/patches/repository_prisma@1.0.6.patch`). Validation proceeded on the clean local server instead.

## Tests Implemented Or Updated

- None.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `None`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Round 1 failure screenshot retained for historical evidence: `/Users/normy/.autobyteus/browser-artifacts/7e6f48-1777014539141.png`

## Temporary Validation Methods / Scaffolding

- Direct GraphQL package import calls against the clean server to isolate the current worktree from prior global app-package state.
- Direct SQLite row seeding for the legacy migration scenario only.
- Browser scripting through the in-app browser to assert hidden/shown text, immersive surface readiness, configure drawer behavior, reload launch-instance changes, and exit behavior.

## Dependencies Mocked Or Emulated

- None for the authoritative live API/UI/executable checks.
- Legacy migration scenario used a direct SQLite seed rather than an old-version app UI.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `EXE-001` Brief Studio packaged-app bootstrap missing `backend/dist/vendor/launch-profile.js` | `Local Fix` | Resolved | `POST /rest/applications/<brief>/backend/ensure-ready` returned `200` with `state: "ready"`; immersive browser entry also reached ready surface with no failure overlay | Prior packaged backend vendor omission is no longer reproducible in live execution. |
| 1 | `EXE-002` Socratic packaged-app bootstrap missing `backend/dist/vendor/launch-profile.js` | `Local Fix` | Resolved | `POST /rest/applications/<socratic>/backend/ensure-ready` returned `200` with `state: "ready"`; immersive browser entry also reached ready surface with no failure overlay | Prior packaged backend vendor omission is no longer reproducible in live execution. |

## Scenarios Checked

Round 1:
- Imported worktree app packages into a clean temp server registry and validated authoritative app discovery.
- Read both apps’ runtime-resource setup surfaces from REST.
- Saved valid Brief Studio team launch-profile data and confirmed readback.
- Sent unresolved inherited-model save payload and confirmed HTTP 400 classification.
- Seeded and read back a legacy Socratic saved-config row and verified one-time migration rewrite.
- Validated business-first catalog rendering and setup-route technical-details hiding in the browser.
- Attempted live backend bootstrap / app entry for both touched bundled applications.

Round 2:
- Rechecked both prior failing `backend/ensure-ready` scenarios first.
- Reran live Brief Studio immersive entry/configure/reload/exit.
- Reran live Socratic immersive entry/configure/reload/exit.

## Passed

1. `API-001` clean package import and app discovery.
2. `API-002` resource-configuration + available-resource REST readback for both apps.
3. `API-003` valid Brief Studio save/readback using the new `launchProfile` contract.
4. `API-004` invalid Brief Studio save returns HTTP `400` instead of `500`.
5. `API-005` legacy Socratic row rewrites into the new persisted shape.
6. `UI-001` applications catalog keeps technical metadata hidden by default.
7. `UI-002` setup route keeps technical metadata hidden by default and reveals it only after the explicit toggle.
8. `UI-003` configured app route remains setup-first on load and does not auto-launch.
9. `EXE-001` Brief Studio packaged backend reaches ready state in live execution.
10. `EXE-002` Socratic packaged backend reaches ready state in live execution.
11. `EXE-003` Brief Studio immersive entry succeeds and the host reveal gate clears.
12. `EXE-004` Brief Studio immersive configure/reload/exit flow succeeds.
13. `EXE-005` Socratic immersive entry succeeds and the host reveal gate clears.
14. `EXE-006` Socratic immersive configure/reload/exit flow succeeds.

## Failed

- None in the latest authoritative round.

## Not Tested / Out Of Scope

- Full end-to-end business workflow inside either bundled iframe after launch.
- Downstream application-owned team-run creation from inside the embedded applications.
- Repo-baseline `pnpm -C autobyteus-server-ts typecheck` failure (`TS6059`) re-investigation; unchanged baseline per upstream handoff.

## Blocked

- None in the latest authoritative round.

## Cleanup Performed

- Removed the accidentally imported superrepo Brief Studio package from the clean temp server so only the worktree package roots remained authoritative.
- Kept validation artifacts outside the repo except for this canonical report.

## Classification

- No reroute required in the latest authoritative round; validation passed.
- Prior round-1 `Local Fix` findings are resolved.

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

- Round 2 live `ensure-ready` responses for both apps returned `ready: true` and no `lastFailure`.
- In both immersive reruns, the parent host surface reached:
  - `application-immersive-phase` present,
  - `application-surface-canvas` present with `opacity-100`,
  - no loading/failure overlays,
  - one iframe mount with the expected bundle asset URL.
- In both immersive reruns, reload changed the iframe `autobyteusLaunchInstanceId` from `launch-1` to `launch-2`, demonstrating a successful host-controlled refresh without surfacing launch failure.
- In both immersive reruns, exit returned the user to the `/applications` catalog.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes:
  - New `launchProfile` REST behavior, HTTP-400 validation mapping, UI technical-details hiding, and one-time legacy migration behavior remain validated.
  - The previously failing packaged backend vendor/import issue is resolved in live execution for both touched bundled applications.
  - Immersive entry, configure, reload, and exit all pass for Brief Studio and Socratic Math Teacher.
