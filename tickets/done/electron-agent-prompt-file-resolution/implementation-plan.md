# Implementation Plan

## Scope Classification
- Classification: `Small`
- Reasoning: the refactor is localized to runtime definition retrieval, service wiring, and targeted runtime tests.

## Upstream Artifacts
- Workflow state: `tickets/in-progress/electron-agent-prompt-file-resolution/workflow-state.md`
- Investigation notes: `tickets/in-progress/electron-agent-prompt-file-resolution/investigation-notes.md`
- Requirements: `tickets/in-progress/electron-agent-prompt-file-resolution/requirements.md` (`Design-ready`)

## Plan Maturity
- Current Status: `Design Basis Drafted`
- Notes: runtime modeling and review gate still pending before implementation is allowed.

## Solution Sketch (Small)
- Use cases in scope: `UC-001`, `UC-002`, `UC-003`.
- Requirement coverage:
  - `REQ-001` -> add fresh agent-definition lookup for runtime and use `definition.instructions` directly.
  - `REQ-002` -> add fresh team-definition lookup for runtime team expansion.
  - `REQ-003` -> remove runtime prompt-loader dependence from runtime call paths.
  - `REQ-004` -> ensure next-run file edits are observed through fresh persistence reads.
  - `REQ-005` -> preserve description fallback when instructions are blank.
- Target architecture shape:
  - `agent.md` remains the persisted source of truth.
  - `File*DefinitionProvider` remains the layer that resolves source roots and parses files.
  - `AgentDefinitionService` / `AgentTeamDefinitionService` gain explicit fresh-read methods backed by persistence providers.
  - Runtime builders call fresh-read service methods at run creation time and use the returned definition objects consistently.
  - Runtime no longer re-reads `agent.md` independently through `PromptLoader`.
- New layers/modules/interfaces:
  - No new top-level modules required.
  - Add explicit fresh-read service methods rather than recording source paths or introducing a separate runtime resolver subsystem.
- Touched files/modules:
  - `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts`
  - `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts`
  - targeted runtime integration/unit tests
- API/behavior delta:
  - next-run file edits are reflected coherently through fresh definition reads
  - runtime uses one definition snapshot instead of mixing cache data with separate instruction rereads
  - blank instruction fallback to description is preserved

## Dependency And Sequencing Map
| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `src/agent-definition/services/agent-definition-service.ts` | Stage 5 Go Confirmed | introduces fresh agent-definition lookup |
| 2 | `src/agent-team-definition/services/agent-team-definition-service.ts` | Stage 5 Go Confirmed | introduces fresh team-definition lookup |
| 3 | runtime consumers (`agent-run-manager`, `agent-team-run-manager`, `single-agent-runtime-metadata`, instruction resolvers) | fresh service methods | remove runtime prompt-loader dependence |
| 4 | targeted runtime tests | code updates | verify freshness + fallback behavior |

## Requirement And Design Traceability
| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | AC-001, AC-003 | Solution Sketch | UC-001 | T-001, T-003 | Integration | S7-001, S7-003 |
| REQ-002 | AC-002, AC-003 | Solution Sketch | UC-002 | T-002, T-003 | Integration | S7-002, S7-003 |
| REQ-003 | AC-003 | Solution Sketch | UC-001, UC-002 | T-003, T-004 | Source + Integration | S7-003 |
| REQ-004 | AC-001, AC-002 | Solution Sketch | UC-001, UC-002 | T-001, T-002, T-004 | Integration | S7-001, S7-002 |
| REQ-005 | AC-004 | Solution Sketch | UC-003 | T-004 | Integration | S7-004 |

## Acceptance Criteria To Stage 7 Mapping
| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | single-agent run uses fresh edited definition state | S7-001 | Integration | Planned |
| AC-002 | REQ-002 | team run uses fresh team/member definition state | S7-002 | Integration / targeted service test | Planned |
| AC-003 | REQ-003 | runtime paths no longer depend on `PromptLoader` | S7-003 | Source + targeted runtime tests | Planned |
| AC-004 | REQ-005 | blank instructions still fall back to description | S7-004 | Integration | Planned |

## Step-By-Step Plan
1. Add explicit fresh-read lookup methods to agent/team definition services.
2. Refactor runtime builders and instruction metadata paths to consume fresh definitions and `definition.instructions` directly.
3. Remove runtime dependence on `PromptLoader`.
4. Add/adjust targeted tests covering:
   - next-run freshness after manual file edits
   - team/member fresh resolution
   - blank-instructions fallback
5. Run targeted tests and record Stage 7 evidence.
