# Solution Revision Record — `collaboration-prompt-wording`

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements + Design | The user's direction in the Solution Designer conversation (2026-10-15) | N/A | N/A | Requirements Approved; Architecture Design Complete; Medium / Low | BEH-001..010; REQ-001..011; AC-001..008; DEC-001..007 | Direct implementation |
| SR-002 | Design (wording supplement + design) | Solution Designer end-to-end consistency walk before implementation (the user asked whether the design is consistent once implemented) | SD-C-001..005 | SR-001 | Requirements Approved (unchanged REQs; wording supplement clarified within the direction); Architecture Design Complete; Medium / Low | REQ-002, REQ-005, REQ-006, REQ-008, BEH-002, BEH-005 | Revised before implementation began |
| SR-003 | Mixed (requirements, wording supplement, design) | Code review CRR-001 failure-origin round after API/E2E API-REV-001 (Fail, 80%) | F-3a, F-3b, F-1 (C-3 held, addressed by F-3a) | SR-002 | Requirements Approved (revised within the direction, user informed); Architecture Design Complete; Medium / Low | BEH-005, BEH-008; REQ-008; AC-005, AC-008; DEC-008, DEC-009; Scope Guardrail | Revised; back to implementation |

## Revision Entries

### SR-001 — Baseline: collaboration texts written for the agent

- Phase and classification: Requirements and Design, `Initial Baseline`.
- Trigger: the user's review of the collaboration prompt (2026-10-15), held while Task 8641c0ac
  (memory refactor) was in its design revision; the user asked for one precise, consistent
  wording and then said "now I think it's clear you can start to work on it now", with its own
  worktree ("You can create your work tree").
- Finding IDs: N/A.
- Prior status: N/A (the wording was drafted as `followups/collaboration-prompt-wording-proposal.md`
  of ticket `delegated-copy-own-run-memory`; that file now points here).
- Current status: Requirements `Approved`; design complete; `task_size=Medium`,
  `architectural_risk=Low`.
- IDs: BEH-001..BEH-010, UC-001..UC-006, REQ-001..REQ-011, AC-001..AC-008, SCN-001..SCN-005,
  DEC-001..DEC-007.
- Canonical sections: `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`.
- Supplements: `wording/collaboration-prompt-wording-proposal.md` (behavior-defining, approved
  by the user), `wording/collaboration-prompt-complete-views.md`, `wording/build-complete-views.py`.
- Intended behavior changed: baseline.
- Approval: the user's decisions DEC-001 (wording and vocabulary, refined over many rounds:
  "task agent", "talk with", no "copy", no lifecycle words, addressing kept and corrected for
  flat teams, tool descriptions as mechanics, de-duplication) and DEC-002 (no agent is told its
  own address: "I just need to know the target's phone number … do we really need to know our
  own phone number? Maybe no"). DEC-003..DEC-007 are the Solution Designer's within that
  direction; the user is informed in the handoff summary.
- Classification rationale: about 20 source files plus tests across server, the presentation
  contracts package and web parse checks (Medium); no tool behavior, refusal condition,
  resolution rule, lifecycle or persisted shape changes, one closed role computed by the
  existing scope owner, a viewer relation at existing gates, a tolerant note parser (Low).
- Route: `get_handoff_rules` → Small/Medium and Low → `/software_engineering_team/implementation_engineer`.
- Next action: implementation.

### SR-002 — End-to-end consistency walk (before implementation)

- Trigger: the user asked whether the design stays consistent once implemented. The Solution
  Designer walked each scenario (UC-001..UC-006) through the wording, the design and the code.
- Findings and fixes:
  - SD-C-001 (gap): with no sender address in headers, no prompt said how to answer an ordinary
    message (only the agent that gave you the task). Added to every prompt: "Every message you
    receive names its sender and gives its ID. To answer it, use `send_message_to` with that ID."
    Check 7 extended.
  - SD-C-002: the `ROOT_RUN_NOT_ACTIVE` text said "team or organization", wrong for a standalone
    agent → "This work is stopping or has stopped, so the message or delegation was not sent."
  - SD-C-003: the addressing section listed address sources exhaustively and omitted the team
    instruction → "for example in your handoff rules, your team instruction, …".
  - SD-C-004: the mode-3 Task message repeated the sender's ID already in its header → body
    without the "You have a new task from" line.
  - SD-C-005: the design did not say the Team Instruction section stays for every role → stated;
    `delegationTargetUnavailableMessage` no longer assumes the agent has `list_available_agents`;
    R-3 (runs started before the upgrade) recorded and accepted.
- Verified consistent (no change): the web header parser ignores the address
  (`interAgentDelivery.ts`; consumers use name, ID and body only); every `@` note row matches
  what `send_message_to`/`delegate_task` allow from that viewer, including Task-scope rules; the
  role cases cover every root kind; the handoff paragraph's recipients are reachable.
- Requirements unchanged; the wording supplement changed within the user's direction (the
  phone rule applied to answering); the user is informed.

### SR-003 — Task message labels the reply call; every refusal reaches the agent

- Trigger: `code-review-report.md` CRR-001 (failure-origin review of API/E2E API-REV-001).
- F-3a (Design Impact, accepted): wording §7.1 `You have a new task from <name> (ID: <id>).` put an
  unlabelled name beside the ID, and run IDs start with the name, so models used the name as an
  address or as the ID (LE-A1 Claude 1/5 vs base 3/3; LM Studio 0/2 vs 1/1; J1 built
  `/research_lead`). Fix: §7.1 now says `You have a new task from the agent named "<name>".` and
  `… tell that agent using send_message_to with target_agent_run_id "<id>". "<name>" is its name,
  not an address or an ID.`; the mode-3 body carries the same reply line. The general answering
  bullet in every prompt and the §4.2 opening name `target_agent_run_id` explicitly (DEC-008).
  Because every task agent team's coordinator reads the task message, this also covers C-3
  (the coordinator's §5.1 prompt lists reporting back only as a purpose).
- F-3b (Design Impact, accepted): T-3 missed refusals a misled agent receives. Added with next
  steps: `COLLABORATION_ADDRESS_INVALID` at the two tools' boundary, `TARGET_AGENT_RUN_NOT_ACTIVE`
  and "rejected the message" (router), the engine's self-target and context refusals, and the
  registry's not-active / shut-down texts (the ones the implementation handoff left for decision).
- F-1 (Requirement Gap, decided): fold in (DEC-009). REQ-008 requires that agents receive these
  refusals; today the cross-Task / closed-Task refusal reaches them as `MCP error -32603`. Design
  T-4: the first `assertAllowed()` in `RootCommunicationEngine.deliver` returns
  `{accepted:false, code, message}` for refusal codes; the condition is unchanged. Scope
  Guardrail, REQ-008 and AC-005 updated.
- Validation (AC-008 revised): `LE-A1` at least 5 times on each of Claude, Codex and LM Studio
  and J1/J3 at least 4 times each, branch and base; pass when the branch succeeds at least as
  often as the base on each runtime, no reply goes to the name, and every failing trace is kept
  and explained (the reviewer's evidence limit).
- F-2: not this ticket (sent by the reviewer to the Project Task Manager as FU-CPW-1).
- Approval: within the user's direction (precise wording that agents follow; replies by ID;
  refusals agents can act on); the Solution Designer approves and informs the user.
- Classification: unchanged, Medium / Low (texts plus one boundary conversion of an existing
  refusal). Route: `get_handoff_rules` → `/software_engineering_team/implementation_engineer`.
