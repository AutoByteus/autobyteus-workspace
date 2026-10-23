# Requirements Document — remote-runs-in-tree (autobyteus-278)

## Document Status

- Status: `Approved` (SR-003). The user approved the Product Team's UI/UX package ("Yeah, I think we're good. This looks perfect, I have to say. Yeah, it's done.", 2026-10-23) together with these requirements' decisions (SR-002).
- Approved UI/UX package (Product-owned, normative, linked): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md`, with `visual-references/VIS-001 … VIS-021`, `design-assumptions.md` (PA-801 … PA-809) and `design-change-log.md` (DC-801 … DC-811). Design repository `personal` @ `1cc5563`; runnable reference per its runbook section `remote-runs-in-tree`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-278.
- Investigation: [investigation-notes.md](investigation-notes.md).

## Problem And Desired Outcome

A run delegated to another node is invisible in the delegator's run tree; local delegated runs appear under their delegator. The desired outcome, in the user's words: "there is no difference". A remote delegated Agent or Team, with its members, appears under its delegator, marked with its node. It shows its live status and title, and the user can open it and talk to it from the delegator's window, on the desktop and (through the same tree) on mobile.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-801 | A remote delegated run has no row in the delegator's tree | It has a row under the delegator (a Team with its members), tagged with the node's name, with its status and its title (269) | Local rows unchanged |
| BEH-802 | The remote run can only be seen in the other node's own window | Opening the row shows its conversation, live (DEC-801, DEC-802) | The other node's own window unchanged |
| BEH-803 | The user can't message a remote run from the delegator's window | The user sends messages to it from there (DEC-803) | Agent-to-agent messaging through the link (CM-11) unchanged |
| BEH-804 | Nothing shows when the other node is down | The row stays and says the node is not reachable; it never blocks the tree | — |
| BEH-805 | No lifecycle control across nodes | DEC-804 | Idle shutdown and restore on the running node (191/247) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-801: see a remote delegated run (Agent or Team with members) under its delegator, with node, status and title.
- UC-802: open it and follow its conversation.
- UC-803: talk to it.
- UC-804: an unreachable node or a gone link shows a clear state.

### Out Of Scope

- Rendering delegated runs in the mobile shell (the mobile Task). This ticket provides the shared tree data it uses (DEC-805).
- Global send to unlinked runs (262).
- The remote run's files, terminal and workspace panels (DEC-802).
- Attachments across nodes (S2).
- Security (S6).

### Non-Goals

- No version-compatibility code (rule 9; both nodes updated together).
- No migration of stored data.
- The window never contacts a peer directly (DEC-801).

### Preserved Behavior Boundary

- Local delegated rows and their behavior.
- The running node's own view of the run.
- Messaging through the link.
- The 20 s peer bound.
- Remote runs auto-approve tools (RSK-201).

### Prerequisites

None found yet. The streaming channel (DEC-801) is new mechanism inside this ticket, not other functionality.

### Review Authority

The user, for scope and the UI; the Solution Designer, within the direction.

## Requirements

| ID | Requirement | Behavior | Priority |
| --- | --- | --- | --- |
| REQ-801 | The delegating node's run tree data includes each remote delegated run under its delegator: Agent or Team (with its members, address and run ID), the node's name, its title from the running node (269), its status (working, idle, offline or waiting = initializing, PA-802), and whether the node answered (the UI's "Couldn't reach {node}." with Retry, which asks the node again). | BEH-801 | Must |
| REQ-802 | Opening a remote run shows its conversation as a local run's conversation shows: messages, reasoning and tool calls with results, and its status. It updates live while open (DEC-801). | BEH-802 | Must |
| REQ-803 | The user can send a message to a remote run (an Agent, or a Team member) from the delegator's window. It reaches the run through this node and is recorded on both nodes, like the link's messages, as coming from the owner of this node (DEC-803). | BEH-803 | Must |
| REQ-804 | Everything about a remote run is fetched by this node's server from the running node over the registered connection; the window never contacts a peer. **First version (DEC-807):** when a request to the other node fails, the row or view shows the error plainly (the existing 20 s bound), and the rest of the tree works. Reconnecting, catching up after a drop and polished offline states are later refinements. | BEH-804 | Must |
| REQ-805 | Lifecycle as DEC-804 decides. The row always shows the real state: an idle remote run that was shut down shows as idle or offline, not gone. | BEH-805 | Must |
| REQ-808 | An opened remote run offers what the UI/UX spec gives it: text-only composer (no attachments, no `@`), no ⚙ or ＋. The Files, Terminal, Artifacts and Screen panels say it is on the other node (DEC-802). Activity, Team messages, Usage and Browser work from the streamed events (PA-805). The delegator's "Delegated copies" settings list shows only local copies (DC-810). | BEH-802 | Must |
| REQ-806 | It works the same for Agent and Team runs, for every delegator root kind (standalone, Team, Org), and for the desktop and web windows. The mobile shell uses the same tree data (DEC-805). | all | Must |
| REQ-807 | Docs and `collaboration_model.md` describe remote runs in the tree and the new requests between nodes. | — | Must |

## Acceptance Criteria

| ID | Requirements | Given / When / Then | Verification |
| --- | --- | --- | --- |
| AC-801 | REQ-801 | Given alpha's Project Task Manager delegated a Team to beta, alpha's tree shows the Team under the manager, tagged "beta", with its members, its title and its status. A delegated Agent shows the same. | Two-server E2E plus browser |
| AC-802 | REQ-802 | Opening the remote coordinator shows its conversation. A message it receives or a tool call it makes appears without a reload. | Two-server E2E plus browser |
| AC-803 | REQ-803 | The user sends "status?" to the remote coordinator from alpha's window. It receives the message, marked as from alpha's owner, and its answer appears in alpha's window. Both nodes record it. | Two-server E2E |
| AC-804 | REQ-804 | Beta stopped: opening its run shows the error within 20 s, and the rest of the tree works. | E2E |
| AC-805 | REQ-805 | After the remote run's idle shutdown, the row shows idle or offline. A message from the window restores it. | E2E |
| AC-806 | REQ-806 | The same for an Agent and a Team; for a standalone, Team and Org delegator. | E2E |
| AC-807 | all | The user's check with his desktop and Docker nodes. | User check |

## Decisions

| ID | Question | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-801 | How does the remote run's live view reach the window? | (a) Through this node's server: it asks the other node for the run's view and subscribes to its events over the registered connection, then passes them to the window like a local run's events. (b) The window connects to the other node's server directly. (c) Like (a), but no live events: this node refreshes the open view every few seconds. | (a) works the same on desktop and mobile with one connection, keeps the 267 rule (the window never contacts a peer), and is truly "no difference": events arrive as they happen. It needs a new event channel between servers (today there are only request/response calls), and that is the main engineering item. (b) breaks on mobile and for windows that can't reach the other node. (c) is simpler but lags and does repeated work. **Recommend (a).** The user agreed in the discussion of 2026-10-23: the live output streams from the remote node through this node's server, then "if its doable then i think you can delegate to product team". | User | Decided (a) |
| DEC-802 | What does an opened remote run show? | (a) Its conversation (messages, reasoning, tool calls and results) and status, like a local run. Its files, terminal and workspace panels say "on <node>: open it in that node's window". (b) Everything, including files and terminal. | The conversation is what "see it and talk to it" needs. Files and terminal read the other node's disk and processes, which is a much bigger exposure and engineering job. **Recommend (a)** for this ticket; (b) can follow. Investigation then showed files and terminal are backend-served too (`/ws/file-explorer`, GraphQL file explorer, `/ws/terminal`), so (b) is feasible through the same relay. The user chose (a) anyway: "leaving those panels out at first. I strongly agree with you" (2026-10-23). (b) is follow-up FU-001. | User | Decided (a) |
| DEC-803 | Can the user message a remote run from his window? | — | The user asked for it ("I can talk to it"). It goes through this node to the other node, only for runs this node's delegation started (the link). It is recorded on both nodes as from the owner of this node. This adds a new kind of request between nodes (today only agents can message across a link) within the trusted network (RSK-401). **Decided: yes.** | Solution Designer (the user's request) | Decided |
| DEC-804 | Stop and terminate from the delegator's window? (Decided (a) in the UI review: the user approved the design with Stop on live remote rows and in the composer, DC-809) | (a) Yes: Stop and Terminate on a remote row work as on a local one, through the link. (b) Not now: the row shows the real state; control comes with the lifecycle slice (S3). | Local rows can be stopped; "no difference" suggests (a). It is one more request between nodes, applied by the running node to the run its link started. Task-closure stopping (when a Task is DONE) stays S3. **Recommend (a).** | User | Decided (a), by approving the UI as shown |
| DEC-805 | Mobile | — | The mobile shell doesn't render delegated runs at all yet; the mobile Task does that. This ticket makes the shared tree data and the run view carry remote runs, so the mobile Task gets them with no extra work. **Decided.** | Solution Designer | Decided |
| DEC-807 | First version scope | — | The user (2026-10-23): "in the beginning we want to make things work … make sure the architecture is set up … when edge case come in, normally when you have good architecture … it's just about local". The first version is the normal path on the right architecture; failure handling is limited to showing an error; each edge case gets an obvious single owner for later (DESIGN.md phase 1). | User | Decided |
| DEC-806 | The node tag | — | The row shows this node's name for the peer (the name agents use in `node`), which the owner can rename. The user's visual direction (2026-10-23): "on the left side you put a computer icon and give a node name there … to make the UI look like this, this is definitely a remote node agent team." A computer icon plus the node's name on the remote row, so it reads unmistakably as remote. The Product Team designs the exact form within this direction. | User (direction), Product Team (form) | Decided |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-801 | UC-801 | AC-801 |
| REQ-802 | UC-802 | AC-802 |
| REQ-803 | UC-803 | AC-803 |
| REQ-804 | UC-804 | AC-804 |
| REQ-805 | UC-804 | AC-805 |
| REQ-806 | all | AC-806 |
| REQ-807 | all | review |

## Readiness Check

### Content Ready For Approval

Approved at SR-003 with the approved UI/UX package.
