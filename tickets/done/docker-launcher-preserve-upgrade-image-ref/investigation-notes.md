# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design produced
- Investigation Goal: Determine current public Docker launcher upgrade behavior and design the safest preserve-current-image default for mixed default/zh nodes.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: The behavior is localized to public launcher command parsing and upgrade fan-out in mirrored Bash/PowerShell files, plus docs and fake-Docker tests.
- Scope Summary: Change `autobyteus-docker upgrade --all` so default upgrade preserves each managed node's existing image reference while still allowing explicit image/tag overrides to retarget all nodes.
- Primary Questions To Resolve:
  1. How does current Bash launcher parse and apply upgrade image refs? Resolved.
  2. How does current PowerShell launcher parse and apply upgrade image refs? Resolved.
  3. Which tests cover launcher image/tag behavior, and what additions are needed? Resolved.
  4. How should explicit `--image` or `--tag` retargeting semantics differ from default preserve-current-image semantics? Resolved: no explicit image/tag means preserve current node image; explicit image/tag means retarget all nodes.

## Request Context

User observed that `autobyteus-docker upgrade --all` would retarget a newly created `latest-zh` node back to default `latest` because the command currently uses one global default image tag. User requested a task to improve the upgrade UX so `upgrade --all` updates all containers to the latest image for their current image ref, preserving `latest-zh` nodes as `latest-zh`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref
- Current Branch: codex/docker-launcher-preserve-upgrade-image-ref
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin --prune` succeeded from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on 2026-07-09.
- Task Branch: codex/docker-launcher-preserve-upgrade-image-ref
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: User explicitly wants the zh node preservation bug fixed. Avoid using live `autobyteus-docker upgrade --all` until this implementation lands; use fake-Docker tests for durable validation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-09 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git symbolic-ref refs/remotes/origin/HEAD; git fetch origin --prune` | Bootstrap repo context and refresh remote refs | Base checkout is `personal` tracking `origin/personal`; remote HEAD is `origin/personal`; fetch succeeded. | No |
| 2026-07-09 | Setup | `git branch codex/docker-launcher-preserve-upgrade-image-ref origin/personal; git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref codex/docker-launcher-preserve-upgrade-image-ref` | Create dedicated task worktree/branch | Worktree created for task artifacts and downstream implementation. | No |
| 2026-07-09 | Code | `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` lines 159-205 | Inspect Bash CLI parse and upgrade entrypoint | `tag` and `image` default to global defaults; `image_ref` is always computed before dispatch; `upgrade` passes that one image ref to `upgrade_all_nodes`. | Yes: parser must know whether image/tag was explicit. |
| 2026-07-09 | Code | `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` lines 477-494 | Inspect Bash upgrade owner | `upgrade_all_nodes` loops over `managed_node_names` and calls `start_node "$node" "$image_ref"`; it never reads each node's saved `IMAGE_REF` for target selection. | Yes: add per-node target resolver for default upgrade. |
| 2026-07-09 | Code | `scripts/public/docker/autobyteus-docker.d/bash/core.sh` lines 94-127 | Inspect Bash state and image-ref helper | `load_state` populates `IMAGE_REF`; `write_state` persists it; `image_ref_for` treats full refs or repository/tag pairs. | No: existing state field is sufficient. |
| 2026-07-09 | Code | `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` lines 122-163 | Inspect PowerShell CLI parse and upgrade entrypoint | PowerShell mirrors Bash: defaults `$tag`/`$image`, computes one `$imageRef`, then calls `Upgrade-AllNodes $imageRef`. | Yes: mirror explicit-override tracking. |
| 2026-07-09 | Code | `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` lines 485-493 | Inspect PowerShell upgrade owner | `Upgrade-AllNodes` loops over all nodes and passes the same `$ImageRef` to `Start-Node`. | Yes: add per-node target resolver/default preserve behavior. |
| 2026-07-09 | Code | `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Inspect durable launcher tests | Fake-Docker harness already supports creating multiple nodes and reading state/run args; tests cover profile option rejection, read-only all-node behavior, and mutating-command guard, but not upgrade per-node image preservation. | Yes: add tests for mixed image refs and explicit retarget. |
| 2026-07-09 | Doc | `README.md`; `autobyteus-server-ts/docker/README.md`; launcher help in Bash/PowerShell Core files | Inspect public docs/help | Docs say `upgrade --all` upgrades every managed Docker node to the latest image; this wording can imply one global latest/default tag and does not mention explicit retarget override. | Yes: update wording and examples. |
| 2026-07-09 | Trace | `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v` | Baseline current test health | Full module had unrelated pre-existing/environment-sensitive failures: Python 3.9 lacks `zip(strict=True)` and port-availability tests conflicted with live ports; many tests passed. | Implementation should use targeted tests or Python 3.10+ if available, and record unrelated failures. |
| 2026-07-09 | Trace | Focused fake-Docker script creating `autobyteus/test:latest` and `autobyteus/test:latest-zh` nodes then running `upgrade --all` | Confirm reported bug without live Docker mutation | Before: node 0 `autobyteus/test:latest`, node 1 `autobyteus/test:latest-zh`; after plain upgrade both became `autobyteus/autobyteus-server:latest`. | No; this is the concrete reproduction to turn into durable test. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Public CLI `autobyteus-docker upgrade --all` in Bash or PowerShell launcher.
- Current execution flow:
  - Bash: `main()` parses defaults (`image=autobyteus/autobyteus-server`, `tag=latest`) -> computes one `image_ref` -> calls `upgrade_all_nodes "$image_ref"` -> loop over `managed_node_names` -> `start_node` for each with same image ref -> `write_state` updates every node's `IMAGE_REF` to that image.
  - PowerShell: `Invoke-AutoByteusDocker` parses defaults -> computes one `$imageRef` -> `Upgrade-AllNodes $imageRef` -> loop over `Get-ManagedNodeNames` -> `Start-Node` for each with same image ref -> `Save-NodeState` updates every node's `imageRef` to that image.
- Ownership or boundary observations: Command parsing currently owns default image selection globally, but upgrade fan-out is the owner that knows per-node state and should own default per-node image target selection.
- Current behavior summary: Plain upgrade cannot distinguish "no override supplied" from "retarget to default latest" and therefore overwrites variants such as `latest-zh`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: Localized refactor needed in command parsing and upgrade fan-out to separate explicit target override from default preserve-current-image behavior.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User/local runtime observation | Mixed default and `latest-zh` nodes can exist; default upgrade command would apply one default image ref to all nodes. | Upgrade owner lacks invariant: default upgrade preserves each node's current image ref. | Implement invariant. |
| Bash source | `upgrade_all_nodes` accepts one image ref and applies it to all nodes. | Fan-out owner cannot preserve per-node image refs. | Add target resolver/optional override. |
| PowerShell source | `Upgrade-AllNodes` accepts one image ref and applies it to all nodes. | Windows launcher has same defect and must change in parallel. | Mirror Bash design. |
| Focused fake-Docker repro | `latest-zh` state became default `latest` after plain upgrade. | Confirms user-facing bug. | Add durable regression tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Bash CLI command parsing and command dispatch. | Does not track whether `--image`/`--tag` was explicit; always computes a global image ref. | Add explicit override flag and pass optional override to upgrade only. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Bash Docker lifecycle and upgrade fan-out. | `upgrade_all_nodes` applies one image ref to all nodes. | Own per-node target image resolution for default upgrade. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Bash launcher constants, state IO, image ref helper, help text. | `IMAGE_REF` already persists current image. Help text needs safer wording. | Reuse state; update help. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | PowerShell CLI parsing/dispatch. | Mirrors Bash global image selection. | Add explicit override tracking. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | PowerShell Docker lifecycle and upgrade fan-out. | Applies one image ref to all nodes. | Mirror per-node target resolution. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | PowerShell constants/help/state helpers. | `imageRef` already persists current image. Help text needs safer wording. | Reuse state; update help. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Fake-Docker launcher coverage. | No regression test for mixed image refs during upgrade. | Add tests. |
| `README.md`, `autobyteus-server-ts/docker/README.md` | Public launcher docs. | Upgrade wording is ambiguous/dangerous for mixed variants. | Document default preserve and explicit retarget examples. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Live launcher observation | `autobyteus-docker status` before selective manual update in shared checkout | Nodes `autobyteus-server-0..2` used `latest`; `autobyteus-server-3` used `latest-zh`. | Mixed variants are a real supported runtime state that upgrade must handle safely. |
| 2026-07-09 | Test baseline | `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v` | 14 passed, 2 skipped, 2 failed, 1 errored in this local environment; failures tied to Python 3.9 `zip(strict=True)`, expected-string escaping, and occupied friendly ports. | Do not treat full-module failure as introduced by this task; implementation should run targeted tests and record baseline limitations. |
| 2026-07-09 | Focused fake-Docker repro | Python script using `fake_docker_environment`, `new-container --tag latest`, `new-container --tag latest-zh`, then `upgrade --all` | Plain upgrade pulled/started `autobyteus/autobyteus-server:latest` for both nodes and rewrote both states to default latest. | Concrete repro of the bug and blueprint for AC-001 regression test. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing fake Docker harness in `scripts/tests/test_public_docker_launcher_shared_workspace.py`.
- Required config, feature flags, env vars, or accounts: None expected.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation above.
- Cleanup notes for temporary investigation-only setup: Fake-Docker temp dirs clean themselves up. No live Docker mutation required for task validation.

## Findings From Code / Docs / Data / Logs

Current implementation conflates two different user intents:

1. Default upgrade intent: "refresh each node to the newest digest for what it is already configured to run."
2. Retarget intent: "convert every managed node to this explicit image/tag."

Because parser defaults are indistinguishable from explicit user input, `upgrade --all` always behaves like retarget-to-default. The correct owner for separating these intents is command parsing plus upgrade fan-out: parsing records whether there was an explicit override; fan-out resolves the target per node when no override exists.

## Constraints / Dependencies / Compatibility Facts

- Named volumes and saved ports must remain governed by existing `start_node` / `Start-Node` behavior.
- Existing full-ref handling must remain unchanged: `--image autobyteus/autobyteus-server:latest-zh` is a valid retarget form.
- Bash and PowerShell launchers are both public surfaces and must remain semantically aligned.
- Existing state fields are sufficient; no state migration required.

## Open Unknowns / Risks

- Full test module currently has environment-sensitive failures unrelated to this task. Downstream validation should use targeted fake-Docker tests and, if possible, a Python 3.10+ environment for full module.
- Docs should avoid overpromising that pinned tags update to a newer version; preserving a pinned `1.4.3` means re-pulling that tag, not moving to `1.4.4` unless the user explicitly retargets.

## Notes For Architect Reviewer

The design intentionally keeps explicit override power. The behavior change is only for plain `upgrade --all`: preserve each node's own saved image ref. This aligns the command name with safe user expectation while still allowing `upgrade --all --tag latest-zh` to convert all nodes when explicitly requested.
