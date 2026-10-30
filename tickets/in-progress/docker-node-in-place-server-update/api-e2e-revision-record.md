# API/E2E Revision Record — autobyteus-305

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 Pass), round 1 | SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | Code reviewer, `code-review-report.md` (CRR-003 Pass), round 2 (build step 2) | SR-005 (SR-006/007), ARCH-REV-003, IR-002, CRR-003 | Pass / 95% (step 1) | Pass / 94.7% |

## Revision Entries

### API-REV-001 — Build step 1 (signed server package) baseline validation

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-001 Pass; API/E2E round 1.
- Triggering finding or case IDs: none (first validation). Hints from the implementation handoff's "Downstream Coverage Hints".
- Related revision IDs: SR-005, ARCH-REV-002, IR-001, CRR-001.
- Why this baseline was recorded: first completed API/E2E result for build step 1.
- Coverage decisions or durable test paths changed: `prisma-engine-discovery.docker.mjs` moved from `Still Valid` to `Needs Update` after its round-1 run. Stage API003's pre-fix-baseline precondition is bound to the `/app` layout. The probe was updated in commit `4c356d69b7`.
- Cases added, changed, removed, or rechecked: API-01..API-05 reused (IMP-01..IMP-11). API-10 ran twice: Fail on `30aaef9284` (test precondition), Pass on `4c356d69b7`. API-11, API-12 (phases A and B), API-13, API-14 and API-15 Pass. API-16 (GitHub release) not run: user-only.
- Commands, environment, fixture, or broader-validation delta: the launcher journey ran on a test-owned `docker:dind` daemon with a registry inside it, because `upgrade --all` reaches every launcher-labelled container, including the user's nodes. The PowerShell parse ran in `mcr.microsoft.com/dotnet/sdk:8.0` (arm64).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-10 round 1, stage API003 `'bundled' !== 'cache'` (same round) | Cause in the test: a layout-bound precondition (`evidence/API-10-cause.log`), not a product defect | Probe updated, `4c356d69b7` | API-10 round 2 |

- Canonical artifacts and sections updated: all four API/E2E artifacts created.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (test-code review of `4c356d69b7`)
- Remaining risks, blocked evidence, or untested scope: the GitHub part of AC-011 is proven only by the first release, which needs the user's request.

### API-REV-002 — Build step 2 (starter and server-packages volume)

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-003 Pass; API/E2E round 2.
- Triggering finding or case IDs: none; the handoff's "Downstream Coverage Hints" and the reviewer's six coverage items; CR2-N1 to record.
- Related revision IDs: SR-005 (SR-006, SR-007), ARCH-REV-003, IR-002, CRR-003.
- Why this revision was recorded: build step 2 is a new scope on the same ticket. Step 1 was delivered (DR-001) and merged (`eec6522b27`).
- Coverage decisions or durable test paths changed: none. The PowerShell parse test already lists `ContainerConfig.ps1`.
- Cases:
  - API-20 reused (IMP2-01..IMP2-08).
  - API-10, API-11 and API-14 rerun on step 2 (same case IDs as round 1). Pass.
  - API-12, phases A–D, is new content under the same case ID: the first move from `:beta` and from step 1; the installed v6 launcher; `NEEDS_NEW_IMAGE` by retargeting; stop/start. Pass.
  - New: API-21 (C1 and a real paired phone) Pass; API-22 (the PowerShell launcher executed) Pass for the step-2 paths.
  - API-13 (compose) rerun with the step-2 image. Pass.
  - API-15 not run (no amd64 step-2 image).
- Commands, environment, fixture, or broader-validation delta:
  - a derived image labelled `1.5.12-beta.1` emulates "a newer release" for `NEEDS_NEW_IMAGE`;
  - Linux `pwsh` with the docker CLI in dind's network namespace runs the PowerShell launcher;
  - phone pairing goes through the node's private address, because the policy refuses loopback.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| Round 1: none open | — | — | — |
| API-21 first run in this round: pairing session 400 | Fixture error (loopback pairing URL, `REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY`) | Rerun with the node's private address | API-21 (`API-21-22-rerun.log`) |
| API-22 first run in this round: PowerShell `new-container` throws in `Pick-Port` | Pre-existing product bug in unchanged code (`Get-UsedPorts` unrolling; identical on `origin/personal`), outside this ticket | Follow-up FU-006; step-2 paths proven with the unpatched launcher, node created by a patched copy | API-22 |

- Canonical artifacts and sections updated:
  - the investigation and the report are rewritten for round 2 (the round-1 versions are in git at `48c2d82ea1`);
  - the progress log gains a "Round 2" section;
  - `follow-ups.md` gains FU-006.
- Prior result and confidence: Pass, 95% (step 1)
- Current result and confidence: Pass, 94.7% (the target of 95% is missed only on durable PowerShell execution coverage, FU-006)
- New or remaining failure IDs: none in scope; FU-006 is a follow-up
- Recommended owner: code reviewer (Large/High pass; no test code changed)
- Remaining risks, blocked evidence, or untested scope:
  - FU-006;
  - CR2-N1 (accepted);
  - RU-23 (installed-launcher nodes keep starter state in the container layer; relevant to step 3);
  - amd64 not rerun.
