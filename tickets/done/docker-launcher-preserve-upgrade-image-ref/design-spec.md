# Design Spec

## Current-State Read

The public Docker launcher has two platform implementations: Bash under `scripts/public/docker/autobyteus-docker.d/bash/` and PowerShell under `scripts/public/docker/autobyteus-docker.d/powershell/`. Both implementations already persist each managed node's image reference in node state (`IMAGE_REF` for Bash, `imageRef` for PowerShell) and show it through status/URL output.

The current `upgrade --all` command ignores that per-node image identity. Command parsing initializes global defaults (`autobyteus/autobyteus-server` + `latest`), computes one image reference, and passes that one value into the upgrade fan-out. The upgrade fan-out applies the same image reference to every managed node. A mixed fleet with default nodes and `latest-zh` nodes therefore gets retargeted to default `latest` when the user runs plain `upgrade --all`.

The target design must preserve existing Docker lifecycle behavior: pull target image, compare image/config hashes, recreate managed containers while keeping named volumes and saved ports, and remove unused old images. It must also preserve intentional retargeting with explicit `--tag` or `--image`.

## Intended Change

Change the default `upgrade --all` semantics from "apply launcher default image ref to every node" to "upgrade every node using its own saved image ref." Explicit image/tag options remain an all-node retarget operation.

Examples:

- `autobyteus-docker upgrade --all`: node using `latest` stays on `latest`; node using `latest-zh` stays on `latest-zh`; pinned nodes re-pull their pinned refs.
- `autobyteus-docker upgrade --all --tag latest-zh`: all nodes intentionally retarget to `autobyteus/autobyteus-server:latest-zh`.
- `autobyteus-docker upgrade --all --image autobyteus/custom-server:latest`: all nodes intentionally retarget to that full image ref.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The current upgrade fan-out applies one computed image ref to all nodes; focused fake-Docker reproduction shows a `latest-zh` node is rewritten to default `latest` by plain `upgrade --all`.
- Design response: Make upgrade fan-out own per-node target image resolution for default upgrade, with command parsing supplying an optional explicit override only when the user provided `--image` or `--tag`.
- Refactor rationale: A one-line local change to pass `IMAGE_REF` from state would not preserve explicit retargeting cleanly unless parsing can distinguish default values from user-supplied values. The small refactor separates command intent from upgrade execution.
- Intentional deferrals and residual risk, if any: No state migration; old state missing `IMAGE_REF` falls back to default image. This is acceptable because old/malformed state cannot express an intended variant.

## Terminology

- `Subsystem` / `capability area`: Public Docker launcher.
- `Module`: Platform-specific launcher implementation (`bash`, `powershell`).
- `File`: One concrete launcher source, docs, or test file.
- `Image ref`: Fully resolved Docker image reference such as `autobyteus/autobyteus-server:latest-zh`.
- `Explicit override`: User-supplied `--image` and/or `--tag` during `upgrade --all`.
- `Preserve-current-image upgrade`: Default upgrade mode that reads each node's saved image ref and upgrades against that same ref.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace old default retarget-to-`latest` upgrade behavior for plain `upgrade --all`.
- No compatibility flag should preserve the unsafe default. Users who need retargeting must express it with existing explicit `--image` or `--tag` options.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User invokes `autobyteus-docker upgrade --all` | All managed nodes refreshed with their intended image refs | Public Docker launcher upgrade command | Captures the reported zh preservation bug. |
| DS-002 | Primary End-to-End | User invokes `autobyteus-docker upgrade --all --tag/--image ...` | All managed nodes retargeted to explicit image ref | Public Docker launcher upgrade command | Preserves intentional all-node retargeting. |
| DS-003 | Bounded Local | Upgrade fan-out loops over managed node names | Per-node `start_node`/`Start-Node` call | Upgrade fan-out owner | This loop is where per-node target image selection must live. |

## Primary Execution Spine(s)

- DS-001: `CLI Invocation -> Command Parser -> Upgrade Fan-Out -> Per-Node State Image Resolver -> Docker Lifecycle Start/Recreate -> Updated Node State`
- DS-002: `CLI Invocation With Explicit Override -> Command Parser -> Explicit Target Image Ref -> Upgrade Fan-Out -> Docker Lifecycle Start/Recreate -> Updated Node State`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user runs plain `upgrade --all`. The parser records that no image/tag override was supplied. Upgrade fan-out visits each managed node, resolves that node's saved image ref from state, and delegates to existing Docker lifecycle logic. | CLI command, parser, upgrade fan-out, node state image resolver, Docker lifecycle | Public Docker launcher upgrade command | State loading, image-ref fallback, Docker image cleanup |
| DS-002 | The user runs `upgrade --all` with explicit image/tag. The parser marks an explicit override and computes the override ref once. Upgrade fan-out applies that override to every node by design. | CLI command, parser, explicit override, upgrade fan-out, Docker lifecycle | Public Docker launcher upgrade command | Image-ref normalization, state update |
| DS-003 | Inside upgrade fan-out, the node loop decides target image per node. Without override it reads state; with override it uses the supplied ref. | Managed node iterator, target resolver, node starter | Upgrade fan-out | State fallback and missing-node handling |

## Spine Actors / Main-Line Nodes

- CLI invocation: user-facing command and options.
- Command parser: validates `--all`, rejects unsupported shapes, identifies explicit image/tag override intent.
- Upgrade fan-out: authoritative owner of all-node upgrade sequencing.
- Per-node state image resolver: off-spine helper or local function that returns the target image ref for one node.
- Docker lifecycle starter: existing `start_node` / `Start-Node` owner for pull, compare, recreate, and state write.

## Ownership Map

- Command parser owns user intent extraction: command name, required `--all`, forbidden `--name`, and whether image/tag options were explicit.
- Upgrade fan-out owns all-node sequencing and per-node target selection for default preserve-current-image mode.
- State image resolver owns the fallback rule when node state lacks an image reference.
- Docker lifecycle starter owns pull/recreate/state-write mechanics and should not decide whether upgrade is preserve-mode or retarget-mode.
- State files own persisted node identity, ports, config hash, and image ref.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `autobyteus-docker.sh` / installed Bash entry | Bash launcher modules | Bootstrap/install and source module files | Upgrade target policy beyond dispatching to modules |
| `autobyteus-docker.ps1` / installed PowerShell entry | PowerShell launcher modules | Bootstrap/install and source module files | Upgrade target policy beyond dispatching to modules |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Plain-upgrade global default-image retarget behavior | It is unsafe for mixed `latest` / `latest-zh` fleets and violates per-node image intent. | Upgrade fan-out per-node target resolver | In This Change | Explicit override remains available for retargeting. |
| Docs/help wording that implies one global "latest" target | It reinforces the old unsafe mental model. | Preserve-current-image wording plus explicit retarget examples | In This Change | Update both root and server Docker docs plus Bash/PowerShell help. |

## Return Or Event Spine(s) (If Applicable)

Not applicable; this is synchronous CLI/Docker lifecycle behavior.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Upgrade fan-out
- Chain: `Managed Node Names -> Resolve Target Image Ref -> Start/Recreate Node -> Record Any Old Image ID -> Cleanup Unused Images`
- Why it matters: target image resolution must happen inside the node loop for default preserve mode, not once globally before the loop.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Explicit override tracking | DS-001, DS-002 | Command parser | Record whether `--image` or `--tag` appeared. | Distinguishes user intent from defaults. | Default values would continue to masquerade as retarget intent. |
| State image resolution | DS-001, DS-003 | Upgrade fan-out | Load node state and return saved image ref or fallback. | Preserves node image identity. | Docker lifecycle starter would mix pull/recreate mechanics with upgrade policy. |
| Image ref normalization | DS-002 | Command parser | Reuse existing `image_ref_for` / `Get-ImageRef`. | Keeps existing full-ref and repo+tag handling. | Duplicated parsing across fan-out. |
| Docs/help wording | DS-001, DS-002 | Public launcher user surface | Explain preserve default and retarget override. | Prevents user surprise. | Hidden behavior remains risky. |
| Fake Docker test harness | DS-001, DS-002 | Test coverage | Validate state and run args without live Docker mutation. | Safe durable regression tests. | Live-Docker tests would be slow/risky and environment-dependent. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Per-node state image lookup | Public Docker launcher state helpers | Extend | `load_state`/`Read-NodeState` already expose image refs. | N/A |
| Docker lifecycle refresh | Existing `start_node` / `Start-Node` | Reuse | Already handles pull, recreate, config hash, state write, volumes, ports. | N/A |
| Durable tests | Existing fake Docker launcher test module | Extend | It already creates multiple nodes and inspects state/run args. | N/A |
| User docs | Existing root and server Docker READMEs/help text | Extend | These are the current public launcher docs. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker launcher - Bash | CLI parse, state-backed upgrade target resolution, Docker lifecycle | DS-001, DS-002, DS-003 | Bash public launcher | Extend | Keep files small and mirrored with PowerShell. |
| Public Docker launcher - PowerShell | CLI parse, state-backed upgrade target resolution, Docker lifecycle | DS-001, DS-002, DS-003 | Windows public launcher | Extend | Must align with Bash semantics. |
| Launcher tests | Fake-Docker behavior coverage | DS-001, DS-002 | Public launcher quality gate | Extend | Add targeted tests; avoid live Docker. |
| Public docs/help | User command contract | DS-001, DS-002 | End-user launcher surface | Extend | Clarify safe default and explicit retarget. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Bash launcher | Command parser/dispatch | Track explicit image/tag override and pass optional target to upgrade. | Parser concern already lives here. | Existing `image_ref_for` |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Bash launcher | Docker lifecycle / upgrade fan-out | Resolve per-node target image in `upgrade_all_nodes`. | Upgrade fan-out already lives here. | Existing `load_state`, `state_path_for` |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Bash launcher | Help/state constants | Update help text; optionally add tiny image-ref resolver if better placed. | State helpers live here, but fan-out-local helper may be clearer. | Existing state fields |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | PowerShell launcher | Command parser/dispatch | Track explicit override and pass optional target. | Mirrors Bash parser. | Existing `Get-ImageRef` |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | PowerShell launcher | Docker lifecycle / upgrade fan-out | Resolve per-node target image in `Upgrade-AllNodes`. | Upgrade fan-out already lives here. | Existing `Read-NodeState` |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | PowerShell launcher | Help/state constants | Update help text. | Help text lives here. | Existing state fields |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Launcher tests | Fake Docker coverage | Add mixed-image preserve and explicit retarget tests. | Existing launcher behavior tests live here. | Existing fake Docker helpers |
| `README.md` | Public docs | Root user guide | Update upgrade section. | Current public install/use docs live here. | N/A |
| `autobyteus-server-ts/docker/README.md` | Public docs | Server Docker user guide | Update upgrade section and command list. | Current server Docker docs live here. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Per-node target image resolver exists in Bash and PowerShell separately | N/A | Platform-specific launchers | Cross-language sharing is not practical; keep equivalent small functions in each implementation. | Yes | Yes | A generated cross-platform abstraction or hidden third language layer |
| Explicit override flags in Bash and PowerShell | N/A | Platform-specific parsers | Same semantics, language-specific implementation. | Yes | Yes | A vague global option object with unrelated command state |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Bash `IMAGE_REF` state field | Yes | Yes | Low | Reuse as authoritative node image ref. |
| PowerShell `imageRef` state field | Yes | Yes | Low | Reuse as authoritative node image ref. |
| Parser explicit override flags | Yes | Yes | Low | Track only whether image/tag was supplied and the computed override image ref. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Bash launcher | Command parser/dispatch | Track `image_or_tag_explicit` (name flexible) and call `upgrade_all_nodes` with either explicit image ref or empty/no override marker. | Keeps user-intent parsing in parser. | `image_ref_for` |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Bash launcher | Upgrade fan-out | Add per-node target resolver and apply it inside `upgrade_all_nodes`; preserve image cleanup. | Upgrade sequencing lives here. | `load_state`, `state_path_for`, `DEFAULT_IMAGE`, `DEFAULT_TAG` |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Bash launcher | Help text / state constants | Update `upgrade --all` description and option text if needed. | Existing help owner. | N/A |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | PowerShell launcher | Command parser/dispatch | Mirror Bash explicit override tracking and pass optional override. | Keeps Windows behavior aligned. | `Get-ImageRef` |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | PowerShell launcher | Upgrade fan-out | Add per-node target resolver and apply inside `Upgrade-AllNodes`; preserve image cleanup. | Upgrade sequencing lives here. | `Read-NodeState`, defaults |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | PowerShell launcher | Help text / state constants | Update help text. | Existing help owner. | N/A |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Launcher tests | Durable regression coverage | Add Bash fake-Docker tests for preserve default and explicit override; maintain parity text checks for PowerShell. | Existing test module owns public launcher behavior coverage. | Existing fake Docker helpers |
| `README.md` | Public docs | Root Docker launcher docs | Explain default preserve-current-image upgrade and explicit retarget examples. | Existing root guide. | N/A |
| `autobyteus-server-ts/docker/README.md` | Public docs | Server Docker guide | Same docs update in server Docker section. | Existing server Docker guide. | N/A |

## Ownership Boundaries

The public command parser is the authoritative boundary for interpreting user-supplied options. It should not perform per-node state decisions. Upgrade fan-out is the authoritative boundary for all-node sequencing and must decide target image per node when no explicit override exists. Docker lifecycle start/recreate remains an internal mechanism encapsulated by upgrade fan-out; it should receive a resolved target image and not infer user command intent.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `main()` / `Invoke-AutoByteusDocker` parser | Option parsing, explicit override detection | Public launcher entry scripts | Docker runtime reading raw CLI args | Add parser output/argument to runtime call. |
| `upgrade_all_nodes` / `Upgrade-AllNodes` | Managed-node iteration, target image resolution, old image cleanup | Command dispatch | Parser manually looping nodes or calling `start_node` directly | Extend upgrade function signature. |
| `start_node` / `Start-Node` | Docker pull, inspect, recreate, state write, port/volume preservation | Upgrade/new/reset/workspace apply owners | Target policy embedded in Docker run construction | Pass resolved image ref explicitly. |

## Dependency Rules

- Parser may depend on image-ref normalization helpers and may pass an optional override to upgrade fan-out.
- Upgrade fan-out may depend on managed node enumeration, state loading, image-ref fallback defaults, Docker lifecycle starter, and image cleanup.
- Docker lifecycle starter must not parse CLI options or decide whether default upgrade is preserve or retarget.
- Tests may inspect state files and fake Docker run records but should not depend on live Docker.
- Forbidden shortcut: command parser must not apply `DEFAULT_IMAGE:DEFAULT_TAG` to upgrade unless the user explicitly provided image/tag or state lacks an image ref fallback.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `upgrade_all_nodes([override_image_ref])` | Bash all-node upgrade | Upgrade every managed node using override or per-node state image. | Optional image ref string; empty means preserve current. | Exact signature can be `upgrade_all_nodes "$image_ref" "$has_override"` if clearer in Bash. |
| `Upgrade-AllNodes([string]$ImageRef, [bool]$HasImageOverride)` | PowerShell all-node upgrade | Same as Bash. | Explicit image ref + boolean, or nullable override string. | Prefer explicit boolean for readability. |
| `resolve_upgrade_image_ref_for_node(node, override?)` | Node upgrade target | Return target image ref for one node. | Node name + optional override. | Can be private helper in runtime files. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Upgrade function | Yes | Yes | Low | Include explicit override marker rather than overloading default image ref. |
| Per-node resolver | Yes | Yes | Low | Accept node name and optional override only. |
| `start_node` / `Start-Node` | Yes | Yes | Low | Keep as resolved-image lifecycle function. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Upgrade fan-out | `upgrade_all_nodes` / `Upgrade-AllNodes` | Yes | Low | Keep. |
| Per-node target resolver | `upgrade_image_ref_for_node` / `Get-UpgradeImageRefForNode` | Yes | Low | Use a name that includes upgrade + image ref + node. |
| Explicit override flag | `image_ref_override_explicit` / `$imageRefOverrideExplicit` | Yes | Low | Avoid vague names like `custom`. |

## Applied Patterns (If Any)

- State-backed resolver: local function inside the upgrade owner that resolves a node's target image from explicit override or persisted state.
- Command parser intent flag: simple parse-state flag that distinguishes user intent from default values.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | File | Bash parser | Track explicit image/tag override. | Parser already owns option semantics. | Node state lookup loop. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | File | Bash Docker runtime | Per-node image target resolution and upgrade fan-out. | Runtime already owns managed-node enumeration and start/recreate. | CLI arg parsing. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | File | Bash core/help | Help text update. | Current help text lives here. | Upgrade fan-out logic. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | File | PowerShell parser | Track explicit image/tag override. | Mirrors Bash parser. | Node loop policy. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | File | PowerShell Docker runtime | Per-node image target resolution and upgrade fan-out. | Mirrors Bash runtime. | CLI arg parsing. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | File | PowerShell core/help | Help text update. | Current help text lives here. | Upgrade fan-out logic. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | File | Launcher test suite | Regression tests for preserve-current-image default and explicit retarget. | Existing fake-Docker launcher tests. | Live Docker dependency. |
| `README.md` | File | Public docs | Root docs update. | Current user guide. | Implementation details beyond command behavior. |
| `autobyteus-server-ts/docker/README.md` | File | Server Docker docs | Server Docker docs update. | Current Docker guide. | Duplicated deep implementation details. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash` | Main-Line Domain-Control for Bash CLI/Docker lifecycle | Yes | Low | Existing split between parser/core/runtime is sufficient. |
| `scripts/public/docker/autobyteus-docker.d/powershell` | Main-Line Domain-Control for PowerShell CLI/Docker lifecycle | Yes | Low | Mirrors Bash structure. |
| `scripts/tests` | Test coverage | Yes | Low | Existing launcher tests are located here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Default mixed fleet upgrade | `server-0 IMAGE_REF=...:latest` -> upgrade with `...:latest`; `server-3 IMAGE_REF=...:latest-zh` -> upgrade with `...:latest-zh` | Plain `upgrade --all` computes `...:latest` once and applies it to all nodes | Shows exact zh preservation behavior. |
| Explicit retarget | `upgrade --all --tag latest-zh` applies `...:latest-zh` to every node | Removing retarget capability entirely | Keeps power-user conversion possible but explicit. |
| Ownership split | Parser marks override intent; upgrade fan-out resolves per-node image; start-node pulls/recreates | `start_node` reads CLI args or guesses mode | Prevents mixing command intent with Docker lifecycle mechanics. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old plain `upgrade --all` retarget-to-default behavior | It is the current behavior. | Rejected | Plain upgrade preserves per-node image refs; explicit `--tag latest` is the clean retarget path. |
| Add new safer command while leaving old unsafe upgrade unchanged | Could avoid changing existing behavior. | Rejected | Existing command is dangerous and contrary to user expectation; make default safe. |
| Add `--preserve-image` flag | Could make safe behavior opt-in. | Rejected | Safety should be the default; explicit image/tag options already express retarget. |

## Derived Layering (If Useful)

- User command layer: Bash/PowerShell command parser.
- Upgrade orchestration layer: platform runtime upgrade fan-out.
- Docker lifecycle layer: existing start/recreate functions.
- State/doc/test support: existing state IO, docs, and fake-Docker tests.

## Migration / Refactor Sequence

1. Update Bash parser to track whether `--image` or `--tag` was explicitly supplied.
2. Update Bash `upgrade_all_nodes` signature and implementation to resolve target per node when no override is explicit.
3. Update PowerShell parser and `Upgrade-AllNodes` with the same semantics.
4. Update help text in Bash and PowerShell core files.
5. Add fake-Docker tests for default preserve-current-image upgrade.
6. Add fake-Docker tests for explicit `--tag` and/or `--image` retarget.
7. Update root and server Docker README upgrade sections.
8. Run targeted launcher tests; if full module is run, record any pre-existing Python/port environment caveats separately.

## Key Tradeoffs

- Preserve-current-image default is safer and matches user intent, but users who expected `upgrade --all` to convert all nodes to default `latest` must now be explicit (`--tag latest`). This is acceptable because implicit conversion is risky.
- Keeping explicit retarget semantics avoids adding a new conversion command or option.
- Per-node state fallback to default image avoids failing upgrades for malformed/legacy state but may still retarget such malformed nodes; this is unavoidable without a valid saved image ref.

## Risks

- PowerShell implementation could drift from Bash if not updated and checked together.
- Docs could remain ambiguous if only help text is updated.
- Full test module may fail in local Python 3.9/occupied-port environments; targeted tests must be clear enough to prove the behavior.

## Guidance For Implementation

- Prefer an explicit parser flag over trying to infer override intent from `image_ref == DEFAULT_IMAGE:DEFAULT_TAG`.
- Suggested Bash shape:
  - initialize `image_ref_override_explicit=0`
  - set it to `1` when parsing `--image` or `--tag`
  - compute `image_ref` as today
  - call `upgrade_all_nodes "$image_ref" "$image_ref_override_explicit"`
  - inside `upgrade_all_nodes`, for each node choose `target_image_ref="$image_ref"` only when override is explicit; otherwise load node state and use `${IMAGE_REF:-$(image_ref_for "$DEFAULT_IMAGE" "$DEFAULT_TAG")}`.
- Suggested PowerShell shape mirrors Bash with `$imageRefOverrideExplicit` and `Get-UpgradeImageRefForNode`.
- Ensure `start_node` / `Start-Node` remains the only owner of Docker pull/recreate/state-write mechanics.
- In tests, create one node with `--tag latest` and one with `--tag latest-zh`; assert state image refs after plain upgrade remain distinct and fake Docker calls include both image refs.
- Add explicit override tests that assert all state image refs become the override ref.
