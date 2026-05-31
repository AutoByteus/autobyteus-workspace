# Design Spec

## Current-State Read

- Current latest backend worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis` on `codex/backend-docker-browser-base-analysis`, based on `origin/personal` at `2f545609`.
- Current backend launch surfaces:
  - public Bash launcher: `scripts/public/docker/autobyteus-docker.sh`;
  - public PowerShell launcher: `scripts/public/docker/autobyteus-docker.ps1`;
  - source helper compose: `autobyteus-server-ts/docker/docker-compose.yml`;
  - personal all-in-one compose: `docker/compose.personal-test.yml`;
  - Docker docs: root/server/personal Docker READMEs.
- Browser Docker `1.3.6` owns Chromium startup, profile directory permission preparation, and stale-lock cleanup. Backend owns only downstream volume mounting and image rebuild/release coordination.
- Latest backend `origin/personal` already removed active `mobile-safe`, `AUTOBYTEUS_NODE_PROFILE`, profile labels, and backend-owned Chromium launcher branches.
- Code-review re-entry evidence: round 1 failed with `CR-001` because the implementation changed `scripts/public/docker/autobyteus-docker.sh` (`801` effective non-empty lines) and `scripts/public/docker/autobyteus-docker.ps1` (`797` effective non-empty lines). The files were oversized before this task, but Stage 8 applies the hard limit to changed source implementation files.

## Intended Change

Add a persistent Chromium profile volume at `/home/vncuser/.config/chromium` to all backend Docker launch surfaces that run the Chrome/VNC server image, while preserving public launcher Bash/PowerShell parity and config-hash driven recreation.

The revised design also changes the public launcher source distribution: the monolithic Bash and PowerShell launchers become thin public entry/loaders plus platform modules. This preserves the one-public-entry-URL no-clone install/curl-pipe contract, but keeps every changed source implementation file at or below `500` effective non-empty lines.

## Non-Goals

- No backend-owned Chromium command wrapper, `--no-sandbox` policy, lock cleanup, or supervisor changes.
- No migration of Chromium state that exists only in old container writable layers.
- No generated, compressed, base64-encoded, or otherwise hidden monolithic launcher payload checked into the repository as a source-size workaround.
- No change to the user-visible public launcher CLI commands or compose service names except the new persistence/storage contract.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / dependency-contract alignment plus public launcher structural refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant for Chromium profile persistence; File Placement Or Responsibility Drift for monolithic public launcher files.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to public launcher source distribution. Compose/docs/test changes remain local extensions.
- Evidence: Browser Docker `1.3.6` documents downstream `/home/vncuser/.config/chromium` mounts; latest backend launchers/compose files omitted that mount. Code review measured changed public launcher source files above the hard `500`-line gate, so the initial local-patch design is not review-compliant.
- Design response: Split public launchers into thin entry/loader files and platform modules, then place the Chromium volume/hash/storage changes in the Docker runtime/state modules. Keep the same user-facing CLI and one-entry URL install/temporary execution behavior.
- Refactor rationale: The existing public launcher ownership boundary is still valid, but the file-level distribution is unhealthy for changed source. Splitting by concrete launcher concerns fixes file responsibility drift without creating a new product subsystem.
- Intentional deferrals and residual risk: Automatic migration from old container-layer Chromium profile data remains out of scope. Users may need to sign in again after the new empty profile volume is attached.

## Terminology

- `Chromium profile volume`: Docker-managed named volume mounted at `/home/vncuser/.config/chromium`.
- `Managed Docker node`: Public launcher-created container identified by launcher labels and state file.
- `Public launcher entry`: Small user-facing Bash or PowerShell file loaded from the public raw URL and installed as the CLI entrypoint.
- `Platform launcher modules`: Bash/PowerShell source files loaded by the public entry; they own state, Docker runtime, and command behavior.
- `No-clone public contract`: Users can install/run from the documented public URL without cloning this repository or manually fetching support files.
- `Source helper`: `autobyteus-server-ts/docker/docker-compose.yml` and `docker-start.sh` local-development path.
- `Personal all-in-one`: `docker/compose.personal-test.yml` local multi-service stack.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not reintroduce `mobile-safe`, `AUTOBYTEUS_NODE_PROFILE`, profile labels, or `--profile` compatibility handling.
- Existing old launcher state is handled by the current normalizer; this change advances to `v6` and attaches the new volume.
- No migration shim should copy old container-layer Chromium data into the new volume.
- The launcher split is not a compatibility wrapper. It is a source-ownership refactor; the old monolithic source responsibility is decommissioned.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User runs public `autobyteus-docker new-container` / `upgrade --all` / `workspace apply --all` | Managed server container runs with persistent Chromium profile volume | Public Docker launcher modules | Main user path and most important volume contract. |
| DS-002 | Primary End-to-End | Developer runs source helper compose | Server compose container runs with Chromium profile volume | Source helper compose | Local/source-checkout server path must match base-image contract. |
| DS-003 | Primary End-to-End | Developer runs personal all-in-one compose | All-in-one container runs with Chromium profile volume | Personal compose stack | All-in-one uses Chrome/VNC base and must persist browser profile. |
| DS-004 | Bounded Local | Launcher computes desired config hash | Existing managed container gets recreated when volume contract changes | Public Docker launcher config reconciliation | Ensures old managed containers attach the new mount. |
| DS-005 | Primary End-to-End | User invokes public launcher entry from curl-pipe/`irm \| iex` or installed CLI | Correct platform modules are loaded and command execution reaches DS-001 | Public launcher distribution | Preserves the no-clone public contract after source split. |

## Primary Execution Spine(s)

- DS-001: `User command -> Public launcher entry -> Platform modules -> Config/state resolution -> Docker run args -> Chrome/VNC base entrypoint -> Persistent Chromium profile volume`
- DS-002: `docker compose up -> Source helper compose volume declaration -> Server runtime -> Chrome/VNC base entrypoint -> Persistent Chromium profile volume`
- DS-003: `personal-docker up -> Personal compose volume declaration -> All-in-one runtime -> Chrome/VNC base entrypoint -> Persistent Chromium profile volume`
- DS-005: `Public raw entry or installed shim -> Module resolver -> Local installed modules or remote temporary modules -> Platform command dispatcher -> DS-001 command path`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The public launcher decides the desired container shape, computes a config hash, and creates/recreates the container with all required volumes, including the Chromium profile volume. Browser Docker base then owns directory permissions and lock cleanup at startup. | Launcher entry, platform modules, config hash, run args, server container, browser base entrypoint | Public Docker launcher modules | Bash/PowerShell parity, state file persistence, storage display, tests. |
| DS-002 | Source-helper compose declares the server container volume set; Docker attaches the named Chromium profile volume before the browser base entrypoint starts. | Compose service, named volumes, server container, browser base entrypoint | Server source compose | Compose validation, docs. |
| DS-003 | Personal compose declares the all-in-one container volume set; Docker attaches the named Chromium profile volume before Chrome starts. | Compose service, named volumes, all-in-one container, browser base entrypoint | Personal all-in-one compose | Compose validation, docs. |
| DS-004 | Adding the Chromium profile volume changes the hash input and version, causing existing managed containers to be recreated through existing reconciliation instead of silently keeping the old mount set. | Hash input, state file, container labels, recreate path | Public Docker launcher config module | Old state normalization, no profile compatibility reintroduction. |
| DS-005 | The small public entry loads platform modules from adjacent installed files in installed/local-checkout mode, or from the public raw module base in curl-pipe/`irm \| iex` mode, then delegates to the unchanged command surface. | Public entry, module resolver, local/remote module source, command dispatcher | Public launcher distribution | URL/base override, install writes modules, fail-fast diagnostics. |

## Spine Actors / Main-Line Nodes

- Public Docker launcher entry files
- Public Docker launcher platform modules
- Public Docker launcher config/hash owner
- Docker run argument builder
- Docker compose service definitions
- Chrome/VNC base image entrypoint
- Persistent Chromium profile volume

## Ownership Map

| Actor / Node | Owns |
| --- | --- |
| Public launcher entry files | Public URL entrypoint, help handoff/bootstrap, module resolution, install entry-to-module distribution, final call into platform command dispatcher. |
| Public launcher platform modules | Managed-node state, volume naming, config hash, container creation/recreation, storage output, Bash/PowerShell CLI behavior. |
| Source helper compose | Local source-checkout server service volumes. |
| Personal all-in-one compose | Local all-in-one service volumes. |
| Browser Docker base image | Chromium process startup, profile directory ownership/permissions, stale profile lock cleanup. |
| Long-lived docs | User-facing persistence, direct-run command truth, and no-clone launcher usage truth. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Bash platform launcher modules | Stable public Bash URL and installed CLI entry. | Docker run policy beyond bootstrap/module loading. |
| `scripts/public/docker/autobyteus-docker.ps1` | PowerShell platform launcher modules | Stable public PowerShell URL and installed CLI entry. | Docker run policy beyond bootstrap/module loading. |
| Settings Docker Guide command catalog | Public Docker launcher | Displays install/direct commands from the launcher contract. | Container volume policy. |
| `docker-start.sh` source helper | `autobyteus-server-ts/docker/docker-compose.yml` | User-friendly local helper around compose. | Browser base internals. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Monolithic source responsibility of `autobyteus-docker.sh` | Changed monolith exceeds Stage 8 hard limit and mixes entry, install, state, Docker runtime, output, and command dispatch. | Thin Bash entry plus Bash modules under `scripts/public/docker/autobyteus-docker.d/bash/`. | In This Change | The public path remains; its responsibility narrows. |
| Monolithic source responsibility of `autobyteus-docker.ps1` | Same hard-limit and mixed-responsibility issue for PowerShell. | Thin PowerShell entry plus modules under `scripts/public/docker/autobyteus-docker.d/powershell/`. | In This Change | The public path remains; its responsibility narrows. |
| Active old profile/mobile-safe launcher behavior | Already removed on `origin/personal`; must stay removed. | Browser Docker base plus Chromium profile volume. | In This Change | Static scan must remain clean. |

## Return Or Event Spine(s) (If Applicable)

N/A. The relevant behavior is container creation/recreation and module loading rather than application events.

## Bounded Local / Internal Spines (If Applicable)

- DS-004 bounded local spine inside public launcher config module: `Desired config text -> SHA-256 hash -> compare container label/state -> recreate if changed -> write state`.
- DS-005 bounded local detail inside public entry: `Determine execution mode -> resolve module base -> load modules -> dispatch command -> cleanup temporary modules`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Bash/PowerShell parity tests | DS-001, DS-005 | Public Docker launcher | Prove both public launchers expose equivalent run shape after source split. | Cross-platform launcher contract. | Divergent Windows/macOS behavior. |
| Public module resolution | DS-005 | Public launcher distribution | Load local installed modules or remote modules transparently. | Preserves no-clone contract with reviewable source files. | Users get a broken curl-pipe/install path. |
| Source-size guard | DS-005 | Public launcher distribution | Assert every changed launcher source file is `<=500` effective non-empty lines. | Prevents repeat Stage 8 failure. | Reintroduces monoliths through future patches. |
| Storage output | DS-001 | Public Docker launcher | Show private named volumes and host bind mounts. | User/operator discoverability. | Hidden state that users accidentally delete or misunderstand. |
| Compose validation | DS-002, DS-003 | Compose owners | Confirm volume declarations are valid. | Avoid runtime compose syntax errors. | Broken local stacks. |
| Docs sync | DS-001, DS-002, DS-003, DS-005 | Documentation owner | Update direct-run, persistence, and public launcher usage guidance. | Prevent stale operator commands. | Users run containers without required volume or cannot install launcher. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Public managed-node volume wiring | Public Docker launcher | Extend | It already owns Docker run args, state, hash, and storage output. | N/A |
| Public launcher source distribution | Public Docker launcher | Extend with module grouping | The launcher remains the owner; this is not a separate product subsystem. | N/A |
| Source-helper local volumes | Server Docker compose | Extend | Existing compose file owns source-helper service volume set. | N/A |
| All-in-one local volumes | Personal compose stack | Extend | Existing compose file owns all-in-one volume set. | N/A |
| Browser startup/lock cleanup | Browser Docker base repo | Reuse | Already implemented in browser Docker `1.3.6`; backend only supplies mount. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker launcher distribution | Entry files, module resolution, install of entry+modules, source-size compliance | DS-005 | Public launcher | Extend | New module grouping under existing path. |
| Public Docker launcher runtime | Run args, state, config hash, managed-node storage output, command dispatch | DS-001, DS-004 | Public launcher | Extend | Add profile volume and v6 hash inside modules. |
| Server Docker source helper | Compose service volume declaration | DS-002 | Source helper compose | Extend | Add named volume. |
| Personal Docker stack | All-in-one service volume declaration | DS-003 | Personal compose | Extend | Add named volume. |
| Documentation | Persistence/direct-run/user launcher guidance | DS-001, DS-002, DS-003, DS-005 | Operators/users | Extend | Keep in sync with launch surfaces and module distribution. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public Docker launcher distribution | Bash entry | Load Bash modules, install entry+modules, dispatch to `main` | Stable public Bash URL must remain. | Module list constants. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Public Docker launcher runtime | Bash core module | Constants, help, logging, paths, normalization, install URL/base helpers | Shared Bash primitives for other Bash modules. | N/A |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Public Docker launcher runtime | Bash Docker module | Docker state inspection, port selection, config hash, run args, Chromium profile volume | Owns Docker lifecycle and new volume/hash behavior. | Core helpers. |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Public Docker launcher runtime | Bash command module | User command orchestration, output commands, command parser | Keeps entry thin and Docker details out of dispatch. | Core/runtime helpers. |
| `scripts/public/docker/autobyteus-docker.ps1` | Public Docker launcher distribution | PowerShell entry | Load PowerShell modules, install entry+modules, define public command entry | Stable public PowerShell URL must remain. | Module list constants. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Public Docker launcher runtime | PowerShell core module | Constants, help, logging, paths, normalization, install URL/base helpers | Shared PowerShell primitives. | N/A |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | Public Docker launcher runtime | PowerShell Docker module | Docker state inspection, port selection, config hash, run args, Chromium profile volume | Owns Docker lifecycle and new volume/hash behavior. | Core helpers. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | Public Docker launcher runtime | PowerShell command module | User command orchestration and parser | Keeps entry thin and Docker details out of dispatch. | Core/runtime helpers. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Durable validation | Launcher tests | Assert new volume/hash/storage, module distribution, line-size guard, parity | Existing launcher test owner. | N/A |
| `autobyteus-server-ts/docker/docker-compose.yml` | Server Docker source helper | Compose service | Add source helper named volume | Existing compose owner. | N/A |
| `docker/compose.personal-test.yml` | Personal Docker stack | Compose service | Add all-in-one named volume | Existing compose owner. | N/A |
| `README.md` | Root docs | Product overview Docker docs | Mention Chromium profile persistence | Existing no-clone Docker docs. | N/A |
| `autobyteus-server-ts/docker/README.md` | Server Docker docs | Docker usage docs | Direct-run and storage docs | Existing detailed Docker doc. | N/A |
| `docker/README.md` | Personal Docker docs | Personal Docker usage docs | Mention all-in-one Chromium profile persistence | Existing personal Docker doc. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Module list per platform | Entry file constants | Public launcher distribution | The entry is the only owner that needs load order. | Yes | Yes | A separate manifest format requiring extra parser dependencies. |
| Chromium profile volume name pattern | Docker runtime module per platform | Public launcher runtime | The pattern belongs with run args/hash/storage. | Yes | Yes | A cross-language abstraction layer for one volume string. |
| Public source base URL | Entry/core module constants with env override | Public launcher distribution | Needed for install and remote temporary module load. | Yes | Yes | Branch-specific hardcoding scattered across modules. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Launcher config hash text | Yes | Yes | Low | Add `chromium_profile_volume` and `chromium_profile_target` once; bump version. |
| Launcher state file | Yes | Yes | Low | Do not add a new persisted field unless required; volume can be derived from node name. |
| Launcher module source base | Yes | Yes | Medium | Keep one base constant/env override per platform entry; modules do not independently guess URLs. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public launcher distribution | Bash entry facade | Resolve/load Bash modules, install entry+modules, invoke `main`; `<=500` effective lines | Stable public path and curl-pipe entry. | Module list/source base. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Public launcher runtime | Bash core | Constants, help, logging, path/state-root helpers, normalization, hash helper | Shared Bash primitives. | N/A |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Public launcher runtime | Bash Docker runtime | Managed container discovery, ports, config hash `v6`, run args including Chromium profile volume | Concrete Docker lifecycle owner. | Core helpers. |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Public launcher runtime | Bash commands | High-level commands, storage/URL/status/log output, command parser | Concrete CLI orchestration owner. | Core/runtime helpers. |
| `scripts/public/docker/autobyteus-docker.ps1` | Public launcher distribution | PowerShell entry facade | Resolve/load PowerShell modules, install entry+modules, define/invoke `autobyteus-docker`; `<=500` effective lines | Stable public path and `irm \| iex` entry. | Module list/source base. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Public launcher runtime | PowerShell core | Constants, help, logging, path/state-root helpers, normalization, hash helper | Shared PowerShell primitives. | N/A |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | Public launcher runtime | PowerShell Docker runtime | Managed container discovery, ports, config hash `v6`, run args including Chromium profile volume | Concrete Docker lifecycle owner. | Core helpers. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | Public launcher runtime | PowerShell commands | High-level commands, storage/URL/status/log output, command parser | Concrete CLI orchestration owner. | Core/runtime helpers. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Durable validation | Launcher contract tests | Assertions for volume, hash, storage, parity, stale recreation, module loading, source-size guard | Existing test owner. | N/A |
| `autobyteus-server-ts/docker/docker-compose.yml` | Server Docker source helper | Compose | Named volume mount/declaration | Existing compose owner. | N/A |
| `docker/compose.personal-test.yml` | Personal Docker stack | Compose | Named volume mount/declaration | Existing all-in-one compose owner. | N/A |
| `README.md` | Docs | Root Docker quick start | Public launcher persistence note | Existing docs owner. | N/A |
| `autobyteus-server-ts/docker/README.md` | Docs | Server Docker guide | Direct-run/storage details | Existing Docker doc. | N/A |
| `docker/README.md` | Docs | Personal Docker guide | All-in-one persistence note | Existing Docker doc. | N/A |

## Ownership Boundaries

Backend must not own Chromium startup commands. The browser base image owns `/entrypoint.sh`, Chromium process configuration, permissions, and stale lock cleanup. Backend launchers and compose files only own whether the required persistent directory is mounted and how the volume is named.

The public launcher entry files are now thin facades. They own distribution mechanics, not Docker lifecycle policy. Docker lifecycle policy belongs in the platform runtime modules.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Browser Docker base image | Chromium command, profile permission setup, lock cleanup | Backend Docker runtime images | Backend adding its own Chromium wrapper or lock cleanup script | Update `browser_docker`, then rebuild server image. |
| Public Docker launcher modules | Managed-node volume names, hash, run args | Entry files/docs/users | Entry files duplicating run-arg/hash policy after the split | Move policy into runtime modules and expose a command dispatcher. |
| Public launcher entry | Module resolution and install of entry+modules | Curl-pipe/`irm \| iex` users and installed shims | Users/docs requiring manual module downloads or repo clone | Strengthen entry install/load logic. |

## Dependency Rules

- Backend Dockerfiles may depend on `autobyteus/chrome-vnc` tags through existing build args.
- Backend launch surfaces may mount `/home/vncuser/.config/chromium` but must not edit base `/entrypoint.sh` or base supervisor config.
- Public Bash and PowerShell launchers must remain equivalent.
- Public launcher entries may source/dot-source platform modules; modules must not source entry files.
- Modules may depend on earlier modules in declared load order only: core -> Docker runtime -> commands.
- Tests may assert launcher-generated Docker args and module distribution behavior; they should not require a live browser process.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-docker new-container` | Managed Docker node | Creates a server container with required volumes | Friendly node name derived internally | Adds derived Chromium profile volume. |
| `autobyteus-docker upgrade --all` | All managed Docker nodes | Reconciles image/config and recreates as needed | Existing managed state files | v6 hash triggers volume attachment. |
| `autobyteus-docker install` | Public launcher installation | Installs entry plus platform modules locally | Install directory and public source base | Must preserve one-command no-clone install. |
| Bash curl-pipe temporary execution | Public launcher temporary command | Loads modules and runs command without installation | Public entry URL and module base URL | Must not require repo checkout. |
| PowerShell `irm \| iex` temporary execution | Public launcher temporary command | Loads modules and defines/runs public function | Public entry URL and module base URL | Must not require repo checkout. |
| `docker compose` source helper | Source-helper service | Creates server service volumes | Compose project volume names | Add compose-named profile volume. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Public launcher volume naming | Yes | Yes | Low | Use `<normalized-node>-chromium-profile`. |
| Public launcher module resolution | Yes | Yes | Medium | Use explicit module list and one source-base override; fail fast when modules cannot load. |
| Source compose volume naming | Yes | Yes | Low | Use `autobyteus-server-chromium-profile`. |
| All-in-one compose volume naming | Yes | Yes | Low | Use `main-allinone-chromium-profile`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Chromium profile volume | `<node>-chromium-profile` | Yes | Low | Use same phrase in docs/storage/tests. |
| Config hash version | `v6` | Yes | Low | Update both launchers/tests. |
| Bash module directory | `autobyteus-docker.d/bash` | Yes | Low | Makes support files adjacent to stable public entry. |
| PowerShell module directory | `autobyteus-docker.d/powershell` | Yes | Low | Mirrors Bash structure. |

## Applied Patterns (If Any)

- Config-hash reconciliation pattern inside public launcher runtime module: existing pattern; extend hash input and version to force one-time recreation.
- Thin entry facade pattern: public entry files remain stable URL/install surfaces while concrete launcher behavior lives in reviewable modules.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | File | Bash public entry | Load/install Bash modules and invoke command dispatcher | Stable public Bash URL | Docker run/hash policy beyond dispatch. |
| `scripts/public/docker/autobyteus-docker.ps1` | File | PowerShell public entry | Load/install PowerShell modules and invoke command dispatcher | Stable public PowerShell URL | Docker run/hash policy beyond dispatch. |
| `scripts/public/docker/autobyteus-docker.d/bash/` | Folder | Bash launcher modules | Reviewable Bash implementation modules | Adjacent to public Bash entry | PowerShell code; generated payloads. |
| `scripts/public/docker/autobyteus-docker.d/powershell/` | Folder | PowerShell launcher modules | Reviewable PowerShell implementation modules | Adjacent to public PowerShell entry | Bash code; generated payloads. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | File | Launcher validation | Test run args/storage/hash/parity/modules/line sizes | Existing launcher tests | Live browser E2E. |
| `autobyteus-server-ts/docker/docker-compose.yml` | File | Source-helper compose | Add named Chromium profile volume | Existing server compose | Public launcher state. |
| `docker/compose.personal-test.yml` | File | Personal all-in-one compose | Add named Chromium profile volume | Existing all-in-one compose | Source-helper volumes. |
| `README.md` | File | Root docs | Summarize public launcher persistence | Existing product docs | Detailed base internals. |
| `autobyteus-server-ts/docker/README.md` | File | Server Docker docs | Direct-run/storage details | Existing Docker doc | Stale profile/mobile-safe guidance. |
| `docker/README.md` | File | Personal Docker docs | All-in-one persistence details | Existing Docker doc | Public launcher internals. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker/` | Off-Spine Concern | Yes | Low | Public Docker launcher and related platform modules. |
| `scripts/public/docker/autobyteus-docker.d/bash/` | Off-Spine Concern | Yes | Low | Bash-specific module grouping. Three-module split is enough to keep files reviewable without artificial fragmentation. |
| `scripts/public/docker/autobyteus-docker.d/powershell/` | Off-Spine Concern | Yes | Low | PowerShell-specific module grouping mirroring Bash. |
| `autobyteus-server-ts/docker/` | Off-Spine Concern | Yes | Low | Server Docker source helper and docs. |
| `docker/` | Off-Spine Concern | Yes | Low | Personal all-in-one local stack. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Public launcher run arg | `-v "${volume_prefix}-chromium-profile:/home/vncuser/.config/chromium"` | `--mount type=bind,source=$HOME/.config/chromium,...` | Keeps browser profile private and node-scoped. |
| Bash module load | Entry sources `core.sh`, then `docker-runtime.sh`, then `commands.sh`; command dispatcher calls `main "$@"`. | Entry contains 800 lines of implementation or downloads a hidden base64 payload. | Keeps stable public URL while satisfying source review. |
| PowerShell module load | Entry dot-sources `Core.ps1`, `DockerRuntime.ps1`, then `Commands.ps1`; `autobyteus-docker` delegates to `Invoke-AutoByteusDocker`. | `irm \| iex` requires the user to manually fetch module URLs. | Preserves no-clone temporary execution. |
| Source-size validation | `rg -n "\\S" scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh \| wc -l` returns `<=500`. | Recording only the tiny diff while leaving changed files above `500`. | Directly addresses `CR-001`. |

## Backward-Compatibility Rejection Log (Mandatory)

| Compatibility / Legacy Pressure | Decision | Reason | Replacement / Clean-Cut Path |
| --- | --- | --- | --- |
| Keep `mobile-safe` / `AUTOBYTEUS_NODE_PROFILE` branch | Reject | Active backend removed it; browser base owns Chrome startup. | No backend profile policy. |
| Preserve old container-layer Chromium profile data | Reject | Would require brittle migration from deleted/recreated container writable layers. | New named profile volume; users may reauthenticate. |
| Keep editing monolithic launcher files with a reviewer exception | Reject | Stage 8 hard gate has no implementation-only exception. | Split public launcher source into entry + modules. |
| Hide launcher code in encoded/generated payload to pass line count | Reject | Violates maintainability and reviewability. | Reviewable module files under the public launcher folder. |

## Derived Layering (If Useful)

- Public entry layer: Bash/PowerShell stable URL and install/load mechanics.
- Public launcher runtime layer: platform modules that own state, Docker lifecycle, command behavior, and storage output.
- Container launch layer: Docker run/compose attach named volumes.
- Browser base layer: Chrome/VNC process startup, directory permissions, lock cleanup.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. **Rework public launcher source shape first**
   - Create `scripts/public/docker/autobyteus-docker.d/bash/` and `scripts/public/docker/autobyteus-docker.d/powershell/`.
   - Move existing Bash/PowerShell implementation responsibilities into core/runtime/commands modules with each changed source file `<=500` effective non-empty lines.
   - Leave root `autobyteus-docker.sh` and `autobyteus-docker.ps1` as thin entry/load/install facades.
2. **Preserve public distribution contract**
   - Local checkout/installed mode: entries load adjacent modules.
   - Curl-pipe/`irm \| iex` mode: entries fetch modules from the public source base into a temporary load context or evaluate them, then dispatch.
   - `install` downloads/writes the entry and all platform modules to the install directory/module directory.
   - Add an environment override for module source base so tests/dev branches can avoid hardcoded production URLs when needed.
3. **Apply Chromium profile volume behavior inside runtime modules**
   - Set `CHROMIUM_PROFILE_CONTAINER_PATH` / `$Script:ChromiumProfileContainerPath` to `/home/vncuser/.config/chromium`.
   - Add `<node>-chromium-profile:<target>` to Docker run args.
   - Add `chromium_profile_volume` and `chromium_profile_target` to hash input and bump config hash version from `v5` to `v6`.
   - Add storage output row.
4. **Apply compose/docs/test updates**
   - Add source helper and personal all-in-one named volumes.
   - Update direct-run docs and persistence docs.
   - Update tests to read entry+module source for parity/static scans, run Bash launcher through the split local modules, assert source-size guard, and keep compose config checks.
5. **Measure and record review guard evidence before handoff**
   - `rg -n "\\S" <each changed public launcher source file> | wc -l` must be `<=500`.
   - `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py`.
   - `bash -n scripts/public/docker/autobyteus-docker.sh` and optionally syntax-check Bash modules.
   - PowerShell parse check when `pwsh` is available.
   - Compose config checks for both compose files.
   - `git diff --check`.

## Key Tradeoffs

- **Multi-file public launcher vs monolithic script**: Multi-file source adds module loading/install mechanics, but it is the only maintainable path that preserves no-clone usage while satisfying changed-source review gates.
- **Remote module fetch in temporary mode vs installed local modules**: Temporary curl-pipe/`irm \| iex` mode needs network beyond the entry fetch; installed mode writes modules locally to avoid network during normal use.
- **Runtime module split vs over-fragmentation**: Three modules per platform are enough to separate core helpers, Docker lifecycle, and command dispatch while avoiding many tiny files.
- **No profile migration**: avoids risky copy heuristics from old container layers, but users may need browser reauthentication.

## Risks

- Module URL/base mismatch could break curl-pipe temporary execution. Mitigation: one source-base constant/env override in entry, install entry+modules from the same base, and fail-fast diagnostics.
- PowerShell runtime validation may be unavailable on macOS (`pwsh` missing). Mitigation: keep static parity and parser check when available; API/E2E can validate on a PowerShell-capable host if needed.
- Published `autobyteus/autobyteus-server` image still needs rebuild/release after merge to inherit browser Docker `1.3.6` lock cleanup.
- Existing Chromium profile state in old container writable layers is not migrated.

## Guidance For Implementation

- Do not reapply the initial local patch to oversized `autobyteus-docker.sh` / `.ps1` files. Split first, then implement the Chromium volume behavior in the appropriate runtime modules.
- Keep every changed public launcher source implementation file at or below `500` effective non-empty lines. Add a durable test/guard so this is measured before code review.
- Preserve these user-facing commands exactly in docs/help:
  - `curl -fsSL <script-url> | bash -s -- install`
  - `curl -fsSL <script-url> | bash -s -- <command> [options]`
  - `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker install"`
  - `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker <command> [options]"`
  - installed `autobyteus-docker <command> [options]`
- Entry files must prefer adjacent local modules when available and use remote module fetch only when running from streamed/evaluated public entry or when explicitly configured.
- Do not add backend Chromium wrappers, `AUTOBYTEUS_NODE_PROFILE`, `mobile-safe`, profile labels, or migration shims.
- Keep the profile volume as a Docker-managed named volume, not a host bind mount.
- Update tests to concatenate/read all launcher entry+module files for Bash/PowerShell parity assertions; after the split, parity strings may no longer all live in the root entry files.
