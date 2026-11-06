# Requirements Document — S0: Docker nodes publish only the ports they need

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `docker-node-publish-needed-ports`
- Request / ticket: Project Task `autobyteus-402` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), slice S0 of autobyteus-394
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `User`. These requirements are REQ-012, REQ-018 (port and recreate part) and AC-015 of autobyteus-394 (`requirements-doc.md` at SR-004), which the user approved on 2026-11-06 ("Let's only publish the port that we need … the development port don't have to be published, then don't publish it"; "we work on the S0 first"). Details below that the parent left open were decided by the Solution Designer within that direction (DEC-S0-1 … DEC-S0-5) and reported to the user in the result.
- Exact approved requirements baseline: this document at SR-001.
- Parent package (read-only reference): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/` (requirements-doc.md, investigation-notes.md, design-spec.md).

## Problem And Desired Outcome

- Problem: every Docker node the launcher or the compose file creates publishes VNC 5900 (no password), websockify 6080 and Chromium DevTools 9223 on every host interface. Anyone who can reach the host can watch and control the agent desktop and take over its browser. Nothing in AutoByteus uses 5900 or 9223 from outside the node; 6080 is used only by the desktop app's VNC Viewer on the same computer (it dials `localhost:<port>`).
- Desired outcome: new and recreated Docker nodes publish the backend port as today and 6080 on the host's loopback only; 5900 and 9223 are not published at all.
- Observable success: AC-001 … AC-007.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Launcher (bash, PowerShell) allocates four host ports and publishes `-p B:8000 -p V:5900 -p N:6080 -p D:9223` on all interfaces | Allocates two (backend, VNC Viewer); publishes `-p B:8000` (all interfaces) and `-p 127.0.0.1:N:6080` | Backend port, its friendly preference (8001+i) and all-interface publishing; volumes, mounts, env, labels | investigation-notes.md AF-01, AF-02 |
| BEH-002 | Operational | SCN-002 | `start`/`upgrade`/`workspace apply` recreate a node when the launcher config hash changes, keeping named volumes and saved ports | Same mechanism picks up the new publishing; the node keeps its backend and VNC Viewer ports | Recreate only on the user's own lifecycle command | AF-03 |
| BEH-003 | Operational | SCN-003 | `docker compose` (`autobyteus-server-ts/docker`) and `docker-start.sh` publish 5908/6080/9228 on all interfaces | Compose publishes backend as today and 6080 on `127.0.0.1`; no 5900/9223; `docker-start.sh` stops allocating them | Backend port | AF-04 |
| BEH-004 | User | SCN-001 | Launcher output and help list "noVNC", "VNC" and "Chrome debug" URLs; docs and the in-app Docker Guide say the same | Output lists Backend, GraphQL and "VNC Viewer … (this computer only)"; docs and Docker Guide match | Other output | AF-05 |
| BEH-005 | User | SCN-001 | VNC Viewer in the desktop app on the Docker host connects to `localhost:<6080 port>` | Unchanged | Yes | parent BEH-001 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| The user | Nodes not open to other devices | Only needed ports published | His running nodes change only when he runs the launcher |
| Desktop app on the Docker host | Show the node desktop | VNC Viewer keeps working | Same computer only |
| Other devices on the network | — | Cannot reach 5900, 6080 or 9223 | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Create a Docker node with the launcher (bash or PowerShell) | SCN-001 |
| UC-002 | Recreate an existing node with the launcher's lifecycle commands | SCN-002 |
| UC-003 | Run a node with the repository's compose file / `docker-start.sh` | SCN-003 |

### Out Of Scope

- The desktop app's viewer, the server, the `AUTOBYTEUS_VNC_SERVER_HOSTS` env and 6080 itself (slice S1 removes them).
- The server image (`EXPOSE`, websockify, the 9223 forwarder) and the base image repository (slice S2).
- Origin checks and phone credential hardening (follow-ups FU-001, FU-002 of autobyteus-394).
- The user's running nodes: no command is run against them.

### Non-Goals

- No option to publish 5900 or 9223 again; no release in this Task without the user's word.

### Preserved Behavior Boundary

- BEH-005; backend port selection, persistence and all-interface publishing; named volumes and bind mounts; `destroy`, `reset`, `update`, `status`, `storage`, `workspace` behavior apart from the port lines.

### Prerequisites

None.

### Review Authority

- Every blocking finding cites a REQ, AC or preserved-behavior ID here. A proposal that adds behavior is a `Requirement Gap` for the user. Adjacent concerns are follow-ups.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Nodes created or recreated by the bash and PowerShell launchers publish the backend port as today and the VNC Viewer port only on `127.0.0.1` (`-p 127.0.0.1:<port>:6080`); 5900 and 9223 are not published | BEH-001, BEH-002 | Must | Only needed ports (user) | Measured: loopback publishing works with the current image (parent probe) | parent REQ-012 |
| REQ-002 | The launchers no longer allocate, store or print a VNC or Chrome debug host port for any node | BEH-001, BEH-004 | Must | Nothing uses them | N/A | parent REQ-012; DEC-S0-2 |
| REQ-003 | An existing launcher-managed node changes only when the user runs a launcher lifecycle command (`start`, `new-container` on an existing name, `upgrade`, `workspace apply`, `reset`); it is then recreated with its named volumes and its saved backend and VNC Viewer ports | BEH-002 | Must | User's nodes not touched by this Task; registered node URLs stay valid | N/A | parent REQ-018; DEC-S0-3 |
| REQ-004 | The repository's compose file publishes the backend as today and 6080 only on `127.0.0.1`, with no 5900 or 9223 mapping; `.env.example` and `docker-start.sh` no longer define or allocate VNC and Chrome debug ports | BEH-003 | Must | Same rule for every way to run a node from this repository | N/A | parent REQ-012 |
| REQ-005 | Launcher output (`new-container`, `start`, `urls`), launcher help, the in-app Docker Guide copy (en, zh-CN) and the docs name the published ports correctly: Backend, GraphQL, and "VNC Viewer" with "this computer only"; no noVNC/VNC/Chrome-debug addresses | BEH-004 | Must | Correct guidance | N/A | parent REQ-012, REQ-018 |
| REQ-006 | The docs tell the user that existing nodes keep their old port publishing until he runs `autobyteus-docker start` or `upgrade`, and that a VNC app or `chrome://inspect` no longer reaches a node from outside it | BEH-002 | Must | Operability | N/A | parent REQ-018 |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | `new-container` (bash) with a fake Docker | Run arguments contain the backend mapping without host address and `127.0.0.1:<N>:6080`; no `:5900` and no `:9223` mapping; state file has no `VNC_PORT`/`DEBUG_PORT`; friendly preference `8001` / `6080` for `autobyteus-server-0` | Bind failure retry uses fresh ports for both | Launcher tests (`scripts/tests`) |
| AC-002 | REQ-001, REQ-002 | SCN-001 | Same for the PowerShell launcher | Same argument shape and state shape | — | Static launcher tests (no `pwsh` on the build Mac); `pwsh` run where available |
| AC-003 | REQ-003 | SCN-002 | A node created by the current (v7) launcher, then `start` with the new launcher | Recreated once (log "Launcher config changed"), same backend and VNC Viewer ports, named volumes kept, new publishing; a second `start` does not recreate | — | Launcher test + isolated real container |
| AC-004 | REQ-004 | SCN-003 | `docker compose config` on the compose file | Ports: backend as before, `127.0.0.1:${AUTOBYTEUS_WEB_VNC_PORT:-6080}:6080`; no 5900/9223 | — | Command check / test |
| AC-005 | REQ-005 | SCN-001 | `urls`, `help`, Docker Guide, docs | Wording as REQ-005 | — | Tests on output text; review of docs |
| AC-006 | REQ-001 | SCN-001 | Isolated real node created by the new launcher (test state dir, test node name, test data) | `docker ps` shows `0.0.0.0:<B>->8000` (and `[::]`) and `127.0.0.1:<N>->6080` only; RFB handshake works on `ws://127.0.0.1:<N>`; connecting to `<Mac LAN IP>:<N>` is refused | — | Real Docker run; node destroyed and its volumes removed afterwards |
| AC-007 | REQ-001 | SCN-001 | Desktop app VNC Viewer against that isolated node (on the same Mac) | Still renders | — | Optional isolated desktop instance, or the RFB handshake of AC-006 as the transport proof |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | User | New node | `autobyteus-docker new-container` | Docker running | Launcher picks ports, runs container, prints URLs | Only backend + loopback 6080 published | Port busy → retry | Supported Normal Scenario | docs, launcher | REQ-001, 002, 005; AC-001, 002, 005, 006, 007 |
| SCN-002 | Operational | User | Existing node gets the new shape | `autobyteus-docker start`/`upgrade` | Node made by the old launcher | Hash differs → recreate keeping volumes and ports | New publishing | — | Supported Normal Scenario | `docker-runtime.sh:280-335` | REQ-003, 006; AC-003 |
| SCN-003 | Operational | Developer | Run a node from the repository | `docker compose up` / `docker-start.sh up` | — | — | Same publishing rule | — | Supported Normal Scenario | compose file | REQ-004; AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (copy only): the in-app Docker Guide's `urls` command description (en, zh-CN). Product design: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001; AC-006 | Security | No listener reachable from another device on 5900, 6080 or 9223 of a new node | Real container check |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (launcher state files `~/.autobyteus/docker-server/nodes/*.env` / `*.json`).
- Preserved: node name, container name, backend port, VNC Viewer port, image ref, created time, named volumes.
- Acceptable loss: the `VNC_PORT`/`DEBUG_PORT` (`vncPort`/`debugPort`) values, dropped when the state is next written.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence |
| --- | --- | --- |
| Docker `-p 127.0.0.1:H:C` | Publishes on host loopback only (Docker Desktop for Mac included) | Parent probe (`-p 127.0.0.1:16394:6080`) |

## Supplemental Artifacts

| Path | Purpose | Status |
| --- | --- | --- |
| Parent `probes/rfb-forwarding-probe.mjs` | RFB handshake check for AC-006 | Evidence tool |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | No user relies on reaching 5900/9223 from another machine | Confirmed by the user ("only publish the port that we need") |

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-S0-1 | Keep 5900 on loopback for a VNC app on the Mac? | Nothing in the product needs it and the user asked for needed ports only. **Not published.** | Solution Designer (within the user's direction) | Decided |
| DEC-S0-2 | Keep allocating the old ports "just in case"? | Dead state otherwise (no reader). **Stop allocating, storing and printing them.** | Solution Designer | Decided |
| DEC-S0-3 | Do recreated nodes keep their ports? | Changing the backend port would break the node entries registered in the app. **Keep backend and VNC Viewer ports.** | Solution Designer | Decided |
| DEC-S0-4 | Change the server image `EXPOSE` now? | `EXPOSE` opens nothing, and the base image exposes the same ports anyway; S2 owns the images. **Leave it to S2.** | Solution Designer | Decided |
| DEC-S0-5 | Label for 6080 | It serves the app's VNC Viewer, not a web noVNC page. **"VNC Viewer: localhost:<port> (this computer only)".** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001, 002, 006, 007 | SCN-001 |
| REQ-002 | UC-001 | BEH-001, 004 | AC-001, 002 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-005 | UC-001 | BEH-004 | AC-005 | SCN-001 |
| REQ-006 | UC-002 | BEH-002 | AC-005 | SCN-002 |

## Architecture Phase Input

- Constraints: bash/PowerShell parity; backend port behavior unchanged; recreate only through the existing config-hash mechanism.

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (user, via the parent's approved basis; details within the direction). Ready for design: `Yes`.
