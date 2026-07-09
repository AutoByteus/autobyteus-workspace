# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Code-review pass for `docker-launcher-preserve-upgrade-image-ref`.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass to API/E2E | N/A | None in focused valid coverage | Pass | Yes | `pwsh`-gated parse test skipped because `pwsh` is not installed; this matches the investigation decision and AC-004 local-support caveat. |

## Execution Basis

Execution followed the coverage decisions in `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-coverage-investigation.md`. The required boundary is the public Docker launcher CLI behavior around `upgrade --all`: default per-node saved image-ref preservation, explicit all-node retargeting, Bash/PowerShell semantic parity, help/docs wording, and accepted missing-state fallback.

Live Docker launcher mutation against real managed containers was intentionally not used because the requirements prefer the fake-Docker harness and explicitly put destructive live-Docker validation out of primary scope.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `No`
- Reroute required from investigation: `No`
- Notes: Implementation had already added the durable upgrade tests before code review. API/E2E made no repository-resident durable coverage edits.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_preserves_each_node_saved_image_ref_by_default` | Still Valid | Executed with `python3` and `python3.11`; passed. | Asserts mixed `latest`/`latest-zh` fake-Docker nodes keep distinct `IMAGE_REF` values and pull both refs after plain `upgrade --all`. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_with_explicit_tag_retargets_all_nodes` | Still Valid | Executed with `python3` and `python3.11`; passed. | Asserts explicit `--tag latest-zh` retargets all nodes to `autobyteus/autobyteus-server:latest-zh`. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_with_explicit_image_retargets_all_nodes` | Still Valid | Executed with `python3` and `python3.11`; passed. | Asserts explicit full-image override retargets all nodes to `autobyteus/custom-server:latest-zh`. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_matches_the_shared_workspace_cli_contract` | Still Valid | Executed with `python3` and `python3.11`; passed. | Confirms Bash and PowerShell source markers for saved-image-ref help text and override/resolver implementation. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_public_launcher_source_files_stay_within_reviewable_size_guard` | Still Valid | Executed with `python3` and `python3.11`; passed. | Confirms changed launcher source files remain inside the 500-effective-line guard. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_parses_when_pwsh_is_available` | Still Valid | Executed via `python3.11`; skipped by test because `pwsh` is not installed. | Skip is expected in this local environment and aligns with AC-004's local-support condition. |
| Other launcher fake-Docker tests in the module | Out Of Scope for this change's image-ref upgrade boundary, though generally still valid | Not run as final pass/fail evidence for this task. | Implementation handoff records unrelated full-module baseline/environment failures; focused valid coverage is the authoritative evidence for this task. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Notes: Missing `IMAGE_REF` fallback was treated as an accepted malformed/old-state safety fallback from the reviewed design, not as old unsafe behavior retention. No durable compatibility-only coverage was added.

## Execution Surfaces / Modes

- Bash public launcher source syntax (`bash -n`).
- Python unittest execution of fake-Docker launcher scenarios.
- Static Bash/PowerShell parity coverage through the existing Python test.
- Environment-gated PowerShell parse coverage through the existing Python test; skipped because `pwsh` is absent.
- Temporary fake-Docker probe for missing `IMAGE_REF` fallback.
- Static docs/help source wording inspection.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref`
- Branch: `codex/docker-launcher-preserve-upgrade-image-ref`
- OS/runtime: macOS 26.2 (`Darwin MacBookPro 25.2.0`, arm64)
- Bash: GNU bash 3.2.57(1)-release (Apple-provided)
- Python: `python3` 3.9.6 and `python3.11` 3.11.15
- Docker engine observed available: 29.0.1, but not used for live launcher mutation.
- PowerShell: `pwsh` not installed.

## Lifecycle / Upgrade / Restart / Migration Checks

The fake-Docker upgrade scenarios exercise the launcher lifecycle boundary without touching real containers:

- Plain all-node upgrade resolves each node's target image from saved state and calls pull/start with that image.
- Explicit tag/image upgrade resolves one override target and applies it to every managed node.
- Missing `IMAGE_REF` fallback resolves the default image ref and rewrites state through normal `start_node` flow.
- Named-volume preservation remains delegated to existing `start_node` behavior; no new volume or port lifecycle path was introduced by this change.

No native desktop, installer, updater, restart, schema migration, or real process relaunch scenario is in scope for this task.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Command / Probe | Result |
| --- | --- | --- | --- | --- |
| DUR-001 | FR-001, FR-002, FR-003, AC-001 | Fake-Docker Bash launcher unittest | `test_upgrade_all_preserves_each_node_saved_image_ref_by_default` under `python3` and `python3.11` | Pass |
| DUR-002 | FR-004, AC-002 | Fake-Docker Bash launcher unittest | `test_upgrade_all_with_explicit_tag_retargets_all_nodes` under `python3` and `python3.11` | Pass |
| DUR-003 | FR-005, AC-003 | Fake-Docker Bash launcher unittest | `test_upgrade_all_with_explicit_image_retargets_all_nodes` under `python3` and `python3.11` | Pass |
| DUR-004 | FR-006, AC-004, AC-007 | Static Bash/PowerShell parity unittest | `test_powershell_launcher_matches_the_shared_workspace_cli_contract` under `python3` and `python3.11` | Pass |
| DUR-005 | Source guard constraint | Static source-size unittest | `test_public_launcher_source_files_stay_within_reviewable_size_guard` under `python3` and `python3.11` | Pass |
| DUR-006 | AC-004 where supported | Environment-gated PowerShell parse unittest | `test_powershell_launcher_parses_when_pwsh_is_available` under `python3.11` | Skipped: `pwsh is not installed` |
| TEMP-001 | UC-003 / accepted fallback | Temporary fake-Docker Python probe | Remove `IMAGE_REF`, run `upgrade --all`, assert default image ref and pull | Pass |
| TEMP-002 | FR-007, AC-006, AC-007 | Docs/help source inspection | grep for saved-image-ref and retarget wording | Pass |

## Test Scope

In scope:

- Public launcher upgrade command parsing and dispatch.
- State-backed per-node image target selection.
- Explicit all-node retarget through `--tag` and `--image`.
- Bash/PowerShell source parity markers and local-support PowerShell parse gate.
- User docs/help wording for changed semantics.

Out of scope:

- Live Docker mutation of actual launcher-managed containers.
- Docker image publication or server image build workflows.
- New CLI variants or per-node selection features.
- Repository-wide unrelated launcher tests as authoritative pass/fail for this image-ref task.

## Execution Setup / Environment

All final checks ran from `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref`.

Evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-execution.log`

Commands executed:

- `bash -n scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh scripts/public/docker/autobyteus-docker.sh` — passed.
- `git diff --check` — passed.
- `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py` — passed.
- `python3 -m unittest ...test_upgrade_all_preserves_each_node_saved_image_ref_by_default ...test_upgrade_all_with_explicit_tag_retargets_all_nodes ...test_upgrade_all_with_explicit_image_retargets_all_nodes ...test_powershell_launcher_matches_the_shared_workspace_cli_contract ...test_public_launcher_source_files_stay_within_reviewable_size_guard -v` — passed, 5 tests.
- `python3.11 -m unittest ...test_upgrade_all_preserves_each_node_saved_image_ref_by_default ...test_upgrade_all_with_explicit_tag_retargets_all_nodes ...test_upgrade_all_with_explicit_image_retargets_all_nodes ...test_powershell_launcher_matches_the_shared_workspace_cli_contract ...test_public_launcher_source_files_stay_within_reviewable_size_guard -v` — passed, 5 tests.
- `python3.11 -m unittest ...test_powershell_launcher_parses_when_pwsh_is_available -v` — passed with 1 expected skip (`pwsh is not installed`).
- Temporary missing-`IMAGE_REF` fallback probe — passed.
- Docs/help grep for `saved image ref(s)` and `retarget` wording — passed.

## Tests Implemented Or Updated

No tests were implemented or updated by API/E2E after code review. The implementation stage had already added/updated the durable fake-Docker and static parity tests, and code review passed those coverage changes.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete coverage was found. | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: N/A
- Paths removed: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-API/E2E coverage code review artifact: N/A

## Other Execution Artifacts

- Execution log: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-execution.log`

## Temporary Execution Methods / Scaffolding

- TEMP-001 was an inline Python probe run through `python3.11` using the existing fake-Docker harness. It created temporary state, removed the `IMAGE_REF` line from one node state file, ran `upgrade --all`, and asserted fallback to `autobyteus/autobyteus-server:latest` plus the matching pull call.
- TEMP-002 used grep over docs/help sources.
- No temporary files or helper scripts were left in the repository outside the execution log and required API/E2E artifacts.

## Dependencies Mocked Or Emulated

- Docker CLI behavior was emulated by the existing fake-Docker harness in `scripts/tests/test_public_docker_launcher_shared_workspace.py`.
- No external services, credentials, live containers, or network APIs were required for final validation.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First API/E2E execution round. |

## Scenarios Checked

- DUR-001: Plain `upgrade --all` preserves mixed saved image refs and pulls both refs.
- DUR-002: Explicit `--tag latest-zh` retargets all nodes to the default repository with `latest-zh`.
- DUR-003: Explicit full `--image autobyteus/custom-server:latest-zh` retargets all nodes to that full ref.
- DUR-004: Bash and PowerShell source parity markers exist for saved image refs and override resolver logic.
- DUR-005: Public launcher source-size guard holds.
- DUR-006: PowerShell parse test is correctly environment gated; skipped locally because `pwsh` is absent.
- TEMP-001: Missing `IMAGE_REF` fallback uses default image ref without crashing.
- TEMP-002: Docs/help wording describes saved image refs and explicit retargeting.

## Passed

- Bash syntax check.
- Git whitespace check.
- Python compile check.
- Focused durable coverage under `python3`: 5/5 passed.
- Focused durable coverage under `python3.11`: 5/5 passed.
- Missing-`IMAGE_REF` temporary probe passed.
- Docs/help wording check passed.

## Failed

None in final focused valid coverage.

## Not Tested / Out Of Scope

- PowerShell executable parse/runtime beyond the environment-gated skipped test because `pwsh` is not installed.
- Live Docker launcher upgrade against real managed containers because requirements prefer fake-Docker tests and avoid destructive live-Docker validation.
- Full `scripts.tests.test_public_docker_launcher_shared_workspace` module as a task gate because upstream handoff documents unrelated baseline/environment failures; focused current-behavior coverage passed.

## Blocked

No task-blocking coverage item remains. PowerShell executable validation is environment-limited but not a blocker under AC-004's local-support wording.

## Cleanup Performed

- Fake-Docker temp directories were created by `TemporaryDirectory` and cleaned automatically by the harness/probe.
- No temporary probe scripts were added to the repository.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No reroute classification is required because all final focused valid coverage passed and no stale/legacy/compatibility issue was found.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- The coverage investigation was written before final execution.
- API/E2E did not add, update, or remove repository-resident durable coverage after the passed code review, so no coverage-code re-review is required.
- Full-module baseline/environment failures documented by implementation/code review remain separate from this change.
- The worktree still contains the implementation's uncommitted source/docs/test changes plus the API/E2E artifacts.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: The reviewed implementation satisfies the approved API/E2E/executable coverage scope for default saved-image-ref preservation, explicit retargeting, docs/help wording, and local PowerShell parity constraints. Route to delivery.
