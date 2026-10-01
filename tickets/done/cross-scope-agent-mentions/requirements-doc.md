# Requirements Document — cross-scope-agent-mentions

## Document Status
- Status: **Approved** (SR-008, 2026-10-01): a user-directed change to the collaborator model.
- SR-008 approval reference: the user replied "approved. ask product prototyper to update UI thanks" (2026-10-01) to the
  SR-008 change summary. D-R1 and D-R2 are accepted as recommended. The behavior-defining visuals were revised by Product and
  user-confirmed on 2026-10-01 (see the UI section). The previously approved basis was SR-004. Changed IDs: REQ-001, REQ-003, REQ-005, REQ-006, REQ-008,
  REQ-011, REQ-012 (the `delegate_task` bullet), AC-003, AC-004, AC-005, AC-006, AC-008, AC-011, AC-014, B-002, B-004,
  SC-001, SC-002, SC-006, SC-008; new REQ-013 and AC-015.
- Trigger: DI-001 (code-review CRR-004). The user then directed that collaborators be a single instance per run, reached
  with `send_message_to`: "yesss. i think this is better… send message to sounds more intuitive… just like normal
  communications" (2026-10-01).
- Previously approved: SR-004.
- SR-008 Product revision integrated (2026-10-01).
  - Revised `ui-ux-spec.md` (VIS-001–015) confirmed by the user: "…If you checked yourself everything's right then you're
    done. Yeah, it's correct."
  - New product-wide decision RD-004, agreed by the user in Product review: "okayyyy. agreed". It is recorded as REQ-014
    and AC-016 under the same approval.
- Approval reference: I asked "If you agree with yes to OQ-1 and main settings for OQ-2, just say 'approved' … I'll mark
  the requirements approved, including all the decisions from today". The user replied: "Yeah, I completely agree with you."
  (2026-09-30). The basis covers REQ-001–012, AC-001–014, DEC-U1, OQ-1 (yes), OQ-2 (root settings), OQ-3 (application-owned
  runs excluded) and the approved UI/UX spec with VIS-001–014.
- Previous: Ready for Approval (SR-002/003); Draft (SR-001).
- Basis: approved Product Design package (see Supplemental Artifacts). User confirmation of the
  UI: "Okay, finally I confirm now. All good now." (2026-09-30). That confirmation covers the UI/UX
  spec, not these requirements. These requirements still need explicit approval.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`, branch
  `codex/cross-scope-agent-mentions`, base `origin/personal` @ `57df63f07`. The latest `origin/personal` is
  `8caa610ff`; rebase before design. Finalization target: `personal`.

## Problem And Desired Outcome
A user who launched a standalone Agent, a standalone Agent Team, or an Agent Org cannot bring in
a standalone Agent or Agent Team that is not already part of that run. Teammates and Org members
already reach each other through messages and handoff rules. Reaching outside the run requires
having launched an Org that mounts the collaborator up front.

Desired outcome: in any live run, the user types `@` and picks a shared standalone Agent or Agent
Team that is not in the run. The message goes to the focused agent. That agent brings the
collaborator into the conversation by messaging it with `send_message_to`. The collaborator is one instance that belongs to
the run; it joins when the user mentions it and starts on its first message. It appears under the run, and every message
between it and the run's agents, including the first one, appears in the Team/Org tab. The user can
open the collaborator and chat with it directly. There is no hidden global Org.

## Relevant Current And Desired Behavior
| ID | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- |
| B-001 | `@` exists only in New chat and picks the launch target (E-04) | `@` also in every live run composer; lists outside-run candidates | New chat `@` unchanged |
| B-002 | Only configured members and mounted Teams can be reached by address (E-03, E-08) | A mention adds the definition to the run as one collaborator instance (Agent, or Team with its members). It is reachable by address with `send_message_to` and starts on its first message, like an Offline configured member | Mounted and configured behavior unchanged |
| B-003 | Standalone Agent runs have no collaboration root: no children, no delegation, no Team tab (F-005) | A standalone Agent run can host task children and shows a Team tab once one exists | Existing standalone Agent runs and history work unchanged |
| B-004 | Delegated brief = system task notice in the child; later same-root run-ID messages = Team/Org tab rows (E-06) | A collaborator's first contact is an ordinary `send_message_to` message, so it is a Team/Org tab row and appears in the collaborator's conversation as an inter-agent message | Delegated children (including any extra copy started with `delegate_task`) keep the system task notice |
| B-005 | Task rows show a visible "Started by" line and a dotted ring for task Agents | Product-wide: no visible "Started by"; task Agent uses the member marker; centred marker; straight branch line | Starter kept in the accessible label |
| B-006 | Client resolves task executions through a configured member at the same address; task data has no definition identity or settings (F-001) | Collaborators that are not mounted display and open correctly | Existing task children display unchanged |

## Stakeholders, Actors, And Outcomes
- User: reaches outside help mid-run without planning an Org.
- Focused agent: receives the mention and decides how to brief the collaborator.
- Collaborator (one Agent instance, or one Team instance whose coordinator is its ingress): receives messages and reports back.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- UC-001: `@` in a live standalone Agent run.
- UC-002: `@` in a live standalone Agent Team run (focused member).
- UC-003: `@` in a live Agent Org run (focused member).
- UC-004: The collaborator works, reports back, and is opened by the user.
- UC-005: Adding the collaborator fails.
- UC-006: Product-wide task-row presentation update.

### Out Of Scope
- A hidden global Org or any global run directory for agents.
- Linking to runs in other roots.
- Mentioning Agent Orgs.
- The first message of a launch draft (New chat and Agents → Run).
- Automatic handoff rules. Changes to authored Org/Team definitions.

### Non-Goals
- Showing inherited settings as text, a success notice, or an "added" concept or wording.
- More than one collaborator instance per definition per run created by mentions. Extra copies are only created by an explicit `delegate_task` (REQ-013).
- Changing how delegated copies of mounted Org Teams address their teammates (existing behavior, E-20); this is a separate-ticket candidate.

### Preserved Behavior Boundary
- New chat `@` launch-target picker.
- Existing delegation semantics and the delegated child's system task notice.
- Same-root run-ID messaging and its Team/Org tab projection.
- Existing Org, Team and standalone Agent run history and restore.

### Review Authority
Blocking findings must trace to REQ/AC or preserved-behavior IDs here, or to the approved UI/UX spec.

## Requirements
- REQ-001: Every live run composer supports `@`: standalone Agent runs, standalone Team runs
  (focused member) and Org runs (focused member). Candidates are shared standalone Agent definitions,
  then shared Agent Team definitions, in catalog order. Excluded: Daily Assistant (the default chat agent) and
  Agent Orgs. Also excluded is anything already in the run: the run's own Agent or Team, its
  configured members, an Org's mounted Agents and Teams, every collaborator already added to the run, and the member
  Agents of collaborator Teams.
- REQ-002: A chosen mention appears as a removable chip and inline `@Name` text. The sent user message shows
  the mention inline. The message is delivered to the focused agent together with the identity of
  the mentioned definition.
- REQ-003: Sending a message with a mention adds the mentioned definition to the current run as **one collaborator
  instance** before the focused agent receives the message. For an Agent, that is one AgentRun. For a Team, it is one
  TeamRun with one run per member and the Team's coordinator as its ingress. The instance is reachable by its address
  (e.g. `/product_team`, `/product_team/prototype_bootstrapper`) with `send_message_to`, from the run's agents and from
  the collaborator's own members, so a collaborator Team's authored handoffs work. It starts on its first message,
  like an Offline configured member, and shows Offline until then. Mentioning a definition that is already a collaborator
  reuses the same instance. The addition applies to this run only. Tool availability is covered by REQ-012.
- REQ-004: A collaborator uses the current run's root launch settings (runtime, model and model
  settings, workspace, tool-approval policy). For a standalone Agent run, these are that run's own settings.
  Settings are not shown as extra text.
- REQ-005: The run's agents and the collaborator exchange messages in both directions inside the run with
  `send_message_to`, by address or run ID. Every message, including the first one that briefs the collaborator, appears
  in the Team/Org tab and in the collaborator's conversation as an inter-agent message. The focused agent's mention note
  tells it the collaborator's address and to use `send_message_to`.
- REQ-006: A collaborator is part of the run. It is shown under the run in the tree and persisted with the run,
  including its run IDs. It is restored with the run: Offline until messaged, and its conversation is continued when it
  wakes. It is stopped with the run, and other runs cannot reach it.
- REQ-007: A standalone Agent run with a collaborator shows task rows under the run row. Clicking
  the run row returns to the run's own agent. A right-panel "Team" tab appears once the run has a
  collaborator.
- REQ-008: Adding is validated when the user sends: the definition is admissible, and its runtime, model and workspace
  can run with the run's settings. If a mentioned collaborator cannot be added, nothing is added, the message is
  **not** sent, and the draft (text and chips) stays in the composer. A red notice above the composer says
  "Couldn't add <name> to this run", gives the reason and says nothing was added. The user can remove the chip and send
  again. The tree is unchanged. The notice can be dismissed and is replaced by the next send. If a collaborator that
  was added later fails to start, its row shows the error status, as a configured member's would.
- REQ-009: Product-wide task rows: no visible "Started by" line (kept in the accessible label). A task
  Agent shows the member marker (status dot plus initials). The marker is centred on the name line and
  the branch line runs straight.
- REQ-010: The run composer exposes combobox semantics equivalent to the New chat composer. The `@`
  menu is keyboard-operable as specified.
- REQ-012: `delegate_task` and `send_message_to` are always available to every user-facing agent run
  (standalone Agents, including Daily Assistant; Team and Org members; task children), on every runtime, from
  the start of the run, whether or not the definition lists them. They cannot be turned off.
  `get_handoff_rules` is unchanged: it stays available only to Team/Org members.
  What a call may do is decided at call time, not by whether the tool is present:
  - `delegate_task` targets only configured placements and collaborators of this run.
    Otherwise it starts nothing and returns a clear reason, e.g. "no agents or teams are available to delegate to
    in this run; the user can bring one in with @".
  - `send_message_to` keeps its existing selector rules. `recipient_address` needs a collaboration root;
    `target_agent_run_id` follows the existing same-root or live-only rules.
  Server-internal helper runs (e.g. the skill improver, which has a narrowed message grant) and
  application-owned agent runs keep their current tool rules.
- REQ-013: `delegate_task` may target a collaborator's address to start a **fresh extra copy**, as it can for
  configured members. The copy is an ordinary delegated child: system task notice, task row. The mention note does not
  suggest this; `send_message_to` is the normal way to work with a collaborator.
- REQ-014 (RD-004, product-wide): every agent-to-agent message shown in a conversation shows its sender, using the
  existing "From <Sender>:" inter-agent presentation, instead of the current user-style bubble. This covers collaborator
  briefings, reports back and ordinary teammate messages, in live and reopened conversations, in Team, Org and standalone
  (Agent-root) runs. Messages that were stored before this change and do not record a sender keep their current
  presentation; no sender is guessed.
- REQ-011: A user can open any collaborator (an Agent, a Team member, or a Team, whose coordinator opens by default) and
  chat with it directly. A message sent there starts it if it is Offline.

## Acceptance Criteria
- AC-001 (REQ-001): In each of the three run kinds, `@` lists only outside-run shared Agents then
  Teams. No Org, no Daily Assistant, nothing already in the run (VIS-001, VIS-008, VIS-011).
- AC-002 (REQ-002): The chip, inline text and sent inline mention match VIS-003/VIS-004. The focused agent
  receives the message and the mentioned definition identity.
- AC-003 (REQ-003/004): After a mention send, the collaborator instance is in the run tree (Offline) before the
  focused agent's turn. The focused agent's `send_message_to(<collaborator address>)` starts it with the root launch
  settings and delivers. This works for a standalone agent without configured collaboration tools. A collaborator
  Team member's `send_message_to(<teammate address>)` from an authored handoff reaches that teammate in the same instance.
- AC-004 (REQ-003): A definition that is neither configured nor a collaborator in this run cannot be messaged by address
  or delegated to. A mention in one run has no effect on another run. A second mention of the same definition reuses
  the instance (same run IDs).
- AC-005 (REQ-005): The briefing message and the collaborator's report both appear as Team/Org tab rows. The
  collaborator's conversation starts with the briefing as an inter-agent message, not a system task notice.
- AC-006 (REQ-006): After stopping and reopening the run, the collaborator is still under the run (Offline) with the
  same run IDs, and it wakes with its conversation when messaged. Another run cannot message it.
- AC-007 (REQ-007): A standalone Agent run shows task rows, run-row focus return and the Team tab as in
  VIS-012/VIS-013.
- AC-008 (REQ-008): Mentioning an unrunnable collaborator shows the notice (revised VIS-007). The message is not
  sent, the draft stays, and no row is added.
- AC-009 (REQ-009): All task rows, including ordinary delegated children, match VIS-006/VIS-009.
- AC-010 (REQ-010): The combobox attributes are present. Arrow keys, Enter/Tab and Escape behave as specified.
- AC-011 (REQ-001): Once added, a definition is no longer offered in that run (empty state VIS-002). After a failed add
  it is still offered.
- AC-012 (REQ-011): Clicking a collaborator row opens its conversation, and a sent message reaches it.
- AC-014 (REQ-012): A standalone agent whose definition lists neither tool has both from its first turn on
  AutoByteus, Codex, Claude and the other supported runtimes. Before any mention, `delegate_task` returns no run ID with the reason and
  starts nothing. After a mention, `send_message_to` to the collaborator succeeds without restarting the conversation. A definition that already
  lists the tools gets no duplicates. Helper and application-owned runs are unchanged.
- AC-015 (REQ-013): `delegate_task(<collaborator address>)` starts a fresh extra copy with the system task notice; the
  collaborator instance itself is unaffected.
- AC-016 (REQ-014): A `send_message_to` delivery shows "From <Sender>:" in the receiver's conversation, both live and
  after reopening the run, in Team, Org and standalone runs (revised VIS-004/005/010/013). The user's own messages are
  unchanged.
- AC-013 (preserved): New chat `@` behavior and existing runs/history are unchanged.

## Relevant Scenarios And Journeys
| ID | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- |
| SC-001 | Team member focused, user sends `@Product Team …` | Product Team instance added (Offline); focused agent messages `/product_team`; it starts and works | Supported Normal (new) | UXJ-001, revised VIS-004 |
| SC-002 | Collaborator works (including its authored handoffs) and reports back by message | Team/Org tab rows | Supported Normal | UXJ-001 step 7 |
| SC-003 | User clicks collaborator row | Direct chat with it | Supported Normal | UXJ-002, VIS-005 |
| SC-004 | Org member focused, user mentions an Agent or Team | Same as SC-001 in the Org run | Supported Normal (new) | UXJ-004 |
| SC-005 | User types `@` for something already in the run | Not offered | Supported Normal | Round 10, VIS-002 |
| SC-006 | Collaborator cannot run with the root settings | Send blocked, draft kept, failure notice, nothing added | Supported Explicit Edge | UXJ-003, revised VIS-007 |
| SC-007 | Standalone Agent run, user mentions an Agent or Team | Task rows under run; Team tab | Supported Normal (new) | UXJ-005, VIS-011–013 |
| SC-008 | Run with collaborators is stopped and reopened | Collaborators restored Offline, wake with their conversation on message | Supported Normal | Configured-member lifecycle |

## UI, Interaction, And Experience Requirements
The normative source is the approved SR-008 `ui-ux-spec.md` at
`/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/` with **VIS-001–VIS-015**
(user-confirmed 2026-10-01). Every visible detail is normative except the items the spec lists as illustrative. It is
linked, not copied. The 2026-09-30 spec (VIS-001–014) is superseded.
- SR-008 needs a Product revision of VIS-004, VIS-005, VIS-007, VIS-010 and VIS-013, plus any Team/Org-tab views that
  now show the briefing row: `send_message_to` in place of `delegate_task`; the briefing as a Team/Org tab row and an
  inter-agent message in place of the system task notice; the blocked-send failure. Collaborator rows keep the approved
  look (VIS-006/009/012) with an Offline status until first contact. Until the revised spec is approved, the SR-008
  changes to these visuals override the old ones.
- **Resolved (2026-10-01):** the revised spec at `…/tickets/done/cross-scope-agent-mentions-sr008/` (VIS-001–015) is now
  the normative source.
- Interpretation note: the spec's prose writes addresses as `/product team` and `/computer use agent`. The canonical address
  value is the allocator's segment (for example `/product_team`). Spaced names are only the display rendering; no
  visible VIS element depends on the raw address.

## Quality And Non-Functional Requirements
- No regression in run open/restore time for runs without collaborators.
- Strings localized in English and zh-CN, as in the spec.

## Data Continuity And Acceptable Loss
- All existing standalone Agent, Team and Org run history must open, restore and continue unchanged.
  Acceptable loss: none.
- Collaborators and their conversations persist with their run and are removed with it.

## External Contracts And Dependencies
- Codex, Claude and other runtimes must receive the same delegation/messaging capability through their
  existing tool exposure paths, fixed at session start (REQ-012).

## Supplemental Artifacts
| Artifact | Owner | Status | Approval applies |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` + `visual-references/` (VIS-001–015, SHA-256 verified 2026-10-01) | Product Prototyper | **Approved (user, 2026-10-01); supersedes the 2026-09-30 spec** | Yes, part of the SR-008 basis |
| Prior `…/tickets/done/cross-scope-agent-mentions/ui-ux-spec.md` (VIS-001–014) | Product Prototyper | Superseded | History only |
| Prototype repo @ `personal` (`0659cb0`, record `df2f5cd` on origin), ticket `cross-scope-agent-mentions-sr008`, source pin `e9aa4a74c` | Product Prototyper | Integrated | Evidence |
| `prototype-ticket.md`, `prototype-change-log.md`, `ui-behavior-test-matrix.md` (same folder) | Product Prototyper | Final | Evidence |
| Prototype repo `/Users/normy/autobyteus_org/autobyteus-web-prototype` @ `personal` (`c4d4764`/`9ca5651`), source pin `e9aa4a74c` | Product Prototyper | Integrated | Evidence |

## Assumptions
- A task execution chain may already nest. Whether `@` is also offered when the user is focused on a
  collaborator is an open question (OQ-1).

## Open Decisions And Questions
- D-R1 (SR-008) **accepted (user, 2026-10-01)**: when adding fails, the send is blocked and the draft stays, rather than delivering
  the message without the collaborator.
- D-R2 (SR-008) **accepted (user, 2026-10-01)**: collaborator rows keep the approved row look (dashed task-row style), with Offline
  status until first contact.
- DEC-U1 (user, 2026-09-30): REQ-012 confirmed. Both tools are always on for every agent the user runs,
  explicitly including Daily Assistant ("people use the daily assistant a lot, then later they want to add
  another agent or agent team"). Server-internal helper agents are excluded. This records one decision and is
  not approval of the whole package.
- OQ-3 resolved (user, 2026-09-30): application-owned agent runs are excluded from REQ-012 and from `@`.
  User's reason: vertical applications are simple and do not need this.
- OQ-1 resolved (user): yes. `@` works in a collaborator's or delegated child's composer, and that agent is the delegator.
- OQ-2 resolved (user): collaborators use the run's root launch settings (REQ-004), snapshotted when they are attached.
- F-003: **superseded by REQ-014 (RD-004).** Inter-agent deliveries used to render user-style. They now show
  "From <Sender>:"; only old stored messages without a recorded sender keep the user-style look.

## Traceability
REQ-001→AC-001/011/013; REQ-002→AC-002; REQ-003→AC-003/004; REQ-004→AC-003; REQ-005→AC-005;
REQ-006→AC-006; REQ-007→AC-007; REQ-008→AC-008; REQ-009→AC-009; REQ-010→AC-010; REQ-011→AC-012; REQ-012→AC-003/014; REQ-013→AC-015; REQ-014→AC-016.

## Architecture Phase Input
F-001 (task execution identity/settings for collaborators that are not mounted), F-005 (collaboration root for
standalone Agent runs, with persistence continuity), mention-to-delegation authorization, and
always-on tool exposure (REQ-012), with authorization checked on every call. Evidence: Codex fixes `enabled_tools` at
`thread/start`/`thread/resume`, and Agent Tools MCP `delegate_task` currently requires an active `MemberTeamContext`
(`docs/modules/agent_tools_mcp_server.md`).

## Readiness Check
### Content Ready For Approval
Yes (SR-008); approved.
### Approved Basis Ready For Design
Yes. Requirements SR-008 approved; the revised visuals (VIS-001–015) are user-confirmed and integrated (2026-10-01).
