# Future-State Runtime Call Stack

## Scope
- Ticket: `codex-run-history-projection-fix`
- Design basis: `proposed-design.md` v1

## UC-001 Current Codex Item-Type Projection
- requirement_ids: `R-001`
1. Frontend opens history run and calls GraphQL `getRunProjection(runId)`.
2. Resolver delegates to `RunProjectionService.getProjection`.
3. Service selects runtime provider `codex_thread_projection` for `runtimeKind=codex_app_server`.
4. Provider reads Codex thread via `thread/read`.
5. Provider transforms turns:
   - `item.type=userMessage` -> user message entry.
   - `item.type=agentMessage` -> assistant text aggregation.
6. Provider returns canonical projection with non-empty conversation.
7. Frontend `buildConversationFromProjection` renders messages in middle pane.

## UC-002 Reasoning Summary Projection
- requirement_ids: `R-002`
1. Provider sees `item.type=reasoning`.
2. Extracts summary/content text fragments.
3. Merges into assistant content block with `[reasoning]` section.
4. Returns assistant message entry with text content.

## UC-003 End-to-End History Open
- requirement_ids: `R-003`
1. Codex run completes and manifest keeps `threadId`.
2. User later re-opens run from history tree.
3. GraphQL projection returns conversation entries (`length > 0`).
4. UI shows persisted user/assistant content (not blank pane).

## UC-004 Legacy Payload Compatibility
- requirement_ids: `R-004`
1. Provider receives legacy method-based item payload.
2. Existing method-based parsing path still applies.
3. Projection result remains valid as before.

## UC-005 Missing Workspace Path Fallback
- requirement_ids: `R-005`
1. User opens a historical Codex run whose manifest workspace path no longer exists.
2. `CodexThreadRunProjectionProvider` validates manifest workspace path.
3. Provider falls back to `process.cwd()` for `thread/read` launch cwd.
4. Codex `thread/read` succeeds and provider returns canonical conversation entries.
5. UI still renders historical messages instead of an empty pane.
