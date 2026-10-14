# Architecture Design Complete — sidebar-stop-red-default

## Result / Identity / Approval
- **New Task** `project_task_6d8f94f6-1694-466b-9587-2ac091e7dd18`; package `sidebar-stop-red-default`; 2026-10-13.
- Requested by `/project_task_manager`, exact AgentRun `project_task_manager_2f7a8ea2d421446f8f22e4f616528547`.
- **Approved R1 / SR-001; Ready design SR-002; task_size=Medium; architectural_risk=Low**. No blocker, no Needs user question.
- Requirements approved by Solution Designer within the user's explicit new direction, with user informed in message beginning “I found five live sidebar variants”. No Product request/supplement. Independent reviews: **N/A — not applicable** to the low-risk direct candidate; rule lookup below is authoritative for route.
- Status is design complete, **not implemented, validated, integrated or released**. Prior Task results must not be used as current passes.

## Original Request / Goals / Constraints
The user reconsidered the previous gray-default/red-hover styling: gray can look unavailable. They explicitly approved a new follow-up and dispatch to this same team. They now want all clickable sidebar Stops immediately red, including ordinary Project Task Manager/Agent runs and delegated Agent/whole-Team copies; include existing additional sidebar variants for consistency. Keep recognizable hover/focus and honest disabled/pending/loading presentation. Do not color whole rows or status indicators. Preserve exact visibility, target, click/keyboard behavior, confirmation and Task/worker lifecycle. Verify rendered rest/hover/leave, keyboard/pending and targeting using isolated resources, never real running workers. No unrelated architecture/catalog documentation cleanup or prior follow-ups. Report source integration separately from installed/running-app update and confirm cleanup.

This is **not a failure or reopening** of `project_task_018ddc81-1f14-4531-8143-1276d07736d3` / `task-copy-stop-style`. That Task remains DONE and its artifacts immutable. Its source-only gray-default change (`be4190e94b4fd715ae41951a0ff9648d4f65f5fa`, report `0c37f58d88220be3683a15da6e0956d6ab13c4db`) is current base background, intentionally superseded visually by this new Task.

## Workspace / Source / Finalization Context
- Use **new** isolated worktree `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default`.
- Branch `codex/sidebar-stop-red-default`; refreshed source base `origin/personal@0c37f58d88220be3683a15da6e0956d6ab13c4db`; eventual finalization target `origin/personal`.
- Old task worktree was removed; do not recreate it or author in its exported package. Shared default checkout and other worktrees are not authoring targets. Preserve unrelated work/live conversations.
- Read root/package AGENTS.md and applicable DESIGN.md/TESTING.md/RELEASE.md at your phase. Existing project rules require explicit staging, current-build isolated tests and safe owned cleanup. Delivery owns integration/release decisions; this request does not authorize an installed-app update/restart, tag or publication. Expected source-only route unless release authority says otherwise; do not conflate No release with rollout passed.

## Investigation And Target Design
Production entry is `AppLeftPanel` → `WorkspaceAgentRunsTreePanel`. **Five supported variants / four sites / three components**:
1. Agent root including PM: `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`.
2. Team root: same file.
3. Org root: `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`.
4. Delegated Agent and 5. delegated whole Team: shared `autobyteus-web/components/workspace/history/DelegatedStopButton.vue`, including Agent/Team/Org sidebar hosts.

Enabled: `text-red-500` (#ef4444), existing hover `text-red-600` (#dc2626) on `red-50` (#fef2f2), red again on leave. Disabled: project `gray-400` (#999999) with current opacity/cursor, transparent background even on hover. Preserve sizes, outline/ring, existing transition (Org has no explicit one), copy pulse/reduced-motion, attributes/scripts/handlers. Recommended minimum is replace base gray token, retain existing hover classes and add `disabled:text-gray-400 disabled:hover:text-gray-400 disabled:hover:bg-transparent`. Verify computed specificity, not just token presence. Shared comment must reflect new behavior.

Do not modify Settings, old fixture-only running panel/roster controls, rows/status dots, global theme, pending/action/store/API/server logic. Root Stops keep their distinct Agent/Team/Org APIs; copy Stop keeps `{rootKind,rootRunId}` and exactly one Agent or whole-Team reference through delegated store/server/root/task lifecycle. No new confirmation, cancellation semantics, refactor or data migration. Current owners already fit; the cause is a **new product preference**, not an implementation defect in the previous Task.

## Validation / Expected Downstream Output
Approved SCN-001..003 / BEH-001..003 / UC-001/002 / REQ-001..004 / AC-001..005 are mapped in canonical requirements/design.
- Update old gray-default assertions in `DelegatedStopButton.spec.ts` and existing `delegated-launch-defaults-probe.mjs`; retain behavioral targeting/visibility coverage. Extend root section/Org component and action tests for red enabled/muted disabled and distinct targets. Include intentional old-token negative regression evidence.
- Render **all5** variants' rest/hover/leave, focus/native activation, held pending/disabled-hover/no-duplicate; row/status/selection/disclosure remain unchanged. Use existing DCP-001/002 real-stack copy journeys and DCP-003 Org seam; add safe test-owned parent Stop after copy resume proof or equivalent bounded owned case. Do not remove DCP-003 Settings coverage or fake backend success.
- Copy proof: exact Agent vs whole-Team input, actual stop/publication, open Task, parent survival, resume. Root proof: exact subject ID/action, unchanged inactive/history outcomes. Shared copy host assertions must include Org. Record genuine selection states (Team group may expand rather than become selected=true).
- Component mock, CSS fixture, real-stack browser and desktop evidence are distinct. Browser/scripted runtime is sufficient intended renderer layer, not paid inference, packaged Electron or installed-app proof. Follow TESTING.md prerequisites/isolation and retain failure/cleanup receipts.
- Delivery syncs only direct Stop passages in `docs/agent_execution_architecture.md` and `docs/settings.md`. Final output must include concise change, actual checks/evidence, actual source/release/running-app state, durable cumulative package, remaining user-only check if any and cleanup confirmation.
- No new executable check was run during solution design. Current evidence is source investigation. Escalate any required JS/lifecycle/visibility/scope change instead of expanding silently.

## Canonical Artifacts (absolute paths)
- `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default/requirements-doc.md`
- `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default/investigation-notes.md`
- `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default/design-spec.md`
- `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default/solution-revision-record.md`
- This handoff: `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default/solution-handoff.md`

Relevant background only:
- `/home/autobyteus/workspace/.codex/delivery-records/task-copy-stop-style/solution-terminal-result.md`
- `/home/autobyteus/workspace/.codex/delivery-records/task-copy-stop-style/package/tickets/done/task-copy-stop-style/` (old finalized evidence/read-only export, not runnable checkout).
Product package, independent review artifacts: **N/A — not applicable**. Current implementation/API/delivery artifacts: not yet produced. No new follow-up; prior FUP-001 already handed to Tasks owner and explicitly excluded.

## Routing
Full result persisted before rule lookup. `get_handoff_rules` returned three rules; the sole matching rule is Architecture Design Complete with Small or Medium and Low risk. **Selected route: Direct Low-Risk implementation**, exact recipient `/software_engineering_team/implementation_engineer`. Large/High review and Delivery Receipt Evidence Gap rules do not apply. Independent architecture/source/test-code review artifacts are N/A — not applicable, not omitted by accident. Next owner implements/self-checks, then configured API/E2E and delivery gates still apply. Send this file plus all canonical solution files; do not additionally notify other recipients. Stop after confirmed handoff.
