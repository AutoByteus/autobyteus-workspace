# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/requirements.md`
- Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/investigation-notes.md`
- Design Spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/design-spec.md`
- Design Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/design-review-report.md`
- Implementation Handoff: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/implementation-handoff.md`
- Code Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Revised code-review pass round 2 for `docker-launcher-ux-defaults`; refresh/resume API/E2E investigation against revised installer-output implementation and latest code-review report.
- Prior Investigation Reviewed: Round 1 canonical investigation and execution report existed; no unresolved failures, but round 2 implementation changed installer output and implementation-owned tests after the prior API/E2E pass.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

Current approved behavior to prove from the round 2 upstream package:

- Install/PATH UX (`FR1`, `AC1`): when the install directory is absent from the current shell `PATH`, `install` must print the installed executable path, an immediately working direct invocation, current-shell `export PATH=...` guidance, and truthful messaging that the installer cannot mutate the already-running parent shell. If automatic profile update is skipped, unavailable, blocked by a non-equivalent existing managed block, or fails, it must print concrete nvm/Anaconda-style persistent setup commands for the detected profile using guarded/idempotent append plus `source`. If automatic managed profile update succeeds or an equivalent entry already exists, it must not print duplicate persistent setup commands.
- Sequential friendly ports (`FR2`, `AC2`): fresh indexed nodes prefer deterministic host ports when available: server-0 `8001/5908/6080/9228`, server-1 `8002/5909/6081/9229`, server-2 `8003/5910/6082/9230`; unavailable preferred ports and bind/start failures fall back to safe random ports; saved ports remain authoritative unless unavailable.
- Read-only discovery defaults (`FR3`, `AC3`): `urls`/`ports`, `workspace paths`, and `storage` default to all managed nodes; `--all` is accepted for all-node output; explicit single-node selectors remain available; ambiguous `--all` plus explicit node is rejected for the changed read-only commands.
- Mutating/stream safety (`FR4`, `AC4`): `workspace apply`, `stop`, `logs`, `upgrade`, `destroy`, and `reset` must not silently broaden to all nodes except through explicit existing all-node forms.
- Implementation handoff legacy/compatibility check remains clean in round 2: no backward-compatibility mechanism introduced; saved-port preservation and random fallback are required current behavior; old boolean `prefer_defaults` allocation policy was removed.
- Code review round 2 passed with no blocking findings and reviewed the round 2 durable test updates that assert copy-paste persistent setup output and shell-safe quoting.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Bash installer PATH/profile output and automatic profile update | Changed / Added | Requirements `FR1`/`AC1`; design spec section 1; implementation handoff revision 2; code review round 2 focus | Current durable tests are valid and already round-2 code-reviewed. Add a temporary executable install-output probe executing the emitted persistent command block with a custom quoted install dir/profile. |
| Printed persistent setup block when profile update skipped/unavailable/fails | Added in round 2 | Requirements `AC1`; implementation handoff revision 2; code review round 2 focus | Durable test `test_bash_install_no_update_path_skips_profile_write` is current. Temporary probe should verify copy/paste block is executable/idempotent. |
| Suppression of duplicate persistent setup commands when automatic update succeeds/equivalent entry exists | Changed in round 2 | Implementation handoff assumptions; code review round 2 spot checks | Durable test `test_bash_install_when_path_missing_updates_profile_and_prints_current_shell_guidance` and idempotency test are valid; final unit run sufficient. |
| Node-index friendly port preference for fresh nodes | Changed | Requirements `FR2`/`AC2`; design section 2; prior and round 2 code review pass | Retain durable fake-Docker coverage and rerun representative real Docker sequential-port probe against latest implementation. |
| Preferred-port collision fallback | Preserved with changed first preference source | Requirements non-goal random fallback; `FR2`/`AC2`; design section 2.2 | Retain durable test and rerun real/high-fidelity probe with host port held unavailable. |
| Saved-port preservation for existing nodes | Preserved | Requirements `FR2`; design backward compatibility/migration; implementation legacy check | Rerun real Docker probe to confirm state/discovery/start preserves saved ports. |
| Bind/start retry after saved/friendly ports fail | Changed / Preserved invariant | Design section 2.3; code review residual risk; implementation handoff downstream hint | Existing fake-Docker durable test remains valid; rerun practical real Docker stopped-container start failure by holding a saved host port. |
| Read-only discovery defaults for `urls`/`ports`, `workspace paths`, `storage` | Changed | Requirements `FR3`/`AC3`; design section 3; implementation handoff | Retain durable tests and rerun real Docker output probe after multi-node creation. |
| Ambiguous `--all` plus explicit node for changed read-only commands | Added rejection | Design review residual risk; implementation handoff | Retain durable script test; final unit run sufficient. |
| Mutating/stream command safety | Preserved | Requirements `FR4`/`AC4`; design section 3.4; code review round 2 pass | Retain durable tests and rerun real/high-fidelity command probes where practical. |
| PowerShell launcher parity for Linux PATH profile behavior | Out Of Scope / Preserved existing parse contract | Design scope says PowerShell parity not required for Linux PATH profile behavior | Keep existing cross-launcher contract/parse tests as still valid; no new API/E2E coverage needed. |
| Public durable documentation | Changed docs impact | Code review docs-impact verdict round 2 | Delivery-stage responsibility; API/E2E records no coverage-code action. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_new_container_adds_bind_mounts_without_removing_named_volumes` | New container keeps launcher-owned bind mounts, named volumes, unqualified port mappings, config hash, no removed profile state. | Existing launcher contract plus no legacy profile retention. | Still Valid | Source inspection of current test; requirements preserve volume semantics. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_profile_option_is_rejected_as_unknown` | Removed profile option remains rejected. | No legacy retention / no obsolete profile path. | Still Valid | Test asserts no removed `--profile` path. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_workspace_paths_and_storage_commands_report_the_launcher_owned_mapping` | Explicit `--name` workspace/storage output shows launcher-owned paths and volumes. | `FR3` explicit single-node forms remain; non-goal named volume semantics. | Still Valid | Test uses `--name`; changed default-all does not obsolete explicit single-node output. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_workspace_apply_all_recreates_stale_containers_with_current_bind_mounts` | `workspace apply --all` remains explicit all-node mutating action and preserves volumes. | `FR4` safety; design preserves explicit all. | Still Valid | Requirement keeps mutating all only explicit. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_bash_curl_pipe_mode_resolves_modules_from_source_base` | Bash curl-pipe mode still resolves modules from source base. | Install/curl public launcher contract. | Still Valid | Installer changes must not break curl-pipe command execution. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_bash_install_writes_entry_and_modules_for_installed_cli` | Installed CLI writes entry/modules and prints direct path/current export when install dir is missing. | `FR1`/`AC1`; design section 1. | Still Valid | Current round 2 test asserts quoted direct path and export. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_bash_install_when_path_missing_updates_profile_and_prints_current_shell_guidance` | Missing-PATH install updates `.bashrc`, prints direct path/export/current-shell note, and does not print copy/paste persistent setup when managed update succeeds. | `FR1`/`AC1`; implementation handoff revision 2. | Still Valid | Current test now asserts no duplicate persistent setup block on successful managed update. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_bash_install_path_profile_update_is_idempotent` | Re-running install does not duplicate managed profile block and reports persistent PATH already configured. | `AC1` duplicate-safe persistent PATH handling. | Still Valid | Test counts begin/end markers after two installs. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_bash_install_no_update_path_skips_profile_write` | `--no-update-path` skips managed block and prints concrete persistent setup block with shell-safe custom path quoting. | `FR1` opt-out; `AC1` concrete copy-paste persistent setup commands. | Still Valid | Round 2 code review identified this as current durable coverage for revised behavior. | Run final unit coverage and complement with temporary execution of emitted command block. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_new_containers_prefer_sequential_friendly_ports` | Fake Docker multi-node creation maps server-0/1/2 to friendly sequential ports. | `FR2`/`AC2`; design section 2.4. | Still Valid | Directly covers deterministic allocation at script level. | Run final unit coverage; complement with real Docker probe. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_preferred_port_collision_falls_back_for_that_service` | Held preferred backend port causes fallback while other preferred ports remain friendly. | `FR2`/`AC2` fallback. | Still Valid | Uses local socket to make preferred port unavailable. | Run final unit coverage; complement with real Docker probe. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_bind_failure_retry_uses_random_ports_after_first_friendly_attempt` | Fake daemon bind failure on first `docker run` causes retry without reusing friendly preferred ports. | Design section 2.3 retry contract; code review residual risk. | Still Valid | Fake Docker emits daemon-like bind error and records retry args. | Run final unit coverage; complement with practical real Docker saved-port start-failure probe. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_read_only_discovery_commands_default_to_all_nodes` | `urls`, `ports`, `workspace paths`, and `storage` include both managed nodes by default. | `FR3`/`AC3`. | Still Valid | Directly matches changed default-all behavior. | Run final unit coverage; complement with real Docker output probe. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_read_only_discovery_commands_keep_explicit_single_node_output` | Explicit node forms show only selected node. | `FR3` explicit single-node selectors. | Still Valid | Directly matches acceptance criteria. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_read_only_discovery_commands_reject_all_with_name` | Changed read-only commands reject `--all` plus explicit node. | Design review residual risk. | Still Valid | Prevents ambiguous target behavior. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_mutating_commands_do_not_default_to_all_nodes` | `workspace apply` defaults to server-0 only; `upgrade`/`destroy` require `--all`. | `FR4`/`AC4`. | Still Valid | Directly checks mutating safety. | Run final unit coverage; complement with real/high-fidelity command probes. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_matches_the_shared_workspace_cli_contract` | Bash/PowerShell launchers retain shared workspace contract and removed profile code stays absent. | Existing cross-launcher contract; PowerShell parity not expanded. | Still Valid | Design says PowerShell PATH profile parity not required; existing contract remains relevant. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_public_launcher_source_files_stay_within_reviewable_size_guard` | Public launcher source files remain within 500 effective non-empty line guard. | Code review size/structure audit. | Still Valid | Guard remains a repository quality check. | Run final unit coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_parses_when_pwsh_is_available` | PowerShell files parse if `pwsh` exists. | Existing parse contract. | Still Valid | Environment may skip if `pwsh` is unavailable; still valid. | Run final unit coverage. |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Server Dockerfile/script defaults keep latest CLI version behavior. | Adjacent Docker CLI default behavior, not this launcher UX change. | Out Of Scope | Code review reran it as regression; it does not assert changed launcher behavior. | Run as regression because upstream checks included it; no coverage change. |
| `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts` | Web utility lists public launcher install/direct commands and raw GitHub URLs. | Public command list remains valid; docs/UI sync may be delivery-stage. | Out Of Scope | The command strings remain same; output semantics changed. | No API/E2E action. Delivery may review docs/UI text if needed. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No current durable coverage asserts old default-node-only discovery, old random server-1 ports, or old generic-only PATH persistence advice. | Round 2 code review found no stale tests or obsolete installer branch. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Existing implementation-stage durable tests already cover AC1-AC4 and round 2 installer-output clarification; these test changes were reviewed by code-review round 2. | N/A | No additional repository-resident durable coverage is needed in API/E2E stage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Existing changed durable coverage is current and already code-review round-2 passed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| AE2E-UNIT-001 | Run `bash -n` for changed Bash launcher files. | Syntax validity of Bash entry and modules. | Command evidence only; no new durable test needed. |
| AE2E-UNIT-002 | Run `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py`. | Revised test file syntax/typing parse under Python. | Command evidence only. |
| AE2E-UNIT-003 | Run `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults`. | Current valid durable coverage passes, including round 2 installer persistent setup assertions and fake-Docker AC1-AC4 coverage. | Uses existing durable tests; no new file needed. |
| AE2E-INSTALL-001 | Isolated `HOME`; run `install` with automatic managed update and `install --no-update-path` with custom path containing spaces and a single quote; execute the emitted persistent setup block twice. | Current-shell/direct path/manual persistence output; shell-safe detected profile/path quoting; idempotent copy-paste persistent command block. | Environment-specific CLI probe; durable tests already assert output. |
| AE2E-REAL-001 | In isolated state/shared workspace with real Docker Engine, run three `new-container` commands using `nginx:alpine`; verify state and Docker port bindings for server-0/1/2. | Real Docker friendly sequential allocation and container run/start success when preferred ports are available. | Depends on local Docker daemon/global container names; ticket evidence log is appropriate. |
| AE2E-REAL-002 | With the real Docker nodes from AE2E-REAL-001, run `urls`, `ports`, `workspace paths`, `storage`, explicit single-node forms, `status`, `logs`, `stop`, `workspace apply`, and invalid `upgrade`/`destroy` without `--all`. | Read-only default-all output, single-node narrowing, saved-port preservation across stop/start via `workspace apply`, and mutating/stream safety on real containers. | Environment-lifecycle probe; not stable as durable repository test. |
| AE2E-REAL-003 | In a fresh isolated real Docker state, hold host port `8001` with a local socket/server and create server-0; inspect resulting state. | Preferred backend fallback when a friendly port is unavailable while other friendly ports remain preferred. | Requires host port availability/race-free local socket; ticket evidence log is appropriate. |
| AE2E-REAL-004 | In a fresh isolated real Docker state, create server-0, stop it, hold saved backend port, then run `workspace apply --name autobyteus-server-0`; inspect output/state. | Real Docker saved-port start bind failure is classified, container is recreated, and retry allocates fresh ports with saved port no longer used. | Requires real daemon bind behavior and temporary global container name; keep as execution evidence only. |
| AE2E-CLEAN-001 | Run `git diff --check`. | No whitespace errors in current diff/artifacts. | Command evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real shell profile behavior across every shell/profile layout | Local execution can isolate Bash/zsh profile selection and verify script output; exhaustive user shell variants are not practical. | Low/Medium: profile ownership varies by user, but direct path/current-shell/manual persistent guidance remains authoritative. | None for API/E2E; delivery docs should mention current-shell export/direct path if docs are updated. |
| Full production `autobyteus/autobyteus-server:latest` image launch | Large/slow image and not necessary for launcher allocation/targeting semantics; launcher behavior can be proven with `nginx:alpine` because Docker port binding, labels, state, volumes, and container lifecycle are the relevant boundary. | Low: image-specific app behavior is not changed by this ticket. | None. |
| Initial real `docker run` bind-failure race exactly between precheck and run | Deterministic real-daemon failure path is stopped-container `docker start` with a held saved port; fake-Docker durable test covers initial run bind failure string/retry. | Low: both paths use the same `is_bind_failure` classification and retry allocator invariant after failure. | None unless real saved-port failure probe fails. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before round 2 execution. | N/A | Upstream requirements/design are specific; implementation handoff legacy check is clean; code review round 2 passed. | N/A |

## Execution Plan

1. Execute Bash syntax validation and Python test-file compile for current round 2 implementation.
2. Execute existing current valid durable unit/script coverage: `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults`.
3. Execute focused isolated installer-output probe, including default managed update and `--no-update-path` printed persistent command block execution/idempotency.
4. Execute isolated real Docker multi-node lifecycle probe with `nginx:alpine` and isolated `AUTOBYTEUS_DOCKER_STATE_DIR` / `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`; capture state files, command output, `docker ps`, `docker port`, and cleanup.
5. Execute isolated real Docker preferred-port fallback probe by holding port `8001`; capture output/state and cleanup.
6. Execute isolated real Docker saved-port start retry probe by holding a stopped node's saved backend port; capture output/state and cleanup.
7. Update canonical API/E2E execution coverage report round 2 with pass/fail/blocker classification and artifact paths.
8. Because no repository-resident durable coverage is planned for addition/update/removal during API/E2E after code-review round 2, pass results to `delivery_engineer` if execution passes; reroute only if execution evidence exposes a real implementation/design/requirement failure.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 2 implementation-owned durable coverage changes were already reviewed by code-review round 2. API/E2E will add only temporary execution evidence and update canonical artifacts.
