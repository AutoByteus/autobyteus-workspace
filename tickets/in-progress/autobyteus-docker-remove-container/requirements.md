# Requirements — autobyteus-docker targeted managed-node removal

**Status:** Design-ready; approved by user on 2026-07-13
**Investigation:** [`investigation-notes.md`](./investigation-notes.md)
**Task branch:** `codex/autobyteus-docker-remove-container`

## User intent

The user wants a safe `autobyteus-docker` operation for removing one selected AutoByteus Docker server node. Manual `docker stop` followed by `docker rm` removes the Docker container but leaves the launcher's state file, so `autobyteus-docker status` reports that node as `missing`. The user also identified `buildx_buildkit_multi-platform-builder0`, but that container belongs to Docker Buildx rather than the AutoByteus server launcher.

## Scope decision requested

**Recommended scope:** extend the existing `destroy` lifecycle command with a targeted managed-node form:

```bash
autobyteus-docker destroy --name autobyteus-server-5
```

This form removes one launcher-managed server container when present, removes its corresponding launcher state (including stale state when the container was manually removed), keeps its named volumes and host workspace, and leaves unrelated Docker containers untouched.

The scope does **not** add arbitrary-container deletion or Buildx ownership to `autobyteus-docker`. To remove the separately owned Buildx builder shown by the user, use its owning command:

```bash
docker buildx rm multi-platform-builder
```

The implementation should document this boundary clearly.

## Functional requirements

### R-001 — Target one managed node

The Bash and PowerShell public launchers SHALL support `destroy --name <node-name>` as a single-node destructive lifecycle operation. `<node-name>` is the normalized launcher node identity, such as `autobyteus-server-5`, not an arbitrary Docker container selector.

### R-002 — Preserve explicit all-node guard

`destroy` SHALL require exactly one of `--all` or `--name <node-name>`. It SHALL reject an unqualified `destroy`, `destroy --name ... --all`, and an unrelated positional or extra argument with an actionable error. Existing `destroy --all` semantics remain unchanged.

### R-003 — Remove only the selected managed resource

For a selected node, the launcher SHALL resolve the container through launcher state and/or the launcher ownership labels (`com.autobyteus.launcher=server-docker`, `com.autobyteus.nodeName=<node>`). It SHALL remove at most that resolved managed container, never an unrelated container with a similar name.

### R-010 — Deterministic ownership and disagreement handling

The targeted resolver SHALL normalize the selector once, collect the complete set of Docker containers carrying both exact launcher and exact node labels for that selector, and verify those labels again before removal. It SHALL never use a first-match result. The resolver SHALL refuse with a nonzero result and no Docker removal or launcher-state deletion when:

- more than one exact launcher+node candidate exists;
- a state-recorded container exists but does not carry both exact labels;
- the state-recorded container and the exact label candidate set disagree;
- a state record is malformed or identifies a different node; or
- an existing same-name container cannot be proven to be the selected managed container.

State-only cleanup is allowed only when a valid state record exists, no exact label candidate exists, and the recorded container is absent. A label-only target is allowed only when exactly one exact launcher+node candidate exists and no conflicting state record exists. All Bash and PowerShell implementations SHALL apply the same candidate-set and refusal rules.

### R-004 — Clean launcher state and status

After a successful targeted destroy, the matching launcher state file SHALL be removed. If the state exists but the Docker container is already absent, the command SHALL remove the stale state and report that the managed node was forgotten. A subsequent `autobyteus-docker status` SHALL no longer show that node as `missing`.

### R-005 — Keep user data and volumes

Targeted destroy SHALL keep all Docker named volumes and host workspace directories for the selected node. The command SHALL not remove application data, auth state, browser profile state, workspace data, or shared workspace data.

### R-006 — Targeted image cleanup only

The targeted operation MAY apply the existing image-ID cleanup policy to the removed managed container's image, but only after verifying no Docker container still references that image. It SHALL not perform global image/container/volume prune operations.

### R-007 — Refuse unmanaged targets

If the selected name does not resolve to launcher state or a launcher-labeled container, the command SHALL fail without deleting any Docker resource and SHALL explain that only AutoByteus-managed server nodes are supported. In particular, `buildx_buildkit_multi-platform-builder0` SHALL not be treated as an AutoByteus node.

### R-008 — Explain Buildx ownership

User-facing Docker documentation SHALL state that the Buildx builder created by `autobyteus-server-ts/docker/build-multi-arch.sh` is separate infrastructure and is removed with `docker buildx rm <builder-name>`, not with `autobyteus-docker destroy`.

### R-009 — Preserve platform parity

The Bash and PowerShell public launchers SHALL expose equivalent command syntax, ownership checks, state cleanup, volume safety, and success/failure semantics.

### R-011 — Checked state cleanup and partial-failure reporting

After container removal, the launcher SHALL delete the selected state file with checked error handling and verify that it is absent. If state deletion fails after Docker removal, the command SHALL return nonzero and clearly report partial cleanup; it SHALL not claim rollback or silently continue as success. No rollback attempt is required or promised. Image cleanup SHALL not hide this state-cleanup failure.

### R-012 — Validate selector grammar before setup

For `destroy`, command grammar and selector exclusivity SHALL be validated before launcher state-directory creation, Docker reachability checks, image resolution, target resolution, or any Docker/state mutation. Invalid forms include an unqualified `destroy`, conflicting `--all` and `--name`, missing `--name` values, and unexpected extra arguments.

## Use cases and scenario intent

| Use case | Requirement IDs | Expected observable result |
| --- | --- | --- |
| UC-001: Remove a running/stopped managed server node | R-001, R-002, R-003, R-004, R-005, R-006 | Only the selected managed container is removed; state disappears; volumes remain; other nodes stay intact. |
| UC-002: Forget a node manually removed with `docker rm` | R-003, R-004, R-005 | Targeted destroy removes the state-only record and no longer shows a `missing` row. |
| UC-003: Reject Buildx/unmanaged target | R-003, R-007, R-008 | No Docker deletion occurs; output directs the user to `docker buildx rm multi-platform-builder` when appropriate. |
| UC-004: Preserve all-node lifecycle behavior | R-002, R-005, R-006, R-009 | Existing `destroy --all` remains explicit, scoped to launcher-managed resources, and volume-safe. |
| UC-005: Cross-platform usage | R-009 | Bash and PowerShell help/parser/runtime behavior agree. |
| UC-006: Ambiguous or conflicting ownership | R-003, R-010 | Duplicate exact label candidates, state/label disagreement, malformed state, and unmanaged name collisions refuse without removal or state deletion. |
| UC-007: Cleanup failure and validation preflight | R-011, R-012 | State-delete failure is reported as nonzero partial cleanup; invalid selectors fail before setup or Docker reachability checks. |

## Acceptance criteria

| Acceptance ID | Verifiable criterion | Scenario intent |
| --- | --- | --- |
| AC-001 | In an isolated fake-Docker environment with two labeled nodes and two state files, `autobyteus-docker destroy --name autobyteus-server-1` removes only `autobyteus-server-1`, leaves `autobyteus-server-0`, and deletes only node-1 state. | UC-001 |
| AC-002 | The targeted destroy output identifies the selected node/container and says named volumes are kept; fake-Docker call records contain no volume removal or global prune command. | UC-001 |
| AC-003 | After targeted destroy, isolated `autobyteus-docker status` output contains node-0 and does not contain node-1 or a `missing` row for node-1. | UC-001 |
| AC-004 | With a state file for a manually removed node and no corresponding container, `destroy --name <node>` succeeds by removing the state file and reports a stale/missing node was forgotten. | UC-002 |
| AC-005 | `destroy --name buildx_buildkit_multi-platform-builder0` and an unknown node fail non-zero without a `docker rm` call; the output explains the launcher only removes managed server nodes. | UC-003 |
| AC-006 | Help and parser checks document `destroy --name <node>` and preserve `destroy --all`; unqualified destroy and conflicting selectors fail before mutation. | UC-004 |
| AC-007 | Existing `destroy --all` fake-Docker coverage continues to remove all labeled managed containers and state while preserving volumes and unrelated containers. | UC-004 |
| AC-008 | Bash syntax checks pass; PowerShell parser checks pass when `pwsh` is available; focused tests cover both source contracts or equivalent parity assertions. | UC-005 |
| AC-009 | Docker docs describe `docker buildx rm multi-platform-builder` as the separate Buildx cleanup command and do not imply `autobyteus-docker` owns it. | UC-003 |
| AC-010 | Isolated Bash and PowerShell-equivalent scenarios refuse duplicate exact launcher+node candidates, state/label disagreement, malformed/mismatched state, and an unmanaged same-name collision without invoking `docker rm` or deleting launcher state; a single exact label-only candidate is allowed when no conflicting state exists. | UC-006 |
| AC-011 | An injected state-file deletion failure after successful container removal exits nonzero, reports partial cleanup, leaves the state record for operator recovery, does not claim rollback, and does not silently report success; named volumes remain untouched. | UC-007 |
| AC-012 | Invalid destroy selector forms fail before state-directory creation and before Docker reachability checks in Bash and PowerShell; no runtime target-resolution or deletion call occurs. | UC-007 |

## Persisted data / state transition decision

- Launcher state files under `~/.autobyteus/docker-server/nodes` (or the configured state directory): **Discard or Rebuild**. The targeted destroy intentionally discards the selected node's launcher metadata because the user explicitly requested removal/forgetting; a future `new-container` can create fresh metadata.
- Docker named volumes and host workspace folders: **Not Affected**. They remain available for explicit future reuse/rebuild, preserving app data, auth, browser profile, and workspace contents.
- No schema migration or historical-version reader is required.

## Safety and compatibility constraints

- No generic `docker rm <arbitrary-name>` API in the AutoByteus launcher.
- No compatibility wrapper that silently interprets `destroy` as a default node; require an explicit selector.
- No `docker system prune`, `docker container prune`, `docker volume rm`, or `docker volume prune`.
- Do not infer ownership from the container name alone; labels/state are authoritative.
- Do not auto-delete stale state during read-only `status`; cleanup is explicit through targeted destroy.
- Refuse state/label disagreement, duplicate exact label candidates, malformed state, and unmanaged same-name collisions without Docker or launcher-state deletion.
- Verify state-file deletion and report a nonzero partial-cleanup result if it fails after container removal; do not claim rollback.
- Validate destroy selector grammar before creating the state directory or checking Docker reachability.
- Existing `destroy --all`, `stop`, `upgrade`, `reset`, and status behavior remain compatible except for the new targeted destroy form and the documented stale-state cleanup path.

## Supplemental solution artifacts

None. The ownership distinction and command contract are sufficiently precise in this requirements document and the investigation notes; a separate UI/API artifact is not needed for a shell launcher.

## Approval record

The user approved the recommended scope on 2026-07-13: implement targeted `autobyteus-docker destroy --name <managed-node>` and reuse the freed indexed slot on a later `new-container` invocation, while keeping Buildx outside launcher ownership. The design and implementation must preserve the existing lowest-available-index behavior: after removing node 5 while nodes 0–4 remain, the next new container selects `autobyteus-server-5`; if multiple gaps exist, it selects the lowest available index.
