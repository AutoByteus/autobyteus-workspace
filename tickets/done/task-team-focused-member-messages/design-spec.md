# Design Spec: Address-First Team Communication Message Model

## Current-State Read

Team Communication currently persists and hydrates messages using flat sender/receiver participant fields: run id, member kind/name/path/route key, represented-subteam metadata, content, timestamps, and reference files. This shape works for simple structural members but diverges from the application's existing canonical routing/addressing model: `ConversationTargetAddress`.

The frontend send path already addresses the focused target with `ConversationTargetAddress`:

```text
resolveTeamConversationTargetAddressResult(activeTeam)
  -> ConversationTargetAddress
  -> TeamStreamingService.sendMessage(... conversation_target_address ...)
```

The backend receive/routing path also understands that same address:

```text
SEND_MESSAGE.conversation_target_address
  -> normalizeConversationTargetAddress
  -> MixedConversationTargetRouter
  -> member/task_team/task_agent segment traversal
```

The defect appears when Team -> Messages tries to display communication for focused transient task-team members. Focused task-team members are naturally identified by an address such as:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "BuildSquad" },
    { "kind": "task_team", "taskTeamRunId": "task-team-run-1" },
    { "kind": "member", "memberRouteKey": "review_lead" }
  ]
}
```

Current Team Communication rows instead retain structural participant fields such as `BuildSquad/review_lead` plus other side-channel metadata. Adding `taskTeamScope` would patch one symptom but keep a duplicated identity model.

## Intended Change

Refactor Team Communication to use canonical sender and receiver addresses.

Target durable shape:

```ts
type TeamCommunicationProjection = {
  teamRunId: string;
  messages: TeamCommunicationMessage[];
};

type TeamCommunicationMessage = {
  messageId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
};
```

The projection is stored under:

```text
memory/agent_teams/<rootTeamRunId>/team_communication_messages.json
```

No per-message `teamRunId`, `version`, message-level `updatedAt`, participant run-id fields, participant path/route duplicates, represented-subteam fields, labels, or `taskTeamScope` should be written in this scope. The projection-level `teamRunId` owns the collection; sender/receiver addresses own identity.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change / Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Duplicated Policy Or Coordination
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Send and backend routing already share `ConversationTargetAddress`, while Team Communication storage/matching uses a separate flat participant model that cannot naturally represent task-team/task-agent execution paths.
- Design response: Make Team Communication messages address-first. Derive and compare normalized addresses instead of layering task-team-specific scope onto the old flat model.
- Intentional deferrals and residual risk: Existing historical flat projection files are handled by an explicit app-data migration, not by runtime/read-time compatibility. Some old rows may be unconvertible if they lack enough identity; those must be reported through migration details/logs, not hidden by fallback code.

## Design Reading Order

1. data-flow spine
2. canonical model
3. subsystem ownership
4. file responsibility mapping
5. migration/refactor sequence
6. tests and acceptance guidance

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the old flat Team Communication participant model from normal runtime code.
- Do not keep `taskTeamScope` as a replacement identity layer.
- Do not preserve sender/receiver run id/path/route fields as parallel matching authority.
- Do not implement read-time conversion, old-shape fallback readers, compatibility wrappers, or dual read/write paths in `TeamCommunicationService`, projection store, GraphQL hydration, WebSocket handlers, or frontend store.
- Existing old flat app-data files must be converted by a registered app-data migration before normal runtime relies on them. Migration code may know old shapes; runtime code may not.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-TTFM-001 | Primary End-to-End | User focuses a team member/task execution row | Team -> Messages displays rows whose sender/receiver address equals focused address | Frontend Team Communication perspective owner, using Team Context focus owner | Main user-visible behavior. |
| DS-TTFM-002 | Primary End-to-End | Team `SEND_MESSAGE` / inter-agent communication event | Durable Team Communication projection row with sender/receiver addresses | Backend Team Communication projection owner | Ensures stored truth is address-first. |
| DS-TTFM-003 | Primary End-to-End | Active live `TEAM_COMMUNICATION_MESSAGE` event | Frontend store upserts address-first message | Backend stream mapper + frontend Team Communication store | Ensures live behavior matches stored behavior. |
| DS-TTFM-004 | Primary End-to-End | Server restart / historical open | GraphQL hydration returns address-first messages and matching works | Backend GraphQL + frontend hydration owner | Prevents live-only fixes. |
| DS-TTFM-005 | Bounded Local | Focused node + message sender/receiver address | Exact address match result | Pure address identity helper | Prevents fuzzy/cross-run matching. |
| DS-TTFM-006 | Primary End-to-End | Server startup app-data migration runner | Old flat Team Communication projection files rewritten to address-first projection files or reported as failed items | App-data migration subsystem | Keeps normal Team Communication runtime free of backward-compatible reads. |

## Primary Execution Spines

### Focus-to-message spine

```text
Workspaces/Team focus row
  -> AgentTeamContext.focusedMemberRouteKey
  -> focused TeamMemberNode
  -> buildConversationTargetAddressForNode(focusedNode)
  -> TeamCommunicationStore.getPerspectiveForAddress(teamRunId, focusedAddress)
  -> compare normalized address key with message.senderAddress / receiverAddress
  -> TeamCommunicationPanel renders sent/received perspective
```

### Backend persistence spine

```text
Resolved inter-agent delivery / communication event
  -> build senderAddress and receiverAddress from delivery participants + task execution context
  -> TeamCommunicationService normalizes address-first message
  -> TeamCommunicationProjectionStore writes
       memory/agent_teams/<rootTeamRunId>/team_communication_messages.json
```

### Live return spine

```text
TeamRun COMMUNICATION event
  -> WebSocket mapper emits TEAM_COMMUNICATION_MESSAGE with teamRunId envelope + address-first message fields
  -> TeamStreamingService
  -> handleTeamCommunicationMessage
  -> teamCommunicationStore.upsertFromBackendPayload(teamRunId, message)
```

### Hydration return spine

```text
GraphQL getTeamCommunicationMessages(teamRunId)
  -> TeamCommunicationProjectionService reads current address-first projection only
  -> returns address-first messages
  -> teamCommunicationHydrationService.replaceProjection(teamRunId, messages)
```

### App-data migration spine

```text
Server startup
  -> getAppDataMigrationRunner().runPending()
  -> TeamCommunicationProjectionAddressMigration scans memory/agent_teams/*/team_communication_messages.json
  -> validate current shape OR convert old flat shape using migration-only legacy parser
  -> backup old file, write temp current-shape projection, rename atomically
  -> record MIGRATED / SKIPPED / FAILED details in app_data_migration_records and migration log
  -> normal TeamCommunicationService reads current shape only
```

## Canonical Model

### Projection

```ts
type TeamCommunicationProjection = {
  teamRunId: string;
  messages: TeamCommunicationMessage[];
};
```

### Message

```ts
type TeamCommunicationMessage = {
  messageId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
};
```

### Identity rule

```text
Within a projection/teamRunId, a participant identity is its normalized ConversationTargetAddress.
```

Because the file/store is already keyed by root `teamRunId`, `ConversationTargetAddress` should remain the existing relative segment model and should not require a duplicated top-level team run id per address.

### Address examples

Persistent member:

```json
{ "segments": [{ "kind": "member", "memberRouteKey": "reviewer" }] }
```

Static nested member:

```json
{ "segments": [{ "kind": "member", "memberRouteKey": "BuildSquad/review_lead" }] }
```

Task agent:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "worker" },
    { "kind": "task_agent", "taskAgentRunId": "task-agent-run-1" }
  ]
}
```

Task-team member:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "BuildSquad" },
    { "kind": "task_team", "taskTeamRunId": "task-team-run-1" },
    { "kind": "member", "memberRouteKey": "review_lead" }
  ]
}
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-TTFM-001 | Focused row selection yields a focused node. The Team view derives the same address used for message sending and asks the store for messages involving that address. | Focused TeamMemberNode, ConversationTargetAddress, message perspective | Team Communication store | Display labels, panel layout |
| DS-TTFM-002 | Communication delivery builds canonical sender/receiver addresses at the backend boundary where participant/task execution context is still known. The projection writes only addresses and message content metadata. | Delivery request, TeamRun communication event, TeamCommunicationProjection | Backend Team Communication | Reference file IDs, raw event routing |
| DS-TTFM-003 | Live stream emits address-first message payloads. Frontend upserts by message id into the owning team run bucket. | WebSocket payload, frontend store | Stream mapper + Team Communication store | Payload snake/camel normalization |
| DS-TTFM-004 | Hydration reads the same address-first projection and returns it over GraphQL. Frontend replacement uses the same store model as live. | Projection store, GraphQL query, hydration service | Backend projection/API owners | Generated GraphQL types |
| DS-TTFM-005 | A pure normalizer converts `ConversationTargetAddress` to a stable key and compares exact sender/receiver keys. | Address normalizer, address key | Team Communication identity helper | No fuzzy suffix/name matching |
| DS-TTFM-006 | Startup app-data migration scans existing Team Communication projection files. Current files are validated and skipped; old flat files are converted once to address-first projection files with backups; unconvertible files become migration item failures/warnings. | Migration runner, Team Communication projection migration, projection file | App-data migration subsystem | Migration-only legacy parser, backup/temp write |

## Spine Actors / Main-Line Nodes

- `ConversationTargetAddress`
- Focused `TeamMemberNode`
- `TeamCommunicationProjection`
- `TeamCommunicationMessage.senderAddress`
- `TeamCommunicationMessage.receiverAddress`
- Team Communication address equality helper
- Team Communication store perspective getter

## Ownership Map

- `ConversationTargetAddress` domain/type: owns route segment vocabulary (`member`, `task_team`, `task_agent`).
- Team Context / Workspaces: owns selected/focused node, not message matching.
- Frontend Team Communication store: owns normalized message store, address equality, sent/received grouping.
- Team Communication panel/overview: presentation and composition only; no custom identity matching.
- Backend Team Communication service/projection: owns durable address-first projection and accepts current shape only.
- App-data migration subsystem: owns one-time conversion of old flat Team Communication projection files into the current address-first shape.
- Backend stream mapper: owns live payload shape and transport naming.
- Backend communication delivery/event builder: owns construction of sender/receiver addresses while participant/task runtime context is available.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamCommunicationPanel.vue` | `teamCommunicationStore` | Renders returned perspective | Address matching |
| `TeamOverviewPanel.vue` | Team context + address utility + store | Passes focused address and count | Manual route/path/run matching |
| `handleTeamCommunicationMessage(payload)` | Store live upsert | WebSocket handler entry | Payload identity policy |
| `getTeamCommunicationMessages(teamRunId)` | Backend projection service | Hydrated message read | Reconstructing addresses from frontend state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Flat sender/receiver identity fields in stored message | Redundant with address | `senderAddress`, `receiverAddress` | In This Change | Includes run id, path, route key, member kind/name identity fields. |
| `senderRepresentedSubTeam` / `receiverRepresentedSubTeam` as identity | Address represents subteam/member path directly | Address segments | In This Change | If display later needs labels, add separately with proof. |
| `taskTeamScope` proposal | Address segment already contains task-team run | `task_team` segment | In This Change | Avoid side-channel identity. |
| Store participant selector matching | Focused address equality is simpler | Address equality helper | In This Change | Store API should become address-oriented. |
| Projection `version` default | User-approved minimal model does not need it | Shape-owned projection plus app-data migration records | In This Change | Do not add version to projection; migration detects by shape and records status in `app_data_migration_records`. |
| Message `updatedAt` default | Communication messages are immutable | `createdAt` | In This Change | Add only if actual editing/updating exists. |

## Bounded Local / Internal Spines

### Address key normalization

Parent owner: frontend Team Communication identity helper.

Input:

```ts
ConversationTargetAddress
```

Output:

```text
member:BuildSquad|task_team:task-team-run-1|member:review_lead
```

Rules:

- Normalize route keys with existing route-key normalization semantics.
- Prefer route key when a member segment has both route key and path; existing address normalization should reject mismatches.
- Keep segment order significant.
- Match only exact normalized address keys within the same team run bucket.

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why |
| --- | --- | --- | --- |
| Focused target address derivation | `teamConversationTargetSegments.ts` / `teamConversationTargetAddress.ts` | Reuse/extract | Already builds all needed address cases. |
| Backend address validation | `conversation-target-address.ts` | Reuse | Already canonical backend model. |
| Backend route traversal | `MixedConversationTargetRouter` | Reuse as conceptual authority | Confirms address semantics. |
| Live stream Team Communication entry | Existing `TEAM_COMMUNICATION_MESSAGE` | Extend/refactor | Same event type can carry simpler payload. |
| Projection persistence | `TeamCommunicationProjectionStore` | Extend/refactor | Existing file owner remains correct. |
| Reference file content | Existing Team Communication reference route | Reuse | Still message-owned. |
| Historical old flat Team Communication files | `app-data-migrations` subsystem | Add migration | Existing startup migration runner already owns app-data shape upgrades and logging. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Decision | Notes |
| --- | --- | --- | --- | --- |
| Backend communication delivery/event construction | Build sender/receiver addresses before identity is lost | DS-TTFM-002 | Extend | Critical for task-agent/task-team cases. |
| Backend Team Communication projection | Store/read minimal address-first projection | DS-TTFM-002, DS-TTFM-004 | Refactor | File path remains the same. |
| Backend WebSocket mapper | Emit address-first live payload | DS-TTFM-003 | Refactor | Payload may include teamRunId envelope. |
| Frontend Team Communication store | Normalize messages, compare addresses, group perspective | DS-TTFM-001, DS-TTFM-003, DS-TTFM-005 | Refactor | Main frontend owner. |
| Frontend Team view | Derive focused address and render | DS-TTFM-001 | Extend thinly | No identity policy. |
| App-data migrations | Convert existing flat projection files before runtime | DS-TTFM-006 | Add migration | Keeps runtime clean-cut and follows no-backward-compatibility rule. |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Backend address domain | Existing canonical type/normalizer; reuse, do not fork. |
| `autobyteus-web/types/agent/ConversationTargetAddress.ts` | Frontend address type | Existing canonical frontend type; reuse. |
| `autobyteus-web/utils/teamConversationTargetSegments.ts` | Frontend focused-node address builder | Reuse/extract address key builder for Team Communication matching. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` or nearby helper | Backend communication event construction | Build canonical senderAddress/receiverAddress for communication payloads. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts` | Nested/task-team event bridge | Ensure child communication addresses are parent/root-context addresses when events are republished. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-types.ts` | Backend projection model | Replace flat message type with address-first message/projection. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-normalizer.ts` | Backend projection normalizer | Normalize current address-first rows/payloads only; remove old-flat fallback helpers such as `legacyAddressFromFlatParticipant`. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts` | Backend projection persistence | Persist address-first messages. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-projection-store.ts` | File store | Read/write top-level `teamRunId` + messages shape; do not repair old shapes at read time. |
| `autobyteus-server-ts/src/services/agent-streaming/team-communication-message-payload.ts` | WebSocket payload builder | Emit address-first payload. |
| `autobyteus-server-ts/src/api/graphql/types/team-communication.ts` | GraphQL API | Expose address-first message fields and nested address/segment object types. |
| `autobyteus-web/stores/teamCommunicationTypes.ts` | Frontend Team Communication types | Replace flat message type with address-first message. |
| `autobyteus-web/stores/teamCommunicationStore.ts` | Frontend store | Store messages by team run; match/group by senderAddress/receiverAddress. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend streaming protocol | Update `TeamCommunicationMessagePayload` address shape. |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Frontend GraphQL hydration | Request senderAddress/receiverAddress segments. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Thin composition | Derive focused address and pass to panel/store. |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Presentation | Render address-based perspective; derive display from addresses. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-communication-projection-address-migration.ts` | App-data migration | Migration-only old-flat parser; scan `memory/agent_teams/*/team_communication_messages.json`; validate current files; backup and rewrite old files to address-first shape; report unconvertible files. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Migration registration | Register the Team Communication projection address migration as startup-required, ordered before runtime use of Team Communication projections. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/__tests__/team-communication-projection-address-migration.test.ts` or existing test location | Migration tests | Cover current skip, old flat conversion, backup, and unconvertible failed-item reporting. |

## Shared Structure / Data Model Tightness Check

| Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Corrective Action |
| --- | --- | --- | --- |
| `TeamCommunicationProjection.teamRunId` | Yes | Yes | Owns root/parent team run collection. |
| `TeamCommunicationMessage.senderAddress` | Yes | Yes | Sender identity only. |
| `TeamCommunicationMessage.receiverAddress` | Yes | Yes | Receiver identity only. |
| `ConversationTargetAddress.segments` | Yes | Existing | Reuse as canonical identity. |
| `referenceFiles` | Yes | Existing | Keep as message-owned references. |
| `senderLabel` / `receiverLabel` | Not in target | Yes | Add only with concrete UI need. |

## Interface Boundary Mapping

| Interface / API / Query / Method | Subject Owned | Responsibility | Accepted Identity Shape |
| --- | --- | --- | --- |
| `TeamCommunicationMessage` | Durable message row | Store communication content and sender/receiver addresses | `senderAddress`, `receiverAddress` |
| `getTeamCommunicationMessages(teamRunId)` | Hydration read | Return address-first messages for owning team run | GraphQL address object/segments |
| `TEAM_COMMUNICATION_MESSAGE` | Live update | Deliver address-first message plus team run routing envelope | `teamRunId`, message fields |
| `teamCommunicationStore.getPerspectiveForAddress(teamRunId, address)` | Frontend perspective | Return sent/received messages for an address | `ConversationTargetAddress` |
| `buildConversationTargetAddressForNode(node)` | Focus target derivation | Produce focused address | Existing node-to-address rules |
| `TeamCommunicationProjectionAddressMigration.execute()` | App-data upgrade | Convert old flat projection files to current projection files | Migration-only legacy flat fields in, current address-first projection out |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ConversationTargetAddress` | Yes | Yes | Low | Reuse as-is. |
| Team Communication projection | Yes after refactor | Yes | Low | Remove flat identity fields. |
| Store perspective getter | Yes after refactor | Yes | Low | Address equality only. |
| GraphQL message object | Yes after refactor | Yes | Low | Expose addresses, not old flat fields. |

## Concrete Examples / Shape Guidance

### Stored projection for task-team child message

```json
{
  "teamRunId": "parent-team-run-1",
  "messages": [
    {
      "messageId": "msg-1",
      "senderAddress": {
        "segments": [
          { "kind": "member", "memberRouteKey": "BuildSquad" },
          { "kind": "task_team", "taskTeamRunId": "task-team-run-1" },
          { "kind": "member", "memberRouteKey": "review_lead" }
        ]
      },
      "receiverAddress": {
        "segments": [
          { "kind": "member", "memberRouteKey": "BuildSquad" },
          { "kind": "task_team", "taskTeamRunId": "task-team-run-1" },
          { "kind": "member", "memberRouteKey": "implementer" }
        ]
      },
      "content": "Please review this.",
      "messageType": "agent_message",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "referenceFiles": []
    }
  ]
}
```

### Bad shape to avoid

```json
{
  "messageId": "msg-1",
  "teamRunId": "parent-team-run-1",
  "senderRunId": "...",
  "senderMemberPath": ["BuildSquad", "review_lead"],
  "senderMemberRouteKey": "BuildSquad/review_lead",
  "taskTeamScope": { "taskTeamRunId": "task-team-run-1" },
  "updatedAt": "..."
}
```

Why avoided: it splits one identity across multiple fields and recreates the current bug class.

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Add `taskTeamScope` to current flat rows | Narrower patch | Rejected | Address-first sender/receiver. |
| Keep flat fields as matching fallback | Easier transition | Rejected | App-data migration rewrites old files; runtime has no fallback. |
| Store labels by default | Useful display snapshot | Deferred/rejected for now | Derive display from address unless concrete need appears. |
| Put teamRunId inside each address | Fully qualified addresses | Rejected for stored projection | Projection/file already owns teamRunId; avoid duplication. |
| Use run ids as participant identity | Existing field availability | Rejected | Runtime IDs belong in address only when they are task execution segments. |

## Dependency Rules

- Team Communication store may depend on pure address utilities/types, not on components.
- TeamCommunicationPanel must depend on store perspective results, not on old flat matching helpers.
- TeamOverviewPanel may call a focused-node-to-address utility and pass address to the store/panel.
- Backend Team Communication projection may depend on backend `ConversationTargetAddress` types/normalizers.
- Backend stream mapper and projection service should share one address-first message normalizer/builder where possible to avoid live/hydrated drift.
- Workspaces selection must not inspect Team Communication messages.

## Migration / Refactor Sequence

1. Add a new startup-required app-data migration, tentatively `TeamCommunicationProjectionAddressMigration`, under `autobyteus-server-ts/src/app-data-migrations/migrations/` and register it in `app-data-migration-registry.ts`.
   - Scan `path.join(memoryDir, "agent_teams")` for `*/team_communication_messages.json`.
   - If the file already has top-level `teamRunId` and every message has valid `senderAddress`/`receiverAddress`, validate current shape and record `SKIPPED`.
   - If the file has old flat fields, use migration-only conversion to build the target projection, copy a timestamped backup, write a temp file, and rename atomically.
   - If a file/message cannot be converted safely, record a `FAILED` item (or `SUCCEEDED_WITH_WARNINGS` summary when other files succeeded/skipped) with the reason. Do not add runtime fallback.
2. Introduce/refactor backend Team Communication types to the address-first projection/message shape.
3. Add backend helper(s) to build `ConversationTargetAddress` for communication participants:
   - persistent/static nested member -> `member` segment;
   - task agent -> logical `member` + `task_agent` segment;
   - task-team root -> logical `member` + `task_team` segment;
   - task-team child -> logical `member` + `task_team` + relative `member` segment;
   - task agent inside task-team child -> add terminal `task_agent` segment.
4. Update communication event creation/bridging so sender/receiver addresses are not lost before projection/stream mapping.
5. Update `TeamCommunicationService`, normalizer, projection store, and content/reference resolution to read/write top-level `teamRunId` plus address-first messages.
6. Update GraphQL Team Communication object types and queries to return `senderAddress` and `receiverAddress` with nested segments.
7. Update WebSocket `TEAM_COMMUNICATION_MESSAGE` payload type/builder to carry address-first message data and a team run routing envelope.
8. Update frontend Team Communication types/store to normalize address-first live/hydrated messages.
9. Replace participant-selector perspective matching with address equality:
   - derive focused address from focused node using existing `buildConversationTargetAddressForNode(...)` logic;
   - compare normalized address key against sender/receiver addresses.
10. Update TeamCommunicationPanel/TeamOverviewPanel props/counts to use focused address.
11. Remove old flat identity fields from durable write shape and frontend authoritative types.
12. Add tests across backend normalizer/service/API, app-data migration, and frontend address matching/panel display.
13. Remove old-flat runtime readers/fallbacks from normal Team Communication code. Searches for old flat participant identity fields should only find migration code/tests or removal notes, not runtime parse/match logic.
14. Run targeted checks and `git diff --check`.

## Test Requirements

Frontend unit/store tests:

- persistent member address matches sent/received perspective;
- static nested member address matches;
- task agent address matches;
- task-team root address matches;
- task-team child address matches;
- task agent inside task-team child address matches;
- concurrent task-team run isolation by different `taskTeamRunId` segments;
- old fuzzy suffix/name matching does not occur.

Frontend component tests:

- TeamOverviewPanel derives/passes focused address for task-team child;
- TeamCommunicationPanel renders messages from address-based perspective;
- empty state still appears when no exact address match exists.

Backend tests:

- communication payload/projection writes address-first shape;
- task-team child event creates `member -> task_team -> member` addresses;
- task-agent event creates `member -> task_agent` addresses;
- GraphQL hydration returns address objects/segments;
- reference-file content resolution still works;
- app-data migration converts representative old flat projection to current shape with backup;
- app-data migration skips already-current projection after validation;
- app-data migration reports unconvertible old rows without runtime fallback.

## Risks

- Some current event construction paths may have already erased task-agent-specific identity before Team Communication projection. Implementation should construct addresses as early as needed.
- Updating generated GraphQL artifacts may require repository-specific codegen commands.
- Old historical files may lack enough data to reconstruct full task-team/task-agent addresses. Migration must surface those as failed/warning details; normal runtime must not carry compatibility fallback to hide the issue.

## Guidance For Implementation

- Do not start by adding `taskTeamScope`. Start by making sender/receiver address-first.
- Do not keep runtime/read-time old-flat conversion. Put old-shape parsing only in the app-data migration.
- Keep `ConversationTargetAddress` pure and segment-based; do not add top-level target kind or team run id to the address for this projection.
- Keep the projection file minimal. Add fields only when a concrete frontend rendering or reference-serving need appears.
- Use exact normalized address equality for matching.
- Prefer small pure helpers for address normalization/keying so tests can cover matching without Vue/Pinia.
