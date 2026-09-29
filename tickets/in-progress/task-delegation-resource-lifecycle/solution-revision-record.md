# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user conversation 2026-09-27 | N/A | N/A | Ready for Approval | BEH-001–BEH-011; REQ-001–REQ-014 | Model A baseline presented for approval |
| SR-002 | Requirements | User refinements 2026-09-29 (delete task data/UI, keep `delegate_task`, clean UI) | N/A | Ready for Approval (SR-001, not approved) | Approved 2026-09-29 | BEH-001, BEH-009–BEH-012; REQ-001–REQ-017 | Sub-agent framing; deletion instead of conversion; minimal UI |
| SR-003 | Design | Architecture investigation + design 2026-09-29 | N/A | Approved requirements; no design | Design Ready; Large / High | All (mapped) | design-spec.md created |
| SR-004 | Design | Architecture review ARCH-REV-001 (Fail — Design Impact) | AR-001, AR-002, AR-003, R-1–R-4 | Design Ready (SR-003), review Fail | Design Ready; Large / High | BEH-001, BEH-004, BEH-005, BEH-008; REQ-001, 004–007, 011, 014 | Targeted design revision; requirements unchanged |
| SR-005 | Mixed (Evidence + Design) | User question on guideline compliance (2026-09-29); real-data inspection; upstream drift | N/A | Design Ready (SR-004), review Pass (ARCH-REV-002) | Design Ready; Large / High | BEH-010; REQ-014, REQ-015; AC-018 | Migration checklist, simplified dispositions, basis refresh; requirements unchanged |
| SR-006 | Design | Architecture review ARCH-REV-003 (Fail — Design Impact) | AR-004, AR-005, R-8, R-9 | Design Ready (SR-005), review Fail | Design Ready; Large / High | BEH-004, BEH-005, BEH-010; REQ-004–007, REQ-013, REQ-014; AC-018 | Released-migration ordering/dispositions; single liveness predicate; requirements unchanged |
| SR-007 | Mixed (Requirements + Design) | User decision 2026-09-29: tolerant reading, no migration, no version field (DEC-008) | N/A | Requirements Approved (SR-002); design Ready (SR-006), ARCH-REV-004 Pass | Requirements Approved (SR-007 delta); design Ready; Large / High | REQ-013, REQ-014, REQ-018 (new); AC-018, AC-020, AC-021 (new); BEH-010 | Migration removed; tolerant tree reading; released migrations use frozen strict classifiers |

## Revision Entries

### SR-001 — Delegation as sub-agent spawn with resource-managed lifecycle (Model A)

- Phase and classification: Requirements — `Initial Baseline`
- Triggering user feedback: Conversation 2026-09-27 (clarifications 1–6 in investigation notes); user chose Model A and a grace period (example 5–10 minutes).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001–BEH-011, UC-001–UC-006, REQ-001–REQ-014, AC-001–AC-017, SCN-001–SCN-011, DEC-001–DEC-004.
- Scenario-basis changes: N/A (baseline). SCN-011 validity depends on DEC-002.
- Why recorded: First coherent baseline for user approval.
- Canonical sections changed: all sections of `requirements-doc.md` and `investigation-notes.md` created.
- Supplemental artifacts: None.
- Prototype evidence or product decisions incorporated: None (no Product Design requested). Protocol precedent (A2A) recorded as evidence only.
- Intended behavior changed: `Yes` (new baseline)
- Approval impact: Pending explicit user approval of SR-001 and DEC-001–DEC-004.
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (routine approval hold)
- Downstream and architecture-review impact: N/A
- Remaining gaps: DEC-001–DEC-004; UNK-001–UNK-003 deferred to architecture investigation.
- Next action: Obtain user approval; then architecture investigation and design spec.

### SR-002 — Sub-agent framing, deletion of task data/UI, minimal UI

- Phase and classification: Requirements — `Refinement`
- Triggering user feedback: Conversation 2026-09-29: (a) old task back-and-forth is not needed and can be deleted rather than converted; (b) `delegate_task` inputs mirror `send_message_to` and are meaningful, so a `spawn_agent` rename is not wanted; (c) UI must be as clean as possible and consistent with the product.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: SR-001 `Ready for Approval` (never approved)
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001 (return shape), BEH-009 (UI), BEH-010 (API/data deleted), BEH-011, new BEH-012 (task notifications); REQ-001, REQ-003, REQ-012–REQ-017 rewritten/added; AC-001–AC-019 renumbered; DEC-004 revised, DEC-005–DEC-007 added.
- Scenario-basis changes: SCN-009 revised (members tree instead of task section); SCN-011 now Supported Explicit Edge under REQ-008.
- Why recorded: Material change to intended UI and data handling before approval.
- Canonical sections changed: requirements-doc.md (all behavior, scope, requirements, AC, UI, data continuity, decisions); investigation-notes.md (UI and notification evidence).
- Supplemental artifacts: None.
- Product decisions incorporated: no conversion of old task records; old files left untouched; no new UI section; tool name retained.
- Intended behavior changed: `Yes`
- Approval impact: Pending explicit approval of SR-002, with DEC-001–DEC-004 confirmation.
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (routine approval hold)
- Downstream and architecture-review impact: N/A
- Remaining gaps: DEC-001–DEC-004 confirmation; UNK-001–UNK-003, ASM-003 for architecture.
- Next action: Obtain explicit approval; then architecture investigation and design spec.
- Approval record (appended 2026-09-29): User message "If the existing task rectifiers doesn't influence us, then why not? Left it unchanged. Yeah. I agree with your approach. Approved." — SR-002 approved; DEC-001 (10 min default, server setting), DEC-002 (same root only), DEC-003 (no silent-child notification), DEC-004 (old task-record files left unchanged) confirmed.

### SR-003 — Architecture design complete

- Phase and classification: Design — `Initial Baseline` (design)
- Triggering evidence: Architecture investigation ARCH-01 … ARCH-15 (investigation-notes.md), 2026-09-29
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: Requirements `Approved` (SR-002); design N/A
- Current authoritative requirements/design status: Requirements `Approved` (SR-002, unchanged); design `Ready`
- IDs affected: all BEH/REQ/AC mapped in design-spec Behavior Map
- Scenario-basis changes: None. Evidence-only clarification: operator composer messages to a shut-down child wake it (preserves current ability to message children; ARCH-10). UNK-001–UNK-003 and ASM-001–ASM-003 resolved.
- Why recorded: Design completion and classification
- Canonical sections changed: design-spec.md (new); investigation-notes.md (Architecture Investigation Findings, unknowns)
- Supplemental artifacts: None
- Intended behavior changed: `No`
- Approval impact: None; SR-002 approval applies
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A (first design)
- Post-design classification: `task_size = Large`, `architectural_risk = High` (contract, persistence migration Team tree v2→v3 / Org tree v1→v2, concurrency/lifecycle, root security boundary, ownership replacement)
- Applied handoff-rule outcome: see solution-handoff.md
- Downstream and architecture-review impact: Independent architecture review expected per handoff rules
- Remaining gaps: Real-install migration evidence and per-runtime restore E2E are validation obligations
- Next action: Route per handoff rules

### SR-004 — Design revision for ARCH-REV-001

- Phase and classification: Design — `Design Impact`
- Triggering report: architecture_reviewer, design-review-report.md, round 1 (`ARCH-REV-001`), 2026-09-29
- Triggering finding IDs: AR-001 (High), AR-002 (Medium), AR-003 (Low); recommendations R-1 to R-4
- Prior status: Requirements `Approved` (SR-002); design `Ready` (SR-003), review `Fail`
- Current status: Requirements `Approved` (SR-002, unchanged); design `Ready` (SR-004)
- IDs affected: BEH-001, BEH-004, BEH-005, BEH-008; REQ-001, REQ-004–REQ-007, REQ-011, REQ-014; AC-001, AC-004, AC-007, AC-011, AC-013, AC-015, AC-018
- Scenario-basis changes: None. P-02 is made irrelevant by the precheck (AR-002 option a).
- Why recorded: Resolve review findings within approved scope
- Canonical sections changed (design-spec.md):
  - Interface Boundary Mapping (result shape; lease; port)
  - Bounded Local Spines (DS-005 mapping; lease release arming)
  - Removal Plan (admission rule R-2; helpers R-3)
  - Guidance (status events, leases, restore precheck, wake failure, open work, result schema)
  - Key Tradeoffs, Risks, Examples
  - New sections: Retained Team Helper Dispositions, Evidence-Only Clarifications, Review Round 1 Resolution
- Supplemental artifacts: None
- Intended behavior changed: `No`
  - AR-003 conforms the design to the approved AC-001.
  - R-1 is recorded as an evidence-only clarification: same-root routing also reaches not-yet-activated configured members, consistent with user clarification 3.
- Approval impact: None; SR-002 approval applies
- Behavior-defining supplement versions: N/A
- Affected design/review basis: ARCH-REV-001 applies to SR-003; focused re-review requested for DS-002, DS-003, DS-005, the restore contract and the result shape
- Post-design classification: unchanged, `task_size = Large`, `architectural_risk = High`
- Applied handoff-rule outcome: see solution-handoff.md (Round 2 route)
- Downstream and architecture-review impact: Re-review required before implementation
- Remaining gaps: validation obligations only (per-runtime restore/approval, real-install migration, R-4 label confirmation with the user at delivery)
- Next action: Route per handoff rules
- Review outcome note (appended 2026-09-29, not a new solution round): ARCH-REV-002 **Pass** on SR-002 + SR-004. Non-blocking notes R-5 to R-7 are recorded in solution-handoff.md. The reviewer routed the package to implementation.

### SR-005 — Migration guideline compliance, real data, and basis refresh

- Phase and classification: Mixed — evidence clarification + `Design Impact` (self-identified)
- Trigger: the user asked whether the migration design followed the data migration guideline. Solution Designer found skipped required steps: the checklist, predecessor and real-data inspection, the cross-feature reference check, and the startup and reporting boundaries. The user authorized read-only inspection of the installed data (2026-09-29).
- Finding IDs: N/A (self-identified); evidence ARCH-16 to ARCH-19
- Prior status: Requirements `Approved` (SR-002); design `Ready` (SR-004), ARCH-REV-002 `Pass`
- Current status: Requirements `Approved` (SR-002, unchanged); design `Ready` (SR-005)
- IDs affected: BEH-010; REQ-014, REQ-015; AC-018 (evidence obligations extended); DS-003 wake mechanics (simplified by the upstream handle change)
- Scenario-basis changes: None
- Canonical sections changed:
  - design-spec.md: header; Migration Plan "Read records" row; new section "SR-005 Migration Checklist And Basis Refresh"
  - investigation-notes.md: ARCH-16 to ARCH-19
- Supplemental artifacts: None
- Intended behavior changed: `No`
- Approval impact: None
- Affected design/review basis: ARCH-REV-002 covered SR-004. The SR-005 migration and basis changes need a focused re-review.
- Post-design classification: unchanged, `Large` / `High`
- Downstream impact: the ticket branch must be rebased onto `origin/personal@f2924a2b0` or later before further implementation (ARCH-19)
- Remaining gaps: the stopped-writer installed-data copy run is a validation obligation before delivery
- Next action: route per handoff rules
- Related, separate work: the canonical guideline revision was drafted at the user's request in worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/data-migration-guideline-refresh` (branch `codex/data-migration-guideline-refresh`, uncommitted). This design is checked against the published version at `f2924a2b0`, and its section-2 checklist answers match the draft's numbering.

### SR-006 — Resolution of ARCH-REV-003

- Phase and classification: Design — `Design Impact`
- Trigger: architecture_reviewer, ARCH-REV-003 (round 3) Fail, 2026-09-29
- Finding IDs: AR-004 (High), AR-005 (Low); R-8, R-9
- Prior status: design `Ready` (SR-005), review Fail
- Current status: Requirements `Approved` (SR-002, unchanged); design `Ready` (SR-006)
- IDs affected: BEH-004, BEH-005, BEH-010; REQ-004–REQ-007, REQ-013, REQ-014; AC-018 (plus skip-version evidence)
- Canonical sections changed (design-spec.md):
  - header; Terminology (liveness predicate, shutdown commit, command gating);
  - SR-005 checklist (published numbering, item 5 pointer, item 7 boundary contracts, evidence g);
  - new section "SR-006 Resolution (ARCH-REV-003)"
- Evidence: registry list order and runner `runPending` (`origin/personal@f2924a2b0`); import inventory of `src/app-data-migrations`; `20260905` evidence reader uses Org task submissions; `20260905` uses the tree store with `read` only; the pre-rebase implementation registers the migration right after `20260901`.
- Decision: option (b). Register immediately after `20260901`; repoint released producers (`20260814`, `20260824`, token-usage records, `20260901`) to a frozen legacy module (~1,100 lines verbatim); leave `20260926` unchanged; adapt `20260905` (~10 lines); later migrations are not affected.
- Intended behavior changed: `No`
- Approval impact: None
- Affected design/review basis: ARCH-REV-003 applies to SR-005. Downstream implementation, code-review and API/E2E artifacts on the pre-rebase base must be re-reviewed after the rebase (R-9).
- Post-design classification: unchanged, `Large` / `High`
- Remaining gaps: validation obligations (skip-version fixture, installed-data copy, per-runtime restore)
- Next action: route per handoff rules
- Review outcome note (appended 2026-09-29, not a new solution round): ARCH-REV-004 **Pass** on SR-002 + SR-006. R-10 and R-11 are non-blocking and recorded in solution-handoff.md. The package was routed to implementation by the reviewer.

### SR-007 — Tolerant tree reading replaces the migration

- Phase and classification: Mixed — `Requirement Gap` (user-initiated change of intended behavior and a persistence constraint) plus the resulting `Design Impact`
- Trigger: the user asked what is being migrated, then decided (2026-09-29) that execution-tree validation is too strict. Tolerant reading makes the migration unnecessary; there should be no version field; and the rule should become project practice.
- Finding IDs: N/A (user decision); related reviewer notes R-10 and R-11 are moot because the migration is removed
- Prior status: Requirements `Approved` (SR-002); design `Ready` (SR-006), ARCH-REV-004 Pass
- Current status: Requirements `Approved` (SR-007 delta, explicit user approval, DEC-008); design `Ready` (SR-007)
- IDs affected:
  - REQ-013: starter shown for children whose entry records it; old children show none.
  - REQ-014: no data migration.
  - REQ-018 (new): tolerant read, exact write, no version, no field-name reuse.
  - AC-018 (updated); AC-020 and AC-021 (new).
  - Data continuity (acceptable loss: starter display for the 18 old children); DEC-008; Out Of Scope (other persisted files are a follow-up).
- Scenario-basis changes: None
- Canonical sections changed:
  - requirements-doc.md: status block, REQ-013, REQ-014, REQ-018, AC-018, AC-020, AC-021, data continuity, DEC-008, out of scope, traceability.
  - design-spec.md: header; new authoritative section "SR-007 Tolerant Tree Reading — No Migration", which supersedes the Migration Plan, the SR-005 migration dispositions and evidence, and the SR-006 migration ordering.
- Intended behavior changed: `Yes` (old children show no starter; no migration). Approved by the user in the same message.
- Approval impact:
  - The ARCH-REV-004 pass covered SR-006 and no longer covers the migration parts.
  - A focused re-review is required for REQ-018 and the SR-007 design section.
  - Implementation must remove the in-progress migration.
- Post-design classification: unchanged, `Large` / `High`
- Remaining gaps: the follow-up ticket for other persisted files and the guideline practice update (separate docs worktree)
- Next action: route per handoff rules
- Review outcome note (appended 2026-09-29, not a new solution round): ARCH-REV-005 **Pass** on SR-007. R-12 to R-14 are non-blocking and recorded in solution-handoff.md; R-10 is obsolete. The reviewer routed the package to implementation.
- Scope note (appended 2026-09-29, not a new solution round): the user decided the guideline change ships with this ticket (delivery docs sync) and that there is no project-wide follow-up ticket. requirements-doc.md Out Of Scope wording and the design-spec.md SR-007 'Project practice' paragraph were updated accordingly.
