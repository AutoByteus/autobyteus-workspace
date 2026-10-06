# Requirements Document

## Document Status
- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mention-candidates-in-run`
- Request / ticket: `@` hides agents already in the run (e.g. Agent Package Creator after an agent messaged it); menu copy outdated
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference: Approved by the user 2026-10-06 ("Yes, approve. Because currently I have a huge problem... I want to address another agent, but you cannot see its address."), given in reply to the four-point fix: (1) `@` shows every eligible shared agent/team including ones already in the run, only built-ins hidden; (2) remove the server check rejecting in-run mentions; (3) note: not-in-run → delegate; in-run → neutral choice between `send_message_to` to the existing instance or `delegate_task` for a separate copy; (4) menu copy no longer says "bring into this run" (examples: "Delegate to an agent or team", "{agent} gets your message and delegates the work", "to delegate to an agent or team").
- Recorded clarification (within approval, flagged to the user): the run's own definition (the standalone host Agent, or the Team of a Team run) stays excluded, as today and as in `list_available_agents`; mentioning it would target the run itself, which self-delegation already rejects.
- Exact approved requirements baseline: SR-001 (REQ-001..006, AC-001..008)
- Behavior-defining supplements: None

## Problem And Desired Outcome
- Problem: the `@` candidate list and the mention check exclude every agent/team already in the run (investigation-notes E-04). Since mention-delegation-dismissal, `@` asks the focused agent to delegate, so in-run agents — collaborators and shared configured members — cannot be addressed with `@` at all. The menu copy describes the old behavior (E-06).
- Desired outcome: the user can `@` any eligible shared agent or team in any live run or New chat draft and the focused agent gets its address.
- Observable success: in the reported run, `@Agent` lists Agent Package Creator; sending it gives the focused agent `/agent_package_creator` with in-run guidance.

## Relevant Current And Desired Behavior
| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | `@` menu omits definitions already in the run | Menu lists every eligible shared Agent then shared Team, in catalog order, including in-run ones | Built-ins, Agent Orgs, team-local definitions and the run's own definition excluded; application-owned runs show none | E-04, E-05 |
| BEH-002 | Contract | SCN-001 | Mentioning an in-run (non-collaborator) definition is rejected "is already in this run" | Accepted and resolved to its in-run address | Ineligible definitions still rejected | E-04 |
| BEH-003 | Contract | SCN-001, SCN-002 | Note always says delegate | Not-in-run mention: unchanged delegate guidance. In-run mention: entry marked as in this run; guidance adds that it can be messaged directly with `send_message_to` at its address, or `delegate_task` used for a separate copy | Notes without in-run mentions are byte-identical to today; saved notes still display | — |
| BEH-004 | User | SCN-003 | New chat draft `@` omits a Team target's placed definitions | Draft list shows them too (only the target's own definition excluded) | Draft list still mirrors the server policy | web `draftMentionEligibility.ts` |
| BEH-005 | User | SCN-001 | Menu copy "Bring into this run" etc. | Copy describes delegating / addressing an agent or team (en, zh-CN) | Placeholder "Ask anything · @ for an agent or team" unchanged | E-06 |
| BEH-006 | System | — | Agent-initiated bring-in admits only definitions not in the run | Unchanged | No duplicate collaborator for an in-run definition | E-04 |

## Scope Guardrail
### In-Scope Use Cases
| UC | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | `@` an agent/team already in a live run | SCN-001, SCN-002 |
| UC-002 | `@` in a New chat draft for a Team target | SCN-003 |
| UC-003 | Accurate menu copy | SCN-001 |
### Out Of Scope
- Excluding the focused member's own definition per focused agent (candidates stay per run).
- Marking in-run candidates visually in the menu.
- Prompt / tool descriptions outside the note (stay neutral, user decision 2026-10-06).
- Agent-initiated bring-in behavior; `list_available_agents`.
### Non-Goals
None.
### Preserved Behavior Boundary
BEH-001..006 preserved columns; AC-006..008.
### Review Authority
Blocking findings must cite an approved REQ/AC/BEH ID; scope-changing proposals need renewed user approval.

## Requirements
| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | `@` candidates in live runs include every eligible shared Agent and shared Agent Team, including definitions already in the run; still excluded: built-ins, Agent Orgs, non-shared definitions, the run's own definition, and all candidates in application-owned runs. | BEH-001 | Must | Approval (1) |
| REQ-002 | A mention of an eligible definition that is already in the run is accepted and resolved to its in-run address (collaborator entry address, else its preferred in-run placement address). | BEH-002 | Must | Approval (2) |
| REQ-003 | The note marks each in-run mention as already in this run. When at least one mention is in the run, the guidance also says that such an agent or team can be messaged directly with `send_message_to` at its address, or `delegate_task` can be used for a separate copy. Notes with no in-run mention are unchanged. | BEH-003 | Must | Approval (3) |
| REQ-004 | Saved notes in every earlier form keep displaying as `@Name` chips. | BEH-003 | Must | Preserve |
| REQ-005 | New chat draft candidates exclude only the target's own definition (plus the same eligibility rules), matching REQ-001 after the run exists. | BEH-004 | Must | Approval (1) |
| REQ-006 | Menu header, list label, footer and New chat hint describe addressing/delegating to an agent or team instead of "bring into this run", in en and zh-CN. | BEH-005 | Must | Approval (4) |

## Acceptance Criteria
| AC | REQ | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Run with a shared collaborator X | `collaboratorMentionCandidates` includes X | Built-in / Org / run's own definition absent | Server unit |
| AC-002 | REQ-001 | Team run with a shared configured member M | Candidates include M | Team-local members absent | Server unit |
| AC-003 | REQ-002, REQ-003 | Send "@X …" where X is a collaborator | Message posted; note entry `- X (Agent) at /x, already in this run` plus extended guidance; nothing added to the tree | — | Server integration |
| AC-004 | REQ-003 | Send "@Y …" where Y is not in the run | Note identical to the current release | — | Unit (contracts) |
| AC-005 | REQ-004 | Saved messages with each earlier note form, and the new in-run form | Web shows `@Name` chips, note hidden | — | Unit (contracts) + web |
| AC-006 | REQ-002, BEH-006 | Agent-initiated `send_message_to` to a catalog address | Admission still never adds a duplicate of an in-run definition | — | Existing tests green |
| AC-007 | REQ-005 | New chat draft for a Team target with shared member M | Draft menu lists M; after send, server accepts it | Target's own definition absent | Web unit |
| AC-008 | REQ-006 | Open the `@` menu (en, zh-CN) | New header/footer/aria/hint strings shown | Placeholder unchanged | Web unit / probe |

## Relevant Scenarios
| ID | Kind | Actor | Goal | Trigger | Expected | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Address an agent already in the run | `@` in a live-run composer | Agent listed; focused agent gets its address | Supported Normal (reported) |
| SCN-002 | User | User | Get a separate fresh copy of an in-run agent | `@X` + "use a fresh copy" | Agent delegates; closable copy | Supported Normal |
| SCN-003 | User | User | Mention a member of the Team being launched | New chat draft `@` | Member listed | Supported Normal |

## UI, Interaction, And Experience Requirements
- Applicable: copy only (REQ-006). Product UI/UX fields: `N/A — not applicable`.

## Data Continuity
- Persisted data affected: saved messages contain notes; read tolerantly (REQ-004). No migration.
