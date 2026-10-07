# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline for Product Team handoff | N/A | N/A | Draft | BEH-001..004, REQ-001..006, SCN-001..004, DEC-001..005 | Product Design requested |
| SR-002 | Requirements | Product Design Completed (user-confirmed 2026-10-07) | F-005, F-006 | Draft | Ready for Approval | BEH-001..005, REQ-001..010, AC-001..015, SCN-001..005, DEC-001..007 | Scope narrowed; awaiting user approval |
| SR-003 | Requirements | Product round 2 Design Completed (user-confirmed 2026-10-07) | — | Ready for Approval (SR-002, not approved) | Ready for Approval | New BEH-006, UC-006, REQ-011..016, AC-016..023, SCN-006, DEC-008..010; changed AC-008, REQ-010 | Temp tasks added; awaiting user approval of the whole ticket |
| SR-004 | Design | SR-003 approved; architecture design | — | No design | Design Ready | All SR-003 IDs (no requirement change) | Architecture Design Complete (Large / High) |
| SR-005 | Design | ARCH-REV-001 Fail (Design Impact) | AR-001, AR-002 (blocking); AR-003, AR-004 | Design Ready (SR-004) | Design Ready | REQ-003/004/009, AC-023, QR-002/003 (design realization only) | Architecture Design Complete (Large / High); re-review requested |

## Revision Entries

### SR-001 — Draft baseline for the Project manager experience

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback: User conversation 2026-10-06 (request, confirmation of the reflected feeling, request to hand the UI to the Product Team)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Draft`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..004, UC-001..004, REQ-001..006, SCN-001..004, DEC-001..005
- Scenario-basis or scenario-validity changes: N/A
- Why this baseline or revision was recorded: First coherent baseline used for the Product Team request
- Canonical requirements, investigation and design sections changed: All sections created
- Supplemental artifacts added, changed or removed: Added `product-design-request.md`
- Product design evidence or product decisions incorporated: None yet
- Intended behavior changed: N/A (baseline)
- Approval impact: Not approved; approval follows the Product result
- Behavior-defining supplement versions and approval references: Pending
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification: N/A
- Applied handoff-rule outcome / result-file reference: No configured handoff rule covers Product Design. At the user's explicit request ("dedicate a task to @Product Team"), the work was delegated with `delegate_task` to `/product_team`. Context file: `product-design-request.md`.
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: DEC-001..DEC-005; acceptance criteria
- Next action: User works with the Product Team; on its result, integrate it, settle the DEC-* questions with the user and present the requirements for approval.

### SR-002 — Integrate the user-confirmed Product design (narrowed scope)

- Phase and classification: Requirements, `Refinement`; the user changed the intended behavior during Product review
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Product `Design Completed` from `/product_team/product_ui_ux_designer` (run `product_ui_ux_designer_9ea6001c1557486cbd1546c60cab4046`), 2026-10-07. Package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/`.
- Triggering finding IDs: F-005 (design-copy defect; product already correct), F-006 (product defect, `AgentRunTaskRows.vue:85`)
- Prior authoritative requirements/design status: Requirements Draft (SR-001); design not started
- Current authoritative requirements/design status: Requirements Ready for Approval; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected:
  - Dropped: REQ-001, REQ-005, REQ-006, UC-001, UC-004, SCN-001.
  - Changed: REQ-002, REQ-004 (root only), BEH-001 (unchanged behavior), BEH-004.
  - Added: BEH-005, REQ-007..010, UC-005, SCN-005, AC-001..015, QR-001..003, DEC-006, DEC-007.
  - Resolved: DEC-001..005.
- Scenario-basis or scenario-validity changes: SCN-001 rejected by the user; SCN-005 added
- Why this baseline or revision was recorded: integrate the Product result; prepare for approval
- Canonical requirements, investigation and design sections changed: requirements-doc (all sections); investigation-notes (Product Design Findings, Additional Source Log)
- Supplemental artifacts added, changed or removed: ui-ux-spec + VIS-001..010 linked (Product-owned, behavior-defining)
- Product design evidence or product decisions incorporated: all decisions in product-ticket.md "Decisions"
- Intended behavior changed: `Yes` (narrowed by the user)
- Approval impact, exact approved requirements baseline and user-approval reference: Needs explicit user approval of SR-002, including DEC-006
- Behavior-defining supplement versions and approval references: ui-ux-spec at design `1fcf8f8` / close `eb60aba`, user-confirmed 2026-10-07
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification: N/A
- Applied handoff-rule outcome / result-file reference: Routine approval hold; no handoff. The Product delegation task `ad_hoc_task_6750625c-…` was set DONE.
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: DEC-006 (proposed), ASM-001
- Next action: user approval → architecture design

## Status Note (2026-10-07, not a solution round)

- On hold at the user's direction until `reactivate-done-task-runs` is delivered (`/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/`). That ticket lets the Solution Designer reach the same Product Team copy again.
- Pending for the next round (SR-003 when started): the user chose to add "Tasks without a project" (ad hoc Tasks) to this ticket via another Product round (option B). The Solution Designer's suggestion, given in conversation 2026-10-07, is not yet sent to Product:
  - a card on `/projects`;
  - Open/Done lanes;
  - a root line and a "From <conversation>" line on each row;
  - a read-only Task page.
- SR-002 approval is still pending. The "Stopped = not openable" root state should be revisited once reactivation exists.

## Status Note (2026-10-07, not a solution round)

- Resumed after `reactivate-done-task-runs` was finalized (interim delivery status; released as v1.4.96-beta.1).
- Drafted the SR-003 extension in `requirements-doc.md` and the request `product-design-request-r2.md`.
- Tried to reach the round-1 Product copy:
  - `create_or_update_task(ad_hoc_task_6750625c-…, IN_PROGRESS)` succeeded;
  - `send_message_to(product_ui_ux_designer_9ea6001c…)` was refused with `TASK_AGENT_RESOURCE_CLOSED` and the pre-release text "The Task work for this agent run is closed (Task DONE)."
- Conclusion: the running server does not include the new release yet. User: "i guess you have to wait."
- Next: once the app runs v1.4.96-beta.1 or later, resend the same message (the Task is already IN_PROGRESS).
- 2026-10-07 (after the user installed v1.4.96-beta.1): the resent round-2 message was accepted.
  - Result: "Delivered message to product_ui_ux_designer_9ea6001c…. product_ui_ux_designer_9ea6001c… was reactivated."
  - Product round 2 is in progress with the same Product copy; Task `ad_hoc_task_6750625c-…` is IN_PROGRESS.
  - Keep it open until the whole package no longer needs Product.

### SR-003 — Temp tasks (Tasks with no Project) and reactivation consistency

- Phase and classification: Requirements, `Refinement` (user-directed scope extension, option B)
- Trigger:
  - the user's request (2026-10-07) to show ad hoc Tasks;
  - the round-2 request `product-design-request-r2.md`, delivered to the same Product copy by reactivation after v1.4.96-beta.1;
  - the Product round 2 `Design Completed` (2026-10-07), confirmed by the user: "Perfect, I think this is what I want ... it seems good now" / "Good job. Yes. Yes".
- Prior status: SR-002 Ready for Approval (never approved). Current: SR-003 Ready for Approval.
- IDs affected:
  - added: BEH-006, UC-006, REQ-011..016, AC-016..023, SCN-006, DEC-008, DEC-009, DEC-010;
  - changed: REQ-010 (both rounds), AC-008 alternate (reopen consistency).
  - Proposals P-REQ-011..015 were resolved: the header button replaces the card; Open/Done is confirmed with a Done cap of 10; "From" is dropped (rejected by the user); the Task page is read-only; there is a live push.
- Product evidence verified by the Solution Designer:
  - spec round-2 section, VIS-011..018 present;
  - design `492d37a` / close `8cd41f8` = design-repo `origin/personal`;
  - round-1 files unchanged.
- Gaps found and proposed for user decision:
  - DEC-008: a reopened Task's root stays Stopped until the worker is messaged. The prototype combined both steps.
  - DEC-010: deletion with the chat; Product did not simulate it.
  - DEC-009: recommend against option B (server sets IN_PROGRESS) because of the user's no-automatic-status rule.
  - These are consistency/evidence clarifications. The Product visuals for every state already exist (Stopped, Open lane), so no Product correction is requested.
- Intended behavior changed: `Yes` (extension)
- Approval impact: Explicit user approval of SR-003 needed (rounds 1 and 2, DEC-006, DEC-008, DEC-010).
- Product delegation `ad_hoc_task_6750625c-…` stays IN_PROGRESS until the package no longer needs Product.
- Downstream impact: none yet (design not started). The worktree base `f48dbfb` is behind `origin/personal` `7d130309e`; refresh before architecture.
- Next action: user approval → architecture design
- SR-003 addendum (2026-10-07, same round, before approval). User decisions:
  - DEC-006: the worker line mirrors the worker's own left-panel status (Running/Initializing/Idle/Error/Offline). DONE → Offline, not openable. "Stopped" is removed from the approved visuals VIS-004/008/016; recorded as a user-decided deviation, no Product correction.
  - DEC-008: Offline until the assigner messages the worker.
  - DEC-010: deletion with the chat removes Temp tasks live.
  - Changed: REQ-004, REQ-009, REQ-016, BEH-004, AC-008, AC-020, AC-023, UI section.
  - Status: Ready for Approval; only final explicit approval of SR-003 remains.
- SR-003 approved by the user, 2026-10-07: "…other requirements are already clear, clarified. Yes, now you can go ahead now."
  - Event design is left to the Solution Designer.
  - The user agreed with a generic task-change approach: one event for every Task, Project Tasks and Temp tasks alike.
  - No automatic IN_PROGRESS for now.
  - Next: architecture design.

### SR-004 — Architecture design on the approved SR-003 basis

(Factual note, AR-004: the SR-004 design spec header said "SR-003" for its revision ID; the design revision is SR-004, now superseded by SR-005.)

- Phase and classification: Design, `Initial Baseline` (design)
- Trigger: SR-003 approval (2026-10-07); the user delegated the event design.
- Basis refreshed: rebased onto `origin/personal@7d130309e`.
- Design: `design-spec.md` (Ready). Main decisions:
  - **Generic change feed** `/ws/projects`, publishing project/task upserts and removals plus `task_worker_status`. It is published from the write owners and from `swap()`.
  - **Task view `root`**, with server-computed worker status from the hosting root through the active-root boundary; the team fold is shared through the contracts package.
  - **`recipientAddress`** on assigned entries (Directly Usable, no migration).
  - **`tasksWithoutProject`** query.
  - **Web:** one scope-keyed task store, Temp tasks routes, root navigation reusing left-panel actions, the F-006 fix.
- Investigation: A1–A14 added.
- Intended behavior changed: `No`.
- Classification: `task_size=Large`, `architectural_risk=High` (new realtime contract, persisted optional field, cross-subsystem status query, concurrency of events vs snapshots).
- Handoff: `handoff-architecture-review.md` → `/architecture_reviewer`.
- Product delegation `ad_hoc_task_6750625c-…`: still IN_PROGRESS (kept for possible Product follow-up).

### SR-005 — Design revision for ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Trigger: ARCH-REV-001 `Fail` (`design-review-report.md`, `architecture-review-revision-record.md`)
- Findings:
  - **AR-001 (P-001 Reachable, P-002 Unclear):** the publisher had no defined read moment or per-Task order. P-001 was verified in code: the wake overlay clears after the first `AGENT_STATUS` is published.
  - **AR-002:** the openable rule was too broad (`starting`; deleted host chat).
  - **AR-003:** no publication from `load()`.
  - **AR-004:** record consistency.
- Changes:
  - design-spec: Publication Contract (mark-only triggers; `setImmediate` flush; per-subject serialized, coalesced builds; removal precedence; failure handling; no `load()` publication; tests);
  - presentation/openable rule (started ∧ not closed ∧ host present in run-history state);
  - DS-004 org actions named; Ownership, File Mapping, Risks and Guidance updated;
  - investigation-notes: meta, supplement inventory, A15, A16.
- Intended behavior changed: `No`. REQ-009 already defines openable as "listed in the left panel (started and not closed)"; no renewed approval needed.
- Classification unchanged: Large / High.
- Handoff: `handoff-architecture-review.md` (updated) → `/architecture_reviewer` (re-review limited to AR-001/AR-002 plus confirming AR-003/AR-004).

## Review Notes (informational, not solution rounds)

- 2026-10-07: Architecture review `Pass`, ARCH-REV-002 on SR-005 (design) / SR-003 (requirements).
  - AR-001..AR-004 are resolved; no new findings.
  - Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
  - The reviewer forwarded the package to `/implementation_engineer`; the Solution Designer does not repeat that handoff.
  - Two trivial wording leftovers are left as-is during implementation and will be corrected at the next revision: the handoff label "(SR-001..SR-004)", and an investigation-status sentence about waiting on Product.
