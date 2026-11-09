# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, Architecture Design Complete handoff, round 1 | N/A | `Initial Baseline` | `SR-001` | Implemented; direct route to API/E2E |

## Revision Entries

### IR-001 — `setup-code` shows its steps and bounds its wait (both launchers)

- Triggering role, report path, and round: Solution Designer, `handoff-architecture-design-complete.md`, implementation round 1 (initial).
- Triggering finding IDs: `N/A` — initial baseline from approved design.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implementation Complete; `task_size=Small`, `architectural_risk=Low` confirmed; direct route to API/E2E (no Code Reviewer).
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A` — direct route, no independent architecture review selected.
- Related code-review revision IDs: `N/A` — direct route.
- Related API/E2E revision IDs: `N/A` — not yet performed.
- Related delivery revision IDs: `N/A` — not yet performed.
- Why this baseline or implementation revision is recorded: first implementation of the approved `design-spec.md` (SR-001) against the approved `requirements-doc.md` (SR-001).
- Approved behavior or requirement IDs affected: BEH-001..BEH-005, REQ-001..REQ-007, UC-001..UC-004, AC-001..AC-008.
- Implementation delta:
  - `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`: client JS gets a 5 s `setTimeout`; `print_setup_code_of_running_node` rewritten to a wall-clock deadline (90 s) with a waiting message after the first failed attempt and at least every 10 s, carrying the last attempt's error into the failure message; `print_setup_code` calls `start_node ... 0 >&2` (progress on stderr, URL block off) instead of `>/dev/null`.
  - `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`: `start_node` gets a third `print_urls_flag` (default `1`); its three `print_urls` calls are guarded by it; the three recreate/refresh log lines reworded to "Recreating the container of `<node>`: `<reason>`. Its named volumes are kept."
  - `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`: PowerShell twin of the above — client JS timeout, `Show-SetupCodeOfRunningNode` rewritten with `[Diagnostics.Stopwatch]`, `Show-SetupCode` calls `Start-Node ... -NoUrls` (no `| Out-Null`).
  - `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1`: `Start-Node` gets a `[switch]$NoUrls`; `& docker pull $ImageRef | Out-Host` (was unguarded, hidden by some callers' `| Out-Null`); three `Print-Urls` calls guarded; the same three log lines reworded.
  - `scripts/tests/test_public_docker_launcher_setup_code.py` (new): AC-001..AC-008.
  - `scripts/tests/test_public_docker_launcher_shared_workspace.py`: the two existing assertions on the old "Launcher config changed for ..." wording updated in place (lines 346, 423 before this change); no lines added to the file.
  - `TESTING.md`: added the "Docker launcher (offline)" Test layers row, committed on its own per that file's own rule.
- Changed files or areas: the four launcher modules above, one new test file, one existing test file (two in-place assertion edits), `TESTING.md`.
- Local validation and result: see `implementation-handoff.md` Checks Run (IMP-01..IMP-04); all passed on commit `2de5fa0873053f5044b2119cbd48c14ad8463087`.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route, Small + Low).
- Remaining limitations or risks: RSK-001 (`docker exec` / Docker daemon hang unbounded, accepted limitation, unchanged by this ticket); RSK-002 (no local `pwsh`; PowerShell verified by text contract only, `test_powershell_launcher_parses_when_pwsh_is_available` skipped locally in both suites); the "docker start" (stopped-but-current node) sub-path of `start_node` is not independently exercised by a new test because the shared fake Docker always reports `State.Running=true` — a pre-existing fixture limitation, not introduced by this ticket; its unchanged "Started `<node>`." message and the same stderr/no-URL-block redirection are already proven by the recreate-path and new-container tests.
