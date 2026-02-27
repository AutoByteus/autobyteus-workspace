# Implementation Plan

## Scope Classification

- Classification: `Large`
- Reasoning: cross-package contract change across runtime core, server integration, processors, GraphQL projection, and tests.
- Workflow Depth: `Large` -> proposed design -> runtime call stack -> iterative review -> implementation plan/progress -> API/E2E -> code review -> docs sync.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/simplify-agent-workspace-to-path-string/workflow-state.md`
- Investigation notes: `tickets/in-progress/simplify-agent-workspace-to-path-string/investigation-notes.md`
- Requirements: `tickets/in-progress/simplify-agent-workspace-to-path-string/requirements.md` (`Design-ready`)
- Runtime call stacks: `tickets/in-progress/simplify-agent-workspace-to-path-string/future-state-runtime-call-stack.md` (`v1`)
- Runtime review: `tickets/in-progress/simplify-agent-workspace-to-path-string/future-state-runtime-call-stack-review.md` (`Go Confirmed`)
- Proposed design: `tickets/in-progress/simplify-agent-workspace-to-path-string/proposed-design.md` (`v1`)

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 gate is `Go Confirmed` with two clean rounds and no re-entry.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `Round 2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-ts/src/agent/context/*` + `agent/factory/agent-factory.ts` | none | Establish root runtime contract first |
| 2 | `autobyteus-ts/src/tools/{file,terminal,multimedia}/*` | Order 1 | Tool path behavior depends on new context field |
| 3 | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Order 1 | Pass root path string into runtime config |
| 4 | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Order 1 | Align team member runtime config |
| 5 | `autobyteus-server-ts/src/agent-customization/processors/**/*workspace*` | Order 1,2 | Processors consume runtime context contract |
| 6 | `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts` | Order 3,4 | Preserve active-run workspace visibility |
| 7 | impacted tests in both packages | Orders 1-6 | Verify migrated contract and behavior |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| FR-001, FR-002 | AC-001 | C-001/C-002 | UC-001, UC-004 | P-001, P-002 | `autobyteus-ts` unit/integration | AV-001, AV-002 |
| FR-003 | AC-002 | C-003 | UC-002, UC-003 | P-003 | tool unit/integration tests | AV-003, AV-004 |
| FR-004 | AC-003 | C-004/C-005 | UC-001, UC-004 | P-004, P-005 | server run manager tests | AV-005, AV-006 |
| FR-005 | AC-004 | C-006 | UC-002 | P-006 | processor tests | AV-007, AV-008 |
| FR-006 | AC-005 | C-007 | UC-005 | P-007 | GraphQL converter tests | AV-009 |
| FR-007 | AC-006 | workspace subsystem preserved | UC-005 | P-008 | workspace API smoke checks | AV-010 |
| NFR-001..003 | AC-007 | cross-cutting | UC-001..UC-005 | P-009 | package typecheck + targeted suites | AV-011 |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | FR-001, FR-002 | Runtime context/state/config string-root contract in effect | AV-001, AV-002 | API/E2E | Planned |
| AC-002 | FR-003 | Tools resolve root-relative paths correctly | AV-003, AV-004 | API/E2E | Planned |
| AC-003 | FR-004 | Run managers pass root path string and preserve fallback behavior | AV-005, AV-006 | API/E2E | Planned |
| AC-004 | FR-005 | Processor path sanitization/normalization protections preserved | AV-007, AV-008 | API/E2E | Planned |
| AC-005 | FR-006 | Active run GraphQL workspace payload remains populated | AV-009 | API | Planned |
| AC-006 | FR-007 | Workspace subsystem behavior unaffected | AV-010 | E2E | Planned |
| AC-007 | NFR-001..003 | Targeted compile/tests pass | AV-011 | API | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | P-001 | Yes | Unit + integration + AV-001 |
| C-002 | Remove/Modify | P-002 | Yes | Unit |
| C-003 | Modify | P-003 | Yes | Unit + integration + AV-003/004 |
| C-004 | Modify | P-004 | No | Unit/integration + AV-005 |
| C-005 | Modify | P-005 | No | Unit/integration + AV-006 |
| C-006 | Modify | P-006 | No | Unit/integration + AV-007/008 |
| C-007 | Modify | P-007 | No | API + AV-009 |
| C-008 | Modify | P-008/P-009 | No | Full targeted validation |

## Step-By-Step Plan

1. P-001: Refactor runtime context/state/config and factory plumbing to `workspaceRootPath`.
2. P-002: Remove workspace-context injection behavior from bootstrap step.
3. P-003: Migrate file/terminal/multimedia tools to root-path-string resolution.
4. P-004: Update agent run manager to resolve root path before runtime config construction.
5. P-005: Update team run manager to resolve per-member root path before runtime config construction.
6. P-006: Update security/prompt/media processors to use `workspaceRootPath` while preserving safety checks.
7. P-007: Update GraphQL active-run converter to project workspace without runtime workspace object.
8. P-008: Update/add tests covering contract migration and behavior continuity.
9. P-009: Run targeted verification commands and record outcomes.

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | FR-001, FR-002 | UC-001 | API | Agent run API path uses string-root runtime contract and creates runs successfully. |
| AV-002 | Requirement | AC-001 | FR-001, FR-002 | UC-004 | E2E | Team run member config path works with string-root runtime contract. |
| AV-003 | Requirement | AC-002 | FR-003 | UC-002 | API | File/media tools resolve relative paths against root path. |
| AV-004 | Requirement | AC-002 | FR-003 | UC-003 | E2E | Terminal tool cwd selection honors root path and fallback behavior. |
| AV-005 | Requirement | AC-003 | FR-004 | UC-001 | API | Agent run manager passes resolved root path and temp fallback remains valid. |
| AV-006 | Requirement | AC-003 | FR-004 | UC-004 | API | Team run manager passes resolved member root paths. |
| AV-007 | Requirement | AC-004 | FR-005 | UC-002 | API | Sanitization processor removes workspace-root leakage in messages. |
| AV-008 | Requirement | AC-004 | FR-005 | UC-002 | E2E | Media path preprocessing/transform pipeline keeps path safety constraints. |
| AV-009 | Requirement | AC-005 | FR-006 | UC-005 | API | `AgentRun.workspace` remains populated for active runs. |
| AV-010 | Requirement | AC-006 | FR-007 | UC-005 | E2E | Workspace explorer/static/terminal flows remain functional with `workspaceId`. |
| AV-011 | Requirement | AC-007 | NFR-001..003 | UC-001..005 | API | Targeted typecheck/test suite passes for touched modules. |

## Re-Entry Plan Addendum (v2)

- Trigger: additional requirement to remove `BaseAgentWorkspace` completely.
- Design Basis Version: `v2` (`proposed-design.md`).

### v2 Planned Task IDs

1. P-010: Remove `BaseAgentWorkspace` source and public export from `autobyteus-ts`.
2. P-011: Refactor server `FileSystemWorkspace` to standalone class without inheritance.
3. P-012: Update `SkillWorkspace`/`TempWorkspace` and workspace API paths to new class shape.
4. P-013: Update examples/tests still subclassing `BaseAgentWorkspace`.
5. P-014: Run targeted verification for LM Studio flow tests + workspace subsystem suites + processor suites + build.

### v2 Stage 7 Scenario Additions

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-012 | Requirement | AC-008 | FR-008 | UC-005 | API | `rg` audit shows no `BaseAgentWorkspace` references in active source/examples. |
| AV-013 | Requirement | AC-006, AC-007 | FR-007, NFR-003 | UC-003 | API/E2E | Workspace subsystem tests pass after removing inheritance. |
