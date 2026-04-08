# Codex Integration

## Current State

Codex App Server is now a first-class runtime in `autobyteus-server-ts`. Codex can still be used through MCP tools, but the primary integration path in this repo is the native runtime.

Supported Codex paths:

- Native runtime: `runtimeKind = codex_app_server`
- Optional tool-based mode: Codex exposed through MCP tools

## Native Runtime Architecture

Standalone runs:

1. Frontend selects `codex_app_server`.
2. GraphQL create/continue flows hand runtime selection to the server run services.
3. `AgentRunManager` resolves the Codex backend factory.
4. `codex-agent-run-backend-factory.ts` creates a Codex-backed `AgentRun`.
5. `codex-thread-bootstrapper.ts` prepares the workspace, skills, approvals, and thread config.
6. `CodexAppServerClient` / `CodexAppServerClientManager` speak to the Codex App Server process.
7. Codex thread notifications are converted into normalized AutoByteus runtime events and streamed to the existing websocket/frontend pipeline.

Team runs:

1. Team services create a team run with deterministic `memberRunId` values.
2. `codex-team-run-backend-factory.ts` provisions team member runtime contexts.
3. `codex-team-manager.ts` creates/restores one Codex member run per team member.
4. Inter-agent messaging is carried through the Codex `send_message_to` tool contract.
5. Team websocket streaming preserves the member domain identity while forwarding member runtime events.

## Key Backend Components

Agent runtime:

- `src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts`
- `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`

Thread/runtime bridge:

- `src/agent-execution/backends/codex/thread/codex-thread.ts`
- `src/agent-execution/backends/codex/thread/codex-client-thread-router.ts`
- `src/runtime-management/codex/client/codex-app-server-client.ts`
- `src/runtime-management/codex/client/codex-app-server-client-manager.ts`

Event normalization:

- `src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts`
- Detailed raw-event audit table: `docs/design/codex_raw_event_mapping.md`

Team runtime:

- `src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts`
- `src/agent-team-execution/backends/codex/codex-team-run-backend.ts`
- `src/agent-team-execution/backends/codex/codex-team-manager.ts`

## Skills

Configured runtime skills are preflighted against Codex `skills/list` for the run working directory.

- If Codex already discovers an enabled skill with the same logical `name`, AutoByteus reuses it and does not copy it into the workspace.
- If the configured skill name is not discoverable, AutoByteus materializes a runtime-owned copy into the run workspace under:

- `.codex/skills/<skill>/...`

- If the discovery probe fails, AutoByteus falls back to the runtime-owned workspace copy path instead of blocking bootstrap.
- Runtime-owned skill copies are made self-contained on macOS/Linux by dereferencing source symlinks during materialization, so the copied bundle does not depend on the original source tree or a mirrored `.codex/shared/...` path.

Relevant owners:

- `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- `src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts`

This keeps Codex skill loading aligned with the Codex filesystem contract instead of injecting skill content into prompts at the server boundary.

## Projection / History

Codex run history and projection are reconstructed from persisted Codex thread history rather than from AutoByteus-native memory records.

Relevant components:

- `src/agent-execution/backends/codex/history/codex-thread-history-reader.ts`
- `src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- `src/run-history/services/agent-run-view-projection-service.ts`
- `src/run-history/services/team-member-run-view-projection-service.ts`

The projection path uses:

- domain run ids for AutoByteus-owned identity
- Codex thread ids for Codex-native identity

## Event-Normalization Rules

- Raw Codex event interpretation stays inside `src/agent-execution/backends/codex/events/`.
- `item/started` / `item/completed` with `item.type = fileChange` are the authoritative raw owners for Codex `edit_file` lifecycle and artifact availability.
- `turn/diff/updated` is treated as supplemental diff information and is intentionally not promoted into lifecycle or artifact ownership.
- `rawResponseItem/completed` for custom tool completions is not the authoritative owner of `apply_patch` file mutation state.
- The durable raw-event mapping table lives in `docs/design/codex_raw_event_mapping.md` and should be updated before adding new Codex raw-event handling.

## Operational Notes

- Approval requests, tool calls, file changes, and final-answer deltas are all normalized into the standard runtime event spine.
- In practice, Codex may emit visible final-answer text only after reasoning finishes, which can make text streaming appear as a late burst even though lifecycle/tool events are still live.
- Team member identity is deterministic and server-owned; Codex thread ids are stored separately as runtime-native references.
- Raw Codex debug capture is available through `CODEX_THREAD_RAW_EVENT_LOG_DIR`; see `docs/design/codex_raw_event_mapping.md` for the audit workflow and file format.

## MCP Mode

MCP-based Codex remains a valid optional path when you want Codex as a tool rather than a runtime:

- use MCP mode when Codex should be one tool among others inside an AutoByteus-native agent
- use `codex_app_server` when Codex itself should own the run/thread lifecycle

The native runtime is the canonical integration path for run history, restore, projection, approvals, and team-member runtime orchestration.
