# Requirements Document — standalone-run-messages-565 (autobyteus-565)

## Document Status

- Status: `Ready for Approval` (DEC-001 and DEC-002 need the founder)
- Current solution revision ID: `SR-001`
- Package identifier: `standalone-run-messages-565`
- Request / ticket: Project Task `autobyteus-565`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c…`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-20
- Approved by and reference: pending
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: a standalone agent run (the Project Task Manager) exchanges many messages — 2,506 for the founder's PM, with its task agents and teams, other local runs and runs on other nodes — but the phone never offers Messages for it, and the desktop shows its "Team" tab only while it has an open delegated run. Even there, messages with unrelated local runs and with other nodes are left out, live and from history.
- Desired outcome: every standalone agent run has a Messages view on desktop and phone that lists every message its agent sent and received, with the other agent's identity, a node chip for another node, direction and time; new messages appear live; history loads in pages.
- Success: on the founder's PM, Messages opens on the phone and the desktop and shows its messages with its task agents, with the Linux PM (chip `ryan-ai-linux`), newest first, and a new message appears without a reload.

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User | Phone: no Messages for a standalone run | Messages in the ⋮ menu (DEC-001) | Team/Org members' Messages |
| BEH-002 | User | Desktop: "Team" tab only with an open delegated run | A Messages tab for standalone runs (DEC-001, DEC-003) | Team/Org tabs |
| BEH-003 | Contract | Stored read drops messages with unrelated runs and other nodes | The standalone run's Messages include them | Team/Org Messages rule (tree members and past participants) |
| BEH-004 | Contract | Unrelated and cross-node messages never reach a run view live | They reach the standalone run's own Messages live | Team/Org views (492 DEC-014 kept there) |
| BEH-005 | Contract | Cross-node counterpart's node recorded only for linked runs | Node (and address, when known) recorded with every cross-node message from now on (DEC-002) | Existing log lines unchanged |
| BEH-006 | Contract | All messages load at once (5.4 MB for the PM) | Newest first, in pages (DEC-004) | Every message stays reachable |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | The user opens Messages of a standalone run on desktop and reads its history |
| UC-002 | The user opens Messages of a standalone run on the phone and reads its history |
| UC-003 | A message the run sends or receives appears live in its open Messages view |
| UC-004 | A cross-node message shows the other agent and its node |

### Out Of Scope

- Changing which messages Team/Org views show (492 DEC-014 stays there); sending messages from the view; searching or filtering messages; message content outside the run's own log; a release.

### Non-Goals

- Showing messages of the run's delegated runs among themselves (they belong to those runs' own views).

### Preserved Behavior Boundary

BEH-005 of Team/Org Messages (rows, identities, live updates); 492 rules; message logs' existing lines.

### Prerequisites

None.

### Review Authority

Standard (as the template).

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Every standalone agent run that can collaborate (not application-owned) offers Messages: in the phone's ⋮ menu and as a desktop right-panel tab, per DEC-001. | 001, 002 | Must | Task; DEC-001 |
| REQ-002 | Messages lists every message the run's own agent sent or received, whatever the other side: its task agents and teams (open or closed Task), other local runs, runs on other nodes. Newest first. | 003 | Must | Task |
| REQ-003 | Each row shows direction (sent/received), the other agent's identity (name/address as today; for another node, per DEC-002, with a node chip naming the node as this node calls it), time, content and reference files (local only). | 003, 005 | Must | Task; DEC-002 |
| REQ-004 | A message the run sends or receives appears in its open Messages view without a reload, on desktop and phone. | 004 | Must | Task |
| REQ-005 | History loads newest first in pages; older pages load on request; no message is lost or doubled across live and loaded messages. | 006 | Must | Measured 5.4 MB; DEC-004 |
| REQ-006 | Team and Org Messages keep what they show today; any shared change (paging) keeps every message reachable and their rows unchanged. | 005 | Must | Task constraint |
| REQ-007 | Messages exchanged with another node record that node (and the other agent's address when known) with the message in each run's log, from this change on; older messages show what is known (DEC-002). | 005 | Must | DEC-002 |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | 001 | Open a standalone run (with and without delegated runs) on desktop and phone | Messages entry present per DEC-001 | Web component tests; phone test |
| AC-002 | 002, 003 | A run with messages to a task agent (open and closed Task), an unrelated local run and a peer run | All four kinds listed with correct direction, identity, time; the peer row has the node chip | Server read test; web tests; two-server E2E |
| AC-003 | 004 | Messages open; the run receives and sends a message (local and cross-node) | Both rows appear without reload, once | Server stream test; web store test; E2E |
| AC-004 | 005 | A run with more messages than one page | Newest page first; "load earlier" brings the next; live rows never doubled | Server + web tests; payload measured on a 2,500-message fixture |
| AC-005 | 006 | Team and Org Messages | Same rows and identities as before | Existing suites stay green |
| AC-006 | 007 | A cross-node message sent and received after the change | Both logs carry the node (and address when known); an older one shows per DEC-002 | Server tests; E2E |

## Decisions

| ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | When does a standalone run show Messages? | (a) always, with "No messages yet" when empty; (b) only once it has a message | (a) is predictable: the entry does not appear and disappear, and Team/Org tabs always show. A run that never messaged shows an empty list. **Recommend (a).** | Founder | Needs user |
| DEC-002 | How is a cross-node agent named? | The log keeps only run IDs; a linked remote run's address is in its Task entry; an unlinked one (a message between two PMs) has nothing | Show the agent's address name (e.g. "Project Task Manager") with a chip naming its node (this node's name for it, e.g. `ryan-ai-linux`); its run ID when the name is unknown. To know them from now on, each cross-node message records the other node and, when the other node gives it, the other agent's address (the receiving node returns its agent's address; the sender's address travels with the message). Older unlinked messages (5 on the PM) show the run ID and "another node". **Recommend this.** | Founder | Needs user |
| DEC-003 | Desktop tab label for a standalone run | Team/Org tabs say "Team"/"Org" | "Messages", as the phone menu says; a standalone run has no team. | Solution Designer | Decided |
| DEC-004 | Paging | 5.4 MB for the PM at once (Measured); existing patterns: the conversation's earlier pages (`ACTIVE_TRACE_EARLIER_PAGE_SIZE = 50`, `active-trace-event-page-policy.ts:4`) and the Work Journal's "Load earlier" button (`WorkJournalTab.vue:86`) | Founder, 2026-11-20: "it's not like loading all the messages when you just open it … we only show a certain amount and then when user click load more you'll load another certain amount of messages." Newest 50 first; a "Load more" button at the end of the list loads the next 50, by cursor; the same page size as the existing pattern; one mechanism for standalone, Team and Org Messages (Team/Org rows unchanged; only a long history gets the button). | Founder | Decided (User) |
| DEC-005 | Which messages | Founder: "messages to another node … delegated task agents or team members also contact the PM … so there will be messages" | Every message the run's own agent sent or received (REQ-002); 492's DEC-014 stays for Team/Org views and for the standalone run's view of others' messages. | Founder (Task) | Decided |

## Data Continuity

- Persisted data affected: `Yes`: new optional fields on new cross-node message lines (REQ-007). Existing lines stay valid and unchanged; no migration expected (design confirms).

## Readiness Check

- Content ready for approval: `Yes`; remaining: DEC-001, DEC-002.
- Approval recorded: `No`.
