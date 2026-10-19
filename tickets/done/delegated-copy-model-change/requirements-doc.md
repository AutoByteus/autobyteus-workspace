# Requirements Document

## Document Status

- Status: `Approved` (SR-007)
- Current solution revision ID: `SR-007` (approved requirements: `SR-007`)
- Package identifier: `delegated-copy-model-change`
- Request / ticket: Project Task `project_task_025b20cb-3fcb-438e-b910-cad1cd0c286b` (2026-10-13)
- Requirements owner: Solution Designer
- Date: 2026-10-13
- Approval state and reference: Approved by the user on 2026-10-13 in the Solution Designer conversation. The user first asked whether the UI should be designed first; after the answer that the existing rows, controls and Save bar are reused (no separate UI step), the user wrote: "okayyy. approve. i think you have good judgement". This approves the baseline and all DEC-001..DEC-007.
- Exact approved requirements baseline / solution revision: `SR-004` (this document as of 2026-10-13). It supersedes SR-002's "edit while running, applies at the next turn" with the user's stop-then-edit model. Approval: the user proposed "the task agent team copy and the task agents copy can be stopped independently … when it's stopped, I can just modify it … then I can send another message to trigger it to continue". To the Solution Designer's restated plan the user replied "Yeah, exactly. And the stop button can appear on the dedicated task agent copy or task agent team copy itself, just like … the parents" (2026-10-13). The SR-003 REQ-004 clarification is withdrawn. **SR-007 (2026-10-13):** the user asked to keep the UI clean and to reuse the existing experience. Quotes: "I don't know why you design this, your choice or undo, but we wanna keep the UI as clean as possible after you the save"; "A lot of the experience we already have, we just make it available for the … dedicated agent and the agent team"; "propose the reasonable user experience … You can work on your own." This removes the "Your choice" label and the separate Reset, and sets the principle that delegated copies get the same Stop and stopped-edit experience as user-launched runs.
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: a delegated copy (an Agent copy, or a Team copy and its members) runs on the model it was started with (its configured default or the inherited one). The run's Settings shows it, but with "they cannot be edited here". The only way to change its model today is to start a new copy and lose the copy's progress. Typical cases: a reviewer on a model that is too weak, a member stuck on a model out of quota, or a hard Task that needs a stronger model.
- Desired outcome: the user can stop a delegated copy or collaborator on its own (a Stop button on its row in the sidebar run tree, like parent runs, and in Settings). While it is stopped, the user can change the model (and model settings) of each of its agents within their runtimes. A message, from the user or an agent, resumes it in the same conversation on the new model. The choice persists and shows as the user's choice.
- Observable definition of success:
  - In the PM run, the user clicks Stop on a delegated Software Engineering Team copy in the sidebar. The rest of the run continues.
  - In Settings, the user changes the code reviewer from model A to model B and Saves.
  - The next message to the copy resumes it; the code reviewer's next turn runs on B in the same conversation.
  - Settings shows B like any edited member.
  - After idle shutdown/wake-up or an app restart it is still B.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001..004 | Collaborators/copies are read-only in Settings | While a collaborator/copy is stopped, each of its agents has an editable model (and model settings) within its runtime; while running, the controls are locked with a hint to stop it first | Collapsible layout; root/configured-member editing rules unchanged | Investigation |
| BEH-002 | User/System | SCN-001, SCN-002, SCN-006 | Copies stop only on idle shutdown (whole copy, after ≥10 min quiet) or with the whole run; no per-copy Stop | The user can stop one copy/collaborator (agent or team) from its sidebar row or Settings row; a message resumes it on its current settings, including the user's choice | Idle shutdown; root Stop; conversation/history and provider identity kept | Investigation |
| BEH-003 | System | SCN-003 | Idle shutdown / restore uses the start values | Restore uses the user's choice | Lifecycle unchanged otherwise | Lifecycle code |
| BEH-004 | System | SCN-005 | New copies resolve agent default → team default → inherited | Unchanged; a user choice on one copy does not affect other or later copies | — | delegated-launch-config-defaults |
| BEH-005 | User/Contract | SCN-004 | Stopped-run switch validation (catalog, settings schema, AutoByteus capacity) | Same validation for copy changes | Runtime fixed | Prior ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Change the model of a delegated Agent copy or collaborator Agent from the run's Settings | SCN-001 |
| UC-002 | Change the model of one member of a delegated Team copy or collaborator Team, or of the whole team | SCN-002 |
| UC-003 | The change survives idle shutdown/wake-up, root stop/reopen and app restart, and shows as the user's choice | SCN-003 |
| UC-004 | Invalid choices and failures are reported without a partial or silent change | SCN-004 |

### Out Of Scope

- Changing a copy's runtime, workspace or tool approval.
- Changing models anywhere other than the run's Settings (e.g. a model picker in the copy's conversation).
- Changing the definition defaults; the routing Task `871c0af0`; bug `b2d9b725` (stopped-run switch when the current model is no longer offered).
- Hot-switching a turn that is already running.
- Editing closed copies (Task DONE/CANCELLED), which are not listed in Settings.

### Non-Goals

- No guarantee that every provider accepts every existing conversation on a smaller model; failures stay visible, as for stopped-run switching.

### Preserved Behavior Boundary

- BEH-004 (new-copy resolution) and BEH-005 (validation rules) are preserved.
- Editing of the root and configured members in a user-launched run is unchanged: stopped runs only.
- History and provider identity are kept.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | In the run's Settings, the user can change the model and its model settings (e.g. thinking, fast mode) of each agent in a listed delegated copy or collaborator: an Agent copy/collaborator, or any member of a Team copy/collaborator. This is allowed **while that copy/collaborator is stopped**: stopped by the user, idled out, or because the whole run is stopped. The runtime stays fixed. While it is running, the controls are locked with a hint to stop it first. A Save that finds it running again (e.g. woken by an agent) is refused clearly, and nothing changes. | BEH-001 | Must | User direction | Task; DEC-001, DEC-002 |
| REQ-002 | On a Team copy/collaborator, the user can also change the team's model. Members that follow the team (no own default and no own user choice) take it; members with their own model keep it unless changed individually. | BEH-001 | Must | "one member, or the whole team"; consistent with the user-launched team behavior | DEC-003 |
| REQ-003 | Choices are offered and validated as for stopped-run model switching: the agent's runtime catalog and the model's settings schema, plus for AutoByteus a replacement capacity at least equal to the current model's. An invalid or unavailable choice is refused clearly and nothing is changed. | BEH-005 | Must | Preserve existing rules | Prior ticket |
| REQ-004 | When a stopped copy/collaborator is resumed by a message (from the user or an agent), its agents run on their current settings, including the user's choice, in the same conversation with their history. An agent that has not started yet starts on its chosen model when work reaches it. | BEH-002 | Must | "from the next turn"; no lost progress | DEC-004 |
| REQ-005 | The choice is recorded per agent. It survives idle shutdown and wake-up, root stop and reopen, and app restart. After Save, the row simply shows the agent's current model, like any edited member: no extra label. The origin text from the launch-defaults Task ("Agent default" / "Team default" / "Inherited from the run") stays only on agents the user has not changed. | BEH-003 | Must | Persistence and visibility | DEC-005 |
| REQ-006 | The choice applies only to that copy or collaborator instance. It does not change the definitions, other copies, or later copies. Extra copies started later at a collaborator's address, and teammate copies started from inside a copy, start on the started (configured/inherited) values, not on the source instance's choices (SR-005 clarification of the approved per-instance rule). | BEH-004 | Must | Precedence: a user choice is per instance | DEC-006 |
| REQ-007 | (Removed in SR-007 at the user's request: no separate Reset/undo. The user changes the model back like any other setting.) | — | — | — | DEC-007 |
| REQ-009 | Each listed delegated copy and collaborator (Agent or Team) has a Stop button while it is running: on its row in the sidebar run tree, the same stop icon as parent runs, and on its row in Settings. Stopping interrupts any turn in progress and stops all of its agents and the copies it started itself. The rest of the run keeps running, and the copy's Task stays open. A stopped copy shows as stopped (offline) and resumes on the next message. | BEH-002 | Must | User proposal: stop independently, edit, continue | User, 2026-10-13 |
| REQ-008 | If the agent cannot start or continue on the chosen model (provider rejection), the error is visible in that agent's conversation, as for stopped-run switching, and the conversation is not reset. The user can choose another model. | BEH-002 | Must | Preserve the visible-error rule | Prior ticket |

## Acceptance Criteria

| AC ID | Related REQ | Related Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004, REQ-005, REQ-009 | SCN-001 | Running PM run; the user stops a delegated Agent copy, changes its model, Saves, then sends it a message | It resumes in the same conversation on the new model; Settings shows the new model (no extra label) | — | Server test + real runtime check |
| AC-002 | REQ-001, REQ-009 | SCN-002, SCN-006 | A Team copy is running (a member mid-turn) | Its model controls are locked with the hint. Stop on its sidebar row (and on its Settings row) interrupts the turn and stops all its members and the copies it started; the PM and other copies keep running; the copy's Task stays open | — | Server test |
| AC-003 | REQ-002 | SCN-002 | The user changes a Team copy's team model | Members following the team switch at their next turn; members with their own model don't | — | Server/web test |
| AC-004 | REQ-004 | SCN-002 | In a stopped Team copy, a member that never started gets a new model | When the copy resumes and work reaches that member, it starts on the new model | — | Server test |
| AC-005 | REQ-005 | SCN-003 | After a change, the copy idles out and wakes; then the root is stopped/reopened; then the app restarts | The agent still uses and shows the user's choice | — | Persistence/restore tests |
| AC-006 | REQ-003 | SCN-004 | The user picks an AutoByteus model with smaller capacity, or a model no longer in the catalog, or invalid settings | Save is refused with a clear message; nothing changes | — | Server/web tests |
| AC-007 | REQ-006 | SCN-005 | After changing a copy, the agent delegates the same team again | The new copy uses the normal resolution (defaults/inherited), not the earlier user choice | — | Server test |
| AC-008 (removed, SR-007) | REQ-007 | SCN-001 | The user resets a changed agent | The started value is restored from its next turn; the source label returns to the started source | — | Web/server test |
| AC-009 | REQ-001 | SCN-001 | Stopped run; the user changes a copy's model, then resumes the run and messages the copy | The copy runs on the new model | — | Test |
| AC-011 | REQ-001 | SCN-006 | The user is editing a stopped copy; the delegating agent messages it (it wakes); the user Saves | Save is refused ("this copy is running again; stop it and try again"); nothing changes | — | Server/web test |
| AC-010 | REQ-001..REQ-005 | SCN-001, SCN-002 | User verification: in the PM's Settings, change the code reviewer of a delegated SE team copy | Behaves as AC-001/AC-005 with real runtimes | — | User check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Give one delegated agent a better or working model | Run Settings → Collaborators and delegated copies | Expand the copy → change the model → Save | Next turn on the new model | Reset | Supported Normal | Task | REQ-001,004,005,007; AC-001,008,009 |
| SCN-002 | User | User | Change one member or the whole team of a team copy | Same | Expand the team → member or team settings → Save | As REQ-002/004 | Mid-turn member | Supported Normal | Task | REQ-002,004; AC-002..004 |
| SCN-003 | System | Platform | Keep the choice | Idle shutdown, stop, restart | — | The choice persists | — | Supported Normal | Lifecycle | REQ-005; AC-005 |
| SCN-004 | User | User | Invalid choice | Save | — | Refused | — | Supported Explicit Edge | Prior ticket | REQ-003,008; AC-006 |
| SCN-006 | User | User | Stop one copy without stopping the run | Sidebar row stop icon or Settings row | Click Stop → the copy stops → (optionally edit) → message to continue | Copy stopped; the rest continues | An agent wakes it | Supported Normal | User proposal 2026-10-13 | REQ-009, REQ-001; AC-002, AC-011 |
| SCN-005 | System | Delegating agent | New delegation | `delegate_task` | — | Normal resolution | — | Supported Normal | Prior ticket | REQ-006; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, within the existing Settings rows. Product design: N/A (not requested).
- The section's description changes from "they cannot be edited here" to explain that the model can be changed and applies from the next turn.
- An expanded copy agent/team row shows the same model and model-settings controls as editable configured members, with the runtime locked.
- The existing Save bar is used. After saving, the row shows the new model like any edited member (no extra label, no separate Reset).
- A Stop icon (the same as parent runs) appears on each running copy/collaborator row in the sidebar run tree and on its Settings row.
- While running, a copy's model controls are locked with "Stop this copy to change its model".
- Product decisions needing the user: none. The user agreed no separate UI design step is needed (2026-10-13).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-004 | Reliability | Changing one agent never interrupts a running turn or teammates | Tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`. Records gain a per-agent user choice; existing records must keep loading unchanged. No loss is acceptable.

## Decisions

| Decision ID | Question | Why | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Include collaborators (brought in with `send_message_to`/`@`), not only `delegate_task` copies? | Both appear in the same Settings list and run on started values | Copies only vs both | The same user need and the same list. Excluding collaborators would leave half the rows read-only for no product reason. **Include both** | Solution Designer | Decided |
| DEC-002 | What is editable? | Scope | Model only / model + model settings / + approval/workspace | The existing stopped-run switch edits the model and its settings together (thinking etc. belong to the model). Runtime is fixed by direction; approval and workspace are not part of "the model". **Model + model settings** | Solution Designer | Decided |
| DEC-003 | Team-level change semantics | "Whole team" | Overwrite all members vs only members following the team | Matches the user-launched team behavior (DEC-009 of the launch-defaults Task): members with their own model keep it. **Followers only** | Solution Designer | Decided |
| DEC-004 | When does it apply? | Timing | (SR-002) edit while running → applies at the next turn when quiet; (SR-004) **stop the copy → edit → resume with a message** | The user's proposal matches how user-launched runs already work (stop, change, continue). It has no hidden pending state, and the per-copy Stop is useful on its own. Superseded SR-002 option | User | Decided (SR-004) |
| DEC-005 | How is it shown? | Visibility | (SR-001) a "Your choice" label; (SR-007) no label | The user wants a clean UI: after Save the row shows the model like any edited member. The origin text stays only on untouched agents, where it explains a model the user did not pick. (Precedence is unchanged: user choice → configured default → routing → inherit) | User (SR-007) | Decided |
| DEC-006 | Does a choice carry to later copies? | Scope of a choice | Per instance vs remember for the definition | A per-instance choice keeps definitions and later delegations predictable. Changing defaults is the definition's job. **Per instance** | Solution Designer | Decided |
| DEC-008 | What does stopping a copy stop? | Containment | Only its own agents vs. also the copies it started | Copies a copy started are inside it in the run tree; stopping the root stops everything, so stopping a copy stops what is inside it. A stopped inner copy resumes when messaged, like any copy | Solution Designer | Decided |
| DEC-009 | Where is the Stop button? | UX | Sidebar row, Settings row, copy view | The user asked for it on the copy's own row "just like the parents" (sidebar), plus Settings, where editing happens | User | Decided |
| DEC-007 | Undo | UX | Separate Reset vs. none | (SR-007) None; the user re-picks a model like any setting | User (SR-007) | Decided |
| DEC-010 | Guiding principle | UX consistency | New experience vs. reuse | (SR-007, user) Reuse the experience user-launched runs already have: the same stop icon, the same Settings member editing while stopped, the same Save. Only make it available to delegated copies and collaborators | User | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001, AC-009, AC-010 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-001 | AC-003 | SCN-002 |
| REQ-003 | UC-004 | BEH-005 | AC-006 | SCN-004 |
| REQ-004 | UC-001, UC-002 | BEH-002 | AC-001, AC-002, AC-004 | SCN-001, SCN-002 |
| REQ-005 | UC-003 | BEH-003 | AC-005 | SCN-003 |
| REQ-006 | UC-001 | BEH-004 | AC-007 | SCN-005 |
| REQ-007 | UC-001 | BEH-001 | AC-008 | SCN-001 |
| REQ-009 | UC-001, UC-002 | BEH-002 | AC-002, AC-011 | SCN-006 |
| REQ-008 | UC-004 | BEH-002 | AC-006 | SCN-004 |

## Architecture Phase Input

- Verify the per-agent switch at the next turn (UNK-001), the record shape for the per-instance choice, the editing/save API for copies while the root runs, and the restore path.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-13)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
