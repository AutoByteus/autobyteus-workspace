# Product Design Requested — SR-002 continuation after UF-001

## Identity / Result / Authority
- Package `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`; current solution revision `SR-002`.
- Result: **Product Design Requested**. Purpose: **New Request — continuation of existing user-requested brainstorming on the revised draft**, not Result Correction or a completed prototype.
- Requirements remain **Draft**. User's constrained non-overlay direction UF-001 is recorded; final layout, full requirements and final UI/UX approval are not received.
- Sender: Solution Designer. Architecture, implementation, independent review and delivery artifacts: **N/A — pre-approval phase**. Completed-design task size/risk: **N/A — not yet classifiable**.
- Original request: user message 2026-10-02 requesting analysis of experimental Project Task Manager foundations then direct Product UI brainstorming. Initial full analysis/request handoff preserved at `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/product-design-handoff.md` (SR-001).

## Original Goals And Preserved Context
Continue experimental Projects/Tasks while keeping ENABLE_PROJECTS default-off and not toggling the user's installation. A reusable Project Task Manager should read/create/progress durable Tasks, discover capable installed Agents/Teams and delegate independently executable work in parallel, respecting prerequisites. A project management Team remains tentative. Durable Project Task identity is distinct from a delegated execution or a reusable Team definition.

Existing foundations: node-scoped Project/task CRUD, three modeled business states, registered workspace links, opt-in list_available_agents and fresh delegate_task. Missing foundations: Project Task status tools, durable task/execution association, agreed dependencies/Done semantics and agent-write UI freshness. General delegation success/idle/shutdown is not accepted Done; Software Engineering Team keeps its own approval/review/validation/user-verification gates.

Existing experience: Projects grid → full-width Project page with Tasks/Workspaces tabs, three-column board and description dialog; separate execution trees/conversations. Keep the experience simple rather than squeezing a permanent split pane. Current flag is UI visibility, not backend CRUD disablement; policy for new tool availability is still DEC-001 open.

## Incoming Requirement Impact And Evidence
- Incoming sender Product Prototyper, AgentRun `product_prototyper_3395cb44d81e4df5a6460dec32215585`, report **Requirement Impact UF-001** for SR-001.
- Full returned report: `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirement-impact.md`.
- Exact user feedback/alternatives: `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/ui-brainstorm-record.md`; evidence revision `c289b74b833cba02744dd926e992892bc6fd6407`.
- Provenance/runtime record: `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/prototype-ticket.md`.
- User says “Then do not use overlay?” after viewing primary New/Edit Project modals, motivated by possible future phone use. The full quote remains Product-owned in the brainstorm record.
- User screenshots `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/review-evidence/user-edit-project-overlay.png` and `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/review-evidence/user-new-project-overlay.png` were viewed read-only by Solution Designer; each shows a centered Project name/description form over dimmed background content. They are feedback evidence for the existing treatment, not normative future references.

## Canonical Draft Delta — Now Recorded
- **REQ-007:** primary **New project and Edit project** forms must avoid overlay/modal presentation per UF-001. Exact replacement layout/routes and Task detail/Manager presentation remain open.
- **REQ-009:** preserve manual Project/Task authoring, validation/data identity, workspace links and unrelated history, while intentionally changing those primary Project forms' presentation. Preserve existing destructive-action confirmation safeguards. Total-task deletion count must be accurate once Done is possible; active-work deletion semantics remain DEC-009 open.
- **AC-013 added:** opening New/Edit Project presents the primary form without a modal/overlay or dimmed-backdrop form while approved authoring/validation remains usable. This is a draft rendered-journey criterion, not a passed check or a selected replacement design.
- Related IDs updated without renumbering: BEH-005; UC-007; SCN-002/005/006; DEC-006/007; UI context, supplemental evidence and traceability. AC-001–012 remain unchanged.
- DEC-006 is constrained only as to the shown primary Project forms; business columns/waiting/failure/detail alternatives remain open. DEC-007 manager entry/context/reuse/resume remains open, with non-overlay Project authoring context recorded.
- No policy inferred for Task dialog replacement, all application overlays, phone shipping, active-run stop/cancel/retry, unsaved changes, exact routes/focus/cancel behavior or deletion confirmation presentation.

## Product Alternatives — Continue Review, Not Approval
Product recommends dedicated create/edit content pages and suggests primary task-detail pages for consistency; small-field inline editing is BR-005 alternative. BR-001 Manager tab vs existing workspace chat, BR-002 orthogonal readiness/review explanations and BR-003 compact cards/execution/result detail remain discussion proposals.

Please continue direct review with the user: settle the non-overlay replacement and navigation/authoring experience, then the manager/task/dependency/execution/result journey. **Do not treat this canonical refinement as approval of dedicated pages, Task detail replacement, Manager tab/page, final responsive design or the complete UI.** Product retains its own mode and baseline/artifact lifecycle responsibilities; no mode/bootstrap procedure prescribed here.

Future phone suitability is a design motivation only, not a new shipped phone support requirement. Non-overlay presentation must not silently remove explicit confirmation safeguards or decide DEC-009 active-work policy.

## Product Provenance / Evidence Limitations
- Canonical prototype root `/Users/normy/autobyteus_org/autobyteus-web-prototype`.
- Active Product worktree `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations`; branch `prototype/project-task-manager-foundations`; Product ticket same slug.
- Accepted cumulative base reported `df2f5cdaf9b168298dcae79ac47c11f31dd82d7c`; evidence revision `c289b74b833cba02744dd926e992892bc6fd6407`.
- Existing prototype source pin `e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71` differs from solution investigation source `e04cfef23550c3b78286a53befc6bd5d71fb1061`. No applicable newer Projects parity acceptance or new UI built/accepted is claimed.
- Existing synthetic prototype URL reported by Product: `http://127.0.0.1:3286/projects/project-prototype-launch`. Ticket-owned PID 51024 retained by Product for requested inspection; Solution Designer did not access/control/stop it.
- Final UI/UX specification, future-state runnable candidate, normative final screenshot baseline and explicit final confirmation: **N/A — not produced/received**. User screenshots are not final approved design references.
- Source/requirements docs and screenshot inspection only by Solution Designer; no executable test, new UI parity check, production source/setting/data change, remote push or integration.

## Canonical Solution And Supplement Paths
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirements-doc.md` — current SR-002 Draft intent, ACs, decisions.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/investigation-notes.md` — current evidence E-001–017, Product provenance and complete externally owned supplement inventory.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/solution-revision-record.md` — SR-001 preserved; SR-002 requirement-impact refinement and approval boundary.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/product-design-handoff-sr-002.md` — this full continuation result/context.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/product-design-handoff.md` — preserved historical SR-001 request/analysis and confirmed original route.
- External Product report/brainstorm/ticket/screenshots: absolute paths above, Product-owned and read-only. No competing UI/UX specification authored by Solution Designer.
- SR-001 solution artifacts preserved at local docs commit `cc565743e862b4b3fec8109b99c6fe21d13b1c0a` before refinement; no older approval inferred.

## Workspace / Constraints / Remaining Decisions
- Same isolated Solution worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`, branch `codex/project-task-manager-foundations`.
- Original production base `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`; finalization target `origin/personal`, no finalization/push in this phase.
- Public agents repository remains separate/read-only; no manager package authored during this refinement.
- Remaining decisions DEC-001–010: new-tools flag policy, status authority, dependencies, dispatch linkage/retry, accepted Done evidence, board/detail states, manager launch/workspace/resume, safe parallelism, active-work deletion and optional Team/package scope. UF-001 narrows primary form treatment, not these other policies.
- Blockers to architecture/implementation: final intended behavior/UI supplements and explicit complete requirements approval. **Not a blocker to continuing requested Product review**.

## Expected Next Outcome
Continue brainstorming alternatives directly with the user within the recorded non-overlay constraint. Return decisions and evidence with remaining unknowns against the REQ/SCN/DEC IDs; no premature Prototype Completed claim. A later finalized Product package must identify consistent root/ticket/accepted revision/source pin, runnable prototype, UI/UX specification, normative final references and explicit user confirmation. Solution Designer then refines the canonical baseline and obtains complete requirements approval before design.

## Routing Record
Rule lookup completed. Sole applicable/most-specific rule:
> When Solution Designer classifies the outcome as Product Design Requested because the user explicitly or after clarification asks Product Team to help understand or evolve an experience. Include the focused decision, relevant requirement and behavior IDs, established constraints, non-goals, canonical requirements paths, and supplied existing-product context when applicable.

Selected exact recipient `/product_team/product_prototyper`: original requested UI brainstorming continues after canonical UF-001 refinement. No approved marketing, completed architecture or delivery-receipt result exists, so those rules do not apply. send_message_to mentions this absolute handoff path and attaches the same file. Delivery **confirmed accepted** by send_message_to (DELIVERED), target AgentRun `product_prototyper_3395cb44d81e4df5a6460dec32215585`; no delegation or other recipient notification.

Required Product continuation handoff succeeded. Solution Designer stops pending returned Product/user input.
