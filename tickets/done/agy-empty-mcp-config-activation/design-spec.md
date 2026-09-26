# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` SR-001 (REQ-001..003, AC-001..005). User approval 2026-09-25: after the SR-001 presentation the user replied "continue", following the original instruction "If it's our code issue, you have to fix it." Optional OD-001 (diagnosability) was not opted into and stays out of scope.
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/investigation-notes.md`

## Current-State Read

AGY activation path: `AgyAgentRunBackendFactory.createBackend` → `createAgyRunCapsule` (and `restoreAgyRunCapsule` on restore, `agy-run-capsule.ts:55` and `:89`) → `materializeAgyMcpConfig` → `checkCollision` for `<workspace>/.agents/mcp_config.json` and `~/.gemini/config/mcp_config.json` (only when an agent-tools MCP descriptor is present, which is always true for team and org members). `checkCollision` runs `JSON.parse` on the raw file content and tolerates only ENOENT, so a 0-byte file throws `SyntaxError`. The error comes back to the user only as the generic "Failed to prepare agent run". Ownership and boundaries are healthy: the defect is a missing "empty means no servers" rule in one private function.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: One private function in one source file (`agy-mcp-config-materializer.ts`) plus added cases in one existing unit-test file (`agy-run-capsule.test.ts`).
- Architectural risk: `Low`
- Risk rationale: The change only relaxes parsing of empty or whitespace-only content, which matches AGY 1.2.11's own behavior (probed). It makes no change to APIs, persistence, security boundaries (the collision guard and the malformed-JSON rejection stay the same), concurrency, deployment or ownership. User files remain read-only.
- Escalation trigger: If implementation finds that AGY run startup also fails on the empty file after the guard passes, or that other AutoByteus readers parse the same files, return to Solution Designer with Design Impact.

## Architecture Investigation Evidence

| Source | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| app.log | `~/.autobyteus/logs/app.log` 200–204, 348–352 | Failure stack ends at `checkCollision` | Fix location | None |
| AGY probes | investigation-notes Source Log | empty/whitespace → no servers; malformed → error | Trim-empty ⇒ no servers; keep malformed failure | None |
| Callers | `grep materializeAgyMcpConfig` → create (`:55`) and restore (`:89`) | Single choke point | Fixing `checkCollision` covers both | None |
| Tests | `agy-run-capsule.test.ts` | Existing descriptor-bearing test also reads the developer's real `~/.gemini/config/mcp_config.json` via `os.homedir()` | New tests use the workspace path; the global-path test must isolate the home directory | See Implementation Guidance |

## Intended Change

In `checkCollision`, read the file; if ENOENT, return (unchanged). If `content.trim() === ""`, return (no servers, no collision). Otherwise parse the JSON as today: a parse failure still throws `Cannot inspect AGY MCP collision at '<path>': …`, and a present AutoByteus server name still throws `AGY_MCP_NAME_COLLISION`. Separate the read step from the parse step so that the ENOENT handling and the parse-error wording stay clear.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Req / AC | Trigger | Existing Evidence | Change / Preserved | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-003 / AC-001, AC-002, AC-005 | AGY run activation or restore with descriptor | investigation BEH-001 | Changed: empty/whitespace ⇒ no servers | create/restore → `materializeAgyMcpConfig` → `checkCollision` (trim-empty early return) → capsule config written |
| BEH-002 | Contract | REQ-002 | Same | investigation BEH-002 | Preserved: ENOENT ⇒ continue | Same |
| BEH-003 | Contract | REQ-002 / AC-004 | Same | investigation BEH-003 | Preserved: name collision ⇒ fail | Same |
| BEH-004 | Contract | REQ-002 / AC-003 | Same | investigation BEH-004 | Preserved: malformed non-empty ⇒ fail | Same |

## Relevant Supplemental Task Artifacts

None

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No`
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: The defect sits entirely in the parsing rule of a private helper. The owner, placement and boundary are correct.
- Design response: Local fix plus tests.
- Refactor rationale: N/A
- Intentional deferrals and residual risk: OD-001 (the generic UI error hides the real cause; the cause is only in app.log) is deferred at the user's discretion as a separate ticket.

## Affected Files

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-mcp-config-materializer.ts` | `checkCollision`: treat trim-empty content as no servers |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts` | Add AC-001/AC-002/AC-003 cases; keep the existing AC-004 test |

## Implementation Guidance

- Tests for AC-001/002/003: write the test content to the **workspace** `.agents/mcp_config.json` (the same function covers the global path). Assert that capsule creation succeeds, that the capsule's `.agents/mcp_config.json` contains `autobyteus_agent_tools`, and that the user file is byte-for-byte unchanged (AC-001). Also add at least one case that exercises the **global** path by isolating the home directory (for example `vi.spyOn(os, "homedir")` pointing at a temp dir, restored afterwards). The descriptor-bearing tests currently read the developer's real `~/.gemini/config/mcp_config.json`; on this machine that file is 0 bytes, so the existing collision test only passes because the workspace collision is thrown first. Prefer isolating the home directory for all descriptor-bearing tests so results don't depend on the machine.
- Do not write to or "repair" user config files.
- Validation: run the capsule unit test file and the AGY backend unit tests (`tests/unit/agent-execution/backends/antigravity/`).
- AC-005 (real environment) belongs to delivery/user verification on a build containing the fix; the user's 0-byte file should be left as is for that check.

## Removal / Decommission, Migration, Sequencing

N/A: no removal, no persisted-data transition. Single-step change.
