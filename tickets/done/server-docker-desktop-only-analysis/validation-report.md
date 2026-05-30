# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/review-report.md`
- Current Validation Round: `2`
- Trigger: User requested additional live frontend/browser validation of Settings > Nodes > Phone Setup and Docker Guide against the existing Electron-started backend.
- Prior Round Reviewed: `Round 1 pass; no prior unresolved failures`
- Latest Authoritative Round: `2`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass; real Docker lifecycle validation requested | N/A | No | Pass | No | Validated Bash launcher lifecycle paths against an isolated real Docker daemon, reran durable launcher/frontend tests, and checked stale references plus Docker `/mobile` packaging. |
| 2 | User requested live frontend/browser validation using existing Electron-started backend | None; Round 1 had no unresolved failures | No | Pass | Yes | Started Nuxt dev frontend against `http://127.0.0.1:29695`, opened Settings > Nodes > Phone Setup and Docker Guide in browser, verified rendered copy/commands and backend-loaded Phone Access data. |

## Validation Basis

Validation was derived from:

- Requirements REQ-001 through REQ-012 and acceptance criteria AC-001 through AC-008.
- Design spines DS-001 (public Docker launcher lifecycle), DS-002 (Phone Setup pairing wording/verification), and DS-003 (`/mobile` image packaging preservation).
- Implementation handoff legacy/compatibility removal check and downstream validation hints.
- Code review residual risk list, especially real Docker lifecycle coverage and old profile-managed state/container normalization.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Notes:

- The old-profile scenario was exercised as a pre-change fixture only to prove cleanup/reconciliation. The validated behavior rewrote state without `PROFILE=`, removed old profile label/env from the recreated container, and used the single normal run shape.
- No compatibility alias for `--profile`, `mobile-safe`, `standard`, or related removed profile names was observed.

## Validation Surfaces / Modes

- Bash public Docker launcher CLI and lifecycle behavior using a real Docker daemon isolated via Docker-in-Docker.
- Docker container runtime inspection for labels, env, caps, security options, port bindings, named volumes, and bind mounts.
- Launcher state-file rewrite behavior for old `v4`/profile-managed state.
- Launcher durable Python tests.
- Frontend durable Vitest coverage for Docker Guide command rendering and Phone Access copy/verification behavior.
- Static active-source stale reference scan and Dockerfile `/mobile` packaging checks.
- Live local frontend browser validation of Settings > Nodes > Phone Setup and Docker Guide against the existing Electron-started backend at `http://127.0.0.1:29695` through Nuxt dev proxy on `http://127.0.0.1:32123`.
- PowerShell source parity via existing durable tests; PowerShell runtime execution was not available in this macOS arm64 environment.

## Platform / Runtime Targets

- Host: macOS 26.2 arm64 (`Darwin ... arm64`).
- Host Docker: Docker Desktop/Engine `29.0.1`, server OS `Docker Desktop`, architecture `aarch64`, driver `overlayfs`.
- Isolated lifecycle daemon: Docker-in-Docker `docker:29-dind`, inner server `29.5.2`, `Alpine Linux v3.23 (containerized)`, architecture `aarch64`, driver `overlayfs`.
- Validation images inside isolated daemon: `nginx:alpine` and `nginx:1.27-alpine` as lightweight long-running images for launcher lifecycle/run-shape validation.
- Frontend test runner: `vitest v3.2.4` via `pnpm -C autobyteus-web exec vitest`.
- Round 2 live frontend: Nuxt `3.21.1` dev server at `http://127.0.0.1:32123`, configured with `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695` / `BACKEND_REST_BASE_URL=http://127.0.0.1:29695/rest` / `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:29695/graphql`.

## Lifecycle / Upgrade / Restart / Migration Checks

| Scenario ID | Lifecycle / Migration Check | Result | Evidence |
| --- | --- | --- | --- |
| S-001 | `new-container --profile standard` rejection | Pass | `profile-rejection.txt`: rejected as `Unknown new-container option(s): --profile standard`; no managed container created. |
| S-002 | `new-container --image nginx --tag alpine` | Pass | `inspect-new-container.json` / `new-container-summary.json`: `CAP_SYS_ADMIN`, `seccomp=unconfined`, non-localhost published ports, named volumes, workspace/shared bind mounts, no profile label/env/state. |
| S-003 | `urls`, `status`, `storage --all`, `logs autobyteus-server-0 --tail 20` | Pass | `urls.txt`, `status.txt`, `storage-all.txt`, `logs-tail.txt`. |
| S-004 | `workspace apply --all` after changing shared workspace root | Pass | `workspace-apply-all.txt` and `inspect-workspace-apply.json`: launcher reported config change and recreated with new bind mount sources while preserving named volumes. |
| S-005 | `upgrade --all --image nginx --tag 1.27-alpine` | Pass | `upgrade-all.txt` and `inspect-upgrade-all.json`: image-change recreation, state `IMAGE_REF=nginx:1.27-alpine`, normal run shape retained. |
| S-006 | `reset --image nginx --tag alpine` | Pass | `reset.txt` and `inspect-reset.json`: removed managed container, recreated `autobyteus-server-0`, normal run shape retained. |
| S-007 | Old `v4`/profile-managed state + container normalization on `workspace apply --all` | Pass | `inspect-old-profile-before.json`, `old-profile-workspace-apply-all.txt`, `inspect-old-profile-after.json`, `old-profile-after-summary.json`, final state file under `dind-host-1780117585-24214/state/nodes/autobyteus-server-0.env`. Final state has no `PROFILE=`; final container has no `com.autobyteus.profile` label and no `AUTOBYTEUS_NODE_PROFILE` env. |
| S-011 | Live Settings > Nodes > Phone Setup page against Electron-started backend | Pass | Round 2 evidence: `phone-setup-page.png`, `phone-setup-ui-check.json`, `electron-backend-proxy-checks.log`. Rendered copy says `Set up private HTTPS phone access`, `Tailscale Serve HTTPS URL`, and `Pair a phone/PWA to this desktop over any private network you already trust`; no removed profile terms observed. Backend data loaded from `127.0.0.1:29695` through Nuxt proxy. |
| S-012 | Live Settings > Nodes > Docker Guide page against same frontend/backend setup | Pass | Round 2 evidence: `docker-guide-page.png`, `docker-guide-ui-check.json`. Rendered guide says `Start Docker node`, `normal Docker node`, and shows `autobyteus-docker new-container`; no `--profile` or removed profile terms observed. |

## Coverage Matrix

| Requirement / AC | Coverage | Result |
| --- | --- | --- |
| REQ-001 / REQ-005 / AC-003 | Bash launcher real Docker `new-container`, `workspace apply --all`, `upgrade --all`, `reset`; runtime inspect confirmed normal Docker shape. | Pass |
| REQ-002 | PowerShell source parity covered by durable launcher test; runtime parse not available. | Partial / source pass, runtime not tested |
| REQ-003 / AC-002 | Bash `--profile standard` rejected as unknown; public launcher grep has no `--profile`. | Pass |
| REQ-004 / AC-004 | Runtime inspect and state checks confirmed no profile label/env/state after create/recreate; old state rewritten without `PROFILE=`. | Pass |
| REQ-006 | Old `v4`/profile-managed fixture detected stale config and recreated to v5 normal run shape. | Pass |
| REQ-007 / AC-005 | Docker Guide command/catalog/component Vitest passed; live browser Docker Guide rendered `autobyteus-docker new-container` and no profile flag. | Pass |
| REQ-008 / REQ-009 / REQ-012 / AC-006 | Targeted Phone Access and remote-access Vitest passed; live browser Phone Setup rendered private HTTPS/Tailscale Serve wording and backend-loaded Phone Access data; active stale-term scan clean. | Pass |
| REQ-010 / AC-001 / AC-007 | Active non-ticket stale-reference scan clean for removed terms. | Pass |
| REQ-011 / AC-008 | Dockerfile packaging lines still copy `autobyteus-web/dist-mobile/public` to `autobyteus-server-ts/mobile-web` in all three Dockerfiles. | Pass |

## Test Scope

Commands and checks run:

- `tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1/run-docker-lifecycle-validation.sh`
- `bash -n scripts/public/docker/autobyteus-docker.sh`
- `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `git diff --check`
- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace`
- `pnpm -C autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts stores/__tests__/phoneAccessStore.spec.ts utils/remoteAccess/__tests__/mobileSessionBootstrap.spec.ts`
- Active-source stale term scan excluding ticket history and `node_modules`.
- Public Docker launcher `--profile` grep.
- Dockerfile `/mobile` packaging grep.
- `command -v pwsh` and a containerized PowerShell attempt; see Not Tested / Blocked.
- Round 2 live frontend/browser checks:
  - Started Nuxt dev frontend with existing Electron-started backend at `http://127.0.0.1:29695`.
  - Opened `http://127.0.0.1:32123/settings?section=nodes&nodeTab=phoneSetup` and `http://127.0.0.1:32123/settings?section=nodes&nodeTab=dockerGuide`.
  - Captured screenshots and page-text assertions for updated Phone Setup and Docker Guide content.

## Validation Setup / Environment

A pre-existing host Docker container named `autobyteus-server-0` with `com.autobyteus.launcher=server-docker` was present before validation. To avoid modifying any user/runtime host container, destructive lifecycle paths were run against an isolated Docker-in-Docker daemon with separate state and shared workspace roots under:

`/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1/dind-host-1780117585-24214`

The changed launcher behavior is image-agnostic at the validated boundary, so `nginx` images were used as long-running container images while validating real Docker pull/run/recreate/state behavior and container configuration.

Round 2 additionally used the existing Electron-started backend at `http://127.0.0.1:29695`. Direct and proxied health checks returned `{"status":"ok","message":"Server is running"}`. Phone Access settings and address candidates loaded through the Nuxt dev proxy, proving the page was not only a static render.

## Tests Implemented Or Updated

No repository-resident durable tests were added or updated during API/E2E validation rounds 1 or 2.

Existing durable tests updated by implementation were rerun and passed:

- `scripts/tests/test_public_docker_launcher_shared_workspace.py`: 6 tests run, 1 skipped because local `pwsh` is unavailable.
- Targeted `autobyteus-web` Vitest: 5 files, 23 tests passed.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

Evidence directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1`

Key evidence files:

- `docker-lifecycle-summary.md`
- `docker-lifecycle-validation.log`
- `durable-launcher-tests.log`
- `frontend-targeted-vitest.log`
- `stale-reference-and-packaging-checks.log`
- `powershell-container-parse-profile.log`
- `inspect-new-container.json`, `new-container-summary.json`
- `inspect-workspace-apply.json`
- `inspect-upgrade-all.json`
- `inspect-reset.json`
- `inspect-old-profile-before.json`
- `inspect-old-profile-after.json`, `old-profile-after-summary.json`
- Round 2 live frontend evidence:
  - `validation-evidence/round-2/frontend-dev-server.log`
  - `validation-evidence/round-2/electron-backend-proxy-checks.log`
  - `validation-evidence/round-2/phone-setup-page.png`, `phone-setup-page-viewport.png`, `phone-setup-ui-check.json`
  - `validation-evidence/round-2/docker-guide-page.png`, `docker-guide-page-viewport.png`, `docker-guide-ui-check.json`

## Temporary Validation Methods / Scaffolding

- Temporary Docker-in-Docker lifecycle harness: `validation-evidence/round-1/run-docker-lifecycle-validation.sh`.
- Temporary Nuxt dev server for live UI validation in round 2, started against `http://127.0.0.1:29695` and stopped after evidence capture.
- The harness is retained as evidence only; it is not integrated as durable repository test coverage.
- Docker-in-Docker daemon and all nested validation containers were removed during cleanup.

## Dependencies Mocked Or Emulated

- Docker daemon was real but isolated via Docker-in-Docker to avoid host managed-container side effects.
- The application image was substituted with `nginx` solely to exercise launcher lifecycle and Docker run configuration with a long-running container. No backend API behavior depended on the removed profile.
- No API/backend service dependency was mocked for changed behavior.
- PowerShell container runtime attempt used emulation because the official `mcr.microsoft.com/powershell:latest` manifest did not provide `linux/arm64`; the emulated container aborted under qemu and was treated as environment-not-supported, not an implementation failure.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Round 1 | No unresolved failures; pass result | N/A | Still passed; no regressions found in added live frontend validation | Round 2 evidence directory | Round 2 broadened coverage rather than resolving a prior failure. |

## Scenarios Checked

### S-001 — Removed profile option rejection

- Command: `new-container --profile standard --image nginx --tag alpine` via Bash launcher against isolated Docker daemon.
- Result: Pass.
- Evidence: `profile-rejection.txt`; no managed container existed after rejection.

### S-002 — Normal new container run shape

- Command: `new-container --image nginx --tag alpine`.
- Result: Pass.
- Evidence: container inspect shows launcher/node/config labels only, no profile label/env, `CAP_SYS_ADMIN`, `seccomp=unconfined`, unqualified/non-`127.0.0.1` port bindings, named volumes, node workspace bind mount, shared bind mount, and state file without `PROFILE=`.

### S-003 — Status/URL/storage/log reporting

- Commands: `urls`, `status`, `storage --all`, `logs autobyteus-server-0 --tail 20`.
- Result: Pass.
- Evidence: output files in validation evidence directory.

### S-004 — Workspace apply all

- Command: `workspace apply --all` after changing the shared workspace root.
- Result: Pass.
- Evidence: launcher reported config change and recreated the managed container with new bind mount sources and retained named volumes.

### S-005 — Upgrade all

- Command: `upgrade --all --image nginx --tag 1.27-alpine`.
- Result: Pass.
- Evidence: launcher reported image-change recreation; state updated to `IMAGE_REF=nginx:1.27-alpine`; normal run shape retained.

### S-006 — Reset

- Command: `reset --image nginx --tag alpine`.
- Result: Pass.
- Evidence: managed container removed and default node recreated with normal run shape and no profile state.

### S-007 — Old profile-managed state/container normalization

- Fixture: manually created old-style state with `CONFIG_HASH=old-v4-profile-hash` and `PROFILE=mobile-safe`, plus a container carrying `com.autobyteus.profile=mobile-safe` and `AUTOBYTEUS_NODE_PROFILE=mobile-safe`.
- Command: `workspace apply --all`.
- Result: Pass.
- Evidence: recreated container has no old profile label/env, normal run shape, unqualified ports, and state rewritten without `PROFILE=`.

### S-008 — Durable launcher tests

- Result: Pass.
- Evidence: `durable-launcher-tests.log`: syntax/compile/diff checks passed; Python unittest ran 6 tests with 1 `pwsh` skip.

### S-009 — Targeted frontend tests

- Result: Pass.
- Evidence: `frontend-targeted-vitest.log`: 5 files and 23 tests passed.

### S-010 — Stale references and packaging

- Result: Pass.
- Evidence: `stale-reference-and-packaging-checks.log`: active-source removed-term scan clean, public launcher `--profile` scan clean, Dockerfile `/mobile` copy lines present.

### S-011 — Live Phone Setup page with existing backend

- Setup: Nuxt dev frontend at `http://127.0.0.1:32123` configured to proxy to the existing Electron-started backend at `http://127.0.0.1:29695`.
- Route: `/settings?section=nodes&nodeTab=phoneSetup`.
- Result: Pass.
- Evidence: `validation-evidence/round-2/phone-setup-page.png`, `phone-setup-page-viewport.png`, `phone-setup-ui-check.json`, `electron-backend-proxy-checks.log`.
- Observed: page rendered `Set up private HTTPS phone access`, Tailscale Serve/MagicDNS guidance, `Tailscale Serve HTTPS URL`, backend-loaded Phone Access enabled state, backend-loaded URL candidates including `http://127.0.0.1:29695`, and no removed profile/mobile-safe terms.

### S-012 — Live Docker Guide page with existing backend

- Setup: same Nuxt dev frontend/backend.
- Route: `/settings?section=nodes&nodeTab=dockerGuide`.
- Result: Pass.
- Evidence: `validation-evidence/round-2/docker-guide-page.png`, `docker-guide-page-viewport.png`, `docker-guide-ui-check.json`.
- Observed: page rendered `Start Docker node`, normal-Docker wording, `autobyteus-docker new-container`, `workspace apply --all`, `storage`, `urls`, `status`, and `logs`; no `--profile` or removed profile/mobile-safe terms.

## Passed

- Bash launcher real Docker lifecycle and migration scenarios S-001 through S-007 passed.
- Existing durable launcher tests passed: 6 tests, 1 skipped for unavailable `pwsh`.
- Targeted frontend Vitest passed: 5 files, 23 tests.
- Active non-ticket stale-reference scan passed.
- Docker `/mobile` packaging checks passed.
- Cleanup checks showed no validation Docker-in-Docker containers and no PowerShell validation containers/images left behind.
- Round 2 live frontend browser checks passed against the existing Electron-started backend.

## Failed

None.

## Not Tested / Out Of Scope

- Full Windows PowerShell runtime lifecycle validation was not executed. Local `pwsh` is unavailable on this host. A containerized attempt using `mcr.microsoft.com/powershell:latest` could not provide a native `linux/arm64` runtime and the emulated `amd64` container aborted under qemu. Source parity remains covered by the durable launcher test, but runtime PowerShell parse/profile rejection is a residual environment-specific validation gap.
- Full AutoByteus server application health/API behavior inside `autobyteus/autobyteus-server:latest` was not revalidated because this ticket changes launcher/profile policy, docs/copy, and command surfaces; server runtime profile behavior was previously investigated as not branching on `AUTOBYTEUS_NODE_PROFILE`.
- Browser-rendered packaged-app UI is now covered by round 2 live Nuxt browser validation for Settings > Nodes > Phone Setup and Docker Guide. A full packaged Electron binary/window run was not performed; the live frontend used the existing Electron-started backend at `127.0.0.1:29695`.

## Blocked

- PowerShell runtime execution is blocked in this environment by missing host `pwsh` and no usable native `linux/arm64` official PowerShell container image from the attempted route. This does not block the overall validation result because PowerShell source parity was reviewed and tested statically, and the handoff explicitly scoped runtime validation to environments that support it.

## Cleanup Performed

- Removed the Docker-in-Docker validation daemon and nested validation containers.
- Removed failed PowerShell validation container/image after the qemu-aborted attempt.
- Removed earlier failed/smoke DIND host evidence directories, retaining only the successful round evidence directory.
- Stopped the temporary Nuxt dev server used for round 2 live frontend validation after evidence capture.
- Left the pre-existing host `autobyteus-server-0` managed container untouched.

## Classification

- No failure classification applies.
- Latest validation result is `Pass`.

## Recommended Recipient

`delivery_engineer`

Rationale: API/E2E validation passed, including the added live frontend/browser validation requested by the user, and no repository-resident durable validation code was added or updated after code review, so the package can proceed to delivery.

## Evidence / Notes

- Canonical round 1 evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1`
- Canonical round 2 live frontend evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-2`
- Lifecycle summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1/docker-lifecycle-summary.md`
- Main lifecycle log: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1/docker-lifecycle-validation.log`

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 2 is authoritative. Real Docker lifecycle validation passed in an isolated daemon; durable tests and static checks passed; live frontend Settings > Nodes > Phone Setup and Docker Guide validation passed against the existing Electron-started backend; no invalid compatibility retention observed. PowerShell runtime execution remains not tested due environment support limits.
