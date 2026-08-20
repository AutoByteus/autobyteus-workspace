# Team Task Conversation UI — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements/UI behavior user-approved; complete aligned solution package ready for mandatory final user review; architecture review remains paused
- Investigation Goal: Establish the current task/message presentation and data paths, then define an implementation-aware conversational task UI without inventing backend state.
- Scope Classification: `Medium`
- Scope Classification Rationale: The visible issue is localized to the Team sidebar, but a correct presentation spans the task projection, list/detail components, lifecycle status derivation, live/hydrated parity, event-owned reference previews, localization, and accessibility.
- Scope Summary: Readable participant relationship, task status, assignment, submissions, reviews, revisions, interruption, event-owned references, and complete removal of task Technical details.
- Primary Questions Resolved:
  - Which components render Team messages and Team tasks? Resolved.
  - Which task lifecycle fields/events are already present? Resolved.
  - How are review results, send-back, resubmission, and acceptance represented? Resolved.
  - Can the target UI reuse existing Markdown/reference/split primitives? Yes.
  - Is backend or persisted-data change required? No.

## Request Context

The user reports that delegated tasks in the right-side Team tab are not presented clearly. They expect task content to read similarly to a message flow: delegator, assignee, task description, reference files, current status, submitted result, review result, send-back/revision, and subsequent revised work. They consider internal Agent/AgentTeam routing JSON low-value for the default view.

Reference screenshot:
`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b682f0f22551453eb08a112dd2e212f8/solution_designer_dccad26200694c37a92f8e56819c1654/context_files/ctx_4852ff4d2442__image.png`

The screenshot is 2048×1280 and shows the desktop app with the right-side `Team` tab selected. `Messages` is expanded, `Tasks` is collapsed, and both counts are zero for the selected offline Agent. This establishes the containing surface and current separate-section hierarchy, not a populated task state.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui`
- Current Branch: `codex/team-task-conversation-ui-design`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design`
- Bootstrap Base Branch: `origin/personal` at `1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-20; `origin/HEAD` resolves to `origin/personal`.
- Task Branch: `codex/team-task-conversation-ui-design`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative work and artifacts must remain in this dedicated worktree. The earlier architecture-review handoffs remain withdrawn. Requirements/UI behavior is approved, but the user requires a separate final review of the completed solution package. Do not review or implement until that final review occurs and a new handoff is sent.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/ui-ux-spec.md` | Intended task-conversation UI journeys, information hierarchy, states, interaction rules, and Markdown wireframes | Intended behavior | Requirements and design spec | REQ-001–REQ-015 / AC-001–AC-015 | `Refined` | User-approved 2026-08-20 | Keep aligned through review. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/task-timeline-ui-prototype.html` | Production-fidelity, interactive two-task rendering of the proposed task area | Intended behavior plus retained browser validation target | Requirements, UI/UX spec, and design spec | REQ-003–REQ-014 / AC-001–AC-014 | `Validated` | User-approved behavior basis 2026-08-20; final solution package review pending | Keep exactly aligned with the UI/UX contract; never use as production source. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-20 | Setup | `git fetch origin --prune`; `git worktree add -b codex/team-task-conversation-ui-design /Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design origin/personal` | Establish isolated, fresh task workspace | Dedicated branch created from refreshed tracked remote default `personal` at `1f5663d...` | No |
| 2026-08-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/design-principles.md` | Apply governing design workflow/principles | Requires behavior/path map, owner-led design, no compatibility paths, and explicit persisted-data decision | After approval, apply to design spec |
| 2026-08-20 | Doc | `autobyteus-web/AGENTS.md` | Read frontend repository guidance | Vue/Nuxt project; colocated tests; one-shot `--run` convention; no implementation in this phase | No |
| 2026-08-20 | Other | Supplied screenshot path above, inspected at original detail | Establish current visible layout and user context | Separate Messages and Tasks sections in desktop Team sidebar; empty selected perspective | No |
| 2026-08-20 | Other | User feedback in the current task conversation | Validate the proposed behavior against the desired interaction | Messages must not change at all. The current task description row, nested references, right-side content/preview, and message-like format are already good. Only submitted results and review/revision content need a display extension. | Resolved in revised UI/UX specification |
| 2026-08-20 | Other | User approval and follow-up clarification in the current task conversation | Lock the intended-behavior basis | User approved the nested task timeline: selectable task/result/review/revision/acceptance items on the left with item detail/reference preview on the right, minimal change from current UI. User then explicitly required complete removal of Technical details because ordinary users cannot use internal metadata. | Produce technical design and route for architecture review |
| 2026-08-20 | Other | User clarification after the initial architecture-review handoff | Remove any pane-placement ambiguity | User reiterated that the complete timeline must be visible in the left pane. Clicking a timeline item may update the right pane with that item's detail, but the right pane is not a timeline surface. | Tighten requirements, UI/UX, design ownership, and architecture-review handoff |
| 2026-08-20 | Other | User process correction after SR-002 handoff | Correct approval state and stop downstream review | User stated that they want to discuss and review the complete package—especially the UI—before architecture review. Specific UI directions remain confirmed, but the package as a whole is not approved. | Withdraw review, mark artifacts awaiting full user review, and do not resend without explicit approval |
| 2026-08-20 | Prototype | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/task-timeline-ui-prototype.html` opened in the local browser | Make the final task-area interaction concrete and compare it to production components | Iteratively removed invented visible Preview/Raw tabs, removed duplicated right-side reference cards, matched icon-only file-viewer controls, matched `248/168/360px` split dimensions, kept all timeline/reference navigation on the left, and kept the right pane content-or-file only | Retain as a reviewed UI contract supplement |
| 2026-08-20 | Other | User approval after prototype and exact behavior review | Lock requirements/UI behavior while preserving the user's final-review gate | User explicitly approved the requirements and authorized solution completion. User separately required reviewing the completed package before any architecture-review handoff. | Finish alignment and present package to user; do not hand off downstream yet |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Find section expansion/count/auto-open owner | Parent owns mutually exclusive Messages/Tasks expansion; Tasks auto-opens for retained or newly visible task signatures | Preserve behavior |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Establish message-style reference experience | Newest-first list, participants/direction, time, Markdown detail, message-owned references, resizable split | Reuse interaction language, not message model |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/team/TeamDelegatedTasksSection.vue` | Find task master/detail and selection owner | Resizable split already exists; selection keys are stable task entry keys; reselecting task clears reference | Preserve and extend |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/team/TeamDelegatedTaskNavigator.vue` | Inspect current task summary/reference/technical presentation | Description-only row, initial references, collapsed IDs, raw reconstructed JSON; no status/participants/update history | Replace primary presentation |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/team/TeamDelegatedTaskDetailPane.vue` | Inspect current detail | Only task description Markdown or selected reference preview is rendered | Extend the same boundary to render one selected task/result/review/interruption item or reference preview |
| 2026-08-20 | Code | `autobyteus-web/utils/teamDelegatedTaskEntries.ts`; `autobyteus-web/utils/teamDelegatedTaskTechnicalDetails.ts` | Inspect frontend task presentation model | Model drops task updates/delegator display and mixes runtime `AgentStatus` with task status label; reconstructed JSON duplicates canonical fields | Refactor presentation model after approval |
| 2026-08-20 | Code | `autobyteus-team-stream-contracts/src/team-task-message-dtos.ts` | Verify shared task DTO | Root record includes status/created/references and ordered discriminated submission/review/interruption updates; review links exact submission and decision | No contract extension needed |
| 2026-08-20 | Code | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Trace live task changes | Each `TASK_DELEGATION_EVENT` inserts/replaces the full task record reactively; snapshots replace complete tasks | Live UI can derive stable nested task/update display items |
| 2026-08-20 | Code | `autobyteus-web/graphql/queries/runHistoryQueries.ts`; `autobyteus-web/services/runHydration/taskDelegationGraphqlDtoProjection.ts` | Trace restored task data | GraphQL requests every update and reference field; strict projector reconstructs the same DTO union | Live/restored parity already available |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-projection-service.ts`; `.../task-delegation-reference-content-service.ts`; `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Verify update reference preview reachability | Existing task reference resolver searches root and all update references; one endpoint/viewer handles both | Reuse; no endpoint work |
| 2026-08-20 | Test | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Verify supported revision lifecycle | Supported product flow is delegate → submit → request revision → resubmit → accept with durable ordered updates | Timeline scenario is product-reachable |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.ts` | Verify semantic update invariants before designing presentation fallbacks | Validator requires revision comments, verifies every review references a known earlier submission, prevents duplicate update IDs, replays status, and permits null comment only for acceptance | No missing-revision-comment or unknown-result compatibility UI |
| 2026-08-20 | Data | `autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-004-settled-task/task_delegation_records.json` | Inspect representative persisted task record | Current persisted record carries accepted status plus submission and acceptance review with timestamps | No migration needed |
| 2026-08-20 | Test | `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTasksSection.spec.ts`; `TeamDelegatedTaskNavigator.spec.ts`; `TeamOverviewPanel.spec.ts`; `utils/__tests__/teamDelegatedTaskEntries.spec.ts` | Establish durable current UI expectations | Tests preserve collapse, auto-open, task/reference selection, no run IDs as ordinary summary copy, and current raw details behavior | Coverage will need targeted updates after implementation |
| 2026-08-20 | Doc | `tickets/done/agent-team-universal-task-delegation/task-delegation-interaction-contract.md` | Confirm task/message semantics | Ordinary messages compose with tasks but do not change task status; formal result/review transitions are task-owned | Keep feeds separate |
| 2026-08-20 | Doc | `tickets/done/task-panel-message-style-slider/requirements.md` | Confirm recent task/message interaction decisions | Task panel already intentionally matches message split/reference behavior; reference return is task-row selection, not back button | Preserve |
| 2026-08-20 | Data | Current requested TeamRun's `task_delegation_records.json`, `team_communication_messages.json`, and `team_run_execution_tree.json` under `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b682f0f22551453eb08a112dd2e212f8/` | Confirm screenshot/run state | Current run has zero task/message records and no task executions; screenshot empty state is consistent | Use code/tests/fixture for populated states |
| 2026-08-20 | Command | `test -d autobyteus-web/node_modules`; `test -d node_modules` | Determine whether current tests can run without setup | Dependencies are not installed in the dedicated worktree/root | No runtime test required for requirements design; downstream setup needed |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User focuses an exact Agent execution and opens Team → Tasks | `TeamOverviewPanel` focused ID → `deriveDelegatedTaskEntries` → `TeamDelegatedTaskNavigator` | Only tasks related to exact delegator/target/task-Team membership appear; row shows description and initial references, not lifecycle status/actors | Components/util/tests above |
| BEH-002 | User | User selects a visible task | `TeamDelegatedTasksSection.selectTask` → selected entry → `TeamDelegatedTaskDetailPane` → `MarkdownRenderer` | Right detail shows only original description; no result/review/revision history | `TeamDelegatedTaskDetailPane.vue` |
| BEH-003 | System | Supported task tools transition a task; live event or historical hydration supplies updated record | Server task service → current DTO/GraphQL or `TASK_DELEGATION_EVENT` → `TeamExecutionViewState` full record → `deriveDelegatedTaskEntries` | Authoritative updates reach frontend state but are discarded by task presentation projection | Contract, service integration test, state, hydration projector, entry util |
| BEH-004 | User | User clicks an initial task reference | Navigator emits reference selection → `TeamTaskReferenceViewer` → existing REST endpoint → server resolves reference | File preview loads; clicking task row restores detail; server could also resolve update refs but UI never exposes them | Section, viewer, reference service/projector, component tests |
| BEH-005 | User | User expands current Technical details in a task row | Navigator → `buildDelegatedTaskTechnicalRows/Input` | IDs plus raw JSON of recipient/description/reference paths appear below row; this competes with missing human lifecycle content | Navigator and technical-details util |
| BEH-006 | Contract | Ordinary `send_message_to` and formal task tools are used according to task interaction contract | Message append → Messages UI; task tool transition → task record/Tasks UI | Messages do not change task status; task lifecycle must not be inferred from message text | Approved interaction contract and separate current panels |

## Design Health Assessment Evidence

- Change posture: `Behavior Change`
- Candidate root cause classification: `Shared Structure Looseness`
- Refactor posture evidence summary: The backend/shared DTO is already semantically tight. The frontend `DelegatedTaskEntry` loses lifecycle data, overlaps task and runtime status under ambiguous fields, and reconstructs duplicate JSON solely for display. Refactoring the frontend presentation projection is needed now; backend owners remain healthy.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `team-task-message-dtos.ts` | One authoritative discriminated lifecycle model already exists | Do not add a parallel task-history model or backend field | Map it faithfully |
| `teamDelegatedTaskEntries.ts` | Drops `updates` and delegator display, exposes `AgentStatus` plus formatted task status | Current view model is too loose for the requested semantics | Replace/tighten after approval |
| `TeamDelegatedTaskNavigator.vue` | Raw JSON receives UI space while lifecycle facts do not | Presentation hierarchy is inverted | Remove JSON from primary flow |
| `TeamDelegatedTaskDetailPane.vue` | Detail accepts a loose entry and renders one string | Detail cannot render a selected result/review item | Extend it with a selected task-lifecycle item presentation boundary |
| Existing live/hydration paths | Both supply the complete record | Backend/contract refactor is unnecessary and would be misplaced | Frontend-only design |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team Messages/Tasks accordion, counts, auto-open | Behavior is already correct | Preserve; count continues using derived task perspective |
| `.../TeamCommunicationPanel.vue` | Message perspective list/detail/reference UI | User explicitly confirms this is already good | No production changes; Tasks may follow its interaction language without refactoring Messages |
| `.../TeamDelegatedTasksSection.vue` | Task split selection and reference selection | Correct orchestration owner; already resizable | Continue to own selected task/reference state |
| `.../TeamDelegatedTaskNavigator.vue` | Task list rows and technical details | Current task/reference rows are approved; result/review rows are missing; raw JSON is overemphasized | Preserve task/reference rows and add nested selectable lifecycle rows |
| `.../TeamDelegatedTaskDetailPane.vue` | Description or reference preview | Natural detail boundary | Render selected task/update item vs selected reference preview |
| `.../TeamTaskReferenceViewer.vue` | Task-owned reference content URL/viewer | Already supports any task reference ID | Reuse unchanged unless prop typing tightens |
| `autobyteus-web/utils/teamDelegatedTaskEntries.ts` | Focus filtering and presentational entry mapping | Correct capability area, loose output model | Refactor/rename toward task-conversation projection |
| `.../teamDelegatedTaskTechnicalDetails.ts` | Technical row + raw JSON construction | Entire concern is explicitly rejected by the user | Delete the file and all callers/tests/localization used only by it |
| `autobyteus-team-stream-contracts/src/team-task-message-dtos.ts` | Shared strict task DTO | Complete for requested UI | No change |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Authoritative reactive current Team execution view | Full record replacement already supplies live changes | No lifecycle duplication in components |
| `autobyteus-web/services/runHydration/taskDelegationGraphqlDtoProjection.ts` | Strict history GraphQL → task DTO | Restored updates/references already complete | No change |
| English/Chinese workspace catalogs | Team task labels | Only current generic/technical labels exist | Add human lifecycle/status/fallback labels |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-20 | Probe | Original-detail visual inspection through local image viewer | Screenshot matches current `TeamOverviewPanel` empty state and right-sidebar proportions | Markdown wireframe targets the real container width/hierarchy |
| 2026-08-20 | Data | Parsed current TeamRun JSON files with Python `json.loads` | Zero current tasks/messages; no populated visual state to reproduce from this run | Use supported integration lifecycle, contract, fixtures, and unit view fixtures as populated evidence |
| 2026-08-20 | Setup | Checked dependency directories | No `node_modules`; current repository unit-test execution would require installation | No repository production-test execution performed during design investigation; interactive prototype validation is recorded separately below |
| 2026-08-20 | Browser probe | Interactive prototype state traversal with in-page assertions | 40/40 task-area click/state assertions passed across two tasks: root/update detail, participant direction, exact result labels, references, owner return, icon-only raw/preview, maximize/Escape, Tasks collapse/reopen, latest update time, and no right-side duplicate reference rows | The approved interaction is internally coherent and precisely captured for implementation/review |
| 2026-08-20 | Browser probe | Pointer-event divider boundary exercise | Initial `248px`, minimum `168px`, maximum `360px`, and restored `248px` all matched current task split policy | Prototype and UI/UX spec use the existing production width contract |
| 2026-08-20 | Final browser revalidation | Fresh local-file tab plus 51 DOM/click assertions and a separate pointer-divider exercise | 51/51 interaction assertions passed with no failures across initial selection, both tasks, all represented update rows, left-owned references, right item/file modes, icon-only raw/preview, maximize/Escape, owner return, Tasks collapse/reopen retention, participant direction, labels/statuses, and no right reference duplication; divider again passed `248/168/360/248px` | The final SR-005 package is validated against the current prototype rather than relying only on an earlier browser session |
| 2026-08-20 | Syntax/static check | Extracted prototype `<script>` and ran `node --check`; checked prototype/spec invariants and trailing whitespace | JavaScript syntax passed; no visible text-tab markup or right-side reference-card markup remains; artifact checks passed | Prototype is safe to use as a self-contained review supplement; this is not production test evidence |

## External / Public Source Findings

N/A. This is a repository-local product behavior change; no external contract or time-sensitive reference is needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No service needed for source/contract investigation. Populated task states are represented by existing unit fixtures and the server lifecycle integration test.
- Required config, feature flags, env vars, or accounts: None for design.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Remote refresh and dedicated worktree creation recorded above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **The requested information already exists.** There is no data gap for task description, initial references, lifecycle status, submissions, reviews, review decisions/comments, interruption reason, update references, or timestamps.
2. **The loss occurs at the frontend presentation projection.** `deriveDelegatedTaskEntries` intentionally narrows task history to description/initial references and reconstructs raw technical input; components never receive selectable result/review items.
3. **Live and history paths are aligned.** A live event replaces the full record, while GraphQL hydration rebuilds the same DTO. One presentation projector can serve both.
4. **Task references are already task-owned across all update types.** The server reference resolver enumerates root and update references, so exposing update attachments requires no new content API.
5. **Messages are a visual precedent, not an implementation target.** The user explicitly requires zero Messages changes. The proposed task interaction contract also says ordinary messages have no lifecycle effect. Tasks may adopt the same summary/detail readability only inside task-owned components.
6. **Participant naming has a truthful boundary.** The delegator's readable address can be resolved from the execution view. The assignee's canonical recipient address and target kind are known. For task-Team submissions, the update does not identify one member; the UI must attribute to the Team rather than invent a sender.
7. **Task status needs a presentation refinement.** `request_revision` moves authoritative status back to `active`; a visible `Revision requested` badge can be derived from the latest review update while preserving the underlying state.
8. **Current raw JSON is redundant.** It repeats the task description and reference paths already represented by typed task fields and adds routing details that are not normal reading content.
9. **Current task-group order is stable source order, not message order.** `buildTaskHistoryRows()` maps the task-record array without sorting; live task changes replace an existing record at its current index and append a newly observed task. The task redesign must preserve that behavior rather than copying Messages' newest-first ordering.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Per-RootTeamRun `task_delegation_records.json`; an array of strict current-schema task records. Representative accepted fixture contains root facts plus ordered submission/review updates. Actual per-run volume varies and is expected to be small relative to conversation traces.
- Relevant code-model, serialization, semantic, or physical-store change: None proposed. Only frontend projection/presentation changes.
- Normal readers and writers, including unknown/extra-field behavior: Server current-schema strict store/service writes; GraphQL and live stream project the full current DTO; frontend strict projectors/read state.
- Representative direct-read or compatibility evidence: Server fixture and GraphQL DTO projection demonstrate existing records already contain needed fields.
- Required semantics and invariants preserved by direct use: `Yes` — update order, review-to-submission identity, statuses, timestamps, and references remain unchanged.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No new persisted fields or exposure beyond already authorized focused Team task records; exact IDs remain de-emphasized.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No benefit; migration would add needless I/O/risk for a pure presentation change.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- The task lifecycle record is authoritative; UI presentation may derive labels/ordinals but not new state.
- Review links must use `reviewed_submission_id`, not adjacency assumptions.
- Event order comes from the validated `updates` array.
- Task-group order comes from `listTaskHistoryRows()` and remains unchanged; only updates within each group use the record's durable order.
- Task Team submissions cannot truthfully name a specific member from current DTO data.
- Existing split, task selection, initial reference placement/selection, reference viewer, focused perspective, and Tasks auto-open must remain. Messages production code and behavior are out of scope.
- No backward-compatibility UI: replace the description-only/raw-JSON presentation rather than retaining two modes.
- No new backend/API/persistence dependency.

## Open Unknowns / Risks

- Approved behavior: the complete timeline and all reference navigation are permanently owned by the left navigator; the right pane is restricted to one selected item detail or the existing reference viewer.
- Approved behavior: remove Technical details completely; no diagnostic task metadata remains in the UI.
- Long task groups could increase navigator height. Ordinary scrolling is proportionate; collapse/pagination/virtualization is deferred unless evidence changes scope.
- Dependencies are not installed in this dedicated worktree, so current component tests were read but not executed during this stage.

## Notes For Architecture Reviewer

Do not review this package yet. Requirements/UI behavior is approved, but the user requires a final review of the completed aligned solution package before architecture review. Wait for a fresh, explicit solution-designer handoff after that user review; disregard the withdrawn SR-001/SR-002 handoffs.
