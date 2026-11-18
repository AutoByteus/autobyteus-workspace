# Architecture Review Revision Record — small-follow-ups-batch-426

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (round 1 package) | SR-001, SR-002, SR-003 | N/A | Fail | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / focused re-review of SR-004 | SR-004 | Fail | Pass | AR-001, AR-002, AR-003 (resolved) |
| ARCH-REV-003 | Round 3 / focused re-review of SR-005 (D-02, implementation Design Impact) | SR-005 | Pass | Pass | none |
| ARCH-REV-004 | Round 4 / item 19 added (D-19) | SR-006 | Pass | Pass | none |
| ARCH-REV-005 | Round 5 / CRR-003 (F-API-001, F-API-002): D-02, D-03 | SR-008 | Pass | Pass | none (notes N-1, N-2) |
| ARCH-REV-006 | Round 6 / Architecture Design Complete, round 2 of the Task (items 9, 20–23) | SR-009, SR-010, SR-011 | Pass | Fail | AR-004, AR-005 |
| ARCH-REV-007 | Round 7 / focused re-review of SR-012 | SR-012 | Fail | Fail | AR-004, AR-005 (resolved); AR-006 (new) |
| ARCH-REV-008 | Round 8 / AC-020 re-check (SR-013) | SR-013 | Fail | Pass | AR-006 (resolved) |
| ARCH-REV-009 | Round 9 / D-21 re-check (SR-014, implementation Design Impact) | SR-014 | Pass | Pass | none |

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

### ARCH-REV-005 — SR-008: the phone check reads its own request; re-delivered share not run again: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ SR-008 D-02 / D-03 Re-Review)
- Review round and trigger: round 5; the code reviewer's CRR-003 failure-origin review after API-REV-001 (F-API-001, F-API-002, Design Impact), revised by the Solution Designer as SR-008, 2026-11-08
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` (F-API-001, F-API-002); evidence `evidence/api-e2e/API-08-process-death-restore.txt`, investigation A-08, E-03 correction
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: Pass (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed:
  - D-02: SR-005's history-store classification (accepted in ARCH-REV-003) is replaced by `checkCredential()`. ARCH-REV-003 missed two things: the quiet poll superseding the read, and the `ok` gate. Both are recorded.
  - D-03: the re-delivery rule is accepted, and RR-02 is superseded.
  - AC-004 is split (AC-004b in round 2, DEC-013 Needs user). Round 1 does not depend on it.
  - Notes: N-1 (stale interface row at `design-spec.md:227`), N-2 (`checkCredential` uses the store's own credential through `fetchWithRemoteAccessCredential`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved (still holds) | SR-008 D-02 | `recordCheckOutcome` keeps one outcome per check, now from `checkCredential` |
| AR-002, AR-003 | Resolved | Resolved (unaffected) | — | — |

- New or remaining finding IDs: none (non-blocking notes N-1, N-2)
- Material classification changes: none (Medium / High)
- Recommended recipient: Implementation Engineer (then source review and the API/E2E reruns MSP-13, MSP-18, API-08 and the full web suite, per CRR-003)
- Remaining risks or uncertainty: RR-01, RR-03; U-01; DEC-013 (round 2) with the user

### ARCH-REV-006 — Round 2 of the Task (items 9, 20–23): Fail on D-20's window form and D-09's apply rules

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ Round 2 Review)
- Review round and trigger: round 6; Solution Designer's Architecture Design Complete for round 2 of the Task (SR-011), 2026-11-08; handoff `handoff-round-2-architecture-design-complete.md`
- Triggering role, report path, and finding IDs: Solution Designer; design spec § Round 2 Design (D-09, D-20…D-23); no prior round-2 findings
- Relevant solution revision IDs: SR-009, SR-010, SR-011
- Prior authoritative decision: Pass (ARCH-REV-005, round 1; merged)
- Current authoritative decision: `Fail`
- What changed: round-2 basis checked on `origin/personal` `d785ded109`.
  - D-09's server read, its active-state comparison and its local/remote child split are confirmed against the code.
  - D-20's server half is confirmed. Its window half cannot work: the Host gate replies before CORS and without CORS headers, so the window's `fetch` rejects and the probe returns `unreachable` (P-03 Not Reachable).
  - D-21, D-22 and D-23 are sound.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-003 | Resolved | Resolved (round 1, merged; unaffected) | — | — |

- New or remaining finding IDs: AR-004 (Design Impact, may need a Requirement Gap; Medium), AR-005 (Design Impact; Low)
- Material classification changes: none (Medium / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: D-21's clock source (implementation checks first); the status read's measured size (AC-009a)

### ARCH-REV-007 — SR-012 re-review: AR-004 and AR-005 resolved; AR-006 (AC-020's add form) new

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ Round 2 Re-Review)
- Review round and trigger: round 7; Solution Designer's SR-012 after ARCH-REV-006, 2026-11-08
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-round-2-architecture-design-complete.md` § Revision SR-012; AR-004, AR-005
- Relevant solution revision IDs: SR-012
- Prior authoritative decision: Fail (ARCH-REV-006)
- Current authoritative decision: `Fail`
- What changed: D-09's apply rules and D-20's narrowing were verified. Tracing the Nodes page forms for the narrowed AC-020 found that the typed add never reaches the server for a refused name (`nodeListStore.ts:212-221`; connector `requireId`). The distinct text on the Nodes page comes from change address and from the connect flow's address resolution.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Open (Design Impact, Medium) | Resolved | SR-012; D-20; DEC-017; FU-004 | `nodeIdentityProbe` unchanged; no CORS change; window check keeps "can't reach" |
| AR-005 | Open (Design Impact, Low) | Resolved | SR-012; D-09 client rules | Currency, inactive-equal, active-state and child-set rules, in order; single flight; `CollaborationChildStatus` |

- New or remaining finding IDs: AR-006 (Design Impact, Low)
- Material classification changes: none (Medium / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: D-21's clock source; the status read's measured size (AC-009a)

### ARCH-REV-008 — AC-020 re-check (SR-013): Pass, round 2 ready for implementation

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ AC-020 Re-Check)
- Review round and trigger: round 8; Solution Designer's SR-013 after ARCH-REV-007, 2026-11-08
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-round-2-architecture-design-complete.md` § Revision SR-013; AR-006
- Relevant solution revision IDs: SR-013
- Prior authoritative decision: Fail (ARCH-REV-007)
- Current authoritative decision: `Pass`
- What changed: REQ-020 and AC-020 name the server-checked forms (`addPeerNode` at server E2E; change address and connect-resolution on the Nodes page). The typed add is with DEC-017 / FU-004.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-006 | Open (Design Impact, Low) | Resolved | SR-013; REQ-020, AC-020, DEC-017, FU-004 | `requirements-doc.md:308, 319, 328`; `follow-ups.md` FU-004 |
| AR-004, AR-005 | Resolved (ARCH-REV-007) | Resolved (unaffected) | — | — |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: D-21's clock source; the status read's measured size (AC-009a)

### ARCH-REV-009 — D-21 re-check (SR-014): Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/design-review-report.md` (§ D-21 Re-Check)
- Review round and trigger: round 9; the implementer's Design Impact on D-21 (E-21b), revised by the Solution Designer as SR-014, 2026-11-08
- Triggering role, report path, and finding IDs: Implementation Engineer → Solution Designer; investigation E-21b; no reviewer finding IDs
- Relevant solution revision IDs: SR-014
- Prior authoritative decision: Pass (ARCH-REV-008)
- Current authoritative decision: `Pass`
- What changed: the server recomputing the presets was confirmed (`token-usage-analytics-range-policy.ts:27-34, 84-86`). The test-only preload on the probe's own spawned server (`token-statistics-ui-probe.mjs:318`), the browser's `page.clock` and the seed's `now` together fix one instant on all three sides. Token usage reads the time only through `Date`, and the seed's coverage write comes before the server's upsert-if-missing.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004…AR-006 | Resolved | Resolved (unaffected) | — | — |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty: the status read's measured size (AC-009a)
