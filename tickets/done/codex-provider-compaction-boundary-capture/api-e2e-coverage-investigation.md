# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass from `code_reviewer` for ticket `codex-provider-compaction-boundary-capture`; downstream coverage requested for memory rotation, websocket/team mapping, frontend projection, and hydration behavior.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is that current Codex app-server provider context compaction events must enter the existing `AgentRunEventType.COMPACTION_STATUS` path. `item/started` with normalized `contextCompaction` is a non-rotating provider progress/status event (`status: "compacting"`, `rotation_eligible: false`) for frontend visibility only. `item/completed contextCompaction`, `rawResponseItem/completed context_compaction`, older raw `compaction`, and generated/deprecated `thread/compacted` are completed provider boundaries (`status: "compacted"`, `rotation_eligible: true`) that must persist a `provider_compaction_boundary` marker and rotate pre-boundary active raw traces. Duplicate completed reports for the same stable boundary must produce only one marker and one segment, while distinct stable completed IDs in the same turn must not over-merge. `compaction_trigger` must not create a marker or segment. Existing Claude provider compaction and AutoByteus/native compaction behavior must remain valid. Single-agent and team websocket streams must preserve provider compaction payload fields through existing `COMPACTION_STATUS`; frontend live projection and historical hydration must surface compaction activity rows without conversation replay pollution.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility wrapper, no legacy old-behavior retention, no alternate storage/transport path. Source inspection matches that claim: the current implementation adds Codex-local classification and lifecycle routing while preserving the existing recorder, websocket mapper, and frontend projection owners.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Codex `item/started contextCompaction` emits provider compaction status | Added | `R-CODEX-COMPACTION-001`, `AC-CODEX-COMPACTION-001`, design DS-001, implementation handoff | Retain converter unit coverage; add/execute recorder integration coverage that proves no raw-trace rotation. |
| Codex `item/completed contextCompaction` emits rotating completed provider boundary | Added | `R-CODEX-COMPACTION-001B`, `R-CODEX-COMPACTION-003/004`, `AC-CODEX-COMPACTION-001B` | Add/execute recorder integration coverage with active raw traces, marker, manifest segment, and archive view. |
| Codex `rawResponseItem/completed context_compaction` emits rotating completed provider boundary | Added | `R-CODEX-COMPACTION-002/003/004`, `AC-CODEX-COMPACTION-002` | Add/execute recorder integration coverage for raw current surface. |
| Completed-surface duplicate suppression | Changed | `R-CODEX-COMPACTION-005`, `AC-CODEX-COMPACTION-003`, design duplicate-surface guidance | Add/execute recorder integration coverage showing one active marker and one complete segment for same stable ID. |
| Distinct stable IDs in same turn are not over-merged | Added | Requirements risk/open question, implementation handoff coverage hint, code-review residual focus | Add/execute recorder integration coverage showing two completed provider boundaries/segments for distinct IDs. |
| Codex `compaction_trigger` is non-boundary | Preserved/Changed | `R-CODEX-COMPACTION-006`, `AC-CODEX-COMPACTION-004`, design rejection log | Retain converter unit coverage; add/execute recorder integration coverage that trigger-only produces no marker or segment. |
| Claude provider compaction lifecycle remains visible and correct | Preserved | `R-CODEX-COMPACTION-007/009`, `AC-CODEX-COMPACTION-005/007` | Existing server integration and frontend projection tests are still valid; execute focused tests. |
| Generic single-agent/team websocket `COMPACTION_STATUS` preserves provider fields | Preserved/Changed | `R-CODEX-COMPACTION-008/009`, `AC-CODEX-COMPACTION-006`, design DS-004 | Update/add durable server mapper coverage for provider field preservation, including team-member augmentation. |
| Frontend live projection turns provider statuses into compaction rows and merges lifecycle rows | Preserved | `R-CODEX-COMPACTION-008/009`, `AC-CODEX-COMPACTION-007` | Existing `agentStatusHandler.spec.ts` coverage is still valid; execute focused frontend test. |
| Historical hydration surfaces provider compaction activities and excludes them from conversation replay | Preserved | `R-CODEX-COMPACTION-010`, `AC-CODEX-COMPACTION-008` | Existing hydration and conversation tests are still valid; execute focused frontend tests. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Converter-level Codex compaction lifecycle, raw `context_compaction`, trigger exclusion, dedupe, distinct stable ID behavior | R-001 through R-006; AC-001 through AC-004 | Still Valid | Source inspection shows tests already assert the implemented converter outputs and dedupe decisions named in handoff/code review. | Execute as part of final server coverage; no API/E2E durable edit needed here. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` existing `uses Codex thread/raw compaction duplicate-window conversion...` | Recorder integration for older `thread/compacted` + raw `compaction` duplicate path writes one marker/segment | R-004/R-005/R-007; AC-003/005 | Needs Update | Existing integration covers deprecated/legacy surfaces only, not current `item/completed contextCompaction`, raw `context_compaction`, start-only, trigger-only, or distinct stable IDs. | Add durable integration scenarios in this file. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` Claude compaction test | Claude `status_compacting` is non-rotating; `compact_boundary` rotates | R-007/R-009; AC-005/007 | Still Valid | Existing scenario directly covers the preserved Claude memory lifecycle. | Execute focused integration file. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` current compaction mapper test | Maps semantic compaction status to websocket `COMPACTION_STATUS`; normalizes turn id | R-008/R-009; AC-006 | Needs Update | It proves the message type, but not preservation of provider-specific fields required downstream (`provider`, `source_surface`, `boundary_key`, `runtime_kind`, `turn_id`, `rotation_eligible`). | Add durable provider-payload preservation assertion. |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` with no direct provider compaction unit test | Team mapper delegates member agent events through generic mapper and adds member identity | R-008/R-009; AC-006 | Needs Update | Existing code path is relevant but lacks focused coverage for provider `COMPACTION_STATUS` payload preservation plus team/member fields. | Add durable unit test under `autobyteus-server-ts/tests/unit/services/agent-streaming/`. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts` Codex event mapping test | Active Codex AgentRunEvents reach single-agent websocket as mapped messages | R-008; AC-006 | Still Valid | Existing scenario proves handler path for Codex events generally; mapper-specific provider payload coverage will be added elsewhere. | Execute focused streaming tests if needed; no edit. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts` provider compaction tests | Provider boundary becomes compaction activity; Claude compacting/completed rows merge by provider operation identity; provider/semantic rows do not merge incorrectly | R-008/R-009; AC-007 | Still Valid | Current tests already cover the frontend live projection behavior and Claude lifecycle merge requested by requirements. | Execute focused frontend test. |
| `autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` durable compaction row hydration | Hydrates projected `kind: compaction` rows into `AgentActivityStore`, not tool activities | R-010; AC-008 | Still Valid | Existing test uses provider/codex durable compaction row. | Execute focused frontend test. |
| `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` compaction projection exclusion | Ignores `kind: compaction` in conversation replay | R-010; AC-008 | Still Valid | Existing test explicitly ensures compaction text is not present in conversation content. | Execute focused frontend test. |
| `autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` and `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Server projection of provider raw traces to activity/replay data | R-010; AC-008 | Still Valid | Existing tests cover server historical projection of provider boundaries; frontend hydration tests cover client store behavior. | Execute focused tests if server projection risk appears; no initial edit. |
| Broader compaction-agent tests | AutoByteus semantic compaction agent behavior | R-007; AC-005 | Out Of Scope | This ticket does not change semantic compaction agent settings/fallback logic. | Do not run unless failures point there. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage identified during investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-COD-MEM-001 | `item/started contextCompaction` records a non-rotating provider status and creates no archive segment | R-001; AC-001; implementation handoff coverage hints | `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Converter unit test does not prove recorder non-rotation with active raw traces. |
| APIE2E-COD-MEM-002 | `item/completed contextCompaction` with active raw traces writes one marker and one complete segment | R-001B/R-003/R-004; AC-001B | Same integration file | Proves real recorder/rotation flow. |
| APIE2E-COD-MEM-003 | `rawResponseItem/completed context_compaction` with active raw traces writes one marker and one complete segment | R-002/R-003/R-004; AC-002 | Same integration file | Proves current raw-response provider surface in recorder flow. |
| APIE2E-COD-MEM-004 | Duplicate completed `item/completed contextCompaction` + raw `context_compaction` with same stable ID creates one marker and one segment | R-005; AC-003 | Same integration file | Proves converter + recorder integration dedupe outcome, not just converter output. |
| APIE2E-COD-MEM-005 | Distinct stable completed IDs in the same turn are not over-merged | Requirements risk and code-review residual focus | Same integration file | Prevents data loss from over-broad duplicate window behavior. |
| APIE2E-COD-MEM-006 | Trigger-only `compaction_trigger` creates no marker or segment | R-006; AC-004 | Same integration file | Proves excluded trigger does not affect storage. |
| APIE2E-STREAM-001 | Generic mapper preserves provider compaction payload fields | R-008/R-009; AC-006 | `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Existing mapper test proves type only, not required provider field preservation. |
| APIE2E-STREAM-002 | Team mapper preserves provider fields and adds member identity for `COMPACTION_STATUS` | R-008/R-009; AC-006 | New/updated server unit test under `autobyteus-server-ts/tests/unit/services/agent-streaming/` | Team stream behavior is a named acceptance criterion and has no direct provider compaction assertion. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-COD-MEM-002/003/004/005/006 | `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Extend Codex provider compaction memory coverage beyond old `thread/compacted`/raw `compaction` surfaces. | R-001 through R-006; AC-001 through AC-004 | Add narrow helper functions only inside the test file if needed. |
| APIE2E-STREAM-001 | `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Add provider payload preservation assertion. | R-008/R-009; AC-006 | Keep existing semantic compaction mapper test. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage will be removed. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-SETUP-001 | Temporary `node_modules` symlinks from the installed superrepo checkout into the ticket worktree packages, removed after execution | Enables focused `pnpm exec vitest` / frontend `pnpm exec vitest` commands in an otherwise dependency-less worktree | Environment setup only; no behavior under test. |
| TEMP-CHECK-001 | `git diff --check` after coverage edits | Whitespace/patch hygiene | Standard local check, not product behavior. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Codex app-server compaction against an actual external Codex process | Upstream investigation found no live payload sample; requirements approved generated protocol/docs as contract evidence. Running a forced live provider compaction is not reliable within this validation window. | Additional future Codex event surfaces could require classifier extension. | No reroute; durable tests use generated protocol shapes and source classifier is narrow/easy to extend. |
| Full repository build/typecheck | Implementation and code review documented pre-existing/environment blockers unrelated to this change. | Full-project latent errors remain outside this ticket evidence. | Keep blockers distinct; do not classify as implementation regression unless focused tests reveal a new failure. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity or invalid compatibility behavior found during investigation. | N/A |

## Execution Plan

1. Add/update durable server coverage for recorder memory scenarios APIE2E-COD-MEM-001 through APIE2E-COD-MEM-006.
2. Add/update durable server coverage for single-agent mapper provider field preservation and team mapper member/provider field preservation APIE2E-STREAM-001/002.
3. Set up temporary dependency symlinks from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` only if required by the worktree.
4. Run focused server coverage: Codex converter unit tests, cross-runtime memory integration tests, streaming mapper tests, and `git diff --check`.
5. Run focused frontend projection/hydration coverage that was judged still valid: `agentStatusHandler.spec.ts`, `runProjectionActivityHydration.spec.ts`, and `runProjectionConversation.spec.ts`.
6. Remove temporary symlinks and record cleanup/evidence in the execution report.
7. Because repository-resident durable coverage will be added/updated after initial code review, return the cumulative package to `code_reviewer` for coverage-code review if all focused validation passes.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid but incomplete for current Codex memory/streaming boundaries. No stale coverage removal is planned. No compatibility-only durable coverage will be added.
