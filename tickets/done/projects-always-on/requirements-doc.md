# Requirements Document

## Document Status
- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package: `projects-always-on`
- Request: remove the Projects feature flag (user, 2026-10-07). Extended in SR-003 with a Projects tab in the right panel (user: "Just do it in this current ticket").
- Owner: Solution Designer; Date: 2026-10-07
- Approval: approved by the user on 2026-10-07: "I guess we need to do some cleanup. Even though it's not there, but we just don't read it… In general, first we need to remove this feature flag now and projects always on." Baseline SR-002 (REQ-001..005, AC-001..005, DEC-001 resolved).
- SR-003 approval (2026-10-07): the user directed the Projects tab into this ticket: "You should just update the requirement on this ticket instead of a new ticket… this is so small. Just do it in this current ticket." Taken as approval of the tab behavior discussed and recorded below (D-001..D-003, P-001..P-005), built directly with no Product round (DEC-002 option b).
- Supplements: none

## Problem And Desired Outcome
- Problem: Projects is hidden behind a per-node `ENABLE_PROJECTS` setting that is off by default. Users must find and turn on a switch (which needed a second click) before they can use a mature feature.
- Desired outcome: Projects is always available in the desktop app, with no switch anywhere.

## Behavior
| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Projects nav item and `/projects*` routes appear only when the node's flag is on | Always shown and reachable on desktop, for every node/window | Navigation order (Projects after Agent Orgs) |
| BEH-002 | Server Settings shows a Projects on/off switch (Basics; Advanced key) | No Projects switch or setting anywhere | Other settings, including the Applications switch |
| BEH-003 | Mobile runtime hides Projects (`isFeatureAvailableInRuntime`) | Unchanged | Mobile unsupported |
| BEH-004 | Backend CRUD, agent tools and the change feed work regardless of the flag | Unchanged | — |

## Scope
- UC-001: open Projects on any desktop node without configuration.
- Out of scope:
  - mobile Projects support;
  - the Applications flag;
  - any change to Projects behavior.
- Preserved: all Projects data and behavior; `project-manager-ux` and `task-card-compact-summary` outcomes.

## Requirements
| ID | Requirement |
| --- | --- |
| REQ-001 | The Projects navigation entry and all `/projects*` pages are always available in the desktop app, without any setting |
| REQ-002 | The `ENABLE_PROJECTS` setting, its Server Settings switch, its Advanced-settings handling and its capability API are removed. The code, tests, probes and docs no longer refer to it. |
| REQ-003 | A node that previously stored `ENABLE_PROJECTS` (true or false) shows Projects. The stored value is no longer read and has no effect (DEC-001); it is not migrated or deleted. |
| REQ-004 | Mobile behavior is unchanged; Projects stays unavailable there |
| REQ-005 | No Project, Task or other data is changed or lost |

## Acceptance Criteria
| ID | REQ | Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | On a fresh node, Projects appears after Agent Orgs and `/projects` opens |
| AC-002 | REQ-001, 003 | On a node with `ENABLE_PROJECTS=false` stored, Projects appears and opens. Basics shows no Projects switch. Advanced may list the old key as an ordinary custom setting without any effect, and the user can delete it there. |
| AC-003 | REQ-002 | Server Settings Basics shows no Projects card; the GraphQL schema has no Projects capability query or mutation |
| AC-004 | REQ-004 | The mobile runtime does not show Projects |
| AC-005 | REQ-005 | Existing Projects and Tasks are listed unchanged after upgrade |

## SR-003 Addition: Projects Tab In The Right Panel

Problem: To watch the Project Task Manager's work, the user switches between the Projects page and the conversation. Opening a worker from the board leaves the board. User: "…the project task manager and the agent, event monitor and the projects itself are on the same screen. So I can talk, I can see the changes at the same time."

User decisions:
- D-001: a tab in the right panel's tab row ("just add another tab… on the right side of tabs");
- D-002: placed **first, before Files** ("we put the Projects tab before Files");
- D-003: always available on desktop (this ticket removes the flag).

| ID | Requirement |
| --- | --- |
| REQ-006 | The right panel of the conversation screens (`/workspace`, `/chat?id=…`) has a "Projects" tab, first in the tab row (before Files), on desktop only (hidden in the mobile runtime). It is also in the collapsed right strip and the drawer, in the same order. |
| REQ-007 | At the top of the tab, a picker selects a Project or "Temp tasks". The last choice is remembered per node across restarts; the first default is the most recently updated Project, else Temp tasks. With no Projects and no Temp tasks it shows an empty state with a link to the Projects page. |
| REQ-008 | Below the picker, the same live board as the Projects page for that choice: cards (compact text, per `task-card-compact-summary`), worker line and statuses, live highlight, search, Refresh. Lanes stack vertically in the narrow panel (the board's existing narrow layout). |
| REQ-009 | Clicking a worker opens its conversation in the center, as on the Projects page; the Projects tab stays selected and visible |
| REQ-010 | Clicking a card shows that Task's details inside the tab (full description, files/reference files, "Assigned to"), with a back arrow to the board and an "Open in Projects" link to the full Task page (where editing stays). It updates live. |
| REQ-011 | The Projects page is unchanged as the full-size view |

| AC ID | REQ | Outcome |
| --- | --- | --- |
| AC-006 | REQ-006 | The tab is first (before Files) in the tab row, strip and drawer on `/workspace` and `/chat?id`; absent in the mobile runtime |
| AC-007 | REQ-007 | Picking a Project, then reloading the app, shows the same Project; first use defaults as specified; empty state with link |
| AC-008 | REQ-008 | An agent creating or moving a Task updates the tab's board live while the conversation stays in the center; lanes stack |
| AC-009 | REQ-009 | Clicking a Running worker opens its conversation in the center; the Projects tab stays open |
| AC-010 | REQ-010 | Clicking a card shows the details in the tab; back returns to the board with search kept; "Open in Projects" opens the full Task page |
| AC-011 | REQ-011 | The Projects pages behave as before |

## Open Decisions
| ID | Question | Recommendation |
| --- | --- | --- |
| DEC-002 | Product round for the tab? | **Resolved (b): build directly** (user: "this is so small. Just do it"). |
| DEC-001 | What happens to an already stored `ENABLE_PROJECTS` value? | **User decision (2026-10-07): just don't read it.** No migration or deletion. Consequence: it may still be listed in Advanced as an ordinary, deletable custom setting (`getAvailableSettings` lists every stored key). |
