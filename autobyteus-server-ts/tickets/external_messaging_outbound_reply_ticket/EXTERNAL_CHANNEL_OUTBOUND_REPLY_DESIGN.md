# External Channel Outbound Reply Redesign (autobyteus-server-ts)

## Summary
The previous callback design was vulnerable to reply misrouting because source selection could use mutable "latest source by agent" state. This redesign switches to turn-bound correlation and introduces explicit safety gates.
This iteration also removes manual per-agent setup by making both external-channel processors mandatory defaults.

## Goals
- Deterministic reply routing by `(agentId, turnId)`.
- Text-only outbound messaging behavior.
- Strong separation of concerns between runtime processors, callback orchestration, and persistence.

## Non-Goals
- Streaming responses over messaging channels.
- Tool approval UX over WhatsApp/WeChat.
- Team-target outbound in phase 1 (explicitly gated).

## Requirements And Use Cases
- UC1: External inbound turn is bound to ingress receipt with exact `turnId`.
- UC2: Assistant complete for same turn replies to exact peer/thread.
- UC3: Concurrent peers on same agent never cross-route.
- UC4: If binding was removed before completion, callback is skipped.
- UC5: Internal/web turns never trigger channel callback.
- UC6: TEAM target outbound is skipped in phase 1 with explicit reason.
- UC7: External inbound/outbound works for agents even when definitions do not explicitly list external processors.

## Architecture Overview
1. Ingress path already persists `ChannelMessageReceipt`.
2. New input processor binds `turnId` to the matching receipt row.
3. New response processor triggers callback publish only when completion has valid `turnId` and AGENT target.
4. Reply callback service resolves source via `getSourceByAgentTurn(agentId, turnId)`.
5. Reply callback service validates route is still actively bound to the same target before publish.
6. Reply callback service reserves callback idempotency only after source/binding gates pass.
7. Callback publisher posts outbound envelope to gateway callback endpoint.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts` (new) | Bind active turn to ingress receipt (race-safe upsert), globally enabled | `process(message, context, triggeringEvent)` | In: external source + active turn; Out: turn-bound receipt upsert or no-op | `ChannelMessageReceiptService` |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts` (new) | Outbound trigger for text-only replies, globally enabled | `processResponse(response, context, triggeringEvent)` | In: completion response + turn id; Out: callback publish request or skip | `ReplyCallbackService`, formatter |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/external-channel-reply-content-formatter.ts` (new) | Format/sanitize assistant text for messaging channels | `format(response): { text: string | null; metadata: Record<string, unknown> }` | In: complete response; Out: text-only payload | none |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` (modify) | Deterministic callback orchestration | `publishAssistantReplyByTurn(input)` | In: agentId/turnId/text; Out: publish result + delivery updates | receipt service, binding service, idempotency, delivery service, publisher |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts` (modify) | Receipt binding and turn-source lookup | `bindTurnToReceipt(input)` (upsert-by-source-key), `getSourceByAgentTurn(agentId, turnId)` | In: source keys + turn; Out: source context | provider |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/providers/channel-message-receipt-provider.ts` (modify) | Storage contract for turn-bound mapping | `bindTurnToReceipt(...)`, `getSourceByAgentTurn(...)` | typed persistence contract | SQL provider |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` (modify) | Prisma storage implementation | upsert turn binding (create-on-miss to avoid ingress race), indexed lookup | DB IO | Prisma |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts` (modify) | Active-binding guard for outbound | `isRouteBoundToTarget(route, target)` | In: route + target; Out: boolean | binding provider |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts` (new) | Server->gateway callback transport | `publish(envelope)` | In: outbound envelope; Out: HTTP POST | fetch + signature helper |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/startup/agent-customization-loader.ts` (modify) | Deterministic processor order registration | `loadAgentCustomizations()` | registry composition | processor registries |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/config/app-config.ts` (modify) | Callback runtime config | `getChannelCallbackBaseUrl()`, `getChannelCallbackSharedSecret()`, `getChannelCallbackTimeoutMs()` | env -> typed config | process.env |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/prisma/schema.prisma` (modify) | Persist turn correlation | `ChannelMessageReceipt.turnId` + index | DB schema | Prisma |

### Callback Publisher Config Contract
- `CHANNEL_CALLBACK_BASE_URL` (required for outbound enablement): gateway base URL, e.g. `http://localhost:8010`.
- `CHANNEL_CALLBACK_SHARED_SECRET` (optional but recommended): HMAC secret for server->gateway callback signing.
- `CHANNEL_CALLBACK_TIMEOUT_MS` (optional, default `5000`): publish request timeout.
- If `CHANNEL_CALLBACK_BASE_URL` is missing, callback publish short-circuits with `CALLBACK_NOT_CONFIGURED`.

## Processor Order Contract (Critical)
- `MemoryIngestInputProcessor`: order `900` (existing).
- `ExternalChannelTurnReceiptBindingProcessor`: order `925` (new) to guarantee turn exists before binding.
- `UserInputPersistenceProcessor`: order `950` (existing).
- `ExternalChannelAssistantReplyProcessor`: order `980` (new), after media transform/persistence/token usage processors.
- Mandatory contract:
  - `ExternalChannelTurnReceiptBindingProcessor.isMandatory() === true`
  - `ExternalChannelAssistantReplyProcessor.isMandatory() === true`
  - Agent definitions do not need explicit per-agent processor configuration for external channel support.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| turn-binding processor | external metadata parser + receipt service | reply callback path | Medium | Hard order contract (`925`) and no callback logic in input processor |
| assistant-reply processor | completion event + formatter + callback service | gateway delivery | Medium | Pure orchestration; formatter and callback logic isolated |
| reply-callback-service | receipt, binding guard, idempotency, publisher | response processor | Medium | No response parsing; only route resolution + publish lifecycle |
| SQL receipt provider | Prisma | receipt service | Low | Pure data access layer |
| callback publisher | config + HTTP | reply callback service | Low | One concern: transport publish |

## Data Models (If Needed)
- `ChannelMessageReceipt` extension:
  - `turnId: String?`
  - index on `(agentId, turnId)` for deterministic lookup.
- `PublishAssistantReplyByTurnInput`
  - `agentId: string`
  - `turnId: string`
  - `replyText: string`
  - `callbackIdempotencyKey: string`
  - `metadata?: Record<string, unknown>`

## Error Handling And Edge Cases
- Missing `turnId` in completion event -> skip publish (`TURN_ID_MISSING`).
- Missing source for `(agentId, turnId)` -> skip publish (`SOURCE_NOT_FOUND`).
- Binding removed before completion -> skip publish (`BINDING_NOT_FOUND`).
- TEAM target in phase 1 -> skip publish (`TEAM_TARGET_NOT_SUPPORTED`).
- Empty reply text after formatting -> skip publish (`EMPTY_REPLY`).
- Callback HTTP failure -> record failed delivery event and bubble error.
- Expected non-external skips (`SOURCE_NOT_FOUND`, `CALLBACK_NOT_CONFIGURED`) are intentionally low-noise in processor logging.

## Performance / Security Considerations
- One extra upsert per external turn to bind `turnId` (intentionally race-safe against ingress receipt write ordering).
- Indexed source lookup avoids scanning receipts.
- Callback publisher signs requests when callback secret is configured.

## Migration / Rollout (If Needed)
1. DB migration for `turnId` and index.
2. Deploy server with new processors + callback config.
3. Monitor fallback/skip reasons and callback failures.
4. Keep turn-bound source lookup as the only allowed outbound correlation path.

## Design Feedback Loop Notes (From Deep Inspection)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | Call-stack deep review | Turn-binding processor had implicit order dependency | Added explicit processor order contract (`925`) | Updated |
| 2026-02-09 | Call-stack deep review | Callback config boundary missing in file map | Added callback publisher config contract | Updated |
| 2026-02-09 | Call-stack deep review | Potential stale send after binding deletion | Added route-to-target active-binding guard pre-publish | Updated |
| 2026-02-09 | Call-stack deep review | Receipt-write race between ingress and input processor | Made turn binding upsert create-on-miss | Updated |
| 2026-02-09 | Scope review | Team outbound mapping unresolved | Declared explicit phase-1 gate with skip reason | Updated |
| 2026-02-09 | Runtime supportability review | Users had to manually add external processors per agent | Set both external processors as mandatory defaults | Updated |
| 2026-02-09 | Runtime supportability review | Callback idempotency keys reserved for skipped paths | Reordered callback flow: source/binding checks before idempotency reservation | Updated |

## Open Questions
- None for this ticket scope. TEAM-target outbound is explicitly deferred to a separate phase-2 ticket.
