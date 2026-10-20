# Solution Revision Record

Package: `settings-update-notifications`. Canonical artifacts in
`/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/`.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task from `/project_task_manager`, 2026-10-20) | N/A | N/A | Approved (Solution Designer within the direction, user informed) | BEH-001..010, REQ-001..020, AC-001..021, SCN-001..008, DEC-001..012 | Product Design Requested |
| SR-002 | Requirements | Interim Product `Requirement Impact` (autobyteus-212, review rounds 6–13), relayed by `/project_task_manager` 2026-10-20 | Impact items 1–3 | Approved (SR-001) | Approved (SR-002: deltas by the user) | UC-004, REQ-009, REQ-010, REQ-011, AC-009, AC-010, SCN-006, DEC-004, DEC-008, DEC-013 | Integrated; no objection; waiting for the final Product package |
| SR-003 | Mixed (Requirements + Design) | Final user-approved Product UI/UX package (autobyteus-212), relayed by `/project_task_manager` 2026-10-20; architecture investigation and design | Designer findings 1–3 | Approved (SR-002); design not started | Requirements Approved (SR-003); design Ready | REQ-004 (DEC-014 reading), REQ-008 (DEC-015), REQ-011/012 (DEC-016), UI section, supplements; design DS-001..DS-008 | Architecture Design Complete — Large / High |
| SR-004 | Design (+ AC-003 verification) | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, AR-003; residual R-1, R-2 | Requirements Approved (SR-003); design Ready | Requirements Approved (SR-004); design Ready (revised) | REQ-003, REQ-004, REQ-019, AC-003 (verification), DEC-017; design: gate persistence, test-feed release link, serialized re-read, wiring | Architecture Design Complete — Large / High; back to review |

## Revision Entries

### SR-001 — Requirements baseline for update notifications

- Phase and classification: Requirements, `Initial Baseline`.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the Task delegated by `/project_task_manager` on the user's request of 2026-10-20; requirements investigation in `investigation-notes.md`.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: requirements `Approved`; design not started.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all (baseline).
- Scenario-basis or scenario-validity changes: SCN-005 (offline/rate limit) and SCN-008 (isolated test feed) are Supported Explicit Edge Scenarios, grounded in the user's direction and the done-when.
- Why this baseline or revision was recorded: first coherent baseline, used for the Product Design request.
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all).
- Supplemental artifacts added, changed or removed: `handoff-product-design-request.md` added.
- Product design evidence or product decisions incorporated: none yet.
- Intended behavior changed: N/A (baseline).
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved by the Solution Designer within the direction (no `Needs user` decision); the user was informed in the Solution Designer conversation on 2026-10-20, with the decisions DEC-001..DEC-012 summarized. Baseline: `requirements-doc.md` at SR-001.
- Behavior-defining supplement versions and approval references: none yet; the Product UI/UX package requires the user's confirmation.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification and rationale changes: N/A.
- Applied handoff-rule outcome / result-file reference: `Product Design Requested`; the team's handoff rules have no Product route, so the result returns to the calling workflow, `/project_task_manager` (its org rule delegates Product Design to the Product Team and passes the result back by run ID). Result file: `handoff-product-design-request.md`.
- Downstream and architecture-review impact: architecture design waits for the user-approved Product design.
- Remaining gaps, assumptions or blocked decisions: ASM-001 (verification repositories), ASM-002 (6-hour cadence), RSK-001, RSK-002, UNK-001, UNK-002.
- Next action: Product Team UI/UX design with the user's approval; then SR-002 integrates it and architecture design starts.

### SR-002 — The user's Product-review decisions: no skip, a persistent indicator, a Notification Center panel

- Phase and classification: Requirements, `Refinement` (the user changed intended behavior).
- Triggering user feedback, Product package, investigation evidence, or role/report/round: an interim `Requirement Impact` from the Product UI/UX Designer (Task autobyteus-212), forwarded by `/project_task_manager` on 2026-10-20. The user's words are in `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/product-ticket.md`: rounds 6–7 ("don't make it redundant"; the setting card in Server Settings → Basics), round 9 ("do we really need the skip? … I personally have never clicked a skip … I update to the latest"), round 11 ("Gray color makes people feel like notification is normally not gray"), and the "Requirement Impact" section. Round-13 proposal at commit `52364d3` on the design repository's `design/settings-update-notifications` branch.
- Triggering finding IDs: Requirement Impact items 1, 2 and 3.
- Prior authoritative requirements/design status: requirements Approved (SR-001); design not started.
- Current authoritative requirements/design status: requirements Approved (SR-002); design not started.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: UC-004, REQ-009 (now: no dismiss/skip, no skipped-version state; Clear for handled), REQ-010 (no dismissed state), REQ-011 (Notification Center panel opened from the Settings row; indicator counts waiting updates, emphasised while unread, softer once read), AC-009, AC-010, SCN-006, DEC-004 (superseded), DEC-008 ("clears"), DEC-013 (new; records the user's decisions); the desired outcome, the success line, the UI required-screens list and the acceptable-loss line.
- Scenario-basis or scenario-validity changes: SCN-006 now covers read state and Clear, not skipping.
- Why this baseline or revision was recorded: the user changed intended behavior during the Product review.
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` (Document Status, Problem And Desired Outcome, UC-004, REQ-009..011, AC-009..010, SCN-006, UI section, Data Continuity, Decisions, Traceability, Readiness); `investigation-notes.md` (Product Design Findings).
- Supplemental artifacts added, changed or removed: none. The Product ticket is linked as evidence and is not yet an approved supplement.
- Product design evidence or product decisions incorporated: the three user decisions only; the visual details wait for the final, user-approved UI/UX spec.
- Intended behavior changed: `Yes`.
- Approval impact, exact approved requirements baseline, who approved, and approval reference: the deltas are the user's own decisions (quoted above; the Project Task Manager's relay carries the user's words). Baseline: `requirements-doc.md` at SR-002. Unchanged SR-001 content keeps its approval.
- Behavior-defining supplement versions and approval references: the Product UI/UX package is still pending the user's approval.
- Affected design/review basis invalidated or rebuilt: N/A (no design yet).
- Post-design task-size/risk classification and rationale changes: N/A.
- Applied handoff-rule outcome / result-file reference: no outcome needs routing. A short reply to `/project_task_manager` (the relay for the Product designer) confirms the integration and that there is no objection.
- Downstream and architecture-review impact: the architecture must store no skip state, must provide Clear for handled items, and must count waiting items for the indicator.
- Remaining gaps, assumptions or blocked decisions: the final UI/UX package with the user's approval; ASM-001, ASM-002; RSK-001, RSK-002; UNK-001, UNK-002. Accepted cost (the user's): someone who deliberately stays on an old version keeps seeing it counted.
- Next action: wait for the final Product package; integrate it (SR-003); then design the architecture.

### SR-003 — Approved UI/UX package integrated; architecture design complete

- Phase and classification: Mixed (Requirements `Refinement` + Design), integrating a returned Product result.
- Triggering user feedback, Product package, investigation evidence, or role/report/round:
  - The Product Team's final package for Task autobyteus-212, forwarded by `/project_task_manager` on 2026-10-20.
  - The user approved it: "i like the UI approved", round 14, commit `e6ef28c`. Integrated on the design repository's `personal` at `288ef06`.
  - Spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md`; final references VIS-001..028.
  - The Solution Designer verified the approval record, the spec and VIS-003 against each other.
  - Architecture investigation AF-01..AF-14 in `investigation-notes.md`.
- Triggering finding IDs: the designer's findings — 1 (REQ-004 details placement), 2 (live order), 3 (no Settings section).
- Prior authoritative requirements/design status: requirements Approved (SR-002); design not started.
- Current authoritative requirements/design status: requirements Approved (SR-003); `design-spec.md` Ready.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected:
  - UI section (now normative from the spec);
  - supplements (UI/UX spec approved);
  - DEC-014: REQ-004 items may be in the row's details, one click away;
  - DEC-015: a waiting notification with nothing updated and no update offered is removed, not shown as "Updated";
  - DEC-016: startup-check errors of the app are quiet.
  - No REQ/AC text changed except the Document Status and Readiness lines.
- Scenario-basis or scenario-validity changes: none.
- Why this baseline or revision was recorded: the Product result returned with the user's approval, and the architecture design was completed on that basis.
- Canonical requirements, investigation and design sections changed:
  - `requirements-doc.md`: Document Status, UI section, Supplemental Artifacts, Decisions DEC-014..016, Readiness;
  - `investigation-notes.md`: Meta, Product Design Findings, Architecture Investigation Findings;
  - `design-spec.md` (new);
  - `follow-ups.md` (new: FU-001, FU-002).
- Supplemental artifacts added, changed or removed: the Product UI/UX spec and final references are linked as approved, behavior-defining supplements (externally owned).
- Product design evidence or product decisions incorporated: the whole approved spec. The live order while the panel is open is recorded as reviewed behavior.
- Intended behavior changed: `No` for the user-visible requirements beyond the approved UI. DEC-014..016 are Solution Designer readings within the direction; the user is informed in the Solution Designer conversation.
- Approval impact, exact approved requirements baseline, who approved, and approval reference:
  - Baseline: `requirements-doc.md` at SR-003.
  - UI: the user, 2026-10-20 ("i like the UI approved").
  - DEC-014..016: the Solution Designer within the direction, user informed (2026-10-20).
- Behavior-defining supplement versions and approval references: `ui-ux-spec.md` + `visual-references/` at design repository `288ef06`, user-approved 2026-10-20.
- Affected design/review basis invalidated or rebuilt: N/A (first design).
- Post-design task-size/risk classification and rationale changes: `task_size=Large`, `architectural_risk=High`. See `design-spec.md` (three runtimes, new persistence, background lifecycle, concurrency, network behavior, new contracts).
- Applied handoff-rule outcome / result-file reference: see `handoff-architecture-review.md` (Route Record).
- Downstream and architecture-review impact: an independent architecture review is required by the rules (Large / High).
- Remaining gaps, assumptions or blocked decisions:
  - ASM-001: verification repositories;
  - ASM-002: the 6-hour cadence;
  - the design's Risks section: generic test feed in a packaged isolated build; macOS install of a test build.
- Next action: architecture review.

### SR-004 — Architecture review ARCH-REV-001 findings resolved

- Phase and classification: Design, `Design Impact` (plus a verification-only refinement of AC-003).
- Triggering user feedback, Product package, investigation evidence, or role/report/round: architecture review ARCH-REV-001 against SR-003, Fail.
  - Report: `design-review-report.md`.
  - Record: `architecture-review-revision-record.md`.
  - From `/software_engineering_team/architecture_reviewer`, 2026-10-20.
- Triggering finding IDs: AR-001, AR-002 (blocking), AR-003 (non-blocking), residual notes R-1 and R-2.
- Prior authoritative requirements/design status: requirements Approved (SR-003); design Ready.
- Current authoritative requirements/design status: requirements Approved (SR-004); design Ready (revised).
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected:
  - AR-001 → REQ-003, QR-001, AC-013: `GitHubRateLimitGate` now persists its blocked-until time in `<app-data>/github/rate-limit.json` and loads it on first use, so the stop holds across restarts. The literal REQ-003 is kept; no reading was needed.
  - AR-002 → REQ-004, REQ-019, AC-003, new DEC-017: no Release page link under the e2e test feed (`releasePageUrl = null`). AC-003's link is verified with the real GitHub feed configuration (Electron tests, the user's beta check). AF-10, the Off-Spine row and the Interface table now agree.
  - AR-003 → BEH-002: inside `serialize(id, …)` every package check and update re-reads its record and writes only from that fresh record.
  - R-1: the resolver and the composition share `getInstance()` singletons.
  - R-2: the scheduler re-checks the setting and the gate before every source.
- Scenario-basis or scenario-validity changes: none.
- Why this baseline or revision was recorded: to resolve the review's Design Impact findings.
- Canonical requirements, investigation and design sections changed:
  - `requirements-doc.md`: Status lines, AC-003, DEC-017;
  - `investigation-notes.md`: Meta, AF-10, supplement inventory (UI/UX spec now Approved);
  - `design-spec.md`: approval basis, Persisted Data, Ownership Map (AgentPackageService, GitHubRateLimitGate), DS-006, Off-Spine (`appReleasePage.ts`), Interface table, File Mapping, Examples, Risks, Guidance (wiring).
- Supplemental artifacts added, changed or removed: none.
- Product design evidence or product decisions incorporated: none new. The approved spec shows the Release page link in the app row's details; with the real GitHub feed that is unchanged.
- Intended behavior changed: `No` for the released app. AC-003's expected outcome under the test-only feed now names no Release page link (DEC-017, a verification detail within the direction; the user is informed).
- Approval impact, exact approved requirements baseline, who approved, and approval reference: baseline `requirements-doc.md` at SR-004. DEC-017 is by the Solution Designer within the direction, user informed in the Solution Designer conversation (2026-10-20). Earlier approvals unchanged.
- Behavior-defining supplement versions and approval references: unchanged (UI/UX spec at `288ef06`).
- Affected design/review basis invalidated or rebuilt: ARCH-REV-001 covered SR-003. The revised design needs the reviewer's recheck of AR-001..003.
- Post-design task-size/risk classification and rationale changes: unchanged (`Large` / `High`).
- Applied handoff-rule outcome / result-file reference: `handoff-architecture-review.md` (Route Record, round 2).
- Downstream and architecture-review impact: re-review of AR-001..AR-003.
- Remaining gaps, assumptions or blocked decisions: unchanged (ASM-001, ASM-002; the design's Risks).
- Next action: architecture re-review.
