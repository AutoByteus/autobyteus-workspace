# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Project Task from `/project_task_manager`, 2026-10-09) | N/A | N/A | Ready for Approval | BEH-001..009; REQ-001..008; AC-001..009; DEC-001..003 | Presented to user for decisions and approval |
| SR-002 | Requirements | User feedback 2026-10-09: no system-instruction changes; the user's `@` supplies the address through the message | N/A | Ready for Approval | Ready for Approval | REQ-005/007/008 and AC-004/005 withdrawn; BEH-006, BEH-009, SCN-002, SCN-003, DEC-001, DEC-002, AC-006, AC-008 revised | Narrowed baseline presented for approval |
| SR-003 | Requirements | User feedback 2026-10-09: the note must say explicitly to use send_message_to for the delegator | N/A | Ready for Approval | Ready for Approval | REQ-004, AC-002 | Note wording requirement made explicit |
| SR-004 | Requirements | User feedback 2026-10-09: move slow, don't increase scope | N/A | Ready for Approval | Ready for Approval | REQ-003, UC-003, AC-006 withdrawn; REQ-001 narrowed to the Agent-run host; BEH-005, BEH-008, SCN-002, SCN-005, DEC-003, AC-007 now preserved/out of scope | Minimal baseline presented for approval |
| SR-005 | Requirements | User discussion and approval 2026-10-09 | N/A | Ready for Approval | **Approved** | REQ-003, AC-006, SCN-002, BEH-005, UC-004 restored; AC-007 narrowed to Team/Org preservation | Approved baseline: REQ-001, 002, 003, 004, 006 |
| SR-006 | Design | Architecture design on the approved SR-005 baseline | N/A | Approved (requirements); design N/A | Approved (requirements); design Ready | REQ-001..004, REQ-006; AC-001..003, AC-006..009 | Architecture Design Complete; Medium / High → architecture review |

## Revision Entries

### SR-001: Delegated-copy members can contact the delegator (requirements baseline)

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task `project_task_a7fe75d1-31a4-4819-9706-59a76aaa1dc2` and user screenshot `ctx_db53e6342739__9.png` (2026-10-08 desktop report)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not yet created
- IDs affected: BEH-001..009, REQ-001..008, AC-001..009, SCN-001..005, DEC-001..003
- Scenario-basis changes: SCN-003 (nested delegator) recorded as Supported Explicit Edge Scenario
- Why recorded: first coherent baseline for user approval
- Canonical sections changed: all (new)
- Supplemental artifacts: none
- Product design evidence: N/A
- Intended behavior changed: `Yes` (proposed; not yet approved)
- Approval impact: pending explicit user approval and decisions DEC-001..DEC-003
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: none yet (approval hold within the requirements conversation)
- Downstream impact: none until approval
- Remaining gaps: DEC-001 (contact rule), DEC-002 (nested delegator `@`), DEC-003 (self-exclusion in Team/Org roots)
- Next action: obtain user decisions and approval, then begin architecture design

### SR-002: No instruction changes; the user's `@` gives the member the address

- Phase and classification: Requirements, `Refinement` (before any approval)
- Triggering input: user reply 2026-10-09: cautious about growing instructions. Keep how the system instruction is built today. When the user addresses the delegator directly (`@`), the constructed message gives the member (e.g. code reviewer) the address.
- Triggering finding IDs: N/A
- Prior status: requirements `Ready for Approval` (SR-001, not approved)
- Current status: requirements `Ready for Approval`; design not yet created
- IDs affected: withdrawn REQ-005, REQ-007, REQ-008, AC-004, AC-005. Revised BEH-006 and BEH-009 (preserved), SCN-002 (`list_available_agents` path), SCN-003 (out of scope), DEC-001 (resolved: user-directed `@`), DEC-002 (resolved: out of scope), AC-006, AC-008 (prompts unchanged), REQ-006 (host address only).
- Scenario-basis changes: SCN-003 is no longer an in-scope edge scenario
- Why recorded: material narrowing of intended behavior on user direction
- Canonical sections changed: Status, Problem And Desired Outcome, behavior table, Scope Guardrail, Requirements, Acceptance Criteria, Scenarios, Open Decisions, Traceability, Architecture Phase Input, Readiness
- Supplemental artifacts: none
- Intended behavior changed: `Yes` (narrowed; still pending approval)
- Approval impact: SR-002 baseline awaits explicit user approval; DEC-003 included as recommended
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: none (approval hold)
- Remaining gaps: explicit approval; DEC-003 confirmation
- Next action: on approval, record it and start architecture design

### SR-003: Explicit send_message_to guidance for the delegator entry

- Phase and classification: Requirements, `Refinement` (before any approval)
- Triggering input: user reply 2026-10-09: the message should say directly to use send_message_to, so the code reviewer isn't confused.
- Prior status / current status: `Ready for Approval` / `Ready for Approval`
- IDs affected: REQ-004 (explicit `send_message_to` with the host address; no `delegate_task` alternative for that entry), AC-002
- Intended behavior changed: `Yes` (wording requirement sharpened; pending approval)
- Approval impact: SR-003 baseline awaits explicit approval
- Remaining gaps: explicit approval; DEC-003 confirmation
- Next action: on approval, record it and start architecture design

### SR-004: Minimal scope, `@` of the Agent-run host only

- Phase and classification: Requirements, `Refinement` (before any approval)
- Triggering input: user reply 2026-10-09 questioning the `list_available_agents` change: "I don't want to increase the scope … I want to move slow."
- Prior status / current status: `Ready for Approval` / `Ready for Approval`
- IDs affected: withdrawn REQ-003, UC-003, AC-006. REQ-001 narrowed: in a standalone Agent run, non-host composers offer the host; nothing else about candidates changes. BEH-005 (`list_available_agents`), BEH-008 (self-exclusion in Team/Org), SCN-002, SCN-005 and DEC-003 are now preserved/out of scope (DEC-003 resolved No). AC-007 is now a preservation check.
- Intended behavior changed: `Yes` (narrowed; pending approval)
- In-scope remainder: REQ-001 (`@` menu offers the host to non-host agents), REQ-002 (server resolves the host mention to the existing host), REQ-004 (note explicitly says use `send_message_to` with the host address), REQ-006 (message reaches the existing host run, never a new copy)
- Approval impact: SR-004 baseline awaits explicit approval
- Next action: on approval, record it and start architecture design

### SR-005: `list_available_agents` restored; requirements approved

- Phase and classification: Requirements, `Refinement` + approval
- Triggering input: user, 2026-10-09. On reflection, listing the PM in `list_available_agents` is a good suggestion. Agents must still follow their handoff rules and contact outside them only when the user explicitly asks. Solution Designer showed that the existing platform collaboration rules and the team's authored agent instructions already say this, so no instruction change is needed. A stricter platform wording is a separate-ticket candidate. The user then wrote: "Thanks, I agree now, approve."
- Prior status / current status: `Ready for Approval` / **`Approved`**
- IDs affected: restored REQ-003, AC-006, SCN-002 and BEH-005 (desired change), added UC-004; AC-007 now preserves Team/Org results only
- Intended behavior changed: `Yes`
- Approval impact, exact approved baseline and reference: approved baseline is `requirements-doc.md` at SR-005, covering in-scope REQ-001, REQ-002, REQ-003, REQ-004, REQ-006 and AC-001..003, AC-006..009. Approval reference: user message in the Solution Designer conversation, 2026-10-09.
- Behavior-defining supplements: none
- Affected design/review basis: none yet
- Next action: architecture investigation and design

### SR-006: Architecture design complete

- Phase and classification: Design, `Initial Baseline` (design)
- Triggering input: approved requirements SR-005
- Prior status: requirements Approved; design not yet created
- Current status: requirements Approved (unchanged); `design-spec.md` Ready
- IDs affected: design maps BEH-001, 002, 003, 005 to DS-001..DS-004; preserved BEH-006..009
- Canonical sections changed: `design-spec.md` (new); `investigation-notes.md` (Architecture Investigation Findings A-01..A-12, Notes For Architecture Design; R-02/U-01 closed)
- Intended behavior changed: `No`
- Approval impact: none (requirements basis SR-005 unchanged)
- Design decisions: the Agent-root port is built per viewer (host is an in-run placement with rank `run_agent`; own definition = host only for the host viewer). `MentionedCollaborator.inRun` → `presence`. One `guidanceFor` composes and parses the note; a `run_agent` entry gets "Use send_message_to with recipient_address <address> …; delegate_task cannot target it." The GraphQL candidates query takes `focusedAgentRunId` (required for Agent roots). The web caches Agent-root candidates per focused agent. `CollaboratorRootPort.rootDefinition()` is renamed to `ownDefinition()`.
- Post-design classification: `task_size = Medium`, `architectural_risk = High`. Shared contract changes (mention-note type/wording, GraphQL argument) and the Agent-root placement feeding address/bring-in paths.
- Applied handoff-rule outcome: Architecture Design Complete with architectural_risk=High → `/software_engineering_team/architecture_reviewer` (handoff file `handoff-architecture-design-complete.md`)
- Remaining gaps: none blocking. `list_available_agents` is opt-in per agent (product fact, A-11).
- Next action: independent architecture review

### Review record (no new SR round)

- 2026-10-09: architecture review **Pass**, ARCH-REV-001, covering SR-005 (requirements) and SR-006 (design). Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-review-report.md`. The reviewer routed the package to `/software_engineering_team/implementation_engineer`.
- Non-blocking notes forwarded by the reviewer to implementation: AR-001 (catalog-address stability across viewers holds only while the host address segment equals the host's current name slug; after a host-definition rename, a same-slug definition can get viewer-dependent addresses, with not-found as the only effect) and AR-002 (one more `agent`-kind candidates-query test caller to update). Requirements and design remain authoritative and unchanged.
