# Architecture Review Revision Record — one-nodes-tab

The latest `design-review-report.md` is authoritative. This record keeps the baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: Solution Designer handoff, Architecture Design Complete (2026-10-22) | SR-002, SR-003 | N/A | Fail | AR-001 … AR-006 |
| ARCH-REV-002 | Round 2: SR-006 (findings resolved, Product package integrated), 2026-10-23 | SR-004, SR-005, SR-006 | Fail | Fail | AR-001 … AR-006 resolved; new AR-007 … AR-010 |
| ARCH-REV-003 | Round 3: SR-007 (design text for AR-007 … AR-010), 2026-10-23 | SR-006, SR-007 | Fail | Pass | AR-007 … AR-010 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: sound shape, six bounded corrections

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/design-review-report.md`
- Review round and trigger: round 1, the design handoff `handoff-architecture-review.md` (Large / High).
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` at SR-003; no prior findings.
- Relevant solution revision IDs: `SR-002` (approved requirements and UI sketch rev 2), `SR-003` (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What changed in the review result or what baseline was established:
  - Basis confirmed against the code at `ca1f09e52a`.
  - Classification Large / High confirmed.
  - Persisted-data decision `Directly Usable — No Migration` accepted.
  - Removal plan evidence verified by grep.
  - Findings:
    - one `Requirement Gap`: AR-001, the switch-off meaning for identity-only resolution;
    - five `Design Impact` findings: AR-002 (registration naming rule), AR-003 (`identify` replace rule), AR-004 (adding an unreachable node), AR-005 (single write and availability boundaries), AR-006 (loopback hint surface and "Use this").

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003, AR-004, AR-005, AR-006.
- Material classification changes: none.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: RSK-701, RSK-702 and RSK-703 as stated in the design. Two residual implementation notes are in the report: peer-only rows without a window address, and duplicate desktop entries for one node.

### ARCH-REV-002 — Round 2: round-1 findings resolved; four small coherence findings

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/design-review-report.md`
- Review round and trigger: round 2. The Solution Designer's round-2 handoff (SR-006): DEC-709 decided (b), AR-002 … AR-006 resolved, and the Product Team's approved UI/UX package integrated with its requirement impacts.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` / `requirements-doc.md` at SR-006; AR-001 … AR-006.
- Relevant solution revision IDs: `SR-004`, `SR-005`, `SR-006`
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Fail`.
- What changed in the review result:
  - All round-1 findings were verified as resolved in the canonical artifacts.
  - The SR-006 product changes were reviewed against `ui-ux-spec.md`.
  - Four new `Design Impact` findings were raised. They are where the design contradicts explicit approved text (AR-007, AR-008), a missing data source (AR-009), and stale authority text (AR-010).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Requirement Gap) | Resolved | SR-004, SR-006; DEC-709 | Requirements DEC-709 "Decided: (b)" (delegated by the user). Design § Switch-Off Rule. Spec UXJ-701, VIS-003. |
| AR-002 | Open | Resolved | SR-004 | Design § Naming Rule (source, valid, unique, race, tests); spec UXJ-704 / VIS-021 |
| AR-003 | Open | Resolved | SR-004 | Persisted-data invariants; `identify` interface row "set or replace" |
| AR-004 | Open | Resolved | SR-004, SR-006 | DS-002 narrative; REQ-704 / AC-703 alternate; BEH-701 preserved column; spec VIS-013 |
| AR-005 | Open | Resolved | SR-004 | Ownership Map "One write path per state"; Dependency Rules forbidden shortcut; facade table; `checkAvailabilityOf` in the file mapping. A leftover DS-003 phrase is tracked in AR-010. |
| AR-006 | Open | Resolved | SR-004 | Design § Loopback Hint Surface; AC-707 refined; spec UXJ-705, VIS-018/026 |

- New or remaining finding IDs: AR-007 (Remove's run rule vs REQ-710 / UXJ-706), AR-008 (duplicate-by-address check gated on the probe), AR-009 (no source for the B→A address), AR-010 (stale SR-002 / ui-sketch authority text and leftover round-1 phrases).
- Material classification changes: none. Large / High confirmed.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: RSK-701 … RSK-703; the Product risk of peer-only rows; the presentation of a peer-only row's dot while this node is off (implementation note).

### ARCH-REV-003 — Round 3: AR-007 … AR-010 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/design-review-report.md`
- Review round and trigger: round 3, the Solution Designer's round-3 handoff (SR-007). Design text changes only; no requirement changed.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` at SR-007 and `requirements-doc.md` Document Status / Readiness; AR-007 … AR-010.
- Relevant solution revision IDs: `SR-006`, `SR-007`
- Prior authoritative decision: `Fail` (ARCH-REV-002).
- Current authoritative decision: `Pass`.
- What changed in the review result: all four round-2 findings were verified in the canonical text, and grep confirms no stale phrases remain. The design is ready for implementation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open | Resolved | SR-007 | Design § Run Rules (one rule per plan kind; `remove` reaches `removeFromList` and reports a failed `removeThere` with the UXJ-706 copy); DS-003 spine and narrative; Guidance connector test |
| AR-008 | Open | Resolved | SR-007 | DS-002 narrative: address checked against every row's window address on submit whatever the state; node ID when answered; Guidance test |
| AR-009 | Open | Resolved | SR-007 | DS-004: B's `peers` read for every reachable row is the source of the B→A address and of "registered only by the other node"; Guidance test |
| AR-010 | Open | Resolved | SR-007 | Requirements Document Status (SR-006 baseline, the Product package as the UI basis, both approvals) and Readiness; design baseline line, `resolvePeerAddress` row, Key Tradeoffs, DS-003 write paths, `NodeChangeStep`, plan kinds, Guidance; grep finds no stale phrases |

- New or remaining finding IDs: none. One implementation note: follow § Run Rules' rename order (peer first) over the Guidance bullet's wording.
- Material classification changes: none. Large / High confirmed.
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational).
- Remaining risks or uncertainty: RSK-701, RSK-702, RSK-703; the Product risk for peer-only rows (mapped).
