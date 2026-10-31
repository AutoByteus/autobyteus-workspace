# Code Review Revision Record — atomic-agent-run-creation (autobyteus-349)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-API-001) | Pass | Fail: `Requirement Gap` → Solution Designer | F-API-001 |
| CRR-003 | `code-review-report.md` | Failure-origin resolution (SR-005, DEC-003 = C) | Fail (Requirement Gap) | F-API-001 closed as an accepted residual; source `Pass` stands; API/E2E to record AC-004 under SR-005 | F-API-001 (closed) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review (API-REV-002 Pass) | Pass (CRR-003 resolution) | Not Applicable (no durable test changed) | None |

## Revision Entries

### CRR-001 — Initial source review of IR-001 (atomic one-call creation; startup removal of empty never-started runs)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001; code `c533fc0b5b`, guard entry `93fa105819`)
- Relevant solution revision IDs: SR-002, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, 9.5/10, no findings
- What changed in the review result and why:
  - The initial baseline.
  - D1's undo and D2's guarded removal match SR-004.
  - The data-loss guards were verified one by one: the record state, the start marks, the no-follow content walk, walk errors and refusals all keep the run; task agents are never touched.
  - The implementer's two points were accepted: the guard allowlist entry and the missing-record count line.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (baseline); Small / High confirmed
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: AC-004 and N-4 timing are validation-owned; FU-001 to FU-004.

### CRR-002 — Failure-origin review of F-API-001 (a hard-killed activation leaves non-empty never-started runs)

- Canonical review report updated: `code-review-report.md` (§ Round 2; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-API-001, AC-004 crash variant; evidence API-03, API-03B to API-03E
- Relevant solution revision IDs: SR-002, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`, `Requirement Gap`, owned by the Solution Designer
- What changed in the review result and why:
  - A SIGKILL during activation leaves runs holding the activation's `system_instruction` trace, and sometimes a stale temp record with `startedAt`.
  - The startup rule keeps them, exactly as REQ-002 ("no file besides the record") prescribes, so AC-004 fails for hard kills.
  - The code matches the approved rule. Widening "empty" is the user's DEC-001 call.
  - My round 1 review did not trace activation's writes inside the run folder; that is partly a gap.
- Supported product scenario / material-premise basis changes: AC-004's crash variant is classified as a `Supported Explicit Edge Scenario` (the desktop force step, Docker's SIGKILL, an OS kill). It is rare, with a cosmetic consequence.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: F-API-001 (Requirement Gap)
- Material score or classification changes: None; Small / High
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: depends on the chosen direction: (a) a narrow artifact allowlist, (b) changing the activation order, or (c) accepting a residual and narrowing AC-004 to a graceful stop.

### CRR-003 — Resolution of the Requirement Gap (SR-005, DEC-003 = C)

- Canonical review report updated: `code-review-report.md` (§ Round 3; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3 (resolution)
- Review scope: `N/A`
- Triggering role, report path, and finding or scenario IDs: Solution Designer, `requirements-doc.md` (SR-005: DEC-003, AC-004 narrowed), `follow-ups.md` (FU-005), commit `7e9e55f220`; F-API-001
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-002, Requirement Gap)
- Current authoritative result: F-API-001 closed as an accepted residual. The source result `Pass` (CRR-001) stands, because the code and design are unchanged.
- What changed in the review result and why:
  - The user chose to accept the hard-kill leftover (FU-005) and narrow AC-004 to a normal stop.
  - API-REV-001 already shows the narrowed case passing (stuck activation, then SIGTERM, left no run).
  - API/E2E must record AC-004 under SR-005 and reissue its decision.
- Supported product scenario / material-premise basis changes: the hard-kill crash during activation moves from an AC-004 criterion to an accepted residual (FU-005).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-001 | Open (Requirement Gap) | Closed: accepted residual | SR-005, DEC-003, FU-005 | `requirements-doc.md` AC-004 and DEC-003; `follow-ups.md` FU-005; API-REV-001 stuck-activation SIGTERM case (`historyRows 1`) |

- New or remaining finding IDs: None
- Material score or classification changes: None; Small / High
- Recommended recipient: API/E2E engineer (`Local Fix`, reporting)
- Remaining risks or uncertainty: FU-005 (the hard-kill leftover); FU-001 to FU-004; the plain graceful in-flight-create variant may need its own case if API/E2E judges the stuck-activation case insufficient.

### CRR-004 — Proportional test-code review after API-REV-002 Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002 `Pass`, 93.0%); AC-004 proven under SR-005 (API-03G graceful stop, three samples; API-03 stuck-activation SIGTERM)
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: F-API-001 closed as an accepted residual; source `Pass` (CRR-003)
- Current authoritative result: `Not Applicable`, passing to delivery
- What changed in the review result and why: API/E2E changed no durable test code in either round; its probe is evidence. The branch's tests were reviewed in CRR-001.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None open (F-API-001 was closed in CRR-003).

- New or remaining finding IDs: None
- Material score or classification changes: None; Small / High
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: FU-001 to FU-005; remote delegation across nodes is covered by unit tests only; the first start on real data is not run by rule; the architecture reviewer's docs are still untracked.
