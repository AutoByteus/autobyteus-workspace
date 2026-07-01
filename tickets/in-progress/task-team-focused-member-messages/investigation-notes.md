# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements and design direction revised after user-guided model simplification and no-runtime-backward-compatibility correction.
- Investigation Goal: Determine why Team -> Messages does not reliably show communication for focused members inside task-team executions, and identify the correct data model for durable Team Communication messages.
- Scope Classification (`Small`/`Medium`/`Large`): Medium/Large
- Scope Classification Rationale: The user-visible bug is focused message matching, but the root cause is a redundant Team Communication identity model that diverges from the existing `ConversationTargetAddress` send-target model.
- Primary Outcome: Refactor Team Communication message identity to sender/receiver `ConversationTargetAddress` instead of patching the current flat model with `taskTeamScope`; migrate existing old flat app-data files with the app-data migration system rather than runtime read fallback.

## Request Context

The user asked to work on:

```text
/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/in-progress/task-team-focused-member-messages
```

During clarification, the user identified that the Team Communication message is fundamentally:

```text
sender agent address + receiver agent address + content + type + created time + reference files
```

The user rejected adding more wrappers/metadata such as `taskTeamScope`, endpoint objects, per-message duplicate team run ids, `updatedAt`, `version`, or speculative labels unless the frontend proves a concrete need.

On 2026-07-01 the user also corrected an important design error: normal application source must not support old flat Team Communication files through read-time conversion or compatibility branches. The team design principles require no backward compatibility for in-scope behavior. Existing old app-data must be transformed by an app-data migration.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/in-progress/task-team-focused-member-messages`
- Current Branch: `codex/task-team-focused-member-messages`
- Expected Base Branch: `origin/personal`
- Recorded Base Commit: `51ece107f0c7bfa501fac32a8709220078bb1932`
- Bootstrap Blockers: None.

## Key Code Findings

### Existing focused send address spine

Frontend already builds a canonical target address for sending to the focused team target:

- `autobyteus-web/utils/teamConversationTargetAddress.ts`
  - `resolveTeamConversationTargetAddressResult(...)`
- `autobyteus-web/utils/teamConversationTargetSegments.ts`
  - `buildConversationTargetAddressForNode(...)`
  - `buildConversationTargetKey(...)`
- `autobyteus-web/types/agent/ConversationTargetAddress.ts`
  - `ConversationTargetAddress`
  - `ConversationTargetSegment`

The address supports:

- persistent member: `member`
- static nested member: `member` with nested route key
- task agent: `member -> task_agent`
- task-team root: `member -> task_team`
- task-team child: `member -> task_team -> member`
- task agent inside task-team child: `member -> task_team -> member -> task_agent`

`autobyteus-web/stores/agentTeamRunStore.ts` uses this resolution path before sending through `TeamStreamingService.sendMessage(...)` as `conversation_target_address`.

Backend accepts the same address model:

- `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-payload.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts`

### Design-principle correction: migration, not runtime compatibility

Reloaded `solution-designer/design-principles.md` on 2026-07-01. Relevant rules:

- No backward compatibility or legacy retention for in-scope behavior.
- Prefer clean-cut replacement over compatibility wrappers or dual-path behavior.
- Define migration/refactor sequence when the change is not greenfield.

Design implication: old flat Team Communication projection parsing must live in a dedicated app-data migration, not in `TeamCommunicationService`, `team-communication-normalizer.ts`, GraphQL hydration, WebSocket handlers, frontend stores, or panel selectors.

### Current Team Communication storage shape is divergent

Current backend Team Communication projection types store flat participant fields:

- `senderRunId`
- `senderMemberKind`
- `senderMemberName`
- `senderMemberPath`
- `senderMemberRouteKey`
- `senderRepresentedSubTeam`
- matching receiver variants
- `updatedAt`
- projection `version`

Relevant files:

- `autobyteus-server-ts/src/services/team-communication/team-communication-types.ts`
- `autobyteus-server-ts/src/services/team-communication/team-communication-normalizer.ts`
- `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts`
- `autobyteus-web/stores/teamCommunicationTypes.ts`
- `autobyteus-web/stores/teamCommunicationStore.ts`

This duplicates identity already expressible as `ConversationTargetAddress` and makes task-team execution identity difficult to represent without adding another side-channel.

A WIP/current refactor path that leaves helpers such as `legacyAddressFromFlatParticipant(...)` in `team-communication-normalizer.ts` would violate the no-backward-compatibility rule. The design now requires that old-flat-shape knowledge move to a new app-data migration under `autobyteus-server-ts/src/app-data-migrations/migrations/`; normal Team Communication runtime parsing should accept only the current address-first shape.

### Previous narrow patch direction is superseded

A previous design direction proposed adding `taskTeamScope` to the current flat model. That would fix one task-team case but keep the wrong abstraction.

The clarified design direction is address-first:

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

### Existing app-data migration system

The repository already has a server-side app-data migration subsystem:

- `autobyteus-server-ts/src/server-runtime.ts` runs `getAppDataMigrationRunner().runPending()` during startup after Prisma migrations and before built-in-agent bootstrap.
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` registers startup-required migrations using `appConfigProvider.config.getMemoryDir()`.
- `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-types.ts` defines `AppDataMigrationDefinition`, execution status, item details, backup path reporting, and summaries.
- Existing examples such as `team-run-metadata-member-tree-migration.ts` scan app-data files, detect legacy shape, validate current shape, copy a backup, write a temp file, rename atomically, and record `MIGRATED`/`SKIPPED`/`FAILED` item details.

Design implication: add a new Team Communication projection migration to this subsystem, register it in the registry, and keep the runtime reader/writer clean-cut.

## Data Flow Findings

### Live Team Communication today

```text
TeamRun COMMUNICATION event
  -> team-run-event-websocket-message-mapper.ts
  -> TEAM_COMMUNICATION_MESSAGE payload
  -> TeamStreamingService
  -> handleTeamCommunicationMessage
  -> teamCommunicationStore.upsertFromBackendPayload
  -> TeamCommunicationPanel perspective filter
```

Today the payload/store path uses flat sender/receiver fields. The new design should carry address-first message identity through this path.

### Persisted Team Communication today

```text
TeamRun COMMUNICATION event
  -> TeamCommunicationService
  -> normalizeTeamCommunicationMessage
  -> TeamCommunicationProjectionStore
  -> memory/agent_teams/<teamRunId>/team_communication_messages.json
  -> GraphQL getTeamCommunicationMessages(teamRunId)
  -> frontend hydration replaceProjection
```

Today the projection stores flat sender/receiver fields. The new design should store projection-level `teamRunId` and per-message `senderAddress` / `receiverAddress`.

### Focused Team Communication matching target

Today `TeamOverviewPanel.vue` passes a participant selector consisting of focused run id, route key, path, and kind. The new design should derive the focused `ConversationTargetAddress` from the focused node using the same address utility used for send targeting, then compare normalized address keys against message sender/receiver addresses.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-01 | Command | `git fetch origin personal`, `git rev-parse origin/personal` | Bootstrap base verification | Base commit `51ece107f0c7bfa501fac32a8709220078bb1932` | No |
| 2026-07-01 | Code | `autobyteus-web/types/agent/ConversationTargetAddress.ts` | Inspect address shape | Existing address is compact segment list; no required team run id inside address | Reuse |
| 2026-07-01 | Code | `autobyteus-web/utils/teamConversationTargetSegments.ts` | Inspect focused-node address derivation | Existing utility builds all needed cases, including task-team child and task-agent in task-team | Reuse/extract for Team Communication matching |
| 2026-07-01 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect send-to-focused path | Send path resolves canonical address before sending | Align Team Communication with this |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Inspect backend address model | Backend mirrors frontend segment model and normalization | Reuse |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts` | Inspect backend routing by address | Router traverses member/task_team/task_agent segments | Confirms address is canonical routing identity |
| 2026-07-01 | Code | `autobyteus-server-ts/src/services/team-communication/*` | Inspect current persisted Team Communication model | Current model is flat/redundant and divergent from address spine | Refactor |
| 2026-07-01 | User clarification | Conversation in this thread | Validate desired minimal model | User approved minimal `senderAddress`/`receiverAddress` structure and rejected speculative fields | Reflected in requirements/design |
| 2026-07-01 | Design principles | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Reload no-backward-compatibility guidance after user correction | Design must reject runtime compatibility wrappers, dual-path reads, and legacy fallback branches | Requirements/design corrected |
| 2026-07-01 | Code | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`, `domain/app-data-migration-types.ts`, `migrations/team-run-metadata-member-tree-migration.ts` | Inspect app-data migration pattern | Startup-required migrations already scan memory app-data, backup, rewrite, and report item details | New migration should follow this pattern |
| 2026-07-01 | Code | `autobyteus-server-ts/src/server-runtime.ts` | Verify migration execution point | App-data migrations run on startup via `getAppDataMigrationRunner().runPending()` | Register Team Communication projection migration |

## Risks / Follow-Up For Implementation

- Verify whether task-agent sender/receiver identity is still available at the Team Communication event creation point; if not, extend the event payload builder to construct addresses before information is lost.
- Keep address display derivation simple initially. Add `senderLabel`/`receiverLabel` only if UI implementation proves address-derived display is inadequate.
- Avoid a half-refactor where both old flat participant fields and new addresses remain authoritative.
- Do not keep runtime old-flat readers. Add an app-data migration that rewrites old projection files to address-first shape, with backups and visible failed-item reporting for rows that cannot be reconstructed safely.
