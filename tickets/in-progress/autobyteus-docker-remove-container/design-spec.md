# Design Spec — autobyteus-docker targeted managed-node removal

**Status:** Ready for architecture review
**Requirements:** [`requirements.md`](./requirements.md) — Design-ready, user-approved 2026-07-13
**Investigation:** [`investigation-notes.md`](./investigation-notes.md)

## Current-State Read

The public launcher has parallel Bash and PowerShell implementations. The public entry scripts are thin loaders/installers; the platform modules own command parsing, launcher state, and Docker lifecycle behavior.

Current Bash flow:

`autobyteus-docker.sh -> entry_load_modules -> main (commands.sh) -> destroy --all -> managed_container_names (docker-runtime.sh) -> docker rm -f -> remove_all_state_files`

Current PowerShell flow:

`autobyteus-docker.ps1 -> Invoke-AutoByteusDocker (Commands.ps1) -> Destroy-AllNodes (DockerRuntime.ps1) -> Get-ManagedContainerNames -> docker rm -f -> Remove-AllStateFiles`

Launcher-managed server containers carry `com.autobyteus.launcher=server-docker` and `com.autobyteus.nodeName=<node>` labels. Launcher state is stored as one `.env` file per node on Bash and one `.json` file per node on PowerShell. `status` enumerates state records and reports `missing` when the saved container is absent; it intentionally does not mutate state.

The current public contract supports `destroy --all` only. It has no single-node destroy path, so a user who manually removes `autobyteus-server-5` leaves its state record behind and sees `missing`. The existing `next_node_name` scan already chooses the lowest available indexed node by checking state, managed containers, and same-name containers. A targeted destroy that removes the selected state record therefore naturally makes the slot reusable.

The current runtime helpers are not sufficient as-is for a destructive targeted resolver: Bash `container_for_node` returns the first label match, and `managed_container` verifies only the launcher label. The target design replaces first-match use in the targeted path with complete candidate-set collection and exact launcher-plus-node label verification. It also adds checked state deletion and moves selector preflight ahead of state-directory and Docker setup.

The observed `buildx_buildkit_multi-platform-builder0` has no launcher labels, uses `moby/buildkit`, and is owned by the `multi-platform-builder` Buildx instance. It is outside this design.

## Intended Change

Add an explicit single-node form to the existing `destroy` command in both platform implementations:

```bash
autobyteus-docker destroy --name autobyteus-server-5
```

The command requires exactly one of `--name <managed-node>` or `--all`. For a targeted node it:

1. Validates the `destroy` selector grammar before state-directory creation, Docker reachability checks, image resolution, or runtime calls.
2. Resolves the normalized launcher node identity through a complete exact-label candidate set and state mapping.
3. Refuses unknown, ambiguous, malformed, disagreeing, or unmanaged targets before Docker removal or launcher-state deletion.
4. Captures the selected managed container's image ID when the container exists.
5. Force-removes only the selected managed container when present.
6. Removes only that node's launcher state file, including a state-only record left by a prior manual `docker rm`, and verifies deletion.
7. Reports a nonzero partial-cleanup result if state deletion fails after container removal; no rollback is claimed or attempted.
8. Applies the existing image-ID cleanup policy to the captured image only after checked state cleanup and only when no Docker container still references it.
9. Keeps all named volumes and host workspace directories.
10. Reports the action and makes the node disappear from subsequent `status` output after complete cleanup.

No generic arbitrary-container removal API is added. Buildx remains owned by Docker Buildx and is documented with its own cleanup command.

### Targeted resolver contract (authoritative safety rule)

`destroy_node` / `Destroy-Node` receives one normalized launcher node name, never a raw Docker container name. Resolution is deterministic and must complete before destructive mutation:

1. Normalize the selector exactly once. A malformed/empty normalized identity is rejected by command validation.
2. Read the node state record if present. A present record must identify the exact normalized node; missing or conflicting `NODE_NAME`/`nodeName`, missing container identity, or malformed state is a refusal condition.
3. Collect **all** Docker names matching both exact filters `com.autobyteus.launcher=server-docker` and `com.autobyteus.nodeName=<normalized-node>`. The implementation must not pipe to `head -n 1` or otherwise select an arbitrary first result.
4. For every collected candidate, inspect and verify both labels exactly. A candidate with the launcher label but no exact node label is not a valid target and cannot be removed.
5. If more than one exact launcher-plus-node candidate exists, refuse as ambiguous with no Docker removal and no state-file deletion.
6. If state exists and its recorded container exists, that container must be the sole exact candidate and must carry both exact labels. If it is absent from the exact candidate set, or a different exact candidate exists, refuse as state/label disagreement. If the recorded name exists but fails either exact label, refuse as an unmanaged same-name collision.
7. If state exists but its recorded container is absent, allow state-only cleanup only when the exact candidate set is empty. A different or multiple candidate set is disagreement/ambiguity and must refuse without deleting state.
8. If state does not exist, allow a label-only targeted destroy only when exactly one exact candidate exists. Zero candidates is unknown; more than one is ambiguous; both refuse without Docker mutation.
9. Only after this resolver returns either one proven managed container or one valid state-only stale record may the runtime capture an image ID, remove a container, and delete state.

The candidate set may be stored in an array/list for counting. Ordering is not used to choose a target: zero and one are actionable states; any count greater than one is a deterministic refusal. This rule replaces the current first-match helper for the targeted path. Existing non-destructive callers that only need presence may use the same exact-label candidate list without assuming uniqueness.

### Checked cleanup contract

State deletion is an explicit checked operation in each platform runtime:

- Bash removes only the selected state path, checks the `rm` result, and verifies the path is absent (including a lingering symlink/path entry where applicable).
- PowerShell removes only the selected JSON path with terminating error behavior and verifies it is absent; it must not use `-ErrorAction SilentlyContinue` for this operation.
- If the container was removed but state deletion fails, the command exits nonzero and reports partial cleanup. It does not attempt to recreate or roll back the Docker container, because rollback cannot safely restore the prior runtime state. It does not proceed to targeted image deletion, avoiding an additional cleanup side effect while the launcher metadata remains.
- If state-only cleanup fails, no Docker mutation occurred and the command exits nonzero.
- Existing targeted image cleanup remains best-effort only after container removal and verified state deletion; image cleanup failure does not rewrite the container/state result unless the existing policy is intentionally changed.

### Selector validation preflight

The command parser performs a pure grammar phase before `ensure_state_dir` / `Ensure-StateDir`, `assert_docker` / `Assert-Docker`, image-ref calculation, or runtime resolution. For `destroy`, exactly one of `--all` and `--name <node>` must be present, with no extra arguments. Invalid forms fail immediately and do not create a state directory or call `docker info`. Valid commands then enter the existing setup/runtime path.

## Supplemental Solution Artifacts

None. The requirements doc and investigation notes contain the complete command contract, ownership distinction, and user-visible behavior. No UI/API/data-mapping supplement is needed for this shell launcher change.

## Task Design Health Assessment (Mandatory)

- **Change posture:** Feature / lifecycle behavior change.
- **Current design issue found:** Yes, at the public boundary; the internal destroy owner is sound but exposes only an all-node command.
- **Root cause classification:** `Boundary Or Ownership Issue` plus `Missing Invariant`.
- **Refactor needed now:** No broad refactor. A focused per-platform `destroy_node` / `Destroy-Node` helper is an extension of the existing lifecycle owner, not a new subsystem.
- **Evidence:** `destroy_all_nodes` / `Destroy-AllNodes` already owns managed-container discovery, force removal, state cleanup, image cleanup, and volume-preserving semantics. `status` proves that manual Docker deletion bypasses state cleanup. `next_node_name` already supports lowest-free-index selection once state is removed.
- **Design response:** Extend the existing `destroy` boundary with an explicit selector and move one-node deletion through the same runtime owner. Make state cleanup and ownership validation part of that owner. Keep status read-only.
- **Refactor rationale:** Creating a generic container manager would weaken ownership and risk deleting Buildx or unrelated containers. Splitting a new subsystem would duplicate the existing lifecycle policy. The current Bash/PowerShell module boundaries are healthy for this narrow change.
- **Intentional deferrals and residual risk:** Buildx lifecycle is intentionally out of scope; users must use `docker buildx rm`. The existing unrelated Python baseline failures remain environment/test debt and must not be disguised as feature validation.

## Terminology

- **Managed node:** An AutoByteus server node represented by launcher state and/or the launcher labels.
- **Node identity:** The normalized value accepted by `--name`, normally `autobyteus-server-N`.
- **Container identity:** The actual Docker container name resolved from state or the node label. It is never accepted as an arbitrary deletion selector.
- **State-only stale node:** A launcher state record whose recorded container no longer exists.

## Design Reading Order

The change affects disposable launcher metadata but not application data. The state transition, spine, ownership, interfaces, and file mapping follow.

## Persisted Data / State Transition Decision

- **Stored subject:** Per-node launcher metadata under `$AUTOBYTEUS_DOCKER_STATE_DIR/nodes` (`.env` on Bash, `.json` on PowerShell), containing node/container identity, ports, image ref, timestamps, and config hash.
- **Relevant change:** Targeted destroy intentionally removes one selected state record. No schema shape changes.
- **Normal reader/writer behavior:** `status`, `urls`, and lifecycle operations read the state file; `new-container` writes fresh state for a newly selected indexed name. No historical schema decoder is required.
- **Required semantics:** After explicit targeted destroy, the selected node must no longer appear in status, and a later `new-container` must be able to reuse its lowest available index. Named volumes and host workspace files must remain intact.
- **Physical-store and operational constraints:** State is small disposable launcher metadata. Docker named volumes contain server DB/logs/memory/media, auth/root-home, Chromium profile, and workspace data; these must not be touched.
- **Decision:** `Discard or Rebuild` for the selected launcher state record; `Not Affected` for Docker named volumes and host workspace directories.
- **Rationale:** The user explicitly requests removal/forgetting of one node. Keeping the metadata would recreate the observed `missing` row and block slot reuse. The state can be rebuilt by `new-container`; app data is preserved through unchanged volume names. No migration or compatibility reader is justified.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User CLI invocation | Selected managed container removed, state removed, result printed | Managed Docker lifecycle owner (`docker-runtime.sh` / `DockerRuntime.ps1`) | Defines the complete targeted destroy behavior and safety boundary. |
| DS-002 | Return-Event | Runtime operation result | CLI output and process exit status | Command boundary (`commands.sh` / `Commands.ps1`) | Makes success, stale-state cleanup, and refusal actionable to the user. |
| DS-003 | Bounded Local | Target identity | Selector preflight -> exact candidate-set resolution -> state/label agreement -> image capture -> container removal -> checked state removal -> image cleanup | Managed Docker lifecycle owner | Keeps validation, deterministic ownership proof, cleanup ordering, and partial-failure semantics explicit inside one owner. |
| DS-004 | Primary End-to-End | Later `new-container` invocation | Lowest available indexed node, potentially the freed slot | Node allocation and start owner (`next_node_name` / `Get-NextNodeName`, then `start_node` / `Start-Node`) | Proves that targeted state cleanup creates the intended slot-reuse behavior. |

## Primary Execution Spine(s)

### DS-001 — Targeted managed-node destroy

`autobyteus-docker destroy --name <node> -> command parser preflight -> normalized node selector -> exact managed lifecycle resolver -> Docker daemon + launcher state -> success/error output`

### DS-004 — Reuse after destroy

`autobyteus-docker new-container -> next_node_name / Get-NextNodeName -> lowest free indexed identity -> start_node / Start-Node -> same-name volumes reused -> fresh state`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The parser accepts an explicit managed-node identity, the runtime resolves it through launcher state/labels, removes only its managed container, deletes its state record, and returns a clear result. | CLI command boundary; node selector; managed lifecycle; Docker daemon; launcher state | Managed lifecycle owner | Image-ID cleanup, volume-preservation messaging, error formatting. |
| DS-002 | The runtime returns success or fails before mutation when ownership cannot be proven; the command layer turns that into stable human-readable output and exit status. | Runtime result; command output boundary | Command boundary | Bash stderr/exit behavior and PowerShell exception behavior. |
| DS-003 | Within the lifecycle owner, selector preflight has already passed; complete candidate resolution and state/label agreement precede mutation; image capture precedes removal; checked state removal follows successful container removal or handles the state-only stale case; image cleanup is last. | Selector preflight; candidate resolver; image capture; container removal; checked state removal; image cleanup | Managed lifecycle owner | Docker command errors, ambiguity/collision refusal, state-delete failure, and deduplication of image IDs. |
| DS-004 | The existing allocator sees no state and no managed container for the removed index, so it selects the lowest free index. The normal start path writes fresh state and uses the existing node-derived volume names. | Node allocator; single-node start/reconcile; Docker run; state writer | Existing node allocation/start owner | Named volume reuse and port selection. |

## Spine Actors / Main-Line Nodes

1. **Public launcher entry:** loads the platform modules; remains a thin wrapper.
2. **Command parser:** owns accepted syntax, selector exclusivity, help text, and dispatch.
3. **Managed-node lifecycle owner:** owns complete candidate-set ownership validation, target resolution, ordering of destructive operations, checked state cleanup, image cleanup, and volume safety.
4. **Docker daemon:** performs the actual managed container removal; it is an external dependency, not a launcher policy owner.
5. **Launcher state store:** records node metadata and is explicitly deleted for the selected node by the lifecycle owner.
6. **Node allocator/start owner:** existing `next_node_name` and `start_node` paths provide slot reuse; they do not need a new allocation policy.

## Ownership Map

| Main-line node | Owns | Must not own |
| --- | --- | --- |
| Public launcher entry | Platform module loading and install/bootstrap behavior | Docker resource selection or deletion policy. |
| Command parser | Public command grammar, `--all`/`--name` exclusivity, help, dispatch, exit/error surface | Direct `docker rm`, state file deletion, or image cleanup. |
| Managed-node lifecycle owner | Authoritative managed-resource resolution, deletion ordering, state cleanup, targeted image cleanup, volume-preservation invariant | Arbitrary Docker container deletion or Buildx lifecycle. |
| Docker daemon | Actual container/image operations | Knowing which resources AutoByteus owns. |
| Launcher state store | Per-node metadata serialization/path access | Deciding whether a Docker container is safe to remove. |
| Node allocator/start owner | Lowest-free-index selection and creation/reconciliation | Forgetting or deleting existing node state. |

The public entry is thin. The runtime lifecycle module is the authoritative boundary for deletion. The parser must call that boundary and must not bypass it with a direct Docker command.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Bash modules, principally `commands.sh` and `docker-runtime.sh` | Installable/curl-pipe entrypoint and module loader | Target resolution or Docker deletion. |
| `scripts/public/docker/autobyteus-docker.ps1` | PowerShell modules, principally `Commands.ps1` and `DockerRuntime.ps1` | Installable PowerShell entrypoint/module loader | Target resolution or Docker deletion. |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Manual workflow `docker rm` followed by stale launcher state | It bypasses the lifecycle boundary and creates `missing` rows | Targeted `destroy --name` in existing lifecycle owner | In This Change (documentation/behavior) | Direct Docker use remains possible but is no longer the recommended launcher-node workflow. |
| Parser rejection that treats every non-`--all` destroy as invalid | Targeted destroy becomes a supported explicit form | `commands.sh` / `Commands.ps1` selector dispatch | In This Change | Keep rejection for missing/conflicting selectors. |
| First-match `container_for_node` / equivalent targeted lookup | A destructive command cannot safely choose an arbitrary candidate | Complete exact-label candidate-set helper plus explicit count/agreement resolver | In This Change | Update presence-only callers so no targeted path relies on first-match behavior. |
| Any temptation to add `remove <arbitrary-container>` | It would weaken ownership and risk unrelated containers | Managed-node-only target resolver | In This Change | Explicitly rejected, not implemented. |

## Return Or Event Spine(s)

### DS-002 — Result and failure return

`destroy_node / Destroy-Node -> lifecycle result -> log / Write-LauncherInfo or fail / Fail-Launcher -> stdout/stderr + process exit`

Success messages distinguish:

- container removed and state forgotten, with named volumes kept; or
- state-only missing node forgotten, with named volumes kept.

Failure messages identify the normalized target and explain that only launcher-managed server nodes can be destroyed. A failed ownership check occurs before `docker rm`.

## Bounded Local / Internal Spines

### DS-003 — Targeted deletion ordering

Parent owner: `docker-runtime.sh` / `DockerRuntime.ps1`.

`validate selector -> collect all exact launcher+node candidates -> prove state/label agreement -> capture image ID -> docker rm -f -> checked/verified state deletion -> remove unused captured image`

This ordering matters because invalid selectors must fail before setup, a state-only stale record can be cleaned without Docker mutation, and an existing container must be proven managed and its image ID captured before removal. State is not removed if Docker removal fails. If state deletion fails after container removal, the operation returns a nonzero partial-cleanup result, makes no rollback claim, and does not proceed to image cleanup.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Launcher state path/serialization | DS-001, DS-003, DS-004 | Lifecycle and allocator owners | Read/write/delete one node's `.env`/`.json` metadata | Platform-specific persistence already exists | Parser would become format-aware and bypass lifecycle authority. |
| Managed label filtering | DS-001, DS-003 | Lifecycle owner | Collect and verify the complete set of containers carrying both exact launcher and node labels | Separates AutoByteus resources from Buildx/unrelated containers and makes ambiguity explicit | Name-only or first-match deletion could remove the wrong resource. |
| Targeted image cleanup | DS-003 | Lifecycle owner | Remove only captured image IDs not used by any container | Reuses existing safety policy and avoids global prune | Global cleanup could delete unrelated images. |
| Help/documentation | DS-002, DS-004 | Command boundary and user docs | Explain selector syntax, slot reuse, volume retention, and Buildx boundary | User needs predictable lifecycle behavior | Hiding contract in runtime code creates unsafe operations. |
| Fake-Docker test fixture | DS-001–DS-004 | Test subsystem | Model labels, state, rm calls, and indexed recreation in isolation | Prevents mutation of live user Docker | Tests that use the real daemon would be unsafe and non-repeatable. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Single managed-node deletion | Public Docker launcher lifecycle | Extend | `destroy_all_nodes` already owns equivalent policy. | N/A |
| Managed target discovery | Public Docker launcher runtime | Extend | Reuse state readers and label filters, but replace first-match targeted lookup with an exact-label candidate-set resolver. | N/A |
| Indexed slot reuse | Public Docker launcher node allocation | Reuse | `next_node_name` already chooses the lowest available index. | N/A |
| Buildx cleanup | Docker Buildx / `build-multi-arch.sh` | Do not absorb | Different owner, labels, command surface, and lifecycle. | Absorbing it would create a cross-subsystem generic cleanup boundary. |
| Durable test coverage | `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Extend | Existing fake-Docker environment already isolates state and records calls. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine IDs | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker launcher command surface | Syntax, help, selector validation, dispatch | DS-001, DS-002 | `commands.sh`, `Commands.ps1` | Extend | Keep command grammar symmetric. |
| Public Docker launcher runtime | Managed discovery, deletion ordering, state cleanup, image cleanup | DS-001–DS-003 | `docker-runtime.sh`, `DockerRuntime.ps1` | Extend | One targeted helper per platform; no new subsystem. |
| Launcher state | State path/read/write/delete | DS-001, DS-003, DS-004 | `core.sh`, `Core.ps1` plus runtime callers | Reuse | Deletion is invoked by runtime, not parser. |
| Docker build tooling | Buildx builder lifecycle | Not in scope | `build-multi-arch.sh` / Docker CLI | Reuse externally; do not extend launcher | Document separate command only. |
| Launcher documentation/tests | User contract and executable evidence | DS-001–DS-004 | README files and focused Python test | Extend | Update duplicated public launcher docs consistently. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Command surface | Bash parser | Add destroy selector grammar and dispatch | Existing command routing file | Existing runtime functions. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Launcher runtime | Bash lifecycle owner | Add complete candidate-set resolver, exact label/state agreement checks, targeted destruction, and state/image ordering | Existing Docker runtime owner | Existing state/image helpers; first-match lookup must be replaced for targeted use. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Command surface | Bash help/common core | Update help text and selector description if needed | Existing help/constants owner | Existing normalization/state helpers. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | Command surface | PowerShell parser | Add equivalent selector grammar/dispatch | Existing PowerShell routing file | Existing runtime functions. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | Launcher runtime | PowerShell lifecycle owner | Add equivalent candidate-set resolver, exact label/state agreement checks, targeted deletion, and checked state cleanup | Existing Docker runtime owner | Existing state/image helpers; first-match lookup must be replaced for targeted use. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Command surface | PowerShell help/common core | Update help | Existing help/constants owner | Existing normalization/state helpers. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Validation | Fake-Docker test owner | Targeted removal, stale state, slot reuse, safety | Existing fixture/test contract | Existing fake Docker. |
| `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | Documentation | Public Docker user guidance | Targeted destroy, slot reuse, volume retention, Buildx distinction | These are the existing public launcher docs | Existing command examples. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Managed-node identity resolution | Existing per-platform runtime helper set | Public Docker launcher runtime | Bash and PowerShell are separate shells and already use platform-native helpers | Yes; use existing node name/state/container fields only | Yes; do not add a second generic container selector | A cross-platform arbitrary-container registry. |
| Targeted destroy operation | `destroy_node` / `Destroy-Node` in existing runtime files | Public Docker launcher runtime | Each platform needs local shell semantics while preserving one contract | Yes | Yes; do not duplicate deletion in parser and runtime | A new generic `remove` helper. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Bash state `NODE_NAME` / `CONTAINER_NAME` | Yes | Yes | Low | Keep node identity and resolved container identity distinct in runtime logic. |
| PowerShell state `nodeName` / `containerName` | Yes | Yes | Low | Mirror Bash semantics without introducing a generic Docker selector field. |
| `--name` argument | Yes: launcher node identity | Yes | Medium if treated as arbitrary container name | Document and validate as managed node identity only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Command surface | `main` | Parse `destroy --name`, enforce exactly-one selector, call `destroy_node` | Command grammar stays together | Yes, existing `resolve_target_name`. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Runtime | `destroy_node` / `destroy_all_nodes` | Collect all exact-label candidates, resolve state/label agreement, remove container/state with checked semantics, and run targeted image cleanup | Lifecycle ordering stays behind authoritative boundary | Yes, state/image helpers; replace first-match `container_for_node` use in targeted path. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Common core | `usage`, state helpers | Help and existing state/normalization support | Existing common contract file | Yes. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | Command surface | `Invoke-AutoByteusDocker` | PowerShell parity for selector parsing/dispatch | Existing command grammar stays together | Yes. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | Runtime | `Destroy-Node` / `Destroy-AllNodes` | PowerShell candidate-set resolution, state/label agreement, checked state cleanup, and lifecycle ordering | Existing authoritative runtime boundary | Yes. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Common core | `Show-AutoByteusDockerHelp` | Help parity | Existing common contract file | Yes. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Validation | Test class and fake Docker | Isolated executable contract | Existing test fixture is the natural owner | Yes. |
| Public README files | Documentation | Public launcher guidance | Explain usage and ownership | Existing docs already duplicate launcher lifecycle examples | N/A. |

## Ownership Boundaries

The command parser is the public boundary but not the lifecycle owner. It performs a pure grammar/selector preflight before launcher setup, accepts only an explicit node selector or `--all`, and then calls the runtime lifecycle owner. The lifecycle owner is authoritative for whether a container can be removed. It may use state and label discovery internally, but callers must not combine parser-level Docker calls with runtime-level deletion. Its resolver must collect the full exact-label candidate set and refuse ambiguity or disagreement rather than choose a first match.

The state store is not an independent deletion policy. It supplies the node-to-container mapping and is mutated only as part of an explicit lifecycle operation. State deletion is checked and verified by the lifecycle owner; a failure after container removal is reported as partial cleanup with no rollback claim. Status remains a read-only projection and must not auto-delete state.

The Buildx builder is a separate authoritative boundary. No launcher caller may bypass the managed-node boundary to delete it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `destroy_node` / `Destroy-Node` | Full exact-label candidate collection, state/label agreement, managed check, image capture, `docker rm -f`, checked state deletion, image cleanup | `main` / `Invoke-AutoByteusDocker` after grammar preflight | Parser calling `docker rm`, caller resolving a name by first match, or state deletion outside the lifecycle owner | Strengthen this node-oriented runtime API with deterministic resolution and checked cleanup, not by exposing arbitrary container deletion. |
| `destroy_all_nodes` / `Destroy-AllNodes` | All managed-node enumeration and state-file cleanup | `destroy --all`, `reset` | Targeted caller deleting state files separately then invoking all-node logic | Keep all-node and single-node paths explicit; share only tight runtime helpers. |
| `next_node_name` / `Get-NextNodeName` | Availability checks across state, labels, and same-name containers | `new-container` | New command inventing its own slot scan | Reuse existing allocator. |
| Buildx builder command | Buildx instance/node discovery and daemon cleanup | Build scripts/operators | Launcher calling `docker rm` on Buildx names | Keep Buildx ownership in `docker buildx rm`. |

## Dependency Rules

- Public entry scripts may load command/runtime modules; they must not own deletion policy.
- Command modules may call the runtime lifecycle boundary and common normalization/help functions. Their destroy selector preflight must be pure and must precede `ensure_state_dir`/`Ensure-StateDir` and `assert_docker`/`Assert-Docker`.
- Runtime modules may call Docker CLI operations, state helpers, label discovery, and targeted image cleanup. Targeted deletion must use complete candidate sets and exact labels, never first-match selection.
- Runtime modules must not call Buildx lifecycle operations for this feature.
- Tests may use the fake Docker executable and isolated state; they must not mutate the live Docker daemon.
- Documentation may describe Buildx cleanup but does not create a launcher dependency on Buildx.
- No caller may issue `docker rm` for a container that has not been resolved as launcher-managed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-docker destroy --name <node>` | One managed AutoByteus node | Remove one managed container/state record, preserve volumes | Normalized launcher node name | Requires explicit `--name`; not arbitrary container name. |
| `autobyteus-docker destroy --all` | All managed AutoByteus nodes | Existing all-node removal | Explicit `--all` sentinel | Remains unchanged and mutually exclusive with `--name`. |
| `destroy_node <node>` / `Destroy-Node <node>` | Runtime managed node | Authoritative targeted deletion | Normalized node name | Internal boundary; resolves exact candidate set and state agreement before actual removal. |
| `resolve_destroy_target <node>` / equivalent | Runtime managed node | Deterministic ownership proof | Normalized node name | Returns exactly one proven container, a valid state-only stale record, or a refusal; never returns an arbitrary first match. |
| `next_node_name` / `Get-NextNodeName` | New node allocation | Choose lowest available index | Launcher node prefix/index | Existing behavior reused; no new API. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `destroy --name <node>` | Yes | Yes | Low | Reject unknown/unmanaged node before mutation; runtime refuses ambiguity/disagreement. |
| `destroy --all` | Yes | Yes (`--all`) | Low | Reject combination with `--name`. |
| Proposed generic `remove <container>` | No | No | High | Rejected; not implemented. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing all-node operation | `destroy` | Yes | Low | Extend with explicit selector, preserve all-node meaning. |
| Targeted operation | `destroy --name <node>` | Yes | Low | Use node-oriented name rather than a generic container verb; resolve to a unique exact-label candidate. |
| Internal targeted owner | `destroy_node` / `Destroy-Node` | Yes | Low | Keep in existing runtime files. |
| Buildx target | `multi-platform-builder` | Yes in Buildx domain | High if absorbed by launcher | Keep separate and document `docker buildx rm`. |

## Applied Patterns

- Existing explicit destructive scope pattern: `upgrade --all` and `destroy --all` require `--all`; targeted destroy adds an explicit node selector rather than a default.
- Existing managed-label safety pattern: launcher labels are the authoritative Docker ownership marker.
- Existing targeted image cleanup pattern: capture image IDs before mutation and remove only IDs unused by any container.
- Existing indexed allocation pattern: scan from zero and reuse the lowest free `autobyteus-server-N` slot.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/` | Module folder | Bash launcher | Bash command/runtime implementation | Existing platform-specific launcher boundary | PowerShell or Buildx policy. |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | File | Bash command parser | Targeted destroy syntax and dispatch | Existing command owner | Docker deletion. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | File | Bash managed lifecycle | Target resolution, deletion ordering, state/image cleanup | Existing lifecycle owner | Generic container removal. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | File | Bash common core | Help text/common helpers | Existing common owner | Lifecycle orchestration. |
| `scripts/public/docker/autobyteus-docker.d/powershell/` | Module folder | PowerShell launcher | PowerShell parity | Existing platform boundary | Bash or Buildx policy. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | File | PowerShell command parser | Targeted destroy syntax and dispatch | Existing command owner | Docker deletion. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | File | PowerShell managed lifecycle | Target resolution, deletion ordering, state/image cleanup | Existing lifecycle owner | Generic container removal. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | File | PowerShell common core | Help text/common helpers | Existing common owner | Lifecycle orchestration. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | File | Launcher test subsystem | Fake-Docker targeted destroy/slot-reuse evidence | Existing public launcher test owner | Live Docker mutation. |
| `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | Files | Public Docker docs | Command examples, slot reuse, volume/Buildx boundary | Existing public guidance locations | Implementation policy not reflected in code. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash` | Main-Line Domain-Control + runtime | Yes | Low | Existing compact platform module; split is already meaningful. |
| `scripts/public/docker/autobyteus-docker.d/powershell` | Main-Line Domain-Control + runtime | Yes | Low | Existing parity module. |
| `scripts/tests` | Off-Spine validation | Yes | Low | Extend existing fixture rather than creating a new test subsystem. |
| README locations | Off-Spine documentation | Yes | Medium due duplication | Update all existing public launcher command lists consistently. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Targeted removal | `autobyteus-docker destroy --name autobyteus-server-5` -> resolve node label/state -> remove only mapped container -> remove state -> keep volumes | `autobyteus-docker remove buildx_buildkit_multi-platform-builder0` -> `docker rm` arbitrary name | The good shape preserves the launcher ownership boundary and fixes stale state. |
| Slot reuse | Nodes 0–4 exist; targeted destroy removes node 5 state; next `new-container` selects node 5 and uses `autobyteus-server-5-*` volumes | Add a second allocator or always increment a global counter | Existing lowest-free-index behavior is already the correct policy. |
| Missing state | State exists, container is absent; targeted destroy deletes the state record and reports the node was forgotten | `status` silently deletes state as a read-only side effect | Explicit destruction preserves status semantics and makes data loss intentional. |
| Safety | Existing state points at a name now occupied by an unlabeled container; command refuses without `docker rm` | Remove by name because the string looks like `autobyteus-server-5` | Names alone do not prove ownership. |
| Ambiguity | Two containers carry both exact launcher and `autobyteus-server-5` labels; targeted destroy refuses without Docker/state deletion | `docker ps ... | head -n 1` chooses whichever Docker lists first | Destructive resolution must be deterministic and fail closed. |
| State/label disagreement | State records `container-a`, but the sole exact label candidate is `container-b`; targeted destroy refuses and leaves both state and containers untouched | Delete `container-b` because it is the only label match | State and labels are separate evidence sources; disagreement requires operator repair. |
| Cleanup failure | Container removal succeeds, checked state deletion fails, command returns nonzero partial cleanup and makes no rollback claim | Report success or silently suppress `rm`/`Remove-Item` failure | The feature exists partly to eliminate stale state, so state-delete failure must be visible. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| `destroy` silently defaults to `autobyteus-server-0` | Could make the command shorter | Rejected | Require `--all` or `--name`; prevent accidental deletion. |
| Generic `remove <container>` | Would appear to support the user's exact Docker container string | Rejected | Keep the node-oriented managed boundary; use Buildx's own command for Buildx. |
| Auto-prune missing state during `status` | Would hide `missing` rows after manual deletion | Rejected | Keep `status` read-only; use explicit targeted destroy to forget state. |
| Retain state after targeted destroy | Could preserve config for a future recreate | Rejected | Delete selected state so the slot is reusable and status is consistent; named volumes preserve user data. |
| Legacy default destroy path | Could preserve an implicit old behavior | N/A / rejected | No previous targeted destroy exists; introduce explicit selector only. |

## Derived Layering (If Useful)

The implementation can be understood as a compact boundary sequence, not as a new architecture layer:

`CLI grammar -> authoritative managed lifecycle -> Docker/state adapters -> result projection`

The parser never skips the managed lifecycle boundary, and the allocator remains a separate existing owner used only by `new-container`.

## Change / Refactor Sequence

1. Add/adjust focused requirements and keep the approved Buildx boundary explicit.
2. Update Bash help/parser to accept `destroy --name`, perform pure selector/exclusivity validation before `ensure_state_dir` or `assert_docker`, and dispatch the normalized node to the runtime owner only after preflight passes.
3. Replace first-match targeted lookup with a complete exact launcher+node candidate-set helper. Add a Bash resolver that handles the sole-container, label-only, state-only, duplicate, disagreement, malformed-state, and unmanaged-collision cases exactly as defined above; no ambiguous path may call `docker rm` or delete state.
4. Add Bash checked state deletion and post-delete verification. On failure after container removal, return nonzero partial cleanup with no rollback claim and stop before image cleanup. Preserve volumes.
5. Apply equivalent selector preflight, candidate-set resolver, state/label agreement rules, checked state deletion, and partial-failure semantics to PowerShell.
6. Extend isolated fake-Docker coverage for one-node removal, stale state, label-only single candidate, duplicate labels, state/label disagreement, unmanaged same-name collision, malformed state, injected state-delete failure, invalid-selector preflight ordering, state/volume safety, and lowest-free-index reuse. Keep existing all-node coverage intact.
7. Update all public launcher documentation with targeted destroy syntax, slot reuse, volume retention, refusal behavior, and separate Buildx cleanup.
8. Run Bash syntax checks, focused tests, parser/help checks, and PowerShell parsing when available. Record baseline unrelated test failures separately.

No migration boundary is needed. No legacy compatibility path or generic removal wrapper is retained.

## Key Tradeoffs

- **Extend `destroy` rather than add `remove`:** Keeps lifecycle vocabulary coherent and reuses existing all-node policy. The explicit `--name` selector avoids ambiguity.
- **Preserve volumes:** Matches existing destroy semantics and makes slot reuse useful; users retain app/auth/workspace data. Full data deletion remains outside this feature.
- **Delete state on targeted destroy:** Fixes stale `missing` rows and enables lowest-free-index reuse, at the cost of losing launcher metadata that can be rebuilt. Volume data remains preserved.
- **Reject unmanaged containers:** Prevents convenience at the expense of requiring users to use owner-specific commands for Buildx or other containers.
- **Keep Bash/PowerShell implementations parallel:** Adds duplicated shell-specific code, but matches the established distribution model and avoids introducing a runtime dependency or cross-platform abstraction layer.

## Risks

1. A stale state file may point to a reused name now occupied by an unrelated container; exact launcher-plus-node label validation must refuse deletion.
2. Duplicate exact label candidates or state/label disagreement must refuse deterministically; operator cleanup is required rather than an automatic choice.
3. State-only cleanup intentionally removes metadata; output and docs must make that explicit.
4. Retained named volumes can preserve old data when a slot is reused; docs must state that destroy is container/state removal, not data purge.
5. A state-delete failure after container removal leaves partial cleanup; the nonzero/no-rollback result must be tested and documented for operators.
6. Duplicated Bash/PowerShell logic can drift; parity tests and help checks should cover both source contracts.
7. Existing public launcher installations load downloaded modules; docs/tests must ensure the module files are updated along with the entrypoint when released.

## Guidance For Implementation

- Keep `destroy_node` / `Destroy-Node` inside the existing runtime file and use existing helpers rather than introducing a generic Docker resource abstraction.
- Replace first-match targeted lookup with a complete candidate-set helper filtered by both exact launcher and exact node labels. Re-inspect every candidate's two labels; zero/one/multiple candidates must be handled explicitly, with any ambiguity refusing closed.
- When state supplies a container name, require that the state identity matches the normalized selector and that the existing container is the sole exact-label candidate. A same-name container lacking either exact label is an unmanaged collision and must not be removed. State/label disagreement must leave Docker and launcher state untouched.
- Capture the image ID before `docker rm -f`. If Docker removal fails, leave state intact and return a failure.
- For a state-only missing node, allow state deletion only when the exact candidate set is empty; report a forget/cleanup action and do not invoke `docker rm`.
- Delete state with checked error handling and verify absence. If deletion fails after container removal, return nonzero partial cleanup, make no rollback claim, and stop before image cleanup.
- Invoke existing `remove_unused_image_ids` / `Remove-UnusedImageIds` only with the targeted captured ID after verified state cleanup. Do not change global image cleanup policy.
- Perform destroy selector grammar validation before `ensure_state_dir`/`Ensure-StateDir` or `assert_docker`/`Assert-Docker`; test that invalid invocations do not create state directories or call Docker reachability checks.
- Do not modify `next_node_name` / `Get-NextNodeName`; state removal already makes the lowest available index reusable. Add a regression test proving node 5 is selected after nodes 0–4 remain.
- Preserve `destroy --all` and `reset` behavior and their volume safety.
- Document the exact current-user command:

  ```bash
  autobyteus-docker destroy --name autobyteus-server-5
  autobyteus-docker new-container  # reuses the lowest free indexed slot
  ```

- Document separately:

  ```bash
  docker buildx rm multi-platform-builder
  ```

  Do not add that command to launcher dispatch.
