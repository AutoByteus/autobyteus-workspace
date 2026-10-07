# Analysis Result — Project workspace paths

**Historical analysis/requirements conversation. Current approved architecture result: [solution-handoff.md](solution-handoff.md), SR-003.**

## Identity / State
- Package: project-workspace-path; SR-002; result: **Analysis refined; requirements Ready for Approval / full baseline approval pending**.
- Requested work: analyze create_or_update_project using workspace path plus optional description, including JSON storage.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path; branch codex/project-workspace-path.
- Base: origin/personal @ 5316a0cad19498819a8a50c594b72c0197d8b6a1 (refreshed 2026-10-07).
- Possible finalization target: origin/personal; no implementation/finalization/release authorization claimed.
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/requirements-doc.md
- Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/investigation-notes.md
- Solution history: /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/solution-revision-record.md
- Design/reviews/implementation/test results/Product supplements: N/A — not applicable in this analysis-only phase.

## Original Request
“Currently, we have a tool called create an update project. This tool has the wrong arguments. It uses a workspace ID. It should be workspace path plus this optional description. Please, analyze. Basically, if this is stored in JSON, it should also be like a path.”

## Findings
The complaint is confirmed against refreshed source. Tool currently accepts workspaces: [{workspace_id, description?}]. Shared parser rejects workspace_path. Manifest converts to workspaceId; service resolves prior registration and keys links by ID. project.json already saves workspaceId + workspaceRootPath + description + addedAt. Tool response unnecessarily omits the saved root and reports only workspaceId/description. JSON reader requires both ID and path and filters path-only rows.

GraphQL, strict live-feed schema and Project UI editing/unlinking consume workspaceId. Correcting persisted identity is therefore a coordinated Project contract correction, not only one renamed tool argument. Runtime workspace IDs outside Project association need not be changed. Existing root paths provide continuity evidence; no automatic migration or global startup gate is justified solely by this request. Follow the migration policy and freeze the released Projects migration's imported reader if changed.

## Proposed Behavior For User Review (Not Approved Design)
Tool rows use `workspace_path` plus optional `description`. Each newly saved Project workspace entry contains only workspaceRootPath and description, no workspaceId or addedAt. Keeping the existing root-path field allows obsolete fields to be ignored on read and removed on ordinary save, without a new bulk migration. Preserve name/project_id semantics, optional list, omission preservation, complete replacement and [] unlinking only. Existing Project/Task data and recorded links must not be lost; physical folders are untouched.

## Current Clarification / Expected Next Output
User clarified JSON path/description-only entries and frontend picker-as-convenience, enabling tool callers to use folder paths without knowing IDs. SR-002 now proposes direct absolute path references without prior registration or filesystem existence checks just to save metadata; picker choice supplies the same path. No folder creation/auto-registration. Full baseline approval pending; architecture/implementation not yet authorized. Migration feasibility: old records already have root path/description, so ignore obsolete workspaceId/addedAt and write the reduced shape on ordinary save. No eager rewrite or schema-version scheme.

## Evidence / Limits
Canonical notes include exact source locations E-001–013 and historical package context. Source inspection only; no runtime tests or app/data access. Only task documents authored in the isolated worktree; production source unchanged. Unknown: exact installed version, data volume and unregistered/missing-path expectations. SCN-001–004 are now supported product scenarios with revised semantics proposed for approval; no UI redesign or runtime workspace identity rewrite.

## Routing
Pending get_handoff_rules lookup; routine clarification/approval hold remains with user, not an implementation handoff.

Routing resolved 2026-10-07: get_handoff_rules returned architecture-review (Large/High), direct implementation (Small/Medium Low), and delivery-receipt evidence-gap routes. None applies: this is analysis with unapproved Draft requirements, no completed architecture and no delivery receipt. No specialist contacted. Return findings and unresolved decision to user; stop at requirements conversation.

## SR-002 Refinement Result
The user is correct that frontend identity need not become persisted association identity. Core direction: path plus optional input description; exactly path/description stored; no new migration needed for removing extra fields while retaining the existing path field. Previously suggested per-link addedAt retention is explicitly withdrawn. Requirements ready for full user approval, not design-ready yet. No specialist work requested. Rule lookup pending for this refinement; prior route was user-only.

SR-002 routing: get_handoff_rules again returned only completed-architecture review/direct implementation and delivery-receipt correction routes. None applies to Ready for Approval requirements with no design. No specialist notified; return revised scope and request user approval. Stop at the requirements boundary.
