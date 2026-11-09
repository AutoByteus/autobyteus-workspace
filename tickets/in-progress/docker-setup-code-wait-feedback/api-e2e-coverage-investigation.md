# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/docker-setup-code-wait-feedback/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/docker-setup-code-wait-feedback/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/docker-setup-code-wait-feedback/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/docker-setup-code-wait-feedback/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `probes/silent-socket-attempt.sh`; `follow-ups.md` (FU-001, out of scope)
- Design Review Report: `N/A — not applicable` (direct route; no independent architecture review was selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/docker-setup-code-wait-feedback/implementation-handoff.md` (IR-001, IR-002)
- Implementation Revision Record: `tickets/in-progress/docker-setup-code-wait-feedback/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route; `task_size=Small`, `architectural_risk=Low`)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A` — Delivery paused finalization on this finding before producing a written delivery report; its finding is summarized in `implementation-revision-record.md` IR-002
- Relevant Delivery Revision IDs: `N/A` — none recorded yet
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2` (Local Fix re-validation)
- Trigger: implementation's IR-002 Local Fix handoff, in response to Delivery's finalization-stage finding (a PowerShell-only defect in `Show-SetupCodeOfRunningNode`'s wait loop) against my Round-1 `Pass` (`API-REV-001`)
- Prior Investigation Reviewed: `Yes` — this document's Round-1 content (API-REV-001), kept below, extended for Round 2
- Latest Authoritative Investigation: this document (Round 2 supersedes Round 1 where they differ; Round-1 content not touched by IR-002 stays authoritative)

## Round 2 — Local Fix Re-Validation (IR-002)

- Triggering finding (summarized from implementation's handoff, no numbered `DR-*` yet): under Windows
  PowerShell 5.1, `Show-SetupCodeOfRunningNode`'s `2>&1` capture of a failed attempt's own stderr, combined with
  this launcher's `$ErrorActionPreference = 'Stop'` (`Core.ps1`, `autobyteus-docker.ps1`), turns every failed
  attempt into a terminating `NativeCommandError`, aborting the wait loop on the first failed attempt instead of
  printing the waiting message and retrying (REQ-006, AC-006, QR-001). PowerShell 7 does not reproduce this
  (PowerShell/PowerShell PR #13361 changed this exact behavior between 5.1 and 7).
- Fix: the `docker exec` attempt now runs with `$ErrorActionPreference` temporarily set to `'Continue'`
  (saved/restored in a `try`/`finally`), so a failed attempt's stderr still reaches `$line` without becoming a
  terminating error. Bash launcher untouched.
- Changed files this round: `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` (the guard);
  `scripts/tests/test_public_docker_launcher_setup_code.py` (one new regex assertion on the existing
  `test_ac006_powershell_text_contract_...`, no new test method). Confirmed by
  `git diff --name-only b9e2eba51 63365f010` — no other source or test file changed.
- Scope re-check: Round 1's real-Docker journeys (API-05..API-08) exercised the **bash** launcher only
  (`autobyteus-docker.sh` / `commands.sh` / `docker-runtime.sh`), none of which changed this round. Per
  `TESTING.md`'s "Rerun by impact" rule, those cases are `Still Valid` and are not rerun this round — carried
  forward as-is into this round's result.
- Independent corroboration performed this round (beyond rerunning the implementation's own checks): I ran the
  *unguarded* (pre-IR-002) `2>&1`-under-`Stop` pattern myself on this machine's real `pwsh` 7.6.9 — the
  implementation's own smoke check (`IMP-07`) only showed the *guarded* pattern not throwing, and asserted
  without demonstrating that the unguarded form also doesn't throw on 7. My own run confirms it does not
  (`evidence/API-09-...`), so the guard is confirmed harmless-and-unnecessary on 7, not masking a
  reproducible-on-7 defect. I also independently researched PowerShell/PowerShell PR #13361 and the general
  Windows-PowerShell `2>&1`/`Stop` interaction to corroborate the claimed mechanism and the standard
  `Continue`-scoping workaround (which matches IR-002's fix exactly) from outside this ticket's own evidence.

## Current Requirement And Design Basis

`setup-code` (and `new-container`, same wait) must show each step it takes — image check/pull, recreate-or-start,
and the wait for the node — on standard error (bash) / host output (PowerShell), while `setup-code`'s own
standard output keeps holding only the code lines and never the URL block (REQ-001, REQ-003, BEH-001, BEH-002).
The wait prints a message as soon as the first attempt fails, then at least every 10 s, and is bounded by a
90-second wall-clock deadline rather than an attempt count (REQ-002, REQ-005, BEH-003). One request to the node's
control socket is bounded at 5 s (REQ-004, BEH-004). The code must never appear outside its one stdout line
(REQ-007, BEH-005, NAS-32, unchanged). PowerShell carries the same behavior (REQ-006). Design spec: no API,
socket-protocol, persistence, security, concurrency or deployment change; `start_node`/`Start-Node` gained a
`print_urls_flag`/`-NoUrls` switch, the wait loops became wall-clock-bounded, and the client JS gained a 5 s
socket timeout. Implementation handoff confirms these exact files changed and records Checks Run IMP-01..IMP-04
(Pass) plus two known risks: RSK-001 (unbounded `docker exec`/daemon hang, accepted) and RSK-002 (no local
`pwsh`; PowerShell verified by text contract only, re-run requested if `pwsh` becomes available).

Legacy / Compatibility Removal Check (implementation handoff): clean — no compatibility mechanism introduced,
the attempt-count loop and the `>/dev/null`/`| Out-Null` redirections were replaced, not kept alongside the new
code. Persisted Data Transition Check: `Not Affected` — no field, format or location changed; launcher state
files and named volumes are read/written exactly as before. Both are consistent with the requirements doc's
`Data Continuity And Acceptable Loss` (`Persisted or external data affected: No`) and the design spec's
`Persisted Data / State Transition Decision` (`Not Affected`). No active validation signal from either section.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (recreate path), SCN-002 (running current node), SCN-003 (restart
  policy / started elsewhere — same code path as SCN-002/SCN-004, not independently distinguishable from the
  launcher's own view), SCN-004 (`new-container`'s first code), SCN-005 (one silent attempt), SCN-006 (node never
  answers).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger: a real,
  disposable Docker node's **stopped-but-current** branch of `start_node` (`docker start` succeeds, not a
  recreate) — reached by `setup-code --name <node>` on a stopped node, the same trigger SCN-001/SCN-003 use. The
  implementation handoff's Known Risks flagged that the offline fake Docker always reports `State.Running=true`,
  so no fixture in this ticket's own suite independently reaches this branch; a real Docker daemon does (API-07).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded in
  the requirements doc.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 (stdout/stderr stream split, URL-block switch) | Changed | design-spec Relevant Behavior map; implementation diff `commands.sh`/`Commands.ps1` | New durable cases (bash); PS text contract + real `pwsh` parse; real-daemon cases close the mock gap |
| BEH-002 (recreate message wording) | Changed | implementation diff `docker-runtime.sh`/`DockerRuntime.ps1`; two pre-existing assertions updated in place | New case (bash, one branch); PS text contract (all three branches); other two bash branches execution-exercised by pre-existing upgrade tests without text assertion (minor, non-blocking — see Not Tested) |
| BEH-003 (waiting/cadence messages, wall-clock deadline) | Changed | `print_setup_code_of_running_node`/`Show-SetupCodeOfRunningNode` rewrite | New durable cases (bash, both timing points); PS text contract; real-daemon cases (API-05, API-07) |
| BEH-004 (5 s client-socket bound) | Changed | `SETUP_CODE_CLIENT_JS`/`$Script:SetupCodeClientJs` `setTimeout` | New durable case with a real `node` client against a real Unix socket; probe rerun |
| BEH-005 (code only on stdout, NAS-32) | Preserved | unchanged message construction; verified by reading the client JS | Existing `test_nas_03_nas_32_*` (regression-passed); new suite's own negative assertions; real-daemon grep check (API-08) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | node control-socket protocol unchanged (NA-5) | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | `docker pull`/`docker exec`/container start/recreate lifecycle, and the launcher's own wait-loop process | Offline fake-Docker suite (deterministic, mocks `docker` itself) | The fake Docker never actually runs `docker pull`/`docker exec`/container start; a real daemon could expose a redirection or quoting defect the fake can't | Live CLI run against a real, test-owned Docker node (never the user's) |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Docker CLI (`docker pull`, `docker exec`, `docker inspect`); Node.js client inside the container | Offline suite mocks `docker`; AC-004 already uses a real `node` client against a real Unix socket (no mock for the 5 s bound) | Real `docker pull`/`docker exec` output shape and timing were still unexercised before this round | Live CLI run (adopted this round) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback`
- Project type and runtime stack: monorepo; this ticket's surface is a bash + PowerShell CLI launcher
  (`scripts/public/docker/autobyteus-docker.d/`) with a Python `unittest` offline test layer and a Node.js
  one-liner client the launcher execs inside the Docker container.
- Project testing guideline path(s): root `TESTING.md` (already updated by implementation with the "Docker
  launcher (offline)" Test layers row: `python3 -m unittest discover -s scripts/tests -p
  'test_public_docker_launcher_*.py'`). No closer `TESTING*.md` between the root and `scripts/public/docker/`.
- Conflicting, missing, or unclear project instructions: none found this round beyond the design spec's
  already-recorded discrepancy (TESTING.md's Test layers table previously had no row for this layer — now
  fixed by implementation's own commit, independently confirmed present in `TESTING.md` this round).
- Changed build-input paths (TESTING.md's Fresh-start build list compared with `git diff --name-only 4da745ac4
  HEAD`): the literal glob `scripts/**` in that list matches the four changed launcher files and the two
  changed/added test files (all under `scripts/`). Judgement call, recorded as a discrepancy: a repository-wide
  search (`grep -rln "public/docker|autobyteus-docker" --include="*.yml" --include="Dockerfile*"
  --include="*.json" .`) found **no** reference to `scripts/public/docker/` anywhere in `.github/workflows/**`,
  any Dockerfile, or any `package.json` — these files are plain interpreted bash/PowerShell/Python, not compiled,
  bundled, or imported by any release build job, and nothing in this change adds a new cross-package import that
  a release typecheck would read. The Fresh-start build's own stated purpose ("a worktree build can pass only
  because an earlier setup step built a package's `dist/` ... that the runner does not have") does not apply:
  there is no build step at all in this change's own files, and a full fresh clone + `pnpm install
  --frozen-lockfile` + the desktop/server build job would exercise none of the changed lines. Fresh-Start Build
  Proof was not run this round for that reason; this paragraph is the recorded discrepancy. The literal-pattern
  false positive is worth a future refinement of the guideline's `scripts/**` entry, left as a non-blocking
  observation rather than a `follow-ups.md` entry (it is a testing-guideline note, not a product defect).
- Required environment variables or secrets available: `N/A` — no secrets; `pwsh` was not present at round
  start (installed this round, see below) and no Docker daemon or node was assumed to start (one was available
  and used for broader validation, never the user's own node).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` → Test layers | project testing guideline | `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` is the offline layer for this change |
| `TESTING.md` → Docker server nodes | project testing guideline | never test against the user's node/volumes; start a test-owned container from the same image, bound to `127.0.0.1` on a free port, fresh volumes; remove with `docker rm -f -v` afterwards |
| `TESTING.md` → Fresh-start build | project testing guideline | `scripts/**` literally matches; judged not applicable this round (see above); recorded as a discrepancy, not run |
| `design-spec.md` → Guidance For Implementation | upstream design | exact test commands, fixture helper names, and the macOS 104-byte Unix-socket-path limit, reused for my own real-daemon run's temp paths |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Offline fake-Docker suite | repo root | `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` | No daemon; a bash `docker` double on `PATH`; real `node` for the AC-004-shaped case | Process exit code / unittest result | Each test's own `tempfile.TemporaryDirectory` context manager |
| `pwsh` (PowerShell 7) | n/a | `brew install powershell` (this round; was not installed) | Pulled `dotnet` as a dependency; also upgraded `brotli`, `ca-certificates`, `openssl@4` as transitive dependency upgrades (recorded, see Notes) | `pwsh --version` → `PowerShell 7.6.9` | Durable dev-tool install; not removed (benefits every future ticket's PowerShell-parse coverage) |
| Real, test-owned Docker node | repo root | `bash scripts/public/docker/autobyteus-docker.d/../autobyteus-docker.sh new-container --image autobyteus/autobyteus-server --tag beta`, with `HOME`, `AUTOBYTEUS_DOCKER_STATE_DIR`, `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` pointed at a fresh `/tmp` root, and `DOCKER_HOST` set explicitly to the real Docker Desktop socket (`unix:///Users/normy/.docker/run/docker.sock`) so the real daemon is reached without reading the real `$HOME/.docker/config.json` | Already-cached `autobyteus/autobyteus-server:beta` image (no network pull needed); `next_node_name`/`container_exists` query the real daemon directly, so the real user node `autobyteus-server-0` (confirmed running, port 8001) was never a naming or port candidate — the test node landed on `autobyteus-server-1`, port 8002 | `docker ps`, `docker inspect`, the launcher's own `setup-code` output | `docker rm -f -v autobyteus-server-1`; `docker volume rm` its five named volumes; `rm -rf` the temp root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Offline fake Docker environment / state | `fake_docker_environment()`, `write_node_state`, `write_fake_container` (shared test module) | Fully test-owned temp dirs per test | Each test's own `TemporaryDirectory` |
| Real test-owned Docker node | the launcher's own `new-container` (auto-indexed name/port) | Bound to `127.0.0.1`; never the user's node/volumes/state; verified before and after (API-08) | `docker rm -f -v` + `docker volume rm` + temp-dir removal (API-08) |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_setup_code.py` (new, by implementation) | AC-001..AC-008: stdout/stderr split, no URL block, waiting/cadence messages, wall-clock deadline, real 5 s socket bound, PS text contract, `pwsh` parse | REQ-001..REQ-007 | `Still Valid` | API-01 (rerun, 9/9 pass incl. `pwsh` case now not skipped) | Keep; no change needed |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` — two wording assertions at (old) lines 346/423 | Updated in place to the new recreate wording; no lines added | BEH-002 | `Still Valid` | API-02 (rerun, full suite green) | Keep |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` — rest of the 1347-line suite (upgrade/destroy/workspace/ports/NAS-27/NAS-34/install/etc.) | Unrelated behavior; two consumers of `start_node` (`upgrade --all`, `workspace apply --all`) exercise the "image changed" and "config changed" recreate branches without asserting the exact new wording for the former | Out-of-scope behavior; BEH-002 indirectly | `Still Valid` (its own assertions); `Out Of Scope` for wording of the "image changed"/"predates tracking" branches specifically | API-02 | Keep as is — see Not Tested below for the minor wording-assertion gap |
| `scripts/tests/test_public_docker_launcher_update.py`, `test_public_docker_launcher_stop.py` | Unrelated commands (`update`, `stop`) | Out of scope | `Out Of Scope` | API-02 (regression-passed) | Keep |
| `probes/silent-socket-attempt.sh` | Reproduction of the unbounded client attempt; evidence artifact, not a `unittest` case | REQ-004 / AC-004 | `Still Valid` (design spec: "stays in the ticket folder as evidence; the test case supersedes it for regression") | API-03 | Keep as evidence; AC-004's durable test is the regression owner |
| `TESTING.md` → Test layers → "Docker launcher (offline)" row | Documents this layer and its command | Project documentation, not a test | `Still Valid` | read this round, matches the actual command | Keep |

## Planned Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..AC-006, AC-008 | Bash + PS launcher, offline | Reused | `IMP-02`: `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v` | Same commit's code (docs-only diff since IMP-02 ran); rerun anyway for independent confirmation, now with `pwsh` installed to also prove AC-006's `pwsh`-parse case |
| API-02 | all (regression) | Whole offline launcher suite | Reused | `IMP-03`: `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` | Same reason; closes the `pwsh`-parse skip in the pre-existing shared-workspace suite too |
| API-03 | AC-004, syntax | Bash files; client JS vs real socket | Reused | `IMP-04` + `IMP-01`: `bash -n` both changed files; rerun the probe (after-fix state) | Independent confirmation; before-fix state already proven by implementation, not re-broken here |
| API-04 | AC-001..AC-008 | — | — | (folded into API-01/API-02; no separate case) | — |
| API-05 | REQ-001, REQ-002, BEH-001, BEH-003 | Real Docker daemon, `new-container` | Journey | `new-container --image autobyteus/autobyteus-server --tag beta` against a real, test-owned node (isolated `HOME`/state/shared dirs, explicit `DOCKER_HOST`) | Closes the cross-boundary mock gap: the offline suite never runs a real `docker pull`/`docker exec` |
| API-06 | REQ-001, REQ-003, BEH-001 | Real Docker daemon, `setup-code` fast path | Journey | `setup-code --name <test-node>` against the same, still-running, current test node | Real-boundary equivalent of AC-003; proves the real stream split |
| API-07 | REQ-001, REQ-002, BEH-002, BEH-003 | Real Docker daemon, `setup-code`, stopped node | Journey | `docker stop <test-node>`, then `setup-code --name <test-node>` | Closes the implementation-noted fixture gap: the offline fake always reports `State.Running=true`, so the real "start a stopped container" branch was never independently exercised by any fixture |
| API-08 | REQ-007, BEH-005, isolation | Real Docker daemon | Journey (verification + cleanup) | grep the three real codes against each real stderr log; confirm the real user node/state untouched; remove the test-owned container/volumes/temp dirs | NAS-32 proof against the real boundary; confirms isolation and cleanup |
| API-09 | REQ-006, AC-006 (IR-002) | PowerShell (pwsh 7), scope-guard mechanism | Temporary Probe | run the unguarded `2>&1`-under-`Stop` pattern on real `pwsh` 7.6.9, compare against the implementation's guarded `IMP-07` result | Not durable: a one-off mechanism-comparison probe, not a product behavior to regress-test; independently confirms the guard is harmless-and-unnecessary on 7 rather than masking a 7-reproducible defect |
| API-10 | AC-001..AC-006, AC-008 (IR-002) | Bash + PS launcher, offline | Reused | `IMP-05`: `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v` | Same reasoning as `API-01`, on the IR-002 commit; independent rerun |
| API-11 | all (regression) | Whole offline launcher suite | Reused | `IMP-06`: `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` | Same reasoning as `API-02`, on the IR-002 commit |
| API-12 | AC-006; syntax | Bash syntax; real `pwsh` parse | Reused | `IMP-07`'s bash-syntax half + an independent real-`pwsh`-parse of the fixed `Commands.ps1` | Confirms bash unaffected; confirms the fixed file parses with a real parser, not only `unittest`'s own subprocess call to `pwsh` |

- Test progress log needed (more than one case, or a long case): `Yes`

## Durable Coverage To Add

None. The implementation's new `scripts/tests/test_public_docker_launcher_setup_code.py` already covers every
AC with durable, repository-resident cases at the right boundary (bash execution + real-socket client for the
critical 5 s bound; PS text contract + real `pwsh` parse for the twin). The real-Docker journeys (API-05..API-08)
are broader validation, not durable coverage: the project's `TESTING.md` has no fixture or harness for a
functional (non-parse) PowerShell execution against a fake or real Docker daemon anywhere in the repository —
building one would be new test architecture, out of this Small/Low-risk ticket's scope — and a one-off real-daemon
CLI journey is exactly the kind of case this skill's Broader Validation Execution Rules describe as a temporary
journey rather than new durable automation.

## Durable Coverage To Update

None this round.

## Durable Coverage To Remove

None this round.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: (1) create isolated `HOME`/`AUTOBYTEUS_DOCKER_STATE_DIR`/
  `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` temp dirs; (2) set `DOCKER_HOST` to the real Docker Desktop socket
  explicitly (so the override `HOME` does not break context resolution); (3) run `new-container --image
  autobyteus/autobyteus-server --tag beta` (already-cached image, no network pull needed); (4) run `setup-code`
  against the resulting node while running (API-06); (5) `docker stop` it and run `setup-code` again (API-07).
- Environment choices that materially affect the run: `next_node_name`/`container_exists` query the real Docker
  daemon directly (not just the isolated state dir), so the auto-indexed name/port never collided with the real
  user node (`autobyteus-server-0`, port 8001) even though the isolated state dir started empty.
- Health / readiness checks: the launcher's own `verify_container_started` (already exercised); confirmed via
  `docker ps`/`docker inspect` before and after.
- Seed data / fixtures: none beyond the already-cached `autobyteus/autobyteus-server:beta` image.
- Test identities, authentication, permissions, or session state: none needed — `setup-code` issues its own
  one-time code; no desktop-app pairing performed.
- Requirement-linked journeys or scenarios: SCN-001 (recreate — not reached; see Not Tested), SCN-002/SCN-003
  (running/restarted node), SCN-004 (`new-container`'s first code), real-world equivalent of the "start a stopped
  container" branch.
- DOM, screenshot, log, API, process, or other evidence to capture: captured full stdout/stderr per command,
  `docker ps`/`docker volume ls` before/after, and the NAS-32 grep check — see `evidence/API-05`..`API-08`.
- Owned processes and temporary state to clean up: the test-owned container `autobyteus-server-1`, its five named
  volumes, and the `/tmp/autobyteus-apie2e-real-docker.*` root — all removed and confirmed removed (API-08).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| SCN-001's real recreate path (the "a newer image was downloaded" or "predates launcher configuration tracking" recreate branches) against a real Docker daemon | Forcing a real recreate would require either a different image/tag (a real pull of a different image, not justified for this Small/Low-risk ticket) or deleting the test node's config-hash tracking; the offline suite already proves this branch's full output shape deterministically (API-01's AC-001), and the PowerShell text contract (AC-006) proves the exact wording of all three recreate reasons for the PS twin; real Docker exercise of the "config changed" recreate branch's existing-but-unasserted wording is covered functionally (not textually) by the pre-existing `upgrade --all`/`workspace apply --all` tests, which still pass (API-02) | Low — the message text is proven byte-for-byte by the offline bash case and the PS text contract; only the exact bash wording for the other two recreate reasons against a *real* daemon (as opposed to text/offline) is unexercised | No | None — residual low risk, not a product defect; noted for completeness |
| A live Docker daemon run of PowerShell (`pwsh`-driven `setup-code`/`new-container` against a real node) | No PowerShell-execution fixture or harness exists anywhere in this repository (confirmed by reading the whole shared test module); building one is new test architecture, out of this ticket's Small/Low-risk scope. `pwsh` parse (AC-006's real-syntax half) was closed this round (API-01/API-02) | Low — REQ-006 is proven by the text contract (byte-for-byte matching the bash wording) plus a real PowerShell parser; only full PowerShell *execution* against Docker is unproven, which was already true for the whole repository before this ticket (pre-existing project-wide limitation, not introduced here) | No | None — pre-existing, project-wide limitation; not a new gap from this change |
| RSK-001 (unbounded `docker exec`/Docker daemon hang) | Explicitly out of scope (requirements doc "Out Of Scope"; design spec escalation trigger did not fire) | Accepted, unchanged | No | None — carried forward, not this ticket's to fix |
| (Round 2) Windows PowerShell 5.1 itself, running the IR-002 guard | No PowerShell 5.1 (nor any Windows) runtime is available on this machine (macOS only); this is the specific platform the defect and fix target. The fix's mechanism is corroborated by: the exact guard-shape regex assertion (`AC-006`, now passing); a real `pwsh` 7.6.9 parse of the fixed file (`API-12`); my own direct, independent comparison on real `pwsh` 7.6.9 showing the unguarded and guarded forms behave identically there (`API-09`, confirms the guard is 7-harmless, not 7-necessary); and independent web research corroborating PowerShell/PowerShell PR #13361 and the general Windows-PowerShell `2>&1`/`Stop` interaction and its standard `Continue`-scoping workaround (matching IR-002's fix exactly) | Low-to-moderate — the mechanism is well-documented and the fix is the standard, narrow workaround; only its behavior under the one specific runtime it targets (5.1) is unproven by execution here | No | None — if the API/E2E or user environment ever has a Windows PowerShell 5.1 or 7 runtime, running `setup-code`/`new-container` with a scripted failing attempt through it would be the strongest remaining confirmation; not required to reach `Pass` given the corroborating evidence above |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: `N/A`
- Notes (Round 1): Fresh-Start Build Proof was evaluated and judged not applicable (literal `scripts/**` glob
  match, no actual build-input relevance — see Project Execution Discovery); `pwsh` was installed via
  `brew install powershell` to close the PowerShell-syntax confidence gap, which also upgraded three shared
  Homebrew dependencies (`brotli`, `ca-certificates`, `openssl@4`) as a side effect — a durable, additive
  dev-tool install, not touching any project data or running service.
- Notes (Round 2): a narrow, PowerShell-only Local Fix; bash launcher and the real-Docker journeys (API-05..API-08)
  are unaffected and carried forward as `Still Valid` without rerunning them (confirmed by `git diff
  --name-only` against the Round-1 commit). No Fresh-Start Build Proof re-check needed (same `scripts/**`
  judgement as Round 1; the one changed source file is still plain interpreted PowerShell, confirmed unreferenced
  by any release workflow, Dockerfile, or package manifest).
