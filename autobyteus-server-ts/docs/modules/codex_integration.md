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

1. Team services create a team run with deterministic `memberRunId` values and resolve the governing `TeamBackendKind`.
2. Single-runtime Codex teams use `codex-team-run-backend-factory.ts` + `codex-team-manager.ts` to create/restore one standalone Codex `AgentRun` per team member.
3. Mixed-runtime teams still run Codex members as standalone Codex `AgentRun`s, but the governing team owner is `MixedTeamManager`, not `codex-team-manager.ts`.
4. Codex member bootstrap now consumes a runtime-neutral `MemberTeamContext` for teammate instructions, allowed recipients, and `send_message_to` delivery wiring.
5. Team websocket streaming preserves the member domain identity while forwarding member runtime events regardless of whether the governing team backend is single-runtime Codex or mixed.

## Sandbox Mode Configuration

Codex filesystem sandbox behavior is controlled by the Codex-specific server setting
`CODEX_APP_SERVER_SANDBOX`.

- Supported canonical values are `read-only`, `workspace-write`, and `danger-full-access`.
- `workspace-write` is the default when the setting is absent or invalid.
- `danger-full-access` disables filesystem sandboxing and should only be used for trusted tasks and environments.
- The Settings page exposes the common user decision through **Server Settings -> Basics -> Codex full access**: toggle on saves `danger-full-access`, and toggle off saves `workspace-write`. The Advanced Settings raw table also treats `CODEX_APP_SERVER_SANDBOX` as a predefined editable, non-deletable setting and rejects values outside the canonical set.
- Saved changes flow through the existing server-settings persistence path and are read by future/new Codex thread bootstrap or restore paths. Already-active Codex sessions are not mutated in place.
- `autoExecuteTools` remains separate: it controls approval behavior, not filesystem sandbox mode.

Server-side semantics are owned by
`src/runtime-management/codex/codex-sandbox-mode-setting.ts` so the settings
service, create-session bootstrap, and restore-session history path share one
key/default/value-list/normalization source.

## Key Backend Components

Agent runtime:

- `src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts`
- `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`

Thread/runtime bridge:

- `src/runtime-management/codex/codex-sandbox-mode-setting.ts`
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
- `src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts`
- `src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`

## Skills

Configured runtime skills are preflighted against Codex `skills/list` for the run working directory.

- If Codex already discovers an enabled skill with the same logical `name`, AutoByteus reuses it and does not materialize it into the workspace.
- If the configured skill name is not discoverable, AutoByteus materializes a runtime-owned whole-directory symlink into the run workspace under:

- `.codex/skills/<skill>/...`

- If the discovery probe fails, AutoByteus falls back to the runtime-owned workspace symlink path instead of blocking bootstrap.
- The runtime-owned workspace path is an intuitive `.codex/skills/<sanitized-skill-name>` directory symlink to the original source root. AutoByteus does not add the old hash suffix, does not generate `agents/openai.yaml`, and does not write ownership markers into the source tree.
- Team-shared relative links continue to work because Codex resolves through the source root, so no mirrored `.codex/shared/...` path is created.

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
- Large long-running Codex turns can also become bursty and include long silent gaps at the native `codex app-server` layer; when debugging attribution, compare native raw deltas with backend `SEGMENT_CONTENT` cadence before blaming the AutoByteus bridge.
- Team member identity is deterministic and server-owned; Codex thread ids are stored separately as runtime-native references.
- Raw Codex debug capture is available through `CODEX_THREAD_RAW_EVENT_LOG_DIR`; see `docs/design/codex_raw_event_mapping.md` for the audit workflow and file format.

## Validation Notes

- Durable long-turn attribution probes live under `tests/integration/runtime-execution/codex-app-server/thread/`.
- `codex-raw-vs-backend-cadence.probe.test.ts` compares native raw `item/agentMessage/delta` cadence with backend `SEGMENT_CONTENT` cadence in the same run.
- `codex-long-turn-cadence.probe.test.ts` records backend long-turn event cadence over time.
- These live probes are intentionally opt-in and require both a working `codex` binary and `RUN_CODEX_E2E=1`.

## MCP Mode

MCP-based Codex remains a valid optional path when you want Codex as a tool rather than a runtime:

- use MCP mode when Codex should be one tool among others inside an AutoByteus-native agent
- use `codex_app_server` when Codex itself should own the run/thread lifecycle

The native runtime is the canonical integration path for run history, restore, projection, approvals, and team-member runtime orchestration.
