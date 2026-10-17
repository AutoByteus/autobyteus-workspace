# Solution Revision Record — `collaboration-prompt-wording`

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements + Design | The user's direction in the Solution Designer conversation (2026-10-15) | N/A | N/A | Requirements Approved; Architecture Design Complete; Medium / Low | BEH-001..010; REQ-001..011; AC-001..008; DEC-001..007 | Direct implementation |
| SR-002 | Design (wording supplement + design) | Solution Designer end-to-end consistency walk before implementation (the user asked whether the design is consistent once implemented) | SD-C-001..005 | SR-001 | Requirements Approved (unchanged REQs; wording supplement clarified within the direction); Architecture Design Complete; Medium / Low | REQ-002, REQ-005, REQ-006, REQ-008, BEH-002, BEH-005 | Revised before implementation began |
| SR-003 | Mixed (requirements, wording supplement, design) | Code review CRR-001 failure-origin round after API/E2E API-REV-001 (Fail, 80%) | F-3a, F-3b, F-1 (C-3 held, addressed by F-3a) | SR-002 | Requirements Approved (revised within the direction, user informed); Architecture Design Complete; Medium / Low | BEH-005, BEH-008; REQ-008; AC-005, AC-008; DEC-008, DEC-009; Scope Guardrail | Revised; back to implementation |
| SR-004 | Design (wording supplement + design) | Solution Designer re-check of SR-003 (the user asked whether the design has no problem) | SD-C-006, SD-C-007 | SR-003 | Requirements Approved (unchanged); Architecture Design Complete; Medium / Low | BEH-005, BEH-008 | Corrected before implementation of SR-003 finished |
| SR-005 | Mixed (requirements, wording supplement, design) | The user's review of the SR-003 task message and of API-REV-002 (LM Studio) | user feedback; API-REV-002 F-4 (LM Studio, decided) | SR-004 | Requirements Approved (user, DEC-010, DEC-011); Architecture Design Complete; Medium / Low | BEH-005, BEH-006; REQ-004..006; AC-002, AC-003, AC-008; DEC-003, DEC-008 superseded | Revised; back to implementation |
| SR-006 | Mixed (requirements, wording supplement, design) | The user's review of the SR-005 task message | user feedback | SR-005 | Requirements Approved (user, DEC-012); Architecture Design Complete; Medium / Low | BEH-005, BEH-006; AC-002, AC-008; DEC-011 partly superseded; design T-5 withdrawn | Revised; back to implementation |
| SR-007 | Wording supplement + requirements | The user: "copy" is a good word; the Project Task Manager understood it well before | user feedback + screenshot | SR-006 | Requirements Approved (user, DEC-013); Architecture Design Complete; Medium / Low | BEH-002, BEH-008; REQ-010 withdrawn; DEC-013 | Revised; back to implementation |
| SR-008 | Wording supplement + requirements + design | The user: keep "task agent"; the earlier version sounds more consistent | user decision | SR-007 | Requirements Approved (user); Architecture Design Complete; Medium / Low | reverts SR-007 (DEC-013) | SR-006 text restored; back to implementation |
| SR-009 | Wording supplement (views) + design | The user: the views file must show every important example; it is the file that shows the collaboration model | SD-C-008, SD-C-009 | SR-008 | Requirements Approved (unchanged); Architecture Design Complete; Medium / Low | BEH-008 (two refusal texts) | Views extended; two refusals corrected; back to implementation |
| SR-010 | Wording supplement + requirements + design | The user: "sometimes straightforward is clearer" (one label, sender id) | user decision | SR-009 | Requirements Approved (user); Architecture Design Complete; Medium / Low | BEH-005, AC-002, REQ-008 texts | Revised; back to implementation |
| SR-011 | Design + views | Solution Designer check prompted by the user's question about mentioning a member | SD-C-010 | SR-010 | Requirements Approved (unchanged; REQ-009/AC-006 now also met in task agent teams); Architecture Design Complete; Medium / Low | BEH-009 | Design corrected; back to implementation |
| SR-012 | Wording supplement + views | The user: the pre-refactor `@` sentence ("…; it returns a run ID to follow up with") is clearer | user decision | SR-011 | Requirements Approved (user); Architecture Design Complete; Medium / Low | BEH-009 | `@` note lines revised; back to implementation |
| SR-013 | Mixed (requirements, wording supplement, design) | The user: no name in the agent's header (the app finds names by run ID) and "run ID" everywhere, "once for all" | user decision | SR-012 | Requirements Approved (user, DEC-014); Architecture Design Complete; Medium / Low | BEH-006; REQ-005..008; AC-003; web parser and sender label | Revised; back to implementation |
| SR-014 | Wording supplement (catalogue + views) + design + requirements | The user: the views file is the foundation of agent orchestration and must document every case | SD-C-011..SD-C-013 | SR-013 | Requirements Approved (unchanged REQs; AC-007 sharpened); Architecture Design Complete; Medium / Low | BEH-008; AC-005, AC-007 | One catalogue; views complete; back to implementation |
| SR-015 | Mixed (requirements, wording supplement, design) | Code review CRR-004 (full source review, Fail 9.0) with CRR-003 F-5; the user's decision on the header | F-5, CR-001, CR-005 (CR-002..CR-004 implementation) | SR-014 | Requirements Approved (user DEC-015; DEC-016 within the direction, user informed); Architecture Design Complete; Medium / Low | BEH-005, BEH-006; AC-002, AC-008; design T-2, T-5 | Revised; back to implementation |
| SR-016 | Wording supplement + requirements + design | The user: lowercase "run id", as in the send_message_to and delegate_task arguments | user decision | SR-015 | Requirements Approved (user, DEC-017); Architecture Design Complete; Medium / Low | all agent-facing texts | Revised; back to implementation |
| SR-017 | Requirements (evidence / decision record) | API/E2E note (round 5, IR-005): the user's judging-runtime decision; Codex out of usage | N/A | SR-016 | Requirements Approved (user, DEC-018); design unchanged | AC-008 | Recorded; no implementation change |

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

### SR-004 — Two corrections to SR-003

- SD-C-006: the invalid-address refusal gave one next step for both tools; for `delegate_task`,
  "use target_agent_run_id" would point to giving a Task to an existing task agent, not to
  answering. Now one text per tool (wording §7.3, design T-3).
- SD-C-007: the task message's name fallback (the implementation uses the ID when the address has
  no last segment) would render `named "<id>" … "<id>" is its name, not … an ID`. Now: no name
  sentence when there is no name; the ID is never shown as the name (wording §7.1).
- Requirements, classification and route unchanged.

### SR-005 — Describe the sender by the values to send; no bare name; LM Studio informational

- Trigger: the user's review (2026-10-16). (1) A bare name invites the model to put it straight
  into `send_message_to`; address and ID are both handles, so either pick is correct; the SR-003
  sentence "… is its name, not an address or an ID" is noise. (2) Claude and Codex worked before
  the collaboration refactor; LM Studio struggles with any prompt; tuning for it would add
  confusion. Also answers API/E2E API-REV-002 F-4 (LM Studio 7/20 vs base 14/20, delegator-side
  unprompted acknowledgements): recorded, not a wording change (DEC-010).
- Evidence correction: the Solution Designer had claimed live runs showed models picking the
  wrong one of two handles; no run showed that. The runs showed models misusing a bare name
  (round 1 Claude/LM Studio; J1 `/research_lead`) and, in round 2, Claude twice sending the name
  as `recipient_address` beside the right ID. The base, with address and ID, passed on Claude.
- Changes: wording §1 principle 6 (sender handles: ID always, address only when it reaches the
  sender, never a bare name); §4.2 opening ("The task message tells you how to reach that
  agent"); the answering bullet of every prompt (`sender id`, or `sender address` when given;
  one, not both); §7.1 (two forms, sender described by `recipient_address` /
  `target_agent_run_id`, reply instruction, no name; mode-3 body without the reply line, the
  header gives the values); §7.2 (labelled header, `sender address` only when it reaches the
  sender); §10 check 7. Requirements BEH-005/006, AC-002/003/008, DEC-003/008 superseded,
  DEC-010/011. Design T-5 (the "reaches" helper), Spines 2/3, file mapping. SR-004's no-name
  fallback is moot (no name any more).
- Approval: the user (DEC-010, DEC-011 are the user's direction).
- Classification unchanged, Medium / Low. Route: implementation engineer.

### SR-006 — One handle to answer with: the ID

- Trigger: the user (2026-10-16): giving two handles gives more chances to make a mistake; one
  makes the reply clear and deterministic. The prompts teach one way; the code still accepts
  addresses, as today.
- Changes: wording §1 principle 6 (one handle to answer with; tools unchanged); the answering
  bullet of every prompt ("Every message you receive gives its sender's `sender id`. To answer
  it, use `send_message_to` with `target_agent_run_id` set to that id."); §7.1 one form
  (`You have a new task from the agent with target_agent_run_id "<id>".` + reply line); §7.2
  header `sender name`, `sender id`, no address; §10 check 7. Requirements BEH-005/006, AC-002,
  AC-008, DEC-012. Design: T-5 withdrawn; Spines 2/3; file mapping.
- Why it is safe: the ID reaches the exact agent in every case; `send_message_to` keeps accepting
  `recipient_address` (exactly one selector), so an agent using an address it got from handoff
  rules, `list_available_agents` or the `@` note works as before, and a wrong address gets the
  T-3 refusal with its next step.
- Approval: the user (DEC-012). Classification unchanged, Medium / Low; less to build than SR-005.
  Route: implementation engineer.

### SR-007 — "copy" is the agent-facing word again

- Trigger: the user (2026-10-16): "copy" is a good word; with the pre-refactor prompts the
  Project Task Manager understood it well (screenshot of its own explanation of delegation,
  fresh copies, team run IDs, continuing a copy with its conversation, and the assignment rule).
- Change: every agent-facing "task agent" / "task agent team" / "your task agents" becomes
  "copy" / "team copy" / "your copies"; delegation creates "a fresh copy of that agent (or agent
  team)" (the Project Task Manager's own phrase); the copy's prompt opens "You are a copy: another
  agent delegated a task to you, and you were created to work on it."; the addressing section
  says "the address reaches the agent defined there, not the copy". §2 words table, §3, §4.2
  heading, §6 tool texts, §7.3 and design T-3 new texts, §8 note rows, §10 checks, the complete
  views and the generator updated. Quoted "today" texts left as they are.
- Kept: everything else from SR-001..SR-006. Not brought back: lifecycle words ("wake", "pause")
  and "run ID" as a place.
- Approval: the user (DEC-013). Classification unchanged, Medium / Low. Route: implementation.

### SR-008 — SR-007 reverted: the agent-facing word stays "task agent"

- Trigger: the user (2026-10-16): "lets still use task agent … the earlier version sounds more
  consistent". The Solution Designer had also found that "You are a copy" reads oddly; the
  pre-refactor prompts never labelled the receiving agent itself (they said "copy" only for what
  a delegation creates).
- Change: the wording file and the design spec are restored to their SR-006 text, and the
  generator to its committed form; the complete views are regenerated. Verified: applying the
  SR-007 replacement to the restored files reproduces the SR-007 files exactly, so nothing else
  changed. Requirements: REQ-010 restored (optional badge), DEC-013 marked reverted.
- Approval: the user. Classification unchanged, Medium / Low. Route: implementation (apply the
  SR-006 text; ignore SR-007).

### SR-009 — The complete views show the collaboration model; two refusals corrected

- Trigger: the user (2026-10-16): the views file is the one read most, because it shows the
  collaboration model itself, so it must show every important example.
- Views (generated from the wording file by `build-complete-views.py`): §9 Situations (twelve
  sender → recipient cases: what the recipient sees, and whether the sender's address would
  reach the sender); §10 Worked journeys J1–J5 (every tool call, result, task message and
  header, in order: standalone delegation and report back; team handoff; the Project Task
  Manager's saved Task and follow-up Task to a team; nested delegation; inside an organization);
  §11 the `@` note by example; §12 common mistakes with the exact text the agent reads back.
- Found by the views and corrected (wording §7.3, design T-3):
  - SD-C-008: answering a task agent team member by its address (S5) got "To have a task done
    by a new agent, use delegate_task" — the wrong next step for an answer. Now: "No agent or
    agent team you can talk with has the address <address>. To answer a message, use
    target_agent_run_id set to the sender id; to have a task done by a new agent, use
    delegate_task."
  - SD-C-009: both selectors (and no selector) had no next step. Now: "send_message_to takes
    exactly one of recipient_address or target_agent_run_id, not both. To answer a message, use
    only target_agent_run_id set to the sender id." / "send_message_to needs one of
    recipient_address or target_agent_run_id. To answer a message, use target_agent_run_id set to
    the sender id."
- Approval: within the user's direction (the Solution Designer; the user is informed).
  Classification unchanged, Medium / Low. Route: implementation (the two texts).
- Addendum (same day, consistency scan of the views): the refusals gave two answering
  phrasings ("set to the sender id" / "with its ID") and none covered reporting back before any
  message arrived. All answering next steps now read: "To answer a message, use
  target_agent_run_id set to the sender id; to report on your task, use the target_agent_run_id
  in your task message." (invalid address from send_message_to, not found, both selectors, no
  selector). Views §8 gains R13 (the answering rule: three places, one per audience).

### SR-010 — One label for the sender: "sender id"

- Trigger: the user asked what "to report on your task, use the target_agent_run_id in your
  task message" means and proposed the plain rule "to report your task result, use
  send_message_to with the sender id"; "sometimes straightforward is clearer".
- Change: the task message labels the delegating agent the way every received message already
  does: `You have a new task from the agent with sender id "<id>".` / `When you finish, or need
  something you can't get yourself, tell that agent using send_message_to with
  target_agent_run_id set to that sender id.` Every prompt: "Every message you receive,
  including a new task, gives its sender id. To answer it, or to report your task result, use
  `send_message_to` with `target_agent_run_id` set to that sender id." Every answering next step
  in the refusals: "To answer a message or report your task result, use send_message_to with
  target_agent_run_id set to the sender id." The header is unchanged (no web change).
- Approval: the user. Classification unchanged, Medium / Low. Route: implementation.
- Same revision: the `TARGET_AGENT_RUN_NOT_ACTIVE` next step now reads "Use an exact ID you were
  given: a sender id (from a message or your new task), or an ID delegate_task returned to you."

### SR-011 — `@` note: a teammate in a task agent team is "in your team"

- Trigger: the user asked whether mentioning a member gives the "in your team" line. Checking
  the implementation (`collaborator-admission.ts`: `!preferred ? "not_in_run" : …`): the viewer
  relation applies only to configured placements. Members of a task agent team are not
  configured placements, so in a standalone run (the user's Project Task Manager setup) a
  mention of a teammate — or of the agent itself — resolves to the catalog address and gets
  "delegate a task to it with delegate_task", which would create a new task agent instead of
  talking with the teammate (SD-C-010, a design gap; the implementation followed the design).
- Change: design §Interface Boundary Mapping, "Own team first": the focused agent's own team
  instance is checked by definition before the configured-placement and catalog paths
  (self / member / the team itself). Views §11 gains the example. Wording §8 is unchanged (its
  rows already say this; the design now delivers it in every root). AC-006 gains the case "a
  member of a task agent team in a standalone run mentioning a teammate gets the in-your-team
  line with the teammate's address inside the team".
- Approval: within the approved requirement (REQ-009); the user is informed.
  Classification unchanged, Medium / Low. Route: implementation.

### SR-012 — `@` note says what delegating returns

- Trigger: the user prefers the pre-refactor note's "Delegate the work with delegate_task to its
  address; it returns a run ID to follow up with." because it says what comes back and what to do
  with it.
- Change (wording §8; views §11), in the §2 vocabulary ("ID", not "run ID"):
  - catalog-only line: "- <Name> (agent / agent team) at <address>: delegate the task to it with
    delegate_task; it returns an ID to follow up with."
  - organization line: "- <Name> (agent / agent team) at <address>: talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its ID to follow up with."
- Approval: the user. Classification unchanged, Medium / Low. Route: implementation (contracts
  compose text; parse keeps every released earlier form). [Corrected in SR-015 (CR-001): the
  clause "including this ticket's earlier composed lines if any were saved by test builds" is
  withdrawn — those forms never shipped, so parse needs no support for them.]

### SR-013 — One ID term ("run ID"); the agent's header without a name

- Trigger: the user (2026-10-16): the app can always find the name by run ID, so the header the
  agent reads need not carry it; and "let's use run ID because then we can be consistent with
  the send_message_to and the delegate_task … once for all". The user confirmed the chat must
  still show "From <name>".
- Change:
  - Every agent-facing ID is "run ID": prompts ("you get back its run ID", "together with your
    run ID", "its coordinator's run ID", "(by its run ID)"), the answering bullet ("gives its
    sender run ID … set to that sender run ID"), the task message (`You have a new task from the
    agent with sender run ID "<id>".` / `… with target_agent_run_id set to that sender run ID.`),
    tool and parameter descriptions, refusals, the `@` note ("it returns a run ID to follow up
    with"), §2 words table, principles and checks. Task IDs (`task_id`, "a saved Task's ID",
    "Unknown IDs fail" in `update_task`) are unchanged.
  - Header the agent reads: `You received a message from the agent with sender run ID "<id>".` +
    `message:` + content; no name, no address. Chat: `interAgentDelivery.ts` parses the new form
    and every earlier form; `InterAgentMessageSegment.vue` shows "From <name>" from the run-ID
    lookup (`senderDisplayName` / `senderNameByAgentRunId`), else the readable run ID.
  - Requirements BEH-006, AC-003, DEC-014; design Spines 2/3, file mapping (web parser and label);
    views regenerated (situations, journeys, `@` examples, table labels).
- Supersedes SR-010's label "sender id". The follow-up Project Task
  `project_task_9de99841-a317-420a-955c-83fff9d68172` is covered by this ticket.
- Approval: the user. Classification unchanged, Medium / Low (texts, one parser, one label
  source). Route: implementation.
- Made exact (same day, the user's question): the chat label comes only from the run ID (lookup,
  else readable run ID), never from the header text, also not for old saved messages; the parser
  only separates header and body and reads the run ID when a saved message lacks the separate
  field. The earlier "a header name may still be used" is removed.

### SR-014 — One catalogue of agent-facing results and refusals; the views document every case

- Trigger: the user: the complete views are the foundation of agent orchestration, so every
  case must be there and consistent.
- Audit findings:
  - SD-C-011: refusal texts lived in two places (wording §7.3 examples, design T-3 full list), a
    drift risk; the views showed 8 of about 45 texts; the implemented `TARGET_IS_TEAM_RUN` text
    and three texts (`TASK_REACTIVATION_UNAVAILABLE` "…nothing to reactivate…",
    `terminalAssignment` "move it to…", the parser's "a logical address string") were in no
    list or still used old words.
  - SD-C-012: missing cases in the views: a task agent with handoff rules; a task agent inside a
    team the user started or an organization; Task close / reopen / continue; a question
    mid-task; a team member delegating outside its team; no handoff rule fits; the user stopping
    a task agent; failure and other result shapes; situations S13–S15.
  - SD-C-013: the new "run ID" wording ("your run ID", "this run ID") would trip a literal
    forbidden-word test for "your run"/"this run".
- Change:
  - Wording §7.3 is now the complete catalogue M-01..M-45 (tool, when, exact text) and the only
    place the texts are written; three texts aligned (M-10 "nothing to continue", M-24 "an
    address beginning with '/'", M-31 "set it to TODO or IN_PROGRESS before you delegate it");
    two tidied (M-42, M-45). Design T-3 maps each code site to its catalogue IDs instead of
    repeating texts.
  - Views: §2a, §2b; §9 S13–S15; journeys J6–J10; §10a tool results (success and failure); §12
    generated from the catalogue with a triggering call per ID, and the generator stops when an
    ID has no row.
  - Wording §2: "run" is forbidden only as a place; "run ID" allowed; the test must allow it.
    AC-007 sharpened (every catalogue text produced exactly, each in a test).
- Approval: within the user's direction (document every case, one consistent foundation); the
  user is informed. Classification unchanged, Medium / Low. Route: implementation.

### SR-015 — No-reply rule (Codex echo loop); sender address back where it reaches; no name

- Trigger: `code-review-report.md` CRR-004 (full source review at the user's request, Fail 9.0,
  Medium / Low unchanged) with the open F-5 from CRR-003; the user's decision on the header.
- F-5 (Design Impact): on Codex the delegating agent answered its task agent's result in 12/15
  runs (base 0/15), and 5/15 became echo loops of 64–92 messages
  (`evidence/round4/LE-A1-analysis.txt`); Claude unaffected. Cause: the SR-010 answering bullet
  ("To answer it, or to report your task result, use send_message_to …") and the purpose "to
  answer one" read as "answer every message"; nothing said a result needs no reply. Fix
  (DEC-016): the answering bullet now separates how from when — "… When you reply to it or report
  your task result, use send_message_to with target_agent_run_id set to the sender run ID, or
  recipient_address set to the sender address (one of them, not both). Reply only when the
  message asks you something or you need something from the sender; a result or an answer needs
  no reply." — and the purposes lines say "answer a question it asks you" / "answer its
  question". No runtime limit (new behavior, out of scope).
- Header and task message (DEC-015, the user): the sender address is given again, with the sender
  run ID and without a name, exactly when the address reaches the sender (design T-5 reinstated:
  `reachingAddressOf`). Wording §1 principle 6, §7.1 (two forms), §7.2 (two forms), §10 check 7;
  views regenerated (every journey shows the right form; §9 states where the address appears).
- CR-001 (accepted): SR-012's clause asking parse to keep never-shipped composed forms is
  withdrawn; implementation removes `EARLIER_GUIDANCE`, its use and its test, and rebuilds
  `dist/`. Released forms stay.
- CR-005 (accepted): design T-2 now matches §7.2; the T-3 paragraph is complete in the current
  file (the reviewer read the committed copy).
- CR-002..CR-004 (implementation, same pass): unused imports; the `@`-viewer concern moved to its
  own file and port; `configuredRootRole` shaped so the Agent root needs no dummy value.
- Validation: AC-008 revised (Codex LE-A1 ≥15 per side, assertion "no unprompted send by the
  delegator after the report").
- Classification unchanged, Medium / Low. Route: implementation, then targeted delta review, then
  API/E2E.

### SR-016 — "run id" in lowercase

- Trigger: the user: lowercase "run id", matching `target_agent_run_id`, `target_team_run_id` and
  `target_team_coordinator_agent_run_id`.
- Change: every agent-facing "run ID" / "run IDs" is "run id" / "run ids" — prompts, task message
  and header (`sender run id`), tool and parameter descriptions, the catalogue M-01..M-45, the
  `@` note ("it returns a run id to follow up with"), principles, checks — and the ticket
  documents (design T-3 keeps its "Now" quotes of today's code). The words table forbids "ID"
  alone, "run ID" and "sender id" for a run id; the forbidden-word test allows a "run" phrase
  followed by "id". Task IDs (`task_id`, "a saved Task's ID") are unchanged. Views regenerated:
  132 uses of "run id", none of "run ID".
- Approval: the user (DEC-017). Classification unchanged, Medium / Low. Route: implementation.

### SR-017 — AC-008 judging runtimes (the user's decision)

- Trigger: API/E2E note on IR-005 (round 5): the Codex CLI login is out of usage until
  2026-10-22 09:16; the user directed that Claude Agent SDK with Sonnet and the AutoByteus runtime
  with DeepSeek flash judge this ticket. On those, IR-005 passes: no unprompted delegator send in
  50 report-back runs and 20 journeys (`api-e2e-execution-coverage-report.md`, "Judging
  runtimes").
- Recorded: AC-008 judging runtimes and the deferred Codex clause (DEC-018). Residual risk: the
  SR-015 no-reply fix is unconfirmed on Codex, where the round-3 echo loop occurred. Follow-up: a
  Codex-only rerun of LE-A1 (≥15 per side, branch vs base, assertion "no unprompted send after
  the report") after the reset: Project Task `project_task_55107203-f674-488c-8a3c-00c2920ccf04` (TODO, not dispatched).
- No wording, design or implementation change. Classification unchanged.
