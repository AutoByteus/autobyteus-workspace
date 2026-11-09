# Investigation Notes

## Investigation Meta

- Package identifier: `docker-setup-code-wait-feedback` (Project Task `autobyteus-workspace-3`)
- Request / ticket: `autobyteus-docker setup-code` looks hung right after a node starts (silent retry loop, no progress feedback)
- Workspace root: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback`, branch `codex/docker-setup-code-wait-feedback`
- Resolved base remote / branch / revision: `origin/personal` @ `4da745ac473681862d0d6430a806936efe74b018` (fetched 2026-11-09)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md, Finalization Target)
- Bootstrap result: worktree and branch created from the fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md` (2026-11-09); architecture gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `TESTING.md` (Test layers, Docker server nodes), `RELEASE.md` (Finalization Target) (2026-11-09)
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: Project Task `autobyteus-workspace-3` (from `/project_task_manager`). The user ran `autobyteus-docker setup-code autobyteus-server-0` on NormyMac and saw no output for a while, then a valid code. Confirm the mechanism using the node's own startup logs and timing; then, proportionately, give feedback while `setup-code` works and bound each socket attempt.
- Clarifications received:
  - Task comment (Project Task Manager, 2026-11-09): root cause given as the one-time recreate for the config hash bump `v9 -> v10` (commit `2a8e25f05`).
  - Task comment and message (the user, via Project Task Manager, 2026-11-09): wants a progress message while it works instead of silence, for example "rebuilding container..." for the recreate step and something similar for the wait afterward. Suggested wording, not a prescribed string.
- User-supplied facts and constraints: do not disrupt the user's running node beyond safe reproduction; use isolated fixtures; follow DESIGN.md, TESTING.md and package AGENTS.md.
- Initial ambiguity: whether the silent window was the node's warm-up only (the Task's hypothesis) or something else.

## Product And Domain Understanding

- Product area: the public Docker launcher `autobyteus-docker` (bash: `scripts/public/docker/autobyteus-docker.sh` + `autobyteus-docker.d/bash/*.sh`; PowerShell twin: `autobyteus-docker.ps1` + `autobyteus-docker.d/powershell/*.ps1`).
- Affected actors or systems: the node owner on the node's computer (terminal); the Docker node's local control socket (NA-5).
- Existing user or operational purpose: `setup-code` prints a one-time code that connects the desktop app to a Docker node (NAS-03, NAS-32). It first applies the current launcher configuration, recreating an out-of-date container (NAS-34, design M-8a of `tickets/done/node-universal-authentication-437`).
- Relevant terminology: "recreate" is the project's word for removing a node's container and creating it again with its named volumes (help text in `core.sh:72-73`, `docker-runtime.sh:323-327`, node access model NAS-34/NA-4). No project glossary entry for the launcher's words (`GLOSSARY.md` covers domain words of the app).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-09 | Code | `scripts/public/docker/autobyteus-docker.d/bash/commands.sh:156-188` | The command path | `print_setup_code` runs `start_node ... >/dev/null`, then `print_setup_code_of_running_node`: up to 90 attempts, 1 s apart, `docker exec <c> node -e "$SETUP_CODE_CLIENT_JS" <sock> 2>/dev/null`; nothing printed between attempts; the client JS has no timeout | — |
| 2026-11-09 | Code | `docker-runtime.sh:271-360` (`start_node`) | What `setup-code` does before asking | Logs "Checking image", runs `docker pull` (always), then: unchanged and running → "already running" + URL block; image changed → "Image changed ...; recreating" (line 323); config changed → "Launcher config changed ...; recreating" (327); then `docker rm -f` + `docker run` + "Started" + URL block. All of this goes to `/dev/null` in `setup-code` | — |
| 2026-11-09 | Code | `powershell/Commands.ps1:105-139`, `powershell/DockerRuntime.ps1:247-262` | PowerShell twin | Same loop (90 attempts, no output, client JS without timeout). `Start-Node ... \| Out-Null` discards the pipeline only: `docker pull` output is hidden, but `Write-LauncherInfo` (Write-Host) lines and the URL block still show | — |
| 2026-11-09 | Runtime (read-only) | `docker inspect autobyteus-server-0` (user's node) | Container identity and times | `Created=15:11:14.278Z`, `Started=15:11:14.364Z`: a new container, created by `docker run`, not a restart | — |
| 2026-11-09 | Runtime (read-only) | `docker events --since 2026-11-09T14:30:00Z --until 15:15:00Z` | Lifecycle around the incident | 15:07:52 `status` exec in the OLD container `d5b47d893817`; 15:11:11 `image pull autobyteus/autobyteus-server:beta`; 15:11:12 kill, 15:11:13 die, 15:11:14 destroy of `d5b47…`; 15:11:14 create + start of `2ec61fffb3ff`; exec attempts at 15:11:14, :15, :17, :18, :19 (the fifth answered); 15:11:42 pull + one exec (the Project Task Manager's repeat run, no recreate) | — |
| 2026-11-09 | Runtime (read-only) | `docker events --since 2026-11-01` (image and container events for `autobyteus-server-0`) | Was the 15:11:11 pull a new image? | Previous pull + recreate: 2026-11-02 17:21:59Z. No pull between then and 15:11:11 today | — |
| 2026-11-09 | Runtime (read-only) | `docker images -a`, `docker image inspect` | Old vs new image | Current `:beta` = `sha256:3250182e…`, built 2026-11-09 11:20Z (8.3 GB). A dangling `sha256:28042aca…` built 2026-11-02 16:54Z with the same image labels: the image the old container ran. The 15:11:11 pull downloaded the new beta | — |
| 2026-11-09 | Runtime (read-only) | `docker logs --timestamps autobyteus-server-0` | Node's own startup timing | 15:11:14.45 entrypoint; 15:11:15.76 supervisor spawns `autobyteus_server`; 15:11:15.88 starter starts server 1.5.13-beta.1; 15:11:19.33–19.37 "Server listening" | — |
| 2026-11-09 | Code | `autobyteus-server-ts/src/compositions/build-studio-server.ts:390`, `node-access-composition.ts:54-62`, `server-runtime.ts:197-219` | When the control socket opens | `startNodeAccess` (which awaits `LocalControlSocket.start()`) runs inside `buildStudioServer`, before `app.listen` (`server-runtime.ts:218`). The socket opens before "Server listening", not after it | — |
| 2026-11-09 | Code | `autobyteus-server-ts/src/node-access/services/local-control-socket.ts` | Server and CLI side of the socket | Server answers synchronously and destroys an idle connection after 5 s (`socket.setTimeout(5_000)`); the CLI client `requestSetupCode` also times out after 5 s. A fresh start removes a stale socket file before listening | — |
| 2026-11-09 | Runtime (read-only) | `~/.local/bin/autobyteus-docker*` mtimes; `diff -r` against the base | Which launcher the user ran | Installed 2026-11-09 16:07 CET (15:07Z), identical to `origin/personal` (`CONFIG_HASH_VERSION="v10"`) | — |
| 2026-11-09 | Code | `git log -- scripts/public/docker` | Config hash history | `2a8e25f05` (2026-11-08) introduced `setup-code` and `v10`; the old container (2026-11-02) predates it | — |
| 2026-11-09 | Command | `time docker pull -q autobyteus/autobyteus-server:beta` (no new image; harmless) | Cost of the pull when nothing changed | 1.02 s | — |
| 2026-11-09 | Code | `tickets/done/node-universal-authentication-437/design-spec.md:115` | Intended recreate behavior | M-8a: `setup-code` runs the config-hash check and recreates when it differs; "the release note says the container restarts once". Pulling a newer image is not mentioned | FU-001 |
| 2026-11-09 | Code | `scripts/tests/test_public_docker_launcher_*.py` | Existing coverage | Offline fake-Docker tests (`python3 -m unittest`); `setup-code` covered by `test_nas_03_nas_32_*` and `test_nas_34_*` in `test_public_docker_launcher_shared_workspace.py` (1347 lines, over the 500-line limit). Fake `exec` prints a canned code; it never runs the client JS. PowerShell is covered by a text contract test (no `pwsh` on this machine) | — |
| 2026-11-09 | Doc | `autobyteus-server-ts/docs/design/node_access_model.md` NA-5, NAS-03/32/34 | Governing contract | Socket protocol (one line in, one JSON line out) unchanged by this ticket; no client timeout is specified | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Owner runs `autobyteus-docker setup-code [--name <node>]` (NAS-03, NAS-32) | pull image → (recreate / start / nothing) → ask the socket until it answers → print code | Code printed; nothing shown while pulling, recreating or waiting (bash). PowerShell shows launcher lines and the URL block but not the pull or the wait | `commands.sh:162-188`, `Commands.ps1:112-139` | High |
| BEH-002 | User | Same command on a node whose image or launcher config is out of date (NAS-34) | Recreates the container, keeping named volumes and port; then waits for the new node to start | Recreate is silent in bash; takes pull time + ~3 s recreate + ~5 s start | Events and logs above | High |
| BEH-003 | User | `new-container` | `start_node` output shown, then the same silent wait loop | Silent wait of ~5 s for a fresh node | `docker-runtime.sh:475-480` | High |
| BEH-004 | System | One socket attempt | `docker exec … node -e <client>`; client has no timeout | An attempt to a socket that accepts but never answers never ends | Probe below | Reproduced |
| BEH-005 | Contract | NAS-32 | Code printed only to the terminal, written nowhere | Preserved | `test_nas_03_nas_32_*` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `bash/commands.sh` `print_setup_code` | Discards all of `start_node`'s stdout | The silence of the pull and recreate comes from this redirect | Show the progress, keep the URL block out |
| `bash/commands.sh` `print_setup_code_of_running_node` | Attempt-count loop, stderr discarded | No wait feedback; 90 attempts ≠ 90 s once attempts can take time | Time-based deadline, waiting lines, last error kept |
| `bash/docker-runtime.sh` `start_node` | Pull, compare, start/recreate, print URL block | Shared by `new-container`, `upgrade`, `workspace apply`, `reset`, `setup-code` | Needs a way for `setup-code` to skip the URL block |
| `SETUP_CODE_CLIENT_JS` (bash and PowerShell) | In-container client | No timeout | Add a 5 s socket timeout like the CLI client and the server |
| `local-control-socket.ts` | Server; 5 s idle timeout; CLI client with 5 s timeout | Server side already bounded unless its event loop is blocked | No server change needed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: none.
- Existing readers, writers, or contracts that consume them: N/A.
- Evidence paths: N/A.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: launcher shell modules (bash and PowerShell twins). No server, API, persistence or security change.
- Existing structural surfaces that can support the approved behavior: `start_node`/`Start-Node` already log each step; `log`/`Write-LauncherInfo` exist.
- Evidence paths: above.

### Potential Structural Impacts To Investigate

- API or external-contract change: none (socket protocol unchanged).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none; the code still goes only to the terminal.
- Concurrency or lifecycle change: none.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: none; the public launcher is served from `personal` (raw GitHub), so a merge reaches users when they reinstall.
- Confirmed absent, present, or unknown: confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `docker events` + `docker inspect` + `docker logs --timestamps` on the user's node (read-only) | The user's run | `setup-code` itself pulled a new image (done 15:11:11), removed the old container (15:11:12–14), created and started a new one (15:11:14), then asked 5 times until the node answered (15:11:19). The node's server listened 15:11:19.37; the socket opens just before that. Whole window silent | Measured (from the user's own records) | Feedback is needed for the pull, the recreate and the wait, not only the wait | This file, Source Log |
| `bash probes/silent-socket-attempt.sh <repo> 15` | A socket that accepts and never answers | Launcher's client still waiting after 15 s: `UNBOUNDED` (exit 1) | Reproduced (real `node`, real Unix socket) | A per-attempt bound is needed | `probes/silent-socket-attempt.sh` |
| Same server, client with `s.setTimeout(5000, …exit 1)` | Control | Ended after 5 s with exit 1 | Reproduced | A client-side socket timeout bounds the attempt | Command in this row (inline control) |
| `time docker pull -q …:beta` | Pull with no new image | 1.02 s | Measured | A no-change run stays quick | — |

- Temporary diagnostics: None (no edits to code or to the user's node; only read-only Docker queries and one no-op `docker pull`).
- Reproduction for implementation to start from: `bash tickets/in-progress/docker-setup-code-wait-feedback/probes/silent-socket-attempt.sh <repo-root> 15` — prints `UNBOUNDED` and exits 1 today; prints `BOUNDED` and exits 0 after the fix.

### Mechanism, conclusion

- **The Task's hypothesis is ruled out in its main part.** The node had not "just started" before `setup-code`: the `status` run at 15:07:52 executed in the old container. `setup-code` itself, through `start_node`, downloaded the new `beta` image and recreated the container; `StartedAt` is the recreate time. The control socket does not lag behind the HTTP server; it opens before it (`build-studio-server.ts:390` precedes `server-runtime.ts:218`).
- **What branch ran:** the image ID differed (new beta pulled; old image now dangling), so the "Image changed … recreating" branch (`docker-runtime.sh:322-323`) ran; the config hash (`v10`, launcher installed 15:07Z) also differed, which on its own would have recreated it too (the Project Task Manager's comment names that branch; the image branch is checked first).
- **The silent window** = image download (start time unknown; no shell history; an 8.3 GB image whose changed layers had to be fetched) + ~3 s removal and creation + ~5 s node start with 4 failed attempts. All output of the first two parts went to `/dev/null`; the third has no output by design.
- **One-time for this node**: the repeat at 15:11:42 found image and config current and answered at once.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user (Task, 2026-11-09) | Looked stuck; wants a progress message ("rebuilding container..." and similar for the wait) | Direct report and stated preference | REQ-001..REQ-003 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Node local control socket (NA-5) | `node_access_model.md`, `local-control-socket.ts` | One line in, one JSON line out; server idle timeout 5 s | Source | None |
| Docker CLI `docker pull` | Docker 29.8.1 | Prints progress on stdout; fancy progress when stdout is a terminal | Local run | None |
| Node.js `net.Socket.setTimeout` | Node in the image | Fires on inactivity; used by server and CLI already | Control run | None |

## Persisted Data And State Facts

- Affected stored or external subject: none. Launcher state files and named volumes are unchanged.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/silent-socket-attempt.sh` | Solution Designer | Reproduces the unbounded attempt with the real client | REQ-004 | AC-004 | Current | Evidence; no approval needed |
| `follow-ups.md` | Solution Designer | FU-001 | Out of scope | — | Current | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | How long the user's image download took | Only the end of the pull is in Docker's events | Not needed: every part of the window was silent and is addressed | Accepted |
| RSK-001 | Risk | `docker exec` itself hanging (Docker daemon stuck) is not bounded by the client timeout | Outside the socket attempt; Docker-level failure | Limitation; not a supported scenario to build machinery for | Accepted |
| RSK-002 | Risk | PowerShell cannot be executed on this machine (no `pwsh`) | Twin changes are verified by text contract (and pwsh parse where available) | Existing project practice | Accepted |

## Architecture Investigation Findings

- Entry: `autobyteus-docker.sh` → `main` (`commands.sh:205`) → `print_setup_code` (`commands.sh:181`) → `start_node` (`docker-runtime.sh:271`) → `print_setup_code_of_running_node` (`commands.sh:162`) → `docker exec` → in-container `node -e` client → node's `LocalControlSocket.answer` → JSON reply → printed code.
- `new-container`: `create_new_container` (`docker-runtime.sh:475-480`) → `start_node` (output shown) → `print_setup_code_of_running_node`.
- `start_node` prints the URL block at four return points (`docker-runtime.sh:300, 308, 345`; and the start path 308) — callers other than `setup-code` want it.
- `log` (`core.sh:90`) prints to stdout; `fail` to stderr.
- PowerShell: `Show-SetupCode` (`Commands.ps1:133`), `Show-SetupCodeOfRunningNode` (`Commands.ps1:112`), `Start-Node` (`DockerRuntime.ps1:247`), `Write-LauncherInfo` (`Core.ps1:93`).
- Root cause classification: `Local Implementation Defect` in the launcher's `setup-code` command (output discarded, wait silent, attempt unbounded); owners and boundaries are correct.

## Requirement Implications

- Feedback must cover three silent phases: image check/download, container recreate (or start), and the wait for the node to answer.
- The per-attempt bound must be in the client (the one place that can see a silent socket); the overall wait must be bounded in wall-clock time.
- `setup-code`'s stdout today carries only the code lines; keep that so the code stays easy to copy or script.

## Notes For Architecture Design

- Map SCN-001..SCN-004 to `print_setup_code`, `start_node`, `print_setup_code_of_running_node` and their PowerShell twins.
- Keep the recreate decision (NAS-34) and the code privacy (NAS-32) unchanged.
- New tests in a new file; do not grow `test_public_docker_launcher_shared_workspace.py` (1347 lines).
