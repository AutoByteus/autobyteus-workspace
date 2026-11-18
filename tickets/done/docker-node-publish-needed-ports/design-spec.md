# Design Spec — S0: Docker nodes publish only the ports they need

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001 (the user's approval of autobyteus-394 REQ-012/REQ-018/AC-015 at its SR-004; details within the direction).
- Behavior-defining supplements: none.
- User approval of the design: `Not required` for S0 (the user approved the plan and asked to start with S0; the parent design already fixed S0's shape).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (AF-01 … AF-08).
- Authorities read (2026-11-06): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md`, `GLOSSARY.md`.
- Conflicts / discrepancies: the earlier ticket `server-docker-desktop-only-analysis` preserved "unqualified host port publishing" (its REQ-005); this ticket changes that for 5900/6080/9223 with the user's approval. The backend stays unqualified.

## Current-State Read

Each launcher has one place that builds the `docker run` arguments and the config-hash text (bash `container-config.sh`, PowerShell `ContainerConfig.ps1`), one port allocator (`choose_ports_for_node` / `Select-Ports`), one state reader/writer and one URL printer. `start_node` / its PowerShell twin reuses a container only if its image and config hash match; otherwise it recreates it with the saved ports and the named volumes (AF-02, AF-04). Four host ports are allocated, stored and published on all interfaces today. The structure is healthy; the change is a value change in each of these places.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` — two launcher implementations (run args, hash text, port allocation, state, output, help), the compose file, `.env.example`, `docker-start.sh`, one test file, docs and one in-app string (en, zh-CN).
- Size rationale: no new owner, contract or component; the same files keep the same responsibilities.
- Architectural risk: `Low` — the loopback publishing shape existed before (`mobile-safe`); the recreate path is the existing config-hash mechanism; no server, client, API or persistence-format change (state files lose two keys, which readers already tolerate).
- Escalation trigger: anything in the product found to use 5900 or 9223 from outside the node, or the recreate losing the backend port.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision Supported |
| --- | --- | --- | --- |
| Launcher code | AF-01 … AF-04 | Single owners for args/hash/ports/state/output per launcher | Edit in place |
| Compose / dev script | AF-05 | Same four ports | Same rule |
| Tests | AF-07 | Old shape asserted | Rewrite expectations |
| Parent probe | parent investigation notes, Runtime findings | `127.0.0.1:` publishing + RFB handshake work on the current image | AC-006 method |

## Intended Change

Allocate and publish two host ports per node: the backend (unchanged) and the VNC Viewer port on `127.0.0.1` only. Stop allocating, storing, publishing and printing the VNC and Chrome debug ports. Bump the config-hash version so the user's next lifecycle command recreates each node with its saved ports and volumes.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-003. Areas: public launcher (bash, PowerShell), `autobyteus-server-ts/docker/{docker-compose.yml,.env.example,docker-start.sh}`, launcher tests, docs (`README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`), in-app Docker Guide string (en, zh-CN).
- Derived consumers: the config-hash text feeds the container label `com.autobyteus.configHash` and `start_node`'s reuse decision — decision: version `v8`, so every existing managed node is recreated once at its next lifecycle command. `collect_used_ports` / `Get-UsedPorts` read state files — decision: they keep reading whatever `*PORT` values exist (old files still reserve their numbers until rewritten).
- Deliberately left alone: `-e AUTOBYTEUS_VNC_SERVER_HOSTS` (today's viewer reads it; S1), `Dockerfile.monorepo` `EXPOSE` (S2, DEC-S0-4), the base image repository (S2), the viewer and server, the user's running nodes.
- Follow-ups: none new (parent FU-001, FU-002 already sent).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, 002; AC-001, 002, 006 | `new-container` | 4 ports, all interfaces | 2 ports; 6080 on loopback | DS-001 |
| BEH-002 | Operational | REQ-003; AC-003 | `start`/`upgrade`/`workspace apply`/`reset` | Recreate on hash change | Same, once, keeping backend + VNC Viewer ports | DS-001 |
| BEH-003 | Operational | REQ-004; AC-004 | compose / `docker-start.sh` | 4 ports | backend + loopback 6080 | DS-002 |
| BEH-004 | User | REQ-005, 006; AC-005 | output, help, Docker Guide, docs | old labels | new labels | — |
| BEH-005 | User | preserved | VNC Viewer | `localhost:<6080 port>` | unchanged | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship |
| --- | --- | --- |
| Parent `probes/rfb-forwarding-probe.mjs` | RFB handshake | Transport proof for AC-006 (`MODE=handshake WSF_PORT=<N>`; `VNC_PORT` unused there now) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (operational security hardening).
- Current design issue found: `No` structural issue; the published-port policy is the issue, and each launcher has one owner for it.
- Structural triggers: Legacy cleanup — fires: the VNC/debug port state, allocation and output become dead and are removed (no compatibility path). Several kinds or forms — fires: two launcher implementations plus compose/dev script; each is changed (parity table below). Persisted-data transition — fires for launcher state files: decided below. Others ruled out (no new boundary, no shared structure).
- Root cause classification: `No Design Issue Found` (policy change in existing owners).
- Refactor needed now: `No`.
- Evidence: AF-01 … AF-05.

## Terminology

- **VNC Viewer port:** the host port mapped to the node's 6080, used by the desktop app's VNC Viewer on the same computer. Code keeps the existing name `NOVNC_PORT` / `noVncPort` in S0 (S1 removes the port and the name together); output and docs say "VNC Viewer".

## Legacy Removal Policy (Mandatory)

- Removed: VNC and Chrome debug host ports everywhere in the launchers, compose, `.env.example`, `docker-start.sh`; their output lines and help text.
- Compatibility kept: `None`. Old state keys are not read; they disappear at the next write.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: launcher node state (`nodes/<node>.env`, `nodes/<node>.json`), one per node.
- Change: `VNC_PORT`/`DEBUG_PORT` (`vncPort`/`debugPort`) no longer written or read.
- Readers: bash `load_state` sources the file (extra variables are inert); PowerShell `ConvertFrom-Json` (extra properties are inert). Reuse test (`start_node`) checks only `BACKEND_PORT` and `NOVNC_PORT`.
- Decision: `Directly Usable — No Migration`. The next `write_state`/`Save-NodeState` writes the new shape.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002 | `autobyteus-docker <lifecycle>` | Running container + state + printed URLs | `start_node` (bash) / its PowerShell twin | The publishing path |
| DS-002 | Primary End-to-End | BEH-003 | `docker-start.sh up` / `docker compose up` | Running container | compose file | Repository path |

## Primary Execution Spine(s)

DS-001: `command dispatch (commands.sh) -> start_node -> load_state -> [reuse check: image + config hash] -> choose_ports_for_node (backend, VNC Viewer) -> desired_config_hash -> run_container (-p B:8000, -p 127.0.0.1:N:6080) -> verify_container_started -> write_state -> print_urls`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Owner |
| --- | --- | --- |
| DS-001 | A lifecycle command loads the node's state. If the container exists with the same image and the `v8` hash, it is reused or restarted. Otherwise (a `v7` node) it is recreated with the saved backend and VNC Viewer ports; missing ports are chosen with the friendly preferences 8001+i and 6080+i. The state is written with the two ports and the URLs are printed | `start_node` |
| DS-002 | `docker-start.sh` allocates backend and VNC Viewer ports into its env file; compose publishes them as above | compose |

## Spine Actors / Main-Line Nodes

`start_node`, `choose_ports_for_node`, `desired_config_hash`, `run_container`, `write_state`, `print_urls` (and PowerShell twins); compose file.

## Ownership Map

Unchanged: each function keeps its current responsibility.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `-p "${VNC_PORT}:5900"`, `-p "${DEBUG_PORT}:9223"` (bash `container-config.sh:42,44`; PS `ContainerConfig.ps1:59,61`) | User decision; nothing uses them | — | |
| `VNC_PORT`/`DEBUG_PORT` allocation, preferences 5908/9228, retry resets, reuse checks (`docker-runtime.sh:185-196,298,324,339,361`; PS `DockerRuntime.ps1:121,149-158,213-216`) | Dead once not published | — | |
| `vnc=`/`debug=` lines in the hash text (`container-config.sh:8-9`; PS `ContainerConfig.ps1:11,13`) | Dead | `v8` hash | |
| State keys (`core.sh:116,126-129`; PS `Core.ps1:138-140`, `New-NodeState`) | Dead | — | |
| `noVNC:`/`VNC:`/`Chrome debug:` output lines (`docker-runtime.sh:257-259`; PS `DockerRuntime.ps1:186-188`) | Wrong or dead | `VNC Viewer: localhost:<N> (this computer only)` | |
| compose 5900/9223 mappings, `.env.example` `AUTOBYTEUS_VNC_PORT`/`AUTOBYTEUS_CHROME_DEBUG_PORT`, `docker-start.sh` `vnc_port`/`debug_port` | Same | — | |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Port availability probe (`port_is_available` / `Test-PortAvailable`) | allocator | Unchanged; probes two ports instead of four |

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules

Unchanged; N/A for new boundaries.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `write_state file node container backend novnc image created hash` (bash) | Drops the `vnc` and `debug` positions; every caller updated |
| `New-NodeState` / `Save-NodeState` (PS) | Drop `vncPort`/`debugPort` |
| `autobyteus-docker urls` output | Backend, GraphQL, VNC Viewer (this computer only), workspace/shared/data lines as today |

## Interface Boundary Check / Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| 6080 host port | output "VNC Viewer"; variable `NOVNC_PORT` kept until S1 removes it | Avoid a rename that S1 deletes anyway |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Recreate existing nodes | config-hash mechanism | Reuse (bump version) |

## Subsystem / Capability-Area Allocation

Public launcher (both implementations) and server docker dev files; Extend.

## Draft / Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh` | hash text without vnc/debug; run args: `-p "${BACKEND_PORT}:8000"`, `-p "127.0.0.1:${NOVNC_PORT}:6080"` |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | allocate backend + VNC Viewer; reuse/retry checks on two ports; `write_state` calls; `print_urls` lines |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | `CONFIG_HASH_VERSION="v8"`; help line "Show Backend, GraphQL and VNC Viewer URLs …"; `load_state` reset list and `write_state` without vnc/debug |
| `scripts/public/docker/autobyteus-docker.d/powershell/ContainerConfig.ps1`, `DockerRuntime.ps1`, `Core.ps1` | same, for PowerShell |
| `autobyteus-server-ts/docker/docker-compose.yml` | ports: backend as today, `"127.0.0.1:${AUTOBYTEUS_WEB_VNC_PORT:-6080}:6080"` |
| `autobyteus-server-ts/docker/.env.example` | drop `AUTOBYTEUS_VNC_PORT`, `AUTOBYTEUS_CHROME_DEBUG_PORT`; comment "VNC Viewer port, this computer only" |
| `autobyteus-server-ts/docker/docker-start.sh` | allocate backend + VNC Viewer only; endpoint line "VNC Viewer: localhost:<port> (this computer only)" |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | new expectations (AC-001, AC-003, AC-005); a static check that the PowerShell files carry the same shape (AC-002) |
| `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | port lists, manual `docker run` example (backend + `127.0.0.1:6080:6080`), endpoints, "existing nodes change at next `start`/`upgrade`", no VNC app / `chrome://inspect` from outside |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts:391` | `urls` description: "Prints the Backend, GraphQL and VNC Viewer addresses …" |

## Reusable Owned Structures Check / Shared Structure Tightness Check

N/A — no shared structure.

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping / Folder Boundary Check

Existing files only (above).

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| bash run args | `-p "${BACKEND_PORT}:8000" -p "127.0.0.1:${NOVNC_PORT}:6080"` | keeping `-p "127.0.0.1:${VNC_PORT}:5900"` "for a VNC app" |
| `urls` output | `Backend: http://localhost:8001` / `GraphQL: http://localhost:8001/graphql` / `VNC Viewer: localhost:6080 (this computer only)` | `noVNC: http://localhost:6080` (no noVNC page is served there) |
| Recreate | node `autobyteus-server-0` keeps 8001 and 6080 | new random backend port after upgrade |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Flag to keep publishing 5900/9223 | Rejected (user: needed ports only) | — |
| Keep reading old `VNC_PORT`/`DEBUG_PORT` | Rejected | Dropped at next write |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. bash launcher (core → container-config → docker-runtime), 2. PowerShell twin, 3. compose, `.env.example`, `docker-start.sh`, 4. tests, 5. docs and in-app string, 6. isolated real node check (AC-006, AC-003).

## Key Tradeoffs

- Keeping `NOVNC_PORT` as the variable name for one slice avoids a rename that S1 deletes.

## Risks

- PowerShell not runnable on this Mac (static check only). Existing nodes keep the old publishing until the user's next lifecycle command (by design).

## Validation Plan (per TESTING.md)

- `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py` (and the other `test_public_docker_launcher_*.py`), with the updated expectations: AC-001, AC-003 (v7 container label → recreate once with same ports; second start reuses), AC-005, AC-002 (static PowerShell checks).
- `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config` (AC-004).
- Isolated real node (AC-006, AC-003): `AUTOBYTEUS_DOCKER_STATE_DIR` and `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` set to temp folders, a test node name (not `autobyteus-server-*`), image `autobyteus/autobyteus-server:1.5.11-beta.7` (already local). First create it with the `origin/personal` launcher, then `start` with the worktree launcher: `docker ps` before/after, RFB handshake on `ws://127.0.0.1:<N>` (parent probe), connection to the Mac's LAN IP on `<N>` refused. Then `destroy --name <test node>` and `docker volume rm` its five volumes. Never touch `autobyteus-server-0/1/2`.
- Fresh-start build: `scripts/**` and `autobyteus-server-ts/docker/**` are build inputs (TESTING.md), but the change does not alter a build step or gate input read by the desktop/server builds; the delivery engineer confirms whether the fresh-clone check applies.

## Guidance For Implementation

- Reproduction to start from: rewrite `test_new_container_adds_bind_mounts_without_removing_named_volumes` (`:245-250`) to the new expectations; it fails on the current launcher.
- Keep bash and PowerShell in step; the static test checks both.
