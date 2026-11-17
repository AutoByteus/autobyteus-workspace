# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004`. It replaces the SR-001 to SR-003 design (own-definition scope), which passed architecture review ARCH-REV-002 but was withdrawn by the user's decision. The old design is in git at `cf29ff1cd8`.
- Approved requirements baseline: `requirements-doc.md` SR-004, approved by the user (2026-11-17, conversation message quoted there)
- Behavior-defining supplements: none
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/search-memory-default-tool-496/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/AGENTS.md`, `TESTING.md` (2026-11-16/17)
- Conflicts or discrepancies: none

## Current-State Read

- One rule, `buildRuntimeAgentToolExposure(names, ctx)` (`src/agent-execution/shared/runtime-agent-tool-exposure.ts`), decides every run's tools on every runtime. It takes the configured names and adds the automatic collaboration tools (`automaticCollaborationToolNames`) when the run is a member (IN-002).
  - Native reaches it through `resolveAutoByteusRuntimeAgentToolExposure`, which prepends its native defaults.
  - Claude, Codex, AGY and ACP reach it through `resolveRuntimeAgentToolExposure`.
- Native creates a requested name through the tool registry. `search_memory` is registered at every start: the memory tools are a required unit in `startup/agent-tool-loader.ts:49`. The native tool asks with its own run ID (IN-005).
- MCP runtimes enable the existing `search_memory` adapter by name. It asks with the session owner's run ID (IN-005).
- `getMemorySearch()` is created lazily in every host (`memory-search.ts:153`).
- Running runs: autobyteus-324 gives a restored run whose tools differ from its seen record one "tools updated" notice (IN-003).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one production file (`runtime-agent-tool-exposure.ts`), plus test updates (7 test files assert exact exposure name lists) and two module docs. No new owner, contract field, persistence or migration.
- Architectural risk: `Low`
- Risk rationale: the existing rule, tool, adapter and update paths carry it unchanged. The privacy effect (every agent can search every run) is a product decision the user made and accepted (requirements QR-002), not a design uncertainty.
- Escalation trigger: a runtime or run kind whose tools do not come from this rule, or a run that cannot execute `search_memory` (for example a host without the memory tools registered).

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | IN-002; callers at `a781007713` | One rule for all runtimes | Add the name there | — |
| Code read | `startup/agent-tool-loader.ts:49` | Memory tools are a required registration unit | Native creates it by name with no special case | — |
| Code read | `memory-search.ts:153-156` | Lazy singleton | Works in every host | — |
| Code read | IN-003 | Seen-names notice at restore | No new code for running runs | — |
| Command | `grep -rln "requestedToolNames).toEqual\|requestedToolNames: \["` in `tests` | 7 test files list exact names | Tests change with the rule | — |

## Intended Change

`buildRuntimeAgentToolExposure` adds `search_memory` to every exposure, deduplicated with the configured names. Nothing else changes.

## Change Scope (Mandatory)

- In scope: UC-001, UC-004. Changed: the shared exposure rule; its tests; docs `memory_search.md` (Entry Points: "An agent gets the tool only when its definition selects it" → every agent has it) and `agent_tools_mcp_server.md` (the effective set includes `search_memory` for every session).
- Derived consumers of the exposure:
  - `requestedToolNames` gains a name. `isSameRuntimeAgentToolExposure` compares names, so nothing changes there.
  - MCP catalog / `enabledTools`: enables the existing adapter.
  - Seen-tool-names notice: restored runs hear "Now available: search_memory" once (intended, REQ-003).
  - Native resolver: generic registry path.
  - The placeholder exposures (`agent-run-restore-context-factory.ts`, `codex-agent-run-context.ts`) also list it; harmless, because bootstrap replaces them.
- Deliberately left alone: the tool contract, description and result; memory search; native defaults; the agent definition and config (no switch); the editor; the Model Router (it gets the tool too).
- Follow-ups: FU-001 (privacy, deferred by the user), FU-002 (off switch), FU-003 (semantic memory default), FU-004 (memory scopes and semantic/team/global memory in search).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, AC-001, AC-002, AC-004 | Run create/restore | IN-002, IN-005 | Name added for every run; tool unchanged | DS-001 |
| BEH-006 | System | REQ-003, AC-003 | Restore after the upgrade | IN-003 | Existing notice | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`. The shared rule is the single owner of which tools a run has.
- Structural triggers:
  - *Several kinds or forms*: all runtimes and both entry forms pass through the one rule, and both forms exist today. Covered by AC-001 per form.
  - *Repeated coordination*: ruled out; one rule.
  - No new interface.
- Deliberate deviations: none
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: IN-002
- Design response: add a constant list of platform-given tools next to `automaticCollaborationToolNames`, merged into `requestedToolNames`.

## Terminology

- **Platform-given tool:** a tool the shared exposure rule adds without a `toolNames` entry. Before this change, only the collaboration tools for members; now also `search_memory` for every run.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Explicit `search_memory` entries in package configs become redundant but harmless; removing them is a package concern (autobyteus-agents), not this ticket.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`: no stored shape changes. The seen-tool-names record is updated by its existing writer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-006 | Backend create/restore | Tool available (native instance / MCP `tools/list`) | Shared exposure rule | The one place that decides tools for all runtimes |

## Primary Execution Spine(s)

`Runtime backend (loads definition) -> resolveRuntimeAgentToolExposure / resolveAutoByteusRuntimeAgentToolExposure -> buildRuntimeAgentToolExposure (configured + collaboration + platform-given) -> native registry createTool("search_memory") | MCP session enables the adapter -> agent calls search_memory -> MemorySearch.search (unchanged)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each backend resolves the run's exposure through the shared rule, which now always includes `search_memory`. Native creates it from the registry; MCP runtimes see it in `tools/list`. The search itself is unchanged. | Exposure, tool | Shared exposure rule | Seen-names notice (existing) |

## Spine Actors / Main-Line Nodes

Runtime backends; shared exposure rule; native registry / MCP session; `search_memory` (unchanged).

## Ownership Map

The shared exposure rule owns the platform-given list. No other owner changes.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

None.

## Return Or Event Spine(s) (If Applicable)

N/A (the existing autobyteus-324 paths).

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

N/A.

## Ownership Boundaries

Backends never add `search_memory` themselves; only the shared rule does.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanism | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `buildRuntimeAgentToolExposure` | Platform-given list | All backends | A backend appending the name | — |

## Dependency Rules

`runtime-agent-tool-exposure.ts` imports `SEARCH_MEMORY_TOOL_NAME` from `agent-tools/memory/memory-tool-contract.ts`. This is allowed; the module already imports other tool contracts. No new lookups.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `buildRuntimeAgentToolExposure(names, ctx)` | Tool exposure | Unchanged signature; result includes `search_memory` | — | Dedup via the existing `Set` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `buildRuntimeAgentToolExposure` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Platform-given tools | `PLATFORM_GIVEN_TOOL_NAMES` (or a function beside `automaticCollaborationToolNames`) | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Default tool for all runtimes | Shared exposure rule | Extend | Single owner |
| Running runs | Tool List Updates | Reuse | Existing notice |
| Tool execution | `search_memory` native tool and MCP adapter | Reuse | Unchanged |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| agent-execution/shared | Platform-given list | DS-001 | Extend |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

N/A (no type change).

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | agent-execution | Exposure rule | Add the platform-given `search_memory` to `requestedToolNames`; update its doc comment | Existing owner | — |
| Tests asserting exact names (7 files; find them with the grep above) | — | — | Expect `search_memory` | — | — |
| `autobyteus-server-ts/docs/modules/memory_search.md`, `agent_tools_mcp_server.md` | docs | — | State the default | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Rule | `requestedToolNames = [...new Set([...configured, ...automaticCollaborationToolNames(ctx), SEARCH_MEMORY_TOOL_NAME])]` | Appending in each backend, or in `AUTOBYTEUS_DEFAULT_TOOL_NAMES` (native only) | One rule reaches every runtime |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Plan |
| --- | --- | --- | --- |
| Removing explicit entries from package configs | Redundancy | N/A | Harmless duplicates; a package-side cleanup if wanted |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add the name in the rule, with a unit test: a definition without the tool gets it, a definition with it gets it once, a member context still gets the collaboration tools.
2. Update the tests that list exact names.
3. Native: a resolver test, or the existing factory test, shows a `search_memory` instance. MCP: a catalog/session test shows the adapter enabled for a definition without the tool.
4. A tool-list update case: a restored run whose seen record lacks `search_memory` gets the notice (AC-003), if not already covered generically.
5. Docs.

## Key Tradeoffs

- Simplicity and every agent having the tool now, versus privacy. The user chose simplicity and deferred privacy to the later memory-scope work.
- The full description (about 1,400 characters) goes into every run's tool list. It is accepted; a shorter description can come with the scope work.

## Risks

- Privacy: every agent can find every run's journals, including private runs (requirements QR-002, accepted by the user).
- The Model Router and other helpers carry the tool definition; a small prompt cost (FU-002 adds the switch).

## Guidance For Implementation

- Reproduction to start from: `None`. Start from a failing exposure test: a definition without `search_memory` → expect it in `requestedToolNames`.
- If you already wrote code for SR-003 (scope, holder, switch, filtered search), do not keep it; this package replaces it.
- Run on Node 22; run both typechecks (`pnpm -C autobyteus-server-ts typecheck`, `pnpm -C autobyteus-web typecheck`) and `pnpm -C autobyteus-server-ts test:unit`.
