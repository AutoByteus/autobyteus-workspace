# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` file IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- No legacy or compatibility branches are modeled here.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v2`
- Requirements: `tickets/done/memory-projection-layer-refactor/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/done/memory-projection-layer-refactor/proposed-design.md`
- Source Design Version: `v5`
- Referenced Sections:
  - Spine inventory sections: `DS-001` through `DS-006`
  - Ownership sections: `Ownership-Driven Dependency Rules`, `Final File Responsibility Mapping`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even where current code differs.
- Temporary GraphQL JSON transport is allowed in this call stack only as a transport detail; authoritative ownership remains in `run-history`.
- Historical activity fidelity is source-dependent in target behavior. Missing historical lifecycle data is represented as simplified replay output, not reconstructed by the UI.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `agent-memory` | Requirement | R-001,R-002,R-004 | N/A | Raw memory read for backend caller | Yes/N/A/Yes |
| UC-002 | DS-001 | Primary End-to-End | `agent-memory` | Requirement | R-001,R-002,R-004 | N/A | Memory inspector request stays memory-only | Yes/N/A/Yes |
| UC-003 | DS-002,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-001,R-003,R-005,R-008,R-009 | N/A | Standalone historical reopen hydrates conversation | Yes/Yes/Yes |
| UC-004 | DS-004,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-003,R-004,R-006,R-008,R-009 | N/A | Team-member historical reopen uses same replay bundle owner | Yes/Yes/Yes |
| UC-005 | DS-002,DS-003,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-003,R-005,R-009 | N/A | Runtime-backed providers converge on same replay bundle | Yes/Yes/Yes |
| UC-006 | DS-005 | Primary End-to-End | `agent-memory` | Requirement | R-001,R-007 | N/A | Turn-accurate raw-trace consumer bypasses replay bundle | Yes/N/A/Yes |
| UC-007 | DS-003,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-008,R-009,R-010,R-011 | N/A | Standalone historical reopen hydrates right-side activities | Yes/Yes/Yes |
| UC-008 | DS-003,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Design-Risk | R-011 | Historical activity fidelity degrades explicitly when lifecycle history is absent | Yes/N/A/Yes |
| UC-009 | DS-002,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-012,R-013,R-015,R-016 | N/A | Codex historical reopen preserves separate reasoning and grouped assistant-side replay when the source persists it | Yes/Yes/Yes |
| UC-010 | DS-002,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-014,R-015 | N/A | Codex historical reopen stays truthful when `thread/read` omits a separate reasoning item | Yes/N/A/Yes |
| UC-011 | DS-002,DS-006 | Primary End-to-End + Bounded Local | `run-history` | Requirement | R-016 | N/A | Historical conversation hydration groups adjacent assistant-side replay entries into one segmented AI message in source order | Yes/N/A/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - `RunProjectionPayload` may keep `conversation` and `activities` as JSON transport fields while server ownership moves to `run-history`.
- Retirement plan for temporary logic:
  - tighten GraphQL typing in a follow-up if the JSON transport becomes a boundary problem after the ownership split lands.

## Use Case: UC-001 [Raw Memory Read For Backend Caller]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agent-memory`
- Why This Use Case Matters To This Spine:
  - It proves raw memory stays below replay projection.

### Goal

Read working context, episodic memory, semantic memory, or raw traces without touching replay DTOs.

### Preconditions

- `runId` is known.
- Memory files exist or missing-file handling applies.

### Expected Outcome

- Caller receives only memory-oriented data.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(runId, options)
├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readWorkingContextSnapshot(runId) [IO]
├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readEpisodic(runId) [IO]
├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readSemantic(runId) [IO]
├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readRawTracesActive(runId) [IO]
├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readRawTracesArchive(runId) [IO]
└── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:returnMemoryOnlyView(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if a memory file is malformed
autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readJson(...)
└── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:returnNullOrEmpty(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Memory Inspector Request Stays Memory-Only]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agent-memory`
- Why This Use Case Matters To This Spine:
  - It prevents memory GraphQL from becoming a replay boundary.

### Goal

Serve memory inspector tabs without exposing historical replay bundle data.

### Preconditions

- Memory inspector query requests memory-only fields.

### Expected Outcome

- GraphQL resolver returns a memory-oriented view only.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getRunMemoryView(...)
├── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(runId, memoryOnlyOptions)
├── autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts:toGraphqlView(domainView) [STATE]
└── autobyteus-server-ts/src/api/graphql/types/memory-view.ts:returnMemoryView(...)
```

### Branching / Fallback Paths

```text
[ERROR] if requested runId is missing or unreadable
autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getRunMemoryView(...)
└── autobyteus-server-ts/src/api/graphql/types/memory-view.ts:throwGraphqlError(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Standalone Historical Reopen Hydrates Conversation]

### Spine Context

- Spine ID(s): `DS-002`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - It is the core replay path for reopening a run.

### Goal

Load a server-owned historical replay bundle and hydrate the middle event-monitor pane from `projection.conversation`.

### Preconditions

- `runId` exists.
- Run metadata is readable.

### Expected Outcome

- Reopen gets a replay bundle whose conversation entries are owned by `run-history`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/run-history.ts:getRunProjection(runId)
├── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjection(runId) [ASYNC]
│   ├── autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts:readMetadata(runId) [IO]
│   └── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjectionFromMetadata(...)
│       ├── autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts:buildProjection(input) [ASYNC]
│       │   ├── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(runId, rawTraceOnlyOptions)
│       │   ├── autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:buildHistoricalReplayEvents(rawTraces) [STATE]
│       │   ├── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts:buildRunProjectionConversation(events) [STATE]
│       │   ├── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts:buildRunProjectionActivities(events) [STATE]
│       │   └── autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts:buildRunProjectionBundle(runId, conversation, activities) [STATE]
│       ├── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:scoreProjectionBundle(primaryProjection) [STATE]
│       └── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:hasUsableProjectionBundle(bestResolvedProjection) [STATE]
├── autobyteus-web/services/runHydration/runContextHydrationService.ts:loadRunContextHydrationPayload(...) [ASYNC]
├── autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(runId, projection.conversation, defaults) [STATE]
│   └── autobyteus-web/services/runHydration/runProjectionConversation.ts:appendAssistantSideSegmentsInSourceOrder(...) [STATE]
└── autobyteus-web/stores/agentContextsStore.ts:upsertProjectionContext(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if primary runtime provider is sparse and fallback provider is richer
autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjectionFromMetadata(...)
├── autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts:resolveFallbackProvider()
├── autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts:buildProjection(input)
└── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:scoreProjectionBundle(fallbackProjection) [STATE]
```

```text
[ERROR] if projection provider fails and no usable fallback exists
autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:tryBuildProjection(...)
└── autobyteus-server-ts/src/api/graphql/types/run-history.ts:getRunProjection(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Team-Member Historical Reopen Uses Same Replay Bundle Owner]

### Spine Context

- Spine ID(s): `DS-004`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - Team-member replay must not bypass the same ownership rules.

### Goal

Read team-member historical replay through `run-history`, not through an `agent-memory` projection helper.

### Preconditions

- `teamRunId` and `memberRouteKey` are valid.

### Expected Outcome

- Team-member reopen receives the same replay bundle structure from `run-history`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/team-run-history.ts:getTeamMemberRunProjection(...)
├── autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts:getProjection(teamRunId, memberRouteKey) [ASYNC]
│   ├── autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:getTeamRunResumeConfig(teamRunId) [ASYNC]
│   ├── autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts:getProjection(teamRunId, memberRunId) [ASYNC]
│   │   ├── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(memberRunId, rawTraceOnlyOptions)
│   │   ├── autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:buildHistoricalReplayEvents(rawTraces) [STATE]
│   │   └── autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts:buildRunProjectionBundle(...) [STATE]
│   └── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjectionFromMetadata(...)
├── autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:loadTeamRunContextHydrationPayload(...) [ASYNC]
├── autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(memberRunId, projection.conversation, defaults) [STATE]
└── autobyteus-web/services/runHydration/runProjectionActivityHydration.ts:hydrateActivitiesFromProjection(memberRunId, projection.activities) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if local team-member replay is empty but runtime metadata is available
autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts:getProjection(...)
└── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjectionFromMetadata(...)
```

```text
[ERROR] if member binding cannot be resolved
autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts:getProjection(...)
└── autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts:throwMemberBindingError(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 [Runtime-Backed Providers Converge On Same Replay Bundle]

### Spine Context

- Spine ID(s): `DS-002`, `DS-003`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - Runtime-specific history should still collapse onto one server-owned contract.

### Goal

Normalize Codex and Claude historical sources into the same replay bundle contract as AutoByteus.

### Preconditions

- Runtime metadata identifies a non-AutoByteus provider.

### Expected Outcome

- `conversation` and `activities` share the same public DTOs across runtimes.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjectionFromMetadata(...)
├── autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts:resolveProvider(runtimeKind) [STATE]
├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:buildProjection(input) [ASYNC]
│   ├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:loadCodexHistory(...) [IO]
│   ├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:normalizeCodexHistoryToReplayEvents(...) [STATE]
│   ├── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts:buildRunProjectionConversation(events) [STATE]
│   ├── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts:buildRunProjectionActivities(events) [STATE]
│   └── autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts:buildRunProjectionBundle(...) [STATE]
└── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:scoreProjectionBundle(primaryProjection) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if runtime-native history is unavailable but local memory is still readable
autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjectionFromMetadata(...)
└── autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts:buildProjection(input)
```

```text
[ERROR] if runtime-specific history payload is malformed
autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:buildProjection(input)
└── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:tryBuildProjection(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 [Turn-Accurate Raw-Trace Consumer Bypasses Replay Bundle]

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agent-memory`
- Why This Use Case Matters To This Spine:
  - Replay projection stays intentionally lossy and must not displace precise consumers.

### Goal

Read raw traces directly when turn identity is required.

### Preconditions

- Consumer needs `turnId` or raw trace ordering.

### Expected Outcome

- Consumer reads raw traces directly from memory service.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts:resolveReplyText(...)
├── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(runId, rawTraceOnlyOptions)
└── autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts:mergeReplyTextFromRawTraces(rawTraces) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if raw traces are missing for the requested run
autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(...)
└── autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts:returnEmptyOrError(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-009 [Codex Historical Reopen Preserves Separate Reasoning And Grouped Assistant Replay]

### Spine Context

- Spine ID(s): `DS-002`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - It closes the strongest remaining gap between a truthful replay bundle and the live Codex event-monitor structure.

### Goal

Preserve source-native reasoning as a distinct replay event and hydrate it into a `think` segment inside the same reopened AI message as adjacent tool and assistant-text segments when the runtime history stores those distinctions.

### Preconditions

- Codex `thread/read` returns one or more `reasoning` items in `thread.turns[].items[]`.

### Expected Outcome

- Reopened history carries separate reasoning replay entries.
- Frontend historical hydration rebuilds ordered `think`, tool, and text segments inside one AI message until the next user boundary.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:buildProjection(input) [ASYNC]
├── autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts:readThread(threadId, cwd) [ASYNC]
├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:transformThreadPayload(payload) [STATE]
│   ├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:resolveReasoningPart(item) [STATE]
│   ├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:createReasoningEvent(reasoningText, ts) [STATE]
│   ├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:resolveToolEvent(item, ts, turnIndex, itemIndex) [STATE]
│   └── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:createAssistantMessageEvent(text, ts) [STATE]
├── autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts:buildRunProjectionBundleFromEvents(runId, events) [STATE]
├── autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(runId, projection.conversation, defaults) [STATE]
│   ├── autobyteus-web/services/runHydration/runProjectionConversation.ts:startAssistantMessage(timestamp) [STATE]
│   ├── autobyteus-web/services/runHydration/runProjectionConversation.ts:appendThinkSegment(content) [STATE]
│   ├── autobyteus-web/services/runHydration/runProjectionConversation.ts:appendToolSegment(entry) [STATE]
│   └── autobyteus-web/services/runHydration/runProjectionConversation.ts:appendTextAndMediaSegments(entry) [STATE]
└── autobyteus-web/stores/agentContextsStore.ts:upsertProjectionContext(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a Codex turn contains multiple reasoning and assistant-message items
autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(...)
└── autobyteus-web/services/runHydration/runProjectionConversation.ts:appendAssistantSideSegmentsInSourceOrder(...) [STATE]
```

```text
[ERROR] if a provider emits an invalid reasoning replay entry
autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(...)
└── autobyteus-web/services/runHydration/runProjectionConversation.ts:dropMalformedReplayEntry(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-010 [Codex Historical Reopen Stays Truthful When Reasoning Is Absent]

### Spine Context

- Spine ID(s): `DS-002`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - The direct live Codex probe already proved that separate `reasoning` items are optional rather than guaranteed.

### Goal

Keep reopened history source-truthful by omitting `think` segments when Codex history does not provide a separate reasoning item.

### Preconditions

- Codex `thread/read` returns `userMessage`, `agentMessage`, and optional tool items, but no `reasoning` item.

### Expected Outcome

- Reopened history still groups assistant-side entries correctly, but it does not fabricate a reasoning replay entry or `think` segment.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:transformThreadPayload(payload) [STATE]
├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:resolveReasoningPart(item) [STATE]
├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:skipMissingReasoningEvent(...) [STATE]
├── autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts:createAssistantMessageEvent(text, ts) [STATE]
├── autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts:buildRunProjectionBundleFromEvents(runId, events) [STATE]
└── autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(runId, projection.conversation, defaults) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if downstream hydration attempts to synthesize a reasoning segment without a reasoning replay entry
autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(...)
└── autobyteus-web/services/runHydration/runProjectionConversation.ts:refuseSyntheticReasoningSegment(...) [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-011 [Historical Conversation Hydration Groups Adjacent Assistant-Side Replay Entries]

### Spine Context

- Spine ID(s): `DS-002`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - Even with explicit reasoning events, reopen will still drift from the live monitor if each replay entry becomes its own AI message.

### Goal

Hydrate adjacent assistant-side replay entries into one AI message with ordered segments until the next user boundary.

### Preconditions

- The replay stream contains adjacent non-user entries that belong to the same assistant-side turn.

### Expected Outcome

- One reopened AI message contains ordered segments such as `think`, `tool_call`, `terminal_command`, `edit_file`, `text`, and `media` instead of one AI message per replay entry.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/runHydration/runProjectionConversation.ts:buildConversationFromProjection(runId, entries, defaults) [STATE]
├── autobyteus-web/services/runHydration/runProjectionConversation.ts:flushPendingAssistantMessageOnUserBoundary(...) [STATE]
├── autobyteus-web/services/runHydration/runProjectionConversation.ts:startAssistantMessage(timestamp) [STATE]
├── autobyteus-web/services/runHydration/runProjectionConversation.ts:appendAssistantSideSegmentsInSourceOrder(entry, currentMessage) [STATE]
└── autobyteus-web/services/runHydration/runProjectionConversation.ts:finalizePendingAssistantMessage(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if a malformed replay entry cannot be mapped to a segment
autobyteus-web/services/runHydration/runProjectionConversation.ts:appendAssistantSideSegmentsInSourceOrder(...)
└── autobyteus-web/services/runHydration/runProjectionConversation.ts:dropMalformedReplayEntry(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 [Standalone Historical Reopen Hydrates Right-Side Activities]

### Spine Context

- Spine ID(s): `DS-003`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - The right-side pane becomes a first-class historical replay output.

### Goal

Hydrate the right-side historical activity pane from `projection.activities`, not from live streaming state or conversation segments.

### Preconditions

- Run projection payload includes `activities`.

### Expected Outcome

- Reopen populates `agentActivityStore` from historical replay data.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/run-history.ts:getRunProjection(runId)
├── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:getProjection(runId) [ASYNC]
│   ├── autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts:buildRunProjectionBundle(runId, conversation, activities) [STATE]
│   └── autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts:hasUsableProjectionBundle(projection) [STATE]
├── autobyteus-web/services/runHydration/runContextHydrationService.ts:loadRunContextHydrationPayload(...) [ASYNC]
├── autobyteus-web/services/runHydration/runProjectionActivityHydration.ts:hydrateActivitiesFromProjection(runId, projection.activities) [STATE]
└── autobyteus-web/stores/agentActivityStore.ts:addActivity(runId, activity) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if activities are empty but conversation exists
autobyteus-web/services/runHydration/runProjectionActivityHydration.ts:hydrateActivitiesFromProjection(...)
└── autobyteus-web/stores/agentActivityStore.ts:clearActivities(runId) [STATE]
```

```text
[ERROR] if an activity entry is malformed
autobyteus-web/services/runHydration/runProjectionActivityHydration.ts:hydrateActivitiesFromProjection(...)
└── autobyteus-web/services/runHydration/runProjectionActivityHydration.ts:dropInvalidActivityEntry(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-008 [Historical Activity Fidelity Degrades Explicitly]

### Spine Context

- Spine ID(s): `DS-003`, `DS-006`
- Spine Scope: `Primary End-to-End` + `Bounded Local`
- Governing Owner: `run-history`
- Why This Use Case Matters To This Spine:
  - It keeps the architecture honest about what historical source data actually exists.

### Goal

Emit simplified historical activities when the historical source lacks approval/execution/log detail, without inventing missing states in the UI.

### Preconditions

- Local AutoByteus replay source consists only of raw traces with tool call/result detail.

### Expected Outcome

- Activity projection contains the best available state and leaves unavailable lifecycle/log detail empty.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts:buildProjection(input) [ASYNC]
├── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(runId, rawTraceOnlyOptions)
├── autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:buildHistoricalReplayEvents(rawTraces) [STATE]
├── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts:buildRunProjectionActivities(events) [STATE]
└── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts:markSourceLimitedActivityFields(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if a later provider claims lifecycle detail that is internally inconsistent
autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts:buildRunProjectionActivities(events)
└── autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts:throwReplayNormalizationError(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
