# Solution Revision Record — mcp-sdk-1-32-upgrade

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Task `autobyteus-181`, 2026-10-19 | O-001 and the dead-code items from autobyteus-179's delivery | N/A | Requirements Approved; Design Ready | BEH-001..004, REQ-001..007, AC-001..009, DEC-001..004 | Architecture Design Complete; Medium / Low |
| SR-002 | Requirements + Design (validation addendum) | The user's regression request via `/project_task_manager`, 2026-10-19 (+ check 3) | Receipt gap: no real-server or own-endpoint proof; toy tests never ran | Delivered (DR-001) | Requirements Approved (user); Design Ready (addendum) | REQ-008..010, AC-010..016, DEC-005..006 | Validation-only round; Small / Low |
| SR-003 | Requirements (added verification) | User in the Solution Designer conversation, 2026-10-19 | N/A | SR-002 Approved | Approved (user) | REQ-011, AC-017, SCN-007 | Runtime × MCP matrix added; still validation only |

## Revision Entries

### SR-001 — Baseline

- Phase and classification: Initial Baseline
- Trigger:
  - Task `autobyteus-181` from `/project_task_manager` (FU-8, approved by the user: "yes please. i think it makes sense for a follow up").
  - The additions came from the autobyteus-179 receipt verification (`/Users/normy/autobyteus_org/autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/autobyteus-179-delivery-receipt-verification.md`).
- Current status: requirements `Approved`; design `Ready`
- Scenario basis: SCN-001 Supported Normal; SCN-002 and SCN-003 Supported Explicit Edge
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction (the Task leaves the WebSocket decision to the team → remove). User informed in the Solution Designer conversation, 2026-10-19.
- Classification: `task_size=Medium`, `architectural_risk=Low`
- Prerequisite check: none found (investigation notes)
- Handoff: see `handoff.md`
- Remaining gaps: follow-ups O-002 and the external-toy integration tests (design-spec Change Scope)
- Next action: direct implementation

### SR-002 — The user's regression parity request

- Phase and classification: Requirements (added verification requirements) plus a design addendum (validation plan; no source change).
- Trigger: the user's words relayed by `/project_task_manager`: "we have to make sure that the mcp upgrade doesn't break. Upgrading a library should make things better instead of breaking things." Then check 3: our own MCP endpoints, including `create_task` through the Agent Tools MCP server and `/mcp/gateway`.
- Finding: SR-001's delivery proved the new behavior with self-made fixtures only. The toy integration tests never ran (they can't run in any current layout). Nothing ran against the user's kind of servers (`uv` stdio) or specifically against our own endpoints. My receipt verification accepted this and stated the toy-test cause incompletely (corrected).
- Prior status: delivered (DR-001), Task still open. Current: requirements Approved at SR-002 (user); design addendum Ready.
- IDs: UC-004; SCN-004…006; REQ-008…010; AC-010…016; DEC-005…006.
- Intended behavior changed: No (verification of preserved behavior BEH-001).
- Approval: by the user (his own words, relayed).
- Classification of this round: `Small` / `Low`.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity`; the ticket folder was moved back to `tickets/in-progress/`.
- Next action: the implementation route (no code expected; check 1 is implementation-scoped), then API/E2E (checks 2-3), the report to the user, then delivery re-archives.

### SR-003 — Runtime × MCP matrix

- Trigger: the user, 2026-10-19: "just make sure that we are improving, upgrading the library, right? But we should make sure the project MCP still works. So later the testing should at least make sure the different runtime for different MCP still works."
- Change: REQ-011 / AC-017 / SCN-007. Every available runtime (native, Claude, Codex, AGY, Grok if installed) × {Agent Tools project tools `create_task`/`update_task`, external stdio tool, external HTTP tool}, before and after. Unavailable cells are reported, not passed.
- It extends SR-002's checks 2 and 3, which covered only "native + one other" and "Claude + Codex".
- Intended behavior changed: No (verification only). Approval: the user's own words.
- Classification: still `Small` / `Low`, validation only.
- Handoff: addition sent to the Implementation Engineer, which holds the SR-002 round.
