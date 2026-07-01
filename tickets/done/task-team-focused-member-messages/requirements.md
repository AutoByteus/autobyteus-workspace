# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — corrected on 2026-07-01 after reloading the team design principles. The earlier task-team-scope patch direction is superseded by an address-first Team Communication model refactor, and runtime backward-compatibility/read-time conversion is explicitly rejected. Historical flat files must be handled by an app-data migration.

## Goal / Problem Statement

Refactor Team Communication message identity so sender and receiver are stored and matched by the same canonical `ConversationTargetAddress` model already used when the frontend sends a message to a focused team target.

The immediate user-visible bug is that focusing a member inside a delegated task-team execution can show an empty Team -> Messages perspective even when related communication exists. The deeper design issue is that the current Team Communication message model stores redundant flat sender/receiver runtime fields (`senderRunId`, `senderMemberPath`, `senderMemberRouteKey`, represented-subteam fields, etc.) instead of the actual addressing truth: sender agent address and receiver agent address.

## Target Data Model

The durable Team Communication file remains stored under the owning/root team run:

```text
memory/agent_teams/<rootTeamRunId>/team_communication_messages.json
```

The target projection shape is minimal and address-first:

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

No per-message `teamRunId`, no `version`, no `updatedAt`, and no label/display fields unless implementation proves the frontend cannot render needed display from addresses. Labels are not in scope by default.

## Canonical Address Examples

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

Task-team root:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "BuildSquad" },
    { "kind": "task_team", "taskTeamRunId": "task-team-run-1" }
  ]
}
```

Member inside task-team:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "BuildSquad" },
    { "kind": "task_team", "taskTeamRunId": "task-team-run-1" },
    { "kind": "member", "memberRouteKey": "review_lead" }
  ]
}
```

Task agent inside task-team member:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "BuildSquad" },
    { "kind": "task_team", "taskTeamRunId": "task-team-run-1" },
    { "kind": "member", "memberRouteKey": "implementer" },
    { "kind": "task_agent", "taskAgentRunId": "task-agent-run-9" }
  ]
}
```

## Investigation Findings

- Frontend focused-send routing already uses `ConversationTargetAddress` via `resolveTeamConversationTargetAddressResult(...)` and `buildConversationTargetAddressForNode(...)`.
- `ConversationTargetAddress` already represents persistent members, static nested members, task agents, task-team roots, members inside task teams, and task agents inside task-team members with a compact segment list.
- Current Team Communication storage and frontend store do not use that address spine. They store and match redundant flat participant fields.
- Task-team communication events can carry enough runtime scope at the event boundary, but current projection/frontend normalization drops or flattens identity into structural member paths, which cannot match focused task-team execution addresses.
- The correct fix is not to add a second `taskTeamScope` identity layer. The correct fix is to refactor Team Communication sender/receiver identity to canonical addresses.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis: The application already has one canonical conversation-target address model for sending messages, but Team Communication persistence/matching re-expresses participant identity in a separate, redundant flat model.
- Requirement impact: Requirements now target model simplification and identity convergence, not a narrow task-team-scope patch.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium/Large

Rationale: The model refactor is conceptually simple but crosses backend Team Communication event/projection/persistence, WebSocket payloads, GraphQL hydration, frontend store matching, and panel/overview selectors. It should not require changing task delegation tools or Workspaces focus ownership.

## In-Scope Use Cases

- `UC-TTFM-001`: Persistent member communication is stored and displayed by matching focused member address to `senderAddress` or `receiverAddress`.
- `UC-TTFM-002`: Static nested member communication is stored and displayed by a structural nested member address.
- `UC-TTFM-003`: Task-agent communication is stored and displayed by an address containing a `task_agent` segment.
- `UC-TTFM-004`: Task-team root communication is stored and displayed by an address containing a `task_team` segment.
- `UC-TTFM-005`: Member-inside-task-team communication is stored and displayed by an address containing `member -> task_team -> member` segments.
- `UC-TTFM-006`: Task-agent-inside-task-team-member communication is stored and displayed by an address containing `member -> task_team -> member -> task_agent` segments.
- `UC-TTFM-007`: Two concurrent task-team executions using the same logical team/member names do not share or leak messages because their addresses contain different `taskTeamRunId` values.
- `UC-TTFM-008`: Stored/hydrated Team Communication data after server restart uses the same address-first matching model as live messages.
- `UC-TTFM-009`: Existing app-data projection files written in the old flat Team Communication shape are migrated to the address-first shape by the registered app-data migration system before normal runtime code treats them as current data.

## Out of Scope

- Redesigning the Team -> Messages visual layout beyond fields necessary to render address-based messages.
- Changing `delegate_task`, `submit_task_result`, or `review_task_result` model-facing contracts.
- Changing Workspaces row rendering or focus behavior unless tests prove focus itself is broken.
- Deriving child transcript entries from Team Communication messages; member conversation replay remains owned by member input/conversation projection paths.
- Adding speculative display labels or extra participant wrappers without a concrete frontend rendering need.
- Keeping runtime/read-time support for the old flat Team Communication shape after this refactor. Migration code may know the old shape; normal Team Communication source code must not.

## Functional Requirements

- `REQ-TTFM-001`: Team Communication projection files must store `teamRunId` once at the projection/file level and must store each message with `senderAddress` and `receiverAddress` using `ConversationTargetAddress`.
- `REQ-TTFM-002`: `TeamCommunicationMessage` must not store redundant identity fields: no per-message `teamRunId`, no sender/receiver run-id identity fields, no sender/receiver member path/route-key duplicates outside the address, no represented-subteam identity fields, no task-team-scope identity object, no `version`, and no message-level `updatedAt` in this scope.
- `REQ-TTFM-003`: Backend Team Communication event/projection logic must build canonical sender and receiver addresses for persistent members, static nested members, task agents, task-team roots, task-team children, and task agents inside task-team children.
- `REQ-TTFM-004`: Live `TEAM_COMMUNICATION_MESSAGE` payloads must carry the same address-first message shape consumed by frontend Team Communication store logic. Transport may include an envelope `teamRunId` to route the live upsert, but the stored message identity remains address-first.
- `REQ-TTFM-005`: GraphQL hydration for `getTeamCommunicationMessages(teamRunId)` must return messages in the same address-first shape used by live messages.
- `REQ-TTFM-006`: Frontend Team -> Messages perspective matching must compare the focused member's canonical `ConversationTargetAddress` against each message's `senderAddress` and `receiverAddress`.
- `REQ-TTFM-007`: The focused address used for Team Communication matching must be derived from the same frontend address-building utility/path used for `SEND_MESSAGE` targeting, not from a separate selector model.
- `REQ-TTFM-008`: Persistent member, static nested member, task-agent, task-team root, task-team child, and nested task-agent cases must be covered by durable tests.
- `REQ-TTFM-009`: Concurrent task-team executions must be isolated by address equality; matching must not fall back to display names, relative member names, structural suffixes, or run-id guesses.
- `REQ-TTFM-010`: Reference files must continue to be stored on the message and served by message-owned reference identity.
- `REQ-TTFM-011`: A registered app-data migration must convert existing `memory/agent_teams/<rootTeamRunId>/team_communication_messages.json` files from the old flat Team Communication shape into the address-first projection shape before normal runtime reads rely on them.
- `REQ-TTFM-012`: Normal runtime Team Communication source code must only validate/read/write the current address-first projection shape. It must not contain old-flat-shape fallback readers, read-time conversion branches, compatibility wrappers, or dual authoritative models.
- `REQ-TTFM-013`: The app-data migration must be idempotent: already-current address-first files are skipped after current-shape validation; old flat files are backed up then rewritten to current shape; unconvertible files are reported through the app-data migration summary/logs rather than hidden by runtime fallback.

## Acceptance Criteria

- `AC-TTFM-001`: The durable Team Communication JSON for a team run has top-level `teamRunId` and `messages`; each message has `messageId`, `senderAddress`, `receiverAddress`, `content`, `messageType`, `createdAt`, and `referenceFiles`.
- `AC-TTFM-002`: The durable Team Communication JSON no longer writes `senderRunId`, `senderMemberPath`, `senderMemberRouteKey`, `receiverRunId`, `receiverMemberPath`, `receiverMemberRouteKey`, `senderRepresentedSubTeam`, `receiverRepresentedSubTeam`, `taskTeamScope`, `version`, or `updatedAt` as default message fields.
- `AC-TTFM-003`: Focusing a persistent member with address `{ member: reviewer }` shows messages where that address equals sender or receiver.
- `AC-TTFM-004`: Focusing a task-team child with address `BuildSquad -> task_team:task-team-run-1 -> review_lead` shows only messages with that exact address as sender or receiver.
- `AC-TTFM-005`: Given two messages addressed to `BuildSquad -> task_team:task-team-run-1 -> review_lead` and `BuildSquad -> task_team:task-team-run-2 -> review_lead`, focusing run-1 shows only the run-1 message.
- `AC-TTFM-006`: Live WebSocket updates and post-restart GraphQL hydration produce the same frontend store message model and matching result.
- `AC-TTFM-007`: Existing send-to-focused-member addressing tests remain valid and, where useful, are reused for Team Communication focused address derivation.
- `AC-TTFM-008`: Reference file rows still open through the existing Team Communication reference content route using team run, message, and reference identity.
- `AC-TTFM-009`: A migration implementation is registered in `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`, scans Team Communication projection files under `memory/agent_teams`, and rewrites old flat projection files into the exact target shape with backup paths recorded in migration details.
- `AC-TTFM-010`: After migration/refactor, searches in normal Team Communication runtime code show no old-flat participant fallback such as `senderRunId`, `senderMemberPath`, `senderMemberRouteKey`, `senderRepresentedSubTeam`, receiver variants, or `taskTeamScope` used to parse/match current messages. Such old-shape references may exist only inside the migration file/tests.
- `AC-TTFM-011`: If migration cannot safely derive a sender or receiver `ConversationTargetAddress` for an old row, the migration records a failed item/warning according to app-data migration status semantics; frontend/backend runtime does not silently display that row through a legacy compatibility branch.

## Constraints / Dependencies

- Use the existing `ConversationTargetAddress` / `ConversationTargetSegment` concept as the identity spine.
- The stored projection file remains rooted under `memory/agent_teams/<rootTeamRunId>/team_communication_messages.json`.
- Follow the design principle: no backward compatibility / no legacy retention in in-scope runtime behavior. Existing old data is handled by app-data migration, not by runtime fallback.
- Team Communication remains the owner for message persistence and perspective matching. Workspaces owns focus only.
- Do not introduce fuzzy matching. Exact normalized address equality is the matching rule.
- Do not add labels or display snapshot fields unless implementation proves the frontend cannot render required UI from address data.

## Assumptions

- Existing backend event context has enough information to build sender/receiver addresses at communication-event or projection time.
- Existing frontend focused-node address utilities can be reused or lightly extracted for Team Communication perspective matching.
- Existing reference-file behavior can remain message-owned and does not require identity redesign.

## Risks / Open Questions

- `OQ-TTFM-001`: Some current communication event payloads may not explicitly retain task-agent participant fields in the Team Communication payload type; implementation must verify and extend the event construction point if needed.
- `OQ-TTFM-002`: Some old flat projection rows may not contain enough information to reconstruct task-team/task-agent addresses. The migration must make this visible in migration details/logs instead of adding runtime compatibility.
- `OQ-TTFM-003`: GraphQL generated types may need regeneration or manual updates according to repository practice.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| `REQ-TTFM-001` | `UC-TTFM-001` through `UC-TTFM-008` |
| `REQ-TTFM-002` | `UC-TTFM-001` through `UC-TTFM-008` |
| `REQ-TTFM-003` | `UC-TTFM-001` through `UC-TTFM-006` |
| `REQ-TTFM-004` | `UC-TTFM-001` through `UC-TTFM-008` |
| `REQ-TTFM-005` | `UC-TTFM-008` |
| `REQ-TTFM-006` | `UC-TTFM-001` through `UC-TTFM-008` |
| `REQ-TTFM-007` | `UC-TTFM-001` through `UC-TTFM-006` |
| `REQ-TTFM-008` | `UC-TTFM-001` through `UC-TTFM-007` |
| `REQ-TTFM-009` | `UC-TTFM-007` |
| `REQ-TTFM-010` | `UC-TTFM-001` through `UC-TTFM-008` |
| `REQ-TTFM-011` | `UC-TTFM-009` |
| `REQ-TTFM-012` | `UC-TTFM-001` through `UC-TTFM-009` |
| `REQ-TTFM-013` | `UC-TTFM-009` |

## Approval Status

Design-ready after user-guided model clarification and no-backward-compatibility correction on 2026-07-01. The user explicitly approved the minimal address-first structure and explicitly rejected runtime compatibility/read-time conversion for old flat files; app-data migration is now in scope.
