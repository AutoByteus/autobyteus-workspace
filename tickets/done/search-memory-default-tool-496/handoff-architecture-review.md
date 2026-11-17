# Handoff: Architecture Design Complete: search-memory-default-tool-496

- Package: `search-memory-default-tool-496`; Project Task `autobyteus-496` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the founder
- Status: `Architecture Design Complete`, SR-003 (resolves ARCH-REV-001: AR-001, AR-002; adopts AR-003, AR-004); requirements `Approved` (Solution Designer within the direction, user and PM informed)
- Classification: `task_size=Medium`, `architectural_risk=High` → independent architecture review (handoff rule: Large or High)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496`, branch `codex/search-memory-default-tool-496`, base `origin/personal` @ `a781007713` (re-based 2026-11-17 from `1e8b6e5d0a`, SR-002); finalization target `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496/tickets/in-progress/search-memory-default-tool-496/`

## Original request (summary)

The founder: make `search_memory` a default tool for every agent, built into the platform rather than configured per package; do it now as a small change. Never expose the founder's private data to other agents; if search would, tell the PM and the founder before shipping. Choices within the direction are the team's: default on with a per-agent off switch, minimal prompt text, no change to running conversations' prompts. Releases only on his word.

## Result in short

- **Default:** every run on every runtime gets `search_memory` through the shared tool-exposure rule. `memorySearchEnabled: false` in agent-config.json switches it off; the Model Router ships off.
- **Scope:**
  - default: the agent's own definition's runs;
  - explicit listing in `toolNames`: the whole node, as today (preserved; FU-001 for the founder).
- **Privacy:** filtering happens inside the text query, the meaning query and the per-word existence check. No result, snippet, `wordsNotFound` or `note` reflects runs outside the scope. Unknown-definition runs are excluded.
- **Scope delivery:**
  - MCP runtimes read `session.runtimeExposure.memorySearchScope` at call time;
  - native reads a per-run exposure holder that `applyDefinitionTools` updates, because `replaceTools` keeps instances by name.
- **Prompt:** no system-prompt text; one scope-neutral description of 794 characters (≤ 900); the result names the `scope`.
- **Running runs:** the existing autobyteus-324 paths. Restored runs get the tool and the one-line notice. A definition change applies live, including a scope-only change, which is now part of exposure equality.
- **Data:** `MemoryRun.agentDefinitionId` (moved from the `AGENT` subject). The index is disposable and the start catch-up rewrites records. No migration.

## Points for the reviewer

1. The single-tool, two-scope choice (explicit listing = node). Alternatives are in requirements DEC-002 and design Key Tradeoffs.
2. The native exposure holder as the answer to kept instances (design Off-Spine Concerns; AC-009).
3. `MemorySearch.search` `scope` required (no default), and the store/embedding filter shapes.
4. ASM-001: member definition IDs (escalation trigger).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md` (in the ticket folder)

## Open items

- FU-001 (urgent, the founder's decision; already sent to the PM): explicit agents' node-wide search reaches private runs today.
- FU-002 (editor toggle) and FU-003 (semantic memory default) are not blocking.
- Release: only on the founder's word.

## Route record

- `get_handoff_rules` → rule "Large or High" → `/software_engineering_team/architecture_reviewer`

## Revision for re-review (SR-003)

- AR-001: the definition readers (`agent-definition-node-reader.ts`, `application-owned-agent-source.ts`) pass `memorySearchEnabled`. `cloneRuntimeExposure` copies `memorySearchScope` (frozen). The field is required. Save keeps the key, via `cloneAgent`. A node-reader + save test is in the guidance. See design-spec Change Scope § Derived consumers and Final File mapping.
- AR-002: under own scope, `coverage` has no node-wide counts; node scope is unchanged (design DS-002 narrative; requirements AC-003 clarified).
- AR-003: holder written before `replaceTools` (DS-004, Concrete Examples).
- AR-004: the builder takes the scope; `memorySearchScopeOf` is the only rule; invariant enforced (Interface mapping).
- Residual risks from the report: the picker widening and the shared-definition note are added to FU-001; the `wordsNotFound` asking-run note is added to the docs in sequence step 6.
