# SR-006 — Project discovery and two Task tools

## Identity and state
PROJ-TASK-MANAGER-20261002-001 / project-task-manager-foundations, 2026-10-02. Outcome **Draft — Requirements Clarification Hold**. The three-capability scope is explicitly agreed; the exact Task creation branch and complete refined baseline are not approved. No architecture or production-engineering authorization.

Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`, branch `codex/project-task-manager-foundations`; refreshed base `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`, finalization target `origin/personal`. Prior documentation checkpoint `d7571a021b805011bbae1ad59bf210391aeea72b`. No source changes, integration, remote push, feature toggle or runtime actions.

## Goal and latest user direction
Continue the default-off experimental Projects/Tasks foundation by supplying reusable agent tools and the previously approved small manual Projects/Tasks UI changes. User creates the Project Task Manager or Team separately in the agents repository. Existing `list_available_agents`, `delegate_task` and `send_message_to` remain collaboration foundations, not new deliverables.

SD-CF-006 asks how the agent knows which Project. SD-CF-007 explicitly agrees “List projects”, Project ID/name/description, and “a list projects and two for tasks”. This confirms **three new capabilities overall**, not three Task tools. It does not explicitly answer how creation fits into the two Task tools.

## Agreed surface and remaining proposal
Names below remain provisional until technical design:
1. **list_projects**: read-only current-node Project catalog with ID, name and description. The caller selects a Project and uses its exact ID; no implicit first/default Project selection, Project mutation or cross-node catalog.
2. **list_project_tasks**: scoped by Project ID, complete Task IDs/descriptions/status and saved context references; optional exact TODO/IN_PROGRESS/DONE filter. No separate Task find/get/search tool, silent truncation, new paging subsystem or enforced 1,000-Task cap. Empty matches return an empty list; unknown Project and invalid status are errors.
3. **update_project_task**: description/status edits to one scoped Task, preserving omitted fields and other Tasks. To retain creation with exactly two Task tools, **propose** omitted Task ID creates a required-description TODO Task and returns its generated ID. A supplied known ID edits that Task; a supplied unknown ID fails, never silently creates. This missing-ID creation branch is pending DEC-015 confirmation, not approved intent. No whole-list replacement.

External Manager journey: list Projects → choose exact Project ID → list TODO Tasks → LLM reasons about priorities/granularity/independence → existing `delegate_task` → explicit status update to IN_PROGRESS after a successful child-run result → later explicit DONE after its completion decision. These tools do not launch execution, judge completion, enforce dependencies, associate runs or stop resources. If target choice is ambiguous, the caller asks rather than guesses. If no Project exists, existing manual Project authoring remains available; no create-Project tool is added.

## Retained scope and approval boundaries
Experimental installation remains default-off and untouched. Previous approved manual UI is retained; the briefly requested new workspace/run-history brainstorm and new safe resource stopping are explicitly deferred. No Manager/Team package, launch/navigation UI, scheduler, dependency fields, task/run attempt history or automatic Done cleanup is included.

Previously documented native/Agent Tools MCP opt-in parity, unchanged visibility-only flag semantics, explicit three-state updates/reset/reopen, optional local desktop voice, normalized workspace registration and durable Task-scoped context are proposed bounded contracts awaiting full baseline approval. Actual voice permissions, Task ownership/storage and deletion-count correctness cannot be inferred from synthetic Product validation. Done retains context and has no new stop/delete effect; no execution-cancellation promise is added.

## Canonical artifacts and external authority
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirements-doc.md`: SR-006 Draft; REQ-016, AC-022 and SCN-011 add Project discovery; existing IDs and DEC-015 retained.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/investigation-notes.md`: E-001–028, user chronology and full absolute inventory of all still-relevant historical and external supplements.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/solution-revision-record.md`: SR-001–005 preserved, SR-006 appended. Historical Product handoffs and requirements-refinement-sr-003/004/005 remain as-of records, not current scope.
- Approved Product supplement `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md`, ticket-scoped VIS-001–020 in its visual-references directory, UF-017 in ui-brainstorm-record.md and PFI-001–007 in handoff-notes.md. Full receipt/history/validation/runbook/DATA-001 inventory remains in investigation-notes.md. Product owns these artifacts; no competing visual specification or new Product handoff.
- Approved runnable UI `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`, final integrated receipt `f66efa9c5c1d9976137f6c134120529466b34e48`, accepted prototype base `df2f5cdaf9b168298dcae79ac47c11f31dd82d7c`; canonical root `/Users/normy/autobyteus_org/autobyteus-web-prototype`. Accepted source pin `e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71` and root prototype-bootstrap-report.md remain distinct from investigated `e04cfef`; no newer parity certification.
- design-spec, independent engineering reviews, implementation/test/delivery artifacts: **N/A — phases not reached**.

## Evidence, uncertainty and next action
E-028 checks existing node-local ProjectService list/get and GraphQL projects query. Selected agent-tools inspection has no matching new tool names; E-007 has no automatic Project session binding. These are current-source facts, not new tools already implemented. Existing separate Task create/update service methods do not prove the proposed combined branch.

No production tests, real mic/files, delegation/concurrent workers or live UI verification performed in this round. Product results are session-only synthetic and do not certify persistence/API/MCP/real voice/files/phone delivery. Source-pin and held DATA-001 coupling limitations remain explicit. Only owned requirements/evidence/history/result documents changed.

Next: ask whether **update should also create when no Task ID is supplied**, then finalize the three-tool and retained manual-UI contract and obtain explicit complete requirements approval before architecture. Do not re-ask the now-agreed Project catalog or send the superseded sidebar request.

## Documentation verification and routing
Documentation checks pass: ordered stable BEH/UC/REQ/AC/SCN/DEC IDs, Markdown table consistency, unchanged SR-001–005 and historical results, retained external Product artifacts/all 20 screenshot locators, and git diff --check. These are documentation checks, not product tests.

get_handoff_rules called after full result persistence on 2026-10-02. **No matching rule**: this is a routine creation-contract clarification hold; no current Product request/correction, marketing work, completed architecture or delivery receipt gap. Return to user for DEC-015. No send_message_to or delegation required or performed. This is not a forward-ready package.
