# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (autobyteus-32) | N/A | N/A | Ready for Approval | BEH-001..005; REQ-001..012; AC-001..013 | Proposal presented to the user; DEC-001..003 need the user |
| SR-002 | Requirements | User design direction 2026-10-24 | N/A | Ready for Approval | Ready for Approval | REQ-004..007, REQ-010; DEC-001, 002, 012..014 | Router = user-selected agent with system tools, skill, knowledge |
| SR-003 | Requirements | User asked for a file defining the selection order and all cases | N/A | Ready for Approval | Ready for Approval | REQ-001..009 (clarified, no change in intent) | Supplement `launch-selection-order.md` added |
| SR-004 | Requirements | User answers DEC-003, DEC-014, DEC-015; approval | N/A | Ready for Approval | Approved | REQ-004c, REQ-010; DEC-003, 013..015 | Approved within the direction, user informed |
| SR-005 | Design | Architecture design | RD-1..RD-3 | Approved | Approved + deltas pending | REQ-004a, REQ-004b, REQ-007 | design-spec.md Draft; deltas need the user |
| SR-006 | Mixed | User direction 2026-10-24/25; limit probes A-15…A-19 | PRE-001 | Approved + deltas pending | Draft, Waiting For Prerequisite | REQ-004..010, DEC-013, DEC-014, design | Tool first as own Task; router built-in internal, one conversation, page, statistics |

## Revision Entries

### SR-001 — Requirements baseline: defaults first, then the node's Model Router

- Phase and classification: Requirements, Initial Baseline
- Triggering input: Project Task autobyteus-32 (user 2026-10-09/11; comment 2026-10-24) and the PM's message of 2026-10-24
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- IDs affected: all (baseline)
- Scenario-basis changes: SCN-001..SCN-008 established; the Task's premise "everything inherits" corrected by evidence (delegated-launch-config-defaults, 2026-10-12)
- Why recorded: first coherent baseline presented to the user
- Canonical sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all)
- Supplemental artifacts: none
- Product design evidence: none
- Intended behavior changed: `Yes` (new behavior proposed)
- Approval impact: pending the user's answers to DEC-001..DEC-003
- Behavior-defining supplement versions: none
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold in the Solution Designer conversation)
- Downstream impact: none yet
- Remaining gaps: UNK-001, UNK-002 (architecture)
- Next action: user approval, then architecture design

### SR-002 — Router is a user-selected agent with system tools, skill and knowledge

- Phase and classification: Requirements, Refinement
- Triggering input: the user in the Solution Designer conversation, 2026-10-24: router is one agent the user creates (e.g. in their agent project) and selects in a Server Settings card; not configured → default behavior; the router must know the environment through system-provided tools/skill (runtimes, models, statistics, limits, reachability) and gain knowledge over time; the selected router must itself have a usable default runtime/model, else default behavior.
- Prior status: Ready for Approval (SR-001). Current status: Ready for Approval (SR-002).
- IDs affected: REQ-004, REQ-005, REQ-007, REQ-010 changed; REQ-004a, REQ-004b, REQ-004c added; AC-009, AC-011, UC-003, SCN-008 changed; DEC-001, DEC-002 decided by the user; DEC-012 decided; DEC-013, DEC-014 added (Needs user); DEC-008 narrowed.
- Intended behavior changed: Yes. Approval impact: still pending DEC-003, DEC-013, DEC-014.
- Next action: the user's answers, then approval and architecture design.

### SR-003 — Selection-order supplement

- Phase and classification: Requirements, Refinement
- Triggering input: the user, 2026-10-24: "create some kind of file which is about … the selection order for the runtime model, for individual agent … define all the cases."
- Added: `launch-selection-order.md` (behavior-defining). It also settles details the requirements left implicit, decided by the Solution Designer: an agent's own runtime-only default beats a complete team default when the router is active; model-only defaults stay incomplete; the submit tool requires a choice for every asked agent; covered team members are given to the router as context; a deleted router agent counts as not active with a card warning.
- Intended behavior changed: clarified (no change to approved direction). Approval impact: the supplement joins the approval basis; still pending DEC-003, DEC-013, DEC-014.
- Next action: the user's review of the supplement and answers, then approval and architecture design.

### SR-004 — Remaining decisions and approval

- Phase and classification: Requirements, Refinement + approval
- Triggering input: the user, 2026-10-24: the router is a clean interface returning runtime/model, implemented by a normal small agent started with auto-approve on, given tools by the system; router failure on this node: recommendation correct; router runs in its own history ("it's just a normal agent").
- Changed: DEC-003, DEC-014 decided by the user; DEC-015 added (user); DEC-013 decided within the direction (no system knowledge file; automatic feedback is FU-001); REQ-004c, REQ-010 revised; supplement pending marks resolved.
- Intended behavior changed: Yes (as listed). Approval: Solution Designer within the direction, all `Needs user` decisions answered by the user; user informed in the conversation 2026-10-24. Approved baseline: requirements-doc.md and launch-selection-order.md at SR-004.
- Next action: architecture investigation and design.

### SR-005 — Architecture design and three requirement deltas

- Phase and classification: Design (with Requirement Gap deltas RD-1..RD-3)
- Trigger: architecture investigation A-01..A-14.
- Design: `design-spec.md` (Draft). task_size Large, architectural_risk High.
- Deltas needing the user: RD-1 (tools and skill listed on the router agent, one-click set-up in the card, instead of automatic per routing run), RD-2 (drop "recent failures"), RD-3 (router active also requires the decision tool).
- Follow-up added: FU-002.
- Next action: user confirms RD-1..RD-3 → requirements/supplement updated, design Ready, handoff.

### SR-006 — New direction; tool first as a prerequisite Task

- Phase and classification: Mixed (Requirement Gap from the user's direction + evidence)
- Trigger: the user's direction in the Solution Designer conversation 2026-10-24/25 (see requirements-doc § SR-006 Direction) and probes A-15…A-19.
- Prior status: Approved (SR-004) with design deltas pending (SR-005). Current: requirements Draft; design-spec.md (SR-005) superseded, to be redone after PRE-001.
- Prerequisite PRE-001 sent to `/project_task_manager`: `handoff-pre-001-agent-runtimes-tool.md`.
- Follow-up added: FU-003 (GLM Coding Plan endpoint).
- Next action: wait for PRE-001's Task; do it first; then resume this ticket by rewriting its requirements on the SR-006 direction.

### SR-007 — Requirements rewritten after prerequisite autobyteus-303

- Phase and classification: Requirements (rewrite on the user's direction of 2026-10-24/25)
- Trigger: PRE-001 delivered (autobyteus-303 Terminal 2026-10-25, merge `eac8ee6dfc`); the Task Manager's request to continue and bring the router requirements to the user.
- Worktree fast-forwarded to `origin/personal` `a0c7275db8` (no code changes there yet; only ticket documents).
- Requirements SR-007: REQ-001…REQ-014 (selection order incl. "blocked" from the 303 report; feature switch; built-in internal router with its tools; one conversation per node; routing request/answer; knowledge note; internal agents; visibility; Model Routing page; task kinds; decision records and statistics; learning from outcomes; docs). Supplement `launch-selection-order.md` SR-007 (§ 2 U4b, § 4 switch, § 5 conversation, § 6/8 texts). Earlier versions in `history/`.
- Needs user: DEC-020 (page mock-up first?), DEC-021 (split: internal agents and learning-from-outcomes as own Tasks?); DEC-022 decided by the Solution Designer (skip blocked defaults also with the feature off), user may object.
- Design: `design-spec.md` (SR-005) superseded; redone after approval.
- Next action: the user's answers and approval.

### SR-008 — Split: internal agents first (PRE-002)

- Trigger: the user, 2026-10-25: internal agents first as a small Task; "okayyy. then ask the project task manager to create one task and then lets work on this" (also taken as acceptance of the recommendations for DEC-020 no mock-up, DEC-022, and keeping the 303 live-agents test for autobyteus-32).
- Recorded: PRE-002 in requirements § Prerequisites; DEC-020, DEC-021, DEC-022 decided; REQ-013 (learning from outcomes) to become its own Task after the router.
- Sent: `handoff-pre-002-internal-agents.md` to `/project_task_manager`.
- Status: Waiting For Prerequisite PRE-002. Next: work on the internal-agents Task when given; then resume the router core.

### SR-009 — Prerequisites delivered; requirements approved

- Trigger: autobyteus-303 (Terminal 2026-10-25) and autobyteus-308 (Terminal 2026-10-26) delivered; the user's decisions of 2026-10-25 (DEC-020, DEC-021, DEC-022).
- Worktree fast-forwarded to `origin/personal` `d74f75a51a`.
- Requirements SR-009: PRE-002 delivered; REQ-008 now uses 308; REQ-013/UC-006/AC-010 moved out (own Task after this one, DEC-021); 308 receipt notes recorded (no impact). Status `Approved` by the Solution Designer within the direction; no `Needs user` decision left; user informed in the conversation 2026-10-26. Supplement `launch-selection-order.md` SR-007 approved with it. Previous text `history/requirements-doc-sr008.md`.
- Note: `get_project_task` for autobyteus-32 refused while the copy is scoped to autobyteus-308 (TASK_READ_OUT_OF_SCOPE); last full read 2026-10-25 (no new comments). Re-read before the design handoff.
- Next action: architecture investigation and design of the router core.

### SR-010 — Router core design; DEC-022 narrowed

- Phase and classification: Design (+ requirement refinement on evidence)
- Trigger: architecture investigation A-20…A-27 (2026-10-26); Task autobyteus-32 re-read with `get_project_task` (no new direction).
- Requirements SR-010: DEC-022 narrowed — the blocked-default skip applies only while Model Routing is on (cost A-22); supplement § 2/§ 4 aligned. Approval: Solution Designer within the direction (REQ-002 already says "off: no new behavior"); user informed 2026-10-26.
- Design `design-spec.md` SR-010: model-routing subsystem (ModelRouter, RouterConversation, sessions, knowledge store, decision log, statistics, settings), three tools, built-in internal router template, resolver step with report-based usability, lifecycle split, peer contract, sources/links, GraphQL, page sections. Previous design `history/design-spec-sr005.md`.
- Classification: Large / High → architecture review.

### SR-011 — UI designed first (Product Design Requested)

- Trigger: the user, 2026-10-26: "i feel UI should be designed first. do you think so i think you can contact @Product Team to work on the UI design first".
- Changed: DEC-020 (no mock-up → Product Design first). Requirements status: behavior approved; UI details of REQ-009/REQ-010 pending the Product Team's user-approved design.
- Sent: `product-design-request.md` delegated to `/product_team` (team run `product_team_290aa848c58646ee8378520dcc8694a0`, coordinator `product_ui_ux_designer_a360719ee6d7424e82638cf84b35eaba`); no task_id (this copy works on a delegated Task).
- Architecture review of SR-010 asked to hold until the UI design is integrated.
- Next action: integrate the Product Team's approved result; revise the design's web part; send the revised package to architecture review.

### SR-012 — Server-side refinements (architecture reviewer's preliminary points)

- Trigger: the architecture reviewer's preliminary server-side points of 2026-10-26 (not a review result; review on hold for the UI design).
- Decisions: routing budget 40 s (was 60 s) so a routed `delegate_task` answers within ~50 s under Codex's 60 s MCP tool time-out (A-28); peer start-request bound 50 s, other peer calls 20 s; B's prepared runs expire if A gives up; other runtimes' tool-call limits verified live; decision records only while Model Routing is on; router conversation reused only when its runtime and model equal the settings; unknown/expired `requestId` answer; failed carrying turn fails its sessions at once (input lifecycle observer); baseline/supplement status lines corrected.
- Requirements: REQ-006, REQ-012, QR-001, AC-004 refined (Solution Designer within the direction; user informed 2026-10-26). Supplement SR-012 (§ 5 time limit). Previous design `history/design-spec-sr010.md`.
- Status: waiting for the Product Team's UI design (SR-011) before the revised package goes to architecture review.

### SR-013 — Simpler page (no task-kind list, one text box); Decisions grouped by Task

- Phase and classification: Requirements (user direction during Product Design rounds 2–3)
- Trigger: the user to the Product UI/UX Designer, 2026-10-26 (relayed in the designer's round 2 and 3 messages): "This task kind is too complicated … Why does the user have to edit those? … one user input area where user just inputs [text], that's it … not a huge abundance of information"; then: Decisions should be based on the Task ID.
- Round 2 changes: Direction 7/8; REQ-005 (free task-kind label), REQ-007 (the note is the one text box the user types in), REQ-010 (Setup shows only the switch while off; no Knowledge section; no kind filter), REQ-011 (router labels kinds itself; the request lists labels already used so they stay stable), DEC-019 (user), AC-007, AC-009, persisted data (no kind list). Supplement SR-013 (§ 5, § 7).
- Round 3 changes: REQ-010/REQ-012 — decision records carry the Task served (Project Task key, Project, title; for a nested delegation the delegating task agent's latest-assigned Task; for a Task with no Project its ID and the description's first line, under "No Project Task"); Decisions group by Task, each delegation under it. The delegation path already knows the key (`root-task-execution-lifecycle.ts:157`, `DelegatedProjectTask`).
- Previous versions: `history/requirements-doc-sr012.md`, `history/launch-selection-order-sr012.md`.
- Approval: the user's own direction; the label-reuse and "No Project Task" details decided by the Solution Designer within it; user informed with the round 3 page, 2026-10-26.
- Design effect (to apply with the UI integration): drop the task-kind setting and its GraphQL; `submit_launch_choices.taskKind` free text (trimmed, ≤ 40 chars, case-insensitive grouping); routing request adds the used labels; knowledge note edited from Setup; decision record gains the Task identity; Decisions query groups by Task.
- Rounds 11–16: server data contract D1–D10 in design-spec.md § SR-013. User decision (rounds 13–16) reversing the Solution Designer's round-11 D8: each node's Decisions list only decisions resolved on that node; no copy record on the delegating node for a peer start (REQ-012 clarified). Task kind kept in the record, not shown in Decisions rows. Decisions block per Task with a link to the Task.
- Rounds 17–18 (user): the router conversation has no special UI (D5 withdrawn); switch on the title line, tab "Configuration", status line only for a problem (D11). Open: keep "Undo last change" (REQ-007)?
- Round 19 (user): no knowledge area on the page, no undo; "Talk to the router" (REQ-007 changed). Question to the Solution Designer: own persistent workspace and normal file tools for the router → DEC-023 (Needs user), evidence A-29 (QR-004 not enforced on Codex/Claude in SR-012).
- Round 20 (user constraint): the router is treated like any internal agent, no router-specific UI/lookup; A-30: an own workspace would show empty while hidden → general "internal workspace" rule added to DEC-023's recommendation.
- Round 21 (user): DEC-023 decided — router in its own internal workspace (A-29/A-30 rule: internal workspaces hidden with internal agents); the Configuration tab offers the existing "Show internal agents" setting. REQ-003/QR-004/AC-011 to be rewritten at integration: router file tools confined to its workspace, no shell where the runtime allows (Codex workspace-write sandbox, Claude without Bash).
- Next action (superseded by the line below where it differs): the user's answer on DEC-023 and confirmation of the design; then integration (SR-014) and architecture review.

### SR-014 — Approved UI integrated; router workspace, knowledge file and confinement designed

- Phase and classification: Mixed (requirements from the user's decisions in Product Design rounds 2–22; design revision)
- Trigger: the Product UI/UX Designer's "DESIGN COMPLETED and approved by the user" (2026-10-26; ui-ux-spec.md Approved, design revision `ce3e417`, record `205aff6`); DEC-023 decided by the user (round 21).
- Requirements SR-014: Direction 6; REQ-003 (own internal workspace, file tools, confinement per runtime), REQ-007 (router's own `knowledge.md`, taught by talking, included in requests), REQ-008 (internal-workspace rule), REQ-010 (the approved page), AC-007, AC-008, AC-009, AC-011, QR-004, DEC-017, DEC-018; status Approved including the UI. Supplement SR-014 (§ 5, § 7). Previous versions in `history/` (`*-sr013.md`).
- Approval: the user's own decisions and UI approval (quoted in requirements); the internal-workspace location rule, the run-config confinement and the 16 KB knowledge cap decided by the Solution Designer within that direction; user informed 2026-10-26.
- Design SR-014 (`design-spec.md`; previous `history/design-spec-sr013.md`): knowledge store and knowledge tools removed; `RouterWorkspace`, `InternalWorkspaces`, `AgentRunConfig.toolConfinement` (Codex `workspace-write`; Claude no shell + writes inside the workspace); routing request as a system notice (`system.model_router`, A-31); decision records with Task identity, Task-group paging and source filter; statistics; reason codes; free-text task kind; GraphQL reduced to status, decisions, statistics and three mutations; web per the UI/UX specification. Evidence A-29…A-31.
- Classification: Large / High (unchanged) → architecture review.
- Follow-ups added: FU-004 (Reconnect must not mark internal agents' runs missing), FU-005 (confinement for Grok/Antigravity).
- Next action: architecture review of the SR-014 package (the reviewer was holding for the UI).

- SR-014 addendum (user question, 2026-10-26): `RouterConversation` → `ModelRouterRun`, `RouterWorkspace` → `ModelRouterWorkspace`, state file `model-router-run.json` (the design's own naming rule: never bare "router" in code). Naming only; architecture reviewer informed.

### SR-015 — ARCH-REV-001 (Fail, Design Impact) resolved; "Model Router agent" wording

- Phase and classification: Design (Design Impact AR-001, AR-002) + wording requirement from the user
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`, `architecture-review-revision-record.md`); the user, 2026-10-26: "Conversation is not a good idea because in every other place … we use the agent … we're not going to a conversation, we're going to the agent."
- Evidence: A-32 (both findings confirmed in code and in the Claude Agent SDK documentation; AR-002 wider: the router could write its own `.claude` settings).
- Requirements SR-015 (approval: wording by the user; AR-001's "no collaboration tools" makes REQ-003's existing intent explicit, Solution Designer within the direction, user informed): Direction 2, 5; REQ-004 (one long-lived Model Router agent per node; not a collaboration member); AC-007, AC-008, AC-011 (tool-set and Claude settings checks), SCN-007, DEC-016, DEC-020 wording. Supplement SR-015 (§ 5 wording, not a member).
- Design SR-015: `ModelRouterAgent` (one owner: the agent's run, its workspace, knowledge read; replaces `ModelRouterRun`/`ModelRouterWorkspace`); `AgentRunMetadata.systemRunOwner` read by `isCollaborationEligibleStandaloneRun` (AR-001); confined Claude runs: setting sources `["user"]`, shell tools disallowed, `PreToolUse` write hook (AR-002); GraphQL `openModelRouterAgent`, status `agentRunId`; residual risks: B writes decision records when A's work packet arrives; Codex temp roots noted for the module doc; FU-002 ≤ 40 s. Previous design `history/design-spec-sr014.md`.
- Design case added: `docs/design-cases.md` Case 9.
- Classification: Large / High (unchanged) → architecture review round 2.

- ARCH-REV-002 (2026-10-26): **Pass** (informational; the reviewer routed to `/software_engineering_team/implementation_engineer` with the Done-when carried). Two old-wording rows corrected (A-29 evidence row, derived-consumers row); the Codex workspace-config check stays in the live checks.

### SR-016 — One routing request at a time (user)

- Phase and classification: Requirements change by the user + design revision
- Trigger: the user, 2026-10-26, after A-33 (only Codex/Claude append input to a running turn): "if you handle like one request at a time, then you should … make them wait … only when the model router is idle … the model router agent can work on another [routing] task."
- Requirements SR-016 (approved: the user's own direction): REQ-004 (one routing request at a time, sent when the agent is idle; wait counts in the 40 s budget; a request that runs out while waiting is never sent and fails with "the Model Router was busy"), AC-006, QR-002. Supplement SR-016 (§ 5 busy router, failure row). Previous versions `history/*-sr015.md`.
- Design SR-016: new `RoutingRequestQueue` owned by `ModelRouter` (FIFO; released on the agent run's idle status); DS-003 chain and narrative; A-21 no longer relied on; A-33 added; RSK-010 resolved with a visible remaining case; tradeoff updated.
- Also explained to the user (no change): `submit_launch_choices` is the router's answer tool (typed arguments, validation feedback, clear done signal); the user approved it.
- Classification: Large / High (unchanged). SR-015 passed ARCH-REV-002 and is in implementation; SR-016 goes back to the architecture reviewer for a re-check, and the implementation engineer is told.

- ARCH-REV-003 (2026-10-26): **Pass** for the SR-016 delta (informational; routed by the reviewer to `/software_engineering_team/implementation_engineer`). Non-blocking note: "idle" is read from the run state, not the routing session.

### SR-017 — Decision record: one representation per fact

- Phase and classification: Design (design feedback from code review CRR-001, candidate C-03; non-blocking)
- Trigger: the code reviewer, 2026-10-26: implementation added structured `skipped` and `routerFailure` (handoff decision 5) while still storing `notes[]` rendered by `launchNotesOf` (`routing-decision-draft.ts:23-27`); the page and statistics read only the structured fields.
- Verified: `routing-decision-draft.ts` writes both; `routing-decision-log.ts:69,80` requires and copies `notes`; no reader uses it.
- Decision (Solution Designer, no behavior change): drop `notes[]` from the decision record; the structured fields are the one representation; sentences are rendered from them when needed (REQ-013's later outcomes Task included). The reader ignores `notes` in older records and no longer requires it. Design § Shared Structure updated; previous `history/design-spec-sr016.md`.
- Requirements: unchanged. Classification: unchanged (Large / High). No new architecture review: it removes a duplicate stored field inside the reviewed record, no boundary or behavior change.
- Sent to: `/software_engineering_team/implementation_engineer` (to apply), `/software_engineering_team/code_reviewer` (answer to C-03).
- SR-017 addendum (code review CRR-001 CR-001, 2026-10-26): `delegatingAgentName` is nullable, null on a peer-started record with `fromNode` naming the delegating node (option 1; no peer contract change). Reason: the approved UI uses the name only in the "Open run" tooltip, absent on a peer's page.

### SR-018 — No confinement for the Model Router agent; normal testing only (user)

- Phase and classification: Requirements change by the user + design revision (answers code review CRR-003, API-REV-001 Fail: CR-003, CR-004 Design Impacts; CR-005 Local Fix carried)
- Trigger: CRR-003 (live L-02: a Codex config file widened the sandbox; L-01: Claude had the user's connectors and `Skill`); the user, 2026-10-26: "our framework … by default … doesn't use a sandbox … the model are extremely good … if they want to write to other folder, it's their choice. But as long as the router agent eventually works, then that's fine … we don't have to do specific things about this"; "the tester API E2E doesn't have to … trick the agent to break anything"; "Just test normally … just like any other agent".
- Requirements SR-018 (approved: the user's own decision; the Solution Designer stated the remaining web-page risk, accepted): REQ-003 (not confined; normal auto-approved setup; instructions keep files in its workspace), AC-011 (no collaboration tools; normal tests, no adversarial probes), QR-004, DEC-023, persisted data. Supplement SR-018 (§ 5 own launch). Kept: own internal workspace, hidden like internal agents, no collaboration tools (AR-001; correctness: a router delegation could wait on the router itself).
- Design SR-018: `toolConfinement` and all Codex/Claude confinement changes removed (clean cut, revert those files to base); `systemRunOwner` stays; A-29 row, scope, consumers, ownership, file mapping, sequence, RSK-006, guidance updated; FU-005 withdrawn; design case 9 extended. Evidence A-34. Previous `history/design-spec-sr017.md`.
- CR-005 (implementation Local Fix) carried: restore an inactive registered router run through `resolveCommandReadyAgentRun` before posting; a failed-turn test; status not "active" while the run cannot take input.
- Classification: Large / High (unchanged; the change removes scope) → architecture review re-check, then implementation, code review, API/E2E rerun (MR-09 and normal live routing; L-01/L-02 adversarial probes dropped).

- ARCH-REV-004 (2026-10-26): **Pass** for SR-018 (with SR-017); informational, routed by the reviewer to `/software_engineering_team/implementation_engineer`. On CR-005 the Solution Designer agrees with the reviewer: restore the inactive router run before posting; no new status reason code (it would need an approved UI text).
- SR-018 note (2026-10-26): the user confirmed the Model Router agent has no `delegate_task` and no `send_message_to` ("of course it doesn't have the delegate task … send message to as well"); otherwise a normal internal agent with its configured and runtime tools (REQ-004, AC-011 unchanged).
