# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Task autobyteus-412, initial baseline | FU-003, FU-004 (Task) | N/A | Requirements Approved; Design Ready | BEH-001–005; REQ-001–007; AC-001–009 | Architecture Design Complete; `Medium` / `High` |
| SR-002 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, AR-003; residual note | Design Ready (SR-001), review Fail | Requirements Approved (SR-001, unchanged); Design Ready | BEH-001, BEH-002, BEH-005; REQ-002, REQ-003, REQ-005, REQ-007; AC-003, AC-004 | Architecture Design Complete; `Medium` / `High` |

## Revision Entries

### SR-001 — Clear superseded node-update failures; publish the desktop updater files after the server packages

- Phase and classification: `Initial Baseline` (requirements and design).
- Trigger: Project Task autobyteus-412 from `/project_task_manager`. Evidence: MEAS-01 (asset times of beta.5/6/7), RUN-01 and RUN-02 (the user's record and nodes, read-only).
- Triggering finding IDs: the Task's FU-003, FU-004.
- Prior status: N/A.
- Current status: requirements `Approved`; design `Ready`.
- IDs affected: BEH-001–005, UC-001–004, REQ-001–007, AC-001–009, SCN-001–005, DEC-001–006.
- Scenario basis: SCN-001–004 supported; SCN-005 recorded as an unsupported automatic path (FU-001).
- Why recorded: first coherent baseline.
- Canonical sections: all of `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`; `follow-ups.md` FU-001.
- Supplements: None.
- Product design evidence: N/A.
- Intended behavior changed: N/A (baseline).
- Approval: approved by the Solution Designer within the Task's direction (no `Needs user` decision). The user was informed in the Solution Designer's conversation on 2026-11-07 (DEC-001 to DEC-006).
- Supplement approvals: N/A.
- Design/review basis: N/A (first).
- Classification: `task_size` `Medium`, `architectural_risk` `High` (release publish order is a deployment behavior; new window→main IPC; record removal).
- Handoff: see `handoff-architecture-design-complete.md`.
- Downstream impact: none yet.
- Remaining gaps: RSK-002 (real order visible on the next tag only).
- Next action: route per handoff rules.

### SR-002 — Card recheck trigger, recheck guard and pass scope (ARCH-REV-001)

- Phase and classification: `Design Impact`.
- Trigger: architecture review ARCH-REV-001, `design-review-report.md` (Fail), from `/software_engineering_team/architecture_reviewer`.
- Triggering finding IDs: AR-001 (High), AR-002 (Medium), AR-003 (Low), and the residual note on RELEASE.md recovery.
- Prior status: design `Ready` at SR-001, review Fail.
- Current status: requirements `Approved` at SR-001 (unchanged); design `Ready` at SR-002.
- IDs affected: BEH-001, BEH-002, BEH-005; REQ-002, REQ-003, REQ-005, REQ-007; AC-003, AC-004; spines DS-001, DS-002.
- Scenario-basis changes: none. P-001 and P-002 confirmed by reading `NodeServerUpdate.vue:2,31,80`, `NodeAutoUpdate.vue:84`, `nodeServerUpdateStore.ts:110`, `nodeAutoUpdater.ts:112-136`.
- Canonical sections changed in `design-spec.md`:
  - Primary Execution Spines (DS-002) and Spine Narratives (DS-001 pass scope, DS-002 trigger).
  - Interface Boundary Mapping (`recheckFailure` sequence: holds `checking`, re-reads after the await, removes only the same `AUTO_FAILED` entry for V).
  - Final File Responsibility Mapping (`NodeServerUpdate.vue`: one watch on the combined answer/entry key, `immediate`; the required test cases; RELEASE.md's combined failure case).
  - Concrete Examples (first-view trigger; recheck vs pass; pass at V+1).
  - Change Scope (`docs/design-cases.md`).
- Project design cases: `docs/design-cases.md` Case 10, a new instance for autobyteus-412 AR-002 (a check before an await, then an action after it).
- Supplements: none.
- Intended behavior changed: `No`.
- Approval impact: none. The SR-001 requirements approval still applies.
- Design/review basis: ARCH-REV-001 covered SR-001. SR-002 needs re-review.
- Classification: unchanged, `Medium` / `High`.
- Handoff: `handoff-architecture-design-complete.md`, Round 2 section.
- Remaining gaps: RSK-001, RSK-002 as before.
- Next action: architecture re-review.
- Review outcome (recorded afterwards): ARCH-REV-002 Pass on SR-002. P-003 is a non-blocking residual (cosmetic). The reviewer routed the package to implementation.
