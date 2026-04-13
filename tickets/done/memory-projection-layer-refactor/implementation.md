# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The change spans server memory ownership, run-history projection ownership, team-member replay surfaces, and frontend historical hydration, but it remains one bounded historical replay refactor rather than a broader product redesign.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/memory-projection-layer-refactor/workflow-state.md`
- Investigation notes: `tickets/done/memory-projection-layer-refactor/investigation-notes.md`
- Requirements: `tickets/done/memory-projection-layer-refactor/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/memory-projection-layer-refactor/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/memory-projection-layer-refactor/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/done/memory-projection-layer-refactor/proposed-design.md`

## Document Status

- Current Status: `Implementation Complete`
- Notes:
  - The first Stage 6 tranche is complete: replay-bundle ownership moved into `run-history`, historical activities became a sibling read model, and frontend reopen hydration consumes both.
  - The re-entry tranche tightened Codex/live-monitor fidelity by preserving source-native reasoning replay entries and grouping adjacent assistant-side replay entries into one historical AI message with ordered segments.
  - Stage 7 and Stage 8 artifacts will be rerun after this re-entry tranche lands.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed`: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` raw memory read
  - `UC-002` memory inspector memory-only read
  - `UC-003` standalone historical conversation reopen
  - `UC-004` team-member historical replay bundle
  - `UC-005` runtime-backed bundle normalization
  - `UC-006` turn-accurate raw-trace read
  - `UC-007` standalone historical activity reopen
  - `UC-008` source-dependent activity fidelity
  - `UC-009` runtime-backed reopen preserves separate reasoning when present
  - `UC-010` runtime-backed reopen stays truthful when reasoning is absent
  - `UC-011` grouped assistant-side historical hydration
- Spine Inventory In Scope:
  - `DS-001` memory inspector spine
  - `DS-002` standalone historical conversation spine
  - `DS-003` standalone historical activity spine
  - `DS-004` team-member historical replay spine
  - `DS-005` raw-trace precision spine
  - `DS-006` bounded local replay compiler spine
- Primary Owners / Main Domain Subjects:
  - `AgentMemoryService`
  - `AgentRunViewProjectionService`
  - `RunProjectionProvider`
  - `TeamMemberRunViewProjectionService`
  - `runHydration` services
- Requirement Coverage Guarantee:
  - Every requirement maps to at least one use case, one spine, and one implementation task in this baseline.
- Design-Risk Use Cases:
  - `UC-008` source-dependent activity fidelity must stay explicit and not regress into frontend inference.
- Target Architecture Shape:
  - `agent-memory` becomes raw-memory-only.
  - `run-history` owns one replay bundle with sibling `conversation` and `activities`.
  - provider arbitration becomes bundle-aware.
  - team-member replay returns the same bundle shape.
  - frontend historical hydration maps conversation and activities separately.
  - runtime-native reasoning replay entries remain distinct from assistant text when the source provides them.
  - frontend conversation hydration groups adjacent assistant-side replay entries into one AI message in source order.
- New Owners/Boundary Interfaces To Introduce:
  - `run-history/projection/historical-replay-event-types.ts`
  - `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
  - `run-history/projection/transformers/historical-replay-events-to-conversation.ts`
  - `run-history/projection/transformers/historical-replay-events-to-activities.ts`
  - `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts`
  - reasoning-aware replay event types under `run-history/projection`
  - grouped assistant-side hydration logic inside `runProjectionConversation.ts`
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - memory view no longer owns replay DTOs
  - replay payload includes `activities`
  - reopen hydrates right-side activities from server projection
  - team-member replay surface becomes bundle-complete
  - provider arbitration scores replay bundles, not conversation-only projections
  - Codex replay preserves reasoning as a first-class historical entry instead of flattening it into assistant text
  - historical reopen groups reasoning/tool/text into one AI message until the next user boundary
- Key Assumptions:
  - local AutoByteus historical source remains raw traces
  - JSON transport for GraphQL replay payloads can remain during this refactor
  - current memory inspector does not require `conversation`
- Known Risks:
  - bundle-aware selection must not regress current fallback behavior
  - frontend activity hydration must not disturb live streaming behavior
  - team-member surface expansion may reveal unused but now explicit frontend fields
  - grouped historical conversation hydration must not accidentally merge across user boundaries
  - reasoning replay must stay optional so source-limited Codex payloads do not create synthetic `think` segments

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fail | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 2 | Pass | No | No | Yes | N/A | N/A | Candidate Go | 1 |
| 3 | Pass | No | No | Yes | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `3`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement dependencies before dependents.
- Spine-led: raw-memory cleanup and replay internals first, then providers/services, then API surfaces, then frontend hydration.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory cleanup rule: remove obsolete memory replay ownership and wrong-subsystem helpers in scope.
- Mandatory `Authoritative Boundary Rule`: replay callers above `run-history` do not bypass into memory-owned replay helpers or UI-derived replay logic.
- Mandatory file-placement rule: move team-member local replay reader into `run-history`.
- Mandatory shared-structure coherence rule: keep `HistoricalReplayEvent` internal and keep public conversation/activity DTOs distinct.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001,DS-005 | `agent-memory` | memory domain/service cleanup | N/A | raw-memory boundary must be correct before replay reuses it |
| 2 | DS-006 | `run-history` | normalized replay events + builders | 1 | shared replay internals should exist before providers/services depend on them |
| 3 | DS-002,DS-003 | `run-history` | provider/service bundle ownership + metadata/scoring | 2 | standalone replay depends on bundle internals |
| 4 | DS-004 | `run-history` | team-member replay bundle surface | 3 | team path should reuse corrected standalone replay boundary |
| 5 | DS-002,DS-003,DS-004 | `api/graphql` + web hydration | replay payloads + frontend activity hydration | 3,4 | consumer boundaries should change after server bundle is stable |
| 6 | DS-001..DS-006 | tests | unit/integration coverage | 1-5 | verification closes the Stage 6 baseline |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| memory replay DTO ownership | `autobyteus-server-ts/src/agent-memory/domain/models.ts` | same | memory domain | Split | confirm replay DTOs are removed from memory domain |
| raw trace replay transform | `autobyteus-server-ts/src/agent-memory/transformers/raw-trace-to-conversation.ts` | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | replay normalization | Move/Rename | confirm memory layer no longer owns replay compiler |
| team-member local replay reader | `autobyteus-server-ts/src/agent-memory/services/team-member-memory-projection-reader.ts` | `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts` | team replay | Move | confirm no run-history helper remains under `agent-memory` |
| historical activity hydration | `N/A` | `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | web historical hydration | Create | confirm right-pane reopen no longer depends on live-only path |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | DS-001,DS-005 | `agent-memory` | remove replay DTO ownership from memory domain/service | `agent-memory/domain/models.ts`, `agent-memory/services/agent-memory-service.ts` | same | Modify | N/A | Completed | `autobyteus-server-ts/tests/unit/agent-memory/...` | Passed | N/A | N/A | Passed | memory view is raw-memory-only and exposes `toolCallId` on raw traces |
| T-002 | DS-006 | `run-history` | introduce normalized replay events and conversation/activity builders | `N/A` | `run-history/projection/...` | Create | T-001 | Completed | `autobyteus-server-ts/tests/unit/run-history/projection/...` | Passed | N/A | N/A | Passed | replay compilation now normalizes once and fans out to sibling read models |
| T-003 | DS-002,DS-003 | `run-history` | local/runtime providers emit replay bundle | `run-history/projection/providers/*` | same | Modify | T-002 | Completed | `autobyteus-server-ts/tests/unit/run-history/projection/providers/...` | Passed | N/A | N/A | Passed | includes AutoByteus raw-trace path plus Codex/Claude normalization |
| T-004 | DS-002,DS-003 | `run-history` | bundle-aware projection scoring and metadata | `run-history/services/agent-run-view-projection-service.ts`, `run-history/projection/run-projection-utils.ts` | same | Modify | T-003 | Completed | `autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts` | Passed | N/A | N/A | Passed | provider arbitration now scores bundle richness instead of conversation only |
| T-005 | DS-004 | `run-history` | team-member bundle-complete replay surface | `agent-memory/services/team-member-memory-projection-reader.ts`, `run-history/services/team-member-run-view-projection-service.ts` | `run-history/services/team-member-local-run-projection-reader.ts`, same | Move/Modify | T-003,T-004 | Completed | `autobyteus-server-ts/tests/unit/run-history/services/team-member-run-view-projection-service.test.ts` | Passed | `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Passed | Passed | wrong-owner helper removed from `agent-memory` and replaced inside `run-history` |
| T-006 | DS-002,DS-003,DS-004 | `api/graphql` | expose replay bundle payloads | `api/graphql/types/run-history.ts`, `team-run-history.ts` | same | Modify | T-004,T-005 | Completed | `autobyteus-server-ts/tests/unit/api/graphql/...` | Passed | N/A | N/A | Passed | memory GraphQL is memory-only; run-history payloads now expose `activities` |
| T-007 | DS-003,DS-004 | web hydration | historical activity hydration | `autobyteus-web/services/runHydration/runContextHydrationService.ts`, `teamRunContextHydrationService.ts`, `stores/agentActivityStore.ts` | same + `runProjectionActivityHydration.ts` | Create/Modify | T-006 | Completed | `autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` | Passed | `autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` | Passed | Passed | live store API was reused without changing store ownership; reopen now hydrates activities from server projection |
| T-008 | DS-001..DS-006 | tests | close server/web regression coverage | various | same | Modify | T-001..T-007 | Completed | mixed | Passed | mixed | Passed | Passed | stale replay tests/query removed, replacement tests added, GraphQL codegen regenerated cleanly |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-003,AC-006,AC-011 | DS-001,DS-005,DS-006 | Summary, Change Inventory | UC-001, UC-006, UC-008 | T-001,T-002,T-004 | Unit + Integration | AV-001, AV-006 |
| R-002 | AC-001,AC-006 | DS-001 | Change Inventory, Removal Plan | UC-001, UC-002 | T-001 | Unit | AV-001 |
| R-003 | AC-002,AC-003,AC-004,AC-005,AC-007,AC-008 | DS-002,DS-003,DS-004,DS-006 | Summary, Ownership Rules | UC-003, UC-004, UC-005, UC-007 | T-002,T-003,T-004,T-005,T-006 | Unit + Integration | AV-002, AV-003, AV-004 |
| R-004 | AC-001,AC-006,AC-007 | DS-001,DS-002,DS-004 | Subsystem Allocation | UC-001, UC-002, UC-003, UC-004 | T-001,T-006 | Unit | AV-001, AV-002 |
| R-005 | AC-003,AC-009 | DS-002,DS-003,DS-006 | Change Inventory | UC-003, UC-007, UC-008 | T-002,T-003 | Unit | AV-002, AV-005 |
| R-006 | AC-004 | DS-004 | Change Inventory, File Placement | UC-004 | T-005 | Unit | AV-003 |
| R-007 | AC-006,AC-011 | DS-005,DS-006 | Summary, Design Implications | UC-006, UC-008 | T-001,T-002,T-004 | Unit | AV-006 |
| R-008 | AC-007,AC-010 | DS-002,DS-003,DS-004 | Summary, Final File Mapping | UC-003, UC-004, UC-007 | T-006,T-007 | Unit + Integration | AV-002, AV-003, AV-005 |
| R-009 | AC-008,AC-009,AC-010 | DS-003,DS-004,DS-006 | Summary, Change Inventory | UC-003, UC-004, UC-007 | T-002,T-003,T-005,T-006,T-007 | Unit + Integration | AV-003, AV-005 |
| R-010 | AC-009,AC-010 | DS-003 | Ownership Rules | UC-007 | T-007 | Unit + Integration | AV-005 |
| R-011 | AC-011 | DS-003,DS-006 | Summary, Call Stack | UC-007, UC-008 | T-002,T-003,T-004,T-007 | Unit | AV-005, AV-006 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-002 | DS-001 | memory domain no longer owns canonical replay DTO | AV-001 | API | Passed |
| AC-003 | R-001 | DS-002,DS-006 | local AutoByteus replay bundle is built in `run-history` | AV-002 | API | Passed |
| AC-004 | R-006 | DS-004 | team-member replay no longer comes from `agent-memory` | AV-003 | API | Passed |
| AC-005 | R-003 | DS-002,DS-003 | runtime providers emit same replay bundle contract | AV-004 | API | Passed |
| AC-010 | R-010 | DS-003 | historical activity pane hydrates from `projection.activities` | AV-005 | E2E | Passed |
| AC-011 | R-011 | DS-003,DS-006 | source-limited activity fidelity stays explicit | AV-006 | API | Passed |

### Design Delta Traceability

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| C-001..C-006 | T-001,T-002 | Yes | Unit + AV-001/AV-002 |
| C-007..C-010 | T-002,T-003,T-004,T-005 | Yes | Unit + AV-002/AV-003/AV-004 |
| C-011..C-015 | T-006,T-007 | No | Unit + E2E AV-005 |
| C-016..C-018 | T-004,T-005,T-006,T-007 | No | Unit + API/E2E |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | `MemoryConversationEntry` in memory domain | Remove | delete type and remove downstream imports | ensure run-history replacement lands first |
| T-DEL-002 | `includeConversation` memory path | Remove | delete query args, service branches, and unused GraphQL surface | verify no memory UI consumer remains |
| T-DEL-003 | `team-member-memory-projection-reader.ts` | Move | replace imports and remove old file | keep team-member tests aligned |

### Step-By-Step Plan

1. Remove replay DTO ownership from `agent-memory` and expose raw traces only.
2. Add normalized replay events and separate conversation/activity builders in `run-history`.
3. Update providers and replay services to emit one bundle and score it bundle-first.
4. Move the team-member local replay reader into `run-history` and return the same bundle shape.
5. Update GraphQL replay payloads and frontend historical activity hydration.
6. Add unit/integration coverage for bundle output and right-side historical activity hydration.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design-principles guidance reapplied during implementation: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails: `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/memory-projection-layer-refactor/code-review.md`
- Scope (source + tests):
  - server memory/run-history files
  - GraphQL replay surfaces
  - web historical hydration and activity store paths
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - split builders/services before Stage 8 if any changed source file trends too large
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - monitor `agent-run-view-projection-service.ts`, provider files, and hydration services closely
- file-placement review approach:
  - confirm replay code lives only under `run-history` and raw-memory code lives only under `agent-memory`

### Test Strategy

- Unit tests:
  - replay event normalization
  - conversation/activity builders
  - bundle-aware projection scoring
  - team-member replay service
  - activity hydration/store behavior
- Integration tests:
  - standalone reopen payload
  - team-member reopen payload
  - historical right-side activity hydration
- Stage 6 boundary:
  - file and service-level verification only (unit + integration)
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/memory-projection-layer-refactor/api-e2e-testing.md`
  - expected acceptance criteria count: `11`
  - critical flows to validate:
    - memory API stays memory-only
    - standalone replay bundle reopen
    - team-member bundle reopen
    - runtime provider normalization
    - right-side historical activity hydration
    - source-limited activity fidelity
    - Codex reasoning preservation when present and truthful reasoning absence when not present
    - grouped assistant-side historical hydration into one AI message per user-bounded assistant turn

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/memory-projection-layer-refactor/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/memory-projection-layer-refactor/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-11: Stage 6 implementation baseline created after Stage 5 `Go Confirmed`.
- 2026-04-11: Removed `MemoryConversationEntry`, `AgentMemoryView.conversation`, and `includeConversation` / `conversationLimit` memory-service and GraphQL paths so `agent-memory` became raw-memory-only.
- 2026-04-11: Added `HistoricalReplayEvent` normalization plus run-history-owned conversation and activity builders, then rewired the local AutoByteus provider to compile replay inside `run-history`.
- 2026-04-11: Updated Codex and Claude providers, bundle-aware projection scoring, team-member replay ownership, and GraphQL replay payloads so `conversation` and `activities` move together as one server-owned bundle.
- 2026-04-11: Added frontend historical activity hydration, removed the dead `agentRunQueries.ts` codegen blocker, regenerated GraphQL types, and replaced stale memory-owned replay tests with run-history-owned coverage.
- 2026-04-11: Re-ran targeted Stage 6/7 regression commands, live Codex terminate/restore/continue replay validation, and `build:full`; implementation is complete and validation evidence is captured in `api-e2e-testing.md`.
- 2026-04-11: Stage 7 re-entry opened as `Local Fix` when direct Claude provider coverage showed the old unit test still invoked the pre-refactor provider input shape. Returning to Stage 6 to update the test and then rerun Stage 7.
- 2026-04-11: Updated `claude-run-view-projection-provider.test.ts` to the new `RunProjectionProviderInput.source` contract and re-ran the expanded server regression bundle successfully.
- 2026-04-11: Re-entry Stage 6 added a first-class historical `reasoning` event, updated the Codex provider to preserve source order without flattening reasoning into assistant text, and added grouped assistant-side historical hydration in `runProjectionConversation.ts`.
- 2026-04-11: Re-entry Stage 6 added durable coverage for grouped historical conversation hydration and reran the focused run-history projection plus integration regression bundle successfully.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-04-11 | projection conversation only | projection replay bundle (`conversation` + `activities`) | Stage 5 review + user clarification | design/call stack refreshed before implementation |
