# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (requirements baseline unchanged since SR-001)
- Package identifier: `agy-empty-mcp-config-activation`
- Request / ticket: User report 2026-09-25 — Antigravity CLI org members fail with "Failed to prepare agent run"
- Requirements owner: Solution Designer
- Date: 2026-09-25
- Approval state and reference: Approved by user 2026-09-25. After the SR-001 presentation the user replied "continue", following the original instruction "If it's our code issue, you have to fix it." OD-001 was not opted into and stays excluded.
- Exact approved requirements baseline / solution revision: SR-001 (REQ-001..003, AC-001..005)
- Behavior-defining supplements: N/A — none

## Problem And Desired Outcome

- Problem: Every agent using the `antigravity_cli` runtime fails to start when `~/.gemini/config/mcp_config.json` (or `<workspace>/.agents/mcp_config.json`) exists but is empty. The Antigravity tooling itself creates this empty file (observed: 0 bytes, created alongside `.migrated`), and `agy` treats it as "No MCP servers configured". AutoByteus's MCP-name collision guard instead tries to `JSON.parse` it, fails, and aborts activation.
- Affected actors: Any user running Agents, Teams or Orgs on the Antigravity CLI runtime with an empty MCP config file.
- Desired outcome: Empty or whitespace-only MCP config files are treated the same way `agy` treats them — as no configured servers — so activation proceeds.
- Observable definition of success: The user's Software Development Department org members on `antigravity_cli` start and respond instead of showing "Failed to prepare agent run".

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Empty/whitespace-only config → activation fails ("Cannot inspect AGY MCP collision… Unexpected end of JSON input") | Treated as no configured servers; activation continues | — | investigation-notes Source Log (app.log, `agy mcp list` probes) |
| BEH-002 | Contract | SCN-002 | Missing config → activation continues | Unchanged | Yes | Source |
| BEH-003 | Contract | SCN-002 | Config defining the AutoByteus agent-tools server name → `AGY_MCP_NAME_COLLISION` failure | Unchanged | Yes | Source; existing test |
| BEH-004 | Contract | SCN-002 | Non-empty malformed JSON → activation fails with "Cannot inspect AGY MCP collision…" (AGY also rejects it) | Unchanged | Yes | Source; AGY probe |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| AutoByteus user on AGY runtime | Run agents/teams/orgs | Agents start with AGY's default empty config file | AutoByteus must not modify user-owned config files |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Activating an `antigravity_cli` agent (standalone, team or org member) when the workspace-level or user-global AGY MCP config file is empty or whitespace-only.

### Out Of Scope

- Changing how activation failures are displayed in the UI or which log file receives them (see Open Decision OD-001).
- The unrelated earlier `codex_*` `ACTIVATION_FAILED` entries in server.log.
- Any change to AGY's own config files or auto-repair of user config.

### Non-Goals

- Relaxing handling of malformed non-empty JSON or of genuine server-name collisions.

### Preserved Behavior Boundary

- BEH-002, BEH-003, BEH-004; AC-003, AC-004.

### Review Authority

- Standard: blocking findings must cite REQ/AC/BEH IDs here; scope-changing proposals require renewed user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When an AGY MCP config file checked for collisions exists and its content is empty or whitespace-only, AutoByteus treats it as having no configured MCP servers and continues activation. | BEH-001 | Must | Matches `agy` 1.2.11 behavior; the empty file is created by AGY tooling | AGY probes; user request |
| REQ-002 | Existing outcomes for missing files, genuine AutoByteus server-name collisions, and non-empty malformed JSON remain unchanged. | BEH-002/003/004 | Must | Keep the safety guard | Existing contract |
| REQ-003 | AutoByteus does not modify the user's workspace or global MCP config files. | BEH-001 | Must | User-owned files | Existing design |

## Acceptance Criteria

| AC ID | Req IDs | Scenario | Trigger | Expected Outcome | Alternate Outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | SCN-001 | Global or workspace `mcp_config.json` is 0 bytes; AGY run capsule is created with an agent-tools descriptor | Capsule creation succeeds; capsule `.agents/mcp_config.json` contains the AutoByteus server; user file still 0 bytes | — | Unit test |
| AC-002 | REQ-001 | SCN-001 | Same, file contains only whitespace/newlines | Capsule creation succeeds | — | Unit test |
| AC-003 | REQ-002 | SCN-002 | File contains malformed non-empty JSON | Capsule creation fails with "Cannot inspect AGY MCP collision…" | — | Unit test |
| AC-004 | REQ-002 | SCN-002 | File defines the AutoByteus agent-tools server name | Fails with `AGY_MCP_NAME_COLLISION` (existing test keeps passing) | — | Existing unit test |
| AC-005 | REQ-001 | SCN-001 | User's real environment: 0-byte `~/.gemini/config/mcp_config.json`, org on `antigravity_cli` | Sending a message to product prototyper no longer yields "Failed to prepare agent run" | — | Delivery/user verification on a build with the fix |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Req/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | AutoByteus user | Talk to an AGY-runtime agent | Send message in agent/team/org UI | AGY installed; empty MCP config file present (AGY default) | User sends message → run activates → agent responds | Agent runs | — | Supported Normal Scenario | User screenshot, app.log, `~/.gemini/config` listing | REQ-001/003, AC-001/002/005 |
| SCN-002 | Contract | AGY config guard | Prevent unsafe/ambiguous MCP config | Same | Config malformed or contains AutoByteus server name | Activation → guard rejects | Clear failure | — | Supported Explicit Edge Scenario | Source, existing test | REQ-002, AC-003/004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A — not applicable.

## Open Decision

- OD-001 (optional, user choice): The real cause was only visible in `~/.autobyteus/logs/app.log`; the UI and `server.log` showed only the generic "Failed to prepare agent run". Improving that diagnosability is **not** included in this baseline. It can be added as a separate ticket if the user wants.

## Immediate Workaround (no code change)

- Write `{}` into `~/.gemini/config/mcp_config.json` (e.g. `echo '{}' > ~/.gemini/config/mcp_config.json`), then resend the message.
