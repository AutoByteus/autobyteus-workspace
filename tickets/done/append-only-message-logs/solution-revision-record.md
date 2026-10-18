# Solution Revision Record — Append-Only Message Logs

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Project Task delegated by `/project_task_manager` 2026-10-18 | N/A | N/A | Approved (Solution Designer within direction, user informed) | BEH-001..007, REQ-001..010, AC-001..010, DEC-001..006 | Requirements baseline |
| SR-002 | Mixed | Architecture investigation (same conversation) | N/A | Requirements Approved (SR-001); design N/A | Requirements Approved (SR-002 refinement); Design Ready | REQ-001, REQ-004, AC-001, AC-004, DEC-002, DEC-007 | Design complete; Large / High; route: architecture review |
| SR-003 | Design | ARCH-REV-001 (Fail, Design Impact) | ARCH-F-001..004 | Design Ready (SR-002) | Design Ready (SR-003); requirements unchanged (SR-002) | BEH-005, BEH-006; REQ-002, REQ-007, REQ-008; AC-002, AC-007 (served, not changed) | Re-review |
| SR-004 | Mixed | ARCH-REV-002 (Fail, Design Impact) | ARCH-F-005, ARCH-F-006 | Requirements Approved (SR-002); Design Ready (SR-003) | Requirements Approved (SR-004 refinement); Design Ready (SR-004) | REQ-003, AC-003, DEC-008; AC-006, AC-007 (served) | Re-review |
| SR-005 | Design | Implementation Design Impact DI-001 | DI-001 | Design Ready (SR-004, passed ARCH-REV-003) | Design Ready (SR-005) | REQ-007, AC-007 (served) | Architecture re-review |

## Revision Entries

### SR-001 — Requirements baseline

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: the Project Task "Append-only message logs" (the user's decision of 2026-10-17, relayed with Task 8641c0ac). Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Triggering finding IDs: N/A.
- Prior status: N/A. Current: requirements `Approved`.
- IDs affected: BEH-001..007, SCN-001..006, UC-001..005, REQ-001..010, AC-001..010, QR-001..003, DEC-001..006.
- Scenario basis: system message delivery, user history, startup readiness and migration, crash edge (coordinator durability contract), upgrade with pending migrations (8641c0ac REQ-017).
- Why recorded: first coherent baseline.
- Sections: all of `requirements-doc.md`; `investigation-notes.md` (requirements part).
- Supplements: probes `cost.mjs`, `profile.py` (evidence only).
- Product design: N/A — not applicable.
- Intended behavior changed: N/A (baseline).
- Approval: Solution Designer within the direction (no `Needs user` decision), user informed in this conversation 2026-10-18; baseline: `requirements-doc.md` at SR-001.
- Supplement approvals: none behavior-defining.
- Design / review basis: N/A.
- Classification: N/A.
- Handoff: none at this round.
- Remaining gaps: design-level decisions (DEC-002 value, DEC-005 mechanism, DEC-006 mechanism).
- Next action: architecture design.

### SR-002 — Refinement and architecture design

- Phase and classification: Mixed, `Refinement` (requirements, within direction) + design.
- Trigger: architecture investigation. It found (a) the Data Migration Guideline forbids version fields and asks for tolerant readers; (b) the commit path re-validates the whole in-memory history twice per message (probe `validate-cost.mts`); (c) Memory Sync uploads changed files whole.
- Triggering finding IDs: N/A (own investigation).
- Prior status: requirements Approved (SR-001); design N/A. Current: requirements Approved (SR-002); design `Ready`.
- IDs affected: REQ-001 (adds "in memory": the commit path validates only the new message), AC-001 (same), REQ-004 / AC-004 (the owner is the folder's run; no header), DEC-002 (limit 4 MiB), DEC-007 (new: no header or version).
- Scenario basis: unchanged.
- Why recorded: completed solution round.
- Sections changed: `requirements-doc.md` (status, REQ-001, REQ-004, AC-001, AC-004, DEC-002, DEC-007); `investigation-notes.md` (Architecture Investigation Findings, supplement inventory); `design-spec.md` (new).
- Supplements: added `probes/validate-cost.mts`, `probes/inventory.py` (evidence only).
- Intended behavior changed: `Yes`, a narrow refinement within the Task's direction ("instead of rewriting and re-validating the whole log on every message"); no product-visible change.
- Approval: Solution Designer within the direction, user informed in this conversation 2026-10-18; baseline: `requirements-doc.md` at SR-002.
- Design / review basis: design-spec SR-002 (first).
- Classification: `task_size = Large`, `architectural_risk = High` (on-disk format of every log, one-way deletion after conversion, commit and crash semantics, interplay with pending released migrations).
- Handoff: `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer` (rule: Large or High). Result file: `handoff-architecture-review.md`.
- Downstream impact: independent architecture review before implementation.
- Remaining gaps: implementer confirms the exact list of log-writing predecessors and the migration import graph at the implementation base (design Risks R-5).
- Next action: architecture review.

### SR-003 — Design revision after ARCH-REV-001

- Phase and classification: Design, `Design Impact`.
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`), Fail.
- Triggering finding IDs: ARCH-F-001 (High), ARCH-F-002 (Medium), ARCH-F-003 (Low), ARCH-F-004 (Low).
- Prior status: design `Ready` (SR-002). Current: design `Ready` (SR-003); requirements `Approved` at SR-002, unchanged.
- IDs served (not changed): REQ-002, REQ-007, REQ-008, AC-002, AC-007; BEH-005, BEH-006.
- Scenario basis: unchanged (SCN-005, SCN-006; MP-001 and MP-002 are reachable within SCN-006 and SCN-005).
- Sections changed: `design-spec.md` (Review Response; Change Scope; Migration Plan: log-writing predecessors, gate, Released Migration Inventory, Same-ID Repairs R-A..R-D, fixtures; `writeInitial` replacing `create`; Dependency Rules; file mapping; backward-compatibility log; sequence; risks R-5, R-7; guidance); `investigation-notes.md` (SR-003 evidence rows).
- Supplements: none added.
- Intended behavior changed: `No`. REQ-007 is kept; no released migration is left incomplete, so ARCH-F-001 is solved by design (same-ID repairs), not by a requirement change.
- Approval impact: none (design-only). Approved basis remains `requirements-doc.md` at SR-002.
- Design / review basis: ARCH-REV-001 applied to SR-002; SR-003 needs re-review.
- Classification: unchanged, `Large` / `High`.
- Handoff: `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer`. Result file: `handoff-architecture-review.md` (updated for SR-003).
- Remaining gaps: the implementer re-runs the inventory search at the implementation base (R-5).
- Next action: architecture re-review.

### SR-004 — Sealed-file exception and one gate rule (ARCH-REV-002)

- Phase and classification: Mixed, `Refinement` (requirements, within direction) + `Design Impact` (text).
- Trigger: ARCH-REV-002, Fail with ARCH-F-005 (Low) and ARCH-F-006 (Low). The prior findings ARCH-F-001..004 are resolved.
- Prior status: requirements Approved (SR-002); design Ready (SR-003). Current: requirements Approved (SR-004); design Ready (SR-004).
- IDs affected: REQ-003, AC-003 (sealed immutability scoped to appends and rotation), DEC-008 (new: the one-time locator repair exception, its size and Memory Sync effects); AC-006 and AC-007 served by the unified gate rule.
- Sections changed: `requirements-doc.md` (status, REQ-003, AC-003, DEC-008); `design-spec.md` (status, Review Response, Terminology, Gate bullet, Step 1, R-C, R-6).
- Intended behavior changed: `Yes`, narrowly. A sealed file may be rewritten once by a pending released migration's locator repair; there is no product-visible change. The change stays within the direction: it serves REQ-007 and REQ-008 and the Task's "references and attachments still resolve".
- Approval: Solution Designer within the direction, user informed in this conversation 2026-10-18; baseline: `requirements-doc.md` at SR-004.
- Classification: unchanged, `Large` / `High`.
- Handoff: `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer` (re-review). Result file: `handoff-architecture-review.md`.
- Next action: architecture re-review.

### Review pass recorded — ARCH-REV-003 (no new solution round)

- ARCH-REV-003 passed SR-004 (`design-review-report.md`); ARCH-F-005 and ARCH-F-006 resolved, no new findings. The reviewer sent the package to `/software_engineering_team/implementation_engineer`; the Solution Designer does not repeat that handoff.
- Factual correction only: design-spec Architecture Investigation Evidence, Memory Sync row, now says "sealed files stable under appends and rotation (one-time R-C exception, DEC-008)", matching DEC-008 (the reviewer's non-blocking note).

### SR-005 — Gate marker for flat-families partial-target orgs (DI-001)

- Phase and classification: Design, `Design Impact`.
- Trigger: implementation engineer DI-001 (`implementation-design-impact-di-001.md`), reproduced in a scratch test: a flat-families retry after ours fails with ENOENT on a partial-target org forever, which blocks locators-v1 and summary-v1.
- Prior status: design Ready (SR-004, ARCH-REV-003 Pass). Current: design Ready (SR-005). Requirements unchanged (Approved at SR-004).
- IDs served: REQ-007, AC-007.
- Decision: option (a), the implementer's recommendation. An org log is not ready while its folder holds a retired team authority. The existing one gate rule applies. Option (b) is rejected (a fourth released migration and its write path). Index-only plans verified to read no log.
- Sections changed: `design-spec.md` (status, Review Response, Gate bullet, inventory row, fixture table); `investigation-notes.md` (SR-005 evidence row).
- Intended behavior changed: `No`. Approval impact: none.
- Classification: unchanged, `Large` / `High`.
- Handoff: `Architecture Design Complete` (revised) → `/software_engineering_team/architecture_reviewer` (handoff rule: Large/High revised package). The implementer, who asked directly, is told the decision.
- Next action: architecture re-review of the SR-005 delta.

### Review pass recorded — ARCH-REV-004 (no new solution round)

- ARCH-REV-004 passed SR-005 (`design-review-report.md`): DI-001 is resolved by the gate marker; the reviewer recorded MP-004 (Reachable). The reviewer sent the package to `/software_engineering_team/implementation_engineer`. The Solution Designer does not repeat that handoff.
