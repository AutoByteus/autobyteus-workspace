# Architecture Review Revision Record — small-follow-ups-batch-426

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (round 1 package) | SR-001, SR-002, SR-003 | N/A | Fail | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / focused re-review of SR-004 | SR-004 | Fail | Pass | AR-001, AR-002, AR-003 (resolved) |
| ARCH-REV-003 | Round 3 / focused re-review of SR-005 (D-02, implementation Design Impact) | SR-005 | Pass | Pass | none |
| ARCH-REV-004 | Round 4 / item 19 added (D-19) | SR-006 | Pass | Pass | none |

## Revision Entries

### ARCH-REV-001 — Round-1 baseline: design sound, three small corrections

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md`
- Review round and trigger: round 1; Solution Designer's Architecture Design Complete, 2026-11-07 (handoff `handoff-architecture-design-complete.md`)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (D-01…D-18); N/A prior findings
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed or what baseline was established: classification Medium/High confirmed; behavior basis confirmed against the cited code; item 7 (WebView blob subframe rule) passes; findings on D-02's off-state clearing rule, D-16's remote-key selection, and stale SR/REQ-016 status lines.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Design Impact, Medium), AR-002 (Design Impact, Low), AR-003 (Requirement Gap — documentation consistency, Low; no new user approval)
- Material classification changes: none (Medium / High unchanged)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RR-01 (same-origin blob subframes rely on the iframe's sandbox), RR-02 (share intent re-delivered on recreation; preserved), RR-03 (server-internal registration forms fail earlier with the typed refusal); R-01, U-01 as designed

### ARCH-REV-002 — Focused re-review of SR-004: all findings resolved, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md`
- Review round and trigger: round 2; Solution Designer's revised package (SR-004), 2026-11-07
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md` § Revision after ARCH-REV-001; AR-001, AR-002, AR-003
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed: re-checked BEH-002 (DS-002) and BEH-016 against the revised D-02, D-16, interface map and removal plan; status lines re-read. Unaffected checks keep their ARCH-REV-001 verdicts.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Design Impact, Medium) | Resolved | SR-004; design-spec D-02, Interface Boundary Mapping, Removal plan; requirements AC-003 | `recordCheckOutcome` sets `phoneAccessOff = outcome === 'phone_access_off'` and `authorizedApiReachable = outcome === 'reachable'` on every non-rejected check; session end clears off. P-01 (off → network lost) now yields `unreachable` → "Can’t reach". `recordAuthorizedApiReachability` has one production caller (`MobilePairedShell.vue:114`, grep); its spec use (`MobileRemoteAccessShell.spec.ts:124,132`) is updated by implementation |
| AR-002 | Open (Design Impact, Low) | Resolved | SR-004; design-spec D-16 | Explicit `REMOTE_WORDED_PATHS` list decides the remote key; catalog spec requires en and zh-CN for every listed path; Docker/Company lines excluded as in the Product spec |
| AR-003 | Open (Requirement Gap, documentation, Low) | Resolved | SR-004; requirements-doc status/approval/baseline lines, DEC-002, Supplemental Artifacts, Readiness Check; investigation-notes:14 | All read at SR-004; REQ-016 shown approved by the user's Product approval (SR-003) |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: RR-01…RR-03 (design spec § Review Residual Notes); R-01 (AR-14 cause), U-01 (programmatic copy) as designed

### ARCH-REV-003 — Focused re-review of SR-005 (D-02 refusal reaches the check as the error object): Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ SR-005 D-02 Re-Review)
- Review round and trigger: round 3; implementation Design Impact on D-02 (IMP-02), revised by the Solution Designer as SR-005, 2026-11-07
- Triggering role, report path, and finding IDs: Implementation Engineer → Solution Designer; `evidence/IMP-02-apollo-403-error-shape.txt`; investigation A-07; no reviewer finding IDs
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: BEH-002 / DS-002 re-checked against base `runHistoryLoadActions.ts:106-109,150-152,183-186` and `useRunHistorySectionLoad.ts:33-40`; revised `historyReadFailure` + Apollo-aware `remoteAccessReadRefusal` accepted; implementation precision on where the failure is set/cleared recorded; DS-002 spine still names `recordPhoneAccessOff` (non-blocking text correction for the Solution Designer).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved (still holds) | SR-005 D-02 | `recordCheckOutcome` unchanged in the revised D-02 |
| AR-002 | Resolved | Resolved (unaffected) | — | D-16 unchanged |
| AR-003 | Resolved | Resolved (lines at SR-005) | SR-005 | design spec, investigation notes at SR-005 |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: RR-01…RR-03 as before; R-01 resolved by implementation (SR-005); U-01 open as designed

### ARCH-REV-004 — Item 19 (D-19, file status on read-only conversations): Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ SR-006 D-19 Review)
- Review round and trigger: round 4; SR-006 adds item 19 (Task comment from `/project_task_manager`, 2026-11-07; autobyteus-427 FU-001)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md` § Revision SR-006; no finding IDs
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: Pass (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed: BEH-019 added and confirmed against `origin/personal` `933163361c` `AgentEventMonitor.vue:18,23-39,97-108`; D-19 accepted; sequencing (take in `origin/personal` first) checked. Overlap with this branch is only the two docs files of D-12 and D-13, with no Case 17 collision.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-003 | Resolved | Resolved (unaffected) | SR-006 | D-02, D-16 and status lines unchanged by SR-006 |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High; D-19 itself is low-risk UI)
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: RR-01…RR-03; U-01; DS-002 spine text correction still pending (non-blocking)
