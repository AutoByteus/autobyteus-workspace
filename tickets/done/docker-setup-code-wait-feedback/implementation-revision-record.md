# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, Architecture Design Complete handoff, round 1 | N/A | `Initial Baseline` | `SR-001` | Implemented; direct route to API/E2E |
| IR-002 | Delivery Engineer, Local Fix message during finalization, round 2 | N/A (no `DR-*` record yet; Delivery paused before its finalization docs) | `Local Fix` | `SR-001`, `API-REV-001` | Implemented; direct route to API/E2E for re-validation |

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

### IR-002 — PowerShell wait loop no longer aborts on a failed attempt under `$ErrorActionPreference = 'Stop'`

- Triggering role, report path, and round: Delivery Engineer, Local Fix message during finalization (no written report path; delivery paused before producing finalization docs), implementation round 2.
- Triggering finding IDs: `N/A` — reported inline in Delivery's message, not as a numbered finding; summarized here: Windows PowerShell 5.1 wraps a native command's `2>&1` stderr lines as ErrorRecords, and `$ErrorActionPreference = 'Stop'` (`Core.ps1:2`, `autobyteus-docker.ps1:6`) then turns a failed attempt's own stderr into a terminating `NativeCommandError`, aborting `Show-SetupCodeOfRunningNode`'s wait loop on the first failed attempt instead of printing the waiting message and retrying.
- Classification: `Local Fix`
- Prior authoritative result: IR-001's `Show-SetupCodeOfRunningNode` (`2>&1` with no guard around `$ErrorActionPreference`).
- Current authoritative result: Implementation Complete; `task_size=Small`, `architectural_risk=Low` unchanged; direct route to API/E2E for re-validation.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `API-REV-001` (the round whose finalization-stage audit by Delivery surfaced this, after API/E2E's own Pass)
- Related delivery revision IDs: `N/A` — none recorded yet; Delivery paused finalization on this finding.
- Why this baseline or implementation revision is recorded: fixes a defect this ticket introduced (REQ-006 / AC-006, QR-001 — the PowerShell twin must behave the same as the bash launcher) that was not caught by the offline suite because `pwsh` was not installed when IR-001 ran, and cannot be reproduced on PowerShell 7 at all (PowerShell PR #13361 changed this exact behavior between 5.1 and 7).
- Approved behavior or requirement IDs affected: REQ-006, AC-006, QR-001 (no change to BEH-001..BEH-005 or the bash launcher).
- Implementation delta: `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`, `Show-SetupCodeOfRunningNode` — the `docker exec` attempt now runs with `$ErrorActionPreference` temporarily set to `'Continue'` (saved before, restored in a `finally` right after), so a failed attempt's stderr still reaches `$line` via `$answer`'s `[string]` conversion without becoming a terminating error. `$LASTEXITCODE` and NAS-32 (nothing but the code line carries the code) are unaffected. `scripts/tests/test_public_docker_launcher_setup_code.py`, `test_ac006_powershell_text_contract_...` — added a regex assertion for the guard's exact shape (save/`Continue`/`try`/call/`finally`/restore) around the `docker exec` line.
- Changed files or areas: one PowerShell file (the twin only; bash unaffected, confirmed by an unchanged `bash -n` result), one existing test file (assertion addition only, no new test method).
- Local validation and result: see `implementation-handoff.md` Checks Run (IMP-05..IMP-07); all passed on commit `0b0195deced6e1dc262fde8e107b01042bfc723b`. `pwsh` 7.6.9 is now installed, so both suites' previously-skipped PowerShell-parse tests ran for real and passed, confirming the new guard is valid PowerShell. A standalone pwsh smoke check (IMP-07) further confirms the guard pattern captures `$LASTEXITCODE` and the stderr text without throwing under `Stop`, and that pwsh 7 behaves identically with or without the guard — consistent with Delivery's finding that pwsh 7 cannot reproduce the original defect.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route, Small + Low, per the team's handoff rules for a direct-route Local Fix).
- Remaining limitations or risks: Windows PowerShell 5.1 itself stays unproven — no 5.1 runtime is available on this machine (macOS). The guard is proven by the text contract (its exact shape), the pwsh 7 parse and smoke checks, and the documented PowerShell 5.1/7 behavior difference (PR #13361), not by running the fix under 5.1 itself. This matches Delivery's own framing: the mechanism is documented, not independently reproduced, and the fix is a narrow, harmless-on-7 scope guard rather than a behavior change needing deeper proof. RSK-001 and RSK-002 (design spec) are otherwise unchanged by this round.
