# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-416) | 403 FU-001; 417 FU-001, FU-002; new BEH-004 | N/A | Approved | BEH-001…010; REQ-001…010; AC-001…014 | Approved by the user (DEC-001 = A, DEC-002 = A) |
| SR-002 | Design (+ Evidence) | Architecture design on the approved SR-001 | UNK-001, UNK-002 resolved (A1) | Requirements Approved; design N/A | Design Ready | All REQ/AC (design); no requirement change | Large / High; architecture review route |
| SR-003 | Design (+ Evidence) | ARCH-REV-001 Fail (Design Impact) | AR-001, AR-002; R-3, R-4, R-5 | Design Ready (SR-002), review Fail | Design Ready | REQ-008, REQ-009 (design only); AC-008, AC-010 tests | D6 revised and re-measured; re-review requested |

## Revision Entries

### SR-001 — Requirements baseline for the node's web-page and file rule set

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Task autobyteus-416 (user's word 2026-11-07 to merge the three security findings); 403 and 417 follow-ups; the user's questions in this conversation (2026-11-07), answered.
- Triggering finding IDs: 403 FU-001 (DNS rebinding), 417 FU-001 (loopback origins), 417 FU-002 (user files as documents); BEH-004 (`file://` pages in the in-app browser), found and measured here.
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Approved`; design not started
- IDs affected: all (baseline)
- Scenario-basis changes: SCN-001…SCN-009 established
- Why recorded: first baseline presented to the user for DEC-001 and DEC-002
- Canonical sections: requirements-doc.md (all), investigation-notes.md (all), follow-ups.md (FU-001)
- Supplements: probes and evidence (investigation inventory), evidence only
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline). It replaces 403's DEC-004 (loopback origins) pending DEC-002.
- Approval impact: approved by the user, 2026-11-07, in the Solution Designer conversation ("i trust your judgement, you understand more than me actually", answering the two questions presented with recommendations): DEC-001 = A, DEC-002 = A. DEC-003…009 decided by the Solution Designer within the direction and presented to the user in the same message. Baseline: SR-001.
- Behavior-defining supplement versions: none
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold in the user conversation)
- Downstream impact: none yet
- Remaining gaps: UNK-001, UNK-002 for architecture
- Next action: architecture design

### SR-002 — Architecture design

- Phase and classification: Design (with evidence), `Refinement`
- Triggering input: SR-001 approved by the user
- Triggering finding IDs: UNK-001 (PDF under a sandbox CSP) and UNK-002 (Electron header rewrite), both resolved by measurement (`evidence/A1-*`)
- Prior status: requirements Approved; design not started
- Current status: requirements Approved (unchanged); design `Ready`
- IDs affected: none changed; design maps BEH-001…010, REQ-001…010, AC-001…014 to DS-001…DS-005 and D1–D9
- Scenario-basis changes: none
- Why recorded: the design is complete
- Canonical sections: `design-spec.md` (new); `investigation-notes.md` Architecture Investigation Findings
- Supplements: `probes/electron-origin-rewrite-and-pdf-probe.js`, `evidence/A1-*` (evidence)
- Intended behavior changed: `No`. The PDF exception in DEC-003 is not needed (measured); DEC-003 allowed for it only "where it would stop a viewer"
- Approval impact: none; SR-001 approval applies
- Affected design/review basis: N/A (first design)
- Post-design classification: `task_size` Large, `architectural_risk` High (security boundary, blast radius across all clients)
- Applied handoff-rule outcome: Architecture Design Complete (Large / High) → `/software_engineering_team/architecture_reviewer`, delivered 2026-11-07 (`handoff.md`)
- Downstream impact: architecture review before implementation
- Remaining gaps: none blocking; RSK-001/RSK-002 carried to the release note
- Next action: hand off per the rules

### SR-003 — D6 revised after ARCH-REV-001

- Phase and classification: Design (with evidence), `Design Impact`
- Triggering input: architecture review ARCH-REV-001, `Fail` (`design-review-report.md`, round 1), from `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_8982c6eccaa0444a929176b2fd422e47`)
- Triggering finding IDs: AR-001 (High: D6 keyed on the frame URL; `about:blank`/`srcdoc` child frames escaped), AR-002 (Medium: D6 rewrote GET navigations from a `file://` tab); non-blocking R-3, R-4, R-5
- Prior status: requirements Approved (SR-001); design Ready (SR-002), review Fail
- Current status: requirements Approved (unchanged); design `Ready` (SR-003)
- IDs affected: D6, DS-003, Entry-Form Table, Concrete Examples, Interface Boundary Mapping, Final File Responsibility Mapping, Change Sequence step 6, Guidance, Risks; REQ-008/REQ-009 and AC-008/AC-010 unchanged (the tests now cover the forms)
- Scenario-basis changes: none (SCN-004 now traced for every form a `file://` document can use)
- Why recorded: Design Impact resolved
- Canonical sections: `design-spec.md` (as listed); `investigation-notes.md` (Architecture Investigation Findings, inventory)
- Supplements: `probes/d6-file-origin-forms-probe.js`, `probes/d6-http-page-control-probe.js`, `evidence/SR-003-*` (evidence); the reviewer's probe and evidence kept as the basis of AR-001/AR-002
- Intended behavior changed: `No`
- Approval impact: none; the SR-001 user approval applies
- Affected design/review basis: ARCH-REV-001 covered SR-002; it passed D1–D5 and D7–D9, unchanged in SR-003 except two guidance lines (R-3, R-5) and one architecture-test exclusion note (R-4)
- Post-design classification: unchanged, `task_size` Large, `architectural_risk` High
- Applied handoff-rule outcome: Architecture Design Complete (Large / High) → `/software_engineering_team/architecture_reviewer` (re-review)
- Downstream impact: re-review, limited by the reviewer's note to D6, DS-003, the Entry-Form Table, examples, tests and the new evidence
- Remaining gaps: none
- Next action: architecture re-review
- Review outcome (recorded 2026-11-07): ARCH-REV-002 Pass on this basis; routed by the reviewer to implementation. Residual risks R-7 and R-8 are non-blocking (see `design-review-report.md`).
