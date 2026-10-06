# Solution Handoff — create-or-update-project-tool

## Result And Required Next Work
- Result: **Architecture Design Complete**.
- Package: create-or-update-project-tool; current solution round SR-003.
- Requirements baseline: SR-002, **Approved** via AP-001. Design: Ready.
- `task_size: Medium`; `architectural_risk: High`.
- Next expected output: independent technical assessment/next gate under configured rule. This is a solution package, not implemented code. No test run/pass, release or delivery completion claimed.

## Original Request, Goals And Approval Context
User reported missing Project creation/update tool and supplied Project Task Manager Tools screenshot. Source confirms only list_projects/list_project_tasks/create_or_update_task. Proposed name/description-only tool scope; user requested optional workspaces too. Presented optional `{workspace_id, description?}` array with omitted-list preserve, provided-list full replacement, [] unlink-only. User asked what links mean and whether JSON attributes: clarified Project.workspaces holds association objects, not symlink/URL/folder changes. Latest user approved: “Yes, that makes sense then. Just I think it makes sense. Currently it's so we need to support an optional like workspaces in the arguments as well.” AP-001 in requirements records exact context and approved SR-002. No Product package or normative UI supplement.

Goals: selected agents create required-name Projects with optional description/registered workspace attachments; patch known IDs with omitted-field preservation; same Project/Task data and native/MCP behavior; shipped Manager gets new tool and safe instructions. New command contract warrants independent review because external nested-array mutation and service partial-write API are material, even with existing locking.

## Canonical Absolute Artifact Inventory
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/requirements-doc.md
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/investigation-notes.md
- Design: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/design-spec.md
- Solution history: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/solution-revision-record.md
- This handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/solution-handoff.md
- Supplement/user evidence image: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e534fba4fd4c4cb9ae89925e454758d0/solution_designer_0c7ba6fd88d34653a1667f9c7967b6e7/context_files/ctx_f64c4459936b__image.png
- Product UI/UX/artifacts: N/A — not requested.
- Architecture review: N/A — not performed yet. Code review/implementation/API-E2E/delivery: N/A — not applicable yet.

## Workspace, Base And Finalization
- Git worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool
- Branch: codex/create-or-update-project-tool
- Base: origin/personal @ 68261f8111e2f0eb119824c91a2650410c9aeffa, fetched at bootstrap 2026-10-06.
- Target: origin/personal; release/deployment not requested.
- Shared checkout /Users/normy/autobyteus_org/autobyteus-workspace-superrepo has unrelated modifications; do not overwrite/stage them. All owned solution documents are in isolated task folder. Production source not edited by Solution Designer.

## Approved Scope / Constraints / Preservation
REQ-001–006, AC-001–006, SCN-001–004 cover create, metadata/link patch, invalid-input/authorization and Manager availability. Optional workspaces reference existing registered node-local IDs. Present list replaces associations; omitted preserves; [] clears associations only. Retained link roots/addedAt and omitted descriptions persist. No workspace discovery/creation/registration, Task status/dispatch change, folder deletion, UI redesign/auto-refresh, feature-default change, schema migration, custom-agent grants or release.
Preserve Project identity, creation timestamp, omitted metadata/links, Tasks/context/assignments/run history and physical workspace/registration. Strict pre-coercion input types/keys/presence. Name uniqueness and partial update depend on existing catalog serialization.
Read worktree AGENTS.md, DESIGN.md, TESTING.md and applicable server/web package instructions. Tests use disposable test-owned runtime/files; never test user's app or data. Supplied image is evidence, not permission to inspect private runtime state.

## Evidence And Design Summary
Shared contract/manifest/native wrapper already govern three tools. Existing MCP provider derives adapters from manifest; runtime filters canonical selected names. Extend same owner. ProjectService full-form update does not preserve omitted description; new PatchProjectCommand and locked record command preserve omission. Extract existing creation write into record-returning service command; UI facade keeps enriched view. New tool projects committed identity/name/description/workspace IDs/descriptions without Task counts/availability/history reads. Single explicit-clear-vs-preserve private workspace resolver avoids duplicate policy while retaining existing forms. Existing ProjectStore tolerant reader/exact writer and catalog lock unchanged; data directly usable, no migration. Manager template/bootstrap updated, not custom agents/running-session grants.
Detailed source paths, technical rationale, failure semantics, file mapping, removal plan and validation intent are in design and investigation. API/unit/HTTP E2E tests planned, not run. No architecture ambiguity unresolved; no forward-ready implementation claim before configured review.

## Risks / Expected Verification
- No current workspace discovery tool: caller supplies real IDs/full desired list; Manager must clarify instead of inventing IDs or silently overwriting unknown associations.
- Preserve omission through native BaseTool/coercion and nested schema; null/empty-string array is invalid, [] valid.
- Apply partial merge under store callback, not manifest read-then-write; preserve full-form behavior during extraction.
- Truthful unconfirmed write errors; no automatic retry or rollback claim.
- Validate new external tool selection/schema/native/MCP parity, real HTTP persistence/authorization, exact linked JSON/Task preservation and bootstrap Manager tools/instructions. Receiving implementation/API owners own executable results, independent reviewers own their findings.

## Handoff Rule Decision
Rule lookup on 2026-10-06 returned three conditions. Selected the most-specific matching rule: Architecture Design Complete with task_size=Large OR architectural_risk=High, aligned approved cumulative package ready for independent review. This package is Medium/High and SR-002 is explicitly Approved via AP-001. Exact recipient: `/architecture_reviewer`. Low-risk direct implementation and delivery-receipt-gap rules do not match. Dispatch confirmation pending; no duplicate implementation forwarding. No Codex-native subagents or delegate_task substitute.

Dispatch receipt: send_message_to confirmed `accepted: true`, `code: DELIVERED`, recipient `/architecture_reviewer`, target_agent_run_id `architecture_reviewer_0987551e6db74e02ab37f3621da37eb6`. Same absolute handoff file was attached. Required handoff succeeded; Solution Designer stops pending a future workflow-defined result.
