# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Initial baseline: Task autobyteus-496 and the founder's decision comment | N/A | N/A | Requirements Approved; Design Ready | BEH-001–006, REQ-001–008, AC-001–010 | Architecture Design Complete; Medium / High; to architecture review |
| SR-002 | Evidence | User: re-base the worktree on the updated remote (2026-11-17) | N/A | Requirements Approved; Design Ready | Unchanged | None (evidence: IN-006, ASM-001) | Re-based onto `a781007713`; design unchanged |

## Revision Entries

### SR-001: platform-given `search_memory` scoped to the agent's own runs

- Phase and classification: `Initial Baseline`
- Trigger: Task autobyteus-496 (description and the 2026-11-16 founder's decision comment), from `/project_task_manager`
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Approved` (SR-001); design `Ready`
- IDs affected: BEH-001–006, UC-001–004, REQ-001–008, AC-001–010, SCN-001–006, DEC-001–009
- Scenario basis: SCN-003 is a Supported Explicit Edge Scenario under the founder's privacy rule. The rest are normal scenarios.
- Why recorded: first coherent baseline. The measurement PR-001 showed that a node-wide default would expose the founder's private journals, which led to own-definition scope (DEC-001) and scoped `wordsNotFound` (DEC-006).
- Sections: all sections of requirements-doc.md, investigation-notes.md and design-spec.md created
- Supplements: `follow-ups.md` (FU-001 urgent privacy, FU-002, FU-003)
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval: approved by the Solution Designer within the direction; user informed (conversation, 2026-11-16) and PM informed with FU-001 (`send_message_to` /project_task_manager, delivered 2026-11-16)
- Supplement approvals: N/A
- Design/review basis invalidated: N/A
- Classification: `task_size=Medium` (about 16 production files in existing owners), `architectural_risk=High` (privacy boundary; shared exposure and memory-search contracts; native kept-instance lifecycle)
- Handoff: `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer` (rule: Large or High); result file `handoff-architecture-review.md`
- Downstream impact: independent architecture review before implementation
- Remaining gaps: ASM-001 (verified by implementation tests); FU-001 awaits the founder
- Next action: architecture review

### SR-002: re-base onto the updated remote

- Phase and classification: `Refinement` (evidence only)
- Trigger: the user asked to base the worktree on the latest remote (2026-11-17)
- Triggering finding IDs: N/A
- Prior status: requirements `Approved` (SR-001); design `Ready`
- Current status: unchanged
- IDs affected: none in intended behavior. IN-006 and the design's run-kind wording changed: since autobyteus-461 (`c079a394a3`), a delegated run is an ordinary agent run and memory-search discovery reads no task-team source, so own scope covers agent runs (delegated or not), team members and Org members.
- Scenario-basis changes: none
- Why recorded: the ticket branch moved from base `1e8b6e5d0a` to `a781007713` (551 commits; the rebase was clean). Of the design-cited files, only `memory-run-discovery.ts` and `memory_search.md` changed. The callers of the exposure rule are unchanged.
- Sections changed: investigation-notes Meta, Source Log and IN-006; design-spec revision line, Evidence row, Several-kinds trigger, Terminology, Guidance tests; handoff base
- Supplements: none
- Intended behavior changed: `No`
- Approval impact: none; SR-001 approval still applies (evidence-only)
- Design/review basis invalidated: no. The architecture reviewer is told about the new base and the changed run kinds.
- Classification: unchanged (`Medium` / `High`)
- Handoff: informational message to `/software_engineering_team/architecture_reviewer` (review continues on the new base)
- Remaining gaps: ASM-001 as before
- Next action: architecture review
