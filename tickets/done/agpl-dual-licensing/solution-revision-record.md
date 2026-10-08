# Solution Revision Record — agpl-dual-licensing

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline | N/A | N/A | Ready for Approval | BEH-001–007, REQ-001–012, AC-001–011, DEC-001–008 | Presented to user for approval |
| SR-002 | Mixed | User approval + delegated decisions; architecture evidence | N/A | Ready for Approval | Approved | DEC-001–008, REQ-007 wording | Requirements approved; decisions resolved; REQ-007 Dockerfile list corrected (evidence-only) |
| SR-003 | Mixed | User: contact email; "lets first work on the license file itself. because its urgent." | N/A | Approved | Approved; Slice 1 design Ready | DEC-004; slice split REQ-001–006, 009, 010 (manual), 011 → Slice 1; REQ-007, 008, 010 (automated) → Slice 2 | Slice 1 design complete, Small/Low |
| SR-004 | Requirements | User delegation for remaining open choices | N/A | Approved | Approved | DEC-003 confirmed; REQ-008 enforcement form = manual CLA (Slice 2) | Delegated decisions recorded |
| SR-005 | Requirements | Delivery DR-001 Blocked, Requirement Gap (release cutoff) | DR-001 | Approved | Ready for Approval | REQ-005, SCN-001 alternate, AC-004 | Proposed version-independent earlier-release wording; awaiting user approval |

## Revision Entries

### SR-001 — Initial AGPL-3.0-only + commercial dual-licensing requirements baseline

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task from `/project_task_manager` (2026-10-08); user clarifications 2026-10-08 ("BingQ is a member, no worries. it has nothing to do with her"; "its our product license itself. thanks")
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not yet created
- IDs affected: BEH-001–007, UC-001–005, REQ-001–012, AC-001–011, SCN-001–006, DEC-001–008 (DEC-005 resolved by user)
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline for user approval
- Canonical sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all)
- Supplemental artifacts: None (scratch `/tmp/agpl-licenses-prod.json`, not promoted)
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: Awaiting explicit user approval of the baseline and DEC-001–004, DEC-006–008
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: N/A before design completion
- Applied handoff-rule outcome: N/A. Routine approval hold in the requirements conversation
- Downstream impact: None yet
- Remaining gaps: DEC-003 legal holder name, DEC-004 commercial contact, user choices on DEC-001/002/006/007/008
- Next action: Obtain user approval and decisions, then begin architecture design

### SR-002 — Approval and delegated decision resolution

- Phase and classification: Mixed, `Refinement`
- Triggering input: User 2026-10-08: "i trust you can pick the best for me. because im not quite aware of software license. i trust you make the most reasonalbe decisions. lets go", then "approved".
- Prior status: Requirements `Ready for Approval`
- Current status: Requirements `Approved`
- IDs affected: DEC-001…DEC-008 resolved (recommendations adopted; DEC-003 holder `Yu Zheng (AutoByteus)` from the Apple Developer ID evidence; DEC-004 initially `team@autobyteus.com`); REQ-007 Dockerfile list corrected to include the released `autobyteus-server-ts/docker/Dockerfile.monorepo` (evidence-only correction; intent unchanged)
- Canonical sections changed: requirements Document Status, REQ-007, Open Decisions, Readiness; investigation-notes Architecture Investigation Findings
- Intended behavior changed: No (decisions within the presented options)
- Approval impact: Approved baseline = SR-001 + SR-002 resolutions
- Design impact: Architecture design started
- Next action: Design

### SR-003 — Contact correction and urgent Slice 1

- Phase and classification: Mixed, `Refinement`
- Triggering input: User 2026-10-08: "i dont have this email, my email is ryan.zheng.work@gmail.com"; "lets first work on the license file itself. because its urgent."; earlier questions: "i guess its simple? its just a license file or something?", "like a license file inside the root project or? or you wanna include in the software itself as well"
- Prior status: Requirements `Approved`; design not yet written
- Current status: Requirements `Approved` (DEC-004 = ryan.zheng.work@gmail.com); design-spec `Ready` for **Slice 1** (licence text)
- IDs affected: DEC-004; Slice 1 = REQ-001…006, REQ-009 (report from investigation), REQ-010 (manual verification), REQ-011; Slice 2 = REQ-007, REQ-008, REQ-010 automated check
- Intended behavior changed: Contact value only (user-supplied). Sequencing only for the rest.
- Open question carried to Slice 2: CLA enforcement form. Solution Designer proposed a manual CLA (no bot) because the archived CLA action is unmaintained and the repo has had only one PR. User has not yet confirmed. This is a proposed change to REQ-008 ("CI check blocks merging") and requires explicit approval before Slice 2 design.
- Open confirmation: holder name "Yu Zheng (AutoByteus)" (asked; not yet answered; user can correct at verification)
- Post-design classification: Slice 1 `task_size=Small`, `architectural_risk=Low` (content-only payload; no structural surface)
- Design impact: `design-spec.md` created for Slice 1
- Applied handoff-rule outcome: Small/Low direct route → `/software_engineering_team/implementation_engineer`; result file `solution-handoff.md`
- Next action: Implementation of Slice 1; Slice 2 design after Slice 1 and user confirmation of CLA form

### SR-004 — Delegated confirmation of holder name and CLA enforcement form

- Phase and classification: Requirements, `Refinement`
- Triggering input: User 2026-10-08: "Yeah, I trust that you have the best knowledge … because that's kind of urgent. I'm afraid that people take our code and then they hide it and they build their product on top of it and then they close source it and then they want to sell it … This is not gonna work."
- Prior status: Requirements `Approved`; two open confirmations (holder name; CLA enforcement form)
- Current status: Requirements `Approved`. DEC-003 `Yu Zheng (AutoByteus)` is **explicitly confirmed** by the user ("yes, the name is Yu Zheng for my personal email address thats right you did good job"). REQ-008 for Slice 2 is amended by delegation: CONTRIBUTING + CLA text with **manual** acceptance (the contributor confirms in the PR; the owner does not merge without it) instead of an automated CI bot. A bot remains a possible later addition.
- Intended behavior changed: Yes for REQ-008 (enforcement mechanism), approved by explicit user delegation to the Solution Designer
- Canonical sections changed: requirements REQ-008, AC-007, DEC-003, DEC-007
- Slice 1 impact: None (Slice 1 already handed to Implementation Engineer; holder name and contact in its design are now user-confirmed)
- Next action: Slice 2 design after Slice 1 completes

### SR-005 — Earlier-release cutoff no longer v1.4.97

- Phase and classification: Requirements, `Requirement Gap`
- Triggering report: Delivery Engineer DR-001 (`delivery-revision-record.md`, `release-deployment-report.md`), 2026-10-08. `origin/personal` gained c413909e5 "bump workspace release version to 1.4.98-beta.1". Tag `v1.4.98-beta.1` was pushed 06:50Z, and its Desktop, Server Docker, Android and iOS release workflows were `in_progress` (verified by `gh run list`). That release is published from an Apache-2.0 tree, so "up to and including v1.4.97" becomes false.
- Prior status: Requirements `Approved`; Slice 1 implemented, validated (API-REV-001 Pass) and integrated (e08be28fb) but not merged
- Current status: Requirements `Ready for Approval` for the REQ-005 delta only; Slice 1 design `Needs Revision` (two sentences)
- Proposed delta: replace the fixed cutoff with a rule. LICENSING.md "Earlier releases" says every release published before the switch to AGPL-3.0 remains under Apache-2.0, and each release's own LICENSE file shows which licence applies. The README sentence uses the same rule. Recommended over moving the cutoff to v1.4.98-beta.1 (option A), because further releases may ship before merge. Cancelling or deleting the beta (option C) is not recommended: it gains nothing, since copies already obtained stay Apache, and it disrupts the release.
- Operational recommendation to the user: merge Slice 1 promptly and avoid new release tags from `origin/personal` until it lands. Every release cut before the merge is published under Apache-2.0.
- Intended behavior changed: Wording of the approved earlier-release statement (preserved outcome unchanged: earlier releases stay Apache-2.0)
- Approval impact: renewed user approval required before revision
- Next action: Obtain user approval, then revise design-spec and route to Implementation Engineer
