# Design Review Report — task-keys-and-dependencies

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/requirements-doc.md` (Approved, SR-003)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/solution-revision-record.md` (SR-003)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-spec.md` (Ready, SR-003). "SR-003 Corrections" is authoritative where it refines "SR-002 Extension", which in turn refines the SR-001 body.
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` and VIS-001–015 (unchanged); design repo `personal@1ebf4c6` reference components (unchanged)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: SR-003 re-review request from `/software_engineering_team/solution_designer` (2026-10-17), resolving ARCH-REV-002 AR-001–AR-004 and accepting REC-005 and REC-006.
- Prior Review Round Reviewed: `ARCH-REV-002` (Fail on SR-002)
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: the code evidence of ARCH-REV-001 and ARCH-REV-002 still holds; the base `c600028072` is unchanged for the reviewed paths. SR-003 changes only design and requirement text, which I checked against that same evidence:
  - `project-task-context.ts:7` and `project-task-service.ts:255,477-482` (paths and locators);
  - `uniqueTask` / `findTask` and CM-6 (Project-only saved-ID delegation);
  - `ProjectTaskDetail.vue:47-61`, `ProjectTaskEditor.vue`, the `pages/projects/[id]/tasks/[taskId]` pages and `useProjectTaskPage.ts` (route parameter flow);
  - `task-execution-resources.ts:146-186` and `project-task-service.ts:387-393` (refusal texts, deleted current Task);
  - `root-task-execution-lifecycle.ts:160-212` (refusal order).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: SR-001 brings the startup migration, GraphQL and strict feed contract, and allocation and loop concurrency. SR-002 adds the changed agent tool contract, the Task-execution port shape, the retired-prefix file and key routes. SR-003 does not change the classification.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: as in ARCH-REV-002, plus the SR-003 clarifications:
  - REQ-018 / DEC-011: "no long ID" covers Task-ID fields and agent-facing texts. Saved-context `storedFilename`, `locator` and `localPath`, and delegated reference-file paths, keep their stored form.
  - DEC-013: a Task that no longer exists is named "a deleted Task".
  - REQ-019 / DEC-012: `delegate_task` stays Project-only (CM-6); a Temp-task ID or unknown reference → `TASK_NOT_FOUND`. `update_task` also accepts a Temp-task ID, as today. Key matching ignores case.
  - AC-020, AC-022 and AC-023 are revised to match.
  - Approval: the Solution Designer approved these within the user's SR-002 direction ("the long ID stays the stored identity") and informed the user. They keep preserved behavior and add none. ARCH-REV-002 required user approval only for the opposite readings, and neither was chosen.
- Relevant existing behavior and evidence confirmed: yes (see Meta).
- Scope guardrail confirmed: `Yes` (UC-001–008; out of scope includes changing the stored Task identity, key lookup in GraphQL, readable Project IDs; FU-002–004 recorded).
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain)
- Remaining material ambiguity: none

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001–009 | (SR-001) | Pass | Pass | Pass | Confirmed | — |
| BEH-003 (REQ-003 revised) | User | Pass | Pass | Pass (D-RETIRED) | Confirmed | — |
| BEH-010 | Contract | Pass (DEC-011–013) | Pass | Pass (resolver split; canonical IDs inward; "a deleted Task") | Confirmed | — |
| BEH-011 | User | Pass | Pass | Pass (`useProjectTaskPage` single resolver; switched uses listed) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` + VIS-001–015 | Pass | Pass | Pass | Pass (URLs and agent tools are not spec surfaces) | Pass | — |
| Design repo reference components | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; existing owners extended | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found` | — |
| Refactor decision is explicit | Pass | `No` | — |
| Refactor decision is supported by the design sections | Pass | Resolution stays in `ProjectTaskService` (server) and `useProjectTaskPage` (web) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001–008 | (SR-001) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 tool reference in | Primary | Pass | Pass (`resolveProjectTaskReference` for delegation and `depends_on`; `resolveTaskReference` for `update_task`) | Pass | Pass | Pass | Pass | Pass |
| DS-010 tool dependencies | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 key URL | Primary | Pass | Pass (page → `useProjectTaskPage` → canonical `task.taskId` → children and clients) | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-001 boundaries | Pass | Pass | Pass | Pass | ARCH-REV-001 |
| `ProjectTaskService` reference resolution (two entry points by subject) | Pass | Pass | Pass | Pass | Lifecycle, manifest and parsers never parse keys |
| Port `resolveAssignment` | Pass | Pass | Pass | Pass | Project-only; canonical `taskId` inward |
| Web `useProjectTaskPage` (reference → `taskId`) | Pass | Pass | Pass | Pass | Prop renamed `taskReference`; the context client is built from the resolved ID |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-001 rules | Pass | Pass | Pass | Pass | — |
| SR-002 / SR-003 additions | Pass | Pass | Pass | Pass | No key as identity after resolution, on server or web |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| SR-001 interfaces | Pass | Pass | Pass | Low | Pass |
| `resolveProjectTaskReference(reference)` | Pass | Pass | Pass (long Project Task ID or key, case-insensitive) | Low | Pass |
| `resolveTaskReference(reference)` (`update_task` only) | Pass | Pass | Pass (Temp-task ID, else the above) | Low | Pass |
| `resolveAssignment(reference) → {taskId, taskReference, …}` | Pass | Pass | Pass (Project Tasks only) | Low | Pass |
| Tool results `taskId` = key, `dependsOn` = keys; stored paths unchanged | Pass | Pass | Pass (DEC-011) | Low | Pass |
| Refusal builders take `string \| null` references | Pass | Pass | Pass (null → "a deleted Task") | Low | Pass |
| Web `useProjectTaskPage(projectId, taskReference)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-001 needs | Pass | Pass | Pass | Pass | — |
| Reference resolution | Pass | Pass | Pass | Pass | — |
| Retired prefixes | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `projects`, migrations, GraphQL | Pass | Pass | Pass | Pass | — |
| server agent tools + collaboration Task execution | Pass | Pass | Pass | Pass | — |
| web Projects + workspace history | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-001 structures | Pass | Pass | Pass | Pass | — |
| `referenceOf(location)`, `taskPagePath` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 structures | Pass | Pass | Pass | N/A | Pass | — |
| Tool result `taskId` (key) | Pass | Pass (DEC-010) | Pass | N/A | Pass | — |
| `retired-task-key-prefixes.json {prefixes}` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-001 and SR-002 server files | Pass | Pass | N/A | Pass | — |
| Web Task page entry, `ProjectTaskDetail.vue`, `ProjectTaskEditor.vue`, `ProjectTaskDraftEditor.vue` | Pass | Pass | N/A | Pass | AR-003 resolved: switched uses listed |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All placements | Pass | Pass | Low | Pass | Route folder stays `[taskId]`; the parameter is a reference |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Long ID in agent-facing Task-ID fields and texts | Pass | Pass | Pass (DEC-011 boundary) | Pass | — |
| FU-001 | Pass (absorbed) | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Long-ID inputs and URLs | No (approved behavior; one resolver to one stored identity) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Keys | Migration Required | Pass | Pass | Pass | Pass | ARCH-REV-001 |
| `dependsOnTaskIds` | Directly Usable | Pass | Pass | N/A | Pass | — |
| `retired-task-key-prefixes.json` | New file, no migration | Pass | Pass | N/A | Pass | ARCH-REV-002 |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| SR-001 steps, then SR-002 steps with SR-003 refinements; SR-001 implementation continues in the worktree | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-001 and SR-002 topics | Yes | Pass | Pass | Pass | — |
| Refusal order, deleted-Task wording | Yes | Pass | N/A | Pass | — |

## Material Premise Validation

- `MP-001` (Not Reachable), `MP-002` (Unsupported and harmless) and `MP-004` (Not Reachable) are unchanged; none needs machinery.
- `MP-003` (Reachable: a copy's current Task deleted while the copy is open) now has a defined response: `referenceOf` → null → "a deleted Task" (DEC-013).
- The pre-existing advice in that refusal to close a deleted Task is recorded as FU-004. It is outside scope and not a finding here.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None blocking.

Non-blocking recommendations (implementation guidance; no behavior change):
- REC-001–REC-004 (ARCH-REV-001) still apply.
- `REC-007`: some SR-002 Extension lines still read as before SR-003. SR-003 says it overrides them, so this is cosmetic, but implementation should follow SR-003. The lines:
  - D-REF "one resolver" and the Temp-task `taskReference` line;
  - D-TOOL-OUT "No long Task ID appears in results";
  - D-TEXT "the key from the read Task, or the ad-hoc ID";
  - D-URL `taskKey === ref`.
- `REC-008`: in `depends_on`, a reference that `resolveProjectTaskReference` can't resolve (unknown, Temp task) must surface as `TASK_DEPENDENCY_INVALID` with nothing written (D-TOOL-IN, AC-024), not as the resolver's `TASK_NOT_FOUND`. A test should pin this.

## Classification

N/A (Pass).

## Recommended Recipient

Per handoff rules: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- SR-001: server and web versions shipped separately (out of scope); codegen needs a running server; one catalog lock serializes Task creates.
- SR-002: agents with old memory send long IDs (accepted); tool-description wording affects agent behavior (keep changes minimal).
- FU-004: a pre-existing refusal advises an impossible step for a deleted current Task.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: AR-001–AR-004 resolved and verified against the canonical artifacts and code evidence. REC-005 and REC-006 accepted. REC-007 and REC-008 are non-blocking.
