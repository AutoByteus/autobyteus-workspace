# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-review-report.md`
- Prior code review report addressed by implementation/local fixes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/code-review-report.md`
- Prior API/E2E coverage investigation Local Fix report addressed by source fixes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/api-e2e-coverage-investigation.md`
- Prior API/E2E execution coverage blocked report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/api-e2e-execution-coverage-report.md`

## What Changed

- Implemented canonical standalone `AgentRun` ID allocation:
  - `agent-execution/identity/agent-run-id.ts` owns `<agent_definition_name_slug>_<32-hex-uuid-token>` generation/validation.
  - `AgentRunIdentityAllocator.allocateForAgentDefinition(agentDefinitionId: string)` owns definition lookup, slug derivation from `AgentDefinition.name`, UUID candidate generation, active/persisted collision checks, and in-process reservation.
- Moved all new-run ID assignment to launch/provisioning boundaries:
  - standalone agent creation and task-agent activation use allocator-assigned IDs;
  - top-level team run IDs are created by `TeamRunService` and handed exactly through `AgentTeamRunManager.createTeamRun(config, teamRunId)` into `MixedTeamRunBackendFactory.createBackend(config, teamRunId)`;
  - nested child team IDs are recursively preassigned before mixed backend context creation;
  - concrete team-agent member IDs come from the agent-definition allocator;
  - `agent_team` wrapper `memberRunId === childTeamRunId` for new launch topology.
- Removed backend-local fallback ID generation and legacy route/task-derived ID utilities. Public new-launch inputs containing `memberRunId` or `childTeamRunId` fail before allocation; restore/import/stored metadata paths still preserve historical IDs as data.
- Implemented the Round 7 memory-location design, replacing the earlier `owningTeamRunId`/child-sibling direction:
  - added `AgentMemoryLocation` variants, `AgentMemoryLayout`, `AgentMemoryLocationService`, and read-only `TeamRunMemoryTopologyReader`;
  - write-time `TeamAgentRunMemoryLocation` is lightweight;
  - read/projection `TeamMemberAgentMemoryLocation` includes metadata-rich member details;
  - memory path composition is hierarchical under the root team: `agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>`.
- Updated path-sensitive consumers to use `AgentMemoryLocationService` or explicit stored/runtime `memoryDir` instead of local metadata traversal plus memory path composition:
  - team-member run view projection;
  - team memory explorer/member target builder;
  - run-file-change projection and active file-change writer;
  - application artifact reads;
  - self-evolution target context;
  - external-channel reply recovery;
  - context-file final owner resolution/layout;
  - team-run history index migration summary reads;
  - GraphQL memory view.
- Removed obsolete production files:
  - `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts`
  - `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts`
  - `autobyteus-server-ts/src/run-history/utils/team-run-id-utils.ts`
  - `autobyteus-server-ts/src/agent-memory/store/team-member-memory-layout.ts`
- Did **not** add hidden historical nested root-flat or child-sibling filesystem fallback. Direct historical team-member paths remain readable because `teamRunPath: []` maps to `agent_teams/<rootTeamRunId>/<memberRunId>`.

## Code Review / API-E2E Local Fixes Addressed

- CR-001: Context-file public final owner descriptors can no longer spoof final `memberRunId`; active/stored owner resolution returns actual `rootTeamRunId`, `teamRunPath`, `memberRunId`, and `memoryDir`.
- CR-002: Manual `memberRunId`/`childTeamRunId` in public team launch input is rejected before team/member allocation.
- CR-003: Allocator reservations are made before async collision scans and released on collision/error, preventing concurrent same-candidate returns.
- CR-004: Added/updated focused coverage for duplicate active registration preservation, canonical task-agent IDs, and non-deterministic/opaque team member IDs.
- API/E2E Local Fix blocker 1: Added `AgentMemoryLocationService`/`AgentMemoryLayout` and routed path-sensitive readers through it.
- API/E2E Local Fix blocker 2: Context-file final owner type/layout now uses resolved memory location with `rootTeamRunId`, `teamRunPath`, `memberRunId`, and `memoryDir`.
- API/E2E Local Fix blocker 3: Task-agent startup and active file-change projection use task-agent-specific memory under the logical member team path, not the template member memoryDir.
- CR-005: Active context-file final-owner resolution now collects active config/runtime candidates and applies the same exact-then-unambiguous-suffix route selector semantics as stored `AgentMemoryLocationService` resolution. Ambiguous suffix selectors return no target and fail through the existing final-owner error path.

## Key Files Or Areas

- New identity/allocation source:
  - `autobyteus-server-ts/src/agent-execution/identity/agent-run-id.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts`
  - `autobyteus-server-ts/src/agent-team-execution/domain/team-run-id.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-identity-assignment.ts`
- New memory-location source:
  - `autobyteus-server-ts/src/agent-memory/domain/agent-memory-location.ts`
  - `autobyteus-server-ts/src/agent-memory/domain/team-member-route-selection.ts`
  - `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-memory-topology-reader.ts`
- Updated launch/runtime source:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`
- Updated path-sensitive readers/writers:
  - `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts`
  - `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts`
  - `autobyteus-server-ts/src/context-files/store/context-file-layout.ts`
  - `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`
  - `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/team-memory-member-target-builder.ts`
  - `autobyteus-server-ts/src/agent-memory/services/team-memory-explorer-service.ts`
  - `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
  - `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts`
  - `autobyteus-server-ts/src/api/graphql/types/memory-view.ts`
- Focused coverage added/updated:
  - `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-layout.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-location-service.test.ts`
  - `autobyteus-server-ts/tests/unit/context-files/context-file-owner-resolver.test.ts`
  - `autobyteus-server-ts/tests/unit/context-files/context-file-layout.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/run-file-change-projection-service.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts`

## Important Assumptions

- Historical stored IDs remain data. No migration rewrites stored metadata or existing memory directories in this refactor.
- Current product data has no historical nested team-run memory requiring root-flat or child-sibling fallback; if discovered later, that is a separate migration/data-recovery task per Round 7 design.
- New caller diagnostics stay outside `AgentRunIdentityAllocator`; allocator accepts only `agentDefinitionId`.
- `agent_team` wrapper IDs are team run IDs, not concrete `AgentRun` IDs.
- Route-key-only read APIs can be ambiguous for repeated nested suffixes; both stored and active location resolution return `null` when exact/suffix matching is not unambiguous.

## Known Risks

- Several durable API/E2E scenarios still need downstream investigation/execution after code review. I updated only implementation-adjacent stale expectations/imports needed by the refactor; I did not perform final API/E2E execution.
- Files near the source size guardrail should be split before future expansion: `mixed-team-member-registry.ts` 494 effective lines, `team-run-service.ts` 489, `autobyteus-agent-run-backend-factory.ts` 481.
- Live runtime, application binding, helper/evolver/compaction, and external-channel paths fan through the changed service boundaries and need API/E2E validation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor / behavior simplification / Local Fix after API/E2E coverage investigation.
- Reviewed root-cause classification: Missing invariant / duplicated policy or coordination / boundary ownership issue / legacy or compatibility pressure.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: New ID allocation is centralized; team launch owns team/member preassignment; backend factories require IDs; public manual IDs fail before allocation; memory path composition is owned by Agent Memory instead of run-history/application/context consumers. CR-005 is fixed by sharing route-key selector semantics through `team-member-route-selection.ts`, which is used by stored memory-location resolution and active context-file owner resolution.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`; historical stored IDs are preserved as data only.
- Legacy old-behavior retained in scope: `No` for production new-run ID generation and path-sensitive nested memory consumers.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: stale-pattern scan found no production `TeamRunMemberMemoryTargetResolver`, `TeamMemberMemoryLayout`, `getMemberDirPath`, `owningTeamRunId`, or child-sibling memory path usage. The old active first-match route suffix matcher was removed from `ContextFileOwnerResolver`.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor`
- Branch: `codex/agent-run-id-global-allocation-refactor`
- Base: `origin/personal`
- No package manifest/lockfile updates were made during this local-fix pass.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code. Do not treat this as downstream API/E2E sign-off.

- Passed: source-only build typecheck

```bash
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
```

- Passed: focused CR-005 context-file owner resolver regression coverage

```bash
pnpm --dir autobyteus-server-ts exec vitest run tests/unit/context-files/context-file-owner-resolver.test.ts
```

Result: 1 test file passed, 5 tests passed, including duplicate nested suffix ambiguity, fully-qualified active route resolution, and child-team-scoped suffix resolution.

- Passed: focused Round 7 unit suite around memory location, context files, run-history projection, task-agent memory, team launch IDs, allocator, and duplicate active registration

```bash
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/agent-memory/agent-memory-layout.test.ts \
  tests/unit/agent-memory/agent-memory-location-service.test.ts \
  tests/unit/run-history/team-member-run-view-projection-service.test.ts \
  tests/unit/context-files/context-file-owner-resolver.test.ts \
  tests/unit/context-files/context-file-layout.test.ts \
  tests/unit/run-history/services/run-file-change-projection-service.test.ts \
  tests/unit/agent-memory/team-memory-explorer-service.test.ts \
  tests/unit/application-orchestration/application-orchestration-host-service.test.ts \
  tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts \
  tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts \
  tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts \
  tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts \
  tests/unit/run-history/team-member-run-view-projection-service.import.test.ts \
  tests/unit/agent-execution/agent-run-id.test.ts \
  tests/unit/agent-execution/agent-run-identity-allocator.test.ts \
  tests/unit/agent-execution/agent-run-create-service.test.ts \
  tests/unit/agent-execution/agent-run-manager.test.ts \
  tests/unit/agent-execution/agent-run-provisioning-service.test.ts \
  tests/unit/agent-team-execution/team-run-id.test.ts \
  tests/unit/agent-team-execution/team-run-launch-identity-assignment.test.ts \
  tests/unit/agent-team-execution/team-run-service.test.ts \
  tests/unit/agent-team-execution/task-delegation-service.test.ts \
  tests/unit/context-files/context-file-owner-types.test.ts \
  tests/unit/context-files/context-file-local-path-resolver.test.ts
```

Result: 24 test files passed, 91 tests passed.

- Passed: focused subset after selector helper extraction

```bash
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/agent-memory/agent-memory-location-service.test.ts \
  tests/unit/context-files/context-file-owner-resolver.test.ts \
  tests/unit/context-files/context-file-layout.test.ts \
  tests/unit/run-history/team-member-run-view-projection-service.test.ts \
  tests/unit/run-history/services/run-file-change-projection-service.test.ts
```

Result: 5 test files passed, 24 tests passed.

- Passed: narrow non-API integration check for the updated hierarchical nested projection expectation

```bash
pnpm --dir autobyteus-server-ts exec vitest run tests/integration/run-history/memory-layout-and-projection.integration.test.ts -t "hierarchical root team memory directory"
```

Result: 1 test passed, 12 skipped.

- Passed: whitespace diff check

```bash
git diff --check
```

- Passed: changed source size guard and stale-pattern scan

```bash
git diff --name-only -- autobyteus-server-ts/src | while read -r f; do [ -f "$f" ] || continue; nonempty=$(grep -cv '^\s*$' "$f" || true); if [ "$nonempty" -gt 500 ]; then echo "$nonempty $f"; fi; done | sort -nr
rg -n "TeamRunMemberMemoryTargetResolver|team-run-member-memory-target|TeamMemberMemoryLayout|getMemberDirPath\(|buildTeamMemberRunId|generateStandaloneAgentRunId|generateTeamRunId\(|agent-run-id-utils|team-member-run-id|team-run-id-utils|owningTeamRunId|child owning" autobyteus-server-ts/src autobyteus-server-ts/tests -S
rg -n 'routeKeyMatches|findMemberTargetInConfig|findMemberTargetInRuntime|endsWith\(' autobyteus-server-ts/src/context-files autobyteus-server-ts/src/agent-memory -S
```

Result: no changed source implementation file exceeds 500 effective non-empty lines; no stale deleted-helper/Round 5 memory-target hits; no active first-match context-file resolver helpers remain. The only suffix matcher is the shared unambiguous selector helper.

- Failed due repository tsconfig shape, not due implementation source diagnostics:

```bash
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.json --noEmit
```

Result: exit 2 with `TS6059` diagnostics because `tsconfig.json` includes `tests` while `rootDir` is `src`. Source-only build typecheck above passed.

## Downstream Coverage Hints / Suggested Scenarios

- API/E2E should verify new standalone and team launches create canonical slug+UUID IDs and fail public manual team/member IDs before allocation.
- Verify restore/import-from-stored-metadata preserves historical IDs.
- Verify nested team-member context-file finalization/read writes under `agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/context_files` and does not use child-sibling or root-direct fallback. Include active duplicate-suffix selectors: ambiguous suffix fails, fully-qualified route resolves, and child-team-scoped suffix resolves only within that child team.
- Verify historical/current team-member projection, memory explorer, application artifact reads, self-evolution, and external-channel recovery use `AgentMemoryLocationService` locations.
- Verify task-agent startup and file-change projection use `agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>` and never reuse the logical template member memoryDir.
- Verify `agent_team` wrapper `memberRunId === childTeamRunId` for new launch topology, while stored historical IDs remain data.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E and broader executable coverage investigation/execution are still required and should be performed by `api_e2e_engineer` after code review passes. This handoff returns to `code_reviewer` first, per the Local Fix reroute rule.
