# Solution Revision Record — task-keys-and-dependencies

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Delegated implementation Task from `/project_task_manager` (2026-10-17) with the approved Product design | N/A | N/A | Requirements Approved; Design Ready | BEH-001–010; REQ-001–017; AC-001–021 | Architecture Design Complete (Large / High); ARCH-REV-001 Pass |
| SR-002 | Mixed (Requirements + Design) | User feedback 2026-10-17: a meaningful Task ID | N/A | Approved / Ready (SR-001) | Requirements Approved (user); Design Ready | BEH-010, BEH-011; REQ-003, REQ-017–022; AC-020, AC-022–027; DEC-001, DEC-008–010 | Architecture Design Complete (Large / High); ARCH-REV-002 Fail |
| SR-003 | Mixed | ARCH-REV-002 | AR-001–AR-004, REC-005, REC-006 | Approved / Needs Revision | Requirements Approved (clarified within direction, user informed); Design Ready | REQ-018, REQ-019; AC-020, AC-022, AC-023; DEC-011–013 | Architecture Design Complete (Large / High); re-review |

## Revision Entries

### SR-001 — Initial baseline: keys, depends on, backfill migration, approved UI

- Phase and classification: `Initial Baseline`
- Trigger: Project Task "Implement readable Task keys and "depends on" (step 1 of Task relationships), from the approved design" (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); Product `ui-ux-spec.md` Approved 2026-10-17.
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Approved`; design `Ready`.
- IDs affected: all (baseline).
- Scenario basis: SCN-001–010 established. SCN-004 and SCN-006 are Supported Explicit Edge Scenarios (design open decision; integrity).
- Why recorded: first coherent baseline.
- Canonical sections: `requirements-doc.md` (all), `investigation-notes.md` (all), `design-spec.md` (all).
- Supplements: Product `ui-ux-spec.md`, VIS-001–015, `product-ticket.md`, design repo reference components (Product-owned, linked).
- Product decisions incorporated: DEC-001–009 of the Product ticket, with the user's settlement of its open questions (field kept; no line for all-Done; "Blocked by").
- Intended behavior changed: `No` (baseline).
- Approval:
  - Who and reference: the Solution Designer approved within the direction; the user was informed in the Solution Designer conversation on 2026-10-17. The intended UI behavior is the user's own approval of 2026-10-17.
  - What the Solution Designer decided: requirements DEC-001 (prefix reserved per Project, `-N` suffix on collision, deleted Projects' prefixes not reserved), DEC-002 (letters and digits of every script kept; Latin diacritics removed; `project` fallback), DEC-003 (delete removes the Task from dependents), DEC-004 to DEC-007.
  - DEC-008 (agent tools out of scope) comes from the delegating Task.
- Supplement versions: `ui-ux-spec.md` Approved 2026-10-17; design repo `personal@1ebf4c6`.
- Design / review basis invalidated: N/A.
- Classification: `task_size: Large`, `architectural_risk: High` (persistence migration, GraphQL / feed contract, allocation and loop concurrency).
- Handoff: see `handoff-architecture-design-complete.md`.
- Downstream impact: independent architecture review expected by the routing rules for High risk.
- Remaining gaps: none blocking. Follow-ups FU-001–003 recorded in the design spec.
- Next action: route by handoff rules.

### SR-002 — Keys as the agent-facing Task ID; tool dependencies; reserved prefixes; key URLs

- Phase and classification: `Requirement Gap` (a user change to intended behavior) with its design revision.
- Trigger: the user, 2026-10-17. "why dont we change how this id is constructed? use only one id as the key?". After my recommendation (keep the stored ID; make the key the one ID users and agents use): "follow your suggestion as long as you make reasonable judgement", "yess i think its cleaner actually" (key in `taskId`, no long ID in results), "if there is benefits, i will take it as well" and "lets have both in this ticket thanks" (key URLs included).
- Prior status: requirements Approved at SR-001; design Ready; ARCH-REV-001 Pass.
- Current status: requirements `Approved` (user) at SR-002; design `Ready` (SR-002 Extension section).
- IDs affected:
  - BEH-010 (changed), BEH-011 (new);
  - REQ-003 (deleted prefixes reserved), REQ-017 (revised), REQ-018–022 (new);
  - AC-020 (revised), AC-022–027 (new); SCN-011–013 (new);
  - DEC-001 (revised), DEC-008 (revised), DEC-009 and DEC-010 (new);
  - Scope Guardrail UC-006–008; out-of-scope list updated.
- Scenario changes: SCN-011 and SCN-012 are new Supported Normal contract scenarios (agents), SCN-013 a Supported Normal user scenario.
- Sections changed:
  - requirements: Document Status, behavior table, actors, Scope Guardrail, Requirements, ACs, Scenarios, Decisions, Traceability, Data Continuity, Architecture Phase Input;
  - investigation: "SR-002 Investigation";
  - design: header, size / risk rationale, Change Scope, behavior map, interface check, compatibility log, guidance, and the new "SR-002 Extension".
- Supplements: none changed (the UI/UX spec is unaffected: URLs and agent tools are outside its visible surfaces).
- Intended behavior changed: `Yes`.
- Approval: the user's, 2026-10-17 (quotes above). DEC-001's revision (reserve deleted prefixes) was explained to the user before the approval, as the safeguard for keys as agent IDs.
- Design / review basis invalidated: ARCH-REV-001 covered SR-001 only. SR-002 needs a new architecture review round. SR-001's reviewed design stays the base: nothing in it was removed. REQ-017's "tool contract unchanged" constraint was lifted.
- Classification: still `Large` / `High`. The rationale adds the agent tool contract and the collaboration Task-execution port.
- Handoff: `handoff-architecture-design-complete.md` (updated for SR-002).
- Downstream impact: the implementation engineer was told on 2026-10-17 to continue SR-001 and wait for the SR-002 package before handing on.
- Remaining gaps: none. FU-001 absorbed; FU-002 and FU-003 remain.
- Next action: architecture re-review.

### SR-003 — ARCH-REV-002 corrections

- Phase and classification: AR-001 and AR-002 are `Requirement Gap` clarifications; AR-003 and AR-004 are `Design Impact`.
- Trigger: ARCH-REV-002 (Fail), `design-review-report.md`, `architecture-review-revision-record.md`.
- Finding IDs: AR-001–AR-004; REC-005 and REC-006 accepted.
- Prior status: requirements Approved (SR-002); design Needs Revision.
- Current status: requirements `Approved` at SR-003; design `Ready`.
- IDs affected: REQ-018 (scope of "no long ID"; deleted-Task wording), REQ-019 (delegate_task Project-only; case-insensitive keys); AC-020, AC-022, AC-023; DEC-011–013.
- Intended behavior changed: `No` new behavior. The clarifications keep preserved behavior (CM-6, stored paths) and the user's stated direction (the long ID stays the stored identity), so the Solution Designer approved them within that direction and informed the user on 2026-10-17. Changing stored paths or allowing Temp-task delegation would need the user, and neither is proposed.
- Design sections changed: "SR-003 Corrections" (AR-001 boundary, AR-002 resolver split, AR-003 page boundary and switched uses, AR-004 null reference wording, REC-005 refusal order with a test, REC-006 case-insensitive keys); FU-004 added.
- Classification: unchanged, `Large` / `High`.
- Next action: architecture re-review.

## Review Records

- 2026-10-17 — `ARCH-REV-001` Pass on SR-001 (Large/High), no blocking findings. Report: `design-review-report.md`; review record: `architecture-review-revision-record.md` (this folder). Non-blocking REC-001 to REC-004 are implementation guidance and wording; they do not change approved behavior. The reviewer handed the package to `/software_engineering_team/implementation_engineer`.
- Pending user decision (2026-10-17): option 2 (agents use keys now: tool results show keys, Task-ID inputs accept keys; optionally key-based Task URLs). If the user confirms, the change is recorded as SR-002, a scope extension on top of SR-001. SR-001 stays a valid subset, so implementation of SR-001 can continue.
- 2026-10-17 — `ARCH-REV-002` Fail on SR-002: AR-001–AR-004 (no redesign needed), REC-005 and REC-006. Resolved in SR-003.
- 2026-10-17 — `ARCH-REV-003` Pass on SR-001–SR-003 (Large / High): AR-001–AR-004 resolved, REC-005 and REC-006 accepted. Non-blocking REC-007: some SR-002 Extension lines predate SR-003; SR-003 governs, and the reviewed design is left as reviewed. Non-blocking REC-008: `depends_on` resolution failures surface as `TASK_DEPENDENCY_INVALID`, consistent with D-TOOL-IN. The reviewer handed the package to `/software_engineering_team/implementation_engineer`.
