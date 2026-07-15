# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-review-report.md`

## What Changed

- Bash launcher parsing now records whether `--image` or `--tag` was explicitly supplied.
- Bash `upgrade_all_nodes` now resolves a target image per node:
  - explicit `--image`/`--tag`: apply the computed override image ref to every managed node;
  - plain `upgrade --all`: use each node's saved `IMAGE_REF`, falling back to `autobyteus/autobyteus-server:latest` only when state has no image ref.
- PowerShell launcher parsing/runtime now mirrors the Bash behavior with `imageRef` state preservation and explicit override retargeting.
- Docker lifecycle start/recreate functions remain policy-agnostic; they still receive a resolved image ref.
- Public Bash/PowerShell help plus root/server Docker README sections now describe preserve-current-image default upgrade semantics and explicit all-node retarget examples.
- Fake-Docker launcher tests now cover mixed-image preservation, explicit `--tag` retargeting, explicit `--image` retargeting, and PowerShell source parity markers.

## Key Files Or Areas

- `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/core.sh`
- `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`
- `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1`
- `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `README.md`
- `autobyteus-server-ts/docker/README.md`

## Important Assumptions

- Existing managed nodes normally have valid `IMAGE_REF` / `imageRef` saved state.
- If state is missing an image ref, falling back to the default image ref remains the accepted residual behavior from the reviewed design.
- Explicit `--tag` or `--image` on `upgrade --all` means intentional all-node retargeting.

## Known Risks

- Local PowerShell parse execution could not be run because `pwsh` is not installed in this environment; parity is covered by mirrored source changes and static text assertions.
- Full launcher test module still has unrelated baseline/environment failures noted below; the targeted new fake-Docker coverage passes.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change / Bug Fix
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Parser intent extraction and upgrade fan-out target resolution were separated as designed. `start_node` / `Start-Node` still receive resolved image refs only and do not infer CLI intent.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Effective non-empty source line counts after changes: Bash runtime 467, Bash commands 241, Bash core 114, PowerShell runtime 457, PowerShell commands 182, PowerShell core 122.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref`
- Branch: `codex/docker-launcher-preserve-upgrade-image-ref`
- Default `python3`: Python 3.9.6 at `/usr/bin/python3`
- `python3.11`: Python 3.11.15 available
- `pwsh`: not installed

## Local Implementation Checks Run

- `bash -n scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh scripts/public/docker/autobyteus-docker.sh` — passed.
- `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py` — passed.
- `git diff --check` — passed.
- Targeted fake-Docker/unit checks passed:
  - `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_upgrade_all_preserves_each_node_saved_image_ref_by_default scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_upgrade_all_with_explicit_tag_retargets_all_nodes scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_upgrade_all_with_explicit_image_retargets_all_nodes scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_powershell_launcher_matches_the_shared_workspace_cli_contract scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_public_launcher_source_files_stay_within_reviewable_size_guard -v` — passed, 5 tests.
- Full launcher module checks were attempted and failed only on unrelated baseline/environment cases:
  - `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v` — failed: Python 3.9 lacks `zip(strict=True)` in `test_new_containers_prefer_sequential_friendly_ports`; local friendly ports were unavailable for bind/friendly-port assertions; `pwsh` skipped; `test_bash_install_no_update_path_skips_profile_write` failed on an existing shell-quote expectation unrelated to these changes.
  - `python3.11 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v` — failed: local friendly ports unavailable for friendly-port assertions, `pwsh` skipped, and the same existing shell-quote expectation failed.
  - Baseline confirmation: the shell-quote expectation failure reproduces on the unmodified main worktree with `python3.11 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_bash_install_no_update_path_skips_profile_write -v`.

## Downstream Coverage Hints / Suggested Scenarios

- Verify Bash default `upgrade --all` against fake-Docker state with mixed `autobyteus/test:latest` and `autobyteus/test:latest-zh` nodes preserves both saved `IMAGE_REF` values and pulls both refs.
- Verify Bash explicit `upgrade --all --tag latest-zh` retargets all state to `autobyteus/autobyteus-server:latest-zh`.
- Verify Bash explicit `upgrade --all --image autobyteus/custom-server:latest-zh` retargets all state to that full image ref.
- If `pwsh` is available downstream, run the PowerShell parse/static check and consider a PowerShell fake-Docker equivalent if the API/E2E stage chooses to expand durable coverage.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E/broader executable coverage investigation and execution remain required by `api_e2e_engineer` after code review. This implementation handoff does not claim API/E2E sign-off.
