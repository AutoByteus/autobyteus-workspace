# Team Execution Tree UI/UX Specification

## Status (`User Approved — SR-006 Navigation And Canonical Initial-Status Contract; Unchanged By SR-009`)

This supplement defines the product navigation behavior derived from the rooted execution tree. It does not change the persisted three-file contract and does not define a separate frontend execution model.

## UX Goal

Let a user understand and navigate the live AgentTeam exactly as it is executing:

- logical Agent and AgentTeam placements provide the stable hierarchy;
- each persistent or task execution is visibly attached to the placement it instantiates;
- a task row explains the work through its task description rather than technical IDs;
- an Agent task opens one exact Agent execution; and
- an AgentTeam task expands into the exact members of that fresh task Team execution.

The UI must not make a task execution look identical to the persistent execution at the same address, and it must not expose composite execution keys, task IDs, AgentRun IDs, or TeamRun IDs as ordinary navigation copy.

## Related Requirements And Acceptance Criteria

- Behaviors: BEH-006, BEH-009.
- Use cases: UC-008, UC-012, UC-015, UC-016, UC-020.
- Requirements: R-015–R-016, R-034–R-038, R-047.
- Acceptance criteria: AC-018, AC-035–AC-041, AC-052–AC-054.

## Users / Personas / Contexts

| User / Context | Need |
| --- | --- |
| User observing a live AgentTeam | See persistent and task executions in one truthful hierarchy. |
| User opening an Agent task | Recognize the task by its work description and talk to the exact task Agent. |
| User opening an AgentTeam task | Expand the fresh task Team and select one of its exact Agent members. |
| User returning to a restored TeamRun | See the same live hierarchy produced from the restored execution tree and active task records. |

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Live Team workspace | Persistent placement has an active task Agent | Open the task Agent | Exact task `agentRunId` is focused; its conversation/status/history surface is shown | R-015–R-016, R-047; AC-040, AC-052 |
| UXJ-002 | Live Team workspace | AgentTeam placement has an active task Team | Inspect the task Team | Task row is expanded and shows the exact fresh TeamRun's members | R-015, R-047; AC-035, AC-053 |
| UXJ-003 | Expanded task Team | Nested AgentTeam member is visible | Inspect nested members | Nested Team row expands within the same task Team subtree | R-015, R-047; AC-018, AC-053 |
| UXJ-004 | Same logical placement has repeated active tasks | Multiple task rows share one address | Select the intended work by description | Selected row focuses its own exact run; other rows remain unchanged | R-025, R-047; AC-040, AC-052, AC-054 |
| UXJ-005 | Active task settles or restored root repairs it | Focus may point into the task subtree | Continue with a valid live view | Settled subtree leaves live navigation; focus moves to the nearest valid visible placement/execution | R-012, R-041, R-047; AC-041, AC-054 |

## Journey Details

### UXJ-001 — Open an Agent task

1. The navigation projector places the live task Agent underneath its canonical logical Agent placement.
2. The row label is `Task:` plus a whitespace-normalized, visually truncated prefix of the authoritative task `description`.
3. The row may show the task's materialized live status as a compact, non-identity badge.
4. The user selects the task row.
5. The UI dispatches focus by the row's internal exact `agentRunId`; it never reconstructs or parses identity from the label or address.
6. The existing Agent workspace/conversation surface opens for that exact execution.

### UXJ-002 — Expand an AgentTeam task

1. The navigation projector places the live task Team underneath the canonical logical AgentTeam placement it instantiates.
2. The task Team row uses the same `Task: <description prefix>` label rule as an Agent task.
3. Team iconography plus the expand/collapse affordance conveys that the row owns a Team subtree; the text does not repeat `AgentTeam` or expose IDs.
4. Selecting the task Team row toggles expansion.
5. Expansion reveals only the configured members bound to that exact task `teamRunId`, in configured topology order.
6. The task Team row is not treated as an Agent message endpoint and does not silently focus the coordinator. Its coordinator appears as the ordinary exact Agent member row at the configured coordinator address.

### UXJ-003 — Expand nested AgentTeams

1. A nested Team member inside the task Team is rendered at the next indentation depth.
2. Selecting that Team row toggles only its own subtree.
3. Its exact Agent/Team member bindings appear beneath it.
4. Nested task executions hosted by that Team execution appear underneath their corresponding logical placement inside the expanded subtree.

### UXJ-004 — Repeated tasks at one placement

1. Each active task is a separate child row underneath the shared logical placement.
2. Each row uses its own task-description prefix; navigation does not append a task ID or run ID.
3. Even when descriptions are identical, each rendered row retains a distinct internal keyed identity and exact selection target.
4. Ordering follows the backend projection's deterministic task order; components do not sort by the truncated label.

### UXJ-005 — Settlement and focus repair

1. The backend committed delta removes a settled task root from the live projection while retaining its durable task/execution history.
2. The frontend reducer applies the next exact `changeSequence`.
3. If focus was inside the removed subtree, the reducer repairs focus to the nearest visible containing placement/execution according to the existing workspace focus policy; it never keeps a hidden stale run selected.
4. Historical task access remains available through the existing history/task surfaces and is not mixed into live navigation.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Team execution navigation panel | Display the live execution projection | Root snapshot admitted | loading, persistent-only, task Agent, task Team collapsed/expanded, change-sequence refetch | select Agent or expand Team |
| Logical placement row/group | Group concrete executions sharing one canonical address | Configured placement exists | persistent execution, one/multiple tasks | select persistent Agent or inspect task rows |
| Agent task row | Represent one fresh task Agent execution | Active/awaiting task record resolves exact task Agent root | normal, focused, status update | open exact Agent workspace |
| AgentTeam task row | Represent one fresh task Team execution | Active/awaiting task record resolves exact task Team root | collapsed, expanded, status update | reveal/hide exact members |
| Agent member row | Represent one exact AgentRun in persistent/task Team | Agent execution is live and visible | offline/initializing/running/idle/error/focused | focus exact AgentRun |
| Nested Team row | Represent one exact nested TeamRun | Team execution is live and visible | collapsed, expanded | reveal/hide direct members |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Task Agent row selected | Click/tap row or press Enter | Focus styling moves to row | Exact Agent workspace becomes active | focus command uses internal `agentRunId` | message/interact with exact Agent |
| Task Team collapsed | Click/tap row or press Enter/Right Arrow | Chevron changes to expanded | Exact task Team members appear beneath row | presentation expansion state only | select Agent member or nested Team |
| Task Team expanded | Click/tap row or press Enter/Left Arrow | Chevron changes to collapsed | Descendant rows are hidden | presentation expansion state only | re-expand or select another row |
| Nested Team collapsed/expanded | Same Team interaction | Local chevron changes | Only that nested subtree changes | presentation expansion state only | navigate descendants |
| Task status changes | Ordered backend delta | Badge updates without row re-identification | Same exact row remains focused/expanded when still live | reducer applies by task/run identity | continue work/review |
| Task settles | Ordered backend delta | Row/subtree disappears from live tree | Focus repaired if necessary | live projection removes settled root; history retained | navigate remaining tree/history |
| Change-sequence gap | Non-next `changeSequence` admitted | Panel enters refresh state; stale mutation is not applied | Fresh snapshot replaces view atomically | refetch through one projector/reducer boundary | resume navigation |

## Markdown Wireframes / Visual Structure

### Task Agent underneath its logical placement

```text
Tester  /qa/tester
├── Primary execution
└── Task: Run the release acceptance checks…  [Active]
```

The task row is visually underneath the `/qa/tester` placement. It is not merged onto the primary execution row and is not semantically a child of the primary AgentRun. Both concrete executions are internally distinct exact AgentRun rows.

### Expanded task AgentTeam

```text
QA Team  /qa
├── Primary Team execution
│   ├── QA Lead
│   ├── Tester
│   └── Automation Team  ▸
└── Task: Own the full release validation…  [Active]  ▾
    ├── QA Lead                           [Coordinator]
    ├── Tester
    └── Automation Team  ▾
        ├── Automation Lead
        └── Tester
            └── Task: Run the browser automation suite…  [Awaiting review]
```

The members under the expanded task row belong to that exact fresh task TeamRun. They are not reused AgentRuns from the persistent QA Team. The Team row expands/collapses; an Agent member row focuses its exact AgentRun.

### Collapsed task AgentTeam

```text
QA Team  /qa
├── Primary Team execution
└── Task: Own the full release validation…  [Active]  ▸
```

## Non-Happy-Path States

### Loading

- Before the initial snapshot is admitted, show the existing navigation loading treatment rather than an empty-team claim.
- Expansion commands are unavailable until the exact task Team subtree exists in admitted state.

### Empty

- A Team with no visible members or active task executions uses the existing empty navigation state.
- A placement with no task executions shows only its persistent execution; no empty `Tasks` subgroup is rendered.

### Error And Recovery

- If a task record does not resolve exactly one matching execution root, the backend rejects the snapshot/delta; the browser must not invent, partially place, or fall back to an address-equivalent row.
- A `changeSequence` gap triggers one snapshot refetch. It does not apply guessed parentage or retain a duplicate task materializer.
- A failed Agent focus/hydration keeps the tree identity intact and uses the existing workspace error treatment; it does not focus another run at the same address.

### Disabled / Unavailable

- Settled task executions are not disabled rows in the live tree; they are absent from it and remain available only through history.
- A Team row with no visible children has no expand affordance.

### Permission / Authentication

No new permission model is introduced. Existing Team workspace access governs visibility and commands.

## Responsive And Platform Behavior

- Desktop and web-equivalent desktop surfaces use the same semantic tree and exact IDs.
- Narrow layouts preserve indentation and expand/collapse meaning; primary task text truncates before status/chevron controls are displaced.
- Deep nesting may horizontally scroll or use the existing bounded-indent treatment, but it must not flatten execution parentage.

## Accessibility And Keyboard Behavior

- The navigation exposes tree/treeitem semantics with correct level and `aria-expanded` state for Team rows.
- Up/Down moves through visible rows; Right expands a collapsed Team; Left collapses an expanded Team or moves to its parent; Enter performs the row's primary action.
- The accessible name contains the full normalized task description even when visible text is truncated.
- Status is conveyed in text, not color alone.
- Focus indication is visible and distinct from hover and expansion state.

## Content, Labels, And Validation Messages

- Task row visible label: `Task: <normalized description prefix>`.
- Agent and AgentTeam tasks use the same label rule.
- AgentTeam-ness is conveyed by iconography and expand/collapse behavior, not by adding `Task Team` to the text.
- No secondary `taskId`, `agentRunId`, or `teamRunId` label appears in ordinary navigation.
- Full task description remains available to assistive technology and the existing task-detail/history surface.
- Status values use the existing localized product labels for `active` and `awaiting_review`; accepted/interrupted tasks are not live rows.

## Data And API Dependencies

```text
RootTeamRun snapshot barrier + consistent tree/task/message snapshot + recursively collected canonical Agent status + current changeSequence
  -> TeamExecutionViewProjector
  -> strict execution-tree + task/status DTOs
  -> TeamExecutionViewState reducer
  -> navigation selectors group by logical placement
  -> Team execution navigation component
```

- Logical grouping key: canonical node `address`.
- Exact Agent row/focus key: `agentRunId`.
- Exact Team row/expansion key: `teamRunId`.
- Task description/status/relationship: exact task record resolved through its task-execution reference.
- Member containment/order: execution tree and configured topology, never task message history.
- Expansion state: presentation-only frontend state keyed by exact `teamRunId`; not persisted in the three runtime JSON files.
- Canonical initial Agent status is collected through `TeamRun.getLeafAgentStatusSnapshots()` and mapped by the same status mapper/DTO used for live/history; the browser never synthesizes missing status.
- A status event racing snapshot capture is queued behind the barrier and applied at the next `changeSequence`; an equivalent status already present in the snapshot is an idempotent update.
- Communication records do not create or reorder navigation nodes.

The target replaces the current `TeamExecutionAddress`-keyed navigation projection and its separate transient task materialization. `TeamExecutionViewState` is the only frontend execution owner; components consume selectors and commands rather than parsing serialized identities. `changeSequence` is allocated by the backend `TeamRunEventPublisher`, is not persisted, and must not be confused with a requested task revision.

## Out Of Scope

- A wholesale visual redesign of the Team workspace.
- Showing technical task/run IDs in ordinary navigation.
- Turning Team rows into implicit coordinator message endpoints.
- Persisting expansion, hover, scroll, or focus presentation state in Team runtime JSON.
- Showing settled task subtrees in live navigation.
- Deriving task titles or summaries as new persisted fields.

## Open Decisions / Risks

No product decision remains open for task placement, visible labels, or Team expansion behavior. Implementation must verify the existing workspace component boundaries can adopt semantic tree rows without retaining a second task materializer or raw serialized-key consumers.

## Approval Status

- Under-placement task grouping: user-approved in discussion.
- Description-prefix task label with no secondary ID: user-approved in discussion.
- Expanded task AgentTeam shows the exact task Team members: user-approved in discussion.
- Cumulative UI/UX supplement: user-approved; SR-006 adds only the canonical initial-status source and snapshot-race rule required by ARCH-REV-001 DR-002.
