# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/code-review-report.md`
- Previous API/E2E Execution Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/api-e2e-execution-coverage-report.md`
- Current Investigation Round: 3
- Trigger: Code review Round 6 pass after CR-005 Local Fix; resume API/E2E coverage investigation/execution against the latest Round 7 implementation state, with special focus on active/nested context-file final-owner route-key ambiguity semantics.
- Prior Investigation Reviewed: Round 2 (`Pass`, durable integration/API coverage updated for deleted ID utility removals, explicit opaque IDs, and stored nested memory paths)
- Latest Authoritative Investigation: Round 3

## Current Requirement And Design Basis

The approved ticket behavior is still the clean-cut global run/team identity refactor:

- New concrete agent run IDs are allocated by the canonical server-side `AgentRunIdentityAllocator.allocateForAgentDefinition(agentDefinitionId)` and use `<agent_definition_name_slug>_<32-hex-uuid-token>`.
- New team run IDs are allocated at the team launch boundary and use `<team_definition_name_slug>_<32-hex-uuid-token>`.
- New runtime IDs must not encode runtime kind, team run ID, member route/name, or task ID. Route keys/member paths/task IDs remain metadata, not identity substrings.
- Backend factories and runtime managers consume required IDs. Backend-local fallback ID generation and deleted run-history ID utility imports remain obsolete.
- Historical run IDs and memory directories remain readable as stored data; read/projection code must treat stored IDs opaquely.
- Team-member memory reads/writes must carry explicit memory location context. Direct members live under the root team run. Nested subteam members live under `agent_teams/<rootTeamRunId>/<childTeamRunId>/...`. Task agents use their own task-agent run ID under the owning team run.
- Context-file finalization/read must consume the resolved final-owner memory location rather than deriving deterministic route-based paths.
- `send_message_to` global routing remains out of scope.

Code review Round 6 confirms CR-005 is resolved in the latest Round 7 implementation state:

- `src/agent-memory/domain/team-member-route-selection.ts` defines shared exact-then-unambiguous-suffix route selection.
- `AgentMemoryLocationService` uses the shared selector for stored metadata route-key resolution.
- `ContextFileOwnerResolver` active config/runtime resolution now collects candidates and applies the same exact-then-unambiguous-suffix semantics. Ambiguous duplicate suffixes return no target and fail through final-owner resolution instead of using first-match selection.
- Focused context-file owner unit tests already cover ambiguous duplicate suffix failure, fully-qualified route success, and child-team-scoped suffix success.

## Changed Behavior Summary Since Round 2

| Behavior / Boundary | Latest State | Coverage Consequence |
| --- | --- | --- |
| Stored team-member route resolution | Uses shared exact-then-unambiguous-suffix selector in `AgentMemoryLocationService` | Existing stored REST/projection coverage remains valid; focused selector checks should be re-run. |
| Active context-file final-owner route resolution | Config/runtime candidates are collected before selecting; exact route wins; a unique suffix may resolve; duplicate suffix is ambiguous and must fail | Durable API coverage should exercise active REST finalization at the public boundary, not only unit resolver calls. |
| Nested context-file final-owner memory layout | Active and stored final owners must write/read under `agent_teams/<root>/<child>/<memberRunId>/context_files` | Existing stored nested REST coverage remains valid; active nested REST coverage should be expanded. |
| Deleted legacy ID utilities | Code review stale scans still found no old helper references | Retain static scan in execution evidence. |
| Known repository `typecheck` behavior | `pnpm -C autobyteus-server-ts typecheck` still fails only with known TS6059 tests-under-rootDir diagnostics | Re-run and separate non-TS6059 diagnostics from the known failure. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Validity Decision | Evidence | Action This Round |
| --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/agent-run-id.test.ts` | Generated/stored ID primitive behavior | Still Valid | Prior API/E2E Round 2 pass and code review focused suites | Retain. |
| `tests/unit/agent-execution/agent-run-identity-allocator.test.ts` | Allocator slug lookup and reservation behavior | Still Valid | Prior pass and source unchanged for this focus | Retain. |
| `tests/unit/agent-team-execution/team-run-launch-identity-assignment.test.ts` | Recursive launch ID assignment and manual-ID rejection | Still Valid | Prior pass | Retain. |
| `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` | Backend consumes required explicit IDs | Still Valid After Round 2 Update | Prior API/E2E Round 2 pass | Retain; no new edit planned. |
| `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` | Live AutoByteus/LMStudio backend consumes explicit IDs | Still Valid / Environment Gated | Prior source update; suite skipped unless `RUN_LMSTUDIO_E2E=1` | Retain; record gated if included. |
| `tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts` | Mixed backend requires explicit team/member IDs | Still Valid After Round 2 Update | Prior API/E2E Round 2 pass | Retain. |
| `tests/integration/agent-team-execution/team-run-service.integration.test.ts` | TeamRunService generated IDs and historical restore IDs | Still Valid After Round 2 Update | Prior API/E2E Round 2 pass | Retain. |
| `tests/integration/api/runtime-selection-top-level.integration.test.ts` | GraphQL/websocket top-level runtime selection with allocated IDs | Still Valid After Round 2 Update | Prior API/E2E Round 2 pass | Retain. |
| `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Stored direct/nested memory projection uses explicit opaque IDs and child owner layout | Still Valid After Round 2 Update | Prior API/E2E Round 2 pass | Retain; re-run as part of focused memory/API suite if practical. |
| `tests/unit/agent-memory/agent-memory-location-service.test.ts` | Stored direct/nested/team-scope memory-location route resolution | Still Valid / Important For CR-005 | Code review Round 6 focused selector subset passed | Re-run focused. |
| `tests/unit/context-files/context-file-owner-resolver.test.ts` | Active and stored final-owner resolution, including duplicate suffix ambiguity | Still Valid / Important For CR-005 | Code review Round 6 confirms new active ambiguity tests | Re-run focused. |
| `tests/integration/api/rest/context-files.integration.test.ts` | REST upload/read/finalize; stored direct/nested team-member final paths use resolved metadata memoryDir | Needs Expansion | Current REST integration covers stored nested final-owner paths but not active duplicate-suffix/fully-qualified/child-scoped selection at the REST boundary | Add active nested final-owner REST coverage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Decision | Rationale | Replacement / Action |
| --- | --- | --- | --- |
| Integration/API/E2E references to deleted `agent-run-id-utils`, `team-run-id-utils`, `team-member-run-id` | Stale if present | These helper utilities were removed by the implementation | Static scan during execution must remain no-match; no new coverage should import them. |
| Tests that derive new member IDs from `teamRunId + memberRouteKey` | Obsolete for new launches | New member IDs are allocated/preassigned and stored as runtime metadata | Existing Round 2 updates should remain; do not reintroduce deterministic derivation. |
| Active context-file suffix first-match behavior | Obsolete and specifically removed by CR-005 | Shared selector requires exact match first, otherwise only one unambiguous suffix match; duplicate suffix is failure | Add/retain coverage that ambiguous suffix fails and fully-qualified/child-scoped selectors resolve. |

## Durable Coverage To Add Or Expand

| Scenario ID | Behavior / Boundary | Requirement / AC Basis | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-R3-001 | Active REST context-file finalization fails when root-team owner uses ambiguous duplicate suffix `worker` across nested subteams | Context-file final-owner must resolve a unique memory target; CR-005 ambiguity semantics | `tests/integration/api/rest/context-files.integration.test.ts` | Public API boundary should reject the old first-match behavior, not merely unit resolver internals. |
| COV-R3-002 | Active REST context-file finalization succeeds with fully-qualified route `ReviewSquad/worker` and writes/reads under `agent_teams/<root>/<reviewChild>/<memberRunId>/context_files` | Nested owner memory path and exact route selection | `tests/integration/api/rest/context-files.integration.test.ts` | Proves active final-owner route selection and final file layout together. |
| COV-R3-003 | Active REST context-file finalization succeeds when scoped to the child team run and uses suffix `worker` | Child-team-scoped suffix selection and nested memory layout | `tests/integration/api/rest/context-files.integration.test.ts` | Guards the intended scoped-suffix semantics after CR-005. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Notes |
| --- | --- | --- | --- |
| UPD-R3-001 | `tests/integration/api/rest/context-files.integration.test.ts` | Add an active `AgentTeamRunManager` test fixture and active nested final-owner REST scenarios | This is a repository-resident durable coverage change after code review, so a post-API/E2E code review is required if execution passes. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Replacement Or No-Replacement Decision |
| --- | --- | --- |
| No whole file or scenario planned for removal | Existing Round 2 coverage remains valid | Additive REST coverage only. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Temporary |
| --- | --- | --- | --- |
| TMP-R3-001 | Static stale-scan for deleted ID utilities and old first-match route matching (`routeKeyMatches`) | Confirms stale helper and removed matcher paths did not return | Inventory evidence only. |
| TMP-R3-002 | Focused Vitest for `tests/integration/api/rest/context-files.integration.test.ts` | New active REST coverage executes locally | Execution evidence only. |
| TMP-R3-003 | Focused Vitest selector/memory/context unit subset | Shared selector and final-owner logic still pass after API coverage addition | Execution evidence only. |
| TMP-R3-004 | Prior broader integration/API suite updated in Round 2 | Confirms no regression across updated API/integration surfaces | Execution evidence only. |
| TMP-R3-005 | `git diff --check`, source build, and repository typecheck with known TS6059 filtered | Whitespace/build/type-safety evidence | Execution evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Live LMStudio AutoByteus integration execution | Requires `RUN_LMSTUDIO_E2E=1` and live LMStudio availability | Live backend still unproven locally | Keep suite environment-gated and record skip if included. |
| Broad external live E2E beyond local REST/GraphQL/fake-backed harnesses | Ticket focus is server-side ID allocation and memory owner paths | External runtime regressions may require CI/live lane | Rely on focused local integration/API coverage unless CI scope expands. |
| `send_message_to` global routing | Explicitly out of scope | None for this ticket | No coverage. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| CR-005 active route ambiguity semantics | Resolved by implementation; needs API durability | Code review Round 6 pass; unit coverage exists | API/E2E expands REST coverage and executes. |
| New REST active-context tests expose source behavior failure | Potential Local Fix | Pending execution | `implementation_engineer` if failure is source behavior, not test fixture error. |
| New requirement/design ambiguity on route-key scoping | Requirement/design gap | Pending execution/evidence | `solution_designer` if behavior cannot be classified from approved docs. |
| Durable coverage changes pass | Post-coverage code review required | Team workflow rule | `code_reviewer`. |

## Execution Plan

1. Add active nested context-file REST coverage only after this investigation artifact is written.
2. Run static stale scans for deleted ID utilities and removed first-match route matching.
3. Run focused REST context-files integration and selector/context/memory unit subsets.
4. Run the prior Round 2 focused integration/API suite if time and environment allow.
5. Run `git diff --check`, source build, and repository `typecheck` with TS6059 diagnostics filtered from new diagnostics.
6. Update the API/E2E execution coverage report with exact commands/results and latest Round 3 classification.
7. Because repository-resident durable coverage is being updated after code review, route the cumulative package back to `code_reviewer` if checks pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Durable Coverage Changes Pass: `code_reviewer`
- Notes: Round 3 supersedes Round 2 only for the post-CR-005 active context-file route-selection focus. Round 2 durable integration/API updates remain part of the cumulative artifact package.
