# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from Project Task (2026-10-15) | N/A | N/A | Approved (Solution Designer within direction, user informed) | BEH-001..BEH-008; REQ-001..REQ-010; AC-001..AC-013; DEC-001..DEC-008 | Requirements approved |
| SR-002 | Mixed | Architecture investigation and design | N/A | Requirements Approved (SR-001); design N/A | Requirements Approved (SR-002 refinements, user informed); design Ready | REQ-004, REQ-007, REQ-010; AC-003, AC-010, AC-013; BEH-006; UC-005; SCN-005; DEC-004 (revised), DEC-009 (new) | Design complete; Large / High |
| SR-003 | Requirements | User discussion after the design handoff (architecture review stopped by the user) | N/A | Requirements Approved (SR-002); design Ready | **Paused**: requirements to be revised (email-model message logs); design Needs Revision; waiting on the collaboration-contract Task | Message storage (CM-9), REQ-003 wording, scope of delegated runs | Paused pending a prerequisite Task |
| SR-004 | Requirements | Resume after Tasks 259ddae7 (collaboration model) and ee74d72b (tool split), base `5096011674` | N/A | Paused (SR-003) | Requirements Approved (user's email-model decision; details within the direction, user informed); design Needs Revision | REQ-003, REQ-011, REQ-012, AC-014, AC-015, BEH-009, SCN-008, UC-008, DEC-002 superseded, DEC-010, DEC-011, QR-002 | Requirements revised; design paused again for Task collaboration-prompt-wording |
| SR-005 | Requirements (+ behavior-defining supplement) | The user's direction in the Solution Designer conversation, 2026-10-17, base `c2e366806a` → `8a970f214c` | V-1..V-17 (contract validation) | Requirements Approved (SR-004); design Needs Revision | Requirements Approved (user); memory layout contract revision 2 is the behavior-defining supplement; design to be written | BEH-001, BEH-002, BEH-007; REQ-003, REQ-004, REQ-005, REQ-009, REQ-012, REQ-013 (new), REQ-014 (new); AC-003, AC-011, AC-012, AC-015, AC-016 (new), AC-017 (new); QR-002; DEC-005 revised; DEC-009 superseded; DEC-012, DEC-013 (new) | Contract validated (user review pending); design next, then architecture review |
| SR-006 | Requirements + design (scope) | The user's direction, 2026-10-17: keep Memory Sync coherent in this ticket; avoid a test deadlock | V-18 (Memory Sync) | SR-005 | Requirements Approved (user direction); design updated | REQ-015, REQ-016 (new); AC-018, AC-019 (new); non-goals (future Memory Sync capability); contract §12.3a; design sequence step 0 and file mapping | User reads the contract; then architecture review |
| SR-007 | Requirements + supplement + design (review recovery) | Architecture review ARCH-REV-001 (Fail: ARCH-F-001..005), 2026-10-17 | V-19 | SR-006 | Requirements Approved (REQ-017/018 by the Solution Designer within the user's direction, user informed); contract revision 3; design revised | REQ-012 (merge), REQ-017, REQ-018 (new); AC-020, AC-021, AC-022 (new); UC-006, SCN-006, AC-006, AC-008, QR-001, tool names, Supplemental table, Data Continuity reconciled; contract L1, L6, §5.4, §8, §10, §12.3, S27–S32; design D-9, Review Response, DS-003/004/005/008, split write, migration plan | Re-review by the architecture reviewer |
| SR-008 | Design + requirements (review recovery, resume) | ARCH-REV-002 (Fail: ARCH-F-006); resume after Task 9942a43c, 2026-10-17 | ARCH-F-006 | SR-007 (on hold) | Requirements Approved (REQ-017 corrected within the direction); contract revision 4; design revised | REQ-002, REQ-017, AC-002, AC-020 revised; AC-022 withdrawn; contract L1, §5.4, §6, §8 step 0, §10, §12.3 (F-PENDING-FAILED), S32 withdrawn, S33–S35; design Migration Plan, dispositions, DS-008, interface, R-8 | Re-review by the architecture reviewer |
| SR-009 | Requirements + supplement + design | Implementer questions U-1..U-5; the user's naming-cleanup request, 2026-10-17 | U-1..U-5 | SR-008 (ARCH-REV-003 Pass) | Requirements Approved (REQ-019 by the user; U-decisions within the direction); contract revision 5; design revised | REQ-019, AC-023, AC-024, DEC-015, DEC-016; contract §3.1, §3.2, §3.5, §6, §12.3a, S12; design D-10, Implementer Clarifications, interface, sequence 0a; DESIGN.md rule 8 | Architecture re-review (scope added) |

## Revision Entries

### SR-001 — Requirements baseline: copies keep memory in their own standard run folders

- Phase and classification: Requirements, `Initial Baseline`.
- Triggering input: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), user direction 2026-10-15.
- Triggering finding IDs: N/A.
- Prior status: N/A.
- Current status: `requirements-doc.md` Approved.
- IDs affected: BEH-001..BEH-008, UC-001..UC-007, REQ-001..REQ-010, AC-001..AC-013, SCN-001..SCN-007, DEC-001..DEC-008.
- Scenario-basis changes: N/A (baseline).
- Why recorded: first coherent baseline.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` requirements-phase sections.
- Supplements: None.
- Product design evidence: N/A — not applicable.
- Intended behavior changed: N/A (baseline).
- Approval: approved by the Solution Designer within the Task's direction; the user was informed in this conversation on 2026-10-15 (message summarizing DEC-001..DEC-008). The data migration itself was set by the user in the Task (DEC-008).
- Supplement versions: None.
- Design/review basis invalidated: N/A.
- Classification: N/A before design.
- Handoff: none at this round.
- Downstream impact: architecture design may proceed.
- Remaining gaps: architecture unknowns (Memory Sync, delete path, migration convention).
- Next action: architecture design.

### SR-002 — Architecture design; three requirement refinements

- Phase and classification: Mixed (`Refinement` of requirements found during design; design created).
- Trigger: architecture investigation (investigation notes "Architecture Investigation Findings"); project Data Migration Guideline.
- Finding IDs: N/A.
- Prior status: requirements Approved (SR-001); design N/A.
- Current status: requirements Approved at SR-002; `design-spec.md` Ready.
- IDs affected:
  - REQ-004 / AC-003 / DEC-009 (new): the copy folder records only a back-link (kind + coordinating run); definition and other facts are read through the coordinating run (single authority). Previously REQ-004 also required the definition in the folder.
  - REQ-007 / AC-010: a copy that cannot be moved keeps its files intact at the old location and is retried on the next start; the runtime never reads the old location (repository rule: current-only runtime, no lockout). Previously AC-010 said the failed copy "remains readable at its old location".
  - REQ-010 / AC-013 / DEC-004 / BEH-006 / UC-005 / SCN-005: Agent copies are listed in the Memory Agents list under their definition (Must); listing Team copies in the Teams list moves to follow-up FU-1. Previously both were listed (Should).
- Scenario-basis changes: SCN-005 narrowed to the Agents list.
- Why recorded: design found the original wording either duplicated an authority (REQ-004), conflicted with the repository's current-only runtime rule (AC-010), or added a new UI surface not needed for storage consistency (REQ-010).
- Canonical sections changed: `requirements-doc.md` Document Status, BEH-006, UC-005, Out Of Scope, REQ-004, REQ-007, REQ-010, AC-003, AC-010, AC-013, SCN-005, DEC-004, DEC-009; `investigation-notes.md` Architecture Investigation Findings, risks; `design-spec.md` created.
- Supplements: None.
- Product design evidence: N/A — not applicable.
- Intended behavior changed: `Yes` (narrowing/clarification within the Task's direction; no new scope).
- Approval: Solution Designer within the direction; user informed in the final result message of this round. All refinements reduce or clarify scope and keep the Task's direction and constraints.
- Supplement versions: None.
- Design/review basis: new design; no prior review.
- Classification: `task_size=Large`, `architectural_risk=High` (persistence layout change + one-way startup migration + new on-disk descriptor + writer/reader placement agreement across three root families).
- Handoff: see `handoff-architecture-review.md` (route recorded there after `get_handoff_rules`).
- Downstream impact: independent architecture review expected by the configured rules for Large/High.
- Remaining gaps: reviewer to confirm the Memory Sync hub residue precedent applies; Task 17bfe0fe merge coordination.
- Next action: route per handoff rules.

### SR-003 — Paused: collaboration contract first; email-model message logs agreed

- Phase and classification: Requirements, `Requirement Gap` (user-directed change to intended behaviour), paused before revision.
- Trigger: the user's discussion with the Solution Designer on 2026-10-15 after the SR-002 handoff. The user stopped the architecture review before it reported; no review result exists for SR-002.
- Finding IDs: N/A.
- Prior status: requirements Approved (SR-002); design Ready.
- Current status: **Paused.** Requirements will be revised and re-approved on resume; `design-spec.md` is `Needs Revision` (message logs).
- User decisions in this conversation (approval reference: the user's own messages on 2026-10-15):
  1. Collaboration contract: inside your run you message (`send_message_to`); outside your run you `delegate_task` first, then message the copy by run ID; no delegation to yourself, a teammate or your own team; an Org is a container of independent units whose siblings may delegate to each other.
  2. Messaging should never create runs; collaborators and helper copies are to be removed (agreed direction; details in the new Task).
  3. Message storage follows the email model: a message inside one run is stored once in that run's log; a message between two runs is stored in both runs' logs with one message ID (chosen for future cross-node messaging).
  4. Sequence: a separate Task makes the runtime and documentation follow the contract first; this Task resumes afterwards on the simplified model.
- IDs affected on resume: REQ-003 (delegator keeps links and its own mailbox only), new requirements for per-run message logs and their migration; DEC-002 (collaborators) becomes moot once collaborators are removed.
- Canonical sections changed now: this record only. The drafted collaboration model document and the doc-consolidation patch were moved out of the branch into `collaboration-contract-handover/` for the new Task; the branch's docs are unchanged.
- Supplements: `collaboration-contract-handover/new-task-proposal.md`, `collaboration_model.draft.md`, `doc-consolidation.draft.patch` (inputs to the new Task; not part of this Task's approval basis).
- Intended behavior changed: `Yes` (to be recorded in the requirements on resume).
- Approval: the user's direction in this conversation; renewed approval of the revised requirements is needed on resume.
- Design/review basis invalidated: SR-002 design (message storage part); no review result exists.
- Classification: unchanged until the design is revised.
- Handoff: proposal sent to `/project_task_manager` to create the prerequisite Task and assign it to this team copy.
- Remaining gaps: the outcome of the prerequisite Task (especially the data decision for existing collaborators and teammate copies).
- Next action: resume after the prerequisite Task is DONE: rebase on it, revise requirements (SR-004), revise design, send to architecture review.

### SR-004 — Resume on the new base; email-model message logs

- Phase and classification: Requirements, `Resumed Revision`.
- Trigger: Tasks 259ddae7 (collaboration model: collaborators removed, teammate delegation
  refused, messaging never creates a run) and ee74d72b (task tool split) delivered; base
  `5096011674`.
- Changes: REQ-003 revised (the coordinating run keeps coordination data only); REQ-011 (email
  model: per-run message logs, cross-run messages in both logs), REQ-012 (split existing logs);
  AC-014, AC-015; BEH-009; SCN-008, UC-008; DEC-002 superseded (collaborators no longer exist;
  the 9 stored ones were converted into delegated runs); DEC-010 (email model, the user); DEC-011
  (receiver's log first); QR-002 (≈84 copies / ≈415 MB).
- Approval: the email model is the user's decision (2026-10-15); details by the Solution
  Designer within that direction, user informed.
- Design: Needs Revision; paused for Task collaboration-prompt-wording (delivered 2026-10-16).

### SR-005 — A task agent is a normal run; the memory layout contract

- Phase and classification: Requirements, `User Direction Revision`, with a behavior-defining
  supplement.
- Trigger: the user's direction in the Solution Designer conversation, 2026-10-17. Before any
  design, the user asked for a contract describing the whole behavior, validated against the
  code and the user's data: `memory-layout-contract.md`.
- Decisions (the user):
  - Revision 2 of the contract: a task agent owns its facts — its own `run_metadata.json` (agent)
    or team tree (team) with a `taskAgent` section — and the coordinating run keeps only links
    (DEC-012). Compared with a middle path that kept facts in the coordinating tree; chosen because
    the coordinating run behaves like a hub that lives for months or years (contract §0: H1, H3)
    and because a task agent may later run on another node. Known cost: composing today's views
    reads one file per task agent (H2).
  - Prove the migration on small synthesized data covering every shape, not data of the real size
    (DEC-013). Fixtures mimic the released shapes; a shape inventory maps every shape to a fixture
    (contract §6, §12.3). The Data Migration Guideline was corrected accordingly and pushed to
    `personal` (`8a970f214c`, items 3 and 5).
  - Deleting a coordinating run keeps its task agents' folders, detached (DEC-005 reversed).
  - Existing message logs: each task agent's log is built from the coordinating run's log, which
    stays unchanged (REQ-012 revised).
  - No downgrade, as in any upgrade (DEC-006 kept; no special release note).
  - Message log format unchanged here; append-only JSON Lines is a follow-up Task (sent to
    `/project_task_manager`).
- Validation (contract §12): V-1 … V-17 against the code (`c2e366806a`) and the user's data,
  read-only: 88 task agents in six shapes (C1–C6), none nested, no collaborators left; 6 without
  `source`, 4 without a delegator, 11 Settings edits; no stored absolute paths into task agent
  folders; guards G1 (run metadata) and G2 (team admission) needed; 28 files use the task agent
  record types; message writes fit the coordinating run's lock.
- Corrections recorded: the earlier claim that the sidebar would show moved task agents was wrong
  (history needs run metadata); the surface affected was the Memory page Agents list.
- Status: requirements Approved (user); contract revision 2 awaits the user's read; the design
  spec is next, then independent architecture review (task_size=Large, architectural_risk=High
  expected).

### SR-006 — Memory Sync stays coherent in this ticket; test impact inventory

- Trigger: the user asked whether Memory Sync belongs here, worried that changing the memory
  location breaks existing tests and validation then deadlocks on "all tests pass".
- Decision: Memory Sync keeps working on the new layout in this ticket with no new capability
  (REQ-015, AC-018): export of task agents as own run folders, the Memory page over an upgraded
  node's import, an old-layout import shown without task agents and nothing deleted. No Memory Sync
  source change; its tests and fixtures are updated (F-SYNC-NEW, F-SYNC-OLD).
- Test policy (REQ-016, AC-019): tests encoding the old layout are planned updates, not regressions;
  implementation starts with a test impact inventory; each update records its reason; other failures
  are investigated as regressions; pre-existing base failures follow TESTING.md.
- Out of scope (future ticket): exporting organization runs themselves, selected-run sync, per-run
  sync status, cleaning old nested residue on receiving nodes, cross-node delegation.
- Contract read by the user (V-13 done, 2026-10-17): confirmed the nested case (a member of a task
  agent team delegates; S9, §3.1 table) and the three visible UI differences under P7 (Memory page
  Agents list; delete keeps task agents with the confirmation saying so; imports from a not-yet-updated
  node). Base fast-forwarded to `db00ba16a9` (docs only). Package sent to architecture review.
- Follow-ups recorded by the Project Task Manager (2026-10-17, TODO, start after 8641c0ac is terminal):
  Memory page view of detached task agents `project_task_50e82cf7-448b-464e-bfb2-3bb4388ba1f8`;
  lazy loading of a hub's task agents on expand `project_task_24048a89-e25d-4fc1-85fc-6f1dd0db9306`;
  append-only message log `eb7d6c91`.

### SR-007 — Architecture review ARCH-REV-001 recovery

- Trigger: ARCH-REV-001 Fail (`design-review-report.md`): ARCH-F-001 pending released migrations,
  ARCH-F-002 nested sub-team members, ARCH-F-003 log merge on retry, ARCH-F-004 change-detection
  baseline (Design Impact); ARCH-F-005 stale lines (Requirement Gap). Central choices confirmed sound.
- Verification: every finding confirmed in code (investigation notes §ARCH-REV-001 Verification).
  ARCH-F-001 widened: `20261015_collaborators_to_delegated_runs_v1` writes trees through the current
  stores and is pending for every user upgrading from a release before 2026-10-15; through the new
  stores its converted records would get own files at L1 before their memory moved and the new
  migration would skip them (silent loss of history, S27). New issue found: the package validators
  require every message endpoint in the index and the stores rewrite whole logs from the loaded list,
  so a task agent that is not available would make its Team / Org run fail to load or lose messages.
- Decisions (Solution Designer, within the user's direction "never lose, never lock out"; no new
  product behavior beyond §10's refinement):
  - D-9 / contract §5.4: released migrations that import changed modules are repointed to frozen
    copies of today's behavior; the new migration's prerequisites are every earlier `memory/`
    migration (REQ-017, AC-020). Chosen over a minimum upgrade-from version, which would strand
    stable users (collaborators-v1 shipped only in the 1.5.5 betas).
  - Contract L6 (REQ-018, AC-021): only available task agents (own file exists) are loaded; records
    not yet migrated are hidden and written back unchanged; views show messages whose endpoints are
    loaded; saves are computed against the files (this also answers ARCH-F-004: no baseline state).
  - L1 / placement with nested sub-team run ids (AC-022, F-C2N); step 5 merges (REQ-012).
  - Unreadable coordinating tree → preserved exclusion with a warning.
- User informed in the Solution Designer conversation.
- Correction (2026-10-17, the user's question): ARCH-F-002's premise "an Org agent delegates to a
  mounted Team with a sub-team" does not hold today — teams are flat since 2026-09-01
  (`flat-team-execution-factory.ts`). Nested task-team members exist only in records from releases
  of 2026-08-15 … 2026-09-01 (`TaskTeamNestedTeamExecution` still in the record type). The placement
  support and F-C2N stay, scoped to that old shape; no new nested member is created.

### On hold (2026-10-17) — cleanup first

- ARCH-REV-002 (re-review of SR-007): Fail with one new finding, ARCH-F-006 (Design Impact, High):
  waiting for every earlier `memory/` migration (REQ-017, contract §5.4), combined with L6, can hide
  every task agent indefinitely if one predecessor keeps failing. Premises partly verified (runner
  continues past failures; prerequisites require SUCCEEDED); resolution pending.
- The user decided to clean up the nested task-team leftover first (teams are flat since 2026-09-01,
  but `TaskTeamNestedTeamExecution` remains in ~10 current server files and in web code). Brief:
  `followups/nested-task-team-cleanup-brief.md`, sent to the Project Task Manager as a new Task to do
  before this one. On resume: drop nested-team support here (placement `nestedTeamRunIds`, F-C2N,
  AC-022) and resolve ARCH-F-006 (next entry SR-008).

### SR-008 — Resume: per-run gate (ARCH-F-006); nested-team support dropped

- Trigger: ARCH-REV-002 Fail (ARCH-F-006, Design Impact, High): every earlier `memory/` migration as a prerequisite,
  with L6, can hide every task agent forever when one predecessor fails deterministically. Resume after the nested
  task-team cleanup (Task 9942a43c, merged `8a8d322144`; no migration added there).
- Verification: runner prerequisite semantics and continuation confirmed; released deterministic FAILED dispositions
  exist; the premise holds. My SR-007 rule was over-broad (a global gate), against DESIGN.md rule 7.
- Decisions (Solution Designer, within the direction "never lose, never lock out"): no declared prerequisites;
  registry order; per-run input gate (`WAITING_FOR_PREDECESSOR` non-terminal while a tree-writing predecessor is not
  `SUCCEEDED*`; `PRESERVED_UNSUPPORTED_TREE` warning otherwise); predecessor retry after the move stated harmless per
  class; F-PENDING-FAILED. Nested-team support removed (placement, F-C2N, AC-022, S32); the frozen parser rejects the
  retired shape.
- Correction to the resumed Task text: the cleanup added no migration, so nothing joins §5.4.
- Intended behavior changed: No beyond REQ-017's corrected clause (containment per run instead of a global wait).
  User informed.
- Next action: architecture re-review.

- Review: ARCH-REV-003 Pass of SR-008 (2026-10-17, contract revision 4, base `66429d6f31`); the reviewer handed off to
  `/software_engineering_team/implementation_engineer`. Editorial fix applied the same day: the design's Review Response
  row for ARCH-F-001 no longer states the superseded prerequisite rule.

### SR-009 — Own-file clarifications and version-free names

- Trigger: the implementation engineer's five questions (U-1..U-5) while implementing SR-008; the user's request to
  include the version-name cleanup ("let's also do the refactoring for this … smelled code names"); the user stopped
  implementation pending the answers.
- Evidence: U-4 checked in code (a record without `source` resolves from its configured place; snapshotting would
  change behavior and display); U-5 checked in data, read-only (633 trees: 9 delegations by task-team members, all at
  the coordinating run; 0 inside task team records).
- Decisions: U-1, U-2, U-3, U-5 as proposed (U-5 with CM-7 lifting); U-4 corrected to `taskAgent.origin:
  "configured_place"` (no behavior change; withdraws the §6 change for migrated records). REQ-019 + DESIGN.md rule 8:
  no version numbers in current-code names; frozen copies named after their owning migration.
- Intended behavior changed: No (U-4 removes a previously accepted change). Scope added by the user (REQ-019).
- Next action: architecture re-review (Large/High, revised package); then the implementer resumes.
- Review: ARCH-REV-004 Pass of SR-009 (2026-10-17, contract revision 5), no new findings; handed to
  `/software_engineering_team/implementation_engineer`, which resumes on SR-009. Reviewer notes passed to the
  implementer: `configured_place` own files keep `agentDefinitionId` (AC-013); versioned string values (e.g.
  `"interrupt_cancel_queued_v1"`) are values, not names, and are not renamed; the U-5 dead-path removal needs evidence.
