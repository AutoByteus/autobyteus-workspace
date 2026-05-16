# Design Spec

## Current-State Read

History reload currently has two UI-facing entrypoints:

```text
Standalone run history click
  -> GraphQL getRunProjection(runId)
  -> AgentRunViewProjectionService
  -> projection source(s)
  -> canonical RunProjection
  -> frontend hydration

Team-member history click
  -> GraphQL getTeamMemberRunProjection(teamRunId, memberRouteKey)
  -> TeamMemberRunViewProjectionService
  -> projection source(s)
  -> canonical RunProjection
  -> frontend hydration
```

The delivered implementation mixes two historical representations for Codex team members:

```text
local raw/replay trace projection
  + Codex native thread projection from CodexRunViewProjectionProvider
  -> mergeProjectionBundles(...)
  -> duplicate/incorrect transcript tail
```

Post-delivery reproduction against the current Electron backend showed the failure shape:

- backend projection contains many tool rows;
- later projection rows contain duplicated text/reasoning-only content;
- frontend scrolls/renders the tail, so the visible history looks like `Thinking -> prose` without adjacent tool cards.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/post-delivery-live-repro.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/current-electron-backend-implementation-projection.json`
- `/Users/normy/.autobyteus/browser-artifacts/b0b990-1778916761455.png`

The user clarified the desired behavior: history display only needs the locally recorded application history. If an older run has no local history, empty/incomplete display is acceptable. No Codex-native fallback or recovery is required.

Therefore the design should not choose between “raw trace plus Codex merge” and “Codex provider authoritative.” The clean design is **local replay authoritative for display across all runtimes**.

## Intended Change

Make the local application-owned replay trace the sole normal UI history source for all runtimes, including Codex.

```text
Normal UI history display = local replay trace -> canonical RunProjection
Runtime-native providers = not used for normal UI history
Fallback/recovery = none
Local/native merge = none
```

The user-visible result should be that restart/history reload renders the same app-recorded event stream that was produced live. If local replay history contains reasoning, tools, and assistant text, those are rendered. If local replay history is missing, the history may be empty/incomplete rather than reconstructed from Codex native thread history.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug fix + source-authority refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Duplicated Policy Or Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Current Codex team-member history path can merge local replay projection and Codex-native provider projection.
  - Reproduction showed tool rows followed by duplicate text/reasoning-only tail rows.
  - The frontend can render canonical local projection tool rows; the failure is source composition/order, not a need for runtime-specific UI logic.
  - The user explicitly accepts no fallback/recovery when local history is absent.
- Design response:
  - Make local replay projection the single display authority.
  - Remove runtime-native providers from normal GraphQL history APIs.
  - Remove local/native projection merge from normal UI display.
  - Keep frontend runtime-agnostic.

## Terminology

- **Local replay trace**: The app-owned persisted event/trace stream used to replay what the application observed live: user text, reasoning, tool calls/results, assistant text, and related lifecycle facts.
- **Canonical projection bundle**: Backend `RunProjection` with `conversation` and `activities` arrays consumed by GraphQL/frontend.
- **Runtime-native history**: External/runtime-owned history, such as Codex `thread/read`. Not used by normal UI history after this change.
- **Normal UI history**: The projection returned by `getRunProjection` and `getTeamMemberRunProjection` for user-facing history display.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove/decommission Codex-native provider selection from normal UI history APIs.
- Do not keep a Codex fallback/recovery path for missing local histories.
- Do not keep local/native merge as a Codex history correctness mechanism.
- Do not add frontend runtime-specific display branches.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User selects standalone history | Frontend renders local replay projection | `AgentRunViewProjectionService` | Establishes local replay as sole standalone display source. |
| DS-002 | Primary End-to-End | User selects team-member history | Frontend renders member local replay projection | `TeamMemberRunViewProjectionService` + `AgentRunViewProjectionService` | Establishes the same source policy for team members. |
| DS-003 | Bounded Local | Local trace records | `HistoricalReplayEvent[]` then `RunProjection` | Local replay projection provider/transformer | Converts stored local events into canonical UI rows. |
| DS-004 | Return/Event | Local projection rows | Frontend conversation/activity state | Frontend hydration services | Confirms frontend stays canonical-projection-only. |

## Primary Execution Spine(s)

### Standalone run

```text
History click
  -> getRunProjection(runId)
  -> AgentRunViewProjectionService
  -> LocalReplay/LocalTraceRunViewProjectionProvider
  -> buildHistoricalReplayEvents(local raw/replay traces)
  -> RunProjection
  -> frontend hydration
```

### Team-member run

```text
Team-member history click
  -> getTeamMemberRunProjection(teamRunId, memberRouteKey)
  -> TeamMemberRunViewProjectionService resolves member metadata + member memoryDir
  -> AgentRunViewProjectionService
  -> LocalReplay/LocalTraceRunViewProjectionProvider
  -> buildHistoricalReplayEvents(member local raw/replay traces)
  -> RunProjection
  -> frontend hydration
```

No runtime-native provider participates in either normal UI path.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user selects a standalone run; backend reads the local replay trace and returns canonical rows. | GraphQL resolver, `AgentRunViewProjectionService`, local replay provider, frontend hydration | `AgentRunViewProjectionService` | Missing local history handling |
| DS-002 | The user selects a team member; team-member service resolves identity/memory location, then the same local replay path returns canonical rows. | GraphQL resolver, `TeamMemberRunViewProjectionService`, `AgentRunViewProjectionService`, local replay provider | `TeamMemberRunViewProjectionService` for identity; `AgentRunViewProjectionService` for projection | Member memory layout |
| DS-003 | Stored local trace records are converted to historical replay events, then into conversation/activity rows. | Raw/replay trace records, transformer, projection bundle builder | Local replay projection provider/transformer | Trace schema tolerance |
| DS-004 | The frontend consumes only canonical rows and renders messages/tool cards/activity entries. | Run history store, projection hydration, conversation components | Frontend hydration | Visual regressions |

## Ownership Map

- **GraphQL resolvers** own transport exposure only. They must not choose runtime-native fallback, read Codex threads, or merge sources.
- **`TeamMemberRunViewProjectionService`** owns team/member identity resolution and member memory location construction. It must not merge local/native sources.
- **`AgentRunViewProjectionService`** owns normal UI projection source policy: local replay only.
- **Local replay projection provider** owns reading local replay/raw trace records and converting them into canonical `RunProjection` through existing replay transformers.
- **Runtime-native providers** such as `CodexRunViewProjectionProvider` do not own normal UI history display. If retained, they must be outside `getRunProjection` / `getTeamMemberRunProjection` source policy.
- **Raw trace persistence** owns durable storage of app-observed events; those traces may serve display replay and future memory, but display reads them directly rather than reconciling with runtime-native history.
- **Frontend hydration/rendering** owns canonical row display only.

## Authoritative Boundary Map

| Authoritative Boundary | Encapsulates | Upstream Callers That Must Use It | Forbidden Bypass Shape | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunViewProjectionService.getProjection*` | Local-only normal UI source policy | GraphQL resolvers, team-member service | Runtime-specific provider/fallback selection outside the service | Centralize local-only policy here. |
| Local replay projection provider | Reading local trace storage and building canonical projection | `AgentRunViewProjectionService` | Direct Codex thread reconstruction for display | Use local trace only. |
| `TeamMemberRunViewProjectionService` | Team-member metadata and memory path resolution | Team-member GraphQL resolver | Direct source merge or Codex provider calls | Delegate projection loading to `AgentRunViewProjectionService`. |
| Frontend projection hydration | Canonical projection-to-UI mapping | UI stores/components | Codex/raw trace specific display branches | Fix backend projection source. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `CodexRunViewProjectionProvider` in normal `getRunProjection` / `getTeamMemberRunProjection` path | Codex native history is not the display source. | Local replay projection provider. | In This Change | Delete if no non-UI diagnostic use remains; otherwise remove from normal provider registry. |
| Local/native `mergeProjectionBundles(...)` for normal UI display | There is only one display source. | Local replay projection. | In This Change | Merge helper may remain only for separate explicitly-owned use cases. |
| `TeamMemberLocalRunProjectionReader` as a separate bypass | A unified local replay provider can read explicit member `memoryDir`. | Local replay provider via `AgentRunViewProjectionService`. | In This Change if feasible | Avoid two local replay implementations. |
| Codex provider dynamic/MCP coverage as a UI requirement | Codex provider is not the display path. | Local replay trace coverage. | In This Change | Existing code may remain only if scoped outside normal UI display. |
| Frontend Codex-specific workaround | Backend returns canonical local projection. | Existing projection hydration. | In This Change | No UI branch. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why |
| --- | --- | --- | --- |
| Local replay/raw trace -> projection | `LocalMemoryRunViewProjectionProvider` + `raw-trace-to-historical-replay-events.ts` | Reuse/rename if needed | Already builds canonical projection from raw traces. |
| Team-member memory location | `TeamMemberMemoryLayout` | Reuse | Already resolves member memory directories. |
| Canonical bundle building | `buildRunProjectionBundleFromEvents` | Reuse | Existing projection builder remains the right output contract. |
| Codex native thread provider | `CodexRunViewProjectionProvider` | Decommission from normal UI path | Not needed when local-only is accepted. |
| Frontend hydration | `autobyteus-web/services/runHydration/*` | Reuse | Frontend already renders canonical tool rows. |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern | Required Change |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Normal UI projection source authority | Always load local replay projection for normal history APIs. | Remove runtime-native provider selection/fallback/merge for normal UI projection. |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Team-member projection facade | Resolve member metadata and delegate local replay projection. | Stop local/native merge; use unified local replay path. |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Local replay projection provider | Read local raw/replay traces and build canonical projection. | Consider rename to `local-trace-run-view-projection-provider.ts` or document display ownership clearly. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Local trace transformer | Convert stored trace records to replay events. | Ensure reasoning/tool/text order is preserved for Codex local traces. |
| `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | Runtime-native Codex reconstruction | Not normal UI history. | Remove from normal provider registry/path; delete if unused. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts` | Provider lookup | Should not pick runtime-native providers for normal UI display. | Simplify or scope away from normal history APIs. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-merge.ts` | Optional merge utility | Not normal UI display. | Remove from normal path; keep only if another explicit use remains. |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts` | Backend service tests | Local-only projection policy. | Assert no Codex provider/fallback call and empty local remains empty. |
| `autobyteus-server-ts/tests/unit/run-history/services/team-member-run-view-projection-service.test.ts` | Backend service tests | Team-member local replay path. | Assert member memoryDir local replay works for Codex and non-Codex. |
| `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` | Frontend tests | Canonical row rendering. | Keep passing; no runtime-specific branch. |

## Dependency Rules

- GraphQL depends on run-history services only.
- `TeamMemberRunViewProjectionService` may depend on team-run metadata and memory layout; it must not call Codex native providers.
- `AgentRunViewProjectionService` depends on the local replay projection provider for normal UI history.
- Local replay provider may depend on memory storage/read services and raw trace transformer.
- Normal UI history APIs must not depend on Codex native thread reader/provider.
- Frontend depends only on canonical projection rows.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Standalone normal UI history | Return local replay projection | `runId` | No runtime-native fallback. |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Team-member normal UI history | Resolve member then return local replay projection | `teamRunId` + member route key/name fallback | No runtime-native fallback. |
| `AgentRunViewProjectionService.getProjectionFromMetadata(...)` | Local-only projection authority | Build projection from local replay storage | `runId` + `metadata.memoryDir` when available | Runtime kind may be metadata, but not source selector. |
| Local replay provider `buildProjection(...)` | Local replay storage projection | Read raw traces and build canonical rows | `memoryDir` or run id | Sole normal UI source. |

## Concrete Examples / Shape Guidance

### Bad current shape

```text
Codex team member history
  -> local replay projection
  -> Codex native projection
  -> merge
  -> duplicate text/reasoning tail
```

### Good target shape

```text
Codex team member history
  -> member local replay trace
  -> canonical RunProjection
  -> frontend hydration
```

### Missing local history

```text
Codex native thread exists
local replay trace missing
normal UI projection: empty/incomplete local result
```

This is intentional. Do not fallback to Codex native reconstruction.

## Implementation Sequence

1. Add source-policy tests first: Codex standalone/team-member history must not call Codex provider and must not fallback when local history is empty.
2. Refactor `AgentRunViewProjectionService` to use only the local replay provider for normal UI history.
3. Refactor `TeamMemberRunViewProjectionService` to route member metadata/memoryDir into the same local replay path.
4. Remove `CodexRunViewProjectionProvider` from normal provider registry/source selection; delete or explicitly re-scope it if unused.
5. Remove local/native merge from the normal history path.
6. Run focused backend tests and frontend canonical hydration tests.
7. Update durable docs to state local replay trace is the display authority and Codex native thread history is not used for normal UI history.

## Test / Validation Plan

Mandatory deterministic tests:

- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts`
  - Codex run with local traces returns local projection.
  - Codex run with no local traces returns empty projection even if a mocked Codex provider could return rows.
  - Non-Codex run uses the same local path.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/services/team-member-run-view-projection-service.test.ts`
  - Codex member with local traces returns local projection.
  - Codex member with no local traces returns empty projection, no Codex provider fallback.
  - Non-Codex member uses the same local path with member memoryDir.
- `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/projection/raw-trace-to-historical-replay-events*.test.ts` or equivalent projection test
  - Local trace fixture with reasoning -> tool call -> assistant text preserves order and canonical tool rows.
- `cd autobyteus-web && pnpm exec nuxi prepare && pnpm exec cross-env NUXT_TEST=true vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts --config vitest.config.mts --maxWorkers=1`
- `cd autobyteus-web && pnpm exec cross-env NUXT_TEST=true vitest run stores/__tests__/runHistoryStore.spec.ts --config vitest.config.mts --maxWorkers=1`

Live/reproduction validation:

- Start backend and frontend per README.
- Seed fixtures.
- Run a Codex/team-member scenario that emits visible tools.
- Stop/restart backend/server process.
- Reload the same history in the frontend.
- Confirm the displayed transcript comes from local replay and contains tool cards adjacent to their turn text.

## Risks / Edge Cases

- Older runs with no local trace will show empty/incomplete history. This is accepted by the clarified requirement.
- If local trace writing misses some live event, history display will also miss it. That is the right failure boundary; fix trace writing, not Codex fallback.
- Existing Codex provider code/tests/docs may need cleanup to avoid implying it remains the UI source.
- The file name `LocalMemoryRunViewProjectionProvider` may be misleading if it becomes the explicit display replay provider; rename or document the ownership clearly.

## Acceptance Criteria Trace

- AC-001/AC-002/AC-003: Local replay trace with Codex reasoning/tool/text events produces canonical tool rows.
- AC-004/AC-005: Missing local history remains empty/incomplete; no fallback/merge.
- AC-006: Standalone and team-member histories use one local replay path across runtimes.
- AC-007: Frontend remains canonical-projection-only.
- AC-008: Docs and tests classify remaining failures as local trace write/read/projection defects, not Codex provider recovery defects.
