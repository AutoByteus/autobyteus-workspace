# Requirements Document — Task keys only where they link or refer

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `task-keys-declutter`
- Request / ticket: Project Task `autobyteus-132` "Declutter the UI: show Task keys only where they're needed (Task page, dependency links), not on every card and tree row" (2026-10-17)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), relaying the user's feedback after beta `v1.5.5-beta.3` (with a screenshot)
- Requirements owner: Solution Designer
- Date: 2026-10-17
- Approved by and reference: `Solution Designer within the direction (user informed)`. The intended behavior is the user's own direction in the Task; the remaining details (DEC-001 to DEC-004) stay within it.
- Exact approved baseline: this document at `SR-001`.
- Behavior-defining supplements:
  - Predecessor approved UI/UX spec `…/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md`. The user's 2026-10-17 direction supersedes it for DEC-001 (key on cards) and DEC-008 (key in the tree summary), and for VIS-001, VIS-002a–d, VIS-010, VIS-012, VIS-013 and VIS-015 in those respects.
  - Everything else in that spec stays normative.

## Problem And Desired Outcome

- Problem: the key appears as a line on every board card (page and right-panel tab) and leads every Task summary in the Workspaces tree. In lists it is redundant and noisy; in the tree it takes space from the summary.
- Desired outcome: keys appear only where they link or refer to a Task:
  - the Task page and the tab's Task view (key chip with copy);
  - the "Depends on" / "Required by" lists;
  - the dependency badge ("Blocked by autobyteus-35") and its hover list;
  - the "Depends on" picker.
- Success: board cards and tree summaries show no key; every other key surface unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | `ProjectTaskRow.vue:22-23` renders a key line above the summary on every Project Task card (page board and tab board) | No key line; the card starts with the summary | The badge with its key, preview, files, worker line, ordering, live highlight |
| BEH-002 | User | SCN-002 | `TaskWorkerTaskSummary.vue` leads with `<key> ` and puts the key in the tooltip / accessible name | Summary only; tooltip / name "Show Task in Projects: <summary>" (as before `task-keys-and-dependencies`) | The locate action |
| BEH-003 | User | SCN-003 | Key chip on the Task page and tab view; keys in dependency lists, badge, picker | Unchanged | All |
| BEH-004 | Contract | — | `taskWorkerTasks` answers carry `taskKey`, used only by the tree summary | Removed with its only consumer (dead after BEH-002) | Other worker-task fields |

## Scope Guardrail

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | Board cards (Projects page and right-panel tab) without a key line | SCN-001 |
| UC-002 | Tree Task summary without the key | SCN-002 |

### Out Of Scope

- Keys in tools, URLs, the Task page, lists, badge and picker (kept).
- Board search by key (separate Task 8865a11e).
- Other polish from Task 4f9b415d (OBS-001, OBS-004).
- The Product design record itself. It is Product-owned, so its update is requested through the delegating Task manager.

### Non-Goals

- Adding Task summaries to the badge tooltip (see DEC-003).

### Preserved Behavior Boundary

BEH-003; every key behavior of `task-keys-and-dependencies` other than BEH-001 / BEH-002.

### Review Authority

Standard: blocking findings must cite a REQ/AC/BEH; scope additions need user approval.

## Requirements

| ID | Requirement | BEH | Source |
| --- | --- | --- | --- |
| REQ-001 | Board cards (Projects page board and right-panel Projects tab board) show no Task key line. Everything else on the card is unchanged, including "Blocked by <key>" / "Dependency cancelled: <key>" and its tooltip. | BEH-001 | User 2026-10-17 |
| REQ-002 | The Workspaces tree's Task summary on delegated-copy rows shows only the Task summary, exactly as before the keys. Its tooltip and accessible name are "Show Task in Projects: <summary>". | BEH-002 | User 2026-10-17, confirmed via `/project_task_manager`: "remove the task key from displaying on the left side as well… show it like previous" (screenshot 57.png of "autobyteus-14 Simplify agent …") |
| REQ-003 | Keys stay unchanged in the Task page and tab Task view (chip with copy), the Depends on / Required by rows, the badge and its tooltip, the "Depends on" picker, tools and URLs. | BEH-003 | User 2026-10-17 |
| REQ-004 | Plumbing that only served the removed tree key is removed: the `taskKey` field of the Task worker answer, end to end. | BEH-004 | DEC-002 |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Projects page board and right-panel tab board with keyed Tasks, incl. a blocked one | No `project-task-row-key` element; card text starts with the summary; the badge still says "Blocked by autobyteus-NN" | Web unit; isolated-instance screenshots |
| AC-002 | REQ-002 | Tree with a delegated copy of a Project Task and of a Temp task | Summary text only, no key; tooltip / aria "Show Task in Projects: <summary>" | Web unit; isolated-instance screenshot |
| AC-003 | REQ-003 | Task page, tab Task view, dependency lists, picker | Keys shown as before | Existing tests pass; screenshot |
| AC-004 | REQ-004 | `taskWorkerTasks` query, store, types, GraphQL schema | No `taskKey` on the worker answer; tree still locates Tasks | Server and web unit; typecheck |
| AC-005 | All | Isolated desktop instance of the worktree build (TESTING.md) | Screenshots of board page, tab board, tree, Task page | Validation |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Entry | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Scan the board | Projects page / right-panel tab | Cards without key lines | Supported Normal | User feedback + screenshot |
| SCN-002 | User | User | Read a copy's Task in the tree | Workspaces tree | Summary text only | Supported Normal | Same |
| SCN-003 | User | User | Refer to / follow a Task | Task page, lists, badge | Keys shown | Supported Normal | User direction |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`.
- The user's direction (the Task text, 2026-10-17) supersedes the predecessor spec's card key line and tree key. The resulting cards and tree rows look as they did before `task-keys-and-dependencies`, plus the badge.
- Design record: Product-owned. Its update (spec DEC-001 / DEC-008 and the affected VIS) is requested through `/project_task_manager` (DEC-004).

## Quality And Non-Functional Requirements

N/A — display removal only.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

- GraphQL `TaskWorkerTaskView.taskKey` is removed. The only client is this web app; the field is shipped with the server.

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_e75dacc7-1da9-4dfa-92a4-2af0f7dabdd2/context/ctx_b7b473c521dd__56.png` | The user's screenshot (v1.5.5-beta.3) | Evidence |
| Predecessor `ui-ux-spec.md` | Still normative except DEC-001 / DEC-008 as above | Approved (superseded in part by the user) |

## Assumptions

None.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Other redundant key places? | The Task asks to judge every key surface by "links or disambiguates". Results:<br>• Task page / tab view chip: keep (it is the Task's identity, with copy).<br>• Dependency rows: keep (they link).<br>• Badge and tooltip: keep (they refer).<br>• Picker options: keep. You choose and search by key there, and summaries can repeat. The user's list ("Task page, lists, badge") does not name the editor picker. Removing keys there would break "Search by key or text" from the approved design, so it stays and the user is told.<br>• Tree summary, its tooltip and accessible name: remove the key everywhere in the tree.<br>No other surface shows keys. | Solution Designer | Decided |
| DEC-002 | Keep the worker answer's `taskKey`? | Its only consumer was the tree key. Keeping it would leave dead plumbing (the design principle "no dead code"). Remove it from server model, GraphQL, web query, store and type. The user asked about it on 2026-10-17 and confirmed "tiding up also okay". | Solution Designer; confirmed by the user 2026-10-17 | Decided |
| DEC-003 | Without keys on cards, how does the user find "autobyteus-35" from a badge? | The user's direction keeps the badge key "because there it tells you which Task is meant". Hovering already lists the dependencies with status; the Task page lists them with links; search by key is Task 8865a11e. Adding summaries to the tooltip would be new visible behavior the direction does not ask for, so it is not added. It is mentioned to the user as an optional idea. | Solution Designer | Decided |
| DEC-004 | Updating the design record | The record is Product-owned (separate repository and ticket), so this team must not edit it. Ask `/project_task_manager` to route a Product Team request: record that the user's 2026-10-17 direction removes the card key line and the tree key, and update the affected spec items and VIS. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-005 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-005 | SCN-002 |
| REQ-003 | — | BEH-003 | AC-003 | SCN-003 |
| REQ-004 | UC-002 | BEH-004 | AC-004 | SCN-002 |

## Architecture Phase Input

- Web-only display removal plus removal of one unused API field. No persistence.

## Readiness Check

- All content checks: `Yes`. Approved within the direction (user informed 2026-10-17). Ready for design: `Yes`.
