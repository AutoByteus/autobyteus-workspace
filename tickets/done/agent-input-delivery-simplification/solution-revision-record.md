# Solution Revision Record — agent-input-delivery-simplification

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after Q1–Q6 investigation | OBS-001, OBS-002, OBS-003 | N/A | Ready for Approval | BEH-001..BEH-008; REQ-001..REQ-014 | Presented to the user with DEC-001 and DEC-002 |
| SR-002 | Requirements | User scope direction 2026-10-08: drop the weak premises, keep the evidence-backed points | — | Ready for Approval (SR-001, not approved) | Ready for Approval | REQ-001, REQ-010 withdrawn; REQ-002/003 now preservation; UC-005 withdrawn; DEC-002 resolved | Narrowed baseline presented with DEC-001 |
| SR-003 | Requirements | User delegated the remaining choices to the designer; approval | — | Ready for Approval | Approved | REQ-005/UC-002 withdrawn; DEC-001 = A (REQ-012/AC-012 made definite) | Approved basis for design |
| SR-004 | Design | Architecture design on approved SR-003 | — | Approved requirements; no design | Requirements Approved; design Ready | BEH-004, BEH-008; REQ-007/008/009/011/012/013 | Design complete; Large / High |
| SR-005 | Evidence | Re-bootstrap on latest `origin/personal` + user re-confirmation (2026-10-10) | — | Requirements Approved (SR-003); design Ready (SR-004), ARCH-REV-001 Pass on base `048ea6cec` | Requirements Approved (re-confirmed); design Ready (unchanged), base `46e94fdea` | All in-scope REQs; R-1..R-3 dispositions | Ticket valid; Large / High → architecture review of the base revalidation |
| SR-006 | Mixed | Complete re-investigation on `origin/personal@8b34e8ae10`, re-checked on `0216c6fb14` (user, 2026-10-24) | RI-1..RI-8 | Requirements Approved (SR-005); design SR-004 (for an old base) | Requirements Approved (Solution Designer, within direction); design Invalidated | BEH-004, BEH-008; REQ-007/008/012/013; AC-012; SCN-016 new | Ticket still necessary; requirements re-worded to today's code |
| SR-007 | Design | New architecture design on `origin/personal@0216c6fb14` | — | Requirements Approved (SR-006); SR-004 design invalidated | Requirements Approved; design Ready (SR-007) | BEH-001/004/005/007/008; REQ-004/007/008/009/011/012/013; DEC-005 | Architecture Design Complete; Large / High |

## Revision Entries

### SR-001 — Requirements baseline: one input entry point, one delivery implementation, no product change

- Phase and classification: Requirements, `Initial Baseline`.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Project Task `project_task_17bfe0fe-…` (user-approved cleanup, 2026-10-08); brief `followup-cleanup-ticket-brief.md`; investigation Q1–Q6.
- Triggering finding IDs: OBS-001 (`turnId` hint unused), OBS-002 (input-state publish differs, product-invisible), OBS-003 (Task-closure race fail-stops a root; reproduced by probe).
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not yet created.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..BEH-008, UC-001..UC-007, REQ-001..REQ-014, AC-001..AC-014, SCN-001..SCN-015, DEC-001, DEC-002.
- Scenario-basis or scenario-validity changes: N/A (baseline).
- Why this baseline was recorded: first coherent baseline for user approval.
- Canonical requirements, investigation and design sections changed: all sections of `requirements-doc.md` and `investigation-notes.md` created.
- Supplemental artifacts added: `followup-cleanup-ticket-brief.md` (copy), `probes/task-close-during-delivery.probe.ts`.
- Product design evidence or product decisions incorporated: none.
- Intended behavior changed: `No`, except DEC-001 if the user chooses option A.
- Approval impact, exact approved requirements baseline and user-approval reference: pending explicit user approval of SR-001 plus DEC-001 and DEC-002.
- Behavior-defining supplement versions and approval references: none.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification and rationale changes: N/A before design (expected Large / High).
- Applied handoff-rule outcome / result-file reference: none (approval hold).
- Downstream and architecture-review impact: none yet.
- Remaining gaps, assumptions or blocked decisions: DEC-001 (fix the OBS-003 defect here or separately), DEC-002 (Q6: keep the held slot or save-first).
- Next action: obtain user approval and decisions; then run the architecture reading gate and design.

### SR-002 — Narrowed to the evidence-backed points

- Phase and classification: Requirements, `Refinement` (user change to intended scope).
- Triggering user feedback: user, 2026-10-08, after the SR-001 analysis of valid versus weak points: "for the weaker part, we don't have to work on it. But you should be based on your investigation."
- Triggering finding IDs: none new.
- Prior authoritative requirements/design status: SR-001 `Ready for Approval` (never approved).
- Current authoritative requirements/design status: SR-002 `Ready for Approval`; no design yet.
- IDs affected:
  - Withdrawn: REQ-001 (single `AgentRun` entry point), REQ-010 (handle state reduction), UC-005.
  - REQ-002 and REQ-003 reworded as preservation of both existing entry points.
  - AC-001 now covers REQ-004 only; AC-010 now preservation only.
  - DEC-002 (Q6) resolved: keep the held slot.
  - Added a "Not Pursued" table.
- Scenario-basis or scenario-validity changes: none. Related-requirement columns updated.
- Why this revision was recorded: the investigation showed these premises were weak:
  - the `AgentRun` method drift was one already-fixed case;
  - the compaction-recovery difference is intended;
  - the timing risk disappears once the merge is dropped;
  - every handle state is justified;
  - save-first needs a persisted-shape change.

  The user directed that only the valid points be worked on.
- Canonical sections changed: `requirements-doc.md` (status, problem, new "Not Pursued", behaviour, scope, requirements, ACs, scenarios' related IDs, decisions, traceability, architecture input, readiness).
- Investigation notes: unchanged (they remain the evidence for both the kept and the dropped points).
- Supplemental artifacts: unchanged.
- Intended behavior changed: `No`, except DEC-001 if the user chooses A.
- Approval impact: pending explicit user approval of SR-002 and the DEC-001 choice. SR-001 is superseded and was never approved.
- Behavior-defining supplement versions: none.
- Affected design/review basis: N/A.
- Post-design classification: N/A. Expected smaller than SR-001; likely still Medium–Large with architecture risk in the shared delivery path, to be classified after design.
- Applied handoff-rule outcome: none (approval hold).
- Remaining gaps: DEC-001.
- Next action: obtain approval and the DEC-001 choice; then architecture design.

### SR-003 — Approved basis with designer-chosen scope

- Phase and classification: Requirements, `Refinement` plus approval capture.
- Triggering user feedback, 2026-10-08:
  - "You only do the one you think that's reasonable … based on your investigation … which will do make the code cleaner."
  - "You help me to choose. You give me suggestions … And after that, you will continue."
- Choices made and presented to the user before continuing (in the conversation):
  - **Do:** unify teammate save-then-deliver; remove forwarding adapters that become unnecessary (keep the `TeamRun` seam); delete dead code; remove `admit()` duplicate validation; fix docs; fix the OBS-003 defect (DEC-001 = A).
  - **Skip:** one outcome shape (REQ-005), plus the items already dropped in SR-002.
- Prior status: SR-002 `Ready for Approval`. Current status: `Approved` (SR-003).
- IDs affected:
  - REQ-005 withdrawn; UC-002 withdrawn; BEH-003 unchanged; AC-005 now preservation only.
  - REQ-012, AC-012, BEH-008, QR-003 made definite (option A).
  - DEC-001 resolved A.
- Intended behavior changed: only REQ-012 (the defect fix).
- Approval reference: user delegation quoted above, 2026-10-08.
- Snapshots: `history/requirements-doc.sr-001.md`, `history/requirements-doc.sr-002.md`.
- Next action: architecture reading gate, architecture investigation, design spec, classification.

### SR-004 — Architecture design

- Phase and classification: Design, `Initial Baseline` for design, plus an evidence-only requirements clarification.
- Trigger: approved SR-003 requirements.
- Prior status: requirements Approved; no design. Current status: requirements Approved (unchanged intent); `design-spec.md` Ready.
- Design decisions:
  - D-1: one delivery owner (`RootCommunicationEngine`) with per-root port objects.
  - D-2: one append protocol, checks under the history lock.
  - D-3: one coordinator contract `commitMessageAppend`.
  - D-4: REQ-012 fix at the post-durability reservation commit.
  - D-5: engine owns the message list.
  - D-6: dead code removed.
  - D-7: `admit()` validation once.
  - D-8: docs.
- Requirements clarification (evidence-only, intent unchanged): REQ-012 wording made precise.
  - Task-scope closure yields the same thrown `TaskDelegationError` (`TASK_AGENT_RESOURCE_CLOSED`) the sender gets today when the Task closes just before the save.
  - A recipient AgentRun that stopped accepting input during the write yields `AGENT_RUN_NOT_ACCEPTING_INPUT`.
  - Evidence: `root-task-agent-resource-scope.ts:134`, `send-message-to-dispatcher.ts:85-91`, `agent-run-input-reservation.ts`.
- Investigation notes extended:
  - fail-stop also terminates the root;
  - duplicate list owner;
  - remaining routing hops each own a lookup or boundary.
- Classification: `task_size = Large`, `architectural_risk = High` (persistence commit contract across three roots, post-durability failure semantics, concurrency, ownership move).
- Review impact: an independent architecture review is expected under the configured rules.
- Remaining gaps: none.

### Note — ARCH-REV-001 Pass (informational, recorded 2026-10-08)

- Architecture review ARCH-REV-001: **Pass**, no findings, covering SR-003/SR-004.
  - Report: `design-review-report.md`.
  - The reviewer handed off to `/software_engineering_team/implementation_engineer`.
- RR-002 (non-blocking) handled:
  - BEH-008 wording aligned with REQ-012 (thrown `TaskDelegationError` for Task closure; `AGENT_RUN_NOT_ACCEPTING_INPUT` when the recipient run stops during the write). Factual alignment only; intent unchanged; no new SR round.
  - The `AGENT_RUN_NOT_ACCEPTING_INPUT` case was made visible to the user in the conversation at this touchpoint.

### Note — Resumed by a new Software Engineering Team copy (2026-10-09)

- Trigger: `/project_task_manager` reassigned Project Task `project_task_17bfe0fe-5c2b-47eb-9402-71687e7a52b8` to the team copy whose code reviewer wrote the cleanup brief. Handover: `handover.md` (copied from `/Users/normy/autobyteus_org/ticket-media/agent-input-delivery-simplification/`).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification` on the handed-over branch `codex/agent-input-delivery-simplification` @ `3e78b455e` (parent `742a0df97`). Ticket artifacts were copied into `tickets/in-progress/agent-input-delivery-simplification/`; the originals are unchanged.
- Base: `origin/personal` is now `46e94fdea`, 45 commits ahead of the parent. Nine of the commit's files also changed on the base. `git merge-tree` shows content conflicts in two test files:
  - `tests/unit/agent-org-execution/helpers/org-collaborator-harness.ts`;
  - `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts`.
  Integration is implementation-owned.
- Spot verification of handover claims (by import/type, not string search):
  - `InterAgentMessageRouter` has no importer in `src`.
  - `TaskAgentExecutionRegistry.reserveInput` has no caller. `flat-team-execution-manager.ts:151` calls the handle's own `reserveInput`, because `TaskAgentExecutionRegistry.get()` returns `FlatTeamAgentExecutionHandle`.
- Decision: continue from the approved SR-003 requirements, the reviewed SR-004 design (ARCH-REV-001 Pass) and commit `3e78b455e`. Rework is not justified.
- Gaps carried forward:
  - no `implementation-handoff.md`, so the local check evidence is missing;
  - the branch is stale against the base;
  - code review, API/E2E and delivery were never started.
- Approval check: the Project Task description still lists the original brief goals. The approved SR-003 narrowed them on 2026-10-08 (user direction plus delegated choices). The user was asked on 2026-10-09 to confirm that SR-003 is the approved scope for this Task. Status: awaiting the user.
- 2026-10-09, code reviewer input (requested by the user), from `/software_engineering_team/code_reviewer`, author of the brief:
  - It restated its proposals: the prerequisite start step (done), §3a one `AgentRun` entry point, and P2–P6.
  - It **accepts all five drops** and **withdraws its §3a recommendation**. Q1 shows that the compaction difference is intended, and that there is no proven drift at the `AgentRun` level. A merged method would still need the USER-only recovery-claim branch. It also judges the narrowed SR-003 scope sound.
  - Two optional consistency points, neither with proven user impact:
    1. Q5 row "Merge: one fence owner" (`FlatTeamAgentExecutionHandle` `rootShutdownFenced` + `construction`) had no recorded disposition. Related residual: a throw in that wrapper's `getHandle()`/`createHandle()` before the configured handle exists can escape `reserveInput` untyped.
    2. The post-start rejection overlay asymmetry (`postMessage` vs `reserveInput`) is deferred from the prerequisite ticket.
- Solution Designer disposition, pending the user's confirmation: not in scope, held for evidence. The fence merge falls under REQ-010, which was withdrawn by user direction; no supported scenario shows a defect. The Q5 row is annotated accordingly.
- 2026-10-09, second code reviewer input (re-analysis against `3e78b455e`, requested by the user):
  - Confirms that `3e78b455e` covers the brief's real duplication.
  - Confirms that the held slot is cancelled on every append path, so no leaked reservation is possible.
  - Ranked candidates, with Solution Designer dispositions pending the user's confirmation:
    - **R-1, fence owner:** keep the current shape; the reason is now recorded in the investigation Q5 row. Verified in `flat-team-agent-execution-handle.ts:69-125`: the wrapper fences the context-build phase, before any configured handle can exist; the configured handle fences activation. These are two phases, not one duplicated state. No code change.
    - **R-2, standalone/Org recipient-input routing:** about 8 lines, no drift. Not in scope.
    - **R-3, untyped throw before the handle exists:** held for evidence and recorded as a known residual. The only remaining triggers are infrastructure I/O failure or an exact-timing root-stop race.
  - Also rechecked and not recommended: collapsing the `TeamRun` seam; a port builder; the five SR-003 drops; the post-start rejection overlay asymmetry (deliberately left out).

### Note — Re-bootstrapped from the latest `origin/personal` (2026-10-09)

- User direction: bootstrap from the latest `origin/personal`, recheck which problems remain, and treat the ticket as invalid if none remain.
- Done:
  - fetched `origin/personal` (`46e94fdea`);
  - new branch `codex/agent-input-delivery-simplification-v2` in worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification`;
  - ticket artifacts moved into it;
  - the earlier worktree on the old branch removed (old branch kept locally, with `3e78b455e`).
- Result: all in-scope problems (P2, P4, P5, OBS-003, docs) still exist on `46e94fdea`. See investigation-notes "Re-bootstrap and problem recheck". The ticket is valid.
- Implementation impact: re-apply the SR-004 design on `-v2`. Commit `3e78b455e` (on `742a0df97`) may be cherry-picked as a starting point, but it must be revalidated: there are 2 test conflicts and no saved check evidence.
- Status: awaiting the user's confirmation of the SR-003 scope before routing.


### SR-005 — Re-bootstrap on the latest base and re-confirmed scope

- Phase and classification: Evidence-only revision plus approval re-confirmation.
- Trigger:
  - User direction 2026-10-09: bootstrap from the latest `origin/personal` and recheck the problems.
  - User re-confirmation 2026-10-10: "yesss. lets do it".
- Prior status: requirements Approved (SR-003); design Ready (SR-004); ARCH-REV-001 Pass on base `048ea6cec`.
- Current status: requirements Approved, re-confirmed for this team copy; design Ready and unchanged; base `46e94fdea`; branch `codex/agent-input-delivery-simplification-v2`.
- Evidence: every in-scope problem (P2, P4, P5, OBS-003, docs) still exists on `46e94fdea` (investigation "Re-bootstrap and problem recheck"). One referenced file was renamed (`root-task-execution-resource-scope.ts`, same code).
- Code reviewer input (2026-10-09, two rounds): accepts all SR-003 drops and withdraws §3a. R-1 is kept as-is, with its reason now recorded; R-2 is out of scope; R-3 is a recorded residual.
- Intended behavior changed: No.
- Approval impact: SR-003 basis re-confirmed by the user; reference above.
- Affected review basis: ARCH-REV-001 covered SR-004 on `048ea6cec`, from another team copy. The design is unchanged, but its base moved 45 commits and one path was renamed, so it goes back for an architecture review confirming the design applies to `46e94fdea`.
- Implementation impact:
  - re-apply SR-004 on `-v2`;
  - commit `3e78b455e` (old branch `codex/agent-input-delivery-simplification`, on `742a0df97`) may be cherry-picked as a starting point, with the 2 test conflicts resolved;
  - all checks re-run and `implementation-handoff.md` written; the earlier evidence was never saved.
- Classification: Large / High (unchanged).
- Applied handoff-rule outcome: `handoff-sr-005-rebootstrap.md`.

#### SR-005 review receipt (informational)

- 2026-10-10: `/software_engineering_team/architecture_reviewer` **Pass**, ARCH-REV-002 (SR-005 with SR-004/SR-003, Large/High). Report `design-review-report.md`; record `architecture-review-revision-record.md`. SR-004 applies to `46e94fdea`; V-1..V-4 proportionate; RR-002 resolved. The reviewer delivered the implementation handoff itself, so Solution Designer sends no duplicate.
- Non-blocking notes:
  - AR2-NB-001: the base added a new caller of the delivery engine, `assignToExistingCopy` (`1e5d757a9`), in all three roots. **This corrects my SR-005 recheck**, which reported "only a rename" and missed it. The engine contract is unchanged, so the design needs no change. The caller is included in the inventory, the V-1/V-3 runs and the docs.
  - AR2-NB-002: V-2 needs a frozen clock, because `messageId` hashes `createdAt`.
  - AR2-NB-003: "45 commits" counted from the old commit's parent `742a0df97`. From the design base `048ea6cec`, the base moved 87 commits. `origin/personal` is now `d28c56d5d` (context files only).

### Note — Second recheck on the latest base (2026-10-24)

- User direction: base the worktree on the latest version and re-judge necessity.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3`, branch `codex/agent-input-delivery-simplification-v3` @ `origin/personal@8b34e8ae10`. The v2 worktree and branch are kept untouched; they hold the verified-but-unmerged candidate `08a70d783f` and untracked V-1 receipts.
- Findings: see investigation "Second recheck on the latest base".
  - All problems remain: P2, P4 (grown), P5, OBS-003.
  - The v2 candidate has 26 conflicts and an outdated persistence/engine basis (append-only message logs, remote collaboration).
- Impact: requirements intent is probably still valid, but REQ-013 ("byte-identical persisted formats") must now refer to the append-only logs. Design SR-004 is invalidated for the new base. A new architecture investigation and design are needed if the user keeps the ticket.
- Status: awaiting the user's decision: keep (redesign on the latest base) or cancel.


### SR-006 — Complete re-investigation; requirements updated to today's code (proposed)

- Phase and classification: Mixed — `Requirement Gap` (wording and scope against changed code) plus evidence.
- Trigger: user, 2026-10-24: "do a complete re-investigation". Evidence in investigation "Complete re-investigation on `origin/personal@8b34e8ae10`" (RI-1..RI-8), including the probe reproducing OBS-003 on the latest base.
- Prior status: requirements Approved (SR-003, re-confirmed SR-005); design SR-004 Ready (ARCH-REV-001/002), built against base `46e94fdea`/`359d2c0ef`.
- Current status:
  - requirements `Ready for Approval` (SR-006); snapshot of the prior approved text at `history/requirements-doc.sr-005.md`;
  - design SR-004 **invalidated** for the new base (whole-file history writes and pre-remote engine; 26 merge conflicts);
  - the v2 candidate is kept as a reference only.
- Requirement changes (intent unchanged):
  - REQ-007: also covers remote receive and the sender record of a remote send; removes the dead `nextMessages`; the per-root difference is now "message-log owners and store".
  - REQ-012 / AC-012 / BEH-008: the outcome now matches today's before-save refusal (returned `TASK_AGENT_RESOURCE_CLOSED`, no longer thrown); root termination is named.
  - REQ-013: names the append-only log lines and owner order.
  - New SCN-016 (remote messaging) and two contract rows (remote collaboration, append-only logs).
- Intended behavior changed: No, beyond the already-approved REQ-012 fix, whose expected outcome now follows the current refusal contract.
- Approval impact: renewed explicit user approval required before design.
- Next action: present to the user; on approval, run the architecture reading gate and produce a new design on `8b34e8ae10`.
- SR-006 completion (2026-10-24, same day):
  - At the user's direction, re-checked on the latest base `0216c6fb14`. No commit touches the delivery, persistence or input paths, and every finding stands.
  - OBS-003 was reproduced again. A failing reproduction test asserting REQ-012 is in `probes/` (`req-012-task-close-during-append.repro.test.ts`, run log `req-012-repro-run-0216c6fb14.log`).
  - The follow-ups are recorded in `follow-ups.md` (FU-001..FU-004).
  - Under the updated skill (step 2), the requirements were approved by the Solution Designer within the direction: DEC-003, DEC-004, no `Needs user` decision. The user was informed in the conversation.
  - Next: the architecture reading gate, then a new design on `0216c6fb14`.


### SR-007 — New design on the latest base

- Phase and classification: Design (`Initial Baseline` for the new base).
- Trigger: SR-006 approved; the architecture reading gate was re-read (updated `design-principles.md`, `architecture-design.md`, `DESIGN.md` rules 7–10, `docs/design-cases.md`, Collaboration Model § 3/§ 5, `GLOSSARY.md`).
- Prior status: SR-004 design invalidated (old base). Current status: `design-spec.md` SR-007 Ready; SR-004 archived as `history/design-spec.sr-005.md`.
- Design decisions D-1..D-9:
  - the engine owns one append protocol for all three entry forms;
  - facts-only per-root ports in their own files (the over-limit root files must not grow);
  - one coordinator contract, `commitMessageAppend`;
  - REQ-012 at the post-durability step, plus DEC-005: one closure outcome on the whole path;
  - the engine is the only list owner, with a derived-consumer table;
  - the Team facade removed;
  - dead code removed (router, registry method, `nextMessages`, the Team mismatch branch);
  - `admit()` validation once;
  - docs.
- Requirements touched: DEC-005 added to `requirements-doc.md` (Solution Designer, within direction). Intent unchanged.
- Claims checked against code before handoff (design case 5):
  - each adapter's only construction site;
  - conflict texts;
  - the `commitSentToRemote` warning path;
  - the tests that construct the removed units.
- Classification: Large / High.
- Applied handoff-rule outcome: `handoff-sr-007-design.md`.
- Next: independent architecture review.
- Route hold (2026-10-24): the architecture-review rule requires current explicit user approval of the requirements. The user was asked to approve SR-006 explicitly before the handoff.
- 2026-10-24, explicit user approval: "…Then let's do it. … then you can go ahead", conditional on a self-validation.
  - Validation completed in design-spec "Self-Validation Against The Code And The Design Principles" (table A, A1–A16; principles table C).
  - Corrections, all design-only with no change to intended behaviour:
    - C-1: Team not-accepting code only on `deliver`;
    - C-2: closure mapping uses the engine's existing refusal set;
    - C-3: recipient-stopped refusal text;
    - C-4: identity checks and the Team admission flag.
  - The scope stays as designed: FU-001 and the root file split remain follow-ups.
  - The route hold is lifted.

#### SR-007 review receipt (informational)

- 2026-10-24: `/software_engineering_team/architecture_reviewer` **Pass**, ARCH-REV-003 (SR-007 on SR-006, Large/High).
  - Report: `design-review-report.md`; the old ARCH-REV-002 report is archived as `history/design-review-report.arch-rev-002.md`.
  - Record: `architecture-review-revision-record.md`.
  - The self-validation (A1–A16, C-1..C-4) is confirmed accurate. DEC-005 is grounded (PREM-301 reachable; every consumer already handles the before-slot refusal).
  - The reviewer delivered the implementation handoff itself; no duplicate is sent.
- Notes AR3-NB-001..004 are for implementation.
- AR3-NB-005 applied, an editorial and factual fix with no intent change:
  - the design-spec approval basis and the requirements "User approval received" line cite the user's explicit approval of 2026-10-24;
  - SCN-016 added to UC-003.
- AR3-NB-002 also corrected a factual claim in the design: package creation is standalone-only, not standalone/Org. The design is unchanged.
- Design cases (skill Recovery rule): the C-1 mistake (Case 2) and the AR3-NB-002 / DI-001 claim mistakes (Case 5) were added to `docs/design-cases.md` in this worktree, uncommitted, to be committed with the ticket.
