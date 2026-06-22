# Implementation: MCP Nullable Schema Mapping

## Scope Classification

- Classification: Small
- Reasoning: The root cause is localized to the TypeScript MCP schema mapper and its existing unit-test owner. No new service boundary, API endpoint, persistence contract, or UI path is required.
- Workflow Depth: Small -> solution sketch in this `implementation.md` -> future-state runtime call stack -> two-round future-state review -> Stage 6 source implementation.

## Upstream Artifacts

- Workflow state: `tickets/done/mcp-nullable-schema-mapping/workflow-state.md`
- Investigation notes: `tickets/done/mcp-nullable-schema-mapping/investigation-notes.md`
- Requirements: `tickets/done/mcp-nullable-schema-mapping/requirements.md`
  - Current Status: Design-ready
- Runtime call stacks: `tickets/done/mcp-nullable-schema-mapping/future-state-runtime-call-stack.md` (Stage 4)
- Future-state runtime call stack review: `tickets/done/mcp-nullable-schema-mapping/future-state-runtime-call-stack-review.md` (Stage 5)
- Proposed design: N/A for Small scope.

## Document Status

- Current Status: In Execution
- Notes: Stage 5 review gate reached Go Confirmed. Stage 6 implementation can start after workflow-state unlock.

## Plan Baseline (Freeze Until Replanning)

### Preconditions Before Final Baseline

- `requirements.md` is Design-ready: Yes
- Acceptance criteria use stable IDs: Yes (`AC-001` through `AC-005`)
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: Yes
- Runtime call stack review artifact exists and is current: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes Yes
- Future-state runtime call stack review has `Go Confirmed`: Yes

### Solution Sketch (Small Scope Design Basis)

#### Use Cases In Scope

- UC-001: nullable MCP arrays (`input_images`, `input_audios`, `input_videos`) map to arrays and re-emit as arrays.
- UC-002: nullable MCP object (`generation_config`) maps to object and re-emits as object.
- UC-003: existing direct type schemas continue to map as before.
- UC-004: complex multi-non-null unions are not guessed into an arbitrary branch.
- UC-005: JSON Schema `type: ["array", "null"]` shorthand maps to array.

#### Spine Inventory In Scope

| spine_id | Scope | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Configured MCP `tools/list` JSON Schema property | Agent Tools MCP-exposed input schema + local validation | `McpSchemaMapper` as schema translation owner | The broken path corrupts nullable array/object schemas before they reach Agent Tools MCP exposure. |
| DS-002 | Bounded Local | One MCP property schema | Effective schema used by `ParameterDefinition` | Nullable schema resolver inside `McpSchemaMapper` | The fix must resolve nullable single-type unions without changing complex union behavior. |
| DS-003 | Validation | Mapper input fixture | Unit-test assertions and `toJsonSchema()` output | Mapper unit test suite | Durable regression coverage proves the MCP schema stays array/object. |

#### Primary Owners / Main Domain Subjects

- MCP JSON Schema property: external contract from configured MCP server.
- TypeScript MCP schema mapper: authoritative boundary converting MCP JSON Schema into AutoByteus `ParameterSchema`.
- AutoByteus `ParameterSchema`: internal contract used for tool exposure and validation.
- Agent Tools MCP catalog: downstream exposure surface; should remain unchanged and simply re-emit the corrected schema.

#### Target Architecture Shape

Keep the existing mapper ownership. Add a small private resolver inside `McpSchemaMapper` that computes an effective property schema before type-specific mapping:

1. If property has direct `type: "array"` / `"object"` / primitive, use existing path.
2. If property has `anyOf` or `oneOf` with exactly one non-null object branch and all other branches are `null`, use the non-null branch as the effective schema while preserving outer metadata such as `description` and `default`.
3. If property has `type: ["array", "null"]` or another single non-null JSON Schema type array, use the non-null type as the effective type while preserving the rest of the property schema.
4. If property is a complex union with more than one non-null branch, do not choose a branch. Preserve existing conservative behavior (fallback to string) until AutoByteus has explicit union support.

No new subsystem is needed. The resolver is a mapper-local off-spine concern serving DS-002; extracting it into a separate file would be empty indirection for this scope.

#### New Owners/Boundary Interfaces To Introduce

- None. Add private helper methods/types within `autobyteus-ts/src/tools/mcp/schema-mapper.ts` only.

#### API / Behavior Delta

- Nullable array/object MCP schemas now map to array/object instead of string.
- Re-emitted Agent Tools MCP schemas inherit corrected AutoByteus `ParameterSchema` types through existing `toJsonSchema()` paths.
- Direct simple schema behavior remains unchanged.
- Complex multi-non-null unions remain intentionally unsupported by this mapper and keep conservative fallback behavior.

#### Key Assumptions

- The correct MCP representation for optional array inputs is a nullable array union, not a scalar string.
- Nested `additionalProperties` need not be explicitly re-emitted for object parameters to be permissive; absence of `additionalProperties` defaults to allowed in JSON Schema.
- Existing `ParameterSchema` has no union type; therefore only safe nullable single-type unwrapping is in scope.

#### Known Risks

- If future MCP tools need true multi-type unions, this local resolver is insufficient by design and should be replaced by explicit union support in `ParameterSchema`.
- The analogous Python mapper remains a parity follow-up outside this ticket's active TypeScript fix.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: Go
- Evidence:
  - Final review round: 2
  - Clean streak at final round: 2
  - Final review gate line: `Implementation can start: Yes` in `future-state-runtime-call-stack-review.md`
- If No-Go, required refinement target: N/A

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| TypeScript MCP schema mapper | `autobyteus-ts/src/tools/mcp/schema-mapper.ts` | same | MCP JSON Schema -> AutoByteus `ParameterSchema` translation | Keep/Modify | Unit tests + source review |
| Mapper unit tests | `autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts` | same | Durable mapper behavior coverage | Keep/Modify | Vitest targeted run |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001, DS-002 | `McpSchemaMapper` | Resolve nullable single-type `anyOf`/`oneOf` and array `type` shorthand before mapping | `autobyteus-ts/src/tools/mcp/schema-mapper.ts` | same | Modify | Stage 5 Go Confirmed | Completed | `autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts` | Passed | N/A | N/A | Planned | Added mapper-local nullable union and type-array resolution helpers. |
| C-002 | DS-003 | Mapper tests | Regression tests for nullable arrays/objects/type-array shorthand and complex union fallback | `autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts` | same | Modify | C-001 | Completed | same | Passed | N/A | N/A | Planned | Covers AC-001 through AC-005. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002, AC-005 | DS-001, DS-002 | Solution Sketch | UC-001, UC-002, UC-005 | C-001, C-002 | Vitest mapper tests | SCN-001, SCN-002, SCN-005 |
| R-002 | AC-001, AC-002, AC-005 | DS-002 | Solution Sketch | UC-001, UC-002, UC-005 | C-001, C-002 | Vitest mapper tests | SCN-001, SCN-002, SCN-005 |
| R-003 | AC-003 | DS-003 | Solution Sketch | UC-003 | C-002 | Existing mapper tests | SCN-003 |
| R-004 | AC-004 | DS-002, DS-003 | Solution Sketch | UC-004 | C-001, C-002 | Vitest mapper tests | SCN-004 |
| R-005 | AC-001..AC-005 | DS-003 | Test Strategy | UC-001..UC-005 | C-002 | Vitest mapper tests | SCN-001..SCN-005 |

### Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001/R-002/R-005 | DS-001/DS-002/DS-003 | Nullable array maps/re-emits as array with string items | SCN-001 | Other: Unit executable validation | Planned |
| AC-002 | R-001/R-002/R-005 | DS-001/DS-002/DS-003 | Nullable object maps/re-emits as object | SCN-002 | Other: Unit executable validation | Planned |
| AC-003 | R-003 | DS-003 | Existing direct mapping tests pass | SCN-003 | Other: Unit executable validation | Planned |
| AC-004 | R-004/R-005 | DS-002/DS-003 | Complex multi-non-null unions are not guessed | SCN-004 | Other: Unit executable validation | Planned |
| AC-005 | R-001/R-002/R-005 | DS-002/DS-003 | `type: ["array", "null"]` maps as array | SCN-005 | Other: Unit executable validation | Planned |

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: None
- Legacy code retained for old behavior: No
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: No expected removals needed
- Shared data structures remain tight: Yes, no new shared structures
- Authoritative Boundary Rule preserved: Yes, Agent Tools MCP catalog continues depending on the mapper-owned `ParameterSchema` boundary
- Decoupling impact assessment completed: Yes
- New tight coupling or cyclic dependency introduced: No
- Changed source implementation files expected below size/delta guardrails: Yes; final measurement in Stage 8

### Test Strategy

- Unit tests: targeted Vitest run for `autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts`.
- Integration tests: N/A for Stage 6 because the mapper behavior is unit-level and downstream Agent Tools MCP exposure uses existing `ParameterSchema.toJsonSchema()` boundary. Stage 7 will record executable validation using the same durable tests plus a post-fix direct schema re-emission probe if needed.
- Known environment constraints: this fresh worktree needs Node dependencies installed before Vitest can run.

## Execution Tracking

### Kickoff Preconditions Checklist

- Workflow state current: Yes, Stage 3 active
- `workflow-state.md` shows Current Stage = 6 and Code Edit Permission = Unlocked before source edits: Yes
- Scope classification confirmed: Small
- Investigation notes current: Yes
- Requirements status Design-ready or Refined: Yes
- Future-state runtime call stack review final gate Implementation can start: Yes
- No unresolved blocking findings: Yes Yes

### Progress Log

- 2026-06-22: Stage 3 small-scope design-basis solution sketch created. Source edits remain locked.
- 2026-06-22: Stage 5 review gate reached Go Confirmed; implementation baseline ready for Stage 6 unlock.
- 2026-06-22: Implemented nullable MCP schema resolution in `schema-mapper.ts` and added mapper unit regression coverage.
- 2026-06-22: Validation passed: `pnpm --filter autobyteus-ts exec vitest run tests/unit/tools/mcp/schema-mapper.test.ts` (11 tests) and `pnpm --filter autobyteus-ts build`.
- 2026-06-22: Post-fix dist probe emitted `input_images` as `type=array` and `generation_config` as `type=object`.
- 2026-06-22: Stage 6 source size guardrails checked: `schema-mapper.ts` has 148 effective non-empty lines; working-tree diff is 89 additions / 11 deletions for source, below >500 and >220 thresholds.

### Stage 6 Completion Evidence

- Source implementation files changed:
  - `autobyteus-ts/src/tools/mcp/schema-mapper.ts`
- Durable test files changed:
  - `autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts`
- Commands run:
  - `pnpm install --filter autobyteus-ts --frozen-lockfile`
  - `pnpm --filter autobyteus-ts exec vitest run tests/unit/tools/mcp/schema-mapper.test.ts` -> Passed, 11 tests
  - `pnpm --filter autobyteus-ts build` -> Passed, `[verify:runtime-deps] OK`
  - Post-build Node probe importing `autobyteus-ts/dist/tools/mcp/schema-mapper.js` -> `input_images: type=array`, `generation_config: type=object`
- Integration tests: N/A at Stage 6; this is mapper-local behavior with Stage 7 executable validation using durable unit coverage and post-build schema probe.
- No backward-compatibility shims introduced: Yes
- No legacy behavior branches retained in scope: Yes
- Ownership-driven dependencies preserved: Yes
- File placement preserved: Yes
- Proactive Stage 8 size/delta pressure handled: Yes (`schema-mapper.ts` 148 effective non-empty lines; source diff 89 additions / 11 deletions)

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/mcp-nullable-schema-mapping/api-e2e-testing.md` | Passed | 2026-06-22 | Durable mapper unit tests, build, and post-build schema probe passed. |
| 8 Code Review | `tickets/done/mcp-nullable-schema-mapping/code-review.md` | Pass | 2026-06-22 | Stage 8 review passed with all scorecard categories >= 9.0. |
| 9 Docs Sync | `tickets/done/mcp-nullable-schema-mapping/docs-sync.md` | Updated | 2026-06-22 | Updated `autobyteus-ts/docs/tool_schema_and_configuration.md`. |
