# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 handoff | N/A | Fail (Local Fix) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 / IR-002 local fix | Fail (Local Fix) | Pass | CR-001..CR-003 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-001 pass | N/A (first test review) | Pass | None |
| CRR-004 | `api-e2e-test-review-report.md` | Targeted proportional test-code review / API-REV-002 (per-member choice) | Pass | Pass | None |

## Revision Entries

### CRR-001 — Initial source review of IR-001: server sound; web launch rule, live view update, file sizes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001); SCN-001..SCN-006
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail` — `Local Fix` → `/software_engineering_team/implementation_engineer`
- What changed in the review result and why: this is the baseline.
  - Server Stop, Save, restore and validation match SR-005..SR-007. Reviewer-run checks: server tests 165/165 and web specs 21/21 pass.
  - Three findings: CR-001, the web copy-member selectors ignore the choice; CR-002, no live view update after Save, with a client shadow (`savedByRoot`); CR-003, three owners over 500 lines.
- Supported product scenario / material-premise basis changes: SCN-007 was added from the prior ticket's established contract (a copy member's context shows its actual model). Candidates C-004..C-007 were rejected.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (Medium), CR-002 (Medium), CR-003 (Medium)
- Material score or classification changes: baseline 8.8 / 88. Classification `Large` / `High` unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: see the report's Residual Risks. CR-002 may become `Design Impact` if the existing publication model cannot carry the update.

### CRR-002 — Re-audit of IR-002: CR-001..CR-003 resolved; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. The delta adds contract stream events and changes the web member-context spine and three server owners (53 files). Structural checks were rerun on the changed areas; round 1 evidence carries forward for the unchanged Stop, Save, restore and validation paths.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002); CR-001..CR-003
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why: see the round 2 summary in the report. Reviewer checks:
  - `typecheck` exit 0.
  - Server: 41 files / 486 tests pass.
  - Web: 27 files / 179 tests pass.
  - Contracts: 16/16 and 27/27 pass.
  - The `application-framework-boundaries` architecture failure is pre-existing on base: the test and the files it reads are unchanged.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Medium) | Resolved | IR-002, `0fb29b6d8c` | `teamAgentSourceAt(…, agentRunId)` / `collaborationInstanceSource` apply the contract rule with the server's follower rule. All member-context call sites pass run IDs (grep). Specs cover both casings |
| CR-002 | Open (Medium) | Resolved | IR-002, `810742c628`, `0fb29b6d8c` | Publication in `afterDurability` after a committed write (Team event; one Org/Agent contract schema). Web Team view applies it in place; Org/Agent views reload through `checkpoint_required`. `savedByRoot` removed. Tests for UPDATED and UNCHANGED |
| CR-003 | Open (Medium) | Resolved | IR-002, `810742c628` | 488 / 484 / 436 effective lines; `TaskExecutionLiveHolds`, `AgentActivationFence` and `team-run-delegated-launch-plan.ts` are coherent owners |

- New or remaining finding IDs: None. Non-blocking: rename the "support" helper file on the next touch.
- Material score or classification changes: 8.8 → 9.2. Classification unchanged: `Large` / `High`.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - The two-file standalone stopped Save.
  - Fences held while waiting at the queue head; no deadlock path exists today.
  - Files near the size limit.
  - Other clients' open Settings need a Refresh.
  - The real-runtime check and AC-010 user verification are pending.
  - A pre-existing base architecture-test failure.

### CRR-003 — Proportional test-code review of API-REV-001: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Reviewed:
  - the baseline guard fix `aaf6f010f1` (`application-framework-boundaries.test.ts`);
  - the server E2E DCM-005..007;
  - the probe DCP-002..004;
  - the `package.json` script.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001); DCM-001..007, DCP-001..004
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review. The source review is `Pass` (CRR-002).
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The tests enter through real triggers and assert the requirements (cancel and liveness, `--model` and `--conversation`, published events, "+" prefill, restart persistence).
  - The baseline fix was verified against base commit `9777af682c`; reviewer re-run of the guard passes 20/20.
  - The probe passes `node --check`, and its full run shows 14/14 with 0 browser errors.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None. Non-blocking: add DCP-002..004 to the probe header's case list; the REQ-008 user-sent path is not a durable case.
- Material score or classification changes: N/A. Classification unchanged: `Large` / `High`.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-010 user verification.
  - Another client's open Settings needs a Refresh.
  - Stop interrupts work in progress.
  - Older unattributed copies are not stopped with their starter.
  - No dedicated idle-shutdown case (the shared restore path is covered).
  - The durable tests are uncommitted.

### CRR-004 — Targeted test-code review of API-REV-002: per-member choice in a Team copy; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 2 (targeted)
- Review scope: `N/A` (test review). Commit `15cc9632d4`: DCM-008, DCP-005 with `agyLaunchDetailsOf`, and the `package.json` script.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-revision-record.md` (API-REV-002); DCM-008, DCP-005
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-001 (delivery checkpoint `1f3bd8ffde`; delivery re-evaluates after this review)
- Prior authoritative result: `Pass` (CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The new cases prove REQ-001's "any member" and the AC-010 scenario end to end: the record lands on the member only, the member resumes its own conversation on its choice, and its teammates are unaffected. A member's own choice wins over a Team choice in the same Save.
  - Reviewer checks: `node --check` OK; the probe evidence shows the full run 15/15 with 0 browser errors.
  - The round 1 header note is addressed.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: None. Non-blocking: the DCP-005 coordinator check could pass vacuously (DCM-008 covers it exactly). O-4 is a UX follow-up candidate.
- Material score or classification changes: N/A. Classification unchanged: `Large` / `High`.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-010 user verification.
  - O-1..O-4 product follow-up candidates.
  - Another client's open Settings needs a Refresh.
  - Stop interrupts work in progress.
