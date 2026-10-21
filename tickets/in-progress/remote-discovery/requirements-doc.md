# Requirements Document — remote-discovery (autobyteus-261)

## Document Status

- Status: `Ready for Approval` (SR-001). Decisions DEC-401, DEC-402, DEC-408 and the exact tool texts (DEC-406, DEC-407) need the user.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-261, approved by the user 2026-10-21.
- Parent: autobyteus-25 (slice S5). It builds on 191 (slice 1), 245 (no publishing) and 247 (remote Agent Teams).
- Investigation: [investigation-notes.md](investigation-notes.md).
- Full Task text: `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/cross-node-follow-ups/autobyteus-261-full-task.md` (the PTM, 2026-10-21).

## Problem And Desired Outcome

Today an agent can delegate to a peer only when someone tells it both the node name and the address there. Nothing lists the peers or what they offer. The desired outcome: an agent with the discovery tools can find the peers, see whether each can be used right now, list what a peer offers, and delegate with `delegate_task` without being told any address. In the same piece, three agent-facing texts that still say only "Agent" are corrected for Agent Teams.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-401 | No way to list the peers | An agent lists the registered peers, each with its name and whether it is usable now (DEC-401, DEC-402) | Peers are still managed only by the owner in the Nodes tab |
| BEH-402 | `list_available_agents` lists only this node | With `node`, it lists the Agents and Agent Teams a peer offers for delegation | Without `node`, the same list as today (DEC-405 notes the one shape change) |
| BEH-403 | No filter | An optional `name` narrows either list by name | — |
| BEH-404 | Three texts say only "Agent" | They name Agent Teams too (DEC-406, DEC-407) | The Agent wording is unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-401: an agent lists the peers of its node and their status.
- UC-402: an agent lists what a peer offers, optionally narrowed by name, then delegates to one entry.
- UC-403: agent-facing texts correct for Agent Teams (merged FU-002/FU-003 of 247).

### Out Of Scope

- Global send across nodes (autobyteus-262), unless the user merges it (DEC-408).
- Showing peer status or a peer's offer in the UI (the Nodes tab is unchanged).
- The central "fields with a value" rule for all agent tools (autobyteus-260).
- Selecting the new tool in built-in definitions (for example the Daily Assistant): built-ins stay as they are.
- Attachments (S2), lifecycle (S3), security (S6).

### Non-Goals

- No caching, no background polling, no peer push.
- No version negotiation (rule 9).
- No definitions, prompts, settings, members, launch settings or node IDs revealed to peers or agents.
- No proof of node identity: it is claimed, not proven, until S6. A listing is answered to any registered peer, the same rule as a delegation.

### Preserved Behavior Boundary

- Local `list_available_agents` without `node` or `name`: the same entries in the same order, at the same addresses.
- Delegation, messaging and the refusal codes of 191/245/247 are unchanged, except for the texts in DEC-406/DEC-407.
- With the switch off, no request goes to any peer.

### Prerequisites

None found (investigation notes, "Assumptions, Unknowns, And Risks").

### Review Authority

The user for scope, the tool choice and the tool texts; the Solution Designer within the direction.

## Requirements

| ID | Requirement | Behavior | Priority |
| --- | --- | --- | --- |
| REQ-401 | An agent can list this node's registered peers. Each entry gives the peer's name (the value of `node`) and its status now: available, unreachable, remote collaboration turned off there, this node not registered there, or a different server at its address. The status is checked when asked, all peers in parallel, and the answer comes within the peer request bound (20 s) even when peers are down. | BEH-401 | Must |
| REQ-402 | `list_available_agents` takes an optional `node`. With it, the answer lists the shared Agents and Agent Teams that peer offers for delegation, each with name, kind, address and description. These are exactly what a delegation to that node accepts (the same eligibility: built-ins, Orgs and application-owned definitions excluded). Each address works as `recipient_address` with the same `node`. | BEH-402 | Must |
| REQ-403 | A peer reveals only the name, kind, address and description of each entry. It never reveals definitions, prompts, settings, members or launch settings. | BEH-402 | Must |
| REQ-404 | Both lists take an optional `name` that narrows the result to entries whose name contains it, ignoring case. | BEH-403 | Must |
| REQ-405 | Entries carry only fields that have a value (the 260 rule). An entry without a description has no `description` field. The list itself is always present, empty when there is nothing. | BEH-401/402 | Must |
| REQ-406 | Nothing is exposed automatically. The peer list is a tool an agent has only when its definition selects it (DEC-401). Both lists need this node's switch on: with it off, the agent gets the "turned off" refusal and nothing is sent. A refusal from or about the peer uses the existing reasons and texts (REQ-109 of 191). | BEH-401/402 | Must |
| REQ-407 | Lists are read from the peer on every call; nothing is stored. | BEH-401/402 | Must |
| REQ-408 | The texts of DEC-406/DEC-407 are changed, and the peer's refusal tells the delegating node the target's kind (DEC-407). | BEH-404 | Must |
| REQ-409 | Docs (`agent_tools.md`, `remote_collaboration.md`, `collaboration_model.md` CM-12) describe the discovery. | — | Must |

## Acceptance Criteria

| ID | Requirements | Given / When / Then | Verification |
| --- | --- | --- | --- |
| AC-401 | REQ-401 | Given A with peers beta (up, switch on, A registered), gamma (stopped), delta (switch off) and epsilon (A not registered there), when an agent on A lists the nodes, then it gets the four names with available, unreachable, collaboration off and not registered there, within 20 s. | Two-server E2E plus unit cases for the stopped and mismatched peers |
| AC-402 | REQ-402, REQ-403, REQ-405 | Given beta with shared Agent "Publisher" (no description) and shared Team "Studio Team", plus a built-in, an Org and an application-owned definition, when an agent on A calls `list_available_agents` with `node: "beta"`, then it gets exactly Publisher (`kind: agent`, no `description` field) and Studio Team (`kind: agent_team`), with no other fields; the request body and answer carry nothing else. A `delegate_task` to each listed address with `node: "beta"` starts a run. | Two-server E2E |
| AC-403 | REQ-404 | `name: "studio"` returns only Studio Team, locally and with `node`. A name matching nothing returns an empty list. | Unit plus E2E |
| AC-404 | REQ-406 | With A's switch off, both calls with a node are refused "turned off" and no request leaves A. Without the tool in its definition, an agent has no peer list. An unregistered `node` is refused with the existing text. | Unit plus E2E |
| AC-405 | REQ-407 | A Team added on beta between two calls appears in the second call. | E2E |
| AC-406 | REQ-408 | A delegation to a Team on beta that cannot run reads "The Agent Team Studio Team on node "beta" cannot run there: …"; one to an Agent reads as today. An unknown address reads "…has no Agent or Agent Team at …". The `node` description has the new text. | Unit plus E2E |
| AC-408 | REQ-401, REQ-402, REQ-408 | Between the user's desktop node and a Docker node, in both directions: list the nodes, list the other node's Agent Teams, and delegate to one without being told its address. | The user's two-node check (the Task's "Done when") |
| AC-407 | Preserved | Local `list_available_agents` without arguments returns the same entries in the same order as before (except DEC-405). The existing 191/245/247 E2E passes. | Existing suites |

## Relevant Scenarios And Journeys

| ID | Actor | Trigger | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-401 | Agent on A, asked by the user "get beta's designer to do this" | The user names no address | `list_available_nodes` → beta available → `list_available_agents {node: beta, name: design}` → `delegate_task {node: beta, recipient_address: /designer}` | The work starts on beta | Supported Normal (the Task's goal) |
| SCN-402 | Agent on A | A peer is down or misconfigured | The node list shows its status; listing its agents gives the same reason as a delegation would | The agent tells the user what is wrong | Supported Normal |
| SCN-403 | Agent | The node's switch is off | Either call is refused "turned off" | Nothing leaves the node | Supported Edge (REQ-101 of 191) |

## UI, Interaction, And Experience Requirements

None. This is agent-facing only.

## Quality And Non-Functional Requirements

- QR-401: listing nodes answers within the peer request bound, checking peers in parallel.
- QR-402: a listing never creates a run, writes nothing on either node and is not logged as a message.

## Data Continuity And Acceptable Loss

No persisted data changes.

## Decisions

| ID | Question | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-401 | How does an agent list the nodes? | (a) A new opt-in tool `list_available_nodes`. (b) `list_available_agents` without `node` also returns `nodes`. | (a) keeps one list per tool, and an agent gets it only when its definition selects it, which matches "nothing exposed automatically". It checks each peer's status without slowing the everyday local agent list: with (b), every local listing would wait on peer checks, up to 20 s when a peer is down. **Recommend (a).** | User | Needs user |
| DEC-402 | What does a node entry say? | (a) `{name, status}`, where status is one of `available`, `unreachable`, `collaboration_off`, `not_registered_there`, `identity_mismatch`. (b) `{name, reachable, collaborationOn}`. | Two booleans can't say "beta is up and on but does not know this node", the most common setup mistake. (a) is one field that always has a value, and the agent reads one word. **Recommend (a).** Left out: node ID, URL and when the peer was added; the agent can't use them. | User | Needs user |
| DEC-403 | `name` filter: where and how? | — | Case-insensitive "contains", applied on the asking node to either list. The peer contract stays one parameterless request, lists are small, and local and remote filtering are the same function. | Solution Designer | Decided |
| DEC-404 | What does the peer reveal per entry? | — | name, kind, address and description (when not empty). The address is needed to delegate and is derived from the name. No members (a Team's members are part of its definition). | Solution Designer | Decided |
| DEC-405 | Local entries: one entry builder | — | One builder makes local and remote entries, so 260 can take it over. Its only effect locally: an empty `description: ""` is left out (the user's rule: no field without a value). The rest of the local shape is unchanged. | Solution Designer | Decided (the user sees it here) |
| DEC-406 | Tool texts (user-approved wording) | — | The exact old and new texts are in the approval message: the `node` description, the `list_available_agents` description, its new `node` and `name` parameters, the new `list_available_nodes` tool, and the "unregistered node" refusal hint. | User | Needs user |
| DEC-407 | How does the delegating node know a refused target's kind? | (a) Replace the answer's `targetName` with `target: {kind, name}`. (b) Add `targetKind` beside `targetName`. (c) The peer words the whole text. | (a) is one structured field instead of two parallel optional ones. It is a clean cut (rule 9: same release on both nodes). The texts stay on the node that knows its own agent's language. `AGENT_NOT_FOUND` has no target, so its text names both kinds. **Decided (a).** The new texts are shown to the user. | Solution Designer (texts: user) | Decided; texts Need user |
| DEC-408 | Merge 262 (global send) into this piece? | (a) Keep it separate, after 261. (b) Merge. | Both reach a node's runs you didn't link, but 261 is read-only and reveals names. 262 delivers messages to any active run on a peer, records them, and must route replies back without a link. That reopens slice 1's DEC-105 ("only linked runs") and is a real security decision for S6. It is not a small ticket, so the user's "small tickets go inside a related one" rule doesn't apply. **Recommend (a).** | User | Needs user |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-401 | UC-401 | AC-401 |
| REQ-402, REQ-403 | UC-402 | AC-402 |
| REQ-404 | UC-402 | AC-403 |
| REQ-405 | UC-401/402 | AC-402 |
| REQ-406 | UC-401/402 | AC-404 |
| REQ-407 | UC-401/402 | AC-405 |
| REQ-408 | UC-403 | AC-406 |
| REQ-409 | all | docs review |

## Readiness Check

### Content Ready For Approval

Problem, behavior, scope, requirements and ACs are stable and linked. The open items are DEC-401, DEC-402, DEC-406 (texts), the DEC-407 texts and DEC-408.
