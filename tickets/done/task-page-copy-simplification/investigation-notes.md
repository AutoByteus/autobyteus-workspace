# Investigation Notes

## Investigation Meta
- Package: task-page-copy-simplification; revision SR-002; date 2026-10-05.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification; Git isolated task worktree.
- Branch: codex/task-page-copy-simplification.
- Refreshed base: origin/personal at 88851166fe8a37944381f0299bd479f20ed0f877.
- Finalization target: origin/personal (not permission to finalize/release).
- Bootstrap: git fetch origin succeeded; git worktree add created task workspace.
- Shared default checkout personal has unrelated changes; left untouched.
- Initial Draft created before deeper component investigation. SR-001 became ready for approval; explicit user approval subsequently recorded.
  SR-002 completes architecture design. No implementation performed by Solution Designer.

## Initial Request And Stakeholder Evidence
User: task page contains redundant explanatory text; users understand what the
fields mean; please inspect and simplify. Screenshot specifically shows New task.
Explicit Product Team request: Not stated. Edit-form inclusion was presented
explicitly and is now approved, not inferred from the original screenshot. SR-001 approved 2026-10-05 (“Yeah, agreed. Let's do it.”); approval-record.md.

## Source Log / Findings
Sources below refer to this worktree unless absolute external source given.
- User screenshot inspected with view_image:
  /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_1d5931af6e704e838a74db42f1e116eb/solution_designer_3afb24ee1c834ae88a8b87888dffdeb6/context_files/ctx_b370845ff718__image.png
  shows project context, New task title, explanatory subtitle, Task details h2,
  Description (required), paragraph, long placeholder and policy note. These
  occupy substantial space before/after the textarea.
- DESIGN.md: smallest supported change, deletion before abstraction; behavior
  approval remains separate from technical decisions.
- TESTING.md and autobyteus-web/AGENTS.md: web unit/component tests plus owned
  browser dev-path evidence for renderer-equivalent behavior; no user's app/data;
  current worktree build needed for desktop-shell/full-product proof.
- autobyteus-web/docs/projects.md: ordinary New/Edit task routes, durable tasks,
  explicit save, required text, cancel/failed-save preservation, optional voice.
- autobyteus-web/components/projects/ProjectTaskEditor.vue: both create/edit use
  ProjectTaskDraftEditor; outer owner retains Back to tasks and load/missing states.
- autobyteus-web/components/projects/ProjectTaskDraftEditor.vue: subtitle differs
  for create/edit; inner heading and help paragraph repeat authoring information;
  visible label targets task-page-description. save validates trimmed content,
  focuses field on blank, returns new tasks to board and edits to detail.
- autobyteus-web/components/projects/TaskDescriptionComposer.vue: editor includes
  context count, drag/paste/upload hint, named attach control, voice status and
  Ctrl/Meta+Enter shortcut. Policy note is unconditional. aria-describedby
  currently names task-page-help and task-page-error; removing help requires
  accessibility-reference maintenance. Section aria-labelledby names inner h2.
- autobyteus-web/localization/messages/{en,zh-CN}/projects.ts: presentation
  catalogs. English placeholder repeats first-line explanation. taskDetails also
  names read-only detail h1; cannot treat the key as disposable solely from form.
- autobyteus-web/components/voiceInput/VoiceInputButton.vue: conditional visibility
  depends on available capability/owned operation; named title and recording
  status already exist. Generic voice control must stay unchanged.
- autobyteus-web/components/projects/__tests__/TaskDescriptionComposer.spec.ts:
  existing completion/typed text/attachment test; does not prove layout cleanup.
- autobyteus-web/tests/e2e/projects-feature-probe.mjs: existing Projects browser/API
  probe, including a task-detail heading assertion. Detail is outside cleanup.
- autobyteus-web/utils/projects/taskSummary.ts: summary is first non-empty trimmed
  description line, never stored; copy removal must not alter this behavior.
Commands: cat referenced docs/components; rg taskCreateHelp/descriptionHelp/
inputPolicy/taskDetails/descriptionPlaceholder; git status --short, upstream,
symbolic-ref origin/HEAD, git fetch origin, git worktree add, git rev-parse HEAD.

## Relevant Existing Supported Product Paths
BEH-001 / SCN-001/002: users create/edit through ordinary form with repeated copy.
BEH-002 / SCN-001/002/003: type/context/optional dictation → explicit save or
cancel; blank save focuses field with error; failures retain input. Evidence is
user screenshot + product docs corroborated by source. No new unsupported edge
scenario is being promoted into scope.

## Structural And Payload Surface Inventory
Content: static form copy and en/zh-CN localization catalogs; readers include
create/edit form and shared detail keys. Structural owners: existing Vue
presentation/label references. No request for API, persistence, security,
concurrency, lifecycle, deployment or ownership changes. Approved scope confirmed;
architecture assessment completed in SR-002 below.

## Runtime Findings / Limits
Screenshot is user-provided existing product evidence, not an independent live
reproduction or changed-build proof. No tests or UI mutations executed.

## Persisted Data Facts
Task description, identity, status and context files already durable; requirement
is preserve them. No stored shape or data transition is proposed. Volume, storage
internals and migration investigation N/A for this copy-only intent.

## Supplemental Inventory / Product Design
Original screenshot: user-owned current-state evidence, BEH-001/REQ-001/002;
not a target design or approval supplement. No Product request/package, ticket,
visualizer or behavior-defining supplement. No independent review artifacts yet.

## Risks / Unknowns
- Approval received for exact removals and consistent Edit task scope.
- Removal must not leave stale ARIA references or empty layout gaps.
- Localization keys may have other consumers; determine in architecture phase.
- No runtime validation claim; downstream validation owns changed-source proof.

## Architecture Investigation Findings
SR-002, after explicit user approval:
- Guideline DESIGN.md revisited; no closer DESIGN*.md found within the web package
  (find autobyteus-web -maxdepth 2). No guideline conflict.
- Re-read create/edit route files, ProjectTaskDraftEditor and TaskDescriptionComposer.
  Both ordinary entry routes wrap ProjectTaskEditor; shared draft editor owns
  form layout/validation; composer owns input/attachments/voice controls.
- rg all web consumers of taskCreateHelp/taskEditHelp/descriptionHelp/inputPolicy/
  descriptionPlaceholder/task-page-help/task-details-heading: removed-copy keys
  are used only by these two templates and en/zh-CN catalogs. Detail still consumes
  taskDetails; retain that shared key. Placeholder has only shared draft caller.
- localization/runtime/types.ts: TranslationCatalog is Record<string,string>,
  not a closed generated key union. Catalog removal fits existing localization.
  projectsCatalog.spec.ts is available preservation coverage.
- useProjectTaskDraft.ts: draft text/files/voice and save/dispose remain one owner;
  trimmed createTask/updateTask and context delta are unchanged. Existing page
  save focuses blank textarea and publishes board/detail only while current.
- projectTaskContextClient.ts: captured Project/optional Task node/credential
  transport governs drafts/files; no template cleanup changes this boundary.
- utils/projects/taskSummary.ts: first non-empty trimmed line is projection only;
  no stored field or API change. Data Not Affected is supported by unchanged
  save and projection paths, not an assumed migration.
- projects-feature-probe.mjs: PT-E2E-005/006 exercise ordinary new/edit forms,
  blank validation, files, identity/status and returns. Existing detail assertion
  expects Task details and must remain. Browser and component assertions can
  extend these existing paths; no runtime helper/copy-suppression framework needed.
Commands: cat route/components/draft/client/localization types, rg consumers,
find closer design files, git status --short (only task documents untracked).
No runtime probe executed in design phase; implementation/API ownership retains
changed-source validation. Boundary design health: existing owners healthy,
local presentation redundancy only; no refactor needed.

## Requirement Implications / Next Action
Redundant text can be removed without changing task semantics; retain useful
attachment hints, shortcut and contextual errors. Exact proposal in
/Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/requirements-doc.md. Approved SR-001; design-spec.md implements unchanged intent in SR-002.
Next: apply handoff rules for Architecture Design Complete, Small/Low.

## SR-002 Supplemental Inventory Update
approval-record.md: Solution Designer-owned durable conversation reference for
SR-001 requirements approval, REQ/AC-001–005; records approval rather than
introducing intended behavior. Original screenshot remains current-state evidence.
Product artifacts: N/A — not requested. Architecture/code reviews: N/A — not applicable to selected Small/Low direct
implementation route; subsequent implementation self-check and API/E2E still apply. No unresolved material design question.
