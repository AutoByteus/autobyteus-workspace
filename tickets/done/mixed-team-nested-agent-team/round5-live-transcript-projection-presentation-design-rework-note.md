# Round 5 Live Transcript / Projection / Presentation Design Rework Note

## Status

Design rework complete; implementation may resume from this note plus the updated `design-spec.md`.

## Why This Rework Exists

API/E2E Round 5 exposed three coupled defects:

1. Live focused child coordinator transcript omits the inbound parent-to-subteam prompt.
2. Opened/restored child coordinator projection duplicates messages: timestamped rows plus `ts: null` copies.
3. Active nested rows use agent definition names while opened/history rows use member names.

The root problem is missing data-flow ownership, not one component bug. The updated design spec now lists 19 data-flow spines and maps every use case to those spines.

## Authoritative Decisions

### 1. Live child leaf prompts come from backend member input events

Add a domain event for accepted recipient-side inputs:

```ts
TeamRunEventSourceType.MEMBER_INPUT
TeamRunMemberInputEventPayload
```

Map that event to the existing WebSocket transport message type:

```ts
ServerMessageType.EXTERNAL_USER_MESSAGE
```

Required payload fields:

- `message_id`
- `dedupe_key`
- `content`
- `received_at`
- `input_origin`
- `member_route_key`
- `member_path`
- `source_route_key`
- `source_path`
- `agent_id`
- `agent_name`
- sender route/path fields when applicable
- `parent_communication_message_id` when the input came from parent team communication

Do **not** synthesize child leaf transcript prompts from `TEAM_COMMUNICATION_MESSAGE` on the frontend.

### 2. Parent communication and child transcript are separate linked records

For `program_manager -> BuildSquad`:

- parent Team Messages row: sender `program_manager`, receiver `BuildSquad`, original content;
- child leaf transcript row: recipient `BuildSquad/review_lead`, recipient-visible prompt `You received a message...`.

They should be linked by a delivery trace (`communicationMessageId`, `recipientInputMessageId`, `createdAt`) but not conflated.

### 3. Live and durable leaf conversations use the same logical message identity

Attach/propagate `recipientInputMessageId` and dedupe metadata into:

- delivered `AgentInputUserMessage` metadata;
- live `MEMBER_INPUT`/`EXTERNAL_USER_MESSAGE` payload;
- projection rows when providers can expose metadata.

Frontend `handleExternalUserMessage()` must upsert by `message_id`/`dedupe_key`, not blindly append.

### 4. Projection dedupe belongs in backend projection normalization

Add semantic dedupe under run-history projection, e.g.:

```text
autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts
```

Invoke it from `AgentRunViewProjectionService` when merging local, primary, complementary, and fallback projections. `getTeamMemberRunProjection()` must return no duplicate logical conversation rows.

Winner policy:

1. Prefer valid non-null timestamp.
2. Prefer explicit message identity.
3. Prefer richer metadata/media/tool/reference fields.
4. Merge missing optional fields when safe.

Frontend `runProjectionConversation.ts` should defensively dedupe stale rows, but backend GraphQL is the authoritative source.

### 5. Primary labels are membership labels

Primary label policy:

- primary: `TeamMemberNode.displayName`, else `memberName`, else route leaf;
- subteam secondary: `TEAM` badge plus optional team definition name;
- leaf secondary: full route key/breadcrumb and agent definition name;
- agent definition display name must not override primary membership label.

Central owner:

```text
autobyteus-web/composables/useTeamMemberPresentation.ts
```

## Regression Expectations

Implementation should prove:

- `program_manager -> BuildSquad` produces one parent communication event and one `BuildSquad/review_lead` member input event.
- Live focus on `BuildSquad/review_lead` shows the inbound `You received...program_manager` prompt before the reply.
- `TeamStreamingService` routes member input events by `source_path`/`member_route_key`, regardless of current focus.
- `getTeamMemberRunProjection(teamRunId, "BuildSquad/review_lead")` contains no timestamp/null duplicate pairs.
- Projection hydration renders each logical message once even if stale duplicate rows arrive.
- Active and history rows use the same primary labels: `program_manager`, `BuildSquad`, `review_lead`, `qa_specialist` for the seeded fixture.

## Updated Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/design-spec.md`
