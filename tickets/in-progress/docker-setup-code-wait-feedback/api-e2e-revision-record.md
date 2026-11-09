# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer / `implementation-handoff.md` (IR-001) / Round 1 | SR-001, IR-001 | N/A | Pass / 96.5% |
| API-REV-002 | implementation engineer / `implementation-handoff.md` (IR-002, Local Fix) / Round 2 | SR-001, IR-002, API-REV-001 | Pass / 96.5% | Pass / 96.0% |

## Revision Entries

### API-REV-001 — Initial independent validation of the setup-code progress/wait/bound fix

- Triggering role, report path, and round: implementation engineer handed off
  `implementation-handoff.md` (IR-001) for Project Task `autobyteus-workspace-3`, direct route
  (`task_size=Small`, `architectural_risk=Low`); Round 1 (initial, first API/E2E validation of this package).
- Triggering finding or case IDs: `N/A` — not a rerun of a prior finding.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs:
  `SR-001` (requirements/design), `IR-001` (implementation); architecture-review and code-review: `N/A — not
  applicable` (direct route).
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E validation round for
  this package.
- Coverage decisions or durable test paths changed: none added/updated/removed by this round; the
  implementation's own new suite (`scripts/tests/test_public_docker_launcher_setup_code.py`) and its two
  in-place wording updates (`scripts/tests/test_public_docker_launcher_shared_workspace.py`) were reviewed and
  classified `Still Valid`.
- Cases added, changed, removed, or rechecked: `API-01`..`API-03` (independent reruns of the implementation's
  `IMP-02`..`IMP-04`/`IMP-01`, on the same code); `API-05`..`API-08` (new — real-Docker-daemon broader
  validation, closing the offline suite's mock gap and the implementation-noted "start a stopped container"
  fixture gap).
- Commands, environment, fixture, or broader-validation delta: `pwsh` 7.6.9 installed this round
  (`brew install powershell`) — closes AC-006's PowerShell real-syntax-parse gap, which the implementation had
  to skip for lack of `pwsh`. A real, test-owned Docker node (`autobyteus-server-1`) was created, exercised,
  and fully removed against the real Docker Desktop daemon, isolated from and never touching the user's own
  node (`autobyteus-server-0`).

#### Prior Failure Resolution

None — first round, no prior failure to resolve.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (new, this round),
  `api-e2e-execution-coverage-report.md` (new, this round), `api-e2e-test-progress.md` (new, this round).
- Prior result and confidence (`N/A` for `API-REV-001`): `N/A`
- Current result and confidence: `Pass` / overall final confidence `96.5%` (post-repository `92.5%`)
- New or remaining failure IDs: `None`
- Recommended owner: `N/A` — result is `Pass`
- Remaining risks, blocked evidence, or untested scope: RSK-001 (unbounded `docker exec`/Docker daemon hang,
  accepted, out of scope, unchanged); PowerShell execution against a real or fake Docker daemon remains
  unproven anywhere in this repository (pre-existing, project-wide limitation, not introduced by this ticket —
  REQ-006 is proven by a text contract plus a real `pwsh` 7.6.9 syntax parse of the changed PowerShell files).

### API-REV-002 — PowerShell wait-loop abort-on-failed-attempt fix (IR-002, Local Fix)

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002),
  Round 2 (Local Fix re-validation). Originating finding: Delivery Engineer, during finalization of my
  Round-1 Pass (`API-REV-001`), found that under Windows PowerShell 5.1, `Show-SetupCodeOfRunningNode`'s
  `2>&1` capture of a failed attempt's own stderr, combined with this launcher's `$ErrorActionPreference =
  'Stop'`, turned every failed attempt into a terminating `NativeCommandError`, aborting the wait loop on the
  first failed attempt instead of retrying (REQ-006, AC-006, QR-001). No written Delivery report/`DR-*` ID
  exists yet (Delivery paused finalization before producing one); the finding is summarized in
  `implementation-revision-record.md` IR-002.
- Triggering finding or case IDs: `N/A` (no `DR-*`); addressed by implementation's IR-002.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs:
  `SR-001`, `IR-002`; architecture-review and code-review: `N/A — not applicable` (direct route, unchanged).
- Why this baseline or coverage/execution revision was recorded: second API/E2E round for this package, a
  Local Fix re-validation after a finalization-stage finding on a prior `Pass`.
- Coverage decisions or durable test paths changed: `scripts/tests/test_public_docker_launcher_setup_code.py`
  — `test_ac006_powershell_text_contract_...` extended with one regex assertion for the IR-002 guard's exact
  shape; no new test method. Classified `Still Valid` (now stronger). No other durable coverage change.
- Cases added, changed, removed, or rechecked: `API-09` (new — independent guarded-vs-unguarded comparison on
  real `pwsh` 7, plus independent web corroboration of the documented PowerShell 5.1/7 mechanism, PR #13361);
  `API-10`..`API-12` (independent reruns of the implementation's `IMP-05`..`IMP-07` on the IR-002 commit).
  `API-01`..`API-08` (Round 1) re-evaluated and kept `Still Valid` without rerunning: the bash launcher and the
  real-Docker journeys they exercise are unchanged by this PowerShell-only fix (confirmed by `git diff
  --name-only b9e2eba51 63365f010`).
- Commands, environment, fixture, or broader-validation delta: no new environment setup; `pwsh` 7.6.9 (already
  installed in Round 1) reused. No Docker daemon or node needed this round (the fix and its validation are
  entirely PowerShell-text/syntax/mechanism-level).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| Delivery's finalization-stage finding (PowerShell wait loop aborts on a failed attempt under `$ErrorActionPreference = 'Stop'`, Windows PowerShell 5.1) | `Local Fix` (implementation, IR-002) | Fixed: the `docker exec` attempt now runs with `$ErrorActionPreference` temporarily set to `'Continue'` (saved/restored in `try`/`finally`); independently confirmed by the guard-shape regex, a real `pwsh` 7 parse, and my own guarded-vs-unguarded comparison on real `pwsh` 7 (the guard is harmless-and-unnecessary on 7, consistent with it targeting 5.1 specifically) | `API-09`, `API-10`, `API-12` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (Round 2 section added),
  `api-e2e-execution-coverage-report.md` (Round 2 cases, scorecard, broader-validation decision, and latest
  result added; Round 1 content kept for the record), `api-e2e-test-progress.md` (Round 2 rows appended).
- Prior result and confidence: `Pass` / 96.5% (`API-REV-001`)
- Current result and confidence: `Pass` / 96.0% overall final confidence (post-repository 94.3%) — the small
  decrease from Round 1 reflects that this round's own changed boundary (the PowerShell 5.1-targeted scope
  guard) is inherently less directly provable on this macOS-only machine than Round 1's real-Docker-daemon
  evidence was; every applicable category still scores ≥90% and the default `95%` target is met.
- New or remaining failure IDs: `None`
- Recommended owner: `N/A` — result is `Pass`
- Remaining risks, blocked evidence, or untested scope: RSK-001 (unchanged, out of scope); Windows PowerShell
  5.1 itself remains unproven by execution (no 5.1/Windows runtime on this machine) — mitigated by the
  guard-shape regex, a real `pwsh` 7 parse, my own independent guarded-vs-unguarded comparison on real `pwsh`
  7, and independent corroboration of the documented PowerShell 5.1/7 mechanism (PowerShell/PowerShell PR
  #13361). If a Windows PowerShell 5.1 or 7 runtime ever becomes available, running `setup-code`/`new-container`
  through it against a scripted failing attempt would be the strongest remaining confirmation; not required to
  reach `Pass` given the corroborating evidence already gathered.
