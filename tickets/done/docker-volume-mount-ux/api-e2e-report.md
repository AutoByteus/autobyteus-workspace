# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/review-report.md`
- Current Validation Round: `1`
- Trigger: Code-review pass from `code_reviewer`; validate Docker shared workspace bind-mount UX before delivery.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass for Docker shared workspace bind-mount UX | N/A | No | Pass | Yes | Local static/unit/frontend checks and real Docker lifecycle/file-visibility validation passed. Native PowerShell runtime remained unavailable. |

## Validation Basis

Validation was derived from the approved requirements, design spec, implementation handoff, and code review emphasis, especially:

- Preserve the existing named-volume contract unchanged: `<node>-data:/home/autobyteus/data`, `<node>-root-home:/root`, and `<node>-workspace:/app/autobyteus-server-ts/workspace`.
- Add host bind mounts for `/home/autobyteus/workspace` and `/home/autobyteus/shared`.
- Set `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`.
- Prove node-private workspace separation and cross-node shared-folder visibility.
- Prove existing-container adoption through safe recreate while preserving named volumes, ports, and friendly node identity.
- Prove launcher inspection output and existing durable fake-Docker/frontend tests.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Notes: Preserving the three named volumes is an explicit product requirement, not a compatibility shim. The old `/home/autobyteus/data/temp_workspace` remains preserved data only; new/apply containers use `/home/autobyteus/workspace` as the temp workspace env.

## Validation Surfaces / Modes

- Bash launcher syntax/static checks.
- Existing repository-resident Python launcher tests with fake Docker.
- Existing repository-resident frontend Vitest command/card tests.
- Real Docker CLI lifecycle validation with the actual `autobyteus/autobyteus-server:latest` image.
- Docker inspect and Docker exec validation for mounts, environment, file visibility, stateful recreate, and cleanup.

## Platform / Runtime Targets

- Host: macOS/Darwin arm64 validation host.
- Docker client: `29.0.1`, context `desktop-linux`.
- Docker server: Docker Desktop `4.52.0 (210994)`, Engine `29.0.1`, Linux/arm64.
- Image under real Docker validation: `autobyteus/autobyteus-server:latest`; pull reported digest `sha256:76563674adcd0b35298c62f87ff33e37bb534799a44d125a5b2f4ec905e46ce2` and up-to-date status.
- PowerShell runtime: `pwsh` unavailable on this host; native PowerShell parse/runtime validation was not executed.

## Lifecycle / Upgrade / Restart / Migration Checks

- Created two isolated launcher-managed real Docker nodes through the launcher `workspace apply --name <node>` path using unique state files and an isolated `AUTOBYTEUS_DOCKER_STATE_DIR` / `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`.
- Verified both current nodes were running with the three expected named volumes and the two expected bind mounts.
- Created a pre-feature/legacy-style container manually with only the original three named volumes and launcher labels, then ran `workspace apply --name <legacy-node>`.
- Verified `workspace apply` recreated the legacy container, added the new bind mounts/env, preserved the three named-volume sentinel files, preserved host port mappings, and preserved friendly node identity labels.

## Coverage Matrix

| Scenario | Requirements / AC Covered | Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| `E2E-001` Current node bind-mount contract | REQ-000..004, REQ-006, AC-001, AC-003, AC-004 | Real Docker + inspect + exec | Pass | `api-e2e-real-docker.log`, `api-e2e-docker-evidence.json` |
| `E2E-002` Node-private workspace separation | REQ-002, REQ-009, AC-004, AC-007 | Real Docker file writes/host checks | Pass | `api-e2e-real-docker.log`, `api-e2e-docker-evidence.json` |
| `E2E-003` Cross-node shared-folder visibility | REQ-003, AC-005, AC-006 | Real Docker file writes/exec | Pass | `api-e2e-real-docker.log`, `api-e2e-docker-evidence.json` |
| `E2E-004` Stable parent bind mount dynamic visibility | REQ-013, AC-011 | Host-created subfolders + Docker exec; container IDs unchanged | Pass | `api-e2e-real-docker.log`, `api-e2e-docker-evidence.json` |
| `E2E-005` Existing-container apply/recreate | REQ-005, REQ-006, REQ-008, AC-002 | Real Docker legacy container + launcher apply | Pass | `api-e2e-real-docker.log`, `api-e2e-docker-evidence.json` |
| `E2E-006` Inspection/help output | REQ-007, AC-008 | Launcher `workspace paths` and `storage` output assertions | Pass | `api-e2e-real-docker.log`, Python/frontend test logs |
| `E2E-007` Durable launcher/UI tests | REQ-011, REQ-012, AC-009, AC-010 | Existing Python unittest + Vitest | Pass | `api-e2e-local-checks.log` |
| `E2E-008` Native PowerShell runtime | REQ-011, AC-009 | Host availability check | Not tested | `api-e2e-pwsh-availability.log`; `pwsh` unavailable |

## Test Scope

Executed checks:

- `bash -n scripts/public/docker/autobyteus-docker.sh` — passed.
- `shellcheck scripts/public/docker/autobyteus-docker.sh` — passed.
- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v` — passed (`5` tests, `1` skipped because `pwsh` unavailable).
- `python3 -m unittest discover scripts/tests -v` — passed (`8` tests, `1` skipped because `pwsh` unavailable).
- `pnpm --dir autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` — passed (`2` files, `4` tests).
- `git diff --check` — passed.
- Temporary real-Docker validation harness — passed (`90` assertion-pass events recorded in evidence JSON).

## Validation Setup / Environment

Real Docker validation used an isolated run id: `ab-e2e-dvmux-1779210267-82212`.

The harness used:

- Isolated state root under the ticket workspace during execution.
- Isolated shared workspace root under the ticket workspace during execution.
- Unique Docker container and volume names derived from the run id.
- The actual public Bash launcher file under test.
- Manual cleanup of all validation containers, validation volumes, and temporary host workspace folders.

Rationale for state-fed unique node names: the host already had a live launcher-managed `autobyteus-server-0`. The public `new-container` command intentionally uses fixed indexed names, and `--all` enumerates all launcher-managed containers. To avoid touching user containers or pre-existing user volumes, real Docker validation used unique state files plus `workspace apply --name <unique-node>` to exercise the same `start_node` / `run_container` / recreate path with isolated names. The repository fake-Docker tests cover the exact `new-container` command selection and argument rendering.

## Tests Implemented Or Updated

No repository-resident tests or source files were added or modified during API/E2E validation. Existing durable tests added by implementation were executed.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Local static/unit/frontend check log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/api-e2e-local-checks.log`
- Real Docker validation log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/api-e2e-real-docker.log`
- Real Docker structured evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/api-e2e-docker-evidence.json`
- PowerShell availability log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/api-e2e-pwsh-availability.log`

## Temporary Validation Methods / Scaffolding

- A temporary Python harness was written to `/tmp/autobyteus_docker_volume_mount_real_e2e.py` and executed once.
- The harness created isolated launcher state files and a legacy-style Docker container for validation only.
- Temporary Docker containers, Docker volumes, and host workspace folders were removed after execution.
- No temporary validation code was retained in the repository.

## Dependencies Mocked Or Emulated

- Existing unit tests use their fake-Docker harness for command argument/config-hash assertions.
- Real Docker validation did not mock Docker.
- The pre-feature existing-container transition was emulated by manually creating a launcher-labeled container with only the original three named volumes and no new bind mounts/env.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First validation round. |

## Scenarios Checked

### `E2E-001` Current-node real Docker bind-mount contract

- Two unique nodes were created/applied by the launcher against real Docker.
- Each node had named volumes at:
  - `/home/autobyteus/data`
  - `/root`
  - `/app/autobyteus-server-ts/workspace`
- Each node had bind mounts at:
  - `/home/autobyteus/workspace`
  - `/home/autobyteus/shared`
- Each node had a sha256-shaped `com.autobyteus.configHash` label and `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`.
- `docker exec` confirmed `cd "$AUTOBYTEUS_TEMP_WORKSPACE_DIR" && pwd` resolves to `/home/autobyteus/workspace`.

### `E2E-002` Node-private workspace separation

- A file written in node 0 at `/home/autobyteus/workspace/node0.txt` appeared in only node 0's host workspace folder.
- Node 1 did not see node 0's workspace file under its `/home/autobyteus/workspace`.
- A file written in node 1 appeared in only node 1's host workspace folder.

### `E2E-003` Shared folder visibility

- A file written by node 0 to `/home/autobyteus/shared/shared-from-node0.txt` appeared in the shared host folder.
- Node 1 read that same file from `/home/autobyteus/shared` without any container recreation.

### `E2E-004` Dynamic subfolder visibility after one-time mount

- A new host subfolder/file under the shared host folder was visible in node 0 at `/home/autobyteus/shared/...`.
- A new host subfolder/file under node 1's host workspace folder was visible in node 1 at `/home/autobyteus/workspace/...`.
- Container IDs before/after were unchanged, proving no recreate was required for new subfolders under the mounted parents.

### `E2E-005` Existing-container transition

- A legacy-style container was created with only the original three named volumes and launcher labels.
- Sentinel files were written into all three named-volume-backed paths.
- `workspace apply --name <legacy-node>` recreated the container and reported named-volume preservation.
- After apply:
  - container id changed,
  - published host ports were preserved,
  - friendly node label was preserved,
  - new bind mounts and temp workspace env were present,
  - sentinel files in all three named volumes survived.

### `E2E-006` Launcher inspection output

- `workspace paths --name <node>` output included the shared workspace host root, node workspace host path, `/home/autobyteus/workspace`, `/home/autobyteus/shared`, and temp workspace env.
- `storage --name <node>` output labeled private named volumes and host bind mounts and included the note that `workspace apply` keeps named volumes.

## Passed

- Static Bash syntax and ShellCheck.
- Existing repository Python tests and frontend Vitest tests.
- Real Docker two-node mount/env/file-visibility validation.
- Real Docker existing-container transition through `workspace apply`.
- Cleanup verification found no leftover `ab-e2e-dvmux-*` containers or volumes.

## Failed

None.

## Not Tested / Out Of Scope

- Native Windows PowerShell runtime behavior: not tested because `pwsh` is unavailable on this host. Existing source-contract test passed and the native parse test skipped as designed.
- Windows Docker Desktop path creation/quoting and file-sharing prompts: not available on this macOS validation host.
- Full app UI workflow for adding remote nodes: this ticket changes launcher commands/copy, not Electron Docker process control.
- Host-backed `/home/autobyteus/data` migration/export: explicitly out of scope.

## Blocked

- Native PowerShell parse/runtime validation is environment-blocked on this host (`pwsh` not installed). This is a residual validation gap, not a product failure observed in the implementation.

## Cleanup Performed

- Removed validation containers:
  - `ab-e2e-dvmux-1779210267-82212-0`
  - `ab-e2e-dvmux-1779210267-82212-1`
  - `ab-e2e-dvmux-1779210267-82212-legacy`
- Removed all nine unique validation Docker volumes for those nodes.
- Removed the temporary validation run directory.
- Verified no leftover Docker containers or volumes matching `ab-e2e-dvmux` remained.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No failure classification applies. Latest authoritative result is `Pass`.

## Recommended Recipient

`delivery_engineer`

Because no repository-resident durable validation code was added or updated after code review, this pass does not require a return trip through `code_reviewer`.

## Evidence / Notes

- Real Docker validation proved the core UX claims: existing named volumes are still present, new bind mounts are present, default temp workspace env points at `/home/autobyteus/workspace`, node workspaces are isolated, `/home/autobyteus/shared` is common, new subfolders under mounted parents appear without recreation, and `workspace apply` safely recreates an existing container while keeping named volumes and ports.
- Documented residual product risk remains: files written from containers on Linux bind mounts may be root-owned because the server container runs as root.
- Public launcher maintainability debt remains as documented upstream; no validation-stage failure was observed.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E and executable validation passed for the available macOS + Docker Desktop environment. Native PowerShell runtime validation remains not tested due unavailable `pwsh`.
