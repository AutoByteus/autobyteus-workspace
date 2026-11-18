# Architecture Review Revision Record — autobyteus-318

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / Low) | SR-001 | N/A | Fail | AR-001 |
| ARCH-REV-002 | Round 2 / SR-002 re-review | SR-001, SR-002 | Fail | Pass | AR-001 (resolved); R-5 (new, non-blocking) |
| ARCH-REV-003 | Round 3 / SR-003 (T-28 sig. 2 only) | SR-001, SR-002, SR-003 | Pass | Fail | AR-002, AR-003 (new) |
| ARCH-REV-004 | Round 4 / SR-004 (T-28 sig. 2 only) | SR-001..SR-004 | Fail | Pass | AR-002, AR-003 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: server gate cannot pass on day one because of an out-of-package source error

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-review.md` from the Solution Designer, 2026-11-01.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-001; N/A.
- Relevant solution revision IDs: SR-001.
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`).
- What changed in the review result or what baseline was established: baseline.
  - Confirmed: the shared gate runner, the cross-package project, the Electron global setup, the probe helper, the removals and the per-item repairs.
  - Failed: DS-002's day-one pass (AR-001).

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (Design Impact, High); recommendations R-1..R-4.
- Material classification changes: none; Large / Low accepted.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty:
  - server tests heap unmeasured;
  - run-first items may reveal product defects;
  - baseline drift on merges.

### ARCH-REV-002 — Round 2: out-of-package classification stated; server gate passes on day one

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/design-review-report.md`
- Review round and trigger: round 2; SR-002 re-review request (handoff § Round 2), 2026-11-01.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-002; AR-001.
- Relevant solution revision IDs: SR-001, SR-002.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed: AR-001 resolved; R-1..R-4 adopted; R-5 added (non-blocking comment beside the T-57 cast).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Design Impact) | Resolved | SR-002; design-spec § File Classification Rule, T-57, sequence steps 1 and 4; investigation-notes T-57 | The rule is stated for both gates (package-relative paths; test files by each package's own rule; every other reached file, other packages' source included, is production). The second path to the file is confirmed: `test-support/live-e2e/live-e2e-harness.ts` L14 imports `../../autobyteus-ts/src/index.js`, so rerouting the frozen test alone could not clear it. T-57 is type-only, and is listed in Change Scope and in step 1. Measured by the Solution Designer: 0 production errors, 1,327 test errors, `autobyteus-ts` build 0. |

- New or remaining finding IDs: R-5 (non-blocking).
- Material classification changes: none (Large / Low).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: server tests heap unmeasured (escalation trigger); run-first items U-01..U-03 may reveal product defects; baseline drift on merges.

### ARCH-REV-003 — Round 3: T-28 signature 2 measured from the fixture's clock

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/design-review-report.md`
- Review round and trigger: round 3; SR-003 (handoff § Round 3), after the implementation engineer's anticipated Design Impact (HEAD `351265ce41`), 2026-11-01.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` Per-Item T-28 sig. 2; N/A.
- Relevant solution revision IDs: SR-001, SR-002, SR-003.
- Prior authoritative decision: Pass (ARCH-REV-002).
- Current authoritative decision: Fail (`Design Impact`), limited to T-28 sig. 2. The rest of the package stays passed.
- What changed: the direction is accepted (the fixture's own clock, both ends; product timestamp rejected). Two gaps in the specification remain:
  - AR-002: the SIGTERM lifecycle log exists only in `interrupt_resend` mode, while the test runs `linked_skills`; a logging-only SIGTERM handler would stop the default termination.
  - AR-003: the no-slack lower bound needs the start time recorded before the observable write, plus a small stated timer tolerance.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved (unchanged) | SR-002 | SR-003 does not touch it |

- New or remaining finding IDs: AR-002, AR-003 (Design Impact, Medium).
- Material classification changes: none (Large / Low).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: as in ARCH-REV-002.

### ARCH-REV-004 — Round 4: T-28 signature 2 specification completed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/design-review-report.md`
- Review round and trigger: round 4; SR-004 (handoff § Round 4), 2026-11-01.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` Per-Item T-28 sig. 2; AR-002, AR-003.
- Relevant solution revision IDs: SR-001..SR-004.
- Prior authoritative decision: Fail (ARCH-REV-003).
- Current authoritative decision: Pass.
- What changed: AR-002 and AR-003 resolved; no new findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Open | Resolved | SR-004; design-spec T-28 sig. 2 "Fixture" | Log gated by `AGY_FAKE_PROCESS_LOG` alone. The handler outside `interrupt_resend` logs, removes itself and re-raises SIGTERM, so default termination is kept. No handler without the variable. Exit delay stays in `interrupt_resend`. The test sets and restores the variable. |
| AR-003 | Open | Resolved | SR-004; design-spec T-28 sig. 2 "Recording order", "Why 250 ms" | Start recorded before the stdout `result` line and before the exit-message file. Lower bound `GRACE_MS − 250 ms` with its reason. Premise checked: the quiet copy's process is live while idle (test L366). |

- New or remaining finding IDs: none (R-1..R-5 stand).
- Material classification changes: none (Large / Low).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: as in ARCH-REV-002.
