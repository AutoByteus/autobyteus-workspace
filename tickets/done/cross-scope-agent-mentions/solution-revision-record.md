# Solution Revision Record — cross-scope-agent-mentions

## SR-001 — 2026-09-30 — First requirements baseline; Product Design requested
- Trigger: the user's broad idea (a hidden global default Org so that `@` reaches any
  Agent/Team). Then the user asked for recommendations on Q1–Q5, then asked for
  Product Team UI work first.
- Prior status: N/A. Current status: Requirements Draft (not approved).
- Affected IDs: B-001…B-004, SC-001…SC-007, REQ-001…REQ-007, AC-001…AC-006.
- Canonical sections: requirements-doc.md (all); investigation-notes.md (evidence
  E-01…E-05, alternatives A–D, recommendations Q1–Q5).
- Approval basis: none yet; recommended direction B (each run is its own growable
  scope) used as working basis for Product Design.
- Design / review / routing impact: no design yet. Routed as `Product Design Requested`
  (New Request).
- Remaining gaps: user approval of Q1–Q5 and the UI result; design not started.

## SR-002 — 2026-09-30 — Product result integrated; Ready for Approval
- Trigger: Product Prototyper returned `Prototype Completed`, with user-confirmed UI/UX spec
  ("Okay, finally I confirm now. All good now."). Also the earlier clarification reply (E-06).
- Verification: spec, ticket and manifest agree on repo/pin/revisions. Commits 270d05e, 96755f3,
  c4d4764 and 9ca5651 exist and 9ca5651 is on origin/personal. VIS-001–014 SHA-256 all match.
- Prior status: Draft. Current status: Ready for Approval.
- Changes: scope widened to standalone Agent and Org runs (user decision). Candidates limited to
  outside-run shared Agents/Teams (replaces the old "re-mention shows already available"). No
  "added" concept. Failure notice only. Product-wide task-row change. Standalone Agent run
  collaboration root (F-005). Non-mounted identity/settings (F-001). Combobox accessibility.
- Affected IDs: REQ-001–011 (renumbered; the SR-001 REQ-006/007 meanings moved to REQ-001/REQ-008),
  AC-001–013, SC-001–008, B-001–006. OQ-1 and OQ-2 open with recommendations.
- Approval basis: pending. Design: not started. Routing: approval hold in conversation.

## SR-003 — 2026-09-30 — Always-on collaboration tools (user proposal)
- Trigger: after the design sketch, the user proposed always enabling `delegate_task` and `send_message_to` for all
  agents, whether or not they are configured.
- Evidence: Codex Agent Tools MCP `enabled_tools` is fixed at thread start/resume, and `delegate_task` currently needs an
  active `MemberTeamContext` (`autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`). Adding tools mid-conversation
  was risk 1 in the sketch. Always-on exposure with authorization checked on each call removes that risk.
- Prior status: Ready for Approval (SR-002). Current status: Ready for Approval (SR-003).
- Changes: added REQ-012 and AC-014. REQ-003 wording now points to REQ-012. Architecture input and external-contract
  notes updated. Exclusions (internal helper runs, application-owned runs) are proposed and still need the user's decision.
- Approval basis: pending. Design: not started.
- 2026-09-30 addendum (same round): the user confirmed REQ-012 includes Daily Assistant and excludes internal helper
  agents (DEC-U1). Application-owned runs are still open (OQ-3). Overall approval is still pending.
- 2026-09-30 addendum: OQ-3 resolved by the user (application-owned runs excluded). OQ-1/OQ-2 still open.

## SR-004 — 2026-09-30 — Requirements approved
- Trigger: the user said "Yeah, I completely agree with you." in reply to the explicit approval request
  (OQ-1 yes, OQ-2 root settings, everything decided so far).
- Prior status: Ready for Approval. Current status: Approved.
- Approved basis: REQ-001–012, AC-001–014, SC-001–008, B-001–006, DEC-U1, OQ-1/2/3 resolved, and the Product UI/UX spec
  with VIS-001–014 (SHA-256 verified).
- Next: architecture design (the user is asking design-level questions about the execution tree shape).

## SR-005 — 2026-09-30 — Architecture design complete
- Trigger: the user approved the requirements (SR-004) and confirmed these design shapes in conversation:
  - the tree field is `collaborators`;
  - entries hold no run IDs (runs stay in `taskExecutions`);
  - entries are lean;
  - the standalone folder is `collaboration/`;
  - first contact is `delegate_task`, after that `send_message_to` by run ID;
  - a collaborator address gets a hint to use `delegate_task`.
  The user said "I like your design… you have thought very through".
- Evidence: E-07–E-17 (architecture investigation at `origin/personal` @ `8caa610ff`; worktree rebased).
- Corrections recorded: the Org host rule is the delegator's host (E-08). `send_message_to` starts or wakes existing
  entries only (E-08).
- Prior status: requirements Approved, no design. Current status: design `Ready`, `task_size=Large`,
  `architectural_risk=High`.
- Affected IDs: all REQ/AC, mapped in the design (BEH-001–013, DS-001–008).
- Approval impact: none. Intended behavior is unchanged; the shape decisions are technical.
- Routing: `Architecture Design Complete` → handoff rules (independent architecture review expected).

## SR-006 — 2026-09-30 — Design revision: Agent-root lifetime and host wake
- Trigger: the user asked whether the design says clearly "how the Agent root would be woken for a child message". It did
  not. SR-005 bound the root to host runtime liveness ("host run ended → root.terminate") and delivered to the host through
  `AgentRunManager.getActiveRun`. A host crash would therefore have killed the children, and a message to a crashed host
  would have failed.
- Evidence: `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun` (lines 71–76) returns the active run or restores
  it through the transition lane. This matches `ConfiguredAgentExecutionHandle.ensureReady` for Team/Org members (E-08).
- Changes (design only):
  - the root's lifetime follows the explicit standalone lifecycle (Stop or server shutdown);
  - a host crash does not end the root;
  - new DS-009: host wake through `resolveCommandReadyAgentRun`;
  - lock order rule;
  - added tests and risks.
- Approval impact: none. REQ-005/006 are unchanged and now fully served. Design `Ready`, still Large/High.
- Routing: revised package → architecture reviewer (the SR-005 review is superseded for these sections).

## SR-007 — 2026-09-30 — Design revision for ARCH-REV-001 (Fail, Design Impact)
- Trigger: architecture review `ARCH-REV-001` (`design-review-report.md`), findings AR-001–AR-005.
- Changes (design only; no change to intended behavior):
  - AR-001: `AgentRunCollaborationRootManager.resolveCommandReadyRoot(hostRunId)` is the single owner for commands. It
    calls `resolveCommandReadyAgentRun`, whose activation hook ensures the root, and releases the lane before any root gate.
    The collaboration stream's `connect` uses it (mirroring `resolveActiveTeamRun`). `agentRunCollaboration` serves the
    stored view without restoring. The client's connect triggers are defined. There is a stored child projection. A
    Stop → reopen → send-to-child test is added.
  - AR-002: context-file owner kinds `agent_collaboration_member_draft/final` (server types, resolver, layout; web builders).
    E-11 is extended with E-18 sites, each given an explicit branch or an "unchanged" rationale.
    `RootTaskPersistenceFinalizationIndeterminateError` is widened.
  - AR-003: one `get_handoff_rules` rule through `MemberExecutionContext.teamScoped`: Team/Org members and task-Team
    members in any root; not the Agent-root host or task Agents directly under it.
  - AR-004: "in the run" means at least one task execution at the collaborator's address. An entry with no runs stays
    offerable and is reused.
  - AR-005: supplement inventory filled in; `mock-boundaries.md` path corrected.
  - Non-blocking note: admission never posts; callers post through their existing command paths (the standalone post stays
    in `AgentRunCommandCoordinator`).
- Evidence: E-18, E-19.
- Approval impact: none (REQ/AC unchanged). Still Large/High. Routing: revised package → architecture reviewer.
- 2026-09-30 note (no new SR round): architecture review `ARCH-REV-002` gave **Pass** on SR-007 (requirements basis SR-004).
  Report: `design-review-report.md`. The reviewer delivered the implementation handoff to
  `/software_engineering_team/implementation_engineer`. Solution Designer did not repeat that handoff.

## SR-008 — 2026-10-01 — Requirements change: single collaborator instance reached with send_message_to (Ready for Approval)
- Trigger: code review CRR-004 / API-E2E API-REV-001.
  - DI-001: collaborator task-Team handoffs by address cannot be delivered (live evidence `api-e2e-evidence/c-02-observation.log`).
  - The user then directed, after a discussion of options: "yesss. i think this is better… send message to sounds more
    intuitive… just like normal communications". This means one instance per collaborator, created at `@` with run IDs
    stored in the `collaborators` entry, started on first message, and reached with `send_message_to`.
- Prior status: Approved (SR-004). Current status: Ready for Approval; SR-004 remains the last approved basis.
- Affected: B-002, B-004; REQ-001/003/005/006/008/011/012; new REQ-013; AC-003/004/005/006/008/011/014; new AC-015;
  SC-001/002/006/008; non-goals; the UI section. Pending decisions D-R1 and D-R2.
- Design impact: SR-005–007 must be revised. The collaborator entry now carries its execution identities, like Org mounted
  Teams. Messaging resolves collaborator addresses. Admission validates runnability. DI-001 is resolved by construction.
  The Org task-Team copy behavior (E-20) is out of scope.
- Product impact: revision of VIS-004/005/007/010/013 (and Team/Org-tab briefing rows) is needed after approval.
- Implementation: CR-003 and CR-004 (code review) stay pending and will be released with the revised design.
- 2026-10-01: SR-008 **Approved** by the user ("approved. ask product prototyper to update UI thanks"). D-R1 and D-R2 are
  accepted. Routing: `Product Design Requested` (user-directed revision of the approved package) → Product Prototyper.
- 2026-10-01: SR-008 Product revision returned and integrated.
  - Verified: the spec and ticket agree, commits `d9bf0f6`, `0659cb0` and `df2f5cd` exist and `df2f5cd` is on
    `origin/personal`, and the 15 VIS hashes match.
  - RD-004 (sender shown on agent-to-agent messages, product-wide, user "okayyyy. agreed") added as REQ-014 and AC-016.
  - Next: design revision SR-009.

## SR-009 — 2026-10-01 — Design revision for SR-008 + RD-004 (resolves DI-001; releases CR-003/CR-004)
- Trigger:
  - SR-008 (approved requirements change) and the confirmed Product revision (`cross-scope-agent-mentions-sr008`,
    VIS-001–015, RD-004);
  - code review CRR-004: DI-001 Design Impact; Local Fixes CR-003 and CR-004.
- Changes:
  - collaborator entries carry their single execution identity;
  - admission validates runnability (`RunModelSelectionValidator`), allocates identities, commits, publishes Offline
    handles through the new root-neutral `CollaboratorExecutionHost`, and returns `COLLABORATOR_ADD_FAILED` on failure;
  - message resolution covers collaborators and their Team members (DI-001 resolved by construction);
  - `delegate_task` to a collaborator address starts an extra copy (REQ-013);
  - the candidate in-run rule is simplified;
  - RD-004: `senderId` on inter-agent user traces, a replay inter-agent item, and web "From <Sender>:" rendering;
  - web rows come from `collaborators`;
  - CR-003, F-02, F-03 and F-04 are included in the file mapping and tests;
  - the obsolete SR-007 collaborator task paths are removed.
- Prior design: SR-007, archived at `design-history/design-spec-SR-007.md`.
- Classification: Large/High. Approval basis: SR-008 (user), the Product spec (user) and RD-004 (user).
- Routing: Architecture Design Complete → architecture reviewer.

## SR-010 — 2026-10-01 — Design revision for ARCH-REV-003 (Fail, Design Impact)
- Trigger: ARCH-REV-003 (`design-review-report.md`): AR-006 (Medium, blocking), AR-007 (Low), AR-008 (Low).
- AR-006: the separate `CollaboratorExecutionHost` is dropped. Collaborators are hosted in each root's existing
  command-routing backend; the new section "Collaborator Hosting And Routing" covers it.
  - Org and Agent root: `rootAgents`/`teams` `prepareConfigured` with `hostKind` routing.
  - Team root: the root `FlatTeamExecutionManager.addCollaboratorAgent` plus `FlatTeamMemberConfigResolver` collaborator
    nodes, a new `CollaboratorTeamExecutionRegistry`, TeamRuns registered with `teamRunResolver`, and index kinds
    `collaborator` / `collaborator_team_member`.
  - Command, input, liveness, authorization, `requireTeamRun`, physical scope, binding commits, status, restore,
    termination and the extra-copy host rule are specified per root.
  - Tests added for a collaborator Agent and Team member in a Team run.
- AR-007: holding the composer until acceptance applies only to sends carrying `mentions` (AC-013 preserved).
- AR-008: stale requirements passages fixed (normative VIS-001–015; F-003 superseded by REQ-014; readiness).
- Evidence: `root-team-run.ts` (lines 347–387 and 481–502), `flat-team-execution-manager.ts` (lines 137–200),
  `flat-team-member-config-resolver.ts`, `team-run-resolver.ts`, `agent-org-run.ts`, `agent-run-collaboration-root.ts`
  (`hostKind` routing).
- Requirements and approval: unchanged (SR-008). Large/High. Routing: architecture reviewer.
- 2026-10-01 note (no new SR round): architecture review `ARCH-REV-004` gave **Pass** on SR-010 (requirements basis
  SR-008). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`,
  with two notes: member-context registration in `addCollaboratorAgent`, and the source of the activation mode.
  Solution Designer did not repeat that handoff. Report: `design-review-report.md`.
