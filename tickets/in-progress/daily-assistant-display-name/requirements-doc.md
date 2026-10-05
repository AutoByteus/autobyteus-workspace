# Daily Assistant display name — requirements

## Status
- Package: `daily-assistant-display-name`; approved baseline `SR-001` (approval recorded in SR-002); status **Approved**, 2026-10-05.
- Explicit user approval: "coool. since its just label change thats nice" (approves the proposal, D-1 and D-3) and the follow-up "The words 'You are Daily Assistant, a general-purpose agent for practical tasks and requests.' like the one you proposed thanks" (approves the exact line for D-2).
- Approved decisions:
  - D-1: the name is exactly `Daily Assistant`.
  - D-2: prompt line 7 becomes exactly `You are Daily Assistant, a general-purpose agent for practical tasks and requests.`
  - D-3: keep `role: General Agent` and the current description.
- Supersedes only the display-name/self-introduction part of `tickets/done/general-agent-identity` (REQ-001 and the v1 prompt hash). Its discovery and skill behavior (REQ-002, REQ-003, REQ-005) and continuity rule (REQ-006) stay in force.
- Resulting template SHA-256 (approved v1 with exactly the two approved line changes): `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7`.

## Problem
"General Agent" is a technical term that non-technical users do not understand. The default Chat agent should be called **Daily Assistant** again.

## Behavior
| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Displayed name is General Agent (Agents page, Chat, workspace title, registry). | Displayed name is **Daily Assistant** everywhere the current definition name is shown. | Same definition id `autobyteus-daily-assistant`; still the default Chat agent; no new or duplicate definition. |
| BEH-002 | Prompt says "You are General Agent, a general-purpose agent for practical tasks and requests." | "You are Daily Assistant, a general-purpose agent for practical tasks and requests." | Every other prompt line is byte-identical to approved v1, including specialist discovery and skill fallback guidance. |
| BEH-003 | Role General Agent; description as shipped. | Unchanged. | Tools, `list_available_agents`, `ALL_INSTALLED` skill scope, collaborator exclusion. |

## Scenario
- SCN-001 (Supported Normal): user updates/restarts the app, opens Agents or New Chat, and sees and talks to Daily Assistant. Existing runs and history are kept and not relabeled (old snapshots may show whichever name they captured).

## Requirements and acceptance criteria
| REQ | Requirement | AC |
| --- | --- | --- |
| REQ-001 | Built-in display name is Daily Assistant. | AC-001: after normal startup, the template `name`, registry `displayName`, GraphQL definition name and the new Chat/workspace title show "Daily Assistant". |
| REQ-002 | The self-introduction line names Daily Assistant; the rest of the template is byte-identical to approved v1. | AC-002: the diff against v1 is exactly front-matter `name` and line 7; the template hash is `49ed6e90…07b7`; tests and the live probe assert the new hash. |
| REQ-003 | No data migration, reset or duplicate definition. | AC-003: an existing app-data root picks up the name through the existing startup refresh; existing runs remain usable; historical snapshots are not rewritten. |
| REQ-004 | Current docs, comments and tests describing the display name are aligned. | AC-004: no current doc, comment or test still calls the built-in's display name "General Agent" (the role value "General Agent" is correct; finished tickets are untouched). |

## Scope
- In: template front matter `name`, prompt line 7, registry `displayName`, aligned tests/docs/comments.
- Out: renaming ids/dirs/constants, role/description, discovery/tools/skills, editing finished tickets, the public agents repository, release/deployment (unless requested later).
