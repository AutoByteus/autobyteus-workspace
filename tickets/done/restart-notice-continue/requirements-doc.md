# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `restart-notice-continue`
- Request / ticket: Project Task `autobyteus-585` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), from the founder's observation of 2026-11-21
- Requirements owner: Solution Designer
- Date: 2026-11-22
- Approved by and reference: `Solution Designer within the direction (user informed)`. Scope narrowed by the user: Solution Designer conversation, 2026-11-22, "I guess we don't have to update the like platform notice message right because it seems like there's only one case I experienced" (DEC-001)
- Exact approved requirements baseline: this document at `SR-001`
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: every platform notice (the restart reminder, skill/tool/background-task/team notices, task notices and the rest) is drawn inside the agent's own message in the conversation, under the agent's avatar and, on the phone, under its name. The restart reminder also has no label. So the notice reads as text the agent wrote: the founder saw `[Platform notice — application restarted] …` directly above the agent's reply, in its bubble.
- Desired outcome: a platform notice is drawn as its own row between the conversation's other rows, with a label that says what it is. It is never part of an agent's message. It keeps the light look the June 2026 ticket chose (no heavy alert card). Desktop and phone alike.
- Observable definition of success:
  - In the founder's case, the conversation shows three rows: the agent's message ending with its `Bash` card, then a notice row labelled **Application restarted** with the notice text, then the agent's reply as its own agent row. On the phone, that reply row carries the agent's name again.
  - The same holds live, after a reload, and in a Team member's conversation.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Wake notice appended to the previous turn's agent message; reply follows in it | Agent row (previous turn) → notice row → agent row (reply) | Notice text and order of everything | investigation-notes BEH-001, screenshots |
| BEH-002 | System | SCN-002 | A notice that starts a turn is the first part of the agent's message | Notice row → agent row | User row before it | investigation-notes BEH-002 |
| BEH-003 | User | SCN-003 | History shows the same | Same as live | One row per notice (no duplicate, autobyteus-526) | `runProjectionConversation.ts` |
| BEH-004 | User | SCN-004 | Label only for runtime changed / skill updated / tools updated; restart reminder and others unlabelled; bracketed header shown as text | Every notice row has a label: Application restarted, Skill updated, Tools updated, Agent runtime changed, Background tasks finished, otherwise Platform notice. A bracketed `[Platform notice — …]` first line is shown as the label, not repeated as text. | Tools-updated body shows only what changed; the restart time in the viewer's zone (autobyteus-526) | `SystemTaskNotificationSegment.vue` |
| BEH-005 | System | — | Restart cuts a Claude tool; the runtime's "stop and wait" text; 1 of 31 agents stopped | Unchanged (DEC-001) | Notice wording | investigation-notes sampling |
| BEH-006 | User | — | Browse mode (older pages) shows no notices | Unchanged | — | server projection L138-139 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Founder (desktop, phone) | Tell the agent's words from the platform's | Notices visibly separate and labelled | Light look (June 2026 decision) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Read a platform notice in a run's conversation (standalone, Team member) as its own labelled row, live and after reload, on desktop and phone | SCN-001..SCN-004 |

### Out Of Scope

- The restart notice's wording and how runtimes record interrupted tool calls (DEC-001).
- Server, transport, stored data, the conversation model, and where notices are recorded.
- Browse mode's missing notices (BEH-006).
- Inter-agent message segments ("From <sender>:"), user and other segment visuals.

### Non-Goals

- A heavy or colored alert card.

### Preserved Behavior Boundary

- BEH-003: one row per notice, live and replayed.
- Tools-updated body.
- Restart time in the viewer's zone.
- Token-usage text on agent rows.
- The phone's speaker rules for consecutive agent rows.
- Accessibility hooks (`role="note"`, `data-testid="system-task-notification-segment"`, aria-label).

### Prerequisites

None.

### Review Authority

- Every blocking finding cites a REQ/AC/BEH ID it protects.
- New behavior is a `Requirement Gap` and needs the user's approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every platform notice in a run's conversation is its own row, outside any agent message. The agent content before and after it are separate agent rows, in the original order. | BEH-001..BEH-003 | Critical | Founder's report | N/A | Task direction 2 |
| REQ-002 | The notice row shows a label naming the notice: **Application restarted**, **Skill updated**, **Tools updated**, **Agent runtime changed**, **Background tasks finished**, otherwise **Platform notice** (en; zh-CN equivalents). When the text starts with a bracketed `[Platform notice — …]` line, that line is not repeated in the body. | BEH-004 | High | Names the sender | N/A | DEC-002 |
| REQ-003 | The row is light: no colored panel, emoji or monospace body. It is visually distinct from agent and user rows: a small icon in the avatar column, the label as its speaker line, and a muted body. | BEH-004 | High | June 2026 decision kept | N/A | DEC-002 |
| REQ-004 | Desktop and phone (`/mobile`) behave the same. On the phone, the agent row after a notice shows the agent's avatar and name again. | BEH-001 | High | Phone is where it was seen | N/A | Task direction 2 |
| REQ-005 | Preserved behavior (boundary above) is unchanged. | BEH-003, BEH-004 | High | — | N/A | — |

## Acceptance Criteria

| AC ID | Requirements | Behavior / Scenario | Trigger | Expected Outcome | Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Conversation: agent turn ending with a tool card, then a restart reminder notice (wake), then reply text | Three rows in order: agent row with the tool card; notice row labelled Application restarted, body without the bracketed header, restart time in the viewer's zone; agent row with the reply | — | Web unit spec of the presentation builder and a feed component spec |
| AC-002 | REQ-001 | BEH-002 / SCN-002 | User message, then an AI message starting with a notice (e.g. tools updated), then text and a tool card | User row, notice row, agent row | Notice in the middle of an AI message → agent row, notice row, agent row | Builder spec |
| AC-003 | REQ-001, REQ-005 | BEH-003 / SCN-003 | Same notice live, then the run reloaded (history hydration), and a replayed frame of the same notice id | One notice row in each case, same place relative to the reply | — | Builder spec over a hydrated conversation; existing dedupe specs still pass |
| AC-004 | REQ-002 | BEH-004 / SCN-004 | One notice of each kind (restart, skill, tools, runtime change, background tasks, task notice, other) | Labels as REQ-002; bracketed header not repeated; tools-updated body unchanged | Unknown sender without header → Platform notice | Segment component spec, en and zh-CN |
| AC-005 | REQ-003, REQ-004 | SCN-001 | Desktop and phone render of AC-001's conversation | Desktop: the notice row has its own icon and label and no agent avatar. Phone: notice row, then the agent row showing the agent's avatar and name. No colored panel. | — | Phone: a case in `pnpm -C autobyteus-web test:e2e:mobile-shell` (TESTING.md). Desktop: a browser probe with screenshot. Both checked against the founder's screenshot |
| AC-007 | REQ-005 | SCN-001 | AC-001's conversation with token usage on the agent message | The message's usage line appears once (under its last row) and the total counts it once | — | Builder/usage spec |
| AC-006 | REQ-005 | — | Existing feed, witness, window, usage, phone-speaker and notice specs | Pass, updated only where they asserted the old in-message placement | — | Web unit suite |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Restart resume | Tell a run about the restart | Update restart wakes a run | Run was mid-turn | Notice posted as first input → agent replies | Notice row between the agent's rows | — | Supported Normal Scenario | autobyteus-448, screenshots | REQ-001..004 / AC-001, AC-005 |
| SCN-002 | System | Platform notifiers | Tell a run about a change | Next input with a preface, or a notifier-started turn | Any | Notice → agent's turn | Notice row before the agent row | Mid-message notice | Supported Normal Scenario | notice services | REQ-001 / AC-002 |
| SCN-003 | User | Founder | Reopen a run | Reload / reopen | Notice recorded | History hydrated | Same rows | Replayed frame | Supported Normal Scenario | hydration code | REQ-001, REQ-005 / AC-003 |
| SCN-004 | User | Founder | Know what a notice is | Reading | Any notice | — | Label names it | Unknown sender | Supported Normal Scenario | segment component | REQ-002 / AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, small.
- Product Design not requested: N/A for all Product design fields.
- Required states: notice row on desktop and phone, live and history (REQ-001..REQ-004).
- Product decisions that need the user: None. DEC-002 is decided within the direction, user informed.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-003 | Accessibility | Row keeps `role="note"` and an aria-label equal to the label | Segment spec |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (presentation only).

## External Contracts And Dependencies

None changed.

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/*.jpg` | Founder's screenshots | AC-001, AC-005 | Current | Evidence |
| `evidence/restart-notice-sampling-20261122.txt`, `probe/restart_notice_sampling.py` | Sampling behind DEC-001 | DEC-001 | Current | Evidence |

## Assumptions

None material.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Change the restart notice so a resumed agent ignores the runtime's "stop and wait" text? | Task direction 1 | Sampling: 30 of 31 agents continued. Only 4 saw the Claude runtime's "stop and wait" result, 3 of them continued, and 1 stopped. Option: one added sentence when a turn was cut off. | The Solution Designer offered a small, measured wording change. The founder decided not to change the wording, since it happened once. | User (2026-11-22) | Decided |
| DEC-002 | Place and look of a notice | REQ-001..REQ-003 | (a) Keep inside the agent message with a label. (b) Own row, light, labelled. (c) Own heavy card (rejected in June 2026). | (b): the Task asks for its own row, and a label tells the reader who it is from. The light look keeps the June decision. The row's label serves as its speaker line, like the agent's name. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001..003 | AC-001..AC-003 | SCN-001..003 |
| REQ-002 | UC-001 | BEH-004 | AC-001, AC-004 | SCN-004 |
| REQ-003 | UC-001 | BEH-004 | AC-005 | SCN-001 |
| REQ-004 | UC-001 | BEH-001 | AC-005 | SCN-001 |
| REQ-005 | UC-001 | BEH-003, BEH-004 | AC-003, AC-006, AC-007 | SCN-003 |

## Architecture Phase Input

- Constraints: no model/server change; the June light look; TESTING.md phone-bundle proof.
- Deferred to design: where the split happens; label mapping owner.

## Readiness Check

### Content Ready For Approval

- All items: `Yes`. Product design: `N/A`.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; the user narrowed the scope himself, DEC-001)
- Ready for architecture design: `Yes`
