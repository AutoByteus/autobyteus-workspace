# Team Task Results And Reviews — Design Spec

> **Review state:** Requirements/UI behavior is user-approved. The aligned technical design is complete and ready for the user's required final package review. It must not be sent to architecture review until the user explicitly instructs that handoff.

## Current-State Read

The desktop/web Team sidebar already has the approved interaction foundation:

- `TeamOverviewPanel.vue` keeps Messages and Tasks as separate accordion sections and auto-opens Tasks when a related task appears.
- `TeamDelegatedTasksSection.vue` owns the resizable task navigator/detail split and the selected task/reference state.
- `TeamDelegatedTaskNavigator.vue` renders one description-first task row plus its initial reference rows.
- `TeamDelegatedTaskDetailPane.vue` shows either the selected task description through `MarkdownRenderer` or the selected file through `TeamTaskReferenceViewer`.

The authoritative current task record is not description-only. `TaskDelegationRecordDto` contains ordered `submission`, `review`, and `interruption` updates, including result/review content, decision, timestamps, exact review-to-submission linkage, and update-owned references. Both the live `TASK_DELEGATION_EVENT` path and historical GraphQL hydration place that complete record in `TeamExecutionViewState`.

The loss occurs in `utils/teamDelegatedTaskEntries.ts`: `deriveDelegatedTaskEntries` projects only the root description and references, mixes runtime Agent status with task lifecycle status, reconstructs duplicate raw task arguments, and drops every lifecycle update. The navigator then devotes space to a `Technical details` disclosure rather than user-meaningful lifecycle content.

The proposed change must respect three confirmed constraints:

1. Messages production code and behavior are outside scope and must not change.
2. The existing task-row/reference/detail interaction is the baseline, not a legacy flow to replace.
3. Task lifecycle state remains owned by the current record; the frontend derives only presentation labels, ordinals, participants, and stable item selection.

Evidence is recorded in [investigation-notes.md](./investigation-notes.md), especially BEH-001–BEH-006 and the source log.

## Intended Change

Extend each current task entry into a task-owned lifecycle thread in the left navigator:

- the existing task description row remains the root item;
- original references remain beneath the task row;
- each submission/review/interruption becomes one nested, selectable lifecycle row in authoritative order;
- each update's references appear beneath that update row;
- task groups preserve the existing `listTaskHistoryRows()` order while each group's updates preserve authoritative record order;
- selecting any task/update row shows that item's full Markdown content and actor/timestamp context in the existing right pane;
- selecting an item-owned reference uses the existing task reference viewer, and reselecting its owner returns to that item's content;
- reference rows exist only beneath their owning item in the left navigator; task/update detail never repeats a right-side reference section;
- the task root shows the derived user-meaningful status;
- accepted tasks end with a visible accepted/done lifecycle row;
- the complete Technical details UI and its construction utility are removed.

Pane ownership is a hard layout invariant: `TeamDelegatedTaskNavigator` renders the entire timeline and the only reference navigation rows on the left, while `TeamDelegatedTaskDetailPane` renders exactly one selected item's detail or one reference viewer on the right. Selection changes detail content only. The detail path must not render, own, duplicate, or relocate the lifecycle list or reference navigation.

This is a frontend task-presentation refactor over the existing current-schema record. There is no message, backend, GraphQL, shared-contract, route, or persisted-data change.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Proposed Requirement / Intent And Acceptance-Criteria IDs | Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Proposed Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Preserve task row/references; add status and nested lifecycle rows. REQ-002–REQ-004; AC-001–AC-003 | User focuses an exact Team Agent and opens Tasks | Investigation BEH-001; `TeamOverviewPanel`, `TeamDelegatedTaskNavigator`, `teamDelegatedTaskEntries` | Same focused task perspective and root interaction; lifecycle rows and status become visible | `TeamExecutionViewState -> deriveDelegatedTaskEntries -> TeamDelegatedTaskNavigator`; DS-001, DS-004 |
| BEH-002 | User | Keep the complete timeline on the left; select task/result/review and show only that item's content on the right. REQ-005–REQ-007; AC-004–AC-006 | User activates one left-navigator lifecycle row | Investigation BEH-002; current section/detail selection | Generalize selected task into selected lifecycle item while preserving root task behavior and strict left-navigation/right-detail ownership | `Navigator -> Section selection owner -> DetailPane -> ItemDetail -> MarkdownRenderer`; DS-002, DS-005 |
| BEH-003 | System | Render every durable update exactly once and in order without changing task-group order. REQ-004, REQ-006–REQ-010; AC-003, AC-005–AC-008 | Supported task lifecycle or restored current-schema record | Investigation BEH-003; task contract, integration test, state reducer, GraphQL projector | Preserve view-supplied task order; project assignment plus ordered discriminated updates with stable keys, result ordinals, review linkage, and actor direction | `Task record -> lifecycle-item projection -> nested rows/detail`; DS-001, DS-004, DS-006 |
| BEH-004 | User | Keep initial refs; expose update refs under owner and reuse preview. REQ-009, REQ-011; AC-007–AC-009 | User selects a task/update reference | Investigation BEH-004; current viewer and server reference resolver | Add item identity to reference selection; content route/viewer unchanged | `Reference row -> Section -> DetailPane -> TeamTaskReferenceViewer -> REST content`; DS-003, DS-005 |
| BEH-005 | User | Remove Technical details entirely. REQ-012; AC-010 | Current task row rendering | Investigation BEH-005; navigator/details utility/localization | Delete disclosure, builders, UI-only fields, relevant keys, and assertions; retain identities internally only | `deriveDelegatedTaskEntries -> navigator without technical branch`; DS-001 |
| BEH-006 | Contract | No Messages production change. REQ-001, REQ-013; AC-011–AC-012 | Existing ordinary-message/task separation contract | Investigation BEH-006; confirmed task interaction constraint and current panels | Preserve message model/components/count/selection/references exactly; task changes stay behind task-owned components | Boundary constraint across DS-001–DS-006; no message spine is modified |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/ui-ux-spec.md` | Approved task-only journeys, nested-row interaction, item detail states, reference behavior, content labels, and Markdown wireframes | REQ-001–REQ-015 / AC-001–AC-015 | Defines the observable structure that the presentation projection and components must implement | `Refined` / user-approved behavior basis; final solution package review pending |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/task-timeline-ui-prototype.html` | Production-fidelity interactive rendering for two tasks and every approved click/result mode | REQ-003–REQ-014 / AC-001–AC-014 | Provides the visual implementation contract and browser-validated state transitions used to check this design | `Validated` / user-approved behavior basis; final solution package review pending |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Shared Structure Looseness`
- Refactor needed now: `Yes`
- Evidence: The shared/backend task DTO is already complete and strict, but the frontend `DelegatedTaskEntry` drops `updates`, stores task status as a formatted string while using generic `status` for Agent runtime status, carries unused `context`, duplicates root facts in `taskArguments`, and forces the navigator to rebuild technical JSON. The right pane accepts only a task-level entry, so no exact update can be selected.
- Design response: Retighten `DelegatedTaskEntry` into a task group with a discriminated, ordered `DelegatedTaskLifecycleItem` collection and one user-meaningful task display status. Make section-owned selection item-aware, add task-owned lifecycle row/detail renderers, and delete the complete technical-details path.
- Refactor rationale: Adding ad hoc `updates` rendering directly inside the navigator while retaining the current loose fields would create parallel root/update representations, duplicate actor/status/label logic, and leave obsolete technical code. The data-shape refactor is the smallest coherent path that would make the proposed behavior truthful after approval.
- Intentional deferrals and residual risk: Navigator collapse/virtualization for very long histories is deferred because no product evidence shows current task histories need it. The left pane already scrolls, and the design does not make in-scope behavior depend on another boundary.

## Terminology

- **Task entry:** One task-owned navigator group, keyed by task ID, containing the root assignment item and ordered lifecycle updates.
- **Lifecycle item:** One selectable assignment, submission, review, or interruption presentation subject.
- **Root item:** The assignment lifecycle item backed by the task description and original references; it preserves the current task-row behavior.
- **Display status:** User-facing task status: `in_progress`, `awaiting_review`, `revision_requested`, `accepted`, or `interrupted`. It is derived from, and never replaces, the authoritative task status/update history.
- **Owning item:** The lifecycle item that introduced a reference file and whose content is restored when the item is reselected.

## Design Reading Order

The design below proceeds from current task truth to lifecycle projection, section-owned selection, navigator/detail rendering, and existing reference preview. File mapping follows those ownership decisions. Messages are a fixed external boundary for this change.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope path: task technical-details rendering and reconstruction.
- Clean-cut replacement: user-visible task status, participants, result/review rows, and content become the only task metadata presentation.
- The root description/reference behavior is not legacy and remains the first lifecycle item.
- No feature flag, alternate task renderer, dual `taskDescription`/`lifecycleItem` detail branch, or compatibility wrapper is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Root TeamRun `task_delegation_records.json`; strict V1 records containing root task facts and an ordered update array. Typical task count/history is small; no volume-dependent operation is introduced.
- Relevant code-model, serialization, semantic, or physical-store change: None. The frontend presentation model changes; the wire/persisted task model does not.
- Normal reader/writer behavior and representative evidence: Current task tools write the record; the strict server V1 validator replays update state and verifies review-to-submission linkage; live events and GraphQL hydration expose the complete current DTO.
- Required semantics and invariants under direct use: Preserve exact update order, unique update identities, review linkage, status replay, timestamps, and reference ownership.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No new exposure outside the current focused task perspective; internal identities become less visible.
- Decision: `Not Affected`
- Decision rationale: The existing records are already the authoritative current shape and are consumed directly. Rewriting data would provide no correctness benefit and would add unnecessary I/O, corruption, recovery, and rollout risk.
- Acceptance criteria or design constraints supported by this decision: REQ-006–REQ-012; AC-004–AC-010.

### Migration Plan

N/A — decision is `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | BEH-001, BEH-003, BEH-005 | Current task record in `TeamExecutionViewState` | Nested task/lifecycle navigator | Task presentation projector | Carries complete authoritative task facts into one tight task entry without technical UI |
| DS-002 | `Primary End-to-End` | BEH-002, BEH-003 | User activates a task/update row | Full selected item content in right pane | `TeamDelegatedTasksSection` selection owner | Preserves master/detail interaction while generalizing selection from task to lifecycle item |
| DS-003 | `Primary End-to-End` | BEH-004 | User activates an item-owned reference | Existing task reference content preview | `TeamDelegatedTasksSection` + existing reference viewer boundary | Preserves the approved file interaction for root and update references |
| DS-004 | `Bounded Local` | BEH-001, BEH-003, BEH-005 | One `TaskDelegationRecordDto` | One `DelegatedTaskEntry` with ordered lifecycle items/status | `deriveDelegatedTaskEntries` | Owns ordinals, review linkage, revised-result labeling facts, actor relationship, and stable keys once |
| DS-005 | `Bounded Local` | BEH-002, BEH-004 | Task-entry collection changes | Valid selected entry/item/reference | `TeamDelegatedTasksSection` | Prevents live record replacement from losing or duplicating exact selection |
| DS-006 | `Return-Event` | BEH-003 | Durable task transition / restored snapshot | Reactive navigator/detail update | `TeamExecutionViewState` | Ensures live and restored records produce the same presentation without component-owned state replay |

## Primary Execution Spine(s)

### DS-001 — Task record to task-owned lifecycle navigator

`Supported task transition or TeamRun restore -> TaskDelegationRecordDto -> TeamExecutionViewState -> deriveDelegatedTaskEntries -> TeamDelegatedTaskNavigator -> visible task/update rows`

### DS-002 — Lifecycle item selection to full detail

`User activates one persistent left-side task/update row -> TeamDelegatedTaskNavigator -> TeamDelegatedTasksSection -> selected DelegatedTaskLifecycleItem -> TeamDelegatedTaskDetailPane -> TeamDelegatedTaskItemDetail / MarkdownRenderer for that item only`

### DS-003 — Item-owned reference selection to preview

`User reference activation -> TeamDelegatedTaskNavigator -> TeamDelegatedTasksSection -> TeamDelegatedTaskDetailPane -> TeamTaskReferenceViewer -> task-reference REST route -> TeamReferenceFileViewer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The current task view supplies related strict records. One projector preserves focused visibility and turns each record into one task entry with a root assignment plus ordered updates. The navigator renders that projection and no raw DTO/technical JSON. | current task record, task entry, lifecycle items, navigator | Task presentation projector | participant display names, status label keys, reference icons, localization |
| DS-002 | The navigator emits an exact task/item locator. The section validates and owns it. The detail pane routes the selected item to one item-detail renderer, which uses Markdown for content. | item locator, selected item, item detail | `TeamDelegatedTasksSection` | timestamp formatting, Markdown, accessible labels |
| DS-003 | A reference activation includes task, owning item, and reference identity. The section validates all three, switches the detail pane to preview, and reuses the existing task reference content boundary. | reference locator, selected reference, reference preview | Section selection owner and existing task reference viewer | loading/error/raw/preview/maximize behavior |
| DS-004 | The projector creates the assignment first, walks updates in stored order, numbers submissions, resolves every review's result ordinal, derives revised-result semantics and display status, and emits stable item keys. | task DTO, submission ledger, lifecycle item union | Task presentation projector | address-to-label resolution, reference mapping |
| DS-005 | The section watches the task/item/reference signature. It retains valid selection across full-record replacements, clears only an invalid reference, falls back to the root item if the selected update disappears, and selects the first task root only when no current selection exists. | selection state, current projected entries | `TeamDelegatedTasksSection` | none |
| DS-006 | Live task events replace one record and restored snapshots replace all records in the existing state owner. Reactive projection reruns; components never append/replay lifecycle state themselves. | event/snapshot, current records, reactive projection | `TeamExecutionViewState` | stream recovery/hydration already owned upstream |

## Spine Actors / Main-Line Nodes

- `TeamExecutionViewState`: authoritative current frontend task-record collection.
- `deriveDelegatedTaskEntries`: task presentation projector and focused-perspective filter.
- `DelegatedTaskEntry`: one task-owned presentation group.
- `DelegatedTaskLifecycleItem`: one exact selectable root/update subject.
- `TeamDelegatedTaskNavigator`: summary/reference interaction surface.
- `TeamDelegatedTasksSection`: exact item/reference selection owner.
- `TeamDelegatedTaskDetailPane`: thin content-versus-reference mode boundary.
- `TeamDelegatedTaskItemDetail`: full selected item header/content renderer.
- `TeamTaskReferenceViewer`: existing task reference content boundary.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `TeamExecutionViewState` | Current task records, live full-record replacement, snapshot replacement | User-facing labels, result ordinals, selection |
| `deriveDelegatedTaskEntries` | Focus filtering, participant projection, display status, stable task/item keys, ordered lifecycle item mapping, result ordinals, review linkage, item references | Reactive selection, DOM, localization rendering, content fetching |
| `TeamDelegatedTasksSection` | Selected entry/item/reference identity, validation/repair, content-versus-reference mode | Task lifecycle derivation, row markup, file fetching |
| `TeamDelegatedTaskNavigator` | Task-root layout, nested lifecycle rows, selection visuals, event emission | Raw DTO interpretation, selection authority, detail content |
| `TeamDelegatedTaskLifecycleRow` | One nested update summary and its reference controls | Update ordering, ordinals, selection state mutation |
| `TeamDelegatedTaskDetailPane` | Branch between selected item content and selected reference preview | Lifecycle labeling/presentation policy, fetch implementation |
| `TeamDelegatedTaskItemDetail` | Selected task/update header, participant direction, timestamp, fallback acceptance copy, and Markdown content; it renders no reference list | Selection, status derivation, reference fetching, reference navigation |
| `TeamTaskReferenceViewer` | Existing content URL and shared file viewer delegation | Task/update projection, message references |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamDelegatedTaskDetailPane` | `TeamDelegatedTasksSection` for selection; `TeamDelegatedTaskItemDetail`/`TeamTaskReferenceViewer` for rendering | Keeps the right pane's two mutually exclusive modes explicit | Lifecycle projection, selection repair, file transport |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `utils/teamDelegatedTaskTechnicalDetails.ts` | User explicitly rejects all technical detail UI; builders serve no runtime concern | Nothing; internal IDs stay only in typed task/selection structures | `In This Change` | Delete file; no compatibility wrapper |
| `<details data-test="team-delegated-task-technical-details">` and raw `<pre>` in navigator | Entire visible branch is obsolete | Nested lifecycle rows use the space for user-meaningful history | `In This Change` | Remove markup/imports/helpers |
| `DelegatedTaskEntry.taskArguments` | Exists only to rebuild raw JSON | No replacement | `In This Change` | Delete field and fixture data |
| `DelegatedTaskEntry.context`, generic runtime `status`, formatted `statusLabel` | Runtime status is not the proposed user-facing task status and is not rendered; context is otherwise unused | Singular `displayStatus` derived from task lifecycle | `In This Change` | Keep exact target run ID only where existing internal identity requires it |
| Technical-only localization keys: `technical_details`, `task_type`, `task_id`, `agent_run_id`, `agent_team_run_id`, `target_kind`, `target` | No production caller remains after disclosure deletion | New task lifecycle/status keys only | `In This Change` | Remove English and Simplified Chinese entries and stale test labels that exist solely for this UI |
| Tests asserting technical disclosure/JSON | Assert removed behavior | Lifecycle/status/no-technical-detail assertions | `In This Change` | Keep focus/no-ID-in-summary protections |

## Return Or Event Spine(s) (If Applicable)

### DS-006 — Live/restored task record propagation

`TaskDelegationService durable transition -> TASK_DELEGATION_EVENT with full record -> TeamExecutionViewState.applyMessage -> reactive task collection -> deriveDelegatedTaskEntries recomputation -> navigator/detail patch in place`

Historical restore uses the same endpoint:

`GetTaskDelegationRecords -> strict GraphQL DTO projector -> TeamExecutionViewState snapshot seed -> deriveDelegatedTaskEntries -> same navigator/detail`

## Bounded Local / Internal Spines (If Applicable)

### DS-004 — Lifecycle projection loop

- Parent owner: `deriveDelegatedTaskEntries`.
- Flow: `assignment item -> walk ordered updates -> submission ordinal ledger -> review linkage lookup -> lifecycle item -> final display-status derivation`.
- Why it matters: left and right renderers must receive the same singular semantics and never independently interpret raw update unions.

Current V1 validation guarantees a revision request has a comment and every review references a known earlier submission. These are `Reachable` normal invariants. A missing revision comment or unknown reviewed submission is `Not Reachable` through current supported task persistence/live projection, so no fallback compatibility state is added. Acceptance may validly have `comment = null`; only that path gets `Result accepted.` fallback copy.

### DS-005 — Selection repair

- Parent owner: `TeamDelegatedTasksSection`.
- Flow: `projected signature change -> validate entry -> validate item -> validate reference -> retain / narrow fallback`.
- Why it matters: live full-record replacement should not force newest-item selection or leave stale references.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | DS-001, DS-002 | Navigator/item detail | English and Simplified Chinese lifecycle/status/fallback labels | Visible enums must be human language | Raw enums or duplicate strings drift |
| Reference file presentation | DS-001, DS-003 | Navigator | Existing icon and filename projection | Preserve current reference affordance | File logic duplicated into lifecycle projector |
| Markdown rendering | DS-002 | Item detail | Render task/result/review/reason content consistently | Existing rich-content owner | Lifecycle renderer becomes content parser |
| Horizontal split resize | DS-002, DS-003 | Section | Preserve existing divider width policy | Approved current interaction | Unrelated resize refactor risks Messages |
| Timestamp formatting | DS-001, DS-002 | Navigator/item detail | Same compact/full date styles as current Team surfaces | Readable activity context | DTO/projection polluted with locale-specific text |
| Reference content state | DS-003 | Existing reference viewer | Loading/error, icon-only raw/preview mode, maximize/restore | Existing interaction explicitly confirmed as desirable by the user | New lifecycle components duplicate transport/viewer state or invent visible text tabs |

## Ownership Boundaries

The raw current task record stops at `deriveDelegatedTaskEntries`; task UI components depend on its tight presentation types, not on `TaskDelegationRecordDto['updates']`. This ensures ordinals, status refinement, actor direction, and stable keys have one owner.

`TeamDelegatedTasksSection` is the authoritative selection boundary. Child components emit exact locators and never directly mutate selection refs. The detail pane receives already-resolved subjects and does not search global task state.

`TeamTaskReferenceViewer` remains the authoritative task reference content boundary. Lifecycle components supply existing `teamRunId + taskId + reference`; they do not fetch or reinterpret file paths.

Messages remain outside these boundaries. No task abstraction is moved into `TeamCommunicationPanel`, no common message/task base component is introduced, and no message selection/store code is touched.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamExecutionViewState.listTaskHistoryRows()` | Reactive task DTO collection/live replacement | Task presentation projector | Components read stream/hydration stores directly | Extend view query, not component store reach-through |
| `deriveDelegatedTaskEntries()` | Visibility, participant/status/item/reference projection | Overview task count/signature and Task section | Navigator/detail parse raw task updates independently | Strengthen presentation types/helpers |
| `TeamDelegatedTasksSection` | Entry/item/reference selection and repair | Navigator events, detail props | Child components mutate selection or refind global records | Add explicit locator event/prop |
| `TeamTaskReferenceViewer` | Content URL and `TeamReferenceFileViewer` delegation | Detail pane | Lifecycle item component calls REST directly | Extend existing task viewer contract if genuinely needed; none is needed now |

## Dependency Rules

1. `teamDelegatedTaskEntries.ts` may depend on `AgentTeamContext`, `TeamTaskHistoryRow`, task contract types, address naming, and the existing `TeamReferenceFile` type.
2. Task components depend only on `DelegatedTaskEntry`, `DelegatedTaskLifecycleItem`, and exact selection locator types exported by the task presentation owner.
3. `TeamDelegatedTasksSection` alone owns `selectedEntryKey`, `selectedItemKey`, and `selectedReferenceId`.
4. `TeamDelegatedTaskNavigator` and `TeamDelegatedTaskLifecycleRow` emit locators; they do not receive or mutate the Team context.
5. `TeamDelegatedTaskDetailPane` branches on already-resolved `selectedReference`; it does not rebuild item identity.
6. `TeamDelegatedTaskItemDetail` may use localization, timestamp formatting, and `MarkdownRenderer`; it must not inspect raw task DTOs.
7. Root/update references reuse `TeamTaskReferenceViewer`; no direct fetch or new reference route is allowed.
8. `TeamCommunicationPanel.vue`, `utils/teamCommunication/*`, message types, and message localization are forbidden dependencies/change targets.
9. Internal task/run identity may participate in entry/item keys and viewer routing only; it must not render.
10. Technical-detail helpers, JSON reconstruction, and dual presentation paths are forbidden.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `deriveDelegatedTaskEntries(team, focusedAgentRunId?)` | Focused task presentation | Filter related tasks and project tight task entries/lifecycle items | `AgentTeamContext + exact AgentRun ID or undefined` | Preserve current `undefined = all` test/internal behavior |
| `DelegatedTaskEntry` | One task navigator group | Carry task identity, target-kind discriminator, display status/activity time, and ordered items | Stable `entryKey = task:<taskId>` | Participant direction lives on items; no taskArguments/context/runtime status or duplicate root-content fields |
| `DelegatedTaskLifecycleItem` | One selectable task lifecycle subject | Discriminate assignment/submission/review/interruption with stable key/content/time/references and variant facts | Task ID plus exact update ID; assignment uses task ID | Review includes reviewed result ordinal; submission includes result ordinal/revised flag |
| Navigator `select-item` event | One lifecycle selection | Request exact item selection | `{ entryKey, itemKey }` | Replaces task-only event for root and nested rows |
| Navigator `select-reference` event | One item-owned reference selection | Request exact reference preview | `{ entryKey, itemKey, referenceId }` | Prevents ambiguous same-task attachment ownership |
| `TeamDelegatedTaskDetailPane` props | Selected task detail mode | Route item or reference content | `selectedEntry`, `selectedItem`, `selectedReference`, refresh signal | All subjects pre-resolved by section |
| `TeamTaskReferenceViewer` props | Task reference content | Fetch/render existing reference | `teamRunId + taskId + TeamReferenceFile` | Unchanged public component boundary |

## Presentation Model Contract

The task projector must expose one tight UI model. The names below are design-level TypeScript guidance; implementation may refine readonly syntax, but it must preserve these meanings and may not reintroduce parallel raw-task fields.

```ts
type DelegatedTaskDisplayStatus =
  | 'in_progress'
  | 'awaiting_review'
  | 'revision_requested'
  | 'accepted'
  | 'interrupted';

type DelegatedTaskParticipant =
  | Readonly<{ kind: 'named'; label: string }>
  | Readonly<{ kind: 'delegator_fallback' }>
  | Readonly<{ kind: 'assignee_fallback' }>;

type DelegatedTaskDirection =
  | Readonly<{
      kind: 'directed';
      from: DelegatedTaskParticipant;
      to: DelegatedTaskParticipant;
    }>
  | Readonly<{
      kind: 'system';
    }>;

interface DelegatedTaskLifecycleItemBase {
  readonly itemKey: string;
  readonly createdAt: string;
  readonly content: string | null;
  readonly direction: DelegatedTaskDirection;
  readonly referenceFiles: readonly TeamReferenceFile[];
}

type DelegatedTaskLifecycleItem =
  | (DelegatedTaskLifecycleItemBase & Readonly<{
      kind: 'assignment';
    }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
      kind: 'submission';
      resultOrdinal: number;
      revised: boolean;
    }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
      kind: 'review';
      decision: 'accept' | 'request_revision';
      reviewedResultOrdinal: number;
    }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
      kind: 'interruption';
      content: string;
      referenceFiles: readonly [];
    }>);

interface DelegatedTaskEntry {
  readonly kind: 'task_agent' | 'task_team';
  readonly entryKey: string;
  readonly teamRunId: string;
  readonly taskId: string;
  readonly runId: string; // internal exact target identity retained for current overview behavior
  readonly displayStatus: DelegatedTaskDisplayStatus;
  readonly lastActivityAt: string;
  readonly lifecycleItems: readonly [DelegatedTaskLifecycleItem, ...DelegatedTaskLifecycleItem[]];
}
```

Projection rules are exact:

1. Preserve the `listTaskHistoryRows()` array order. The projector filters that array for the focused perspective and maps it; it does not sort task groups. Current live behavior therefore replaces an existing task at its index and appends a new task.
2. Create the assignment first with key `task:<taskId>:assignment`, root description as `content`, root references, task creation time, and delegator-to-assignee direction. The navigator derives its existing description summary directly from this content; no new title field or duplicate `taskDescription`/`taskLabel` field is introduced.
3. Walk `task.updates` once in stored order. Use keys `task:<taskId>:submission:<submissionId>`, `task:<taskId>:review:<reviewId>`, and `task:<taskId>:interruption:<interruptionId>`.
4. Increment the result ordinal only for submissions and retain a `submission_id -> ordinal` lookup. Resolve each review's `reviewedResultOrdinal` through that lookup, never through adjacency.
5. Maintain `revisionPending`, initially `false`. A `request_revision` review sets it to `true`; the next submission receives `revised: true` and clears it. An ordinary first submission receives `revised: false`; an acceptance clears it. Supported records guarantee the linked submission exists and revision comments are present.
6. Map submission direction as assignee-to-delegator; review direction as delegator-to-assignee; interruption direction as `kind: 'system'`. Renderers localize that system label and do not invent a person for a task-Team submission or interruption.
7. Resolve one delegator participant from `team.view.getMemberAddress(task.delegatorAgentRunId)` and `memberAddressBasename`; emit `delegator_fallback` only when no address resolves. Resolve one assignee participant from `memberAddressBasename(task.targetAddress)`; emit `assignee_fallback` only as a defensive presentation fallback. Reuse those participant subjects in item directions rather than storing parallel entry-level labels. Renderers localize the fallback variants as `Task delegator` or `Task assignee`. Never use a run ID as display text.
8. Derive `lastActivityAt` from the final stored update's `created_at`, or from root `created_at` when there are no updates.
9. Derive `displayStatus` from authoritative state: `interrupted`, `accepted`, and `awaiting_review` map directly; `active` plus a latest `review/request_revision` maps to `revision_requested`; other `active` maps to `in_progress`.
10. Map every reference through the existing `TeamReferenceFile` shape without changing IDs, paths, types, or timestamps. References stay on their owning lifecycle item.

The section-level locator types remain intentionally smaller than the item model:

```ts
type DelegatedTaskItemLocator = Readonly<{
  entryKey: string;
  itemKey: string;
}>;

type DelegatedTaskReferenceLocator = Readonly<{
  entryKey: string;
  itemKey: string;
  referenceId: string;
}>;
```

An item's `content: null` is valid only for an acceptance review without a comment; the detail renderer substitutes localized `Result accepted.`. All other supported lifecycle variants carry non-empty content under the current strict contract.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `deriveDelegatedTaskEntries` | Yes | Yes | Low | Keep raw DTO/update mapping inside it |
| `select-item` | Yes | Yes | Low | Always include entry and item keys |
| `select-reference` | Yes | Yes | Low | Include owning item key; do not select by reference ID alone |
| Detail-pane props | Yes | Yes | Low | Section resolves subjects before passing props |
| Task reference viewer | Yes | Yes | Low | Reuse unchanged triple identity |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| One task group | `DelegatedTaskEntry` | Yes | Low | Document that entry contains lifecycle items, not one row only |
| One root/update subject | `DelegatedTaskLifecycleItem` | Yes | Low | Use discriminated kinds; avoid generic `item` outside local loops |
| User-facing state | `DelegatedTaskDisplayStatus` | Yes | Low | Remove generic runtime `status` from task entry |
| Exact selection | `DelegatedTaskItemLocator` / `DelegatedTaskReferenceLocator` | Yes | Low | Do not overload `entryKey` to guess item/reference meaning |
| Nested update renderer | `TeamDelegatedTaskLifecycleRow` | Yes | Low | It renders update rows only; root stays in navigator |
| Full item renderer | `TeamDelegatedTaskItemDetail` | Yes | Low | It renders task and update content, not reference fetch |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Current task truth | Team execution view | `Reuse` | Full records already live there | N/A |
| Focused task projection | `teamDelegatedTaskEntries.ts` | `Extend` | Correct current owner; shape is incomplete | N/A |
| Task master/detail selection | `TeamDelegatedTasksSection` | `Extend` | Already owns exact task/reference selection | N/A |
| Nested lifecycle summary | Task navigator components | `Extend` with one focused child component | Keeps task-only UI local and navigator readable | Message component is excluded and semantically different |
| Full Markdown lifecycle content | `MarkdownRenderer` | `Reuse` | Current task detail already uses it | N/A |
| Task reference content | `TeamTaskReferenceViewer` + server task route | `Reuse` | Already resolves update references | N/A |
| Split resizing | Existing section composable usage | `Reuse` unchanged | Current behavior approved | N/A |
| Technical diagnostics | Existing technical utility | `Remove` | User rejects the concern | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Team execution state | Current strict task records and live/restored replacement | DS-001, DS-006 | `TeamExecutionViewState` | `Reuse` | No source change expected |
| Delegated-task presentation | Focus filter, lifecycle item projection, status/ordinal/linkage, selection types | DS-001, DS-004 | Task navigator/detail | `Extend` | In-place refactor of current util |
| Team task UI | Navigator rows, selection orchestration, detail routing/content | DS-002, DS-003, DS-005 | `TeamDelegatedTasksSection` | `Extend` | Add two task-only presentational components |
| Task reference viewing | Existing REST/viewer path | DS-003 | `TeamTaskReferenceViewer` | `Reuse` | No source change expected |
| Localization | Task-only visible labels | DS-001, DS-002 | Navigator/item detail | `Extend` | English + Simplified Chinese; remove technical-only keys |
| Messages | Ordinary communication | N/A | `TeamCommunicationPanel` | `Reuse unchanged` | Explicit no-change boundary |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `utils/teamDelegatedTaskEntries.ts` | Delegated-task presentation | Task presentation projector | Tight types, visibility, participants, status, ordered items, ordinals, references | One pure projection concern already lives here | Existing task DTO/reference type |
| `components/workspace/team/TeamDelegatedTasksSection.vue` | Team task UI | Selection owner | Exact entry/item/reference state and repair | Existing orchestration boundary | Presentation locators/items |
| `.../TeamDelegatedTaskNavigator.vue` | Team task UI | Navigator | Entire persistent left-side timeline: root task/references, nested lifecycle row composition, selected group | Existing and exclusive navigation surface | Lifecycle row child |
| `.../TeamDelegatedTaskLifecycleRow.vue` | Team task UI | Nested row renderer | One update summary and its references | Repeated update-only UI warrants one component | Lifecycle item type/reference presentation |
| `.../TeamDelegatedTaskDetailPane.vue` | Team task UI | Thin mode boundary | Route one selected item detail vs one reference preview; never render lifecycle navigation | Keeps selection modes and pane ownership explicit | Item detail/reference viewer |
| `.../TeamDelegatedTaskItemDetail.vue` | Team task UI | Full item renderer | Header/actors/time/status, fallback accepted copy, Markdown body | Keeps detail pane thin and presentation cohesive | Lifecycle item/Markdown |
| `utils/teamDelegatedTaskTechnicalDetails.ts` | Removed | Removed | Delete | User-rejected concern | N/A |
| task component/util tests | Test coverage | Per-owner tests | Projection/selection/rendering/no-technical coverage | Colocated current pattern | Test fixtures |
| English/Chinese `workspace.ts` | Localization | Catalogs | Add lifecycle/status labels; remove technical keys | Existing task catalog owner | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Task/update presentation identity and content | `teamDelegatedTaskEntries.ts` exported discriminated union | Delegated-task presentation | Navigator, section, and detail need the same exact subject | Yes | Yes | Raw DTO wrapper with optional fields for every variant |
| Item/reference locator payloads | Same file exported locator types | Delegated-task presentation | Navigator and section share exact identity semantics | Yes | Yes | Generic selector that guesses by ID |
| Reference file shape | Existing `TeamReferenceFile` | Team references | Already used by task viewer | N/A | Yes | New task-update reference type |
| Label/status mapping | Presentation union + task-only localization keys | Delegated-task presentation/UI | Both row and detail must agree on semantics | Yes | Yes | Shared message/task renderer or raw enum formatter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegatedTaskEntry` | Yes | Yes | Low | Remove context/taskArguments/taskDescription parallel fields; root description lives in assignment item |
| `DelegatedTaskLifecycleItem` union | Yes | Yes | Low | Variant-specific ordinal/decision fields; common stable identity/content/time/references only |
| `DelegatedTaskDisplayStatus` | Yes | Yes | Low | Do not retain Agent runtime status or formatted raw status alongside it |
| Selection locators | Yes | Yes | Low | Entry/item/reference dimensions are explicit |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamDelegatedTaskEntries.ts` | Delegated-task presentation | Projector | Produce task entries, display status, participants, ordered discriminated lifecycle items, result ordinals, stable keys, references | One cohesive pure mapping boundary | Yes |
| `autobyteus-web/components/workspace/team/TeamDelegatedTasksSection.vue` | Team task UI | Selection owner | Validate/repair entry-item-reference selection and pass resolved subjects | One orchestration state owner | Yes |
| `autobyteus-web/components/workspace/team/TeamDelegatedTaskNavigator.vue` | Team task UI | Navigator | Own the complete left-side timeline; preserve root task/references; compose nested updates; show task status; emit locators | One exclusive list/group surface | Yes |
| `autobyteus-web/components/workspace/team/TeamDelegatedTaskLifecycleRow.vue` | Team task UI | Update summary | Render one submission/review/interruption summary and references | Keeps navigator from mixing per-variant markup | Yes |
| `autobyteus-web/components/workspace/team/TeamDelegatedTaskDetailPane.vue` | Team task UI | Thin mode router | One selected lifecycle item detail versus one selected reference preview; no timeline rendering | Singular right-pane routing concern | Yes |
| `autobyteus-web/components/workspace/team/TeamDelegatedTaskItemDetail.vue` | Team task UI | Full content renderer | Render task/update header, actors, time, status, Markdown/fallback content | Singular selected-item presentation | Yes |
| `autobyteus-web/utils/teamDelegatedTaskTechnicalDetails.ts` | N/A | Removed | Delete file | Concern removed | N/A |
| `autobyteus-web/localization/messages/en/workspace.ts` | Localization | English catalog | Task-only lifecycle/status/fallback copy; remove technical keys | Existing owner | N/A |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Localization | Simplified Chinese catalog | Same semantic key set | Existing owner | N/A |
| `autobyteus-web/utils/__tests__/teamDelegatedTaskEntries.spec.ts` | Test | Projector coverage | Full lifecycle, ordinals, display status, team attribution, stable keys, focus filtering | Colocated owner test | Fixtures |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTaskNavigator.spec.ts` | Test | Navigator coverage | Root preservation, nested rows/references, selection emissions, no technical UI | Colocated owner test | Presentation fixtures |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTasksSection.spec.ts` | Test | Selection/integration coverage | Item selection, reference ownership/return, live selection retention | Colocated owner test | Current Team fixtures |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTaskItemDetail.spec.ts` | Test | Item detail coverage | Task/submission/revision/accept/interruption headers and content | New component deserves focused variant coverage | Presentation fixtures |

## Applied Patterns (If Any)

- **Projection pattern:** strict task DTOs are converted once into a UI-specific discriminated lifecycle model.
- **Master/detail selection owner:** the section owns exact selection; navigator emits and detail consumes resolved subjects.
- **Discriminated union:** assignment/submission/review/interruption retain variant-specific semantics without mostly-optional fields.
- **Thin mode router:** detail pane switches between item content and the existing reference viewer.

## Target Subsystem / Folder / File Mapping

The current task feature is already compact and colocated. Adding a new folder would over-split six closely related Team-task components. Keep the established flat `components/workspace/team` placement while maintaining clear file responsibilities. The pure projection remains in the existing task-specific utility file.

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamDelegatedTaskEntries.ts` | File | Task presentation projector | Focused task entry/lifecycle model | Existing task projection owner | DOM, fetch, message model, technical JSON |
| `autobyteus-web/components/workspace/team/TeamDelegatedTasksSection.vue` | File | Selection owner | Master/detail orchestration | Existing Team task section boundary | Raw update parsing |
| `.../TeamDelegatedTaskNavigator.vue` | File | Task navigator | Root task and update composition | Existing task navigation surface | Detail body, technical disclosure, global state mutation |
| `.../TeamDelegatedTaskLifecycleRow.vue` | File | Update row | One nested update summary/reference list | Same feature depth as navigator | Update ordering, fetching |
| `.../TeamDelegatedTaskDetailPane.vue` | File | Thin detail mode router | Item or reference branch | Existing right-pane boundary | Lifecycle projection policy |
| `.../TeamDelegatedTaskItemDetail.vue` | File | Selected item detail | Full task/update content | Same task component family | Reference fetching, selection |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | File | Locale catalogs | Visible task lifecycle/status copy | Existing catalog placement | Raw enums/IDs |
| `autobyteus-web/components/workspace/team/__tests__/*` and `utils/__tests__/*` | File | Colocated coverage | Test owned production boundaries | Existing test convention | Backend lifecycle testing already owned server-side |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/team` | `Mixed Justified` presentation components | Yes | Low | Existing feature-oriented component folder; each file remains presentation-only with explicit owner |
| `utils` task projection file | `Off-Spine Concern` | Yes | Low | Pure view projection already follows local pattern; do not add a one-file folder merely for symmetry |
| `localization/messages/*` | `Off-Spine Concern` | Yes | Low | Catalogs remain locale-owned |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Lifecycle model | `entry.lifecycleItems = [assignment, submission#1, review(result#1), submission#2, review(result#2)]` | Navigator loops raw `task.updates` while detail independently reinterprets the same union | One owner guarantees row/detail agreement |
| Exact selection | `{ entryKey: 'task:t1', itemKey: 'task:t1:review:r1', referenceId: 'ref-x' }` | `selectedId = 'r1'` and guess whether it is task/update/reference | Explicit identity prevents ambiguity |
| Accepted with no comment | Acceptance item has `content: null`; item detail renders localized `Result accepted.` | Drop the acceptance row because there is no body | Decision is the terminal user-visible fact |
| Revision comment | Current contract always supplies comment and reviewed result ID | Add missing-comment/unknown-result compatibility branches | Those states are rejected by the current authoritative server validator |
| Message isolation | Task-only lifecycle row component | Refactor `TeamCommunicationPanel` into a generic task/message base | User explicitly requires no Messages change; domains have different semantics |
| Technical removal | Delete disclosure, utility, fields, keys, assertions | Hide disclosure with CSS or leave unused JSON builder | Clean removal satisfies explicit user intent |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old description-only detail alongside new item detail | Superficially minimizes component changes | `Rejected` | Represent the task description as the root assignment lifecycle item and render it through the singular item-detail path |
| Keep Technical details hidden/collapsed | Could preserve debug access | `Rejected` | Delete visible branch, builder file, fields, keys, and tests entirely |
| Accept old loose `DelegatedTaskEntry` plus optional `lifecycleItems` | Could stage the refactor | `Rejected` | Replace the entry shape in one change; update all current consumers/tests |
| Generalize Messages and Tasks into one renderer | Visual similarity might suggest reuse | `Rejected` | Reuse only existing low-level Markdown/reference/split capabilities; keep task-specific components and no message source changes |
| Add frontend fallback for malformed review linkage/missing revision comment | DTO fields alone are structurally nullable/string-based | `Rejected` | Rely on supported current server validation/state-machine invariants; no unreachable compatibility UI |

## Derived Layering (If Useful)

```text
Authoritative current Team task state
  -> task presentation projection
  -> task selection orchestration
  -> task navigator / item detail
  -> existing Markdown and task reference viewers
```

This is explanatory only. The authoritative boundaries are the state view, presentation projector, section selection owner, and reference viewer described above.

## Change / Refactor Sequence

1. **Tighten task presentation types and projector.**
   - Introduce the discriminated lifecycle item, display status, participant, and locator shapes.
   - Project the root assignment plus ordered updates, ordinals, review linkage, revised-result marker, references, and stable keys.
   - Remove `context`, `taskArguments`, runtime `status`, `statusLabel`, and parallel task-description/reference fields superseded by the root item.
   - Keep current focused visibility and entry identity required by `TeamOverviewPanel` unchanged so its source need not change.
2. **Update projector tests first.** Cover assignment-only, awaiting review, revision request, resubmission, acceptance without comment, interruption, task Team attribution, update references, stable keys, and existing focus filtering.
3. **Generalize section selection.** Add selected item identity and owner-aware reference selection/repair. Default each selected task to its root item and preserve valid selection across live full-record replacement.
4. **Extend the navigator.** Preserve root task/reference markup, add task display status/participants, compose nested lifecycle rows, keep every reference row solely beneath its owning left-side item, and remove Technical details markup/imports.
5. **Add the lifecycle row component.** Render compact label/ordinal/direction/time/preview and update-owned references; emit exact locators only.
6. **Generalize the right detail path.** Add item-detail rendering without reference cards and make the existing detail pane a thin item/reference router. Preserve `TeamTaskReferenceViewer` unchanged, including filename/path and icon-only raw/preview/maximize controls.
7. **Remove obsolete technical code.** Delete the utility, fields, relevant localization keys, mock labels, and assertions. Do not leave hidden DOM or dead builders.
8. **Add task-only localization and component coverage.** Update English/Chinese keys and task component tests, including no Messages production diff and preservation of current focus/split/reference behavior.
9. **Run frontend-scoped checks.** Implementation owns targeted type/unit checks; broader API/E2E coverage investigation remains downstream.

No temporary compatibility seam is necessary; the source change can replace the loose task presentation atomically.

## Key Tradeoffs

- **Nested rows versus a whole-timeline right pane:** Nested rows preserve the current master/detail interaction and make every result/review directly selectable, at the cost of additional navigator height. This matches explicit user preference.
- **Task-specific components versus generic message/task components:** Task-specific components duplicate a small amount of visual vocabulary but guarantee zero Messages production changes and preserve distinct lifecycle semantics.
- **Derived display status versus raw task status:** `Revision requested` is more meaningful than raw `active` after a revision review. The derivation stays in one presentation owner and does not alter authoritative state.
- **No technical diagnostics:** Removing the disclosure eliminates in-product debug access, but the user explicitly prioritizes comprehensibility and internal IDs remain available in logs/developer tools rather than ordinary UI.
- **No long-history collapse yet:** Scrolling is simpler and preserves the full timeline. Collapse/virtualization would add state and discoverability cost without current volume evidence.

## Risks

- **Selection regression:** Expanding selection from task to item/reference can accidentally reset on live updates. Exact locators plus DS-005 repair tests mitigate this.
- **Duplicate semantic mapping:** Row/detail can drift if each interprets raw updates. The projector's discriminated item model and shared semantic fields prohibit that.
- **Task Team attribution:** The update DTO does not identify an individual submitter. Display the Team as the assignee/result source; never infer a coordinator/member.
- **Dense navigator:** Multiple revision cycles add rows. Compact previews and existing scrolling mitigate this; no unsupported collapse behavior is introduced.
- **Localization drift:** Dynamic result ordinals and status/event labels require aligned English/Chinese keys and focused catalog tests.
- **Accidental Messages changes:** Visual similarity may tempt shared refactoring. Implementation review must reject any production diff to message components/models/localization for this task.

## Guidance For Implementation

- Start from `TaskDelegationRecordDto` and current server-validated invariants; do not parse tool notification text or ordinary messages.
- Keep `deriveDelegatedTaskEntries` as the only mapper from raw task updates to display items.
- Preserve task record/update order. Do not sort lifecycle items by timestamp independently.
- Use update IDs only inside stable item keys. Never render them.
- Resolve review ordinals through `reviewed_submission_id`, not adjacency.
- Derive `Revision requested` only when authoritative status is `active` and the latest update is `review(request_revision)`.
- Treat the task root as an assignment lifecycle item so task and update detail use one content path.
- Render acceptance even when its comment is null, using localized `Result accepted.`
- Preserve the current reference icon/name controls and viewer; add owning `itemKey` to selection, not a new endpoint. Do not repeat reference rows/cards inside right-side item detail.
- Delete Technical details rather than hiding it.
- Do not modify `TeamCommunicationPanel.vue`, `utils/teamCommunication/*`, message types, or message localization.
- Keep existing task focus behavior: selecting task content must not change the focused Agent/send target.
- Preserve current data-test names where semantics remain; introduce item-specific names for lifecycle rows/details and remove technical-detail test hooks.
- Assert pane ownership in component coverage: the full ordered lifecycle row set and all reference navigation rows are rendered only by the left navigator, while the right detail subtree contains only the selected item or existing reference viewer.
- Preserve the current task split dimensions exactly: `248px` initial, `168px` minimum, and `360px` maximum.
- Treat the user-approved prototype as a rendering contract, not implementation source: do not add visible controls absent from production/current approval, including visible `Preview`/`Raw` text tabs or per-task collapse chevrons.
