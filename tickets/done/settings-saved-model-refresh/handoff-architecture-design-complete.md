# Architecture Design Complete — settings-saved-model-refresh

## Identity / Result
- Task `project_task_5ee10f33-b73e-4373-b646-e87613e9c57b`; package `settings-saved-model-refresh`.
- Result **Architecture Design Complete**; requirements **Approved SR-001**, solution/design **SR-002 Ready**.
- **task_size=Medium; architectural_risk=Low**. Bounded canonical Settings read-model/Save-state correction; no backend/runtime/persistence/shared-wire changes.
- Requested by `/project_task_manager`, exact caller AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`. Return final tested result, limitations and finalization/cleanup receipt there via Solution Designer terminal verification.

## Original Request / Goal
User on 2026-10-13: “It should be fixed right now. Immediately, create this bug and delegate to a software engineering team directly.” Upstream already created/dispatched this Task. Prior delegated-copy feature Task `project_task_025b20cb-3fcb-438e-b910-cad1cd0c286b` remains closed (feature `5eb5361cdd`, configured defaults `e2060dfd`). Do not create/reopen either prior Task.
Reported journey: stop parent run (Project Task Manager example Offline) → gear opens middle Agent Configuration/Settings → Collaborators and delegated copies → change stopped Agent/Team/member model/config → Save → current view still OLD; chat and reopen shows NEW. User screenshots establish surface only, not verified before/after.
Expected: authoritative accepted saved choice appears immediately in the still-open editor/summary/member rows, including thinking/fast where affected, with no back/reopen/reload/resume needed. Prove repeated edits and reopen consistency, per-instance isolation and failure/cancel truthfulness. Preserve stopped/running restrictions, runtime locks, launch defaults, conversations and stop/resume. No design redesign, no user's real runs/data touched, no model quota for proof, **no release authorization**.

## Workspace / Finalization
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`.
- Branch `codex/settings-saved-model-refresh`.
- Base refreshed from `origin/personal`, revision `1a2379c57088e8976aeb0f43e1e607e1acc103c6`.
- Finalization target `origin/personal`; source-current RELEASE.md governs isolated finalize branch/no-ff/push and no-release default. Never finalize in dirty main checkout.
- Only ticket docs authored; no code changed, tests/runtime processes started, dependencies installed, commits or pushes performed by Solution Designer. Worktree currently has untracked owned ticket folder ready for implementation. Existing main-checkout work untouched.
- Source-current TESTING.md is the new short global guideline; do not copy ticket-specific evidence into it. Root AGENTS includes RELEASE.md. Provided skill authorities are outside this worktree under the original skill root.

## Canonical Package (absolute paths)
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/design-spec.md`
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/handoff-architecture-design-complete.md`
- User screenshots (context only):
  - `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_5ee10f33-b73e-4373-b646-e87613e9c57b/context/ctx_fe9024fc6544__ctx_5bfbc4d3d847_image.png`
  - `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_5ee10f33-b73e-4373-b646-e87613e9c57b/context/ctx_a0382557d7a7__ctx_7f59b12cbf9b_image.png`
- Prior feature context: task-worktree `tickets/done/delegated-copy-model-change/`; not a current approval/pass substitute.
- Product UI/UX supplements and independent review reports: **N/A — not applicable** for this new package (route recorded below).

## Approval / Evidence / Design
Requirements approved within request by Solution Designer and user informed in 2026-10-13 conversation message beginning “The code points to a missing refresh …”. Exact baseline SR-001, no behavior-defining supplements. No Needs user decision; no release.
Static code establishes a concrete missing read path: ExistingRunConfigEditor reads Agent delegated rows from agentRunCollaborationStore; delegated save clears overlays and reloads existingRunConfigStore, whose Agent loader reads only root metadata. Stopped roots have no stream checkpoint update. Team/Org snapshots already include delegated trees. Existing test stubs collaboration null and asserts only reload call, so misses rendered staleness. Server stopped save validates/writes/rereads tree before UPDATED; do not change it blindly. **No runtime reproduction or test pass claimed yet.**
Design: Settings store owns a typed stopped-Agent snapshot of execution_tree/closed_task_executions, read by existing no-resume network client with exact-root validation; stopped rows render this snapshot, active rows retain existing stream view. Reuse row/inheritance rules. Complete canonical read on load/reload/retry; publish Saved only after readback. Distinguish rejected writes from saved-but-refresh-failed and offer read-only retry with no false unsaved state. No full child-history hydration or run attach just for Settings.

## Next Expected Work / Gates
1. Implementation reads package and repo/package authorities, captures failing pre-fix rendered same-view assertion using stopped Agent parent, confirms authoritative saved B vs displayed A; then applies narrow design and implementation-scoped checks. Contradictory canonical/persistence evidence returns Design Impact.
2. Add proportionate tests for Agent copy, Team/default follower/member own-choice/collaborator, repeated/settings-only edits and unrelated IDs. Check existing active parent/Team/Org routes, Cancel/rejection/readback failure+retry, pending target ownership and no resume.
3. API/E2E must prove actual source-current isolated desktop Save-without-navigation against real owned backend mutation/readback. Existing delegated-launch-defaults-probe fake runtime setup is reusable; no paid inference. Browser/component evidence alone is not the required desktop proof. Record exact commands, source/build identity, controlled boundaries, API/DOM assertions, supporting screenshots and owned cleanup.
4. Normal skill handoffs/review/validation/delivery route still applies. Delivery finalizes/archives safely and returns receipt to Solution Designer, not directly a premature done claim. No release unless user later authorizes.
Blockers: none for implementation. Remaining evidence gap is execution confirmation, an explicit implementation/validation gate, not a missing product decision. Escalation triggers in design-spec.md; unrelated findings go to Task Manager as separate follow-ups.

## Route Decision
Configured rules retrieved 2026-10-13. Selected the single matching rule: Architecture Design Complete + task_size Small/Medium + architectural_risk Low → `/software_engineering_team/implementation_engineer`. Direct implementation route; independent architecture review N/A — not applicable. Direct skips independent architecture review, not design, self-checks, API/E2E or delivery. No other rule matches. Dispatch via send_message_to with this handoff attached.
