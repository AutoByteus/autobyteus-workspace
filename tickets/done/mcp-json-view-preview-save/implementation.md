# Implementation: MCP JSON View Preview/Save Source-of-Truth UX

## Scope Classification

- Classification: `Small`
- Reasoning: The issue is localized to one frontend component's input-source selection and JSON normalization behavior, plus focused component tests and a small documentation update. No backend schema, persistence, or runtime architecture changes are planned.
- Workflow Depth: `Small` -> solution sketch in this file -> future-state runtime call stack -> future-state runtime call stack review -> finalize baseline -> implementation execution.

## Upstream Artifacts

- Workflow state: `tickets/in-progress/mcp-json-view-preview-save/workflow-state.md`
- Investigation notes: `tickets/in-progress/mcp-json-view-preview-save/investigation-notes.md`
- Requirements: `tickets/in-progress/mcp-json-view-preview-save/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/mcp-json-view-preview-save/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/mcp-json-view-preview-save/future-state-runtime-call-stack-review.md`
- Proposed design: N/A for Small scope.

## Document Status

- Current Status: `In Execution`
- Version: `v1`
- Last Updated: 2026-06-18 07:40:20 CEST
- Notes: Stage 5 reached `Go Confirmed`; workflow-state is Stage 6 with source edits unlocked. This artifact is the Stage 6 baseline plus live execution tracker.

## Plan Baseline (Freeze Until Replanning)

### Preconditions

- `requirements.md` is at least `Design-ready`: Yes
- Acceptance criteria use stable IDs with measurable outcomes: Yes (`AC-001` through `AC-010`)
- `workflow-state.md` is current: Yes, Stage 6 active
- Runtime call stack review artifact exists and is current: Yes (`future-state-runtime-call-stack-review.md`)
- Future-state runtime call stack review has `Go Confirmed`: Yes, clean streak 2

### Solution Sketch

#### Use Cases In Scope

- `UC-001`: JSON View Preview
- `UC-002`: JSON View Save
- `UC-003`: Form View Preview/Save unchanged
- `UC-004`: JSON View validation errors
- `UC-005`: Optional JSON-to-form conversion

#### Spine Inventory In Scope

| spine_id | Scope | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks Preview/Save in `McpServerFormModal.vue` | Pinia store receives correct `McpServerInput` and backend action is invoked | `McpServerFormModal.vue` as active-input owner | This is the business UX path being fixed. |
| DS-002 | Bounded Local | JSON textarea content | Validated/normalized `McpServerInput` or recoverable error | `McpServerFormModal.vue` JSON parser/normalizer | Prevents stale form fallback and supports standard MCP JSON shapes. |
| DS-003 | Primary End-to-End | User clicks Apply JSON to Form | Form View populated and active tab switches to form | `McpServerFormModal.vue` conversion action | Keeps conversion optional while preserving existing feature. |

#### Primary Owners / Main Domain Subjects

- `McpServerFormModal.vue` owns active-view selection, form state, JSON state, JSON normalization for single-server modal actions, and UI feedback.
- `toolManagementStore.ts` remains the authoritative boundary for GraphQL preview/save side effects and loading/preview-result state.
- Backend GraphQL and persistence remain unchanged.

#### Target Architecture Shape

- Introduce a local active-input payload builder in `McpServerFormModal.vue`:
  - `buildInputFromForm()` or keep existing `buildInput()` for Form View.
  - `parseJsonServerEntry()` / `buildInputFromJson()` for JSON View.
  - `buildActiveInput()` or equivalent action helper that selects Form vs JSON based on `activeTab`.
- Reuse JSON parsing/normalization for:
  - `runPreview()` when active tab is JSON.
  - `save()` when active tab is JSON.
  - `applyJsonToForm()` before switching to Form View.
- JSON parser rules:
  - Require top-level object with `mcpServers` object.
  - Require exactly one server entry for the single-server modal.
  - New mode uses the JSON map key as `serverId`; edit mode uses existing `props.server.serverId`.
  - Accept `transportType` or `transport_type` values case-insensitively and normalize hyphen/underscore conventions.
  - If no explicit transport exists, infer `STREAMABLE_HTTP` when `url` is a non-empty string, else infer `STDIO` when `command` is a non-empty string, else error.
  - Accept `toolNamePrefix` and `tool_name_prefix`.
  - STDIO requires non-empty `command`; pass `args`, `env`, `cwd` if present.
  - HTTP requires non-empty `url`; pass `token` and `headers` if present.
- Error handling:
  - JSON active actions never fall back to form state on parse/validation errors.
  - Preview should set/emit a recoverable error in the existing preview result area when possible.
  - Save should emit existing toast error and avoid calling store action.

#### New Owners/Boundary Interfaces To Introduce

- No new subsystem or backend boundary.
- A local component-level parser function is sufficient and owned by `McpServerFormModal.vue` because there is no repeated JSON normalization use outside this component in scope.

#### API/Behavior Delta

- Preview from JSON View now parses current `jsonInput` and calls `store.previewMcpServer(payload)`.
- Save from JSON View parses current `jsonInput` and calls `store.configureMcpServer(payload)`.
- Apply JSON to Form remains optional and continues to populate form state.
- Form View behavior remains unchanged.
- Disk persistence remains unchanged through existing backend mutation path.

#### Key Assumptions

- Single-server modal JSON View should reject multi-server payloads and direct users to Bulk Import.
- Existing edit-mode server ID preservation is required.
- Tests can mock the Pinia store actions and inspect payloads.

#### Known Risks

- `McpServerFormModal.vue` is already moderately large. Keep changes localized and avoid turning parser logic into a broad utility unless size/ownership pressure demands it.
- Worktree lacks `node_modules`; test execution may require using workspace root dependencies or installing/linking dependencies.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: Round 2
  - Clean streak at final round: 2
  - Final review gate line: `Implementation can start: Yes` in `future-state-runtime-call-stack-review.md`

### Principles

- Use current component/store boundaries; do not bypass `toolManagementStore.ts` or backend GraphQL contracts.
- No storage migration and no compatibility branch for stale form fallback in JSON View.
- Keep errors recoverable and explicit.
- Preserve active-view source-of-truth semantics.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-002 | `McpServerFormModal.vue` | Implement JSON parser/normalizer and active input builder | Stage 5 Go Confirmed | Foundation for JSON preview/save/apply. |
| 2 | DS-001 | `McpServerFormModal.vue` | Update preview/save handlers to use active input | Parser/normalizer | User-facing behavior. |
| 3 | DS-003 | `McpServerFormModal.vue` | Update Apply JSON to Form to reuse parser | Parser/normalizer | Keeps optional conversion consistent. |
| 4 | DS-001/DS-002/DS-003 | `McpServerFormModal.spec.ts` | Add durable component tests | Implementation | Validates acceptance criteria. |
| 5 | DS-001 | `tools_and_mcp.md` | Update docs if behavior changed | Implementation/tests | Long-lived docs truthfulness. |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Modal behavior | `autobyteus-web/components/tools/McpServerFormModal.vue` | same | Tools/MCP frontend UI | Keep/Modify | Component tests + code review |
| Modal tests | none | `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | Tools/MCP frontend UI tests | Create | Vitest targeted run |
| Docs | `autobyteus-web/docs/tools_and_mcp.md` | same | Frontend Tools/MCP docs | Modify if needed | Docs sync review |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-002 | Modal JSON parser | Parse/normalize visible JSON to `McpServerInput` | `autobyteus-web/components/tools/McpServerFormModal.vue` | same | Modify | Stage 5 | Completed | `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | Passed | N/A | N/A | Planned | Supports standard MCP JSON and aliases. |
| C-002 | DS-001 | Modal action handlers | Preview/save use active input view | `autobyteus-web/components/tools/McpServerFormModal.vue` | same | Modify | C-001 | Completed | same | Passed | N/A | N/A | Planned | Eliminates stale form fallback in JSON View. |
| C-003 | DS-003 | Optional conversion action | Apply JSON to Form reuses parser | `autobyteus-web/components/tools/McpServerFormModal.vue` | same | Modify | C-001 | Completed | same | Passed | N/A | N/A | Planned | Conversion remains optional. |
| C-004 | DS-001/DS-002/DS-003 | Test coverage | Component tests for active-view behavior | none | `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | Create | C-001-C-003 | Completed | same | Passed | N/A | N/A | Planned | Durable validation asset. |
| C-005 | DS-001 | Documentation | Update workflow docs | `autobyteus-web/docs/tools_and_mcp.md` | same | Modify | C-001-C-004 | Planned | N/A | N/A | N/A | N/A | Planned | Stage 9 owns exact docs sync after validation/review. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002, AC-003 | DS-001 | Target Architecture Shape | UC-001, UC-002, UC-003 | C-001-C-004 | Component tests | SCN-001-SCN-003 |
| R-002 | AC-001, AC-003 | DS-001 | API/Behavior Delta | UC-001, UC-003 | C-002, C-004 | Component tests | SCN-001, SCN-003 |
| R-003 | AC-002, AC-003 | DS-001 | API/Behavior Delta | UC-002, UC-003 | C-002, C-004 | Component tests | SCN-002, SCN-003 |
| R-004 | AC-008 | DS-001 | Target Architecture Shape | UC-002 | C-002, C-005 | Static diff/docs | SCN-006 |
| R-005 | AC-010 | DS-003 | Target Architecture Shape | UC-005 | C-003, C-004 | Component tests | SCN-008 |
| R-006 | AC-004, AC-005, AC-006 | DS-002 | JSON parser rules | UC-001, UC-002 | C-001, C-004 | Component tests | SCN-004, SCN-006 |
| R-007 | AC-007 | DS-002 | Error handling | UC-004 | C-001, C-004 | Component tests | SCN-005 |
| R-008 | AC-009 | DS-002 | JSON parser rules | UC-001, UC-002 | C-001, C-004 | Component tests | SCN-007 |

### Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001/R-002 | DS-001/DS-002 | JSON preview calls store with JSON-derived STDIO payload | SCN-001 | Component/unit | Planned |
| AC-002 | R-001/R-003 | DS-001/DS-002 | JSON save calls store with JSON-derived payload | SCN-002 | Component/unit | Planned |
| AC-003 | R-001/R-002/R-003 | DS-001 | Form preview/save remain form-derived | SCN-003 | Component/unit | Planned |
| AC-004/AC-005/AC-006 | R-006 | DS-002 | JSON shape and alias support | SCN-004/SCN-006 | Component/unit | Planned |
| AC-007 | R-007 | DS-002 | Invalid JSON blocks stale form fallback | SCN-005 | Component/unit | Planned |
| AC-008 | R-004 | DS-001 | Persistence/schema unchanged | SCN-006 | Static/diff | Planned |
| AC-009 | R-008 | DS-002 | Edit mode ID preserved | SCN-007 | Component/unit | Planned |
| AC-010 | R-005 | DS-003 | Optional conversion remains working | SCN-008 | Component/unit | Planned |

### Step-By-Step Plan

1. After Stage 5 Go Confirmed, implement local JSON parser/normalizer in `McpServerFormModal.vue`.
2. Route `runPreview()` through active input builder; JSON errors set preview error without store call.
3. Route `save()` through active input builder; JSON errors emit toast without store call.
4. Route `applyJsonToForm()` through the same parser so conversion semantics match preview/save.
5. Add component tests for JSON preview/save, HTTP inference, invalid JSON, edit-mode ID preservation, optional conversion, and Form View regression.
6. Run targeted validation and update docs/handoff artifacts.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`; stale form fallback in JSON View should be removed.
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No` planned.
- Shared data structures remain tight: `Yes`; no shared structure planned.
- Authoritative Boundary Rule preserved: `Yes`; component uses store boundary for side effects.
- New tight coupling or cyclic dependency introduced: `No` planned.
- Changed source implementation files kept within proactive size-pressure guardrails: Yes; `McpServerFormModal.vue` has 499 effective non-empty lines and 219 changed lines (155 additions, 64 deletions), below both Stage 8 thresholds.

## Execution Tracking

### Kickoff Preconditions Checklist

- Workflow state is current: Yes
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: Yes
- Scope classification confirmed: Small
- Investigation notes are current: Yes
- Requirements status is `Design-ready`: Yes
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: Yes
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean rounds: Yes
- No unresolved blocking findings: Yes

### Progress Log

- 2026-06-18 07:32:51 CEST: Stage 3 small-scope design basis drafted. Source edits remain locked.
- 2026-06-18 07:40:20 CEST: Stage 6 baseline finalized after Stage 5 Go Confirmed; source edits are unlocked in workflow-state.
- 2026-06-18 07:46:10 CEST: Implemented JSON View parser/active-input preview-save behavior and component tests. Targeted Vitest passed: `pnpm test:nuxt run components/tools/__tests__/McpServerFormModal.spec.ts` (7 tests).


### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001-C-004 | N/A | No | None | Not Needed | Not Needed | 2026-06-18 07:45:48 CEST | `pnpm test:nuxt run components/tools/__tests__/McpServerFormModal.spec.ts` | 7 component tests passed. Component effective non-empty line count is 499, under the Stage 8 hard limit. |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/mcp-json-view-preview-save/api-e2e-testing.md` | Passed | 2026-06-18 07:49:23 CEST | All AV scenarios passed; targeted Vitest 7 tests. |
| 8 Code Review | `tickets/in-progress/mcp-json-view-preview-save/code-review.md` | Pass | 2026-06-18 07:51:39 CEST | Round 1 passed; all scorecard categories >= 9.0. |
| 9 Docs Sync | `tickets/in-progress/mcp-json-view-preview-save/docs-sync.md` | Updated | 2026-06-18 07:53:16 CEST | `autobyteus-web/docs/tools_and_mcp.md` updated. |
