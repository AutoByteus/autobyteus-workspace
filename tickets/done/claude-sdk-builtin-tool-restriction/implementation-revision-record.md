# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `solution-handoff.md` / initial | N/A | `Initial Baseline` | `SR-002`; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks pass; ready for direct API/E2E |

## Revision Entries

### IR-001 — Explicit Claude built-in tool policy (enabled list + safety-net disallow list)

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/solution-handoff.md`, initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Normal Claude turns get `tools` = 10 enabled built-ins and `disallowedTools` = `AskUserQuestion`, `Agent`, `Task`, `Workflow`, `SendMessage`, `ListAgents`. Model discovery is unchanged.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: N/A (direct route)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation baseline
- Approved behavior or requirement IDs affected: REQ-001..006, AC-001..007; BEH-001..005
- Implementation delta: added the `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS` constant; extended `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS`; `buildQueryOptions` emits `tools`. Replaced the unit assertions `not.toHaveProperty("tools")` with exact `tools`/`disallowedTools` assertions. Added model-discovery guards: `listModels` options carry no `tools`/`disallowedTools`, and a new `resolveContextCapacities` test asserts `tools: []` (AC-006). Rewrote the docs paragraph.
- Changed files or areas: `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`, `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`, `autobyteus-server-ts/docs/modules/agent_execution.md`
- Local validation and result: `claude-sdk-client.test.ts` 18/18; runtime-management + Claude backend unit suites 145/147 (both failures, one Claude-session and one Codex, already exist on the unchanged base); build `tsc` passes. Real-CLI credential-free probe on SDK 0.3.280, using the exact `buildQueryOptions` output, passes (see handoff).
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small + Low)
- Remaining limitations or risks: R-001 (future SDK tool renames); ASM-001 (static Bash/Glob/Grep/Skill description text mentions Agent/subagent; accepted by the user)
