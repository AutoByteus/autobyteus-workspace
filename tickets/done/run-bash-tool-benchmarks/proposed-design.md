# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Capture terminal cwd certainty changes, split file-edit tool strategy, and benchmark-driven validation model | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/run-bash-tool-benchmarks/investigation-notes.md`
- Requirements: `tickets/done/run-bash-tool-benchmarks/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Keep the existing terminal and file-tool ownership boundaries, but make the contracts more explicit:
- `run_bash` resolves a concrete cwd for each call and returns `effectiveCwd`.
- file tools use explicit file paths: either absolute or workspace-root-relative.
- `edit_file` remains patch-oriented.
- exact replacement and anchored insertion become separate first-class tools.
- scenario benchmarks score final filesystem results and collect recovery data.

## Goal / Intended Change

Increase agent reliability without inventing a new subsystem. The design extends the existing tool surfaces so the model has lower ambiguity and more recovery paths.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the temporary `edit_file` overload that tried to behave as both a patch tool and a generic text-replacement tool.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | `run_bash` resolves cwd explicitly per call | AC-001 | scenario benchmark confirms nested target execution | UC-001 |
| R-002 | `run_bash` returns `effectiveCwd` | AC-003 | result payload supports recovery | UC-001 |
| R-003 | `run_bash` schema/examples teach repeated cwd reuse | AC-001 | benchmark stays on target directory | UC-001, UC-004 |
| R-004 | `edit_file` stays patch-only | AC-002 | patch tool remains distinct from exact text tools | UC-002 |
| R-005 | exact replacement and insertion tools exist | AC-002 | fallback editing succeeds in realistic scenarios | UC-002 |
| R-006 | file tools use explicit absolute-or-workspace-root-relative paths | AC-004 | path semantics stay explicit in API mode | UC-003 |
| R-007 | edit benchmark scores final outcome | AC-002 | benchmark measures final filesystem correctness | UC-002, UC-004 |
| R-008 | diagnostics benchmark captures residual failure patterns | AC-005 | remaining misses are classified by type/content | UC-004 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Terminal and file tools already have clear ownership roots | `run-bash.ts`, `edit-file.ts`, `read-file.ts`, `write-file.ts` | None blocking |
| Current Ownership Boundaries | File tool responsibilities were blurred when `edit_file` temporarily tried to be more than a patch tool | `edit-file.ts` branch history and current reversal to patch-only | Whether relaxed patching is still needed later |
| Current Coupling / Fragmentation Problems | Exact replacement/insertion logic needed a shared helper home to avoid duplication | `text-edit-utils.ts` | None blocking |
| Existing Constraints / Compatibility Facts | API tool-call mode is the in-scope path; XML parity is deferred | current branch scope and user instruction | Future XML parity ticket |
| Relevant Files / Components | Terminal tools, file tools, API tool-call streaming, benchmark harnesses | `src/tools/*`, `src/agent/streaming/api-tool-call/*`, `tests/integration/agent/*benchmark*` | None blocking |

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent prompt | terminal result with `effectiveCwd` | `run_bash` | Captures the cwd-certainty improvement that fixed nested-directory drift |
| DS-002 | Primary End-to-End | Agent prompt | final edited file on disk | file-tool family | Captures patch-first editing with exact-text fallback |
| DS-003 | Primary End-to-End | Benchmark scenario setup | scenario validator summary | benchmark harness | Proves the branch using realistic scenarios instead of synthetic repeated calls |
| DS-004 | Bounded Local | `edit_file` invocation | fallback tool retry decision | file editing owner boundary | Captures the local recovery loop between patch, replace, and insert |

## Primary Execution / Data-Flow Spine(s)

- `Agent Prompt -> API Tool Schema -> run_bash -> resolveExecutionCwd -> TerminalSessionManager / BackgroundProcessManager -> Terminal Result (effectiveCwd)`
- `Agent Prompt -> read_file -> edit_file / replace_in_file / insert_in_file -> filesystem mutation -> readback / validator`
- `Scenario Setup -> AgentFactory -> LMStudio tool calls -> validators -> benchmark summary`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The model receives an explicit cwd contract, the terminal tool resolves one concrete execution directory, and the result echoes it back so later commands can recover instead of guessing. | agent prompt, tool schema, `run_bash`, terminal manager, terminal result | terminal tools | background-process bookkeeping |
| DS-002 | The model reads a file, selects the lightest edit primitive that fits, and can switch tools when one primitive is brittle, while the file tools keep path semantics explicit. | `read_file`, `edit_file`, `replace_in_file`, `insert_in_file`, filesystem | file tools | exact-text helper logic |
| DS-003 | A benchmark scenario creates realistic fixtures, drives the agent through the same tool surfaces users see, and scores only the final filesystem result plus categorized failures. | scenario setup, agent runtime, LM Studio, validators | benchmark harness | log filtering / diagnostics |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `run_bash` | cwd resolution, command launch contract, `effectiveCwd` result | persistent ambient directory semantics across tool calls | session is implementation detail, not semantic state |
| file-tool family | explicit file-path operations and edit primitive selection | hidden cwd resolution or mixed patch/text-edit semantics in one overloaded tool | path certainty belongs at the file-tool boundary |
| API tool-call adapters | tool argument streaming and invocation shape | filesystem mutation policy | adapters should reflect the tool split, not re-merge it |
| benchmark harnesses | realistic scenario setup and final-result scoring | production editing behavior | diagnostics stay in tests, not runtime |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| terminal cwd certainty | `src/tools/terminal/*` | Extend | Existing run-bash/session management already owns execution semantics | N/A |
| exact text replacement and insertion | `src/tools/file/*` | Extend | They are direct siblings of patch editing and share path semantics | N/A |
| benchmark reporting | `tests/integration/agent/*benchmark*` | Extend | Existing scenario harnesses already own LM Studio benchmark execution | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Terminal tools | cwd resolution, foreground/background execution results, terminal session lifecycle | DS-001 | `run_bash` | Extend | `effectiveCwd` stays in this layer |
| File tools | patch editing, exact replacement, anchored insertion, path enforcement | DS-002, DS-004 | file tool family | Extend | shared exact-text helpers stay local to this subsystem |
| API tool-call adapters | streaming argument capture and tool invocation adaptation | DS-001, DS-002 | agent runtime | Extend | patch streaming preserved for `edit_file` |
| Benchmark harnesses | scenario fixtures, validation, diagnostics summaries | DS-003 | validation/test layer | Extend | no new runtime subsystem |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - agent runtime -> tool registry -> terminal/file tools -> local helpers
  - benchmarks -> agent runtime + tool surfaces -> validators
- Authoritative public entrypoints versus internal owned sub-layers:
  - callers above the terminal subsystem use `run_bash`, not its session managers directly
  - callers above the file subsystem use `edit_file`, `replace_in_file`, `insert_in_file`, not `text-edit-utils.ts` directly
- Forbidden shortcuts:
  - no direct filesystem edits from API adapters
  - no caller dependence on both `run_bash` and terminal-session internals for the same concern
- Boundary bypasses that are not allowed:
  - upper layers should not resolve their own cwd after `run_bash` already owns that contract

## Architecture Direction Decision

- Chosen direction: `extend existing terminal/file tool boundaries with clearer contracts and additive edit primitives`
- Rationale: lower agent ambiguity, clearer recovery paths, no need for a new subsystem
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
