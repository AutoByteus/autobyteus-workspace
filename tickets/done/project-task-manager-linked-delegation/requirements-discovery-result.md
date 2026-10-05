# Historical Requirements Discovery Results — Superseded By SR-008 Design

**Historical SR-001–006 discovery only; not the current outcome or approval authority. See canonical requirements-doc.md and solution-design-handoff.md for current status. Earlier discovery holds below are historical; any later approval/recovery hold is recorded in those canonical artifacts and solution-revision-record.md.**

## Historical Identity / Status (SR-006)
- Package: `project-task-manager-linked-delegation`; revision `SR-006`, Ready for Approval baseline `REQ-BL-006`.
- Outcome: **Ready for Approval — explicit requirements approval pending** (routine requirements conversation; not `Architecture Design Complete`, not an external `Blocked` handoff).
- Approval: Full package not approved. SD-CF-001 confirms automatic saved Task payload, exact assignment linkage and explicit DONE stopping goal; it does not approve other proposed policies. SD-CF-002 explicitly confirms recursively brought-in collaborator cleanup. Full policy approval/architecture/implementation remain pending.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`
- Branch: `codex/project-task-manager-linked-delegation`; refreshed base `origin/personal` at `806907faeb567d2b703e10fe984fcd01be0b41fd`; finalization target `origin/personal`. No release/deployment requested.

## Original Request / Goals
User has Project/Task tools but no agent that manages them. They want a Project Task Manager, potentially in the Project page or Chat; suggest existing @ first without special UI. The Manager should create/reuse a business Task, take its returned Task ID, and pass it to delegate_task when copying an Agent/collaborator/Team, including within an Org. Task descriptions/context attachments resemble delegate description/reference_files. The system should persist the connection between business Task and assigned run. When Manager marks Task done, the execution tree should support immediate cleanup of that task work's resources.

## Follow-Up SD-CF-001 (2026-10-03)
User confirms ID-based internal saved description/attachment retrieval and assigned run linkage; reiterates immediate resource stopping on Manager DONE and requests technical opinion. Additional current-code evidence E-013/014 shows recursive Team termination and provider resource cleanup already exist. A scoped Task completion capability is feasible; current code does not yet connect DONE to these primitives. Exact assigned execution root must not be confused with enclosing root; task-Agent follow-on copies may need delegator-lineage ownership rather than only structural Team traversal; close admission/prevent late wake to avoid revival. These are feasibility observations, not a completed target design. Preserve outputs/history/workspaces is still a proposed clarification, not approved destruction permission.

## Follow-Up SD-CF-002 (2026-10-03)
User explicitly wants assigned Agent/Team lifetime to include all collaborators brought in by workers/members and helpers recursively brought by those collaborators, not just the directly linked run. Requirements REQ-007/012 and SCN-008/009 now distinguish the lifecycle ownership cascade from physical Team containment. New evidence E-016/017: collaborators are admitted/hosted at enclosing Agent/Team/Org root, deduplicated by definition and reused run-wide; addedViaAgentRunId records only first admission. Therefore assigned TeamRun termination alone does not currently cover outer-root helper bring-ins, and tracing creator provenance alone can stop a helper now used by another Task. Recommend Task-scoped helper runtime instances with reusable definitions; this is a proposed product contract, not a completed architecture choice. Ask DEC-006 before selecting exclusive versus shared runtime lifecycle. No user request to delete durable outputs/history/workspaces.

## Follow-Up SD-CF-003 — AgentRun Correction
User correctly emphasizes separate delegate_task calls from same definition create different AgentRun/TeamRun resources. Re-read contract confirms it. Previous Researcher isolation question was overbroad: no new isolation decision is needed for delegated copies. Narrowed REQ-012/DEC-006/SCN-009/AC-012 apply only to the different normal send_message_to(address) admission/reuse path, which can reuse an enclosing-root collaborator runtime. Added SCN-010/AC-013 preserve existing independent delegated runtime identities. Resource cleanup is per actual run/Task ownership, not definitions. No global collaborator policy change or full requirements approval inferred.

## Follow-Up SD-CF-004 — Readiness And First-Slice Basis
User asks whether requirements are clear and work can proceed. Core intent is sufficiently clear; final proposed baseline REQ-BL-005 is now complete and Ready for Approval, not Approved. Existing fresh-copy delegation needs no added isolation policy. Previously unapproved one-assignment restriction and deletion blocking are removed as extra scope, not treated as user decisions. Remaining lifetime/data/entry boundaries are explicitly consolidated into proposed DEC-001–006 and observable ACs for one user approval. No target design/implementation started.

## Follow-Up SD-CF-005 — Task ID Alone
User asks whether unique task_id can replace project_id+task_id as the linked delegation input, while retaining old behavior when task_id is omitted. Feasible: current IDs are UUID-based and node-local Project records are readable; current store has no cross-Project uniqueness validation or Task-only public lookup, so never claim those already exist. Amended proposed baseline REQ-BL-006 uses task_id alone plus recipient and resolves exactly one owning Project internally on current node; invalid/missing/ambiguous lookup fails without fallback. Existing Project tools still require explicit Project ID. General “Yeah” plus a feasibility/input question is not recorded as exact new baseline approval; revised requirements remain Ready for Approval. No target design/source change made.

## Findings / Evidence
Strict current delegate_task has no task_id and rejects additional fields. It copies fresh Agent/Team work from required description and normalized absolute reference_files, returns ingress AgentRun ID, and persists execution tree before releasing work. Project Tasks have no assignment identity; DONE is metadata-only. Saved Task context exposes REST locators and optional local paths. Existing execution resource lifecycle already has **reversible quiet/idle shutdown**, not business completion. Shared records have run identity, containment and delegator identity; they are not a universal resource/worktree ownership ledger. Built-ins currently include Daily Assistant and Retrospective Skill Improver, not Project Manager. Evidence is local code/docs/image only; no new implementation or runtime validation was performed.

## Proposed Final Approval Basis — REQ-BL-006 / SR-006
1. Ship reusable Project Task Manager through existing @/Chat; no Project-page chat in this slice.
2. Manager discovers explicit Project, reuses/creates Task, delegates saved Task work, follows returned runtime ingress and explicitly sets status after evaluating outcomes. No scheduler/automatic acceptance.
3. Optional task_id alone selects saved Task payload; resolve unique owning Project internally on the current node. No task_id means the existing required-description/optional-reference_files input remains. No caller project_id is needed for delegation; existing Project management tools stay Project-scoped. Invalid/unknown/ambiguous Task IDs or mixed overrides fail without fallback. Successful dispatch binds exact actual AgentRun/TeamRun/root and keeps every successful fresh-copy association inspectable/durable.
4. DONE initiates full cascading runtime release including assigned Team members, new brought-in collaborators/helper Teams and recursive further work. All newly created helper runtimes for a Task inherit its lifetime without manual Manager registration. Different delegated copies are already distinct.
5. Protect Manager/enclosing root/other Task runtimes and borrowed **non-task-owned** outside runs. Newly created Task-owned helpers cannot serve independent Task lifetimes through a shared runtime; ordinary unlinked collaborator reuse stays. Technical placement/routing is future architecture.
6. Runtime-only cleanup preserves descriptions/context, outputs, history, execution records, workspace/git worktree files and definitions. Immediate trigger, asynchronous truthful actual shutdown/failure outcome; repeated DONE/retry is safe.
7. Do not invent a one-assignment restriction: existing fresh-copy semantics remain, and every linked execution is recorded rather than overwritten. A completed lifetime admits/wakes no new work. Explicit Task status reopen starts nothing; later delegation is fresh, older completed run lifetime stays closed.
8. Preserve existing Task/Project metadata/context deletion, with no new active-deletion block or hidden delete-as-stop. DONE-before-delete is the completion path; already-recorded execution/link history persists. Root Stop/idle lifecycle remains independent.
9. No new Project UI, live board synchronization, feature default changes, global collaboration redesign, scheduling, mobile support, attachment-mutation tools or destructive data/worktree cleanup.

All choices above are **proposed together for user approval**, including the SD-CF-005 task_id-only refinement. Full exact approval is not inferred from earlier general “Yeah” confirmations or feasibility questions. No missing behavioral option remains inside the proposed basis; user may revise it. Once explicit approval is captured, architecture investigation/design must verify persistence conventions, exact ownership/admission closure, root/provider boundaries and recovery without silently changing these outcomes.

## Canonical Absolute Paths
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/investigation-notes.md`
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-revision-record.md`
- This result: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-discovery-result.md`
- User image: `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_be52ac58c92a412e9f30b2260237c7cf/software_engineering_team_0482b832554e42e9a85bb93e730ae19b/solution_designer_4369c3e671e34a2dadd670c5b652afaa/context_files/ctx_70db542d8e99__image.png` (evidence, not target visual approval).
- Historical related sources: this workspace's `tickets/done/project-task-manager-foundations/requirements-doc.md`, `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md`. Historical package is not authorization for this new scope.
- Design/review/implementation/API-E2E/delivery artifacts: **N/A — not yet applicable**. Task size/architectural risk: N/A before completed design.

## Historical Expected Next Output (SR-006)
Explicit user approval (or requested revision) of Ready for Approval REQ-BL-006; capture exact approved basis before architecture. Only after that: proportionate design and completed-solution size/risk classification, then configured rule-based specialist handoff. Preserve the same package identity/artifact paths. Do not perform implementation/reviewer/delivery work or create a live Manager during discovery.

## Handoff Rule Evaluation — SR-001 Historical Lookup
Lookup completed 2026-10-03. Returned conditions: Product Design Requested → /product_team/product_prototyper; approved positioning/marketing execution → /marketing_team/marketing_content_creator; approved Architecture Design Complete Large/High → /software_engineering_team/architecture_reviewer; approved Architecture Design Complete Small/Medium + Low → /software_engineering_team/implementation_engineer; Delivery Receipt Evidence Gap → /software_engineering_team/delivery_engineer. **No rule matches** this Draft requirements clarification result. No send_message_to or delegation was invoked. Return the current findings and needed decisions directly to the user; architecture and implementation remain unstarted.

## Handoff Rule Evaluation — SR-002
Current get_handoff_rules lookup completed 2026-10-03 after persistence. Same five conditions/destinations as historical lookup; none matches SR-002 Draft clarification/evidence refinement. No Product/Marketing work, approved Architecture Design Complete or returned Delivery evidence gap exists. Return findings directly to user; no send_message_to/delegation and no implementation handoff.

## Handoff Rule Evaluation — SR-003
get_handoff_rules completed 2026-10-03 after persistence; same five conditions/destinations as previous lookups. No rule matches SR-003 Draft recursive-cascade clarification: no Product/Marketing request, approved completed architecture or delivery receipt gap. Return to user directly; no send_message_to, delegation or implementation handoff.

## Handoff Rule Evaluation — SR-004
get_handoff_rules completed 2026-10-03 after persistence. Same five conditions/destinations as historical lookups; none matches SR-004 Draft runtime-identity clarification. No Product/Marketing request, approved completed architecture or receipt-evidence gap. Return directly to user; no send_message_to/delegation or downstream handoff.

## Handoff Rule Evaluation — SR-005
get_handoff_rules completed 2026-10-03 after persistence. Same five conditions/destinations as previous lookups; none matches Ready for Approval REQ-BL-005. This is a routine user approval hold, not Product/Marketing work, approved Architecture Design Complete or a delivery evidence gap. Return approval basis directly to user. No send_message_to/delegation or implementation handoff.

## Handoff Rule Evaluation — SR-006
get_handoff_rules completed 2026-10-03 after persistence. Same five conditions/destinations as prior lookups; none matches Ready for Approval REQ-BL-006. This is a routine requirements approval hold, not Product/Marketing work, approved Architecture Design Complete or a delivery receipt evidence gap. Return the Task-ID-only contract and approval question directly to the user; no send_message_to, delegation or implementation handoff.
