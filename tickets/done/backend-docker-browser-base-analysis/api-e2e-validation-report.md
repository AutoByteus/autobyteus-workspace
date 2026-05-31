# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/implementation-rework-handoff-cr001.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/review-report.md`
- Current Validation Round: `1`
- Trigger: Code review round 2 passed CR-001 rework and requested API/E2E validation.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass after CR-001 rework | N/A | None | Pass | Yes | Real Docker launcher and compose mount evidence collected; no repository-resident validation code changed during API/E2E. |

## Validation Basis

Validation was derived from the approved/refined requirements and reviewed design:

- REQ-001/REQ-002/REQ-003/REQ-004/UC-001/UC-005: public launcher named Chromium profile volume, config-hash recreation, and storage output.
- REQ-005/UC-002: source-helper compose Chromium profile volume.
- REQ-006/UC-003: personal all-in-one compose Chromium profile volume.
- REQ-008/AC-007: no active `AUTOBYTEUS_NODE_PROFILE`, `com.autobyteus.profile`, or `mobile-safe` path.
- REQ-009/REQ-010/AC-008/AC-009: split public launcher source files remain reviewable and no-clone Bash distribution still works.
- Review residual-risk focus: real Docker inspect mount evidence; stale v5-managed recreation to current hash/mount; compose runtime mount evidence; Bash public source/module distribution; PowerShell validation only if a `pwsh`-capable host is available.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Notes:

- Synthetic stale-container validation used an old `v5` config hash and old `com.autobyteus.profile=standard` label only as temporary setup data to prove current launcher reconciliation recreates the container and drops the obsolete label. The implementation did not read or preserve that legacy label.
- Static scan found no active source matches for `AUTOBYTEUS_NODE_PROFILE`, `com.autobyteus.profile`, or `mobile-safe` outside excluded historical ticket/release-note paths.

## Validation Surfaces / Modes

- Existing repository-resident launcher tests rerun.
- Bash syntax validation rerun.
- Static source-size and legacy scans rerun.
- Docker Compose config validation rerun.
- Real Docker CLI validation with `docker inspect` mount evidence.
- Docker Compose runtime validation with unique temporary projects and `--no-build` overrides to isolate mount behavior without building/running full application images.
- Local HTTP server validation for Bash no-clone public entry/module fetching and install-local-module behavior.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis`
- Branch: `codex/backend-docker-browser-base-analysis`
- Host: macOS 26.2 (`Darwin 25.2.0`, `arm64`)
- Docker context: `desktop-linux`
- Docker CLI/Engine: `Docker version 29.0.1`, engine `29.0.1`
- Docker Compose: `v2.40.3-desktop.1`
- Test long-running image for mount-only runtime proof: `bluenviron/mediamtx:latest` (`sha256:f8628851106cc053f9175b248050bb5f362a6e65abd72297c167a1cb5a9a3be2`)
- PowerShell: `pwsh` unavailable on this host.

## Lifecycle / Upgrade / Restart / Migration Checks

- Stale managed-container recreation was exercised with a synthetic existing managed container labeled with `com.autobyteus.configHash=v5-synthetic-old-hash` and an old `com.autobyteus.profile=standard` label.
- `workspace apply --name <unique-node>` recreated that container, produced a new 64-character current config hash, mounted `<node>-chromium-profile:/home/vncuser/.config/chromium`, and did not retain `com.autobyteus.profile`.
- Live `workspace apply --all` was intentionally not executed because this Docker host already has unrelated existing launcher-managed containers; executing `--all` would risk mutating user state outside this task. The reviewed unit test covers all-node enumeration, while live validation covered the same recreation path on an isolated unique node.
- Migrating Chromium state from old writable container layers remained out of scope per requirements/design and was not attempted.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Method | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| VAL-001 | AC-001/AC-002/AC-003/AC-008/AC-009 | Reviewed durable tests | `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py` | Pass, 9 tests, 1 skipped (`pwsh` absent) | Evidence log |
| VAL-002 | REQ-009/AC-008 | Public launcher split | Bash syntax and source-size guard | Pass; max effective lines: PowerShell runtime 450, Bash runtime 431 | Evidence log |
| VAL-003 | REQ-008/AC-007 | Active source tree | Static legacy/profile scan | Pass; no active matches | Evidence log |
| VAL-004 | REQ-001/REQ-003/REQ-004 | Public Bash launcher | Real `new-container` with Docker inspect | Pass; `autobyteus-server-1-chromium-profile` mounted at target and storage output listed it | Evidence log |
| VAL-005 | REQ-003/AC-004 | Existing managed container recreation | Synthetic v5 container + `workspace apply --name` | Pass; container ID changed, new hash is 64 hex chars, Chromium profile mount present, old profile label absent | Evidence log |
| VAL-006 | REQ-005/AC-005 | Source-helper compose | `docker compose config` and runtime `up -d --no-build` with override | Pass; compose-created volume mounted at target | Evidence log |
| VAL-007 | REQ-006/AC-005 | Personal all-in-one compose | `docker compose config` and runtime `up -d --no-build` with override | Pass; compose-created volume mounted at target | Evidence log |
| VAL-008 | REQ-010/AC-009 | Bash no-clone distribution | Local HTTP server, curl-pipe storage, curl-pipe install, installed CLI after server shutdown | Pass; temporary module fetch and local installed modules both produced Chromium profile storage rows | Evidence log |
| VAL-009 | REQ-002 | PowerShell runtime/parser | Environment capability check | Not tested; `pwsh` unavailable | Evidence log / residual risk |

## Test Scope

In scope:

- Public Bash launcher behavior against a real Docker daemon.
- Real `docker inspect` evidence for named Chromium profile volume mounts.
- Existing stale managed-container recreation to current launcher config.
- Compose syntax and runtime mount behavior for both compose surfaces.
- Bash public no-clone entry/module distribution and installed local module use.
- Static parity/legacy/size checks already present in reviewed durable tests.

Not in scope for this validation round:

- Publishing or rebuilding `autobyteus/autobyteus-server`.
- Browser Docker Chromium startup/lock cleanup internals, owned by browser Docker and pending server-image rebuild/release.
- Migration of Chromium state from old container writable layers.
- Full PowerShell runtime behavior on a host without `pwsh`.

## Validation Setup / Environment

A temporary validation harness was run from `/tmp` and wrote command output to:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/api-e2e-validation-evidence.log`

Temporary Docker containers, volumes, compose projects, state directories, shared-workspace directories, install directories, and local HTTP server processes were isolated with unique names and cleaned up after each scenario.

## Tests Implemented Or Updated

No repository-resident tests or source files were added or updated by API/E2E in this round. Existing reviewed durable validation was rerun.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/api-e2e-validation-report.md`
- Evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/api-e2e-validation-evidence.log`

## Temporary Validation Methods / Scaffolding

- Temporary Bash harness under `/tmp`.
- Temporary launcher state/shared-workspace roots under `/tmp`.
- Temporary Docker containers/volumes for public launcher and stale-v5 scenarios.
- Temporary Docker Compose override files using `bluenviron/mediamtx:latest` plus `build: null` to validate mount wiring without building application images.
- Temporary local HTTP server serving `scripts/public/docker` for Bash no-clone distribution validation.

All temporary scaffolding was removed after execution.

## Dependencies Mocked Or Emulated

- No repository dependency was mocked.
- Compose runtime validation used `bluenviron/mediamtx:latest` as a long-running substitute image so Docker could create and keep containers running long enough for mount inspection. This validates the compose/launcher volume contract, not application behavior.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First API/E2E validation round. |

## Scenarios Checked

### VAL-001 — Reviewed durable launcher tests

- Command: `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py`
- Result: Pass, `Ran 9 tests`, `OK (skipped=1)`.
- Skip: PowerShell parser check skipped because `pwsh` is unavailable.

### VAL-002 — Syntax/source-size checks

- Bash syntax: Pass.
- Source size: Pass, all public launcher entry/module files `<=500` effective non-empty lines:
  - Bash entry `117`
  - Bash commands `210`
  - Bash core `114`
  - Bash runtime `431`
  - PowerShell entry `103`
  - PowerShell Commands `182`
  - PowerShell Core `122`
  - PowerShell Runtime `450`

### VAL-003 — Legacy/profile static scan

- Command: `git grep -n -E 'AUTOBYTEUS_NODE_PROFILE|com\.autobyteus\.profile|mobile-safe' -- ':!tickets/**' ':!:**/tickets/**' ':!.github/release-notes/**'`
- Result: Pass, no active matches.

### VAL-004 — Public Bash launcher real Docker mount

- Command path: `bash scripts/public/docker/autobyteus-docker.sh new-container --image bluenviron/mediamtx --tag latest` with temporary launcher state/shared workspace.
- Result: Pass.
- Evidence:
  - Managed node/container: `autobyteus-server-1`.
  - Config hash: 64 hex characters.
  - Docker mount: `autobyteus-server-1-chromium-profile` -> `/home/vncuser/.config/chromium`.
  - `storage` output listed `autobyteus-server-1-chromium-profile -> /home/vncuser/.config/chromium`.
  - `com.autobyteus.profile` label absent.

### VAL-005 — Synthetic existing v5-managed recreation

- Setup: created `autobyteus-validation-v5-20260530t104854z2633` with launcher labels, `com.autobyteus.configHash=v5-synthetic-old-hash`, and old `com.autobyteus.profile=standard`.
- Action: `workspace apply --name <node>` with temporary state/shared workspace.
- Result: Pass.
- Evidence:
  - Output included `Launcher config changed ... recreating the managed container while keeping named volumes.`
  - Container ID changed from old to new.
  - New config hash was 64 hex characters and not the synthetic v5 hash.
  - Docker mount: `<node>-chromium-profile` -> `/home/vncuser/.config/chromium`.
  - `com.autobyteus.profile` label absent after recreation.

### VAL-006 — Source-helper compose runtime mount

- Config: `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config` showed `autobyteus-server-chromium-profile` targeting `/home/vncuser/.config/chromium`.
- Runtime: unique compose project plus no-build override using `bluenviron/mediamtx:latest`.
- Result: Pass.
- Evidence: compose-created volume `abvalsource20260530t104854z2633_autobyteus-server-chromium-profile` mounted at `/home/vncuser/.config/chromium`.

### VAL-007 — Personal all-in-one compose runtime mount

- Config: `docker compose -f docker/compose.personal-test.yml config` with required env showed `main-allinone-chromium-profile` targeting `/home/vncuser/.config/chromium`.
- Runtime: unique compose project plus no-build override using `bluenviron/mediamtx:latest`.
- Result: Pass.
- Evidence: compose-created volume `abvalpersonal20260530t104854z2633_main-allinone-chromium-profile` mounted at `/home/vncuser/.config/chromium`.

### VAL-008 — Bash no-clone public entry/module behavior

- Temporary mode: served `scripts/public/docker` over local HTTP and ran `curl -fsSL <entry> | bash -s -- storage --name 'No Clone Validation'` with `AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE` pointing to that HTTP base.
- Install mode: ran `curl -fsSL <entry> | bash -s -- install`, verified local entry plus `core.sh`, `docker-runtime.sh`, and `commands.sh` were installed, stopped the HTTP server, then ran installed CLI `storage` successfully from local files.
- Result: Pass.
- Evidence: both temporary and installed storage output contained the expected Chromium profile volume rows.

## Passed

- Durable tests/syntax/source-size/static scans passed.
- Public Bash real Docker managed containers include the named Chromium profile mount.
- Synthetic stale v5 managed container is recreated to current config and gains the Chromium profile mount.
- Obsolete `com.autobyteus.profile` label is not retained after recreation.
- Source-helper compose and personal all-in-one compose produce runtime containers with the expected Chromium profile named volume mount.
- Bash no-clone temporary and install/local-module distribution paths work.
- Validation cleanup removed temporary containers, volumes, compose projects, HTTP server, and temp directories.

## Failed

None.

## Not Tested / Out Of Scope

- PowerShell parser/runtime validation: not tested because `pwsh` is unavailable on this host.
- Live `workspace apply --all`: not run to avoid mutating unrelated pre-existing launcher-managed Docker nodes on the shared host; all-mode enumeration remains covered by reviewed durable tests, and live validation covered the underlying recreation/mount path on an isolated explicit node.
- Actual rebuilt `autobyteus/autobyteus-server` image with browser Docker `1.3.6`: out of scope for API/E2E; delivery/release still needs to carry the rebuild risk.
- Chromium profile data migration from old container writable layers: explicitly out of scope.

## Blocked

None for pass/fail decision. PowerShell runtime validation remains an environment-limited residual risk rather than a blocking failure for this host.

## Cleanup Performed

- Removed public-launcher validation container and volumes.
- Removed synthetic v5 validation container and volumes.
- Ran `docker compose down -v --remove-orphans` for source-helper and personal compose validation projects.
- Stopped temporary local HTTP server.
- Removed temporary validation directories.
- Post-check found no validation containers or volumes matching the temporary validation prefixes.

## Classification

No failure classification applies; latest authoritative result is `Pass`.

## Recommended Recipient

`delivery_engineer`

Rationale: API/E2E passed and did not add or update repository-resident durable validation code after the latest code review, so the package can proceed to delivery.

## Evidence / Notes

Primary evidence log:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/api-e2e-validation-evidence.log`

Residual risks to carry forward:

- PowerShell parser/runtime validation should be run on a `pwsh`-capable host if delivery or release infrastructure has one.
- Published `autobyteus/autobyteus-server:latest` / `1.3.34` still needs rebuild/release against browser Docker `1.3.6` after merge to inherit stale Chromium profile lock cleanup.
- Existing Chromium profile state that lived only in old container writable layers is intentionally not migrated; affected users may need to reauthenticate.

## Latest Authoritative Result

- Result: `Pass`
- Notes: Real Docker, compose runtime, stale managed-container recreation, storage output, no-clone Bash distribution, static legacy scans, and reviewed durable tests passed. No repository-resident validation code changed during API/E2E, so no validation-code re-review is required before delivery.
