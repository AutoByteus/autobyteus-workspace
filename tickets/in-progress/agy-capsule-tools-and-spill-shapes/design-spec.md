# Design Spec — agy-capsule-tools-and-spill-shapes

## Solution And Approval Basis
- Revision `SR-001`; requirements approved by the Solution Designer within the direction. User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes/tickets/in-progress/agy-capsule-tools-and-spill-shapes/investigation-notes.md` (F-01…F-09). Authorities read: skill references, `DESIGN.md` (rules 4, 5, 6, 7; rule 12 does not apply), `TESTING.md`.

## Current-State Read
`agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts` exports `AGY_NATIVE_TOOL_NAMES` (eight names); `createAgyRunCapsule` writes it as `tools: […]` into the run's agent.md; the CLI treats it as an allowlist of its own registry names and shows the model `read_file`, `write_file`, `edit_file` for `view_file`, `write_to_file`, `replace_file_content` (F-05, F-06). `AgyAgentRunBackendFactory.launch` already validates the CLI's start message (agent, model, cwd, permission mode).

## Task Size And Architectural Risk
- Task size: `Small` (a check in the factory's start validation, its test, the constant's comment, the module doc). Risk: `Low` (a log line from a message the backend already validates; the list is unchanged).
- Escalation trigger: the live check shows the tool set differs from REQ-002 (a widened or reduced set).

## Data Contract
No stored or exchanged shape changes: the capsule's agent.md text changes by its `tools:` line (its hash is computed from the written text).

## Intended Change (SR-002: replaces SR-001's)
SR-001 changed the list to the alias names plus the older names. That was wrong: the list is the CLI's registry names (F-06) and a list with both a name and its alias fails to start (F-07, found by the implementation engineer before any commit). The list stays.
1. `agy-native-tool-policy.ts`: the eight names unchanged; the comment says they are the CLI's own tool names (what its start message lists in `tools`), that the CLI shows the model `read_file`/`write_file`/`edit_file` for three of them, and that a list naming both a name and its alias does not start.
2. `agy-agent-run-backend-factory.ts` (`launch`, where the start message is validated): when `init.init.tools` is an array and a name of `AGY_NATIVE_TOOL_NAMES` is not in it, log one `console.warn` `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<runId> names=<comma list>`. No `tools` field (the scripted CLI) or all present: nothing. It never throws, fails or waits. (The factory's init type gains the optional `tools`.)
3. Tests: the policy unit test keeps the exact list and adds "no alias names" (`read_file`, `write_file`, `edit_file`) and uniqueness; factory unit tests for AC-002 (missing, all present, no field).
4. Live check (AC-003): `evidence/INV-01-capsule-tools-probe.mjs` with the list written by `createAgyRunCapsule`: `init.tools` holds all eight; no warning; the agent's tools as in REQ. Adds a synthetic conversation to the local agy history (say so).
5. Docs: `antigravity_cli_runtime.md` (the allowlist is the registry's names; the alias rule; the warning).

## Change Scope (Mandatory)
- In scope: UC-001: `agy-native-tool-policy.ts` (comment), `agy-agent-run-backend-factory.ts` (the check), their unit tests, the module doc.
- Deliberately left alone: the list's content; the scripted CLI; the journal; the capsule restore; the discovery-timeout code.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map
BEH-001: new Antigravity start → `createAgyRunCapsule` → agent.md `tools:` ← ★ `AGY_NATIVE_TOOL_NAMES` → `agy --agent …` → the agent's tool set.

## Task Design Health Assessment (Mandatory)
- Posture: `Cleanup`. Current design issue: `No`. The list was never stale; the premise "stale" was an unverified reading of the model's answer (SR-001), corrected by the registry and by the implementer's probe. Refactor needed: `No`.
- Alternatives rejected: changing the list (DEC-1 a, b, d); failing the start on a missing name (a harmless rename of an unused tool would stop every run; the warning is enough because the CLI ignores such names and the others still work).

## Legacy Removal / Persisted Data
The older names stay deliberately (DEC-1), documented as such. No stored data changes.

## Ownership, Dependency Rules, Interfaces
Owner: `agy-native-tool-policy.ts`. No interface change.

## Change / Refactor Sequence
1. Live check on the base (the stale list's tool set, already shown in F-06). 2. The constant and tests. 3. Live check on the change. 4. Docs.

## Key Tradeoffs
A warning, not a failure: a CLI that dropped a needed tool still starts, and the log says why the agent lacks it.

## Risks
The start message's `tools` field is the CLI's undocumented output: absent or reshaped ⇒ no warning (a quiet miss, not a break).

## Guidance For Implementation
- Revert the uncommitted edit of the list (constant content, the "eight names" test and the doc lines for the 11-name list); keep your probe evidence commits (IMP-02, IMP-03).
- Reproduction/live: `evidence/INV-01-capsule-tools-probe.mjs` and your IMP probes (the registry check is `init.tools`).
- Synthetic data only; the live check adds a small conversation to the local agy history.
- Do not touch the scripted CLI's emitted names or the journal.
