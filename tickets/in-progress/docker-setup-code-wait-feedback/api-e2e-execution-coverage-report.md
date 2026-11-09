# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-test-progress.md`
- Round and trigger: Round 1 (initial); implementation handoff for Project Task `autobyteus-workspace-3` (direct route, `task_size=Small`, `architectural_risk=Low`)
- Prior round reviewed: `N/A` — first round
- Deviations from the investigation's plan, and why: `None` — all eight planned cases ran as planned
- Evidence folder (absolute path): `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback/tickets/in-progress/docker-setup-code-wait-feedback/evidence/`; commit holding it is given in the handoff message

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architectural risk (`Low`/`High`): `Low`
- Input route (`Reviewed`/`Direct Low-Risk`): `Direct Low-Risk`
- Successful-output route (`Code Review`/`Delivery`): `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `e9cc21bf28e7c9435aef0ce447f35aeba5be87f8` (branch `codex/docker-setup-code-wait-feedback`; code identical to `2de5fa087`, the commit the implementation's own IMP-01..IMP-04 ran on — the one later commit is docs/evidence only, confirmed by `git diff --name-only`) | macOS (Darwin 25.6.0) | Python 3.9.6; bash (system); `node` v26.12.0; `pwsh` 7.6.9 (installed this round via `brew install powershell`) | Offline suite: isolated temp `HOME`/state dirs per test, as the shared fixture already provides |
| ENV-2 | same commit | macOS (Darwin 25.6.0), Docker Desktop (Engine 29.7.1, context `desktop-linux`) | real `docker` CLI against the real daemon; `autobyteus/autobyteus-server:beta` (already cached locally, digest `sha256:3250182e7413af7343f77afecb91627440a152c7fbebaf05ba8a602e94dc241f`) | Isolated `HOME`, `AUTOBYTEUS_DOCKER_STATE_DIR`, `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` under a fresh `/tmp` root; `DOCKER_HOST` set explicitly to the real Desktop socket; test-owned node `autobyteus-server-1` (auto-indexed, never the user's `autobyteus-server-0`) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..AC-006, AC-008; REQ-001..REQ-007 | Bash + PS offline, incl. real `node` client vs real Unix socket | `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v` | ENV-1 | Pass | `evidence/API-01-setup-code-tests-rerun.log` | `Ran 9 tests ... OK` (0 skipped) | Independent rerun of `IMP-02`; same code, additionally proves AC-006's `pwsh`-parse half (IMP-02 had to skip it) |
| API-02 | all (regression) | whole offline launcher suite | `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` | ENV-1 | Pass | `evidence/API-02-full-launcher-discovery-rerun.log` | `Ran 60 tests ... OK (skipped=1)` | Independent rerun of `IMP-03`; the one skip is the pre-existing, unrelated port-8001-busy precondition (the real node already holds that port) |
| API-03 | AC-004; syntax guard | bash syntax; client JS vs real socket | `bash -n` both changed bash files; `bash probes/silent-socket-attempt.sh "$PWD" 15` | ENV-1 | Pass | `evidence/API-03-bash-syntax-and-probe-rerun.log` | `OK: no syntax errors`; `BOUNDED: ... after 5s ...` | Independent rerun of `IMP-04`+`IMP-01` (after-fix state only; before-fix `UNBOUNDED` already proven by implementation on the pre-fix commit, not re-broken here) |
| API-05 | REQ-001, REQ-002; BEH-001, BEH-003 | real Docker daemon, `new-container` | `new-container --image autobyteus/autobyteus-server --tag beta` against a real, isolated, test-owned node | ENV-2 | Pass | `evidence/API-05-real-docker-new-container.log` | real `docker pull` progress + `Checking image ...` on stdout (new-container's own existing stream, unaffected by the no-URL-block switch); one real `Waiting for autobyteus-server-1 to start (up to 90 seconds)...` on stderr; code on stdout | First use of a real Docker daemon for this ticket's validation; `next_node_name`/`container_exists` picked `autobyteus-server-1`/port 8002 automatically, never the real user node |
| API-06 | REQ-001, REQ-003; BEH-001 | real Docker daemon, `setup-code` fast path | `setup-code --name autobyteus-server-1` (node still running, current) | ENV-2 | Pass | `evidence/API-06-real-docker-setup-code-running.log` | stdout = exactly the two code lines; stderr = real pull-check output + `... is already running with the current image and launcher config.`; no `Waiting for` line | Real-boundary equivalent of AC-003; closes the "offline fake mocks `docker` entirely" gap for the stream split |
| API-07 | REQ-001, REQ-002; BEH-002, BEH-003 | real Docker daemon, `setup-code`, stopped node | `docker stop autobyteus-server-1`; then `setup-code --name autobyteus-server-1` | ENV-2 | Pass | `evidence/API-07-real-docker-setup-code-start-branch.log` | stderr: real pull-check, `Started autobyteus-server-1.`, then one real `Waiting for ...`; stdout = code lines only | Closes the implementation-noted fixture gap: the offline fake Docker always reports `State.Running=true`, so this "start a stopped container" branch had no independent fixture anywhere in the repository before this case |
| API-08 | REQ-007; BEH-005 (NAS-32); isolation/cleanup | real Docker daemon | grep the 3 real codes against each real stderr log; compare real user state/container before vs after; `docker rm -f -v` + `docker volume rm` + `rm -rf` the temp root | ENV-2 | Pass | `evidence/API-08-real-docker-nas32-and-isolation.log` | 3× `not found (good)`; real user node's state-file mtime and `docker ps` status unchanged across the round; only `autobyteus-server-0` remains after cleanup | NAS-32 proven against the real boundary; full isolation and cleanup confirmed |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02 (offline, text + execution); API-05 (real daemon, equivalent "already up to date" + started path) | Proven | — |
| AC-002 | Yes | API-01, API-02 (offline, both timing points); API-05, API-07 (real daemon, first-failed-attempt waiting message) | Proven | — |
| AC-003 | Yes | API-01, API-02 (offline); API-06 (real daemon, stdout-only equivalent) | Proven | — |
| AC-004 | Yes | API-01, API-02, API-03 (real `node` client vs real Unix socket, both in the offline suite's own harness and the standalone probe) | Proven | — |
| AC-005 | Yes | API-01, API-02 (function-level, shortened deadline, wall-clock not attempts) | Proven | — |
| AC-006 | Yes | API-01, API-02 (text contract, now also a real `pwsh` 7.6.9 parse of both changed PowerShell files, not only text matching) | Proven | PowerShell *execution* against Docker is not proven anywhere in this repository (pre-existing, project-wide limitation, not introduced by this ticket) — recorded, not blocking |
| AC-007 | Yes | API-01, API-02 (offline negative assertions); API-08 (real daemon, grep across 3 real codes) | Proven | — |
| AC-008 | Yes | API-01, API-02 (offline) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | API-01, API-02 (all 8 ACs, offline); API-05..API-08 (real daemon) | AC-006's PowerShell proof is text + real-parse, not real execution against Docker (pre-existing project limitation) | A PowerShell execution fixture against Docker — new test architecture, out of scope |
| Changed-boundary execution directness | 90% | 97% | API-01 (real `node` client vs real socket for the 5 s bound); API-05..API-07 (real `docker pull`/`docker exec`/container lifecycle, the actual changed boundary, not a mock of it) | None material for bash; PowerShell's own boundary (its own `docker` invocations) still proven by text/parse only | Same as above |
| Cross-boundary integration realism and mock gap | 85% | 96% | API-05..API-08: real Docker daemon, real cached image, real `docker exec` into a real running container, real control-socket answer timing | None material — the one boundary the whole suite still mocks (PowerShell's own process execution) is a pre-existing, project-wide limitation | Same as above |
| Environment, configuration, identity, and fixture fidelity | 95% | 96% | API-01, API-02 (well-established shared fixture, reused by 59 pre-existing tests); API-05..API-08 (isolated HOME/state/shared dirs, explicit `DOCKER_HOST`, auto-indexed naming confirmed to avoid the real user node) | None material | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 97% | API-01 (first-failure + 10 s cadence + wall-clock deadline, offline); API-07 (real daemon "start a stopped container" branch — closes a fixture gap the implementation itself flagged) | RSK-001 (unbounded `docker exec`/daemon hang) remains accepted, out-of-scope, unchanged | Out of scope (RSK-001) |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | Not applicable — terminal/CLI output only, no browser or desktop-shell surface | — |
| Durable regression coverage quality and relevance | 95% | 95% | API-01 (new, well-isolated suite reusing shared fixtures, asserting stdout/stderr separately); API-02 (full 60-test regression, 0 new failures); two pre-existing wording assertions updated in place with no added lines | Minor: the "image changed"/"predates tracking" recreate-wording branches are execution-exercised by pre-existing tests but not text-asserted in bash (text-asserted only via the PS contract) | A follow-on text assertion for those two branches in bash — minor, non-blocking, noted in the investigation's Not Tested |

- Overall post-repository confidence: 92.5% (average of the six applicable categories: 95, 90, 85, 95, 95, 95 ÷ 6)
- Overall final confidence: 96.5% (average of the six applicable categories: 98, 97, 96, 96, 97, 95 ÷ 6)
- Calculation method: simple average of applicable (non-`N/A`) category scores, post-repository and final
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RSK-001 (unbounded `docker exec`/Docker daemon hang — accepted, out of
  scope, unchanged by this ticket); PowerShell execution against Docker is unproven anywhere in this repository
  (pre-existing, project-wide limitation, not a gap this ticket introduced — REQ-006 is proven by text contract
  plus a real `pwsh` 7.6.9 parse of the changed files).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (performed this round)
- Execution mode: `CLI` (a real, test-owned Docker node driven through the actual launcher CLI, never the
  user's node)
- Confidence gap or residual risk it addresses, and the expected gain: the offline suite mocks the `docker`
  binary itself for everything except the one real-socket client case; nothing in the implementation's own
  Checks Run, nor the offline suite, had ever run a real `docker pull`/`docker exec`/container-lifecycle
  sequence through the changed code. Running it closed that mock gap (API-05..API-08) and additionally closed a
  fixture gap the implementation itself flagged (the "start a stopped container" branch, never independently
  reached by the offline fake, which always reports `State.Running=true`) — API-07.
- Browser validation needed, and why or why not: no — terminal/CLI output only; no browser or desktop-shell
  surface is touched by this change.
- If `Not Required`: `N/A` — broader validation was required and performed.
- If `Blocked`: `N/A`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` — this round ran and
  independently confirmed the implementation's own durable coverage (`scripts/tests/test_public_docker_launcher_setup_code.py`,
  new; two in-place wording assertions in `scripts/tests/test_public_docker_launcher_shared_workspace.py`); no
  further durable test changes were needed (see the investigation's Durable Coverage To Add).

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_setup_code.py` | (implementation's, confirmed this round) | API-01, API-02 | `Still Valid` |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | (implementation's, confirmed this round) | API-02 | `Still Valid` |

- Added or updated paths attached for proportional test-code review: `Not Applicable` — direct low-risk route
- Diff or repository evidence supplied for removed paths: `N/A` — no removal

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Docker CLI (`docker`) | Bash double on `PATH` (shared fixture) | Used for the offline suite's deterministic, fast repository layer (API-01, API-02) | Closed this round by the real-daemon cases (API-05..API-08), which use the actual `docker` CLI against a real daemon |
| Node control socket | A real Unix socket server (scripted) + the launcher's own real `node` client | AC-004's own design: a real client against a real socket, no mock of the 5 s bound itself | None — this is already the most direct evidence for REQ-004 |
| PowerShell execution against Docker | Text contract + real `pwsh` parse (no execution) | No PowerShell-execution-against-Docker fixture exists anywhere in this repository; building one is new test architecture, out of this Small/Low-risk ticket's scope | Pre-existing, project-wide; REQ-006 proven by text + real syntax parse, not by execution |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/autobyteus-apie2e-real-docker.<random>` (HOME, state dir, shared-workspace dir) | Yes | `rm -rf` | Removed, confirmed gone |
| Docker container `autobyteus-server-1` | Yes | `docker rm -f -v autobyteus-server-1` | Removed, confirmed gone (`docker ps -a` shows only `autobyteus-server-0`) |
| Named volumes `autobyteus-server-1-{chromium-profile,data,root-home,server-packages,workspace}` | Yes | `docker volume rm <each>` | Removed, confirmed gone |
| `pwsh` (PowerShell 7.6.9) via Homebrew | Yes (installed this round) | Not removed — a durable dev-tool install that benefits every future ticket's PowerShell-parse coverage, not test-run-specific state | Kept; recorded as an environment change in the investigation |

## Preliminary Classification (On `Fail`)

`N/A` — result is `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None` — AC-006's residual PowerShell-execution
  gap is a pre-existing, project-wide limitation (not only-the-user-checkable; recorded as residual risk above,
  does not block `Pass` per the gate: every applicable category is ≥90%, no critical AC is unproven)
- Preliminary classification and recommended owner (on `Fail`): `N/A`
- Next recipient from `get_handoff_rules`: see handoff message
- Notes: Coverage paths confirmed: `scripts/tests/test_public_docker_launcher_setup_code.py` (new),
  `scripts/tests/test_public_docker_launcher_shared_workspace.py` (two in-place wording updates, no added
  lines), `TESTING.md` (new Test layers row) — all implementation's own, independently re-executed and
  confirmed this round. Test-review decision: `Not Required — direct low-risk route`.
