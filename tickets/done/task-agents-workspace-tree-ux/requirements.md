# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

The frontend should represent delegated task execution with a clean product and architecture split:

- The **global left Workspaces tree** shows execution identity and hierarchy: durable agents/teams plus transient task-agent/task-team executions in their logical position.
- The **right Team -> Tasks section** shows the task details/content itself, in a message/detail style, not the transient execution hierarchy.

The earlier/original Workspaces-tree implementation was directionally right because task-agent projections appeared inline under the relevant team/member hierarchy. Its weakness was visual/architectural ambiguity: transient task execution nodes were rendered like ordinary durable members. The target is to restore the original inline placement idea while adding explicit visual semantics and a clean display-row boundary.

Approved visual language:

- durable row: existing solid leading status circle, normal background;
- transient task-agent/task-team row: dotted/dashed leading status circle plus light ghost background;
- no visible `Temp`/`Temporary` wording by default; tooltip/aria text may exist for accessibility.

## Investigation Findings

- Older/original direct Workspaces-tree path found: in `0fae9c60` (`chore(ticket): checkpoint validated team roster fix`, 2026-06-02), `buildTeamRowsFromContext()` used `teamContext.memberTree` directly for live teams, and `WorkspaceHistoryWorkspaceSection.vue` rendered `flattenTeamMembers(team)`. Because task-agent projections were already inserted into `memberTree`, task-agent rows appeared inline under the team/member hierarchy with the same normal row renderer as durable members.
- Earlier active-execution utilities in `cc2151f6` / `0ebd9a45` arranged task-agent nodes near their logical parent for display. This confirms inline placement was not accidental; it matched the runtime hierarchy.
- Later full global-tree attempt: `6d772875` added `TeamActiveTaskContextTree` under `WorkspaceHistoryWorkspaceSection.vue`, but rendered too much there: task summary, actor rows, task-team members, reference rows, and technical details. This is not the desired shape.
- Removal/rollback path: `d0c2f995` added `isTransientTaskProjectionNode()` filtering in `buildTeamRowsFromContext()`, and `2c2e9311` moved transient task UI to the Team tab because projections looked duplicate/disappearing when rendered like ordinary members.
- Current runtime projection still already inserts transient nodes in the right place:
  - task-agent projections are inserted after/near their logical member;
  - task-team roots are inserted after/near their structural team;
  - task-team children are scoped beneath the transient task-team root.
- Current right `TeamActiveTaskNavigator.vue` mixes task detail rows and execution identity rows. The clarified design should move execution identity rows left and keep only task detail/content on the right.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Information Architecture Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis: Original inline placement was simple and product-correct but mixed transient execution nodes into stable row rendering. Later full context rendering overcorrected by moving task details into the left tree. Current Team Tasks-only rendering hides execution identity and mixes task content with execution identity in the right navigator.
- Requirement or scope impact: Split execution identity from task detail: left owns hierarchy/identity/focus; right owns task content/details.

## Recommendations

1. Preserve the stable `buildTeamRowsFromContext()` filtering as the durable member-row boundary.
2. Add a renderer-facing Workspaces display-row layer that composes:
   - stable durable rows from existing stable row projection;
   - transient task execution rows from live `AgentTeamContext.memberTree` projection nodes.
3. Render transient rows inline in the Workspaces tree at the same logical placement the original implementation had, but with distinct visuals: dotted/dashed leading status circle plus light ghost background.
4. Do not render a separate `Live delegated tasks` group/card.
5. Do not restore `TeamActiveTaskContextTree` or any full task-context block in the Workspaces tree.
6. Refactor right Team -> Tasks so it shows task detail/content only, message-style. It may still list/select active tasks by task detail/summary when multiple tasks exist, but it must not be the primary place for task-agent/task-team execution hierarchy.
7. Clicking a transient row in the Workspaces tree should focus that execution target through the existing team member focus path.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Rationale: The change crosses Workspaces display-row construction, Workspaces row rendering, Team active-task detail rendering, visual semantics, tests, localization/aria, and docs. Runtime projection data already exists; backend semantics are not expected to change.

## In-Scope Use Cases

- `UC-TWU-001`: User sees a transient task-agent row inline under/near the logical member that spawned it.
- `UC-TWU-002`: User sees a transient task-team row inline under/near the logical structural team, with scoped transient child rows when present.
- `UC-TWU-003`: User can distinguish durable vs transient rows through solid leading status circle vs dotted/dashed leading status circle plus light ghost background.
- `UC-TWU-004`: User clicks a transient execution row in the Workspaces tree and focuses that task-agent/task-team/member in the center workspace.
- `UC-TWU-005`: User reads task details/content on the right Team -> Tasks surface, message-style, without duplicated execution hierarchy there.
- `UC-TWU-006`: Transient rows disappear from the Workspaces tree when runtime projection cleanup removes them.

## Out of Scope

- Moving task body, task summary blocks, references, technical details, task arguments, or approval controls into the Workspaces tree.
- Adding a separate `Live delegated tasks` group/card.
- Persisting completed task-agent/task-team executions as durable history rows.
- Backend task execution semantics unless implementation proves required projection identity is missing.
- Broad redesign of non-task Team messages or Activity panels.

## Functional Requirements

- `REQ-TWU-001`: The global Workspaces tree must render active task-agent execution rows inline at their logical live runtime position.
- `REQ-TWU-002`: The global Workspaces tree must render active task-team execution rows inline at their logical live runtime position, including scoped child rows when present.
- `REQ-TWU-003`: Durable rows must keep the existing solid leading status circle and normal background semantics.
- `REQ-TWU-004`: Transient task execution rows must use dotted/dashed leading status circle plus light ghost background.
- `REQ-TWU-005`: Transient task execution rows must not be represented as ordinary durable `TeamMemberTreeRow` history rows.
- `REQ-TWU-006`: The right Team -> Tasks section must remain the owner for task detail/content, such as task body/summary, references, technical details, and selected task detail.
- `REQ-TWU-007`: The right Team -> Tasks section must not retain the task-agent/task-team execution hierarchy as its primary visible identity UI after those rows move left.
- `REQ-TWU-008`: The Workspaces tree must not render task body, reference rows, technical details, raw task arguments, or approval controls.
- `REQ-TWU-009`: Clicking a transient Workspaces row must focus the corresponding execution target through the existing team member focus path.
- `REQ-TWU-010`: Transient rows must disappear when their backing projection node is removed.
- `REQ-TWU-011`: Tests and docs must encode the new boundary: left execution identity/hierarchy; right task detail/content.

## Acceptance Criteria

- `AC-TWU-001`: Given a task-agent projection exists in live `AgentTeamContext.memberTree`, the Workspaces tree shows it inline under/near the logical member, not in a separate task group.
- `AC-TWU-002`: Given a task-team projection exists, the Workspaces tree shows it inline under/near the logical structural team and renders scoped child rows beneath it.
- `AC-TWU-003`: Given stable and transient rows are visible together, stable rows use solid leading status circle while transient rows use dotted/dashed leading status circle plus light ghost background.
- `AC-TWU-004`: Given stable and transient rows are visible together, transient rows have explicit row kind/data-test markers and are not produced as ordinary durable history rows.
- `AC-TWU-005`: Given the user clicks a transient row, existing team member focus behavior focuses that task execution target.
- `AC-TWU-006`: Given the right Team -> Tasks section is open, it shows task detail/content and does not duplicate the left-side execution hierarchy as primary rows.
- `AC-TWU-007`: Given a task has references or technical details, those remain on the right and do not render in the Workspaces tree.
- `AC-TWU-008`: Given the task projection is cleaned up, the transient Workspaces row disappears without a stale history row.
- `AC-TWU-009`: Existing stable Workspaces row tests continue to prove stable row behavior, while new tests cover transient display rows and visual semantics.

## Constraints / Dependencies

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux`
- Branch: `codex/task-agents-workspace-tree-ux`
- Base: `origin/personal` at `b3a2b15393bbf16fefccce9174b982a641bd42dc`
- Follow the design principles strictly: spine-first design, clear authoritative boundaries, no compatibility dual paths, explicit removal plan, and no mixed stable/transient ownership.
- Reuse current runtime projection placement from `AgentTeamContext.memberTree`.
- Preserve stable row semantics in `buildTeamRowsFromContext()`; do not make transient projections ordinary stable rows again.

## Assumptions

- The user-approved “original place” is the global left Workspaces/run-history tree under the relevant team/member hierarchy.
- The right Team -> Tasks surface should feel like task detail/message content, not an execution hierarchy.
- Dotted/dashed circle plus light ghost background is sufficient visible semantics without visible text labels.

## Risks / Open Questions

- Risk: display-row mapping could become a second runtime owner if it stores projection state. Mitigation: make it pure/derived from current live context and stable rows.
- Risk: right Team Tasks may need a minimal task selector when multiple tasks are active. Mitigation: selector/list must be task-detail oriented, not execution hierarchy oriented.
- Risk: visual semantics too subtle. Mitigation: tune dotted stroke and ghost background contrast while avoiding visible text by default.
- Open question: exact component split for right task detail after actor/member rows are removed; implementation should choose the smallest clean change that preserves task details.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| `REQ-TWU-001` | `UC-TWU-001` |
| `REQ-TWU-002` | `UC-TWU-002` |
| `REQ-TWU-003` | `UC-TWU-003` |
| `REQ-TWU-004` | `UC-TWU-003` |
| `REQ-TWU-005` | `UC-TWU-003`, `UC-TWU-006` |
| `REQ-TWU-006` | `UC-TWU-005` |
| `REQ-TWU-007` | `UC-TWU-005` |
| `REQ-TWU-008` | `UC-TWU-005` |
| `REQ-TWU-009` | `UC-TWU-004` |
| `REQ-TWU-010` | `UC-TWU-006` |
| `REQ-TWU-011` | All use cases |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-TWU-001` | Original inline task-agent placement restored with clean row kind. |
| `AC-TWU-002` | Task-team and scoped child projection placement works. |
| `AC-TWU-003` | Approved visual semantics are enforced. |
| `AC-TWU-004` | Stable/transient boundary is testable. |
| `AC-TWU-005` | Transient row interaction focuses execution target. |
| `AC-TWU-006` | Right-side task UI owns details only. |
| `AC-TWU-007` | Workspaces tree remains free of task details. |
| `AC-TWU-008` | Temporary lifecycle cleanup works. |
| `AC-TWU-009` | Regression coverage reflects clean architecture. |

## Approval Status

Approved product direction from user on 2026-06-30. Redesign requested to strictly follow design principles and produce the cleanest architecture boundary: left Workspaces tree owns transient execution identity/hierarchy; right Team -> Tasks owns task detail/content only.

## Addendum: Concrete Visual Requirements (2026-07-01)

The transient-row visual requirement is now explicit:

- `REQ-TWU-012`: A transient execution row must have exactly one visible dotted/dashed circular marker.
- `REQ-TWU-013`: That marker must be the leading status indicator in the same slot where stable rows show the solid status dot.
- `REQ-TWU-014`: A transient execution row must not render an additional dotted/dashed initials/avatar circle.
- `REQ-TWU-015`: A transient execution row must not render a trailing dotted/dashed circle or transient marker at the far right.
- `REQ-TWU-016`: A transient execution row must not show visible `Temp`, `Temporary`, or `Temporary task execution` text by default; accessibility-only text or tooltip is allowed.
- `REQ-TWU-017`: A transient execution row must retain the light ghost background.
- `REQ-TWU-018`: A transient task-team row that has child member rows must be collapsed by default, matching the existing persistent agent-team row behavior.
- `REQ-TWU-019`: Expanding or collapsing a transient task-team row must be a user-controlled disclosure action; rendering the transient task-team row must not automatically expose its children.
- `REQ-TWU-020`: A transient task-team row's collapsed/expanded state must be keyed by that transient execution row identity, not by only the persistent team definition, so two simultaneous task-team executions do not share expansion state accidentally.

Additional acceptance criteria:

- `AC-TWU-010`: Component tests assert one and only one visible transient circular marker per transient row.
- `AC-TWU-011`: Component tests assert no dashed/dotted initials/avatar marker exists on transient rows.
- `AC-TWU-012`: Component tests assert no trailing dashed/dotted marker exists on transient rows.
- `AC-TWU-013`: Component tests assert the transient marker occupies the leading status-dot slot.
- `AC-TWU-014`: Component tests assert a transient task-team root row is visible but its child rows are hidden before the user expands that task-team row.
- `AC-TWU-015`: Component tests assert clicking the transient task-team disclosure expands its child rows and clicking again collapses them without changing right-side task detail ownership.
