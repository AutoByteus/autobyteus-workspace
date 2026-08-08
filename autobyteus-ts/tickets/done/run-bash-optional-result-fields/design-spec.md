# Design Spec

## Current-State Read
The `run_bash` tool returns a `TerminalResult` object. When this object is serialized to JSON (via its `toJSON()` method) to be sent back to the LLM, it unconditionally includes all properties: `stdout`, `stderr`, `exitCode`, `timedOut`, `effectiveCwd`, and `backgroundProcesses`. For typical successful commands (like `mkdir`, `touch`, `cp`), `stdout` and `stderr` are empty strings, `timedOut` is `false`, and `backgroundProcesses` is empty. Including these default values wastes tokens in the LLM context window.

## Intended Change
Modify `TerminalResult.toJSON()` to conditionally include fields. It will omit `stdout` and `stderr` if they are empty strings, `timedOut` if it is `false`, and `backgroundProcesses` if the array is empty. `exitCode` and `effectiveCwd` will always be included.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`System`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-003, REQ-004, AC-001, AC-002 | `run_bash` tool execution | `TerminalResult.toJSON()` unconditionally includes all fields. | Omit empty/default fields from JSON serialization. | DS-001 |

## Relevant Supplemental Task Artifacts
None.

## Task Design Health Assessment (Mandatory)

- Change posture (`Performance` / `Cleanup`):
- Current design issue found (`No`):
- Root cause classification (`Local Implementation Defect`):
- Refactor needed now (`No`):
- Evidence: The issue is isolated to a single serialization method.
- Design response: Update the `toJSON()` method.
- Refactor rationale: N/A
- Intentional deferrals and residual risk, if any: N/A

## Terminology
N/A

## Design Reading Order
1. current-state read and intended change
2. relevant behavior and production-path map
3. task design-health
4. target file mapping

## Legacy Removal Policy (Mandatory)
- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: N/A (no legacy paths to remove).

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
- Decision: `Not Affected`

## Data-Flow Spine Inventory

| Spine ID | Scope (`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BEH-001 | `TerminalResult` | JSON Object | `TerminalResult` | Determines the payload sent to the LLM. |

## Primary Execution Spine(s)
`TerminalResult -> toJSON() -> JSON Object`

## Spine Narratives (Mandatory)
| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The `TerminalResult` object is serialized to a plain JSON object, omitting empty/default fields. | `TerminalResult` | `TerminalResult` | None |

## Spine Actors / Main-Line Nodes
- `TerminalResult`

## Ownership Map
- `TerminalResult`: Owns its own JSON serialization logic.

## Thin Entry Facades / Public Wrappers (If Applicable)
N/A

## Removal / Decommission Plan (Mandatory)
N/A

## Return Or Event Spine(s) (If Applicable)
N/A

## Bounded Local / Internal Spines (If Applicable)
N/A

## Off-Spine Concerns Around The Spine
N/A

## Ownership Boundaries
N/A

## Boundary Encapsulation Map
N/A

## Dependency Rules
N/A

## Interface Boundary Mapping
N/A

## Interface Boundary Check
N/A

## Main Domain Subject Naming Check
N/A

## Existing Capability / Subsystem Reuse Check
N/A

## Subsystem / Capability-Area Allocation
N/A

## Draft File Responsibility Mapping
N/A

## Reusable Owned Structures Check
N/A

## Shared Structure / Data Model Tightness Check
N/A

## Final File Responsibility Mapping
N/A

## Applied Patterns (If Any)
N/A

## Target Subsystem / Folder / File Mapping

| Path | Kind (`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/types.ts` | File | `TerminalResult` | Defines `TerminalResult` and its serialization. | Core type definition. | N/A |
| `autobyteus-ts/tests/unit/tools/terminal/types.test.ts` | File | Tests | Tests for `TerminalResult`. | Verifies serialization logic. | N/A |

## Folder Boundary Check
N/A

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| JSON Serialization | `const json: Record<string, unknown> = { exitCode: this.exitCode, effectiveCwd: this.effectiveCwd }; if (this.stdout) json.stdout = this.stdout;` | Returning an object literal with all fields unconditionally. | Shows how to conditionally build the payload. |

## Backward-Compatibility Rejection Log (Mandatory)
N/A

## Derived Layering (If Useful)
N/A

## Change / Refactor Sequence
1. Update `TerminalResult.toJSON()` in `autobyteus-ts/src/tools/terminal/types.ts`.
2. Update/add tests in `autobyteus-ts/tests/unit/tools/terminal/types.test.ts` to verify the new behavior.

## Key Tradeoffs
None.

## Risks
None.

## Guidance For Implementation
- Use a local object and conditionally assign `stdout`, `stderr`, `timedOut`, and `backgroundProcesses` before returning it in `toJSON()`.