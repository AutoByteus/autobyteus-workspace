# Requirements Document — remote-nodes-page (autobyteus-267)

## Document Status

- Status: `Approved` (SR-002). The user approved the Product Team's UI/UX package ("approved", 2026-10-21) with two scope decisions made in its review, which are applied here; the rest is within the Task's direction (Solution Designer, user informed).
- Approved UI/UX package (Product-owned, linked): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-nodes-page/ui-ux-spec.md` with `visual-references/VIS-001 … VIS-007`, design repository `personal` @ `d9e25db`, runnable reference per its runbook section `remote-nodes-page`. Every visible detail in it is normative except what it marks illustrative.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-267.
- Investigation: [investigation-notes.md](investigation-notes.md).

## Problem And Desired Outcome

After adding a peer, the owner sees only its name, URL and ID. He can't see what it offers, or whether his own shared agents would start for a peer. The desired outcome: the Remote Collaboration page shows each peer's state and offer, exactly what an agent would see, and this node's shared agents and Teams, each flagged when a peer's start would be refused, with a way to fix it.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-501 | A peer row shows name, URL and ID | Each peer also shows its state now (available, or why not) and its Agents and Teams (name, kind, description when it has one) | Rename, Remove and the add form |
| BEH-502 | The availability card is one paragraph | **Changed by the user:** the card is removed. Its rules stay as one collapsed line, "How peers' runs work", at the bottom of the Peer nodes card. No list of this node's own entries: "I can see them from the Agents and Agent Teams pages, it is redundant" | The rules' content |
| BEH-503 | — | Long lists can be narrowed by name, with a short default view | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-501: the owner sees what each peer offers and whether it can be used now.
- ~~UC-502~~: removed by the user (BEH-502).
- UC-503: the owner finds an entry in a long list.

### Out Of Scope

- Starting or messaging a remote run from the page.
- Changing what is shared: everything shared is offered (245).
- Polling or live updates.
- The agent tools' behavior (261 is unchanged).
- Global send (262); security (S6).

### Non-Goals

- No definitions, prompts, settings or credentials of a peer reach this node or the window.
- No version checks (rule 9).
- No cache of peers' lists.

### Preserved Behavior Boundary

- The switch, the peer management and its errors.
- The agent tools' results and texts from 261.
- With the switch off, no request goes to any peer.

### Prerequisites

None found.

### Review Authority

The user, for scope and the UI (the Product Team's package, which he approves); the Solution Designer, within the direction.

## Requirements

| ID | Requirement | Behavior | Priority |
| --- | --- | --- | --- |
| REQ-501 | For each registered peer, the page shows its state: available, or unavailable with the reason the agent tools would give (remote collaboration off there, this node not registered there, not reachable, or a different server at its address). A peer on an older build shows as not reachable. | BEH-501 | Must |
| REQ-502 | For an available peer, the page shows its Agents and Agent Teams with name, kind and description (when it has one): the same list `list_available_agents` with that node gives an agent. | BEH-501 | Must |
| REQ-503 | One source: this node's server asks the peer, through the same discovery owner the agent tools use. The window never contacts a peer. Only names, kinds, addresses and descriptions travel. | BEH-501 | Must |
| REQ-504 | A peer is asked when the page opens (each time the tab is opened), when it is added, when the switch is turned on, and when the owner refreshes it (DEC-502), never on a timer. While it is being asked, the peer shows a waiting state. The rest of the page stays usable. An answer comes within the peer request bound (20 s). | BEH-501 | Must |
| ~~REQ-505~~ | Removed by the user (BEH-502). Was: the availability card lists this node's shared Agents and Agent Teams: exactly the set peers see. Each one is marked ready, or not, with the reason: no default runtime and model (for an agent or a Team member), or the default that can't run and why (DEC-501). This is the same check a peer's start makes. | BEH-502 | Must |
| ~~REQ-506~~ | Removed by the user (BEH-502). Was: each entry that isn't ready links to its definition's settings: the agent edit page or the Team edit page. | BEH-502 | Must |
| REQ-507 | A peer's list starts as one line (counts and names) and expands into its Agents and Agent Teams, sorted by name. When either kind has more than 6 entries, a search box narrows both by name (as the UI/UX spec says). | BEH-503 | Must |
| REQ-508 | With the switch off, the page asks no peer. No states or lists are shown, and one notice says why. | BEH-501/502 | Must |
| REQ-509 | It works the same in a window opened on a Docker node: everything is answered by that node's server. | all | Must |
| REQ-510 | The data the window reads carries only fields that have a value (the 260 rule). | all | Must |
| REQ-511 | Docs (`settings.md` in the web docs, `remote_collaboration.md`) describe the page. | — | Must |

## Acceptance Criteria

| ID | Requirements | Given / When / Then | Verification |
| --- | --- | --- | --- |
| AC-501 | REQ-501, REQ-504 | Given four peers in the four states of 261's AC-401, when the page opens, then each peer shows its own state and reason, each at its own pace. A black-holed peer shows waiting, then not reachable after about 20 s, while the others are already shown and the page stays usable. | Web E2E against the two-server setup; component tests |
| AC-502 | REQ-502, REQ-503 | The available peer's list equals what `list_available_agents` with that node returns. Every request leaves this node's server; the window makes none to the peer. | E2E (request log) |
| ~~AC-503~~ | removed (REQ-505/506 removed). Was: REQ-505, REQ-506 | Given a shared Agent with no default, a Team with a member no default covers, an Agent whose default runtime is unavailable, and a ready Team, the card shows three flags with their reasons and one ready entry. A link opens the right edit page. After the default is set, a refresh shows it as ready. | E2E plus component tests |
| AC-504 | REQ-507 | With 30 entries on a peer, its list starts as one line. Typing part of a name narrows it, and clearing the text shows them all. | Component tests |
| AC-505 | REQ-508, REQ-504 | With the switch off, no peer is asked and the notice explains why. Turning it on asks every peer. Adding a peer asks it at once. Returning to the tab asks again. | E2E |
| AC-506 | REQ-509 | The user's check: the desktop window on his Docker node, and on his desktop node, in both directions. | User check |
| AC-507 | Preserved | Peer add, rename and remove work as before, and the 261 tool results are unchanged. | Existing tests |

## Relevant Scenarios And Journeys

| ID | Actor | Trigger | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-501 | Owner | Has just added a peer | Opens or stays on the page; the peer shows its state, then its list | He sees what his agents can delegate to | Supported Normal |
| ~~SCN-502~~ | (removed) | Wants peers to use his Team | Reads the card; the Team is flagged "no default for member X"; follows the link and sets the default; refreshes | The Team shows ready | Supported Normal |
| SCN-503 | Owner | A peer is down | The peer shows waiting, then not reachable; the rest works | He knows it isn't usable | Supported Normal |

## UI, Interaction, And Experience Requirements

The approved UI/UX package (linked in the status) is normative: the states ST-01 … ST-11, the transitions TR-001 … TR-012, the strings in English and Chinese, and the responsive and accessibility rules.

## Quality And Non-Functional Requirements

- QR-501: no peer request blocks the page or another peer. Each peer is bounded by 20 s.
- QR-502: no timer refresh.

## Data Continuity And Acceptable Loss

No persisted data changes.

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| ~~DEC-501~~ | (moot: the card was removed) Is the flag only "no default", or every reason a peer's start would be refused? | The same check a peer's start runs gives either "no default" or "its default can't run: <reason>" (for example a runtime that isn't installed). Showing only one of them would leave the owner surprised by the other. **Decided: show the check's result: ready, no default, or can't run with its reason.** | Solution Designer | Decided |
| DEC-502 | When are peers asked? (Decided by the user in the UI review: on open, on add, on switch-on, and Refresh per peer) | The Task says load on demand and never poll. Asking each peer once when the page opens (in parallel, each with its own waiting state) plus a refresh per peer shows the state the owner came to see. The Product Team may instead choose "on expand"; both satisfy REQ-504. **Recommend: on open, plus refresh.** | User | Decided |
| ~~DEC-503~~ | (moot) Where does the readiness reason come from? | From the same resolver as a peer's start (E-05), worded for the owner in the window from its kind (no default / can't run) plus the resolver's reason text. | Solution Designer | Decided |
| DEC-504 | Peer reasons in the UI | From the refusal code (E-03), localized in the window. The agent-facing English is not shown to the owner. | Solution Designer | Decided |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-501, REQ-504 | UC-501 | AC-501 |
| REQ-502, REQ-503 | UC-501 | AC-502 |
| REQ-507 | UC-503 | AC-504 |
| REQ-508 | UC-501/502 | AC-505 |
| REQ-509 | all | AC-506 |
| REQ-510, REQ-511 | all | review |

## Readiness Check

### Content Ready For Approval

Approved at SR-002 with the approved UI/UX package.
