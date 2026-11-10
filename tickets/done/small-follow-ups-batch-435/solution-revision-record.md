# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Initial coherent baseline from Task autobyteus-435 (items 1–12) | N/A | N/A | Requirements `Approved` (within the direction); Design `Ready` | BEH-001…012; REQ-001…012 | Architecture Design Complete; `task_size=Medium`, `architectural_risk=High` |
| SR-002 | Mixed (Design Impact + requirement clarification) | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002 (blocking); AR-003, AR-004 | Requirements `Approved` (SR-001); Design `Needs Revision` | Requirements `Approved` (SR-002); Design `Ready` | BEH-005, BEH-009, BEH-010; REQ-005; AC-005-1, -3, -5…7; DEC-014, DEC-015 | Architecture Design Complete (revised); classification unchanged |
| SR-003 | Mixed (Design Impact + requirement clarification) | CRR-001 (code review Fail, Design Impact) | CR-001 | Requirements `Approved` (SR-002); Design `Ready` (ARCH-REV-002 Pass) | Requirements `Approved` (SR-003); Design `Ready` | BEH-005; REQ-005; AC-005-6, AC-005-8; DEC-016 | Architecture Design Complete (revised, DS-006 only); classification unchanged |
| SR-004 | Mixed (Requirements + Design) | Task comments 2026-11-10 (items 13, 14) via `/project_task_manager` | N/A | Requirements `Approved` (SR-003); Design `Ready` (ARCH-REV-003 Pass) | Requirements `Approved` (SR-004); Design `Ready` | BEH-013, BEH-014; REQ-013, REQ-014; AC-013-1, AC-014-1, AC-014-2; SCN-011, SCN-012; DEC-017, DEC-018 | Architecture Design Complete (revised: two items added); classification unchanged |
| SR-005 | Mixed (Design Impact + requirement revision) | API-REV-001 Fail (F1, F2) → CRR-003 failure-origin review | CR-002, CR-003 | Requirements `Approved` (SR-004); Design `Ready` (ARCH-REV-004 Pass) | Requirements `Approved` (SR-005); Design `Ready` | BEH-002, BEH-004; REQ-003, REQ-004; AC-003-1, AC-004-1; DEC-019, DEC-020 | Architecture Design Complete (revised DS-002, DS-005); classification unchanged |

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

### SR-004 — Items 13 and 14 added

- Phase and classification: `Refinement` (scope added by the Task; requirements and design).
- Triggering input: the Project Task Manager's message (2026-11-10) and the Task's comments: item 13 (autobyteus-455 FU-001, self-delegation refusal words) and item 14 (the user's request, two phone screenshots: System instructions text in full in Activity, phone and desktop). The PM asks for item 14 in round 1.
- Triggering finding IDs: N/A.
- Prior status: requirements `Approved` (SR-003); design `Ready` (ARCH-REV-003 Pass); IR-002 passed the code review's Targeted Delta Review; API/E2E in progress on items 1–12.
- Current status: requirements `Approved` (SR-004); design `Ready`.
- IDs affected: BEH-013, BEH-014; UC-009, UC-010; REQ-013, REQ-014; AC-013-1, AC-014-1, AC-014-2; SCN-011, SCN-012; DEC-017, DEC-018; design DS-010, DS-011, behavior map, file mapping, change scope, tradeoffs, risks; investigation Source Log (three rows).
- Intended behavior changed: added (two new items within the Task's direction; item 14 in the user's own words). No earlier requirement changed.
- Approval: Solution Designer within the direction (the Task now includes both items; item 14 is the user's request); user informed in the conversation on 2026-11-10; no `Needs user` decision.
- Affected design/review basis: ARCH-REV-003 covered SR-003; items 1–12 unchanged. New: DS-010 (server, wording only), DS-011 (one class change in one shared web component).
- Classification: unchanged, `Medium` / `High` (the additions are Small / Low on their own).
- Handoff: `handoff-round-4-architecture-design-complete.md`.
- Next action: architecture review of the SR-004 additions; then implementation IR-003 (items 13, 14) on top of IR-002; code review; API/E2E covers items 13 and 14 as well.
- Review outcome (recorded 2026-11-10): ARCH-REV-004 `Pass` on SR-004 (DS-010, DS-011 confirmed; no findings). The reviewer's wording note (design-spec § Solution And Approval Basis did not name SR-003 in its baseline line) was corrected as a factual fix. The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; informational, no forwarding by the Solution Designer.

### SR-005 — Item 2 reads the desktop window's refusal; item 5 lays out edge to edge in full screen on Android 9–14

- Phase and classification: `Design Impact` (CRR-003 CR-002, CR-003 from API-REV-001 F1, F2), with a requirement revision of REQ-003's mechanism and AC-003-1's words, and AC-004-1's platform range, within the direction.
- Triggering input: API/E2E round 1 (`api-e2e-execution-coverage-report.md`, API-REV-001, Fail; evidence `a380fc419f`), failure-origin review `CRR-003` (`code-review-report.md`), 2026-11-10.
- Findings: CR-003 (F2, API-13): the packaged Electron window reads the Host gate's 403 and its code; my premise (measured in plain Chromium) was wrong; the window showed "isn't an AutoByteus node". CR-002 (F1, API-18): on API 34 the content frame starts at the cutout because the decor fits system windows; the design's cutout mode plus root padding was enough only on API 35.
- Prior status: requirements `Approved` (SR-004); design `Ready` (ARCH-REV-004 Pass); IR-003 (`432d1c3af2`, items 13–14) awaiting source review.
- Current status: requirements `Approved` (SR-005); design `Ready`.
- IDs affected: REQ-003 (a/b/c), AC-003-1 (words: the existing `cause.hostRefused`), DEC-002 (desktop part superseded), DEC-019; REQ-004 unchanged, AC-004-1 (API 34 and 35), DEC-020; design DS-002, DS-005, file mapping rows (probe, words, localization, controller), risks; investigation Runtime findings (two rows); `docs/design-cases.md` Case 21.
- Intended behavior changed: AC-003-1's desktop words change to the exact cause (the user's direction "say a refused name is refused" is met more precisely); REQ-004's outcome is unchanged, its proof now covers API 28–34.
- Approval: Solution Designer within the direction; user informed in the conversation on 2026-11-10; no `Needs user` decision.
- Affected design/review basis: ARCH-REV-004 covered SR-004; DS-002 and DS-005 changed; everything else unchanged. IR-003 (items 13–14) is unaffected and still needs source review.
- Classification: unchanged, `Medium` / `High`.
- Handoff: `handoff-round-5-architecture-design-complete.md`.
- Next action: architecture review of the DS-002/DS-005 delta; implementation IR-004 (both deltas); code review (IR-003 and IR-004); API/E2E reruns API-13, API-18, API-07, API-06.
- Review outcome (recorded 2026-11-10): ARCH-REV-005 `Pass` on SR-005 (DS-002, DS-005 confirmed; no finding). Residual noted by the reviewer and sent to implementation: in full screen on API 26–29 the keyboard inset depends on the resolved soft-input mode (the manifest declares none); implementation confirms or declares it and states what is verified. The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; informational, no forwarding by the Solution Designer.
