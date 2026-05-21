# Persisted Attribute Audit: Run Metadata And History Index

## Status

Refined investigation artifact. Scope is standalone agent run metadata/index first, with team metadata/index and adjacent `lastFailure` notes where they affect the user's questions.

## Audit Principle

Persist durable facts only. Do not persist live runtime state as truth.

A field is justified in durable storage only if at least one of these is true:

1. it is required to restore/resume a historical run;
2. it records durable user intent or irreversible lifecycle fact, such as archive/delete/terminate;
3. it is a compact catalog fact that cannot be cheaply or deterministically derived and is needed for fast list display;
4. it is an external/native runtime continuation handle, such as a Codex thread id.

A field is not justified if it is only a current-process/liveness signal (`ACTIVE`, `ACTIVATING`, transient failure), because current-process/liveness state must come from command overlays, active runtime managers, and streams.

## Evidence Sources

- `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts`
- `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts`
- `autobyteus-server-ts/src/run-history/store/agent-run-history-index-record-types.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts`
- `autobyteus-web/graphql/queries/runHistoryQueries.ts`
- `autobyteus-web/stores/runHistoryTypes.ts`
- `autobyteus-web/stores/runHistoryReadModel.ts`
- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts`
- `autobyteus-web/graphql/mutations/agentMutations.ts`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` for the adjacent `lastFailure` question.

## Standalone Agent `run_metadata.json`

Current type: `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts`.

| Field | Current purpose found in code | Value classification | Recommendation |
| --- | --- | --- | --- |
| `runId` | Identity; path validation; restore; API lookups. | Essential durable identity. | Keep. |
| `agentDefinitionId` | Restore config; grouping/display; definition lookup. | Essential durable config/catalog. | Keep. |
| `workspaceRootPath` | Restore config; grouping/display; file-change absolute path resolution. | Essential durable config/catalog. | Keep canonicalized. |
| `memoryDir` | Restore config; run projection; file-change projection; published-artifact projection; deletion/cancel path. | Essential storage pointer in current architecture. It is sometimes derivable for standalone default layout, but many services currently consume explicit memoryDir. | Keep for this change. If removed later, first centralize memory path derivation and prove no custom/non-default memory-dir cases remain. |
| `llmModelIdentifier` | Restore/resume config. | Essential durable config. | Keep. |
| `llmConfig` | Restore/resume provider config. | Essential if provider/model settings affect resume. | Keep, normalized to `null` when absent. |
| `autoExecuteTools` | Restore/resume tool behavior. | Essential durable config. | Keep. |
| `skillAccessMode` | Restore/resume skill behavior. | Essential durable config. | Keep; normalize default at config boundary if possible. |
| `runtimeKind` | Backend factory selection and restore routing. | Essential durable config. | Keep. |
| `platformAgentRunId` | Codex thread id / Claude session id / native continuation handle. | Essential external continuation handle when present. | Keep. |
| `lastKnownStatus` | Restore block for `TERMINATED`; historical projection for `ERROR`/`TERMINATED`; copied into global index and API. Also stores `ACTIVE` after activation/activity/restore. | Mixed runtime liveness + terminal policy + UI fallback. `ACTIVE` is invalid as durable truth after restart. | Remove as durable truth. Replace terminal behavior with explicit `terminatedAt` or `terminalState`. Derive API status at read time. |
| `activationState` | Prepared identity workflow, restore gating, activation retry, stale prepared cleanup, projection source. | Partly useful concept, but enum currently stores transient process state. `ACTIVATING` can wedge a run after crash; `ACTIVATION_FAILED` is a transient command outcome, not a durable catalog fact. | Replace enum with durable facts: `preparedAt`/`preparedExpiresAt` for unstarted prepared identity, `startedAt` for started run, `terminatedAt` for terminal user intent. Do not persist `ACTIVATING` or `ACTIVATION_FAILED`. |
| `preparedAt` | Prepared identity timestamp; stale cleanup. | Useful only because current frontend prepares a permanent run id before WebSocket send. | Keep if prepared-run UX remains; otherwise remove with prepare/cancel flow. |
| `preparedExpiresAt` | Expiry for unactivated prepared identities. | Useful only if prepared-run UX remains. | Keep if prepared-run UX remains; otherwise remove. |
| `archivedAt` | Durable user action to hide inactive archived runs while retaining data. | Durable user lifecycle fact. | Keep. |
| `applicationExecutionContext` | Application-bound run orchestration/artifact context. | Product feature context. | Keep if application-bound runs remain supported. |

### Missing Catalog Fields Needed If Global Index Is Decommissioned

The current metadata does not store all catalog facts that `run_history_index.json` stores. If the global index stops being the list source, add a tight metadata-owned catalog section or equivalent fields:

| Needed field | Why needed | Recommendation |
| --- | --- | --- |
| `createdAt` | Stable creation order and diagnostics. | Add if not already derivable reliably. |
| `lastActivityAt` | Sorting/recency in current code. | Low product value for normal history UX and causes frequent writes. | Remove from persisted index/cache and avoid as normal list ordering key. Compute on demand if detail view needs it. |
| `summary` | Fast list title. Current index owns it; raw traces can recover but should not be required on every list. | Add as metadata/catalog fact or per-run compact catalog field. |
| `startedAt` | Replaces durable `ACTIVATED` only if prepared-run flow needs to distinguish never-started from started. | Keep in metadata only if needed by prepared launch flow; do not put in history index unless needed for UI. |
| `terminatedAt` | Durable fact that user stopped/terminated the live runtime; may support audit/display/control. | Keep as durable lifecycle fact, but do not treat as live status. It should block resume only if product policy explicitly wants termination to be final. |

## Standalone Agent `run_history_index.json` Row

Current type: `autobyteus-server-ts/src/run-history/store/agent-run-history-index-record-types.ts`.

| Field | Current purpose found in code | Value classification | Recommendation |
| --- | --- | --- | --- |
| `runId` | Identity for list row. | Essential history catalog identity. | Keep in V2 standalone history index/catalog. |
| `agentDefinitionId` | Grouping. | Display/catalog field. | Keep as derived snapshot field if snapshot remains. |
| `agentName` | Display name; denormalized definition lookup. | Useful display cache. | Keep only as derived/enrichment snapshot field if historical display should survive definition rename/delete; otherwise derive from definition service. |
| `workspaceRootPath` | Workspace grouping. | Display/catalog field. | Keep as derived snapshot field if snapshot remains. |
| `summary` | List title. | Useful display fact, but currently global-only for many rows. | Move authoritative value into per-run metadata/catalog; legacy index may be read once to preserve existing summaries. |
| `lastActivityAt` | Sorting/recency in current code. | Low-value write amplifier. | Remove from simplified index/cache. Use `createdAt` for stable ordering; compute activity on demand if needed. |
| `lastKnownStatus` | Initial status/status fallback. | Runtime-ish mixed status. | Remove from persisted snapshot/cache. If API still returns a similarly named field during frontend transition, compute it from derived status rather than writing it. |

## Runtime Status Derivation Target

At API read time, status should be derived like this:

```text
if command overlay exists -> overlay status
else if active runtime manager has the run -> active runtime status
else if terminatedAt is set -> offline / terminated metadata source
else if preparedAt exists and startedAt is absent -> offline / prepared identity
else -> offline / historical metadata
```

The API can keep a response field named `status` and maybe `statusSource`. A response field named `lastKnownStatus` is not conceptually necessary; if temporarily retained in API/frontend code, it should be a derived compatibility projection, not a persisted field.

## `activationState` Deep Assessment

Current values and audit result:

| Value | Current behavior | Durable value? | Recommendation |
| --- | --- | --- | --- |
| `PREPARED` | Permanent run id exists, metadata and history row exist, runtime not started yet. Frontend currently needs this because it calls `prepareAgentRun`, promotes a temp id, finalizes attachments, connects WebSocket, then sends the first message. | Yes, the prepared identity concept has current product value. | Keep the concept, but represent it as `preparedAt`/`preparedExpiresAt` plus no `startedAt`, not a broad enum. |
| `ACTIVATING` | Written immediately before runtime creation; command coordinator rejects future commands while it is present. | No. This is in-flight process state. If the process crashes here, the metadata is stuck in `ACTIVATING` and future activation is rejected. | Remove from durable storage; use command registry/in-memory per-run activation lock. |
| `ACTIVATED` | Means runtime has been started at least once and restore is allowed. | The fact has value, but the name is runtime-state-like. | Replace with `startedAt` or equivalent durable `started` fact. |
| `ACTIVATION_FAILED` | Written after activation failure; command coordinator treats it as retryable; status projection shows error. | Weak/no durable value. It records a failed attempt, not a stable state of the run. | Do not persist as lifecycle. After failed activation, either leave the prepared identity retryable or remove it. The command response/overlay/log should carry the failure. |

Conclusion: current `activationState` is not clean enough. `PREPARED` and `ACTIVATED` encode real facts, but `ACTIVATING` and `ACTIVATION_FAILED` are transient runtime process outcomes and should not survive process restart.

## `lastKnownStatus` Deep Assessment

Current durable values and audit result:

| Value | Current use | Durable value? | Recommendation |
| --- | --- | --- | --- |
| `ACTIVE` | Written to metadata/index on activation, restore, and activity. Frontend may show running if active, but backend already projects active from overlay/manager. | No. After server restart there is no active runtime, even if metadata says `ACTIVE`. | Remove from durable storage. |
| `IDLE` | Written for prepared runs and inactive rows. | Mostly a display fallback; inactive can be derived from absence of live runtime. | Remove; derive `offline`/idle display at read time. |
| `ERROR` | Written after activation failure; used for red/error initial display. | Weak. It is a last attempt result, not necessarily a durable run state. | Do not persist for normal run lifecycle unless product explicitly requires historical failure badges. If required later, store a narrow failure fact (`lastErrorAt`/`lastErrorMessage`) with retention policy, not broad status. |
| `TERMINATED` | Blocks restore/send; historical display. | The terminal policy has value, but status enum is the wrong representation. | Replace with `terminatedAt` or `terminalState`. |

Conclusion: user concern is correct. `lastKnownStatus` does not provide enough unique value to justify being stored in both metadata and index. It is an overlapping representation of runtime state, terminal policy, and UI state.

## `lastFailure` Assessment

There is no `lastFailure` field in standalone agent run metadata or the standalone run-history index today. I should not add one to run metadata as a replacement for `lastKnownStatus` unless the product explicitly wants persistent historical failure messages.

The existing `lastFailure` occurrences are in the application-engine host status, not run history:

- `ApplicationEngineHostService` keeps `lastFailure` in `ApplicationEngineStatus` and writes it to `engine-status.json` only when engine startup/load fails or the worker exits unexpectedly.
- `applicationHostStore` and `ApplicationShell.vue` use it to show why an application backend launch failed.

So the audit result is split:

- for run history: do not add/persist `lastFailure` now;
- for application engine status: `lastFailure` has direct frontend error-display value and is outside the run-history index bug.

## Team `team_run_metadata.json`

Current type: `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts`.

| Field | Current purpose found in code | Value classification | Recommendation |
| --- | --- | --- | --- |
| `teamRunId` | Identity. | Essential. | Keep. |
| `teamDefinitionId` | Restore/display. | Essential. | Keep. |
| `teamDefinitionName` | Display, denormalized. | Useful display cache. | Keep if historical display should survive definition rename/delete. |
| `coordinatorMemberRouteKey` | Restore/execution topology. | Essential. | Keep. |
| `createdAt` | Display/sorting fallback. | Durable fact. | Keep. |
| `updatedAt` | Sorting/activity fallback. | Useful catalog fact. | Keep. |
| `archivedAt` | Hide inactive archived teams. | Durable user action. | Keep. |
| `memberTree` | Recursive restore topology and member configs. | Essential for team restore/projection. | Keep. Audit member fields before simplifying. |

## Team Member Metadata Fields

| Field group | Current purpose | Recommendation |
| --- | --- | --- |
| Identity/path: `memberKind`, `memberRouteKey`, `memberPath`, `memberName`, `memberRunId` | Team topology, duplicate names, storage ids. | Keep. |
| Descriptive: `role`, `description` | Display/context. | Keep only if used in team UI/projection; otherwise candidate for derive-from-definition. |
| Agent runtime config: `runtimeKind`, `platformAgentRunId`, `agentDefinitionId`, `llmModelIdentifier`, `autoExecuteTools`, `skillAccessMode`, `llmConfig`, `workspaceRootPath`, `applicationExecutionContext` | Restore team member runtime. | Keep if team runs must be restorable/replayable. |
| Subteam: `teamDefinitionId`, `teamRunId`, `coordinatorMemberRouteKey`, `memberTree` | Nested team restore. | Keep if nested teams remain supported. |

## Team `team_run_history_index.json` Row

Current type: `autobyteus-server-ts/src/run-history/store/team-run-history-index-record-types.ts`.

| Field | Current purpose found in code | Value classification | Recommendation |
| --- | --- | --- | --- |
| `teamRunId` | Identity. | Essential if snapshot exists. | Keep only as derived snapshot identity. |
| `teamDefinitionId` | Grouping/display. | Display/catalog. | Derive from team metadata. |
| `teamDefinitionName` | Display. | Display/catalog. | Derive from team metadata or keep denormalized in metadata. |
| `workspaceRootPath` | Grouping. | Display/catalog. | Derive from team metadata/member tree. |
| `summary` | List title. | Display/catalog. | Move authoritative summary into team metadata/catalog or derive from coordinator traces. |
| `lastActivityAt` | Sorting. | Display/catalog. | Use team metadata `updatedAt` or catalog activity fact. |
| `lastKnownStatus` | UI fallback/live-ish state. | Runtime-ish mixed status. | Remove from persisted snapshot; derive API status from live team manager plus durable facts. |
| `deleteLifecycle` | Used by frontend to show/hide destructive delete actions and reserve `CLEANUP_PENDING`. | Possibly real lifecycle fact for deferred destructive cleanup; currently personal mostly uses `READY`. | Keep only if deferred cleanup remains a product path. Otherwise remove when team delete lifecycle is simplified. |

## Frontend Usage Summary

Frontend current usage does not prove persisted `lastKnownStatus` is needed:

- GraphQL query asks for both `status` and `lastKnownStatus`.
- `runHistoryReadModel.ts` maps backend `status` into `currentStatus`; status dots/actions in `WorkspaceHistoryWorkspaceSection.vue` use `currentStatus` and `isActive`.
- `runHistoryStore.ts` uses `lastKnownStatus` mostly to keep local rows from showing error/terminated as idle when active ids are reconciled.
- mobile catalog labels use `toStatusLabel(run.lastKnownStatus, run.isActive)`, which can be derived from `status`/`isActive` instead.

Conclusion: frontend can be adjusted to consume derived `status`/`isActive` (and a narrow derived display label if needed). It does not require durable `lastKnownStatus` to be stored in files.

## Revised Minimal Standalone Durable Metadata Shape Candidate

After the user clarified that `run_history_index.json` remains the normal fast history catalog, standalone metadata should be kept focused on resume/config plus prepared/start facts. Catalog/list fields should not be duplicated into metadata in the target steady state.

```ts
type AgentRunMetadata = {
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string;
  memoryDir: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode | null;
  platformAgentRunId: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;

  // prepared/start facts needed by command routing / resume
  preparedAt?: string | null;
  preparedExpiresAt?: string | null;
  startedAt?: string | null;
};
```

No durable `lastKnownStatus`. No durable `activationState`. No durable `ACTIVATING`. No durable `ACTIVATION_FAILED`. No persisted `lastActivityAt`. No catalog fields such as `summary`, `createdAt`, `archivedAt`, or `terminatedAt` in steady-state metadata; those belong to the standalone history index/catalog. No new run-history `lastFailure` unless a separate product requirement asks for historical failure badges/messages.

## Final Simplified Standalone History Index Row Candidate

```ts
type AgentRunHistoryIndexRow = {
  runId: string;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
};
```

No `lastActivityAt`, no `lastKnownStatus`, no `activationState`.
