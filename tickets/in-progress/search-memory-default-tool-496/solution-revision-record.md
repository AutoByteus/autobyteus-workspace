# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Initial baseline: Task autobyteus-496 and the founder's decision comment | N/A | N/A | Requirements Approved; Design Ready | BEH-001–006, REQ-001–008, AC-001–010 | Architecture Design Complete; Medium / High; to architecture review |
| SR-002 | Evidence | User: re-base the worktree on the updated remote (2026-11-17) | N/A | Requirements Approved; Design Ready | Unchanged | None (evidence: IN-006, ASM-001) | Re-based onto `a781007713`; design unchanged |
| SR-003 | Design | Architecture review ARCH-REV-001: Fail (Design Impact) | AR-001, AR-002 (blocking); AR-003, AR-004 (adopted) | Design Ready (Failed review) | Design Ready | REQ-003, REQ-005, REQ-006; AC-003 (clarified), AC-006, AC-007 | Readers, session copy and coverage decided; back to architecture review |

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

### SR-003: architecture review ARCH-REV-001 findings resolved

- Phase and classification: `Design Impact`
- Trigger: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` ARCH-REV-001 (round 1, Fail)
- Triggering finding IDs: AR-001 (Medium), AR-002 (Low); recommendations AR-003, AR-004
- Prior status: requirements `Approved`; design `Ready`, review Fail
- Current status: requirements `Approved` (SR-001 basis); design `Ready` for re-review
- IDs affected: REQ-005/AC-006, REQ-006/AC-007 (the switch's readers), REQ-002/AC-001 (MCP session copy), REQ-003/AC-003 (coverage)
- Scenario-basis changes: none
- Resolution, each verified in the code at `aed5a0502f`:
  - AR-001: the definition readers `agent-definition-node-reader.ts:59-60` and `application-owned-agent-source.ts:96-97` pass `memorySearchEnabled`. `cloneRuntimeExposure` (`agent-tool-mcp-session-registry.ts:126-138`) copies `memorySearchScope` as a frozen copy. `memorySearchScope` is a required field. Saving keeps the key, verified through `cloneAgent` in `agent-definition-edits.ts`. A node-reader + save test was added to the guidance.
  - AR-002: under `agentDefinition` scope, `coverage` drops the node-wide counts ("Indexing in progress.", "The meaning index is being built."). Node scope is unchanged. Per-scope counts were rejected: the pipeline has no per-run step progress, so they would need new state for a transient message.
  - AR-003: the native holder is written before `replaceTools`.
  - AR-004: `buildRuntimeAgentToolExposure` takes the scope as a parameter. `memorySearchScopeOf` is the only scope rule; the placeholders pass `null`; names with `search_memory` and a `null` scope throw.
- Sections changed: design-spec revision line, Change Scope derived consumers, size rationale, DS-002 and DS-004 narratives, Interface mapping (exposure field, builder), Final File mapping (+4 rows), Concrete Examples (native narrowing), sequence step 6 (docs), Guidance tests. requirements-doc AC-003 gains the coverage outcome. follow-ups FU-001 addendum (picker widening; shared definition), from the review's residual risks.
- Intended behavior changed: `No`. The AC-003 sentence states what REQ-003 already requires ("everything a scoped search reports is derived only from the covered runs").
- Approval impact: none; the SR-001 approval applies
- Design/review basis invalidated: ARCH-REV-001 rows for AR-001, AR-002 and DS-002/DS-004, to be rechecked
- Classification: unchanged, `Medium` / `High`
- Handoff: `Architecture Design Complete` (revised) → `/software_engineering_team/architecture_reviewer` (rule: Large or High)
- Remaining gaps: ASM-001 (tests); FU-001 addendum to be sent with the result
- Next action: architecture re-review
