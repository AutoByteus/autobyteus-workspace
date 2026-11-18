# API/E2E Revision Record — autobyteus-305

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 Pass), round 1 | SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | Code reviewer, `code-review-report.md` (CRR-003 Pass), round 2 (build step 2) | SR-005 (SR-006/007), ARCH-REV-003, IR-002, CRR-003 | Pass / 95% (step 1) | Pass / 94.7% |
| API-REV-003 | Code reviewer, `code-review-report.md` (CRR-005 Pass), round 3 (build step 3) | SR-009/SR-010, ARCH-REV-004, IR-003, CRR-005 | Pass / 94.7% (step 2) | Pass / 94.7% |
| API-REV-004 | Code reviewer, `code-review-report.md` (CRR-007 Pass), round 4 (build step 4) | SR-005 + SR-009, ARCH-REV-005, IR-004, CRR-007 | Pass / 94.7% (step 3) | Pass / 94.7% |

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

### API-REV-003 — Build step 3 (in-place update by command)

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-005 Pass; API/E2E round 3.
- Triggering finding or case IDs: none; the reviewer's four coverage items and the handoff's hints.
- Related revision IDs: SR-009/SR-010, ARCH-REV-004, IR-003, CRR-005.
- Why: build step 3 is a new scope. Steps 1 and 2 are merged (`eec6522b27`, `a0f4b491f7`).
- Coverage decisions or durable test paths changed: none.
- Cases:
  - API-30 reused (IMP3-01..IMP3-10);
  - new journeys, all Pass:
    - API-31: step-2 node → upgrade → update by track; `update --all` over four tracks; `status` for every node state; AC-006 both ways;
    - API-32: rollback, no retry, restart, a second update, seven refusals, log scan;
    - API-33: RU-23;
    - API-36: PowerShell `status`/`update`.
- Commands, environment, fixture delta:
  - a docker.io registry mirror in the test daemon, so the track table sees the real repository name;
  - a throwaway signing key and packages built with the implementation's harness;
  - the release source runs inside the test daemon;
  - nothing is from the implementation's `/tmp/ab305/proof` except the harness scripts, which are in the evidence.

#### Prior Failure Resolution

None. No round-2 failure was open. In this round, two step-print checks were over-strict (launcher polling) and are recorded in the report, not as a failure.

- Canonical artifacts updated:
  - the investigation and the report rewritten for round 3 (round-2 versions at `c052bb1aff`);
  - the progress log section "Round 3".
- Prior result and confidence: Pass, 94.7% (step 2)
- Current result and confidence: Pass, 94.7% (the 95% target is missed only on durable PowerShell execution coverage, FU-006)
- New or remaining failure IDs: none
- Recommended owner: code reviewer
- Remaining risks:
  - the production key and GitHub source (first release, user-only);
  - the step-3 release notes must tell users to reinstall the launcher (RU-23);
  - FU-006;
  - the stale `state.json` `previous` after an image change (observation).

### API-REV-004 — Build step 4 (desktop: node version and "Update to <version>")

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-007 Pass; API/E2E round 4.
- Triggering items: the reviewer's eight coverage items.
- Related revision IDs: SR-005, SR-009, ARCH-REV-005, IR-004, CRR-007.
- Why: build step 4 is a new scope. Steps 1–3 are merged and released (v1.5.11-beta.6, DR-003).
- Coverage decisions or durable test paths changed: none.
- Cases:
  - API-40 reused (IMP4-01..06);
  - API-41: the real desktop app (isolated worktree build) against test-owned nodes on the host daemon; all eight items Pass.
- Environment delta from round 3:
  - no dind: the nodes run on the host daemon with unique names, their own label and fresh volumes, and no launcher label, because the desktop must reach them on `127.0.0.1`;
  - a host-loopback release source with per-variant prefixes and a throttled variant;
  - the real bash launcher for the host-started update, with a one-node state dir.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| Round 3: none open | — | — | — |
| API-41 run 1: "Copied" not seen | Fixture timing (synchronous read of an asynchronous copy) | Run 2 reads it 500 ms later: "Copied"; clipboard holds the command | API-41 run 2 |
| API-41 run 1: R row stayed "Not reachable" after `docker start` | Fixture: a random host port reassigned on start (61852 → 62239); the row polled the registered address every 10 s, as designed | R2 with a fixed host port, as the launcher gives: recovered within one 10 s poll | API-41 run 2 (R2) |

- Canonical artifacts updated: the investigation and the report rewritten for round 4 (round-3 versions at `e7e76ac2c0`); the progress log section "Round 4".
- Prior result and confidence: Pass, 94.7% (step 3)
- Current result and confidence: Pass, 94.7% (the 95% target is missed only because the desktop journeys are not durable automation)
- New or remaining failure IDs: none
- Recommended owner: code reviewer
- Remaining risks, for the Solution Designer (product):
  - English node reasons in zh-CN rows;
  - "Not reachable." under reachable pre-starter nodes (N-4), which includes the user's current nodes until `upgrade --all`;
  - CR4-N1 (no confirmation).
- Also: FU-006.
