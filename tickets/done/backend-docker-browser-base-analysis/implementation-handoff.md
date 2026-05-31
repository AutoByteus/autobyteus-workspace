# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/investigation-notes.md`
- Latest recheck: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/latest-recheck-2026-05-30.md`
- Analysis summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/analysis-summary.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-review-report.md`

## What Changed

- Added a Docker-managed Chromium profile named volume for public launcher managed containers:
  - Bash: `<node>-chromium-profile:/home/vncuser/.config/chromium`
  - PowerShell: same naming and target path contract.
- Bumped public launcher config hash version from `v5` to `v6` and added Chromium profile volume/target entries to hash input so existing managed containers recreate once through normal reconciliation.
- Added Chromium profile volume visibility to public launcher `storage` output.
- Added named Chromium profile volumes to:
  - `autobyteus-server-ts/docker/docker-compose.yml`
  - `docker/compose.personal-test.yml`
- Updated launcher contract tests for run args, storage output, stale-config recreation, and Bash/PowerShell parity.
- Updated Docker docs/direct-run examples/persistence docs, including the personal all-in-one stack note.

## Key Files Or Areas

- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.ps1`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `autobyteus-server-ts/docker/docker-compose.yml`
- `docker/compose.personal-test.yml`
- `README.md`
- `autobyteus-server-ts/docker/README.md`
- `docker/README.md`

## Important Assumptions

- Browser Docker remains the owner of Chromium startup, profile directory permissions, and stale lock cleanup.
- Backend launch surfaces only mount the required persistent Chromium profile directory.
- Named Docker volumes remain preferred over host bind mounts for Chromium profile privacy and portability.
- No migration is attempted from prior container writable-layer Chromium state into the new named volume.

## Known Risks

- Existing users with browser state only in an old container writable layer may need to reauthenticate after the new named volume is attached.
- Published `autobyteus/autobyteus-server:latest` / `1.3.34` still needs rebuild/release against browser Docker `1.3.6` after merge to inherit stale Chromium profile lock cleanup.
- PowerShell runtime validation was limited because `pwsh` is not installed locally; static parity and parser test coverage remain in the unit test, where the parse test skips when `pwsh` is unavailable.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup / dependency-contract alignment.
- Reviewed root-cause classification: Missing Invariant.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No Refactor Needed for the approved scope.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The implementation only extends existing launcher/compose/docs/test owners with the Chromium profile volume invariant. It does not add backend-owned browser startup wrappers or migrate old profile data.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` (no obsolete active path was introduced; removed profile/mobile-safe paths remain absent from active launcher/docker/docs scan).
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; no design-impact reroute was needed.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `No — assessed, not blocked`. The two public launcher scripts were already ~800 effective non-empty lines because they are standalone distributable launcher entrypoints; the change added only targeted constant/hash/run-arg/storage lines. Splitting these public scripts would change the standalone install/pipe execution contract and was outside the reviewed design.
- Notes: No `AUTOBYTEUS_NODE_PROFILE`, `com.autobyteus.profile`, `mobile-safe`, backend Chromium wrapper, or duplicate browser Docker lock cleanup was introduced.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis`
- Branch: `codex/backend-docker-browser-base-analysis`
- Expected base/finalization branch: `origin/personal` / `personal`
- Docker CLI and `docker compose` were available locally.
- `pwsh` was not installed locally.

## Local Implementation Checks Run

Implementation-scoped checks only:

1. `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py`
   - Result: Pass, `Ran 6 tests`, `OK (skipped=1)`; the skipped test is PowerShell parse because `pwsh` is not installed.
2. `bash -n scripts/public/docker/autobyteus-docker.sh`
   - Result: Pass.
3. PowerShell parser check guarded by `command -v pwsh`
   - Result: Skipped locally (`pwsh is not installed`).
4. `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config >/tmp/autobyteus-server-compose-config.out`
   - Result: Pass; generated config contains `autobyteus-server-chromium-profile` targeting `/home/vncuser/.config/chromium`.
5. `AUTOBYTEUS_HOST_BACKEND_PORT=8001 AUTOBYTEUS_HOST_WEB_PORT=3000 AUTOBYTEUS_HOST_GATEWAY_PORT=8010 AUTOBYTEUS_HOST_VNC_PORT=5908 AUTOBYTEUS_HOST_NOVNC_PORT=6080 AUTOBYTEUS_HOST_CHROME_DEBUG_PORT=9228 AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8001 GATEWAY_SERVER_SHARED_SECRET=test GATEWAY_ADMIN_TOKEN=test docker compose -f docker/compose.personal-test.yml config >/tmp/autobyteus-personal-compose-config.with-env.out`
   - Result: Pass; generated config contains `main-allinone-chromium-profile` targeting `/home/vncuser/.config/chromium`.
6. `git grep -n -E 'AUTOBYTEUS_NODE_PROFILE|com\.autobyteus\.profile|mobile-safe' -- ':!tickets/**' ':!:**/tickets/**' ':!.github/release-notes/**' || true`
   - Result: No active matches.
7. `git diff --check`
   - Result: Pass.

## Downstream Validation Hints / Suggested Scenarios

- Review Bash/PowerShell parity for:
  - `v6` config hash version
  - `chromium_profile_volume` and `chromium_profile_target` hash inputs
  - `-chromium-profile:/home/vncuser/.config/chromium` run arg
  - `storage` output row.
- Confirm docs and compose files use the same volume names and target path.
- If API/E2E later validates with real Docker, check that an existing v5-managed container is recreated and the new mount appears in `docker inspect` output.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required downstream. This handoff does not claim browser runtime/E2E sign-off, public image rebuild/release completion, or real managed-container upgrade validation against a live published image.
