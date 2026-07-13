# Investigation Notes — autobyteus-docker targeted container removal

**Status:** Current; requirements approved and design-ready
**Investigation date:** 2026-07-13

## Investigation goals and questions

1. Does the current public `autobyteus-docker` launcher support removing one selected managed container?
2. Why does `autobyteus-docker status` show `missing` after a manual `docker rm`?
3. Is `buildx_buildkit_multi-platform-builder0` owned by the AutoByteus launcher or by Docker Buildx?
4. What is the smallest safe change that lets users remove one AutoByteus server node without touching unrelated Docker infrastructure?

## Task and investigation boundary

The request concerns the public launcher under `scripts/public/docker`, including its Bash and PowerShell entrypoints, launcher state, user-facing documentation, and focused fake-Docker coverage. The investigation does not remove or mutate the user's live Docker containers. Live Docker commands below were read-only.

Repository setup is isolated in a dedicated worktree before investigation:

- Repository: `autobyteus-workspace-superrepo`
- Task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container`
- Task branch: `codex/autobyteus-docker-remove-container`
- Base: `origin/personal`
- Expected finalization target: `personal`
- Bootstrap command: `git fetch origin --prune`, then `git worktree add -b codex/autobyteus-docker-remove-container ... origin/personal`

## Exact sources and commands consulted

| Date | Source kind | Path / command | Evidence obtained | Design implication |
| --- | --- | --- | --- | --- |
| 2026-07-13 | Repository | `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Bash command parser supports `destroy` only with `--all`; `--name` is rejected for destroy. `status` reads every state file and prints `missing` when its recorded container no longer exists. | Add a targeted managed-node lifecycle path if requested; state cleanup must be part of the path. |
| 2026-07-13 | Repository | `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | `destroy_all_nodes` enumerates managed containers, runs `docker rm -f`, removes all `.env` state files, and keeps named volumes. Managed containers are identified by launcher labels; `container_for_node` resolves a node label. | Reuse the existing destroy/image-cleanup owner for a single-node variant; do not add a generic Docker-container deletion helper. |
| 2026-07-13 | Repository | `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Launcher ownership labels are `com.autobyteus.launcher=server-docker` and `com.autobyteus.nodeName=<node>`. State is `$HOME/.autobyteus/docker-server/nodes/<node>.env` by default. | A targeted command should accept an explicit managed node identity and refuse unlabeled containers. |
| 2026-07-13 | Repository | `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`, `DockerRuntime.ps1`, `Core.ps1` | PowerShell mirrors Bash: `destroy` requires `--all`; state is JSON; `Destroy-AllNodes` removes all managed containers and state. | Keep the public command contract and state semantics in Bash/PowerShell parity. |
| 2026-07-13 | Repository | `scripts/public/docker/autobyteus-docker.sh`, `.ps1` | Public launcher loads platform modules; `install` replaces the launcher and support modules. | Any command/help change must land in both installed-platform sources. |
| 2026-07-13 | Repository | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | Docs expose `destroy --all` but no targeted destroy. Manual build docs identify `build-multi-arch.sh` and its builder name. | Document targeted managed-node removal and distinguish Buildx cleanup from launcher lifecycle. |
| 2026-07-13 | Repository | `autobyteus-server-ts/docker/build-multi-arch.sh` | Default `BUILDER_NAME` is `multi-platform-builder`; the script creates/selects it with `docker buildx create --name ...`. | The observed `buildx_buildkit_multi-platform-builder0` is Buildx infrastructure, not an AutoByteus server node. |
| 2026-07-13 | Repository | `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Existing isolated fake-Docker tests cover creation, upgrade, parsing, workspace, and PowerShell parity checks, but no targeted destroy scenario. The fake Docker records `rm` calls and supports isolated state. | Add focused tests for targeted removal, state cleanup, volume preservation, and refusal of unmanaged targets. |
| 2026-07-13 | Live read-only probe | `docker inspect --format 'name=... labels=... status=...' buildx_buildkit_multi-platform-builder0` | Target exists as `/buildx_buildkit_multi-platform-builder0`, image `moby/buildkit:buildx-stable-1`, status `running`, labels `{}`. | It must not be removable through an AutoByteus-managed-node command. |
| 2026-07-13 | Live read-only probe | `docker ps -a --filter label=com.autobyteus.launcher=server-docker ...` | Current launcher-managed nodes are `autobyteus-server-0` through `autobyteus-server-4`; the Buildx target is absent. | Launcher label filtering correctly separates the two ownership domains. |
| 2026-07-13 | Live read-only probe | `docker buildx ls` | Builder `multi-platform-builder` has node `multi-platform-builder0` and is running. | Correct cleanup API for the builder is `docker buildx rm multi-platform-builder`, not a generic AutoByteus container removal. |
| 2026-07-13 | Live read-only probe | `autobyteus-docker help`; `autobyteus-docker destroy --name autobyteus-server-5` | Help advertises only `destroy --all`; targeted destroy exits with `destroy affects every managed node; rerun with --all.` | Current command does not support the desired targeted managed-node operation. |
| 2026-07-13 | Live read-only probe | `find ~/.autobyteus/docker-server/nodes ...` and state summary | State files remain for `autobyteus-server-5`, `-6`, and `-7` even though those containers were manually removed in the user's transcript. | The observed `missing` rows are stale launcher state, not Docker containers recreated by the launcher. |
| 2026-07-13 | Validation baseline | `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` | Baseline suite ran 22 tests: 17 passed, 2 skipped, 2 unrelated existing failures, and 1 unrelated error. Failures are installer quote expectation and `zip(..., strict=True)` unsupported by the available Python runtime; no task code changed. | Preserve these as baseline environment/test debt; targeted feature validation must use focused checks and record the baseline honestly. |

## Current entrypoints, execution boundaries, and owners

### Bash primary flow

`autobyteus-docker.sh -> entry_load_modules -> main -> destroy_all_nodes -> managed_container_names / state files -> docker rm -f + remove_all_state_files`

The entry script is a thin platform/bootstrap wrapper. `commands.sh` owns public command parsing and user-facing command dispatch. `docker-runtime.sh` owns managed-container discovery, Docker lifecycle operations, image cleanup, and launcher state cleanup. `core.sh` owns launcher constants, normalization, state paths, and common output/error functions.

### PowerShell primary flow

`autobyteus-docker.ps1 -> Invoke-AutoByteusDocker -> Destroy-AllNodes -> Get-ManagedContainerNames / JSON state -> docker rm -f + Remove-AllStateFiles`

The PowerShell entry script and module layout mirror the Bash ownership model.

### Status path

`autobyteus-docker status -> show_status / Show-Status -> state file enumeration -> container_exists / Test-ContainerExists -> Docker inspect or literal missing output`

Status intentionally treats a state record without a Docker container as `missing`; it does not mutate state during a read-only status query. That behavior preserves enough saved identity/configuration for an explicit lifecycle operation to reconcile or forget the node. It also explains the user's output after manual `docker rm`.

## Current behavior findings

1. **No targeted removal exists.** The public command model offers `destroy --all`, not `destroy --name <node>` or a single-container removal command.
2. **Manual deletion bypasses launcher ownership.** `docker stop <id>; docker rm <id>` changes Docker state but not `$HOME/.autobyteus/docker-server/nodes/*.env`, so status continues to list the saved node with `missing` status.
3. **`destroy --all` is not suitable for one node.** It removes every launcher-managed container and every launcher state file, while preserving named volumes. It is intentionally guarded by `--all`.
4. **The Buildx builder is not launcher-managed.** The observed BuildKit container has no launcher labels, uses the `moby/buildkit` image, and is owned by the Buildx builder instance `multi-platform-builder` created by `build-multi-arch.sh`.
5. **A generic `autobyteus-docker remove <container>` would cross ownership boundaries.** It could delete arbitrary user containers, including Buildx, databases, or unrelated application services, and would have no authoritative launcher state mapping for them.

## Root cause and design-health assessment evidence

- Change posture: feature / lifecycle behavior change.
- Root-cause classification: `Boundary Or Ownership Issue` combined with a `Missing Invariant`.
- Evidence: the existing destroy owner is correctly scoped to launcher-managed resources and already has all-state cleanup, but the public boundary exposes only the all-node variant. Manual Docker deletion bypasses that boundary, leaving a state record that status correctly reports as missing.
- Design response: extend the existing `destroy` subject with an explicit single-node selector, not a generic container deletion API. The selected node's container (if present), state record, and captured image ID should be handled by the same lifecycle owner. Keep volumes untouched. Reject targets that cannot be resolved to launcher state or a launcher label.
- Refactor posture: no broad refactor needed. Bash and PowerShell already have parallel command/runtime boundaries; a small extracted single-node destroy helper may be needed to share the policy within each platform, but it should stay inside the existing Docker runtime module.

## Recommended target behavior

### Managed AutoByteus server node

Add:

```text
autobyteus-docker destroy --name autobyteus-server-5
```

Expected behavior:

- Require exactly one of `--all` or `--name <node>` for `destroy`.
- Resolve the explicit name through normalized launcher node identity.
- If launcher state exists but the container is already gone, remove the stale state entry and report that the managed node was forgotten; do not report a false Docker removal.
- If a labeled managed container exists, remove only that container with `docker rm -f` and remove its matching state entry if present.
- Capture and conditionally remove only that container's now-unused image ID using existing targeted image cleanup policy.
- Keep all node named volumes and host workspace directories.
- Leave other launcher-managed nodes and unrelated Docker containers unchanged.
- Make status omit the removed node on the next invocation rather than show `missing`.

### Buildx builder

Do **not** route `buildx_buildkit_multi-platform-builder0` through `autobyteus-docker destroy`. It is not a managed server node, has no launcher labels, and does not have launcher state. If the user's intent is to remove that builder, the direct owner command is:

```bash
docker buildx rm multi-platform-builder
```

That command is intentionally separate from the requested launcher feature. The proposed launcher change should document the distinction rather than add arbitrary-container deletion.

## Constraints and risks

- Do not remove Docker named volumes or host workspace directories during targeted destroy.
- Do not use `docker system prune`, `docker container prune`, or global image prune.
- Do not infer launcher ownership from the `autobyteus-server-*` name alone; use saved launcher state and/or the launcher label.
- A targeted destroy of a state-only missing node should remove the state record, which is an intentional local launcher-state mutation. The user must use the explicit command; `status` remains read-only.
- Image removal is best-effort and must skip an image still referenced by any Docker container, matching the existing all-node policy.
- Bash and PowerShell state formats differ (`.env` vs `.json`) but must expose equivalent command semantics.
- Existing baseline test failures are unrelated to this task and should not be silently attributed to the feature.

## User approval and slot-reuse clarification

On 2026-07-13 the user approved the recommended managed-node-only scope and explicitly confirmed that reusing the freed indexed slot on a later `new-container` invocation is desirable. The current `next_node_name` implementation already scans from index zero and considers a node unavailable only when launcher state, a launcher-labeled container, or a same-name container exists. Therefore removing the selected state entry is sufficient for reuse: with nodes 0–4 present, removing node 5 makes the next `new-container` select node 5; with multiple gaps, the lowest gap wins. Because targeted destroy keeps named volumes, a recreated node with the same name also addresses the same `<node>-data`, `<node>-root-home`, `<node>-workspace`, and `<node>-chromium-profile` volumes.

The approved scope remains:

1. Add `autobyteus-docker destroy --name <managed-node>` for AutoByteus server nodes, clean stale state, and preserve volumes.
2. Keep Buildx outside launcher ownership; document `docker buildx rm multi-platform-builder` as the separate builder cleanup command.

## Architecture review rework evidence

Architecture review round 1 (`design-review-report.md`) returned `Fail / Design Impact` with two findings:

- **F-001:** the original design did not make state/label disagreement, duplicate node-label candidates, or an unmanaged same-name collision deterministic. The revised design and requirements now require collecting the complete exact launcher+node candidate set, verifying both labels, refusing ambiguity/disagreement without Docker removal or state deletion, and covering Bash/PowerShell parity scenarios. A single exact label-only candidate is allowed only without a conflicting state record; state-only cleanup is allowed only when no exact candidate exists and the recorded container is absent.
- **F-002:** the original design did not specify checked state deletion or preflight ordering. The revised design and requirements now require selector grammar validation before state-directory creation and Docker reachability checks, checked/post-verified state deletion, and a nonzero partial-cleanup result with no rollback claim when state deletion fails after container removal.

No new runtime or external evidence was needed to resolve these design findings. The relevant current-code facts remain that `container_for_node` uses a first-match pipeline, `managed_container` checks only the launcher label, and state deletion currently uses unchecked/suppressed primitives in the all-node path; these are implementation constraints that the targeted resolver and checked state-delete helper must address without broad refactoring.

## Frontend Docker Guide requirement gap

The user's follow-up request adds a small but user-visible requirement: the in-app **Nodes -> Docker Guide** must make the targeted launcher operation discoverable. This is distinct from the already-updated README documentation.

### Evidence inspected

- `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` renders the static direct-command catalog and existing copy feedback; it does not execute launcher commands or call a backend node API.
- `autobyteus-web/utils/dockerNodeLauncherCommands.ts` is the canonical direct-command list. It currently contains `direct-destroy-all` but no targeted destroy entry.
- `autobyteus-web/localization/messages/en/settings.ts` and `autobyteus-web/localization/messages/zh-CN/settings.ts` contain the localized command-card copy. Both need equivalent targeted-destroy title/description keys.
- `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts` and `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` are the existing focused frontend test owners.
- The root and server Docker READMEs already describe `autobyteus-docker destroy --name <node>`; the gap is specifically the mounted frontend guide.

### Scope and design consequence

The frontend addition is a static, copyable command template exactly equal to `autobyteus-docker destroy --name <node-name>`, with status-first target identification, volume/workspace preservation, and slot-reuse guidance. It must not hard-code `autobyteus-server-5`, fetch live node names, add a node picker, execute the command, or call Docker/backend APIs. English and Simplified Chinese content must remain semantically equivalent and reuse existing command-card copy/accessibility behavior.

This is a requirement/design supplement rather than an implementation shortcut: it changes user-visible behavior, so the updated cumulative package must pass the architecture gate and the normal source/API-E2E review stages even though the code delta is expected to be small.

### Architecture review round 3 rework

Round 3 identified one contract inconsistency: the UI journey included a concrete node name as a prose example while the requirements and design prohibit hard-coded destructive targets. The supplement now uses placeholder-only, status-first guidance in both locales; no concrete node name is part of the rendered-copy contract. The revised package is being rerouted for architecture review before frontend implementation.
