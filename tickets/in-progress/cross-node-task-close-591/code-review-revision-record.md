# Code Review Revision Record: cross-node-task-close-591 (autobyteus-591)

| CRR | Report | Entry point / trigger | Prior result | Result | Findings |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (Full Review) / IR-001 | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E failure-origin review / API-REV-001 (F-1, F-2) | Pass (CRR-001) | Requirement Gap ×3 → Solution Designer | CR-591-001 … -003 new |
| CRR-003 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 (SR-010, SR-011 DN-9) | Requirement Gap (CRR-002) | Pass | CR-591-001 … -003 resolved (-002's last line at `f39a92d5d3`) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 (52a1507b80, 00851c5c8d) | Pass (CRR-003) | Pass | None |

### CRR-001: Implementation review of IR-001: Pass

- Review entry point and round: implementation review, round 1
- Review scope: Full Review of `fa63874115..dd5b230e7e`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001 … SR-009
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: the initial result.
  - A's `PeerRunStateNotices` orders one notice per run, reads `isOpen` at send time, and keeps it owed until confirmed, with a per-peer 30 s retry.
  - The link request goes through `admit` and the owner link check.
  - B records the run, then stops it through the closure Stop, with `kept_open` handled.
  - The list filters in memory; S-5 is scoped to the delegating node.
  - The remote re-delegation delivers only after B confirms "open".
  - All six deviations from the design text are accepted: their reasons hold.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: initial scorecard, 9.4 overall
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the two-server E2E (AC-001 … AC-007, restarts, the phone list);
  - the pinned RC-09 and RC-23;
  - real-runtime team stops;
  - mixed versions.

### CRR-002: Failure-origin review of API-REV-001: Requirement Gap

- Review entry point and round: API/E2E failure-origin review (API round 1)
- Review scope: F-1 (the tree row on A) and F-2 (RC-51, RC-52, RC-53) on `9abe7086fd`
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-1, F-2
- Relevant solution revision IDs: SR-005 (the local-behavior read), SR-006 … SR-009 (DN-1, DN-8)
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Requirement Gap (routed upstream)
- What changed in the review result and why:
  - **Locally, the assigner's message continues a reopened Task** (`admit` → `reopenAssignment`), and `delegate_task` with the same Task is refused with that guidance. SR-005, REQ-006, AC-007 and DN-8 say the reverse. A remote run's assigner message has no continuation (`closedPeerRunRefusal`), so the PM's dead end remains (CR-591-001).
  - REQ-002's "never delivered for a reopened Task" contradicts SR-005 and DN-1 (a reopen alone changes no entry) (CR-591-002).
  - AC-001 and AC-006 ask for a tree row on A that the local open-subtree rule removes (CR-591-003).
  - The code follows the approved design in all three.
- Supported product scenario / material-premise basis changes: the local continuation premise (SR-005) is contradicted by code.
- Prior finding resolution: N/A
- New or remaining finding IDs: CR-591-001, CR-591-002, CR-591-003
- Material score or classification changes: none to the implementation's scorecard. My CRR-001 accepted the parity premise without reading `admit`'s continuation (my review gap).
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - the stale "fences" test title (implementation, next round);
  - FU-591-01 (base);
  - a real runtime as the mid-turn member was not tested.

### CRR-003: Review of IR-002 (DN-9): Pass

- Review entry point and round: implementation review, round 2
- Review scope: Targeted Delta, `dd5b230e7e..81a504de13` (code `a811f94348`: 4 source files, plus tests and docs)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); CR-591-001 … -003; API-REV-001 F-1, F-2
- Relevant solution revision IDs: SR-010, SR-011
- Relevant architecture-review revision IDs: ARCH-REV-005, ARCH-REV-006
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Requirement Gap (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why:
  - `admitPeerRun` applies the local continuation rule (read in `admit`) to peer runs: the assigner reopens, then "open" is confirmed, then the message is admitted; others are refused `TASK_AGENT_RESOURCE_CLOSED`.
  - It runs once in the router, ahead of every path and outside any root's gate.
  - `closedPeerRunRefusal` is removed, and the delivery function no longer checks the Task (its callers are pre-admitted).
  - Deviations 7 (`changed()`) and 8 (the not-delivered text) hold.
- Supported product scenario / material-premise basis changes: SR-010 corrects the local premise (checked against `admit`)
- Prior finding resolution:

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-591-001 | Resolved | `admitPeerRun` (`cross-run-message-delivery.ts:160-182`); the router gate; the two-node continuation tests |
| CR-591-002 | Resolved (requirement text: REQ-002 at SR-010, AC-004's alternate at `f39a92d5d3`) | Both now say the run's entry reopened prevents the stop and a Task reopen alone doesn't; the code matches |
| CR-591-003 | Resolved (requirement text, SR-010) | AC-001 and AC-006 now say offline by run ID and on the Task's page, as locally |

- New or remaining finding IDs: none
- Material score or classification changes: none (overall 9.4)
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - a concurrent second sender while "open" is in flight relies on S-5 and `stillClosed` (documented; not a supported workflow);
  - RC-51 and RC-53's expectations change under SR-010;
  - a real runtime as the mid-turn member was not tested.

### CRR-004: Proportional test-code review after API-REV-002: Pass

- Review entry point and round: successful API/E2E test-code review (rounds 1 and 2)
- Review scope: `52a1507b80` and `00851c5c8d` (the two-server suite, MSP-93 and its registration)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002)
- Relevant solution revision IDs: SR-010, SR-011
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The two-node cases assert the corrected requirements positively: the continuation's open-before-message order from captured traffic; REQ-002's rf / rg; the closed run leaving A's tree and showing offline on the Task page.
  - The old expectations are replaced, and the fixed waits are bounded windows for things that must not happen.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - a real runtime as the mid-turn member was not tested;
  - FU-591-01 (base);
  - MSP-93's catalogue line in `mobile-shell-probe.mjs` is stale (for delivery's sync).
