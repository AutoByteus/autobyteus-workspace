# Requirements Document — remote-run-title (autobyteus-269)

## Document Status

- Status: `Ready for Approval` (SR-001). DEC-601 and DEC-602 need the user.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-269.
- Investigation: [investigation-notes.md](investigation-notes.md) (reproduced, F-03).

## Problem And Desired Outcome

A run that a peer node starts by delegation (an Agent or an Agent Team) gets no history title, so the peer's sidebar shows "New - <name>" for it indefinitely. The desired outcome: such a run is titled from the task it was given, on the node that runs it, as a user-started run is titled from its first message.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-601 | A peer-started Agent or Team run has an empty title ("New - <name>") | Its title is the delegated task's description, as one line of at most 100 characters (DEC-601) | The first non-empty title wins; a later owner message doesn't replace it |
| BEH-602 | Runs already stored with an empty title | DEC-602 | Their data is unchanged unless the user approves |
| BEH-603 | A user-started run is titled from the first user message | — | Unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-601: the owner of a node sees what a peer-started run is about in its sidebar.

### Out Of Scope

- Local delegated copies (they have no row of their own, F-05).
- Renaming runs.
- Org runs (a peer never starts an Org).
- Titles of user-started runs.

### Non-Goals

- No change to the work packet the agent receives.
- No client-side patch: the server's title is the one source.

### Preserved Behavior Boundary

- The first-non-empty rule.
- The one-line, 100-character compaction.
- User-started titles.
- The work packet text.

### Prerequisites

None.

### Review Authority

The user (DEC-601, DEC-602); the Solution Designer, within the direction.

## Requirements

| ID | Requirement | Behavior | Priority |
| --- | --- | --- | --- |
| REQ-601 | When a node accepts the work packet that starts a peer-started Agent or Team run, the run's title is set from the delegated description by the same first-non-empty, one-line rule as user-started runs (DEC-601 decides the exact text). | BEH-601 | Must |
| REQ-602 | Nothing else changes: user-started titles, local copies, the packet text. | BEH-603 | Must |
| REQ-603 | Existing runs: as DEC-602 decides. | BEH-602 | Must |
| REQ-604 | `run_history.md` (and the documented title rule in `autobyteus-web/docs/agent_orgs.md` and `agent_execution_architecture.md`) name the remote work packet as a title source. | — | Must |

## Acceptance Criteria

| ID | Requirements | Given / When / Then | Verification |
| --- | --- | --- | --- |
| AC-601 | REQ-601 | When alpha delegates "Cut the launch trailer and have it checked" to beta's Studio Team and to beta's Publisher, beta's history lists both runs with that title, before any owner message. A later owner message doesn't change it. | Two-server E2E |
| AC-602 | REQ-601 | A 300-character description gives a one-line title of at most 100 characters. | Unit |
| AC-603 | REQ-602 | A user-started Agent and Team run is titled from the first user message as before. | Existing tests |
| AC-604 | REQ-603 | As DEC-602 decides. | Unit / migration test |
| AC-605 | all | The user's check on his Docker node: a new delegation from the desktop shows a real title. | User check |

## Decisions

| ID | Question | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-601 | What is the title of a peer-started run? | (a) The task's description, compacted (for example "Cut the launch trailer and have it checked."). (b) The same, marked with its origin node (for example "from electron · Cut the launch trailer…"). | The title says what the run is about, as for user-started runs: its first message. The origin is a separate fact, already stored (`delegatedFrom`). Putting "from <node>" inside the title text uses up a quarter of the 100 characters, and freezes a node name the owner may rename later. If the origin should be visible, a small marker in the sidebar, drawn from the stored origin, is the right place: a separate UI change. **Recommend (a).** | User | Needs user |
| DEC-602 | Runs already stored with "New - …" | (a) Leave them. New delegations get titles; the few existing test runs keep "New - …". (b) A registered startup migration, with a backup first, fills each empty title of a peer-started run from its stored first work packet, following the earlier precedent for Org titles. | Only a handful of runs exist (first real use, 2026-10-21). They all still work; only their name is missing. A migration means code that reads old memory files at startup, kept for a few rows. The Data Migration Guideline prefers not migrating when the benefit is small. **Recommend (a).** If you want them fixed, (b) is safe and has a precedent. | User | Needs user |

## Traceability

| REQ | AC |
| --- | --- |
| REQ-601 | AC-601, AC-602, AC-605 |
| REQ-602 | AC-603 |
| REQ-603 | AC-604 |
| REQ-604 | review |

## Readiness Check

### Content Ready For Approval

The bug is reproduced. The open decisions are DEC-601 and DEC-602.
