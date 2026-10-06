# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after user rounds 1–5 | N/A | N/A | Ready for Approval | BEH-001..009, REQ-001..012, AC-001..014, SCN-001..007 | Superseded by SR-002 before approval |
| SR-002 | Requirements | User round 6: remove `project_id` from update mode | N/A | Ready for Approval | Ready for Approval | BEH-004, REQ-005, AC-004 | Superseded by SR-003 before approval |
| SR-003 | Requirements | User round 8: Project-less Tasks store text only | N/A | Ready for Approval | Ready for Approval | REQ-013, AC-015 | Approved 2026-10-06 |
| SR-004 | Design | Architecture design on approved SR-003 | N/A | Requirements Approved; design N/A | Design Ready (Large / High) | REQ-001..013 | design-spec.md created; reviewed ARCH-REV-001 Fail (AR-001) |
| SR-005 | Design | ARCH-REV-001 round 1 (Fail — Design Impact) | AR-001, R-1, R-2 | Design Ready (reviewed Fail) | Design Ready (Large / High) | BEH-003, BEH-008, REQ-002, REQ-004, REQ-009, AC-014 | Linked mode restored to today's contract; ad-hoc single-host-root invariant stated; note wording conditional; standalone `@` entry named; ARCH-REV-002 Pass (2026-10-06), package forwarded to /implementation_engineer by the reviewer |

## Revision Entries

### SR-001 — `@` delegates; Project-less Tasks make delegated copies closable

- Phase and classification: Requirements, Initial Baseline
- Triggering user feedback: rounds 1–5 on 2026-10-06 (temp Project deferred; `@` → `delegate_task`; return `task_id`;
  `create_or_update_task` without `project_id`; Tasks may have no Project; no Dismiss button — the user asks the agent instead)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements Ready for Approval; design not started
- IDs affected: all listed in the index
- Scenario-basis changes: N/A (first baseline)
- Why recorded: first complete baseline for approval
- Canonical sections changed: requirements-doc.md (all); investigation-notes.md rounds 1–4
- Supplemental artifacts: None
- Product design evidence: N/A — not applicable
- Intended behavior changed: Yes (new baseline)
- Approval impact: awaiting explicit user approval of SR-001
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Downstream impact: N/A
- Remaining gaps: storage location for Project-less Tasks and its relation to the Projects migration gate (design)
- Next action: obtain user approval, then architecture design

### SR-002 — `create_or_update_task` update mode takes `task_id` only

- Phase and classification: Requirements, Refinement
- Triggering user feedback: round 6, 2026-10-06: "if create or update task works with just the task ID, then we don't need the project ID, just remove it."
- Triggering finding IDs: N/A
- Prior status: SR-001 Ready for Approval (not approved)
- Current status: Ready for Approval
- IDs affected: BEH-004, REQ-005, AC-004, External Contracts row
- Scenario-basis changes: none
- Why recorded: intended contract changed from "project_id optional and must match" to "project_id not accepted in update mode"
- Canonical sections changed: requirements-doc.md Document Status, BEH-004, REQ-005, AC-004, External Contracts
- Supplemental artifacts: None
- Intended behavior changed: Yes
- Approval impact: SR-001 superseded before approval; SR-002 awaits explicit approval
- Interpretation recorded: create mode keeps `project_id` (a newly created Task still needs a Project; Project-less Tasks are created only by `delegate_task`)
- Affected design/review basis: N/A (design not started)
- Applied handoff-rule outcome: N/A (approval hold)
- Remaining gaps: storage location for Project-less Tasks (design)
- Next action: obtain explicit approval of SR-002, then architecture design

### SR-003 — Project-less Tasks store text only

- Phase and classification: Requirements, Refinement
- Triggering user feedback: round 8, 2026-10-06: the Task should never store the physical file; ad-hoc Tasks must not copy files.
- Prior status: SR-002 Ready for Approval (not approved); current: Ready for Approval
- IDs affected: REQ-013, AC-015 (new)
- Evidence: Project Tasks today do keep copies of files uploaded in the Task editor (`projects/<p>/tasks/<t>/context/`, projects.md §Task Context Bytes); this is unchanged and out of scope.
- Intended behavior changed: Yes (new constraint)
- Approval impact: SR-002 superseded before approval; SR-003 approved by the user 2026-10-06 ("Now I go ahead with the designing.")
- Affected design/review basis: N/A (design not started)
- Next action: obtain explicit approval of SR-003, then architecture design

### SR-004 — Architecture design

- Phase and classification: Design, Initial Baseline (design)
- Trigger: user approval of SR-003 and instruction to design (2026-10-06)
- Prior status: requirements Approved (SR-003); design not started
- Current status: design-spec.md `Ready`
- IDs affected: REQ-001..013, AC-001..015 mapped to DS-001..DS-006
- Canonical sections changed: design-spec.md (new); investigation-notes.md Round 11 (E-28..E-36)
- Intended behavior changed: No
- Design interpretations recorded (within approved intent): ineligible `@` keeps `COLLABORATOR_ADD_FAILED`; runnability check moves to `delegate_task`; mid-dispatch failure keeps today's recorded-failure semantics (ad-hoc Task remains with a failed assignment, no `task_id` returned); linked mode also returns its `task_id`; ad-hoc ID prefix `ad_hoc_task_`.
- Post-design classification: task_size `Large`, architectural_risk `High`
- Applied handoff-rule outcome: see handoff-architecture-design-complete.md
- Remaining gaps: coordinated update of the agent-repository Project Task Manager skill (separate repo) for the update-mode contract
- Next action: route per handoff rules

### SR-005 — Design revision for ARCH-REV-001

- Phase and classification: Design, Design Impact
- Trigger: architecture review ARCH-REV-001 round 1, `Fail — Design Impact` (design-review-report.md)
- Finding IDs: AR-001 (blocking), R-1, R-2 (non-blocking, adopted)
- Prior status: design Ready (SR-004), reviewed Fail
- Current status: design Ready
- IDs affected: BEH-003, BEH-008, REQ-002, REQ-004, REQ-009, AC-014
- Changes in design-spec.md: DS-001 spine/narrative names the standalone `AgentRunCommandCoordinator.post → postUserMessage → postToHost` entry (R-2); DS-002 linked mode unchanged — `resolveAssignment` stays Project-only (ad-hoc ID → `TASK_NOT_FOUND`), `task_id` returned only when the link created an ad-hoc Task (AR-001); DS-006 states the invariant "every entry of an ad-hoc Task has the delegator's host root" (AR-001/MP-001); ownership map, interface mapping, file mapping and LLM contract wording aligned; `@` note guidance made conditional on a returned `task_id` (R-1).
- SR-004 interpretation withdrawn: "linked mode also returns its `task_id`".
- Intended behavior changed: No (removes two unapproved additions; approved SR-003 unchanged)
- Approval impact: none; SR-003 approval still applies
- Post-design classification: unchanged — `Large` / `High`
- Applied handoff-rule outcome: see handoff-architecture-design-complete.md (revision SR-005)
- Pending user decision (not part of this revision): whether agent-initiated collaborator bring-in should also stop creating collaborators; if approved later, it becomes a requirements revision.
- Next action: architecture re-review of AR-001 (+ R-1/R-2)

- Review outcome (informational, recorded 2026-10-06): ARCH-REV-002 `Pass` on SR-005 (AR-001 resolved; R-1, R-2 adopted). Report: design-review-report.md. The reviewer delivered the cumulative package to `/implementation_engineer`; no duplicate forwarding by Solution Designer.

- User decision (2026-10-06, after SR-005): keep the shared collaboration prompt and the `send_message_to` / `list_available_agents` descriptions neutral; agent-initiated collaborator bring-in stays as today. The steering happens through the user's message (the `@` note). Pending question closed; no requirements change.
