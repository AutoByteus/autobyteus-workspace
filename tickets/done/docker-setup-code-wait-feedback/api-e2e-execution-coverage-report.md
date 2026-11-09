# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-test-progress.md`
- Round and trigger: Round 2 (Local Fix re-validation); implementation's IR-002 handoff, fixing a PowerShell-only
  defect Delivery found during finalization of my Round-1 Pass (API-REV-001): `Show-SetupCodeOfRunningNode`'s
  `2>&1` capture of a failed attempt's stderr became a terminating error under Windows PowerShell 5.1's
  `$ErrorActionPreference = 'Stop'`, aborting the wait loop instead of retrying (REQ-006, AC-006, QR-001)
- Prior round reviewed: Round 1 (`API-REV-001`, this same report, Pass, 96.5% final confidence)
- Deviations from the investigation's plan, and why: `None` — Round 2's four planned cases (API-09..API-12) ran
  as planned; Round 1's real-Docker journeys (API-05..API-08) were correctly not rerun (bash launcher unchanged
  by this PowerShell-only fix; see the investigation's Round 2 section)
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
| ENV-3 (Round 2) | `63365f010a14e9b2ad38d69680bbb0f656567012` (branch `codex/docker-setup-code-wait-feedback`; IR-002, the PowerShell-only Local Fix) | macOS (Darwin 25.6.0) | Python 3.9.6; bash (system); `pwsh` 7.6.9 | No PowerShell 5.1 (nor any Windows) runtime available — the one platform the IR-002 fix specifically targets stays unproven by execution here, mitigated by corroborating evidence (see Cases, AC-006) |

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
| API-09 | REQ-006, AC-006 (IR-002) | PowerShell scope-guard mechanism, real `pwsh` 7 | run the unguarded (pre-IR-002) `2>&1`-under-`Stop` pattern on real `pwsh` 7.6.9 | ENV-3 | Pass | `evidence/API-09-pwsh7-guard-vs-unguarded-comparison.log` | `no throw: LASTEXITCODE=1 answer=[err-text]` (no `THREW:` line) | Independent comparison the implementation's own `IMP-07` did not run: confirms the guarded and unguarded forms behave identically on real `pwsh` 7, so the guard is confirmed 7-harmless rather than masking a 7-reproducible defect; also corroborated by independent web research into PowerShell/PowerShell PR #13361 and the standard `Continue`-scoping workaround (cited in the coverage investigation's Round 2 section, not re-quoted here) |
| API-10 | AC-001..AC-006, AC-008 (IR-002) | Bash + PS offline | `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v` | ENV-3 | Pass | `evidence/API-10-setup-code-tests-rerun-ir002.log` | `Ran 9 tests ... OK` (0 skipped) | Independent rerun of `IMP-05`; confirms the `test_ac006_...` guard-shape regex assertion passes against the fixed `Commands.ps1` |
| API-11 | all (regression) | whole offline launcher suite | `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` | ENV-3 | Pass | `evidence/API-11-full-launcher-discovery-rerun-ir002.log` | `Ran 60 tests ... OK (skipped=1)` | Independent rerun of `IMP-06`; 0 regressions from the PowerShell-only fix |
| API-12 | AC-006; syntax | bash syntax (regression); real `pwsh` parse | `bash -n` both bash files; real `pwsh` parse of the fixed `Commands.ps1` | ENV-3 | Pass | `evidence/API-12-bash-syntax-and-real-pwsh-parse-ir002.log` | `OK: no syntax errors`; `Commands.ps1 parses OK` | Confirms bash unaffected; confirms the fixed file parses with an independent real `pwsh` invocation, not only the one `unittest` itself shells out to |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02 (offline, text + execution); API-05 (real daemon, equivalent "already up to date" + started path) | Proven | — |
| AC-002 | Yes | API-01, API-02 (offline, both timing points); API-05, API-07 (real daemon, first-failed-attempt waiting message) | Proven | — |
| AC-003 | Yes | API-01, API-02 (offline); API-06 (real daemon, stdout-only equivalent) | Proven | — |
| AC-004 | Yes | API-01, API-02, API-03 (real `node` client vs real Unix socket, both in the offline suite's own harness and the standalone probe) | Proven | — |
| AC-005 | Yes | API-01, API-02 (function-level, shortened deadline, wall-clock not attempts) | Proven | — |
| AC-006 | Yes | API-01, API-02, API-10, API-11, API-12 (text contract incl. the IR-002 guard-shape regex; real `pwsh` 7.6.9 parse); API-09 (independent guarded-vs-unguarded comparison on real `pwsh` 7) | Proven | PowerShell *execution* against Docker, and the IR-002 fix's behavior under Windows PowerShell 5.1 specifically, are not proven by execution anywhere in this repository or on this machine (pre-existing/platform limitation, not introduced by this ticket) — mitigated by the guard-shape regex, real `pwsh` 7 parse, my own guarded-vs-unguarded comparison, and independent corroboration of the documented PowerShell 5.1/7 mechanism (PR #13361); recorded, not blocking |
| AC-007 | Yes | API-01, API-02 (offline negative assertions); API-08 (real daemon, grep across 3 real codes) | Proven | — |
| AC-008 | Yes | API-01, API-02 (offline) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

Round 1 (`API-REV-001`) scores are kept for the record; Round 2 (`API-REV-002`, this Local Fix re-validation)
scores below are the current, authoritative ones.

### Round 1 (`API-REV-001`) — for the record

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | API-01, API-02 (all 8 ACs, offline); API-05..API-08 (real daemon) | AC-006's PowerShell proof is text + real-parse, not real execution against Docker (pre-existing project limitation) | A PowerShell execution fixture against Docker — new test architecture, out of scope |
| Changed-boundary execution directness | 90% | 97% | API-01 (real `node` client vs real socket for the 5 s bound); API-05..API-07 (real `docker pull`/`docker exec`/container lifecycle, the actual changed boundary, not a mock of it) | None material for bash; PowerShell's own boundary (its own `docker` invocations) still proven by text/parse only | Same as above |
| Cross-boundary integration realism and mock gap | 85% | 96% | API-05..API-08: real Docker daemon, real cached image, real `docker exec` into a real running container, real control-socket answer timing | None material — the one boundary the whole suite still mocks (PowerShell's own process execution) is a pre-existing, project-wide limitation | Same as above |
| Environment, configuration, identity, and fixture fidelity | 95% | 96% | API-01, API-02 (well-established shared fixture, reused by 59 pre-existing tests); API-05..API-08 (isolated HOME/state/shared dirs, explicit `DOCKER_HOST`, auto-indexed naming confirmed to avoid the real user node) | None material | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 97% | API-01 (first-failure + 10 s cadence + wall-clock deadline, offline); API-07 (real daemon "start a stopped container" branch — closes a fixture gap the implementation itself flagged) | RSK-001 (unbounded `docker exec`/daemon hang) remains accepted, out-of-scope, unchanged | Out of scope (RSK-001) |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | Not applicable — terminal/CLI output only, no browser or desktop-shell surface | — |
| Durable regression coverage quality and relevance | 95% | 95% | API-01 (new, well-isolated suite reusing shared fixtures, asserting stdout/stderr separately); API-02 (full 60-test regression, 0 new failures); two pre-existing wording assertions updated in place with no added lines | Minor: the "image changed"/"predates tracking" recreate-wording branches are execution-exercised by pre-existing tests but not text-asserted in bash (text-asserted only via the PS contract) | A follow-on text assertion for those two branches in bash — minor, non-blocking, noted in the investigation's Not Tested |

Round 1: overall post-repository confidence 92.5% (95+90+85+95+95+95 ÷ 6); overall final confidence 96.5%
(98+97+96+96+97+95 ÷ 6).

### Round 2 (`API-REV-002`) — current, authoritative

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | 98% | API-10, API-11 (offline rerun, all 8 ACs incl. the new AC-006 guard-shape regex); API-01, API-02, API-05..API-08 (Round 1, unaffected and carried forward) | Unchanged from Round 1: AC-006's PowerShell proof is text + real-parse + mechanism corroboration, not real execution against Docker | Same as Round 1 |
| Changed-boundary execution directness | 92% | 95% | API-09 (independent guarded-vs-unguarded comparison on real `pwsh` 7, the actual mechanism IR-002 changes); API-12 (real `pwsh` parse of the fixed file) | IR-002's one changed boundary (the `$ErrorActionPreference` scope guard) is proven on real `pwsh` 7, where the original defect cannot reproduce either way; its behavior under the one runtime that can actually show the original defect (Windows PowerShell 5.1) is not executed | A Windows PowerShell 5.1 or 7 runtime, if one becomes available, running `setup-code` against a scripted failing attempt |
| Cross-boundary integration realism and mock gap | 90% | 94% | API-09 (real native-command `2>&1`/`Stop` interaction, not a mock); independent web corroboration of PowerShell PR #13361 and the documented 5.1 behavior (cited in the coverage investigation) | Same as above — the 5.1-specific runtime boundary is corroborated, not executed, on this machine | Same as above |
| Environment, configuration, identity, and fixture fidelity | 96% | 96% | API-10, API-11 (same well-established shared fixture); unaffected Round-1 real-Docker fidelity carried forward | None material | — |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 97% | API-09, API-10 (the exact failure/retry behavior IR-002 fixes — a failed attempt's stderr must not abort the loop — proven by the regex shape, the real-`pwsh` comparison, and the full offline suite's AC-002/AC-008 timing cases, all still green) | RSK-001 (unchanged, out of scope); the 5.1-specific execution gap above | Out of scope (RSK-001); same 5.1-runtime note above |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | Not applicable — terminal/CLI output only | — |
| Durable regression coverage quality and relevance | 95% | 96% | API-10 (the existing `test_ac006_...` case extended by one regex assertion, no new test method — proportional, narrow); API-11 (full 60-test regression, 0 new failures) | Same minor Round-1 note (two bash recreate-wording branches not text-asserted in bash) | Same as Round 1 |

- Overall post-repository confidence (Round 2): 94.3% (97+92+90+96+96+95 ÷ 6)
- Overall final confidence (Round 2): 96.0% (98+95+94+96+97+96 ÷ 6)
- Calculation method: simple average of applicable (non-`N/A`) category scores, post-repository and final
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RSK-001 (unbounded `docker exec`/Docker daemon hang — accepted, out of
  scope, unchanged); PowerShell execution against Docker, and IR-002's fix specifically under Windows
  PowerShell 5.1, are unproven by execution anywhere in this repository or on this machine (platform
  limitation — no 5.1/Windows runtime available; mitigated by the guard-shape regex, a real `pwsh` 7 parse, an
  independent guarded-vs-unguarded comparison on real `pwsh` 7, and independent corroboration of the
  documented PowerShell 5.1/7 mechanism, PR #13361).

## Broader Validation Decision (Mandatory)

### Round 1 (for the record)

- Decision: `Required` (performed)
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

### Round 2 (current)

- Decision: `Required` (performed — a narrower probe, not a full live-system journey)
- Execution mode: `CLI` (a direct, real `pwsh` 7 comparison of the guarded vs. unguarded native-command
  pattern, plus independent corroboration of the documented PowerShell 5.1/7 mechanism)
- Confidence gap or residual risk it addresses, and the expected gain: closes the risk that the implementation's
  own `IMP-07` smoke check (guarded pattern only) was silently relying on an unverified "pwsh 7 tolerates the
  unguarded form too" claim; running the unguarded form myself (API-09) confirms that claim directly, so the
  guard is confirmed harmless-and-unnecessary on 7 rather than possibly masking a 7-reproducible defect. Round
  1's real-Docker journeys (API-05..API-08) were re-evaluated, not rerun: the bash launcher they exercise is
  unchanged by this PowerShell-only fix (confirmed by `git diff --name-only`), so they remain `Still Valid` per
  `TESTING.md`'s "Rerun by impact" rule.
- Browser validation needed, and why or why not: no — terminal/CLI output only; unchanged from Round 1.
- If `Not Required`: `N/A` — broader validation (the API-09 probe) was required and performed.
- If `Blocked`: `N/A` — Windows PowerShell 5.1 execution itself is a residual, platform-level gap (see the
  confidence scorecard), not a blocker to this round's `Pass`: every applicable category stays ≥90%, and the
  fix's own mechanism is corroborated rather than guessed at.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` — this round ran and
  independently confirmed the implementation's own durable coverage (`scripts/tests/test_public_docker_launcher_setup_code.py`,
  new; two in-place wording assertions in `scripts/tests/test_public_docker_launcher_shared_workspace.py`); no
  further durable test changes were needed (see the investigation's Durable Coverage To Add).

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_setup_code.py` | (implementation's, confirmed Round 1) | API-01, API-02 | `Still Valid` |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | (implementation's, confirmed Round 1) | API-02 | `Still Valid` |
| `scripts/tests/test_public_docker_launcher_setup_code.py` — `test_ac006_powershell_text_contract_...` extended with IR-002's guard-shape regex | (implementation's, confirmed Round 2) | API-10, API-11 | `Still Valid`; one assertion added to an existing test method, no new method |

- Added or updated paths attached for proportional test-code review: `Not Applicable` — direct low-risk route
- Diff or repository evidence supplied for removed paths: `N/A` — no removal

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Docker CLI (`docker`) | Bash double on `PATH` (shared fixture) | Used for the offline suite's deterministic, fast repository layer (API-01, API-02) | Closed this round by the real-daemon cases (API-05..API-08), which use the actual `docker` CLI against a real daemon |
| Node control socket | A real Unix socket server (scripted) + the launcher's own real `node` client | AC-004's own design: a real client against a real socket, no mock of the 5 s bound itself | None — this is already the most direct evidence for REQ-004 |
| PowerShell execution against Docker | Text contract + real `pwsh` parse (no execution) | No PowerShell-execution-against-Docker fixture exists anywhere in this repository; building one is new test architecture, out of this Small/Low-risk ticket's scope | Pre-existing, project-wide; REQ-006 proven by text + real syntax parse, not by execution |
| Windows PowerShell 5.1 (the IR-002 fix's specific target runtime) | Real `pwsh` 7 comparison (guarded vs. unguarded, API-09) + independent web corroboration of the documented 5.1/7 mechanism (PR #13361) | No Windows PowerShell 5.1 (or any Windows) runtime available on this machine (macOS only) | Platform limitation; the defect and fix are corroborated by mechanism and text shape, not executed under 5.1 itself — the strongest further step would be a Windows PowerShell 5.1 or 7 runtime, if one becomes available |

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

This section reflects Round 2 (`API-REV-002`), the current authoritative result; Round 1 (`API-REV-001`) was
also `Pass` and is kept in the sections above for the record.

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None` — AC-006's residual gap (PowerShell
  execution against Docker in general, and IR-002's fix specifically under Windows PowerShell 5.1) is a
  pre-existing/platform limitation, not only-the-user-checkable; recorded as residual risk above, does not
  block `Pass` per the gate: every applicable category is ≥90%, no critical AC is unproven
- Preliminary classification and recommended owner (on `Fail`): `N/A`
- Next recipient from `get_handoff_rules`: see handoff message
- Notes: Coverage paths confirmed this round: `scripts/tests/test_public_docker_launcher_setup_code.py`
  (`test_ac006_powershell_text_contract_...` extended with IR-002's guard-shape regex, one assertion, no new
  test method) — implementation's own, independently re-executed and confirmed. Round 1's coverage paths
  (`scripts/tests/test_public_docker_launcher_shared_workspace.py`, `TESTING.md`) are unaffected by this
  PowerShell-only Local Fix and remain `Still Valid`. Test-review decision: `Not Required — direct low-risk
  route` (classification unchanged: `task_size=Small`, `architectural_risk=Low`).
