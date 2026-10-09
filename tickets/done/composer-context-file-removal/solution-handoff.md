# Solution Handoff — composer-context-file-removal

- Result: `Architecture Design Complete`
- Package: `composer-context-file-removal`; current SR: `SR-003`
- Original request: Project Task `project_task_9261def1-bb86-494f-aa1a-bbd643e2f9a4` (delegated by `/project_task_manager`, AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): composer context files cannot be removed (Clear All / per-file × do nothing) in some runs, seen on a delegated Software Engineering Team member (19.png); works in the Project Task Manager run (20.png). Reproduce, find root cause, fix so files are always removable where attachable, no silent errors, no attach where uploads are impossible, tests, user verification in the desktop app.
- Goal: universal deletion of uploaded composer attachments for every run kind; visible errors; upload gating.
- Root cause: server never registered `DELETE /rest/drafts/agent-collaborations/:host/agent-runs/:agent/context-files/:file` (only GET) when delegated children of standalone runs were added (`c2f69edde`, 2026-09-30); client swallowed the 404. Structural cause: draft locator shape duplicated per owner kind in five places (Duplicated Policy).
- Approval: requirements Approved by the user 2026-10-09 (SR-003): "when it cannot delete it, it's a bug we should fix … We first fix this ticket and then it will be deleteable." Prior direction SR-002: "delete should be a universal functionality". DEC-001 withdrawn.
- Classification: `task_size = Medium`, `architectural_risk = High` (REST draft route family rewired into one codec-driven GET/DELETE pair; shared draft-locator parsing used by runtime `ContextFileLocalPathResolver`).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal`, branch `codex/composer-context-file-removal`, base `origin/personal` @ `46e94fdea86ad9af7d8884e690721b373d754cea`; finalization target `origin/personal`.

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/solution-revision-record.md`
- Evidence screenshots (user, read-only): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_9261def1-bb86-494f-aa1a-bbd643e2f9a4/context/ctx_fdb96bdf2570__19.png`, `.../ctx_7c27c5fc527b__20.png`
- Prior review artifacts: `N/A — not applicable` (first design round).
- Product Design: `N/A — not applicable`.

## Scope

REQ-001..006 / AC-001..008 (see requirements). Out of scope: mobile composer, Project Task description composer, final-file routes, finalization, send-error surfacing, draft TTL.

## Open risks / uncertainty

- UNK-001 (non-blocking): whether a delegated child remains composable after its Task is DONE/CANCELLED.
- Full UI click-through across every run kind not done by Solution Designer (matrix from code + live server probes); validation must exercise the UI paths, and the user verifies 19.png case in the desktop app.
- Error-code unification on draft routes may require updating existing tests asserting old codes.

## Route

- Handoff rule applied: `architectural_risk = High` → `/software_engineering_team/architecture_reviewer` (independent architecture review).
- Next expected action: architecture review of the package; on pass, the reviewer routes implementation.
