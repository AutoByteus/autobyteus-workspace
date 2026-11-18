# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-533 (founder report 2026-11-18); investigation and reproduction | N/A | N/A | Approved (Solution Designer within the direction; user informed) | BEH-001…010; REQ-001…007; AC-001…011 | Requirements baseline with reproduced root cause |
| SR-002 | Mixed | Design reading gate: DESIGN.md rule 9 (no compatibility between software versions) | N/A | Approved (SR-001) | Requirements Approved (refined); design Ready | REQ-004, AC-004, AC-007, QR-002 (removed) | Mixed-version clause removed; design spec written; size Medium, risk High |
| SR-003 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001 | Design Ready (SR-002), review Fail | Design Ready (revised); requirements unchanged (SR-002) | BEH-008; REQ-003, REQ-005; AC-006, AC-008 | A Stop waiting at a connection loss is held until the rebind's status; status watch starts at the press |

## Revision Entries

### SR-001 — Requirements baseline: Stop is harmless to repeat

- Phase and classification: Requirements, Initial Baseline.
- Trigger: Task autobyteus-533 from `/project_task_manager` with the founder's report and screenshot.
- Triggering finding IDs: N/A.
- Prior status: N/A. Current status: requirements Approved.
- IDs affected: BEH-001…BEH-010, UC-001…UC-006, REQ-001…REQ-007, AC-001…AC-011, SCN-001…SCN-006, DEC-001…DEC-008.
- Scenario basis: all Supported Normal Scenarios (reproduced or read; investigation notes).
- Why recorded: first coherent baseline.
- Sections: requirements-doc.md (all); investigation-notes.md (all).
- Supplements: `evidence/reproduction/`, two reproduction scripts (evidence only).
- Product design evidence: N/A (not requested).
- Intended behavior changed: Yes (new behavior defined).
- Approval: Solution Designer within the direction (no `Needs user` decision); the user was informed in the Solution Designer's conversation on 2026-11-18.
- Design/review basis: N/A (design not yet written).
- Classification: N/A.
- Handoff: none.
- Remaining gaps: none.
- Next action: architecture design.

### SR-002 — Mixed-version clause removed; design complete

- Phase and classification: Mixed (Requirements Refinement + Design).
- Trigger: the design reading gate, `DESIGN.md` rule 9: no design for an older/newer node or peer.
- Prior status: requirements Approved at SR-001; design not written.
- Current status: requirements Approved at SR-002 (same approval: supported behavior unchanged); design Ready.
- IDs affected: REQ-004 (now: nothing shown for an accepted Stop; every non-accepted answer is a real failure), AC-004 (peer relay of a same-version peer's own result), AC-007 (accepted while the page still shows Running), QR-002 removed; External Contracts and Architecture Phase Input rows.
- Why recorded: SR-001 asked the web to tolerate old-node answers, which rule 9 forbids.
- Sections changed: requirements-doc.md (Document Status, REQ-004, AC-004, AC-007, QR table, External Contracts, Architecture Phase Input, Readiness); investigation-notes.md (Notes For Architecture Design); design-spec.md created; follow-ups.md created (FU-001, FU-002); `evidence/spine-validation/sr-002-stop-spines-by-run-kind.md`.
- Intended behavior changed: No (for supported, same-version scenarios).
- Approval impact: none beyond SR-001's (refinement within the same direction).
- Design/review basis: design-spec.md at SR-002.
- Classification: task_size Medium, architectural_risk High (ack meaning on five streams, backend contract for three runtimes, web result API and presentation owner across every run kind).
- Handoff: see `handoff-architecture-design-complete.md`.
- Remaining gaps: none; R-1 overlap with 448/526 FU-002 (informational).
- Next action: route per handoff rules.

### SR-003 — Stopping held across a reconnect (ARCH-REV-001 AR-001)

- Phase and classification: Design, `Design Impact`.
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`), Fail with one blocking finding AR-001; classification Medium/High confirmed.
- Triggering finding IDs: AR-001 (and the non-blocking suggestion to start the status watch at the press, adopted).
- Prior status: requirements Approved at SR-002; design Ready at SR-002; review Fail.
- Current status: requirements unchanged at SR-002; design Ready at SR-003.
- IDs affected: BEH-008 target path; REQ-003, REQ-005, AC-006 (alternate outcome), AC-008 now realized; no requirement text changed.
- Why recorded: the design ended Stopping at the drop (services drain waiting Stops there), so for ≥1 s before the rebind the page showed the stale Running and a double tap gave "Stop was not sent"; the SR-002 spine re-walk wrongly said a rebind drains them.
- Sections changed: design-spec.md (Solution basis, Evidence rows, Intended Change, new Design Decisions list with D-W7, Behavior map BEH-008, DS-002 inventory and narrative, DS-002b return spine, DS-003 narrative, Ownership Map, bounded local spines, examples, reusable structures (`InterruptsAwaitingRebind`), file mapping for the three services and admission, sequence steps 3 and 5 (new unit case), tradeoffs, risks R-3/R-4); investigation-notes.md (source row); new `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md` (SR-002 file marked superseded).
- Intended behavior changed: No.
- Approval impact: none (the approved REQ-003/REQ-005 already required this).
- Design/review basis: ARCH-REV-001 covered SR-002; SR-003 needs re-review of D-W7 and the changed spines.
- Classification: unchanged, Medium / High.
- Handoff: `handoff-architecture-design-revised-sr-003.md` → `/architecture_reviewer`.
- Remaining gaps: none.
- Next action: architecture re-review.
- Review result (recorded 2026-11-18): ARCH-REV-002 **Pass** on SR-003 (AR-001 resolved), `design-review-report.md` / `architecture-review-revision-record.md`; the reviewer routed the package to `/implementation_engineer`. No further Solution Designer action.
