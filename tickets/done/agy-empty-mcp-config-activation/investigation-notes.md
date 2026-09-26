# Investigation Notes

## Investigation Meta

- Package identifier: `agy-empty-mcp-config-activation`
- Request / ticket: User report 2026-09-25 — Software Development Department org run on Antigravity CLI runtime shows "Failed to prepare agent run 'product_prototyper_8128c1bd34c64e25a62a9b76bda192a4'" for every message.
- Workspace root: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config` / `codex/agy-empty-mcp-config-activation`
- Resolved base remote / branch / revision: `origin/personal` @ `a2694ed453e353550d8b345fa82ef489634dcaf2` (fetched 2026-09-25)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created successfully.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Investigation status: Root cause confirmed; requirements Ready for Approval.

## Initial Request And Clarifications

- Original request: "I have started one software engineering department, AgentOrg, using anti-gravity CLI as the runtime… I have errors. I don't know why… Is it our code issue or some other issue? Please investigate. If it's our code issue, you have to fix it."
- Evidence supplied: screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_5ca9f435ee1a4d64a2b14376e0e497fb/solution_designer_c4c0dda8d76a47c2b4e8b59c83d45523/context_files/ctx_92ee60ad1b13__image.png` (4× "An Error Occurred — Failed to prepare agent run 'product_prototyper_8128…'").
- User-supplied constraints: Fix if it is our code.

## Source Log

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-25 | Runtime | `~/.autobyteus/server-data/logs/server.log` | Look for failure detail | Only "Memory file missing" lines for the run; no stack/cause. Server log does not contain `logger.error` output for this failure. | Check Electron app log |
| 2026-09-25 | Data | `memory/agent_orgs/software_development_department_c648df35.../agent_org_run_execution_tree.json` | Confirm runtime config | All 11 members `runtimeKind: antigravity_cli`, model `gemini-3.8-flash-low`, workspace `~/.autobyteus/server-data/temp_workspace` | — |
| 2026-09-25 | Runtime | `~/.autobyteus/logs/app.log` lines 200–204, 348–352 | Failure cause | `Unexpected failure while preparing agent run 'product_prototyper_8128…' for runtime 'antigravity_cli'. Error: Cannot inspect AGY MCP collision at '/Users/normy/.gemini/config/mcp_config.json': SyntaxError: Unexpected end of JSON input` at `checkCollision` (agy-mcp-config-materializer.js:14) ← `materializeAgyMcpConfig` ← `createAgyRunCapsule` ← `AgyAgentRunBackendFactory.createBackend`. 0 successful `Published antigravity_cli` lines. | Inspect file |
| 2026-09-25 | Data | `ls -la ~/.gemini/config/`; `wc -c mcp_config.json` | Inspect file | `mcp_config.json` is **0 bytes**, created 2026-08-08 20:07 together with `.migrated` (also 0 bytes) — i.e. created by the Antigravity/Gemini tooling itself, not by the user or AutoByteus. | Check AGY semantics |
| 2026-09-25 | Code | `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-mcp-config-materializer.ts` | Failing code | `checkCollision` does `JSON.parse(await fs.readFile(path))`; only ENOENT is tolerated. Empty file → SyntaxError → thrown as fatal. Called for workspace `.agents/mcp_config.json` and `~/.gemini/config/mcp_config.json` whenever an agent-tools MCP descriptor exists (always for team/org members). | — |
| 2026-09-25 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:365-383` | How failure surfaces | Non-`AgentCreationError` failures are logged via `logger.error` (→ stderr → app.log) and rewrapped as generic `Failed to prepare agent run '<id>'.` with the original as `cause`; UI receives only the generic message. | Diagnosability gap noted (out of scope candidate) |
| 2026-09-25 | Command | `agy --version` → `1.2.11`; `agy mcp list` with the real 0-byte file | AGY's own contract | `No MCP servers configured.` exit 0 — AGY treats the empty file as valid/no servers. | — |
| 2026-09-25 | Command | `HOME=/tmp/agyhome agy mcp list` with contents `''`, `'   '`, `'{bad'`, `'{}'` | AGY contract for edge contents | empty → no servers; whitespace → no servers; `{bad` → `Error: failed to parse … invalid character 'b'`; `{}` → no servers. | Align our check with AGY |
| 2026-09-25 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts` | Existing coverage | Covers missing file (implicitly) and real key collision (`rejects user-owned AutoByteus MCP key collisions…`); no empty-file case. | Add test |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | User sends a message to an Agent/Team/Org member configured with `antigravity_cli` runtime | Activation → `AgyAgentRunBackendFactory.createBackend` → `createAgyRunCapsule` → `materializeAgyMcpConfig` → `checkCollision` on workspace and user-global `mcp_config.json` | If either file exists but is empty/whitespace-only, activation fails with generic "Failed to prepare agent run" for every message; run never starts. | app.log 200–204, 348–352; source | High |
| BEH-002 | Contract | Same | Same | Missing file → no collision, activation continues. | Source (ENOENT branch) | High |
| BEH-003 | Contract | Same | Same | File that already defines the AutoByteus agent-tools MCP server name → `AGY_MCP_NAME_COLLISION` failure (intentional guard). | Source; existing unit test | High |
| BEH-004 | Contract | Same | Same | Non-empty malformed JSON → activation fails ("Cannot inspect AGY MCP collision…"). AGY itself also refuses such a file. | Source; AGY probe | High |

## Relevant Codebase And Technical Facts

| Path | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `src/agent-execution/backends/antigravity/capsule/agy-mcp-config-materializer.ts` | Guards against MCP server-name collision, then writes the run capsule's `.agents/mcp_config.json` | Empty file must be treated as "no servers" | Local change inside `checkCollision` only |
| `tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts` | Capsule unit tests incl. collision cases | Add empty/whitespace cases; keep malformed-fails and collision-fails | Existing test harness uses temp roots; user-global path depends on `os.homedir()` |

## Structural And Payload Surface Inventory

- Payload surfaces: `<workspace>/.agents/mcp_config.json`, `~/.gemini/config/mcp_config.json` (read-only by AutoByteus; never modified).
- Structural surfaces: none changed — no API, persistence, security, concurrency, deployment or ownership change. Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication |
| --- | --- | --- | --- |
| app.log | User's org run | Two activation attempts at 13:38:46 and 13:42:07 both fail at `checkCollision` on the empty global file | Reproduces 100% on this machine |
| AGY probe (throwaway HOME) | empty/whitespace/malformed/`{}` | See Source Log | Our guard is stricter than AGY for empty/whitespace; equal for malformed |

## Persisted Data And State Facts

- Affected subject: user's `~/.gemini/config/mcp_config.json` (0 bytes). AutoByteus only reads it; no migration, no modification. No persisted AutoByteus data affected.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Separate earlier `codex_*` runs in server.log also show `ACTIVATION_FAILED`; not investigated here (different runtime, not in this org). | Could be a different issue | Out of scope; user may raise separately | Open (non-blocking) |
| R-001 | Risk | Diagnosability: UI and server.log show only the generic wrapper; the real cause is only in `~/.autobyteus/logs/app.log`. | This is why the user could not see the cause | Offered to user as optional scope (see requirements Open Decision) | Open |

## Requirement Implications

- The failure is an AutoByteus code defect (overly strict parse), not an AGY, model, auth or user-config problem: AGY itself accepts the file.
- Workaround available to the user immediately: write `{}` into `~/.gemini/config/mcp_config.json` (or delete it).

## Notes For Architecture Design

- Fix belongs in `checkCollision`: treat content that is empty after trim as "no servers configured". Keep ENOENT tolerance, malformed-JSON failure, and name-collision failure unchanged.
- Never write to user-owned config files.
