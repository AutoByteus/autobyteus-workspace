# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-197) | N/A | N/A | Approved | BEH-001..008, REQ-001..011, AC-001..010 | Approved by the user 2026-10-19; DEC-006 revised by the user |
| SR-002 | Mixed (Evidence + Design) | Architecture investigation | N/A | Approved requirements; no design | Approved requirements (wording corrected); design Ready | REQ-002, AC-006; all REQ for design | Design spec complete; Large / High |
| SR-003 | Mixed (Requirements + Design, review response) | ARCH-REV-001 | AR-001, AR-002 | Requirements Approved; design Ready | Requirements Approved (REQ-012 by the user); design Ready | REQ-012, AC-011, DEC-010, REQ-007, BEH-007, AC-006 | D-5 explicit member facts; M4 5-key projection |
| SR-004 | Design (review response) | ARCH-REV-002 | AR-003, AR-004, AR-005 | Design Ready (SR-003) | Design Ready | REQ-007, REQ-008, REQ-010, REQ-012, AC-007, AC-009 | Provenance wording, admission text, removal row, 10-17 test plan |
| SR-005 | Design (implementation Design Impact) | DI-001 | DI-001 | Design Ready (SR-004) | Design Ready | REQ-005, AC-009, REQ-010 | D-8: legacy-owned `asSourceIndependentIndexInput` bridge for four released migrations |
| SR-006 | Evidence (documentation) | User question on guideline compliance | N/A | Design Ready (SR-005) | Design Ready | REQ-008, REQ-009, REQ-010, AC-005..AC-008 | §2 checklist answered in one place; shape → fixture inventory; `imports/` mirror finding |
| SR-007 | Evidence (review response) | ARCH-REV-005 | AR-006 | Design Ready (SR-006) | Design Ready | REQ-008, QR-001 | Mirror rows split (9 readable, 13 not shown); item 8 corrected; F-X3b/F-X3c |

## Revision Entries

### SR-001 — Every delegated copy restores from its own file; `origin` removed

- Phase and classification: Requirements, Initial Baseline
- Trigger: Project Task autobyteus-197 from `/project_task_manager` (2026-10-19), on the user's direction ("the data model should be pure"); evidence note from the autobyteus-191 Solution Designer
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Approved`; design not started
- IDs affected: BEH-001..008, UC-001..005, REQ-001..011, AC-001..010, SCN-001..005, DEC-001..009
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline for the user's decisions
- Sections: all of `requirements-doc.md`, `investigation-notes.md`
- Supplements: none
- Product design: N/A
- Intended behavior changed: `Yes` (REQ-003: slot edits no longer reach existing copies; REQ-004: views show copies' own settings)
- Approval impact: approved by the user, 2026-10-19 conversation. Before approval the user (a) asked whether the problem is real (answered with the `investigator` own file showing null launch fields), (b) directed that data and code be kept clean with one data migration for historic data, so DEC-006 changed from "leave `origin` in 104 files" to "remove it from every own file" (REQ-005, REQ-009, AC-008, QR-002), (c) confirmed no rollback consideration (rollback notes removed), and (d) approved: "Yeah, exactly … if it cannot be converted, leave it there … But the application starts normally" (matches REQ-008, QR-001)
- Supplement versions: N/A
- Design/review basis: N/A
- Classification: N/A before design
- Handoff: none (approval hold in conversation)
- Downstream impact: none yet
- Remaining gaps: none for requirements. Investigation found team copies in scope too (DEC-003); the `prototype-bootstrapper` definition no longer exists (no effect on the migration)
- Next action: architecture design

### SR-002 — Architecture design; handoff-rule wording corrected

- Phase and classification: Mixed (Evidence clarification + Design)
- Trigger: architecture investigation after SR-001 approval
- Triggering finding IDs: N/A (own investigation)
- Prior status: requirements Approved (SR-001); design N/A
- Current status: requirements Approved (SR-001 approval applies); design `Ready`
- IDs affected: REQ-002, AC-006 (wording); all REQ/AC mapped in the design
- Scenario-basis changes: none
- Why recorded: the investigation found that a configured-place team copy today restores with every org handoff whose `from` is one of its members, including `student_one → /Teacher`, while its own tree from 10-17 holds only rules inside the team. REQ-002 / AC-006 said "handoffs among its members", which would have dropped a rule the copy has today. Corrected to "the handoff rules its members have (including rules to the coordinating run)". This preserves current behavior (REQ-006 "exactly as before") and adds no new intent, so no renewed approval is needed.
- Sections changed: requirements REQ-002, AC-006, Document Status; investigation notes (Architecture Investigation Findings); design-spec.md (new)
- Supplements: none
- Product design: N/A
- Intended behavior changed: `No` (wording aligned with the preserved behavior)
- Approval impact: none; SR-001 approval by the user (2026-10-19) applies
- Design/review basis: design-spec.md created (D-1..D-7; migration `20261019_delegated_copy_own_file_complete_v1`; 10-17 migration repointed)
- Classification: `task_size = Large`, `architectural_risk = High` (persisted shape + migration on real data, shared contract change, restore-path removal across Team/Org roots, server + contracts + web)
- Handoff: see handoff file `handoff-architecture-design-complete.md`
- Downstream impact: per handoff rules
- Remaining gaps: none blocking. Follow-up F-1 (skill improvement launch for a copy at a configured address)
- Next action: route per handoff rules

### SR-003 — ARCH-REV-001 response: explicit member facts (D-5) and slot launch projection (M4)

- Phase and classification: Design Impact (AR-002) + pending decision (AR-001)
- Trigger: `design-review-report.md` ARCH-REV-001 (Fail, Design Impact), report from `/software_engineering_team/architecture_reviewer`
- Finding IDs: AR-001, AR-002
- Prior status: design Ready (SR-002)
- Current status: design Needs Revision. AR-002 resolved in design-spec (M4 projects slot launches to the 5 current keys; fixture variants added; follower evidence confirmed to be on the projection). AR-001 needs the user: preserving the exact follower set needs a new member fact, which changes the shared team-copy member shape that catalog copies use (out of scope as approved). Narrowing the follower rule changes approved REQ-007 / DEC-008.
- Resolution: the user chose option A (2026-10-19): "every agent run has their own configuration … complete one. Then when you're restoring, you don't have to borrow from the team … It will stay clean." Recorded as DEC-010 / REQ-012 / AC-011. The Out of Scope line on catalog copies was narrowed to "start or restore"; the recorded member shape of all team copies changes. Design D-5 rewritten: every team-copy member records its complete `launchConfiguration` and `followsTeam`. Removed: `effectiveMemberLaunchConfiguration`, the presence-based follower rule and the contract and web equivalents. Migration M2 completes the members of catalog team copies; M4 writes complete members with `followsTeam` by today's configured rule on the 5-key projection.
- Intended behavior changed: `No` for users (the follower set and every member's settings stay as today); the data model changed by the user's decision
- Approval impact: REQ-012 / DEC-010 approved by the user (quote above); SR-001 approval applies to the rest
- Design status: Ready; classification unchanged (Large / High)
- Next action: re-review limited to D-5, M2/M4 and the sections they touch (handoff file `handoff-architecture-design-complete.md`, SR-003 section)

### SR-004 — ARCH-REV-002 response: provenance wording, admission text, 10-17 test plan

- Phase and classification: Design Impact (text and test plan only)
- Trigger: `design-review-report.md` ARCH-REV-002 (Fail, Design Impact), `/software_engineering_team/architecture_reviewer`
- Finding IDs: AR-003, AR-004, AR-005 (AR-001 and AR-002 confirmed resolved)
- Prior status: design Ready (SR-003)
- Current status: design Ready
- Changes:
  - AR-003: a member's `launchSource` keeps today's presence rule, independent of `followsTeam`; `effectiveMemberLaunchSource` is unchanged. Verified in code: `collaborator-launch-resolver.ts:120-125` records a follower's skipped-default fallback. A test was added.
  - AR-004: the admission text now says a preserved configured-place team copy is rejected by the current validator and not loaded. The `configuredTeamFollowerAddresses` row is replaced by `member.followsTeam`. AC-007 now covers a preserved team copy too.
  - AR-005: an explicit plan for the 10-17 tests replaces "unchanged": raw-output assertions stay; helpers move to frozen types; current-store read-back moves to a combined 10-17 → new-migration test; the startup e2e expects both migrations in one start.
- Intended behavior changed: `No` (AC-007 wording made explicit for team copies; same outcome as REQ-008)
- Approval impact: none
- Classification: unchanged (Large / High)
- Next action: re-review limited to the D-5 provenance wording, the admission bullet, the Removal Plan rows, Change Sequence step 1 and the test guidance

### Note — ARCH-REV-003 Pass (2026-10-19)

- `/software_engineering_team/architecture_reviewer` passed SR-001..SR-004 (AR-001..AR-005 resolved) and delivered the implementation handoff itself to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`. The Solution Designer does not repeat that handoff.
- R-6 bookkeeping applied: the requirements header now reads SR-004.

### SR-005 — DI-001: released migrations reading pre-own-run trees through current indexes

- Phase and classification: Design Impact (from implementation; escalation trigger named in the design)
- Trigger: `implementation-design-impact-DI-001.md`, `/software_engineering_team/implementation_engineer` (run `implementation_engineer_a7f5e2be8c3b44908ab815293968d1ef`)
- Finding: making `source` required changes the parameter types of the current execution indexes and state-package validators. Four released migrations (two `20260731`, `20260926`, `20260905`) pass pre-own-run trees into them. Runtime results are unchanged, but they no longer typecheck. The earlier investigation grep missed them (evidence corrected in the investigation notes and the design evidence table).
- Decision D-8 (technical, within the approved direction): option A. A named legacy-owned bridge `asSourceIndependentIndexInput(tree)` at the 4 call sites; its doc comment lists the source-independent methods it may be used with and the duty to freeze a method before it reads `source`. The README note is extended; the four migrations' test suites stay unchanged. Option B (freeze about 914 lines) was rejected as disproportionate to methods whose results don't depend on the changed field.
- Intended behavior changed: `No`
- Approval impact: none
- Classification: unchanged (Large / High)
- Next action: architecture re-review limited to D-8 (Dependency Rules, Migration Plan "Other released migrations", Change Sequence step 1, file mapping, escalation trigger, test guidance); then the implementation engineer applies it

### Note — ARCH-REV-004 Pass (2026-10-19)

- `/software_engineering_team/architecture_reviewer` passed SR-001..SR-005 (D-8 resolves DI-001) and delivered the implementation handoff itself to `/software_engineering_team/implementation_engineer`. The Solution Designer does not repeat it.
- Non-blocking R-7, passed by the reviewer to implementation: the bridge's method list should also name `listChildAgents` and the index constructors, and one of the four D-8 suites should keep a source-less fixture. No design change recorded; implementation applies it within D-8.

### SR-006 — Data Migration Guideline §2 checklist and shape inventory

- Phase and classification: Evidence clarification (no decision changed)
- Trigger: the user asked whether the migration followed the Data Migration Guideline. The Solution Designer found the §2 checklist answered only in scattered places and no shape → fixture table (DESIGN.md requires the checklist in the design spec).
- Changes: design-spec gains "Data Migration Guideline Checklist (§2) and Shape Inventory" (10 answers; every source shape with its count, disposition and fixture, including shapes absent from the user's data). Investigation notes gain the read-only counts, the cost measurement and the `imports/` finding.
- New evidence: 22 mirrored own files under `memory/imports/docker-node-1/`. They are not converted (another node's data, replaced on sync), as in the append-only precedent and S26. The 2 mirrored configured-place copies are not shown until that node is updated. This is consistent with the user's rule (2026-10-19): "if they cannot be converted, we just leave it there".
- User statement (2026-10-19): "we want to keep the data clean … if they cannot be converted, they're just missing … the application just cannot read them. That's it."
- Intended behavior changed: `No`
- Approval impact: none
- Classification: unchanged (Large / High)
- Next action: route per handoff rules (architecture re-review of the added section; the fixture list becomes the implementation's migration test plan)

### SR-007 — ARCH-REV-005 AR-006: mirrored copies

- Phase and classification: Evidence correction (no decision changed)
- Trigger: `design-review-report.md` ARCH-REV-005, AR-006 (Low, blocking)
- Correction: in `memory/imports/docker-node-1/`, 13 of the 22 mirrored copies are not shown until that node updates (2 configured-place agent copies + 11 catalog team copies in the released member shape); 9 catalog agent copies stay readable. Before, only 2 hidden copies were stated. The inventory rows are split, checklist item 8 is corrected, and fixtures F-X3 (readable agent copy), F-X3b and F-X3c (team copy reported unavailable, other runs still listed) are added.
- Decision (Solution Designer, within the direction): S26 and the user's stated rule cover it. It is another node's data, nothing is lost, the next sync after that node updates replaces it, and running mixed versions is the user's responsibility (DESIGN rule 9). The user is informed in the conversation (2026-10-19); no separate acknowledgement is required.
- Intended behavior changed: `No`
- Approval impact: none
- Next action: architecture re-review of the corrected rows and item 8
