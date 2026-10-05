# Solution Designer Result — SR-024 (Per-Project storage + migration, agent run resources) on top of SR-023

## Outcome
- Package **project-task-manager-linked-delegation**, Solution Designer, **SR-024**, 2026-10-05.
- **Classification:** Architecture Design Complete — **Large / High / Reviewed**.
- **Basis:**
  - REQ-BL-009 (approved, SD-AP-003), with user-directed amendments in this round:
    - **C-2:** one file per Task, now `<projectId>/tasks/<taskId>/agent_run_resources.json`;
    - **C-3 replaced:** per-Project folders **and** a one-time startup migration of released Projects data **in this ticket** ("Do not defer … super cheap because almost no user have used this");
    - **C-4:** naming "agent run resources" (`agent_run_resources.json`, `agentRunResources`, `agentRun`).
  - SR-023 (ARCH-REV-010 Pass) stays the runtime basis, unchanged in substance.

## What changed versus the ARCH-REV-010 basis
- **Layout:**
  - `<appData>/projects/<projectId>/project.json`;
  - per Task `tasks/<taskId>/{task.json, context/, agent_run_resources.json}`;
  - `drafts/<draftId>/`.
- **ProjectStore** is rewritten per folder:
  - listing by valid `project.json`/`task.json`;
  - Delete removes `task.json` and `context/` (or `project.json`, `drafts/` and the Tasks' metadata/context) and **keeps** `agent_run_resources.json`;
  - a narrow **`PROJECTS_MIGRATION_PENDING`** gate while the released source file still exists.
- **`ProjectsLayout`** is the single path owner, with safe segments (also covers N5).
- **Migration `projects-per-folder-v1`** (STARTUP_ONLY, required):
  - frozen released reader;
  - per-file atomic writes and directory renames;
  - retained original `projects.pre-folders.json`;
  - retry recognizes completed targets;
  - bounded skips/warnings;
  - no lockout: the runner and hosts only warn; Projects alone is gated.
  - data_migration_guideline §2 checklist answered in design-spec § Migration Plan.
- **Naming:** `TaskRun*` → `TaskAgentResource*` throughout.

## Evidence
- E-094: Projects is off by default.
- E-095: the user's real data is 1 Project, 2 TODO Tasks, no files.
- E-096: the canonical guideline, read in full.
- E-097: the runner and hosts don't lock out.
- E-098: the rename precedent.
- E-099: one layout owner.
- E-100: references (absolute paths in old conversations: accepted).

## Coordination / state
- The implementation engineer (run `implementation_engineer_9c1d0893d06d4c5da7a7346539895a59`) was told: continue the runtime-side SR-023 work; hold the Projects storage parts until this design passes review.
- The IR-012 API/E2E recheck is paused.
- **DR-002 must not finalize.**
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD `4b04d9097`, base/finalization origin/personal. The Designer made no source, test or Git change.

## Artifacts (absolute)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/data-model-draft.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-revision-record.md`
- Prior (ARCH-REV-010 basis) snapshots: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-history/sr-024-prior/`
- Migration policy (repository-owned): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/docs/design/data_migration_guideline.md`

## Open risks
- An unexpected hand-edited released source is skipped with a warning, not converted.
- Absolute context paths in old conversations keep their old text.
- The damaged-file policy (Q-3).
- Accumulation of kept `agent_run_resources.json` files.

## Routing
Recorded below after `get_handoff_rules`.

### SR-024 routing / confirmed handoff
Only the Large/High architecture-review rule matches (all amendments are explicit user decisions). `send_message_to` → `/architecture_reviewer` confirmed accepted=true / DELIVERED (run `architecture_reviewer_600715b440b947e3810057bdf0971a3e`). Note: one attached reference path omitted the ticket folder; the correct prior snapshot is `tickets/in-progress/project-task-manager-linked-delegation/solution-history/sr-024-prior/design-spec.md`, as listed in the handoff. No other recipient. Solution Designer stops.
