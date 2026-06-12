# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review pass requested API/E2E coverage investigation and execution for ticket `analyse-memory-layout-duplication`.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved change is an internal cleanup/refactor that removes duplicate memory layout ownership. The required current behavior is:

- `AgentMemoryLayout` is the single production owner for standalone and team memory path composition.
- The obsolete `AgentRunMemoryLayout` source file, import path, class name, and allocator `agentMemoryLayoutV2` field must not remain in `src` or durable tests.
- Valid standalone paths must remain `memory/agents/<runId>` for allocation, provisioning, metadata/history, and agent-final context files.
- Valid team/member/task-agent paths must remain `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>`.
- Converted standalone call sites must use the stricter `AgentMemoryLayout` segment validation and must not reintroduce compatibility wrappers, aliases, dual-path reads/writes, or `V2` names.
- Full package `pnpm -C autobyteus-server-ts typecheck` is known to fail for pre-existing TS6059 `tests` vs `rootDir: src`; source-only TypeScript checking remains the applicable TypeScript executable check.

The implementation handoff `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, legacy old behavior was not retained, the obsolete file was deleted, and static grep over `src`/`tests` was reported clean. Code review independently confirmed that result.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Single concrete memory layout owner | Changed | REQ-001..REQ-004; DS intended change; code review pass | Run static obsolete-symbol check, focused unit/static tests, and realistic integration/API/E2E memory path tests. |
| `AgentRunMemoryLayout` file/imports/class | Removed | REQ-003, REQ-006, AC-001, AC-006; implementation handoff deletion | Retain and run cleanup-regression/static coverage; no compatibility-only coverage allowed. |
| Allocator dual `agentMemoryLayout` + `agentMemoryLayoutV2` state | Removed | REQ-004, AC-001, AC-002; code review source evidence | Retain/run allocator tests proving one layout covers standalone and team collisions; static grep must remain clean. |
| Standalone run provisioning and metadata/history paths | Preserved through new owner | AC-003, AC-004, DS-001, DS-003 | Run unit, integration, and API/E2E tests that create/read `memory/agents/<runId>` and `run_metadata.json`. |
| Agent-final context-file paths | Preserved through new owner | UC-004, DS-004 | Run REST context-file integration and retain live runtime E2E as env-gated broader coverage. |
| Team/member/task-agent memory paths | Preserved | AC-005, DS-005 | Run team layout, projection, context-file, and memory-persistence executable coverage. |
| Invalid slash/backslash/dot path segments | Changed/tightened | Requirements risk section; design tradeoff; code review residual risk | Run unit tests covering invalid standalone and team path segments; no compatibility fallback should be added. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-layout.test.ts` | Canonical standalone/team roots, subtree creation, and unsafe segment rejection. | REQ-002, REQ-005, AC-003, AC-005, DS-001, DS-005 | Still Valid | Test now asserts `getStandaloneRootDirPath`, `getStandaloneRunDirPath`, `getTeamAgentRunDirPath`, and traversal rejection. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-memory/memory-layout-cleanup-regression.test.ts` | Removed layout symbols must stay absent from `src` and `tests`. | REQ-003, REQ-006, REQ-007, AC-001, AC-006, AC-007 | Still Valid | Static durable coverage is directly required by AC-001/AC-007 and avoids compatibility retention. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-location-service.test.ts` | Standalone/team/task-agent memory locations resolve via current layout/location boundary. | REQ-002, REQ-005, AC-005, DS-005 | Still Valid | Existing test imports `AgentMemoryLayout` and covers topology-aware memory location behavior; no obsolete layout assertion found. | Retain and run focused file. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-identity-allocator.test.ts` | Allocation reservation and standalone/team filesystem collision skips. | REQ-004, AC-002, AC-005, DS-002 | Still Valid | Test uses `AgentMemoryLayout` to create standalone/team collision directories; no obsolete layout term remains. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-provisioning-service.test.ts` | Prepared run lifecycle and stale prepared cleanup under `memory/agents/<runId>`. | REQ-005, AC-003, DS-001 | Still Valid | Fixture metadata uses `path.join(memoryDir, "agents", runId)` and exercises cleanup scan through provisioning. | Retain and run. |
| `autobyteus-server-ts/tests/unit/context-files/context-file-layout.test.ts` | Team-member final context files use resolved member `memoryDir`. | REQ-005, AC-005, DS-004/DS-005 | Still Valid | Team final behavior is intentionally preserved; standalone final path is covered by REST integration below. | Retain and run. |
| `autobyteus-server-ts/tests/unit/run-history/store/agent-run-metadata-store.test.ts` | Metadata round-trip/fallback path under `memory/agents/<runId>` and stale durable status normalization. | AC-004, DS-003 | Still Valid | Store now composes fallback metadata path through `AgentMemoryLayout`; stale status assertions remain unrelated but valid current behavior. | Retain and run. |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-identity.test.ts` | Safe standalone history identity paths under canonical `agents` root; unsafe IDs rejected. | AC-004, DS-003; invalid-segment residual risk | Still Valid | Directly covers converted resolver and stricter unsafe ID rejection. | Retain and run. |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts` | Real `AgentRunService` create + restore persists traces only under `memory/agents/<runId>`, not memory root. | AC-003, DS-001 | Needs Update | Discovery execution showed the existing setup relies on default allocator/definition service mismatch and fails before memory-layout behavior is reached. Current `AgentRunService` test deps support an injected allocator for deterministic run IDs. | Update setup to inject a deterministic `agentRunIdentityAllocator`, then run. |
| `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Single-agent metadata/history files, single-agent projections, team metadata/projections, nested team member layout. | AC-003, AC-004, AC-005, DS-001, DS-003, DS-005 | Still Valid | Assertions include `memory/agents/<runId>/run_metadata.json`, `memory/agent_teams/<teamRunId>/...`, and absence of stale sibling paths. | Retain and run. |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts` | REST upload/finalize/read for standalone and team-member context files into `context_files` under canonical memory dirs. | UC-004, AC-003, AC-005, DS-004, DS-005 | Still Valid | Test asserts standalone final path under `memory/agents/run-123/context_files` and nested team path under root hierarchy. | Retain and run. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Cross-runtime memory persistence, including mixed team member memory under `agent_teams/<teamRunId>/<memberRunId>`. | AC-005, DS-005 | Needs Update | Discovery execution showed several direct `AgentRunManager.createAgentRun(config)` scenarios still use the obsolete one-argument manager API and fail before memory persistence is exercised. The team-member memory-dir scenario passed. Current `AgentRunManager.createAgentRun` requires `(config, agentRunId)`. | Update stale direct manager calls to pass explicit deterministic run IDs, then run the file. |
| `autobyteus-server-ts/tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | GraphQL memory explorer lists runs using metadata/traces in `memory/agents/<runId>`. | AC-003, AC-004; API boundary for memory browsing | Still Valid | Uses `AgentRunMetadataStore` and BFF GraphQL schema over canonical standalone memory layout. | Retain and run. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` | GraphQL memory view reads working context, episodic/semantic, and raw traces from `memory/agents/<runId>`. | AC-003, API boundary for memory view | Still Valid | Direct API/E2E assertion over standalone memory directory layout. | Retain and run. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | GraphQL run/team-member projections use local replay memory paths; team member path uses `AgentMemoryLayout.getTeamAgentRunDirPath`. | AC-004, AC-005, DS-003, DS-005 | Still Valid | Test imports current layout and exercises GraphQL projection API for standalone and team-member rows. | Retain and run. |
| `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts` | Live LMStudio-backed runtime uploads/finalizes/serves/delivers agent/team context files. | DS-004/DS-005 broader live runtime path | Still Valid | Test is gated by `RUN_LMSTUDIO_E2E === "1"` and requires external model runtime; current refactor does not require standing up LMStudio because REST integration covers the changed storage path boundary. | Retain, but do not select for this run unless LMStudio E2E is explicitly enabled. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No current durable API/E2E/integration test asserts that `AgentRunMemoryLayout` must exist or that old/dual layout behavior is required. | Static search found no obsolete layout symbols in `src`/`tests`. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed unit/static/integration/API/E2E coverage already covers the required boundaries at the right granularity for this internal refactor. | N/A | No repository-resident durable coverage addition is planned in API/E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-UPD-001 | `tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts` | Inject a deterministic `agentRunIdentityAllocator` so the existing real memory-layout scenario reaches current provisioning/activation behavior instead of failing on default allocator test setup. | AC-003, DS-001; discovery failure from final execution attempt | Durable coverage remains the same scenario; setup is updated to current service dependency shape. |
| COV-UPD-002 | `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Pass explicit deterministic run IDs to direct `AgentRunManager.createAgentRun(config, agentRunId)` calls. | Current `AgentRunManager` API; DS-005 relevant team-member memory persistence | Durable coverage remains current memory persistence behavior; stale one-argument manager API setup is removed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale or obsolete durable API/E2E/integration coverage found. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Direct `rg -n "AgentRunMemoryLayout|agent-run-memory-layout|agentMemoryLayoutV2" autobyteus-server-ts/src autobyteus-server-ts/tests` final execution check. | Confirms no obsolete layout symbol/import/path/field remains in production or durable tests. | Already has durable static unit coverage; direct grep is final evidence, not a new repository-resident test. |
| TEMP-002 | Source-only TypeScript check: Prisma generate then `tsc -p tsconfig.build.json --noEmit`. | Confirms reviewed source compiles without relying on full `tsconfig.json`, which has known pre-existing TS6059 test-root issue. | Build/typecheck command is execution evidence, not additional durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full `pnpm -C autobyteus-server-ts typecheck` | Known pre-existing TS6059 configuration issue: `tests` are included while `rootDir` is `src`. Code review already confirmed source-only `tsconfig.build.json` passes after Prisma generation. | Low for this task because source-only typecheck covers changed source and focused Vitest covers changed tests. | No escalation for this ticket; delivery may note existing TS6059 if relevant. |
| Live LMStudio context-file runtime E2E (`tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts`) | Requires `RUN_LMSTUDIO_E2E=1` and a live model/runtime; the changed boundary is storage path composition, which is covered by REST integration and unit tests without external model dependency. | Low for this cleanup; does not exercise unique layout code beyond already selected REST/context coverage. | No escalation. Run separately only if live LMStudio E2E is part of release gate. |
| Full repository Vitest suite | Scope is a bounded internal memory-layout cleanup; selected tests cover changed boundaries while avoiding unrelated long-running/external suites. | Low; broad unrelated regressions are outside task-specific API/E2E sign-off. | No escalation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No compatibility wrapper, dual path, stale durable test, requirement gap, or design ambiguity was observed during investigation. | N/A |

## Execution Plan

1. Run static obsolete-symbol check: `rg -n "AgentRunMemoryLayout|agent-run-memory-layout|agentMemoryLayoutV2" autobyteus-server-ts/src autobyteus-server-ts/tests`.
2. Run focused unit/static coverage for the converted memory layout, allocation, provisioning, context-file, and run-history boundaries.
3. Apply the two narrow durable coverage setup updates recorded above (`COV-UPD-001`, `COV-UPD-002`) before re-running integration/API/E2E coverage.
4. Run selected integration/API/E2E coverage:
   - `tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts`
   - `tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
   - `tests/integration/api/rest/context-files.integration.test.ts`
   - `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts`
   - `tests/e2e/memory/memory-explorer-graphql.e2e.test.ts`
   - `tests/e2e/memory/memory-view-graphql.e2e.test.ts`
   - `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
5. Run source-only TypeScript check with Prisma generation.
6. Run `git diff --check`.
7. Record results in the execution coverage report and return to code review because repository-resident durable coverage was updated after the first code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage was mostly valid, but execution surfaced two stale test setup issues in selected integration coverage. API/E2E will apply narrow durable coverage setup updates and return through code review after execution.
