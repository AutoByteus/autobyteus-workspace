# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review pass handed to API/E2E for coverage investigation and executable validation.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The current approved behavior is that `autobyteus-docker upgrade --all` must refresh every launcher-managed Docker node while preserving each node's saved Docker image reference by default. Mixed fleets must keep their current image lines, especially `latest-zh` nodes, instead of being silently retargeted to `autobyteus/autobyteus-server:latest`. Explicit `--tag` and/or `--image` options on `upgrade --all` remain intentional all-node retarget requests. Bash and PowerShell public launchers must stay aligned. Public docs and help must describe preserve-current-image default semantics and explicit retarget examples. Existing state fields (`IMAGE_REF` and `imageRef`) remain authoritative; missing/malformed image refs fall back to the default image ref as an accepted residual behavior because original intent is unrecoverable.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility mechanism was introduced, the old implicit default retarget behavior was removed, and explicit `--tag`/`--image` is the only retained retarget path. Code review independently found no backward-compatibility mechanism or legacy old-behavior retention in changed scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Plain Bash `upgrade --all` over mixed saved image refs | Changed | FR-001, FR-002, AC-001; design DS-001; implementation handoff says Bash resolves target per node from saved `IMAGE_REF` unless override explicit. | Existing newly added durable fake-Docker test is valid and must be executed. |
| Explicit Bash `upgrade --all --tag <tag>` | Preserved / clarified | FR-004, AC-002; design DS-002; implementation handoff says explicit `--tag` retargets every node. | Existing newly added durable fake-Docker test is valid and must be executed. |
| Explicit Bash `upgrade --all --image <full-ref>` | Preserved / clarified | FR-005, AC-003; design DS-002. | Existing newly added durable fake-Docker test is valid and must be executed. |
| PowerShell parser/runtime semantic parity | Changed | FR-006, AC-004; design file mapping; code review residual risk notes lack of local `pwsh`. | Static parity and optional parse coverage are valid; executable PowerShell remains environment-limited because `pwsh` is absent. |
| Missing saved image ref fallback | Preserved / accepted fallback | UC-003; assumptions; design residual risk; code review one-off probe. | Use temporary executable probe only, not new durable coverage, because this is malformed/legacy state fallback rather than the normal current-state contract. |
| Docs/help wording for upgrade | Changed | FR-007, AC-006, AC-007; design removal/decommission plan. | Static source/doc inspection plus parity test markers are sufficient; no browser/API test needed. |
| Live Docker destructive upgrade | Out of scope / avoided | Requirements out-of-scope says avoid live Docker mutations; fake-Docker tests preferred. | Do not run live launcher `upgrade --all` against real Docker state. Use fake-Docker harness. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_preserves_each_node_saved_image_ref_by_default` | Creates mixed `autobyteus/test:latest` and `autobyteus/test:latest-zh` fake-Docker nodes, runs plain `upgrade --all`, asserts both state image refs remain distinct and both refs are pulled. | FR-001, FR-002, FR-003, AC-001, DS-001. | Still Valid | Test exactly matches approved preserve-current-image default behavior. | Execute as final durable coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_with_explicit_tag_retargets_all_nodes` | Creates mixed nodes, runs `upgrade --all --tag latest-zh`, asserts all nodes retarget to `autobyteus/autobyteus-server:latest-zh` and both pulls use that ref. | FR-004, AC-002, DS-002. | Still Valid | Test matches explicit tag retarget requirement. | Execute as final durable coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_with_explicit_image_retargets_all_nodes` | Creates mixed nodes, runs `upgrade --all --image autobyteus/custom-server:latest-zh`, asserts all nodes retarget to that full ref and both pulls use it. | FR-005, AC-003, DS-002. | Still Valid | Test matches explicit full-image retarget requirement. | Execute as final durable coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_matches_the_shared_workspace_cli_contract` | Static cross-source parity contract: Bash and PowerShell sources include saved-image-ref wording and upgrade override/resolver markers. | FR-006, FR-007, AC-004, AC-007. | Still Valid | Local `pwsh` is absent, so this durable static parity test is the executable local PowerShell guard available in this environment. | Execute as final durable coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_parses_when_pwsh_is_available` | Parses PowerShell launcher sources with `pwsh` when the executable exists; skips otherwise. | AC-004. | Still Valid | Environment-gated test correctly models local support condition; `pwsh` absent locally. | Execute to record skip, or record as not runnable if omitted from targeted suite. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_public_launcher_source_files_stay_within_reviewable_size_guard` | Ensures public launcher source files remain within the reviewability guardrail. | Constraints; implementation handoff size-guard notes; code review structure audit. | Still Valid | Changed files include Bash/PowerShell runtime and command files near size thresholds. | Execute as final durable coverage. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_new_container_adds_bind_mounts_without_removing_named_volumes` | Verifies new containers write `IMAGE_REF`, config hash, bind mounts, and named volumes. | State field authority used by FR-001; named volume preservation in FR-003. | Still Valid | Provides existing evidence that node state has authoritative `IMAGE_REF`; not a new-upgrade scenario. | Retain; no update needed. Not part of focused final suite unless broader module is run. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_workspace_apply_all_recreates_stale_containers_with_current_bind_mounts` | Verifies all-node workspace apply keeps named volumes and uses current binds. | Existing lifecycle behavior that upgrade must not disrupt; out of direct image-ref scope. | Still Valid | Not directly changed but validates shared start/recreate mechanics. | Retain; no update needed. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_mutating_commands_do_not_default_to_all_nodes` | Verifies `upgrade` without `--all` still errors and does not silently affect all nodes. | Existing upgrade command safety; no change requested. | Still Valid | Upgrade still must require explicit `--all`. | Retain; no update needed. |
| Other existing launcher fake-Docker tests in `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Installation, read-only command fan-out, port selection, bind retry, storage/workspace reporting, and profile removal coverage. | Existing public launcher behavior outside this task's image-ref upgrade boundary. | Out Of Scope | Not relevant to preserve-current-image semantics; implementation handoff records unrelated baseline/environment failures for some full-module scenarios. | Retain unchanged; do not use unrelated failures to classify this change. |
| `README.md`, `autobyteus-server-ts/docker/README.md`, `scripts/public/docker/autobyteus-docker.d/bash/core.sh`, `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | User-facing docs/help state default upgrade uses saved image refs and explicit image/tag retargets all nodes. | FR-007, AC-006, AC-007. | Still Valid | These are docs/help surfaces, not tests; source inspection and static test markers cover them. | Inspect/grep during final execution evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete durable coverage found in the changed scope. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No additional repository-resident durable coverage is needed after code review; implementation already added reviewed durable tests for the required normal and explicit override paths. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No durable coverage update is needed after code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | No durable coverage removal is needed. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | One-off fake-Docker Python probe that removes `IMAGE_REF` from a node state file before running `upgrade --all`. | Missing saved image ref falls back to `autobyteus/autobyteus-server:latest` without crashing. | This is malformed/old state fallback, not the normal current node contract; durable coverage around compatibility-like fallback would overemphasize legacy/malformed state. |
| TEMP-002 | Direct docs/help grep or launcher help invocation. | Help/docs no longer imply global default latest retarget for plain upgrade and mention saved image refs / explicit retarget. | Durable docs snapshot tests beyond existing static source marker would be brittle; source inspection is adequate. |
| TEMP-003 | `pwsh` availability check. | Determines whether local PowerShell parse/behavior coverage can run. | Environment capability probe only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| PowerShell executable parse/runtime behavior | `pwsh` is not installed locally. Homebrew or container-based installation would add heavyweight external dependency and is not required by AC-004, which says parse/static checks where supported. | Residual risk of PowerShell runtime drift remains limited by mirrored source implementation and static parity coverage. | None for this stage; run `test_powershell_launcher_parses_when_pwsh_is_available` in an environment with `pwsh` if available downstream. |
| Live Docker `autobyteus-docker upgrade --all` against real managed containers | Explicitly out of scope; fake-Docker tests are preferred to avoid destructive live Docker mutations. | Low for this change because fake-Docker exercises command parsing, state resolution, pulls, and start-node invocation without mutating real user containers. | None. |
| Full launcher module as authoritative pass/fail for this change | Implementation handoff already records unrelated local failures/skips tied to Python version, occupied friendly ports, missing `pwsh`, and a baseline shell-quote expectation. | Low for this change; targeted valid coverage directly exercises image-ref upgrade behavior. | Keep unrelated baseline failures separate; do not reroute unless focused coverage shows a new regression. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Upstream requirements/design decide preserve-current-image default, explicit retarget semantics, and missing-ref fallback. No ambiguity or compatibility reroute trigger found. | N/A |

## Execution Plan

1. Run syntax/static checks for changed Bash and Python test surfaces.
2. Run focused durable launcher tests that cover default preservation, explicit tag retarget, explicit image retarget, PowerShell static parity markers, and source size guard.
3. Run a `python3.11` focused upgrade scenario subset to remove Python 3.9-specific doubt for the primary behavior.
4. Run the optional `pwsh`-gated PowerShell parse test; expect skip in this environment if `pwsh` remains unavailable.
5. Run TEMP-001 missing `IMAGE_REF` fallback probe with the fake-Docker harness.
6. Inspect docs/help text for saved-image-ref default and explicit retarget wording.
7. Record results in the canonical execution coverage report. Because no repository-resident durable coverage will be added, updated, or removed after code review, a passing result should route to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage is adequate for the normal and explicit upgrade requirements. Missing-ref fallback will be checked only by a temporary probe. No stale tests or invalid legacy/compatibility coverage were found.
