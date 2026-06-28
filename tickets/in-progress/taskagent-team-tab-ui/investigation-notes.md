# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Reworked after implementation requirement gaps and user UX clarification; requirements/design now target the final cleaner Messages-like Active Tasks UX, Activity-style left chevrons for both Messages and Active Tasks section headers, and frozen existing Messages content/reference UX.
- Investigation Goal: Identify current Team tab / Activity / Messages UI paths; verify delegated-task metadata flow; define final task reference UX; record architecture evidence for a spine-first redesign; resolve the Messages no-visible-change invariant.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The visible UI surface being redesigned is localized to Team section headers and Active Tasks in the right-side Team tab, but task references require backend event payload/content-route work and frontend projection/model/viewer work. Messages content/reference remains baseline only.
- Scope Summary: Improve Team section header behavior, redesign Active Tasks as Messages-like master/detail, remove visible Active Tasks task-kind labels, propagate task reference metadata from backend records to frontend entries, preview task refs through task-owned route/viewer, preserve Messages content/reference UI exactly, and require Electron-backed visual validation.
- Primary Questions Resolved:
  - Team tab entrypoint: `RightSideTabs.vue` -> `TeamOverviewPanel.vue`.
  - Comparator for disclosure/section behavior: Activity tab `ProgressPanel.vue`, `ActivityFeed.vue`, `TodoListPanel.vue`.
  - Desired initial Team state: Messages open with Activity-style left chevron and unchanged content/reference UI; Active Tasks collapsed with Activity-style left chevron.
  - Desired count wording: `N tasks`, not `N Active`.
  - Final reference UX: task reference rows appear under the selected task in the left navigator; the right detail does not duplicate refs by default; clicking a task reference switches the whole right pane to file preview, like Messages. Messages content/reference UI must not change visibly.
  - Authoritative task metadata source: backend `TaskDelegationRecord` / normalized delegate-task input emitted through `TASK_DELEGATION_EVENT`.
  - Approval semantics: Active Tasks never renders Approve/Deny; Activity remains approval surface.
  - Visual validation path: Electron-backed dev UI using `BUILD_TARGET=electron pnpm -C autobyteus-web dev`, with embedded server at `http://127.0.0.1:29695`.

## Request Context

The user reported that TaskAgent and TaskAgent-team active work appears under the Team tab, but the UI is poor. The original concrete defect included Team section disclosure/chevron placement: Messages and Active Tasks section headers should match the Activity tab pattern, where the disclosure icon appears before the section title rather than at the far right. The later Messages freeze clarification applies to Messages content/reference UI, not the section header chevron.

During implementation feedback, a requirement gap was identified: delegated task reference files and original task inputs were not modeled in the Active Tasks data path. The user emphasized the existing Messages UI as the desired UX: message reference files appear as clean file rows on the left, and clicking one turns the right pane into the file preview. After design discussion, the final UX is explicitly the cleaner Messages-like version for Active Tasks: task references live under the selected task in the left navigator and are not repeated in the right task detail by default. A later gap clarified that Messages content/reference UI is the approved baseline and must stay unchanged from the user's perspective; a final clarification confirmed the Messages header left chevron is still valid.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui`.
- Current Branch: `codex/taskagent-team-tab-ui`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-28 before worktree creation; `origin/personal` resolved to `5bd29cfb7b5e36dd712026ce7a5158bf10879cc3`.
- Task Branch: `codex/taskagent-team-tab-ui`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal` / `origin/personal` unless downstream delivery records a different target.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work only in the dedicated worktree above. The original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was on `personal` and had unrelated untracked content; it was not reused.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-28 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git branch --show-current; git symbolic-ref --short refs/remotes/origin/HEAD` | Bootstrap environment discovery | Shared checkout was on `personal`, not the dedicated ticket worktree. Remote default resolved to `origin/personal`. | No |
| 2026-06-28 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh remote and check reusable worktrees | Fetch succeeded; no existing matching task worktree was present. | No |
| 2026-06-28 | Command | `git worktree add -b codex/taskagent-team-tab-ui /Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui origin/personal` | Create mandatory dedicated task worktree | Created the ticket worktree/branch. | No |
| 2026-06-28 | Command | Read `solution-designer/SKILL.md`, `design-principles.md`, templates, and `references/design-examples.md` | Required design workflow and refreshed rework guidance | Design must be spine-first, ownership-led, avoid boundary bypass, avoid dual paths, and use concrete examples. | Applied in rewritten design spec. |
| 2026-06-28 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Find right-side tab entrypoint | `teamMembers` tab renders `TeamOverviewPanel`; `progress` tab renders `ProgressPanel`. | No |
| 2026-06-28 | Code | `autobyteus-web/components/progress/ProgressPanel.vue` | Inspect Activity parent section owner | Parent owns `expandedSection`, initializes to `activity`, and passes collapsed state to child panels. | Team tab should mirror this ownership. |
| 2026-06-28 | Code | `autobyteus-web/components/progress/ActivityFeed.vue` | Inspect Activity header comparator | Header has leading SVG disclosure icon and count at right. | Messages and Active Tasks section headers should match; Messages content remains baseline. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/agent/TodoListPanel.vue` | Inspect second Activity header pattern | Same leading disclosure icon and right count. | Messages and Active Tasks section headers should match; Messages content remains baseline. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Inspect Team tab composition | Team renders Messages and Active Tasks. Prior path had parent Messages expansion but not Active Tasks expansion ownership. | Parent should own both sections while preserving Messages visible UI. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Inspect Active Tasks section behavior | Prior path had local `sectionExpanded`, auto-expansion on active count, trailing chevron. | Convert to controlled section; keep selected task/reference state only. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Inspect active task row behavior | Rows have TaskAgent/TaskTeam badges, details expansion, focus/member selection, and approval controls. No task refs/arguments in props. | Replace row-expansion UI with master/detail pieces; remove Active Tasks approval controls. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Inspect Messages UX | Left message list renders nested reference rows; selecting a reference switches right pane to `TeamCommunicationReferenceViewer`; message body is Markdown-rendered. | Active Tasks should copy interaction semantics, but Messages visible UI must not change. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Inspect file preview behavior | Fetches content through message route; renders `FileViewer` read-only; supports preview/raw, maximize/restore, loading/error/deleted states. | Extract/genericize viewer shell only if the visible Messages preview remains identical; keep route wrappers owner-specific. |
| 2026-06-28 | Code | `autobyteus-web/utils/teamCommunication/referenceFilePresentation.ts` | Inspect file presentation helper | Filename/icon/type behavior is generic in concept though message-typed today. | Move/generalize only if Messages rows remain identical; otherwise adapt task refs separately. |
| 2026-06-28 | Code | `autobyteus-web/stores/teamCommunicationStore.ts`; `teamCommunicationTypes.ts` | Inspect reference normalization | Message references normalize to `referenceId`, `path`, `type`, timestamps; refs de-dupe by path. | Reuse shape/presentation, not store ownership. |
| 2026-06-28 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` | Inspect active task entries | `ActiveTaskEntry` lacks `teamRunId`, `taskReferenceFiles`, `taskArguments`; maps only identity/status/body/target/run/member data. | Extend. |
| 2026-06-28 | Code | `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Inspect task event projection | `TaskDelegationProjectionDetails` extracts task id/label/description/target/status; no refs/arguments. | Extend extraction and normalizers. |
| 2026-06-28 | Code | `autobyteus-web/types/agent/AgentTeamContext.ts` | Inspect transient task node fields | `TeamMemberNodeBase` has task fields but no refs/arguments. | Extend contract. |
| 2026-06-28 | Code | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Inspect frontend protocol payload types | Task delegation event payload does not type refs/arguments; communication messages type reference files separately. | Add task-specific payload fields. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Inspect backend task record/input | `TaskDelegationTaskInput.reference_files` exists; `TaskDelegationRecord.referenceFiles` stores normalized refs. | Event publisher should emit them. |
| 2026-06-28 | Code | `task-delegation-input-resolver.ts`; `task-delegation-tool-input-parsers.ts`; `task-delegation-tool-parameter-schemas.ts` | Inspect delegate-task input schema | Current input is strict: `target`, `description`, `reference_files`. Reference files are strings but may be invalid/unreadable paths. | Route/viewer must handle unavailable/error states. |
| 2026-06-28 | Code | `task-delegation-event-publisher.ts` | Inspect backend task events | Events include task identity/body/status/target but omit `referenceFiles` and original input snapshot. | Extend payload builder. |
| 2026-06-28 | Code | `team-run-event-websocket-message-mapper.ts` | Inspect server websocket mapper | Additional payload fields should pass through because payload is serialized. | No major mapper redesign expected. |
| 2026-06-28 | Code | `team-communication-content-service.ts`; `api/rest/team-communication.ts` | Inspect message reference content route | Message refs resolve by teamRunId/messageId/referenceId and serve content with clear 400/403/404 behavior. | Create task-owned equivalent route. |
| 2026-06-28 | Code | `task-delegation-run-registry.ts`; `task-delegation-service.ts` | Inspect task service access | Active task service can be located by teamRunId; no narrow task reference resolver exists. | Add resolver method/route. |
| 2026-06-28 | Code | `autobyteus-web/docs/agent_execution_architecture.md` | Confirm delegated-task UI boundary | Docs place delegated task visibility in right-side Team tab Active Tasks; center active-task strip should not return. | Preserve. |
| 2026-06-28 | Code/Doc | `autobyteus-web/README.md`; `docs/electron_packaging.md`; `electron/main.ts`; `electron/server/*.ts`; `nuxt.config.ts`; `modules/electron/index.ts` | Determine visual validation environment | Electron dev starts embedded server at `http://127.0.0.1:29695`; expected startup is `BUILD_TARGET=electron pnpm -C autobyteus-web dev` after server prep if needed. | Implementation must record evidence. |
| 2026-06-28 | Test | `TeamOverviewPanel.spec.ts` | Existing Team tab tests | Tests cover existing render/count behavior; need updates for parent section state and header placement. | Yes |
| 2026-06-28 | Test | `TeamActiveTasksSection.spec.ts` | Existing active task tests | Tests cover rows/details/approvals/focus/empty state; need replacement for master/detail, refs, no approvals. | Yes |
| 2026-06-28 | Test | `TeamCommunicationPanel.spec.ts`; `TeamCommunicationReferenceViewer.spec.ts` | Existing message reference tests | Cover reference rows, selection, viewer fetch/content/error/maximize behavior. | Must remain passing. |
| 2026-06-28 | Artifact | `requirement-gap-task-reference-files.md` | Read implementation gap report | Confirms approved design omitted task refs/arguments; recommends task-oriented data path. | Resolved in rework. |
| 2026-06-28 | Artifact | `implementation-handoff.md` | Understand pre-gap implementation state | Pre-gap UI polish exists but is superseded by final master/detail/reference rework. | Downstream rework needed. |
| 2026-06-28 | User decision | Conversation on final UX | Resolve reference placement | User accepted cleaner final version: refs under selected task left navigator; clicking a ref shows file content in right pane like Messages. | Applied. |
| 2026-06-28 | Requirement gap | `requirement-gap-messages-visible-ux-unchanged.md` and user clarification | Resolve Messages invariant | User clarified Messages content/reference UX is excellent; internal reuse/refactor is fine, but content/reference output must not change. Later clarification confirms Messages header left chevron remains required. | Requirements/design updated. |
| 2026-06-28 | Requirement gap | `requirement-gap-active-task-labels-and-messages-chevron.md` and user clarification | Resolve task labels and Messages chevron | Remove visible `Task Agent` / `Task Team` labels from Active Tasks primary UI; use generic `Focus`; keep Messages header left chevron. | Requirements/design updated. |

## Current Behavior / Current Flow

- Current entrypoint: `RightSideTabs.vue` mounts `TeamOverviewPanel` for the Team tab.
- Team overview current path: `TeamOverviewPanel` renders Messages and Active Tasks.
- Activity comparator path: `RightSideTabs` -> `ProgressPanel` -> `TodoListPanel` / `ActivityFeed` with parent-owned section state and leading disclosure icons; comparator applies to Messages and Active Tasks section headers.
- Messages current path and content/reference frozen baseline with header exception:
  - `TeamCommunicationPanel` queries `teamCommunicationStore` for focused member perspective.
  - It auto-selects the first/newest message.
  - It renders message summaries and nested reference rows in the left list.
  - Selecting a reference changes the right pane from message body to `TeamCommunicationReferenceViewer`.
  - List, nested reference rows, detail pane, reference preview controls/layout/states, spacing/classes, and selected states must remain unchanged from the user's perspective.
  - Section header chevron moves to the left, Activity-style.
- Active Tasks current/projection path:
  - Team stream `TASK_DELEGATION_EVENT` -> `teamTaskExecutionProjection.ts` -> transient `TeamMemberNodeBase` task fields -> `deriveActiveTaskEntries` -> Active Tasks UI.
  - The path currently drops task refs/arguments.
- Backend current task-delegation path:
  - `delegate_task` parser/resolver accepts `target`, `description`, `reference_files`.
  - `TaskDelegationRecord` stores `referenceFiles`.
  - `TaskDelegationEventPublisher` omits reference files and original delegation data from emitted events.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): UI behavior change / UI quality bug fix with bounded task metadata feature.
- Candidate root cause classification: Missing invariant for Team section accordion/header pattern; Shared Structure Looseness for task metadata projection; Boundary/Ownership Issue if task refs are sourced from messages; Legacy/Compatibility Pressure if reuse changes Messages content/reference visibly.
- Refactor posture evidence summary: Bounded refactor needed now.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ProgressPanel.vue` | Parent owns active section. | Team tab should move section ownership to `TeamOverviewPanel`. | Implement. |
| `ActivityFeed.vue` / `TodoListPanel.vue` | Leading SVG disclosure icon. | Messages and Active Tasks headers should use the Activity-style affordance. | Implement for section headers only. |
| `TeamCommunicationPanel.vue` | Reference rows are left-list navigation; right pane switches to file preview. | Active Tasks should follow this exact interaction shape. | Implement. |
| `TeamActiveTasksSection.vue` | Local expansion and row-details model. | Replace with controlled section plus internal task/reference selection state. | Implement. |
| `TaskDelegationRecord` | Stores `referenceFiles`. | Backend already owns task refs. | Emit. |
| `TaskDelegationEventPublisher` | Does not emit refs/arguments. | Event payload contract is too loose/incomplete. | Extend. |
| `teamTaskExecutionProjection.ts` / `AgentTeamContext.ts` / `teamActiveTaskEntries.ts` | No refs/arguments fields. | Shared frontend task structures are incomplete. | Extend. |
| `TeamCommunicationReferenceViewer.vue` | Route-specific wrapper around reusable viewer behavior. | Extract/genericize shell, keep wrappers owner-specific. | Implement carefully. |
| `teamActiveTaskApprovals.ts` | Builds task approval targets. | Active Tasks should stop approval actions rather than duplicate boundary logic. | Remove UI approval controls. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right-side tab shell | Thin tab mount wrapper. | No Team section state here. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab composition | Current/previous owner of Messages state only. | Must own `expandedSection` for Messages/Active Tasks. |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Messages list/detail/reference UX | Correct UX model for refs and frozen content/reference baseline. | Preserve exact content/reference behavior; reuse interaction concept only. |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Message reference route wrapper/viewer shell | URL construction is message-specific; viewer behavior is reusable underneath. | Extract route-independent shell only if visible Messages preview is unchanged; otherwise keep task wrapper separate. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Active task section/list | Needs controlled collapsed prop, task/ref selection, split layout. | Main Active Tasks UI owner. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Existing active task row/details | Row expansion/approval controls conflict with final UX. | Replace/split into navigator item and detail pane as needed. |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Active task entry mapper | Missing refs/arguments/teamRunId. | Extend output model. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Team context/transient node model | Missing task refs/arguments. | Extend task fields. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Task event projection | Extracts partial task metadata only. | Normalize refs/arguments from task events. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Protocol payload types | Task payload lacks refs/arguments fields. | Add typed fields. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Backend task record/input | Source of refs and normalized input. | Authoritative task metadata source. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Task delegation event payload builder | Omits refs/arguments. | Extend. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Active task service | No task reference resolver today. | Add narrow resolver/content API. |
| `autobyteus-server-ts/src/api/rest/team-communication.ts` | Message reference content route | Good pattern for file content route. | Create task-owned equivalent. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-28 | Static probe | `rg -n "shimmer|Skeleton|TaskAgent|team tab|Activity"` | No relevant Team-tab shimmer/skeleton path found; issue aligns with chevron/disclosure placement. | Treat "shivering" as disclosure/chevron defect unless live validation reveals more. |
| 2026-06-28 | Code path probe | Read Electron/Nuxt startup files | Electron dev path starts embedded server at `http://127.0.0.1:29695`. | Implementation visual validation must use Electron-backed app. |
| 2026-06-28 | User review | Screenshot and design discussion | Messages shows reference rows on left; right pane shows selected message or selected reference. User agreed final Active Tasks should mirror this: refs left, file content right on click. | Final UX locked. |

## External / Public Source Findings

No external/public sources were needed. The task depends on repository-local UI/runtime behavior and user UX direction.

## Reproduction / Environment Setup

- Required package: `autobyteus-web`.
- Visual validation path: prepare server if needed with `pnpm -C autobyteus-web prepare-server`, then run `BUILD_TARGET=electron pnpm -C autobyteus-web dev`.
- Electron embedded server endpoint expected from code: `http://127.0.0.1:29695`.
- Implementation should inspect a live or fixture TaskAgent/TaskTeam active task with `reference_files` if possible.

## Findings From Code / Docs / Data / Logs

- The codebase already has a strong Messages reference UX; Active Tasks should not invent a new reference interaction, and Messages itself must not change visibly.
- The correct task reference data source exists in backend records but not in event payload/projection.
- The final Active Tasks UI should be a split layout, not expanding rows.
- Right task detail should stay clean: compact header, task body, TaskTeam member focus rows if applicable, optional Technical details.
- Reference rows belong under the selected task in the left navigator and drive the right-pane file preview.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatible dual UI modes should be kept for old Active Tasks row expansion behavior.
- Preserve exact existing Messages content/reference behavior while extracting/genericizing any viewer pieces; if exact preservation is uncertain, do not alter Messages content/reference code.
- Do not use message route IDs for task references.
- Do not bypass `TaskDelegationRecord` / task events by scraping messages or raw tool calls.
- Do not duplicate approval target construction/action submission in Active Tasks.

## Open Unknowns / Risks

- Live reference-bearing delegated tasks may be hard to reproduce locally.
- Reference files may be deleted, invalid, or unavailable at preview time.
- Extracting the reference viewer can regress Messages if wrapper boundaries or visible output are not preserved.
- Visual acceptability needs real inspection because the user explicitly rejected static-only UI changes.

## Notes For Architect Reviewer

- The final UX decision is locked by user discussion: references under selected task in the left navigator; clicking a reference switches the whole right pane to preview; no right-detail reference duplication by default.
- Review should focus on ownership boundaries: Team section state/header owner, Messages content/reference no-change invariant, task metadata source, task vs message reference route wrappers, task-kind label removal, and removal of Active Tasks approval controls.
- The design should be assessed against the Authoritative Boundary Rule: frontend UI must depend on task delegation event/projection for task metadata, not on both task projection and message internals.
