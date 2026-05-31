# Implementation Handoff — CR-001 Rework

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/investigation-notes.md`
- Latest recheck: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/latest-recheck-2026-05-30.md`
- Analysis summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/analysis-summary.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-spec.md`
- Updated design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-review-report.md`
- Design re-entry report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-reentry-report.md`
- Prior implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/implementation-handoff.md`
- Code review report with CR-001: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/review-report.md`

## What Changed

CR-001 rework is complete.

- Split the public Bash launcher into a thin stable entry and reviewable modules:
  - `scripts/public/docker/autobyteus-docker.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/core.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
- Split the public PowerShell launcher into a thin stable entry and reviewable modules:
  - `scripts/public/docker/autobyteus-docker.ps1`
  - `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1`
  - `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1`
  - `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`
- Entry files now own distribution/module resolution/install/bootstrap only.
- Runtime modules own Docker lifecycle/config hash/run args/storage policy, including:
  - `v6` launcher config hash version;
  - `chromium_profile_volume` and `chromium_profile_target` hash inputs;
  - `<node>-chromium-profile:/home/vncuser/.config/chromium` run arg;
  - `storage` output row for the Chromium profile volume.
- Preserved the previously implemented compose/docs behavior:
  - source helper compose has `autobyteus-server-chromium-profile`;
  - personal all-in-one compose has `main-allinone-chromium-profile`;
  - docs/direct-run examples describe the profile volume.
- Added durable tests for Bash module source-base temporary mode, Bash install writing entry plus modules, and public launcher source-size guard.

## Key Files Or Areas

- Public launcher entries:
  - `scripts/public/docker/autobyteus-docker.sh`
  - `scripts/public/docker/autobyteus-docker.ps1`
- Public launcher modules:
  - `scripts/public/docker/autobyteus-docker.d/bash/core.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
  - `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1`
  - `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1`
  - `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`
- Validation/docs/compose:
  - `scripts/tests/test_public_docker_launcher_shared_workspace.py`
  - `autobyteus-server-ts/docker/docker-compose.yml`
  - `docker/compose.personal-test.yml`
  - `README.md`
  - `autobyteus-server-ts/docker/README.md`
  - `docker/README.md`

## Important Assumptions

- The public entry URLs remain stable; support modules are adjacent under `autobyteus-docker.d/<platform>/`.
- Installed normal use loads local installed modules. Curl-pipe / `irm | iex` temporary use resolves modules from the public source base or explicit module-source override.
- Browser Docker remains the owner of Chromium startup, profile directory permissions, and stale lock cleanup.
- Backend launch surfaces only mount the required persistent Chromium profile directory.
- No migration is attempted from prior container writable-layer Chromium state into the new named volume.

## Known Risks

- PowerShell runtime/parser validation was skipped locally because `pwsh` is not installed. Static parity checks and source-size checks cover the PowerShell source shape here; downstream validation can run on a PowerShell-capable host if needed.
- Published `autobyteus/autobyteus-server:latest` / `1.3.34` still needs rebuild/release against browser Docker `1.3.6` after merge to inherit stale Chromium profile lock cleanup.
- Existing users with Chromium state only in old container writable layers may need to reauthenticate after the new named volume is attached.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup / dependency-contract alignment plus public launcher structural refactor.
- Reviewed root-cause classification: Missing Invariant for Chromium profile persistence; File Placement Or Responsibility Drift for monolithic public launcher files.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, bounded to public launcher source distribution.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A for this rework; CR-001 had already been routed and accepted by architecture re-entry.
- Evidence / notes: Entry files now contain only bootstrap/distribution logic; Docker runtime policy lives in platform runtime modules; all changed public launcher source files are below `500` effective non-empty lines.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — monolithic launcher source responsibility is decommissioned; removed profile/mobile-safe paths remain absent from active launcher/docker/docs scan.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; CR-001 was addressed via the approved re-entry design.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: No `AUTOBYTEUS_NODE_PROFILE`, `com.autobyteus.profile`, `mobile-safe`, backend Chromium wrapper, hidden generated payload, or duplicate browser Docker lock cleanup was introduced.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis`
- Branch: `codex/backend-docker-browser-base-analysis`
- Expected base/finalization branch: `origin/personal` / `personal`
- Docker CLI and `docker compose` were available locally.
- `pwsh` was not installed locally.

## Local Implementation Checks Run

Implementation-scoped checks only:

1. `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py`
   - Result: Pass, `Ran 9 tests`, `OK (skipped=1)`; skipped test is PowerShell parser check because `pwsh` is not installed.
2. `bash -n scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.d/bash/*.sh` (executed as a loop)
   - Result: Pass.
3. PowerShell parser check guarded by `command -v pwsh`
   - Result: Skipped locally (`pwsh is not installed`).
4. Public launcher source-size guard:
   - `117 scripts/public/docker/autobyteus-docker.sh`
   - `210 scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
   - `114 scripts/public/docker/autobyteus-docker.d/bash/core.sh`
   - `431 scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
   - `103 scripts/public/docker/autobyteus-docker.ps1`
   - `182 scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`
   - `122 scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1`
   - `450 scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1`
   - Result: Pass; all are `<=500` effective non-empty lines.
5. `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config >/tmp/autobyteus-server-compose-config.out`
   - Result: Pass; generated config contains `autobyteus-server-chromium-profile` targeting `/home/vncuser/.config/chromium`.
6. `AUTOBYTEUS_HOST_BACKEND_PORT=8001 AUTOBYTEUS_HOST_WEB_PORT=3000 AUTOBYTEUS_HOST_GATEWAY_PORT=8010 AUTOBYTEUS_HOST_VNC_PORT=5908 AUTOBYTEUS_HOST_NOVNC_PORT=6080 AUTOBYTEUS_HOST_CHROME_DEBUG_PORT=9228 AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8001 GATEWAY_SERVER_SHARED_SECRET=test GATEWAY_ADMIN_TOKEN=test docker compose -f docker/compose.personal-test.yml config >/tmp/autobyteus-personal-compose-config.with-env.out`
   - Result: Pass; generated config contains `main-allinone-chromium-profile` targeting `/home/vncuser/.config/chromium`.
7. `git grep -n -E 'AUTOBYTEUS_NODE_PROFILE|com\.autobyteus\.profile|mobile-safe' -- ':!tickets/**' ':!:**/tickets/**' ':!.github/release-notes/**' || true`
   - Result: No active matches.
8. `git diff --check`
   - Result: Pass.

## Downstream Validation Hints / Suggested Scenarios

- Code review should verify source ownership split and line-count guard resolution for CR-001.
- Review Bash/PowerShell parity across entry+module source sets, not only root entry files.
- Review module distribution behavior:
  - Bash local installed modules load from `autobyteus-docker.d/bash` adjacent to the installed entry.
  - Bash temporary mode can resolve modules from `AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE` / derived module base.
  - PowerShell has equivalent module-resolution code, but runtime validation awaits a host with `pwsh`.
- If API/E2E later validates with real Docker, check that an existing v5-managed container is recreated and the new mount appears in `docker inspect` output.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required downstream after code review passes. This handoff does not claim browser runtime/E2E sign-off, public image rebuild/release completion, or real managed-container upgrade validation against a live published image.
