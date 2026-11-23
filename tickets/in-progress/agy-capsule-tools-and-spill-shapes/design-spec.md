# Design Spec — agy-capsule-tools-and-spill-shapes

## Solution And Approval Basis
- Revision `SR-001`; requirements approved by the Solution Designer within the direction. User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes/tickets/in-progress/agy-capsule-tools-and-spill-shapes/investigation-notes.md` (F-01…F-09). Authorities read: skill references, `DESIGN.md` (rules 4, 5, 6, 7; rule 12 does not apply), `TESTING.md`.

## Current-State Read
`agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts` exports `AGY_NATIVE_TOOL_NAMES` (eight older names); `createAgyRunCapsule` writes it as `tools: […]` into the run's agent.md; the CLI treats it as an allowlist and maps the older read/write/edit names to the current tools (F-05, F-06).

## Task Size And Architectural Risk
- Task size: `Small` (one constant, its comment and test, one test count, the module doc). Risk: `Low` (an allowlist of names; probed live on the current CLI).
- Escalation trigger: the live check shows the tool set differs from REQ-002 (a widened or reduced set).

## Data Contract
No stored or exchanged shape changes: the capsule's agent.md text changes by its `tools:` line (its hash is computed from the written text).

## Intended Change
1. `agy-native-tool-policy.ts`: `AGY_NATIVE_TOOL_NAMES = ["read_file", "write_file", "edit_file", "run_command", "generate_image", "view_file", "write_to_file", "replace_file_content", "grep_search", "list_dir", "find_by_name"]`. Comment: the allowlist of native tools; the first five are the current agy 1.5.x tools; the rest are the names of older versions (agy 1.5.15 maps them to the current tools or ignores them; checked live); the CLI ignores a name it does not know; the list never names collaboration or MCP tools.
2. Tests: the policy unit test asserts the exact list, uniqueness and no `call_mcp_tool`/collaboration names (replaces "the exact eight names"); the `agy-native-image-codex-skill` e2e's count follows the list's length (it uses `.length`, no edit unless it hard-codes eight).
3. Live check (AC-002): reuse `evidence/INV-01-capsule-tools-probe.mjs` with the capsule written by the real `createAgyRunCapsule` (or its list) and read the agent's own tool list and the `init.tools` field; plus the existing live write/edit/run_command case.
4. Docs: `antigravity_cli_runtime.md` names the allowlist and that unknown names are ignored by 1.5.15.

## Change Scope (Mandatory)
- In scope: UC-001: `agy-native-tool-policy.ts`, its unit test, the native-image e2e if needed, the module doc.
- Deliberately left alone: the scripted CLI's emitted tool names (older-version shapes, DEC-10 of 377); the journal; the capsule restore (existing capsules keep their text); the discovery-timeout code.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map
BEH-001: new Antigravity start → `createAgyRunCapsule` → agent.md `tools:` ← ★ `AGY_NATIVE_TOOL_NAMES` → `agy --agent …` → the agent's tool set.

## Task Design Health Assessment (Mandatory)
- Posture: `Cleanup`. Current design issue: `No` structural: one stale constant relying on an undocumented alias (Missing Invariant: the list was never checked against the CLI after the rename). Refactor needed: `No`.
- Alternatives rejected: DEC-1 (a), (c); deriving the list from the CLI at runtime (a new probe and failure mode for a list that changes once in many releases).

## Legacy Removal / Persisted Data
The older names stay deliberately (DEC-1), documented as such. No stored data changes.

## Ownership, Dependency Rules, Interfaces
Owner: `agy-native-tool-policy.ts`. No interface change.

## Change / Refactor Sequence
1. Live check on the base (the stale list's tool set, already shown in F-06). 2. The constant and tests. 3. Live check on the change. 4. Docs.

## Key Tradeoffs
An older CLI that rejects unknown names (U-1) would fail to start with the new list; the current CLI does not. The failure would be loud (the start fails), and `agy update` is the app's own advice for a too-old CLI.

## Risks
U-1; a future CLI that removes the aliases is handled by the new names being listed.

## Guidance For Implementation
- Reproduction: the stale list gives the agent the current tools only through the alias (INV-01 probe with the stale list vs the new list: same answer today; the value of the change is removing the dependence on the alias, shown by the list itself and the unit test).
- Live check is gated and adds a small synthetic conversation to the local agy history (say so). Use a scratch capsule folder and synthetic prompts; no private data.
- Do not touch the scripted CLI's emitted names or the journal.
