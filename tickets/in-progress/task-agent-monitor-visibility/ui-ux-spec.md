# UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined` — aligned to the user's 2026-08-31 scope clarification: frontend exact-run content/status visibility only; no Agent prompt, tool-choice, or backend lifecycle changes.

## UX Goal

Make a delegated task Agent inspectable and understandable at a glance. When a user selects a `Task:` row, every workspace surface must visibly switch to authoritative state for that exact task execution and must say both what is happening in the formal task workflow and what the Agent execution is doing now. The UI must never style the task child as current while silently showing either the configured parent or an unhydrated exact-task shell, and it must distinguish loading/error from a genuinely empty task history.

## Related Requirements And Acceptance Criteria

- Requirements: R-001–R-011, including R-007–R-008 lifecycle-independent exact-content visibility and backend/Agent preservation.
- Acceptance criteria: AC-001–AC-015, including AC-008 and AC-012–AC-014 for lifecycle/tool-choice-independent rendering with no inferred transition.
- These IDs add no manual submission control and authorize no prompt/backend change.

## Users / Personas / Contexts

- Department/team operator monitoring delegated work in a long-lived Electron window.
- Agent/team builder checking whether a dedicated task assignee is working, waiting, failed, or ready for review.
- Browser-based operator using the web-equivalent frontend against a configured Docker/remote node.
- Keyboard and assistive-technology user navigating the execution tree and monitor.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Operator in an already-open Team | A live task row exists under a configured Agent; another member may be focused | Inspect the exact task | Task row, header, monitor, and Activity all resolve one exact task AgentRun | R-001–R-004, R-009; AC-001–AC-003, AC-007, AC-009 |
| UXJ-002 | Operator comparing parent and task | Configured Agent and same-address task Agent both exist | Understand which execution is selected | Parent shows its own state; task shows its own state and task marker; no content crosses | R-001, R-006, R-009; AC-005, AC-007, AC-015 |
| UXJ-003 | Operator selecting a not-yet-hydrated task | Task context/topology is local, retained monitor state is not loaded | Wait for authoritative task activity | Loading resolves to retained+live content, a true empty state, or recoverable error while prior focus stays coherent | R-002–R-004, R-010; AC-003, AC-006, AC-010 |
| UXJ-004 | Operator reading status | Task Agent may be running or idle while task remains active/awaiting review | Know both workflow and execution state | Visible compact `Lifecycle · Execution` wording removes ambiguity | R-005–R-006, R-010; AC-004–AC-005, AC-011 |
| UXJ-005 | Keyboard/screen-reader user | Focus is in the execution tree | Select and verify a task | Enter/Space invokes the same atomic path; exactly one current row and full spoken status/context | R-002, R-010; AC-006, AC-011 |
| UXJ-006 | Operator during live task activation/settlement | Team is open and a stream event changes task topology | Continue current work without surprise | Activation does not steal focus; settlement repairs invalid focus and all surfaces converge | R-004, R-009; AC-002, AC-009 |

## Journey Details

### UXJ-001 — Select an exact task in an already-open Team

1. The user expands the existing Team hierarchy and finds a transient `Task: <description prefix>` child beneath the configured Agent placement.
2. The user selects the task row by pointer, Enter, or Space.
3. If the task monitor projection is already authoritative locally, selection commits immediately. Otherwise the target row exposes an in-progress loading treatment while the currently selected workspace remains coherent.
4. On success, the task row becomes the sole current row and the header, center event monitor, Activity pane, and existing focus-dependent tabs resolve the same exact task AgentRun.
5. The header visibly identifies `Task`, retains the logical Agent name, displays the execution state, and makes the full task description discoverable.
6. The task row displays formal lifecycle and execution status together.

### UXJ-002 — Compare configured parent and task child

1. Selecting the configured parent renders its own header/status/monitor, even when it is `Offline` with no recorded Activity.
2. Selecting the task child renders the task run's status and retained work, even though both display the logical name `prototype_bootstrapper`.
3. Returning to the parent restores only the parent context. No monitor content/status is copied or cached under the wrong identity.

### UXJ-003 — Load, recover, or confirm empty

1. Selection begins exact task projection loading.
2. The row remains keyboard focused but is not marked `aria-current` until the exact focus transaction succeeds.
3. Success merges retained projection content with newer live events and commits selection once.
4. If authoritative content is truly empty, the monitor states `No activity recorded for this task yet.`
5. If loading fails or identity validation fails, the previous execution remains current. An inline error announces the failure and exposes `Retry`; retry repeats the exact task selection/hydration operation.

### UXJ-004 — Interpret dual status

- `In progress · Running`: the task is formally assigned and the Agent is generating/executing.
- `In progress · Idle`: the task is still formally active but the Agent is between turns or has stopped generating; this is not completion.
- `Awaiting review · Idle`: the assignee formally submitted a result and the delegator has not yet decided.
- `Revision requested · Running/Idle`: formal review requested another result; execution status says whether work is happening now.
- `Accepted` / `Interrupted`: terminal lifecycle wording appears wherever the settled task is represented in task history or historical execution inspection. Existing live-tree settlement behavior remains intact.

### UXJ-006 — Live topology changes

- Activation inserts/updates the task row but keeps the user's current exact selection.
- Snapshot/reconnect rebuilds topology and reuses the exact focused AgentRun when still visible.
- Settlement of a nonfocused task only removes/updates that task representation.
- Settlement of the focused task invokes existing valid fallback selection; the tree, header, monitor, and Activity switch together.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Team execution tree | Navigate configured and transient executions | Team selected/open | parent, task normal, task loading, task current, task lifecycle/execution states, activation, settlement | select Agent/task; expand task Team where applicable |
| Transient task Agent row | Represent one exact task AgentRun | Active or otherwise inspectable task execution projects under logical placement | normal, hover/focus, loading, current, lifecycle+execution status | atomic exact-run selection |
| Team workspace header | Confirm selected execution identity/context | Exact Team member focus committed | configured Agent, task Agent, execution status, task marker, task description tooltip/title | inspect monitor/tabs or change selection |
| Center conversation/event monitor | Show exact run conversation and work | Exact task projection authoritative | retained+live content, loading, true empty, recoverable error | monitor work, retry, select another run |
| Right Activity pane | Show exact run tool/activity events | Exact focus committed | event count/list, true empty; same identity as center monitor | inspect event details |
| Existing task detail/history surface | Show formal delegation lifecycle/results | Team context contains task records | active, awaiting review, revision requested, accepted, interrupted | inspect lifecycle; formal tools remain agent-driven |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Task projection already authoritative | Select task row | Standard pressed/focus feedback | Task becomes sole current row; all surfaces switch together | Exact focus commits; no network fetch required | inspect, change tabs/selection |
| Task projection missing/incomplete | Select task row | Row indicates loading; previous workspace stays rendered/current | On success, task becomes current and exact content appears | Fetch/validate/merge exact projection, then commit focus | inspect |
| Projection fetch/validation fails | Select task or retry | Error announced; loading stops | Previous row remains current; target is not current | No partial focus/selected-member commit | Retry or select another row |
| Live task activation | Stream event | New task row appears without selected styling | Existing selected workspace remains unchanged | Topology reconciles; no focus theft | select new task when desired |
| Live snapshot/recovery | Stream checkpoint/snapshot | Existing recovery notice behavior if needed | Exact focus preserved if still visible; otherwise one fallback becomes current | Context/topology replace and focus reconcile atomically | continue or select another row |
| Task submission event | Formal `submit_task_result` succeeds | Lifecycle text updates | `Awaiting review · <execution>` shown while execution remains represented | Existing task record update/state transition | delegator reviews formally |
| Task settlement | Accepted/interrupted settlement event | Affected live task leaves or updates per existing tree policy | Nonfocused selection unchanged; focused task repairs to one coherent fallback | Existing settlement state/tree transition | inspect task history or another run |

## Markdown Wireframes / Visual Structure

### Execution tree: configured parent plus task

```text
●  prototype_bootstrapper                              Offline
   └─ Task: Outcome: Baseline Needed…
      In progress · Idle
```

The task retains the established transient indentation/border/selection treatment. Status becomes visible text rather than only a dot. On constrained width, the task description truncates first; the lifecycle/execution line remains readable or has an accessible full label.

### Selected task header

```text
[P]  prototype_bootstrapper  [Task]  Idle
     Outcome: Baseline Needed…
```

- `Task` is a compact visible badge/marker.
- `Idle` is the existing Agent execution status.
- The task description may be a compact secondary line or accessible title/label; it must not expose `taskId` or `agentRunId`.
- Formal lifecycle remains visible in the task row and may also appear near the task description when layout permits; one authoritative label source drives both.

### Selection loading without false switch

```text
Task: Outcome: Baseline Needed…
Loading task activity…

[previous exact member monitor remains coherent]
```

### Recoverable error

```text
Couldn't load task activity.  [Retry]
```

### True empty task monitor

```text
No activity recorded for this task yet.
```

## Non-Happy-Path States

### Loading

- Use `Loading task activity…` (localized equivalent) during required exact projection hydration.
- Loading must not clear the prior monitor, show the target as current, or momentarily render the target's empty context as authoritative.
- Expose busy state on the selecting task row/operation; preserve keyboard focus.

### Empty

- Only after successful authoritative hydration and reconciliation may an empty task show `No activity recorded for this task yet.`
- A configured parent's existing generic empty wording may remain when that configured parent is actually selected.
- Zero events must not be used as proof that a task is not working or completed.

### Error And Recovery

- Exact projection/identity failure: `Couldn't load task activity. Retry` (localized equivalent).
- Keep the previous coherent exact selection and its monitor; never combine previous content with target current-row styling.
- `Retry` reuses the exact same selection transaction and is keyboard accessible.
- Existing Team stream recovery notice remains the recovery surface for stream checkpoint/gap failures; after recovery, focus/topology must converge.

### Disabled / Unavailable

- Nonfocusable task-Team container rows retain disclosure-only behavior; their member Agent rows remain the focus targets.
- Settled task executions absent from live navigation are not selectable there; they remain inspectable through existing task history/historical surfaces where supported.
- A task Agent row with an unavailable exact execution must not be rendered as focusable current content.

### Permission / Authentication

- No new permission or authentication state. Existing Team/run access and exact task authorization apply.
- Internal IDs remain hidden from ordinary labels while still governing selection internally.

## Responsive And Platform Behavior

- The behavior and labels must match in the Electron renderer and ordinary browser-equivalent frontend against embedded and configured nodes.
- Primary validation viewport follows the supplied desktop workspace. At narrower supported desktop widths, description text truncates before lifecycle/execution meaning is lost.
- This ticket does not redesign mobile navigation; any existing surface that presents the same task row/header must still consume the same exact-focus/status state rather than inventing a parallel interpretation.
- Honor `prefers-reduced-motion`; no new motion is required.

## Accessibility And Keyboard Behavior

- Task rows remain `role="treeitem"`; pointer, Enter, and Space invoke the same atomic selection operation.
- Exactly one visible Agent execution row in the selected Team exposes `aria-current="true"` after successful selection.
- A loading target exposes busy/loading semantics but not current selection.
- Accessible row name includes full task description, task role, formal lifecycle, Agent execution status, logical address, and tree level; it does not expose internal IDs.
- Status meaning must be present in text; color/status dots are supplementary.
- Error uses an announced alert/status pattern, and Retry has an explicit accessible label.
- Existing visible focus rings and tree-level semantics remain.

## Content, Labels, And Validation Messages

| Meaning | Required English source label |
| --- | --- |
| Task marker | `Task` |
| Active lifecycle | `In progress` |
| Submitted lifecycle | `Awaiting review` |
| Revision lifecycle | `Revision requested` |
| Accepted lifecycle | `Accepted` |
| Interrupted lifecycle | `Interrupted` |
| Combined compact status | `<Lifecycle> · <Execution status>` |
| Projection loading | `Loading task activity…` |
| Projection error | `Couldn't load task activity.` |
| Recovery action | `Retry` |
| Authoritative task empty | `No activity recorded for this task yet.` |

Use localization keys for all new visible/accessible copy. Do not use `Complete` for `Idle`, `Awaiting review`, or an ordinary completion message.

## Data And API Dependencies

- Exact focused AgentRun: owning `AgentTeamContext.view` focus state.
- Row lifecycle/execution values: existing projected `taskStatus` and `currentStatus`.
- Retained monitor: existing `GetTeamMemberRunProjection(teamRunId, agentRunId)` response.
- Live monitor/status: existing Team execution snapshot/events and per-Agent stream dispatch.
- Formal lifecycle: existing task delegation record and `TASK_DELEGATION_EVENT` updates.
- Task context: existing task description/record associated to the exact task execution; no new public ID display.

## Out Of Scope

- New manual task submit/review buttons in this workspace.
- Full visual redesign of Team task history, Activity, Token, Artifacts, or the navigation hierarchy.
- Automatically selecting new tasks, inferring completion, or displaying internal IDs.
- Mobile-specific information architecture changes.

## Open Decisions / Risks

- Design must choose the smallest established header layout that keeps the `Task` marker and description discoverable without crowding existing actions. The required information hierarchy is authoritative; exact spacing/token choice is implementation-level.
- The clean-baseline node-8001 experiment deterministically reproduces the defect when a live stream associates a new exact task context and the user selects its row after backend content already exists: both focus IDs are exact, but the local shell stays `Offline`/empty because selection performs no exact projection query. Coverage must encode that live-created-shell path and still validate snapshot/recovery/fresh-open boundaries that share the hydration/convergence code.

## Approval Status

Initially approved on 2026-08-31 and refined by the user's explicit scope clarification the same day. The authoritative UI scope confirms:

1. task rows show visible `formal lifecycle · Agent execution` status;
2. the selected header shows a `Task` marker and exact task context;
3. selection does not switch current-row state until exact hydration succeeds; and
4. new task activation does not steal the user's focus; and
5. exact task messages/Activity remain visible regardless of LLM collaboration-tool choice, without changing prompts or backend lifecycle behavior.
