# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001; Solution Designer within the direction, user informed in the Solution Designer's conversation on 2026-11-09 (DEC-001..DEC-007)
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback/tickets/in-progress/docker-setup-code-wait-feedback/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (repository root), `TESTING.md` (2026-11-09). `references/design-examples.md`: not used (no shape needing an example beyond those below).
- Project design-principle conflicts with the general principles, or discrepancies: `TESTING.md`'s Test layers table has no row for the launcher's offline tests (`python3 -m unittest scripts/tests/test_public_docker_launcher_*.py`), although they are the project's coverage for `scripts/public/docker/`. For the API/E2E engineer (owner of TESTING.md): add the row in this ticket. No conflict with the general principles.

## Current-State Read

`setup-code` (`commands.sh:181-188`) runs `start_node` with its stdout sent to `/dev/null`, then `print_setup_code_of_running_node` (`commands.sh:162-177`). `start_node` (`docker-runtime.sh:271-360`) always pulls the node's image tag, then leaves a current running node alone, starts a stopped one, or recreates an out-of-date one; every path ends by printing the URL block. The wait loop runs up to 90 attempts, 1 s apart, discards each attempt's stderr, and prints nothing until it has a code. Each attempt runs `SETUP_CODE_CLIENT_JS` (`commands.sh:159`) inside the container; the client has no timeout (reproduced: unbounded). PowerShell mirrors this (`Commands.ps1:105-139`, `DockerRuntime.ps1:247-330`), except that `| Out-Null` hides only `docker pull`'s pipeline output: its `Write-Host` lines and URL block show. `new-container` (`docker-runtime.sh:475-480`, `DockerRuntime.ps1:466-473`) shares the wait loop.

The owners are right: `start_node` owns the node lifecycle and already logs each step; the wait loop owns asking the node. The defects are local: output discarded, wait silent, attempt unbounded, budget counted in attempts.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: launcher modules only: `bash/commands.sh`, `bash/docker-runtime.sh`, `powershell/Commands.ps1`, `powershell/DockerRuntime.ps1`, one new test file, a contract-test addition, one TESTING.md row. No server, app or data change.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no API, socket-protocol, persistence, security, concurrency or deployment change; the recreate decision and code privacy are unchanged; the only shared change is message text in `start_node` and an optional "no URL block" switch.
- Escalation trigger if implementation or validation discovers new impact: if showing `start_node`'s output needs changes to its decisions, or if bounding the attempt needs anything beyond the client JS timeout (for example a Docker-level timeout), return a `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Docker events, inspect, logs of the user's node (read-only) | investigation-notes, Source Log | Silent window = pull + recreate + 5 s start | Show `start_node` output and wait progress (D1, D2) | Download duration unknown (UNK-001) |
| Code read | `commands.sh:186` `>/dev/null` | Discards every progress line | D1 | None |
| Code read | `docker-runtime.sh:300,308,345` `print_urls` | URL block at every successful return | D1 `print_urls` switch | None |
| Probe | `probes/silent-socket-attempt.sh` | Client unbounded; 5 s `setTimeout` control ends it | D3 | None |
| Code read | `local-control-socket.ts` server and `requestSetupCode` | Both use 5 s | D3 value | None |
| Code read | `build-studio-server.ts:390` vs `server-runtime.ts:218` | Socket opens before HTTP listen | No server change | None |
| Test read | `scripts/tests/test_public_docker_launcher_shared_workspace.py` (1347 lines), fake `exec` at 1316-1325 | Fake answers with a canned code, never runs the client | New test file with a wrapper running the real client | None |

## Intended Change

Make `setup-code` show what it does: its image check/download and its recreate/start step on standard error, without the URL block; announce the wait and its progress; bound each request to the node at 5 s and the whole wait at 90 s; carry the same into the PowerShell launcher.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Areas: bash `print_setup_code`, `print_setup_code_of_running_node`, `SETUP_CODE_CLIENT_JS`, `start_node` (recreate message text and a no-URL-block switch); the PowerShell twins `Show-SetupCode`, `Show-SetupCodeOfRunningNode`, `$Script:SetupCodeClientJs`, `Start-Node`; tests; TESTING.md row.
- Derived consumers: `start_node`'s callers (`apply_workspace_to_node`, `upgrade_all_nodes`, `create_new_container`, `reset_nodes`, `print_setup_code`; PowerShell `Commands.ps1:51`, `DockerRuntime.ps1:463,471,477`, `Commands.ps1:137`) keep the URL block by default; only `setup-code` turns it off. The reworded recreate lines appear for every caller; the two existing assertions on the old wording (`test_public_docker_launcher_shared_workspace.py:346` and `:423`, `"Launcher config changed for autobyteus-server-0"`) are updated in place, adding no lines to that file.
- Deliberately left alone: whether `start_node` pulls (FU-001); the node server and its socket; the node-access CLI; `log`'s stdout for every other command; `docker exec` itself (RSK-001); the bind-failure recreate message ("Saved ports are unavailable; recreating … with fresh ports") which already says what happens.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003; AC-001, AC-003 | `setup-code` | Output discarded (`commands.sh:186`) | `start_node` output on stderr, no URL block; stdout only code lines | DS-001 |
| BEH-002 | User | REQ-001; AC-001 | Out-of-date node (NAS-34) | "Image changed …; recreating the managed container …" discarded | "Recreating the container of <node>: <reason>. Its named volumes are kept." visible | DS-001 |
| BEH-003 | User | REQ-002, REQ-005; AC-002, AC-003, AC-005, AC-008 | Wait after `setup-code` / `new-container` | Silent attempt loop | Waiting line, 10 s updates, 90 s deadline, last error | DS-002 |
| BEH-004 | System | REQ-004; AC-004 | Silent socket | Unbounded | 5 s client timeout | DS-002 |
| BEH-005 | Contract | REQ-007; AC-007 | NAS-32 | Code only on stdout | Preserved | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/silent-socket-attempt.sh` | Reproduces the unbounded attempt with the launcher's client | REQ-004 / AC-004 | Must print `BOUNDED` after the fix; becomes a test case | Current; evidence |
| `follow-ups.md` | FU-001 | — | Out of scope | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (user-visible: command looks hung; attempt unbounded)
- Current design issue found: `No` (local defects)
- Structural triggers: none fire. Checked: *Repeated coordination* — the wait loop exists once per launcher (bash/PowerShell twins are the project's accepted shape, not a duplicated policy within one launcher); *Responsibility overload* — `commands.sh` (337 lines) and `docker-runtime.sh` (486 lines) stay under 500 with the small additions (keep `docker-runtime.sh` under 500: the switch adds a few lines); *Vocabulary drift* — "recreate" kept as the one word (DEC-004); *Behavior by absence* — waiting message is driven by an explicit failed attempt, not by a missing value.
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: investigation-notes, Architecture Investigation Findings.
- Design response: extend the existing owners in place.
- Refactor rationale: owners and boundaries already fit.
- Intentional deferrals and residual risk: `scripts/tests/test_public_docker_launcher_shared_workspace.py` is 1347 lines; this ticket adds nothing to it (new tests in a new file), so it is not this ticket's to split. Docker-level hangs (RSK-001).

## Terminology

- **Recreate**: remove the node's container and create it again from its image, keeping its named volumes and port (existing launcher word; DEC-004).
- **Attempt**: one `docker exec` request to the node's control socket for a setup code.
- **Wait**: the series of attempts until a code or the 90-second deadline.
- No project glossary entry needed (launcher words are not in `GLOSSARY.md`; nothing new introduced).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the attempt-count loop bound (`seq 1 "$SETUP_CODE_WAIT_SECONDS"` / `for ($attempt …)`) is replaced by a time deadline; the `>/dev/null` / `| Out-Null` around `start_node` in `setup-code` is replaced by stderr / host output.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected` — launcher state files and named volumes are read and written exactly as before.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-005 | Owner runs `setup-code` | Code printed | `print_setup_code` | Where progress becomes visible |
| DS-002 | Bounded Local | BEH-003, BEH-004 | First attempt | Code or failure | `print_setup_code_of_running_node` | The wait, its messages and bounds |

## Primary Execution Spine(s)

`Terminal (setup-code) -> main -> print_setup_code -> start_node [pull -> compare -> keep | start | recreate] (progress on stderr, no URL block) -> print_setup_code_of_running_node [attempt loop] -> docker exec -> client JS (5 s bound) -> node LocalControlSocket -> code on stdout`

`new-container`: `main -> create_new_container -> start_node (unchanged output) -> print_setup_code_of_running_node`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | `setup-code` brings the node up to date and shows each step as `start_node` takes it; the URL block is skipped because `setup-code` ends with its own line naming the node's backend URL; then it waits for the code | node state, container, image | `print_setup_code` | `log` |
| DS-002 | Ask; on failure keep the error, announce the wait once, update every 10 s, stop at 90 s; on success print the code lines on stdout | attempt, deadline | `print_setup_code_of_running_node` | client JS |

## Spine Actors / Main-Line Nodes

`print_setup_code`, `start_node`, `print_setup_code_of_running_node`, the client JS, the node's `LocalControlSocket` (unchanged). PowerShell: `Show-SetupCode`, `Start-Node`, `Show-SetupCodeOfRunningNode`.

## Ownership Map

- `print_setup_code` / `Show-SetupCode`: owns the `setup-code` command's output streams (progress to stderr/host, no URL block).
- `start_node` / `Start-Node`: owns the node lifecycle decision and its step messages (reworded recreate lines); prints the URL block unless its caller turns it off.
- `print_setup_code_of_running_node` / `Show-SetupCodeOfRunningNode`: owns the wait: deadline, attempts, waiting messages, final error.
- Client JS (`SETUP_CODE_CLIENT_JS` / `$Script:SetupCodeClientJs`): owns one request and its 5 s bound.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `>/dev/null` after `start_node` in `print_setup_code` (`commands.sh:186`) | Progress must show | `>&2` plus the no-URL-block switch | — |
| `\| Out-Null` after `Start-Node` in `Show-SetupCode` (`Commands.ps1:137`) | Pull output must show | `Start-Node … -NoUrls` with `docker pull` output sent to the host inside `Start-Node` | See D1 |
| Attempt-count loop bound (`commands.sh:167`, `Commands.ps1:115`) | Budget is time | Deadline from `SECONDS` / a stopwatch | `SETUP_CODE_WAIT_SECONDS` keeps its name and value 90 (it now really is seconds) |
| `2>/dev/null` on each attempt (`commands.sh:168`) / `2>$null` (`Commands.ps1:116`) | Last error is reported on failure | Attempt stderr captured into a variable | Never printed per attempt |

## Return Or Event Spine(s) (If Applicable)

N/A — the answer returns on the same call.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `print_setup_code_of_running_node`.
- Chain: `deadline = now + 90 s -> attempt -> success? print code, return -> failure: keep error; first failure? print "Waiting for <node> to start (up to 90 seconds)..." ; 10 s since last message? print "Still waiting for <node> to start (<n> s)..." -> now < deadline? sleep 1, attempt : fail with node, last error, logs hint`.
- Why it matters: it carries REQ-002, REQ-004 (through the client), REQ-005.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `log` (`core.sh:90`) / `Write-LauncherInfo` | DS-001, DS-002 | all | `[AutoByteus Docker] ` prefix | Existing launcher voice | — (waiting lines use `log … >&2`) |

## Ownership Boundaries

`setup-code` controls its own streams by redirecting `start_node` as a whole; it does not reach into `start_node`'s steps. `start_node` exposes one switch for the URL block; it does not know about `setup-code`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `start_node` | pull, compare, start, recreate, URL block | all commands | `setup-code` re-implementing a pull/recreate to get output | The switch below |

## Dependency Rules

- `print_setup_code` → `start_node`, `print_setup_code_of_running_node`. `create_new_container` → the same two. No new dependencies; no module calls back into `commands.sh` from `docker-runtime.sh` beyond the existing `create_new_container` → `print_setup_code_of_running_node` call.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `start_node <node> <image_ref> [print_urls]` | node lifecycle | as today; third argument `1` (default) prints the URL block, `0` does not | node name | Bash |
| `Start-Node $NodeName $ImageRef $PreferDefaults [-NoUrls]` | same | same; `-NoUrls` switch | node name | PowerShell |
| `print_setup_code_of_running_node <node>` / `Show-SetupCodeOfRunningNode` | the wait | unchanged signature | node name | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `start_node` | Yes | Yes | Low | — |
| wait function | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Recreate step | "Recreating the container of <node>" | Yes | Yes (help text, NAS-34) | Low | Not "rebuild" (DEC-004) |
| `SETUP_CODE_WAIT_SECONDS` | unchanged | Yes, and now accurate | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Step messages | `start_node`'s own `log` lines | Reuse | Already say each step | — |
| Download progress | `docker pull`'s own output | Reuse | Native progress | — |
| Per-attempt bound | `net.Socket.setTimeout` (as in `requestSetupCode`) | Reuse | Same 5 s policy | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker launcher (bash) | DS-001, DS-002 | both | as above | Extend | — |
| Docker launcher (PowerShell) | same | both | twins | Extend | — |
| Launcher tests (`scripts/tests/`) | coverage | both | — | Extend (new file) | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no reusable structure extracted).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Fake-Docker helpers | `test_public_docker_launcher_shared_workspace.py` (import, as the update test does) | tests | Already shared by import | Yes | Yes | A place for new setup-code fakes (file is over 500 lines) |

## Shared Structure / Data Model Tightness Check

N/A — no shared data structure changes.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | bash launcher | `print_setup_code`, wait, client JS | `setup-code` command | Existing home | — |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | bash launcher | `start_node` | URL switch, recreate wording | Existing home | — |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | PS launcher | `Show-SetupCode`, wait, client JS | twin | Existing home | — |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | PS launcher | `Start-Node` | `-NoUrls`, pull output to host, recreate wording | Existing home | — |
| `scripts/tests/test_public_docker_launcher_setup_code.py` (new) | tests | — | `setup-code` progress, wait, bounds, PowerShell text contract for these | One command's coverage | Imports fake-Docker helpers |
| `TESTING.md` | project docs | API/E2E | Test layers row for launcher tests | — | — |

## Applied Patterns (If Any)

None beyond the existing bounded retry loop.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| files above | File | as above | as above | Existing launcher layout | New fake-Docker code in the 1347-line shared test file |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/{bash,powershell}` | Mixed Justified (launcher modules) | Yes | Low | Unchanged layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| `setup-code` streams (bash) | `start_node "$node" "$ref" 0 >&2` then the wait; code lines `printf` to stdout | Removing `>/dev/null` so progress and the URL block land on stdout | Keeps stdout = code lines (REQ-003) |
| Output of a recreate run (stderr, then stdout) | `[AutoByteus Docker] Checking image autobyteus/autobyteus-server:beta` / Docker pull progress / `[AutoByteus Docker] Recreating the container of autobyteus-server-0: a newer image was downloaded. Its named volumes are kept.` / `[AutoByteus Docker] Started autobyteus-server-0.` / `[AutoByteus Docker] Waiting for autobyteus-server-0 to start (up to 90 seconds)...` / stdout: `Setup code for autobyteus-server-0: …` | Silence, then the code | The user's request |
| Recreate reasons (one sentence each, same in both launchers) | image differs: "a newer image was downloaded"; config hash differs: "the launcher configuration changed"; no hash label: "the container predates launcher configuration tracking" | Three different sentence shapes | Consistent wording |
| Client JS bound | add `s.setTimeout(5000,()=>{console.error("the node did not answer within 5 seconds");process.exit(1)})` to the existing one-liner (PowerShell: single quotes only, as its comment requires) | A `timeout` binary around `docker exec` (absent on macOS) | Same 5 s policy as server and CLI |
| Deadline | bash: `deadline=$((SECONDS + SETUP_CODE_WAIT_SECONDS))`, loop `while :`, stop after a failed attempt when `SECONDS >= deadline`; PowerShell: `[Diagnostics.Stopwatch]` | `seq 1 90` | 90 s means 90 s |
| PowerShell pull output | inside `Start-Node`: `& docker pull $ImageRef \| Out-Host` (exit code still from `$LASTEXITCODE`) | Leaving it on the pipeline so `\| Out-Null` hides it | Visible in every command, harmless for callers that already printed it |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the attempt-count loop alongside a deadline | Minimal change | Rejected | Deadline only |
| An env var to silence the new messages | Scripting | Rejected | Progress is on stderr; stdout unchanged |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Start from the probe: `bash tickets/in-progress/docker-setup-code-wait-feedback/probes/silent-socket-attempt.sh "$PWD" 15` prints `UNBOUNDED`.
2. Client JS timeout (bash and PowerShell); probe prints `BOUNDED` within ~5 s.
3. `start_node` / `Start-Node`: URL switch, reworded recreate messages, PowerShell pull to host.
4. `print_setup_code` / `Show-SetupCode`: progress to stderr / host, URL block off.
5. Wait loop rewrite (both launchers): deadline, waiting and 10 s messages to stderr (bash `log … >&2`; PowerShell `Write-LauncherInfo`), last error kept, failure message `"<node> did not answer with a setup code within 90 seconds (last attempt: <error>). Check: autobyteus-docker logs --name <node>"`.
6. Tests: new `scripts/tests/test_public_docker_launcher_setup_code.py`; update existing assertions matching the old recreate wording; TESTING.md row.
7. Remove the probe? No: it stays in the ticket folder as evidence; the test case supersedes it for regression.

## Key Tradeoffs

- stderr for progress vs stdout like other commands: chosen to keep `setup-code`'s stdout unchanged (DEC-003).
- Rewording the shared recreate message changes `upgrade`/`workspace apply` text too: accepted for one consistent wording; no machine reads it (only tests, updated).
- 10 s cadence lines vs per-second dots: readable in logs and PowerShell, never silent > 10 s.

## Risks

- RSK-001 `docker exec` hang (Docker daemon): unbounded, accepted limitation.
- RSK-002 no `pwsh` locally: PowerShell verified by text contract (and `pwsh` parse when present, as the existing suite does).
- Tests that wait for the 10 s update cost ~11 s; keep to one such case.

## Guidance For Implementation

- Reproduction to start from: `bash tickets/in-progress/docker-setup-code-wait-feedback/probes/silent-socket-attempt.sh <repo-root> 15` — `UNBOUNDED` today, `BOUNDED` after step 2.
- Tests (run: `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v`, plus the existing `test_public_docker_launcher_*.py`):
  - Import `fake_docker_environment`, `run_launcher`, `run_launcher_unchecked`, `write_node_state`, `write_fake_container` etc. from the shared test module (as `test_public_docker_launcher_update.py` does). Do not add code to that 1347-line file.
  - For attempts that need a real client (AC-004): put a small `docker` wrapper on `PATH` ahead of the fake, which for `exec <c> node -e <js> <socket>` runs `node -e <js> <test socket>` on the host against a test-owned Unix socket server (scripted: absent for the first N attempts, silent once, then answering `{"setupCode":…,"expiresAt":…}`), and delegates every other command to the shared fake by absolute path. Keep socket paths short (macOS 104-byte limit): use `/tmp/<short>`.
  - AC-005 at function level with a shortened `SETUP_CODE_WAIT_SECONDS` (source the modules, as `test_public_docker_launcher_stop.py` does), asserting the deadline counts seconds (e.g. with silent attempts of 5 s each and a 6 s budget the command ends after ≤ 2 attempts).
  - Assert on stdout vs stderr separately (AC-001, AC-003, AC-007).
  - PowerShell: text contract assertions for the timeout in `$Script:SetupCodeClientJs`, the stopwatch deadline, the waiting messages, `-NoUrls`, and `docker pull … | Out-Host`.
- Keep `docker-runtime.sh` under 500 lines (now 486).
- `log` writes to stdout; for wait messages use `log "…" >&2`.
- Never print an attempt's stdout except on success; the error kept for the final message is the attempt's stderr only.
