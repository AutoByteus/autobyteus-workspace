# Requirements Document — phone-run-model-runtime-458 (autobyteus-458)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Approved by and reference: `User` (the founder), 2026-11-17, through the Product designer's approved UI/UX specification ("I think now the phone experience is much better … I agree with the complete, I confirm"; earlier "I accepted your recommendation … stop run on the mobile phone we really need it"), relayed by the PM with the Task's newest comment (the 506 build items join 458). DEC-001 = allowed; DEC-003 = one tap, no confirmation.
- Behavior-defining supplement: the Product-owned UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/ui-ux-spec.md` (Status Approved; VIS-001…VIS-019 in `visual-references/`; `ui-text-inventory.md`; runnable UI reference: the design repository `/Users/normy/autobyteus_org/autobyteus-web-design`, branch `personal` `fc68a7a4d2`, runbook `ui-reference-runbook.md`). Its visible details are normative except the fixture content it names as illustrative.
- Requested by: `/project_task_manager` for the founder; Date: 2026-11-17

## Problem And Desired Outcome

- On the phone the founder cannot see or change a run's model or runtime (458); the phone conversation uses 69% of the width for text with small type and no size choice (506).
- Desired (the approved specification): (a) a readable phone conversation: a 388 px text column at 412 px, one speaker line per turn, 17 px type, a four-step Text size; another agent's message as on the desktop (arrow and type line kept, the founder's correction); the composer's lower corners fixed; (b) Settings for the open run: Runtime, Model, Save; a live run shows the desktop's small red stop icon first.

## Scope Guardrail

- In scope: UC-006 the shared stop's false failure (taken in by the PM, REQ-011); UC-001 the readable phone conversation (506 items, VIS-001…VIS-008, VIS-018); UC-002 Text size (phone-wide, four steps, kept on the phone); UC-003 Settings for a stopped run (VIS-009…VIS-015); UC-004 Stop a live run from Settings (VIS-016, VIS-017); UC-005 the composer's lower corners (VIS-019; shared with the desktop).
- Out of scope: the desktop's conversation layout (unchanged; the phone rules are scoped to the phone runtime) except the composer corner; any change to `InterAgentMessageSegment` (desktop and phone show it as today); usage-limit marks; a Language row (autobyteus-509); the phone file viewer, VNC Viewer, run list, New run; iOS app changes.
- Preserved: the node's rules (only a stopped run changes; refusal outcomes); the desktop editor and conversation; names never addresses (433); no new Android permission; no server change expected.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRE-001 | The shared stop reports failure for a run it did stop: `agentRunStore.terminateRun` records the run's input instance at the start (`state.inputProjection?.runInstanceId`, `autobyteus-web/stores/agentRunStore.ts` ~420) and, when the mutation returns, `ownsRequest` requires the current instance to equal it; an instance unknown at the start (null) that arrives during the stop (the interrupt's input-state update) fails the check, so `terminateRun` returns false although the node stopped the run. The Team stop has the same check (`agentTeamRunStore.ts` ~233). Reproduced by the implementation engineer on isolated nodes with a scripted runtime (`evidence/implementation/stop-ownership-diagnostic.json`: MSP-64, instanceBefore null, instanceAfter set, TerminateAgentRun 200 success, "The run did not stop."); timing-dependent for idle runs (MSP-63 failed in an earlier round). Read by the Solution Designer (the guard at the cited lines). The desktop's run-tree "Terminate run" and its Settings stop use the same action | AC-006, REQ-008 | `/project_task_manager` | Taken into this ticket by the PM (2026-11-17, Task comment: "the FIRST step" of 458); REQ-011, AC-009 |

## Requirements

| ID | Requirement |
| --- | --- |
| REQ-001 | The phone conversation follows the specification's layout and type scale (UIS-001: 12 px margins, no avatar column, a 22 px avatar and name once per speaker turn, 17 px / 1.5 type, the markdown, card, code, table, error, think, notice and media values), only on the phone runtime. |
| REQ-002 | The ⋮ menu has a Text size block (Small 15, Standard 17 default, Large 19, Largest 21 px); the choice applies at once to the whole phone and is kept on the phone (`autobyteus.phone.textSize`). |
| REQ-003 | On the phone another agent's message shows exactly as on the desktop: the product's `InterAgentMessageSegment` unchanged, with its arrow and its message-type line (the founder's correction of 2026-11-17; it overrides the specification's hidden version, VIS-004, for this item only). |
| REQ-004 | The composer's text area has rounded lower corners (`rounded-b-[11px]`) on desktop and phone; the phone conversation leaves 8 px below the composer box. |
| REQ-005 | The ⋮ menu has the entry "Settings"; the Settings screen shows the open run's status dot, name and `<status> · in <Team>`, the Runtime and Model rows of New run (same names, lists and model settings from the same stores) and Save. |
| REQ-006 | For a stopped run: choosing another runtime clears the model; Save is enabled only for a changed selection with a model; Save saves through the node's existing stopped-run update and returns to the conversation; reopening shows the new values; the change applies at the next message (no text says so). |
| REQ-007 | A refused Save shows the node's message in a red card under the rows; the screen stays; nothing changes. |
| REQ-008 | For a live run (the node's `isActive`, idle or working) the name row shows the desktop's small red stop icon ("Stop run" as its accessible name and tooltip); Runtime, Model and Save are disabled; one tap stops the run (no confirmation), then the rows open. For a Team or Org member the stop stops the Team or Org run, as on the desktop. |
| REQ-009 | All new phone texts use the translation keys of the specification (`mobile.settings.*`), English and Chinese catalogs. |
| REQ-010 | The phone key may stop a run and change its runtime and model (DEC-001: allowed); autobyteus-441 must keep both on the phone's allowed list. |
| REQ-011 | Stop reports success when the node stopped the run: in the shared agent and Team stop (`agentRunStore.terminateRun`, `agentTeamRunStore`), an input instance unknown when the stop began counts as the same run; ownership fails only when a known start instance differs from the current one. This holds on the desktop (run tree Terminate, desktop Settings stop) and the phone. |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, 003 | At 412 and 360 px the conversation matches VIS-001…VIS-004, VIS-018 (text column = width − 24 px), except that another agent's message keeps its arrow and type line as on the desktop; the desktop conversation is unchanged | Phone-bundle probe with measurements; desktop component tests or probe |
| AC-002 | REQ-002 | Each step reflows the conversation at once and survives a reload | Probe |
| AC-003 | REQ-004 | The composer's lower border is continuous (VIS-019), desktop and phone | Component test / probe |
| AC-004 | REQ-005, 006 | Isolated node, scripted runtimes: a stopped Team member's runtime and model changed in Settings; Save returns to the conversation; reopening shows the new values; "continue" runs on the new ones | Phone probe and Android emulator |
| AC-005 | REQ-007 | A refused Save (model not offered) shows the node's message; nothing changes | Probe |
| AC-006 | REQ-008 | A live idle agent and a working one: the stop icon; one tap stops; rows open; Save works | Probe and emulator |
| AC-007 | REQ-009 | No new hard-coded phone text; both catalogs carry the keys | Catalog test |
| AC-008 | Preserved | Desktop editor, desktop conversation (except the composer corner), New run, existing phone probes: unchanged and passing | Existing suites |
| AC-009 | REQ-011 | A stop that starts with no input projection and gets an input-state before the node answers resolves as stopped and runs the local teardown, for an agent and a Team; the desktop run tree's Terminate and the desktop Settings stop show no false failure | Unit tests (agent, Team); desktop check |

## Decisions

| ID | Question | Answer | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | May the phone key stop a run and change its runtime and model? | Allowed ("stop run on the mobile phone we really need it") | Founder | Decided (2026-11-17) |
| DEC-002 | The screens | The approved specification | Founder, Product | Decided |
| DEC-003 | Stop run: one tap or confirm? | One tap, no confirmation (the approved recommendation) | Founder | Decided |
| DEC-004 | Stop icon for an idle live run? | Shown for every live run: the node refuses a change to any active run, idle included (`agent-run-status-projection-service.ts:110-119`; `studio-run-model-config-service.ts:22`); resolves the designer's open finding (b) | Solution Designer | Decided |
