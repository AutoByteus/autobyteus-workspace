# SR-005 — Practical two-tool Task interface

## Identity and state
PROJ-TASK-MANAGER-20261002-001 / project-task-manager-foundations, 2026-10-02. Outcome **Draft — Requirements Clarification Hold**, not Approved/Architecture Design Complete. Source/workspace unchanged: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`, branch codex/project-task-manager-foundations, refreshed origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061, finalization target origin/personal. Prior docs checkpoint a5f843ada1aa2d4762a74ae517bbfa4c09044ce6; no production edits/push/integration/runtime changes.

## Original goal and latest clarification
Provide reusable first-party Project Task tools and previously approved small Projects/Tasks UI under default-off experiment. User authors the Manager/team in the agents repository; current list_available_agents/delegate_task/send_message_to already supply collaboration. Sidebar redesign, scheduler/run association and new resource stopping remain excluded/deferred.

SD-CF-005: user wants practical **list + update**, questions need for find, expects ordinary small-volume task counts, and describes external LLM reasoning about TODO work/order/granularity/splitting/parallel independent delegation. Manager can call update/status after delegating, then Done later. User still describes task creation, but how creation fits exactly two tools was not stated.

## Proposed two-tool behavior and approval boundary
1. **list_project_tasks** (provisional name): caller supplies Project ID, optional TODO/IN_PROGRESS/DONE filter. Return complete current tasks with IDs/full description/status/saved context; no filter means all, empty match means empty list. No separate find/get/search/new Project catalog, silent truncation or paging subsystem. Current existing UI/API Project identification is retained; no new Manager entry needed.
2. **update_project_task** (provisional name): proposed no Task ID→create a required-description TODO Task and return generated ID; existing Task ID→patch description/status, preserving omitted fields/context/identity. Supplied unknown ID must fail, not silently create. Invalid/empty patch fails without changing other tasks. No replacement of the whole task list.

Creation branch is **a recommendation awaiting DEC-015 confirmation**, not approved intent. If update means existing-record edits only, a separate create tool would be necessary (three tools). We must neither remove creation nor invent an unapproved upsert. Precise names/schema/module/owner choices follow approval in architecture.

Typical **external** Manager workflow: list TODO → reason about priorities/dependencies/granularity → existing delegate_task to any eligible Agent/Team → only on successful child run-ID result explicitly update Task IN_PROGRESS → later decide completion and write DONE. Listing/updating tools do not call delegation or infer state automatically. Null/rejected delegation is not successful started work. No task/run association, automatic dependency enforcement or cleanup is introduced; external Manager is not delivered/configured by this ticket.

Read/list and update APIs preserve current node/Project scoping, identity/required description/durability and equivalent opt-in native/MCP behavior. Existing three-status reset/reopen semantics remain proposed, not newly approved by this wording. Task-count remark is ordinary-volume context, not enforced 1,000-task cap or performance certification.

## Canonical package and retained authorities
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirements-doc.md`: SR-005 Draft, REQ-015/AC-020/021/SCN-010/DEC-015 appended; original IDs/dispositions retained.
- Same directory `investigation-notes.md`: E-001–027, exact latest user evidence and current **full absolute supplement inventory**.
- Same directory `solution-revision-record.md`: SR-001–004 unchanged, SR-005 appended. Historical handoffs and requirements-refinement-sr-003.md/sr-004.md retain as-of scope/receipt/proposals.
- Approved manual UI remains `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and all ticket-scoped VIS-001–020 in visual-references, exact filenames in spec. UF-017 approval in ui-brainstorm-record.md; PFI/receipt/history/validation/runbook/DATA-001 and full external artifact paths retained by inventory. Exact approved UI 84ed47bac6877e2cdc6350cca789b0c30ffb55a3, final receipt f66efa9c5c1d9976137f6c134120529466b34e48, accepted base df2f5cdaf9b168298dcae79ac47c11f31dd82d7c, canonical root /Users/normy/autobyteus_org/autobyteus-web-prototype. No Product artifact modifications/competing spec/new handoff.
- Accepted source e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71 and `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md` remain distinct from investigated e04cfef. No newer parity claim.
- Prior bounded native/MCP/flag/real voice/files/workspace proposals, default-off installation/no stop/no Manager package remain. Complete baseline approval absent. design-spec/review/implementation/test/delivery: **N/A — phases not reached**.

## Evidence, risks and next action
Existing pinned Task service lists full scoped tasks and has distinct create/description-update methods, no status write or agent Task tools (E-004/024). Therefore combined create/patch is proposed new tool behavior, not a claim existing code already implements it. Wrong-ID silent creation and full-list replacement risk accidental duplication/lost parallel writes; explicit identity branching avoids those proposed outcomes. Manager LLM workflow is not a backend guarantee or delivered Manager package.

No production tests or model/delegation/UI runtime/feature changes performed. External Product validation remains synthetic: no task durability/native/MCP/real mic/files/concurrent worker certification; held DATA coupling/source-pin and Task context/voice target technical gaps preserved. Do not substitute sample transcript/object URLs or fabricate runtime identity for durable Task context.

Next: ask user **“Should update also create a task when no task ID is supplied?”** Then finalize the two-tool contract and request explicit full refined requirements/supplement approval before architecture. No need to re-ask sidebar/cleanup/Manager ownership.

Documentation integrity checks pass: stable IDs, table structure, prior SR-001–004/history preservation, external approved spec/all 20 reference locators, and git diff --check. These are documentation checks, not product tests.

## Handoff rules
get_handoff_rules called after full result persistence on 2026-10-02. **No matching rule**: routine creation-semantics clarification; no new Product request/correction, marketing, completed/classified architecture or production delivery receipt gap. Return to user for DEC-015. No send_message_to/delegation required or performed.
