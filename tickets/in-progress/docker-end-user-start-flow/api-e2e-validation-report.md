# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/review-report.md`
- Current Validation Round: `5`
- Trigger: `code_reviewer pass after architecture review round 5 approved the update-vs-start ownership split on 2026-05-12`
- Prior Round Reviewed: `Round 3 canonical report plus superseded round-4 local evidence`
- Latest Authoritative Round: `5`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Initial code-review-passed package ready for API/E2E validation | `N/A` | `Yes - V-006 occupied/stale port recovery` | `Fail` | `No` | Real Docker startup worked for happy path and multiple nodes, but stale-state occupied-port recovery printed an unusable Backend URL and persisted invalid state. |
| `2` | Code-review-passed Local Fix for `V-006` | `Yes - V-006 rechecked first against real Docker Desktop` | `No` | `Pass` | `No` | Stale occupied saved-port recovery removed Created/bind-error containers, retried with fresh ports, wrote fresh state only after running-state success, and printed a reachable Backend URL. |
| `3` | Architecture-approved CLI clarification: idempotent `start`, additional-node `start --new`, public wording cleanup | `Yes - round-2 pass and residuals reviewed` | `No` | `Pass` | `No` | Public Bash help, static PowerShell help, docs, localization/UI, command catalog, and browser-rendered Settings guide used the approved “Start new Docker node” wording while preserving `start --new`. |
| `4` | Install-once CLI rework prior to latest ownership split | `Yes - V-006 rechecked on real Docker with installed launcher` | `No` | `Pass, superseded before handoff` | `No` | Local validation proved install/update did not create Docker state, installed launcher lifecycle worked, and stale retry still passed. A newer code-review handoff arrived before final handoff, so round 5 is the authoritative rerun. |
| `5` | Architecture-review round-5 update-vs-start ownership split and independent full code-review pass | `Yes - V-006 stale retry, V-009 raw URL publication, V-010 PowerShell runtime, and install-once/update ownership were rechecked` | `No` | `Pass` | `Yes` | Mac/Docker executable validation passed for install/update isolation, default start refresh, repeated start no-recreate, stopped-container restart, config-change recreation, stale occupied-port retry, `start --new`, lifecycle commands, and Settings Add Remote Node with a launcher-printed Backend URL. |

## Validation Basis

Coverage was derived from the approved requirements/design chain, the install-once design-impact rework, the round-5 independent code-review report, and directly observed behavior on the current worktree.

Key requirements and accepted design constraints exercised:

- Public no-clone Bash and PowerShell launchers (`REQ-001`, `REQ-002`, `REQ-003`).
- `install` / `update` update only the local launcher and must not touch Docker containers, named volumes, or runtime state.
- `start` owns Docker image check/pull and server container start-or-refresh.
- Plain `start` is idempotent for the default node; additional isolated nodes use `start --new` (`REQ-003`, `REQ-004`, `AC-004`, `AC-005`).
- Multiple isolated Docker nodes with friendly names and non-conflicting ports (`REQ-004`, `AC-004`).
- Docker Hub image behavior and optional image/tag surfaces (`REQ-005`).
- User-machine state outside the source tree (`REQ-006`).
- Settings → Nodes install-once guide, direct local command catalog, and Add Remote Node guidance (`REQ-007`, `REQ-008`, `REQ-009`, `AC-005`, `AC-006`, `AC-007`).
- Documentation alignment and raw GitHub branch/ref assumption (`REQ-010`, `AC-008`).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

No compatibility wrapper, source-helper/Compose/`--project` public path, superseded public `Start another Docker node` wording, or retention of the old false-success Docker behavior was observed in the changed launcher/UI/docs scope.

## Validation Surfaces / Modes

- Static shell validation: `bash -n`, ShellCheck, help text, public-boundary grep.
- Static PowerShell peer validation for help/update/start wording; native PowerShell runtime was unavailable.
- Install/update isolation smoke using a local `file://` source URL and temp install/state directories.
- Real Docker Desktop lifecycle validation using the installed launcher on macOS arm64.
- Real Docker health checks via `/rest/health` and GraphQL `{ __typename }` probes.
- Browser Settings → Nodes validation in local Nuxt dev server, including Add Remote Node against a real launcher-started backend URL.
- Repository-resident frontend tests and guard scripts.
- Raw GitHub ref and URL availability check.

## Platform / Runtime Targets

- Host: macOS/Darwin arm64 (`Darwin MacBookPro 25.2.0`, Apple Silicon).
- Docker CLI: `Docker version 29.0.1, build eedd969`.
- Node.js: `v22.21.1`; pnpm: `10.28.2`.
- Docker image target: `autobyteus/autobyteus-server:latest`, digest `sha256:8006705559a1b74f88e462e3699cb136895ae8c4b846aa274cb94c51e8be0549`.
- Default backend left running for user verification: `http://localhost:8001`.
- Frontend dev server left running for user verification: `http://127.0.0.1:3335/settings`.
- PowerShell: no native `pwsh` or `powershell` runtime found on this host.

## Lifecycle / Upgrade / Restart / Migration Checks

- `install` and `update` were run from the current local source into `/tmp/autobyteus-r5-install.ws3AiA`; neither created the configured state directory nor changed managed Docker containers/volumes.
- Default `start` against `/tmp/autobyteus-user-check-docker` refreshed the pre-existing managed default container because it predated config-hash tracking, then kept `http://localhost:8001` reachable.
- Repeated default `start` with unchanged image/config did not recreate the container; container ID remained `ca5ac01137078743bb30e2848f3b0c70c834bf68955755954af9b50160cccf17`.
- Stopped default container restart used `docker start` semantics and kept the same container ID.
- Custom `e2e-r5-node` repeated `start` did not recreate; an intentional launcher-config state change recreated the managed container while preserving named-volume ownership.
- Stale occupied `NOVNC_PORT=6080` recovery retried with fresh ports and produced a reachable backend.
- `start --new`, `urls`, `status`, `logs`, `stop`, and `stop --all` passed in an isolated validation state dir.
- No app/server data migration was in scope.

## Coverage Matrix

| Scenario ID | Requirement / AC | Validation Method | Latest Result | Evidence |
| --- | --- | --- | --- | --- |
| `V-001` | `REQ-001`, `REQ-003`, `AC-003` | `bash -n`, ShellCheck, Bash help, static PowerShell help, public-boundary grep | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/static-unit.log` |
| `V-002` | `REQ-007`, `REQ-009`, `AC-005`, `AC-007` | Targeted Vitest for command catalog, guide card, and NodeManager | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/static-unit.log` |
| `V-003` | Localization/web constraints | Localization boundary guard, literal audit, web boundary guard, `git diff --check` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/static-unit.log` |
| `V-004` | `REQ-005`, `AC-001`, Docker happy path | Installed Bash launcher default `start`; Docker pull/check; `/rest/health`; GraphQL probe | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log` |
| `V-005` | `REQ-004`, `AC-004` | Installed launcher `start --new`; separate friendly node, state, ports, health | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log` |
| `V-006` | Stale occupied-port retry; `REQ-004`, `AC-004` edge case | Edited saved `NOVNC_PORT=6080` occupied by another Docker-published container; reran installed launcher `start` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log` |
| `V-007` | `REQ-003`, lifecycle commands | `urls`, `status`, `logs`, `stop`, `stop --all` against isolated installed-launcher state | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log` |
| `V-008` | `REQ-008`, `AC-006` Add Remote Node boundary | Browser Settings → Nodes guide, direct commands, Add Remote Node using launcher-printed Backend URL | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/browser-ui-add-remote-node.log`; screenshot `/Users/normy/.autobyteus/browser-artifacts/7dc8f2-1778596600360.png` |
| `V-009` | `REQ-010`, raw GitHub ref assumption | `git ls-remote` and raw URL `curl` on configured `personal` ref | `Blocked / delivery recheck required` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/raw-ref-powershell-residual.log` |
| `V-010` | `REQ-002`, `AC-002` PowerShell executable path | Native runtime availability check plus static peer review | `Blocked for native execution` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/raw-ref-powershell-residual.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/static-unit.log` |
| `V-011` | CLI clarification, `REQ-003`, `REQ-004`, `AC-004`, `AC-005` | Bash help, static PowerShell help, docs/localization/UI grep, browser UI command smoke | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/static-unit.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/browser-ui-add-remote-node.log` |
| `V-012` | Install-once CLI; install/update ownership | Installed from local current source; verified install/update created launcher only and no Docker runtime state | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/install-update-isolation.log` |
| `V-013` | Update-vs-start ownership split | Real Docker repeated start no-recreate, config refresh recreation, stopped restart, default refresh, and image check/pull ownership on `start` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log` |

## Test Scope

Round 5 validates the current implementation after the architecture-approved `update` vs `start` split. No repository-resident durable API/E2E test code was added or updated by API/E2E. The executable work used existing repository tests plus temporary launcher/browser/Docker probes recorded under the ticket evidence folder.

## Validation Setup / Environment

- Round-5 evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/`.
- Installed launcher path used for runtime validation: `/tmp/autobyteus-r5-install.ws3AiA/autobyteus-docker`.
- Isolated validation state dir: `/tmp/autobyteus-r5-state.QBvHeI`.
- Existing user-check default state dir: `/tmp/autobyteus-user-check-docker`.
- Local Nuxt dev server: `http://127.0.0.1:3335/settings` with `BACKEND_NODE_BASE_URL=http://localhost:8001`.

## Tests Implemented Or Updated

No source or durable test files were added or updated by API/E2E in this round.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/api-e2e-validation-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/commands.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/install-update-isolation.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/static-unit.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/add-remote-node-docker-start.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/browser-ui-add-remote-node.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/raw-ref-powershell-residual.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/cleanup-and-user-check-status.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/frontend-dev-3335.log`
- Browser screenshot: `/Users/normy/.autobyteus/browser-artifacts/7dc8f2-1778596600360.png`

## Temporary Validation Methods / Scaffolding

- Temporary installed launcher copied from the current local source by setting `AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL=file://...`.
- Temporary isolated launcher state directory under `/tmp/autobyteus-r5-state.QBvHeI`.
- Temporary Docker nodes: `e2e-r5-node`, `autobyteus-server-2`, and `e2e-r5-add-node`; all were stopped/removed after validation.
- Temporary browser interaction added and removed `Round 5 Docker Node` from the UI to prove Add Remote Node behavior.
- Local Nuxt dev server on port `3335` was intentionally left running for user verification.

## Dependencies Mocked Or Emulated

- No Docker behavior was mocked by API/E2E in round 5; lifecycle checks used real Docker Desktop containers.
- Native PowerShell remained unavailable; PowerShell validation is static-only in this environment.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `1` | `V-006` stale/occupied saved-port recovery | `Local Fix` | `Resolved and rechecked again in round 5` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/real-docker-lifecycle-update-start-split.log` | Saved `NOVNC_PORT=6080` produced bind retry and fresh running ports. |
| `2` / `3` | `V-009` raw GitHub URL publication check | `Blocked / pre-merge expected` | `Still blocked until integration/publication` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/raw-ref-powershell-residual.log` | `origin/personal` exists, but raw `.sh` and `.ps1` URLs return `404` because these files are not yet published on the referenced ref. |
| `2` / `3` | `V-010` native Windows PowerShell execution | `Blocked` | `Still blocked in this macOS arm64 environment` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/raw-ref-powershell-residual.log` | No native `pwsh` or `powershell` binary is installed. |
| `4` | Install-once CLI behavior | `Superseded before handoff` | `Revalidated against current round-5 source` | `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/validation-evidence/round-5/install-update-isolation.log` | `install`/`update` only wrote launcher files and did not create state, containers, or volumes. |

## Scenarios Checked

### `V-012` install/update ownership

- `install` from a local current-source URL created `/tmp/autobyteus-r5-install.ws3AiA/autobyteus-docker`.
- `update` reinstalled the launcher to the same temp install dir.
- The configured temp state dir remained absent after both commands.
- Managed Docker container set remained unchanged (`autobyteus-server` only in managed-label scope before and after install/update).
- No validation-named volumes were created.

### `V-013` start ownership and lifecycle refresh

- Default `start` checked/pulled `autobyteus/autobyteus-server:latest`, refreshed the pre-config-hash default container, wrote `CONFIG_HASH`, and exposed `http://localhost:8001`.
- Repeated default `start` reported already-running current image/config and did not recreate.
- Stopped default container restart kept the same container ID.
- Custom named repeated `start` did not recreate.
- Intentional config-state change triggered managed-container recreation while preserving named-volume ownership.
- Stale occupied `NOVNC_PORT=6080` triggered fresh-port retry and produced `http://localhost:59416` in that validation run.

### `V-008` Settings guide and Add Remote Node

- Browser rendered Settings → Nodes from `http://127.0.0.1:3335/settings`.
- Guide displayed install-once Bash and PowerShell commands.
- Guide displayed direct local commands: `autobyteus-docker start`, `start --new`, `urls`, `status`, `logs`, `stop`.
- Repeated raw lifecycle `bash -s -- start` and superseded `Start another Docker node` wording were absent.
- Added a real Docker node from the launcher-printed Backend URL `http://localhost:59636`; UI displayed it as remote and ready enough to add. The validation remote node was removed afterward.

## Passed

- Mac real Docker default start/refresh, health, and GraphQL probe.
- Repeated `start` no-recreate behavior for default and custom nodes.
- Stopped-current-container restart without recreation.
- Config-change managed recreation with named-volume preservation.
- Stale occupied-port retry with Docker-published `6080` conflict.
- `start --new`, `urls`, `status`, `logs`, `stop`, and `stop --all`.
- `install`/`update` Docker-free ownership split.
- Settings install-once command rendering and Add Remote Node with a launcher-printed Backend URL.
- Static launcher checks, targeted Vitest suite, localization/web guards, and `git diff --check`.

## Failed

None in latest authoritative round 5.

## Not Tested / Out Of Scope

- Native Windows PowerShell install/shim/User PATH/lifecycle execution; host lacks PowerShell.
- Raw GitHub execution after publication to `personal`; current worktree files are not yet on that remote ref.
- Actual new Docker image availability/change from a registry update was not forced; real validation covered `start` image check/pull and config-change recreation, while code review separately covered mocked image-change recreation.
- Docker installation itself, enterprise/fleet orchestration, and app-owned one-click Docker lifecycle are out of scope per requirements.

## Blocked

- `V-009`: Raw GitHub command execution is blocked until this ticket's public scripts are committed/published to the configured `personal` ref. Delivery should recheck after branch refresh/integrated state.
- `V-010`: Native Windows PowerShell execution is blocked in this macOS arm64 environment.

## Cleanup Performed

- Removed validation-created containers and volumes for `e2e-r5-node`, `autobyteus-server-2`, and `e2e-r5-add-node`.
- Removed the validation remote node from the Settings UI after Add Remote proof.
- Kept the default managed backend running for user verification at `http://localhost:8001`.
- Kept the local Nuxt frontend dev server running for user verification at `http://127.0.0.1:3335/settings`.

## Classification

- `Local Fix`: `No` new issue in latest round; prior `V-006` remains resolved.
- `Design Impact`: `No`
- `Requirement Gap`: `No`
- `Unclear`: `No`

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

The Mac validation answer is yes: on this macOS/Docker Desktop host, the current Bash launcher and frontend Settings flow work for the approved scope. The remaining gaps are environment/publication constraints, not observed implementation failures:

- Windows PowerShell must be validated on a native PowerShell/Windows-capable host.
- Raw GitHub install URLs should be rechecked after this ticket lands on the configured `personal` ref.

For user verification, the current local URLs are:

- Frontend: `http://127.0.0.1:3335/settings`
- Backend: `http://localhost:8001`

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round-5 API/E2E passes on Mac for the current update-vs-start ownership split and install-once Docker flow. No repository-resident durable validation was added or updated by API/E2E, so the task can proceed to delivery with raw URL and native Windows PowerShell as explicit residual checks.
