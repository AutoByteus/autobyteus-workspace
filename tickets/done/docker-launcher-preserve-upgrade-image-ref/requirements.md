# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the public `autobyteus-docker upgrade --all` behavior so all launcher-managed Docker nodes are upgraded safely without changing each node's intended image line. A mixed local fleet can contain default nodes (`autobyteus/autobyteus-server:latest`) and Chinese-runtime nodes (`autobyteus/autobyteus-server:latest-zh`). Plain `upgrade --all` must pull/recreate each node against its own saved image reference instead of retargeting every node to the launcher default `latest` tag.

## Investigation Findings

- Bash launcher state records the image used by each node in `IMAGE_REF` in per-node state files.
- PowerShell launcher state records the image used by each node in `imageRef` in per-node JSON state files.
- Current Bash `main()` always computes `image_ref="$(image_ref_for "$image" "$tag")"` with default `autobyteus/autobyteus-server:latest`; `upgrade_all_nodes "$image_ref"` then calls `start_node "$node" "$image_ref"` for every managed node.
- Current PowerShell mirrors that behavior: `Get-ImageRef $image $tag` defaults to `autobyteus/autobyteus-server:latest`; `Upgrade-AllNodes $imageRef` calls `Start-Node $node $ImageRef` for every managed node.
- A focused fake-Docker probe reproduced the bug: a `latest-zh` node's state changed from `autobyteus/test:latest-zh` to `autobyteus/autobyteus-server:latest` after `upgrade --all`.
- Current docs describe `upgrade --all` as upgrading every managed node to the latest image, but do not explain preserve-current-image versus explicit retargeting semantics.
- Current test coverage exercises launcher state and mutating-command safety, but does not cover per-node image preservation on upgrade.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `upgrade_all_nodes`/`Upgrade-AllNodes` applies one computed image ref to every node, ignoring each node's persisted `IMAGE_REF`/`imageRef`; fake-Docker reproduction shows a `latest-zh` node is retargeted to default `latest` by plain `upgrade --all`.
- Requirement or scope impact: Upgrade must preserve per-node image refs by default; explicit `--tag`/`--image` should remain an intentional retarget operation.

## Recommendations

Implement preserve-current-image default semantics for both Bash and PowerShell public launchers:

1. Distinguish whether the user explicitly provided `--image` or `--tag` during command parsing.
2. For `upgrade --all` without explicit image/tag override, resolve each node's target image from persisted state and pass that image to `start_node` / `Start-Node`.
3. For `upgrade --all --tag <tag>` or `upgrade --all --image <image-or-ref>`, continue to retarget all nodes to the explicit image ref.
4. Add tests that prove default upgrade preserves mixed `latest` / `latest-zh` nodes and explicit override still retargets all nodes.
5. Update public docs/help text so users understand that default upgrade preserves each node's current image line.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: User runs `autobyteus-docker upgrade --all` with managed nodes currently using mixed image refs (`latest`, `latest-zh`, or pinned tags); each node upgrades using its own saved image ref.
- UC-002: User intentionally retargets all managed nodes by running `autobyteus-docker upgrade --all --tag latest-zh`, `--tag latest`, or `--image <full-ref>`; every node uses the explicit image ref.
- UC-003: Existing nodes with missing state image refs are handled predictably without crashing; fallback should be the current launcher default image ref and should be visible through existing state/status behavior.
- UC-004: Bash and PowerShell launchers expose equivalent upgrade semantics.
- UC-005: Public README/server Docker README/help text describes safe default upgrade and explicit retargeting.

## Out of Scope

- Adding a dedicated `--variant`, `--zh`, or per-node selection CLI.
- Changing `new-container`, `reset`, `destroy`, `workspace`, `storage`, `urls`, `logs`, or `stop` command semantics beyond shared parsing support needed for upgrade.
- Changing Docker image publication workflows or server Docker build behavior.
- Migrating existing state formats; existing `IMAGE_REF`/`imageRef` fields are already sufficient.
- Running destructive live-Docker validation as the primary proof; fake-Docker launcher tests are preferred for durable coverage.

## Functional Requirements

- FR-001: Plain `autobyteus-docker upgrade --all` must preserve each managed node's persisted image reference when deciding what image to pull and recreate with.
- FR-002: Plain `autobyteus-docker upgrade --all` must not convert nodes using `autobyteus/autobyteus-server:latest-zh` to `autobyteus/autobyteus-server:latest`.
- FR-003: Plain `autobyteus-docker upgrade --all` must still pull each resolved image ref and recreate nodes when the image digest/config changed, preserving named volumes and saved ports according to existing `start_node` behavior.
- FR-004: `autobyteus-docker upgrade --all --tag <tag>` must intentionally retarget all managed nodes to `DEFAULT_IMAGE:<tag>` unless `--image` is also supplied.
- FR-005: `autobyteus-docker upgrade --all --image <repo-or-full-ref>` must intentionally retarget all managed nodes to that image reference shape, honoring existing `image_ref_for` / `Get-ImageRef` behavior with optional `--tag`.
- FR-006: Bash and PowerShell implementations must remain behaviorally aligned.
- FR-007: Public documentation and help text must distinguish safe default upgrade from explicit image/tag retargeting.
- FR-008: Test coverage must include mixed-image preservation and explicit retarget behavior.

## Acceptance Criteria

- AC-001: Given two Bash launcher-managed fake-Docker nodes with state image refs `autobyteus/test:latest` and `autobyteus/test:latest-zh`, when `autobyteus-docker upgrade --all` runs, then each node is started using its own original image ref and the `latest-zh` state remains `latest-zh`.
- AC-002: Given the same mixed nodes, when `autobyteus-docker upgrade --all --tag latest-zh` runs, then all nodes are intentionally retargeted to `autobyteus/autobyteus-server:latest-zh` or the configured repository equivalent.
- AC-003: Given the same mixed nodes, when `autobyteus-docker upgrade --all --image autobyteus/custom-server:latest-zh` runs, then all nodes are intentionally retargeted to `autobyteus/custom-server:latest-zh`.
- AC-004: PowerShell source contains matching preserve-current-image upgrade logic and passes parse/static parity checks where the local environment supports them.
- AC-005: Existing launcher tests continue to pass or any pre-existing environment/Python-version-sensitive failures are recorded separately from this change.
- AC-006: `README.md` and `autobyteus-server-ts/docker/README.md` explain that `upgrade --all` preserves per-node image refs by default and show explicit override examples.
- AC-007: The public launcher help text no longer implies that plain `upgrade --all` retargets all nodes to the global default latest image.

## Constraints / Dependencies

- Preserve existing state file fields (`IMAGE_REF` in Bash `.env`; `imageRef` in PowerShell JSON).
- Preserve current explicit override capability for users who want to convert all nodes to another tag/image.
- Keep launcher source files within existing size guard constraints.
- Keep Bash and PowerShell launchers aligned because both are public installation surfaces.
- Avoid live Docker mutations in tests; use the existing fake Docker test harness.

## Assumptions

- Existing managed nodes have valid `IMAGE_REF` / `imageRef` from prior `new-container`, `reset`, `workspace apply`, or `upgrade` runs.
- If an old or manually edited state file lacks an image ref, fallback to the default image is acceptable and safer than failing all upgrades.
- Explicit `--tag`/`--image` on `upgrade --all` is understood as a retarget request, not a preserve-current-image request.

## Risks / Open Questions

- Existing docs wording says "latest image"; after this change, "latest" should be explained as latest for each node's configured image ref, not necessarily `:latest`.
- Some existing tests are sensitive to local port availability and Python version (`zip(strict=True)` requires Python 3.10+); implementation validation should run targeted tests and record environment limitations if full module fails for unrelated reasons.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 |
| --- | --- | --- | --- | --- | --- |
| FR-001 | Yes | No | Yes | Yes | No |
| FR-002 | Yes | No | No | Yes | No |
| FR-003 | Yes | Yes | Yes | Yes | No |
| FR-004 | No | Yes | No | Yes | Yes |
| FR-005 | No | Yes | No | Yes | Yes |
| FR-006 | Yes | Yes | Yes | Yes | No |
| FR-007 | Yes | Yes | No | No | Yes |
| FR-008 | Yes | Yes | Yes | Yes | No |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves the reported zh-preservation bug is fixed for default upgrade. |
| AC-002 | Proves explicit tag override remains an intentional all-node retarget operation. |
| AC-003 | Proves full-image override remains supported and unambiguous. |
| AC-004 | Prevents Bash-only fix drift from Windows PowerShell launcher behavior. |
| AC-005 | Ensures existing launcher behavior is not regressed and validation caveats are separated. |
| AC-006 | Ensures user-facing docs explain the safer semantics. |
| AC-007 | Ensures installed CLI help does not reinforce the old dangerous mental model. |

## Approval Status

Approved for design by user on 2026-07-09 after confirming: plain upgrade should update all containers while preserving current image variant/tag, especially `latest-zh`.
