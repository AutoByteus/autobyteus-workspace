# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Initial coherent baseline from Task autobyteus-435 (items 1–12) | N/A | N/A | Requirements `Approved` (within the direction); Design `Ready` | BEH-001…012; REQ-001…012 | Architecture Design Complete; `task_size=Medium`, `architectural_risk=High` |
| SR-002 | Mixed (Design Impact + requirement clarification) | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002 (blocking); AR-003, AR-004 | Requirements `Approved` (SR-001); Design `Needs Revision` | Requirements `Approved` (SR-002); Design `Ready` | BEH-005, BEH-009, BEH-010; REQ-005; AC-005-1, -3, -5…7; DEC-014, DEC-015 | Architecture Design Complete (revised); classification unchanged |
| SR-003 | Mixed (Design Impact + requirement clarification) | CRR-001 (code review Fail, Design Impact) | CR-001 | Requirements `Approved` (SR-002); Design `Ready` (ARCH-REV-002 Pass) | Requirements `Approved` (SR-003); Design `Ready` | BEH-005; REQ-005; AC-005-6, AC-005-8; DEC-016 | Architecture Design Complete (revised, DS-006 only); classification unchanged |

## Revision Entries

### SR-001 — Twelve follow-ups: requirements baseline and design

- Phase and classification: `Initial Baseline` (requirements and design).
- Triggering input: Project Task `autobyteus-435` description (items 1–4, from autobyteus-426 FU-001…004) and comments (items 5–7 from 432 FU-001…003 + the full-screen hint residual; 8–9 from 433 FU-001, FU-003; 10 from 436 FU-003 / 446 FU-003; 11–12 from 446 FU-001, FU-002).
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: N/A.
- Current status: requirements `Approved`; design `Ready`.
- IDs affected: all (BEH-001…012, REQ-001…012, AC-001-1…AC-012-1, SCN-001…010, DEC-001…013).
- Scenario-basis changes: N/A (baseline).
- Why recorded: first coherent baseline.
- Canonical sections: all of `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`; `follow-ups.md` created (FU-001, FU-002).
- Supplements: none behavior-defining; the feasibility probe text lives in design-spec § Concrete Examples.
- Product design evidence: N/A.
- Intended behavior changed: N/A (baseline). Corrections to the Task's leads, all within its direction and recorded as decisions: item 1's requester is the server overlay, not the plugin (DEC-001); item 2 uses a window-only opaque request because a node-side check is forbidden while Remote Collaboration is off (DEC-002); item 10 makes only credential refusals final so Phone Access off still resumes by itself (DEC-008).
- Approval: Solution Designer within the direction, user informed in the conversation on 2026-11-10; no `Needs user` decision.
- Supplement approvals: N/A.
- Design/review basis: new.
- Classification: `Medium` / `High` (design-spec § Task Size And Architectural Risk).
- Handoff: see `handoff-architecture-design-complete.md` § Route.
- Downstream impact: independent architecture review per the handoff rules.
- Remaining gaps: UNK-001 (other cutout devices); none blocking.
- Next action: architecture review.

### SR-002 — Item 6 restore made explicit; Create-run entry form; review notes applied

- Phase and classification: `Design Impact` (AR-001, AR-002), with a requirement clarification of REQ-005 within the direction (DEC-014, DEC-015).
- Triggering input: architecture review `ARCH-REV-001` (`design-review-report.md`, round 1, Fail / Design Impact), 2026-11-10.
- Triggering finding IDs: AR-001 (Create run writes no `row`), AR-002 (restore readiness and "gone" decision unspecified; MP-002 delegated rows not yet read; MP-003 first read fails), AR-003 (DS-004 inventory), AR-004 (inactive digest wording).
- Prior status: requirements `Approved` (SR-001); design `Ready` → `Needs Revision`.
- Current status: requirements `Approved` (SR-002); design `Ready`.
- IDs affected: REQ-005 (wording: both entry forms; "Opening…" while restoring; list fallback only after the reads settle; list with connection state when they fail); AC-005-1, AC-005-3 traced; new AC-005-5, AC-005-6, AC-005-7; DEC-014, DEC-015; design DS-004 (inventory note), DS-006 write (entry form 2) and restore (steps 1–7, owner `useMobileSubjectRestore`), interfaces (`openRun` subject on every call, `agentRunRowKey`, `revealRow`, restore signature), file mapping (`runListProjection.ts`, `useMobileRunTree.ts`, shell), shared-structure check (inactive digest meaning), examples, risks, tradeoffs, guidance tests.
- Scenario-basis changes: SCN-005 now covers Create run (MP-001) and a restore while the node cannot be read (MP-003); both Supported Normal Scenarios.
- Why recorded: completed revision round after a review Fail.
- Canonical sections changed: requirements-doc (Status, REQ-005, AC table, Decisions, Traceability); design-spec (Solution basis, Health Assessment triggers, DS-004 row, DS-006 spines and narrative, Interface mapping and check, Shared structure check, Final file mapping, Examples, Tradeoffs, Risks, Guidance); follow-ups.md (FU-003).
- Supplements: none.
- Intended behavior changed: clarified, not changed in direction. DEC-014 decides an outcome REQ-005 did not state (failed read at restore → list with connection state, rather than an unending wait); DEC-015 decides the visible restore state (existing "Opening…").
- Approval: Solution Designer within the direction; user informed in the conversation on 2026-11-10 (no `Needs user` decision).
- Affected design/review basis: ARCH-REV-001 covered SR-001; items 1–5 and 7–12 passed there and are unchanged except AR-003/AR-004 wording; DS-006 needs re-review.
- Classification: unchanged, `Medium` / `High`.
- Handoff: `handoff-round-2-architecture-design-complete.md`.
- Downstream impact: re-review by the architecture reviewer.
- Remaining gaps: UNK-001.
- Next action: architecture re-review.
- Review outcome (recorded 2026-11-10): ARCH-REV-002 `Pass` on SR-002 (AR-001…AR-004 resolved; `design-review-report.md`, `architecture-review-revision-record.md`). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; informational, no forwarding by the Solution Designer.

### SR-003 — A created run's route follows its promotion from draft to node run

- Phase and classification: `Design Impact` (CRR-001 CR-001), with a requirement clarification of REQ-005 within the direction (DEC-016).
- Triggering input: code review `CRR-001` (`code-review-report.md`), 2026-11-10, on IR-001 commits `e5ca0e1da7`, `6ca743fee0`.
- Triggering finding IDs: CR-001 (Create run writes the draft's `temp-*` ID into `row`; promotion at the first send never updates the route; AC-005-6 fails on the real path). Non-blocking notes: C-05 (row-key format read in two places; left as the reviewer's optional tidy-up, not required), `teamExecutionViewState.ts` over 500 lines (added to FU-002).
- Prior status: requirements `Approved` (SR-002); design `Ready`, ARCH-REV-002 Pass.
- Current status: requirements `Approved` (SR-003); design `Ready`.
- IDs affected: REQ-005 (unchanged wording); AC-005-6 (precondition: first message sent; route names the node's run ID); new AC-005-8 (reload before the first send → list); DEC-016; design DS-006 entry form 2 corrected, new DS-006b, interfaces `replaceRowKey`, `useMobileRouteRunSync`, file mapping, test guidance; docs/design-cases.md Case 20.
- Scenario-basis changes: SCN-005 Create run form split into "after the first send" (reopens) and "before it" (list).
- Root cause of the miss: DS-006 entry form 2 took `onLaunched`'s value as the run's identity without tracing where it is minted (Principle 1); recorded as design Case 20.
- Intended behavior changed: clarified within the direction (what a reload before the first send shows; the route names the node's ID, matching the desktop chat route's D-13 rule).
- Approval: Solution Designer within the direction; user informed in the conversation on 2026-11-10; no `Needs user` decision.
- Affected design/review basis: ARCH-REV-002 covered SR-002; only DS-006 (entry form 2 and the new DS-006b) changed. Items 1–5, 7–12 and DS-006 entry form 1 and restore are unchanged. CRR-001's other conclusions stand.
- Classification: unchanged, `Medium` / `High`.
- Handoff: `handoff-round-3-architecture-design-complete.md`.
- Next action: architecture re-review of the DS-006 delta; then implementation rework limited to entry form 2 / DS-006b; then the code reviewer's Targeted Delta Review.
- Review outcome (recorded 2026-11-10): ARCH-REV-003 `Pass` on SR-003 (DS-006b confirmed; AR-005 non-blocking, sent to implementation as guidance: reuse the D-13 promotion detection of `useChatRouteRunSync` rather than copy it). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; informational, no forwarding by the Solution Designer.
