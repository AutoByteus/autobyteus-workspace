# Design Spec — Task page copy simplification

## Solution And Approval Basis
Package: task-page-copy-simplification; current round SR-002; status **Ready**.
Approved requirements baseline: SR-001, REQ/AC-001–005, SCN-001–003. Explicit user
reply 2026-10-05: “Yeah, agreed. Let's do it.” See approval-record.md.
No behavior-defining supplements or Product spec. Canonical evidence:
/Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/investigation-notes.md.
Workspace/branch/base/finalization target recorded there; isolation verified.

## Current-State Read
The ordinary New/Edit task routes use the same draft editor and composer.
Presentation repeats what the description field does; ownership and save/file/
voice lifecycles are already coherent. Do not change read-only task detail.

## Task Size And Architectural Risk (Mandatory)
- `task_size`: **Small**. Narrow local presentation cleanup: two existing Vue
  components and two locale catalogs, with focused tests and browser assertions.
- `architectural_risk`: **Low**. No owner/API/route/schema/persistence/security/
  concurrency/deployment contract changes. Deleted DOM references can be repaired
  locally without redesign; all material consumers traced.
- Content surfaces: four removed-copy keys and one placeholder in each catalog.
  Structural surfaces: existing template layout and ARIA references only.
  Catalog volume is not architecture scope. Existing readers consume changes.
- Escalation: new intended behavior → Requirement Gap/user approval; discovering
  material owner/contract/lifecycle impact → Design Impact/reclassification before
  broadening implementation. No hidden direct-route scope increase.

## Architecture Investigation Evidence
Guideline: root DESIGN.md, with no closer web guideline found; no conflict.
See canonical investigation notes, SR-002 architecture findings. Re-read shared
component consumers, route entrypoints, draft/context owners, localization types,
summary projection and PT-E2E-005/006. Observations support bounded deletion and
unchanged data paths. Runtime validation remains downstream, not claimed here.

## Intended Change
Remove the create/edit subtitle, inner Task details heading, description-help
paragraph and unconditional file/voice policy note. Replace English placeholder
with “Describe the task…” and Chinese with “描述任务…”. Reclaim removed-copy space;
keep existing width, card padding, textarea rows=8, responsive actions and styling.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved intent / criteria | Supported trigger | Target path and lifecycle |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/002/003/005; AC-001/002/004 | SCN-001 New task; SCN-002 Edit task | DS-001/002: ordinary route → ProjectTaskEditor → ProjectTaskDraftEditor → TaskDescriptionComposer/localization → simplified visible editor |
| BEH-002 | REQ-003/004/005; AC-003/004/005 | SCN-001/002 save/cancel; SCN-003 blank/failure recovery | DS-001/002/003: composer input/events → draft editor validation → useProjectTaskDraft → existing task store/context transport → saved task → board/detail or retained draft/error |
Current supported evidence and scenario classifications remain requirements-owned.

## Relevant Supplemental Task Artifacts
Original user screenshot: current-state evidence only, absolute path in
investigation inventory. approval-record.md: durable approval transcript for
SR-001. No Product-owned artifacts. Independent review N/A unless route requires.

## Task Design Health Assessment (Mandatory)
Posture: Cleanup. Current structural design issue: No. Root cause classification:
**No Design Issue Found**; usability issue is excess local presentation copy.
**No refactor needed**: shared draft and composer already own layout and editing
controls, draft owns data lifecycle, catalogs own translations. Removal does not
create bypasses, mixed ownership, new data structures or API ambiguity. No deferred
required refactor; residual risk is limited to stale DOM references or shared-key
deletion, addressed below and by tests.

## Terminology
Task means durable Project Task, not execution child. Description's first
non-empty line remains a projected board summary, not a newly stored title.

## Design Reading Order
Approved intent → evidence → local removals/reference repairs → file inventory
→ preservation validation. No new subsystem or intermediate module needed.

## Legacy Removal Policy (Mandatory)
Clean-cut deletion; do not hide old explanatory blocks with CSS, add feature
flags, retain an alternate verbose form or create a help framework.

## Persisted Data / State Transition Decision
**Not Affected**: no save payload, reader/writer, schema, identity, summary semantic
or context-storage changes. Unchanged useProjectTaskDraft and taskSummary paths
support REQ-004/AC-003. Migration/convention/predecessor analysis N/A because no
persisted-data transformation is designed. No data loss/reset allowed.

## Data-Flow Spine Inventory
| ID | Scope | Behavior | Start → End | Governing owner / purpose |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/002 | New task action → saved task on board | ProjectTaskDraftEditor + useProjectTaskDraft; concise creation, existing persistence |
| DS-002 | Primary End-to-End | BEH-001/002 | Edit task action → updated task detail | Same owners; concise editing, unchanged ID/status |
| DS-003 | Return-Event | BEH-002 | Blank/save/voice feedback → correct field/status or retained editable draft | Draft editor, draft, ProjectVoiceStatus; actionable errors preserved |

## Primary Execution Spine(s)
DS-001: Project board New task → /projects/:id/tasks/new → ProjectTaskEditor →
ProjectTaskDraftEditor / TaskDescriptionComposer → useProjectTaskDraft.save →
projectTaskStore.createTask (existing backend) → board with saved task.
DS-002: Task detail Edit → /projects/:id/tasks/:taskId/edit → ProjectTaskEditor →
shared draft editor/composer → useProjectTaskDraft.save → projectTaskStore.updateTask
(existing backend) → task detail with preserved identity/status/context.

## Spine Narratives (Mandatory)
Users reach the shared form through supported creation or editing actions. Only
its explanatory DOM is shortened; typed or dictated input still stays local until
explicit save validates it and uses existing persistence. New task returns to
board, edit to detail; cancel leaves saved task unchanged. Blank input focuses
textarea with required feedback; existing failures retain draft and actionable
status. Files and voice remain subordinate capabilities, not new save owners.

## Spine Actors / Main-Line Nodes
Ordinary routes own entry identity; ProjectTaskEditor owns loading/read surface;
ProjectTaskDraftEditor owns presentation/validation/navigation; composer owns
input/control events; draft owns local data/lifetime; task store owns save boundary.

## Ownership Map
Reuse the actors above; no responsibility moves or additional owner.

## Thin Entry Facades / Public Wrappers
Existing route files render ProjectTaskEditor with project/task IDs. Leave these
thin entry facades unchanged; they must not acquire copy or persistence policy.

## Removal / Decommission Plan (Mandatory)
| Item | Reason / replacement | Scope |
| --- | --- | --- |
| Subtitle p in ProjectTaskDraftEditor | Redundant; page title/field label orient user | In this change |
| h2 task-details-heading and description p task-page-help | Redundant; remove associated references and h2-only spacing | In this change |
| Unconditional policy p in composer | Static file/voice explanation; existing controls/status remain | In this change |
| taskCreateHelp, taskEditHelp, descriptionHelp, inputPolicy locale entries in en/zh-CN | No remaining production consumers after template deletion; remove dead keys | In this change |
Keep projects.ui.taskDetails: read-only detail still consumes it. Do not sweep
unrelated pre-existing unused keys or alter read-only detail heading assertions.

## Return Or Event Spine(s)
DS-003: validation error → task-page-error → textarea described-by/focus;
draft.save failure → existing save error; voice → ProjectVoiceStatus. Unchanged
semantics; remove only the missing help ID from description associations.

## Bounded Local / Internal Spines
N/A — no event loop/state machine changes; existing draft/voice lifecycle reused.

## Off-Spine Concerns Around The Spine
Localization serves draft/composer presentation. Existing context transport serves
draft file operations. Existing voice target/status serves local append/progress.
Keep these owners and dependencies; none joins save sequencing differently.

## Ownership Boundaries
Presentation does not perform transport; draft/store/context boundaries retain
save, identity, lifetime and error authority. Do not move validation into composer.

## Boundary Encapsulation Map
Draft editor → useProjectTaskDraft → existing store/context client. Composer emits
input/add/remove/clear/save rather than calling backend. No new bypass introduced.

## Dependency Rules
Keep current imports and props/emits. No server/core imports into web, no new
Apollo calls from components, no duplication of draft or voice state.

## Interface Boundary Mapping
Existing props: projectId and optional saved Task, composer text/files/client/
target/error/placeholder. Existing v-model and file/save events unchanged. Compound
Project/Task identity stays captured by draft/context owners; no new interface.

## Interface Boundary Check
Existing boundaries singular for this scope; identity explicit. Low selector risk;
no corrective API change needed. Error association changes only DOM ID reference.

## Main Domain Subject Naming Check
ProjectTaskDraftEditor and TaskDescriptionComposer accurately name responsibilities;
retain names. No naming drift or new generic “simplifier” abstraction.

## Existing Capability / Subsystem Reuse Check
Reuse Projects forms, localization, context and voice. No new helper or service.

## Subsystem / Capability-Area Allocation
Projects owns local form/control changes; localization owns translated copy;
existing Projects component/browser tests own coverage. No ownership movement.

## Draft File Responsibility Mapping
Draft editor: remove repeated form framing. Composer: remove footnote/help reference.
Locale catalogs: concise placeholder/dead-copy removal. Tests: assert behavior.
These existing files already fit each concern; final inventory follows.

## Reusable Owned Structures Check
N/A — no repeated new structures/logic; shared create/edit form already provides reuse.

## Shared Structure / Data Model Tightness Check
Existing props/types unchanged; no overlapping representations or optional fields.

## Final File Responsibility Mapping
| Path (repository relative) | Change | Concrete responsibility |
| --- | --- | --- |
| autobyteus-web/components/projects/ProjectTaskDraftEditor.vue | Modify | Remove subtitle/h2/help. Use neutral div instead of now-unlabelled section; remove its aria-labelledby. Remove inner mt-5 wrapper gap (unwrap or margin-free div). Keep field label/errors/actions/script unchanged. |
| autobyteus-web/components/projects/TaskDescriptionComposer.vue | Modify | Remove policy p; textarea aria-describedby becomes error ? 'task-page-error' : undefined. Retain all control/voice/event behavior. |
| autobyteus-web/localization/messages/en/projects.ts | Modify | “Describe the task…”; remove four obsolete keys above, preserve shared taskDetails. |
| autobyteus-web/localization/messages/zh-CN/projects.ts | Modify | “描述任务…”; matching key removals. |
| autobyteus-web/components/projects/__tests__/ProjectTaskDraftEditor.spec.ts | Add | Real template plus controlled draft/router dependencies: create/edit compact copy, labels/actions, blank error focus, preserved save/cancel behavior. |
| autobyteus-web/components/projects/__tests__/TaskDescriptionComposer.spec.ts | Modify | No policy; conditional error-only described-by; shortcuts/control preservation; retain voice completion coverage. |
| autobyteus-web/localization/messages/__tests__/projectsCatalog.spec.ts | Modify if needed | Concise locale placeholders, retained/removed key expectations. |
| autobyteus-web/tests/e2e/projects-feature-probe.mjs | Modify | Extend existing PT-E2E-005/006 with create/edit cleanup and ARIA/layout assertions and retained screenshots as appropriate; retain detail heading check. |
No routes, backend, stores, draft/client or generic voice files should change.

## Applied Patterns
Existing shared Vue form, localized catalogs and input events; no new pattern.

## Target Subsystem / Folder / File Mapping
Use final inventory above in existing concern directories. No move/rename/new
module. Tests colocated; browser assertions stay in existing E2E harness.

## Folder Boundary Check
Existing components/projects, localization/messages and tests/e2e are clear
presentation/content/validation boundaries. Low split risk; no new directories.

## Concrete Examples / Shape Guidance
Target: project context → New task/Edit task → card with Description (required)
→ existing composer → Cancel/Create task or Save changes. No inner heading,
paragraph or replacement spacer. Textarea retains for/id label association and
only references task-page-error when that element exists.

## Backward-Compatibility Rejection Log (Mandatory)
Rejected: verbose/compact flag or hidden legacy text; delete obsolete markup/keys.
N/A: data compatibility — no persistence/serialization change.

## Derived Layering
N/A — existing presentation → draft → store/context boundary remains intact.

## Change / Refactor Sequence
1. Delete redundant markup, heading-only gap and associated heading/help refs.
2. Remove dead translation keys; shorten placeholders in both locales.
3. Add/update focused tests; extend existing browser evidence without rewriting it.
4. Implementation self-check and rendered wide/narrow create/edit inspection;
   independent executable validation and delivery under configured routing.
No migration, temporary seam or compatibility branch.

## Key Tradeoffs
Retain Description (required), attachment hint and shortcut: they name the field
and expose non-obvious capabilities. Remove explanations rather than all text.
Retain editor size and existing styling rather than redesign the page.

## Risks
Dangling references or accidental deletion of shared taskDetails key: scoped
consumer inventory and DOM assertions protect them. Runtime evidence not yet
produced. Avoid claiming installed desktop/native microphone validation from
web tests. No material unresolved architectural uncertainty.

## Guidance For Implementation
Follow DESIGN.md and TESTING.md in this isolated worktree. Do not touch shared
checkout changes or user's app/data. Run focused web components, draft preservation
and Projects catalogs with --run, e.g.:
`pnpm -C autobyteus-web test:nuxt components/projects composables/projects localization/messages/__tests__/projectsCatalog.spec.ts --run`.
Browser/API owner should run the existing owned Projects probe, adding --voice-input
when appropriate, with fresh output directory and owned cleanup. Capture create/edit
wide/narrow rendering and DOM assertions; exact pixels are not a new design contract.
No desktop-shell changes: web evidence is renderer-equivalent, not packaged-app
proof. Full desktop product validation, when applicable, requires a current isolated
worktree build; delivery owns final user verification/release applicability.
No validation was run by Solution Designer; implementer and API/E2E own execution.
